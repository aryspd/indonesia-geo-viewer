# Panduan diagnosis layer VIIRS NASA FIRMS

Pembaruan: 9 November 2026

## Apa yang diperbaiki

- Layer SNPP, NOAA-20, dan NOAA-21 tetap terpisah dengan source dan clustering MapLibre masing-masing.
- Layer SNPP aktif secara default; NOAA-20 dan NOAA-21 dapat diaktifkan sendiri.
- Status setiap sensor muncul di Sidebar: `Memuat data`, jumlah hotspot, `0 deteksi`, atau pesan gagal.
- Tombol `Muat ulang VIIRS` mengirim `refresh=1` agar cache backend dilewati.
- Refresh otomatis dilakukan setiap 15 menit.
- Titik yang dikirim ke MapLibre divalidasi sebagai GeoJSON Point dengan koordinat [longitude, latitude].
- Jika satu sensor gagal, sensor lain tetap diproses. Data terakhir yang berhasil tidak dibuang jika refresh berikutnya gagal.

## Konfigurasi key

Buat atau edit `.env` pada root folder proyek:

```env
NASA_FIRMS_MAP_KEY="GANTI_DENGAN_MAP_KEY_BARU"
```

Jangan gunakan key yang pernah dipublikasikan di URL, chat, screenshot, source code, atau repository. Rotasi key tersebut pada portal NASA FIRMS dan simpan key baru hanya di `.env` server. Setelah mengubah `.env`, hentikan proses server (`Ctrl+C`) dan jalankan kembali `npm run dev`.

## Pemeriksaan berurutan

1. Buka `http://localhost:3000/api/firms/status`.
   - `configured: false`: `.env` belum terbaca atau key kosong.
   - `configured: true`: key tersedia di backend, tetapi belum tentu diterima NASA.
2. Uji SNPP: `http://localhost:3000/api/firms/hotspots?sensor=VIIRS_SNPP_NRT&days=1&refresh=1`
3. Uji NOAA-20: `http://localhost:3000/api/firms/hotspots?sensor=VIIRS_NOAA20_NRT&days=1&refresh=1`
4. Uji NOAA-21: `http://localhost:3000/api/firms/hotspots?sensor=VIIRS_NOAA21_NRT&days=1&refresh=1`
5. Respons yang benar adalah `FeatureCollection` dengan array `features`. Jika ada deteksi, array berisi Point GeoJSON.

## Cara membaca hasil

- `HTTP 400/401/403`: periksa key; rotasi key jika pernah terekspos.
- `HTTP 429`: batas transaksi MAP_KEY mungkin tercapai. Tunggu sebelum mengulang.
- HTTP 200 dengan `features: []`: koneksi dan autentikasi berhasil, tetapi tidak ada deteksi dalam bbox Indonesia pada rentang satu hari tersebut. Uji `days=3` atau `days=5` untuk memperluas rentang waktu.
- HTTP 502 / timeout: periksa koneksi server dan ketersediaan NASA FIRMS.
- Respons berisi fitur tetapi peta kosong: periksa status layer SNPP di Sidebar dan pastikan checkbox layer aktif.

## Endpoint API resmi

Format Area API NASA: `/api/area/csv/{MAP_KEY}/{SOURCE}/{WEST,SOUTH,EAST,NORTH}/{DAY_RANGE}`. Sensor yang didukung di proyek ini: `VIIRS_SNPP_NRT`, `VIIRS_NOAA20_NRT`, dan `VIIRS_NOAA21_NRT`. Bbox Indonesia: `94.7,-11.0,141.1,6.1`; rentang hari yang diizinkan NASA adalah 1–5.
