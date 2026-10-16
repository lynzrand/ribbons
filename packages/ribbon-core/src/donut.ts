import { seededRandom } from "./random.ts";

/** Detached, round-ended arcs in the unit square.
 * A 5% segment is exactly a dot; larger segments retain their weighted angular spans.
 * Start clockwise from twelve o'clock by a seeded fraction of the first segment.
 * Shared by previews and SVG exports so the rotation stays identical.
 */
export function donutSvg(
  weights: number[],
  colors: string[],
  seed: string,
): string {
  if (
    !weights.length ||
    weights.some((weight) => !Number.isFinite(weight) || weight <= 0)
  )
    throw new Error("Donut weights must be finite and positive.");
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  // Each 5% slot spans 18°: 14° for the round cap footprint and 4° of gap.
  // Choose the stroke and centerline radius together to keep the outer radius at 0.5.
  const dotFraction = 0.05;
  const spacingAngle = dotFraction * 2 * Math.PI;
  const gapAngle = (4 / 180) * Math.PI;
  const halfCapSine = Math.sin((spacingAngle - gapAngle) / 2);
  const radius = 0.5 / (1 + halfCapSine);
  const stroke = 2 * radius * halfCapSine;
  const circumference = 2 * Math.PI * radius;
  const spacing = dotFraction * circumference;
  let angle =
    -90 + seededRandom(`${seed}/donut`)() * (weights[0]! / total) * 360;
  return weights
    .map((weight, index) => {
      const fraction = weight / total;
      const length =
        weights.length === 1
          ? circumference
          : Math.max(0, fraction - dotFraction) * circumference;
      const rotation =
        angle +
        (weights.length === 1 ? 0 : (spacing / 2 / circumference) * 360);
      const circle = `<circle cx="0.5" cy="0.5" r="${radius}" fill="none" stroke="${colors[index]}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${length} ${circumference}" transform="rotate(${rotation} 0.5 0.5)"/>`;
      angle += ((length + spacing) / circumference) * 360;
      return circle;
    })
    .join("");
}
