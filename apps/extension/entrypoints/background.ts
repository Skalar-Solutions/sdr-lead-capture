import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

import { countOutbox, syncOutbox, updateBadge } from "@/lib/sync";

const ALARM_NAME = "sdr-sync";
const SYNC_PERIOD_MINUTES = 1;

async function ensureAlarm(): Promise<void> {
  await browser.alarms.create(ALARM_NAME, { periodInMinutes: SYNC_PERIOD_MINUTES });
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async () => {
    const { sdr_outbox } = await browser.storage.local.get("sdr_outbox");
    if (!Array.isArray(sdr_outbox)) {
      await browser.storage.local.set({ sdr_outbox: [] });
    }
    await ensureAlarm();
    await updateBadge(await countOutbox());
  });

  browser.runtime.onStartup.addListener(() => {
    void ensureAlarm();
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) void syncOutbox();
  });

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const type = (message as { type?: string } | undefined)?.type;

    if (type === "SDR_SYNC_NOW") {
      void syncOutbox().then((summary) => sendResponse(summary));
      return true;
    }

    return undefined;
  });

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.sdr_outbox) return;
    const next = changes.sdr_outbox.newValue;
    void updateBadge(Array.isArray(next) ? next.length : 0);
  });
});
