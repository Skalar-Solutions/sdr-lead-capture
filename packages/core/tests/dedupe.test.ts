import { describe, expect, it } from "vitest";

import { isLikelyDuplicate } from "../src/dedupe";

describe("isLikelyDuplicate", () => {
  it("mendeteksi nomor yang sama dalam format berbeda", () => {
    const result = isLikelyDuplicate(
      { companyName: "Warung A", phone: "0812-3456-7890" },
      { companyName: "Tempat Lain", phone: "+62 812 3456 7890" },
    );
    expect(result.duplicate).toBe(true);
    expect(result.reason).toBe("phone");
  });

  it("mendeteksi nama yang identik setelah normalisasi", () => {
    const result = isLikelyDuplicate(
      { companyName: "PT Maju Jaya", phone: "" },
      { companyName: "Maju Jaya", phone: "" },
    );
    expect(result.duplicate).toBe(true);
    expect(result.reason).toBe("name");
  });

  it("mendeteksi nama yang sangat mirip", () => {
    const result = isLikelyDuplicate(
      { companyName: "Warung Steak Pak Joko" },
      { companyName: "Warung Steak Pak Joko Cabang" },
    );
    expect(result.duplicate).toBe(true);
  });

  it("tidak menandai bisnis yang berbeda", () => {
    const result = isLikelyDuplicate(
      { companyName: "Warung Steak Pak Joko", phone: "0812-1111-2222" },
      { companyName: "Klinik Sehat Selalu", phone: "0813-9999-8888" },
    );
    expect(result.duplicate).toBe(false);
  });

  it("tidak error kalau data kosong", () => {
    expect(isLikelyDuplicate({}, {}).duplicate).toBe(false);
  });
});
