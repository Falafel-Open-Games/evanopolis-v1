import assert from "node:assert/strict";
import test from "node:test";
import { EvanopolisRulesAdapter, EvanopolisStartingBalanceEva, MatchRegistry } from "../../src/index.js";
import type { EvanopolisDefinition, EvanopolisMatchState, EvanopolisSnapshot } from "../../src/index.js";

function createMatch() {
  const registry = new MatchRegistry<EvanopolisMatchState, EvanopolisSnapshot, EvanopolisDefinition>({
    player_count: 3,
    rules: new EvanopolisRulesAdapter()
  });
  return registry.getOrCreate("demo");
}

test("evanopolis custom room buy-in sets starting player balances", () => {
  const registry = new MatchRegistry<EvanopolisMatchState, EvanopolisSnapshot, EvanopolisDefinition>({
    player_count: 2,
    rules: new EvanopolisRulesAdapter()
  });
  const match = registry.getOrCreate("small-buy-in", 2, { room_buy_in_eva: 3 });
  const client_a = match.join("client-a");

  assert.equal(client_a.definition.random_seed, "evanopolis:small-buy-in");
  assert.equal(client_a.snapshot.random_seed, "evanopolis:small-buy-in");
  assert.equal(client_a.snapshot.dice_roll_count, 0);
  assert.equal(client_a.definition.room_buy_in_eva, 3);
  assert.equal(client_a.snapshot.room_buy_in_eva, 3);
  assert.equal(client_a.snapshot.players[0]?.eva_balance, 3);
  assert.equal(client_a.snapshot.players[1]?.eva_balance, 3);
});

test("paid economy profile publishes exact micro-EVA allocations", () => {
  const registry = new MatchRegistry<EvanopolisMatchState, EvanopolisSnapshot, EvanopolisDefinition>({
    player_count: 4,
    rules: new EvanopolisRulesAdapter()
  });
  const match = registry.getOrCreate("average-paid-room", 4, {
    room_buy_in_eva: 0.5,
    entry_fee_tier: "average",
    ticket_micro: 500_000
  });
  const client_a = match.join("client-a");

  assert.equal(client_a.definition.entry_fee_tier, "average");
  assert.equal(client_a.definition.ticket_micro, 500_000);
  assert.equal(client_a.definition.player_starting_balance_micro, 400_000);
  assert.equal(client_a.definition.raw_eva_scale_micro, 8_000);
  assert.equal(client_a.definition.initial_jackpot_balance_micro, 200_000);
  assert.equal(client_a.definition.initial_bank_reserve_micro, 200_000);
  assert.equal(client_a.definition.spaces[1]?.purchase_price_micro, 8_000);
  assert.equal(client_a.definition.spaces[1]?.development_rent_table?.[0]?.rent_micro, 4_000);
  assert.equal(client_a.definition.spaces[1]?.container_price_micro, 16_000);
  assert.equal(client_a.definition.spaces[1]?.machine_lot_price_micro, 8_000);
  assert.equal(client_a.definition.spaces[3]?.purchase_price_micro, 40_000);
  assert.equal(client_a.definition.card_decks[0]?.cards[0]?.effect.amount_micro, 24_000);
  assert.equal(client_a.definition.card_decks[1]?.cards[0]?.effect.amount_micro, -16_000);
  assert.match(client_a.definition.card_decks[0]?.cards[0]?.labels.en ?? "", /0\.024 EVA/);
  assert.equal(client_a.snapshot.entry_fee_tier, "average");
  assert.equal(client_a.snapshot.ticket_micro, 500_000);
  assert.equal(client_a.snapshot.jackpot_balance_micro, 200_000);
  assert.equal(client_a.snapshot.bank_reserve_micro, 200_000);
  assert.equal(client_a.snapshot.players[0]?.eva_balance, 0.4);
  assert.equal(client_a.snapshot.players[0]?.eva_balance_micro, 400_000);
});

test("paid economy profile rejects a mismatched ticket amount", () => {
  const rules = new EvanopolisRulesAdapter();
  assert.throws(
    () => rules.createInitialState("mismatched-paid-room", 2, {
      room_buy_in_eva: 0.5,
      entry_fee_tier: "average",
      ticket_micro: 100_000
    }),
    /Ticket micro amount does not match average economy/
  );
});

