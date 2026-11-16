# Indonesia Geo Viewer (repaired source package)

Public Web GIS viewer built with React, TypeScript, Vite, Express and MapLibre GL. This package contains the audited/refactored local source; it is not a claim that the cloud Lovable project has imported this ZIP.

## Local setup

Requirements: Node.js 22.12+ and npm 10+. For Windows PowerShell instructions, see `SETUP_WINDOWS.md`.

```bash
npm install
cp .env.example .env
# Set NASA_FIRMS_MAP_KEY only in the server environment if FIRMS is needed.
npm run dev
```

If a previous dependency installation failed, remove `node_modules` and `package-lock.json` before retrying. Do not use `--force` or `--legacy-peer-deps`.

## Verification

```bash
npm test
npm run audit
npm run lint
npm run build
```

`npm test` runs the event/hotspot deduplication unit tests and the static source audit. A full dependency-based typecheck/build must be run after dependency installation.

## Core source integrations

- BMKG TEWS and village forecasts, official CAP/RSS nowcast polygons, and a clearly labelled third-party Dhanypedia BMKG API mirror for latest-earthquake JSON.
- Open-Meteo forecast endpoints (model data, not observational radar).
- NASA FIRMS VIIRS NRT: separate Suomi-NPP, NOAA-20 and NOAA-21 layers (server-side key required).
- USGS earthquakes.
- BIG STIG batas provinsi berbentuk polygon GeoJSON serta BIG Satu Peta untuk kawasan hutan dan izin pertambangan.
- GFW Tile Cache raster/vector tiles untuk kehilangan tutupan pohon, gambut, konsesi serat kayu, mill, perkebunan dan konsesi tambang.
- NASA GPM IMERG melalui NASA EOSDIS GIBS untuk laju curah hujan satelit.
- Copernicus Data Space STAC catalogue/search.
- Global Forest Watch dataset catalogue/version discovery.

Not all source APIs are local downloaded datasets. See `PUBLIC_LAYER_SOURCES.md` for the current 20-layer thematic inventory, official endpoint patterns, access requirements, attribution and temporal caveats.

## Security

Never put NASA FIRMS MAP_KEY in frontend code, browser storage, URL parameters, logs, or public repository content. Configure `NASA_FIRMS_MAP_KEY` as a server-only environment secret. Rotate any key previously included in source material.

## Administrative boundaries

No synthetic province polygons are used. The current thematic catalogue uses the BIG STIG province Feature Layer 0 polygon (EPSG:4326), retrieved by the backend as GeoJSON. The previous kabupaten/kecamatan thematic overlays are no longer in the active catalogue.

## Impor data vektor (GeoJSON dan Shapefile)

Gunakan tombol **Data Vektor** pada header untuk memuat file lokal ke peta. Lihat `VECTOR_IMPORT_GUIDE.md` untuk panduan persiapan GeoJSON/Shapefile dari QGIS.

- GeoJSON: `.geojson` atau `.json` sesuai RFC 7946, koordinat longitude/latitude WGS84 (EPSG:4326).
- Shapefile: ZIP yang berisi `.shp`, `.shx`, `.dbf`, dan `.prj`, atau pilih `.shp` beserta file pendampingnya sekaligus. File `.prj` diperlukan agar proyeksi sumber dapat ditransformasikan dengan benar ke WGS84.
- Maksimum 75 MB per file pada impor browser. Data besar sebaiknya diproses di QGIS lalu dipublikasikan sebagai PMTiles/vector tiles atau dari PostGIS/GeoServer.

Setiap layer memakai satu GeoJSON source MapLibre, tetapi dirender melalui style layer khusus sesuai geometri:
- Polygon/MultiPolygon: fill transparan dan outline dua lapis agar tepi tetap terbaca di atas citra.
- LineString/MultiLineString: casing gelap dan stroke warna dataset.
- Point/MultiPoint: simbol mengikuti zoom dan clustering otomatis untuk data padat.
- Label dimatikan secara default untuk mencegah peta penuh tulisan; aktifkan per layer bila diperlukan.

