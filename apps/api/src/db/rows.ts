import type { Lead } from "@sdr/core";

export interface LeadRow {
  id: string;
  org_id: string;
  company_name: string;
  name_norm: string;
  industry: string;
  category: string;
  address: string;
  phone: string;
  phone_e164: string | null;
  whatsapp: string;
  whatsapp_e164: string | null;
  email: string;
  instagram: string;
  website: string;
  website_status: string;
  social_media_only: number;
  maps_url: string;
  rating: number | null;
  reviews_count: number | null;
  pic_name: string;
  pic_role: string;
  notes: string;
  deal_size: string;
  priority: number;
  is_hot_lead: number;
  gap_score: number;
  digital_gaps: string;
  services: string;
  status: string;
  source_url: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function parseJsonArray<T>(value: string): T[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function rowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    orgId: row.org_id,
    companyName: row.company_name,
    nameNorm: row.name_norm,
    industry: row.industry,
    category: row.category,
    address: row.address,
    phone: row.phone,
    phoneE164: row.phone_e164,
    whatsapp: row.whatsapp,
    whatsappE164: row.whatsapp_e164,
    email: row.email,
    instagram: row.instagram,
    website: row.website,
    websiteStatus: row.website_status as Lead["websiteStatus"],
    socialMediaOnly: row.social_media_only === 1,
    mapsUrl: row.maps_url,
    rating: row.rating,
    reviewsCount: row.reviews_count,
    picName: row.pic_name,
    picRole: row.pic_role,
    notes: row.notes,
    dealSize: row.deal_size as Lead["dealSize"],
    priority: row.priority,
    isHotLead: row.is_hot_lead === 1,
    gapScore: row.gap_score,
    digitalGaps: parseJsonArray<Lead["digitalGaps"][number]>(row.digital_gaps),
    services: parseJsonArray<Lead["services"][number]>(row.services),
    status: row.status as Lead["status"],
    sourceUrl: row.source_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}
