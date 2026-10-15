import { strict as assert } from "node:assert";
import { test } from "node:test";
import { powerCell, powerDiagram, powerSvg } from "../src/power-diagram.ts";

test("power cells fit target disk areas on an independent finer grid", () => {
  for (const weights of [
    [0.49, 0.07, 0.17, 0.27],
    [0.7, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
    [1, 1],
  ]) {
    const diagram = powerDiagram(weights, "area-check");
    const counts = weights.map(() => 0);
    let total = 0;
    for (let y = 0; y < 192; y++) {
      for (let x = 0; x < 192; x++) {
        const px = (x + 0.5) / 192;
        const py = (y + 0.5) / 192;
        if ((px - 0.5) ** 2 + (py - 0.5) ** 2 >= 0.25) continue;
        let winner = 0;
        let best = Infinity;
        diagram.sites.forEach((site, index) => {
          const score = (px - site.x) ** 2 + (py - site.y) ** 2 - site.bias;
          if (score < best) {
            best = score;
            winner = index;
          }
        });
        counts[winner]!++;
        total++;
      }
    }
    const sum = weights.reduce((a, b) => a + b, 0);
    counts.forEach((count, index) => {
      assert.ok(count > 0, "Every color remains visible");
      assert.ok(Math.abs(count / total - weights[index]! / sum) < 0.005);
    });
  }
});

test("rendered polygons agree with the power metric and stay convex", () => {
  const diagram = powerDiagram([0.49, 0.07, 0.17, 0.27], "polygons");
  const cells = diagram.sites.map((_, index) =>
    powerCell(diagram.sites, index),
  );
  for (let y = 0; y < 31; y++) {
    for (let x = 0; x < 31; x++) {
      const px = (x + 0.37) / 31;
      const py = (y + 0.41) / 31;
      const scores = diagram.sites.map(
        (site) => (px - site.x) ** 2 + (py - site.y) ** 2 - site.bias,
      );
      const winner = scores.indexOf(Math.min(...scores));
      const polygon = cells[winner]!;
      assert.ok(polygon.length >= 3);
      polygon.forEach((point, index) => {
        const next = polygon[(index + 1) % polygon.length]!;
        assert.ok(
          (next.x - point.x) * (py - point.y) -
            (next.y - point.y) * (px - point.x) >=
            -1e-10,
        );
      });
    }
  }
});

test("layout is reproducible, normalizes weights, and leaves inputs untouched", () => {
  const weights = [5, 3, 2];
  const first = powerDiagram(weights, "fixed");
  assert.deepEqual(powerDiagram(weights, "fixed"), first);
  assert.deepEqual(powerDiagram([0.5, 0.3, 0.2], "fixed"), first);
  assert.notDeepEqual(powerDiagram(weights, "another"), first);
  assert.deepEqual(weights, [5, 3, 2]);
  assert.equal(powerDiagram([1], "single").areas[0], 1);
  assert.throws(() => powerDiagram([0, 1], "bad"), /positive/);
});

test("SVG uses the same vector cells, palette order, and caller-specific clip IDs", () => {
  const diagram = powerDiagram([1, 1], "export");
  const svg = powerSvg(diagram, ["#123456", "#abcdef"], "preview-1");
  assert.equal((svg.match(/<polygon /g) ?? []).length, 2);
  assert.ok(svg.indexOf("#123456") < svg.indexOf("#abcdef"));
  assert.ok(svg.includes('id="preview-1-disk"'));
  assert.ok(svg.includes('clip-path="url(#preview-1-disk)"'));
  assert.ok(!/NaN|Infinity/.test(svg));
});
