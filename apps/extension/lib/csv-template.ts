import { escapeCsvCell } from "@sdr/core";

import type { Capture } from "./capture";

export interface CsvColumn {
  header: string;
  value: (capture: Capture) => string;
}

/**
 * ============================================================================
 * TEMPLATE CSV — mengikuti `crm-contact-template.xlsx` (13 kolom)
 * ----------------------------------------------------------------------------
 * Urutan dan nama header harus sama persis dengan template import CRM.
 *
 * Nilai default yang bisa diubah:
 *   DEFAULT_CONTACT_TYPE  -> kolom "*Tipe Kontak" (contoh: Vendor/Pegawai)
 *   DEFAULT_COUNTRY       -> kolom "Negara"
 *   DEFAULT_GROUP         -> fallback "Grup Kontak" kalau kategori kosong
 *
 * Data scrape yang TIDAK ada kolomnya di template (website, sosmed, rating,
 * link Maps) sengaja tidak diekspor. Kalau CRM kamu menerima kolom tambahan,
 * tinggal tambahkan di akhir array ini.
 * ============================================================================
 */
const DEFAULT_CONTACT_TYPE = "Vendor";
const DEFAULT_COUNTRY = "Indonesia";
const DEFAULT_GROUP = "Google Maps";

export const CSV_COLUMNS: CsvColumn[] = [
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
  { header: "Nomor Telepon", value: (capture) => capture.phone },
  { header: "Tanggal Lahir (dd/mm/yyyy)", value: () => "" },
];

export function capturesToCsv(
  captures: readonly Capture[],
  options: { bom?: boolean } = {},
): string {
  const { bom = true } = options;

  const header = CSV_COLUMNS.map((column) => escapeCsvCell(column.header)).join(",");
  const rows = captures.map((capture) =>
    CSV_COLUMNS.map((column) => escapeCsvCell(column.value(capture))).join(","),
  );

  return `${bom ? "\uFEFF" : ""}${[header, ...rows].join("\r\n")}`;
}

export function buildCsvFilename(): string {
  return `crm-contact-${new Date().toISOString().slice(0, 10)}.csv`;
}
