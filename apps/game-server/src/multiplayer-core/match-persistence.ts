import type { MatchPhase, PlayerSeat, RevisionedMatchEvent, RulesInitialStateOptions, SpectatorSeat } from "./types.js";

export interface PersistedMatch<State> {
  readonly format_version: 1;
  readonly match_id: string;
  readonly join_mode: "free_play" | "paid_room";
  readonly player_count: number;
  readonly initial_state_options?: RulesInitialStateOptions | undefined;
  readonly phase: MatchPhase;
  readonly revision: number;
  readonly state: State;
  readonly players: readonly PlayerSeat[];
  readonly spectators: readonly SpectatorSeat[];
  readonly recent_events: readonly RevisionedMatchEvent[];
}

export interface MatchPersistence<State> {
  load(match_id: string): Promise<PersistedMatch<State> | undefined>;
  save(match: PersistedMatch<State>): Promise<void>;
}
