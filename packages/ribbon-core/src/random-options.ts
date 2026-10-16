import { inGamut, type Lab } from "./color.ts";
import { seededRandom } from "./random.ts";
import type { RibbonOptions } from "./sampler.ts";

/** Derive a four-color identity's options from a seed using the v1 mapping.
 * Blank seeds get a reusable UUID, matching generateRibbon's seed convention.
 * Reproducibility also requires the same palette sampler version.
 */
export function randomRibbonOptions(seed: string): RibbonOptions {
  seed = seed.trim() || crypto.randomUUID();
  const primary = seededRandom(`ribbons/v1/primary/${seed}`);
  const style = seededRandom(`ribbons/v1/style/${seed}`);
  let lab: Lab;
  // Rejection conditions the proposed OKLCH distribution on the sRGB gamut.
  do {
    const l = 0.4 + 0.45 * primary();
    const c = 0.04 + 0.14 * primary();
    const h = 2 * Math.PI * primary();
    lab = { l, a: c * Math.cos(h), b: c * Math.sin(h) };
  } while (!inGamut(lab));

  return {
    lab,
    count: 4,
    widthAlpha: 0.6,
    rangeRadius: 0,
    seed,
    shellChance: null,
    // Averaging two uniforms favors moderate contrast over the extremes.
    contrast: 0.15 + 0.6 * ((style() + style()) / 2),
    chromaAffinity: 0.6 + 0.4 * Math.sqrt(style()),
    primaryAffinity: 0.25 + 0.6 * style(),
  };
}
