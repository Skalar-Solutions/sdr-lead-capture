import { ulid } from "ulid";
import { z } from "zod";

import {
  DEAL_SIZES,
  DIGITAL_GAPS,
  LEAD_STATUSES,
  SERVICES,
  WEBSITE_STATUSES,
} from "./constants";
import { normalizePhoneE164 } from "./phone";
import { normalizeName } from "./name";
import { computeGapScore, computePriority, deriveDigitalGaps, isHotLead } from "./scoring";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .default("")
  .refine((value) => value === "" || EMAIL_RE.test(value), "Email tidak valid");

const optionalUrl = z
  .string()
  .trim()
  .max(1000)
  .default("")
  .refine((value) => value === "" || isHttpUrl(value), "URL harus http(s) yang valid");

/**
 * Bentuk data yang dikirim dari extension. Semua field tekstual punya default
 * supaya payload minimal (mis. hanya companyName) tetap valid.
 */
export const leadInputSchema = z.object({
  companyName: z.string().trim().min(1, "Nama bisnis wajib diisi").max(200),
  industry: z.string().trim().max(100).default("Lainnya"),
  category: z.string().trim().max(120).default(""),
  address: z.string().trim().max(500).default(""),
  phone: z.string().trim().max(40).default(""),
  whatsapp: z.string().trim().max(40).default(""),
  email: optionalEmail,
  instagram: z.string().trim().max(100).default(""),
  website: optionalUrl,
  websiteStatus: z.enum(WEBSITE_STATUSES).default("none"),
  socialMediaOnly: z.boolean().default(false),
  mapsUrl: z.string().trim().max(2000).default(""),
  rating: z.number().min(0).max(5).nullable().default(null),
  reviewsCount: z.number().int().min(0).nullable().default(null),
  picName: z.string().trim().max(120).default(""),
  picRole: z.string().trim().max(80).default(""),
  notes: z.string().trim().max(4000).default(""),
  dealSize: z.enum(DEAL_SIZES).default("medium"),
  priority: z.number().int().min(1).max(5).optional(),
  digitalGaps: z.array(z.enum(DIGITAL_GAPS)).default([]),
  services: z.array(z.enum(SERVICES)).default([]),
  status: z.enum(LEAD_STATUSES).default("staging"),
  sourceUrl: z.string().trim().max(2000).default(""),
});

export type LeadInput = z.infer<typeof leadInputSchema>;

export const leadSchema = leadInputSchema.extend({
  id: z.string().min(1),
  orgId: z.string().min(1),
  nameNorm: z.string(),
  phoneE164: z.string().nullable(),
  whatsappE164: z.string().nullable(),
  isHotLead: z.boolean(),
  gapScore: z.number().int().min(0).max(10),
  priority: z.number().int().min(1).max(5),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type Lead = z.infer<typeof leadSchema>;

export const leadPatchSchema = leadInputSchema.partial();
export type LeadPatch = z.infer<typeof leadPatchSchema>;

export interface CreateLeadOptions {
  orgId: string;
  /** ULID dari client, dipakai sebagai idempotency key. */
  id?: string;
  now?: Date;
  /** Paksa prioritas (mis. user klik 5 bintang). */
  priority?: number;
}

/**
 * Satu-satunya jalan membuat lead. Dipakai extension, API, dan (nanti) importer.
 * Semua turunan (nameNorm, phoneE164, gaps, priority, hot) dihitung di sini.
 */
export function createLead(input: unknown, options: CreateLeadOptions): Lead {
  const parsed = leadInputSchema.parse(input);
  const now = options.now ?? new Date();
  const timestamp = now.toISOString();

  const socialMediaOnly = parsed.socialMediaOnly || parsed.websiteStatus === "none" && parsed.website === "";
  const hasRealWebsite = parsed.website !== "" && !socialMediaOnly;

  const derivedGaps = deriveDigitalGaps({
    websiteStatus: parsed.websiteStatus,
    hasRealWebsite,
    socialMediaOnly: parsed.socialMediaOnly,
  });

  const digitalGaps = parsed.digitalGaps.length > 0 ? parsed.digitalGaps : derivedGaps;
  const phoneE164 = normalizePhoneE164(parsed.phone);
  const whatsappE164 = normalizePhoneE164(parsed.whatsapp) ?? phoneE164;
  const hot = isHotLead({ websiteStatus: parsed.websiteStatus, hasRealWebsite, socialMediaOnly });

  return leadSchema.parse({
    ...parsed,
    id: options.id ?? ulid(),
    orgId: options.orgId,
    nameNorm: normalizeName(parsed.companyName),
    phoneE164,
    whatsappE164,
    digitalGaps,
    isHotLead: hot,
    gapScore: computeGapScore(digitalGaps),
    priority:
      parsed.priority ??
      options.priority ??
      computePriority({ websiteStatus: parsed.websiteStatus, hasRealWebsite, socialMediaOnly }),
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  });
}

/** Terapkan patch ke lead yang sudah ada, lalu validasi ulang hasilnya. */
export function applyLeadPatch(lead: Lead, patch: unknown, now: Date = new Date()): Lead {
  const parsedPatch = leadPatchSchema.parse(patch);
  const merged: Lead = {
    ...lead,
    ...parsedPatch,
    updatedAt: now.toISOString(),
  };

  const hasRealWebsite = merged.website !== "";
  const websiteChanged =
    parsedPatch.website !== undefined ||
    parsedPatch.websiteStatus !== undefined ||
    parsedPatch.socialMediaOnly !== undefined;

  const digitalGaps =
    parsedPatch.digitalGaps && parsedPatch.digitalGaps.length > 0
      ? parsedPatch.digitalGaps
      : websiteChanged
        ? deriveDigitalGaps({
            websiteStatus: merged.websiteStatus,
            hasRealWebsite,
            socialMediaOnly: merged.socialMediaOnly,
          })
        : merged.digitalGaps;

  return leadSchema.parse({
    ...merged,
    nameNorm: normalizeName(merged.companyName),
    phoneE164: normalizePhoneE164(merged.phone),
    whatsappE164: normalizePhoneE164(merged.whatsapp) ?? normalizePhoneE164(merged.phone),
    digitalGaps,
    isHotLead: isHotLead({ websiteStatus: merged.websiteStatus, hasRealWebsite, socialMediaOnly: merged.socialMediaOnly }),
    gapScore: computeGapScore(digitalGaps),
    priority:
      parsedPatch.priority ??
      (websiteChanged
        ? computePriority({ websiteStatus: merged.websiteStatus, hasRealWebsite, socialMediaOnly: merged.socialMediaOnly })
        : merged.priority),
  });
}
