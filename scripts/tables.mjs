/**
 * Weighted roll tables for the LANCER planet generator.
 *
 * Every entry has a base weight for Core worlds (`core`) and for non-Core worlds (`rim`).
 * `factionMods` multiplies an entry's weight depending on the controlling faction; the
 * `default` key applies to every faction not listed. `envMods` / `eraMods` work the same way
 * for the rolled environment / founding era.
 */

/**
 * Controlling-faction pool. HORUS is deliberately absent and must never be added:
 * it is a cell-based hacker collective, not a power that holds worlds.
 */
export const FACTIONS = [
  {
    id: "union",
    ref: "the Union",
    name: "Union (ThirdComm)",
    short: "Union",
    color: "#3b7dd8",
    core: 10,
    rim: 3,
    description:
      "The Third Committee's Union: a post-scarcity, utopian-minded interstellar government administered by the Union Administrative Department (UAD) and defended by the Union Navy.",
    forces: ["Union Navy picket squadrons", "UAD Auxiliary detachments", "Union Navy marine lancer companies", "a DoJ/HR observer cadre with Union Navy escort"]
  },
  {
    id: "karrakin",
    ref: "the Karrakin Trade Baronies",
    name: "Karrakin Trade Baronies",
    short: "Karrakin",
    color: "#8a3fb8",
    core: 0.15,
    rim: 3,
    description:
      "A powerful aristocratic state of Baronic houses bound by trade, oath, and ancient lineage; allied with the Union yet jealous of its sovereignty.",
    forces: ["house levies sworn to the local Baron", "Baronic knight-lancers and their retinues", "a hired company of Baronic household guard", "the Baron's chartered privateer flotilla"]
  },
  {
    id: "ipsn",
    ref: "IPS-Northstar",
    name: "IPS-Northstar",
    short: "IPS-N",
    color: "#2fa39a",
    core: 1.2,
    rim: 2.5,
    description:
      "Interplanetary Shipping-Northstar, the galaxy's foremost shipping and logistics corpro, whose hulls carry most of the Diaspora's trade.",
    forces: ["IPS-N Trunk Security convoy guard", "IPS-N chartered blink-convoy escorts", "IPS-N freight-yard security mechs", "a Trunk Security rapid-response wing"]
  },
  {
    id: "harrison",
    ref: "Harrison Armory",
    name: "Harrison Armory",
    short: "Harrison Armory",
    color: "#c9452f",
    core: 0.8,
    rim: 2.5,
    description:
      "An imperial corpro-state and arms manufacturer, expansionist and proud, ruling its Purview of annexed worlds with discipline and heavy ordnance.",
    forces: ["Armory garrison legions", "Armory heavy-frame artillery batteries", "Purview Home Guard regiments", "an Armory annexation task force"]
  },
  {
    id: "ssc",
    ref: "Smith-Shimano Corpro",
    name: "Smith-Shimano Corpro",
    short: "SSC",
    color: "#d8b13b",
    core: 1.2,
    rim: 1.8,
    description:
      "Smith-Shimano Corpro, purveyor of luxury, biotechnology, and elegant high-performance frames to those who can afford them.",
    forces: ["SSC executive security details", "contracted SSC-licensed strike lancers", "an SSC orbital defense constellation", "a bespoke-frame private security team"]
  },
  {
    id: "gms",
    ref: "General Massive Systems",
    name: "General Massive Systems",
    short: "GMS",
    color: "#7f8c99",
    core: 1.5,
    rim: 1.5,
    description:
      "General Massive Systems, maker of the reliable, standardized frames and arms that equip most armies in the galaxy.",
    forces: ["GMS-contracted lancer companies", "a GMS proving-ground test battalion", "GMS-equipped local defense forces", "a GMS logistics and maintenance brigade"]
  },
  {
    id: "aun",
    ref: "the Aun Ascendancy",
    name: "Aun Ascendancy",
    short: "Aun",
    color: "#2f9c4f",
    core: 0,
    rim: 1.4,
    description:
      "The distant, devout Aun Ascendancy, an ancient and largely self-sufficient power far from Union space, ordered by faith and lineage.",
    forces: ["Ascendancy temple-guard", "Aunic pilgrim-knights", "an Ascendancy household host", "Aunic devotional lancer orders"]
  },
  {
    id: "independent",
    ref: "local hands",
    name: "Independent / Local Militia",
    short: "Independent",
    color: "#a0763b",
    core: 0.4,
    rim: 4,
    description:
      "No outside power holds this world; it governs and defends itself with whatever it can build, buy, or salvage.",
    forces: ["a volunteer planetary militia", "salvaged-frame local defense cells", "a mercenary company on long contract", "armed civic watch brigades"]
  }
];

