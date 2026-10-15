<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { inGamut, linearRgb, toHex, type Lab } from "@ribbons/core";

const lab = defineModel<Lab>({ required: true });
const canvas = ref<HTMLCanvasElement>();
const extent = 0.32;
const preview = computed(() => toHex(lab.value));
const marker = computed(() => ({
  left: `${((lab.value.a + extent) / (2 * extent)) * 100}%`,
  top: `${((extent - lab.value.b) / (2 * extent)) * 100}%`,
}));

function drawPlane() {
  const context = canvas.value?.getContext("2d");
  if (!context || !canvas.value) return;
  const { width, height } = canvas.value;
  const image = context.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const point = {
        l: lab.value.l,
        a: (x / (width - 1)) * 2 * extent - extent,
        b: extent - (y / (height - 1)) * 2 * extent,
      };
      const channels = linearRgb(point);
      const isDisplayable = channels.every(
        (channel) => channel >= 0 && channel <= 1,
      );
      const offset = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        const value = channels[channel]!;
        const encoded =
          value <= 0.0031308
            ? value * 12.92
            : 1.055 * value ** (1 / 2.4) - 0.055;
        // Hatch the unavailable part of the sRGB gamut instead of inventing colors.
        image.data[offset + channel] = isDisplayable
          ? Math.round(encoded * 255)
          : (x + y) % 10 < 2
            ? 221
            : 235;
      }
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
}

function selectPoint(event: PointerEvent) {
  const plane = event.currentTarget as HTMLElement;
  if (event.type === "pointerdown") {
    plane.setPointerCapture(event.pointerId);
    plane.focus();
  } else if (!plane.hasPointerCapture(event.pointerId)) return;
  const bounds = plane.getBoundingClientRect();
  const x = Math.max(
    0,
    Math.min(1, (event.clientX - bounds.left) / bounds.width),
  );
  const y = Math.max(
    0,
    Math.min(1, (event.clientY - bounds.top) / bounds.height),
  );
  lab.value = {
    ...lab.value,
    a: x * 2 * extent - extent,
    b: extent - y * 2 * extent,
  };
}

function movePoint(event: KeyboardEvent) {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key))
    return;
  event.preventDefault();
  const step = event.shiftKey ? 0.025 : 0.005;
  const a =
    lab.value.a +
    (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0);
  const b =
    lab.value.b +
    (event.key === "ArrowUp" ? step : event.key === "ArrowDown" ? -step : 0);
  lab.value = {
    ...lab.value,
    a: Math.max(-extent, Math.min(extent, a)),
    b: Math.max(-extent, Math.min(extent, b)),
  };
}

function setAxis(axis: keyof Lab, event: Event) {
  const value = (event.target as HTMLInputElement).valueAsNumber;
  if (!Number.isFinite(value)) return;
  const minimum = axis === "l" ? 0 : -extent;
  const maximum = axis === "l" ? 1 : extent;
  lab.value = {
    ...lab.value,
    [axis]: Math.max(minimum, Math.min(maximum, value)),
  };
}

onMounted(drawPlane);
watch(() => lab.value.l, drawPlane);
</script>

<template>
  <div class="oklab-picker">
    <div class="field-heading">
      <span>OKLab</span><code>{{ preview }}</code>
    </div>
    <div
      class="color-plane"
      tabindex="0"
      role="group"
      aria-label="OKLab a and b plane. Use arrow keys to adjust; Shift for larger steps."
      @pointerdown="selectPoint"
      @pointermove="selectPoint"
      @keydown="movePoint"
    >
      <canvas ref="canvas" width="240" height="160" aria-hidden="true"></canvas>
      <span
        class="picker-marker"
        :style="{ ...marker, background: preview }"
      ></span>
      <span class="plane-axis">−a / +a</span>
    </div>
    <label class="lightness-control"
      ><span>L</span
      ><input
        type="range"
        min="0"
        max="1"
        step="0.005"
        :value="lab.l"
        aria-label="OKLab lightness"
        @input="setAxis('l', $event)"
    /></label>
    <div class="lab-fields">
      <label v-for="axis in ['l', 'a', 'b'] as const" :key="axis"
        >{{ axis === "l" ? "L" : axis }}
        <input
          type="number"
          :value="Number(lab[axis].toFixed(3))"
          :min="axis === 'l' ? 0 : -extent"
          :max="axis === 'l' ? 1 : extent"
          step="0.005"
          :aria-label="`OKLab ${axis}`"
          @change="setAxis(axis, $event)"
        />
      </label>
    </div>
    <span v-if="!inGamut(lab, 2e-7)" class="gamut-note"
      >Preview mapped to sRGB</span
    >
  </div>
</template>

<style scoped>
.oklab-picker {
  margin-bottom: 20px;
}
.field-heading > span {
  font-size: 12px;
  color: var(--ink);
}
.field-heading code {
  color: var(--muted);
  font-size: 11px;
}
.color-plane {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  border-radius: 5px;
  overflow: hidden;
  touch-action: none;
  cursor: crosshair;
}
.color-plane:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 3px;
}
canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.picker-marker {
  position: absolute;
  width: 13px;
  height: 13px;
  border: 2px solid white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 1px #0008;
  pointer-events: none;
}
.plane-axis {
  position: absolute;
  bottom: 5px;
  right: 7px;
  font: 9px monospace;
  color: #555;
  pointer-events: none;
}
.lightness-control {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 14px 0 8px;
  font: 11px monospace;
}
.lightness-control input {
  margin: 0;
}
.gamut-note {
  display: block;
  margin-top: 8px;
  font-size: 10px;
  color: var(--muted);
}
</style>
