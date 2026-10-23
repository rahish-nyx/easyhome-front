import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
  },
  build: {
    target: "es2020",
    sourcemap: false,
    cssCodeSplit: true,
    // The Firebase vendor chunk is intentionally kept together and shipped
    // compressed (~195 kB gzip). Splitting it would duplicate SDK internals.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("firebase")) return "firebase";
          if (id.includes("react-router")) return "router";
          if (id.includes("react-dom") || id.includes("/react/")) return "react";
          if (id.includes("lucide-react")) return "icons";
          return undefined;
        },
      },
    },
  },
});
