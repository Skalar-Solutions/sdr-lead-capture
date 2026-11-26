import { Badge } from "@sdr/ui/components/ui/badge";
import { Button } from "@sdr/ui/components/ui/button";
import { ClipboardList, ListChecks, RefreshCw, Target, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CaptureCard } from "@/components/capture-card";
import { isCaptureUseful, toCapture, type Capture } from "@/lib/capture";
import { addCapture, countCaptures, openDashboard } from "@/lib/store";

import { findFeed } from "../bulk";
import { extractBusinessData } from "../scraper";
import { BulkPanel } from "./BulkPanel";

type Mode = "single" | "bulk";

export function ContentApp() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("single");
  const [capture, setCapture] = useState<Capture | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [hasFeed, setHasFeed] = useState(false);
  const [bulkActive, setBulkActive] = useState(false);

  const lastCapturedPlace = useRef<string>("");
  // Saat bulk scraping jalan, extension sendiri yang klik tempat -> auto-detect dimatikan.
  const bulkRunning = useRef(false);

  const refreshSaved = useCallback(async () => {
    setSavedCount(await countCaptures());
  }, []);

  useEffect(() => {
    void refreshSaved();
  }, [refreshSaved]);

  const scrape = useCallback((autoTrigger = false): boolean => {
    const data = extractBusinessData(document, location.href);
    const next = toCapture(data);
    if (!data.companyName || !isCaptureUseful(next)) {
      if (!autoTrigger) {
        setCapture(null);
        setSaved(false);
        setNotice(
          data.companyName
            ? !next.phone
              ? `${data.companyName} tidak punya nomor telepon — dilewati.`
              : "Data belum lengkap. Tunggu detail bisnis terbuka, lalu coba lagi."
            : "Klik salah satu bisnis di Google Maps dulu.",
        );
      }
      return false;
    }
    setCapture(next);
    setSaved(false);
    setMode("single");
    lastCapturedPlace.current = data.companyName;
    setNotice(
      `Terbaca: ${data.companyName}${data.isSocialMediaOnly ? ` · hanya ${data.socialType}` : ""}`,
    );
    if (autoTrigger) setOpen(true);
    return true;
  }, []);

  // Auto-detect saat tempat diklik atau URL berubah di Google Maps.
  useEffect(() => {
    function checkPlaceChange() {
      if (bulkRunning.current) return;
      const data = extractBusinessData(document, location.href);
      if (data.companyName && data.companyName !== lastCapturedPlace.current) {
        // scrape() baru menandai tempat ini setelah datanya lengkap.
        scrape(true);
      }
    }

    function handleClick(event: MouseEvent) {
      // Abaikan klik programatik dari bulk scraping.
      if (bulkRunning.current || !event.isTrusted) return;
      const target = (event.target as HTMLElement | null)?.closest(
        "a[href*='/maps/place/'], div.Nv2PK, div.hfpxzc, [jsaction*='pane.wfvdle']",
      );
      if (!target) return;
      setTimeout(() => {
        checkPlaceChange();
        setTimeout(checkPlaceChange, 600);
      }, 200);
    }

    document.addEventListener("click", handleClick, true);

    let lastUrl = location.href;
    const interval = setInterval(() => {
      setHasFeed(Boolean(findFeed()));
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        if (location.href.includes("/maps/place/")) {
          setTimeout(checkPlaceChange, 250);
          setTimeout(checkPlaceChange, 800);
        }
      }
    }, 400);

    return () => {
      document.removeEventListener("click", handleClick, true);
      clearInterval(interval);
    };
  }, [scrape]);

  function handleOpen() {
    scrape(false);
    setOpen(true);
  }

  function openBulk() {
    setMode("bulk");
    setNotice("Ambil semua hasil pencarian");
    setOpen(true);
  }

  async function handleSave(updated: Capture) {
    setSaving(true);
    try {
      const result = await addCapture(updated);
      setCapture(updated);
      setSavedCount(result.count);
      setSaved(true);
      setNotice(
        result.duplicate
          ? `Sudah ada di CSV: ${updated.companyName}`
          : `Tersimpan ke CSV: ${updated.companyName}`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  function handleBulkRunning(running: boolean) {
    bulkRunning.current = running;
    setBulkActive(running);
    if (!running) {
      // Jangan auto-popup tempat terakhir yang dibuka bot.
      lastCapturedPlace.current = extractBusinessData(document, location.href).companyName;
    }
  }

  if (!open) {
    return (
      <div className="fixed bottom-6 right-6 z-[2147483647] flex flex-col items-end gap-2 font-sans">
        {notice ? (
          <div className="max-w-[320px] rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-lg">
            {notice}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          {hasFeed ? (
            <Button
              size="lg"
              variant="outline"
              className="rounded-lg shadow-lg"
              onClick={openBulk}
            >
              <ListChecks className="size-4" />
              Ambil Semua
            </Button>
          ) : null}
          <Button size="lg" className="rounded-lg shadow-lg" onClick={handleOpen}>
            <Target className="size-4" />
            SDR Capture
            {savedCount > 0 ? <Badge variant="signal">{savedCount}</Badge> : null}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[2147483647] w-[400px] max-w-[calc(100vw-2rem)] font-sans">
      <div className="mb-2 flex items-center gap-1 rounded-md bg-foreground px-2 py-1.5 text-xs text-background shadow-lg">
        <span className="min-w-0 flex-1 truncate">{notice || "Ambil data bisnis dari Maps"}</span>
        {mode === "single" ? (
          <>
            {hasFeed ? (
              <Button
                size="icon"
                variant="ghost"
                title="Ambil semua hasil pencarian"
                className="size-6 text-background hover:bg-background/10"
                onClick={openBulk}
              >
                <ListChecks className="size-3.5" />
              </Button>
            ) : null}
            <Button
              size="icon"
              variant="ghost"
              title="Baca ulang data bisnis"
              className="size-6 text-background hover:bg-background/10"
              onClick={() => scrape(false)}
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </>
        ) : null}
        <Button
          size="icon"
          variant="ghost"
          title="Buka data & download CSV"
          className="size-6 text-background hover:bg-background/10"
          onClick={() => void openDashboard()}
        >
          <ClipboardList className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          title="Tutup"
          className="size-6 text-background hover:bg-background/10"
          disabled={bulkActive}
          onClick={() => {
            if (bulkRunning.current) return;
            setOpen(false);
            setMode("single");
          }}
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {mode === "bulk" ? (
        <BulkPanel
          onClose={() => {
            setMode("single");
            setOpen(false);
          }}
          onRunningChange={handleBulkRunning}
          onSaved={(count) => {
            setSavedCount(count);
            setNotice("Bulk scrape selesai");
          }}
        />
      ) : capture ? (
        <CaptureCard
          key={capture.id}
          capture={capture}
          saving={saving}
          saved={saved}
          elevated
          onSave={handleSave}
        />
      ) : (
        <div className="rounded-lg border bg-card px-4 py-5 text-center text-xs text-muted-foreground shadow-lg">
          Klik salah satu tempat di Google Maps — data akan terbaca otomatis.
        </div>
      )}
    </div>
  );
}
