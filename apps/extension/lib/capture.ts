import type { ScrapedPlace } from "@/entrypoints/content/scraper";

export type WebsiteStatus = "none" | "outdated" | "bad-ux" | "decent";

export const WEBSITE_STATUS_OPTIONS: readonly { id: WebsiteStatus; label: string }[] = [
  { id: "none", label: "Tidak Ada" },
  { id: "outdated", label: "Outdated" },
  { id: "bad-ux", label: "Bad UX" },
  { id: "decent", label: "Lumayan" },
] as const;

export const DIGITAL_GAP_OPTIONS = [
  { id: "no_website", label: "Tanpa Website" },
  { id: "not_mobile_friendly", label: "Not Mobile-Friendly" },
  { id: "no_online_ordering", label: "No Online Order" },
  { id: "social_media_only", label: "Sosmed Only" },
  { id: "no_seo", label: "No SEO" },
  { id: "no_online_payment", label: "No Payment" },
] as const;

export const SERVICE_OPTIONS = [
  { id: "website_dev", label: "Web Dev" },
  { id: "ecommerce", label: "E-Commerce" },
  { id: "uiux_redesign", label: "Redesign" },
  { id: "mobile_app", label: "Mobile App" },
  { id: "custom_software", label: "Custom SW" },
  { id: "seo", label: "SEO" },
] as const;

const VALID_WEBSITE_STATUSES = new Set<WebsiteStatus>(["none", "outdated", "bad-ux", "decent"]);

export function websiteStatusLabel(status: WebsiteStatus): string {
  return WEBSITE_STATUS_OPTIONS.find((item) => item.id === status)?.label ?? status;
}

export function digitalGapLabel(id: string): string {
  return DIGITAL_GAP_OPTIONS.find((item) => item.id === id)?.label ?? id.replace(/_/g, " ");
}

export function serviceLabel(id: string): string {
  return SERVICE_OPTIONS.find((item) => item.id === id)?.label ?? id.replace(/_/g, " ");
}

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

  // SDR Evaluation & Tagging
  websiteStatus: WebsiteStatus;
  digitalGaps: string[];
  services: string[];
  priority: number;
  picName?: string;
  picRole?: string;
  notes?: string;
  whatsapp?: string;
}

function defaultDigitalGaps(hasWebsite: boolean, isSocialMediaOnly: boolean): string[] {
  const gaps: string[] = [];
  if (!hasWebsite) gaps.push("no_website");
  if (isSocialMediaOnly) gaps.push("social_media_only");
  return gaps;
}

export function toCapture(place: ScrapedPlace): Capture {
  const hasWebsite = place.isRealWebsite && place.website.trim() !== "";
  const websiteStatus: WebsiteStatus = hasWebsite ? "decent" : "none";

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

    websiteStatus,
    digitalGaps: defaultDigitalGaps(hasWebsite, place.isSocialMediaOnly),
    services: ["website_dev"],
    priority: hasWebsite ? 3 : 5,
    picName: "",
    picRole: "",
    notes: place.isSocialMediaOnly
      ? `Hanya ada link ${place.socialType}: ${place.socialUrl}`
      : "",
    whatsapp: place.phone,
  };
}

/**
 * Normalisasi data capture dari chrome.storage.local agar record lama
 * (sebelum fitur SDR tagging) tetap aman dibaca tanpa crash.
 */
