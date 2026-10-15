export interface Tile {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Carve one color from the remaining rectangle, preserving input order and area.
 * Split the longer dimension; within 5% of square, alternate using depth parity.
 */
export function sliceAndDice(
  weights: number[],
  width: number,
  height: number,
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
  let remainingWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let remainder: Tile = { x: 0, y: 0, width, height };
  return weights.map((weight, depth) => {
    if (depth === weights.length - 1) return remainder;
    const fraction = weight / remainingWeight;
    const nearSquare =
      Math.abs(remainder.width - remainder.height) <=
      0.05 * Math.max(remainder.width, remainder.height);
    const splitWidth = nearSquare
      ? depth % 2 === 0
      : remainder.width > remainder.height;
    const tile = { ...remainder };
    if (splitWidth) {
      tile.width *= fraction;
      remainder = {
        ...remainder,
        x: remainder.x + tile.width,
        width: remainder.width - tile.width,
      };
    } else {
      tile.height *= fraction;
      remainder = {
        ...remainder,
        y: remainder.y + tile.height,
        height: remainder.height - tile.height,
      };
    }
    remainingWeight -= weight;
    return tile;
  });
}
