<script setup lang="ts">
import { ref } from "vue";
import type { Ribbon } from "./sampler";
import RibbonStrip from "./RibbonStrip.vue";

defineProps<{ ribbon: Ribbon; identityName: string }>();
const previewMode = ref("device");
</script>

<template>
  <div class="preview-panel panel">
    <div class="selected-ribbon">
      <RibbonStrip :ribbon="ribbon" mark-primary />
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
            v-for="mode in ['device', 'label', 'interface']"
            :key="mode"
            :class="{ active: previewMode === mode }"
            @click="previewMode = mode"
          >
            {{ mode }}
          </button>
        </div>
        <div v-if="previewMode === 'device'" class="device">
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