export const ENVIRONMENTS = [
  {
    id: "temperate-terrestrial",
    label: "Temperate Terrestrial",
    core: 6,
    rim: 3,
    flavor: [
      "Broad continents of grassland and mixed forest roll beneath a breathable, blue-white sky; seasons are mild and predictable.",
      "A rare natural garden: liquid water, stable tectonics, and an atmosphere humans can breathe without a mask.",
      "River valleys and terraced uplands host most of the population, with wilderness preserves stretching between settlements."
    ],
    settle: "The founders were drawn by its breathable air and open, fertile land",
    hardship: "The very comfort of the world made it a prize worth fighting over"
  },
  {
    id: "garden-world",
    label: "Terraformed Garden World",
    core: 5,
    rim: 0.8,
    flavor: [
      "Centuries of patient terraforming have made this world lush and engineered: every forest was planted, every lake was dug.",
      "Atmospheric processors still hum on the poles, quietly maintaining a climate that would collapse without them.",
      "Manicured biomes are stitched together by maglev lines; the planet is as much infrastructure as it is nature."
    ],
    settle: "Terraforming crews spent generations turning its bare rock and haze into something livable",
    hardship: "The terraforming engines that kept it alive were also its greatest vulnerability"
  },
  {
    id: "arid-desert",
    label: "Arid Desert",
    core: 2,
    rim: 5,
    flavor: [
      "Endless dune seas and salt flats bake under a pitiless star; water is the true currency here.",
      "Settlements cluster around deep aquifers and condensation towers, linked by armored crawler routes.",
      "Glassed canyons and wind-carved mesas shelter cities dug into cool stone."
    ],
    settle: "Prospectors soon followed, chasing the minerals beneath its sands",
    hardship: "Every litre of water has been a matter of politics since the first well was drilled"
  },
  {
    id: "cryo-tundra",
    label: "Cryo-Tundra",
    core: 1,
    rim: 4,
    flavor: [
      "Glaciers kilometres thick grind across the surface; the population lives in geothermal-heated domes and ice-cut warrens.",
      "A pale, wind-scoured world of permafrost and frozen seas, beautiful and lethal in equal measure.",
      "Long auroral nights stretch for months; ice-crawlers and heated rail lines are the only safe way to travel."
    ],
    settle: "Its hardy colonists survived by tapping the geothermal vents beneath the ice",
    hardship: "A single failed heat plant could kill a settlement in a night, so every family learned to share its warmth"
  },
  {
    id: "tidally-locked",
    label: "Tidally Locked",
    core: 1,
    rim: 3,
    flavor: [
      "One hemisphere burns in eternal day, the other freezes in eternal night; life clings to the twilight terminator.",
      "Hurricane-force winds roar from the dayside to the nightside, driving the turbines that power the terminator cities.",
      "The ring of habitable twilight is narrow and crowded, a single long city wrapped around the planet."
    ],
    settle: "Its people built along the narrow ring of twilight where neither fire nor ice could reach",
    hardship: "Land on the terminator was finite, and every border dispute became a matter of survival"
  },
  {
    id: "oceanic",
    label: "Oceanic",
    core: 2,
    rim: 3,
    flavor: [
      "A planet-spanning ocean broken only by volcanic archipelagos; most people live on floating arcologies or seabed habitats.",
      "Storm systems the size of continents circle a world of deep, dark water rich with native biomass.",
      "Tethered sea-cities drift with the currents, harvesting kelp-forests and deep-sea minerals."
    ],
    settle: "Floating cities were anchored over its endless seas",
    hardship: "The sea gave generously, but it took whole cities when the great storms came"
  },
  {
    id: "orbital-habitat",
    label: "Orbital Habitat",
    core: 4,
    rim: 3,
    flavor: [
      "There is no habitable surface; the population lives aboard a cluster of spin-gravity habitats orbiting a barren primary.",
      "Toroidal stations and O'Neill-style cylinders form a glittering necklace around a dead world.",
      "Generations born in spin-gravity rarely set foot on a planet; the station corridors are their streets and fields."
    ],
    settle: "Habitats were raised in orbit because the world below could never be made to bloom",
    hardship: "Air, water, and hull integrity were everyone's business, and sabotage became the gravest crime"
  },
  {
    id: "corrosive-atmosphere",
    label: "Corrosive Atmosphere",
    core: 0.5,
    rim: 3,
    flavor: [
      "Acidic clouds and caustic rain eat through unshielded metal in weeks; cities hide beneath sealed, layered domes.",
      "A yellow-green haze of sulfur compounds blankets the surface; hard-suits are mandatory outside.",
      "Chemical refineries harvest the poisonous sky itself, turning the atmosphere into fuel and feedstock."
    ],
    settle: "Industrial concerns saw value in the poison sky itself",
    hardship: "A breach in the dome meant death, so whoever maintained the domes held the true power"
  },
  {
    id: "volcanic",
    label: "Volcanic / High-Tectonic",
    core: 0.5,
    rim: 2,
    flavor: [
      "Rivers of lava and ash-choked skies; the crust is young, restless, and staggeringly rich in heavy metals.",
      "Quake-rated cities ride on shock-mounted foundations between active calderas.",
      "Tectonic forges tap the planet's heat directly, powering foundries that never cool."
    ],
    settle: "Miners and foundry crews came for the heavy metals spilling from its crust",
    hardship: "The ground itself was an enemy, and whole towns were lost to eruption"
  },
  {
    id: "hothouse-jungle",
    label: "Hothouse Jungle",
    core: 1,
    rim: 3,
    flavor: [
      "Steaming rainforest smothers the continents, home to a riotous native ecology that resists every attempt at clearing.",
      "Humidity rots equipment and fungus colonizes everything; settlements are fortified clearings in green chaos.",
      "Towering canopy-cities rise above a jungle floor few dare to walk."
    ],
    settle: "Bioprospectors arrived chasing the pharmaceuticals hidden in its native life",
    hardship: "The jungle reclaimed anything left untended, including the people"
  },
  {
    id: "ecumenopolis",
    label: "Ecumenopolis",
    core: 3,
    rim: 0.2,
    flavor: [
      "A single continuous city covers the land, layered kilometres deep; the original surface has not seen daylight in centuries.",
      "Spires, arcologies, and undercity warrens house billions; food arrives by orbital freight from agri-worlds.",
      "The planet is a monument to density, a node of administration and commerce on the blink-gate network."
    ],
    settle: "Its first settlements grew until they merged into one endless city",
    hardship: "Feeding and governing billions has always required strong, sometimes ruthless, administration"
  },
  {
    id: "airless-rock",
    label: "Airless Moon / Asteroid Warren",
    core: 1,
    rim: 3,
    flavor: [
      "A cratered, airless body honeycombed with tunnels; the population lives entirely underground.",
      "Mining shafts and pressurized warrens spiral down through the rock, lit by fusion lamps.",
      "Low gravity and hard vacuum shape everything here, from architecture to manners."
    ],
    settle: "Mining crews bored into its rock and never came back out",
    hardship: "The mines made fortunes for distant owners long before they fed the people who dug them"
  }
];

