import { describe, expect, it } from "vitest";

import { hasPlaceId, isDuplicate, normalizeName, placeIdFromUrl } from "./dedupe";

const URL_A =
  "https://www.google.com/maps/place/Kopi+A/data=!4m7!3m6!1s0x2e69f1:0xabc123!8m2!3d-6.2!4d106.8";
const URL_B =
  "https://www.google.com/maps/place/Kopi+B/data=!4m7!3m6!1s0x2e69f1:0xdef456!8m2!3d-6.2!4d106.8";

describe("placeIdFromUrl", () => {
  it("ambil place id dari URL Maps", () => {
    expect(placeIdFromUrl(URL_A)).toBe("0x2e69f1:0xabc123");
    expect(placeIdFromUrl("https://www.google.com/maps/place/Kopi")).toBe("");
  });
});

describe("isDuplicate", () => {
  const existing = [{ mapsUrl: URL_A, companyName: "Kopi A", address: "Jl. Satu" }];

  it("duplikat kalau place id sama walau nama beda tulisan", () => {
    expect(isDuplicate({ mapsUrl: URL_A, companyName: "KOPI A!", address: "" }, existing)).toBe(true);
  });

  it("bukan duplikat kalau place id beda walau nama sama (cabang lain)", () => {
    expect(isDuplicate({ mapsUrl: URL_B, companyName: "Kopi A", address: "Jl. Satu" }, existing)).toBe(
      false,
    );
  });

  it("fallback nama + alamat kalau tidak ada place id", () => {
    const noId = [{ mapsUrl: "https://maps.google.com/x", companyName: "Kopi A", address: "Jl. Satu" }];
    expect(isDuplicate({ mapsUrl: "", companyName: "kopi a", address: "jl satu" }, noId)).toBe(true);
    expect(isDuplicate({ mapsUrl: "", companyName: "kopi a", address: "jl dua" }, noId)).toBe(false);
  });

  it("hasPlaceId untuk cek cepat sebelum klik", () => {
    expect(hasPlaceId("0x2e69f1:0xabc123", existing)).toBe(true);
    expect(hasPlaceId("", existing)).toBe(false);
  });

  it("normalizeName", () => {
    expect(normalizeName("  Café  Kopi-Kenangan ")).toBe("cafe kopi kenangan");
  });
});
