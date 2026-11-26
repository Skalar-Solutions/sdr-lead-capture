import { describe, expect, it } from "vitest";

import type { Capture } from "./capture";
import {
  buildCsvFilename,
  capturesToCsv,
  capturesToDetailedCsv,
  CRM_COLUMNS,
  SDR_DETAILED_COLUMNS,
} from "./csv-template";

const SAMPLE: Capture = {
  id: "cap-1",
  capturedAt: "2026-11-26T06:00:00.000Z",
  companyName: "Warung Steak Pak Joko",
  category: "Steakhouse",
  address: "Jl. Raya No. 1, Jakarta",
  phone: "0812-3456-7890",
  website: "",
  socialType: "Instagram",
  socialUrl: "https://www.instagram.com/warungsteak/",
  instagram: "@warungsteak",
  rating: "4,8",
  reviewsCount: "1.234",
  mapsUrl: "https://www.google.com/maps/place/Warung+Steak",
  isSocialMediaOnly: true,
  websiteStatus: "none",
  digitalGaps: ["no_website", "social_media_only"],
  services: ["website_dev", "seo"],
  priority: 5,
  picName: "Pak Joko",
  picRole: "Owner",
  notes: "Tertarik buat website, follow up besok",
  whatsapp: "0812-3456-7890",
};

describe("csv-template", () => {
  it("format CRM tetap tepat 13 kolom dengan header dan urutan standar", () => {
    expect(CRM_COLUMNS).toHaveLength(13);
    const csv = capturesToCsv([SAMPLE]);
    expect(csv.startsWith("\uFEFF")).toBe(true);

    const [header, row] = csv.slice(1).split("\r\n");
    expect(header).toBe(
      "*Nama,Sapaan,URL Foto,*Tipe Kontak,Grup Kontak,Perusahaan,Alamat Penagihan,Negara,Provinsi,Kota,Email,Nomor Telepon,Tanggal Lahir (dd/mm/yyyy)",
    );
    expect(row).toContain("Warung Steak Pak Joko");
    expect(row).toContain("Vendor");
    expect(row).toContain("Steakhouse");
    expect(row).toContain('"Jl. Raya No. 1, Jakarta"');
    expect(row).toContain("081234567890");
    expect(row).not.toContain("0812-3456-7890");
  });

  it("format SDR lengkap tepat 21 kolom dan menyertakan field tagging", () => {
    expect(SDR_DETAILED_COLUMNS).toHaveLength(21);
    const csv = capturesToDetailedCsv([SAMPLE]);
    expect(csv.startsWith("\uFEFF")).toBe(true);

    const [header, row] = csv.slice(1).split("\r\n");
    expect(header).toBe(
      "ID,Waktu Capture,Nama Perusahaan,Kategori,Alamat,Nomor Telepon,WhatsApp,Website,Sosmed/Linktree,Instagram,Google Rating,Jumlah Ulasan,Status Website,HOT Lead,Celah Digital,Peluang Solusi,Prioritas,PIC Nama,PIC Jabatan,Catatan Sales,Link Google Maps",
    );
    expect(row).toContain("cap-1");
    expect(row).toContain("081234567890");
    expect(row).toContain("none,YA,no_website; social_media_only,website_dev; seo,5,Pak Joko,Owner");
    expect(row).toContain('"Tertarik buat website, follow up besok"');
  });

  it("menghasilkan nama file sesuai format", () => {
    expect(buildCsvFilename("crm")).toMatch(/^crm-contact-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(buildCsvFilename("detailed")).toMatch(/^sdr-leads-lengkap-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
