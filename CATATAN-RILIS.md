# Catatan Rilis — SDR Lead Capture

Catatan ini ditulis dengan bahasa sehari-hari untuk tim SDR.
Detail teknis ada di [`HANDOVER.txt`](HANDOVER.txt).

---

## 1.0.7 — 26 November 2026

**Fokus: perbaikan mode Ambil Semua untuk bisnis yang pernah diklik.**

Yang berubah:

- **Bisnis yang linknya pernah dikunjungi sekarang tetap terbaca.** Sebelumnya
  Google Maps menambahkan akhiran `·Link yang dikunjungi` (UI Indonesia) atau
  `·Visited link` (UI Inggris) pada nama link hasil pencarian. Akhiran itu ikut
  terbaca sebagai nama bisnis, sehingga proses **Ambil Semua** gagal mencocokkan
  panel detail dan menandai bisnis sebagai **Tidak terbaca**.
- **Nama bisnis di checklist jadi bersih** tanpa akhiran tersebut.
- **Test baru** untuk akhiran versi Indonesia dan Inggris.

Tidak ada perubahan format data atau CSV. Data lama tetap aman.

**Cara update dari 1.0.6:**

1. Download `sdr-lead-capture-1.0.7-chrome.zip`.
2. Extract ke folder baru (jangan timpa folder lama).
3. Buka `chrome://extensions` → hapus extension lama → **Load unpacked** →
   pilih folder baru.
4. Data lama tetap ada.

---

## 1.0.6 — 26 November 2026

**Fokus: evaluasi & tagging lead SDR langsung saat capture + dua format CSV.**

Yang berubah:

- **SDR Tagging di kotak capture:** sebelum klik **Simpan ke CSV**, tim SDR bisa langsung memilih **Status Website** (`Tidak Ada`, `Outdated`, `Bad UX`, `Lumayan`), menandai **Celah Digital**, **Peluang Solusi**, **Prioritas (1–5)**, serta mengisi **Nama/Jabatan PIC** dan **Catatan sales**.
- **Nilai awal otomatis:** bisnis tanpa website otomatis ditandai status `Tidak Ada`, celah `Tanpa Website`, solusi `Web Dev`, dan prioritas `5 (HOT)`. Bisnis yang hanya punya link sosmed otomatis mendapat celah `Sosmed Only` dan catatan link sosmed.
- **Halaman Data Lead diperbarui:** menampilkan status website, celah digital, peluang solusi, prioritas, PIC, dan catatan (beserta baris detail yang bisa dibuka), serta pencarian mencakup status, PIC, dan catatan.
- **Dua format ekspor CSV:**
  - **CSV CRM** (`crm-contact-YYYY-MM-DD.csv`): tetap 13 kolom sesuai template impor CRM.
  - **CSV SDR Lengkap** (`sdr-leads-lengkap-YYYY-MM-DD.csv`): 21 kolom berisi seluruh data scrape dan hasil evaluasi/tagging SDR.
- **Kebersihan & filter kontak:** nomor telepon otomatis dinormalisasi menjadi angka murni (tanpa spasi/tanda hubung), dan bisnis yang tidak punya kontak sama sekali (tanpa telepon, WA, IG/sosmed, maupun website) dilewati (ditandai **Tanpa kontak** pada mode Ambil Semua). Selama ada salah satu kontaknya, bisnis tetap masuk.
- **Migrasi data lama otomatis:** data yang sudah tersimpan dari versi sebelumnya otomatis dilengkapi field tagging default saat dibuka, tanpa merusak data lama.

**Cara update dari 1.0.5:**

1. Download `sdr-lead-capture-1.0.6-chrome.zip`.
2. Extract ke folder baru (jangan timpa folder lama).
3. Buka `chrome://extensions` → hapus extension lama → **Load unpacked** →
   pilih folder baru.
4. Data lama tetap ada dan otomatis dilengkapi nilai tagging default.

---

## 1.0.5 — 26 November 2026

**Fokus: memudahkan tim SDR yang tidak teknis.**

Yang berubah:

- **Panduan baru untuk tim SDR:** [`PANDUAN-SDR.md`](PANDUAN-SDR.md). Isinya
  cara pasang, ambil satu bisnis, ambil banyak bisnis, sampai download CSV.
- **Bahasa di layar dipermudah:**
  - "Scrape Semua" menjadi **Ambil Semua**
  - "Mulai Scrape" menjadi **Mulai Ambil**
  - "Terekstrak" menjadi **Terbaca**
  - "Hasil Scrape" menjadi **Data Lead**
  - "baris" menjadi **lead** di halaman data
- **Halaman Data Lead:**
  - ada penjelasan tanda **HOT**
  - ada tombol **Buka Google Maps** kalau datanya masih kosong
  - tombol **Muat ulang** untuk mengambil data terbaru
- **Pesan bantuan lebih jelas** saat halaman Maps perlu di-refresh atau bisnis
  belum dipilih.
- **CI diperbaiki:** file zip hasil build sekarang benar-benar diunggah sebagai
  artifact (sebelumnya gagal karena folder `.output` tersembunyi).

Yang tetap sama:

- Data hanya tersimpan di Chrome di komputer masing-masing.
- Tidak ada akun, server, atau pengiriman data keluar.
- Template CSV CRM tetap 13 kolom.
- Ambil satu bisnis, ambil banyak bisnis, dan pencegahan data ganda tetap jalan.

**Cara update dari 1.0.4:**

1. Download `sdr-lead-capture-1.0.5-chrome.zip`.
2. Extract ke folder baru (jangan timpa folder lama).
3. Buka `chrome://extensions` → hapus extension lama → **Load unpacked** →
   pilih folder baru.
4. Data lama tetap ada karena tersimpan di Chrome, bukan di folder extension.

---

## 1.0.4 — 26 November 2026

**Fokus: mengambil banyak bisnis sekaligus.**

- **Kotak data terbuka otomatis** saat satu bisnis diklik di Google Maps.
- **Ambil Semua:** ambil 20/50/100 bisnis dari daftar hasil pencarian.
- **Checklist sebelum simpan:** pilih bisnis mana saja yang mau disimpan.
- **Deteksi data ganda:** bisnis yang sudah pernah disimpan ditandai
  "Sudah disimpan" dan tidak masuk dua kali.
- **Tombol Berhenti** tetap menyimpan hasil yang sudah terbaca.
- **Tombol Lihat Data** membuka halaman data langsung dari Google Maps.
- Icon dan tampilan diperbarui.

---

## 1.0.3 — 25 November 2026

- Template CSV disamakan dengan template CRM (13 kolom).
- Perbaikan kebersihan data: nama, alamat, dan telepon tanpa ikon aneh.
- Icon baru dan tampilan mono yang lebih rapi.
- Panduan pemasangan dan halaman privasi.

---

## Untuk admin

- Rilis baru dibuat otomatis lewat GitHub Actions saat tag `vX.Y.Z` di-push.
- Zip rilis: `sdr-lead-capture-X.Y.Z-chrome.zip`.
- Panduan teknis lengkap: [`HANDOVER.txt`](HANDOVER.txt).
