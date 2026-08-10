import type {
  CommandEnvelope,
  CommandResult,
  JoinResult,
  MatchContext,
  MatchPhase,
  PlayerSeat,
  RulesAdapter,
  SpectatorSeat
} from "./types.js";

export interface MatchSessionOptions<State, Snapshot> {
  readonly match_id: string;
  readonly player_count: number;
  readonly rules: RulesAdapter<State, Snapshot>;
}

export class MatchSession<State, Snapshot> {
  readonly match_id: string;
  readonly player_count: number;

  private readonly rules: RulesAdapter<State, Snapshot>;
  private phase: MatchPhase = "waiting_for_players";
  private revision = 0;
  private state: State;
  private players: PlayerSeat[] = [];
  private spectators: SpectatorSeat[] = [];

  constructor(options: MatchSessionOptions<State, Snapshot>) {
    this.match_id = options.match_id;
    this.player_count = options.player_count;
    this.rules = options.rules;
    this.state = options.rules.createInitialState(options.match_id, options.player_count);
  }

  join(client_id: string): JoinResult<Snapshot> {
    const existing_player = this.players.find((player) => player.client_id === client_id);
    if (existing_player !== undefined) {
      this.players = this.players.map((player) =>
        player.client_id === client_id ? { ...player, connected: true } : player
      );
      return {
        accepted: true,
        role: "player",
        player_id: existing_player.player_id,
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
      snapshot: this.snapshotFor(client_id)
    };
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
    this.revision += 1;
    return {
      accepted: true,
      snapshot: this.snapshotFor(command.client_id)
    };
  }

  snapshotFor(client_id?: string): Snapshot {
    return this.rules.buildPublicSnapshot(this.state, this.context(), client_id);
  }

  getRevision(): number {
    return this.revision;
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
      spectators: this.spectators
    };
  }
}
