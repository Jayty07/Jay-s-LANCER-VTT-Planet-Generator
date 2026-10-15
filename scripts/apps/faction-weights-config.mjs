import { MODULE_ID, TEMPLATES } from "../constants.mjs";
import { CONTROLLING_FACTIONS } from "../planet-generator.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class FactionWeightsConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-faction-weights`,
    classes: [MODULE_ID, "lpg-faction-weights-app"],
    tag: "form",
    window: { title: "LPG.FactionWeights.Title", icon: "fa-solid fa-scale-balanced" },
    position: { width: 480 },
    form: { handler: FactionWeightsConfig.#onSubmit, closeOnSubmit: true },
    actions: { reset: FactionWeightsConfig.#onReset }
  };

  static PARTS = { main: { template: TEMPLATES.factionWeights } };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const saved = game.settings.get(MODULE_ID, "factionWeights") ?? {};
    context.factions = CONTROLLING_FACTIONS.map((f) => ({
      id: f.id,
      name: f.name,
      color: f.color,
      enabled: saved[f.id]?.enabled ?? true,
      weight: saved[f.id]?.weight ?? 1
    }));
    return context;
  }

  static async #onSubmit(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    const weights = {};
    for (const f of CONTROLLING_FACTIONS) {
      const row = data[f.id] ?? {};
      const weight = Number(row.weight);
      weights[f.id] = { enabled: !!row.enabled, weight: Number.isFinite(weight) ? Math.max(0, weight) : 1 };
    }
    await game.settings.set(MODULE_ID, "factionWeights", weights);
  }

  static async #onReset() {
    await game.settings.set(MODULE_ID, "factionWeights", {});
    this.render();
  }
}
