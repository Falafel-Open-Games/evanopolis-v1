import assert from "node:assert/strict";
import test from "node:test";
import { EvanopolisRulesAdapter, MatchRegistry } from "../../src/index.js";
import type { EvanopolisDefinition, EvanopolisMatchState, EvanopolisSnapshot } from "../../src/index.js";

function createMatch() {
  const registry = new MatchRegistry<EvanopolisMatchState, EvanopolisSnapshot, EvanopolisDefinition>({
    player_count: 3,
    rules: new EvanopolisRulesAdapter()
  });
  return registry.getOrCreate("demo");
}

test("evanopolis snapshot includes expected render fields", () => {
  const match = createMatch();
  match.join("client-a");
  match.join("client-b");
  const waiting_snapshot = match.snapshotFor("client-a");
  const client_c = match.join("client-c");
  const spectator = match.join("client-d");

  assert.equal(waiting_snapshot.players[0]?.joined, true);
  assert.equal(waiting_snapshot.players[0]?.connected, true);
  assert.equal(waiting_snapshot.players[2]?.joined, false);
  assert.equal(waiting_snapshot.players[2]?.connected, false);
  assert.deepEqual(waiting_snapshot.available_actions, []);

  assert.equal(client_c.snapshot.match_id, "demo");
  assert.equal(client_c.snapshot.revision, 3);
  assert.equal(client_c.snapshot.phase, "active");
  assert.equal(client_c.snapshot.local_player_id, "player_3");
  assert.equal(client_c.snapshot.active_player_id, "player_1");
  assert.equal(client_c.snapshot.players.length, 3);
  assert.equal(client_c.snapshot.players[0]?.player_id, "player_1");
  assert.equal(client_c.snapshot.players[0]?.joined, true);
  assert.equal(client_c.snapshot.players[0]?.connected, true);
  assert.equal(client_c.snapshot.spectators.length, 0);
  assert.deepEqual(client_c.snapshot.terrain_ownership, []);
  assert.equal(client_c.definition.ruleset_id, "evanopolis_v1");
  assert.equal(client_c.definition.spaces.length, 36);
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
    development_rent_table: [
      { level: 0, build_label: "Empty", rent_eva: 0.5 },
      { level: 1, build_label: "Container", rent_eva: 1.8 },
      { level: 2, build_label: "+50", rent_eva: 2.8 },
      { level: 3, build_label: "+100", rent_eva: 4 },
      { level: 4, build_label: "+150", rent_eva: 5.4 },
      { level: 5, build_label: "+200", rent_eva: 7 }
    ],
    container_price_eva: 2,
    machine_lot_price_eva: 1
  });
  assert.equal(Object.hasOwn(client_c.definition.spaces[1] ?? {}, "accent_color"), false);
  assert.deepEqual(client_c.definition.spaces[7]?.development_rent_table, [
    { level: 0, build_label: "Empty", rent_eva: 1 },
    { level: 1, build_label: "Container", rent_eva: 2.4 },
    { level: 2, build_label: "+50", rent_eva: 3.5 },
    { level: 3, build_label: "+100", rent_eva: 4.8 },
    { level: 4, build_label: "+150", rent_eva: 6.3 },
    { level: 5, build_label: "+200", rent_eva: 8 }
  ]);
  assert.deepEqual(client_c.definition.spaces[31]?.development_rent_table, [
    { level: 0, build_label: "Empty", rent_eva: 2 },
    { level: 1, build_label: "Container", rent_eva: 3.6 },
    { level: 2, build_label: "+50", rent_eva: 4.9 },
    { level: 3, build_label: "+100", rent_eva: 6.4 },
    { level: 4, build_label: "+150", rent_eva: 8.1 },
    { level: 5, build_label: "+200", rent_eva: 10 }
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
    purchase_price_eva: 10
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
    purchase_price_eva: 5
  });
  assert.equal(client_c.snapshot.dice, null);
  assert.deepEqual(client_c.snapshot.available_actions, []);

  assert.equal(spectator.snapshot.spectators.length, 1);
  assert.equal(spectator.snapshot.spectators[0]?.spectator_id, "spectator_1");
  assert.equal(spectator.snapshot.spectators[0]?.connected, true);
  assert.deepEqual(spectator.snapshot.terrain_ownership, []);
  assert.deepEqual(spectator.snapshot.available_actions, []);
});
