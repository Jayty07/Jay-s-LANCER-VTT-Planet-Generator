import { MODULE_ID, TEMPLATES } from "../constants.mjs";
import { CONTROLLING_FACTIONS, getFaction } from "../planet-generator.mjs";
import { generateGalaxy, generateSectorPlanets } from "../galaxy-generator.mjs";
import { getGeneratorOptions, savePlanetToJournal } from "../journal.mjs";
import { PlanetGeneratorApp } from "./planet-generator-app.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const HEX_SIZE = 40;
const escape = (text) => Handlebars.escapeExpression(text);

function hexCenter(q, r) {
  return { x: HEX_SIZE * Math.sqrt(3) * (q + r / 2), y: HEX_SIZE * 1.5 * r };
}

function hexPoints(cx, cy) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + (HEX_SIZE - 1.5) * Math.cos(a)).toFixed(1)},${(cy + (HEX_SIZE - 1.5) * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

export class GalaxyMapApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instance = null;

  constructor(options = {}) {
    super(options);
    this.selectedId = null;
  }

  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-galaxy`,
    classes: [MODULE_ID, "lpg-galaxy-app"],
    window: { title: "LPG.Galaxy.Title", icon: "fa-solid fa-circle-nodes", resizable: true },
    position: { width: 1040, height: 760 },
    actions: {
      selectSector: GalaxyMapApp.#onSelectSector,
      regenerate: GalaxyMapApp.#onRegenerate,
      openPlanet: GalaxyMapApp.#onOpenPlanet,
      savePlanet: GalaxyMapApp.#onSavePlanet,
      saveAll: GalaxyMapApp.#onSaveAll,
      openJournal: GalaxyMapApp.#onOpenJournal
    }
  };

  static PARTS = {
    main: { template: TEMPLATES.galaxyMap, scrollable: [".lpg-sector"] }
  };

  static open() {
    if (!game.settings.get(MODULE_ID, "enableGalaxyMap")) return ui.notifications.warn(game.i18n.localize("LPG.Galaxy.Disabled"));
    GalaxyMapApp.#instance ??= new GalaxyMapApp();
    GalaxyMapApp.#instance.render({ force: true });
    return GalaxyMapApp.#instance;
  }

  get galaxy() {
    return game.settings.get(MODULE_ID, "galaxy");
  }

  async #ensureGalaxy() {
    let galaxy = this.galaxy;
    if (!galaxy?.sectors?.length) {
      galaxy = generateGalaxy({ factionWeights: game.settings.get(MODULE_ID, "factionWeights") });
      galaxy.saved = {};
      await game.settings.set(MODULE_ID, "galaxy", galaxy);
    }
    return galaxy;
  }

  #sectorPlanets(galaxy, sector) {
    return generateSectorPlanets(galaxy, sector, getGeneratorOptions());
  }

  #buildSvg(galaxy) {
    const byId = new Map(galaxy.sectors.map((s) => [s.id, s]));
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const hexes = galaxy.sectors.map((s) => {
      const { x, y } = hexCenter(s.q, s.r);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      const color = getFaction(s.controller)?.color ?? "#888";
      const opacity = (0.3 + 0.6 * s.influence).toFixed(2);
      const selected = s.id === this.selectedId ? " lpg-selected" : "";
      const core = s.isCore ? " lpg-core" : "";
      const label = escape(s.name.split(" ")[0]);
      return `<g class="lpg-hex${selected}${core}" data-action="selectSector" data-sector-id="${s.id}">
        <title>${escape(s.name)} - ${escape(s.controllerName)} (${escape(s.influenceLabel)})</title>
        <polygon points="${hexPoints(x, y)}" fill="${color}" fill-opacity="${opacity}"></polygon>
        <text x="${x.toFixed(1)}" y="${(y - 3).toFixed(1)}" class="lpg-hex-name">${label}</text>
        <text x="${x.toFixed(1)}" y="${(y + 11).toFixed(1)}" class="lpg-hex-count">&#9679; ${s.planetCount}</text>
      </g>`;
    });
    const routes = galaxy.routes.map((r) => {
      const a = byId.get(r.from);
      const b = byId.get(r.to);
      if (!a || !b) return "";
      const pa = hexCenter(a.q, a.r);
      const pb = hexCenter(b.q, b.r);
      return `<line class="lpg-route" x1="${pa.x.toFixed(1)}" y1="${pa.y.toFixed(1)}" x2="${pb.x.toFixed(1)}" y2="${pb.y.toFixed(1)}"></line>`;
    });
    const pad = HEX_SIZE + 4;
    const vb = `${(minX - pad).toFixed(1)} ${(minY - pad).toFixed(1)} ${(maxX - minX + 2 * pad).toFixed(1)} ${(maxY - minY + 2 * pad).toFixed(1)}`;
    return `<svg class="lpg-galaxy-svg" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${hexes.join("")}<g class="lpg-routes">${routes.join("")}</g></svg>`;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const galaxy = await this.#ensureGalaxy();
    const present = new Set(galaxy.sectors.map((s) => s.controller));
    context.galaxy = galaxy;
    context.svg = this.#buildSvg(galaxy);
    context.legend = CONTROLLING_FACTIONS.filter((f) => present.has(f.id)).map((f) => ({ name: f.name, color: f.color }));

    const sector = galaxy.sectors.find((s) => s.id === this.selectedId);
    if (sector) {
      const byId = new Map(galaxy.sectors.map((s) => [s.id, s]));
      const linked = galaxy.routes
        .filter((r) => r.from === sector.id || r.to === sector.id)
        .map((r) => byId.get(r.from === sector.id ? r.to : r.from)?.name)
        .filter(Boolean);
      context.sector = { ...sector, influencePercent: Math.round(sector.influence * 100), routeNames: linked.join(", ") || "-" };
      context.planets = this.#sectorPlanets(galaxy, sector).map((planet, index) => {
        const uuid = galaxy.saved?.[planet.seed];
        return { planet, index, journalId: uuid && fromUuidSync(uuid) ? uuid : null };
      });
    }
    return context;
  }

  static #onSelectSector(event, target) {
    this.selectedId = target.dataset.sectorId;
    this.render();
  }

  static async #onRegenerate() {
    const ok = await DialogV2.confirm({
      window: { title: game.i18n.localize("LPG.Galaxy.Regenerate") },
      content: `<p>${game.i18n.localize("LPG.Galaxy.RegenerateConfirm")}</p>`,
      rejectClose: false
    });
    if (!ok) return;
    const galaxy = generateGalaxy({ factionWeights: game.settings.get(MODULE_ID, "factionWeights") });
    galaxy.saved = {};
    await game.settings.set(MODULE_ID, "galaxy", galaxy);
    this.selectedId = null;
    this.render();
  }

  #selected() {
    const galaxy = this.galaxy;
    const sector = galaxy?.sectors?.find((s) => s.id === this.selectedId);
    return sector ? { galaxy, sector, planets: this.#sectorPlanets(galaxy, sector) } : null;
  }

  async #save(galaxy, planets) {
    const saved = { ...(galaxy.saved ?? {}) };
    for (const planet of planets) {
      if (saved[planet.seed] && fromUuidSync(saved[planet.seed])) continue;
      const entry = await savePlanetToJournal(planet, "default", { notify: planets.length === 1 });
      if (entry) saved[planet.seed] = entry.uuid;
    }
    await game.settings.set(MODULE_ID, "galaxy", { ...galaxy, saved });
    this.render();
  }

  static #onOpenPlanet(event, target) {
    const sel = this.#selected();
    const planet = sel?.planets[Number(target.dataset.index)];
    if (planet) PlanetGeneratorApp.open(planet);
  }

  static async #onSavePlanet(event, target) {
    const sel = this.#selected();
    const planet = sel?.planets[Number(target.dataset.index)];
    if (planet) await this.#save(sel.galaxy, [planet]);
  }

  static async #onSaveAll() {
    const sel = this.#selected();
    if (sel) await this.#save(sel.galaxy, sel.planets);
  }

  static async #onOpenJournal(event, target) {
    const doc = await fromUuid(target.dataset.journalUuid);
    doc?.sheet?.render(true);
  }

  _onClose(options) {
    super._onClose(options);
    if (GalaxyMapApp.#instance === this) GalaxyMapApp.#instance = null;
  }
}
