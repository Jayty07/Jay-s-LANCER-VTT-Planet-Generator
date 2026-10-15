import { MODULE_ID, TEMPLATES } from "../constants.mjs";
import { CONTROLLING_FACTIONS, getFaction, rerollPlanet } from "../planet-generator.mjs";
import { MILITARY_TIERS } from "../tables.mjs";
import { REGION_LABELS, generateGalaxy, generateSectorPlanets } from "../galaxy-generator.mjs";
import {
  MAX_GRID_RADIUS,
  addSector,
  addSectorPlanets,
  applyPlanetEdits,
  createEmptyGalaxy,
  findSector,
  gridHexes,
  gridRadius,
  moveSector,
  normalizeGalaxy,
  removeSector,
  removeSectorPlanet,
  replaceSectorPlanet,
  sectorAt,
  setGridRadius,
  toggleRoute,
  updateSector
} from "../galaxy-editor.mjs";
import { getGeneratorOptions, savePlanetToJournal, writePlanetToJournal } from "../journal.mjs";
import { PlanetGeneratorApp } from "./planet-generator-app.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const HEX_SIZE = 40;
const escape = (text) => Handlebars.escapeExpression(text);
const clone = (value) => JSON.parse(JSON.stringify(value));
const TOOLS = {
  select: "fa-solid fa-arrow-pointer",
  addRandom: "fa-solid fa-dice",
  addBlank: "fa-solid fa-plus",
  move: "fa-solid fa-up-down-left-right",
  link: "fa-solid fa-route",
  erase: "fa-solid fa-eraser"
};

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

async function confirm(title, content) {
  return DialogV2.confirm({ window: { title }, content: `<p>${content}</p>`, rejectClose: false });
}

