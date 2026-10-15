/** Structural terms isolated by the ablation runner; the normal sampler enables all. */
export interface SamplingFeatures {
  lightnessBalance: boolean;
  lightnessPrior: boolean;
  pastelSeparation: boolean;
}

export const fullModel: Readonly<SamplingFeatures> = {
  lightnessBalance: true,
  lightnessPrior: true,
  pastelSeparation: true,
};
