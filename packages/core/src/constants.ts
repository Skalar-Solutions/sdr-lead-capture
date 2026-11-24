/**
 * Semua enum & label dipakai bersama oleh extension, API, dan dashboard.
 * Jangan menambah string bebas di tempat lain — tambahkan di sini.
 */

export const WEBSITE_STATUSES = ["none", "outdated", "bad-ux", "decent"] as const;
export type WebsiteStatus = (typeof WEBSITE_STATUSES)[number];

export const LEAD_STATUSES = ["draft", "staging", "contacted", "qualified", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const DIGITAL_GAPS = [
  "no_website",
  "not_mobile_friendly",
  "no_online_ordering",
  "social_media_only",
  "no_seo",
  "no_online_payment",
] as const;
export type DigitalGap = (typeof DIGITAL_GAPS)[number];

export const SERVICES = [
  "website_dev",
  "ecommerce",
  "uiux_redesign",
  "mobile_app",
  "custom_software",
  "seo",
  "chatbot_crm",
] as const;
export type Service = (typeof SERVICES)[number];

export const DEAL_SIZES = ["small", "medium", "large", "enterprise"] as const;
export type DealSize = (typeof DEAL_SIZES)[number];

export const INDUSTRIES = [
  "F&B / Restaurant",
  "Retail / Toko",
  "Klinik / Healthcare",
  "Salon / Beauty",
  "Gym / Fitness",
  "Jasa / Services",
  "Pendidikan / Kursus",
  "Property / Real Estate",
  "Automotive",
  "Travel / Hotel",
  "Lainnya",
] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const WEBSITE_STATUS_LABELS: Record<WebsiteStatus, string> = {
  none: "Tidak Ada",
  outdated: "Outdated",
  "bad-ux": "Bad UX",
  decent: "Lumayan",
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  draft: "Draft",
  staging: "Staging",
  contacted: "Dihubungi",
  qualified: "Qualified",
  won: "Won",
  lost: "Lost",
};

export const DIGITAL_GAP_LABELS: Record<DigitalGap, string> = {
  no_website: "Tidak punya website",
  not_mobile_friendly: "Tidak mobile-friendly",
  no_online_ordering: "Tidak ada order/booking online",
  social_media_only: "Hanya mengandalkan Instagram/TikTok",
  no_seo: "Tidak ada Google SEO/Analytics",
  no_online_payment: "Tidak ada payment gateway otomatis",
};

export const SERVICE_LABELS: Record<Service, string> = {
  website_dev: "Website Development",
  ecommerce: "E-Commerce / Ordering",
  uiux_redesign: "UI/UX Redesign",
  mobile_app: "Mobile App",
  custom_software: "Custom Software",
  seo: "SEO Optimization",
  chatbot_crm: "Chatbot / CRM",
};

export const DEAL_SIZE_LABELS: Record<DealSize, string> = {
  small: "Small (< 10 jt)",
  medium: "Medium (10 - 50 jt)",
  large: "Large (50 - 150 jt)",
  enterprise: "Enterprise (150 jt+)",
};

export const PRIORITY_LABELS: Record<number, string> = {
  1: "Low Priority",
  2: "Low-Med",
  3: "Medium",
  4: "High Priority",
  5: "🔥 Hot Lead!",
};
