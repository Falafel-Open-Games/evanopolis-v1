/*
 * Card deck rules for Evanopolis V1.
 * Owns card definitions, deterministic deck setup, and card draw resolution state.
 */

import type { MatchEvent } from "../multiplayer-core/types.js";
import type { EvanopolisBoardSpace } from "./board-v1.js";
import { spaceAt } from "./board-v1.js";
import { assertDefined, seededRandom } from "./rule-utils.js";
import { EvaMicroUnitsPerEva, formatEvaMicro } from "./eva-money.js";

export type EvanopolisCardDeckId = "luck" | "destiny";
export type EvanopolisCardEffectType = "eva_delta";

export interface EvanopolisCardEffect {
  readonly type: EvanopolisCardEffectType;
  readonly amount_eva: number;
  readonly amount_micro: number;
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

function evaCard(
  deck_id: EvanopolisCardDeckId,
  card_id: string,
  amount_eva: number,
  en: string,
  es: string,
  pt_br: string
): EvanopolisCardDefinition {
  return {
    card_id,
    deck_id,
    labels: { en, es, pt_br },
    effect: {
      type: "eva_delta",
      amount_eva,
      amount_micro: amount_eva * EvaMicroUnitsPerEva
    }
  };
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
      evaCard("luck", "luck_market_rally", 3,
        "Bull run. Sell high and receive 3 EVA.",
        "Mercado alcista. Vende en la subida y recibe 3 EVA.",
        "Bull run. Venda na alta e receba 3 EVA."),
      evaCard("luck", "luck_mining_bonus", 3,
        "You mined a block solo. Receive the full 3 EVA reward.",
        "Minaste un bloque en solitario. Recibe la recompensa completa de 3 EVA.",
        "Você minerou um bloco sozinho. Receba a recompensa cheia de 3 EVA."),
      evaCard("luck", "luck_old_wallet", 3,
        "You found an old wallet with BTC from 2013. Receive 3 EVA.",
        "Encontraste una billetera antigua con BTC de 2013. Recibe 3 EVA.",
        "Você achou uma carteira antiga com BTC de 2013. Receba 3 EVA."),
      evaCard("luck", "luck_surprise_airdrop", 1,
        "Surprise airdrop. Receive 1 EVA.",
        "Airdrop sorpresa. Recibe 1 EVA.",
        "Airdrop surpresa. Receba 1 EVA."),
      evaCard("luck", "luck_heat_sale", 2,
        "You sold machine heat to a neighboring greenhouse. Receive 2 EVA.",
        "Vendiste el calor de las máquinas a un invernadero vecino. Recibe 2 EVA.",
        "Você vendeu o calor das máquinas para uma estufa vizinha. Receba 2 EVA."),
      evaCard("luck", "luck_supplier_refund", 2,
        "The supplier refunded a defective machine. Receive 2 EVA.",
        "El proveedor reembolsó una máquina defectuosa. Recibe 2 EVA.",
        "O fornecedor reembolsou uma máquina com defeito. Receba 2 EVA."),
      evaCard("luck", "luck_tax_incentive", 2,
        "Mining tax incentive. Receive 2 EVA back in taxes.",
        "Incentivo fiscal para mineros. Recupera 2 EVA en impuestos.",
        "Incentivo fiscal para mineradores. Receba 2 EVA de volta em impostos."),
      evaCard("luck", "luck_asic_resale", 2,
        "You resold used ASICs at a profit. Receive 2 EVA.",
        "Revendiste ASIC usadas con ganancia. Recibe 2 EVA.",
        "Você comprou ASICs usadas e revendeu com lucro. Receba 2 EVA."),
      evaCard("luck", "luck_investor_funding", 3,
        "An investor funded your operation. Receive 3 EVA.",
        "Un inversor financió tu operación. Recibe 3 EVA.",
        "Um investidor aportou na sua operação. Receba 3 EVA."),
      evaCard("luck", "luck_pool_fee_bonus", 2,
        "Network fees surged and your pool paid a bonus. Receive 2 EVA.",
        "Las comisiones de red subieron y tu pool pagó un bono. Recibe 2 EVA.",
        "As taxas da rede dispararam e sua pool repassou um bônus. Receba 2 EVA."),
      evaCard("luck", "luck_efficiency_award", 2,
        "You won an energy efficiency award. Receive 2 EVA.",
        "Ganaste un premio de eficiencia energética. Recibe 2 EVA.",
        "Você ganhou um concurso de eficiência energética. Receba 2 EVA."),
      evaCard("luck", "luck_surplus_energy_sale", 2,
        "You sold surplus contracted energy back to the grid. Receive 2 EVA.",
        "Vendiste a la red la energía sobrante de tu contrato. Recibe 2 EVA.",
        "Você revendeu para a rede a energia que sobrou do contrato. Receba 2 EVA."),
      evaCard("luck", "luck_unexpected_client", 1,
        "An old client paid a forgotten debt. Receive 1 EVA.",
        "Un antiguo cliente pagó una deuda olvidada. Recibe 1 EVA.",
        "Um cliente antigo pagou uma dívida esquecida. Receba 1 EVA."),
      evaCard("luck", "luck_halving_market", 3,
        "The halving lifted the market. Receive 3 EVA.",
        "El halving impulsó el mercado. Recibe 3 EVA.",
        "O halving valorizou o mercado. Receba 3 EVA."),
      evaCard("luck", "luck_hydroelectric_discount", 2,
        "You secured a discounted hydroelectric power contract. Receive 2 EVA back.",
        "Cerraste un contrato hidroeléctrico con descuento. Recupera 2 EVA.",
        "Você fechou um contrato de energia hidrelétrica com desconto. Receba 2 EVA de volta."),
      evaCard("luck", "luck_documentary_publicity", 1,
        "Your operation appeared in a mining documentary. Receive 1 EVA in publicity.",
        "Tu operación apareció en un documental sobre minería. Recibe 1 EVA en publicidad.",
        "Sua operação apareceu em um documentário sobre mineração. Receba 1 EVA em publicidade."),
      evaCard("luck", "luck_funds_recovered", 2,
        "The courts recovered funds from an old scam. Receive 2 EVA.",
        "La justicia recuperó fondos de una estafa antigua. Recibe 2 EVA.",
        "A justiça recuperou fundos de um golpe antigo. Receba 2 EVA.")
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
      evaCard("destiny", "destiny_high_energy_bill", -2,
        "Your energy bill was higher than expected. Pay 2 EVA.",
        "Tu factura de energía fue más alta de lo esperado. Paga 2 EVA.",
        "Sua conta de energia veio mais alta que o esperado. Pague 2 EVA."),
      evaCard("destiny", "destiny_operating_tax", -2,
        "A new tax was introduced. Pay 2 EVA.",
        "Se creó un nuevo impuesto. Paga 2 EVA.",
        "Um novo imposto foi criado. Pague 2 EVA."),
      evaCard("destiny", "destiny_bear_market", -3,
        "The bear market forced a sale. Lose 3 EVA.",
        "El mercado bajista forzó una venta. Pierde 3 EVA.",
        "O bear market forçou uma venda. Perca 3 EVA."),
      evaCard("destiny", "destiny_btc_ban", -2,
        "A country banned BTC. Lose 2 EVA.",
        "Un país prohibió BTC. Pierde 2 EVA.",
        "Um país baniu o BTC. Perca 2 EVA."),
      evaCard("destiny", "destiny_burned_transformer", -3,
        "A transformer burned out. Pay 3 EVA.",
        "Se quemó un transformador. Paga 3 EVA.",
        "Um transformador queimou. Pague 3 EVA."),
      evaCard("destiny", "destiny_urgent_maintenance", -2,
        "A machine needed repairs. Pay 2 EVA.",
        "Una máquina necesitó reparación. Paga 2 EVA.",
        "Uma máquina precisou ser consertada. Pague 2 EVA."),
      evaCard("destiny", "destiny_heat_wave", -2,
        "Heat wave. Pay 2 EVA for extra cooling.",
        "Ola de calor. Paga 2 EVA por refrigeración adicional.",
        "Onda de calor. Pague 2 EVA de refrigeração extra."),
      evaCard("destiny", "destiny_inspection_fine", -2,
        "Inspection fine. Pay 2 EVA.",
        "Multa de inspección. Paga 2 EVA.",
        "Multa da fiscalização. Pague 2 EVA."),
      evaCard("destiny", "destiny_dust_cleanup", -1,
        "Dust accumulated on the machines. Pay 1 EVA for cleaning.",
        "Se acumuló polvo en las máquinas. Paga 1 EVA por la limpieza.",
        "Poeira acumulou nas máquinas. Pague 1 EVA de limpeza."),
      evaCard("destiny", "destiny_noise_insulation", -1,
        "Neighbors complained about the noise. Pay 1 EVA for soundproofing.",
        "Los vecinos se quejaron del ruido. Paga 1 EVA por aislamiento acústico.",
        "Os vizinhos reclamaram do barulho. Pague 1 EVA de isolamento acústico."),
      evaCard("destiny", "destiny_phishing_scam", -3,
        "Phishing scam. Lose 3 EVA from your wallet.",
        "Estafa de phishing. Pierde 3 EVA de tu billetera.",
        "Golpe de phishing. Perca 3 EVA da sua carteira."),
      evaCard("destiny", "destiny_pool_attack", -2,
        "Your pool was hacked. Pay a 2 EVA recovery fee.",
        "Tu pool sufrió un ataque. Paga 2 EVA de recuperación.",
        "Sua pool sofreu um ataque hacker. Pague 2 EVA de recuperação."),
      evaCard("destiny", "destiny_import_tariff", -2,
        "Hardware import tariffs increased. Pay 2 EVA.",
        "Subieron los aranceles de importación de hardware. Paga 2 EVA.",
        "A taxa de importação de hardware subiu. Pague 2 EVA."),
      evaCard("destiny", "destiny_firmware_failure", -1,
        "The firmware crashed. Pay the technician 1 EVA.",
        "El firmware falló. Paga 1 EVA al técnico.",
        "O firmware travou. Pague 1 EVA ao técnico."),
      evaCard("destiny", "destiny_rat_network_cable", -1,
        "A rat chewed through the warehouse network cable. Pay 1 EVA.",
        "Una rata mordió el cable de red del almacén. Paga 1 EVA.",
        "Um rato roeu o cabo de rede do galpão. Pague 1 EVA."),
      evaCard("destiny", "destiny_asics_customs", -2,
        "Your ASIC shipment was held at customs. Pay 2 EVA to release it.",
        "Tu envío de ASIC quedó retenido en aduanas. Paga 2 EVA para liberarlo.",
        "O frete das ASICs ficou retido na alfândega. Pague 2 EVA para liberar."),
      evaCard("destiny", "destiny_burned_power_supply", -2,
        "A power supply burned out. Pay 2 EVA.",
        "Se quemó una fuente de alimentación. Paga 2 EVA.",
        "Uma fonte de alimentação queimou. Pague 2 EVA.")
    ]
  }
];

