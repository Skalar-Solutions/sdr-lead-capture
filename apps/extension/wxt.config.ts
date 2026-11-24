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
      "Capture B2B leads from Google Maps and assess their digital presence for software sales.",
    version: "0.1.0",
    icons: {
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png",
    },
    // Catatan: `key` sengaja belum diisi. Generate sekali sebelum daftar OAuth client
    // supaya extension ID stabil antara dev, staging, dan produksi. Jangan ganti setelah rilis.
    permissions: ["storage", "alarms"],
    optional_host_permissions: ["http://*/*", "https://*/*"],
    host_permissions: [
      "*://www.google.com/maps/*",
      "*://www.google.co.id/maps/*",
      "*://maps.google.com/*",
      "*://maps.google.co.id/*",
    ],
    action: {
      default_title: "SDR Lead Capture",
    },
  },
});
