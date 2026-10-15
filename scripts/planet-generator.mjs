/**
 * Pure planet generator: no Foundry globals, so it can be imported and tested in Node.
 */
import {
  DIALECTS,
  ENVIRONMENTS,
  FACTIONS,
  FOUNDING_ERAS,
  LORE_HOOKS,
  MILITARY_TIERS,
  NAME_PARTS,
  POLITICAL_CLIMATES,
  RELIGIONS,
  SECTION_IDS
} from "./tables.mjs";

export const SCHEMA_VERSION = 1;
export const DEFAULT_CORE_CHANCE = 0.25;
const EXCLUDED_FACTION_IDS = new Set(["horus"]);

/** Controlling-faction pool with HORUS stripped out, whatever the tables contain. */
export const CONTROLLING_FACTIONS = FACTIONS.filter((f) => !EXCLUDED_FACTION_IDS.has(f.id.toLowerCase()));

export function getFaction(id) {
  return CONTROLLING_FACTIONS.find((f) => f.id === id) ?? null;
}

function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** Deterministic PRNG (mulberry32) seeded from any string. */
export function createRng(seed) {
  let a = hashSeed(String(seed));
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p
  };
}

export function randomSeed() {
  return Math.random().toString(36).slice(2, 10);
}

function mod(map, key) {
  if (!map) return 1;
  if (key in map) return map[key];
  return map.default ?? 1;
}

/**
 * Effective weight of a table entry given the planet context rolled so far.
 */
export function entryWeight(entry, ctx) {
  let w = ctx.isCore ? entry.core : entry.rim;
  if (ctx.factionId) w *= mod(entry.factionMods, ctx.factionId);
  if (ctx.environmentId) w *= mod(entry.envMods, ctx.environmentId);
  if (ctx.eraId) w *= mod(entry.eraMods, ctx.eraId);
  return Math.max(0, w);
}

export function weightedPick(rng, entries, weightFn) {
  const weights = entries.map(weightFn);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return rng.pick(entries);
  let roll = rng.next() * total;
  for (let i = 0; i < entries.length; i++) {
    roll -= weights[i];
    if (roll < 0) return entries[i];
  }
  return entries[entries.length - 1];
}

/**
 * @param {object} factionWeights  {factionId: {enabled: boolean, weight: number}}
 */
function factionMultiplier(factionWeights, id) {
  const cfg = factionWeights?.[id];
  if (!cfg) return 1;
  if (cfg.enabled === false) return 0;
  const w = Number(cfg.weight);
  return Number.isFinite(w) ? Math.max(0, w) : 1;
}

export function rollFaction(rng, ctx, factionWeights) {
  const weightFn = (f) => entryWeight(f, { isCore: ctx.isCore }) * factionMultiplier(factionWeights, f.id);
  const total = CONTROLLING_FACTIONS.reduce((sum, f) => sum + weightFn(f), 0);
  if (total <= 0) return getFaction("independent");
  return weightedPick(rng, CONTROLLING_FACTIONS, weightFn);
}

export function rollName(rng) {
  const { starts, middles, ends, designations } = NAME_PARTS;
  const base = rng.pick(starts) + rng.pick(middles) + rng.pick(ends);
  return base + rng.pick(designations);
}

