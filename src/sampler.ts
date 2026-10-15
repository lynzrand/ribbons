import { distance, fromHex, inGamut, toHex, toLch, type Lab } from "./color.ts";

type Random = () => number;
export interface RibbonOptions {
  lab: Lab;
  count: number;
  widthAlpha: number;
  rangeRadius: number;
  seed: string;
  /** null selects a probability from the actual primary's lightness. */
  shellChance: number | null;
}
export type SamplingStep =
  | { sampler: "shell"; parent: number }
  | {
      sampler: "conditional";
      eligible: number;
      remaining: number;
      threshold: number;
    };
export interface Ribbon {
  colors: string[];
  widths: number[];
  primary: string;
  primaryIndex: number;
  generatedColors: string[];
  seed: string;
  options: RibbonOptions;
  profile: {
    shellChance: number;
    radius: number;
    band: number;
    steps: SamplingStep[];
  };
}
interface Candidate {
  lab: Lab;
  displayed: Lab;
  color: string;
}
const minimumDistance = 0.045;
const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));

/** FNV-1a seed hashing followed by the baseline's Mulberry32 stream. */
export function seededRandom(seed: string): Random {
  let state = 2166136261;
  for (const character of seed)
    state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

let candidateGrid: Candidate[] | undefined;
function candidates(): Candidate[] {
  if (candidateGrid) return candidateGrid;
  candidateGrid = [];
  for (let lightness = 1; lightness < 40; lightness++) {
    for (let greenRed = -16; greenRed <= 16; greenRed++) {
      for (let blueYellow = -16; blueYellow <= 16; blueYellow++) {
        const lab = { l: lightness / 40, a: greenRed / 40, b: blueYellow / 40 };
        if (!inGamut(lab)) continue;
        const color = toHex(lab);
        candidateGrid.push({ lab, color, displayed: fromHex(color) });
      }
    }
  }
  return candidateGrid;
}

export function lightnessShellChance(lightness: number): number {
  const position = clamp((Math.abs(lightness - 0.5) - 0.1) / 0.3, 0, 1);
  return 0.2 + 0.5 * position ** 2 * (3 - 2 * position);
}

function pairPreference(first: Lab, second: Lab): number {
  const a = toLch(first);
  const b = toLch(second);
  const reliability =
    (a.c * b.c) / Math.sqrt((a.c ** 2 + 0.025 ** 2) * (b.c ** 2 + 0.025 ** 2));
  const affiliation = (1 + reliability * Math.cos(a.h - b.h)) / 2;
  return 0.55 * affiliation + 0.45 * Math.min(1, Math.abs(a.l - b.l) / 0.5);
}

function conditionalColor(
  selected: Lab[],
  random: Random,
): { next: Candidate; step: SamplingStep } {
  const scored = candidates().flatMap((candidate) => {
    const displayedDistance = Math.min(
      ...selected.map((color) => distance(candidate.displayed, color)),
    );
    const gridDistance = Math.min(
      ...selected.map((color) => distance(candidate.lab, color)),
    );
    if (displayedDistance < minimumDistance || gridDistance < minimumDistance)
      return [];
    const preference = Math.min(
      ...selected.map((color) => pairPreference(candidate.lab, color)),
    );
    return [
      {
        candidate,
        score: 0.15 * Math.min(1, gridDistance / 0.35) + 0.85 * preference,
      },
    ];
  });
  if (!scored.length) throw new Error("No conditional colors remain.");
  const mean =
    scored.reduce((sum, item) => sum + item.score, 0) / scored.length;
  const variance =
    scored.reduce((sum, item) => sum + item.score ** 2, 0) / scored.length -
    mean ** 2;
  const threshold =
    Math.max(...scored.map((item) => item.score)) -
    0.75 * Math.sqrt(Math.max(0, variance));
  const eligible = scored.filter((item) => item.score >= threshold);
  return {
    next: eligible[Math.floor(random() * eligible.length)]!.candidate,
    step: {
      sampler: "conditional",
      eligible: eligible.length,
      remaining: scored.length,
      threshold,
    },
  };
}

function shellColor(
  selected: Lab[],
  radius: number,
  band: number,
  random: Random,
): { next: Candidate; step: SamplingStep } {
  const parent = Math.floor(random() * selected.length);
  const center = selected[parent]!;
  const chroma = toLch(center).c;
  // Densities are relative to the uniform OKLab grid. Exclusion uses displayed colors.
  const logDensities = candidates().map((candidate) => {
    let density =
      -0.5 * ((distance(candidate.lab, center) - radius) / band) ** 2 -
      0.5 * ((toLch(candidate.lab).c - chroma) / (0.03 + 0.3 * chroma)) ** 2;
    for (const color of selected) {
      const separation = distance(candidate.displayed, color);
      if (separation < minimumDistance) return -Infinity;
      density += Math.log(-Math.expm1(-0.5 * (separation / 0.075) ** 2));
    }
    return density;
  });
  const maximum = Math.max(...logDensities);
  if (!Number.isFinite(maximum)) throw new Error("No shell colors remain.");
  const weights = logDensities.map((density) => Math.exp(density - maximum));
  let remaining = random() * weights.reduce((sum, weight) => sum + weight, 0);
  let index = weights.length - 1;
  for (let i = 0; i < weights.length; i++) {
    remaining -= weights[i]!;
    if (remaining < 0) {
      index = i;
      break;
    }
  }
  return { next: candidates()[index]!, step: { sampler: "shell", parent } };
}

/** Rejection sample the truncated Dirichlet: every segment stays in [5%, 70%]. */
function sampleWidths(count: number, alpha: number, random: Random): number[] {
  const minimum = 0.05;
  const maximum = 0.7;
  const vertex = Array<number>(count).fill(minimum);
  let remaining = 1 - count * minimum;
  for (let index = 0; index < count && remaining > 0; index++) {
    const extra = Math.min(maximum - minimum, remaining);
    vertex[index]! += extra;
    remaining -= extra;
  }
  const logBound =
    alpha >= 1
      ? (alpha - 1) * count * Math.log(1 / count)
      : (alpha - 1) * vertex.reduce((sum, width) => sum + Math.log(width), 0);
  for (let attempt = 0; attempt < 100000; attempt++) {
    const exponential = Array.from(
      { length: count },
      () => -Math.log(Math.max(random(), 1e-12)),
    );
    const total = exponential.reduce((sum, value) => sum + value, 0);
    const widths = exponential.map(
      (value) => minimum + ((1 - count * minimum) * value) / total,
    );
    if (widths.some((width) => width > maximum)) continue;
    const logDensity =
      (alpha - 1) * widths.reduce((sum, width) => sum + Math.log(width), 0);
    if (Math.log(Math.max(random(), 1e-12)) <= logDensity - logBound)
      return widths;
  }
  throw new Error("Width sampling exhausted. Try a less extreme width shape.");
}

function samplePrimary(center: Lab, radius: number, random: Random): string {
  if (radius === 0) return toHex(center);
  for (let attempt = 0; attempt < 4000; attempt++) {
    const z = 2 * random() - 1;
    const angle = random() * 2 * Math.PI;
    const length = Math.cbrt(random()) * radius;
    const planar = Math.sqrt(1 - z * z);
    const point = {
      l: center.l + z * length,
      a: center.a + Math.cos(angle) * planar * length,
      b: center.b + Math.sin(angle) * planar * length,
    };
    if (point.l >= 0 && point.l <= 1 && inGamut(point)) return toHex(point);
  }
  throw new Error(
    "No displayable primary found. Move the center into gamut or increase the range.",
  );
}

/** Reproducible v0.16 sampling, rewritten in TypeScript; no semantic text mapping. */
export function generateRibbon(options: RibbonOptions): Ribbon {
  const { lab, count, widthAlpha, rangeRadius, shellChance } = options;
  if (![lab.l, lab.a, lab.b].every(Number.isFinite) || lab.l < 0 || lab.l > 1)
    throw new Error("Invalid OKLab coordinates.");
  if (!Number.isInteger(count) || count < 2 || count > 7)
    throw new Error("Choose 2–7 colors.");
  if (!Number.isFinite(widthAlpha) || widthAlpha <= 0)
    throw new Error("Width shape must be positive.");
  if (!Number.isFinite(rangeRadius) || rangeRadius < 0)
    throw new Error("Range must be nonnegative.");
  if (
    shellChance !== null &&
    (!Number.isFinite(shellChance) || shellChance < 0 || shellChance > 1)
  )
    throw new Error("Shell chance must be between 0 and 1.");
  const seed = options.seed.trim() || crypto.randomUUID();
  const random = seededRandom(seed);
  const widths = sampleWidths(count, widthAlpha, random);
  const primary = samplePrimary(lab, rangeRadius, random);
  const chance = shellChance ?? lightnessShellChance(fromHex(primary).l);
  const generatedColors = [primary];
  const selected = [fromHex(primary)];
  const steps: SamplingStep[] = [];
  const radius = 0.13 + 0.13 * random();
  const band = 0.025 + 0.025 * random();
  for (let index = 1; index < count; index++) {
    const result =
      random() < chance
        ? shellColor(selected, radius, band, random)
        : conditionalColor(selected, random);
    generatedColors.push(result.next.color);
    selected.push(result.next.displayed);
    steps.push(result.step);
  }
  // The primary favors wider segments. Generation-order diagnostics stay untouched.
  let placement = random() * widths.reduce((sum, width) => sum + width ** 2, 0);
  let primaryIndex = count - 1;
  for (let index = 0; index < count; index++) {
    placement -= widths[index]! ** 2;
    if (placement < 0) {
      primaryIndex = index;
      break;
    }
  }
  const colors = [...generatedColors];
  [colors[0], colors[primaryIndex]] = [colors[primaryIndex]!, colors[0]!];
  return {
    colors,
    widths,
    primary,
    primaryIndex,
    generatedColors,
    seed,
    options: { ...options, lab: { ...lab }, seed },
    profile: { shellChance: chance, radius, band, steps },
  };
}
