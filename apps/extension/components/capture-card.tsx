import { Badge } from "@sdr/ui/components/ui/badge";
import { Button } from "@sdr/ui/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@sdr/ui/components/ui/card";
import { Input } from "@sdr/ui/components/ui/input";
import { Separator } from "@sdr/ui/components/ui/separator";
import { Textarea } from "@sdr/ui/components/ui/textarea";
import { cn } from "@sdr/ui/lib/utils";
import { Check, ChevronDown, ChevronUp, Download, Flame, Star } from "lucide-react";
import { useState } from "react";

import {
  DIGITAL_GAP_OPTIONS,
  hasRealWebsite,
  SERVICE_OPTIONS,
  WEBSITE_STATUS_OPTIONS,
  type Capture,
  type WebsiteStatus,
} from "@/lib/capture";

interface CaptureCardProps {
  capture: Capture;
  saving?: boolean;
  saved?: boolean;
  elevated?: boolean;
  onSave: (updated: Capture) => void;
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[68px_1fr] gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words font-medium">{value}</span>
    </div>
  );
}

export function CaptureCard({
  capture: initialCapture,
  saving,
  saved,
  elevated,
  onSave,
}: CaptureCardProps) {
  const [data, setData] = useState<Capture>(initialCapture);
  const [showDetails, setShowDetails] = useState(
    Boolean(initialCapture.picName || initialCapture.picRole || initialCapture.notes),
  );

  const hot = !hasRealWebsite(data);

  function setStatus(status: WebsiteStatus) {
    const gaps =
      status === "none" && !data.digitalGaps.includes("no_website")
        ? [...data.digitalGaps, "no_website"]
        : data.digitalGaps;
    setData({
      ...data,
      websiteStatus: status,
      priority: status === "none" ? 5 : 3,
      digitalGaps: gaps,
    });
  }

  function toggleGap(gapId: string) {
    const next = data.digitalGaps.includes(gapId)
      ? data.digitalGaps.filter((id) => id !== gapId)
      : [...data.digitalGaps, gapId];
    setData({ ...data, digitalGaps: next });
  }

  function toggleService(serviceId: string) {
    const next = data.services.includes(serviceId)
      ? data.services.filter((id) => id !== serviceId)
      : [...data.services, serviceId];
    setData({ ...data, services: next });
  }

  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden py-0",
        elevated ? "rounded-lg border bg-card shadow-lg" : "rounded-none border-0 shadow-none",
      )}
    >
      <CardHeader className="border-b py-2.5">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="leading-tight">{data.companyName || "(tanpa nama)"}</CardTitle>
          <div className="flex shrink-0 gap-1">
            {hot ? (
              <Badge variant="signal" className="gap-1">
                <Flame className="size-3" /> HOT
              </Badge>
            ) : null}
            {data.socialType ? <Badge variant="outline">{data.socialType}</Badge> : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="max-h-[58vh] space-y-3 overflow-y-auto py-3">
        <div className="space-y-1.5">
          <Row label="Kategori" value={data.category} />
          <Row label="Alamat" value={data.address} />
          <Row label="Telepon" value={data.phone} />
          <Row
            label={data.website ? "Website" : "Sosmed"}
            value={data.website || data.socialUrl}
          />
          <Row label="Instagram" value={data.instagram} />
          <Row
            label="Rating"
            value={[data.rating, data.reviewsCount ? `(${data.reviewsCount})` : ""]
              .filter(Boolean)
              .join(" ")}
          />
        </div>

        <Separator />

        {/* Evaluasi & Tagging SDR */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-muted-foreground">Status Website</span>
            <div className="grid grid-cols-4 gap-1">
              {WEBSITE_STATUS_OPTIONS.map((item) => {
                const active = data.websiteStatus === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStatus(item.id)}
                    className={cn(
                      "cursor-pointer rounded-md border px-1.5 py-1.5 text-center text-xs font-medium transition-colors",
                      active
                        ? item.id === "none"
                          ? "border-foreground bg-signal text-signal-foreground font-semibold"
                          : "border-foreground bg-foreground text-background font-semibold"
                        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-muted-foreground">Celah Digital</span>
            <div className="flex flex-wrap gap-1">
              {DIGITAL_GAP_OPTIONS.map((gap) => {
                const active = data.digitalGaps.includes(gap.id);
                return (
                  <button
                    key={gap.id}
                    type="button"
                    onClick={() => toggleGap(gap.id)}
                    className={cn(
                      "cursor-pointer rounded-sm border px-2 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {gap.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-muted-foreground">Peluang Solusi</span>
            <div className="flex flex-wrap gap-1">
              {SERVICE_OPTIONS.map((service) => {
                const active = data.services.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={cn(
                      "cursor-pointer rounded-sm border px-2 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-foreground bg-muted text-foreground font-semibold"
                        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {service.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Prioritas</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Prioritas ${value}`}
                  onClick={() => setData({ ...data, priority: value })}
                  className="cursor-pointer rounded-sm p-0.5 transition-colors hover:bg-muted"
                >
                  <Star
                    className={cn(
                      "size-4",
                      value <= data.priority
                        ? "fill-foreground text-foreground"
                        : "text-muted-foreground/30",
                    )}
                  />
                </button>
              ))}
              <span className="ml-1 text-xs font-medium text-foreground">
                {data.priority === 5 ? "HOT" : data.priority >= 4 ? "Tinggi" : "Sedang"}
              </span>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-foreground underline-offset-2 hover:underline"
            >
              {showDetails ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
              {showDetails ? "Sembunyikan Catatan & PIC" : "Tambah Catatan & PIC"}
            </button>

            {showDetails ? (
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    placeholder="Nama PIC"
                    value={data.picName ?? ""}
                    onChange={(event) => setData({ ...data, picName: event.target.value })}
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder="Jabatan PIC"
                    value={data.picRole ?? ""}
                    onChange={(event) => setData({ ...data, picRole: event.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <Textarea
                  placeholder="Catatan sales..."
                  value={data.notes ?? ""}
                  onChange={(event) => setData({ ...data, notes: event.target.value })}
                  rows={2}
                  className="resize-none text-xs"
                />
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>

      <Separator />

      <CardFooter className="py-2">
        <Button
          className="w-full"
          size="sm"
          onClick={() => onSave(data)}
          disabled={saving || saved}
        >
          {saved ? (
            <>
              <Check className="size-4" /> Tersimpan ke CSV
            </>
          ) : saving ? (
            "Menyimpan..."
          ) : (
            <>
              <Download className="size-4" /> Simpan ke CSV
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
