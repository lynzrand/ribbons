import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  generateRibbon,
  inGamut,
  randomRibbonOptions,
  toLch,
} from "@ribbons/core";

test("seeded options reproduce complete four-color identities", () => {
  const options = randomRibbonOptions("account-42");
  assert.deepEqual(randomRibbonOptions("account-42"), options);
  assert.notDeepEqual(randomRibbonOptions("account-43"), options);
  assert.deepEqual(
    generateRibbon(options),
    generateRibbon(randomRibbonOptions("account-42")),
  );
  const fresh = randomRibbonOptions("");
  assert.ok(fresh.seed.length > 0);
  assert.deepEqual(randomRibbonOptions(fresh.seed), fresh);
});

test("random options keep the agreed structure and sample displayable primaries", () => {
  for (let index = 0; index < 100; index++) {
    const options = randomRibbonOptions(`identity-${index}`);
    const { l, c } = toLch(options.lab);
    assert.equal(options.count, 4);
    assert.equal(options.widthAlpha, 0.6);
    assert.equal(options.rangeRadius, 0);
    assert.equal(options.shellChance, null);
    assert.ok(inGamut(options.lab));
    assert.ok(l >= 0.4 && l <= 0.85);
    assert.ok(c >= 0.04 && c <= 0.18);
    assert.ok(options.contrast! >= 0.15 && options.contrast! <= 0.75);
    assert.ok(options.chromaAffinity! >= 0.6 && options.chromaAffinity! <= 1);
    assert.ok(
      options.primaryAffinity! >= 0.25 && options.primaryAffinity! <= 0.85,
    );
  }
});
