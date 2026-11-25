/**
 * Bulk scraping dari daftar hasil pencarian Google Maps.
 *
 * Alur: kumpulkan link hasil di panel kiri (`div[role=feed]`) -> auto-scroll
 * sampai batas -> buka tiap tempat satu per satu -> tunggu panel detail -> extract.
 */

import { normalizeName, placeIdFromUrl } from "@/lib/dedupe";

import { cleanText, extractBusinessData, getNameFromUrl, type ScrapedPlace } from "./scraper";

export interface ResultLink {
  name: string;
  href: string;
  placeId: string;
}

const RESULT_LINK_SELECTOR = "div[role='feed'] a.hfpxzc, div[role='feed'] a[href*='/maps/place/']";

export function findFeed(root: ParentNode = document): HTMLElement | null {
  return root.querySelector<HTMLElement>("div[role='feed']");
}

export function collectResultLinks(root: ParentNode = document): ResultLink[] {
  const seen = new Set<string>();
  const links: ResultLink[] = [];

  for (const anchor of Array.from(root.querySelectorAll<HTMLAnchorElement>(RESULT_LINK_SELECTOR))) {
    const href = anchor.href || anchor.getAttribute("href") || "";
    if (!href.includes("/maps/place/")) continue;

    const placeId = placeIdFromUrl(href);
    const key = placeId || href.split("?")[0] || href;
    if (seen.has(key)) continue;
    seen.add(key);

    const name = cleanText(anchor.getAttribute("aria-label")) || getNameFromUrl(href);
    if (!name) continue;
    links.push({ name, href, placeId });
  }

  return links;
}

export function isEndOfList(feed: Element): boolean {
  return /akhir daftar|end of the list/i.test(feed.textContent ?? "");
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

async function waitFor<T>(
  check: () => T | null | undefined,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<T | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (signal?.aborted) return null;
    const value = check();
    if (value) return value;
    await sleep(150, signal);
  }
  return null;
}

/** Auto-scroll daftar hasil sampai jumlah link >= limit atau daftar habis. */
export async function loadResultLinks(
  limit: number,
  signal: AbortSignal,
  onProgress?: (found: number) => void,
): Promise<ResultLink[]> {
  const feed = findFeed();
  if (!feed) return [];

  let links = collectResultLinks();
  onProgress?.(links.length);
  let stagnant = 0;

  while (links.length < limit && stagnant < 3 && !signal.aborted && !isEndOfList(feed)) {
    feed.scrollTo({ top: feed.scrollHeight });
    await sleep(1500, signal);
    const next = collectResultLinks();
    stagnant = next.length > links.length ? 0 : stagnant + 1;
    links = next;
    onProgress?.(links.length);
  }

  feed.scrollTo({ top: 0 });
  return links.slice(0, limit);
}

function findAnchor(link: ResultLink): HTMLAnchorElement | null {
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>(RESULT_LINK_SELECTOR));
  return (
    anchors.find((a) => link.placeId && placeIdFromUrl(a.href) === link.placeId) ??
    anchors.find((a) => a.href === link.href) ??
    anchors.find((a) => normalizeName(a.getAttribute("aria-label")) === normalizeName(link.name)) ??
    null
  );
}

/** Cari panel detail tempat yang judulnya sama dengan nama target. */
function findPlacePanel(targetName: string): ParentNode | null {
  const target = normalizeName(targetName);
  if (!target) return null;

  for (const main of Array.from(document.querySelectorAll("div[role='main']"))) {
    const title = normalizeName(main.querySelector("h1.DUwDvf, h1")?.textContent);
    if (title === target) return main;
  }

  const heading = Array.from(document.querySelectorAll("h1.DUwDvf")).find(
    (h1) => normalizeName(h1.textContent) === target,
  );
  if (!heading) return null;
  return heading.closest("div[role='main']") ?? document;
}

/** Buka satu hasil pencarian lalu extract data lengkapnya. `null` = gagal dibaca. */
export async function openAndExtract(
  link: ResultLink,
  signal: AbortSignal,
): Promise<ScrapedPlace | null> {
  const anchor = findAnchor(link);
  if (!anchor) return null;

  anchor.scrollIntoView({ block: "center" });
  anchor.click();

  const panel = await waitFor(() => findPlacePanel(link.name), 8000, signal);
  if (!panel || signal.aborted) return null;

  // Alamat/telepon/website dimuat sedikit setelah judul.
  await waitFor(
    () => panel.querySelector("button[data-item-id], a[data-item-id='authority']"),
    2500,
    signal,
  );
  await sleep(400, signal);

  const data = extractBusinessData(panel, location.href);
  if (!data.companyName) data.companyName = link.name;
  data.mapsUrl = link.href;
  return data;
}