export function normalizeCapture(raw: Partial<Capture> & Record<string, unknown>): Capture {
  const website = typeof raw.website === "string" ? raw.website : "";
  const isSocialMediaOnly = Boolean(raw.isSocialMediaOnly);
  const phone = typeof raw.phone === "string" ? raw.phone : "";
  const hasWebsite = website.trim() !== "" && !isSocialMediaOnly;

  const websiteStatus: WebsiteStatus =
    typeof raw.websiteStatus === "string" &&
    VALID_WEBSITE_STATUSES.has(raw.websiteStatus as WebsiteStatus)
      ? (raw.websiteStatus as WebsiteStatus)
      : hasWebsite
        ? "decent"
        : "none";

  const digitalGaps = Array.isArray(raw.digitalGaps)
    ? raw.digitalGaps.filter((item): item is string => typeof item === "string")
    : defaultDigitalGaps(hasWebsite, isSocialMediaOnly);

  const services = Array.isArray(raw.services)
    ? raw.services.filter((item): item is string => typeof item === "string")
    : ["website_dev"];

  const priority =
    typeof raw.priority === "number" && Number.isFinite(raw.priority) && raw.priority >= 1 && raw.priority <= 5
      ? Math.round(raw.priority)
      : hasWebsite
        ? 3
        : 5;

  const whatsapp =
    typeof raw.whatsapp === "string" && raw.whatsapp.trim() !== "" ? raw.whatsapp : phone;

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : crypto.randomUUID(),
    capturedAt:
      typeof raw.capturedAt === "string" && raw.capturedAt
        ? raw.capturedAt
        : new Date().toISOString(),
    companyName: typeof raw.companyName === "string" ? raw.companyName : "",
    category: typeof raw.category === "string" ? raw.category : "",
    address: typeof raw.address === "string" ? raw.address : "",
    phone,
    website,
    socialType: typeof raw.socialType === "string" ? raw.socialType : null,
    socialUrl: typeof raw.socialUrl === "string" ? raw.socialUrl : "",
    instagram: typeof raw.instagram === "string" ? raw.instagram : "",
    rating: typeof raw.rating === "string" ? raw.rating : "",
    reviewsCount: typeof raw.reviewsCount === "string" ? raw.reviewsCount : "",
    mapsUrl: typeof raw.mapsUrl === "string" ? raw.mapsUrl : "",
    isSocialMediaOnly,
    websiteStatus,
    digitalGaps,
    services,
    priority,
    picName: typeof raw.picName === "string" ? raw.picName : "",
    picRole: typeof raw.picRole === "string" ? raw.picRole : "",
    notes: typeof raw.notes === "string" ? raw.notes : "",
    whatsapp,
  };
}

export function hasRealWebsite(
  capture: Pick<Capture, "website" | "isSocialMediaOnly" | "websiteStatus">,
): boolean {
  return (
    capture.website.trim() !== "" &&
    !capture.isSocialMediaOnly &&
    capture.websiteStatus !== "none"
  );
}

/**
 * Wajib punya nama bisnis dan nomor telepon. Baris tanpa nomor telepon
 * (atau baris sampah seperti heading "Hasil") tidak di-scrape/disimpan.
 */
export function isCaptureUseful(capture: Pick<Capture, "companyName" | "phone">): boolean {
  return Boolean(capture.companyName.trim() && capture.phone.trim());
}

const PLACE_ID_RE = /!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i;

export function placeIdFromUrl(url: string | null | undefined): string {
  return (url ?? "").match(PLACE_ID_RE)?.[1]?.toLowerCase() ?? "";
}

export function normalizeName(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function hasPlaceId(
  placeId: string,
  existing: readonly Pick<Capture, "mapsUrl">[],
): boolean {
  if (!placeId) return false;
  return existing.some((capture) => placeIdFromUrl(capture.mapsUrl) === placeId);
}

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

  return fallbackIdentity(capture);
}

function fallbackIdentity(
  capture: Pick<Capture, "companyName" | "address" | "phone">,
): string {
  const name = capture.companyName.trim().toLowerCase().replace(/\s+/g, " ");
  if (!name) return "";

  const phone = capture.phone.replace(/\D/g, "");
  const address = capture.address.trim().toLowerCase().replace(/\s+/g, " ");
  return `fallback:${name}|${phone}|${address}`;
}

function isSamePlace(
  a: Pick<Capture, "companyName" | "address" | "phone" | "mapsUrl">,
  b: Pick<Capture, "companyName" | "address" | "phone" | "mapsUrl">,
): boolean {
  const placeA = normalizeMapsUrl(a.mapsUrl);
  const placeB = normalizeMapsUrl(b.mapsUrl);

  // Kalau dua-duanya punya place ID, hanya place ID yang menentukan. Ini
  // menjaga dua cabang bisnis yang sama tetap dianggap berbeda.
  if (placeA && placeB) return placeA === placeB;

  // Kalau salah satu tidak punya place ID (mis. URL search vs URL place),
  // fallback ke nama + telepon + alamat supaya tetap terdeteksi duplikat.
  const fallbackA = fallbackIdentity(a);
  return Boolean(fallbackA) && fallbackA === fallbackIdentity(b);
}

export function isDuplicateCapture(existing: readonly Capture[], candidate: Capture): boolean {
  return existing.some((capture) => isSamePlace(capture, candidate));
}
