# Panduan Impor GeoJSON dan Shapefile

## 1. GeoJSON

1. Buka QGIS dan muat layer.
2. Klik kanan layer → Export → Save Features As.
3. Format: GeoJSON.
4. CRS: EPSG:4326 - WGS 84.
5. Simpan sebagai `.geojson` atau `.json` lalu impor melalui tombol **Data Vektor**.

GeoJSON memakai urutan koordinat `[longitude, latitude]`, bukan `[latitude, longitude]`. GeoJSON ber-CRS terproyeksi seperti EPSG:3857 harus direproyeksi sebelum impor.

## 2. Shapefile

Cara yang disarankan adalah mengompres file-file satu shapefile dalam satu ZIP dengan nama dasar yang sama:

- `nama_layer.shp` — geometri.
- `nama_layer.shx` — index geometri.
- `nama_layer.dbf` — atribut tabel.
- `nama_layer.prj` — sistem koordinat/proyeksi (wajib untuk reproyeksi aman).
- `nama_layer.cpg` — encoding atribut, bila tersedia.

Pilih ZIP pada panel **Data Vektor**. Aplikasi juga menerima pemilihan `.shp` dan komponen pendampingnya sekaligus, selama semua nama dasar file cocok.

Parser `shpjs` membaca Shapefile dan mengeluarkan GeoJSON dalam WGS84; file `.prj` diperlukan untuk mengetahui sistem koordinat sumber. Bila `.prj` hilang, ekspor ulang dari QGIS dengan CRS yang benar. Jangan menebak CRS.

## 3. Cara layer ditampilkan

| Geometri | Gaya peta | Perilaku |
|---|---|---|
| Polygon / MultiPolygon | Fill transparan + outline warna + casing gelap | Batas tetap terbaca di atas citra dan basemap |
| LineString / MultiLineString | Casing gelap + stroke warna | Membantu garis sungai/jalan/batas tidak tenggelam |
| Point / MultiPoint | Circle simbol responsif terhadap zoom | Clustering otomatis untuk dataset dengan banyak titik |
| GeometryCollection | Dipecah menjadi fitur geometri masing-masing | Dapat diberi style sesuai tipe geometri |

Label otomatis dimatikan untuk mencegah peta terlalu padat. Aktifkan label per layer dan gunakan zoom lebih dekat untuk membaca nama.

## 4. Pemeriksaan kualitas

- Periksa CRS layer sebelum ekspor.
- Jalankan **Check Validity** di QGIS untuk mengecek ring, self-intersection, dan geometri invalid.
- Periksa polygon berlubang (hole), multipart, sliver polygon, dan garis yang terputus.
- `Fix Geometries` dapat mengubah bentuk/struktur data; simpan salinan asli dan verifikasi hasil sebelum dipakai pada batas legal atau perhitungan luas.
- Aplikasi menutup ring polygon yang belum tertutup dan mencatat jumlahnya, tetapi tidak melakukan perbaikan topologi kompleks.
- Geometri/properti identik yang diulang dapat dilewati. Objek yang hanya overlap, beda ID, beda atribut, atau beda arah garis tidak otomatis digabung.

## 5. Performa

Impor browser dibatasi 75 MB per file. Untuk layer nasional yang sangat besar, hindari menyimpan jutaan vertex dalam satu GeoJSON. Proses geometri di QGIS/PostGIS dan publikasikan sebagai PMTiles/MVT atau layanan vector tiles. Aplikasi ini menyimpan file impor di memori browser saja; refresh halaman akan menghapus layer impor.
