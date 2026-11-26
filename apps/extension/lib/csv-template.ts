import { digitsOnly, escapeCsvCell } from "@sdr/core";

import { hasRealWebsite, type Capture } from "./capture";

export interface CsvColumn {
  header: string;
  value: (capture: Capture) => string;
}

/**
 * ============================================================================
 * TEMPLATE CSV 1: Format CRM — mengikuti `crm-contact-template.xlsx` (13 kolom)
 * ----------------------------------------------------------------------------
 * Urutan dan nama header harus sama persis dengan template import CRM.
 * ============================================================================
 */
const DEFAULT_CONTACT_TYPE = "Vendor";
const DEFAULT_COUNTRY = "Indonesia";
const DEFAULT_GROUP = "Google Maps";

export const CRM_COLUMNS: CsvColumn[] = [
  { header: "*Nama", value: (capture) => capture.companyName },
  { header: "Sapaan", value: () => "" },
  { header: "URL Foto", value: () => "" },
  { header: "*Tipe Kontak", value: () => DEFAULT_CONTACT_TYPE },
  { header: "Grup Kontak", value: (capture) => capture.category || DEFAULT_GROUP },
  { header: "Perusahaan", value: (capture) => capture.companyName },
  { header: "Alamat Penagihan", value: (capture) => capture.address },
  { header: "Negara", value: () => DEFAULT_COUNTRY },
  { header: "Provinsi", value: () => "" },
  { header: "Kota", value: () => "" },
  { header: "Email", value: () => "" },
  { header: "Nomor Telepon", value: (capture) => digitsOnly(capture.phone) },
  { header: "Tanggal Lahir (dd/mm/yyyy)", value: () => "" },
];

/** Alias kompatibilitas untuk impor lama. */
export const CSV_COLUMNS = CRM_COLUMNS;

/**
 * ============================================================================
 * TEMPLATE CSV 2: Format SDR Lengkap (21 kolom, termasuk evaluasi & tagging)
 * ============================================================================
 */
export const SDR_DETAILED_COLUMNS: CsvColumn[] = [
  { header: "ID", value: (capture) => capture.id },
  { header: "Waktu Capture", value: (capture) => capture.capturedAt },
  { header: "Nama Perusahaan", value: (capture) => capture.companyName },
  { header: "Kategori", value: (capture) => capture.category },
  { header: "Alamat", value: (capture) => capture.address },
  { header: "Nomor Telepon", value: (capture) => digitsOnly(capture.phone) },
  { header: "WhatsApp", value: (capture) => digitsOnly(capture.whatsapp || capture.phone) },
  { header: "Website", value: (capture) => capture.website },
  { header: "Sosmed/Linktree", value: (capture) => capture.socialUrl },
  { header: "Instagram", value: (capture) => capture.instagram },
  { header: "Google Rating", value: (capture) => capture.rating },
  { header: "Jumlah Ulasan", value: (capture) => capture.reviewsCount },
  { header: "Status Website", value: (capture) => capture.websiteStatus },
  { header: "HOT Lead", value: (capture) => (!hasRealWebsite(capture) ? "YA" : "TIDAK") },
  { header: "Celah Digital", value: (capture) => (capture.digitalGaps ?? []).join("; ") },
  { header: "Peluang Solusi", value: (capture) => (capture.services ?? []).join("; ") },
  { header: "Prioritas", value: (capture) => String(capture.priority ?? 3) },
  { header: "PIC Nama", value: (capture) => capture.picName ?? "" },
  { header: "PIC Jabatan", value: (capture) => capture.picRole ?? "" },
  { header: "Catatan Sales", value: (capture) => capture.notes ?? "" },
  { header: "Link Google Maps", value: (capture) => capture.mapsUrl },
];

function serializeCsv(
  captures: readonly Capture[],
  columns: readonly CsvColumn[],
  bom: boolean,
): string {
  const header = columns.map((column) => escapeCsvCell(column.header)).join(",");
  const rows = captures.map((capture) =>
    columns.map((column) => escapeCsvCell(column.value(capture))).join(","),
  );
  return `${bom ? "\uFEFF" : ""}${[header, ...rows].join("\r\n")}`;
}

export function capturesToCsv(
  captures: readonly Capture[],
  options: { bom?: boolean } = {},
): string {
  return serializeCsv(captures, CRM_COLUMNS, options.bom ?? true);
}

export function capturesToDetailedCsv(
  captures: readonly Capture[],
  options: { bom?: boolean } = {},
): string {
  return serializeCsv(captures, SDR_DETAILED_COLUMNS, options.bom ?? true);
}

export function buildCsvFilename(format: "crm" | "detailed" = "crm"): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  return format === "crm" ? `crm-contact-${dateStr}.csv` : `sdr-leads-lengkap-${dateStr}.csv`;
}