export const DIALECTS = [
  {
    id: "union-standard",
    label: "Union Standard (Cradle-clipped)",
    core: 6,
    rim: 1.5,
    factionMods: { union: 3, default: 0.6 },
    description: "Precise, administrative Union Standard with a clipped Cradle cadence; bureaucratic idioms pepper everyday speech."
  },
  {
    id: "omninet-creole",
    label: "Omninet Creole",
    core: 3,
    rim: 2,
    description: "A fast, borrowing creole shaped by omninet media and lag-delayed messaging; loanwords from a dozen worlds, abbreviations spoken aloud."
  },
  {
    id: "spacer-cant",
    label: "Spacer Cant",
    core: 1.5,
    rim: 2.5,
    factionMods: { ipsn: 4 },
    envMods: { "orbital-habitat": 2, "airless-rock": 1.5 },
    description: "Dockside trade cant of freighter crews and blink-gate haulers: nautical slang, cargo codes, and hand-signal habits carried into speech."
  },
  {
    id: "karrakin-court",
    label: "Karrakin Court Register",
    core: 0.5,
    rim: 1,
    factionMods: { karrakin: 6, default: 0.2 },
    description: "Ornate, formal Baronic speech thick with honorifics, oath-formulae, and careful attention to rank; who speaks first matters."
  },
  {
    id: "baronic-vernacular",
    label: "Baronic Vernacular",
    core: 0.3,
    rim: 1.5,
    factionMods: { karrakin: 6, default: 0.2 },
    description: "The commoners' Karrakin: earthy, guild-inflected, and full of sly double meanings used to mock the nobility within earshot."
  },
  {
    id: "armory-standard",
    label: "Armory Parade Standard",
    core: 0.5,
    rim: 1,
    factionMods: { harrison: 6, default: 0.2 },
    description: "Crisp, martial Standard taught in Armory schools: declarative, hierarchical, and laced with ordnance terminology and loyalty phrases."
  },
  {
    id: "corpro-polish",
    label: "Corpro Boardroom Polish",
    core: 2,
    rim: 1,
    factionMods: { ssc: 5, ipsn: 1.5, gms: 1.5, default: 0.5 },
    description: "Smooth, brand-conscious speech of corpro charter cities; status is signalled through euphemism and perfectly modulated tone."
  },
  {
    id: "gms-shopfloor",
    label: "GMS Shop-Floor Technical",
    core: 1,
    rim: 1,
    factionMods: { gms: 5, default: 0.5 },
    description: "Practical, acronym-heavy speech of factory and maintenance crews; part numbers double as slang, and everything has a spec."
  },
  {
    id: "aunic-liturgical",
    label: "Aunic Liturgical Inflection",
    core: 0,
    rim: 0.5,
    factionMods: { aun: 10, default: 0.05 },
    description: "Speech shaped by Ascendancy liturgy: cadenced, reverent, with devotional phrases woven into greetings and oaths."
  },
  {
    id: "long-rim-drawl",
    label: "Long Rim Drawl",
    core: 0.1,
    rim: 3,
    factionMods: { independent: 2.5, union: 0.5 },
    description: "Slow, laconic frontier speech of distant colonies; few words, dry humour, and a deep suspicion of anyone who talks too fast."
  },
  {
    id: "ark-archaic",
    label: "Ark-Archaic",
    core: 0.5,
    rim: 1.5,
    eraMods: { sublight: 6, reclaimed: 3 },
    description: "Descendants of sublight arks preserve a centuries-old dialect, drifting from modern Standard; Union visitors find it quaint, then incomprehensible."
  },
  {
    id: "frontier-polyglot",
    label: "Frontier Polyglot",
    core: 0.5,
    rim: 2.5,
    factionMods: { independent: 2 },
    description: "A patchwork of the languages every wave of settlers brought; most locals switch between three tongues mid-sentence."
  },
  {
    id: "hab-clipped",
    label: "Hab Pressure-Clipped",
    core: 0.3,
    rim: 0.3,
    envMods: { "orbital-habitat": 12, "airless-rock": 6, "corrosive-atmosphere": 4 },
    description: "Terse, efficient speech evolved for comm-channels and suit radios; safety callouts and pressure jargon are everyday words."
  }
];

