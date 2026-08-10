export type ClientRole = "player" | "spectator";

export type MatchPhase = "waiting_for_players" | "active" | "finished";

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

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

export interface JoinResult<Snapshot> {
  readonly accepted: true;
  readonly role: ClientRole;
  readonly player_id?: string;
  readonly spectator_id?: string;
  readonly snapshot: Snapshot;
}

export interface CommandAccepted<Snapshot> {
  readonly accepted: true;
  readonly snapshot: Snapshot;
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

export interface RulesCommandResult<State> {
  readonly accepted: true;
  readonly state: State;
}

export interface RulesCommandRejected {
  readonly accepted: false;
  readonly reason: string;
}

export type RulesCommandOutcome<State> = RulesCommandResult<State> | RulesCommandRejected;

export interface RulesAdapter<State, Snapshot> {
  createInitialState(match_id: string, player_count: number): State;
  handleCommand(state: State, command: CommandEnvelope, context: MatchContext): RulesCommandOutcome<State>;
  buildPublicSnapshot(state: State, context: MatchContext, local_client_id?: string): Snapshot;
}
