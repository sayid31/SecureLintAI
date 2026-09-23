import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Proxy /api → backend supaya tidak kena CORS saat dev.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:4000",
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split vendor besar supaya cache browser stabil + kurangi chunk utama.
        manualChunks: {
          react: ["react", "react-dom"],
          recharts: ["recharts"],
          monaco: ["monaco-editor", "@monaco-editor/react"],
        },
      },
    },
  },
});
