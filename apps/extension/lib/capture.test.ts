import { describe, expect, it } from "vitest";

import {
  captureIdentity,
  hasPlaceId,
  hasRealWebsite,
  isCaptureUseful,
  isDuplicateCapture,
  normalizeCapture,
  normalizeMapsUrl,
  normalizeName,
  placeIdFromUrl,
  toCapture,
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
    websiteStatus: "none",
    digitalGaps: ["no_website"],
    services: ["website_dev"],
    priority: 5,
    picName: "",
    picRole: "",
    notes: "",
    whatsapp: "0821-1342-5107",
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

  it("menjembatani URL place dan URL tanpa place ID", () => {
    const existing = [makeCapture({ mapsUrl: "https://www.google.com/maps/search/steak" })];
    const recaptured = makeCapture({ id: "id-2" });
    expect(isDuplicateCapture(existing, recaptured)).toBe(true);
    expect(isDuplicateCapture([makeCapture()], existing[0]!)).toBe(true);
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

describe("place helpers", () => {
  it("mengambil place ID dari URL Maps", () => {
    expect(placeIdFromUrl(PLACE_URL)).toBe("0x2e69f7193402b0a7:0x7277aea653cd756e");
    expect(placeIdFromUrl("https://www.google.com/maps/search/steak")).toBe("");
  });

  it("menormalisasi nama untuk pencocokan panel", () => {
    expect(normalizeName("  Chuck's Cattle — Benhil ")).toBe("chuck s cattle benhil");
  });

  it("mendeteksi place ID yang sudah pernah disimpan", () => {
    const existing = [makeCapture()];
    expect(hasPlaceId(placeIdFromUrl(PLACE_URL), existing)).toBe(true);
    expect(hasPlaceId("0x1:0xdeadbeef", existing)).toBe(false);
  });
});

describe("isCaptureUseful", () => {
  it("menerima nama + nomor telepon", () => {
    expect(isCaptureUseful(makeCapture())).toBe(true);
    expect(isCaptureUseful(makeCapture({ category: "", address: "", phone: "0812" }))).toBe(true);
  });

  it("menolak bisnis tanpa nomor telepon", () => {
    expect(isCaptureUseful(makeCapture({ phone: "" }))).toBe(false);
    expect(isCaptureUseful(makeCapture({ phone: "   " }))).toBe(false);
  });

  it("menolak nama kosong", () => {
    expect(isCaptureUseful(makeCapture({ companyName: "  " }))).toBe(false);
  });
});

describe("toCapture & default tagging", () => {
  const basePlace = {
    companyName: "Warung Steak Pak Joko",
    category: "Steakhouse",
    address: "Jl. Raya No. 1",
    phone: "081234567890",
    website: "",
    isRealWebsite: false,
    isSocialMediaOnly: false,
    socialType: null as string | null,
    socialUrl: "",
    instagramHandle: "",
    rating: "4,8",
    reviewsCount: "1.234",
    mapsUrl: PLACE_URL,
  };

  it("memberi default HOT untuk bisnis tanpa website", () => {
    const capture = toCapture(basePlace);
    expect(capture.websiteStatus).toBe("none");
    expect(capture.digitalGaps).toEqual(["no_website"]);
    expect(capture.services).toEqual(["website_dev"]);
    expect(capture.priority).toBe(5);
    expect(capture.whatsapp).toBe("081234567890");
    expect(hasRealWebsite(capture)).toBe(false);
  });

  it("menambahkan gap social_media_only dan catatan otomatis untuk sosmed only", () => {
    const capture = toCapture({
      ...basePlace,
      isSocialMediaOnly: true,
      socialType: "Instagram",
      socialUrl: "https://www.instagram.com/warungsteak/",
      instagramHandle: "@warungsteak",
    });
    expect(capture.websiteStatus).toBe("none");
    expect(capture.digitalGaps).toEqual(["no_website", "social_media_only"]);
    expect(capture.notes).toBe("Hanya ada link Instagram: https://www.instagram.com/warungsteak/");
    expect(capture.priority).toBe(5);
    expect(hasRealWebsite(capture)).toBe(false);
  });

  it("memberi status decent dan prioritas 3 untuk bisnis dengan website real", () => {
    const capture = toCapture({
      ...basePlace,
      website: "https://warungsteak.id",
      isRealWebsite: true,
    });
    expect(capture.websiteStatus).toBe("decent");
    expect(capture.digitalGaps).toEqual([]);
    expect(capture.services).toEqual(["website_dev"]);
    expect(capture.priority).toBe(3);
    expect(hasRealWebsite(capture)).toBe(true);
  });

  it("hasRealWebsite mempertimbangkan websiteStatus dan isSocialMediaOnly", () => {
    expect(
      hasRealWebsite(
        makeCapture({
          website: "https://example.com",
          isSocialMediaOnly: false,
          websiteStatus: "none",
        }),
      ),
    ).toBe(false);
    expect(
      hasRealWebsite(
        makeCapture({
          website: "https://instagram.com/toko",
          isSocialMediaOnly: true,
          websiteStatus: "decent",
        }),
      ),
    ).toBe(false);
    expect(
      hasRealWebsite(
        makeCapture({
          website: "https://example.com",
          isSocialMediaOnly: false,
          websiteStatus: "outdated",
        }),
      ),
    ).toBe(true);
  });
});

describe("normalizeCapture (migrasi data lama)", () => {
  it("mengisi field tagging default untuk record lama tanpa website", () => {
    const legacy = {
      id: "old-1",
      capturedAt: "2026-11-25T10:00:00.000Z",
      companyName: "Toko Lama",
      category: "Retail",
      address: "Jl. Lama 1",
      phone: "08111111111",
      website: "",
      socialType: "Instagram",
      socialUrl: "https://instagram.com/tokolama",
      instagram: "@tokolama",
      rating: "4,5",
      reviewsCount: "10",
      mapsUrl: PLACE_URL,
      isSocialMediaOnly: true,
    };

    const migrated = normalizeCapture(legacy);
    expect(migrated.websiteStatus).toBe("none");
    expect(migrated.digitalGaps).toEqual(["no_website", "social_media_only"]);
    expect(migrated.services).toEqual(["website_dev"]);
    expect(migrated.priority).toBe(5);
    expect(migrated.whatsapp).toBe("08111111111");
    expect(migrated.picName).toBe("");
    expect(migrated.picRole).toBe("");
    expect(migrated.notes).toBe("");
  });

  it("mengisi field tagging default untuk record lama dengan website", () => {
    const migrated = normalizeCapture({
      id: "old-2",
      capturedAt: "2026-11-25T10:00:00.000Z",
      companyName: "PT Maju",
      phone: "0215551234",
      website: "https://ptmaju.co.id",
      isSocialMediaOnly: false,
    });
    expect(migrated.websiteStatus).toBe("decent");
    expect(migrated.digitalGaps).toEqual([]);
    expect(migrated.services).toEqual(["website_dev"]);
    expect(migrated.priority).toBe(3);
    expect(migrated.whatsapp).toBe("0215551234");
  });

  it("mempertahankan field tagging yang sudah diedit", () => {
    const edited = normalizeCapture({
      ...makeCapture(),
      websiteStatus: "bad-ux",
      digitalGaps: ["not_mobile_friendly", "no_seo"],
      services: ["uiux_redesign", "seo"],
      priority: 4,
      picName: "Budi",
      picRole: "Owner",
      notes: "Follow up Senin",
      whatsapp: "08129999999",
    });
    expect(edited.websiteStatus).toBe("bad-ux");
    expect(edited.digitalGaps).toEqual(["not_mobile_friendly", "no_seo"]);
    expect(edited.services).toEqual(["uiux_redesign", "seo"]);
    expect(edited.priority).toBe(4);
    expect(edited.picName).toBe("Budi");
    expect(edited.picRole).toBe("Owner");
    expect(edited.notes).toBe("Follow up Senin");
    expect(edited.whatsapp).toBe("08129999999");
  });
});
