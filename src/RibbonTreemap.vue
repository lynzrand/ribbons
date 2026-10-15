<script setup lang="ts">
import { computed, useId } from "vue";
import type { Ribbon } from "./sampler";
import { sliceAndDice } from "./treemap";

const props = withDefaults(
  defineProps<{
    ribbon: Ribbon;
    aspectRatio: number;
    size?: number;
    circular?: boolean;
  }>(),
  { size: 220 },
);
const clipId = useId();
const ratio = computed(() => (props.circular ? 1 : props.aspectRatio));
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
    <defs v-if="circular">
      <clipPath :id="clipId"><circle cx="0.5" cy="0.5" r="0.5" /></clipPath>
    </defs>
    <g :clip-path="circular ? `url(#${clipId})` : undefined">
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
