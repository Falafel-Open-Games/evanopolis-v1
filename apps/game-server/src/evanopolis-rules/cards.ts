/*
 * Card deck rules for Evanopolis V1.
 * Owns card definitions, deterministic deck setup, and card draw resolution state.
 */

import type { MatchEvent } from "../multiplayer-core/types.js";
import type { EvanopolisBoardSpace } from "./board-v1.js";
import { spaceAt } from "./board-v1.js";
import { assertDefined, seededRandom } from "./rule-utils.js";

export type EvanopolisCardDeckId = "luck" | "destiny";
export type EvanopolisCardEffectType = "eva_delta";

export interface EvanopolisCardEffect {
  readonly type: EvanopolisCardEffectType;
  readonly amount_eva: number;
}

export interface EvanopolisCardDefinition {
  readonly card_id: string;
  readonly deck_id: EvanopolisCardDeckId;
  readonly labels: {
    readonly en: string;
    readonly es: string;
    readonly pt_br: string;
  };
  readonly effect: EvanopolisCardEffect;
}

export interface EvanopolisCardDeckDefinition {
  readonly deck_id: EvanopolisCardDeckId;
  readonly labels: {
    readonly en: string;
    readonly es: string;
    readonly pt_br: string;
  };
  readonly cards: readonly EvanopolisCardDefinition[];
}

export interface EvanopolisCardDeckState {
  readonly deck_id: EvanopolisCardDeckId;
  readonly card_ids: readonly string[];
}

export interface EvanopolisPendingCardResolution {
  readonly deck_id: EvanopolisCardDeckId;
  readonly card_id: string;
  readonly player_id: string;
  readonly space_id: string;
  readonly effect: EvanopolisCardEffect;
}

export interface EvanopolisCardDrawResult {
  readonly card_decks: readonly EvanopolisCardDeckState[];
  readonly pending_card_resolution: EvanopolisPendingCardResolution | null;
  readonly events: readonly MatchEvent[];
}

export const EvanopolisCardDecks: readonly EvanopolisCardDeckDefinition[] = [
  {
    deck_id: "luck",
    labels: {
      en: "Luck",
      es: "Suerte",
      pt_br: "Sorte"
    },
    cards: [
      {
        card_id: "luck_mining_bonus",
        deck_id: "luck",
        labels: {
          en: "Mining bonus. Receive 2 EVA.",
          es: "Bono de minería. Cobra 2 EVA.",
          pt_br: "Bonus de mineração. Receba 2 EVA."
        },
        effect: {
          type: "eva_delta",
          amount_eva: 2
        }
      },
      {
        card_id: "luck_unexpected_client",
        deck_id: "luck",
        labels: {
          en: "Unexpected client. Receive 1 EVA.",
          es: "Cliente inesperado. Cobra 1 EVA.",
          pt_br: "Cliente inesperado. Receba 1 EVA."
        },
        effect: {
          type: "eva_delta",
          amount_eva: 1
        }
      },
      {
        card_id: "luck_market_rally",
        deck_id: "luck",
        labels: {
          en: "Market rally. Receive 3 EVA.",
          es: "Subida del mercado. Cobra 3 EVA.",
          pt_br: "Alta do mercado. Receba 3 EVA."
        },
        effect: {
          type: "eva_delta",
          amount_eva: 3
        }
      }
    ]
  },
  {
    deck_id: "destiny",
    labels: {
      en: "Destiny",
      es: "Destino",
      pt_br: "Destino"
    },
    cards: [
      {
        card_id: "destiny_operating_tax",
        deck_id: "destiny",
        labels: {
          en: "Operating tax. Pay 2 EVA.",
          es: "Impuesto operativo. Paga 2 EVA.",
          pt_br: "Imposto operacional. Pague 2 EVA."
        },
        effect: {
          type: "eva_delta",
          amount_eva: -2
        }
      },
      {
        card_id: "destiny_urgent_maintenance",
        deck_id: "destiny",
        labels: {
          en: "Urgent maintenance. Pay 1 EVA.",
          es: "Mantenimiento urgente. Paga 1 EVA.",
          pt_br: "Manutenção urgente. Pague 1 EVA."
        },
        effect: {
          type: "eva_delta",
          amount_eva: -1
        }
      },
      {
        card_id: "destiny_favorable_market",
        deck_id: "destiny",
        labels: {
          en: "Favorable market. Receive 2 EVA.",
          es: "Mercado favorable. Cobra 2 EVA.",
          pt_br: "Mercado favorável. Receba 2 EVA."
        },
        effect: {
          type: "eva_delta",
          amount_eva: 2
        }
      }
    ]
  }
];

export function createInitialCardDecks(random_seed: string): readonly EvanopolisCardDeckState[] {
  return EvanopolisCardDecks.map((deck) => ({
    deck_id: deck.deck_id,
    card_ids: shuffleStrings(
      deck.cards.map((card) => card.card_id),
      `${random_seed}:${deck.deck_id}`
    )
  }));
}

export function drawCardForLanding(
  card_decks: readonly EvanopolisCardDeckState[],
  player_id: string,
  position: number
): EvanopolisCardDrawResult {
  const space = spaceAt(position);
  const deck_id = deckIdForSpace(space);
  if (space === undefined || deck_id === null) {
    return {
      card_decks,
      pending_card_resolution: null,
      events: []
    };
  }

  const deck = card_decks.find((candidate) => candidate.deck_id === deck_id);
  const card_id = deck?.card_ids[0];
  const card = card_id === undefined ? undefined : cardDefinition(deck_id, card_id);
  if (deck === undefined || card === undefined) {
    throw new Error(`Missing ${deck_id} card deck state`);
  }

  const next_card_ids = [...deck.card_ids.slice(1), card.card_id];
  const next_card_decks = card_decks.map((candidate) =>
    candidate.deck_id === deck_id ? { ...candidate, card_ids: next_card_ids } : candidate
  );
  return {
    card_decks: next_card_decks,
    pending_card_resolution: {
      deck_id,
      card_id: card.card_id,
      player_id,
      space_id: space.space_id,
      effect: card.effect
    },
    events: [
      {
        type: "card_drawn",
        player_id,
        space_id: space.space_id,
        deck_id,
        card_id: card.card_id
      }
    ]
  };
}

function deckIdForSpace(space: EvanopolisBoardSpace | undefined): EvanopolisCardDeckId | null {
  if (space?.kind === "luck") {
    return "luck";
  }
  if (space?.kind === "destiny") {
    return "destiny";
  }
  return null;
}

function cardDefinition(
  deck_id: EvanopolisCardDeckId,
  card_id: string
): EvanopolisCardDefinition | undefined {
  return EvanopolisCardDecks
    .find((deck) => deck.deck_id === deck_id)
    ?.cards.find((card) => card.card_id === card_id);
}

function shuffleStrings(values: readonly string[], seed: string): readonly string[] {
  const shuffled = values.slice();
  const random = seededRandom(seed);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap_index = Math.floor(random() * (index + 1));
    const current_value = shuffled[index];
    const swap_value = shuffled[swap_index];
    assertDefined(current_value, "current shuffle value");
    assertDefined(swap_value, "swap shuffle value");
    shuffled[index] = swap_value;
    shuffled[swap_index] = current_value;
  }
  return shuffled;
}
