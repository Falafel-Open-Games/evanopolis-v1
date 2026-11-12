import type {
  CommandEnvelope,
  CommandResult,
  JoinResult,
  MatchContext,
  MatchPhase,
  PlayerSeat,
  RevisionedMatchEvent,
  RulesAdapter,
  RulesInitialStateOptions,
  SpectatorSeat
} from "./types.js";
import type { PersistedMatch } from "./match-persistence.js";

export interface MatchSessionOptions<State, Snapshot, Definition> {
  readonly match_id: string;
  readonly join_mode?: "free_play" | "paid_room";
  readonly player_count: number;
  readonly initial_state_options?: RulesInitialStateOptions | undefined;
  readonly rules: RulesAdapter<State, Snapshot, Definition>;
}

export class MatchSession<State, Snapshot, Definition> {
  private static readonly RecentEventLimit = 40;
  readonly match_id: string;
  readonly join_mode: "free_play" | "paid_room";
  readonly player_count: number;
  readonly initial_state_options: RulesInitialStateOptions | undefined;

  private readonly rules: RulesAdapter<State, Snapshot, Definition>;
  private phase: MatchPhase = "waiting_for_players";
  private revision = 0;
  private state: State;
  private players: PlayerSeat[] = [];
  private spectators: SpectatorSeat[] = [];
  private recent_events: RevisionedMatchEvent[] = [];

  constructor(options: MatchSessionOptions<State, Snapshot, Definition>) {
    this.match_id = options.match_id;
    this.join_mode = options.join_mode ?? "free_play";
    this.player_count = options.player_count;
    this.initial_state_options = options.initial_state_options;
    this.rules = options.rules;
    this.state = options.rules.createInitialState(
      options.match_id,
      options.player_count,
      options.initial_state_options
    );
  }

  static restore<State, Snapshot, Definition>(
    persisted: PersistedMatch<State>,
    rules: RulesAdapter<State, Snapshot, Definition>
  ): MatchSession<State, Snapshot, Definition> {
    const session = new MatchSession({
      match_id: persisted.match_id,
      join_mode: persisted.join_mode,
      player_count: persisted.player_count,
      initial_state_options: persisted.initial_state_options,
      rules
    });
    session.restoreFrom(persisted, true);
    return session;
  }

  join(client_id: string): JoinResult<Snapshot, Definition> {
    const existing_player = this.players.find((player) => player.client_id === client_id);
    if (existing_player !== undefined) {
      this.players = this.players.map((player) =>
        player.client_id === client_id ? { ...player, connected: true } : player
      );
      return {
        accepted: true,
        role: "player",
        player_id: existing_player.player_id,
        definition: this.definition(),
        snapshot: this.snapshotFor(client_id)
      };
    }

    const existing_spectator = this.spectators.find((spectator) => spectator.client_id === client_id);
    if (existing_spectator !== undefined) {
      this.spectators = this.spectators.map((spectator) =>
        spectator.client_id === client_id ? { ...spectator, connected: true } : spectator
      );
      return {
        accepted: true,
        role: "spectator",
        spectator_id: existing_spectator.spectator_id,
        definition: this.definition(),
        snapshot: this.snapshotFor(client_id)
      };
    }

    if (this.players.length < this.player_count) {
      const seat_index = this.players.length;
      const player_id = `player_${seat_index + 1}`;
      this.players = [
        ...this.players,
        {
          player_id,
          client_id,
          seat_index,
          connected: true
        }
      ];
      if (this.players.length === this.player_count) {
        this.phase = "active";
      }
      this.revision += 1;
      return {
        accepted: true,
        role: "player",
        player_id,
        definition: this.definition(),
        snapshot: this.snapshotFor(client_id)
      };
    }

    const spectator_id = `spectator_${this.spectators.length + 1}`;
    this.spectators = [
      ...this.spectators,
      {
        spectator_id,
        client_id,
        connected: true
      }
    ];
    this.revision += 1;
    return {
      accepted: true,
      role: "spectator",
      spectator_id,
      definition: this.definition(),
      snapshot: this.snapshotFor(client_id)
    };
  }

