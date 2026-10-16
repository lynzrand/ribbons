<script setup lang="ts">
import { computed } from "vue";
import type { RibbonOptions } from "@ribbons/core";
import OklabPicker from "./OklabPicker.vue";

const settings = defineModel<RibbonOptions>({ required: true });
const rerollOnChange = defineModel<boolean>("rerollOnChange", {
  required: true,
});
const emit = defineEmits<{
  generate: [];
  randomize: [];
  randomIdentity: [];
}>();
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
    <div class="control-group range-control">
      <label class="field-heading" for="contrast"
        >Contrast
        <output
          >{{ Math.round((settings.contrast ?? 0.5) * 100) }}%</output
        ></label
      >
      <input
        id="contrast"
        v-model.number="settings.contrast"
        type="range"
        min="0"
        max="1"
        step="0.05"
      />
      <div class="range-labels"><span>Soft</span><span>Bold</span></div>
    </div>
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
    <div class="action-stack">
      <button class="generate-button" @click="emit('generate')">
        Generate <span>↻</span>
      </button>
      <button class="secondary-button" @click="emit('randomize')">
        Parameters from seed
      </button>
      <button class="secondary-button" @click="emit('randomIdentity')">
        Random identity
      </button>
    </div>
    <label
      class="reroll-option"
      :title="
        settings.seed.trim()
          ? 'Clear the fixed seed to reroll automatically'
          : ''
      "
    >
      <input
        v-model="rerollOnChange"
        type="checkbox"
        :disabled="Boolean(settings.seed.trim())"
      />
      Reroll seed on parameter change
    </label>
    <details class="advanced">
      <summary>Options <span>+</span></summary>
      <label class="field-heading" for="primary-affinity"
        >Primary affinity
        <output
          >{{ Math.round((settings.primaryAffinity ?? 0.5) * 100) }}%</output
        ></label
      >
      <input
        id="primary-affinity"
        v-model.number="settings.primaryAffinity"
        type="range"
        min="0"
        max="1"
        step="0.05"
      />
      <div class="range-labels">
        <span>Free hues</span><span>Related hues</span>
      </div>
      <label class="field-heading" for="chroma-affinity"
        >Chroma affinity
        <output
          >{{ Math.round((settings.chromaAffinity ?? 1) * 100) }}%</output
        ></label
      >
      <input
        id="chroma-affinity"
        v-model.number="settings.chromaAffinity"
        type="range"
        min="0"
        max="1"
        step="0.05"
      />
      <div class="range-labels">
        <span>Free</span><span>Match primary</span>
      </div>
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
      <p>
        Parameters from seed sets the color and style with four segments. Clear
        the seed for a new random identity.
      </p>
    </details>
  </aside>
</template>

<style scoped>
.action-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.reroll-option {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 12px;
  font-size: 11px;
  color: var(--muted);
  cursor: pointer;
}
.reroll-option input {
  margin: 0;
  accent-color: var(--green);
}
</style>
