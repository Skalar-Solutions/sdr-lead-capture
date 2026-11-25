import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: "SDR Lead Capture",
    description:
      "Capture B2B leads from Google Maps, score their digital presence, and export to CSV. Fully offline.",
    version: "1.0.1",
    icons: {
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png",
    },
    // Sengaja minimal: extension ini tidak kirim data ke mana pun.
    permissions: ["storage"],
    host_permissions: [
      "*://www.google.com/maps/*",
      "*://www.google.co.id/maps/*",
      "*://maps.google.com/*",
      "*://maps.google.co.id/*",
    ],
    options_ui: {
      page: "dashboard.html",
      open_in_tab: true,
    },
    action: {
      default_title: "SDR Lead Capture",
    },
  },
});
