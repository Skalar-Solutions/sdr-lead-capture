import { Alert, AlertDescription, AlertTitle } from "@sdr/ui/components/ui/alert";
import { Button } from "@sdr/ui/components/ui/button";
import { Card, CardContent } from "@sdr/ui/components/ui/card";
import { ClipboardList, Download, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { browser } from "wxt/browser";

import { CaptureCard } from "@/components/capture-card";
import type { ScrapedPlace } from "@/entrypoints/content/scraper";
import { isCaptureUseful, toCapture, type Capture } from "@/lib/capture";
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
  const [source, setSource] = useState<SourceStatus>({
    tone: "info",
    text: "Memeriksa halaman...",
  });

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
          setSource({
            tone: "warn",
            text: "Buka Google Maps dulu, lalu klik satu bisnis.",
          });
          return;
        }

        if (tab?.id == null) {
          setSource({ tone: "warn", text: "Halaman Google Maps tidak terdeteksi." });
          return;
        }

        const response = (await browser.tabs.sendMessage(tab.id, { type: "SDR_SCRAPE" })) as
          | { ok?: boolean; data?: ScrapedPlace; error?: string }
          | undefined;

        if (response?.ok && response.data?.companyName) {
          const next = toCapture(response.data);
          if (!isCaptureUseful(next)) {
            setSource({
              tone: "warn",
              text: "Data belum lengkap. Buka detail bisnisnya, lalu coba lagi.",
            });
          } else {
            setCapture(next);
            setSource({ tone: "info", text: `Terbaca: ${response.data.companyName}` });
          }
        } else {
          setSource({
            tone: "warn",
            text: "Belum ada bisnis yang terbaca. Klik salah satu hasil di Google Maps.",
          });
        }
      } catch {
        setSource({
          tone: "warn",
          text: "Halaman Google Maps perlu dimuat ulang. Refresh tab (F5), lalu coba lagi.",
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

  async function handleSave() {
    if (!capture) return;
    setSaving(true);
    try {
      const result = await addCapture(capture);
      setSavedCount(result.count);
      setSaved(true);
      if (result.duplicate) {
        toast.info("Sudah pernah disimpan", {
          description: `${capture.companyName} tidak disimpan dua kali.`,
        });
      } else {
        toast.success("Tersimpan", {
          description: `${capture.companyName}${capture.website ? "" : " · belum punya website"}`,
        });
      }
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
      toast.error("Belum ada data untuk di-download");
      return;
    }
    downloadCsvFile(capturesToCsv(captures), buildCsvFilename());
    toast.success(`${captures.length} lead di-download (CSV)`);
  }

  if (!ready) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
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
            {source.tone === "warn" ? "Perlu dicek" : "Status"}
          </AlertTitle>
          <AlertDescription className="text-xs">{source.text}</AlertDescription>
        </Alert>
        <Button type="button" size="sm" variant="outline" onClick={() => void openDashboard()}>
          <ClipboardList className="size-4" />
          Lihat Data
        </Button>
      </div>

      <div className="p-3">
        {capture ? (
          <CaptureCard capture={capture} saving={saving} saved={saved} onSave={handleSave} />
        ) : (
          <Card className="gap-0 py-0">
            <CardContent className="flex flex-col items-center gap-2.5 py-6 text-center">
              <MapPin className="size-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Buka Google Maps, cari bisnis, lalu klik salah satu hasilnya.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void browser.tabs.create({ url: "https://www.google.com/maps" })
                }
              >
                Buka Google Maps
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
        <span className="text-xs text-muted-foreground">{savedCount} lead tersimpan</span>
        <Button size="sm" variant="outline" onClick={handleDownload} disabled={savedCount === 0}>
          <Download className="size-4" />
          Download CSV
        </Button>
      </div>
    </div>
  );
}
