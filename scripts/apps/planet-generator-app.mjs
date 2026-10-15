import { MODULE_ID, TEMPLATES } from "../constants.mjs";
import { CONTROLLING_FACTIONS, generatePlanet, rerollPlanet } from "../planet-generator.mjs";
import { getGeneratorOptions, getJournalPacks, renderPlanetHtml, savePlanetToJournal } from "../journal.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class PlanetGeneratorApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instance = null;

  constructor(options = {}) {
    super(options);
    this.planet = options.planet ?? null;
    this.formState = {
      name: "",
      core: "random",
      factionId: "",
      includeReligion: game.settings.get(MODULE_ID, "includeReligion"),
      seed: "",
      destination: "default"
    };
  }

  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-generator`,
    classes: [MODULE_ID, "lpg-generator-app"],
    tag: "form",
    window: { title: "LPG.App.Title", icon: "fa-solid fa-earth-americas", resizable: true },
    position: { width: 920, height: 720 },
    form: { handler: PlanetGeneratorApp.#onSubmit, submitOnChange: false, closeOnSubmit: false },
    actions: {
      generate: PlanetGeneratorApp.#onGenerate,
      save: PlanetGeneratorApp.#onSave,
      rerollSection: PlanetGeneratorApp.#onRerollSection,
      openGalaxy: PlanetGeneratorApp.#onOpenGalaxy
    }
  };

  static PARTS = {
    main: { template: TEMPLATES.generatorApp, scrollable: [".lpg-preview"] }
  };

  /** Open (or focus) the shared generator window, optionally showing a given planet. */
  static open(planet = null) {
    if (!PlanetGeneratorApp.#instance) PlanetGeneratorApp.#instance = new PlanetGeneratorApp({ planet });
    else if (planet) PlanetGeneratorApp.#instance.planet = planet;
    PlanetGeneratorApp.#instance.render({ force: true });
    return PlanetGeneratorApp.#instance;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const factionOptions = { "": game.i18n.localize("LPG.App.FactionRandom") };
    for (const f of CONTROLLING_FACTIONS) factionOptions[f.id] = f.name;

    const destinationOptions = {
      default: game.i18n.localize("LPG.App.DestinationDefault"),
      root: game.i18n.localize("LPG.App.DestinationRoot")
    };
    const folderLabel = game.i18n.localize("LPG.App.DestinationFolder");
    for (const f of game.folders.filter((f) => f.type === "JournalEntry")) destinationOptions[`folder:${f.id}`] = `${folderLabel}: ${f.name}`;
    const packLabel = game.i18n.localize("LPG.App.DestinationPack");
    for (const p of getJournalPacks()) destinationOptions[`pack:${p.collection}`] = `${packLabel}: ${p.title}`;
    if (!(this.formState.destination in destinationOptions)) this.formState.destination = "default";

    return Object.assign(context, {
      state: this.formState,
      planet: this.planet,
      previewHtml: this.planet ? await renderPlanetHtml(this.planet, { controls: true }) : "",
      coreOptions: { random: "LPG.App.CoreRandom", core: "LPG.App.CoreYes", rim: "LPG.App.CoreNo" },
      factionOptions,
      destinationOptions,
      galaxyEnabled: game.settings.get(MODULE_ID, "enableGalaxyMap")
    });
  }

  #readForm() {
    const el = this.element;
    const value = (name) => el.querySelector(`[name="${name}"]`)?.value ?? "";
    Object.assign(this.formState, {
      name: value("name"),
      core: value("core") || "random",
      factionId: value("factionId"),
      includeReligion: !!el.querySelector('[name="includeReligion"]')?.checked,
      seed: value("seed").trim(),
      destination: value("destination") || "default"
    });
    return this.formState;
  }

  #generatorOptions() {
    const s = this.#readForm();
    return getGeneratorOptions({
      name: s.name.trim() || undefined,
      isCore: s.core === "core" ? true : s.core === "rim" ? false : undefined,
      factionId: s.factionId || undefined,
      includeReligion: s.includeReligion,
      seed: s.seed || undefined
    });
  }

  static async #onSubmit() {
    this.planet = generatePlanet(this.#generatorOptions());
    this.render();
  }

  static async #onGenerate() {
    this.planet = generatePlanet(this.#generatorOptions());
    this.render();
  }

  static async #onRerollSection(event, target) {
    if (!this.planet) return;
    const { seed, ...options } = this.#generatorOptions();
    this.planet = rerollPlanet(this.planet, [target.dataset.section], options);
    this.render();
  }

  static async #onSave() {
    this.#readForm();
    if (!this.planet) return ui.notifications.warn(game.i18n.localize("LPG.Errors.NoPlanet"));
    const entry = await savePlanetToJournal(this.planet, this.formState.destination);
    entry?.sheet?.render(true);
  }

  static async #onOpenGalaxy() {
    const { GalaxyMapApp } = await import("./galaxy-map-app.mjs");
    GalaxyMapApp.open();
  }

  _onClose(options) {
    super._onClose(options);
    if (PlanetGeneratorApp.#instance === this) PlanetGeneratorApp.#instance = null;
  }
}
