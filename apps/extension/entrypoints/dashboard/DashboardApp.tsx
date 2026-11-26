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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@sdr/ui/components/ui/table";
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
import { Fragment, useDeferredValue, useEffect, useState } from "react";
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

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
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
  }, [deferredSearch]);

  const filtered = captures.filter((capture) => matchesQuery(capture, deferredSearch));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const today = new Date().toISOString().slice(0, 10);
  const stats = {
    total: captures.length,
    today: captures.filter((capture) => capture.capturedAt.slice(0, 10) === today).length,
    noWebsite: captures.filter((capture) => !hasRealWebsite(capture)).length,
    socialOnly: captures.filter((capture) => capture.socialType !== null).length,
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
    setDeleteTarget(null);
    toast.success("Lead dihapus");
  }

  async function handleClearAll() {
    await writeCaptures([]);
    setCaptures([]);
    setClearOpen(false);
    toast.success("Semua data dihapus");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-4 p-6">
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="py-4">
            <CardHeader className="px-4 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total lead
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <p className="text-xl font-semibold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardHeader className="px-4 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Lead hari ini
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <p className="text-xl font-semibold">{stats.today}</p>
            </CardContent>
          </Card>
          <Card className="py-4">
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
          <Card className="py-4">
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

        <p className="px-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-sm bg-signal px-1.5 py-0.5 text-xs font-semibold text-signal-foreground">
            <Flame className="size-3" /> HOT
          </span>{" "}
          = belum punya website. Biasanya prospek yang cocok ditawari website.
        </p>

        <Card className="gap-3 py-3">
          <CardContent className="flex flex-wrap items-center gap-2 px-4">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, kategori, telepon, status, PIC, atau catatan..."
                className="pl-8"
              />
            </div>
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} lead</span>
          </CardContent>
        </Card>

        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[36px]" />
                <TableHead className="w-[116px]">Disimpan</TableHead>
                <TableHead>Nama bisnis</TableHead>
                <TableHead>Status & Tagging</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead className="w-[190px]">Website / Sosmed</TableHead>
                <TableHead className="w-[170px]">Prioritas & PIC</TableHead>
                <TableHead className="w-[52px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : null}

              {!loading && pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-xs text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <span>
                        Belum ada lead. Buka Google Maps, cari bisnis, lalu klik salah satu hasilnya.
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void browser.tabs.create({ url: "https://www.google.com/maps" })
                        }
                      >
                        Buka Google Maps
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}

              {pageItems.map((capture) => {
                const isExpanded = expandedId === capture.id;
                return (
                  <Fragment key={capture.id}>
                    <TableRow>
                      <TableCell className="align-top pr-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          aria-label={isExpanded ? "Tutup detail" : "Lihat detail"}
                          onClick={() => setExpandedId(isExpanded ? null : capture.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-4 text-muted-foreground" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="align-top text-xs text-muted-foreground">
                        {formatDate(capture.capturedAt)}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-medium">
                            {capture.companyName || "(tanpa nama)"}
                          </span>
                          {!hasRealWebsite(capture) ? (
                            <Badge
                              variant="signal"
                              className="gap-1"
                              title="Belum punya website, biasanya cocok ditawari website"
                            >
                              <Flame className="size-3" /> HOT
                            </Badge>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {[capture.category || "—", capture.rating ? `Rating ${capture.rating}` : ""]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-xs">
                        <div className="mb-1 flex flex-wrap items-center gap-1">
                          <Badge variant="outline">{websiteStatusLabel(capture.websiteStatus)}</Badge>
                        </div>
                        {capture.digitalGaps.length > 0 ? (
                          <div className="flex max-w-[220px] flex-wrap gap-1">
                            {capture.digitalGaps.map((gap) => (
                              <span
                                key={gap}
                                className="rounded-sm border border-border bg-muted px-1.5 py-0.5 text-xs text-foreground"
                              >
                                {digitalGapLabel(gap)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {capture.services.length > 0 ? (
                          <div className="mt-1 flex max-w-[220px] flex-wrap gap-1">
                            {capture.services.map((service) => (
                              <span
                                key={service}
                                className="rounded-sm border border-border bg-background px-1.5 py-0.5 text-xs text-muted-foreground"
                              >
                                {serviceLabel(service)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top text-xs">
                        <div className="font-medium">{capture.phone || "—"}</div>
                        <div className="mt-1 max-w-[200px] truncate text-muted-foreground">
                          {capture.address || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-xs">
                        {capture.website ? (
                          <a
                            href={capture.website}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 break-all text-foreground underline-offset-2 hover:underline"
                          >
                            {capture.website}
                            <ExternalLink className="size-3 shrink-0" />
                          </a>
                        ) : capture.socialUrl ? (
                          <div className="space-y-1">
                            <Badge variant="outline">{capture.socialType}</Badge>
                            <a
                              href={capture.socialUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block break-all text-foreground underline-offset-2 hover:underline"
                            >
                              {capture.socialUrl}
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Tidak ada</span>
                        )}
                        {capture.instagram ? (
                          <div className="mt-1 text-muted-foreground">{capture.instagram}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top text-xs">
                        <div className="flex items-center gap-1 font-medium text-foreground">
                          <Star className="size-3.5 fill-foreground text-foreground" />
                          <span>P{capture.priority}</span>
                        </div>
                        {capture.picName ? (
                          <div className="mt-1 font-medium">
                            {capture.picName}
                            {capture.picRole ? ` (${capture.picRole})` : ""}
                          </div>
                        ) : null}
                        {capture.notes ? (
                          <div className="mt-0.5 line-clamp-2 max-w-[170px] text-muted-foreground">
                            {capture.notes}
                          </div>
                        ) : !capture.picName ? (
                          <div className="mt-1 text-muted-foreground">—</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Hapus lead"
                          onClick={() => setDeleteTarget(capture)}
                        >
                          <Trash2 className="size-4 text-muted-foreground transition-colors hover:text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>

                    {isExpanded ? (
                      <TableRow className="bg-muted/40">
                        <TableCell colSpan={8} className="px-6 py-3 text-xs">
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="space-y-1">
                              <div className="font-medium text-muted-foreground">Alamat & WhatsApp</div>
                              <div>{capture.address || "—"}</div>
                              <div className="text-muted-foreground">
                                WA: {capture.whatsapp || capture.phone || "—"}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="font-medium text-muted-foreground">PIC & Catatan Sales</div>
                              <div>
                                {capture.picName
                                  ? `${capture.picName}${capture.picRole ? ` · ${capture.picRole}` : ""}`
                                  : "Belum ada PIC"}
                              </div>
                              <div className="text-muted-foreground">
                                {capture.notes || "Belum ada catatan"}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="font-medium text-muted-foreground">Link Google Maps</div>
                              {capture.mapsUrl ? (
                                <a
                                  href={capture.mapsUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 break-all text-foreground underline-offset-2 hover:underline"
                                >
                                  Buka di Maps <ExternalLink className="size-3 shrink-0" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </Card>

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
            <AlertDialogAction onClick={() => void handleClearAll()}>
              Hapus semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
