export type ClientRole = "player" | "spectator";

export type MatchPhase = "waiting_for_players" | "active" | "finished";

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface MatchEvent {
  readonly type: string;
  readonly [key: string]: JsonValue;
}

export interface RevisionedMatchEvent {
  readonly match_id: string;
  readonly revision: number;
  readonly event: MatchEvent;
}

export interface CommandEnvelope {
  readonly type: string;
  readonly match_id: string;
  readonly client_id: string;
  readonly player_id?: string;
  readonly seen_revision: number;
  readonly payload: Record<string, JsonValue>;
}

export interface PlayerSeat {
  readonly player_id: string;
  readonly client_id: string;
  readonly seat_index: number;
  readonly connected: boolean;
}

export interface SpectatorSeat {
  readonly spectator_id: string;
  readonly client_id: string;
  readonly connected: boolean;
}

export interface JoinResult<Snapshot, Definition> {
  readonly accepted: true;
  readonly role: ClientRole;
  readonly player_id?: string;
  readonly spectator_id?: string;
  readonly definition: Definition;
  readonly snapshot: Snapshot;
}

export interface CommandAccepted<Snapshot> {
  readonly accepted: true;
  readonly snapshot: Snapshot;
  readonly events: readonly RevisionedMatchEvent[];
}

export interface CommandRejected {
  readonly accepted: false;
  readonly reason: string;
}

export type CommandResult<Snapshot> = CommandAccepted<Snapshot> | CommandRejected;

export interface MatchContext {
  readonly match_id: string;
  readonly phase: MatchPhase;
  readonly revision: number;
  readonly players: readonly PlayerSeat[];
  readonly spectators: readonly SpectatorSeat[];
}

export type RulesInitialStateOptions = Record<string, JsonValue>;

export interface RulesCommandResult<State> {
  readonly accepted: true;
  readonly state: State;
  readonly events?: readonly MatchEvent[];
}

export interface RulesCommandRejected {
  readonly accepted: false;
  readonly reason: string;
}

export type RulesCommandOutcome<State> = RulesCommandResult<State> | RulesCommandRejected;

export interface RulesAdapter<State, Snapshot, Definition> {
  createInitialState(match_id: string, player_count: number, options?: RulesInitialStateOptions): State;
  handleCommand(state: State, command: CommandEnvelope, context: MatchContext): RulesCommandOutcome<State>;
  buildPublicDefinition(state: State, context: MatchContext): Definition;
  buildPublicSnapshot(state: State, context: MatchContext, local_client_id?: string): Snapshot;
}