test("evanopolis snapshot includes expected render fields", () => {
  const match = createMatch();
  match.join("client-a");
  match.join("client-b");
  const waiting_snapshot = match.snapshotFor("client-a");
  const client_c = match.join("client-c");
  const spectator = match.join("client-d");

  assert.equal(waiting_snapshot.players[0]?.joined, true);
  assert.equal(waiting_snapshot.players[0]?.connected, true);
  assert.equal(waiting_snapshot.players[0]?.status, "active");
  assert.equal(waiting_snapshot.players[0]?.eva_balance, EvanopolisStartingBalanceEva);
  assert.equal(waiting_snapshot.players[2]?.joined, false);
  assert.equal(waiting_snapshot.players[2]?.connected, false);
  assert.equal(waiting_snapshot.players[2]?.status, "active");
  assert.equal(waiting_snapshot.players[2]?.eva_balance, EvanopolisStartingBalanceEva);
  assert.deepEqual(waiting_snapshot.available_actions, []);
  assert.deepEqual(waiting_snapshot.recent_events, []);

  assert.equal(client_c.snapshot.match_id, "demo");
  assert.equal(client_c.snapshot.revision, 3);
  assert.equal(client_c.snapshot.phase, "active");
  assert.equal(client_c.snapshot.random_seed, "evanopolis:demo");
  assert.equal(client_c.snapshot.dice_roll_count, 0);
  assert.equal(client_c.snapshot.local_player_id, "player_3");
  assert.equal(client_c.snapshot.active_player_id, "player_1");
  assert.equal(client_c.snapshot.winner_player_id, "");
  assert.equal(client_c.snapshot.players.length, 3);
  assert.equal(client_c.snapshot.players[0]?.player_id, "player_1");
  assert.equal(client_c.snapshot.players[0]?.joined, true);
  assert.equal(client_c.snapshot.players[0]?.connected, true);
  assert.equal(client_c.snapshot.players[0]?.status, "active");
  assert.equal(client_c.snapshot.players[0]?.eva_balance, EvanopolisStartingBalanceEva);
  assert.equal(client_c.snapshot.spectators.length, 0);
  assert.deepEqual(client_c.snapshot.terrain_ownership, []);
  assert.deepEqual(client_c.snapshot.special_property_ownership, []);
  assert.equal(client_c.definition.ruleset_id, "evanopolis_v1");
  assert.equal(client_c.definition.random_seed, "evanopolis:demo");
  assert.equal(client_c.definition.spaces.length, 36);
  assert.deepEqual(
    client_c.definition.card_decks.map((deck) => deck.deck_id),
    ["luck", "destiny"]
  );
  assert.deepEqual(
    client_c.definition.card_decks.map((deck) => deck.cards.length),
    [17, 17]
  );
  assert.deepEqual(
    client_c.definition.card_decks.flatMap((deck) => deck.cards.map((card) => card.card_id)),
    [
      "luck_market_rally",
      "luck_mining_bonus",
      "luck_old_wallet",
      "luck_surprise_airdrop",
      "luck_heat_sale",
      "luck_supplier_refund",
      "luck_tax_incentive",
      "luck_asic_resale",
      "luck_investor_funding",
      "luck_pool_fee_bonus",
      "luck_efficiency_award",
      "luck_surplus_energy_sale",
      "luck_unexpected_client",
      "luck_halving_market",
      "luck_hydroelectric_discount",
      "luck_documentary_publicity",
      "luck_funds_recovered",
      "destiny_high_energy_bill",
      "destiny_operating_tax",
      "destiny_bear_market",
      "destiny_btc_ban",
      "destiny_burned_transformer",
      "destiny_urgent_maintenance",
      "destiny_heat_wave",
      "destiny_inspection_fine",
      "destiny_dust_cleanup",
      "destiny_noise_insulation",
      "destiny_phishing_scam",
      "destiny_pool_attack",
      "destiny_import_tariff",
      "destiny_firmware_failure",
      "destiny_rat_network_cable",
      "destiny_asics_customs",
      "destiny_burned_power_supply"
    ]
  );
  for (const deck of client_c.definition.card_decks) {
    assert.equal(typeof deck.labels.en, "string");
    assert.equal(typeof deck.labels.es, "string");
    assert.equal(typeof deck.labels.pt_br, "string");
    assert.notEqual(deck.labels.en, "");
    assert.notEqual(deck.labels.es, "");
    assert.notEqual(deck.labels.pt_br, "");
    for (const card of deck.cards) {
      assert.equal(card.deck_id, deck.deck_id);
      assert.equal(typeof card.labels.en, "string");
      assert.equal(typeof card.labels.es, "string");
      assert.equal(typeof card.labels.pt_br, "string");
      assert.notEqual(card.labels.en, "");
      assert.notEqual(card.labels.es, "");
      assert.notEqual(card.labels.pt_br, "");
      assert.equal(card.effect.type, "eva_delta");
      assert.equal(typeof card.effect.amount_eva, "number");
      assert.equal(
        Math.sign(card.effect.amount_eva),
        deck.deck_id === "luck" ? 1 : -1
      );
    }
  }
  for (const space of client_c.definition.spaces) {
    assert.equal(typeof space.labels.en, "string");
    assert.equal(typeof space.labels.es, "string");
    assert.equal(typeof space.labels.pt_br, "string");
    assert.notEqual(space.labels.en, "");
    assert.notEqual(space.labels.es, "");
    assert.notEqual(space.labels.pt_br, "");
    if (space.group_labels !== undefined) {
      assert.equal(typeof space.group_labels.en, "string");
      assert.equal(typeof space.group_labels.es, "string");
      assert.equal(typeof space.group_labels.pt_br, "string");
      assert.notEqual(space.group_labels.en, "");
      assert.notEqual(space.group_labels.es, "");
      assert.notEqual(space.group_labels.pt_br, "");
    }
  }
  for (const [group_id, label] of [
    ["caracas", "Caracas"],
    ["asuncion", "Asuncion"],
    ["ciudad_del_este", "Ciudad del Este"],
    ["minsk", "Minsk"],
    ["siberia", "Siberia"],
    ["texas", "Texas"]
  ] as const) {
    const terrain_spaces = client_c.definition.spaces.filter((space) => space.group_id === group_id);
    assert.equal(terrain_spaces.length, 4);
    assert.deepEqual(
      terrain_spaces.map((space) => space.label),
      [label, label, label, label]
    );
    assert.deepEqual(
      terrain_spaces.map((space) => space.terrain_index),
      [1, 2, 3, 4]
    );
    assert.deepEqual(
      terrain_spaces.map((space) => space.space_id),
      [`terrain_${group_id}_1`, `terrain_${group_id}_2`, `terrain_${group_id}_3`, `terrain_${group_id}_4`]
    );
  }
  assert.deepEqual(
    client_c.definition.spaces.map((space) => space.space_id),
    [
      "start",
      "terrain_caracas_1",
      "terrain_caracas_2",
      "special_importer_1",
      "terrain_caracas_3",
      "terrain_caracas_4",
      "luck_1",
      "terrain_asuncion_1",
      "terrain_asuncion_2",
      "special_substation_1",
      "terrain_asuncion_3",
      "terrain_asuncion_4",
      "destiny_1",
      "terrain_ciudad_del_este_1",
      "terrain_ciudad_del_este_2",
      "special_private_workshop",
      "terrain_ciudad_del_este_3",
      "terrain_ciudad_del_este_4",
      "jail",
      "terrain_minsk_1",
      "terrain_minsk_2",
      "special_importer_2",
      "terrain_minsk_3",
      "terrain_minsk_4",
      "luck_2",
      "terrain_siberia_1",
      "terrain_siberia_2",
      "special_substation_2",
      "terrain_siberia_3",
      "terrain_siberia_4",
      "destiny_2",
      "terrain_texas_1",
      "terrain_texas_2",
      "special_cooling_plant",
      "terrain_texas_3",
      "terrain_texas_4"
    ]
  );
  assert.deepEqual(client_c.definition.spaces[1], {
    index: 1,
    space_id: "terrain_caracas_1",
    kind: "terrain",
    label: "Caracas",
    labels: {
      en: "Caracas",
      es: "Caracas",
      pt_br: "Caracas"
    },
    group_id: "caracas",
    group_label: "Caracas",
    group_labels: {
      en: "Caracas",
      es: "Caracas",
      pt_br: "Caracas"
    },
    terrain_index: 1,
    purchase_price_eva: 1,
    purchase_price_micro: 1_000_000,
    development_rent_table: [
      { level: 0, build_label: "Empty", rent_eva: 0.5, rent_micro: 500_000 },
      { level: 1, build_label: "Container", rent_eva: 1.8, rent_micro: 1_800_000 },
      { level: 2, build_label: "1 lot / 50 rigs", rent_eva: 2.8, rent_micro: 2_800_000 },
      { level: 3, build_label: "2 lots / 100 rigs", rent_eva: 4, rent_micro: 4_000_000 },
      { level: 4, build_label: "3 lots / 150 rigs", rent_eva: 5.4, rent_micro: 5_400_000 },
      { level: 5, build_label: "4 lots / 200 rigs", rent_eva: 7, rent_micro: 7_000_000 }
    ],
    container_price_eva: 2,
    container_price_micro: 2_000_000,
    machine_lot_price_eva: 1,
    machine_lot_price_micro: 1_000_000
  });
  assert.equal(Object.hasOwn(client_c.definition.spaces[1] ?? {}, "accent_color"), false);
  assert.deepEqual(client_c.definition.spaces[7]?.development_rent_table, [
    { level: 0, build_label: "Empty", rent_eva: 1, rent_micro: 1_000_000 },
    { level: 1, build_label: "Container", rent_eva: 2.4, rent_micro: 2_400_000 },
    { level: 2, build_label: "1 lot / 50 rigs", rent_eva: 3.5, rent_micro: 3_500_000 },
    { level: 3, build_label: "2 lots / 100 rigs", rent_eva: 4.8, rent_micro: 4_800_000 },
    { level: 4, build_label: "3 lots / 150 rigs", rent_eva: 6.3, rent_micro: 6_300_000 },
    { level: 5, build_label: "4 lots / 200 rigs", rent_eva: 8, rent_micro: 8_000_000 }
  ]);
  assert.deepEqual(client_c.definition.spaces[31]?.development_rent_table, [
    { level: 0, build_label: "Empty", rent_eva: 2, rent_micro: 2_000_000 },
    { level: 1, build_label: "Container", rent_eva: 3.6, rent_micro: 3_600_000 },
    { level: 2, build_label: "1 lot / 50 rigs", rent_eva: 4.9, rent_micro: 4_900_000 },
    { level: 3, build_label: "2 lots / 100 rigs", rent_eva: 6.4, rent_micro: 6_400_000 },
    { level: 4, build_label: "3 lots / 150 rigs", rent_eva: 8.1, rent_micro: 8_100_000 },
    { level: 5, build_label: "4 lots / 200 rigs", rent_eva: 10, rent_micro: 10_000_000 }
  ]);
  for (const space of client_c.definition.spaces) {
    if (space.kind === "terrain") {
      assert.equal(space.development_rent_table?.length, 6);
      assert.equal(space.container_price_eva, 2);
      assert.equal(space.machine_lot_price_eva, 1);
    } else {
      assert.equal(space.development_rent_table, undefined);
      assert.equal(space.container_price_eva, undefined);
      assert.equal(space.machine_lot_price_eva, undefined);
    }
  }
  assert.deepEqual(client_c.definition.spaces[33], {
    index: 33,
    space_id: "special_cooling_plant",
    kind: "special_property",
    label: "Cooling Plant",
    labels: {
      en: "Cooling Plant",
      es: "Planta de Refrigeración",
      pt_br: "Usina de Refrigeração"
    },
    special_property_id: "cooling_plant",
    purchase_price_eva: 10,
    purchase_price_micro: 10_000_000
  });
  assert.deepEqual(client_c.definition.spaces[21], {
    index: 21,
    space_id: "special_importer_2",
    kind: "special_property",
    label: "Importadora 2",
    labels: {
      en: "Importer 2",
      es: "Importadora 2",
      pt_br: "Importadora 2"
    },
    special_property_id: "importer_2",
    purchase_price_eva: 5,
    purchase_price_micro: 5_000_000
  });
  assert.equal(client_c.snapshot.dice, null);
  assert.equal(client_c.snapshot.pending_rent, null);
  assert.equal(client_c.snapshot.pending_card_resolution, null);
  assert.deepEqual(client_c.snapshot.available_actions, []);

  assert.equal(spectator.snapshot.spectators.length, 1);
  assert.equal(spectator.snapshot.spectators[0]?.spectator_id, "spectator_1");
  assert.equal(spectator.snapshot.spectators[0]?.connected, true);
  assert.deepEqual(spectator.snapshot.terrain_ownership, []);
  assert.deepEqual(spectator.snapshot.special_property_ownership, []);
  assert.equal(spectator.snapshot.pending_rent, null);
  assert.equal(spectator.snapshot.pending_card_resolution, null);
  assert.deepEqual(spectator.snapshot.available_actions, []);
});
