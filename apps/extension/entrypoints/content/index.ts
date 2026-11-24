import "@/assets/app.css";

import { PortalContainerProvider } from "@sdr/ui/lib/portal-container";
import { createElement } from "react";
import ReactDOM from "react-dom/client";
import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";

import { extractBusinessData } from "./scraper";
import { ContentApp } from "./ui/ContentApp";

const MAPS_MATCHES = [
  "*://www.google.com/maps/*",
  "*://www.google.co.id/maps/*",
  "*://maps.google.com/*",
  "*://maps.google.co.id/*",
];

interface ScrapeRequest {
  type?: string;
}

export default defineContentScript({
  matches: MAPS_MATCHES,
  runAt: "document_idle",
  cssInjectionMode: "ui",
  async main(ctx) {
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if ((message as ScrapeRequest | undefined)?.type !== "SDR_SCRAPE") return;

      try {
        sendResponse({ ok: true, data: extractBusinessData(document, location.href) });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    const ui = await createShadowRootUi(ctx, {
      name: "sdr-capture-ui",
      position: "overlay",
      anchor: "body",
      onMount(container) {
        const root = ReactDOM.createRoot(container);
        root.render(
          createElement(
            PortalContainerProvider,
            { container },
            createElement(ContentApp),
          ),
        );
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });

    ui.mount();
  },
});
