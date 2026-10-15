import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Handlebars from "handlebars";
import { CONTROLLING_FACTIONS, generatePlanet, rerollPlanet } from "../scripts/planet-generator.mjs";
import { generateGalaxy, generateSectorPlanets } from "../scripts/galaxy-generator.mjs";
import { FACTIONS, SECTION_IDS } from "../scripts/tables.mjs";

const SAMPLES = 3000;

test("HORUS is never in the controlling-faction pool", () => {
  for (const pool of [FACTIONS, CONTROLLING_FACTIONS]) {
    assert.ok(!pool.some((f) => /horus/i.test(f.id) || /horus/i.test(f.name)));
  }
  for (let i = 0; i < SAMPLES; i++) {
    const p = generatePlanet({ seed: `h${i}` });
    assert.ok(!/horus/i.test(p.military.factionId + p.military.faction));
  }
  const galaxy = generateGalaxy({ seed: "horus-check", radius: 5 });
  assert.ok(!galaxy.sectors.some((s) => /horus/i.test(s.controller + s.controllerName)));
});

test("planets have every field and 2-4 lore paragraphs", () => {
  for (let i = 0; i < SAMPLES; i++) {
    const p = generatePlanet({ seed: `p${i}` });
    for (const key of ["name", "environment", "dialect", "politicalClimate", "foundingEra", "military", "religion"]) assert.ok(p[key], key);
    assert.equal(typeof p.isCore, "boolean");
    assert.ok(p.lore.length >= 2 && p.lore.length <= 4, `lore length ${p.lore.length}`);
    assert.ok(p.lore.every((t) => !t.includes("{name}") && !t.includes("undefined")));
    assert.ok(["militia", "garrisoned", "fortress", "shipyard"].includes(p.military.tierId));
  }
});

test("same seed gives the same planet", () => {
  assert.deepEqual(generatePlanet({ seed: "same" }), generatePlanet({ seed: "same" }));
});

test("religion can be excluded", () => {
  assert.equal(generatePlanet({ seed: "x", includeReligion: false }).religion, null);
});

test("core status weights the tables", () => {
  const count = (isCore) => {
    let union = 0;
    for (let i = 0; i < SAMPLES; i++) if (generatePlanet({ seed: `c${i}`, isCore }).military.factionId === "union") union++;
    return union;
  };
  assert.ok(count(true) > count(false) * 1.5);
  for (let i = 0; i < 500; i++) assert.notEqual(generatePlanet({ seed: `a${i}`, isCore: true }).military.factionId, "aun");
});

test("faction weights can disable factions", () => {
  const factionWeights = Object.fromEntries(CONTROLLING_FACTIONS.map((f) => [f.id, { enabled: f.id === "karrakin", weight: 1 }]));
  for (let i = 0; i < 300; i++) assert.equal(generatePlanet({ seed: `w${i}`, factionWeights }).military.factionId, "karrakin");
  const none = Object.fromEntries(CONTROLLING_FACTIONS.map((f) => [f.id, { enabled: false, weight: 1 }]));
  assert.equal(generatePlanet({ seed: "none", factionWeights: none }).military.factionId, "independent");
});

test("reroll keeps unselected sections and rewrites dependent lore", () => {
  const p = generatePlanet({ seed: "base" });
  const r = rerollPlanet(p, ["dialect"], { seed: "other" });
  for (const key of ["name", "environment", "politicalClimate", "foundingEra", "military", "religion", "lore", "isCore"]) assert.deepEqual(r[key], p[key], key);
  const n = rerollPlanet(p, ["name"], { seed: "other2" });
  assert.ok(n.lore[0].startsWith(n.name));
  const all = rerollPlanet(p, SECTION_IDS, { seed: "all" });
  assert.equal(all.isCore, p.isCore);
});

test("galaxy layout: Union core center, Karrakin and Aun only at the rim, connected routes", () => {
  for (let g = 0; g < 50; g++) {
    const galaxy = generateGalaxy({ seed: `g${g}` });
    const center = galaxy.sectors.find((s) => s.q === 0 && s.r === 0);
    assert.equal(center.controller, "union");
    for (const s of galaxy.sectors) {
      if (s.controller === "karrakin" || s.controller === "aun") assert.ok(["karrakin", "aun"].includes(s.region), s.region);
      assert.ok(s.influence > 0 && s.influence <= 1);
      assert.ok(s.planetCount >= 1);
    }
    // Every sector is reachable through blink-gate routes.
    const adj = new Map(galaxy.sectors.map((s) => [s.id, []]));
    for (const r of galaxy.routes) {
      adj.get(r.from).push(r.to);
      adj.get(r.to).push(r.from);
    }
    const seen = new Set([center.id]);
    const queue = [center.id];
    while (queue.length) for (const n of adj.get(queue.shift())) if (!seen.has(n)) seen.add(n) && queue.push(n);
    assert.equal(seen.size, galaxy.sectors.length);

    const sector = galaxy.sectors[g % galaxy.sectors.length];
    const planets = generateSectorPlanets(galaxy, sector);
    assert.equal(planets.length, sector.planetCount);
    assert.deepEqual(planets, generateSectorPlanets(galaxy, sector));
    if (sector.region !== "core" && sector.region !== "inner") assert.ok(planets.every((p) => !p.isCore));
  }
});

