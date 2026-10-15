<script setup lang="ts">
import { ref } from "vue";
import type { Ribbon } from "./sampler";
import RibbonStrip from "./RibbonStrip.vue";
import RibbonTreemap from "./RibbonTreemap.vue";

defineProps<{ ribbon: Ribbon; identityName: string }>();
const previewMode = ref("avatar");
const layout = defineModel<"strip" | "treemap">("layout", { required: true });
const aspectRatio = defineModel<number>("aspectRatio", { required: true });
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
        v-if="layout === 'treemap'"
        :ribbon="ribbon"
        :aspect-ratio="aspectRatio"
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
            @click="previewMode = mode"
          >
            {{ mode }}
          </button>
        </div>
        <div v-if="previewMode === 'avatar'" class="avatar-preview">
          <RibbonTreemap :ribbon="ribbon" :aspect-ratio="1" :size="96" />
          <RibbonTreemap
            class="round-avatar"
            :ribbon="ribbon"
            :aspect-ratio="1"
            :size="64"
          />
          <RibbonTreemap
            class="round-avatar"
            :ribbon="ribbon"
            :aspect-ratio="1"
            :size="32"
          />
        </div>
        <div v-else-if="previewMode === 'device'" class="device">
          <div class="device-camera"></div>
          <div class="device-symbol">⊞</div>
          <div class="device-label">
            <span>{{ identityName || "Your identity" }}</span
            ><RibbonStrip :ribbon="ribbon" />
          </div>
        </div>
        <div v-else-if="previewMode === 'label'" class="identity-label">
          <div class="eyebrow">PERSONAL EQUIPMENT / 001</div>
          <h3>{{ identityName || "Your identity" }}</h3>
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
          <h3>{{ identityName || "Your identity" }}</h3>
          <p>Last seen just now</p>
          <RibbonStrip :ribbon="ribbon" />
        </div>
      </div>
    </details>
  </div>
</template>

<style scoped>
.avatar-preview {
  display: flex;
  align-items: center;
  gap: 24px;
}
.avatar-preview .round-avatar {
  border-radius: 50%;
}

.layout-controls,
.layout-switch,
.ratio-controls {
  display: flex;
  align-items: center;
  gap: 6px;
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
  width: 60px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: transparent;
  color: var(--ink);
  font-size: 11px;
}
</style>