Impor berjalan di browser; berkas lokal tidak dikirim ke server dan akan hilang saat halaman di-refresh. Dataset identik yang diunggah ulang dilewati berdasarkan fingerprint geometri dan atribut. Fitur hanya dihapus sebagai duplikat bila geometri kanonis, atribut, dan feature ID sama. Poligon yang saling tumpang tindih atau memiliki atribut berbeda tidak otomatis digabung/dihapus.

## Catatan kualitas geometri

GeoJSON terproyeksi yang koordinatnya berada di luar rentang longitude/latitude tidak akan diplot secara keliru; impor ditolak dan pengguna diminta melakukan reproyeksi. Untuk Shapefile, file `.prj` dipakai oleh `shpjs` untuk mengeluarkan GeoJSON WGS84. Periksa topologi polygon (self-intersection, ring tidak tertutup, sliver, hole) di QGIS sebelum memakai data untuk analisis luas atau batas legal. Styling peta tidak memperbaiki topologi sumber.


### Katalog layer publik terbaru

Layer tematik lama telah diganti dengan katalog baru berisi 20 layer logis: batas provinsi BIG; tiga sensor hotspot VIIRS; angin, kualitas udara, potensi hujan, nowcast BMKG dan curah hujan NASA GPM; sebaran gunung api dan kawasan hutan BIG; serta dataset kehilangan tutupan pohon, gambut, konsesi serat kayu, mills, perkebunan, batu bara dan pertambangan dari BIG/GFW. Basemap dan alat impor GeoJSON/Shapefile tetap dipertahankan secara terpisah.

Lihat `PUBLIC_LAYER_SOURCES.md` untuk URL resmi, endpoint lokal, jenis data, jadwal pembaruan, atribut, ketentuan akses dan batasan lisensi. Data tidak semuanya real-time: katalog membedakan near-real-time, model/prakiraan, produk satelit dengan latensi, dan data referensi/berkala.

### BIG PTRA dan GFW

Empat overlay BIG disajikan melalui proxy ArcGIS Express. GFW vector tiles menggunakan dataset resmi Tile Cache dan source-layer metadata dari penyedia; GFW tree-cover loss dan peatlands menggunakan raster tiles resmi. BIG PTRA Atlas Batu Bara 1:250K tidak disertakan pada layer publik karena catatan layanan membatasi penggunaannya ke aplikasi Atlas BIG; layer batu bara memakai filter atribut pada BIG Satu Peta IUP dan harus diverifikasi terhadap nilai komoditas sumber.

### BMKG earthquake, weather forecast and nowcast

See `BMKG_INTEGRATION.md` for the local proxy endpoints, Sidebar ADM4 forecast lookup, CAP polygon rendering, attribution requirements and API limitations. BMKG official feeds are primary; Dhanypedia is labelled as a third-party mirror and is not represented as an official BMKG endpoint.


### Atribusi dan inspeksi atribut API BIG/GFW

Sumber ArcGIS BIG/GFW memiliki kredit penyedia yang terpisah dari nama penyedia dan catatan lisensi. Kredit tampil pada kontrol atribusi peta. Klik pada objek di overlay BIG/GFW akan mencoba mengambil atribut asli melalui ArcGIS Identify dan menampilkan alias field/domain nilai apabila disediakan oleh metadata layanan. Raster tetap merupakan layer visual; hasil Identify bukan otomatis data vektor yang dapat diunduh.


## Public layer catalogue refresh (2026-11-10)

The previous thematic overlays have been replaced. The active layer list is registered in `src/data/layersCatalog.ts` and `src/data/arcgisServices.ts`. Four BIG MapServer overlays are raster-exported by the Express proxy; GFW vector tiles are proxied and use provider metadata to discover their source-layer names; GFW raster tiles use the official Tile Cache; model and event data use dedicated backend endpoints. See `PUBLIC_LAYER_SOURCES.md` for limitations.
