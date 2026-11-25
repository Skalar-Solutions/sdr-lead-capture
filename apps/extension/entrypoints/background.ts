import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

import { countCaptures, readCaptures, updateBadge } from "@/lib/store";

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async () => {
    await readCaptures();
    await updateBadge(await countCaptures());
  });

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.sdr_captures) return;
    const next = changes.sdr_captures.newValue;
    void updateBadge(Array.isArray(next) ? next.length : 0);
  });
});