export const POLITICAL_CLIMATES = [
  {
    id: "stable-union",
    label: "Stable Union Administration",
    core: 8,
    rim: 1,
    factionMods: { union: 4, default: 0.02 },
    description: "UAD administrators keep the lights on and the manna flowing; local councils debate in the open and disputes go to arbitration rather than arms.",
    lore: [
      "Today {name} is governed by a mature Union administration. Elected councils handle local matters while UAD envoys coordinate trade, aid, and blink-gate scheduling with the wider Union.",
      "Under the Third Committee, {name} has become a model of civic Union life: open assemblies, generous public provision, and a quiet pride in having outgrown the hardships of its past."
    ]
  },
  {
    id: "union-oversight",
    label: "Union Mandate Oversight",
    core: 1,
    rim: 3,
    factionMods: { union: 3, default: 0.1 },
    description: "A frontier world under Union mandate: DoJ/HR observers and UAD liaisons guide a local government still learning Union norms, not always willingly.",
    lore: [
      "{name} sits under Union mandate. UAD liaisons and DoJ/HR observers work alongside a local government that welcomes Union aid but bristles at Union oversight.",
      "Union integration on {name} is a work in progress: new schools, clinics, and printers arrive with every convoy, and so do officials asking uncomfortable questions about how things were done before."
    ]
  },
  {
    id: "contested-succession",
    label: "Contested Succession",
    core: 0.5,
    rim: 2,
    factionMods: { karrakin: 4, aun: 3, independent: 1.5, union: 0.2 },
    description: "The last ruler is dead or deposed and several claimants have legitimate-sounding cases; factions are arming while diplomats stall.",
    lore: [
      "The death of {name}'s last ruler left no clear heir. Rival claimants now court allies, mercenaries, and offworld patrons, and every ceremony has become a show of strength.",
      "A succession crisis grips {name}. Two lines of inheritance, each with its own documents and loyal regiments, refuse to yield, and the population waits to learn which side will blink first."
    ]
  },
  {
    id: "corpro-charter",
    label: "Corpro Charter Governance",
    core: 2,
    rim: 2,
    factionMods: { ipsn: 5, ssc: 5, gms: 5, harrison: 1.5, union: 0.6, karrakin: 0.1, aun: 0.05 },
    description: "The world is run under a corporate charter: the board is the government, citizenship is employment, and the shareholders live offworld.",
    lore: [
      "{name} is administered under a corpro charter. The local executive board sets law, wages, and policing, answerable to shareholders many systems away and only loosely to the Union.",
      "Charter law rules {name}: workers hold contracts rather than citizenship, and the corpro's quarterly reports matter more than any election. Union inspectors visit, take notes, and leave."
    ]
  },
  {
    id: "baronic-feudal",
    label: "Baronic Feudal Tension",
    core: 0.1,
    rim: 2,
    factionMods: { karrakin: 8, default: 0.03 },
    description: "A Baron rules by right and oath, but lesser houses, guilds, and restless commoners each push against the old order.",
    lore: [
      "{name} is held by a Baronic house whose authority rests on oath and ancestry. Lesser houses jockey for favour, the merchant guilds grow rich and impatient, and the commoners whisper about Union liberties.",
      "Feudal obligations bind every family on {name} to a liege. The ruling Baron's court is a theatre of alliances and slights, and a single broken oath could set the lesser houses against one another."
    ]
  },
  {
    id: "revolutionary-unrest",
    label: "Revolutionary Unrest",
    core: 0.8,
    rim: 3,
    factionMods: { karrakin: 1.5, harrison: 1.5, ipsn: 1.2, ssc: 1.2, union: 0.5 },
    description: "Strikes, sabotage, and street militias challenge the ruling power; the revolution has popular support but no single leader.",
    lore: [
      "Revolution simmers on {name}. Worker councils, student cells, and veterans' militias demand an end to the current order, and the authorities answer with curfews and arrests that only feed the fire.",
      "Unrest has become the norm on {name}: barricades rise and fall, broadcasts are hijacked nightly, and the ruling power controls the capital but not the hinterlands."
    ]
  },
  {
    id: "armory-annexation",
    label: "Armory Annexation Protectorate",
    core: 0.3,
    rim: 2,
    factionMods: { harrison: 8, default: 0.02 },
    description: "Annexed into Harrison Armory's Purview; order is enforced, production quotas are met, and dissent is treated as treason.",
    lore: [
      "{name} was annexed into Harrison Armory's Purview and remade in the Armory's image: disciplined schools, productive foundries, and a garrison that never lets the population forget who protects them.",
      "As an Armory protectorate, {name} enjoys security and prosperity on the Armory's terms. Loyalty is rewarded generously; those who remember independence too fondly are watched closely."
    ]
  },
  {
    id: "ascendant-theocracy",
    label: "Ascendant Theocracy",
    core: 0,
    rim: 1,
    factionMods: { aun: 10, default: 0.03 },
    description: "Temporal and spiritual authority are one; the clergy and noble lineages of the Ascendancy rule by sacred right.",
    lore: [
      "{name} is governed by Ascendancy law, in which faith and rulership are inseparable. Temple hierarchies keep the calendar, judge disputes, and anoint the world's governors.",
      "Under the Ascendancy, {name} is ordered by ritual and lineage. Outsiders find its courts unreadable, but its people speak of a peace older than the Union itself."
    ]
  },
  {
    id: "technocratic-council",
    label: "Technocratic Council",
    core: 1,
    rim: 2,
    factionMods: { independent: 3, union: 1.5, gms: 1.5 },
    description: "Engineers, planners, and system administrators hold power because they keep the world running; politics is a matter of maintenance schedules.",
    lore: [
      "A technocratic council governs {name}, its seats held by the engineers and planners who keep the world's infrastructure alive. Their legitimacy is simple: the air is clean and the water runs.",
      "On {name}, political office is earned through competence certificates. The council is efficient and incorruptible by its own reckoning, and deeply resented by those it has deemed unqualified."
    ]
  },
  {
    id: "martial-law",
    label: "Martial Law",
    core: 0.5,
    rim: 2,
    factionMods: { harrison: 2, independent: 1.5, union: 0.4 },
    description: "A recent crisis put the military in charge 'temporarily'; that was years ago, and the officers show no sign of stepping down.",
    lore: [
      "{name} has lived under martial law since a crisis no one in the government will discuss openly. Checkpoints guard the cities, and the military council promises elections 'once stability returns'.",
      "Soldiers run {name}'s courts, ports, and broadcasts. The emergency that justified their rule has faded from memory, but the emergency powers have not."
    ]
  },
  {
    id: "armed-neutrality",
    label: "Armed Neutrality",
    core: 0.3,
    rim: 2,
    factionMods: { independent: 4, default: 0.1 },
    description: "Fiercely independent and well armed, the world plays the great powers against each other and trusts none of them.",
    lore: [
      "{name} guards its independence jealously. Its government signs no exclusive treaties, buys arms from everyone, and lets every great power believe it might someday become an ally.",
      "Neutral by policy and armed by necessity, {name} is a crossroads where Union envoys, corpro buyers, and Baronic agents drink in the same bars and watch each other."
    ]
  },
  {
    id: "post-conflict-reconstruction",
    label: "Post-Conflict Reconstruction",
    core: 1,
    rim: 2,
    description: "The war is over, the scars are not; rebuilding efforts, refugee returns, and unresolved grievances define daily life.",
    lore: [
      "{name} is rebuilding after a bitter conflict. Reconstruction crews clear rubble while tribunals hear testimony, and old enemies are expected to share the same council chamber.",
      "The war on {name} ended in an uneasy settlement. Relief convoys still arrive, the wreckage of frames still litters the old front, and every faction remembers who fired first."
    ]
  }
];

