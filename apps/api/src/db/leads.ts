import type { Lead, LeadStatus } from "@sdr/core";

import { rowToLead, type LeadRow } from "./rows";

const COLUMNS = [
  "id",
  "org_id",
  "company_name",
  "name_norm",
  "industry",
  "category",
  "address",
  "phone",
  "phone_e164",
  "whatsapp",
  "whatsapp_e164",
  "email",
  "instagram",
  "website",
  "website_status",
  "social_media_only",
  "maps_url",
  "rating",
  "reviews_count",
  "pic_name",
  "pic_role",
  "notes",
  "deal_size",
  "priority",
  "is_hot_lead",
  "gap_score",
  "digital_gaps",
  "services",
  "status",
  "source_url",
  "created_by",
  "created_at",
  "updated_at",
  "deleted_at",
] as const;

function valuesOf(lead: Lead, createdBy: string): unknown[] {
  return [
    lead.id,
    lead.orgId,
    lead.companyName,
    lead.nameNorm,
    lead.industry,
    lead.category,
    lead.address,
    lead.phone,
    lead.phoneE164,
    lead.whatsapp,
    lead.whatsappE164,
    lead.email,
    lead.instagram,
    lead.website,
    lead.websiteStatus,
    lead.socialMediaOnly ? 1 : 0,
    lead.mapsUrl,
    lead.rating,
    lead.reviewsCount,
    lead.picName,
    lead.picRole,
    lead.notes,
    lead.dealSize,
    lead.priority,
    lead.isHotLead ? 1 : 0,
    lead.gapScore,
    JSON.stringify(lead.digitalGaps),
    JSON.stringify(lead.services),
    lead.status,
    lead.sourceUrl,
    createdBy,
    lead.createdAt,
    lead.updatedAt,
    lead.deletedAt,
  ];
}

export async function getLeadById(db: D1Database, orgId: string, id: string): Promise<Lead | null> {
  const row = await db
    .prepare("SELECT * FROM leads WHERE org_id = ? AND id = ? AND deleted_at IS NULL")
    .bind(orgId, id)
    .first<LeadRow>();
  return row ? rowToLead(row) : null;
}

export async function findLeadByPhone(
  db: D1Database,
  orgId: string,
  phoneE164: string,
): Promise<Lead | null> {
  const row = await db
    .prepare(
      "SELECT * FROM leads WHERE org_id = ? AND phone_e164 = ? AND deleted_at IS NULL LIMIT 1",
    )
    .bind(orgId, phoneE164)
    .first<LeadRow>();
  return row ? rowToLead(row) : null;
}

export async function insertLead(db: D1Database, lead: Lead, createdBy: string): Promise<void> {
  const placeholders = COLUMNS.map(() => "?").join(", ");
  await db
    .prepare(`INSERT INTO leads (${COLUMNS.join(", ")}) VALUES (${placeholders})`)
    .bind(...valuesOf(lead, createdBy))
    .run();
}

export async function updateLeadRow(db: D1Database, lead: Lead): Promise<void> {
  await db
    .prepare(
      `UPDATE leads SET
        company_name = ?, name_norm = ?, industry = ?, category = ?, address = ?,
        phone = ?, phone_e164 = ?, whatsapp = ?, whatsapp_e164 = ?, email = ?,
        instagram = ?, website = ?, website_status = ?, social_media_only = ?,
        maps_url = ?, rating = ?, reviews_count = ?, pic_name = ?, pic_role = ?,
        notes = ?, deal_size = ?, priority = ?, is_hot_lead = ?, gap_score = ?,
        digital_gaps = ?, services = ?, status = ?, source_url = ?, updated_at = ?
      WHERE id = ? AND org_id = ? AND deleted_at IS NULL`,
    )
    .bind(
      lead.companyName,
      lead.nameNorm,
      lead.industry,
      lead.category,
      lead.address,
      lead.phone,
      lead.phoneE164,
      lead.whatsapp,
      lead.whatsappE164,
      lead.email,
      lead.instagram,
      lead.website,
      lead.websiteStatus,
      lead.socialMediaOnly ? 1 : 0,
      lead.mapsUrl,
      lead.rating,
      lead.reviewsCount,
      lead.picName,
      lead.picRole,
      lead.notes,
      lead.dealSize,
      lead.priority,
      lead.isHotLead ? 1 : 0,
      lead.gapScore,
      JSON.stringify(lead.digitalGaps),
      JSON.stringify(lead.services),
      lead.status,
      lead.sourceUrl,
      lead.updatedAt,
      lead.id,
      lead.orgId,
    )
    .run();
}

export async function softDeleteLead(
  db: D1Database,
  orgId: string,
  id: string,
  now: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      "UPDATE leads SET deleted_at = ?, updated_at = ? WHERE id = ? AND org_id = ? AND deleted_at IS NULL",
    )
    .bind(now, now, id, orgId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export interface ListLeadsOptions {
  status?: LeadStatus;
  q?: string;
  limit: number;
  offset: number;
}

export interface ListLeadsResult {
  items: Lead[];
  total: number;
  limit: number;
  offset: number;
}

export async function listLeads(
  db: D1Database,
  orgId: string,
  options: ListLeadsOptions,
): Promise<ListLeadsResult> {
  const clauses = ["org_id = ?", "deleted_at IS NULL"];
  const params: unknown[] = [orgId];

  if (options.status) {
    clauses.push("status = ?");
    params.push(options.status);
  }

  const q = options.q?.trim();
  if (q) {
    const like = `%${q}%`;
    clauses.push("(company_name LIKE ? OR phone LIKE ? OR address LIKE ? OR notes LIKE ?)");
    params.push(like, like, like, like);
  }

  const where = clauses.join(" AND ");

  const totalRow = await db
    .prepare(`SELECT COUNT(*) AS count FROM leads WHERE ${where}`)
    .bind(...params)
    .first<{ count: number }>();

  const rows = await db
    .prepare(`SELECT * FROM leads WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
    .bind(...params, options.limit, options.offset)
    .all<LeadRow>();

  return {
    items: rows.results.map(rowToLead),
    total: totalRow?.count ?? 0,
    limit: options.limit,
    offset: options.offset,
  };
}

export interface TodayStats {
  total: number;
  hot: number;
  byStatus: Record<string, number>;
}

export async function statsSince(db: D1Database, orgId: string, since: string): Promise<TodayStats> {
  const rows = await db
    .prepare(
      `SELECT status, COUNT(*) AS count, COALESCE(SUM(is_hot_lead), 0) AS hot
       FROM leads
       WHERE org_id = ? AND deleted_at IS NULL AND created_at >= ?
       GROUP BY status`,
    )
    .bind(orgId, since)
    .all<{ status: string; count: number; hot: number }>();

  const byStatus: Record<string, number> = {};
  let total = 0;
  let hot = 0;

  for (const row of rows.results) {
    byStatus[row.status] = row.count;
    total += row.count;
    hot += row.hot;
  }

  return { total, hot, byStatus };
}

export async function recordEvent(
  db: D1Database,
  leadId: string,
  actor: string,
  type: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO lead_events (id, lead_id, actor, type, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(crypto.randomUUID(), leadId, actor, type, JSON.stringify(payload), new Date().toISOString())
    .run();
}

export function isUniqueViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /UNIQUE constraint failed/i.test(message);
}
