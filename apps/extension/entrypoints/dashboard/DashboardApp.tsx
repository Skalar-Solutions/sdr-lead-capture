import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@sdr/ui/components/ui/alert-dialog";
import { Badge } from "@sdr/ui/components/ui/badge";
import { Button } from "@sdr/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@sdr/ui/components/ui/card";
import { Input } from "@sdr/ui/components/ui/input";
import { Skeleton } from "@sdr/ui/components/ui/skeleton";
import { cn } from "@sdr/ui/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Flame,
  RefreshCw,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { useDeferredValue, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { browser } from "wxt/browser";

import {
  digitalGapLabel,
  hasRealWebsite,
  serviceLabel,
  websiteStatusLabel,
  type Capture,
} from "@/lib/capture";
import {
  buildCsvFilename,
  capturesToCsv,
  capturesToDetailedCsv,
} from "@/lib/csv-template";
import { downloadCsvFile } from "@/lib/download";
import { readCaptures, writeCaptures } from "@/lib/store";

const PAGE_SIZE = 25;

type QuickFilter = "all" | "hot" | "priority" | "no-pic";
type SortMode = "newest" | "priority" | "name";

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
}

function formatShortDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
}

function sourceLabel(capture: Capture): string {
  if (capture.website) {
    try {
      return new URL(capture.website).hostname.replace(/^www\./, "");
    } catch {
      return capture.website;
    }
  }
  if (capture.socialUrl) {
    return capture.instagram || capture.socialType || "Sosmed";
  }
  return "Tidak ada";
}

function priorityLabel(priority: number): string {
  return priority >= 5 ? "HOT" : priority >= 4 ? "Tinggi" : "Sedang";
}

function matchesQuery(capture: Capture, query: string): boolean {
  if (!query) return true;
  return [
    capture.companyName,
    capture.category,
    capture.address,
    capture.phone,
    capture.websiteStatus,
    websiteStatusLabel(capture.websiteStatus),
    capture.picName,
    capture.picRole,
    capture.notes,
    capture.instagram,
    ...(capture.digitalGaps ?? []),
    ...(capture.services ?? []),
  ]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(query));
}