export const MILITARY_TIERS = [
  {
    id: "militia",
    phrase: "a part-time planetary militia",
    label: "Planetary Militia",
    core: 1,
    rim: 5,
    factionMods: { independent: 3, union: 0.6, harrison: 0.3 },
    description: "Defense rests on part-time citizen soldiers and a handful of aging frames; enough to deter raiders, not an invasion."
  },
  {
    id: "garrisoned",
    phrase: "a professional standing garrison",
    label: "Garrisoned",
    core: 4,
    rim: 3,
    description: "A standing garrison with professional pilots, orbital pickets, and hardened depots holds the world securely."
  },
  {
    id: "fortress",
    phrase: "the layered batteries and bunkers of a fortress world",
    label: "Fortress World",
    core: 2,
    rim: 1,
    factionMods: { harrison: 3, karrakin: 1.5, independent: 0.3 },
    description: "Layered planetary defenses, deep bunkers, orbital gun platforms, and multiple lancer battalions make assault ruinously expensive."
  },
  {
    id: "shipyard",
    phrase: "the fleets that crowd its orbital shipyards",
    label: "Shipyard Hub",
    core: 3,
    rim: 0.6,
    factionMods: { ipsn: 3, gms: 2, union: 1.5, harrison: 1.5, independent: 0.2 },
    envMods: { "orbital-habitat": 3, "airless-rock": 1.5 },
    description: "Orbital drydocks and fabrication yards build and refit warships; the world is a strategic node defended by the fleets it services."
  }
];

