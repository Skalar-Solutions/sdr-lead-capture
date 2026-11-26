import { browser } from "wxt/browser";

import { isDuplicateCapture, normalizeCapture, type Capture } from "./capture";

const CAPTURES_KEY = "sdr_captures";

/** Content scripts have no tabs API, so they ask the background worker to open the dashboard. */
export const OPEN_DASHBOARD_MESSAGE = "SDR_OPEN_DASHBOARD";

export interface AddCaptureResult {
  count: number;
  duplicate: boolean;
}

export async function readCaptures(): Promise<Capture[]> {
  const stored = await browser.storage.local.get(CAPTURES_KEY);
  const value = stored[CAPTURES_KEY];
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => normalizeCapture(item));
}

export async function writeCaptures(captures: Capture[]): Promise<void> {
  await browser.storage.local.set({ [CAPTURES_KEY]: captures });
}

export async function addCapture(capture: Capture): Promise<AddCaptureResult> {
  const captures = await readCaptures();

  if (isDuplicateCapture(captures, capture)) {
    return { count: captures.length, duplicate: true };
  }

  const next = [capture, ...captures];
  await writeCaptures(next);
  return { count: next.length, duplicate: false };
}

export async function addCaptureIfNew(
  capture: Capture,
): Promise<{ added: boolean; count: number }> {
  const result = await addCapture(capture);
  return { added: !result.duplicate, count: result.count };
}

export async function addManyCaptures(
  items: readonly Capture[],
): Promise<{ added: number; skipped: number; count: number }> {
  const captures = await readCaptures();
  const fresh: Capture[] = [];

  for (const item of items) {
    if (isDuplicateCapture(captures, item) || isDuplicateCapture(fresh, item)) continue;
    fresh.push(item);
  }

  if (fresh.length > 0) await writeCaptures([...fresh, ...captures]);

  return {
    added: fresh.length,
    skipped: items.length - fresh.length,
    count: captures.length + fresh.length,
  };
}

export async function countCaptures(): Promise<number> {
  return (await readCaptures()).length;
}

export async function updateBadge(count: number): Promise<void> {
  await browser.action.setBadgeBackgroundColor({ color: "#111111" });
  await browser.action.setBadgeText({ text: count > 0 ? String(count) : "" });
}

export async function openDashboard(): Promise<void> {
  if (typeof browser.tabs?.create === "function") {
    await browser.tabs.create({ url: browser.runtime.getURL("/dashboard.html") });
    return;
  }

  await browser.runtime.sendMessage({ type: OPEN_DASHBOARD_MESSAGE });
}
