import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";

import { extractBusinessData } from "./scraper";

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
  main() {
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
  },
});
