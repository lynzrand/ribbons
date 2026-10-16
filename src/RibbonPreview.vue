<script setup lang="ts">
import { ref } from 'vue'
import type { Ribbon } from '@ribbons/core'
import RibbonStrip from './RibbonStrip.vue'
import RibbonTreemap from './RibbonTreemap.vue'

defineProps<{ ribbon: Ribbon }>()
const previewMode = ref('avatar')
const layout = defineModel<'strip' | 'treemap' | 'circle' | 'power' | 'donut'>('layout', {
  required: true,
})
const aspectRatio = defineModel<number>('aspectRatio', { required: true })
const name = defineModel<string>('name', { required: true })
const emit = defineEmits<{
  export: [format: 'svg' | 'json']
  save: []
  copyColor: [color: string]
  copyPalette: []
}>()
function setRatio(event: Event) {
  const value = (event.target as HTMLInputElement).valueAsNumber
  if (Number.isFinite(value) && value > 0) aspectRatio.value = value
}
</script>

<template>
  <div class="preview-panel panel">
    <div class="selected-ribbon">
      <div class="layout-controls">
        <div class="layout-switch" aria-label="Layout">
          <button :aria-pressed="layout === 'strip'" @click="layout = 'strip'">Ribbon</button>
          <button :aria-pressed="layout === 'treemap'" @click="layout = 'treemap'">Treemap</button>
          <button :aria-pressed="layout === 'circle'" @click="layout = 'circle'">Circle</button>
          <button :aria-pressed="layout === 'power'" @click="layout = 'power'">Power</button>
          <button :aria-pressed="layout === 'donut'" @click="layout = 'donut'">Donut</button>
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
        :donut="layout === 'donut'"
        :ribbon="ribbon"
        :aspect-ratio="aspectRatio"
        :size="360"
      />
      <RibbonStrip v-else :ribbon="ribbon" mark-primary />
      <div class="color-legend">
        <button
          v-for="(color, index) in ribbon.colors"
          :key="index"
          class="color-chip"
          :title="`Copy ${color}`"
          @click="emit('copyColor', color)"
        >
          <span :style="{ background: color }"></span><code>{{ color }}</code
          ><small
            >{{ Math.round(ribbon.widths[index]! * 100) }}%
            {{ index === ribbon.primaryIndex ? '★' : '' }}</small
          >
        </button>
        <span class="legend-actions">
          <button class="text-button" @click="emit('copyPalette')">Copy palette</button>
          <button class="text-button" @click="emit('export', 'json')">JSON ↗</button>
        </span>
      </div>
    </div>
    <details class="context-preview" open>
      <summary>In context</summary>
      <div class="preview-stage">
        <div class="preview-switch" aria-label="Preview context">
          <button
            v-for="mode in [
              { id: 'avatar', label: 'Avatar' },
              { id: 'interface', label: 'UI' },
              { id: 'device', label: 'Devices' },
              { id: 'label', label: 'Label' },
              { id: 'square-label', label: 'Label (square)' },
            ]"
            :key="mode.id"
            :class="{ active: previewMode === mode.id }"
            :aria-pressed="previewMode === mode.id"
            @click="previewMode = mode.id"
          >
            {{ mode.label }}
          </button>
        </div>
        <div v-if="previewMode === 'avatar'" class="avatar-context">
          <article v-for="shape in ['power', 'square']" :key="shape" class="profile-mock">
            <div class="profile-cover"></div>
            <div class="profile-body">
              <RibbonTreemap
                :voronoi="shape === 'power'"
                :ribbon="ribbon"
                :aspect-ratio="1"
                :size="72"
                class="profile-avatar"
                :style="{ borderRadius: shape === 'power' ? '50%' : '4px' }"
              />
              <h3>{{ name || 'Alex Morgan' }}</h3>
              <p>Designer &amp; maker · Shanghai</p>
              <div class="profile-divider"></div>
              <div class="profile-message">
                <RibbonTreemap
                  :voronoi="shape === 'power'"
                  :ribbon="ribbon"
                  :aspect-ratio="1"
                  :size="28"
                />
                <div>
                  <strong>{{ name || 'Alex' }} <small>Just now</small></strong>
                  <p>A little color, wherever I go.</p>
                </div>
              </div>
            </div>
          </article>
        </div>
        <div v-else-if="previewMode === 'device'" class="device">
          <div class="device-camera"></div>
          <div class="device-symbol">⊞</div>
          <div class="device-label">
            <span>{{ name || 'Your identity' }}</span
            ><RibbonStrip :ribbon="ribbon" />
          </div>
        </div>
        <div v-else-if="previewMode === 'label'" class="identity-label">
          <div class="eyebrow">PERSONAL EQUIPMENT / 001</div>
          <h3>{{ name || 'Your identity' }}</h3>
          <p>A familiar signature, wherever it goes.</p>
          <RibbonStrip :ribbon="ribbon" style="height: 5px" />
        </div>
        <div v-else-if="previewMode === 'square-label'" class="square-label">
          <div class="eyebrow">PERSONAL EQUIPMENT</div>
          <h3>{{ name || 'Studio laptop' }}</h3>
          <p>If found, please return.</p>
          <RibbonTreemap :ribbon="ribbon" :aspect-ratio="1" :size="24" />
        </div>
        <div v-else class="interface-card">
          <div class="interface-top">
            <span class="eyebrow">PERSONAL SPACE</span>
            <span class="connected">● Connected</span>
          </div>
          <h3>{{ name || 'Welcome back, Alex' }}</h3>
          <p>Everything you need for the day ahead.</p>
          <RibbonStrip :ribbon="ribbon" />
          <div class="mock-navigation">
            <span>Overview</span><span>Activity</span><span>Files</span>
          </div>
          <div class="mock-project">
            <strong>Today’s workspace</strong><span>All changes saved</span>
          </div>
          <div class="mock-line"></div>
          <div class="mock-line short"></div>
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
      <button class="text-button" @click="emit('export', 'svg')">Export SVG ↗</button>
      <button class="save-button" @click="emit('save')">Save identity <span>+</span></button>
    </div>
  </div>
