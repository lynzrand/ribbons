import { strict as assert } from "node:assert";
import { test } from "node:test";
import { circleArea } from "@ribbons/core";

test("disk intersection agrees with known whole, half, quarter, and cap areas", () => {
  assert.ok(
    Math.abs(circleArea({ x: 0, y: 0, width: 1, height: 1 }) - Math.PI / 4) <
      1e-12,
  );
  assert.ok(
    Math.abs(circleArea({ x: 0, y: 0, width: 0.5, height: 1 }) - Math.PI / 8) <
      1e-12,
  );
  assert.ok(
    Math.abs(
      circleArea({ x: 0.5, y: 0.5, width: 0.5, height: 0.5 }) - Math.PI / 16,
    ) < 1e-12,
  );
  const cap = 0.25 * Math.acos(0.5) - 0.25 * Math.sqrt(0.25 - 0.25 ** 2);
  assert.ok(
    Math.abs(circleArea({ x: 0.75, y: 0, width: 0.25, height: 1 }) - cap) <
      1e-12,
  );
  assert.equal(circleArea({ x: 0, y: 0, width: 0.1, height: 0.1 }), 0);
});