export const FOUNDING_ERAS = [
  {
    id: "sublight",
    label: "Sublight Diaspora",
    core: 2,
    rim: 2,
    factionMods: { karrakin: 2, aun: 2 },
    description: "Settled by a slow sublight ark long before blink-gates, its founders cut off from Cradle for generations.",
    when: "by the crew of a sublight ark that left Cradle centuries before the blink-gates"
  },
  {
    id: "first-comm",
    label: "First Committee Expansion",
    core: 3,
    rim: 1.5,
    factionMods: { union: 1.5 },
    description: "Founded during the First Committee's early expansion out from Cradle.",
    when: "during the First Committee's expansion out from Cradle"
  },
  {
    id: "second-comm",
    label: "Second Committee Colonial Era",
    core: 3,
    rim: 3,
    factionMods: { harrison: 1.5 },
    description: "Colonized under the Second Committee, whose expansionist and often brutal policies still shape local memory.",
    when: "under the Second Committee's aggressive colonial programme"
  },
  {
    id: "third-comm",
    label: "Third Committee Era",
    core: 2,
    rim: 2,
    factionMods: { union: 1.5, ssc: 1.5, gms: 1.5 },
    description: "Settled under the Third Committee, with Union aid, printers, and a charter of rights from the first day.",
    when: "under the Third Committee, with Union aid and printers arriving on the first convoys"
  },
  {
    id: "recent-gate",
    label: "Recent Blink-Gate Settlement",
    core: 0.5,
    rim: 3,
    factionMods: { ipsn: 2, independent: 1.5 },
    description: "Opened to settlement only recently, after a new blink-gate connection brought it within reach.",
    when: "only a few generations ago, after a new blink-gate route brought it within reach"
  },
  {
    id: "reclaimed",
    label: "Reclaimed Lost Colony",
    core: 0.5,
    rim: 2,
    factionMods: { independent: 2 },
    description: "An old colony lost to contact for generations and only recently rediscovered.",
    when: "long ago by a colony that fell silent for generations before it was rediscovered"
  }
];

