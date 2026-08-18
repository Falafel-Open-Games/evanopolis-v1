export { MatchRegistry } from "./multiplayer-core/match-registry.js";
export { MatchSession } from "./multiplayer-core/match-session.js";
export type {
  CommandEnvelope,
  CommandResult,
  JoinResult,
  MatchEvent,
  MatchContext,
  RevisionedMatchEvent,
  RulesAdapter,
  RulesCommandOutcome
} from "./multiplayer-core/types.js";
export { EvanopolisRulesAdapter } from "./evanopolis-rules/evanopolis-rules-adapter.js";
export type {
  EvanopolisDefinition,
  EvanopolisMatchState,
  EvanopolisPendingRent,
  EvanopolisSnapshot,
  EvanopolisTerrainOwnership
} from "./evanopolis-rules/evanopolis-rules-adapter.js";
export type {
  EvanopolisBoardSpace,
  TerrainDevelopmentRentRow
} from "./evanopolis-rules/board-v1.js";
