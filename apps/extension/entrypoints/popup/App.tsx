import { createLead, type Lead } from "@sdr/core";
import { Alert, AlertDescription, AlertTitle } from "@sdr/ui/components/ui/alert";
import { Button } from "@sdr/ui/components/ui/button";
import { RefreshCw, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { browser } from "wxt/browser";

import { ApiSettings } from "@/components/api-settings";
import { LeadForm } from "@/components/lead-form";
import { DEFAULT_API_CONFIG, ensureHostPermission, getApiConfig, type ApiConfig } from "@/lib/config";
import type { SyncSummary } from "@/lib/sync";
import type { ScrapedPlace } from "@/entrypoints/content/scraper";
import { emptyLeadForm, toFormValues, type LeadFormValues } from "@/lib/form";

type SourceStatus = { tone: "info" | "warn"; text: string };

async function readPending(): Promise<number> {
  const { sdr_outbox } = await browser.storage.local.get("sdr_outbox");
  return Array.isArray(sdr_outbox) ? sdr_outbox.length : 0;
}

export default function App() {
  const [values, setValues] = useState<LeadFormValues>(emptyLeadForm);
  const [formKey, setFormKey] = useState(0);
  const [pending, setPending] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiConfig, setApiConfig] = useState<ApiConfig>(DEFAULT_API_CONFIG);
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<SourceStatus>({ tone: "info", text: "Memeriksa tab..." });

  useEffect(() => {
    void getApiConfig().then(setApiConfig);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const pendingCount = await readPending();
      if (cancelled) return;
      setPending(pendingCount);

      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        const url = tab?.url ?? "";
        const isMaps = /google\.(com|co\.id)\/maps/.test(url) || /maps\.google\./.test(url);

        if (!isMaps) {
          setSource({ tone: "warn", text: "Bukan Google Maps. Form tetap bisa diisi manual." });
          return;
        }

        if (tab?.id == null) {
          setSource({ tone: "warn", text: "Tab tidak terdeteksi." });
          return;
        }

        const response = (await browser.tabs.sendMessage(tab.id, { type: "SDR_SCRAPE" })) as
          | { ok?: boolean; data?: ScrapedPlace; error?: string }
          | undefined;

        if (response?.ok && response.data) {
          setValues(toFormValues(response.data));
          setFormKey((key) => key + 1);
          setSource({
            tone: "info",
            text: response.data.companyName
              ? `Terekstrak: ${response.data.companyName}`
              : "Data Maps terbaca, tapi nama belum ketemu. Klik salah satu tempat.",
          });
        } else {
          setSource({
            tone: "warn",
            text: "Belum ada tempat yang kebaca. Klik salah satu hasil di Maps, lalu buka popup lagi.",
          });
        }
      } catch {
        setSource({
          tone: "warn",
          text: "Content script belum siap. Refresh tab Google Maps lalu coba lagi.",
        });
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function persist(formValues: LeadFormValues, target: "staging" | "draft") {
    setSubmitting(true);
    try {
      const lead = createLead({ ...formValues, status: target }, { orgId: "local" });
      const { sdr_outbox } = await browser.storage.local.get("sdr_outbox");
      const outbox = Array.isArray(sdr_outbox) ? (sdr_outbox as Lead[]) : [];

      await browser.storage.local.set({ sdr_outbox: [lead, ...outbox] });
      setPending(outbox.length + 1);

      toast.success(target === "draft" ? "Draft tersimpan" : "Lead masuk outbox", {
        description: `${lead.companyName}${lead.isHotLead ? " · 🔥 hot lead" : ""}`,
      });

      setValues(emptyLeadForm);
      setFormKey((key) => key + 1);
    } catch (error) {
      toast.error("Gagal menyimpan", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSync() {
    // request() harus terjadi di dalam gesture klik → jangan await apa pun sebelumnya.
    const permission = ensureHostPermission(apiConfig.baseUrl);
    setSyncing(true);
    try {
      const granted = await permission;
      if (!granted) {
        toast.error("Izin akses API belum diberikan", {
          description: "Buka pengaturan, isi URL API, lalu simpan ulang.",
        });
        return;
      }

      const summary = (await browser.runtime.sendMessage({ type: "SDR_SYNC_NOW" })) as
        | SyncSummary
        | undefined;

      if (!summary) {
        toast.error("Tidak ada respons dari background");
        return;
      }

      if (summary.error) {
        toast.error("Sync gagal", { description: summary.error });
      } else {
        toast.success("Sync selesai", {
          description: `${summary.synced} terkirim · ${summary.remaining} tersisa`,
        });
      }
      setPending(summary.remaining);
    } catch (error) {
      toast.error("Sync gagal", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSyncing(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Memuat...
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-2 px-3 pt-3">
        <Alert
          variant={source.tone === "warn" ? "destructive" : "default"}
          className="w-auto flex-1 py-2"
        >
          <AlertTitle className="text-xs">
            {source.tone === "warn" ? "Perhatian" : "Sumber"}
          </AlertTitle>
          <AlertDescription className="text-xs">{source.text}</AlertDescription>
        </Alert>
        <div className="flex gap-1">
          <Button
            type="button"
            size="icon"
            variant="outline"
            title="Sync outbox sekarang"
            disabled={syncing}
            onClick={handleSync}
          >
            <RefreshCw className={syncing ? "size-4 animate-spin" : "size-4"} />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            title="Pengaturan API"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="size-4" />
          </Button>
        </div>
      </div>

      <LeadForm
        key={formKey}
        defaultValues={values}
        submitting={submitting}
        pendingCount={pending}
        onSubmit={(formValues) => persist(formValues, "staging")}
        onDraft={(formValues) => persist(formValues, "draft")}
      />

      <ApiSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={() => {
          void getApiConfig().then(setApiConfig);
        }}
      />
    </div>
  );
}