export default function DashboardApp() {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sortBy, setSortBy] = useState<SortMode>("newest");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Capture | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  async function refresh() {
    const items = await readCaptures();
    items.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
    setCaptures(items);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    const listener: Parameters<typeof browser.storage.onChanged.addListener>[0] = (
      changes,
      area,
    ) => {
      if (area === "local" && changes.sdr_captures) void refresh();
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  useEffect(() => {
    setPage(0);
  }, [deferredSearch, quickFilter, sortBy]);

  const searched = captures.filter((capture) => matchesQuery(capture, deferredSearch));

  const filtered = searched
    .filter((capture) => {
      if (quickFilter === "hot") return !hasRealWebsite(capture);
      if (quickFilter === "priority") return capture.priority === 5;
      if (quickFilter === "no-pic") return !capture.picName?.trim();
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "priority") {
        return b.priority - a.priority || b.capturedAt.localeCompare(a.capturedAt);
      }
      if (sortBy === "name") return a.companyName.localeCompare(b.companyName, "id");
      return b.capturedAt.localeCompare(a.capturedAt);
    });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const today = new Date().toISOString().slice(0, 10);
  const stats = {
    total: captures.length,
    today: captures.filter((capture) => capture.capturedAt.slice(0, 10) === today).length,
    noWebsite: captures.filter((capture) => !hasRealWebsite(capture)).length,
    socialOnly: captures.filter((capture) => capture.socialType !== null).length,
    priority5: captures.filter((capture) => capture.priority === 5).length,
    noPic: captures.filter((capture) => !capture.picName?.trim()).length,
  };

  function handleExportCrm() {
    if (filtered.length === 0) {
      toast.error("Belum ada data untuk diekspor");
      return;
    }
    downloadCsvFile(capturesToCsv(filtered), buildCsvFilename("crm"));
    toast.success(`${filtered.length} lead di-download (CSV CRM 13 kolom)`);
  }

  function handleExportDetailed() {
    if (filtered.length === 0) {
      toast.error("Belum ada data untuk diekspor");
      return;
    }
    downloadCsvFile(capturesToDetailedCsv(filtered), buildCsvFilename("detailed"));
    toast.success(`${filtered.length} lead di-download (CSV SDR lengkap)`);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const next = captures.filter((capture) => capture.id !== deleteTarget.id);
    await writeCaptures(next);
    setCaptures(next);
    if (expandedId === deleteTarget.id) setExpandedId(null);
    setDeleteTarget(null);
    toast.success("Lead dihapus");
  }

  async function handleClearAll() {
    await writeCaptures([]);
    setCaptures([]);
    setExpandedId(null);
    setClearOpen(false);
    toast.success("Semua data dihapus");
  }

  function resetFilters() {
    setSearch("");
    setQuickFilter("all");
    setSortBy("newest");
  }

  const filters: { id: QuickFilter; label: string; count: number; title: string }[] = [
    { id: "all", label: "Semua", count: stats.total, title: "Tampilkan semua lead" },
    {
      id: "hot",
      label: "HOT",
      count: stats.noWebsite,
      title: "Belum punya website, biasanya cocok ditawari website",
    },
    {
      id: "priority",
      label: "Prioritas 5",
      count: stats.priority5,
      title: "Lead dengan prioritas tertinggi",
    },
    {
      id: "no-pic",
      label: "Belum ada PIC",
      count: stats.noPic,
      title: "Lead yang belum punya nama PIC",
    },
  ];

  const isFiltering = quickFilter !== "all" || search.trim() !== "";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Data Lead</h1>
            <p className="text-xs text-muted-foreground">
              Semua lead tersimpan di browser ini. Pilih format CSV CRM atau CSV SDR lengkap.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void refresh();
                toast.success("Data dimuat ulang");
              }}
            >
              <RefreshCw className="size-4" />
              Muat ulang
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClearOpen(true)}
              disabled={captures.length === 0}
            >
              <Trash2 className="size-4" />
              Hapus semua
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCrm}>
              <Download className="size-4" />
              CSV CRM
            </Button>
            <Button size="sm" onClick={handleExportDetailed}>
              <Download className="size-4" />
              CSV SDR Lengkap
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <Card className="py-3">
            <CardHeader className="px-4 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total lead
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <p className="text-xl font-semibold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="py-3">
            <CardHeader className="px-4 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Lead hari ini
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <p className="text-xl font-semibold">{stats.today}</p>
            </CardContent>
          </Card>
          <Card className="py-3">
            <CardHeader className="px-4 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Belum punya website
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 px-4">
              <p className="text-xl font-semibold">{stats.noWebsite}</p>
              <Flame className="size-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="py-3">
            <CardHeader className="px-4 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Hanya sosmed
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <p className="text-xl font-semibold">{stats.socialOnly}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden py-0">
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, kategori, telepon, status, PIC, atau catatan..."
                className="pl-8"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {filtered.length === captures.length
                ? `${captures.length} lead`
                : `${filtered.length} dari ${captures.length} lead`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {filters.map((filter) => {
                const active = quickFilter === filter.id;
                return (
                  <Button
                    key={filter.id}
                    size="sm"
                    variant={active ? "default" : "outline"}
                    className="h-7 px-2.5 text-xs"
                    title={filter.title}
                    onClick={() => setQuickFilter(filter.id)}
                  >
                    {filter.label}
                    <span
                      className={cn(
                        "ml-1 rounded-sm px-1 text-[11px]",
                        active ? "bg-background/20" : "bg-muted",
                      )}
                    >
                      {filter.count}
                    </span>
                  </Button>
                );
              })}
            </div>

            <span className="hidden text-[11px] text-muted-foreground md:inline">
              HOT = belum punya website
            </span>

            <div className="ml-auto flex items-center gap-1.5">
              {isFiltering ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={resetFilters}
                >
                  Reset
                </Button>
              ) : null}
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortMode)}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                aria-label="Urutkan lead"
              >
                <option value="newest">Terbaru</option>
                <option value="priority">Prioritas tertinggi</option>
                <option value="name">Nama A–Z</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden py-0">
          {loading ? (
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="px-4 py-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : captures.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-xs text-muted-foreground">
              <span>
                Belum ada lead. Buka Google Maps, cari bisnis, lalu klik salah satu hasilnya.
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void browser.tabs.create({ url: "https://www.google.com/maps" })}
              >
                Buka Google Maps
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-xs text-muted-foreground">
              <span>Tidak ada lead yang cocok dengan pencarian atau filter ini.</span>
              <Button size="sm" variant="outline" onClick={resetFilters}>
                Reset pencarian & filter
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {pageItems.map((capture) => (
                <LeadRow
                  key={capture.id}
                  capture={capture}
                  expanded={expandedId === capture.id}
                  onToggle={() =>
                    setExpandedId(expandedId === capture.id ? null : capture.id)
                  }
                  onDelete={() => setDeleteTarget(capture)}
                />
              ))}
            </div>
          )}
        </Card>

        {pageCount > 1 ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Halaman {safePage + 1} dari {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setPage((value) => Math.max(0, value - 1))}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((value) => value + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus lead ini?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.companyName || "(tanpa nama)"}” akan dihapus dari data di browser ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus semua data?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua {captures.length} lead akan dihapus. Download CSV dulu kalau belum.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleClearAll()}>Hapus semua</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="break-words text-xs text-foreground">{children}</div>
    </div>
  );
}