  canJoinAsPlayer(client_id: string): boolean {
    return this.players.some((player) => player.client_id === client_id)
      || this.players.length < this.player_count;
  }

  disconnect(client_id: string): void {
    this.players = this.players.map((player) =>
      player.client_id === client_id ? { ...player, connected: false } : player
    );
    this.spectators = this.spectators.map((spectator) =>
      spectator.client_id === client_id ? { ...spectator, connected: false } : spectator
    );
  }

  handleCommand(command: CommandEnvelope): CommandResult<Snapshot> {
    const core_rejection = this.validateCommandEnvelope(command);
    if (core_rejection !== "") {
      return {
        accepted: false,
        reason: core_rejection
      };
    }

    const outcome = this.rules.handleCommand(this.state, command, this.context());
    if (!outcome.accepted) {
      return outcome;
    }

    this.state = outcome.state;
    if ((outcome.events ?? []).some((event) => event.type === "game_ended")) {
      this.phase = "finished";
    }
    this.revision += 1;
    const events = (outcome.events ?? []).map((event) => ({
      match_id: this.match_id,
      revision: this.revision,
      event
    }));
    this.recent_events.push(...events);
    if (this.recent_events.length > MatchSession.RecentEventLimit) {
      this.recent_events.splice(0, this.recent_events.length - MatchSession.RecentEventLimit);
    }
    return {
      accepted: true,
      snapshot: this.snapshotFor(command.client_id),
      events
    };
  }

  snapshotFor(client_id?: string): Snapshot {
    return this.rules.buildPublicSnapshot(this.state, this.context(), client_id);
  }

  definition(): Definition {
    return this.rules.buildPublicDefinition(this.state, this.context());
  }

  getRevision(): number {
    return this.revision;
  }

  persistedState(): PersistedMatch<State> {
    return structuredClone({
      format_version: 1 as const,
      match_id: this.match_id,
      join_mode: this.join_mode,
      player_count: this.player_count,
      ...(this.initial_state_options === undefined ? {} : { initial_state_options: this.initial_state_options }),
      phase: this.phase,
      revision: this.revision,
      state: this.state,
      players: this.players,
      spectators: this.spectators,
      recent_events: this.recent_events
    });
  }

  restoreFrom(persisted: PersistedMatch<State>, disconnect_all = false): void {
    if (
      persisted.format_version !== 1
      || persisted.match_id !== this.match_id
      || persisted.join_mode !== this.join_mode
      || persisted.player_count !== this.player_count
    ) {
      throw new Error("persisted_match_identity_mismatch");
    }
    const restored = structuredClone(persisted);
    this.phase = restored.phase;
    this.revision = restored.revision;
    this.state = restored.state;
    this.players = restored.players.map((player) => ({
      ...player,
      connected: disconnect_all ? false : player.connected
    }));
    this.spectators = restored.spectators.map((spectator) => ({
      ...spectator,
      connected: disconnect_all ? false : spectator.connected
    }));
    this.recent_events = [...restored.recent_events];
  }

  publicPresence(): {
    player_count: number;
    joined_player_count: number;
    connected_player_count: number;
    phase: MatchPhase;
  } {
    return {
      player_count: this.player_count,
      joined_player_count: this.players.length,
      connected_player_count: this.players.filter((player) => player.connected).length,
      phase: this.phase
    };
  }

  private validateCommandEnvelope(command: CommandEnvelope): string {
    if (command.match_id !== this.match_id) {
      return "invalid_match_id";
    }
    if (command.seen_revision !== this.revision) {
      return "stale_revision";
    }
    const player = this.players.find((seat) => seat.player_id === command.player_id);
    if (player === undefined) {
      return "invalid_player_id";
    }
    if (player.client_id !== command.client_id) {
      return "client_player_mismatch";
    }
    if (!player.connected) {
      return "client_disconnected";
    }
    return "";
  }

  private context(): MatchContext {
    return {
      match_id: this.match_id,
      phase: this.phase,
      revision: this.revision,
      players: this.players,
      spectators: this.spectators,
      recent_events: this.recent_events
    };
  }
}
