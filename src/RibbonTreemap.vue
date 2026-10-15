<script setup lang="ts">
import { computed, useId } from "vue";
import type { Ribbon } from "@ribbons/core";
import { sliceAndDice } from "@ribbons/core";
import { powerDiagram, powerSvg } from "@ribbons/core";

const props = withDefaults(
  defineProps<{
    ribbon: Ribbon;
    aspectRatio: number;
    size?: number;
    circular?: boolean;
    voronoi?: boolean;
  }>(),
  { size: 220 },
);
const clipId = useId();
const ratio = computed(() =>
  props.circular || props.voronoi ? 1 : props.aspectRatio,
);
interface GeometryInput {
  enabled?: boolean;
  seed: string;
  weights: number[];
}
// Color-only edits must not rerun the numerical capacity solver.
const geometryInput = computed(
  (previous: GeometryInput | undefined): GeometryInput => {
    const { widths, seed } = props.ribbon;
    if (
      previous &&
      previous.enabled === props.voronoi &&
      previous.seed === seed &&
      previous.weights.length === widths.length &&
      previous.weights.every((weight, index) => weight === widths[index])
    )
      return previous;
    return { enabled: props.voronoi, seed, weights: widths };
  },
);
const diagram = computed(() => {
  const { enabled, seed, weights } = geometryInput.value;
  return enabled ? powerDiagram(weights, seed) : undefined;
});
const diagramSvg = computed(() =>
  diagram.value ? powerSvg(diagram.value, props.ribbon.colors, clipId) : "",
);
const tiles = computed(() =>
  sliceAndDice(
    props.ribbon.widths,
    ratio.value,
    1,
    props.circular ? "circle" : "rectangle",
  ),
);
</script>

<template>
  <svg
    class="ribbon-treemap"
    :viewBox="`0 0 ${ratio} 1`"
    :style="{ aspectRatio: ratio, width: `min(100%, ${size * ratio}px)` }"
    role="img"
    :aria-label="`Color treemap: ${ribbon.colors.join(', ')}`"
  >
    <g v-if="voronoi" v-html="diagramSvg"></g>
    <defs v-else-if="circular">
      <clipPath :id="clipId"><circle cx="0.5" cy="0.5" r="0.5" /></clipPath>
    </defs>
    <g v-if="!voronoi" :clip-path="circular ? `url(#${clipId})` : undefined">
      <rect
        v-for="(tile, index) in tiles"
        :key="index"
        v-bind="tile"
        :fill="ribbon.colors[index]"
      >
        <title>
          {{ ribbon.colors[index] }} ·
          {{ Math.round(ribbon.widths[index]! * 100) }}%{{
            index === ribbon.primaryIndex ? " · primary" : ""
          }}
        </title>
      </rect>
    </g>
  </svg>
</template>

<style scoped>
.ribbon-treemap {
  display: block;
  height: auto;
  margin: 0 auto;
  border-radius: 4px;
}
</style>
