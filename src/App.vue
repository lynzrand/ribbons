<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  softPreset,
  generateRibbon,
  type Ribbon,
  type RibbonOptions,
} from "@ribbons/core";
import RibbonStrip from "./RibbonStrip.vue";
import RibbonTreemap from "./RibbonTreemap.vue";
import { sliceAndDice } from "@ribbons/core";
import { powerDiagram, powerSvg } from "@ribbons/core";
import RibbonControls from "./RibbonControls.vue";
import RibbonPreview from "./RibbonPreview.vue";

interface SavedIdentity {
  id: string;
  name: string;
  ribbon: Ribbon;
}
const settings = ref<RibbonOptions>(structuredClone(softPreset));
const identityName = ref("Studio laptop");
const activeTab = ref<"explore" | "saved">("explore");
const error = ref("");
const notice = ref("");
const selected = ref(0);
const layout = ref<"strip" | "treemap" | "circle" | "power">("treemap");
const aspectRatio = ref(1);
const rerollOnChange = ref(false);
const variations = ref<Ribbon[]>([]);
const saved = ref<SavedIdentity[]>(readSaved());
const current = computed(() => variations.value[selected.value]);
let noticeTimer: ReturnType<typeof setTimeout>;
let updateTimer: ReturnType<typeof setTimeout>;
// Keep the random stream stable unless automatic rerolling is enabled.
let explorationSeed: string = crypto.randomUUID();

watch(
  settings,
  () => {
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
      if (rerollOnChange.value && !settings.value.seed.trim()) {
        explorationSeed = crypto.randomUUID();
      }
      generate();
    }, 100);
  },
  { deep: true, flush: "sync" },
);

onBeforeUnmount(() => {
  clearTimeout(updateTimer);
  clearTimeout(noticeTimer);
});
function announce(message: string) {
  notice.value = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    notice.value = "";
  }, 3500);
}
function readSaved(): SavedIdentity[] {
  try {
    const entries: unknown = JSON.parse(
      localStorage.getItem("ribbons.identities") ?? "[]",
    );
    if (!Array.isArray(entries)) return [];
    return entries.filter(
      (entry): entry is SavedIdentity =>
        typeof entry?.id === "string" &&
        typeof entry?.name === "string" &&
        Array.isArray(entry?.ribbon?.colors) &&
        entry.ribbon.colors.every(
          (color: unknown) =>
            typeof color === "string" && /^#[\da-f]{6}$/i.test(color),
        ) &&
        Array.isArray(entry.ribbon.widths) &&
        entry.ribbon.widths.length === entry.ribbon.colors.length &&
        entry.ribbon.widths.every(
          (width: unknown) =>
            typeof width === "number" && Number.isFinite(width) && width > 0,
        ) &&
        typeof entry.ribbon.seed === "string" &&
        entry.ribbon.options?.lab &&
        Array.isArray(entry.ribbon.profile?.steps),
    );
  } catch {
    return [];
  }
}
function shuffle() {
  explorationSeed = crypto.randomUUID();
  selected.value = 0;
  generate();
}

