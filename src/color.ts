/** All perceptual coordinates use OKLab, with lightness in [0, 1]. */
export interface Lab {
  l: number;
  a: number;
  b: number;
}
export interface Lch {
  l: number;
  c: number;
  h: number;
}

export function toLch({ l, a, b }: Lab): Lch {
  return { l, c: Math.hypot(a, b), h: Math.atan2(b, a) };
}

export function linearRgb({ l, a, b }: Lab): number[] {
  const redCone = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const greenCone = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const blueCone = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * redCone - 3.3077115913 * greenCone + 0.2309699292 * blueCone,
    -1.2684380046 * redCone +
      2.6097574011 * greenCone -
      0.3413193965 * blueCone,
    -0.0041960863 * redCone - 0.7034186147 * greenCone + 1.707614701 * blueCone,
  ];
}

export function inGamut(lab: Lab, tolerance = 0): boolean {
  return linearRgb(lab).every(
    (channel) => channel >= -tolerance && channel <= 1 + tolerance,
  );
}

/** Reduce chroma until displayable; keep the caller's floating-point Lab intact. */
export function toHex(lab: Lab): string {
  // Unlike the baseline's strict boundary check, tolerate matrix round-off here.
  // Otherwise an exact sRGB red or green loses 10% chroma after a hex round-trip.
  let mapped = { ...lab };
  for (let attempt = 0; attempt < 80 && !inGamut(mapped, 2e-7); attempt++) {
    mapped = { ...mapped, a: mapped.a * 0.9, b: mapped.b * 0.9 };
  }
  return (
    "#" +
    linearRgb(mapped)
      .map((channel) => {
        const encoded =
          channel <= 0.0031308
            ? 12.92 * channel
            : 1.055 * channel ** (1 / 2.4) - 0.055;
        return Math.round(Math.max(0, Math.min(1, encoded)) * 255)
          .toString(16)
          .padStart(2, "0");
      })
      .join("")
  );
}

export function fromHex(color: string): Lab {
  if (!/^#[\da-f]{6}$/i.test(color))
    throw new Error("Enter a six-digit hex color.");
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(color.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const [r, g, b] = channels as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

export function distance(first: Lab, second: Lab): number {
  return Math.hypot(first.l - second.l, first.a - second.a, first.b - second.b);
}
