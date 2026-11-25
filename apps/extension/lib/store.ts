import { browser } from "wxt/browser";

import type { Capture } from "./capture";

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

export async function updateBadge(count: number): Promise<void> {
  await browser.action.setBadgeBackgroundColor({ color: "#4f46e5" });
  await browser.action.setBadgeText({ text: count > 0 ? String(count) : "" });
}

export async function openDashboard(): Promise<void> {
  await browser.tabs.create({ url: browser.runtime.getURL("/dashboard.html") });
}
