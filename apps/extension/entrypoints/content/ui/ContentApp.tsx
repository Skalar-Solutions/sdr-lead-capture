import { createLead, type Lead } from "@sdr/core";
import { Badge } from "@sdr/ui/components/ui/badge";
import { Button } from "@sdr/ui/components/ui/button";
import { RefreshCw, Target, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { browser } from "wxt/browser";

import { LeadForm } from "@/components/lead-form";
import { emptyLeadForm, toFormValues, type LeadFormValues } from "@/lib/form";

import { extractBusinessData } from "../scraper";

export function ContentApp() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<LeadFormValues>(emptyLeadForm);
  const [formKey, setFormKey] = useState(0);
  const [pending, setPending] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const refreshPending = useCallback(async () => {
    const { sdr_outbox } = await browser.storage.local.get("sdr_outbox");
    setPending(Array.isArray(sdr_outbox) ? sdr_outbox.length : 0);
  }, []);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending]);

  const scrape = useCallback(() => {
    const data = extractBusinessData(document, location.href);
    if (!data.companyName) {
      setNotice("Klik salah satu tempat di Maps dulu, lalu sync ulang.");
      return;
    }
    setValues(toFormValues(data));
    setFormKey((key) => key + 1);
    setNotice(
      `Tersinkron: ${data.companyName}${data.isSocialMediaOnly ? ` · ${data.socialType} only` : ""}`,
    );
  }, []);

  function handleOpen() {
    scrape();
    setOpen(true);
  }

  async function persist(formValues: LeadFormValues, target: "staging" | "draft") {
    setSaving(true);
    try {
      const lead = createLead({ ...formValues, status: target }, { orgId: "local" });
      const { sdr_outbox } = await browser.storage.local.get("sdr_outbox");
      const outbox = Array.isArray(sdr_outbox) ? (sdr_outbox as Lead[]) : [];

      await browser.storage.local.set({ sdr_outbox: [lead, ...outbox] });
      setPending(outbox.length + 1);
      setNotice(
        target === "draft"
          ? "Draft tersimpan di outbox."
          : `Masuk outbox: ${lead.companyName}${lead.isHotLead ? " · 🔥 hot" : ""}`,
      );
      setOpen(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <div className="fixed bottom-6 right-6 z-[2147483647] flex flex-col items-end gap-2">
        {notice ? (
          <div className="max-w-[320px] rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-lg">
            {notice}
          </div>
        ) : null}
        <Button size="lg" className="rounded-full shadow-xl" onClick={handleOpen}>
          <Target className="size-4" />
          SDR Capture
          {pending > 0 ? <Badge variant="secondary">{pending}</Badge> : null}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[2147483647] w-[430px] max-w-[calc(100vw-2rem)]">
      <div className="mb-2 flex items-center gap-2 rounded-md bg-foreground px-2 py-1.5 text-xs text-background shadow-lg">
        <span className="min-w-0 flex-1 truncate">{notice || "Capture lead dari Maps"}</span>
        <Button
          size="icon"
          variant="ghost"
          title="Sync ulang dari halaman"
          className="size-6 text-background hover:bg-background/10"
          onClick={scrape}
        >
          <RefreshCw className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          title="Tutup"
          className="size-6 text-background hover:bg-background/10"
          onClick={() => setOpen(false)}
        >
          <X className="size-3.5" />
        </Button>
      </div>

      <LeadForm
        key={formKey}
        defaultValues={values}
        submitting={saving}
        pendingCount={pending}
        onSubmit={(formValues) => persist(formValues, "staging")}
        onDraft={(formValues) => persist(formValues, "draft")}
      />
    </div>
  );
}