</template>

<style scoped>
.avatar-context {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  width: min(calc(100% - 32px), 580px);
  margin: 76px 16px 32px;
}
.profile-mock {
  overflow: hidden;
  border: 1px solid #dfe3d8;
  border-radius: 10px;
  background: #fdfdf8;
  box-shadow: 0 8px 24px #41503510;
}
.profile-cover {
  height: 60px;
  background: linear-gradient(120deg, #dee6dc, #eff0e7);
}
.profile-body {
  padding: 0 16px 18px;
}
.profile-body > .profile-avatar {
  margin: -30px 0 12px;
  position: relative;
  outline: 4px solid #fdfdf8;
}
.profile-body h3 {
  font-size: 14px;
  overflow-wrap: anywhere;
}
.profile-body p {
  font-size: 10px;
  color: var(--muted);
  margin: 7px 0 0;
}
.profile-divider {
  height: 1px;
  background: var(--line);
  margin: 18px 0;
}
.profile-message {
  display: flex;
  gap: 9px;
  align-items: flex-start;
}
.profile-message > .ribbon-treemap {
  margin: 0;
  flex-shrink: 0;
}
.profile-message > div {
  min-width: 0;
  overflow-wrap: anywhere;
}
.profile-message strong {
  font-size: 10px;
}
.profile-message small {
  font-size: 8px;
  font-weight: normal;
  color: var(--muted);
}
.square-label {
  display: flex;
  flex-direction: column;
  width: min(180px, calc(100% - 40px));
  min-height: 180px;
  padding: 18px;
  margin: 76px 20px 32px;
  background: #fdfdf8;
  border: 1px solid #d7ddcc;
  border-radius: 4px;
  box-shadow: 0 8px 24px #41503518;
}
.square-label h3 {
  margin: 12px 0 6px;
  font-size: 16px;
  overflow-wrap: anywhere;
}
.square-label p {
  font-size: 10px;
  color: var(--muted);
}
.square-label > .ribbon-treemap {
  flex-shrink: 0;
  margin: auto 0 0;
}
.square-label p {
  margin-bottom: 20px;
}
.mock-navigation {
  display: flex;
  gap: 20px;
  margin: 22px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
  font-size: 10px;
  color: var(--muted);
}
.mock-navigation span:first-child {
  color: var(--ink);
}
.mock-project {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 11px;
}
.mock-project span {
  font-size: 9px;
  color: var(--muted);
}
.mock-line {
  height: 6px;
  margin-top: 14px;
  border-radius: 3px;
  background: #ecefe5;
}
.mock-line.short {
  width: 65%;
  margin-top: 8px;
}
.context-preview .preview-switch {
  width: max-content;
  max-width: calc(100% - 16px);
  flex-wrap: wrap;
  justify-content: center;
}
.context-preview .preview-switch button {
  padding-inline: 10px;
}
@media (max-width: 480px) {
  .avatar-context {
    grid-template-columns: minmax(0, 1fr);
    max-width: 280px;
    margin-top: 96px;
  }
  .square-label {
    margin-top: 96px;
  }
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
.layout-controls button[aria-pressed='true'] {
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