export const RELIGIONS = [
  {
    id: "secular",
    label: "None (secular Union civic culture)",
    core: 6,
    rim: 2,
    factionMods: { union: 2.5, karrakin: 0.3, aun: 0.05 },
    description: "No dominant faith; civic festivals, public service, and Union ideals of shared humanity fill the role religion plays elsewhere. Private belief is common and unremarkable."
  },
  {
    id: "ancestor-cult",
    label: "Ancestor Cult",
    core: 1,
    rim: 3,
    eraMods: { sublight: 3, reclaimed: 2 },
    description: "Families keep shrines to their founders and honoured dead; the names of the first settlers are recited at every major event."
  },
  {
    id: "baronic-faith",
    label: "Baronic-Aligned Faith",
    core: 0.2,
    rim: 1,
    factionMods: { karrakin: 8, default: 0.1 },
    description: "A state church that sanctifies the Baronic order: the ruling house's lineage is holy, and oaths sworn before its altars bind for life."
  },
  {
    id: "monastic-order",
    label: "Monastic Order",
    core: 1,
    rim: 2,
    description: "A contemplative order maintains remote monasteries that serve as archives, hospitals, and neutral ground in times of conflict."
  },
  {
    id: "aunic-devotion",
    label: "Aunic Devotion",
    core: 0,
    rim: 0.3,
    factionMods: { aun: 12, default: 0.02 },
    description: "The faith of the Ascendancy pervades daily life: devotional hours, pilgrimages, and reverence for sacred lineages."
  },
  {
    id: "cradle-syncretism",
    label: "Cradle Syncretism",
    core: 2,
    rim: 2,
    eraMods: { sublight: 2, "first-comm": 1.5 },
    description: "Fragments of many old Cradle faiths, carried out into the Diaspora and blended together until their origins are hard to trace."
  },
  {
    id: "blink-mysticism",
    label: "Blinkspace Mysticism",
    core: 0.5,
    rim: 2,
    factionMods: { ipsn: 2 },
    description: "Spacers and gate-crews venerate the unknowable void of blinkspace; rituals before every jump, and tales of those who came back changed."
  },
  {
    id: "corporate-liturgy",
    label: "Corporate Civic Liturgy",
    core: 1,
    rim: 1,
    factionMods: { ssc: 4, ipsn: 2, gms: 2, harrison: 2, default: 0.2 },
    description: "Founder-days, loyalty vows, and company saints: the corpro's mythology has quietly become the world's religion."
  },
  {
    id: "machine-reverence",
    label: "Machine Reverence",
    core: 0.5,
    rim: 1,
    envMods: { "corrosive-atmosphere": 2, "orbital-habitat": 2, "garden-world": 1.5 },
    description: "Reverence for the life-support machines, terraformers, and (whispered) NHPs that keep the world alive; maintenance is a sacred duty."
  }
];

