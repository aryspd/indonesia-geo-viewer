# Perbaikan Layer NASA FIRMS VIIRS

## Layer terpisah

Aplikasi sekarang menampilkan tiga layer yang dapat diaktifkan/dimatikan secara terpisah:

- `disaster-viirs-snpp` → `VIIRS_SNPP_NRT` (Suomi-NPP), aktif secara default.
- `disaster-viirs-noaa20` → `VIIRS_NOAA20_NRT`.
- `disaster-viirs-noaa21` → `VIIRS_NOAA21_NRT`.

Setiap layer memiliki GeoJSON source dan clustering MapLibre sendiri. Ketiga endpoint dipanggil secara terpisah; kegagalan satu sensor tidak menghentikan dua sensor lain.

## Konfigurasi secret

Isi `.env` pada folder root proyek:

```env
NASA_FIRMS_MAP_KEY="MASUKKAN_MAP_KEY_BARU"
```

Jangan menanamkan MAP_KEY di frontend, katalog layer, URL yang ditampilkan browser, atau repositori. Bila MAP_KEY pernah dibagikan melalui chat/screenshot/source, rotasi melalui NASA FIRMS dan gunakan key baru.

## Pemeriksaan

Jalankan aplikasi dengan `npm run dev`, lalu buka:

- `http://localhost:3000/api/firms/status`
- `http://localhost:3000/api/firms/hotspots?sensor=VIIRS_SNPP_NRT&days=1`
- `http://localhost:3000/api/firms/hotspots?sensor=VIIRS_NOAA20_NRT&days=1`
- `http://localhost:3000/api/firms/hotspots?sensor=VIIRS_NOAA21_NRT&days=1`

Endpoint status hanya menampilkan apakah key sudah dikonfigurasi dan tidak pernah mengembalikan key itu sendiri.

## Catatan interpretasi

Hotspot VIIRS adalah deteksi anomali termal/active fire dari pengamatan satelit, bukan konfirmasi lapangan. Gunakan confidence, FRP, waktu akuisisi, dan verifikasi lapangan sebelum menetapkan kebakaran.


## Diagnosis layer kosong (pembaruan 9 November 2026)

- Sidebar menampilkan status tiap sensor: loading, jumlah hotspot, 0 deteksi, atau error backend/NASA.
- Tombol **Muat ulang VIIRS** mengulang tiga request, melewati cache backend (`refresh=1`), tanpa mengulang request gempa dan batas wilayah.
- `GET /api/firms/status` hanya memeriksa apakah secret server terkonfigurasi; status key harus divalidasi dari request hotspot.
- `GET /api/firms/hotspots?sensor=VIIRS_SNPP_NRT&days=1` mengembalikan FeatureCollection dan status sensor. Ulangi untuk NOAA-20 dan NOAA-21.
- Jika respons menyatakan MAP_KEY invalid/401/403, rotasi key di portal NASA lalu isi `.env` di root dan restart server. Jangan masukkan key ke frontend.
- Jika respons 200 dan `features: []`, koneksi dan key bekerja tetapi tidak ada deteksi di bbox Indonesia pada rentang satu hari yang diminta; gunakan 3 atau 5 hari untuk uji silang.
