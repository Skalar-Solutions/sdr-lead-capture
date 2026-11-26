import type { ScrapedPlace } from "@/entrypoints/content/scraper";

export interface Capture {
  id: string;
  capturedAt: string;
  companyName: string;
  category: string;
  address: string;
  phone: string;
  website: string;
  socialType: string | null;
  socialUrl: string;
  instagram: string;
  rating: string;
  reviewsCount: string;
  mapsUrl: string;
  isSocialMediaOnly: boolean;
}

export function toCapture(place: ScrapedPlace): Capture {
  return {
    id: crypto.randomUUID(),
    capturedAt: new Date().toISOString(),
    companyName: place.companyName.trim(),
    category: place.category,
    address: place.address,
    phone: place.phone,
    website: place.website,
    socialType: place.socialType,
    socialUrl: place.socialUrl,
    instagram: place.instagramHandle,
    rating: place.rating,
    reviewsCount: place.reviewsCount,
    mapsUrl: place.mapsUrl,
    isSocialMediaOnly: place.isSocialMediaOnly,
  };
}

export function hasRealWebsite(capture: Capture): boolean {
  return capture.website.trim() !== "";
}

/**
 * Minimal satu sinyal bisnis selain nama. Mencegah baris sampah (mis. heading
 * "Hasil" dari halaman pencarian) ikut tersimpan.
 */
export function isCaptureUseful(
  capture: Pick<Capture, "companyName" | "category" | "address" | "phone" | "website" | "socialUrl">,
): boolean {
  return Boolean(
    capture.companyName.trim() &&
      (capture.category || capture.address || capture.phone || capture.website || capture.socialUrl),
  );
}

const PLACE_ID_RE = /!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i;

/**
 * Kunci identitas tempat untuk dedupe.
 *
 * Prioritas:
 * 1. Place ID dari parameter `data` (paling akurat, unik per cabang).
 * 2. `cid` / `place_id` kalau ada.
 * 3. Slug nama tempat dari path, supaya URL dengan koordinat berbeda tetap
 *    dianggap tempat yang sama.
 */
export function normalizeMapsUrl(url: string): string {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    if (!/google\./i.test(parsed.hostname)) return "";

    const placeId = url.match(PLACE_ID_RE)?.[1];
    if (placeId) return `place:${placeId.toLowerCase()}`;

    const cid = parsed.searchParams.get("cid");
    if (cid) return `cid:${cid}`;

    const explicitPlaceId =
      parsed.searchParams.get("place_id") ?? parsed.searchParams.get("query_place_id");
    if (explicitPlaceId) return `pid:${explicitPlaceId.toLowerCase()}`;

    if (!parsed.pathname.startsWith("/maps/place/")) return "";

    let slug = parsed.pathname.slice("/maps/place/".length);
    const atIndex = slug.indexOf("/@");
    if (atIndex >= 0) slug = slug.slice(0, atIndex);
    const dataIndex = slug.indexOf("/data=");
    if (dataIndex >= 0) slug = slug.slice(0, dataIndex);

    slug = decodeURIComponent(slug)
      .replace(/\+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\/+$/, "")
      .trim()
      .toLowerCase();

    return slug ? `slug:${slug}` : "";
  } catch {
    return "";
  }
}

export function captureIdentity(
  capture: Pick<Capture, "companyName" | "address" | "phone" | "mapsUrl">,
): string {
  const placeKey = normalizeMapsUrl(capture.mapsUrl);
  if (placeKey) return placeKey;

  const name = capture.companyName.trim().toLowerCase().replace(/\s+/g, " ");
  if (!name) return "";

  const phone = capture.phone.replace(/\D/g, "");
  const address = capture.address.trim().toLowerCase().replace(/\s+/g, " ");
  return `fallback:${name}|${phone}|${address}`;
}

export function isDuplicateCapture(existing: readonly Capture[], candidate: Capture): boolean {
  const key = captureIdentity(candidate);
  if (!key) return false;
  return existing.some((capture) => captureIdentity(capture) === key);
}
