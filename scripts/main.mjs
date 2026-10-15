import { MODULE_ID, TEMPLATES } from "./constants.mjs";
import { generatePlanet, rerollPlanet } from "./planet-generator.mjs";
import { generateGalaxy } from "./galaxy-generator.mjs";
import { getGeneratorOptions, rerollJournal, savePlanetToJournal } from "./journal.mjs";
import { PlanetGeneratorApp } from "./apps/planet-generator-app.mjs";
import { GalaxyMapApp } from "./apps/galaxy-map-app.mjs";
import { FactionWeightsConfig } from "./apps/faction-weights-config.mjs";

function registerSettings() {
  const s = (key, data) => game.settings.register(MODULE_ID, key, data);
  const label = (key) => ({ name: `LPG.Settings.${key}.Name`, hint: `LPG.Settings.${key}.Hint` });

  s("journalFolder", { ...label("JournalFolder"), scope: "world", config: true, type: String, default: "LANCER Planets" });
  s("compendium", { ...label("Compendium"), scope: "world", config: true, type: String, default: "" });
  s("includeReligion", { ...label("IncludeReligion"), scope: "world", config: true, type: Boolean, default: true });
  s("coreChance", {
    ...label("CoreChance"),
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 100, step: 5 },
    default: 25
  });
  s("factionWeights", { scope: "world", config: false, type: Object, default: {} });
  game.settings.registerMenu(MODULE_ID, "factionWeightsMenu", {
    name: "LPG.Settings.FactionWeights.Name",
    label: "LPG.Settings.FactionWeights.Label",
    hint: "LPG.Settings.FactionWeights.Hint",
    icon: "fa-solid fa-scale-balanced",
    type: FactionWeightsConfig,
    restricted: true
  });
  s("showSceneControl", {
    ...label("ShowSceneControl"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => ui.controls?.render({ reset: true })
  });
  s("enableGalaxyMap", {
    ...label("EnableGalaxyMap"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => ui.journal?.render()
  });
  s("galaxy", { scope: "world", config: false, type: Object, default: {} });
}

const canGenerate = () => game.user.isGM || game.user.can("JOURNAL_CREATE");

Hooks.once("init", () => {
  registerSettings();
  const load = foundry.applications?.handlebars?.loadTemplates ?? globalThis.loadTemplates;
  load(Object.values(TEMPLATES));
});

Hooks.once("ready", () => {
  game.modules.get(MODULE_ID).api = {
    generatePlanet: (options = {}) => generatePlanet(getGeneratorOptions(options)),
    rerollPlanet,
    savePlanetToJournal,
    rerollJournal,
    generateGalaxy,
    openGenerator: (planet) => PlanetGeneratorApp.open(planet),
    openGalaxyMap: () => GalaxyMapApp.open()
  };
});

// Journal sidebar header buttons (v13 passes an HTMLElement, v12 a jQuery object).
Hooks.on("renderJournalDirectory", (app, html) => {
  if (!canGenerate()) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector(".lpg-directory-buttons")) return;
  const container = root.querySelector(".header-actions") ?? root.querySelector(".directory-header");
  if (!container) return;

  const wrap = document.createElement("div");
  wrap.className = "lpg-directory-buttons flexrow";
  const addButton = (icon, text, onClick) => {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<i class="${icon}"></i> ${text}`;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      onClick();
    });
    wrap.append(button);
  };
  addButton("fa-solid fa-earth-americas", game.i18n.localize("LPG.OpenGenerator"), () => PlanetGeneratorApp.open());
  if (game.settings.get(MODULE_ID, "enableGalaxyMap") && game.user.isGM) {
    addButton("fa-solid fa-circle-nodes", game.i18n.localize("LPG.OpenGalaxy"), () => GalaxyMapApp.open());
  }
  container.after(wrap);
});

// Scene controls: v13 uses records keyed by name, v12 uses arrays.
Hooks.on("getSceneControlButtons", (controls) => {
  if (!canGenerate() || !game.settings.get(MODULE_ID, "showSceneControl")) return;
  const notes = Array.isArray(controls) ? controls.find((c) => c.name === "notes") : controls.notes;
  if (!notes?.tools) return;
  const tool = {
    name: "lpgPlanetGenerator",
    title: game.i18n.localize("LPG.OpenGenerator"),
    icon: "fa-solid fa-earth-americas",
    button: true,
    visible: true
  };
  if (Array.isArray(notes.tools)) {
    tool.onClick = () => PlanetGeneratorApp.open();
    notes.tools.push(tool);
  } else {
    tool.order = Object.keys(notes.tools).length;
    tool.onChange = () => PlanetGeneratorApp.open();
    notes.tools[tool.name] = tool;
  }
});

const isGeneratedPlanet = (doc) => doc?.isOwner && !!doc.getFlag?.(MODULE_ID, "planet");

// Journal sheet "Re-roll" header control: v13 ApplicationV2 sheet...
Hooks.on("getHeaderControlsJournalEntrySheet", (sheet, controls) => {
  if (!isGeneratedPlanet(sheet.document)) return;
  controls.unshift({
    icon: "fa-solid fa-dice",
    label: "LPG.Reroll.Button",
    action: "lpgReroll",
    onClick: () => rerollJournal(sheet.document)
  });
});

// ...and the v12 / ApplicationV1 sheet.
Hooks.on("getJournalSheetHeaderButtons", (sheet, buttons) => {
  if (!isGeneratedPlanet(sheet.document)) return;
  buttons.unshift({
    label: game.i18n.localize("LPG.Reroll.Button"),
    class: "lpg-reroll",
    icon: "fa-solid fa-dice",
    onclick: () => rerollJournal(sheet.document)
  });
});

// Right-click "Re-roll" on generated planets in the Journal sidebar.
function addContextOption(options) {
  const getEntry = (li) => {
    const el = li instanceof HTMLElement ? li : li?.[0];
    const id = el?.dataset.entryId ?? el?.dataset.documentId;
    return game.journal.get(id);
  };
  if (options.some((o) => o.lpg)) return;
  options.push({
    lpg: true,
    name: "LPG.Reroll.Button",
    icon: '<i class="fa-solid fa-dice"></i>',
    condition: (li) => isGeneratedPlanet(getEntry(li)),
    callback: (li) => rerollJournal(getEntry(li))
  });
}
Hooks.on("getJournalEntryContextOptions", (app, options) => addContextOption(options));
Hooks.on("getJournalDirectoryEntryContext", (html, options) => addContextOption(options));
