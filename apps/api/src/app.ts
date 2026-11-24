import {
  DIGITAL_GAPS,
  LEAD_STATUSES,
  applyLeadPatch,
  createLead,
  leadsToCsv,
  type Lead,
  type LeadStatus,
} from "@sdr/core";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { ZodError } from "zod";

import {
  findLeadByPhone,
  getLeadById,
  insertLead,
  isUniqueViolation,
  listLeads,
  recordEvent,
  softDeleteLead,
  statsSince,
  updateLeadRow,
} from "./db/leads";
import { requireAuth } from "./middleware/auth";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      if (!origin) return origin;
      if (origin.startsWith("chrome-extension://")) return origin;
      const allowed = (c.env.ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((value: string) => value.trim())
        .filter(Boolean);
      return allowed.includes(origin) ? origin : null;
    },
    allowHeaders: ["Authorization", "Content-Type", "Idempotency-Key", "If-Unmodified-Since"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 86400,
  }),
);

app.get("/health", (c) => c.json({ ok: true, service: "sdr-api", now: new Date().toISOString() }));

app.use("/v1/*", requireAuth);

function errorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues
      .map((issue) => `${issue.path.join(".") || "field"}: ${issue.message}`)
      .join("; ");
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

function fail(
  c: Context<AppEnv>,
  status: 400 | 401 | 404 | 409 | 413 | 422 | 500,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
) {
  return c.json({ error: { code, message, ...extra } }, status);
}

async function readJson(c: Context<AppEnv>): Promise<unknown | undefined> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

function utcDayStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

app.get("/v1/me", async (c) => {
  const stats = await statsSince(c.env.DB, c.get("orgId"), utcDayStart());
  return c.json({
    data: {
      user: c.get("user"),
      orgId: c.get("orgId"),
      today: stats,
    },
  });
});

app.post("/v1/leads", async (c) => {
  const orgId = c.get("orgId");
  const actor = c.get("user").email;
  const idempotencyKey = c.req.header("Idempotency-Key")?.trim() || undefined;

  if (idempotencyKey) {
    const existing = await getLeadById(c.env.DB, orgId, idempotencyKey);
    if (existing) return c.json({ data: existing, idempotent: true });
  }

  const body = await readJson(c);
  if (body === undefined) return fail(c, 400, "invalid_json", "Body harus JSON");

  let lead: Lead;
  try {
    lead = createLead(body, { orgId, id: idempotencyKey });
  } catch (error) {
    return fail(c, 422, "validation_error", errorMessage(error));
  }

  if (lead.phoneE164) {
    const duplicate = await findLeadByPhone(c.env.DB, orgId, lead.phoneE164);
    if (duplicate) {
      return fail(c, 409, "duplicate", "Nomor telepon sudah terdaftar", {
        existingId: duplicate.id,
      });
    }
  }

  try {
    await insertLead(c.env.DB, lead, actor);
    await recordEvent(c.env.DB, lead.id, actor, "created", { status: lead.status });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail(c, 409, "duplicate", "Lead dengan nomor ini sudah ada");
    }
    throw error;
  }

  return c.json({ data: lead }, 201);
});

app.get("/v1/leads", async (c) => {
  const statusParam = c.req.query("status");
  if (statusParam && !LEAD_STATUSES.includes(statusParam as LeadStatus)) {
    return fail(c, 422, "validation_error", `Status tidak dikenal: ${statusParam}`);
  }

  const limit = Math.min(200, Math.max(1, Number(c.req.query("limit") ?? 50) || 50));
  const offset = Math.max(0, Number(c.req.query("offset") ?? 0) || 0);

  const result = await listLeads(c.env.DB, c.get("orgId"), {
    status: statusParam as LeadStatus | undefined,
    q: c.req.query("q") ?? undefined,
    limit,
    offset,
  });

  return c.json(result);
});

