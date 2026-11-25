import { Badge } from "@sdr/ui/components/ui/badge";
import { Button } from "@sdr/ui/components/ui/button";
import { Checkbox } from "@sdr/ui/components/ui/checkbox";
import { Progress } from "@sdr/ui/components/ui/progress";
import { cn } from "@sdr/ui/lib/utils";
import { ClipboardList, Flame, ListChecks, Loader2, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { hasRealWebsite, toCapture, type Capture } from "@/lib/capture";
import { hasPlaceId, isDuplicate } from "@/lib/dedupe";
import { addManyCaptures, openDashboard, readCaptures } from "@/lib/store";

import { findFeed, loadResultLinks, openAndExtract, sleep, type ResultLink } from "../bulk";

type Phase = "setup" | "loading" | "scraping" | "review" | "saved";
type ItemStatus = "pending" | "ok" | "failed" | "duplicate" | "skipped";

interface BulkItem {
  link: ResultLink;
  status: ItemStatus;
  capture?: Capture;
  selected: boolean;
}

const LIMITS = [20, 50, 100] as const;
const SECONDS_PER_PLACE = 3;

interface BulkPanelProps {
  onClose: () => void;
  onRunningChange: (running: boolean) => void;
  onSaved: (count: number) => void;
}

export function BulkPanel({ onClose, onRunningChange, onSaved }: BulkPanelProps) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [limit, setLimit] = useState<number>(20);
  const [found, setFound] = useState(0);
  const [items, setItems] = useState<BulkItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [message, setMessage] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  function updateItem(index: number, patch: Partial<BulkItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function start() {
    if (!findFeed()) {
      setMessage("Daftar hasil tidak ditemukan. Cari dulu di Maps (mis. \"coffee shop cipete\") sampai daftar muncul di kiri.");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;
    onRunningChange(true);
    setMessage("");
    setPhase("loading");

    try {
      const links = await loadResultLinks(limit, signal, setFound);
      if (links.length === 0) {
        setMessage("Tidak ada hasil yang bisa dibaca di daftar.");
        setPhase("setup");
        return;
      }

      const existing = await readCaptures();
      const initial: BulkItem[] = links.map((link) => {
        const duplicate = hasPlaceId(link.placeId, existing);
        return { link, status: duplicate ? "duplicate" : "pending", selected: false };
      });
      setItems(initial);
      setPhase("scraping");

      for (let i = 0; i < initial.length; i++) {
        if (signal.aborted) break;
        const item = initial[i]!;
        if (item.status === "duplicate") continue;

        setCurrent(i + 1);
        const place = await openAndExtract(item.link, signal);
        if (signal.aborted) break;

        if (!place) {
          updateItem(i, { status: "failed" });
        } else {
          const capture = toCapture(place);
          const duplicate = isDuplicate(capture, existing);
          updateItem(i, {
            status: duplicate ? "duplicate" : "ok",
            capture,
            selected: !duplicate,
          });
        }

        // Jeda acak biar tidak terlalu agresif ke Google Maps.
        await sleep(600 + Math.random() * 700, signal);
      }

      setItems((prev) =>
        prev.map((item) => (item.status === "pending" ? { ...item, status: "skipped" } : item)),
      );
      setPhase("review");
    } finally {
      onRunningChange(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  async function saveSelected() {
    const chosen = items.filter((item) => item.selected && item.capture).map((item) => item.capture!);
    if (chosen.length === 0) {
      setMessage("Belum ada yang dicentang.");
      return;
    }
    const result = await addManyCaptures(chosen);
    onSaved(result.count);
    setMessage(
      `${result.added} lead tersimpan${result.skipped ? `, ${result.skipped} dilewati (sudah ada)` : ""}.`,
    );
    setPhase("saved");
  }

  const selectable = items.filter((item) => item.status === "ok");
  const selectedCount = items.filter((item) => item.selected).length;
  const allSelected = selectable.length > 0 && selectable.every((item) => item.selected);
  const processed = items.filter((item) => item.status !== "pending").length;
  const hotCount = items.filter((item) => item.capture && !hasRealWebsite(item.capture)).length;

  function toggleAll() {
    setItems((prev) =>
      prev.map((item) => (item.status === "ok" ? { ...item, selected: !allSelected } : item)),
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <ListChecks className="size-4 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-tight">Scrape Semua Hasil</div>
          <div className="text-[11px] text-muted-foreground">
            Buka tiap tempat di daftar & ambil data lengkap
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3 text-xs">
        {phase === "setup" ? (
          <>
            <div>
              <span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">
                Maksimal tempat:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {LIMITS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLimit(value)}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                      limit === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Estimasi ±{Math.ceil((limit * SECONDS_PER_PLACE) / 60)} menit. Jangan klik apa-apa di
                Maps selama proses berjalan.
              </p>
            </div>
            <Button className="w-full" onClick={() => void start()}>
              Mulai Scrape
            </Button>
          </>
        ) : null}

        {phase === "loading" ? (
          <div className="flex items-center gap-2 py-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Memuat daftar hasil… {found} tempat ditemukan
          </div>
        ) : null}

        {phase === "scraping" ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" />
                Membaca {current}/{items.length}
              </span>
              <span className="text-muted-foreground">{hotCount} HOT</span>
            </div>
            <Progress value={(processed / Math.max(items.length, 1)) * 100} />
            <Button variant="outline" size="sm" className="w-full" onClick={stop}>
              <Square className="size-3.5" /> Berhenti (simpan yang sudah terbaca)
            </Button>
          </div>
        ) : null}

        {items.length > 0 && phase !== "loading" ? (
          <>
            {phase === "review" ? (
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  Pilih semua ({selectable.length})
                </label>
                <span className="text-[11px] text-muted-foreground">{hotCount} HOT lead</span>
              </div>
            ) : null}

            <div className="max-h-[45vh] space-y-1 overflow-y-auto pr-1">
              {items.map((item, index) => (
                <BulkRow
                  key={item.link.href}
                  item={item}
                  disabled={phase !== "review"}
                  onToggle={() => updateItem(index, { selected: !item.selected })}
                />
              ))}
            </div>
          </>
        ) : null}

        {phase === "review" ? (
          <div className="grid grid-cols-[1fr_auto] gap-1.5">
            <Button onClick={() => void saveSelected()} disabled={selectedCount === 0}>
              Simpan {selectedCount} ke CSV
            </Button>
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>
          </div>
        ) : null}

        {phase === "saved" ? (
          <div className="grid grid-cols-2 gap-1.5">
            <Button onClick={() => void openDashboard()}>
              <ClipboardList className="size-4" /> Buka Data
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setItems([]);
                setMessage("");
                setPhase("setup");
              }}
            >
              Scrape lagi
            </Button>
          </div>
        ) : null}

        {message ? (
          <div className="rounded-md bg-muted px-2.5 py-2 text-[11px] text-foreground">{message}</div>
        ) : null}
      </div>
    </div>
  );
}

function BulkRow({
  item,
  disabled,
  onToggle,
}: {
  item: BulkItem;
  disabled: boolean;
  onToggle: () => void;
}) {
  const { capture, status } = item;
  const hot = capture ? !hasRealWebsite(capture) : false;
  const selectable = status === "ok" && !disabled;

  return (
    <label
      className={cn(
        "flex items-start gap-2 rounded-md border px-2.5 py-2",
        selectable ? "cursor-pointer hover:bg-muted/60" : "cursor-default",
        status === "ok" || status === "pending" ? "" : "opacity-55",
        item.selected ? "border-primary/40 bg-primary/5" : "border-border",
      )}
    >
      <Checkbox
        className="mt-0.5"
        checked={item.selected}
        disabled={!selectable}
        onCheckedChange={onToggle}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-medium">{capture?.companyName || item.link.name}</span>
          {status === "pending" ? <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" /> : null}
        </div>
        {capture ? (
          <div className="truncate text-[11px] text-muted-foreground">
            {[capture.category, capture.phone || "tanpa telepon", capture.rating ? `★${capture.rating}` : ""]
              .filter(Boolean)
              .join(" · ")}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-1">
        {status === "duplicate" ? <Badge variant="outline">Sudah ada</Badge> : null}
        {status === "failed" ? <Badge variant="outline">Gagal dibaca</Badge> : null}
        {status === "skipped" ? <Badge variant="outline">Dilewati</Badge> : null}
        {status === "ok" && hot ? (
          <Badge variant="destructive" className="gap-0.5">
            <Flame className="size-3" /> HOT
          </Badge>
        ) : null}
        {status === "ok" && capture?.socialType ? (
          <Badge variant="outline">{capture.socialType}</Badge>
        ) : null}
        {status === "ok" && !hot ? <Badge variant="secondary">Website</Badge> : null}
      </div>
    </label>
  );
}
