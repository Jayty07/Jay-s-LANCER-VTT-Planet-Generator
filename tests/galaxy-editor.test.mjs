import { test } from "node:test";
import assert from "node:assert/strict";
import { generateGalaxy, generateSectorPlanets } from "../scripts/galaxy-generator.mjs";
import {
  addSector, addSectorPlanets, applyPlanetEdits, createEmptyGalaxy, findSector, gridHexes, gridRadius,
  moveSector, normalizeGalaxy, removeSector, removeSectorPlanet, replaceSectorPlanet, sectorAt, setGridRadius,
  toggleRoute, updateSector
} from "../scripts/galaxy-editor.mjs";

test("empty galaxy: add random and blank sectors, auto-linked to neighbours", () => {
  let g = createEmptyGalaxy({ radius: 4, seed: "e" });
  assert.equal(g.sectors.length, 0);
  assert.equal(gridHexes(4).length, 61);
  g = addSector(g, 0, 0, { seed: "a" });
  g = addSector(g, 1, 0, { mode: "blank", seed: "b" });
  g = addSector(g, 1, 0, { seed: "dup" });
  assert.equal(g.sectors.length, 2);
  assert.equal(sectorAt(g, 0, 0).controller, "union");
  const blank = sectorAt(g, 1, 0);
  assert.deepEqual(blank.planets, []);
  assert.equal(g.routes.length, 1);
  assert.ok(!g.sectors.some((s) => /horus/i.test(s.controller)));
});

test("sector edits keep planets stable and stay immutable", () => {
  const original = generateGalaxy({ seed: "edit", radius: 3 });
  const g0 = normalizeGalaxy(original);
  const s = g0.sectors[5];
  const before = generateSectorPlanets(g0, s).map((p) => p.name);
  const g1 = updateSector(g0, s.id, { name: "Renamed", controller: "aun", region: "aun", influence: 0.42 });
  const s1 = findSector(g1, s.id);
  assert.equal(s1.name, "Renamed");
  assert.equal(s1.controller, "aun");
  assert.equal(s1.influence, 0.42);
  assert.deepEqual(s1.planets.map((p) => p.name), before);
  assert.ok(s1.planets.every((p) => p.sector.name === "Renamed"));
  assert.equal(findSector(g0, s.id).name, s.name, "input not mutated");
  assert.equal(updateSector(g1, s.id, { controller: "horus" }).sectors.find((x) => x.id === s.id).controller, "aun");
});

test("move, erase, routes and grid size", () => {
  let g = normalizeGalaxy(generateGalaxy({ seed: "mv", radius: 2 }));
  const s = sectorAt(g, 2, 0);
  g = moveSector(g, s.id, 4, 0);
  assert.equal(sectorAt(g, 4, 0).id, s.id);
  assert.equal(gridRadius(g), 4);
  const occupied = sectorAt(g, 0, 0);
  assert.equal(sectorAt(moveSector(g, s.id, 0, 0), 4, 0).id, s.id, "cannot move onto an occupied hex");
  const a = occupied.id;
  const withRoute = toggleRoute(g, a, s.id);
  assert.equal(withRoute.routes.length, g.routes.length + 1);
  assert.equal(toggleRoute(withRoute, s.id, a).routes.length, g.routes.length);
  g = removeSector(withRoute, s.id);
  assert.ok(!findSector(g, s.id));
  assert.ok(!g.routes.some((r) => r.from === s.id || r.to === s.id));
  assert.equal(setGridRadius(g, 99).radius, 10);
});

test("planets can be added, replaced and removed in a sector", () => {
  let g = normalizeGalaxy(generateGalaxy({ seed: "pl", radius: 2 }));
  const id = g.sectors[0].id;
  const start = generateSectorPlanets(g, g.sectors[0]).length;
  g = addSectorPlanets(g, id, 3);
  const planets = findSector(g, id).planets;
  assert.equal(planets.length, start + 3);
  assert.equal(new Set(planets.map((p) => p.seed)).size, planets.length);
  const edited = applyPlanetEdits(planets[0], { name: "Hand Named", lore: "One.\n\nTwo." });
  g = replaceSectorPlanet(g, id, edited);
  assert.equal(findSector(g, id).planets[0].name, "Hand Named");
  g = removeSectorPlanet(g, id, edited.seed);
  assert.equal(findSector(g, id).planets.length, start + 2);
});

test("applyPlanetEdits maps form fields onto the planet", () => {
  const planet = generateSectorPlanets(normalizeGalaxy(generateGalaxy({ seed: "f" })), generateGalaxy({ seed: "f" }).sectors[0])[0];
  const next = applyPlanetEdits(planet, {
    name: " New Name ",
    isCore: false,
    "environment.label": "Glass Desert",
    "environment.flavor": "Sand fused to glass.",
    "military.factionId": "harrison",
    "military.tierId": "fortress",
    "military.forces": "Purview legions",
    "religion.label": "",
    lore: "First para\nwraps.\n\n\nSecond para."
  });
  assert.equal(next.name, "New Name");
  assert.equal(next.coreLabel, "Non-Core World");
  assert.equal(next.environment.label, "Glass Desert");
  assert.equal(next.military.faction, "Harrison Armory");
  assert.equal(next.military.tier, "Fortress World");
  assert.equal(next.military.forces, "Purview legions");
  assert.equal(next.religion, null);
  assert.deepEqual(next.lore, ["First para wraps.", "Second para."]);
  assert.equal(next.seed, planet.seed);
  assert.equal(applyPlanetEdits(planet, { "military.factionId": "horus" }).military.factionId, planet.military.factionId);
});
