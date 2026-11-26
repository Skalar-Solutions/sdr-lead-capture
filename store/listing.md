# Chrome Web Store Listing — SDR Lead Capture

Status: opsional. Distribusi internal saat ini memakai zip dari GitHub Releases,
bukan Chrome Web Store (butuh akun developer berbayar). Aset di bawah siap kalau
nanti mau publish ke store.

## Name

SDR Lead Capture

## Short description (max 132 characters)

Capture business leads from Google Maps and export them to CSV. Offline, local-only, no account.

## Detailed description

SDR Lead Capture membantu tim sales mengumpulkan data bisnis dari Google Maps
dan mengubahnya menjadi file CSV yang siap diimpor ke CRM.

Buka Google Maps, klik satu tempat, lalu klik tombol SDR Capture. Extension
membaca nama, kategori, alamat, telepon, website, rating, dan link Maps dari
panel detail yang sedang terbuka. Semua data disimpan lokal di Chrome — tidak
ada akun, server, analytics, atau data yang dikirim keluar.

Fitur:

- Ambil data bisnis dari panel Google Maps yang sedang terbuka.
- Simpan ke penyimpanan lokal Chrome dengan deteksi duplikat otomatis.
- Dashboard untuk mencari, memeriksa, menghapus, dan mengekspor data.
- Export CSV 13 kolom yang mengikuti template kontak CRM.
- Tandai lead tanpa website sebagai HOT.
- Bekerja offline setelah extension terpasang.
- Permission minimal: hanya storage dan akses ke halaman Google Maps.

Cara pakai:

1. Buka google.com/maps atau google.co.id/maps.
2. Klik satu tempat sampai panel detailnya terbuka.
3. Klik ikon extension atau tombol SDR Capture di halaman.
4. Periksa ringkasan, lalu klik Simpan ke CSV.
5. Ulangi untuk tempat lain, buka Data, lalu Download CSV.

Catatan: extension ini mengambil satu tempat pada satu waktu, bukan scraper
massal. Data hanya tersimpan di browser tempat extension dipasang. Download CSV
sebelum menghapus data atau meng-uninstall extension.

## Category

Productivity

## Language

Indonesian

## Single purpose

Capture the details of the Google Maps place currently open in the browser and
export the captured rows as a local CSV file.

## Permission justification

- `storage` — menyimpan hasil capture di `chrome.storage.local` di komputer
  pengguna. Tidak ada data yang dikirim ke server.
- Host permission `google.com/maps` dan `google.co.id/maps` — membaca panel
  detail tempat yang sedang dibuka dan menampilkan tombol/drawer capture.
  Extension tidak berjalan di domain lain.

Tidak ada permission `tabs`, `identity`, `downloads`, `cookies`, atau akses
network tambahan.

## Remote code

No. Semua kode JavaScript dibundel di dalam paket extension. Tidak ada eval,
script remote, atau CDN.

## Data usage

- Data yang diproses: informasi bisnis yang terlihat di Google Maps.
- Penyimpanan: lokal di Chrome (`chrome.storage.local`).
- Transmisi: tidak ada.
- Penjualan data: tidak ada.
- Analytics/ads: tidak ada.
- Penghapusan: hapus baris di dashboard, hapus data extension, atau uninstall.

## Privacy policy URL

https://skalar-solutions.github.io/sdr-lead-capture/privacy.html

Aktifkan GitHub Pages sekali di repository:
Settings → Pages → Deploy from a branch → `main` → folder `/docs` → Save.

## Support URL

https://github.com/Skalar-Solutions/sdr-lead-capture/issues

## Assets

- `store/promo-440x280.png` — small promo tile 440x280.
- `store/screenshot-1-dashboard.png` — 1280x800.
- `store/screenshot-2-maps.png` — 1280x800.

## Submission checklist

- [ ] Aktifkan GitHub Pages dan buka URL privacy policy.
- [ ] Upload `release/sdr-lead-capture-1.0.3-chrome.zip`.
- [ ] Isi listing dengan teks di atas.
- [ ] Upload ketiga aset di `store/`.
- [ ] Pilih kategori Productivity, bahasa Indonesian.
- [ ] Isi permission justification dan data usage.
- [ ] Submit for review.
