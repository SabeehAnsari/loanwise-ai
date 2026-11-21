import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

// Separate from vite.config.js so tests skip the Tailwind plugin and CSS.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    css: false,
    restoreMocks: true,
    env: { VITE_API_URL: "http://api.test" },
  },
})
