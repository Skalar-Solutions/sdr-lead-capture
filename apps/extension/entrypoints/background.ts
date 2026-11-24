import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async () => {
    const { sdr_outbox } = await browser.storage.local.get("sdr_outbox");
    if (!Array.isArray(sdr_outbox)) {
      await browser.storage.local.set({ sdr_outbox: [] });
    }
  });
});