function fill(text, planet) {
  return text.replaceAll("{name}", planet.name);
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Assemble a 2-4 paragraph history from environment, founding era, controlling faction,
 * and political climate.
 */
export function buildLore(rng, planet) {
  const env = ENVIRONMENTS.find((e) => e.id === planet.environment.id);
  const era = FOUNDING_ERAS.find((e) => e.id === planet.foundingEra.id);
  const climate = POLITICAL_CLIMATES.find((c) => c.id === planet.politicalClimate.id);
  const faction = getFaction(planet.military.factionId);
  const coreLine = planet.isCore
    ? `Its place among the Core worlds came from decades of steady growth, dense blink-gate traffic, and a population large enough to matter in every council.`
    : `Far from the Core, it has always had to make do with what the convoys brought and what its own people could build.`;

  const paragraphs = [];
  paragraphs.push(
    `${planet.name} was first settled ${era.when}. ${env.settle}. ${env.hardship}. ${coreLine}`
  );

  if (faction) {
    const arrival =
      faction.id === "independent"
        ? `No great power ever managed to hold ${planet.name} for long. Its people learned to defend themselves, and today the world is guarded by ${planet.military.forces}.`
        : rng.pick([
            `${capitalize(faction.ref)} came to dominate ${planet.name} through ${rng.pick(["trade concessions", "a mutual-defence treaty", "a disputed annexation", "patient investment", "a negotiated charter", "the aftermath of a crisis"])}, and its influence is now woven into the world's institutions.`,
            `Control of ${planet.name} passed to ${faction.ref} ${rng.pick(["generations ago", "within living memory", "after a long and bitter negotiation", "almost by accident"])}. Today its claim is anchored by ${planet.military.forces}.`
          ]);
    const tier = MILITARY_TIERS.find((t) => t.id === planet.military.tierId);
    paragraphs.push(`${arrival} Militarily, it is defended by ${tier?.phrase ?? planet.military.tier.toLowerCase()}.`);
  }

  paragraphs.push(fill(rng.pick(climate.lore), planet));

  if (rng.chance(0.6)) {
    const faith = planet.religion && planet.religion.id !== "secular"
      ? ` Followers of the local faith (${planet.religion.label}) add their own voice to every controversy.`
      : "";
    paragraphs.push(rng.pick(LORE_HOOKS) + faith);
  }

  // Keep the history at 2-4 paragraphs.
  return paragraphs.slice(0, 4);
}

function snapshot(entry, extra = {}) {
  return { id: entry.id, label: entry.label, ...extra };
}

/**
 * Generate a planet record.
 *
 * @param {object} [options]
 * @param {string} [options.seed]
 * @param {string} [options.name]           Fixed name instead of a rolled one.
 * @param {boolean} [options.isCore]        Force Core/non-Core; omitted = roll with coreChance.
 * @param {number} [options.coreChance]     0-1 chance of Core status when not forced.
 * @param {string} [options.factionId]      Force controlling faction.
 * @param {boolean} [options.includeReligion=true]
 * @param {object} [options.factionWeights] {id: {enabled, weight}}
 * @param {object} [options.sector]         {id, name} of a galaxy-map sector.
 * @param {object} [previous]               Planet to keep values from (used by reroll).
 * @param {string[]} [sections]             Sections to re-roll; others are kept from `previous`.
 */
export function generatePlanet(options = {}, previous = null, sections = SECTION_IDS) {
  const seed = options.seed ?? randomSeed();
  const rng = createRng(seed);
  const keep = (section) => previous && !sections.includes(section);
  const includeReligion = options.includeReligion ?? true;

  const isCore = previous
    ? previous.isCore
    : typeof options.isCore === "boolean"
      ? options.isCore
      : rng.chance(options.coreChance ?? DEFAULT_CORE_CHANCE);

  const planet = {
    schema: SCHEMA_VERSION,
    seed,
    isCore,
    coreLabel: isCore ? "Core World" : "Non-Core World",
    sector: options.sector ?? previous?.sector ?? null
  };

  planet.name = keep("name") ? previous.name : options.name?.trim() || rollName(rng);

  // Faction is part of the "military" section.
  let faction;
  if (keep("military")) faction = getFaction(previous.military.factionId) ?? getFaction("independent");
  else faction = (options.factionId && getFaction(options.factionId)) || rollFaction(rng, { isCore }, options.factionWeights);

  const ctx = { isCore, factionId: faction.id };

  const env = keep("environment")
    ? null
    : weightedPick(rng, ENVIRONMENTS, (e) => entryWeight(e, ctx));
  planet.environment = env ? snapshot(env, { flavor: rng.pick(env.flavor) }) : previous.environment;
  ctx.environmentId = planet.environment.id;

  const era = keep("foundingEra") ? null : weightedPick(rng, FOUNDING_ERAS, (e) => entryWeight(e, ctx));
  planet.foundingEra = era ? snapshot(era, { description: era.description }) : previous.foundingEra;
  ctx.eraId = planet.foundingEra.id;

  const climate = keep("politicalClimate")
    ? null
    : weightedPick(rng, POLITICAL_CLIMATES, (e) => entryWeight(e, ctx));
  planet.politicalClimate = climate ? snapshot(climate, { description: climate.description }) : previous.politicalClimate;

  if (keep("military")) {
    planet.military = previous.military;
  } else {
    const tier = weightedPick(rng, MILITARY_TIERS, (e) => entryWeight(e, ctx));
    planet.military = {
      tierId: tier.id,
      tier: tier.label,
      tierDescription: tier.description,
      factionId: faction.id,
      faction: faction.name,
      factionDescription: faction.description,
      forces: rng.pick(faction.forces)
    };
  }

  const dialect = keep("dialect") ? null : weightedPick(rng, DIALECTS, (e) => entryWeight(e, ctx));
  planet.dialect = dialect ? snapshot(dialect, { description: dialect.description }) : previous.dialect;

  if (!includeReligion) planet.religion = null;
  else if (keep("religion") && previous.religion) planet.religion = previous.religion;
  else {
    const religion = weightedPick(rng, RELIGIONS, (e) => entryWeight(e, ctx));
    planet.religion = snapshot(religion, { description: religion.description });
  }

  planet.lore = keep("lore") ? previous.lore : buildLore(rng, planet);
  return planet;
}

/** Sections the lore text is written from; re-rolling any of them rewrites the lore too. */
export const LORE_DEPENDENCIES = ["name", "environment", "foundingEra", "politicalClimate", "military", "religion"];

export function withLoreDependencies(sections) {
  const set = new Set(sections);
  if (LORE_DEPENDENCIES.some((s) => set.has(s))) set.add("lore");
  return [...set];
}

/** Re-roll the given sections of an existing planet with a fresh seed, keeping the lore consistent. */
export function rerollPlanet(previous, sections, options = {}) {
  const { name, ...rest } = options;
  return generatePlanet({ ...rest, seed: options.seed ?? randomSeed() }, previous, withLoreDependencies(sections));
}
