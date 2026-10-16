<script setup lang="ts">
import { ref } from "vue";
import type { Ribbon } from "@ribbons/core";
import RibbonStrip from "./RibbonStrip.vue";
import RibbonTreemap from "./RibbonTreemap.vue";

defineProps<{ ribbon: Ribbon }>();
const previewMode = ref("avatar");
const layout = defineModel<"strip" | "treemap" | "circle" | "power">("layout", {
  required: true,
});
const aspectRatio = defineModel<number>("aspectRatio", { required: true });
const name = defineModel<string>("name", { required: true });
const emit = defineEmits<{ export: []; save: [] }>();
function setRatio(event: Event) {
  const value = (event.target as HTMLInputElement).valueAsNumber;
  if (Number.isFinite(value) && value > 0) aspectRatio.value = value;
}
</script>

<template>
  <div class="preview-panel panel">
    <div class="selected-ribbon">
      <div class="layout-controls">
        <div class="layout-switch" aria-label="Layout">
          <button :aria-pressed="layout === 'strip'" @click="layout = 'strip'">
            Ribbon
          </button>
          <button
            :aria-pressed="layout === 'treemap'"
            @click="layout = 'treemap'"
          >
            Treemap
          </button>
          <button
            :aria-pressed="layout === 'circle'"
            @click="layout = 'circle'"
          >
            Circle
          </button>
          <button :aria-pressed="layout === 'power'" @click="layout = 'power'">
            Power
          </button>
        </div>
        <div v-if="layout === 'treemap'" class="ratio-controls">
          <button
            v-for="preset in [
              { label: '1:1', value: 1 },
              { label: '2:1', value: 2 },
              { label: '1:2', value: 0.5 },
            ]"
            :key="preset.label"
            :aria-pressed="aspectRatio === preset.value"
            @click="aspectRatio = preset.value"
          >
            {{ preset.label }}
          </button>
          <label
            >W/H
            <input
              type="number"
              :value="aspectRatio"
              min="0.01"
              step="0.1"
              aria-label="Width to height ratio"
              @input="setRatio"
          /></label>
        </div>
      </div>
      <RibbonTreemap
        v-if="layout !== 'strip'"
        :circular="layout === 'circle'"
        :voronoi="layout === 'power'"
        :ribbon="ribbon"
        :aspect-ratio="aspectRatio"
        :size="360"
      />
      <RibbonStrip v-else :ribbon="ribbon" mark-primary />
      <details class="color-details">
        <summary>Colors</summary>
        <div class="color-legend">
          <div v-for="(color, index) in ribbon.colors" :key="index">
            <span :style="{ background: color }"></span><code>{{ color }}</code
            ><small
              >{{ Math.round(ribbon.widths[index]! * 100) }}%
              {{ index === ribbon.primaryIndex ? "★" : "" }}</small
            >
          </div>
        </div>
      </details>
    </div>
    <details class="context-preview">
      <summary>Preview</summary>
      <div class="preview-stage">
        <div class="preview-switch" aria-label="Preview context">
          <button
            v-for="mode in ['avatar', 'device', 'label', 'interface']"
            :key="mode"
            :class="{ active: previewMode === mode }"
            :aria-pressed="previewMode === mode"
            @click="previewMode = mode"
          >
            {{ mode }}
          </button>
        </div>
        <div v-if="previewMode === 'avatar'" class="avatar-preview">
          <RibbonTreemap :ribbon="ribbon" :aspect-ratio="1" :size="96" />
          <RibbonTreemap
            circular
            :voronoi="layout === 'power'"
            :ribbon="ribbon"
            :aspect-ratio="1"
            :size="64"
          />
          <RibbonTreemap
            circular
            :voronoi="layout === 'power'"
            :ribbon="ribbon"
            :aspect-ratio="1"
            :size="32"
          />
        </div>
        <div v-else-if="previewMode === 'device'" class="device">
          <div class="device-camera"></div>
          <div class="device-symbol">⊞</div>
          <div class="device-label">
            <span>{{ name || "Your identity" }}</span
            ><RibbonStrip :ribbon="ribbon" />
          </div>
        </div>
        <div v-else-if="previewMode === 'label'" class="identity-label">
          <div class="eyebrow">PERSONAL EQUIPMENT / 001</div>
          <h3>{{ name || "Your identity" }}</h3>
          <p>A familiar signature, wherever it goes.</p>
          <RibbonStrip :ribbon="ribbon" />
          <div class="label-bottom">
            <span>THIS ONE IS MINE.</span><span>↗</span>
          </div>
        </div>
        <div v-else class="interface-card">
          <div class="interface-top">
            <span class="device-avatar">▱</span
            ><span class="connected">● Connected</span>
          </div>
          <h3>{{ name || "Your identity" }}</h3>
          <p>Last seen just now</p>
          <RibbonStrip :ribbon="ribbon" />
        </div>
      </div>
    </details>
    <div class="panel-actions">
      <input
        v-model="name"
        maxlength="80"
        placeholder="Name this identity"
        aria-label="Identity name"
      />
      <button class="secondary-button" @click="emit('export')">
        Export SVG ↗
      </button>
      <button class="save-button" @click="emit('save')">
        Save identity <span>+</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.avatar-preview {
  display: flex;
  align-items: center;
  gap: 24px;
}

.layout-controls,
.layout-switch,
.ratio-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}
.layout-switch {
  flex-wrap: wrap;
}
.layout-controls {
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 16px;
  gap: 10px;
}
.layout-controls button {
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 5px 8px;
  background: transparent;
  font-size: 10px;
}
.layout-controls button[aria-pressed="true"] {
  background: #e9eddf;
  border-color: #a4b198;
}
.ratio-controls label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: var(--muted);
}
.ratio-controls input {
  width: 54px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: transparent;
  color: var(--ink);
  font-size: 11px;
  text-align: center;
  appearance: textfield;
}
.ratio-controls input::-webkit-outer-spin-button,
.ratio-controls input::-webkit-inner-spin-button {
  -webkit-appearance: none;
}
.panel-actions {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
  border-top: 1px solid var(--line);
  padding: 14px 18px;
}
.panel-actions input {
  flex: 1 1 140px;
  min-width: 0;
  border: 1px solid transparent;
  border-radius: 5px;
  padding: 10px 11px;
  background: transparent;
  color: var(--ink);
  font-size: 11px;
  outline: none;
}
.panel-actions input:hover {
  border-color: #e0e4d9;
}
.panel-actions input:focus {
  border-color: #8aa486;
  background: #fcfcf7;
}
.panel-actions input::placeholder {
  color: #a0a498;
}
</style>
