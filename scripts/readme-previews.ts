/** Regenerate README illustrations: pnpm build:lib && node --experimental-strip-types scripts/readme-previews.ts */
import { writeFileSync } from "node:fs";
import {
  donutSvg,
  fromHex,
  generateRibbon,
  powerDiagram,
  powerSvg,
  sliceAndDice,
  softPreset,
  type Ribbon,
} from "@ribbons/core";

const palettes = ["#60a6d2", "#548c84", "#d5684b"].map((color, index) =>
  generateRibbon({
    ...softPreset,
    lab: fromHex(color),
    seed: `readme-${index}`,
  }),
);
type Style = "Ribbon" | "Square" | "Circle" | "Power" | "Donut";
const styles: Style[] = ["Ribbon", "Square", "Circle", "Power", "Donut"];
const text = (
  x: number,
  y: number,
  label: string,
  size = 12,
  color = "#617268",
) =>
  `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${size}" fill="${color}">${label}</text>`;
const rect = (
  x: number,
  y: number,
  width: number,
  height: number,
  fill = "#fdfdf8",
  radius = 0,
) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}"/>`;
function mark(
  ribbon: Ribbon,
  style: Style,
  x: number,
  y: number,
  size: number,
  id: string,
  stripHeight = 7,
): string {
  let body: string;
  if (style === "Power")
    body = powerSvg(
      powerDiagram(ribbon.widths, ribbon.seed),
      ribbon.colors,
      id,
    );
  else if (style === "Donut")
    body = donutSvg(ribbon.widths, ribbon.colors, ribbon.seed);
  else {
    const height = style === "Ribbon" ? stripHeight / size : 1;
    const tiles =
      style === "Ribbon"
        ? ribbon.widths.map((weight, index) => ({
            x: ribbon.widths.slice(0, index).reduce((a, b) => a + b, 0),
            y: 0,
            width: weight,
            height,
          }))
        : sliceAndDice(
            ribbon.widths,
            1,
            1,
            style === "Circle" ? "circle" : "rectangle",
          );
    body = tiles
      .map((tile, index) =>
        rect(tile.x, tile.y, tile.width, tile.height, ribbon.colors[index]),
      )
      .join("");
    if (style === "Circle")
      body = `<defs><clipPath id="${id}"><circle cx="0.5" cy="0.5" r="0.5"/></clipPath></defs><g clip-path="url(#${id})">${body}</g>`;
  }
  return `<g transform="translate(${x} ${y}) scale(${size})">${body}</g>`;
}
function document(
  width: number,
  height: number,
  title: string,
  body: string[],
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title"><title id="title">${title}</title>${rect(0, 0, width, height, "#f6f5f0", 16)}${body.join("\n")}</svg>\n`;
}
const comparison = [
  text(
    28,
    34,
    "Same colors. Same weights. Five ways to wear them.",
    18,
    "#293b34",
  ),
];
styles.forEach((style, column) => {
  const x = 30 + column * 152;
  comparison.push(text(x, 72, style));
  palettes.forEach((ribbon, row) =>
    comparison.push(
      mark(
        ribbon,
        style,
        x,
        100 + row * 110 + (style === "Ribbon" ? 38 : 0),
        80,
        `style-${column}-${row}`,
      ),
    ),
  );
});
writeFileSync(
  new URL("../docs/avatars.svg", import.meta.url),
  document(
    790,
    428,
    "Three palettes, each shown as a ribbon, square, circular split, Power avatar, and donut",
    comparison,
  ),
);

// Illustrated versions of the playground's UI examples, using one unchanged palette.
const ribbon = palettes[1]!;
const contexts = [text(28, 34, "One palette, in context", 18, "#293b34")];
for (const [index, style] of (["Power", "Square"] as const).entries()) {
  const x = 28 + index * 248;
  contexts.push(
    text(x, 70, `${style} profile`),
    rect(x, 88, 228, 248, "#fdfdf8", 10),
    rect(x, 88, 228, 54, "#dfe7dc", 10),
  );
  contexts.push(
    mark(ribbon, style, x + 18, 118, 64, `profile-${index}`),
    text(x + 18, 209, "Alex Morgan", 16, "#293b34"),
    text(x + 18, 230, "Designer &amp; maker", 11),
  );
  contexts.push(
    rect(x + 18, 249, 192, 1, "#e4e6dd"),
    mark(ribbon, style, x + 18, 267, 28, `message-${index}`),
    text(x + 56, 277, "Alex · Just now", 10, "#293b34"),
    text(x + 56, 295, "A little color, wherever I go.", 9),
  );
}
contexts.push(
  text(524, 70, "Workspace"),
  rect(524, 88, 238, 248, "#fdfdf8", 10),
  `<defs><clipPath id="workspace-card">${rect(524, 88, 238, 248, "#fff", 10)}</clipPath></defs>`,
  `<g clip-path="url(#workspace-card)">${mark(ribbon, "Ribbon", 524, 88, 238, "workspace")}</g>`,
  text(544, 116, "PERSONAL SPACE", 9),
  text(544, 152, "Welcome back, Alex", 16, "#293b34"),
  text(544, 176, "Everything for the day ahead.", 10),
  text(544, 220, "Overview     Activity     Files", 11),
  rect(544, 236, 198, 1, "#e4e6dd"),
  text(544, 267, "Today’s workspace", 12, "#293b34"),
  text(544, 289, "All changes saved", 10),
);
contexts.push(
  text(28, 378, "Device"),
  rect(28, 398, 288, 174, "#cbd1c8", 12),
  rect(182, 496, 112, 48, "#fdfdf8", 3),
  text(192, 513, "Studio laptop", 9, "#293b34"),
  mark(ribbon, "Ribbon", 192, 524, 92, "device", 8),
);
contexts.push(
  text(344, 378, "Ribbon label"),
  rect(344, 398, 236, 174, "#fdfdf8", 4),
  text(362, 426, "PERSONAL EQUIPMENT / 001", 8),
  text(362, 460, "Studio laptop", 19, "#293b34"),
  text(362, 485, "A familiar signature, wherever it goes.", 9),
  mark(ribbon, "Ribbon", 362, 552, 200, "label", 5),
);
contexts.push(
  text(608, 378, "Square label"),
  rect(608, 398, 154, 174, "#fdfdf8", 4),
  text(624, 425, "PERSONAL EQUIPMENT", 8),
  text(624, 456, "Studio laptop", 16, "#293b34"),
  text(624, 478, "If found, please return.", 9),
  mark(ribbon, "Square", 624, 532, 24, "square-label"),
);
writeFileSync(
  new URL("../docs/contexts.svg", import.meta.url),
  document(
    790,
    600,
    "One palette illustrated in square and Power profiles, a workspace, a device sticker, and ribbon and square labels",
    contexts,
  ),
);
