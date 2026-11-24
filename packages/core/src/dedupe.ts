import { jaccardSimilarity, nameTokens, normalizeName } from "./name";
import { phoneMatchKey } from "./phone";

export interface DuplicateCandidate {
  companyName?: string | null;
  phone?: string | null;
  phoneE164?: string | null;
}

export interface DuplicateResult {
  duplicate: boolean;
  reason?: "phone" | "name";
  score?: number;
}

const DEFAULT_NAME_THRESHOLD = 0.8;
const MIN_PHONE_DIGITS = 7;

/**
 * Deteksi duplikat tanpa database: cocok kalau nomor sama, atau nama sangat mirip.
 * Dipakai di extension (banner warning) dan di API (unique index tetap penjaga akhir).
 */
export function isLikelyDuplicate(
  a: DuplicateCandidate,
  b: DuplicateCandidate,
  nameThreshold = DEFAULT_NAME_THRESHOLD,
): DuplicateResult {
  const phoneA = a.phoneE164 ?? phoneMatchKey(a.phone);
  const phoneB = b.phoneE164 ?? phoneMatchKey(b.phone);

  if (phoneA && phoneB && phoneA === phoneB && phoneA.replace(/\D/g, "").length >= MIN_PHONE_DIGITS) {
    return { duplicate: true, reason: "phone", score: 1 };
  }

  const nameA = normalizeName(a.companyName);
  const nameB = normalizeName(b.companyName);
  if (!nameA || !nameB) return { duplicate: false };

  const score = jaccardSimilarity(nameTokens(nameA), nameTokens(nameB));
  if (score >= nameThreshold) {
    return { duplicate: true, reason: "name", score };
  }

  return { duplicate: false, score };
}

export { normalizeName };
