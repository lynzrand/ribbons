import type { RibbonOptions } from "./sampler.ts";

/** The playground's 20% contrast preset, also used as the ablation baseline. */
export const softPreset: Readonly<RibbonOptions> = {
  lab: { l: 0.6, a: -0.07, b: -0.02 },
  count: 4,
  widthAlpha: 0.6,
  rangeRadius: 0.005,
  seed: "",
  shellChance: null,
  contrast: 0.2,
  chromaAffinity: 0.75,
  primaryAffinity: 0.45,
};
