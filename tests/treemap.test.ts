import { strict as assert } from "node:assert";
import { test } from "node:test";
import { sliceAndDice } from "../src/treemap.ts";

test("square layout preserves order and slices the longest remaining edge", () => {
  assert.deepEqual(sliceAndDice([0.5, 0.25, 0.25], 1, 1), [
    { x: 0, y: 0, width: 0.5, height: 1 },
    { x: 0.5, y: 0, width: 0.5, height: 0.5 },
    { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
  ]);
});

test("near-square ties use depth parity instead of always favoring width", () => {
  const tiles = sliceAndDice([0.5, 0.25, 0.125, 0.125], 2, 1);
  assert.deepEqual(tiles[1], { x: 1, y: 0, width: 1, height: 0.5 });
  // The 2% difference is a near-tie: depth 0 still chooses a width cut.
  assert.equal(sliceAndDice([1, 1], 1, 1.02)[0]!.width, 0.5);
  // Outside the tie band, the longer height takes priority over depth 0.
  assert.equal(sliceAndDice([1, 1], 1, 2)[0]!.height, 1);
});

test("arbitrary aspect ratios conserve areas and tile the whole rectangle without overlap", () => {
  const weights = [0.49, 0.07, 0.17, 0.27];
  for (const ratio of [0.1, 0.5, 1, 1.02, 2, 10]) {
    const tiles = sliceAndDice(weights, ratio, 1);
    tiles.forEach((tile, index) => {
      assert.ok(
        Math.abs((tile.width * tile.height) / ratio - weights[index]!) < 1e-12,
      );
      assert.ok(
        tile.x >= 0 && tile.y >= 0 && tile.width > 0 && tile.height > 0,
      );
      assert.ok(tile.x + tile.width <= ratio + 1e-12);
      assert.ok(tile.y + tile.height <= 1 + 1e-12);
      for (const other of tiles.slice(index + 1)) {
        const overlapX =
          Math.min(tile.x + tile.width, other.x + other.width) -
          Math.max(tile.x, other.x);
        const overlapY =
          Math.min(tile.y + tile.height, other.y + other.height) -
          Math.max(tile.y, other.y);
        assert.ok(overlapX <= 1e-12 || overlapY <= 1e-12);
      }
    });
    assert.ok(
      Math.abs(
        tiles.reduce((area, tile) => area + tile.width * tile.height, 0) -
          ratio,
      ) < 1e-12,
    );
  }
});

test("weights are relative, the final tile fills the remainder, and inputs stay intact", () => {
  const weights = [5, 3, 2];
  assert.deepEqual(
    sliceAndDice(weights, 1, 1),
    sliceAndDice([0.5, 0.3, 0.2], 1, 1),
  );
  assert.deepEqual(weights, [5, 3, 2]);
  assert.deepEqual(sliceAndDice([1], 2, 3), [
    { x: 0, y: 0, width: 2, height: 3 },
  ]);
  assert.throws(() => sliceAndDice([], 1, 1), /positive/);
  assert.throws(() => sliceAndDice([1], 0, 1), /positive/);
});
