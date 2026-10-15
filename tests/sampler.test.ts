import { strict as assert } from "node:assert";
import { test } from "node:test";
import { distance, fromHex, toHex, toLch } from "@ribbons/core";
import {
  generateRibbon,
  lightnessShellChance,
  type RibbonOptions,
} from "@ribbons/core";

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

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function studySamples(overrides: Partial<RibbonOptions>) {
  return Array.from({ length: 8 }, (_, index) =>
    generateRibbon({ ...settings, seed: `controls-${index}`, ...overrides }),
  );
}

test("contrast controls lightness spread in both sampling branches", () => {
  // Soft pastel palettes previously acquired near-black accents through either branch.
  const lab = fromHex("#b9dfc9");
  for (const shellChance of [0, 1]) {
    const spread = (contrast: number) =>
      average(
        studySamples({ lab, shellChance, contrast }).map((ribbon) => {
          const lightness = ribbon.colors.map((color) => fromHex(color).l);
          return Math.max(...lightness) - Math.min(...lightness);
        }),
      );
    assert.ok(
      spread(0.1) < spread(0.9),
      `Contrast should increase spread in branch ${shellChance}`,
    );
  }
});

test("chroma affinity keeps a gray primary from picking neon accents", () => {
  const lab = fromHex("#888888");
  for (const shellChance of [0, 1]) {
    const chroma = (chromaAffinity: number) =>
      average(
        studySamples({ lab, shellChance, chromaAffinity }).map((ribbon) =>
          Math.max(...ribbon.colors.map((color) => toLch(fromHex(color)).c)),
        ),
      );
    assert.ok(chroma(1) < chroma(0));
    assert.ok(chroma(1) < 0.06);
  }
});

test("primary affinity favors related hues independently of chroma and contrast", () => {
  const lab = fromHex("#60a6d2");
  const primary = toLch(lab);
  for (const shellChance of [0, 1]) {
    const hueDifference = (primaryAffinity: number) =>
      average(
        studySamples({ lab, shellChance, primaryAffinity }).flatMap((ribbon) =>
          ribbon.generatedColors.slice(1).map((color) => {
            const other = toLch(fromHex(color));
            // Fade out hue near gray, just as the sampler does.
            const reliability =
              (primary.c * other.c) /
              Math.sqrt(
                (primary.c ** 2 + 0.025 ** 2) * (other.c ** 2 + 0.025 ** 2),
              );
            return reliability * (1 - Math.cos(primary.h - other.h));
          }),
        ),
      );
    assert.ok(
      hueDifference(1) < hueDifference(0),
      `Affinity should pull hues toward the primary in branch ${shellChance}`,
    );
  }
});

test("style knobs preserve widths, primary placement, and minimum separation at their extremes", () => {
  const original = generateRibbon({ ...settings, count: 7 });
  for (const value of [0, 1]) {
    const ribbon = generateRibbon({
      ...settings,
      count: 7,
      contrast: value,
      chromaAffinity: value,
      primaryAffinity: value,
    });
    assert.deepEqual(ribbon.widths, original.widths);
    assert.equal(ribbon.primaryIndex, original.primaryIndex);
    for (let i = 0; i < ribbon.colors.length; i++) {
      for (let j = i + 1; j < ribbon.colors.length; j++) {
        assert.ok(
          distance(fromHex(ribbon.colors[i]!), fromHex(ribbon.colors[j]!)) >=
            0.045,
        );
      }
    }
    assert.deepEqual(generateRibbon(ribbon.options), ribbon);
  }
  for (const knob of [
    "contrast",
    "chromaAffinity",
    "primaryAffinity",
  ] as const) {
    for (const value of [-1, 2, NaN]) {
      assert.throws(
        () => generateRibbon({ ...settings, [knob]: value }),
        /between 0 and 1/,
      );
    }
  }
});

test("pastel pairs with intermediate hue differences gain a lightness cue", () => {
  // Regression cases from the user's 20% contrast, 45% / 75% affinity settings.
  // Both branches previously selected several bright hues at almost identical L.
  const cases = [
    {
      shellChance: 0,
      seed: "pastel-5",
      before: ["#f0c1bb", "#eee3d8", "#eab2d5", "#cc9981"],
    },
    {
      shellChance: 1,
      seed: "pastel-3",
      before: ["#d2b7ab", "#ebe2d9", "#a3c9ad", "#f0b2c4"],
    },
  ];
  function ambiguousPairs(colors: string[]): number {
    const points = colors.map((color) => toLch(fromHex(color)));
    let count = 0;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const first = points[i]!;
        const second = points[j]!;
        const angle = Math.acos(
          Math.max(-1, Math.min(1, Math.cos(first.h - second.h))),
        );
        if (
          Math.min(first.l, second.l) > 0.7 &&
          Math.min(first.c, second.c) > 0.025 &&
          angle > Math.PI / 4 &&
          angle < (3 * Math.PI) / 4 &&
          Math.abs(first.l - second.l) < 0.04
        )
          count++;
      }
    }
    return count;
  }
  for (const sample of cases) {
    const ribbon = generateRibbon({
      ...settings,
      lab: fromHex("#ebe4da"),
      seed: sample.seed,
      shellChance: sample.shellChance,
      widthAlpha: 0.6,
      rangeRadius: 0.005,
      contrast: 0.2,
      primaryAffinity: 0.45,
      chromaAffinity: 0.75,
    });
    assert.ok(ambiguousPairs(sample.before) > 0);
    assert.equal(ambiguousPairs(ribbon.colors), 0);
    // Do not resolve the clash by turning a pastel ribbon dark or highly saturated.
    assert.ok(
      ribbon.colors.every((color) => {
        const point = toLch(fromHex(color));
        return point.l > 0.7 && point.c < 0.11;
      }),
    );
  }
});

test("a mid-bright blue produces both lighter and darker companions", () => {
  // Screenshot regression: the fixed absolute contrast target strongly favored
  // the much larger downward lightness range for L=0.73.
  let lighter = 0;
  let darker = 0;
  const sampleCount = 24;
  for (let index = 0; index < sampleCount; index++) {
    const ribbon = generateRibbon({
      ...settings,
      lab: { l: 0.73, a: -0.054, b: -0.121 },
      seed: `balance-${index}`,
      contrast: 0.5,
      primaryAffinity: 0.5,
      chromaAffinity: 1,
    });
    const primaryL = fromHex(ribbon.primary).l;
    for (const color of ribbon.generatedColors.slice(1)) {
      const lightness = fromHex(color).l;
      if (lightness > primaryL + 0.03) lighter++;
      if (lightness < primaryL - 0.03) darker++;
    }
  }
  // A distribution check, not a requirement for every ribbon to straddle its primary.
  const companionCount = sampleCount * (settings.count - 1);
  assert.ok(lighter > companionCount * 0.2);
  assert.ok(darker > companionCount * 0.2);
});
