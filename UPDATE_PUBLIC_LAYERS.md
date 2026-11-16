# Panduan update katalog layer publik

Rilis katalog publik 2026-11-10 mengganti layer tematik lama dengan 20 layer logis (16 entri katalog + 4 overlay BIG). Enam basemap tetap terpisah dan alat impor GeoJSON/Shapefile tetap tersedia.

## Update proyek VS Code yang sudah ada

1. Buat salinan cadangan folder proyek `geo-viewer-repaired`.
2. Ekstrak ZIP Patch langsung ke folder `geo-viewer-repaired` yang sudah ada (bukan ke subfolder baru).
3. Pilih Replace/Overwrite file yang sama.
4. Pertahankan `.env`, `node_modules`, `package-lock.json` dan file kredensial lokal. Arsip patch tidak berisi `.env` atau `node_modules`.
5. Dari terminal proyek jalankan:

```powershell
npm test
npm run lint
npm run build
npm run dev
```

## Konfigurasi NASA FIRMS

Di file `.env` pada root proyek:

```env
NASA_FIRMS_MAP_KEY="MAP_KEY_NASA_ANDA"
```

Gunakan key baru karena key yang sebelumnya dibagikan di percakapan sudah terekspos. Jangan taruh key di React/Vite/browser.

## Pemeriksaan endpoint lokal

Setelah `npm run dev`, uji:

- `http://localhost:3000/api/admin/boundaries/province`
- `http://localhost:3000/api/firms/status`
- `http://localhost:3000/api/firms/hotspots?sensor=VIIRS_SNPP_NRT&days=1`
- `http://localhost:3000/api/weather/grid?kind=air`
- `http://localhost:3000/api/weather/grid?kind=rain`
- `http://localhost:3000/api/bmkg/nowcast/geojson?lang=id`
- `http://localhost:3000/api/gfw/vector-style/gfw_universal_mill_list`
- `http://localhost:3000/api/gfw/vector-style/idn_wood_fiber`
- `http://localhost:3000/api/arcgis/services`

`npm test` dan audit katalog lulus pada paket sumber. Lint/build berbasis dependensi perlu dijalankan pada komputer pengguna setelah `npm install` karena arsip tidak membawa `node_modules`.

## Perbedaan jenis data

Tidak semua layer real-time. NASA FIRMS dan BMKG Nowcast near-real-time; angin/kualitas udara/potensi hujan adalah model/prakiraan; GPM IMERG memiliki jeda pemrosesan; batas administrasi, atlas gunung api, kawasan hutan, konsesi, mills dan perkebunan adalah referensi/berkala. Baca `PUBLIC_LAYER_SOURCES.md` untuk sumber, atribusi, syarat penggunaan dan keterbatasan setiap dataset.
