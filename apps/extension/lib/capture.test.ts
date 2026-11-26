import { describe, expect, it } from "vitest";

import {
  captureIdentity,
  isCaptureUseful,
  isDuplicateCapture,
  normalizeMapsUrl,
  type Capture,
} from "./capture";

const PLACE_URL =
  "https://www.google.com/maps/place/Chuck's+Cattle+Benhil/@-6.2112658,106.668274,12z/data=!4m10!1m2!2m1!1ssteakhouse+jakarta!3m6!1s0x2e69f7193402b0a7:0x7277aea653cd756e!8m2!3d-6.2112658!4d106.8124696";

function makeCapture(overrides: Partial<Capture> = {}): Capture {
  return {
    id: "id-1",
    capturedAt: "2026-11-26T00:00:00.000Z",
    companyName: "Chuck's Cattle Benhil",
    category: "Restoran Steak",
    address: "Jl. Bendungan Hilir No.5",
    phone: "0821-1342-5107",
    website: "",
    socialType: null,
    socialUrl: "",
    instagram: "",
    rating: "4,8",
    reviewsCount: "1.234",
    mapsUrl: PLACE_URL,
    isSocialMediaOnly: false,
    ...overrides,
  };
}

describe("normalizeMapsUrl", () => {
  it("memakai place ID sehingga URL dengan koordinat berbeda tetap sama", () => {
    const other =
      "https://www.google.com/maps/place/Chuck's+Cattle+Benhil/@-6.2,106.8,15z/data=!4m10!1s0x2e69f7193402b0a7:0x7277aea653cd756e!8m2";
    expect(normalizeMapsUrl(PLACE_URL)).toBe("place:0x2e69f7193402b0a7:0x7277aea653cd756e");
    expect(normalizeMapsUrl(other)).toBe(normalizeMapsUrl(PLACE_URL));
  });

  it("membedakan dua cabang dengan slug sama tapi place ID berbeda", () => {
    const branch =
      "https://www.google.com/maps/place/Chuck's+Cattle+Benhil/@-6.2,106.8,15z/data=!4m10!1s0x2e69f7193402b0a7:0x0000000000000001";
    expect(normalizeMapsUrl(branch)).not.toBe(normalizeMapsUrl(PLACE_URL));
  });

  it("mendukung cid dan place_id", () => {
    expect(normalizeMapsUrl("https://maps.google.com/?cid=123456789")).toBe("cid:123456789");
    expect(normalizeMapsUrl("https://www.google.com/maps?place_id=ChIJabc")).toBe("pid:chijabc");
  });

  it("memakai slug kalau place ID tidak ada", () => {
    expect(
      normalizeMapsUrl("https://www.google.com/maps/place/Warung+Steak/@-6.2,106.8,17z"),
    ).toBe("slug:warung steak");
  });

  it("mengabaikan URL non-Google", () => {
    expect(normalizeMapsUrl("https://example.com/maps/place/Warung")).toBe("");
    expect(normalizeMapsUrl("")).toBe("");
  });
});

describe("captureIdentity", () => {
  it("memakai identitas tempat kalau URL valid", () => {
    expect(captureIdentity(makeCapture())).toMatch(/^place:/);
  });

  it("fallback ke nama + telepon + alamat tanpa URL tempat", () => {
    const first = makeCapture({ mapsUrl: "https://www.google.com/maps/search/steak" });
    const second = makeCapture({
      mapsUrl: "",
      companyName: "  CHUCK'S   CATTLE BENHIL ",
      phone: "0821 1342 5107",
      address: "jl.  bendungan hilir no.5",
    });

    expect(captureIdentity(first)).toBe(
      "fallback:chuck's cattle benhil|082113425107|jl. bendungan hilir no.5",
    );
    expect(captureIdentity(second)).toBe(captureIdentity(first));
  });
});

describe("isDuplicateCapture", () => {
  it("mendeteksi tempat yang sama walau URL berubah", () => {
    const existing = [makeCapture()];
    const recaptured = makeCapture({
      id: "id-2",
      mapsUrl: PLACE_URL.replace("@-6.2112658,106.668274,12z", "@-6.1,106.7,14z"),
    });
    expect(isDuplicateCapture(existing, recaptured)).toBe(true);
  });

  it("mengizinkan cabang berbeda dari bisnis yang sama", () => {
    const existing = [makeCapture()];
    const otherBranch = makeCapture({
      id: "id-2",
      mapsUrl:
        "https://www.google.com/maps/place/Chuck's+Cattle+Benhil/@-6.2,106.8,15z/data=!4m10!1s0x2e69f7193402b0a7:0x1111111111111111",
    });
    expect(isDuplicateCapture(existing, otherBranch)).toBe(false);
  });

  it("mendeteksi duplikat lewat fallback nama + telepon", () => {
    const existing = [makeCapture({ mapsUrl: "https://www.google.com/maps" })];
    const recaptured = makeCapture({ id: "id-2", mapsUrl: "https://www.google.com/maps" });
    expect(isDuplicateCapture(existing, recaptured)).toBe(true);
  });

  it("tidak menganggap bisnis berbeda sebagai duplikat", () => {
    const existing = [makeCapture()];
    const other = makeCapture({
      id: "id-2",
      companyName: "Warung Steak Pak Joko",
      mapsUrl: "https://www.google.com/maps/place/Warung+Steak+Pak+Joko",
    });
    expect(isDuplicateCapture(existing, other)).toBe(false);
  });
});

describe("isCaptureUseful", () => {
  it("menerima nama + minimal satu sinyal bisnis", () => {
    expect(isCaptureUseful(makeCapture())).toBe(true);
    expect(isCaptureUseful(makeCapture({ category: "", address: "", phone: "0812" }))).toBe(true);
  });

  it("menolak baris yang hanya punya nama", () => {
    expect(
      isCaptureUseful(
        makeCapture({ category: "", address: "", phone: "", website: "", socialUrl: "" }),
      ),
    ).toBe(false);
  });

  it("menolak nama kosong", () => {
    expect(isCaptureUseful(makeCapture({ companyName: "  " }))).toBe(false);
  });
});
