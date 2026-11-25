import { Badge } from "@sdr/ui/components/ui/badge";
import { Button } from "@sdr/ui/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@sdr/ui/components/ui/card";
import { Input } from "@sdr/ui/components/ui/input";
import { Separator } from "@sdr/ui/components/ui/separator";
import { Textarea } from "@sdr/ui/components/ui/textarea";
import { cn } from "@sdr/ui/lib/utils";
import { Check, ChevronDown, ChevronUp, Download, Flame, Star } from "lucide-react";
import { useState } from "react";

import type { Capture, WebsiteStatus } from "@/lib/capture";
import { hasRealWebsite } from "@/lib/capture";

interface CaptureCardProps {
  capture: Capture;
  saving?: boolean;
  saved?: boolean;
  elevated?: boolean;
  onSave: (updated: Capture) => void;
}

const AVAILABLE_GAPS = [
  { id: "no_website", label: "🚫 Tanpa Website" },
  { id: "not_mobile_friendly", label: "📱 Not Mobile-Friendly" },
  { id: "no_online_ordering", label: "🛒 No Online Order" },
  { id: "social_media_only", label: "📲 Sosmed Only" },
  { id: "no_seo", label: "📊 No SEO" },
  { id: "no_online_payment", label: "💳 No Payment" },
];

const AVAILABLE_SERVICES = [
  { id: "website_dev", label: "🌐 Web Dev" },
  { id: "ecommerce", label: "🛒 E-Commerce" },
  { id: "uiux_redesign", label: "🎨 Redesign" },
  { id: "mobile_app", label: "📱 Mobile App" },
  { id: "custom_software", label: "⚙️ Custom SW" },
  { id: "seo", label: "📈 SEO" },
];

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[72px_1fr] gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words font-medium">{value}</span>
    </div>
  );
}

export function CaptureCard({ capture: initialCapture, saving, saved, elevated, onSave }: CaptureCardProps) {
  const [data, setData] = useState<Capture>(initialCapture);
  const [showDetails, setShowDetails] = useState(false);

  const hot = !hasRealWebsite(data);

  function setStatus(status: WebsiteStatus) {
    const updated = {
      ...data,
      websiteStatus: status,
      priority: status === "none" ? 5 : 3,
    };
    if (status === "none" && !updated.digitalGaps.includes("no_website")) {
      updated.digitalGaps = [...updated.digitalGaps, "no_website"];
    }
    setData(updated);
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
        elevated ? "rounded-xl border bg-card shadow-2xl" : "rounded-none border-0 shadow-none",
      )}
    >
      {/* Header */}
      <CardHeader className="border-b py-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm leading-tight">{data.companyName || "(tanpa nama)"}</CardTitle>
          <div className="flex shrink-0 gap-1">
            {hot ? (
              <Badge variant="destructive" className="gap-1">
                <Flame className="size-3" /> HOT
              </Badge>
            ) : null}
            {data.socialType ? <Badge variant="outline">{data.socialType}</Badge> : null}
          </div>
        </div>
      </CardHeader>

      {/* Basic Info Rows */}
      <CardContent className="space-y-2 py-3">
        <Row label="Kategori" value={data.category} />
        <Row label="Alamat" value={data.address} />
        <Row label="Telepon" value={data.phone} />
        <Row
          label="Website"
          value={data.website || (data.socialUrl ? `${data.socialType}: ${data.socialUrl}` : "")}
        />
        <Row label="Instagram" value={data.instagram} />
        <Row
          label="Rating"
          value={[data.rating, data.reviewsCount ? `(${data.reviewsCount})` : ""]
            .filter(Boolean)
            .join(" ")}
        />

        <Separator className="my-2" />

        {/* SDR Tagging Section */}
        <div className="space-y-2.5 pt-1">
          {/* Status Website Selector */}
          <div>
            <span className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
              Status Website:
            </span>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: "none", label: "🚫 Tidak Ada", isHot: true },
                { id: "outdated", label: "👴 Outdated" },
                { id: "bad-ux", label: "😵 Bad UX" },
                { id: "decent", label: "🤷 Lumayan" },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setStatus(item.id as WebsiteStatus)}
                  className={cn(
                    "rounded-md border px-1.5 py-1 text-[10px] font-medium transition-all text-center cursor-pointer",
                    data.websiteStatus === item.id
                      ? item.isHot
                        ? "border-destructive bg-destructive/10 text-destructive font-bold"
                        : "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border bg-background hover:bg-muted text-muted-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Digital Gaps Tags */}
          <div>
            <span className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
              Celah Digital (Gaps):
            </span>
            <div className="flex flex-wrap gap-1">
              {AVAILABLE_GAPS.map((gap) => {
                const active = data.digitalGaps.includes(gap.id);
                return (
                  <button
                    type="button"
                    key={gap.id}
                    onClick={() => toggleGap(gap.id)}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium border transition-all cursor-pointer",
                      active
                        ? "border-destructive bg-destructive text-destructive-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {gap.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Service Opportunity Chips */}
          <div>
            <span className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
              Peluang Solusi:
            </span>
            <div className="flex flex-wrap gap-1">
              {AVAILABLE_SERVICES.map((srv) => {
                const active = data.services.includes(srv.id);
                return (
                  <button
                    type="button"
                    key={srv.id}
                    onClick={() => toggleService(srv.id)}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium border transition-all cursor-pointer",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {srv.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority Stars */}
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Prioritas:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setData({ ...data, priority: val })}
                  className="p-0.5 cursor-pointer transition-transform hover:scale-120"
                >
                  <Star
                    className={cn(
                      "size-3.5",
                      val <= data.priority
                        ? "fill-amber-400 text-amber-500"
                        : "text-muted-foreground/30",
                    )}
                  />
                </button>
              ))}
              <span className="ml-1 text-[10px] font-bold text-muted-foreground">
                {data.priority === 5 ? "🔥 Hot" : data.priority >= 4 ? "Tinggi" : "Sedang"}
              </span>
            </div>
          </div>

          {/* Toggle More Details (PIC & Notes) */}
          <div>
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline cursor-pointer"
            >
              {showDetails ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              {showDetails ? "Sembunyikan Catatan & PIC" : "+ Tambah Catatan & PIC Sales"}
            </button>

            {showDetails ? (
              <div className="space-y-1.5 pt-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    placeholder="Nama PIC (Owner)"
                    value={data.picName || ""}
                    onChange={(e) => setData({ ...data, picName: e.target.value })}
                    className="h-7 text-xs"
                  />
                  <Input
                    placeholder="Jabatan PIC"
                    value={data.picRole || ""}
                    onChange={(e) => setData({ ...data, picRole: e.target.value })}
                    className="h-7 text-xs"
                  />
                </div>
                <Textarea
                  placeholder="Catatan analisa lead untuk sales head..."
                  value={data.notes || ""}
                  onChange={(e) => setData({ ...data, notes: e.target.value })}
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>

      <Separator />

      {/* Footer */}
      <CardFooter className="py-2.5">
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
