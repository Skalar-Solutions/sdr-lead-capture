/**
 * Deteksi duplikat lead.
 *
 * Kunci utama: Place ID Google Maps yang ada di URL (`!1s0x...:0x...`).
 * Kalau salah satu tidak punya Place ID, fallback ke nama + alamat yang dinormalisasi.
 */

interface DedupeFields {
  mapsUrl: string;
  companyName: string;
  address: string;
}

export function placeIdFromUrl(url: string | null | undefined): string {
  const match = (url ?? "").match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i);
  return match?.[1]?.toLowerCase() ?? "";
}

export function normalizeName(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isSamePlace(a: DedupeFields, b: DedupeFields): boolean {
  const idA = placeIdFromUrl(a.mapsUrl);
  const idB = placeIdFromUrl(b.mapsUrl);
  if (idA && idB) return idA === idB;

  const nameA = normalizeName(a.companyName);
  if (!nameA || nameA !== normalizeName(b.companyName)) return false;
  return normalizeName(a.address) === normalizeName(b.address);
}

export function isDuplicate(candidate: DedupeFields, existing: readonly DedupeFields[]): boolean {
  return existing.some((item) => isSamePlace(candidate, item));
}

/** Cek cepat sebelum buka tempat: cukup pakai Place ID dari link hasil pencarian. */
export function hasPlaceId(placeId: string, existing: readonly DedupeFields[]): boolean {
  if (!placeId) return false;
  return existing.some((item) => placeIdFromUrl(item.mapsUrl) === placeId);
}
