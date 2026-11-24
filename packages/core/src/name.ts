const LEGAL_PREFIXES = new Set(["pt", "cv", "ud", "pd", "koperasi", "yayasan"]);

/**
 * Normalisasi nama bisnis untuk perbandingan:
 * - lowercase, buang diakritik & tanda baca
 * - buang prefix badan hukum di awal ("PT", "CV", dst.)
 * - rapikan spasi
 */
export function normalizeName(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";

  const words = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length > 1 && LEGAL_PREFIXES.has(words[0] as string)) {
    words.shift();
  }

  return words.join(" ");
}

export function nameTokens(normalized: string): Set<string> {
  return new Set(normalized.split(" ").filter((w) => w.length > 1));
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
