import {
  DEAL_SIZES,
  DIGITAL_GAPS,
  LEAD_STATUSES,
  SERVICES,
  WEBSITE_STATUSES,
  deriveDigitalGaps,
  isHttpUrl,
} from "@sdr/core";
import { z } from "zod";

import type { ScrapedPlace } from "@/entrypoints/content/scraper";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Bentuk nilai form. Semua field wajib ada (bukan optional) supaya
 * react-hook-form simpel; konversi ke LeadInput terjadi di createLead().
 */
export const leadFormSchema = z.object({
  companyName: z.string().trim().min(1, "Nama bisnis wajib diisi").max(200),
  industry: z.string().min(1),
  category: z.string().max(120),
  address: z.string().max(500),
  phone: z.string().max(40),
  whatsapp: z.string().max(40),
  email: z
    .string()
    .max(200)
    .refine((value) => value === "" || EMAIL_RE.test(value), "Email tidak valid"),
  instagram: z.string().max(100),
  website: z
    .string()
    .max(1000)
    .refine((value) => value === "" || isHttpUrl(value), "URL harus http(s)"),
  websiteStatus: z.enum(WEBSITE_STATUSES),
  socialMediaOnly: z.boolean(),
  mapsUrl: z.string().max(2000),
  rating: z.number().min(0).max(5).nullable(),
  reviewsCount: z.number().int().min(0).nullable(),
  picName: z.string().max(120),
  picRole: z.string().max(80),
  notes: z.string().max(4000),
  dealSize: z.enum(DEAL_SIZES),
  digitalGaps: z.array(z.enum(DIGITAL_GAPS)),
  services: z.array(z.enum(SERVICES)),
  priority: z.number().int().min(1).max(5),
  status: z.enum(LEAD_STATUSES),
  sourceUrl: z.string().max(2000),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

export const emptyLeadForm: LeadFormValues = {
  companyName: "",
  industry: "Lainnya",
  category: "",
  address: "",
  phone: "",
  whatsapp: "",
  email: "",
  instagram: "",
  website: "",
  websiteStatus: "none",
  socialMediaOnly: false,
  mapsUrl: "",
  rating: null,
  reviewsCount: null,
  picName: "",
  picRole: "",
  notes: "",
  dealSize: "medium",
  digitalGaps: [],
  services: ["website_dev"],
  priority: 3,
  status: "staging",
  sourceUrl: "",
};

function parseRating(raw: string): number | null {
  const value = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(value) ? Math.min(5, Math.max(0, value)) : null;
}

function parseCount(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) ? value : null;
}

/** Ubah hasil scrape Maps jadi nilai form. */
export function toFormValues(place: ScrapedPlace): LeadFormValues {
  const hasRealWebsite = place.isRealWebsite && place.website !== "";
  const websiteStatus = hasRealWebsite ? "decent" : "none";

  return {
    ...emptyLeadForm,
    companyName: place.companyName,
    category: place.category,
    address: place.address,
    phone: place.phone,
    whatsapp: place.phone,
    website: place.website,
    instagram: place.instagramHandle,
    websiteStatus,
    socialMediaOnly: place.isSocialMediaOnly,
    mapsUrl: place.mapsUrl,
    rating: parseRating(place.rating),
    reviewsCount: parseCount(place.reviewsCount),
    digitalGaps: deriveDigitalGaps({ websiteStatus, hasRealWebsite, socialMediaOnly: place.isSocialMediaOnly }),
    sourceUrl: place.mapsUrl,
    priority: hasRealWebsite ? 3 : 5,
    status: "staging",
  };
}
