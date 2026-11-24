import { browser } from "wxt/browser";

export interface ApiConfig {
  baseUrl: string;
  token: string;
}

const CONFIG_KEY = "sdr_api_config";

export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: "http://127.0.0.1:8787",
  token: "dev-token",
};

export async function getApiConfig(): Promise<ApiConfig> {
  const stored = await browser.storage.local.get(CONFIG_KEY);
  const value = stored[CONFIG_KEY] as Partial<ApiConfig> | undefined;
  return { ...DEFAULT_API_CONFIG, ...value };
}

export async function saveApiConfig(config: ApiConfig): Promise<void> {
  await browser.storage.local.set({ [CONFIG_KEY]: config });
}

/** Pastikan extension boleh fetch ke origin API (optional host permission). */
export async function ensureHostPermission(baseUrl: string): Promise<boolean> {
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;

    // Jangan panggil contains() dulu: request() harus terjadi di dalam user gesture.
    // Kalau izin sudah ada, Chrome langsung resolve tanpa prompt.
    return await browser.permissions.request({ origins: [`${url.protocol}//${url.host}/*`] });
  } catch {
    return false;
  }
}
