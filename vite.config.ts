import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/content.ts",
      formats: ["iife"],
      name: "FurunaviUnitPrice",
      fileName: () => "content.js",
    },
    outDir: "dist",
    emptyOutDir: true,
  },
});
