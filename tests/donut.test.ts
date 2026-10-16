import assert from "node:assert/strict";
import test from "node:test";
import { donutSvg } from "@ribbons/core";

test("donut arcs have round caps, visible gaps, and weighted lengths", () => {
  const svg = donutSvg([2, 3, 5], ["#123456", "#abcdef", "#fedcba"], "ring");
  const segments = [
    ...svg.matchAll(
      /stroke-dasharray="([\d.e+-]+) ([\d.e+-]+)" transform="rotate\(([\d.e+-]+) 0.5 0.5\)"/g,
    ),
  ];
  assert.equal(segments.length, 3);
  const radius = 0.5 / (1 + Math.sin((7 * Math.PI) / 180));
  const circumference = 2 * Math.PI * radius;
  const spacing = 0.05 * circumference;
  const start = Number(segments[0]![3]) - (spacing / 2 / circumference) * 360;
  assert.ok(start >= -90 && start < -90 + 72);
  segments.forEach((segment, index) => {
    assert.ok(
      Math.abs(
        Number(segment[1]) / circumference - ([0.2, 0.3, 0.5][index]! - 0.05),
      ) < 1e-12,
    );
    const next =
      Number(segments[(index + 1) % 3]![3]) + (index === 2 ? 360 : 0);
    const gap =
      ((next - Number(segment[3])) / 360) * circumference - Number(segment[1]);
    assert.ok(Math.abs(gap - spacing) < 1e-12);
  });
  const stroke = Number(svg.match(/stroke-width="([^"]+)"/)![1]);
  assert.ok(Math.abs(radius + stroke / 2 - 0.5) < 1e-12);
  assert.equal((svg.match(/stroke-linecap="round"/g) ?? []).length, 3);
  // The fixed sampler minimum must be a dot even when no current weight is 5%.
  const minimum = donutSvg(
    [0.05, 0.15, 0.8],
    ["#123456", "#abcdef", "#fedcba"],
    "minimum",
  );
  assert.equal(Number(minimum.match(/stroke-dasharray="([^ ]+)/)![1]), 0);
  const capAngle = 2 * Math.asin(stroke / (2 * radius));
  assert.ok(
    Math.abs(capAngle + (4 * Math.PI) / 180 - 0.05 * 2 * Math.PI) < 1e-12,
  );
});

test("donut rendering is seeded, normalizes weights, and handles one color", () => {
  const colors = ["#123456", "#abcdef"];
  const first = donutSvg([1, 3], colors, "fixed");
  assert.equal(donutSvg([1, 3], colors, "fixed"), first);
  assert.equal(donutSvg([2, 6], colors, "fixed"), first);
  assert.notEqual(donutSvg([1, 3], colors, "other"), first);
  const single = donutSvg([1], [colors[0]!], "single");
  const dash = single.match(/stroke-dasharray="([^ ]+) ([^"]+)"/)!;
  assert.equal(dash[1], dash[2]);
  for (const weights of [[], [0], [-1], [NaN], [Infinity]])
    assert.throws(() => donutSvg(weights, colors, "invalid"), /positive/);
});