test("planet page template renders every section", () => {
  const hbs = Handlebars.create();
  hbs.registerHelper("localize", (key) => key);
  const render = hbs.compile(readFileSync(new URL("../templates/planet-page.hbs", import.meta.url), "utf8"));
  const p = generatePlanet({ seed: "tpl" });
  const html = render(p);
  for (const text of [p.environment.label, p.dialect.label, p.politicalClimate.label, p.military.faction, p.military.tier, p.religion.label, ...p.lore]) {
    assert.ok(html.includes(hbs.escapeExpression(text)), text);
  }
  assert.ok(!html.includes("data-action"));
  assert.ok(render({ ...p, controls: true }).includes('data-action="rerollSection"'));
  assert.ok(render({ ...p, religion: null }).includes("LPG.Page.NoReligion"));
});

test("galaxy map template renders sector and edit panels", () => {
  const hbs = Handlebars.create();
  hbs.registerHelper("localize", (key) => key);
  hbs.registerHelper("checked", (v) => (v ? "checked" : ""));
  hbs.registerHelper("selectOptions", (choices, { hash }) =>
    new hbs.SafeString(Object.entries(choices ?? {}).map(([k, v]) => `<option value="${k}"${k === hash.selected ? " selected" : ""}>${v}</option>`).join(""))
  );
  const render = hbs.compile(readFileSync(new URL("../templates/galaxy-map.hbs", import.meta.url), "utf8"));
  const galaxy = generateGalaxy({ seed: "tplg" });
  const sector = galaxy.sectors[0];
  const planets = generateSectorPlanets(galaxy, sector).map((planet) => ({ planet }));
  const base = { galaxy, svg: "<svg></svg>", tools: [], legend: [], factionOptions: { union: "Union" }, regionOptions: { core: "Union Core" } };
  const sectorHtml = render({ ...base, sector: { ...sector, influencePercent: 50 }, planets });
  assert.ok(sectorHtml.includes('name="sector.name"') && sectorHtml.includes('data-action="editPlanet"'));
  const p = planets[0].planet;
  const editHtml = render({ ...base, sector, planets, edit: { planet: p, loreText: p.lore.join("\\n\\n"), tierOptions: { militia: "Planetary Militia" } } });
  for (const name of ["name", "environment.label", "military.factionId", "military.tierId", "religion.label", "lore"]) assert.ok(editHtml.includes(`name="${name}"`), name);
  assert.ok(editHtml.includes('data-action="commitPlanet"'));
  assert.ok(!editHtml.includes('name="sector.name"'));
});

test("every LPG localization key used in code and templates exists", () => {
  const lang = JSON.parse(readFileSync(new URL("../lang/en.json", import.meta.url), "utf8"));
  const has = (key) => key.split(".").reduce((o, k) => o?.[k], lang) !== undefined;
  const files = ["scripts/main.mjs", "scripts/journal.mjs", "scripts/apps/planet-generator-app.mjs", "scripts/apps/galaxy-map-app.mjs", "scripts/apps/faction-weights-config.mjs", "scripts/galaxy-editor.mjs", "templates/planet-page.hbs", "templates/generator-app.hbs", "templates/galaxy-map.hbs", "templates/faction-weights.hbs"];
  for (const f of files) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    for (const [key] of src.matchAll(/LPG(\.[A-Za-z]+)+/g)) {
      if (key.endsWith(".")) continue;
      assert.ok(has(key) || /Settings\.[A-Za-z]+$/.test(key), `${f}: ${key}`);
    }
  }
  for (const id of SECTION_IDS) assert.ok(has(`LPG.Sections.${id}`), id);
});

test("module.json is a valid Foundry manifest", () => {
  const m = JSON.parse(readFileSync(new URL("../module.json", import.meta.url), "utf8"));
  assert.equal(m.id, "lancer-planet-generator");
  assert.ok(m.manifest.endsWith("/releases/latest/download/module.json"));
  assert.ok(m.download.endsWith("/module.zip"));
  for (const path of [...m.esmodules, ...m.styles, ...m.languages.map((l) => l.path)]) readFileSync(new URL(`../${path}`, import.meta.url));
  assert.equal(m.relationships.recommends[0].id, "lancer");
});
