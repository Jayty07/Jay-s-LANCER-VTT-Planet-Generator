# LANCER Planet Generator (Foundry VTT module)

A Foundry VTT module for the [LANCER](https://massif-press.itch.io/corebook-pdf-free) TTRPG that rolls planets from weighted, setting-flavoured tables and saves each one as an **editable Journal Entry**.

Each planet gets:

- **Core world status** – Core / non-Core; weights every other table.
- **Average environment** - temperate terrestrial, terraformed garden world, arid desert, cryo-tundra, tidally locked, oceanic, orbital habitat, corrosive atmosphere, volcanic, hothouse jungle, ecumenopolis, airless moon/asteroid warren.
- **Typical accent / dialect** of the natives.
- **Political climate** - stable Union administration, contested succession, corpro charter governance, Baronic feudal tension, revolutionary unrest, and more.
- **Military power + controlling faction** – tier (Planetary Militia / Garrisoned / Fortress World / Shipyard Hub) and faction (Union (ThirdComm), Karrakin Trade Baronies, IPS-N, Harrison Armory, SSC, GMS, Aun Ascendancy, Independent / Local Militia). **HORUS is never in the controlling-faction pool.**
- **Religion** (optional) - including "None (secular Union civic culture)".
- **Founding era** and a **2–4 paragraph planet history** assembled from the environment, era, faction, and politics.

Optional (off by default): a **Galaxy Map** of hex sectors – Union core in the centre, Karrakin and Aun space on the rim, blink-gate routes between sectors – where clicking a sector lists and saves its planets.

Built for **Foundry VTT v13** (also runs on v12). The LANCER system is *recommended*, not required.

Manifest URL:

```
https://github.com/Jayty07/Jay-s-LANCER-VTT-Planet-Generator/releases/latest/download/module.json
```

## Usage

- **Open the generator:** the **Planet Generator** button at the top of the **Journal** sidebar tab, or the globe button in the **Journal Notes** scene controls (left toolbar).
- Set any options (name, Core status, controlling faction, religion on/off, seed), click **Generate**, and read the preview. Click the dice icon next to any section heading to re-roll just that section.
- Pick where to save (default folder from settings, the sidebar root, any Journal folder, or an unlocked Journal compendium) and click **Save to Journal**.
- The journal entry is ordinary Foundry text: edit any section in the journal editor.
- **Re-roll later:** open a generated planet's journal and use **Re-roll** in the sheet header menu (the `⋮` / controls menu in v13), or right-click the entry in the Journal sidebar → **Re-roll**. Choose which sections to re-roll. This rewrites the page from the new results and replaces manual edits to it. The raw rolled data lives in the entry's `flags.lancer-planet-generator.planet`.
- **Galaxy map:** turn on *Enable galaxy map* in the module settings, then use the **Galaxy Map** button in the Journal sidebar (GM only).
  - **Zoom and pan:** mouse wheel or the +/− buttons to zoom (the expand button fits the map to the window); drag to pan.
  - **Shape the galaxy** with the tool buttons: *Add Sector* (click an empty hex for a sector rolled to fit its position), *Add Blank Sector* (unclaimed, no planets), *Move* (click a sector, then an empty hex), *Link Route* (click two sectors to add/remove a blink-gate route), *Erase*. *Grid size* sets how many hex rings are shown; **Clear Map** starts from an empty grid and **New Galaxy** rolls a full one.
  - **Sectors:** click one to edit its name, controlling power, region and influence (**Save Sector**), add one planet or generate several, delete planets, and save one or all to the journal.
  - **Edit planets on the map:** click a planet's name (or the pen) to edit every field, re-roll any section with its dice, and **Save Changes**. Changes are stored in the galaxy; if the planet already has a journal entry, that entry is rewritten too.

### Macro / API

```js
const api = game.modules.get("lancer-planet-generator").api;
const planet = api.generatePlanet({ isCore: true, factionId: "karrakin" });
await api.savePlanetToJournal(planet);   // "default" | "root" | "folder:<id>" | "pack:<compendium id>"
api.openGenerator();
api.openGalaxyMap();
```

Faction ids: `union`, `karrakin`, `ipsn`, `harrison`, `ssc`, `gms`, `aun`, `independent`.

## How the tables work

Rolls happen in this order, each one weighting the next:

1. **Core status** (setting chance, or forced in the generator).
2. **Controlling faction** – Core vs non-Core weight × your *Faction weighting* setting.
3. **Environment**, **founding era**, **political climate**, **military tier**, **dialect**, **religion** – each entry has a Core weight and a non-Core weight, multiplied by modifiers for the faction, environment, or era already rolled (e.g. *Baronic Feudal Tension* is ×8 under the Karrakin Trade Baronies and ×0.03 under anyone else).
4. **Lore** – a founding paragraph (era + environment + Core status), a faction paragraph (with the military tier), a political paragraph, and a 60% chance of a present-day hook.

Re-rolling a section that the lore mentions also rewrites the lore so it stays consistent. Every roll uses a seed, so the same seed and options give the same planet.

All tables live in [`scripts/tables.mjs`](scripts/tables.mjs). The tables below are generated from it with `npm run docs`.

<!-- TABLES:START -->
### Controlling faction

| Entry | Core weight | Non-Core weight | Modifiers | Description |
| --- | --- | --- | --- | --- |
| Union (ThirdComm) | 10 | 3 | - | The Third Committee's Union: a post-scarcity, utopian-minded interstellar government administered by the Union Administrative Department (UAD) and defended by the Union Navy. |
| Karrakin Trade Baronies | 0.15 | 3 | - | A powerful aristocratic state of Baronic houses bound by trade, oath, and ancient lineage; allied with the Union yet jealous of its sovereignty. |
| IPS-Northstar | 1.2 | 2.5 | - | Interplanetary Shipping-Northstar, the galaxy's foremost shipping and logistics corpro, whose hulls carry most of the Diaspora's trade. |
| Harrison Armory | 0.8 | 2.5 | - | An imperial corpro-state and arms manufacturer, expansionist and proud, ruling its Purview of annexed worlds with discipline and heavy ordnance. |
| Smith-Shimano Corpro | 1.2 | 1.8 | - | Smith-Shimano Corpro, purveyor of luxury, biotechnology, and elegant high-performance frames to those who can afford them. |
| General Massive Systems | 1.5 | 1.5 | - | General Massive Systems, maker of the reliable, standardized frames and arms that equip most armies in the galaxy. |
| Aun Ascendancy | 0 | 1.4 | - | The distant, devout Aun Ascendancy, an ancient and largely self-sufficient power far from Union space, ordered by faith and lineage. |
| Independent / Local Militia | 0.4 | 4 | - | No outside power holds this world; it governs and defends itself with whatever it can build, buy, or salvage. |

### Average environment

| Entry | Core weight | Non-Core weight | Modifiers | Description |
| --- | --- | --- | --- | --- |
| Temperate Terrestrial | 6 | 3 | - | Broad continents of grassland and mixed forest roll beneath a breathable, blue-white sky; seasons are mild and predictable. |
| Terraformed Garden World | 5 | 0.8 | - | Centuries of patient terraforming have made this world lush and engineered: every forest was planted, every lake was dug. |
| Arid Desert | 2 | 5 | - | Endless dune seas and salt flats bake under a pitiless star; water is the true currency here. |
| Cryo-Tundra | 1 | 4 | - | Glaciers kilometres thick grind across the surface; the population lives in geothermal-heated domes and ice-cut warrens. |
| Tidally Locked | 1 | 3 | - | One hemisphere burns in eternal day, the other freezes in eternal night; life clings to the twilight terminator. |
| Oceanic | 2 | 3 | - | A planet-spanning ocean broken only by volcanic archipelagos; most people live on floating arcologies or seabed habitats. |
| Orbital Habitat | 4 | 3 | - | There is no habitable surface; the population lives aboard a cluster of spin-gravity habitats orbiting a barren primary. |
| Corrosive Atmosphere | 0.5 | 3 | - | Acidic clouds and caustic rain eat through unshielded metal in weeks; cities hide beneath sealed, layered domes. |
| Volcanic / High-Tectonic | 0.5 | 2 | - | Rivers of lava and ash-choked skies; the crust is young, restless, and staggeringly rich in heavy metals. |
| Hothouse Jungle | 1 | 3 | - | Steaming rainforest smothers the continents, home to a riotous native ecology that resists every attempt at clearing. |
| Ecumenopolis | 3 | 0.2 | - | A single continuous city covers the land, layered kilometres deep; the original surface has not seen daylight in centuries. |
| Airless Moon / Asteroid Warren | 1 | 3 | - | A cratered, airless body honeycombed with tunnels; the population lives entirely underground. |

### Founding era

| Entry | Core weight | Non-Core weight | Modifiers | Description |
| --- | --- | --- | --- | --- |
| Sublight Diaspora | 2 | 2 | faction: karrakin x2, aun x2 | Settled by a slow sublight ark long before blink-gates, its founders cut off from Cradle for generations. |
| First Committee Expansion | 3 | 1.5 | faction: union x1.5 | Founded during the First Committee's early expansion out from Cradle. |
| Second Committee Colonial Era | 3 | 3 | faction: harrison x1.5 | Colonized under the Second Committee, whose expansionist and often brutal policies still shape local memory. |
| Third Committee Era | 2 | 2 | faction: union x1.5, ssc x1.5, gms x1.5 | Settled under the Third Committee, with Union aid, printers, and a charter of rights from the first day. |
| Recent Blink-Gate Settlement | 0.5 | 3 | faction: ipsn x2, independent x1.5 | Opened to settlement only recently, after a new blink-gate connection brought it within reach. |
| Reclaimed Lost Colony | 0.5 | 2 | faction: independent x2 | An old colony lost to contact for generations and only recently rediscovered. |

### Political climate

| Entry | Core weight | Non-Core weight | Modifiers | Description |
| --- | --- | --- | --- | --- |
| Stable Union Administration | 8 | 1 | faction: union x4, default x0.02 | UAD administrators keep the lights on and the manna flowing; local councils debate in the open and disputes go to arbitration rather than arms. |
| Union Mandate Oversight | 1 | 3 | faction: union x3, default x0.1 | A frontier world under Union mandate: DoJ/HR observers and UAD liaisons guide a local government still learning Union norms, not always willingly. |
| Contested Succession | 0.5 | 2 | faction: karrakin x4, aun x3, independent x1.5, union x0.2 | The last ruler is dead or deposed and several claimants have legitimate-sounding cases; factions are arming while diplomats stall. |
| Corpro Charter Governance | 2 | 2 | faction: ipsn x5, ssc x5, gms x5, harrison x1.5, union x0.6, karrakin x0.1, aun x0.05 | The world is run under a corporate charter: the board is the government, citizenship is employment, and the shareholders live offworld. |
| Baronic Feudal Tension | 0.1 | 2 | faction: karrakin x8, default x0.03 | A Baron rules by right and oath, but lesser houses, guilds, and restless commoners each push against the old order. |
| Revolutionary Unrest | 0.8 | 3 | faction: karrakin x1.5, harrison x1.5, ipsn x1.2, ssc x1.2, union x0.5 | Strikes, sabotage, and street militias challenge the ruling power; the revolution has popular support but no single leader. |
| Armory Annexation Protectorate | 0.3 | 2 | faction: harrison x8, default x0.02 | Annexed into Harrison Armory's Purview; order is enforced, production quotas are met, and dissent is treated as treason. |
| Ascendant Theocracy | 0 | 1 | faction: aun x10, default x0.03 | Temporal and spiritual authority are one; the clergy and noble lineages of the Ascendancy rule by sacred right. |
| Technocratic Council | 1 | 2 | faction: independent x3, union x1.5, gms x1.5 | Engineers, planners, and system administrators hold power because they keep the world running; politics is a matter of maintenance schedules. |
| Martial Law | 0.5 | 2 | faction: harrison x2, independent x1.5, union x0.4 | A recent crisis put the military in charge 'temporarily'; that was years ago, and the officers show no sign of stepping down. |
| Armed Neutrality | 0.3 | 2 | faction: independent x4, default x0.1 | Fiercely independent and well armed, the world plays the great powers against each other and trusts none of them. |
| Post-Conflict Reconstruction | 1 | 2 | - | The war is over, the scars are not; rebuilding efforts, refugee returns, and unresolved grievances define daily life. |

### Military power tier

| Entry | Core weight | Non-Core weight | Modifiers | Description |
| --- | --- | --- | --- | --- |
| Planetary Militia | 1 | 5 | faction: independent x3, union x0.6, harrison x0.3 | Defense rests on part-time citizen soldiers and a handful of aging frames; enough to deter raiders, not an invasion. |
| Garrisoned | 4 | 3 | - | A standing garrison with professional pilots, orbital pickets, and hardened depots holds the world securely. |
| Fortress World | 2 | 1 | faction: harrison x3, karrakin x1.5, independent x0.3 | Layered planetary defenses, deep bunkers, orbital gun platforms, and multiple lancer battalions make assault ruinously expensive. |
| Shipyard Hub | 3 | 0.6 | faction: ipsn x3, gms x2, union x1.5, harrison x1.5, independent x0.2; environment: orbital-habitat x3, airless-rock x1.5 | Orbital drydocks and fabrication yards build and refit warships; the world is a strategic node defended by the fleets it services. |

### Accent / dialect

| Entry | Core weight | Non-Core weight | Modifiers | Description |
| --- | --- | --- | --- | --- |
| Union Standard (Cradle-clipped) | 6 | 1.5 | faction: union x3, default x0.6 | Precise, administrative Union Standard with a clipped Cradle cadence; bureaucratic idioms pepper everyday speech. |
| Omninet Creole | 3 | 2 | - | A fast, borrowing creole shaped by omninet media and lag-delayed messaging; loanwords from a dozen worlds, abbreviations spoken aloud. |
| Spacer Cant | 1.5 | 2.5 | faction: ipsn x4; environment: orbital-habitat x2, airless-rock x1.5 | Dockside trade cant of freighter crews and blink-gate haulers: nautical slang, cargo codes, and hand-signal habits carried into speech. |
| Karrakin Court Register | 0.5 | 1 | faction: karrakin x6, default x0.2 | Ornate, formal Baronic speech thick with honorifics, oath-formulae, and careful attention to rank; who speaks first matters. |
| Baronic Vernacular | 0.3 | 1.5 | faction: karrakin x6, default x0.2 | The commoners' Karrakin: earthy, guild-inflected, and full of sly double meanings used to mock the nobility within earshot. |
| Armory Parade Standard | 0.5 | 1 | faction: harrison x6, default x0.2 | Crisp, martial Standard taught in Armory schools: declarative, hierarchical, and laced with ordnance terminology and loyalty phrases. |
| Corpro Boardroom Polish | 2 | 1 | faction: ssc x5, ipsn x1.5, gms x1.5, default x0.5 | Smooth, brand-conscious speech of corpro charter cities; status is signalled through euphemism and perfectly modulated tone. |
| GMS Shop-Floor Technical | 1 | 1 | faction: gms x5, default x0.5 | Practical, acronym-heavy speech of factory and maintenance crews; part numbers double as slang, and everything has a spec. |
| Aunic Liturgical Inflection | 0 | 0.5 | faction: aun x10, default x0.05 | Speech shaped by Ascendancy liturgy: cadenced, reverent, with devotional phrases woven into greetings and oaths. |
| Long Rim Drawl | 0.1 | 3 | faction: independent x2.5, union x0.5 | Slow, laconic frontier speech of distant colonies; few words, dry humour, and a deep suspicion of anyone who talks too fast. |
| Ark-Archaic | 0.5 | 1.5 | era: sublight x6, reclaimed x3 | Descendants of sublight arks preserve a centuries-old dialect, drifting from modern Standard; Union visitors find it quaint, then incomprehensible. |
| Frontier Polyglot | 0.5 | 2.5 | faction: independent x2 | A patchwork of the languages every wave of settlers brought; most locals switch between three tongues mid-sentence. |
| Hab Pressure-Clipped | 0.3 | 0.3 | environment: orbital-habitat x12, airless-rock x6, corrosive-atmosphere x4 | Terse, efficient speech evolved for comm-channels and suit radios; safety callouts and pressure jargon are everyday words. |

### Religion

| Entry | Core weight | Non-Core weight | Modifiers | Description |
| --- | --- | --- | --- | --- |
| None (secular Union civic culture) | 6 | 2 | faction: union x2.5, karrakin x0.3, aun x0.05 | No dominant faith; civic festivals, public service, and Union ideals of shared humanity fill the role religion plays elsewhere. Private belief is common and unremarkable. |
| Ancestor Cult | 1 | 3 | era: sublight x3, reclaimed x2 | Families keep shrines to their founders and honoured dead; the names of the first settlers are recited at every major event. |
| Baronic-Aligned Faith | 0.2 | 1 | faction: karrakin x8, default x0.1 | A state church that sanctifies the Baronic order: the ruling house's lineage is holy, and oaths sworn before its altars bind for life. |
| Monastic Order | 1 | 2 | - | A contemplative order maintains remote monasteries that serve as archives, hospitals, and neutral ground in times of conflict. |
| Aunic Devotion | 0 | 0.3 | faction: aun x12, default x0.02 | The faith of the Ascendancy pervades daily life: devotional hours, pilgrimages, and reverence for sacred lineages. |
| Cradle Syncretism | 2 | 2 | era: sublight x2, first-comm x1.5 | Fragments of many old Cradle faiths, carried out into the Diaspora and blended together until their origins are hard to trace. |
| Blinkspace Mysticism | 0.5 | 2 | faction: ipsn x2 | Spacers and gate-crews venerate the unknowable void of blinkspace; rituals before every jump, and tales of those who came back changed. |
| Corporate Civic Liturgy | 1 | 1 | faction: ssc x4, ipsn x2, gms x2, harrison x2, default x0.2 | Founder-days, loyalty vows, and company saints: the corpro's mythology has quietly become the world's religion. |
| Machine Reverence | 0.5 | 1 | environment: corrosive-atmosphere x2, orbital-habitat x2, garden-world x1.5 | Reverence for the life-support machines, terraformers, and (whispered) NHPs that keep the world alive; maintenance is a sacred duty. |
<!-- TABLES:END -->

## Development

The generator itself (`scripts/planet-generator.mjs`, `scripts/galaxy-generator.mjs`, `scripts/tables.mjs`) has no Foundry dependencies and is tested in Node:

```sh
npm install
npm run check   # syntax-check every script
npm test        # generator, galaxy, template, localization and manifest tests
npm run docs    # print the table docs used in this README
```

## Disclaimer

LANCER is copyright Massif Press. This is an unofficial fan-made tool; table text is original, written to fit the setting.
