import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: /api calls proxy to the Flask backend, so no CORS config is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:5001",
    },
  },
});
