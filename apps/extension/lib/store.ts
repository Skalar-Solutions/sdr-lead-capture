import { browser } from "wxt/browser";

import type { Capture } from "./capture";
import { isDuplicate } from "./dedupe";

const CAPTURES_KEY = "sdr_captures";

export async function readCaptures(): Promise<Capture[]> {
  const stored = await browser.storage.local.get(CAPTURES_KEY);
  const value = stored[CAPTURES_KEY];
  return Array.isArray(value) ? (value as Capture[]) : [];
}

export async function writeCaptures(captures: Capture[]): Promise<void> {
  await browser.storage.local.set({ [CAPTURES_KEY]: captures });
}

export async function addCapture(capture: Capture): Promise<number> {
  const captures = await readCaptures();
  const next = [capture, ...captures];
  await writeCaptures(next);
  return next.length;
}

export async function countCaptures(): Promise<number> {
  return (await readCaptures()).length;
}

/** Simpan satu capture kalau belum ada (cek Place ID / nama+alamat). */
export async function addCaptureIfNew(
  capture: Capture,
): Promise<{ added: boolean; count: number }> {
  const captures = await readCaptures();
  if (isDuplicate(capture, captures)) return { added: false, count: captures.length };
  const next = [capture, ...captures];
  await writeCaptures(next);
  return { added: true, count: next.length };
}

/** Simpan banyak capture sekaligus, duplikat dilewati. */
export async function addManyCaptures(
  items: readonly Capture[],
): Promise<{ added: number; skipped: number; count: number }> {
  const captures = await readCaptures();
  const fresh: Capture[] = [];
  for (const item of items) {
    if (isDuplicate(item, captures) || isDuplicate(item, fresh)) continue;
    fresh.push(item);
  }
  const next = [...fresh, ...captures];
  if (fresh.length > 0) await writeCaptures(next);
  return { added: fresh.length, skipped: items.length - fresh.length, count: next.length };
}

export async function updateBadge(count: number): Promise<void> {
  await browser.action.setBadgeBackgroundColor({ color: "#4f46e5" });
  await browser.action.setBadgeText({ text: count > 0 ? String(count) : "" });
}

export async function openDashboard(): Promise<void> {
  await browser.tabs.create({ url: browser.runtime.getURL("/dashboard.html") });
}