export const NAME_PARTS = {
  starts: ["Ash", "Bel", "Cal", "Dor", "Eri", "Hal", "Ira", "Kel", "Lun", "Mar", "Nov", "Ory", "Pel", "Qir", "Ras", "Sel", "Tav", "Ul", "Ves", "Zar", "Aph", "Bry", "Cor", "Dra", "Eph", "Gal", "Hel", "Jor", "Kas", "Lyr", "Mor", "Nyx", "Os", "Per", "Sar", "Thal", "Var", "Wen", "Yss", "Zeph"],
  middles: ["a", "e", "i", "o", "u", "an", "en", "ar", "or", "il", "ae", "ath", "ev", "on", "ir", ""],
  ends: ["dor", "is", "on", "ara", "ix", "um", "eth", "os", "ia", "ane", "ul", "ek", "ar", "ion", "ys", "ade", "ent", "ova", "eus", "ith"],
  designations: ["", "", "", "", " Prime", " II", " III", " IV", " V", " VI", " Minor", " Major", "'s Reach", " Station", " Landing"]
};

export const LORE_HOOKS = [
  "Rumours speak of a sealed vault beneath the old capital that predates the first settlers.",
  "A blink-gate maintenance crew recently reported anomalous readings near the system's gate, and the report was quietly classified.",
  "An offworld power has begun buying land, ships, and loyalties here, and no one is sure who is behind the shell companies.",
  "Refugees from a neighbouring system have arrived in numbers the authorities cannot or will not house.",
  "A long-dormant frame of unknown pattern was dug out of a landslide, and three factions now claim it.",
  "A beloved local hero has vanished on the eve of a vote that could change the world's allegiance.",
  "Pirates operating out of the outer system have grown bold enough to raid orbital traffic.",
  "Union surveyors have requested access to a restricted region, and the local government keeps finding reasons to delay.",
  "A strike at the main spaceport has stranded hundreds of ships and tempers are fraying.",
  "Old war-machines buried in the hinterlands are waking up, and nobody admits to sending the activation code.",
  "A charismatic preacher is drawing crowds and the ruling power cannot decide whether to court or crush the movement.",
  "A shipment of military printer licences has gone missing somewhere between the gate and the surface."
];

export const SECTION_IDS = ["name", "environment", "dialect", "politicalClimate", "foundingEra", "military", "religion", "lore"];
