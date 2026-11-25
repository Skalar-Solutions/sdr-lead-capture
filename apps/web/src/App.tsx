import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  PRIORITY_LABELS,
  WEBSITE_STATUS_LABELS,
  type Lead,
  type LeadStatus,
} from "@sdr/core";
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
import { Alert, AlertDescription, AlertTitle } from "@sdr/ui/components/ui/alert";
import { Badge } from "@sdr/ui/components/ui/badge";
import { Button } from "@sdr/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@sdr/ui/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@sdr/ui/components/ui/dialog";
import { Input } from "@sdr/ui/components/ui/input";
import { Label } from "@sdr/ui/components/ui/label";
import { Skeleton } from "@sdr/ui/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sdr/ui/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@sdr/ui/components/ui/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Flame, RefreshCw, Search, Settings, Trash2 } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  deleteLead,
  downloadCsv,
  getConfig,
  getStats,
  listLeads,
  saveConfig,
  type DashboardConfig,
} from "./lib/api";

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

function statusVariant(status: Lead["websiteStatus"]): "destructive" | "secondary" | "outline" {
  if (status === "none") return "destructive";
  if (status === "decent") return "secondary";
  return "outline";
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: DashboardConfig;
  onSaved: () => void;
}

function SettingsDialog({ open, onOpenChange, config, onSaved }: SettingsDialogProps) {
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [token, setToken] = useState(config.token);

  useEffect(() => {
    if (!open) return;
    setBaseUrl(config.baseUrl);
    setToken(config.token);
  }, [open, config]);

  function handleSave() {
    try {
      const normalized = baseUrl.trim().replace(/\/+$/, "");
      new URL(normalized);
      saveConfig({ baseUrl: normalized, token: token.trim() });
      onSaved();
      toast.success("Koneksi API diperbarui");
      onOpenChange(false);
    } catch {
      toast.error("URL tidak valid", { description: "Contoh: https://api.domain.com" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Koneksi API</DialogTitle>
          <DialogDescription>
            Dashboard memanggil Worker langsung dari browser. Di produksi, host ini dilindungi
            Cloudflare Access.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="dashboard-base-url">Base URL</Label>
            <Input
              id="dashboard-base-url"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://api.domain.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dashboard-token">Token</Label>
            <Input
              id="dashboard-token"
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function App() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<DashboardConfig>(() => getConfig());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<"ALL" | LeadStatus>("ALL");
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);

  useEffect(() => {
    setPage(0);
  }, [deferredSearch, status]);

  const leadsQuery = useQuery({
    queryKey: ["leads", deferredSearch, status, page],
    queryFn: () =>
      listLeads({
        q: deferredSearch,
        status: status === "ALL" ? undefined : status,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  });

  const statsQuery = useQuery({ queryKey: ["stats"], queryFn: getStats });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => {
      toast.success("Lead dihapus");
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (error: Error) => toast.error("Gagal menghapus", { description: error.message }),
  });

  async function handleExport() {
    try {
      await downloadCsv();
      toast.success("CSV diunduh");
    } catch (error) {
      toast.error("Export gagal", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function handleConfigSaved() {
    setConfig(getConfig());
    void queryClient.invalidateQueries();
  }

  const items = leadsQuery.data?.items ?? [];
  const total = leadsQuery.data?.total ?? 0;
  const stats = statsQuery.data;
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-7xl space-y-4 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">SDR Lead Staging</h1>
            <p className="text-sm text-muted-foreground">
              Lead dari extension, siap direview dan diekspor.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void leadsQuery.refetch();
                void statsQuery.refetch();
              }}
            >
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings className="size-4" />
              Koneksi
            </Button>
            <Button size="sm" onClick={handleExport}>
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="py-4">
            <CardHeader className="px-4 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Lead hari ini
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <p className="text-2xl font-bold">{stats?.total ?? "—"}</p>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardHeader className="px-4 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Hot lead
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 px-4">
              <p className="text-2xl font-bold">{stats?.hot ?? "—"}</p>
              <Flame className="size-4 text-destructive" />
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardHeader className="px-4 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Staging</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <p className="text-2xl font-bold">{stats?.byStatus.staging ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardHeader className="px-4 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Dihubungi
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <p className="text-2xl font-bold">{stats?.byStatus.contacted ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="gap-3 py-3">
          <CardContent className="flex flex-wrap items-center gap-2 px-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, telepon, alamat..."
                className="pl-8"
              />
            </div>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as "ALL" | LeadStatus)}
            >
              <SelectTrigger className="w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua status</SelectItem>
                {LEAD_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {LEAD_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-auto text-xs text-muted-foreground">{total} lead</span>
          </CardContent>
        </Card>

        {leadsQuery.error ? (
          <Alert variant="destructive">
            <AlertTitle>Gagal memuat lead</AlertTitle>
            <AlertDescription>
              {leadsQuery.error.message}. Cek koneksi API lewat tombol “Koneksi”.
            </AlertDescription>
          </Alert>
        ) : null}

        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Waktu</TableHead>
                <TableHead>Bisnis</TableHead>
                <TableHead className="w-[150px]">Digital</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead className="w-[110px]">Prioritas</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {leadsQuery.isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : null}

              {!leadsQuery.isLoading && items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    Belum ada lead. Capture dari Google Maps lewat extension.
                  </TableCell>
                </TableRow>
              ) : null}

              {items.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="align-top text-xs text-muted-foreground">
                    {formatDate(lead.createdAt)}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{lead.companyName}</span>
                      {lead.isHotLead ? (
                        <Badge variant="destructive" className="gap-1">
                          <Flame className="size-3" /> HOT
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[lead.industry, lead.category].filter(Boolean).join(" · ")}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant={statusVariant(lead.websiteStatus)}>
                      {WEBSITE_STATUS_LABELS[lead.websiteStatus]}
                    </Badge>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Gap score {lead.gapScore}/10
                    </div>
                    {lead.website ? (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block max-w-[160px] truncate text-xs text-primary underline-offset-2 hover:underline"
                      >
                        {lead.website}
                      </a>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top text-xs">
                    <div className="font-medium">{lead.phoneE164 ?? lead.phone ?? "—"}</div>
                    {lead.email ? <div className="text-muted-foreground">{lead.email}</div> : null}
                    {lead.instagram ? (
                      <div className="text-muted-foreground">{lead.instagram}</div>
                    ) : null}
                    <div className="mt-1 max-w-[240px] truncate text-muted-foreground">
                      {lead.address || "—"}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <span className="text-sm text-amber-500">{"★".repeat(lead.priority)}</span>
                    <div className="text-xs text-muted-foreground">
                      {PRIORITY_LABELS[lead.priority] ?? ""}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant="outline">{LEAD_STATUS_LABELS[lead.status]}</Badge>
                  </TableCell>
                  <TableCell className="align-top">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Hapus lead"
                      onClick={() => setDeleteTarget(lead)}
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
            Halaman {page + 1} dari {lastPage + 1}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= lastPage}
              onClick={() => setPage((value) => value + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        config={config}
        onSaved={handleConfigSaved}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus lead?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.companyName}” akan dihapus dari staging (soft delete).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
