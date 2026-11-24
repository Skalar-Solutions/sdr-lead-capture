import { describe, expect, it } from "vitest";

import { computeGapScore, computePriority, deriveDigitalGaps, isHotLead } from "../src/scoring";

describe("deriveDigitalGaps", () => {
  it("tanpa website menghasilkan gap dasar", () => {
    expect(deriveDigitalGaps({ websiteStatus: "none", hasRealWebsite: false })).toEqual([
      "no_website",
      "not_mobile_friendly",
      "no_online_ordering",
    ]);
  });

  it("social media only menambah gap khusus", () => {
    const gaps = deriveDigitalGaps({ websiteStatus: "none", hasRealWebsite: false, socialMediaOnly: true });
    expect(gaps).toContain("social_media_only");
  });

  it("website outdated menyorot mobile dan SEO", () => {
    expect(deriveDigitalGaps({ websiteStatus: "outdated" })).toEqual([
      "not_mobile_friendly",
      "no_online_ordering",
      "no_seo",
    ]);
  });

  it("website decent tidak punya gap default", () => {
    expect(deriveDigitalGaps({ websiteStatus: "decent" })).toEqual([]);
  });
});

describe("computeGapScore", () => {
  it("menjumlahkan bobot dan dibatasi 10", () => {
    expect(computeGapScore([])).toBe(0);
    expect(computeGapScore(["no_website", "not_mobile_friendly", "no_online_ordering"])).toBe(7);
    expect(computeGapScore(["no_website", "social_media_only", "not_mobile_friendly", "no_seo"])).toBe(10);
  });
});

describe("computePriority & isHotLead", () => {
  it("tanpa website = hot lead prioritas 5", () => {
    const signals = { websiteStatus: "none" as const, hasRealWebsite: false };
    expect(computePriority(signals)).toBe(5);
    expect(isHotLead(signals)).toBe(true);
  });

  it("outdated = prioritas 4, bukan hot", () => {
    const signals = { websiteStatus: "outdated" as const };
    expect(computePriority(signals)).toBe(4);
    expect(isHotLead(signals)).toBe(false);
  });

  it("decent = prioritas 2", () => {
    expect(computePriority({ websiteStatus: "decent" })).toBe(2);
  });
});
