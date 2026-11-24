# SDR Lead Capture

Monorepo untuk extension capture lead dari Google Maps. POC lama disimpan di `legacy/` sebagai referensi (read-only).

## Status

| Bagian | Status |
|---|---|
| `packages/core` | ✅ schema `Lead`, normalisasi telepon E.164, dedupe, scoring, CSV — 40 tes |
| `packages/ui` | ✅ shadcn/ui (25 komponen) + token tema, dipakai bareng |
| `apps/extension` | ✅ WXT + React, popup capture dari Maps, outbox lokal — 9 tes |
| `apps/api` | ⏳ belum (Hono + D1), nunggu resource staging |
| `apps/web` | ⏳ belum (dashboard) |

Alur sekarang: buka Google Maps → klik satu tempat → klik ikon extension → data keisi otomatis → **Simpan ke outbox**. Data masih lokal di `chrome.storage.local` (`sdr_outbox`), belum dikirim ke Worker.

## Struktur

```
apps/extension/
  entrypoints/popup/        # React + shadcn
  entrypoints/content/      # scraper (modul murni) + message handler
  lib/form.ts               # schema form + mapping hasil scrape
packages/core/              # SATU-SATUNYA sumber schema & logika bisnis
packages/ui/                # komponen shadcn, di-vendor
legacy/                     # POC vanilla JS sebelumnya
```

## Cara jalan

```bash
pnpm install
pnpm dev                      # WXT dev server (HMR)
```

Load extension: `chrome://extensions` → Developer mode → **Load unpacked** → pilih `apps/extension/.output/chrome-mv3-dev` (mode dev) atau `.output/chrome-mv3` setelah `pnpm build`.

```bash
pnpm test                     # semua paket
pnpm typecheck                # semua paket
pnpm --filter @sdr/extension build
pnpm --filter @sdr/extension zip   # artefak Chrome Web Store
```

## Aturan UI

Semua komponen **wajib** dari `@sdr/ui` (shadcn). Menambah komponen baru:

```bash
pnpm dlx shadcn@latest add <nama> -c packages/ui -y
# perbaiki import utils yang salah resolve
grep -rl 'from "cn"' packages/ui/src/components/ui \
  | xargs perl -pi -e 's{from "cn"}{from "../../lib/utils"}g'
pnpm --filter @sdr/ui typecheck
```

Jangan pakai `<select>`, checkbox, modal, atau tooltip buatan sendiri. Ikon: `lucide-react`. Toast: `sonner`. Form: `react-hook-form` + `zodResolver`.

## Yang belum

1. `apps/api`: Hono + Drizzle + D1, auth Google ID token.
2. Outbox flush di background (`chrome.alarms` + retry) — permission `alarms` ditambah saat itu.
3. Dashboard `apps/web` + Cloudflare Access.
4. Drawer in-page (Shadow DOM, `createShadowRootUi`).
5. Pin extension `key`, ikon final, privacy policy, artefak `.crx`.
