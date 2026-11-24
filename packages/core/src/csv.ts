import {
  DEAL_SIZE_LABELS,
  DIGITAL_GAP_LABELS,
  LEAD_STATUS_LABELS,
  PRIORITY_LABELS,
  SERVICE_LABELS,
  WEBSITE_STATUS_LABELS,
} from "./constants";
import type { Lead } from "./lead";

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Cell CSV aman:
 * - prefix `'` untuk nilai yang bisa dieksekusi Excel/Sheets (CSV injection)
 * - escape kutip ganda & newline
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export const CSV_HEADERS = [
  "ID",
  "Waktu Submit",
  "Nama Perusahaan",
  "Industri",
  "Kategori Maps",
  "Alamat",
  "Telepon",
  "WhatsApp",
  "Email",
  "Website",
  "Instagram",
  "PIC Nama",
  "PIC Jabatan",
  "Status Website",
  "Digital Gaps",
  "Solusi Ditawarkan",
  "Deal Size",
  "Priority",
  "Gap Score",
  "Hot Lead",
  "Notes",
  "Status Lead",
  "Sumber URL",
] as const;

export function leadToCsvRow(lead: Lead): string[] {
  return [
    lead.id,
    lead.createdAt,
    lead.companyName,
    lead.industry,
    lead.category,
    lead.address,
    lead.phone ? `'${lead.phone}` : "",
    lead.whatsapp ? `'${lead.whatsapp}` : "",
    lead.email,
    lead.website,
    lead.instagram,
    lead.picName,
    lead.picRole,
    WEBSITE_STATUS_LABELS[lead.websiteStatus] ?? lead.websiteStatus,
    lead.digitalGaps.map((gap) => DIGITAL_GAP_LABELS[gap] ?? gap).join("; "),
    lead.services.map((service) => SERVICE_LABELS[service] ?? service).join("; "),
    DEAL_SIZE_LABELS[lead.dealSize] ?? lead.dealSize,
    PRIORITY_LABELS[lead.priority] ?? String(lead.priority),
    String(lead.gapScore),
    lead.isHotLead ? "YA" : "TIDAK",
    lead.notes,
    LEAD_STATUS_LABELS[lead.status] ?? lead.status,
    lead.sourceUrl,
  ];
}

export function leadsToCsv(leads: readonly Lead[], options: { bom?: boolean } = {}): string {
  const { bom = true } = options;
  const lines = [CSV_HEADERS.join(","), ...leads.map((lead) => leadToCsvRow(lead).map(escapeCsvCell).join(","))];
  return `${bom ? "\uFEFF" : ""}${lines.join("\r\n")}`;
}
