/**
 * Pure galaxy-map generator: hex sectors around a Union core, Karrakin and Aun space at the rim,
 * connected by blink-gate routes. No Foundry globals.
 */
import { CONTROLLING_FACTIONS, createRng, generatePlanet, getFaction, randomSeed, weightedPick } from "./planet-generator.mjs";

export const DEFAULT_RADIUS = 3;

const HEX_DIRECTIONS = [
  [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]
];

const SECTOR_PREFIXES = [
  "Achernar", "Belisar", "Corvane", "Deneb", "Elara", "Fomal", "Gienah", "Hadar", "Izar", "Kaus",
  "Lesath", "Mirach", "Nashira", "Okul", "Phact", "Rasal", "Sabik", "Tarazed", "Unuk", "Vindem",
  "Wezen", "Yildun", "Zaniah", "Alcor", "Brisa", "Castor", "Dubhe", "Errai", "Furud", "Gomeisa",
  "Haedi", "Jabbah", "Kochab", "Lucida", "Merak", "Naos", "Ozan", "Pollux", "Rigel", "Sadr"
];

const SECTOR_SUFFIXES = {
  union: ["Core", "Commons", "Concord", "Administrative Zone"],
  karrakin: ["March", "Barony", "Demesne", "Dominion"],
  ipsn: ["Lanes", "Freightway", "Convoy Reach"],
  harrison: ["Purview", "Bastion", "Protectorate"],
  ssc: ["Constellation", "Charter Zone", "Gardens"],
  gms: ["Works", "Arsenal Reach", "Foundry"],
  aun: ["Ascendancy", "Sanctum", "Pilgrim Reach"],
  independent: ["Verge", "Expanse", "Drift", "Free Reach"]
};

/** Faction weights per region; HORUS is never present because only CONTROLLING_FACTIONS are rolled. */
const REGION_WEIGHTS = {
  core: { union: 12, gms: 1, ssc: 1, ipsn: 1 },
  inner: { union: 4, ipsn: 2, ssc: 1.5, gms: 1.5, harrison: 1.5, independent: 1 },
  karrakin: { karrakin: 10, independent: 1, union: 0.5 },
  aun: { aun: 10, independent: 1.5 },
  rim: { harrison: 2.5, ipsn: 2, independent: 3, union: 1, ssc: 1 }
};

const REGION_LABELS = {
  core: "Union Core",
  inner: "Inner Diaspora",
  karrakin: "Karrakin Rim",
  aun: "Aunic Rim",
  rim: "Long Rim"
};

export function hexDistance(q, r) {
  return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
}

export function influenceLabel(influence) {
  if (influence >= 0.9) return "Absolute";
  if (influence >= 0.7) return "Strong";
  if (influence >= 0.5) return "Moderate";
  return "Contested";
}

function regionFor(dist, radius, wedge) {
  if (dist <= Math.max(1, Math.floor(radius / 3))) return "core";
  if (dist < radius) return "inner";
  // Rim: two wedges of Karrakin space, one wedge of Aun space, the rest Long Rim.
  if (wedge === 0 || wedge === 1) return "karrakin";
  if (wedge === 3) return "aun";
  return "rim";
}

function factionMultiplier(factionWeights, id) {
  const cfg = factionWeights?.[id];
  if (!cfg) return 1;
  if (cfg.enabled === false) return 0;
  const w = Number(cfg.weight);
  return Number.isFinite(w) ? Math.max(0, w) : 1;
}

function rollController(rng, region, factionWeights) {
  const weights = REGION_WEIGHTS[region];
  const fn = (f) => (weights[f.id] ?? 0) * factionMultiplier(factionWeights, f.id);
  const total = CONTROLLING_FACTIONS.reduce((sum, f) => sum + fn(f), 0);
  if (total <= 0) {
    const fallback = (f) => factionMultiplier(factionWeights, f.id) * (f.rim || 0.1);
    const anyTotal = CONTROLLING_FACTIONS.reduce((sum, f) => sum + fallback(f), 0);
    return anyTotal > 0 ? weightedPick(rng, CONTROLLING_FACTIONS, fallback) : getFaction("independent");
  }
  return weightedPick(rng, CONTROLLING_FACTIONS, fn);
}

/**
 * @param {object} [options]
 * @param {string} [options.seed]
 * @param {number} [options.radius=3]  Hex rings around the center sector.
 * @param {object} [options.factionWeights]
 */
