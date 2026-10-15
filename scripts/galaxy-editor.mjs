/**
 * Pure editing operations for a stored galaxy (no Foundry globals). Every function returns a new
 * galaxy object and leaves its input untouched.
 */
import { CONTROLLING_FACTIONS, createRng, getFaction, randomSeed } from "./planet-generator.mjs";
import { MILITARY_TIERS } from "./tables.mjs";
import {
  DEFAULT_RADIUS,
  GALAXY_SCHEMA,
  HEX_DIRECTIONS,
  REGION_LABELS,
  generateSectorPlanet,
  generateSectorPlanets,
  hexDistance,
  influenceLabel,
  rollSector
} from "./galaxy-generator.mjs";

export const MAX_GRID_RADIUS = 10;
export const REGION_IDS = Object.keys(REGION_LABELS);

const clone = (value) => JSON.parse(JSON.stringify(value));
const clampRadius = (radius) => Math.max(1, Math.min(MAX_GRID_RADIUS, Math.round(Number(radius) || DEFAULT_RADIUS)));

export function createEmptyGalaxy({ radius = DEFAULT_RADIUS, seed = randomSeed() } = {}) {
  return { schema: GALAXY_SCHEMA, seed, radius: clampRadius(radius), rotation: 0, sectors: [], routes: [], saved: {} };
}

/** Bring an older or partial galaxy object up to the current shape. */
export function normalizeGalaxy(galaxy) {
  const g = clone(galaxy ?? {});
  g.schema = GALAXY_SCHEMA;
  g.seed ??= randomSeed();
  g.sectors ??= [];
  g.routes ??= [];
  g.saved ??= {};
  g.rotation ??= 0;
  g.radius = clampRadius(g.radius ?? DEFAULT_RADIUS);
  return g;
}

/** Grid radius actually shown: the configured size, grown to fit any sector placed outside it. */
export function gridRadius(galaxy) {
  return Math.max(galaxy.radius ?? DEFAULT_RADIUS, ...galaxy.sectors.map((s) => hexDistance(s.q, s.r)));
}

export function gridHexes(radius) {
  const hexes = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) hexes.push({ q, r });
  }
  return hexes;
}

export const sectorAt = (galaxy, q, r) => galaxy.sectors.find((s) => s.q === q && s.r === r) ?? null;
export const findSector = (galaxy, id) => galaxy.sectors.find((s) => s.id === id) ?? null;

export function setGridRadius(galaxy, radius) {
  return { ...normalizeGalaxy(galaxy), radius: clampRadius(radius) };
}

/** Store a sector's planets so later edits to the sector cannot change them. */
function materialize(galaxy, sector, options) {
  if (!Array.isArray(sector.planets)) sector.planets = generateSectorPlanets(galaxy, sector, options).map(clone);
  sector.planetCount = sector.planets.length;
  return sector;
}

function addRoute(galaxy, a, b) {
  if (a === b || galaxy.routes.some((r) => (r.from === a && r.to === b) || (r.from === b && r.to === a))) return;
  galaxy.routes.push({ from: a, to: b });
}

/**
 * Add a sector at (q, r). mode "random" rolls name, controller and planets for the position;
 * mode "blank" creates an unclaimed sector with no planets. New sectors get a blink-gate route to
 * one adjacent sector so the network stays connected.
 */
export function addSector(galaxy, q, r, { mode = "random", factionWeights, seed = randomSeed() } = {}) {
  const g = normalizeGalaxy(galaxy);
  if (sectorAt(g, q, r)) return g;
  const id = `s-${seed}`;
  const usedNames = new Set(g.sectors.map((s) => s.name));
  const rng = createRng(`sector:${seed}`);
  const radius = Math.max(g.radius, hexDistance(q, r));
  let sector;
  if (mode === "blank") {
    const independent = getFaction("independent");
    sector = {
      id,
      q,
      r,
      name: uniqueName("New Sector", usedNames),
      region: "rim",
      regionLabel: REGION_LABELS.rim,
      isCore: false,
      controller: independent.id,
      controllerName: independent.name,
      influence: 0.5,
      influenceLabel: influenceLabel(0.5),
      planetCount: 0,
      planets: []
    };
  } else {
    sector = rollSector(rng, q, r, { radius, rotation: g.rotation, factionWeights, usedNames, id });
  }
  g.sectors.push(sector);
  const neighbour = HEX_DIRECTIONS.map(([dq, dr]) => sectorAt(g, q + dq, r + dr)).find(Boolean);
  if (neighbour) addRoute(g, neighbour.id, id);
  return g;
}