export function buildEvanopolisCardDecks(
  raw_eva_scale_micro: number = EvaMicroUnitsPerEva
): readonly EvanopolisCardDeckDefinition[] {
  return EvanopolisCardDecks.map((deck) => ({
    ...deck,
    cards: deck.cards.map((card) => {
      const raw_amount_eva = card.effect.amount_eva;
      const amount_micro = raw_amount_eva * raw_eva_scale_micro;
      const amount_eva = Number(formatEvaMicro(amount_micro));
      const raw_amount_text = `${Math.abs(raw_amount_eva)} EVA`;
      const scaled_amount_text = `${formatEvaMicro(Math.abs(amount_micro))} EVA`;
      return {
        ...card,
        labels: {
          en: card.labels.en.replaceAll(raw_amount_text, scaled_amount_text),
          es: card.labels.es.replaceAll(raw_amount_text, scaled_amount_text),
          pt_br: card.labels.pt_br.replaceAll(raw_amount_text, scaled_amount_text)
        },
        effect: {
          type: "eva_delta",
          amount_eva,
          amount_micro
        }
      };
    })
  }));
}

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
  position: number,
  raw_eva_scale_micro: number = EvaMicroUnitsPerEva
): EvanopolisCardDrawResult {
  const space = spaceAt(position, raw_eva_scale_micro);
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
  const card = card_id === undefined
    ? undefined
    : cardDefinition(buildEvanopolisCardDecks(raw_eva_scale_micro), deck_id, card_id);
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
  card_decks: readonly EvanopolisCardDeckDefinition[],
  deck_id: EvanopolisCardDeckId,
  card_id: string
): EvanopolisCardDefinition | undefined {
  return card_decks
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
