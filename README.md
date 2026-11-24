# SDR Lead Capture

Extension capture lead dari Google Maps + API Cloudflare + dashboard staging.
POC lama ada di `legacy/` (read-only).

## Status

| Bagian | Status |
|---|---|
| `packages/core` | ✅ schema `Lead`, telepon E.164, dedupe, scoring, CSV — 40 tes |
| `packages/ui` | ✅ 25 komponen shadcn/ui + portal container untuk Shadow DOM |
| `apps/extension` | ✅ WXT + React: popup, **drawer in-page**, outbox, sync otomatis — 9 tes |
| `apps/api` | ✅ Hono + D1: CRUD, sync batch, idempotency, dedupe, CSV, auth — 4 tes |
| `apps/web` | ✅ Dashboard React: stats, tabel, filter, hapus, export CSV |

Total **53 tes**, semua typecheck bersih, semua build lolos.

## Menjalankan lokal

Butuh Node 20+ dan pnpm.

```bash
pnpm install

# 1) API (terminal 1)
cp apps/api/.dev.vars.example apps/api/.dev.vars
pnpm --filter @sdr/api db:migrate      # bikin tabel di D1 lokal
pnpm --filter @sdr/api dev             # http://127.0.0.1:8787

# 2) Dashboard (terminal 2)
pnpm --filter @sdr/web dev             # http://localhost:5173

# 3) Extension (terminal 3)
pnpm dev
```

Load extension: `chrome://extensions` → Developer mode → **Load unpacked** → `apps/extension/.output/chrome-mv3-dev`.

Token development default: `dev-token` (ada di `.dev.vars`, pengaturan extension, dan dashboard).

### Alur

1. Buka Google Maps, klik satu tempat.
2. Klik ikon extension **atau** pill `SDR Capture` di kanan bawah.
3. Data terisi otomatis → **Simpan ke outbox**.
4. Outbox dikirim ke API tiap 1 menit, saat klik tombol sync, atau saat browser mulai.
5. Dashboard menampilkan lead yang sudah masuk.

## Perintah

```bash
pnpm test                       # semua paket
pnpm typecheck                  # semua paket
pnpm --filter @sdr/extension build
pnpm --filter @sdr/extension zip
pnpm --filter @sdr/web build
pnpm --filter @sdr/api exec wrangler deploy --dry-run --outdir dist
```

## API

Base: `http://127.0.0.1:8787`

| Method | Path | Auth | Fungsi |
|---|---|---|---|
| GET | `/health` | – | health check |
| GET | `/v1/me` | ✅ | user + org + stats hari ini |
| POST | `/v1/leads` | ✅ | create, `Idempotency-Key` |
| GET | `/v1/leads` | ✅ | list, filter `status`, `q`, `limit`, `offset` |
| GET | `/v1/leads/:id` | ✅ | detail |
| PATCH | `/v1/leads/:id` | ✅ | update, optimistic concurrency |
| DELETE | `/v1/leads/:id` | ✅ | soft delete |
| GET | `/v1/leads/export.csv` | ✅ | export CSV |
| POST | `/v1/sync` | ✅ | batch dari outbox (maks 200) |
| GET | `/v1/stats/today` | ✅ | counter harian |

Auth: `Authorization: Bearer <token>`. Token bisa `DEV_AUTH_TOKEN` (dev) atau **Google ID token** (diverifikasi via JWKS, tanpa SDK).

## Deploy

1. Ganti `database_id` di `apps/api/wrangler.jsonc` dengan ID D1 staging/produksi.
2. Set secret:
   ```bash
   cd apps/api
   pnpm exec wrangler secret put DEV_AUTH_TOKEN --env staging
   pnpm exec wrangler secret put GOOGLE_CLIENT_ID --env staging
   ```
3. Migrasi remote:
   ```bash
   pnpm exec wrangler d1 migrations apply sdr-leads-staging --remote --env staging
   ```
4. Deploy:
   ```bash
   pnpm exec wrangler deploy --env staging
   pnpm --filter @sdr/web exec wrangler deploy
   ```
5. Pasang custom domain: `api-staging.` untuk Worker API, `app-staging.` untuk dashboard.
6. Lindungi dashboard dengan **Cloudflare Access** (Google IdP). Jangan taruh API di belakang Access — extension memakai Bearer token.

Di produksi, isi `ALLOWED_ORIGINS` dengan origin dashboard (`https://app.domain.com`).

## Aturan UI

Semua komponen wajib dari `@sdr/ui` (shadcn). Menambah komponen:

```bash
pnpm dlx shadcn@latest add <nama> -c packages/ui -y
grep -rl 'from "cn"' packages/ui/src/components/ui \
  | xargs perl -pi -e 's{from "cn"}{from "../../lib/utils"}g'
pnpm --filter @sdr/ui typecheck
```

Kalau komponen baru memakai portal dan perlu dipakai di drawer, tambahkan
`container={usePortalContainer() ?? undefined}` seperti di `select.tsx` dan `tooltip.tsx`.

## Yang belum (sadar, bukan bug)

1. **Login Google di extension belum disambung.** Masih pakai token statis di Pengaturan. Server sudah siap verifikasi Google ID token; tinggal panggil `chrome.identity.getAuthToken` setelah OAuth client ID didaftarkan.
2. **Dashboard produksi masih butuh token manual.** Access melindungi halaman, tapi panggilan ke `api.` tetap pakai Bearer. Nanti diganti Google ID token/OAuth.
3. **Icon masih placeholder** (lingkaran biru dari POC).
4. **Belum ada `.crx` + update XML** untuk force-install enterprise, dan belum ada privacy policy.
5. Bundle popup ~697 KB dan content script ~663 KB (belum di-code-split).
