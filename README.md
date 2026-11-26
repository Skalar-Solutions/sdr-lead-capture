# SDR Lead Capture

Alat bantu kecil untuk **mengambil data bisnis dari Google Maps dan menyimpannya
sebagai file CSV** yang siap diimpor ke CRM.

Cocok untuk sales yang sedang mengumpulkan daftar calon pelanggan: buka Google
Maps, klik satu bisnis, simpan, ulangi. Di akhir, download CSV-nya.

Tidak perlu akun. Tidak perlu internet tambahan. **Data tidak dikirim ke mana
pun** — semuanya tersimpan di Chrome di komputer kamu.

---

## Yang kamu dapat

Satu file CSV dengan 13 kolom, persis seperti template CRM:

`*Nama`, `Sapaan`, `URL Foto`, `*Tipe Kontak`, `Grup Kontak`, `Perusahaan`,
`Alamat Penagihan`, `Negara`, `Provinsi`, `Kota`, `Email`, `Nomor Telepon`,
`Tanggal Lahir (dd/mm/yyyy)`

Yang otomatis terisi dari Google Maps:

- Nama bisnis
- Kategori (mis. Steakhouse, Klinik, Salon)
- Alamat lengkap
- Nomor telepon
- Negara: Indonesia
- Tipe kontak: Vendor

Sisanya dibiarkan kosong karena memang tidak ada di Google Maps.

---

## Cara memasang

> Kalau extension sudah dipasang di Chrome kamu, lewati bagian ini.

Saat ini extension dipasang manual (belum di Chrome Web Store).

1. Minta file **`sdr-lead-capture-csv-1.0.3-chrome.zip`** ke yang mengirim ini.
2. **Extract** file zip itu ke folder yang gampang diingat, misalnya
   `Dokumen/SDR Lead Capture`.
   Penting: jangan hapus folder ini setelah dipasang.
3. Buka Chrome, ketik di address bar: `chrome://extensions`
4. Nyalakan tombol **Developer mode** di kanan atas.
5. Klik **Load unpacked**.
6. Pilih folder hasil extract tadi (folder yang ada file `manifest.json`-nya).
7. Extension akan muncul. Klik ikon puzzle 🧩 di kanan atas Chrome, lalu klik
   **pin** di samping "SDR Lead Capture" supaya ikonnya nempel di toolbar.

Kalau nanti extension sudah ada di Chrome Web Store, cara pasangnya cukup klik
**Add to Chrome**.

---

## Cara pakai

1. Buka **Google Maps** (`google.com/maps`).
2. Cari bisnis, misalnya `steakhouse jakarta`.
3. **Klik satu tempat** sampai panel detailnya terbuka di sebelah kiri.
   (Kalau cuma di-hover, data belum terbaca.)
4. Klik ikon **SDR Lead Capture** di toolbar — atau klik tombol bulat
   **SDR Capture** di kanan bawah halaman Maps.
5. Akan muncul ringkasan data bisnis tersebut. Periksa sebentar.
6. Klik **Simpan ke CSV**.
7. Ulangi untuk bisnis berikutnya.
8. Kalau sudah selesai, klik **Download CSV**.

File CSV akan masuk ke folder **Downloads** komputer kamu.

---

## Membuka CSV

- **Excel**: klik dua kali file CSV-nya.
- **Google Sheets**: buka sheets.google.com → File → Import → upload CSV.
- **Langsung ke CRM**: gunakan fitur import kontak di CRM, pilih file CSV ini.
  Kolomnya sudah disamakan dengan template CRM, jadi tinggal cocokkan.

Kalau di Excel angka **0 di depan nomor telepon hilang**, itu perilaku Excel,
bukan datanya. CRM biasanya membaca CSV dengan benar. Kalau perlu, format kolom
telepon sebagai "Text" sebelum membuka.

---

## Arti kolom

