import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";

import { analyzeWebsiteUrl, extractBusinessData, getNameFromUrl } from "./scraper";

function parse(html: string): Document {
  const window = new Window();
  window.document.body.innerHTML = html;
  return window.document as unknown as Document;
}

const MAPS_URL = "https://www.google.com/maps/place/Warung+Steak/@-6.2,106.8,17z";

describe("extractBusinessData", () => {
  it("mengambil field utama dari panel detail", () => {
    const doc = parse(`
      <div role="main">
        <h1 class="DUwDvf">Warung Steak Pak Joko</h1>
        <button jsaction="pane.rating.category">Steakhouse</button>
        <div class="F7nice">
          <span aria-hidden="true">4,8</span>
          <span>(1.234)</span>
        </div>
        <button data-item-id="address" aria-label="Alamat: Jl. Raya No. 1">Jl. Raya No. 1</button>
        <button data-item-id="phone:tel:+6281234567890" aria-label="Telepon: 0812-3456-7890">0812-3456-7890</button>
        <a data-item-id="authority" href="https://warungsteak.id">warungsteak.id</a>
      </div>
    `);

    const result = extractBusinessData(doc, MAPS_URL);

    expect(result.companyName).toBe("Warung Steak Pak Joko");
    expect(result.category).toBe("Steakhouse");
    expect(result.rating).toBe("4,8");
    expect(result.reviewsCount).toBe("1.234");
    expect(result.address).toBe("Jl. Raya No. 1");
    expect(result.phone).toBe("0812-3456-7890");
    expect(result.website).toBe("https://warungsteak.id");
    expect(result.isRealWebsite).toBe(true);
    expect(result.isSocialMediaOnly).toBe(false);
  });

  it("menandai Instagram sebagai social-media-only", () => {
    const doc = parse(`
      <div role="main">
        <h1 class="DUwDvf">Klinik Sehat</h1>
        <a data-item-id="authority" href="https://www.instagram.com/kliniksehat/">Instagram</a>
      </div>
    `);

    const result = extractBusinessData(doc, MAPS_URL);

    expect(result.isSocialMediaOnly).toBe(true);
    expect(result.isRealWebsite).toBe(false);
    expect(result.socialType).toBe("Instagram");
    expect(result.instagramHandle).toBe("@kliniksehat");
    expect(result.website).toBe("");
  });

  it("memakai nama dari URL kalau h1 tidak ada", () => {
    const doc = parse(`<div role="main"></div>`);
    const result = extractBusinessData(doc, MAPS_URL);
    expect(result.companyName).toBe("Warung Steak");
  });

  it("mengembalikan field kosong kalau panel belum terbuka", () => {
    const doc = parse(`<div></div>`);
    const result = extractBusinessData(doc, "https://www.google.com/maps");
    expect(result.companyName).toBe("");
    expect(result.phone).toBe("");
    expect(result.website).toBe("");
  });

  it("membuang glyph ikon Material dari alamat dan telepon", () => {
    const doc = parse(`
      <div role="main">
        <h1 class="DUwDvf">Chuck's Cattle Benhil</h1>
        <button data-item-id="address" aria-label="Alamat: Jl. Bendungan Hilir No.5">
          <div><span class="google-symbols" aria-hidden="true">\uE0C8</span></div>
          <div class="Io6YTE">Jl. Bendungan Hilir No.5</div>
        </button>
        <button data-item-id="phone:tel:+6282113425107" aria-label="Telepon: 0821-1342-5107">
          <span class="google-symbols" aria-hidden="true">\uE0B0</span>0821-1342-5107
        </button>
      </div>
    `);

    const result = extractBusinessData(doc, MAPS_URL);

    expect(result.address).toBe("Jl. Bendungan Hilir No.5");
    expect(result.phone).toBe("0821-1342-5107");
    expect(result.address).not.toMatch(/[\uE000-\uF8FF]/);
    expect(result.phone).not.toMatch(/[\uE000-\uF8FF]/);
  });

  it("memakai aria-label kalau tombol hanya berisi ikon", () => {
    const doc = parse(`
      <div role="main">
        <h1 class="DUwDvf">Klinik Sehat</h1>
        <button data-item-id="address" aria-label="Alamat: Jl. Merdeka No. 1">
          <span class="google-symbols" aria-hidden="true">\uE0C8</span>
        </button>
        <button data-item-id="phone:tel:+622112345678" aria-label="Telepon: 021-1234-5678">
          <span class="google-symbols" aria-hidden="true">\uE0B0</span>
        </button>
      </div>
    `);

    const result = extractBusinessData(doc, MAPS_URL);

    expect(result.address).toBe("Jl. Merdeka No. 1");
    expect(result.phone).toBe("021-1234-5678");
  });

  it("tidak memakai heading 'Hasil' dari halaman pencarian sebagai nama bisnis", () => {
    const doc = parse(`
      <div role="main">
        <h1 class="DUwDvf">Hasil</h1>
        <a href="/maps/place/Chuck's+Cattle+Benhil">Chuck's Cattle Benhil</a>
      </div>
    `);

    const result = extractBusinessData(
      doc,
      "https://www.google.com/maps/search/steakhouse+jakarta",
    );

    expect(result.companyName).toBe("");
  });

  it("memakai nama dari URL kalau h1 yang terbaca heading 'Hasil'", () => {
    const doc = parse(`<div role="main"><h1 class="DUwDvf">Hasil</h1></div>`);
    const result = extractBusinessData(
      doc,
      "https://www.google.com/maps/place/Chuck's+Cattle/@-6.2,106.8,17z",
    );
    expect(result.companyName).toBe("Chuck's Cattle");
  });
});

describe("analyzeWebsiteUrl", () => {
  it("mengenali linktree dan link sejenis sebagai social media", () => {
    expect(analyzeWebsiteUrl("https://linktr.ee/warung").socialType).toBe("Linktree");
    expect(analyzeWebsiteUrl("https://gofood.link/a/abc").socialType).toBe("GoFood");
  });

  it("website biasa dianggap real", () => {
    const result = analyzeWebsiteUrl("https://warungsteak.id");
    expect(result.isRealWebsite).toBe(true);
    expect(result.socialType).toBeNull();
  });

  it("URL kosong tidak dianggap real", () => {
    expect(analyzeWebsiteUrl("").isRealWebsite).toBe(false);
  });
});

describe("getNameFromUrl", () => {
  it("mengambil slug tempat dari URL Maps", () => {
    expect(getNameFromUrl(MAPS_URL)).toBe("Warung Steak");
  });

  it("mengabaikan URL yang bukan halaman tempat", () => {
    expect(getNameFromUrl("https://www.google.com/maps/search/steak")).toBe("");
  });
});
