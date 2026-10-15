import { sampleRibbon, type RibbonOptions } from "./sampler.ts";
import { fullModel, type SamplingFeatures } from "./sampling-features.ts";

interface Variant {
  id: string;
  label: string;
  features?: Partial<SamplingFeatures>;
  options?: Partial<
    Pick<RibbonOptions, "chromaAffinity" | "primaryAffinity" | "shellChance">
  >;
}

/** Remove one contribution at a time. Branch-only variants change later RNG paths. */
export const ablationVariants: readonly Variant[] = [
  { id: "full", label: "Full model" },
  {
    id: "no-balance",
    label: "No L balance",
    features: { lightnessBalance: false },
  },
  {
    id: "no-lightness-prior",
    label: "No L prior",
    features: { lightnessPrior: false },
  },
  {
    id: "no-pastel-separation",
    label: "No pastel term",
    features: { pastelSeparation: false },
  },
  {
    id: "no-chroma-affinity",
    label: "No chroma affinity",
    options: { chromaAffinity: 0 },
  },
  {
    id: "no-primary-affinity",
    label: "No primary affinity",
    options: { primaryAffinity: 0 },
  },
  {
    id: "conditional-only",
    label: "Conditional only",
    options: { shellChance: 0 },
  },
  { id: "shell-only", label: "Shell only", options: { shellChance: 1 } },
];

/** Research entry point, deliberately separate from the production package API. */
export function generateAblation(options: RibbonOptions, id: string) {
  const variant = ablationVariants.find((candidate) => candidate.id === id);
  if (!variant) throw new Error(`Unknown ablation: ${id}`);
  return sampleRibbon(
    { ...options, ...variant.options },
    { ...fullModel, ...variant.features },
  );
}
