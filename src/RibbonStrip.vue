<script setup lang="ts">
import type { Ribbon } from "./sampler";
defineProps<{ ribbon: Ribbon; markPrimary?: boolean }>();
</script>

<template>
  <div
    class="ribbon-strip"
    role="img"
    :aria-label="`Color ribbon: ${ribbon.colors.join(', ')}`"
  >
    <span
      v-for="(color, index) in ribbon.colors"
      :key="index"
      :style="{ backgroundColor: color, flexGrow: ribbon.widths[index] }"
      :title="`${color} · ${Math.round(ribbon.widths[index]! * 100)}%${index === ribbon.primaryIndex ? ' · primary' : ''}`"
    >
      <i
        v-if="markPrimary && index === ribbon.primaryIndex"
        class="primary-mark"
      ></i>
    </span>
  </div>
</template>
