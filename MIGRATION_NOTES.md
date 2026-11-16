# Migration notes

- Source stack retained: React, TypeScript, Vite, Express and MapLibre GL.
- Canonical layer list remains in `src/data/layersCatalog.ts`; each thematic dataset should have a single logical layer ID. Use `LayerMetadata.alternativeSources` for alternate access paths instead of creating duplicate toggles.
- Server-side integrations live in `server.ts`. API credentials must live only in server environment variables.
- `src/data/indonesiaLocations.ts` retains province search reference data only; it no longer constructs boundary geometry.
- `MapViewer.tsx` fetches official BIG RBI province line features (MapServer layer 8) from `/api/admin/boundaries/province` and uses dynamic RainViewer frame metadata.
- The current ZIP did not contain local SHP/GeoJSON layers from Mandum Rimba or other polygon archives; those need separate import and validation.
- Do not deploy until `NASA_FIRMS_MAP_KEY` is added to server secrets, build checks pass, and runtime health endpoints are checked in the hosting environment.

## Penyempurnaan rendering vektor

- Ditambahkan tombol Data Vektor dan panel impor GeoJSON/JSON serta Shapefile ZIP/komponen SHP.
- Ditambahkan validasi WGS84, batas koordinat, geometri kosong/tidak didukung, dan dukungan GeometryCollection dengan pemisahan komponen geometri.
- Ditambahkan fingerprint dataset yang stabil terhadap urutan fitur serta orientasi/titik awal ring polygon. Feature ID dan seluruh atribut ikut menjadi bagian identitas; overlap geometri tidak dianggap duplikasi.
- Ditambahkan styling MapLibre terpisah untuk polygon, garis, dan titik; fill transparan, outline/casing, cluster titik, zoom-to-bounds dan toggle label.
- Panel inspeksi kini menampilkan tipe geometri, koordinat klik, dan tabel atribut fitur lokal.
- Batas impor browser 75 MB; data besar dianjurkan diproses di QGIS dan disajikan sebagai PMTiles/vector tiles atau layanan geospasial.

Tidak ada geometri asli yang disederhanakan atau dimodifikasi secara otomatis. Styling bersifat presentasi; validasi topologi dan reproyeksi perlu dilakukan di QGIS sesuai sumber data.
