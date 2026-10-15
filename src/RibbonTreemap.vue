<script setup lang="ts">
import { computed } from "vue";
import type { Ribbon } from "./sampler";
import { sliceAndDice } from "./treemap";

const props = withDefaults(
  defineProps<{ ribbon: Ribbon; aspectRatio: number; size?: number }>(),
  { size: 220 },
);
const tiles = computed(() =>
  sliceAndDice(props.ribbon.widths, props.aspectRatio, 1),
);
</script>

<template>
  <svg
    class="ribbon-treemap"
    :viewBox="`0 0 ${aspectRatio} 1`"
    :style="{ aspectRatio, width: `min(100%, ${size * aspectRatio}px)` }"
    role="img"
    :aria-label="`Color treemap: ${ribbon.colors.join(', ')}`"
  >
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