app.get("/v1/leads/export.csv", async (c) => {
  const result = await listLeads(c.env.DB, c.get("orgId"), { limit: 5000, offset: 0 });
  const csv = leadsToCsv(result.items);
  const filename = `sdr-leads-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Total-Count": String(result.total),
    },
  });
});

app.get("/v1/leads/:id", async (c) => {
  const lead = await getLeadById(c.env.DB, c.get("orgId"), c.req.param("id"));
  if (!lead) return fail(c, 404, "not_found", "Lead tidak ditemukan");
  return c.json({ data: lead });
});

app.patch("/v1/leads/:id", async (c) => {
  const orgId = c.get("orgId");
  const actor = c.get("user").email;
  const current = await getLeadById(c.env.DB, orgId, c.req.param("id"));
  if (!current) return fail(c, 404, "not_found", "Lead tidak ditemukan");

  const body = await readJson(c);
  if (body === undefined || body === null || typeof body !== "object") {
    return fail(c, 400, "invalid_json", "Body harus JSON object");
  }

  const record = body as Record<string, unknown>;
  const expected = c.req.header("If-Unmodified-Since") ?? record.expectedUpdatedAt;
  if (typeof expected === "string" && expected !== current.updatedAt) {
    return fail(c, 409, "conflict", "Lead sudah diubah di tempat lain", { data: current });
  }

  let updated: Lead;
  try {
    updated = applyLeadPatch(current, body);
  } catch (error) {
    return fail(c, 422, "validation_error", errorMessage(error));
  }

  await updateLeadRow(c.env.DB, updated);
  await recordEvent(c.env.DB, updated.id, actor, "updated", { status: updated.status });

  return c.json({ data: updated });
});

app.delete("/v1/leads/:id", async (c) => {
  const now = new Date().toISOString();
  const deleted = await softDeleteLead(c.env.DB, c.get("orgId"), c.req.param("id"), now);
  if (!deleted) return fail(c, 404, "not_found", "Lead tidak ditemukan");
  await recordEvent(c.env.DB, c.req.param("id"), c.get("user").email, "deleted");
  return c.json({ ok: true });
});

interface SyncResult {
  id: string | null;
  status: "created" | "exists" | "duplicate" | "error";
  existingId?: string;
  message?: string;
}

app.post("/v1/sync", async (c) => {
  const orgId = c.get("orgId");
  const actor = c.get("user").email;
  const body = (await readJson(c)) as { leads?: unknown } | undefined;

  if (!body || !Array.isArray(body.leads)) {
    return fail(c, 422, "validation_error", "Body harus { leads: [...] }");
  }
  if (body.leads.length > 200) {
    return fail(c, 413, "payload_too_large", "Maksimal 200 lead per sync");
  }

  const results: SyncResult[] = [];

  for (const raw of body.leads) {
    const rawId =
      raw && typeof raw === "object" && typeof (raw as { id?: unknown }).id === "string"
        ? (raw as { id: string }).id
        : undefined;

    if (rawId) {
      const existing = await getLeadById(c.env.DB, orgId, rawId);
      if (existing) {
        results.push({ id: rawId, status: "exists" });
        continue;
      }
    }

    let lead: Lead;
    try {
      lead = createLead(raw, { orgId, id: rawId });
    } catch (error) {
      results.push({ id: rawId ?? null, status: "error", message: errorMessage(error) });
      continue;
    }

    if (lead.phoneE164) {
      const duplicate = await findLeadByPhone(c.env.DB, orgId, lead.phoneE164);
      if (duplicate) {
        results.push({ id: lead.id, status: "duplicate", existingId: duplicate.id });
        continue;
      }
    }

    try {
      await insertLead(c.env.DB, lead, actor);
      await recordEvent(c.env.DB, lead.id, actor, "created", { via: "sync" });
      results.push({ id: lead.id, status: "created" });
    } catch (error) {
      if (isUniqueViolation(error)) {
        results.push({ id: lead.id, status: "duplicate" });
      } else {
        results.push({ id: lead.id, status: "error", message: errorMessage(error) });
      }
    }
  }

  return c.json({ results });
});

app.get("/v1/stats/today", async (c) => {
  const stats = await statsSince(c.env.DB, c.get("orgId"), utcDayStart());
  return c.json({ data: stats });
});

app.get("/v1/meta", (c) =>
  c.json({
    data: {
      digitalGaps: DIGITAL_GAPS,
      leadStatuses: LEAD_STATUSES,
    },
  }),
);

app.notFound((c) => c.json({ error: { code: "not_found", message: "Endpoint tidak ada" } }, 404));

app.onError((error, c) => {
  console.error("unhandled", error);
  return c.json({ error: { code: "internal_error", message: "Terjadi kesalahan server" } }, 500);
});

export default app;
