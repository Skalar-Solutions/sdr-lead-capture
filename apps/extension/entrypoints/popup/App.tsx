import { createLead, type Lead } from "@sdr/core";
import { Alert, AlertDescription, AlertTitle } from "@sdr/ui/components/ui/alert";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { browser } from "wxt/browser";

import { LeadForm } from "@/components/lead-form";
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
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<SourceStatus>({ tone: "info", text: "Memeriksa tab..." });

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

  if (!ready) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Memuat...
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Alert
        variant={source.tone === "warn" ? "destructive" : "default"}
        className="mx-3 mt-3 w-auto py-2"
      >
        <AlertTitle className="text-xs">{source.tone === "warn" ? "Perhatian" : "Sumber"}</AlertTitle>
        <AlertDescription className="text-xs">{source.text}</AlertDescription>
      </Alert>

      <LeadForm
        key={formKey}
        defaultValues={values}
        submitting={submitting}
        pendingCount={pending}
        onSubmit={(formValues) => persist(formValues, "staging")}
        onDraft={(formValues) => persist(formValues, "draft")}
      />
    </div>
  );
}
