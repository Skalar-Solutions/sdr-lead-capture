# Catatan Rilis — SDR Lead Capture

Catatan ini ditulis dengan bahasa sehari-hari untuk tim SDR.
Detail teknis ada di [`HANDOVER.txt`](HANDOVER.txt).

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
