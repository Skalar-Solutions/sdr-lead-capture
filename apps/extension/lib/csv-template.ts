import { escapeCsvCell } from "@sdr/core";

import type { Capture } from "./capture";

export interface CsvColumn {
  header: string;
  value: (capture: Capture) => string;
}

/**
 * ============================================================================
 * TEMPLATE CSV 1: CRM Format (mengikuti `crm-contact-template.xlsx` - 13 kolom)
 * ============================================================================
 */
const DEFAULT_CONTACT_TYPE = "Vendor";
const DEFAULT_COUNTRY = "Indonesia";
const DEFAULT_GROUP = "Google Maps";

export const CRM_COLUMNS: CsvColumn[] = [
  { header: "*Nama", value: (c) => c.companyName },
  { header: "Sapaan", value: () => "" },
  { header: "URL Foto", value: () => "" },
  { header: "*Tipe Kontak", value: () => DEFAULT_CONTACT_TYPE },
  { header: "Grup Kontak", value: (c) => c.category || DEFAULT_GROUP },
  { header: "Perusahaan", value: (c) => c.companyName },
  { header: "Alamat Penagihan", value: (c) => c.address },
  { header: "Negara", value: () => DEFAULT_COUNTRY },
  { header: "Provinsi", value: () => "" },
  { header: "Kota", value: () => "" },
  { header: "Email", value: () => "" },
  { header: "Nomor Telepon", value: (c) => c.phone },
  { header: "Tanggal Lahir (dd/mm/yyyy)", value: () => "" },
];

/**
 * ============================================================================
 * TEMPLATE CSV 2: SDR Detailed Format (Semua data + Tag & Evaluasi Lengkap)
 * ============================================================================
 */
export const SDR_DETAILED_COLUMNS: CsvColumn[] = [
  { header: "ID", value: (c) => c.id },
  { header: "Waktu Capture", value: (c) => c.capturedAt },
  { header: "Nama Perusahaan", value: (c) => c.companyName },
  { header: "Kategori", value: (c) => c.category },
  { header: "Alamat", value: (c) => c.address },
  { header: "Nomor Telepon", value: (c) => c.phone },
  { header: "WhatsApp", value: (c) => c.whatsapp || c.phone },
  { header: "Website", value: (c) => c.website },
  { header: "Sosmed / Linktree", value: (c) => c.socialUrl || "" },
  { header: "Instagram", value: (c) => c.instagram },
  { header: "Google Rating", value: (c) => c.rating },
  { header: "Jumlah Ulasan", value: (c) => c.reviewsCount },
  { header: "Status Website", value: (c) => c.websiteStatus },
  { header: "HOT Lead", value: (c) => (c.websiteStatus === "none" ? "YA" : "TIDAK") },
  { header: "Celah Digital (Gaps)", value: (c) => (c.digitalGaps || []).join("; ") },
  { header: "Peluang Solusi", value: (c) => (c.services || []).join("; ") },
  { header: "Prioritas (1-5)", value: (c) => String(c.priority || 3) },
  { header: "PIC Nama", value: (c) => c.picName || "" },
  { header: "PIC Jabatan", value: (c) => c.picRole || "" },
  { header: "Catatan Sales", value: (c) => c.notes || "" },
  { header: "Link Google Maps", value: (c) => c.mapsUrl },
];

export function capturesToCsv(
  captures: readonly Capture[],
  options: { bom?: boolean } = {},
): string {
  const { bom = true } = options;
  const header = CRM_COLUMNS.map((col) => escapeCsvCell(col.header)).join(",");
  const rows = captures.map((c) =>
    CRM_COLUMNS.map((col) => escapeCsvCell(col.value(c))).join(","),
  );
  return `${bom ? "\uFEFF" : ""}${[header, ...rows].join("\r\n")}`;
}

export function capturesToDetailedCsv(
  captures: readonly Capture[],
  options: { bom?: boolean } = {},
): string {
  const { bom = true } = options;
  const header = SDR_DETAILED_COLUMNS.map((col) => escapeCsvCell(col.header)).join(",");
  const rows = captures.map((c) =>
    SDR_DETAILED_COLUMNS.map((col) => escapeCsvCell(col.value(c))).join(","),
  );
  return `${bom ? "\uFEFF" : ""}${[header, ...rows].join("\r\n")}`;
}

export function buildCsvFilename(format: "crm" | "detailed" = "crm"): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  return format === "crm" ? `crm-contact-${dateStr}.csv` : `sdr-leads-lengkap-${dateStr}.csv`;
}
