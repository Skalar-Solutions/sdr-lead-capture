import type { Lead } from "@sdr/core";
import { browser } from "wxt/browser";

import { getApiConfig } from "./config";

const OUTBOX_KEY = "sdr_outbox";
const LAST_SYNC_KEY = "sdr_last_sync";

export interface SyncSummary {
  attempted: number;
  synced: number;
  remaining: number;
  error?: string;
}

interface SyncResponse {
  results?: Array<{ id?: string | null; status?: string; message?: string }>;
}

export async function readOutbox(): Promise<Lead[]> {
  const stored = await browser.storage.local.get(OUTBOX_KEY);
  const value = stored[OUTBOX_KEY];
  return Array.isArray(value) ? (value as Lead[]) : [];
}

export async function writeOutbox(leads: Lead[]): Promise<void> {
  await browser.storage.local.set({ [OUTBOX_KEY]: leads });
}

export async function countOutbox(): Promise<number> {
  return (await readOutbox()).length;
}

export async function updateBadge(count: number): Promise<void> {
  await browser.action.setBadgeBackgroundColor({ color: "#4f46e5" });
  await browser.action.setBadgeText({ text: count > 0 ? String(count) : "" });
}

export async function syncOutbox(): Promise<SyncSummary> {
  const config = await getApiConfig();
  const outbox = await readOutbox();

  if (outbox.length === 0) {
    await updateBadge(0);
    return { attempted: 0, synced: 0, remaining: 0 };
  }

  if (!config.baseUrl || !config.token) {
    return {
      attempted: outbox.length,
      synced: 0,
      remaining: outbox.length,
      error: "API base URL / token belum diisi",
    };
  }

  const endpoint = `${config.baseUrl.replace(/\/+$/, "")}/v1/sync`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify({ leads: outbox }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        attempted: outbox.length,
        synced: 0,
        remaining: outbox.length,
        error: `HTTP ${response.status}${body ? `: ${body.slice(0, 160)}` : ""}`,
      };
    }

    const payload = (await response.json()) as SyncResponse;
    const results = payload.results ?? [];

    const failedIds = new Set(
      results.filter((item) => item.status === "error").map((item) => item.id),
    );
    const syncedIds = new Set(
      results
        .filter((item) => item.status !== "error" && typeof item.id === "string")
        .map((item) => item.id as string),
    );

    const remaining = outbox.filter((lead) => !syncedIds.has(lead.id) || failedIds.has(lead.id));

    await writeOutbox(remaining);
    await browser.storage.local.set({ [LAST_SYNC_KEY]: new Date().toISOString() });
    await updateBadge(remaining.length);

    return {
      attempted: outbox.length,
      synced: outbox.length - remaining.length,
      remaining: remaining.length,
    };
  } catch (error) {
    return {
      attempted: outbox.length,
      synced: 0,
      remaining: outbox.length,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
