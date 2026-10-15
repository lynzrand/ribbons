import type { Tile } from "./treemap";

/** Area inside both a rectangle and the unit circle centered at (0.5, 0.5). */
export function circleArea(tile: Tile): number {
  const left = Math.max(-1, tile.x * 2 - 1);
  const right = Math.min(1, (tile.x + tile.width) * 2 - 1);
  const bottom = tile.y * 2 - 1;
  const top = (tile.y + tile.height) * 2 - 1;
  if (left >= right) return 0;
  const breaks = [left, right];
  // Split where either horizontal edge crosses the circle. Within each piece,
  // each integration boundary is either a constant or ±sqrt(1-x²).
  for (const edge of [bottom, top]) {
    if (Math.abs(edge) >= 1) continue;
    const crossing = Math.sqrt(1 - edge * edge);
    for (const x of [-crossing, crossing]) {
      if (x > left && x < right) breaks.push(x);
    }
  }
  breaks.sort((a, b) => a - b);
  const primitive = (x: number) =>
    0.5 * (x * Math.sqrt(Math.max(0, 1 - x * x)) + Math.asin(x));
  let area = 0;
  for (let index = 1; index < breaks.length; index++) {
    const a = breaks[index - 1]!;
    const b = breaks[index]!;
    const arc = Math.sqrt(1 - ((a + b) / 2) ** 2);
    if (Math.min(top, arc) <= Math.max(bottom, -arc)) continue;
    const arcArea = primitive(b) - primitive(a);
    const upper = top < arc ? top * (b - a) : arcArea;
    const lower = bottom > -arc ? bottom * (b - a) : -arcArea;
    area += upper - lower;
  }
  return Math.max(0, area / 4);
}

/** Tight bounds of the remaining disk region, excluding empty circular corners. */
export function circleBounds(tile: Tile): Tile {
  const nearestX = Math.max(tile.x, Math.min(tile.x + tile.width, 0.5));
  const nearestY = Math.max(tile.y, Math.min(tile.y + tile.height, 0.5));
  const halfWidth = Math.sqrt(Math.max(0, 0.25 - (nearestY - 0.5) ** 2));
  const halfHeight = Math.sqrt(Math.max(0, 0.25 - (nearestX - 0.5) ** 2));
  const x = Math.max(tile.x, 0.5 - halfWidth);
  const y = Math.max(tile.y, 0.5 - halfHeight);
  return {
    x,
    y,
    width: Math.min(tile.x + tile.width, 0.5 + halfWidth) - x,
    height: Math.min(tile.y + tile.height, 0.5 + halfHeight) - y,
  };
}