export function generateGalaxy(options = {}) {
  const seed = options.seed ?? randomSeed();
  const radius = Math.max(2, Math.min(5, options.radius ?? DEFAULT_RADIUS));
  const rng = createRng(`galaxy:${seed}`);
  const rotation = rng.int(0, 5);
  const usedNames = new Set();
  const sectors = [];

  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      const dist = hexDistance(q, r);
      const x = Math.sqrt(3) * (q + r / 2);
      const y = 1.5 * r;
      const angle = (Math.atan2(y, x) + 2 * Math.PI) % (2 * Math.PI);
      const wedge = (Math.floor(angle / (Math.PI / 3)) + rotation) % 6;
      const region = dist === 0 ? "core" : regionFor(dist, radius, wedge);
      const controller = dist === 0 ? getFaction("union") ?? rollController(rng, region, options.factionWeights) : rollController(rng, region, options.factionWeights);

      const dominant = Object.entries(REGION_WEIGHTS[region]).sort((a, b) => b[1] - a[1])[0][0];
      let influence = region === "core" ? 0.75 + rng.next() * 0.25 : 0.35 + rng.next() * 0.55;
      if (controller.id === dominant) influence += 0.1;
      if (dist === 0) influence = 1;
      influence = Math.round(Math.min(1, influence) * 100) / 100;

      let name;
      do {
        name = `${rng.pick(SECTOR_PREFIXES)} ${rng.pick(SECTOR_SUFFIXES[controller.id] ?? SECTOR_SUFFIXES.independent)}`;
      } while (usedNames.has(name) && usedNames.size < SECTOR_PREFIXES.length * 3);
      usedNames.add(name);

      const [minPlanets, maxPlanets] = region === "core" ? [3, 7] : region === "inner" ? [2, 6] : [1, 5];
      sectors.push({
        id: `${q},${r}`,
        q,
        r,
        name,
        region,
        regionLabel: REGION_LABELS[region],
        isCore: region === "core",
        controller: controller.id,
        controllerName: controller.name,
        influence,
        influenceLabel: influenceLabel(influence),
        planetCount: rng.int(minPlanets, maxPlanets)
      });
    }
  }

  return { seed, radius, sectors, routes: buildRoutes(rng, sectors) };
}

/** Blink-gate routes: a random spanning tree over adjacent sectors plus a few extra links. */
function buildRoutes(rng, sectors) {
  const byId = new Map(sectors.map((s) => [s.id, s]));
  const edges = [];
  for (const s of sectors) {
    for (const [dq, dr] of HEX_DIRECTIONS) {
      const other = byId.get(`${s.q + dq},${s.r + dr}`);
      if (other && s.id < other.id) {
        // Core links are cheaper so gates radiate from the Union core.
        const bias = (s.isCore ? 0 : 0.3) + (other.isCore ? 0 : 0.3);
        edges.push({ from: s.id, to: other.id, w: rng.next() + bias });
      }
    }
  }
  edges.sort((a, b) => a.w - b.w);

  const parent = new Map(sectors.map((s) => [s.id, s.id]));
  const find = (id) => {
    while (parent.get(id) !== id) {
      parent.set(id, parent.get(parent.get(id)));
      id = parent.get(id);
    }
    return id;
  };

  const routes = [];
  for (const e of edges) {
    const a = find(e.from);
    const b = find(e.to);
    if (a !== b) {
      parent.set(a, b);
      routes.push({ from: e.from, to: e.to });
    } else if (rng.chance(0.12)) {
      routes.push({ from: e.from, to: e.to });
    }
  }
  return routes;
}

/** Deterministically generate the `index`-th planet of a sector. */
export function generateSectorPlanet(galaxy, sector, index, options = {}) {
  const seed = `${galaxy.seed}:${sector.id}:${index}`;
  const rng = createRng(`${seed}:sector`);
  const coreChance = sector.region === "core" ? 0.7 : sector.region === "inner" ? 0.15 : 0;
  const controlled = rng.chance(sector.influence);
  return generatePlanet({
    ...options,
    seed,
    isCore: rng.chance(coreChance),
    factionId: controlled ? sector.controller : undefined,
    sector: { id: sector.id, name: sector.name }
  });
}

export function generateSectorPlanets(galaxy, sector, options = {}) {
  return Array.from({ length: sector.planetCount }, (_, i) => generateSectorPlanet(galaxy, sector, i, options));
}