function uniqueName(base, used) {
  if (!used.has(base)) return base;
  let i = 2;
  while (used.has(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}

export function removeSector(galaxy, id) {
  const g = normalizeGalaxy(galaxy);
  g.sectors = g.sectors.filter((s) => s.id !== id);
  g.routes = g.routes.filter((r) => r.from !== id && r.to !== id);
  return g;
}

export function moveSector(galaxy, id, q, r, options = {}) {
  const g = normalizeGalaxy(galaxy);
  const sector = findSector(g, id);
  if (!sector || sectorAt(g, q, r)) return g;
  materialize(g, sector, options);
  Object.assign(sector, { q, r });
  return g;
}

/** Add the route between two sectors, or remove it if it already exists. */
export function toggleRoute(galaxy, a, b) {
  const g = normalizeGalaxy(galaxy);
  if (a === b || !findSector(g, a) || !findSector(g, b)) return g;
  const before = g.routes.length;
  g.routes = g.routes.filter((r) => !((r.from === a && r.to === b) || (r.from === b && r.to === a)));
  if (g.routes.length === before) g.routes.push({ from: a, to: b });
  return g;
}

/** Edit a sector's name, controller, region or influence. Its planets are kept as they are. */
export function updateSector(galaxy, id, changes = {}, options = {}) {
  const g = normalizeGalaxy(galaxy);
  const sector = findSector(g, id);
  if (!sector) return g;
  materialize(g, sector, options);
  if (typeof changes.name === "string" && changes.name.trim()) sector.name = changes.name.trim();
  const faction = changes.controller && CONTROLLING_FACTIONS.find((f) => f.id === changes.controller);
  if (faction) Object.assign(sector, { controller: faction.id, controllerName: faction.name });
  if (changes.region && REGION_LABELS[changes.region]) {
    Object.assign(sector, { region: changes.region, regionLabel: REGION_LABELS[changes.region], isCore: changes.region === "core" });
  }
  if (changes.influence !== undefined && changes.influence !== "") {
    const value = Number(changes.influence);
    if (Number.isFinite(value)) {
      sector.influence = Math.round(Math.max(0, Math.min(1, value > 1 ? value / 100 : value)) * 100) / 100;
      sector.influenceLabel = influenceLabel(sector.influence);
    }
  }
  for (const planet of sector.planets) planet.sector = { id: sector.id, name: sector.name };
  return g;
}

/** Roll `count` new planets into a sector, weighted by its region and controlling power. */
export function addSectorPlanets(galaxy, id, count = 1, options = {}) {
  const g = normalizeGalaxy(galaxy);
  const sector = findSector(g, id);
  if (!sector) return g;
  materialize(g, sector, options);
  for (let i = 0; i < count; i++) {
    const planet = generateSectorPlanet({ seed: `${g.seed}:${randomSeed()}` }, sector, sector.planets.length, options);
    sector.planets.push(planet);
  }
  sector.planetCount = sector.planets.length;
  return g;
}

export function removeSectorPlanet(galaxy, id, planetSeed, options = {}) {
  const g = normalizeGalaxy(galaxy);
  const sector = findSector(g, id);
  if (!sector) return g;
  materialize(g, sector, options);
  sector.planets = sector.planets.filter((p) => p.seed !== planetSeed);
  sector.planetCount = sector.planets.length;
  return g;
}

export function replaceSectorPlanet(galaxy, id, planet, options = {}) {
  const g = normalizeGalaxy(galaxy);
  const sector = findSector(g, id);
  if (!sector) return g;
  materialize(g, sector, options);
  const index = sector.planets.findIndex((p) => p.seed === planet.seed);
  const stored = { ...clone(planet), sector: { id: sector.id, name: sector.name } };
  if (index >= 0) sector.planets[index] = stored;
  else sector.planets.push(stored);
  sector.planetCount = sector.planets.length;
  return g;
}

/**
 * Apply values from the planet edit form (flat keys such as "environment.label") to a planet.
 * Changing the faction or tier pulls the matching description from the tables; an empty religion
 * name means no religion; lore paragraphs are separated by blank lines.
 */
export function applyPlanetEdits(planet, fields = {}) {
  const p = clone(planet);
  const text = (key) => (typeof fields[key] === "string" ? fields[key].trim() : undefined);
  const set = (path, key = path) => {
    const value = text(key);
    if (value === undefined) return;
    const [section, prop] = path.split(".");
    p[section] = { ...(p[section] ?? {}), [prop]: value };
  };

  if (text("name")) p.name = text("name");
  if (fields.isCore !== undefined) {
    p.isCore = fields.isCore === true || fields.isCore === "true" || fields.isCore === "on";
    p.coreLabel = p.isCore ? "Core World" : "Non-Core World";
  }
  for (const section of ["environment", "dialect", "politicalClimate", "foundingEra"]) {
    set(`${section}.label`);
    set(section === "environment" ? "environment.flavor" : `${section}.description`);
  }

  const faction = fields["military.factionId"] && getFaction(fields["military.factionId"]);
  if (faction && faction.id !== p.military.factionId) {
    Object.assign(p.military, { factionId: faction.id, faction: faction.name, factionDescription: faction.description });
  }
  const tier = fields["military.tierId"] && MILITARY_TIERS.find((t) => t.id === fields["military.tierId"]);
  if (tier && tier.id !== p.military.tierId) Object.assign(p.military, { tierId: tier.id, tier: tier.label, tierDescription: tier.description });
  if (text("military.forces") !== undefined) p.military.forces = text("military.forces");

  if (text("religion.label") !== undefined) {
    const label = text("religion.label");
    p.religion = label
      ? { id: p.religion?.label === label ? p.religion.id : "custom", label, description: text("religion.description") ?? p.religion?.description ?? "" }
      : null;
  }

  if (typeof fields.lore === "string") {
    const paragraphs = fields.lore.split(/\n\s*\n/).map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean);
    if (paragraphs.length) p.lore = paragraphs;
  }
  return p;
}