export class GalaxyMapApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instance = null;
  #drag = null;
  #suppressClick = false;

  constructor(options = {}) {
    super(options);
    this.selectedId = null;
    this.tool = "select";
    this.pendingId = null;
    this.editingSeed = null;
    this.draft = null;
    this.viewBox = null;
    this.fitBox = null;
  }

  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-galaxy`,
    classes: [MODULE_ID, "lpg-galaxy-app"],
    tag: "form",
    window: { title: "LPG.Galaxy.Title", icon: "fa-solid fa-circle-nodes", resizable: true },
    position: { width: 1120, height: 800 },
    form: { handler: GalaxyMapApp.#onSubmit, submitOnChange: false, closeOnSubmit: false },
    actions: {
      clickHex: GalaxyMapApp.#onClickHex,
      setTool: GalaxyMapApp.#onSetTool,
      zoomIn: GalaxyMapApp.#onZoomIn,
      zoomOut: GalaxyMapApp.#onZoomOut,
      zoomReset: GalaxyMapApp.#onZoomReset,
      applyGrid: GalaxyMapApp.#onApplyGrid,
      regenerate: GalaxyMapApp.#onRegenerate,
      clearGalaxy: GalaxyMapApp.#onClearGalaxy,
      saveSector: GalaxyMapApp.#onSaveSector,
      addPlanet: GalaxyMapApp.#onAddPlanet,
      generatePlanets: GalaxyMapApp.#onGeneratePlanets,
      editPlanet: GalaxyMapApp.#onEditPlanet,
      deletePlanet: GalaxyMapApp.#onDeletePlanet,
      rerollPlanetSection: GalaxyMapApp.#onRerollPlanetSection,
      commitPlanet: GalaxyMapApp.#onCommitPlanet,
      cancelEdit: GalaxyMapApp.#onCancelEdit,
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
    return normalizeGalaxy(game.settings.get(MODULE_ID, "galaxy"));
  }

  async #setGalaxy(galaxy) {
    await game.settings.set(MODULE_ID, "galaxy", galaxy);
    return galaxy;
  }

  async #ensureGalaxy() {
    const stored = game.settings.get(MODULE_ID, "galaxy");
    if (stored?.schema || stored?.sectors?.length) return normalizeGalaxy(stored);
    const galaxy = generateGalaxy({ factionWeights: game.settings.get(MODULE_ID, "factionWeights") });
    galaxy.saved = {};
    return this.#setGalaxy(galaxy);
  }

  #planetsOf(galaxy, sector) {
    return generateSectorPlanets(galaxy, sector, getGeneratorOptions());
  }

  #findPlanet(galaxy, seed) {
    const sector = findSector(galaxy, this.selectedId);
    return sector ? this.#planetsOf(galaxy, sector).find((p) => p.seed === seed) ?? null : null;
  }

  #journalUuid(galaxy, seed) {
    const uuid = galaxy.saved?.[seed];
    return uuid && fromUuidSync(uuid) ? uuid : null;
  }

  /** Current values of every named field in the window. */
  #readFields() {
    const fields = {};
    for (const el of this.element.querySelectorAll("[name]")) {
      fields[el.name] = el.type === "checkbox" ? el.checked : el.value;
    }
    return fields;
  }

  #buildSvg(galaxy) {
    const radius = gridRadius(galaxy);
    const byId = new Map(galaxy.sectors.map((s) => [s.id, s]));
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const empty = [];
    const filled = [];
    for (const { q, r } of gridHexes(radius)) {
      const { x, y } = hexCenter(q, r);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      const s = sectorAt(galaxy, q, r);
      if (!s) {
        empty.push(`<g class="lpg-hex lpg-empty-hex" data-action="clickHex" data-q="${q}" data-r="${r}"><polygon points="${hexPoints(x, y)}"></polygon></g>`);
        continue;
      }
      const color = getFaction(s.controller)?.color ?? "#888";
      const opacity = (0.3 + 0.6 * s.influence).toFixed(2);
      const classes = ["lpg-hex"];
      if (s.id === this.selectedId) classes.push("lpg-selected");
      if (s.id === this.pendingId) classes.push("lpg-pending");
      if (s.isCore) classes.push("lpg-core");
      const count = Array.isArray(s.planets) ? s.planets.length : s.planetCount;
      filled.push(`<g class="${classes.join(" ")}" data-action="clickHex" data-q="${q}" data-r="${r}" data-sector-id="${escape(s.id)}">
        <title>${escape(s.name)} - ${escape(s.controllerName)} (${escape(s.influenceLabel)})</title>
        <polygon points="${hexPoints(x, y)}" fill="${color}" fill-opacity="${opacity}"></polygon>
        <text x="${x.toFixed(1)}" y="${(y - 3).toFixed(1)}" class="lpg-hex-name">${escape(s.name.split(" ")[0])}</text>
        <text x="${x.toFixed(1)}" y="${(y + 11).toFixed(1)}" class="lpg-hex-count">&#9679; ${count}</text>
      </g>`);
    }
    const routes = galaxy.routes.map((r) => {
      const a = byId.get(r.from);
      const b = byId.get(r.to);
      if (!a || !b) return "";
      const pa = hexCenter(a.q, a.r);
      const pb = hexCenter(b.q, b.r);
      return `<line class="lpg-route" x1="${pa.x.toFixed(1)}" y1="${pa.y.toFixed(1)}" x2="${pb.x.toFixed(1)}" y2="${pb.y.toFixed(1)}"></line>`;
    });
    const pad = HEX_SIZE + 4;
    this.fitBox = { x: minX - pad, y: minY - pad, w: maxX - minX + 2 * pad, h: maxY - minY + 2 * pad };
    const box = this.viewBox ?? this.fitBox;
    const vb = [box.x, box.y, box.w, box.h].map((n) => n.toFixed(1)).join(" ");
    return `<svg class="lpg-galaxy-svg lpg-tool-${this.tool}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${empty.join("")}${filled.join("")}<g class="lpg-routes">${routes.join("")}</g></svg>`;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const galaxy = await this.#ensureGalaxy();
    const present = new Set(galaxy.sectors.map((s) => s.controller));
    const factionOptions = Object.fromEntries(CONTROLLING_FACTIONS.map((f) => [f.id, f.name]));
    const pending = this.pendingId && findSector(galaxy, this.pendingId);
    const hintKey = pending ? `${this.tool}Pending` : this.tool;

    Object.assign(context, {
      galaxy,
      svg: this.#buildSvg(galaxy),
      maxGridRadius: MAX_GRID_RADIUS,
      legend: CONTROLLING_FACTIONS.filter((f) => present.has(f.id)).map((f) => ({ name: f.name, color: f.color })),
      tools: Object.entries(TOOLS).map(([id, icon]) => ({
        id,
        icon,
        label: game.i18n.localize(`LPG.Galaxy.Tools.${id}`),
        active: id === this.tool
      })),
      toolHint: game.i18n.format(`LPG.Galaxy.ToolHints.${hintKey}`, { name: pending?.name ?? "" })
    });

    const sector = findSector(galaxy, this.selectedId);
    if (!sector) {
      this.selectedId = null;
      this.editingSeed = null;
      this.draft = null;
      return context;
    }
    const byId = new Map(galaxy.sectors.map((s) => [s.id, s]));
    const linked = galaxy.routes
      .filter((r) => r.from === sector.id || r.to === sector.id)
      .map((r) => byId.get(r.from === sector.id ? r.to : r.from)?.name)
      .filter(Boolean);
    const planets = this.#planetsOf(galaxy, sector);
    context.sector = { ...sector, influencePercent: Math.round(sector.influence * 100), routeNames: linked.join(", ") || "-" };
    context.factionOptions = factionOptions;
    context.regionOptions = REGION_LABELS;
    context.planets = planets.map((planet) => ({ planet, journalId: this.#journalUuid(galaxy, planet.seed) }));

    if (this.editingSeed && !this.draft) this.draft = clone(planets.find((p) => p.seed === this.editingSeed) ?? null);
    if (this.draft) {
      context.edit = {
        planet: this.draft,
        journalId: this.#journalUuid(galaxy, this.draft.seed),
        loreText: (this.draft.lore ?? []).join("\n\n"),
        tierOptions: Object.fromEntries(MILITARY_TIERS.map((t) => [t.id, t.label]))
      };
    }
    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const svg = this.element.querySelector(".lpg-galaxy-svg");
    if (svg) this.#attachPanZoom(svg);
    this.element.querySelector('[name="gridRadius"]')?.addEventListener("change", () => GalaxyMapApp.#onApplyGrid.call(this));
  }

  /* ---------- Zoom & pan ---------- */

  #box(svg) {
    const [x, y, w, h] = svg.getAttribute("viewBox").split(/\s+/).map(Number);
    return { x, y, w, h };
  }

  #applyBox(svg, box) {
    this.viewBox = box;
    svg.setAttribute("viewBox", [box.x, box.y, box.w, box.h].map((n) => n.toFixed(1)).join(" "));
  }

  #zoom(factor, center) {
    const svg = this.element?.querySelector(".lpg-galaxy-svg");
    if (!svg || !this.fitBox) return;
    const box = this.#box(svg);
    const w = Math.max(this.fitBox.w / 10, Math.min(this.fitBox.w * 2, box.w * factor));
    const k = w / box.w;
    const c = center ?? { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    this.#applyBox(svg, { x: c.x - (c.x - box.x) * k, y: c.y - (c.y - box.y) * k, w, h: box.h * k });
  }

  #attachPanZoom(svg) {
    const toSvg = (x, y, matrix) => new DOMPoint(x, y).matrixTransform(matrix);
    svg.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const matrix = svg.getScreenCTM()?.inverse();
        const center = matrix ? toSvg(event.clientX, event.clientY, matrix) : undefined;
        this.#zoom(event.deltaY > 0 ? 1.15 : 1 / 1.15, center);
      },
      { passive: false }
    );
    svg.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 && event.button !== 1) return;
      this.#suppressClick = false;
      const matrix = svg.getScreenCTM()?.inverse();
      if (!matrix) return;
      this.#drag = { id: event.pointerId, x: event.clientX, y: event.clientY, box: this.#box(svg), matrix, moved: false };
    });
    svg.addEventListener("pointermove", (event) => {
      const drag = this.#drag;
      if (!drag || event.pointerId !== drag.id) return;
      if (!drag.moved) {
        if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5) return;
        drag.moved = true;
        svg.setPointerCapture(event.pointerId);
        svg.classList.add("lpg-panning");
      }
      const p0 = toSvg(drag.x, drag.y, drag.matrix);
      const p = toSvg(event.clientX, event.clientY, drag.matrix);
      this.#applyBox(svg, { ...drag.box, x: drag.box.x - (p.x - p0.x), y: drag.box.y - (p.y - p0.y) });
    });
    const end = (event) => {
      if (!this.#drag || event.pointerId !== this.#drag.id) return;
      this.#suppressClick = this.#drag.moved;
      this.#drag = null;
      svg.classList.remove("lpg-panning");
    };
    svg.addEventListener("pointerup", end);
    svg.addEventListener("pointercancel", end);
    svg.addEventListener(
      "click",
      (event) => {
        if (!this.#suppressClick) return;
        this.#suppressClick = false;
        event.stopPropagation();
        event.preventDefault();
      },
      { capture: true }
    );
  }

  static #onZoomIn() {
    this.#zoom(1 / 1.3);
  }

  static #onZoomOut() {
    this.#zoom(1.3);
  }

  static #onZoomReset() {
    const svg = this.element.querySelector(".lpg-galaxy-svg");
    if (svg && this.fitBox) this.#applyBox(svg, this.fitBox);
    this.viewBox = null;
  }

  /* ---------- Map editing ---------- */

  static #onSetTool(event, target) {
    this.tool = target.dataset.tool in TOOLS ? target.dataset.tool : "select";
    this.pendingId = null;
    this.render();
  }

  #select(id) {
    if (id !== this.selectedId) {
      this.editingSeed = null;
      this.draft = null;
    }
    this.selectedId = id;
  }

  static async #onClickHex(event, target) {
    const q = Number(target.dataset.q);
    const r = Number(target.dataset.r);
    let galaxy = this.galaxy;
    const sector = sectorAt(galaxy, q, r);
    const options = getGeneratorOptions();

    switch (this.tool) {
      case "addRandom":
      case "addBlank":
        if (sector) this.#select(sector.id);
        else {
          galaxy = await this.#setGalaxy(addSector(galaxy, q, r, { mode: this.tool === "addBlank" ? "blank" : "random", factionWeights: options.factionWeights }));
          this.#select(sectorAt(galaxy, q, r)?.id ?? null);
        }
        break;
      case "move":
        if (sector) this.pendingId = this.pendingId === sector.id ? null : sector.id;
        else if (this.pendingId) {
          await this.#setGalaxy(moveSector(galaxy, this.pendingId, q, r, options));
          this.#select(this.pendingId);
          this.pendingId = null;
        }
        break;
      case "link":
        if (!sector) this.pendingId = null;
        else if (!this.pendingId || this.pendingId === sector.id) this.pendingId = this.pendingId ? null : sector.id;
        else {
          await this.#setGalaxy(toggleRoute(galaxy, this.pendingId, sector.id));
          this.pendingId = null;
        }
        break;
      case "erase":
        if (!sector) break;
        if (!(await confirm(game.i18n.localize("LPG.Galaxy.Tools.erase"), game.i18n.format("LPG.Galaxy.EraseConfirm", { name: escape(sector.name) })))) return;
        await this.#setGalaxy(removeSector(galaxy, sector.id));
        if (this.selectedId === sector.id) this.#select(null);
        break;
      default:
        this.#select(sector?.id ?? null);
    }
    this.render();
  }

  static async #onApplyGrid() {
    const value = Number(this.element.querySelector('[name="gridRadius"]')?.value);
    if (!Number.isFinite(value)) return;
    await this.#setGalaxy(setGridRadius(this.galaxy, value));
    this.viewBox = null;
    this.render();
  }

  static async #onRegenerate() {
    if (!(await confirm(game.i18n.localize("LPG.Galaxy.Regenerate"), game.i18n.localize("LPG.Galaxy.RegenerateConfirm")))) return;
    const current = this.galaxy;
    const galaxy = generateGalaxy({ radius: current.radius, factionWeights: game.settings.get(MODULE_ID, "factionWeights") });
    galaxy.saved = current.saved ?? {};
    await this.#setGalaxy(galaxy);
    this.#select(null);
    this.pendingId = null;
    this.viewBox = null;
    this.render();
  }

  static async #onClearGalaxy() {
    if (!(await confirm(game.i18n.localize("LPG.Galaxy.Clear"), game.i18n.localize("LPG.Galaxy.ClearConfirm")))) return;
    const current = this.galaxy;
    await this.#setGalaxy({ ...createEmptyGalaxy({ radius: current.radius }), saved: current.saved ?? {} });
    this.#select(null);
    this.pendingId = null;
    this.viewBox = null;
    this.render();
  }

  static async #onSaveSector() {
    if (!this.selectedId) return;
    const f = this.#readFields();
    const changes = { name: f["sector.name"], controller: f["sector.controller"], region: f["sector.region"], influence: Number(f["sector.influence"]) / 100 };
    await this.#setGalaxy(updateSector(this.galaxy, this.selectedId, changes, getGeneratorOptions()));
    ui.notifications.info(game.i18n.format("LPG.Galaxy.SectorSaved", { name: changes.name || "" }));
    this.render();
  }

  static async #onAddPlanet() {
    if (!this.selectedId) return;
    await this.#setGalaxy(addSectorPlanets(this.galaxy, this.selectedId, 1, getGeneratorOptions()));
    this.render();
  }

  static async #onGeneratePlanets() {
    if (!this.selectedId) return;
    const count = Math.max(1, Math.min(12, Math.round(Number(this.#readFields().planetCount) || 1)));
    await this.#setGalaxy(addSectorPlanets(this.galaxy, this.selectedId, count, getGeneratorOptions()));
    this.render();
  }

  static async #onDeletePlanet(event, target) {
    const planet = this.#findPlanet(this.galaxy, target.dataset.seed);
    if (!planet) return;
    if (!(await confirm(game.i18n.localize("LPG.Galaxy.DeletePlanet"), game.i18n.format("LPG.Galaxy.DeletePlanetConfirm", { name: escape(planet.name) })))) return;
    await this.#setGalaxy(removeSectorPlanet(this.galaxy, this.selectedId, planet.seed, getGeneratorOptions()));
    if (this.editingSeed === planet.seed) {
      this.editingSeed = null;
      this.draft = null;
    }
    this.render();
  }

  /* ---------- Planet editing ---------- */

  static #onEditPlanet(event, target) {
    this.editingSeed = target.dataset.seed;
    this.draft = null;
    this.render();
  }

  static #onCancelEdit() {
    this.editingSeed = null;
    this.draft = null;
    this.render();
  }

  static #onRerollPlanetSection(event, target) {
    if (!this.draft) return;
    const edited = applyPlanetEdits(this.draft, this.#readFields());
    const next = rerollPlanet(edited, [target.dataset.section], getGeneratorOptions());
    this.draft = { ...next, seed: edited.seed, sector: edited.sector };
    this.render();
  }

  static async #onCommitPlanet() {
    if (!this.draft || !this.selectedId) return;
    const planet = applyPlanetEdits(this.draft, this.#readFields());
    const galaxy = await this.#setGalaxy(replaceSectorPlanet(this.galaxy, this.selectedId, planet, getGeneratorOptions()));
    const stored = this.#findPlanet(galaxy, planet.seed) ?? planet;
    this.draft = clone(stored);
    const uuid = this.#journalUuid(galaxy, planet.seed);
    const entry = uuid ? await fromUuid(uuid) : null;
    if (entry) await writePlanetToJournal(entry, stored);
    ui.notifications.info(game.i18n.format(entry ? "LPG.Galaxy.PlanetSavedJournal" : "LPG.Galaxy.PlanetSaved", { name: stored.name }));
    this.render();
  }

  static #onSubmit() {
    if (this.draft) return GalaxyMapApp.#onCommitPlanet.call(this);
    if (this.selectedId) return GalaxyMapApp.#onSaveSector.call(this);
  }

  /* ---------- Journal ---------- */

  async #save(galaxy, planets) {
    const saved = { ...(galaxy.saved ?? {}) };
    for (const planet of planets) {
      if (saved[planet.seed] && fromUuidSync(saved[planet.seed])) continue;
      const entry = await savePlanetToJournal(planet, "default", { notify: planets.length === 1 });
      if (entry) saved[planet.seed] = entry.uuid;
    }
    await this.#setGalaxy({ ...this.galaxy, saved });
    this.render();
  }

  static #onOpenPlanet(event, target) {
    const planet = this.#findPlanet(this.galaxy, target.dataset.seed);
    if (planet) PlanetGeneratorApp.open(planet);
  }

  static async #onSavePlanet(event, target) {
    const galaxy = this.galaxy;
    const planet = this.#findPlanet(galaxy, target.dataset.seed);
    if (planet) await this.#save(galaxy, [planet]);
  }

  static async #onSaveAll() {
    const galaxy = this.galaxy;
    const sector = findSector(galaxy, this.selectedId);
    if (sector) await this.#save(galaxy, this.#planetsOf(galaxy, sector));
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
