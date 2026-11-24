import type { Lead, LeadStatus } from "@sdr/core";

export interface DashboardConfig {
  baseUrl: string;
  token: string;
}

const CONFIG_KEY = "sdr_dashboard_config";

export const DEFAULT_CONFIG: DashboardConfig = {
  baseUrl: "http://127.0.0.1:8787",
  token: "dev-token",
};

export function getConfig(): DashboardConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<DashboardConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: DashboardConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export interface LeadListResponse {
  items: Lead[];
  total: number;
  limit: number;
  offset: number;
}

export interface TodayStats {
  total: number;
  hot: number;
  byStatus: Record<string, number>;
}

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = getConfig();
  const response = await fetch(`${config.baseUrl.replace(/\/+$/, "")}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.token}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as ApiErrorBody;
      if (body.error?.message) message = body.error.message;
    } catch {
      // biarkan pesan default
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function listLeads(params: {
  q?: string;
  status?: LeadStatus;
  limit: number;
  offset: number;
}): Promise<LeadListResponse> {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.status) search.set("status", params.status);
  search.set("limit", String(params.limit));
  search.set("offset", String(params.offset));

  return request<LeadListResponse>(`/v1/leads?${search.toString()}`);
}

export async function getStats(): Promise<TodayStats> {
  const response = await request<{ data: TodayStats }>("/v1/stats/today");
  return response.data;
}

export async function deleteLead(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/v1/leads/${id}`, { method: "DELETE" });
}

export async function downloadCsv(): Promise<void> {
  const config = getConfig();
  const response = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/v1/leads/export.csv`, {
    headers: { Authorization: `Bearer ${config.token}` },
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `sdr-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
