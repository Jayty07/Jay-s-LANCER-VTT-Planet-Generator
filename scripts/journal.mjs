import { MODULE_ID, TEMPLATES } from "./constants.mjs";
import { rerollPlanet } from "./planet-generator.mjs";
import { SECTION_IDS } from "./tables.mjs";

export function renderTemplateCompat(path, data) {
  const render = foundry.applications?.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  return render(path, data);
}

export function renderPlanetHtml(planet, { controls = false } = {}) {
  return renderTemplateCompat(TEMPLATES.planetPage, { ...planet, controls });
}

/** Generator options derived from the module settings, merged with per-call overrides. */
export function getGeneratorOptions(overrides = {}) {
  return {
    includeReligion: game.settings.get(MODULE_ID, "includeReligion"),
    coreChance: game.settings.get(MODULE_ID, "coreChance") / 100,
    factionWeights: game.settings.get(MODULE_ID, "factionWeights"),
    ...overrides
  };
}

export function getJournalPacks() {
  return game.packs.filter((p) => p.documentName === "JournalEntry" && !p.locked);
}

function validPack(id) {
  const pack = game.packs.get(id);
  if (!pack || pack.documentName !== "JournalEntry") {
    ui.notifications.warn(game.i18n.format("LPG.Errors.PackNotFound", { id }));
    return null;
  }
  if (pack.locked) {
    ui.notifications.warn(game.i18n.format("LPG.Errors.PackLocked", { id }));
    return null;
  }
  return pack;
}

async function defaultFolderId() {
  const name = game.settings.get(MODULE_ID, "journalFolder")?.trim();
  if (!name) return null;
  const existing = game.folders.find((f) => f.type === "JournalEntry" && f.name === name);
  if (existing) return existing.id;
  const folder = await Folder.create({ name, type: "JournalEntry" });
  return folder.id;
}

/**
 * @param {string} destination  "default" | "root" | "folder:<id>" | "pack:<collection id>"
 * @returns {Promise<{folder?: string|null, pack?: string}>}
 */
async function resolveDestination(destination = "default") {
  if (destination === "root") return { folder: null };
  if (destination.startsWith("folder:")) return { folder: destination.slice(7) };
  if (destination.startsWith("pack:")) {
    const pack = validPack(destination.slice(5));
    if (pack) return { pack: pack.collection };
    return { folder: await defaultFolderId() };
  }
  const packId = game.settings.get(MODULE_ID, "compendium")?.trim();
  if (packId) {
    const pack = validPack(packId);
    if (pack) return { pack: pack.collection };
  }
  return { folder: await defaultFolderId() };
}

export async function savePlanetToJournal(planet, destination = "default", { notify = true } = {}) {
  const target = await resolveDestination(destination);
  const content = await renderPlanetHtml(planet);
  const data = {
    name: planet.name,
    folder: target.pack ? null : target.folder ?? null,
    flags: { [MODULE_ID]: { planet } },
    pages: [
      {
        name: planet.name,
        type: "text",
        text: { content, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
        flags: { [MODULE_ID]: { generated: true } }
      }
    ]
  };
  const entry = await JournalEntry.create(data, target.pack ? { pack: target.pack } : {});
  if (notify) ui.notifications.info(game.i18n.format("LPG.App.Saved", { name: planet.name }));
  return entry;
}

async function promptSections(planet) {
  const { DialogV2 } = foundry.applications.api;
  const rows = SECTION_IDS.map(
    (id) =>
      `<label class="lpg-reroll-option"><input type="checkbox" name="section" value="${id}" checked> ${game.i18n.localize(`LPG.Sections.${id}`)}</label>`
  ).join("");
  return DialogV2.prompt({
    window: { title: game.i18n.format("LPG.Reroll.Title", { name: planet.name }), icon: "fa-solid fa-dice" },
    classes: [MODULE_ID],
    content: `<p>${game.i18n.localize("LPG.Reroll.Hint")}</p><p class="hint">${game.i18n.localize("LPG.Reroll.LoreHint")}</p><div class="lpg-reroll-options">${rows}</div>`,
    ok: {
      label: game.i18n.localize("LPG.Reroll.Confirm"),
      icon: "fa-solid fa-dice",
      callback: (event, button) => Array.from(button.form.querySelectorAll('input[name="section"]:checked')).map((i) => i.value)
    },
    rejectClose: false
  });
}

/** Re-roll selected sections of a generated planet journal and rewrite its page. */
export async function rerollJournal(entry) {
  const planet = entry.getFlag(MODULE_ID, "planet");
  if (!planet) return ui.notifications.warn(game.i18n.localize("LPG.Errors.NoData"));
  const sections = await promptSections(planet);
  if (!sections) return;
  if (!sections.length) return ui.notifications.warn(game.i18n.localize("LPG.Reroll.NoneSelected"));

  const next = rerollPlanet(planet, sections, getGeneratorOptions());
  const content = await renderPlanetHtml(next);
  const page = entry.pages.find((p) => p.getFlag(MODULE_ID, "generated")) ?? entry.pages.find((p) => p.type === "text");
  if (page) {
    const pageUpdate = { "text.content": content };
    if (page.name === planet.name) pageUpdate.name = next.name;
    await page.update(pageUpdate);
  } else {
    await entry.createEmbeddedDocuments("JournalEntryPage", [
      { name: next.name, type: "text", text: { content, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML }, flags: { [MODULE_ID]: { generated: true } } }
    ]);
  }
  const entryUpdate = { [`flags.${MODULE_ID}.planet`]: next };
  if (entry.name === planet.name) entryUpdate.name = next.name;
  await entry.update(entryUpdate);
  ui.notifications.info(game.i18n.format("LPG.Reroll.Done", { name: next.name }));
  return next;
}
