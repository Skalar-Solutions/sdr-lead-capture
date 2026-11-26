import { Badge } from "@sdr/ui/components/ui/badge";
import { Button } from "@sdr/ui/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@sdr/ui/components/ui/card";
import { Separator } from "@sdr/ui/components/ui/separator";
import { cn } from "@sdr/ui/lib/utils";
import { Check, Download, Flame } from "lucide-react";

import type { Capture } from "@/lib/capture";
import { hasRealWebsite } from "@/lib/capture";

interface CaptureCardProps {
  capture: Capture;
  saving?: boolean;
  saved?: boolean;
  elevated?: boolean;
  onSave: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[64px_1fr] gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words font-medium">{value}</span>
    </div>
  );
}

export function CaptureCard({ capture, saving, saved, elevated, onSave }: CaptureCardProps) {
  const hot = !hasRealWebsite(capture);

  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden py-0",
        elevated ? "rounded-lg border bg-card shadow-lg" : "rounded-none border-0 shadow-none",
      )}
    >
      <CardHeader className="border-b py-2.5">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="leading-tight">{capture.companyName || "(tanpa nama)"}</CardTitle>
          <div className="flex shrink-0 gap-1">
            {hot ? (
              <Badge variant="signal" className="gap-1">
                <Flame className="size-3" /> HOT
              </Badge>
            ) : null}
            {capture.socialType ? <Badge variant="outline">{capture.socialType}</Badge> : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 py-3">
        <Row label="Kategori" value={capture.category} />
        <Row label="Alamat" value={capture.address} />
        <Row label="Telepon" value={capture.phone} />
        <Row
          label={capture.website ? "Website" : "Sosmed"}
          value={capture.website || capture.socialUrl}
        />
        <Row label="Instagram" value={capture.instagram} />
        <Row
          label="Rating"
          value={[capture.rating, capture.reviewsCount ? `(${capture.reviewsCount})` : ""]
            .filter(Boolean)
            .join(" ")}
        />
      </CardContent>

      <Separator />

      <CardFooter className="py-2">
        <Button className="w-full" size="sm" onClick={onSave} disabled={saving || saved}>
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
