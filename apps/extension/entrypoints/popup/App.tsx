import { Alert, AlertDescription, AlertTitle } from "@sdr/ui/components/ui/alert";
import { Button } from "@sdr/ui/components/ui/button";
import { Card, CardContent } from "@sdr/ui/components/ui/card";
import { ClipboardList, Download, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { browser } from "wxt/browser";

import { CaptureCard } from "@/components/capture-card";
import type { ScrapedPlace } from "@/entrypoints/content/scraper";
import { toCapture, type Capture } from "@/lib/capture";
import { buildCsvFilename, capturesToCsv } from "@/lib/csv-template";
import { downloadCsvFile } from "@/lib/download";
import { addCapture, countCaptures, openDashboard, readCaptures } from "@/lib/store";

type SourceStatus = { tone: "info" | "warn"; text: string };

export default function App() {
  const [capture, setCapture] = useState<Capture | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<SourceStatus>({ tone: "info", text: "Memeriksa tab..." });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const count = await countCaptures();
      if (cancelled) return;
      setSavedCount(count);

      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        const url = tab?.url ?? "";
        const isMaps = /google\.(com|co\.id)\/maps/.test(url) || /maps\.google\./.test(url);

        if (!isMaps) {
          setSource({ tone: "warn", text: "Bukan Google Maps. Buka Maps lalu klik satu tempat." });
          return;
        }

        if (tab?.id == null) {
          setSource({ tone: "warn", text: "Tab tidak terdeteksi." });
          return;
        }

        const response = (await browser.tabs.sendMessage(tab.id, { type: "SDR_SCRAPE" })) as
          | { ok?: boolean; data?: ScrapedPlace; error?: string }
          | undefined;

        if (response?.ok && response.data?.companyName) {
          setCapture(toCapture(response.data));
          setSource({ tone: "info", text: `Terekstrak: ${response.data.companyName}` });
        } else {
          setSource({
            tone: "warn",
            text: "Belum ada tempat yang kebaca. Klik salah satu hasil di Maps.",
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

  async function handleSave(updatedCapture: Capture) {
    setSaving(true);
    try {
      const count = await addCapture(updatedCapture);
      setSavedCount(count);
      setSaved(true);
      toast.success("Tersimpan ke CSV", {
        description: `${updatedCapture.companyName}${updatedCapture.website ? "" : " · 🔥 Hot lead"}`,
      });
    } catch (error) {
      toast.error("Gagal menyimpan", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    const captures = await readCaptures();
    if (captures.length === 0) {
      toast.error("Belum ada data untuk diekspor");
      return;
    }
    downloadCsvFile(capturesToCsv(captures), buildCsvFilename("crm"));
    toast.success(`${captures.length} baris CSV diunduh`);
  }

  return (
    <div className="w-[380px] p-3 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-bold flex items-center gap-1.5">
          <MapPin className="size-4 text-primary" /> SDR Lead Capture
        </h1>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => void openDashboard()}
        >
          <ClipboardList className="size-3.5 mr-1" /> Data ({savedCount})
        </Button>
      </div>

      <Alert variant={source.tone === "warn" ? "destructive" : "default"} className="py-2">
        <AlertTitle className="text-xs">
          {source.tone === "warn" ? "Perhatian" : "Status"}
        </AlertTitle>
        <AlertDescription className="text-xs">{source.text}</AlertDescription>
      </Alert>

      {capture ? (
        <CaptureCard
          capture={capture}
          saving={saving}
          saved={saved}
          onSave={handleSave}
        />
      ) : (
        <Card className="p-4 text-center text-muted-foreground">
          <CardContent className="p-0 text-xs">
            {ready ? "Buka Google Maps dan klik tempat bisnis." : "Memeriksa Google Maps..."}
          </CardContent>
        </Card>
      )}

      {savedCount > 0 ? (
        <Button
          variant="secondary"
          size="sm"
          className="w-full text-xs"
          onClick={() => void handleDownload()}
        >
          <Download className="size-3.5 mr-1" /> Download CSV ({savedCount} baris)
        </Button>
      ) : null}
    </div>
  );
}
