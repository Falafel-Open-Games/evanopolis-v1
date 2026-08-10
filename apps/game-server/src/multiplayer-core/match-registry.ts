import { MatchSession } from "./match-session.js";
import type { RulesAdapter } from "./types.js";

export interface MatchRegistryOptions<State, Snapshot> {
  readonly player_count: number;
  readonly rules: RulesAdapter<State, Snapshot>;
}

export class MatchRegistry<State, Snapshot> {
  private readonly player_count: number;
  private readonly rules: RulesAdapter<State, Snapshot>;
  private readonly matches = new Map<string, MatchSession<State, Snapshot>>();

  constructor(options: MatchRegistryOptions<State, Snapshot>) {
    this.player_count = options.player_count;
    this.rules = options.rules;
  }

  getOrCreate(match_id: string): MatchSession<State, Snapshot> {
    const existing_match = this.matches.get(match_id);
    if (existing_match !== undefined) {
      return existing_match;
    }

    const match_session = new MatchSession({
      match_id,
      player_count: this.player_count,
      rules: this.rules
    });
    this.matches.set(match_id, match_session);
    return match_session;
  }
}
