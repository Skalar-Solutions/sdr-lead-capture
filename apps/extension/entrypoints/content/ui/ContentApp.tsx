import { Badge } from "@sdr/ui/components/ui/badge";
import { Button } from "@sdr/ui/components/ui/button";
import { ClipboardList, RefreshCw, Target, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CaptureCard } from "@/components/capture-card";
import { toCapture, type Capture } from "@/lib/capture";
import { addCapture, countCaptures, openDashboard } from "@/lib/store";

import { extractBusinessData } from "../scraper";

export function ContentApp() {
  const [open, setOpen] = useState(false);
  const [capture, setCapture] = useState<Capture | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const lastCapturedPlace = useRef<string>("");

  const refreshSaved = useCallback(async () => {
    setSavedCount(await countCaptures());
  }, []);

  useEffect(() => {
    void refreshSaved();
  }, [refreshSaved]);

  const scrape = useCallback((autoTrigger = false) => {
    const data = extractBusinessData(document, location.href);
    if (!data.companyName) {
      if (!autoTrigger) {
        setNotice("Klik salah satu tempat di Maps dulu.");
      }
      return;
    }
    setCapture(toCapture(data));
    setSaved(false);
    setNotice(
      `Terekstrak: ${data.companyName}${data.isSocialMediaOnly ? ` · ${data.socialType} only` : ""}`,
    );
    if (autoTrigger) {
      setOpen(true);
    }
  }, []);

  // Auto-detect when intern clicks a business or URL changes in Google Maps
  useEffect(() => {
    function checkPlaceChange() {
      const data = extractBusinessData(document, location.href);
      if (data.companyName && data.companyName !== lastCapturedPlace.current) {
        lastCapturedPlace.current = data.companyName;
        scrape(true);
      }
    }

    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement)?.closest(
        "a[href*='/maps/place/'], div.Nv2PK, div.hfpxzc, [jsaction*='pane.wfvdle']",
      );
      if (target) {
        setTimeout(() => {
          checkPlaceChange();
          setTimeout(checkPlaceChange, 600);
        }, 200);
      }
    }

    document.addEventListener("click", handleClick, true);

    let lastUrl = location.href;
    const interval = setInterval(() => {
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

  async function handleSave(updatedCapture: Capture) {
    setSaving(true);
    try {
      const count = await addCapture(updatedCapture);
      setSavedCount(count);
      setSaved(true);
      setNotice(`Tersimpan: ${updatedCapture.companyName}`);
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
          {savedCount > 0 ? <Badge variant="secondary">{savedCount}</Badge> : null}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[2147483647] w-[400px] max-w-[calc(100vw-2rem)]">
      <div className="mb-2 flex items-center gap-1 rounded-md bg-foreground px-2 py-1.5 text-xs text-background shadow-lg">
        <span className="min-w-0 flex-1 truncate">{notice || "Capture lead dari Maps"}</span>
        <Button
          size="icon"
          variant="ghost"
          title="Scrape ulang"
          className="size-6 text-background hover:bg-background/10"
          onClick={() => scrape(false)}
        >
          <RefreshCw className="size-3.5" />
        </Button>
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
          onClick={() => setOpen(false)}
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {capture ? (
        <CaptureCard
          capture={capture}
          saving={saving}
          saved={saved}
          elevated
          onSave={handleSave}
        />
      ) : (
        <div className="rounded-xl border bg-card px-4 py-6 text-center text-xs text-muted-foreground shadow-2xl">
          Klik salah satu tempat di Google Maps, lalu tekan tombol refresh.
        </div>
      )}
    </div>
  );
}
