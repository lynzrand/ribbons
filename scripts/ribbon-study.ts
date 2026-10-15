/** Regenerate the visual study with `pnpm study`; no browser or image dependencies. */
import { mkdirSync, writeFileSync } from "node:fs";
import { fromHex } from "../src/color.ts";
import { generateRibbon } from "../src/sampler.ts";

const anchors = [
  // Approximate the blue in the supplied Asagi image, not an extracted color value.
  ["Asagi blue", "#60a6d2"],
  ["Pastel pink", "#e9b7ce"],
  ["Pastel mint", "#b9dfc9"],
  ["Cream", "#ebe4da"],
  ["Gray", "#888888"],
  ["Dull olive", "#7c806d"],
  ["Dark blue", "#202b37"],
  ["Teal", "#548c84"],
  ["Coral", "#d5684b"],
  ["Violet", "#7852ae"],
  ["Yellow", "#efd34f"],
] as const;
const knob = process.argv[2] ?? "contrast";
if (
  knob !== "contrast" &&
  knob !== "primaryAffinity" &&
  knob !== "chromaAffinity"
) {
  throw new Error("Choose contrast, primaryAffinity, or chromaAffinity.");
}
const label = {
  contrast: "Contrast",
  primaryAffinity: "Primary affinity",
  chromaAffinity: "Chroma affinity",
}[knob];
const values = knob === "contrast" ? [0.1, 0.5, 0.9] : [0, 0.5, 1];
const rowHeight = 146;
const height = 100 + anchors.length * rowHeight;
const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="1180" height="${height}" viewBox="0 0 1180 ${height}">`,
  `<rect width="1180" height="${height}" fill="#f6f5f0"/>`,
  `<g font-family="sans-serif" fill="#293b34">`,
  `<text x="24" y="32" font-size="20">${label} study · matching seeds and widths</text>`,
];

values.forEach((value, column) => {
  svg.push(
    `<text x="${190 + column * 320}" y="70" font-size="13">${label} ${Math.round(value * 100)}%</text>`,
  );
});

anchors.forEach(([name, color], row) => {
  const y = 100 + row * rowHeight;
  svg.push(`<rect x="24" y="${y}" width="16" height="16" fill="${color}"/>`);
  svg.push(`<text x="50" y="${y + 13}" font-size="13">${name}</text>`);
  svg.push(`<text x="24" y="${y + 38}" font-size="11">${color}</text>`);
  values.forEach((value, column) => {
    for (let seed = 0; seed < 4; seed++) {
      const ribbon = generateRibbon({
        lab: fromHex(color),
        count: 4,
        widthAlpha: 0.8,
        rangeRadius: 0,
        shellChance: null,
        contrast: 0.5,
        chromaAffinity: 1,
        primaryAffinity: 0.5,
        [knob]: value,
        seed: `visual-${seed}`,
      });
      let x = 190 + column * 320;
      const top = y + seed * 32;
      // Include a thin strip on a dark background to inspect small-scale use.
      svg.push(
        `<rect x="${x - 3}" y="${top + 19}" width="306" height="10" fill="#252a28"/>`,
      );
      ribbon.colors.forEach((segment, index) => {
        const width = ribbon.widths[index]! * 300;
        svg.push(
          `<rect x="${x}" y="${top}" width="${width}" height="15" fill="${segment}"/>`,
        );
        svg.push(
          `<rect x="${x}" y="${top + 22}" width="${width}" height="4" fill="${segment}"/>`,
        );
        x += width;
      });
    }
  });
});
svg.push("</g></svg>");
mkdirSync("artifacts", { recursive: true });
writeFileSync(`artifacts/ribbon-${knob}-study.svg`, svg.join("\n"));
console.log(
  `Wrote artifacts/ribbon-${knob}-study.svg (11 anchors × 3 settings × 4 seeds).`,
);
