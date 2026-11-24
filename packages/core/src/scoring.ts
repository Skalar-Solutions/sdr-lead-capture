import { DIGITAL_GAPS, type DigitalGap, type WebsiteStatus } from "./constants";

/**
 * Bobot gap: makin besar, makin buruk kehadiran digitalnya (dan makin panas lead-nya).
 */
export const GAP_WEIGHTS: Record<DigitalGap, number> = {
  no_website: 4,
  social_media_only: 3,
  not_mobile_friendly: 2,
  no_online_ordering: 1,
  no_seo: 1,
  no_online_payment: 1,
};

const MAX_GAP_SCORE = 10;

/** 0 = digitalnya bagus, 10 = paling bolong. */
export function computeGapScore(gaps: readonly DigitalGap[]): number {
  const total = gaps.reduce((sum, gap) => sum + (GAP_WEIGHTS[gap] ?? 0), 0);
  return Math.min(MAX_GAP_SCORE, total);
}

export interface GapSignals {
  websiteStatus: WebsiteStatus;
  hasRealWebsite?: boolean;
  socialMediaOnly?: boolean;
}

/**
 * Turunkan gap awal dari status website. User tetap boleh menimpa secara manual,
 * tapi hasil default-nya konsisten di semua jalur input.
 */
export function deriveDigitalGaps(signals: GapSignals): DigitalGap[] {
  const { websiteStatus, hasRealWebsite = websiteStatus !== "none", socialMediaOnly = false } = signals;
  const gaps = new Set<DigitalGap>();

  if (!hasRealWebsite || websiteStatus === "none") {
    gaps.add("no_website");
    gaps.add("not_mobile_friendly");
    gaps.add("no_online_ordering");
    if (socialMediaOnly) gaps.add("social_media_only");
  } else if (websiteStatus === "outdated") {
    gaps.add("not_mobile_friendly");
    gaps.add("no_online_ordering");
    gaps.add("no_seo");
  } else if (websiteStatus === "bad-ux") {
    gaps.add("not_mobile_friendly");
    gaps.add("no_seo");
  }

  return DIGITAL_GAPS.filter((gap) => gaps.has(gap));
}

/** 1 (paling dingin) sampai 5 (hot lead). */
export function computePriority(signals: GapSignals): number {
  const gaps = deriveDigitalGaps(signals);
  if (gaps.includes("no_website")) return 5;
  if (gaps.includes("social_media_only") || signals.websiteStatus === "outdated") return 4;
  if (signals.websiteStatus === "bad-ux") return 3;
  if (signals.websiteStatus === "decent") return 2;
  return 1;
}

export function isHotLead(signals: GapSignals): boolean {
  const hasRealWebsite = signals.hasRealWebsite ?? signals.websiteStatus !== "none";
  return !hasRealWebsite || signals.websiteStatus === "none";
}
