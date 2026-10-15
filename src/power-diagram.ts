import { seededRandom } from "./sampler.ts";

export interface Site {
  x: number;
  y: number;
  bias: number;
}
export interface PowerDiagram {
  sites: Site[];
  areas: number[];
  error: number;
}
interface Sample {
  x: number;
  y: number;
}

// Uniform disk samples measure capacity; the rendered boundaries remain analytic.
const resolution = 64;
const samples: Sample[] = [];
for (let y = 0; y < resolution; y++) {
  for (let x = 0; x < resolution; x++) {
    const point = { x: (x + 0.5) / resolution, y: (y + 0.5) / resolution };
    if ((point.x - 0.5) ** 2 + (point.y - 0.5) ** 2 < 0.25) samples.push(point);
  }
}

/** In-place selection of an order statistic, avoiding a sort for every capacity update. */
function quantile(values: Float64Array, index: number): number {
  let left = 0;
  let right = values.length - 1;
  while (left < right) {
    const pivot = values[(left + right) >>> 1]!;
    let i = left;
    let j = right;
    while (i <= j) {
      while (values[i]! < pivot) i++;
      while (values[j]! > pivot) j--;
      if (i <= j) {
        [values[i], values[j]] = [values[j]!, values[i]!];
        i++;
        j--;
      }
    }
    if (index <= j) right = j;
    else if (index >= i) left = i;
    else break;
  }
  return values[index]!;
}

/** Weighted power cells use |p-site|² - bias, giving straight internal edges.
 * Coordinate updates fit target areas on a 64² disk grid; Lloyd steps compact cells.
 * Rendering is analytic; this small numerical solver is not a paper reproduction.
 * Background: https://doi.org/10.1109/INFOVIS.2005.40
 */
export function powerDiagram(weights: number[], seed: string): PowerDiagram {
  if (
    !weights.length ||
    weights.some((weight) => !Number.isFinite(weight) || weight <= 0)
  ) {
    throw new Error("Voronoi weights must be finite and positive.");
  }
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const targets = weights.map((weight) => weight / total);
  const random = seededRandom(`${seed}/voronoi`);
  const rotation = random() * 2 * Math.PI;
  const sites: Site[] = weights.map((_, index) => {
    const angle = rotation + index * Math.PI * (3 - Math.sqrt(5));
    const radius = 0.35 * Math.sqrt((index + 0.5) / weights.length);
    return {
      x: 0.5 + radius * Math.cos(angle),
      y: 0.5 + radius * Math.sin(angle),
      bias: 0,
    };
  });
  if (sites.length === 1) return { sites, areas: [1], error: 0 };
  const parameters = new Float64Array(sites.length);
  const thresholds = new Float64Array(samples.length);
  let areas = targets.map(() => 0);
  let error = Infinity;
  for (let relaxation = 0; relaxation < 4; relaxation++) {
    const distances = sites.map((site) =>
      Float64Array.from(
        samples,
        (point) => (point.x - site.x) ** 2 + (point.y - site.y) ** 2,
      ),
    );
    const scores = distances.map((row) => Float64Array.from(row));
    function updateScores(index: number) {
      const parameter = parameters[index]!;
      sites[index]!.bias = parameter;
      for (let point = 0; point < samples.length; point++) {
        scores[index]![point] = distances[index]![point]! - sites[index]!.bias;
      }
    }
    sites.forEach((_, index) => updateScores(index));
    let owners = new Int16Array(samples.length);
    for (let iteration = 0; iteration < 50; iteration++) {
      for (let index = 0; index < sites.length; index++) {
        for (let point = 0; point < samples.length; point++) {
          let other = Infinity;
          for (let neighbor = 0; neighbor < sites.length; neighbor++) {
            if (neighbor !== index)
              other = Math.min(other, scores[neighbor]![point]!);
          }
          const distance = distances[index]![point]!;
          thresholds[point] = distance - other;
        }
        const indexAtTarget = Math.min(
          samples.length - 1,
          Math.floor(targets[index]! * samples.length),
        );
        parameters[index] = quantile(thresholds, indexAtTarget);
        updateScores(index);
      }
      const counts = sites.map(() => 0);
      owners = new Int16Array(samples.length);
      for (let point = 0; point < samples.length; point++) {
        let winner = 0;
        for (let index = 1; index < sites.length; index++) {
          if (scores[index]![point]! < scores[winner]![point]!) winner = index;
        }
        owners[point] = winner;
        counts[winner]!++;
      }
      areas = counts.map((count) => count / samples.length);
      error = Math.max(
        ...areas.map((area, index) => Math.abs(area - targets[index]!)),
      );
      if (error < 0.002) break;
    }
    if (relaxation === 3) break;
    const sums = sites.map(() => ({ x: 0, y: 0, count: 0 }));
    samples.forEach((point, index) => {
      const sum = sums[owners[index]!]!;
      sum.x += point.x;
      sum.y += point.y;
      sum.count++;
    });
    sites.forEach((site, index) => {
      const sum = sums[index]!;
      if (sum.count) {
        site.x = sum.x / sum.count;
        site.y = sum.y / sum.count;
      }
    });
  }
  return { sites, areas, error };
}

/** Convex power cell, clipped by every competing site's linear half-plane. */
export function powerCell(sites: Site[], index: number): Sample[] {
  const site = sites[index]!;
  let polygon = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  for (let neighbor = 0; neighbor < sites.length; neighbor++) {
    if (neighbor === index) continue;
    const other = sites[neighbor]!;
    const a = 2 * (other.x - site.x);
    const b = 2 * (other.y - site.y);
    const c =
      site.x ** 2 +
      site.y ** 2 -
      site.bias -
      other.x ** 2 -
      other.y ** 2 +
      other.bias;
    const clipped: Sample[] = [];
    polygon.forEach((point, vertex) => {
      const next = polygon[(vertex + 1) % polygon.length]!;
      const value = a * point.x + b * point.y + c;
      const nextValue = a * next.x + b * next.y + c;
      if (value <= 0) clipped.push(point);
      if (value <= 0 !== nextValue <= 0) {
        const t = value / (value - nextValue);
        clipped.push({
          x: point.x + t * (next.x - point.x),
          y: point.y + t * (next.y - point.y),
        });
      }
    });
    polygon = clipped;
  }
  return polygon;
}

/** Shared vector rendering for the live preview and exported SVG. Colors are hex values. */
export function powerSvg(
  diagram: PowerDiagram,
  colors: string[],
  id: string,
): string {
  const cells = diagram.sites.map((_, index) => {
    const points = powerCell(diagram.sites, index)
      .map((point) => `${point.x},${point.y}`)
      .join(" ");
    return `<polygon points="${points}" fill="${colors[index]}"/>`;
  });
  return `<defs><clipPath id="${id}-disk"><circle cx="0.5" cy="0.5" r="0.5"/></clipPath></defs><g clip-path="url(#${id}-disk)">${cells.join("")}</g>`;
}
