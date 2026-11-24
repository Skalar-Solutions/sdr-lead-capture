import { describe, expect, it } from "vitest";

import { jaccardSimilarity, nameTokens, normalizeName } from "../src/name";

describe("normalizeName", () => {
  it("lowercase dan membuang tanda baca", () => {
    expect(normalizeName("Warung Steak Pak Joko!")).toBe("warung steak pak joko");
  });

  it("membuang prefix badan hukum di awal", () => {
    expect(normalizeName("PT. Maju Jaya")).toBe("maju jaya");
    expect(normalizeName("CV Sumber Rejeki")).toBe("sumber rejeki");
  });

  it("tidak membuang kata yang bukan badan hukum", () => {
    expect(normalizeName("Toko Maju")).toBe("toko maju");
  });

  it("menangani input kosong", () => {
    expect(normalizeName("")).toBe("");
    expect(normalizeName(null)).toBe("");
  });
});

describe("jaccardSimilarity", () => {
  it("1 untuk token identik", () => {
    expect(jaccardSimilarity(nameTokens("maju jaya"), nameTokens("maju jaya"))).toBe(1);
  });

  it("0.5 untuk separuh overlap", () => {
    expect(jaccardSimilarity(nameTokens("maju jaya"), nameTokens("maju"))).toBe(0.5);
  });

  it("0 kalau salah satu kosong", () => {
    expect(jaccardSimilarity(new Set(), nameTokens("maju"))).toBe(0);
  });
});
