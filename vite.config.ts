import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@ribbons/core": fileURLToPath(
        new URL("./packages/ribbon-core/src/index.ts", import.meta.url),
      ),
    },
  },
});
