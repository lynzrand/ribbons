import { strict as assert } from "node:assert";
import { test } from "node:test";
import { distance, fromHex, toHex } from "../src/color.ts";
import {
  generateRibbon,
  lightnessShellChance,
  type RibbonOptions,
} from "../src/sampler.ts";

const settings: RibbonOptions = {
  lab: { l: 0.6, a: -0.07, b: -0.02 },
  count: 4,
  widthAlpha: 0.8,
  rangeRadius: 0,
  seed: "studio-laptop",
  shellChance: null,
};

test("hex conversion round-trips known sRGB colors", () => {
  for (const color of [
    "#000000",
    "#ffffff",
    "#548c84",
    "#ff0000",
    "#00ff00",
    "#0000ff",
  ]) {
    // Conversion coefficients have tiny boundary errors; allow a quantization step.
    const actual = toHex(fromHex(color));
    for (const offset of [1, 3, 5]) {
      assert.ok(
        Math.abs(
          parseInt(actual.slice(offset, offset + 2), 16) -
            parseInt(color.slice(offset, offset + 2), 16),
        ) <= 1,
      );
    }
  }
});

test("a seed reproduces the entire ribbon without mutating its inputs", () => {
  const original = structuredClone(settings);
  assert.deepEqual(generateRibbon(settings), generateRibbon(settings));
  assert.deepEqual(settings, original);
  assert.notDeepEqual(
    generateRibbon(settings).colors,
    generateRibbon({ ...settings, seed: "other-device" }).colors,
  );
});

test("all supported counts keep widths bounded, colors separated, and primary placement consistent", () => {
  for (let count = 2; count <= 7; count++) {
    const ribbon = generateRibbon({ ...settings, count });
    assert.equal(ribbon.colors.length, count);
    assert.equal(ribbon.widths.length, count);
    assert.ok(
      Math.abs(ribbon.widths.reduce((sum, width) => sum + width, 0) - 1) <
        1e-12,
    );
    assert.ok(ribbon.widths.every((width) => width >= 0.05 && width <= 0.7));
    assert.equal(ribbon.colors[ribbon.primaryIndex], ribbon.primary);
    assert.equal(ribbon.generatedColors[0], ribbon.primary);
    assert.equal(ribbon.primary, toHex(settings.lab));
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        assert.ok(
          distance(fromHex(ribbon.colors[i]!), fromHex(ribbon.colors[j]!)) >=
            0.045,
        );
      }
    }
  }
});

test("manual probabilities select only their requested branch and shell parents precede children", () => {
  for (const shellChance of [0, 1]) {
    const ribbon = generateRibbon({ ...settings, count: 7, shellChance });
    for (const [index, step] of ribbon.profile.steps.entries()) {
      assert.equal(step.sampler, shellChance === 1 ? "shell" : "conditional");
      if (step.sampler === "shell")
        assert.ok(step.parent >= 0 && step.parent <= index);
    }
  }
});

test("range sampling uses a primary within the requested sphere, allowing hex quantization", () => {
  const rangeRadius = 0.08;
  const ribbon = generateRibbon({ ...settings, rangeRadius });
  assert.ok(
    distance(fromHex(ribbon.primary), settings.lab) <= rangeRadius + 0.003,
  );
});

test("automatic shell probability follows primary lightness", () => {
  assert.equal(lightnessShellChance(0.5), 0.2);
  assert.ok(Math.abs(lightnessShellChance(0.05) - 0.7) < 1e-12);
  assert.ok(Math.abs(lightnessShellChance(0.95) - 0.7) < 1e-12);
  const ribbon = generateRibbon(settings);
  assert.equal(
    ribbon.profile.shellChance,
    lightnessShellChance(fromHex(ribbon.primary).l),
  );
});

test("blank seeds are returned for reuse and invalid public inputs fail clearly", () => {
  const ribbon = generateRibbon({ ...settings, seed: "" });
  assert.ok(ribbon.seed.length > 0);
  assert.deepEqual(generateRibbon({ ...settings, seed: ribbon.seed }), ribbon);
  assert.throws(() => generateRibbon({ ...settings, count: 8 }), /2–7/);
  assert.throws(
    () => generateRibbon({ ...settings, lab: { l: NaN, a: 0, b: 0 } }),
    /OKLab/,
  );
  assert.throws(
    () => generateRibbon({ ...settings, shellChance: 2 }),
    /Shell chance/,
  );
  assert.throws(
    () => generateRibbon({ ...settings, widthAlpha: 0 }),
    /positive/,
  );
  assert.throws(
    () => generateRibbon({ ...settings, rangeRadius: -1 }),
    /nonnegative/,
  );
});
