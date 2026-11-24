import { Button } from "@sdr/ui/components/ui/button";
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
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DEFAULT_API_CONFIG, ensureHostPermission, getApiConfig, saveApiConfig } from "@/lib/config";

interface ApiSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function ApiSettings({ open, onOpenChange, onSaved }: ApiSettingsProps) {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_API_CONFIG.baseUrl);
  const [token, setToken] = useState(DEFAULT_API_CONFIG.token);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void getApiConfig().then((config) => {
      setBaseUrl(config.baseUrl);
      setToken(config.token);
    });
  }, [open]);

  function handleSave() {
    let trimmedUrl: string;
    try {
      trimmedUrl = baseUrl.trim().replace(/\/+$/, "");
      new URL(trimmedUrl);
    } catch {
      toast.error("URL tidak valid", { description: "Contoh: https://api.domain.com" });
      return;
    }

    // Panggil request izin selagi masih di dalam gesture klik.
    const permission = ensureHostPermission(trimmedUrl);
    setSaving(true);

    void (async () => {
      try {
        const granted = await permission;
        await saveApiConfig({ baseUrl: trimmedUrl, token: token.trim() });
        onSaved?.();

        if (!granted) {
          toast.warning("Tersimpan, tapi izin host ditolak", {
            description: "Sync akan gagal sampai izin akses ke API diberikan.",
          });
        } else {
          toast.success("Pengaturan API tersimpan");
        }
        onOpenChange(false);
      } catch {
        toast.error("Gagal menyimpan pengaturan");
      } finally {
        setSaving(false);
      }
    })();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Koneksi API</DialogTitle>
          <DialogDescription>
            Outbox dikirim ke endpoint ini tiap menit dan saat tombol sync diklik.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="api-base-url">Base URL</Label>
            <Input
              id="api-base-url"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://api.domain.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="api-token">Token</Label>
            <Input
              id="api-token"
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Bearer token / Google ID token"
            />
            <p className="text-xs text-muted-foreground">
              Sementara pakai token statis. Nanti diganti Google ID token otomatis.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
