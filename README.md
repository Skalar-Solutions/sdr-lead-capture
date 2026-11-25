# SDR Lead Capture (CSV edition)

Extension Chrome mandiri untuk scrape data bisnis dari Google Maps dan
mengekspornya ke CSV. **Tanpa backend, tanpa API, tanpa token.** Semua data
disimpan lokal di browser.

Zip siap upload: `release/sdr-lead-capture-csv-1.0.1-chrome.zip`

## Cara pakai

1. Load `chrome://extensions` → Developer mode → **Load unpacked** →
   `apps/extension/.output/chrome-mv3` (atau extract zip rilis).
2. Buka Google Maps, klik satu tempat.
3. Klik ikon extension atau pill **SDR Capture** di kanan bawah.
4. Klik **Simpan ke CSV**.
5. Klik **Data** / **Download CSV** untuk export.

Data tersimpan di `chrome.storage.local` dengan key `sdr_captures`.
Tidak ada request keluar; `fetch` yang tersisa di bundle cuma untuk memuat CSS
internal extension.

## Template CSV

Semua kolom diatur di **satu file**:

```
apps/extension/lib/csv-template.ts
```

Ubah array `CSV_COLUMNS` (tambah/hapus/urutkan), lalu:

```bash
pnpm build
pnpm zip
```

Default kolom (mengikuti `crm-contact-template.xlsx`):

```
*Nama, Sapaan, URL Foto, *Tipe Kontak, Grup Kontak, Perusahaan,
Alamat Penagihan, Negara, Provinsi, Kota, Email, Nomor Telepon,
Tanggal Lahir (dd/mm/yyyy)
```

Mapping:

| Kolom template | Sumber |
|---|---|
| `*Nama` | nama bisnis |
| `*Tipe Kontak` | `Vendor` (konstanta) |
| `Grup Kontak` | kategori Maps |
| `Perusahaan` | nama bisnis |
| `Alamat Penagihan` | alamat Maps |
| `Negara` | `Indonesia` (konstanta) |
| `Nomor Telepon` | telepon Maps |

Kolom `Sapaan`, `URL Foto`, `Provinsi`, `Kota`, `Email`, `Tanggal Lahir`
dibiarkan kosong karena tidak ada di data Maps. Data scrape lain (website,
sosmed, rating, link Maps) tidak diekspor karena template tidak punya kolomnya —
tambahkan sendiri di akhir array kalau CRM kamu menerima kolom ekstra.

## Perintah

```bash
pnpm install
pnpm dev                 # WXT dev + HMR
pnpm build               # build production
pnpm zip                 # zip siap upload
pnpm test                # 40 tes core + 9 tes scraper
pnpm typecheck
pnpm e2e                 # butuh: pnpm exec playwright install chromium
```

## Struktur

```
apps/extension/          extension (WXT + React + Tailwind + shadcn)
  entrypoints/popup/     capture dari toolbar
  entrypoints/content/   scraper + drawer in-page
  entrypoints/dashboard/ daftar hasil scrape + export CSV
  lib/capture.ts         tipe Capture
  lib/csv-template.ts    ⭐ template kolom CSV
  lib/store.ts           baca/tulis chrome.storage.local
  lib/download.ts        trigger download CSV
  components/            CaptureCard
packages/ui/             25 komponen shadcn
packages/core/           schema/CSV util (dipakai untuk escaping)
legacy/                  POC vanilla JS lama
```

`apps/api` dan `apps/web` adalah eksperimen infra sebelumnya. **Tidak dipakai**
oleh extension dan boleh diabaikan/dihapus.

## Yang perlu diketahui

- Scraper bergantung pada class DOM Google Maps (`h1.DUwDvf`, `div.F7nice`,
  `button[data-item-id=...]`). Kalau Google mengubah markup, selector perlu
  diperbarui di `entrypoints/content/scraper.ts`.
- Data hanya ada di profil Chrome tersebut. Uninstall extension = data hilang.
  Download CSV sebelum uninstall.
- Icon masih placeholder (lingkaran biru).
- Untuk Chrome Web Store: perlu icon final, screenshot, privacy policy
  (walau tidak ada data keluar), dan description.
- E2E sudah memverifikasi: popup render → drawer scrape → simpan → dashboard →
  download CSV dengan isi yang benar.
