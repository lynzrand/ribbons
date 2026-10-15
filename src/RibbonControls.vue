<script setup lang="ts">
import { computed } from "vue";
import type { RibbonOptions } from "./sampler";
import OklabPicker from "./OklabPicker.vue";

const settings = defineModel<RibbonOptions>({ required: true });
const name = defineModel<string>("name", { required: true });
const emit = defineEmits<{ generate: [] }>();
const shellMode = computed({
  get: () => (settings.value.shellChance === null ? "auto" : "manual"),
  set: (mode) => {
    settings.value.shellChance = mode === "auto" ? null : 0.2;
  },
});
const shellChance = computed({
  get: () => settings.value.shellChance ?? 0.2,
  set: (chance) => {
    settings.value.shellChance = chance;
  },
});
</script>

<template>
  <aside class="controls panel">
    <OklabPicker v-model="settings.lab" />
    <div class="control-group segment-control">
      <label class="field-heading" for="color-count"
        >Segments <output>{{ settings.count }}</output></label
      >
      <input
        id="color-count"
        v-model.number="settings.count"
        type="range"
        min="2"
        max="7"
        step="1"
      />
    </div>
    <button class="generate-button" @click="emit('generate')">
      Generate <span>↻</span>
    </button>
    <details class="advanced">
      <summary>Options <span>+</span></summary>
      <label class="field-heading" for="identity-name">Name</label>
      <input
        id="identity-name"
        v-model="name"
        maxlength="80"
        placeholder="Identity name"
      />
      <label class="field-heading" for="color-range"
        >Color range
        <output>{{ settings.rangeRadius.toFixed(3) }}</output></label
      >
      <input
        id="color-range"
        v-model.number="settings.rangeRadius"
        type="range"
        min="0"
        max="0.2"
        step="0.005"
      />
      <label class="field-heading" for="width-shape"
        >Width shape
        <output>{{ settings.widthAlpha.toFixed(1) }}</output></label
      >
      <input
        id="width-shape"
        v-model.number="settings.widthAlpha"
        type="range"
        min="0.3"
        max="3"
        step="0.1"
      />
      <label class="field-heading" for="shell-mode">Shell probability</label>
      <select id="shell-mode" v-model="shellMode">
        <option value="auto">Automatic</option>
        <option value="manual">Manual</option>
      </select>
      <template v-if="shellMode === 'manual'">
        <label class="field-heading" for="shell-chance"
          >Chance <output>{{ Math.round(shellChance * 100) }}%</output></label
        >
        <input
          id="shell-chance"
          v-model.number="shellChance"
          type="range"
          min="0"
          max="1"
          step="0.01"
        />
      </template>
      <label class="field-heading" for="seed"
        >Seed
        <button
          v-if="settings.seed"
          class="text-button"
          @click="settings.seed = ''"
        >
          Clear
        </button></label
      >
      <input id="seed" v-model="settings.seed" placeholder="Random" />
    </details>
  </aside>
</template>
