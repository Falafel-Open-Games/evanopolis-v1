import type { CommandEnvelope, CommandResult, RevisionedMatchEvent } from "../multiplayer-core/types.js";
import type { EvanopolisSnapshot } from "./evanopolis-rules-adapter.js";

export function describeEvanopolisAcceptedCommand(
  result: CommandResult<EvanopolisSnapshot>,
  command: CommandEnvelope
): readonly { message: string; fields: Record<string, unknown> }[] {
  if (!result.accepted || !hasBalanceChangingEvent(result.events)) {
    return [];
  }

  return [
    {
      message: "balances after accepted command",
      fields: {
        type: command.type,
        match_id: command.match_id,
        revision: result.snapshot.revision,
        balances: summarizePlayerBalances(result.snapshot)
      }
    }
  ];
}

function hasBalanceChangingEvent(events: readonly RevisionedMatchEvent[]): boolean {
  return events.some((event) =>
    event.event.type === "property_purchased"
    || event.event.type === "rent_paid"
    || event.event.type === "player_eliminated"
  );
}

function summarizePlayerBalances(snapshot: EvanopolisSnapshot): Record<string, number> {
  return Object.fromEntries(snapshot.players.map((player) => [player.player_id, player.eva_balance]));
}
