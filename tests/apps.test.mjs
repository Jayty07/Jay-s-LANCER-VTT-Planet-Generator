import { test } from "node:test";
import assert from "node:assert/strict";

// Minimal stand-in for Foundry v13's ApplicationV2: it exposes the same getter-only
// properties, so subclasses that assign to them throw here just as they do in Foundry.
class ApplicationV2 {
  #state = 0;
  constructor(options = {}) {
    this.options = options;
  }
  get classList() { return undefined; }
  get element() { return undefined; }
  get form() { return undefined; }
  get hasFrame() { return true; }
  get id() { return "stub"; }
  get minimized() { return false; }
  get parts() { return {}; }
  get rendered() { return false; }
  get state() { return this.#state; }
  get title() { return ""; }
  get window() { return {}; }
  async _prepareContext() { return {}; }
}
const settings = { includeReligion: true, coreChance: 25, enableGalaxyMap: true, factionWeights: {}, galaxy: {} };
globalThis.foundry = { applications: { api: { ApplicationV2, HandlebarsApplicationMixin: (B) => class extends B {}, DialogV2: class {} } } };
globalThis.game = {
  settings: { get: (_m, key) => settings[key], set: async (_m, key, value) => (settings[key] = value) },
  i18n: { localize: (k) => k, format: (k) => k },
  folders: [],
  packs: []
};
globalThis.Handlebars = { escapeExpression: (t) => String(t) };
globalThis.fromUuidSync = () => null;

const { PlanetGeneratorApp } = await import("../scripts/apps/planet-generator-app.mjs");
const { GalaxyMapApp } = await import("../scripts/apps/galaxy-map-app.mjs");
const { FactionWeightsConfig } = await import("../scripts/apps/faction-weights-config.mjs");

test("apps construct without overwriting ApplicationV2 getters", async () => {
  for (const App of [PlanetGeneratorApp, GalaxyMapApp, FactionWeightsConfig]) {
    assert.doesNotThrow(() => new App(), App.name);
  }
  const context = await new PlanetGeneratorApp()._prepareContext({});
  assert.equal(context.state.destination, "default");
  assert.ok(context.factionOptions.union);
});

test("galaxy map context: grid, selected sector and planet edit form", async () => {
  const app = new GalaxyMapApp();
  let context = await app._prepareContext({});
  assert.ok(settings.galaxy.sectors.length > 0, "a galaxy is generated on first open");
  assert.ok(context.svg.includes('data-action="clickHex"'));
  assert.equal(context.tools.length, 6);
  app.selectedId = "0,0";
  context = await app._prepareContext({});
  assert.equal(context.sector.controller, "union");
  app.editingSeed = context.planets[0].planet.seed;
  context = await app._prepareContext({});
  assert.equal(context.edit.planet.seed, app.editingSeed);
  assert.ok(context.edit.loreText.includes("\n\n") || context.edit.planet.lore.length === 1);
});
