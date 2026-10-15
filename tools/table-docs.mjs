// Prints the generator tables as Markdown (pasted into README.md between the TABLES markers).
import { DIALECTS, ENVIRONMENTS, FOUNDING_ERAS, MILITARY_TIERS, POLITICAL_CLIMATES, RELIGIONS } from "../scripts/tables.mjs";
import { CONTROLLING_FACTIONS } from "../scripts/planet-generator.mjs";

const mods = (e) =>
  [["faction", e.factionMods], ["environment", e.envMods], ["era", e.eraMods]]
    .filter(([, m]) => m)
    .map(([k, m]) => `${k}: ` + Object.entries(m).map(([id, v]) => `${id} x${v}`).join(", "))
    .join("; ") || "-";
const esc = (t) => String(t).replaceAll("|", "\\|");

function table(title, entries, desc = (e) => e.description) {
  const lines = [`### ${title}`, "", "| Entry | Core weight | Non-Core weight | Modifiers | Description |", "| --- | --- | --- | --- | --- |"];
  for (const e of entries) lines.push(`| ${esc(e.label ?? e.name)} | ${e.core} | ${e.rim} | ${esc(mods(e))} | ${esc(desc(e))} |`);
  return lines.join("\n");
}

console.log(
  [
    table("Controlling faction", CONTROLLING_FACTIONS),
    table("Average environment", ENVIRONMENTS, (e) => e.flavor[0]),
    table("Founding era", FOUNDING_ERAS),
    table("Political climate", POLITICAL_CLIMATES),
    table("Military power tier", MILITARY_TIERS),
    table("Accent / dialect", DIALECTS),
    table("Religion", RELIGIONS)
  ].join("\n\n")
);
