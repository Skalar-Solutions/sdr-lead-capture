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
import { Download, ExternalLink, Flame, RefreshCw, Search, Trash2 } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { toast } from "sonner";
import { browser } from "wxt/browser";

import { hasRealWebsite, type Capture } from "@/lib/capture";
import { buildCsvFilename, capturesToCsv } from "@/lib/csv-template";
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
  return [capture.companyName, capture.category, capture.address, capture.phone]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(query));
}

export default function DashboardApp() {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const [page, setPage] = useState(0);
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

  function handleExport() {
    if (filtered.length === 0) {
      toast.error("Belum ada data untuk diekspor");
      return;
    }
    downloadCsvFile(capturesToCsv(filtered), buildCsvFilename());
    toast.success(`${filtered.length} baris CSV diunduh`);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const next = captures.filter((capture) => capture.id !== deleteTarget.id);
    await writeCaptures(next);
    setCaptures(next);
    setDeleteTarget(null);
    toast.success("Baris dihapus");
  }

  async function handleClearAll() {
    await writeCaptures([]);
    setCaptures([]);
    setClearOpen(false);
    toast.success("Semua data dihapus");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-7xl space-y-4 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Hasil Scrape</h1>
            <p className="text-sm text-muted-foreground">
              Tersimpan lokal di browser ini. Download CSV kalau sudah selesai.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void refresh();
                toast.success("Data dimuat ulang");
              }}
            >
              <RefreshCw className="size-4" />
              Refresh
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
            <Button size="sm" onClick={handleExport}>
              <Download className="size-4" />
              Download CSV
            </Button>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="py-4">
            <CardHeader className="px-4 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total baris
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardHeader className="px-4 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Hari ini</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <p className="text-2xl font-bold">{stats.today}</p>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardHeader className="px-4 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Tanpa website
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 px-4">
              <p className="text-2xl font-bold">{stats.noWebsite}</p>
              <Flame className="size-4 text-destructive" />
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardHeader className="px-4 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Sosmed only
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <p className="text-2xl font-bold">{stats.socialOnly}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="gap-3 py-3">
          <CardContent className="flex flex-wrap items-center gap-2 px-4">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, kategori, alamat, telepon..."
                className="pl-8"
              />
            </div>
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} baris</span>
          </CardContent>
        </Card>

        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Waktu</TableHead>
                <TableHead>Bisnis</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead className="w-[220px]">Website / Sosmed</TableHead>
                <TableHead className="w-[110px]">Rating</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : null}

              {!loading && pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    Belum ada data. Buka Google Maps, klik satu tempat, lalu capture.
                  </TableCell>
                </TableRow>
              ) : null}

              {pageItems.map((capture) => (
                <TableRow key={capture.id}>
                  <TableCell className="align-top text-xs text-muted-foreground">
                    {formatDate(capture.capturedAt)}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{capture.companyName || "(tanpa nama)"}</span>
                      {!hasRealWebsite(capture) ? (
                        <Badge variant="destructive" className="gap-1">
                          <Flame className="size-3" /> HOT
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">{capture.category || "—"}</div>
                  </TableCell>
                  <TableCell className="align-top text-xs">
                    <div className="font-medium">{capture.phone || "—"}</div>
                    <div className="mt-1 max-w-[260px] truncate text-muted-foreground">
                      {capture.address || "—"}
                    </div>
                  </TableCell>
                  <TableCell className="align-top text-xs">
                    {capture.website ? (
                      <a
                        href={capture.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 break-all text-primary underline-offset-2 hover:underline"
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
                          className="block break-all text-primary underline-offset-2 hover:underline"
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
                    {capture.rating || "—"}
                    {capture.reviewsCount ? (
                      <div className="text-muted-foreground">({capture.reviewsCount})</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Hapus baris"
                      onClick={() => setDeleteTarget(capture)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
            <AlertDialogTitle>Hapus baris?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.companyName || "(tanpa nama)"}” akan dihapus dari penyimpanan lokal.
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
              Semua {captures.length} baris akan dihapus. Download CSV dulu kalau belum.
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