function LeadRow({
  capture,
  expanded,
  onToggle,
  onDelete,
}: {
  capture: Capture;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const hot = !hasRealWebsite(capture);
  const pic = capture.picName?.trim()
    ? `${capture.picName}${capture.picRole ? ` (${capture.picRole})` : ""}`
    : "Belum ada PIC";
  const gapLabels = (capture.digitalGaps ?? []).map(digitalGapLabel);
  const gapText = gapLabels.join(" · ") || "—";
  const gapSummary =
    gapLabels.length > 1 ? `${gapLabels[0]} +${gapLabels.length - 1}` : gapText;
  const sourceHref = capture.website || capture.socialUrl;

  return (
    <div className={cn("transition-colors", expanded ? "bg-muted/25" : "hover:bg-muted/20")}>
      <div className="flex items-start gap-2 px-3 py-3 sm:gap-3 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="mt-0.5 size-7 shrink-0"
          aria-label={expanded ? "Tutup detail" : "Lihat detail"}
          onClick={onToggle}
        >
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 truncate text-sm font-semibold">
              {capture.companyName || "(tanpa nama)"}
            </span>
            {hot ? (
              <Badge
                variant="signal"
                className="gap-1"
                title="Belum punya website, biasanya cocok ditawari website"
              >
                <Flame className="size-3" /> HOT
              </Badge>
            ) : null}
            <Badge variant="outline">{websiteStatusLabel(capture.websiteStatus)}</Badge>
            <span
              className="inline-flex items-center gap-1 text-xs font-medium"
              title={`Prioritas ${capture.priority} dari 5 (${priorityLabel(capture.priority)})`}
            >
              <Star className="size-3.5 fill-foreground text-foreground" />
              P{capture.priority}
            </span>
            <span
              className="ml-auto hidden shrink-0 text-xs text-muted-foreground md:inline"
              title={formatDate(capture.capturedAt)}
            >
              {formatShortDate(capture.capturedAt)}
            </span>
          </div>

          <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:gap-x-5 xl:grid-cols-4">
            <div className="min-w-0 truncate">
              <span className="text-muted-foreground/70">Tel </span>
              <span className="font-medium text-foreground">{capture.phone || "—"}</span>
            </div>
            <div className="min-w-0 truncate">
              <span className="text-muted-foreground/70">Sumber </span>
              {sourceHref ? (
                <a
                  href={sourceHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-1 align-bottom text-foreground underline-offset-2 hover:underline"
                  title={sourceHref}
                >
                  <span className="truncate">{sourceLabel(capture)}</span>
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              ) : (
                <span>Tidak ada</span>
              )}
            </div>
            <div className="min-w-0 truncate">
              <span className="text-muted-foreground/70">PIC </span>
              <span className="text-foreground">{pic}</span>
            </div>
            <div className="min-w-0 truncate" title={gapText}>
              <span className="text-muted-foreground/70">Celah </span>
              <span className="text-foreground">{gapSummary}</span>
            </div>
          </div>

          {capture.notes ? (
            <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              <span className="font-medium">Catatan:</span> {capture.notes}
            </div>
          ) : null}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          title="Hapus lead"
          onClick={onDelete}
        >
          <Trash2 className="size-4 text-muted-foreground transition-colors hover:text-destructive" />
        </Button>
      </div>

      {expanded ? (
        <div className="border-t bg-muted/20 px-4 py-3 sm:pl-12">
          <div className="grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Alamat">{capture.address || "—"}</Detail>
            <Detail label="WhatsApp">{capture.whatsapp || capture.phone || "—"}</Detail>
            <Detail label="Website / Sosmed">
              {capture.website || capture.socialUrl ? (
                <a
                  href={capture.website || capture.socialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 break-all text-foreground underline-offset-2 hover:underline"
                >
                  {capture.website || capture.socialUrl}
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              ) : (
                "—"
              )}
            </Detail>
            <Detail label="Instagram">{capture.instagram || "—"}</Detail>
            <Detail label="Status Website">{websiteStatusLabel(capture.websiteStatus)}</Detail>
            <Detail label="Prioritas">
              P{capture.priority} · {priorityLabel(capture.priority)}
            </Detail>
            <Detail label="Celah Digital">
              {capture.digitalGaps.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {capture.digitalGaps.map((gap) => (
                    <span
                      key={gap}
                      className="rounded-sm border border-border bg-background px-1.5 py-0.5 text-[11px]"
                    >
                      {digitalGapLabel(gap)}
                    </span>
                  ))}
                </div>
              ) : (
                "—"
              )}
            </Detail>
            <Detail label="Peluang Solusi">
              {capture.services.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {capture.services.map((service) => (
                    <span
                      key={service}
                      className="rounded-sm border border-border bg-background px-1.5 py-0.5 text-[11px]"
                    >
                      {serviceLabel(service)}
                    </span>
                  ))}
                </div>
              ) : (
                "—"
              )}
            </Detail>
            <Detail label="PIC & Jabatan">{pic}</Detail>
            <Detail label="Catatan Sales">{capture.notes || "Belum ada catatan"}</Detail>
            <Detail label="Disimpan">{formatDate(capture.capturedAt)}</Detail>
            <Detail label="Link Google Maps">
              {capture.mapsUrl ? (
                <a
                  href={capture.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-foreground underline-offset-2 hover:underline"
                >
                  Buka di Maps <ExternalLink className="size-3 shrink-0" />
                </a>
              ) : (
                "—"
              )}
            </Detail>
          </div>
        </div>
      ) : null}
    </div>
  );
}