function generate() {
  clearTimeout(updateTimer);
  try {
    // The first option uses the exact seed; siblings explore separate stable streams.
    const first = generateRibbon({
      ...settings.value,
      seed: settings.value.seed.trim() || explorationSeed,
    });
    const next = [first];
    for (let index = 1; index < 6; index++) {
      next.push(
        generateRibbon({ ...settings.value, seed: `${first.seed}/${index}` }),
      );
    }
    variations.value = next;
    selected.value = Math.min(selected.value, next.length - 1);
    error.value = "";
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
}
function saveIdentity() {
  if (!current.value) return;
  const entry = {
    id: crypto.randomUUID(),
    name: identityName.value.trim() || "Untitled identity",
    ribbon: current.value,
  };
  const next = [...saved.value, entry];
  try {
    localStorage.setItem("ribbons.identities", JSON.stringify(next));
    saved.value = next;
    announce("Identity saved in this browser.");
  } catch {
    error.value =
      "Browser storage is unavailable. Export your ribbon to keep it.";
  }
}
function removeIdentity(id: string) {
  const next = saved.value.filter((entry) => entry.id !== id);
  try {
    localStorage.setItem("ribbons.identities", JSON.stringify(next));
    saved.value = next;
  } catch {
    error.value = "Could not update browser storage.";
  }
}
function openIdentity(entry: SavedIdentity) {
  settings.value = {
    contrast: 0.5,
    chromaAffinity: 1,
    primaryAffinity: 0.5,
    ...entry.ribbon.options,
    lab: { ...entry.ribbon.options.lab },
  };
  // Loading a fixed identity must not schedule a replacement batch.
  clearTimeout(updateTimer);
  explorationSeed = entry.ribbon.seed;
  identityName.value = entry.name;
  variations.value = [entry.ribbon];
  selected.value = 0;
  activeTab.value = "explore";
}
function download(format: "svg" | "json") {
  if (!current.value) return;
  const ribbon = current.value;
  let content: string;
  if (format === "json")
    content = JSON.stringify({ name: identityName.value, ...ribbon }, null, 2);
  else if (layout.value === "power") {
    const diagram = powerDiagram(ribbon.widths, ribbon.seed);
    content = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1 1">${powerSvg(diagram, ribbon.colors, "avatar")}</svg>`;
  } else {
    const width = 1000;
    const height =
      layout.value === "circle"
        ? width
        : layout.value === "treemap"
          ? width / aspectRatio.value
          : 40;
    const tiles =
      layout.value !== "strip"
        ? sliceAndDice(
            ribbon.widths,
            width,
            height,
            layout.value === "circle" ? "circle" : "rectangle",
          )
        : ribbon.widths.map((weight, index) => ({
            x:
              ribbon.widths
                .slice(0, index)
                .reduce((sum, value) => sum + value, 0) * width,
            y: 0,
            width: weight * width,
            height,
          }));
    const rectangles = tiles.map(
      (tile, index) =>
        `<rect x="${tile.x}" y="${tile.y}" width="${tile.width}" height="${tile.height}" fill="${ribbon.colors[index]}"/>`,
    );
    const clip =
      layout.value === "circle"
        ? `<defs><clipPath id="disk"><circle cx="${width / 2}" cy="${height / 2}" r="${width / 2}"/></clipPath></defs>`
        : "";
    content = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${clip}<g${clip ? ' clip-path="url(#disk)"' : ""}>${rectangles.join("")}</g></svg>`;
  }
  const url = URL.createObjectURL(
    new Blob([content], {
      type: format === "svg" ? "image/svg+xml" : "application/json",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${identityName.value.trim().replace(/[^a-z0-9_-]/gi, "-") || "ribbon"}.${format}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function copySeed() {
  if (!current.value) return;
  settings.value.seed = current.value.seed;
  clearTimeout(updateTimer);
  try {
    await navigator.clipboard.writeText(settings.value.seed);
    announce("Seed copied and locked for the next generation.");
  } catch {
    announce("Seed placed in the seed field for reuse.");
  }
}
generate();
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <a href="#" class="brand" aria-label="Ribbons home"
        ><span class="brand-icon"><i></i><i></i><i></i></span>ribbons<span
          class="beta"
          >LAB</span
        ></a
      >
      <nav aria-label="Main navigation">
        <button
          :class="{ active: activeTab === 'explore' }"
          @click="activeTab = 'explore'"
        >
          Playground
        </button>
        <button
          :class="{ active: activeTab === 'saved' }"
          @click="activeTab = 'saved'"
        >
          Saved identities
          <span>{{ saved.length.toString().padStart(2, "0") }}</span>
        </button>
      </nav>
      <span class="version"><span class="status-dot"></span> OKLab</span>
    </header>

    <main>
      <div v-if="activeTab === 'explore'" class="workspace">
        <RibbonControls
          v-model="settings"
          v-model:name="identityName"
          v-model:reroll-on-change="rerollOnChange"
          @generate="shuffle"
        />

        <section v-if="current" class="results">
          <RibbonPreview
            v-model:layout="layout"
            v-model:aspect-ratio="aspectRatio"
            :ribbon="current"
            :identity-name="identityName"
          />
          <div class="variation-grid">
            <button
              v-for="(ribbon, index) in variations"
              :key="ribbon.seed"
              class="variation"
              :class="{ selected: selected === index }"
              :aria-pressed="selected === index"
              @click="selected = index"
            >
              <div>
                <span
                  >VARIATION {{ (index + 1).toString().padStart(2, "0") }}</span
                ><span class="selection-check">{{
                  selected === index ? "✓" : "↗"
                }}</span>
              </div>
              <RibbonTreemap
                v-if="layout !== 'strip'"
                :circular="layout === 'circle'"
                :voronoi="layout === 'power'"
                :ribbon="ribbon"
                :aspect-ratio="aspectRatio"
                :size="64"
              />
              <RibbonStrip v-else :ribbon="ribbon" />
            </button>
          </div>
          <div class="selection-actions">
            <div>
              <button class="secondary-button" @click="download('svg')">
                Export SVG ↗</button
              ><button class="save-button" @click="saveIdentity">
                Save identity <span>+</span>
              </button>
            </div>
          </div>
          <details class="diagnostics">
            <summary>Details</summary>
            <div class="diagnostic-body">
              <div class="seed-detail">
                <span>Seed</span><code>{{ current.seed }}</code
                ><button class="text-button" @click="copySeed">
                  Reuse & copy
                </button>
              </div>
              <p>
                Shell chance
                {{ Math.round(current.profile.shellChance * 100) }}% · radius
                {{ current.profile.radius.toFixed(3) }} · band
                {{ current.profile.band.toFixed(3) }}
              </p>
              <ol>
                <li>Primary: {{ current.generatedColors[0] }}</li>
                <li v-for="(step, index) in current.profile.steps" :key="index">
                  {{ current.generatedColors[index + 1] }} —
                  {{
                    step.sampler === "shell"
                      ? `shell around color ${step.parent + 1}`
                      : `conditional · ${step.eligible} eligible candidates`
                  }}
                </li>
              </ol>

              <button class="secondary-button" @click="download('json')">
                Export JSON ↗
              </button>
            </div>
          </details>
        </section>
      </div>
      <section v-else-if="activeTab === 'saved'" class="saved-section">
        <div class="panel-heading">
          <h2>Your saved identities</h2>
          <span>{{ saved.length }} IN THIS BROWSER</span>
        </div>
        <div v-if="!saved.length" class="empty-state">
          <span class="empty-icon">▰</span>
          <h2>A place for your signatures.</h2>
          <p>Choose a ribbon in the playground and save it here.</p>
          <button class="save-button" @click="activeTab = 'explore'">
            Explore ribbons ↗
          </button>
        </div>
        <div v-else class="saved-grid">
          <article
            v-for="entry in saved"
            :key="entry.id"
            class="saved-card panel"
          >
            <RibbonStrip :ribbon="entry.ribbon" />
            <h3>{{ entry.name }}</h3>
            <p>{{ entry.ribbon.colors.length }} colors · fixed identity</p>
            <div>
              <button class="text-button" @click="openIdentity(entry)">
                Open ribbon ↗</button
              ><button
                class="text-button remove-button"
                :aria-label="`Remove ${entry.name}`"
                @click="removeIdentity(entry.id)"
              >
                Remove
              </button>
            </div>
          </article>
        </div>
      </section>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </main>
    <div v-if="notice" class="toast" role="status">{{ notice }}</div>
  </div>
</template>
