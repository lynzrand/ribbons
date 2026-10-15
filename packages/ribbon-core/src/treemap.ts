import { circleArea, circleBounds } from "./circle-area.ts";

export interface Tile {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Recursively split contiguous color groups near half their combined weight.
 * In circle mode, areas refer to the visible disk, not its bounding square.
 * Split the longer dimension; within 5% of square, alternate using depth parity.
 */
export function sliceAndDice(
  weights: number[],
  width: number,
  height: number,
  shape: "rectangle" | "circle" = "rectangle",
): Tile[] {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    weights.length === 0 ||
    weights.some((weight) => !Number.isFinite(weight) || weight <= 0)
  ) {
    throw new Error(
      "Treemap dimensions and weights must be finite and positive.",
    );
  }
  // Circular layout uses a normalized unit disk; scale only the final rectangles.
  const circular = shape === "circle";
  if (circular && width !== height)
    throw new Error("A circular treemap needs square dimensions.");
  function partition(group: number[], region: Tile, depth: number): Tile[] {
    if (circular) region = circleBounds(region);
    if (group.length === 1) return [region];
    const total = group.reduce((sum, weight) => sum + weight, 0);
    let prefix = 0;
    let leftWeight = 0;
    let split = 1;
    let bestDifference = Infinity;
    // Preserve color order while choosing the most balanced nonempty groups.
    for (let index = 1; index < group.length; index++) {
      prefix += group[index - 1]!;
      const difference = Math.abs(prefix - total / 2);
      if (difference < bestDifference) {
        bestDifference = difference;
        leftWeight = prefix;
        split = index;
      }
    }
    const fraction = leftWeight / total;
    const nearSquare =
      Math.abs(region.width - region.height) <=
      0.05 * Math.max(region.width, region.height);
    const splitWidth = nearSquare
      ? depth % 2 === 0
      : region.width > region.height;
    const dimension = splitWidth ? "width" : "height";
    let cut = region[dimension] * fraction;
    if (circular) {
      const target = circleArea(region) * fraction;
      let low = 0;
      let high = region[dimension];
      // Visible disk area is monotone in the cut position.
      for (let iteration = 0; iteration < 48; iteration++) {
        cut = (low + high) / 2;
        const area = circleArea({ ...region, [dimension]: cut });
        if (area < target) low = cut;
        else high = cut;
      }
    }
    const first = { ...region, [dimension]: cut };
    const second = splitWidth
      ? { ...region, x: region.x + cut, width: region.width - cut }
      : { ...region, y: region.y + cut, height: region.height - cut };
    return [
      ...partition(group.slice(0, split), first, depth + 1),
      ...partition(group.slice(split), second, depth + 1),
    ];
  }
  const tiles = partition(
    weights,
    {
      x: 0,
      y: 0,
      width: circular ? 1 : width,
      height: circular ? 1 : height,
    },
    0,
  );
  return circular
    ? tiles.map((tile) => ({
        x: tile.x * width,
        y: tile.y * height,
        width: tile.width * width,
        height: tile.height * height,
      }))
    : tiles;
}