| Kolom | Isinya |
|---|---|
| `*Nama` | Nama bisnis |
| `Sapaan` | Kosong |
| `URL Foto` | Kosong |
| `*Tipe Kontak` | Otomatis "Vendor" |
| `Grup Kontak` | Kategori bisnis dari Maps |
| `Perusahaan` | Nama bisnis |
| `Alamat Penagihan` | Alamat lengkap |
| `Negara` | Indonesia |
| `Provinsi` | Kosong — isi manual kalau perlu |
| `Kota` | Kosong — isi manual kalau perlu |
| `Email` | Kosong — Google Maps jarang mencantumkan email |
| `Nomor Telepon` | Nomor dari Google Maps |
| `Tanggal Lahir (dd/mm/yyyy)` | Kosong |

Kolom bertanda `*` wajib untuk CRM. Dua-duanya sudah terisi otomatis.

---

## Melihat dan mengelola data

Klik tombol **Data** di popup, atau ikon clipboard di kotak capture di Maps.

Di halaman itu kamu bisa:

- melihat semua baris yang sudah disimpan
- mencari berdasarkan nama, alamat, atau telepon
- menghapus satu baris
- menghapus semua data
- download CSV

Data ini tersimpan di Chrome. Kalau extension di-uninstall, datanya ikut hilang.
**Download CSV dulu sebelum uninstall.**

---

## Kalau ada masalah

| Masalah | Solusi |
|---|---|
| Tombol SDR Capture tidak muncul | Pastikan sedang di `google.com/maps`, lalu refresh halaman (F5) |
| Data yang muncul kosong | Klik dulu salah satu tempat sampai panel detail terbuka, lalu klik tombol refresh ↻ di kotak capture |
| Tombol "Simpan ke CSV" tidak bereaksi | Tutup popup, buka lagi, coba simpan sekali lagi |
| CSV kosong | Pastikan sudah klik "Simpan ke CSV", bukan cuma melihat ringkasan |
| Extension hilang setelah update Chrome | Buka `chrome://extensions` → Load unpacked → pilih folder extension lagi |
| Data lama hilang | Kemungkinan extension di-uninstall atau profil Chrome dihapus. Data memang hanya tersimpan lokal |

---

## Privasi

- Tidak ada akun, tidak ada login.
- Tidak ada data yang dikirim ke server.
- Extension hanya membaca halaman Google Maps yang sedang kamu buka.
- Semua hasil scrape disimpan di Chrome di komputer kamu sendiri.

Kebijakan privasi lengkap ada di [`PRIVACY.md`](PRIVACY.md).

---

## Pertanyaan yang sering muncul

**Bisa ambil banyak bisnis sekaligus otomatis?**
Belum. Saat ini satu per satu. Ini juga lebih aman terhadap aturan Google Maps.

**Bisa dipakai di HP?**
Belum. Hanya di Chrome desktop (Windows/Mac/Linux).

**Bisa di Edge atau Brave?**
Bisa. Caranya sama, buka halaman extension di browser tersebut.

**Datanya bisa dipakai di komputer lain?**
Bisa, lewat download CSV. Data tidak otomatis pindah sendiri.

**Kalau salah simpan?**
Buka halaman **Data**, hapus barisnya, lalu capture ulang.

**Kalau tempat yang sama ke-capture dua kali?**
Yang kedua otomatis dilewati, jadi CSV tidak berisi baris ganda. Duplikat
dikenali dari link tempat Google Maps (atau nama + telepon + alamat kalau
link-nya tidak lengkap).

---

## Untuk yang paham teknis

- Kode ada di `apps/extension` (WXT + React).
- Kolom CSV diatur di `apps/extension/lib/csv-template.ts`.
- Build: `pnpm install && pnpm build && pnpm zip`.
- Smoke test ke Google Maps asli: `pnpm build && pnpm smoke:maps`.
- Store assets: `store/` (screenshot, promo, listing). Privacy page: `docs/privacy.html`.
- Detail teknis, arsitektur, dan checklist serah terima ada di `HANDOVER.txt`.
