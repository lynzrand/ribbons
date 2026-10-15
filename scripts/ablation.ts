import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "node:util";
import {
  distance,
  fromHex,
  generateRibbon,
  softPreset,
  toLch,
  type Ribbon,
} from "@ribbons/core";
import { ablationVariants, generateAblation } from "@ribbons/core/experiments";

const { values } = parseArgs({
  options: {
    seeds: { type: "string", default: "8" },
    count: { type: "string", default: String(softPreset.count) },
    out: {
      type: "string",
      default: join(tmpdir(), "ribbons-ablation", "ablation"),
    },
  },
});
const seeds = Number(values.seeds);
const count = Number(values.count);
if (!Number.isInteger(seeds) || seeds < 1)
  throw new Error("seeds must be a positive integer");
if (!Number.isInteger(count) || count < 2 || count > 7)
  throw new Error("count must be 2–7");
const anchors = [
  ["Teal", "#548c84"],
  ["Sky blue", "#59aff6"],
  ["Pink", "#e9b7ce"],
  ["Mint", "#b9dfc9"],
  ["Cream", "#ebe4da"],
  ["Gray", "#888888"],
  ["Dull olive", "#7c806d"],
  ["Dark blue", "#202b37"],
] as const;

/** Diagnostics describe tradeoffs, not an aesthetic quality score. */
function metrics(ribbon: Ribbon) {
  const points = ribbon.generatedColors.map(fromHex);
  const colors = points.map(toLch);
  const companions = points.slice(1);
  let minimumDistance = Infinity;
  let pastelConflicts = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      minimumDistance = Math.min(
        minimumDistance,
        distance(points[i]!, points[j]!),
      );
      const a = colors[i]!;
      const b = colors[j]!;
      const angle = Math.acos(Math.max(-1, Math.min(1, Math.cos(a.h - b.h))));
      if (
        Math.min(a.l, b.l) > 0.7 &&
        Math.min(a.c, b.c) > 0.025 &&
        angle > Math.PI / 4 &&
        angle < (3 * Math.PI) / 4 &&
        Math.abs(a.l - b.l) < 0.04
      )
        pastelConflicts++;
    }
  }
  const primaryL = points[0]!.l;
  return {
    companionLightnessOffset:
      companions.reduce((sum, point) => sum + point.l - primaryL, 0) /
      companions.length,
    lighterFraction:
      companions.filter((point) => point.l > primaryL + 0.03).length /
      companions.length,
    maxChroma: Math.max(...colors.map((color) => color.c)),
    minPairDistance: minimumDistance,
    pastelConflicts,
  };
}

type Metrics = ReturnType<typeof metrics>;
const records: {
  anchor: string;
  variant: string;
  seed: string;
  colors: string[];
  metrics: Metrics;
}[] = [];
const rows: {
  anchor: string;
  variant: string;
  samples: number;
  mean: Metrics;
}[] = [];
const shown = Math.min(seeds, 4);
const rowHeight = 52 + shown * 28;
const width = 165 + ablationVariants.length * 160;
const height = 100 + anchors.length * rowHeight;
const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
  `<rect width="100%" height="100%" fill="#f6f5f0"/>`,
  `<g font-family="sans-serif" fill="#293b34">`,
  `<text x="20" y="30" font-size="20">Ablation · 20% contrast · ${count} segments · first ${shown} of ${seeds} seeds</text>`,
  `<text x="20" y="53" font-size="11">Paired inputs; strip widths and primary placement held fixed across columns.</text>`,
];
ablationVariants.forEach((variant, column) =>
  svg.push(
    `<text x="${165 + column * 160}" y="83" font-size="11">${variant.label}</text>`,
  ),
);
anchors.forEach(([name, color], row) => {
  const top = 110 + row * rowHeight;
  svg.push(`<rect x="20" y="${top}" width="14" height="14" fill="${color}"/>`);
  svg.push(`<text x="43" y="${top + 12}" font-size="12">${name}</text>`);
  const inputs = Array.from({ length: seeds }, (_, index) => ({
    ...softPreset,
    lab: fromHex(color),
    count,
    seed: `ablation-${index}`,
  }));
  const references = inputs.map(generateRibbon);
  ablationVariants.forEach((variant, column) => {
    const results = inputs.map((options) =>
      generateAblation(options, variant.id),
    );
    const measurements = results.map(metrics);
    const mean = Object.fromEntries(
      Object.keys(measurements[0]!).map((key) => {
        const metric = key as keyof Metrics;
        return [
          metric,
          measurements.reduce((sum, value) => sum + value[metric], 0) / seeds,
        ];
      }),
    ) as Metrics;
    rows.push({ anchor: name, variant: variant.id, samples: seeds, mean });
    results.forEach((ribbon, index) =>
      records.push({
        anchor: name,
        variant: variant.id,
        seed: ribbon.seed,
        colors: ribbon.generatedColors,
        metrics: measurements[index]!,
      }),
    );
    results.slice(0, shown).forEach((ribbon, index) => {
      // The branch-only variants consume RNG differently. Align presentation with
      // the full model so layout changes cannot masquerade as color improvements.
      const reference = references[index]!;
      const colors = [...ribbon.generatedColors];
      [colors[0], colors[reference.primaryIndex]] = [
        colors[reference.primaryIndex]!,
        colors[0]!,
      ];
      let x = 165 + column * 160;
      colors.forEach((segment, position) => {
        const segmentWidth = reference.widths[position]! * 145;
        svg.push(
          `<rect x="${x}" y="${top + index * 28}" width="${segmentWidth}" height="17" fill="${segment}"/>`,
        );
        x += segmentWidth;
      });
    });
  });
});
svg.push("</g></svg>");
mkdirSync(dirname(values.out), { recursive: true });
writeFileSync(`${values.out}.svg`, svg.join("\n"));
writeFileSync(
  `${values.out}.json`,
  JSON.stringify(
    {
      preset: softPreset,
      count,
      seeds,
      anchors,
      notes:
        "Branch-only variants follow different later RNG paths. Diagnostics are not aesthetic ratings; the SVG aligns widths and primary placement.",
      rows,
      records,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Wrote ${values.out}.{svg,json}: ${anchors.length} anchors × ${ablationVariants.length} variants × ${seeds} seeds.`,
);
