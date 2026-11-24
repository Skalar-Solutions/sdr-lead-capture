import { describe, expect, it } from "vitest";

import { digitsOnly, formatPhoneDisplay, normalizePhoneE164, phoneMatchKey, whatsappUrl } from "../src/phone";

describe("normalizePhoneE164", () => {
  it("mengubah nomor HP lokal ke E.164", () => {
    expect(normalizePhoneE164("0812-3456-7890")).toBe("+6281234567890");
  });

  it("menerima format +62 dan 62", () => {
    expect(normalizePhoneE164("+62 812 3456 7890")).toBe("+6281234567890");
    expect(normalizePhoneE164("6281234567890")).toBe("+6281234567890");
  });

  it("menangani nomor telepon rumah Jakarta", () => {
    expect(normalizePhoneE164("021-555-1234")).toBe("+62215551234");
  });

  it("mengembalikan null untuk input kosong / tidak valid", () => {
    expect(normalizePhoneE164("")).toBeNull();
    expect(normalizePhoneE164(null)).toBeNull();
    expect(normalizePhoneE164("abc")).toBeNull();
    expect(normalizePhoneE164("12")).toBeNull();
  });
});

describe("phoneMatchKey", () => {
  it("menyamakan 08, 628, dan +628", () => {
    const a = phoneMatchKey("0812-3456-7890");
    const b = phoneMatchKey("6281234567890");
    const c = phoneMatchKey("+62 812 3456 7890");
    expect(a).not.toBeNull();
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});

describe("helper lain", () => {
  it("digitsOnly membuang semua non-digit", () => {
    expect(digitsOnly("+62 (812) 3456-7890")).toBe("6281234567890");
  });

  it("whatsappUrl memakai format wa.me tanpa plus", () => {
    expect(whatsappUrl("0812-3456-7890")).toBe("https://wa.me/6281234567890");
    expect(whatsappUrl("abc")).toBeNull();
  });

  it("formatPhoneDisplay mengembalikan input apa adanya kalau tidak valid", () => {
    expect(formatPhoneDisplay("bukan nomor")).toBe("bukan nomor");
    expect(formatPhoneDisplay("0812-3456-7890")).toContain("812");
  });
});
