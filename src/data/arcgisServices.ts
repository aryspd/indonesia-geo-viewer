import type { LayerCategory } from '../types/gis';

export type ArcGisServiceType = 'MapServer' | 'ImageServer';

export interface ArcGisServiceCandidate {
  url: string;
  serviceType: ArcGisServiceType;
  layerIds?: number[];
  /** ArcGIS MapServer layerDefs expression keyed by sublayer ID. */
  layerDefinitions?: Record<number, string>;
  note?: string;
}

export interface ArcGisOverlayService {
  id: string;
  name: string;
  category: LayerCategory;
  provider: string;
  attribution: string;
  candidates: ArcGisServiceCandidate[];
  sourceUrl: string;
  description: string;
  updateCadence: string;
  spatialResolution: string;
  license: string;
  minZoom?: number;
  maxZoom?: number;
  opacity: number;
  downloadUrl?: string;
}

const BIG_KSP_FOREST = 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/KEHUTANAN/MapServer';
const BIG_KSP_MINING = 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/PERIZINAN_DAN_PERTANAHAN/MapServer';

/**
 * Only services intended for the public-facing layer catalogue belong here.
 * PTRA Atlas_250K_BatuBara is intentionally excluded: its service description
 * restricts use to atlas.big.go.id. Public coal/mining view uses the KSP IUP
 * feature layer instead, with coal represented by a best-effort commodity filter.
 */
export const ARCGIS_OVERLAY_SERVICES: ArcGisOverlayService[] = [
  {
    id: 'big-gunung-api',
    name: 'Sebaran Gunung Api — BIG',
    category: 'disaster',
    provider: 'Badan Informasi Geospasial (BIG)',
    attribution: '© Badan Informasi Geospasial (BIG)',
    candidates: [
      {
        url: 'https://geoservices.big.go.id/gis/rest/services/PTRA/Atlas_Sebaran_GunungApi/MapServer',
        serviceType: 'MapServer',
        layerIds: [1, 3, 5, 7, 9, 11],
        note: 'Sublayer kelompok skala Atlas Nasional Indonesia produksi 2021; referensi sebaran gunung api, bukan status aktivitas/erupsi terkini.',
      },
      {
        url: 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer',
        serviceType: 'MapServer',
        layerIds: [10, 11],
        note: 'KSP Kebijakan Satu Peta: Peta Kawasan Rawan Bencana Gunung Api (Titik & Area)',
      },
    ],
    sourceUrl: 'https://geoservices.big.go.id/gis/rest/services/PTRA/Atlas_Sebaran_GunungApi/MapServer',
    description: 'Peta referensi titik gunung api dari Atlas Nasional Indonesia BIG (produksi 2021). Tidak menggantikan informasi status gunung api dan peringatan PVMBG.',
    updateCadence: 'Atlas referensi 2021; bukan feed real-time',
    spatialResolution: 'Titik; kelompok skala atlas',
    license: 'Akses layanan publik; wajib atribusi BIG. Periksa metadata untuk syarat pemanfaatan ulang.',
    minZoom: 4,
    opacity: 0.95,
  },
  {
    id: 'big-forest-zones',
    name: 'Kawasan Hutan — BIG Satu Peta',
    category: 'environment',
    provider: 'BIG — Kebijakan Satu Peta',
    attribution: '© BIG / Sekretariat Kebijakan Satu Peta',
    candidates: [{ url: BIG_KSP_FOREST, serviceType: 'MapServer', layerIds: [0] }],
    sourceUrl: `${BIG_KSP_FOREST}/0`,
    description: 'Feature Layer 0 Penetapan Kawasan Hutan; polygon EPSG:4326 dan mendukung GeoJSON. Baca nomor/tanggal SK pada atribut fitur. Metadata layanan bertema Kehutanan 08-08-2024.',
    updateCadence: 'Mengikuti pembaruan layer sumber; metadata layanan bertema 08-08-2024',
    spatialResolution: 'Polygon kawasan hutan; skala mengikuti sumber',
    license: 'Akses REST publik; atribusi BIG/Satu Peta wajib. Ketentuan penggunaan ulang mengikuti pengelola data.',
    minZoom: 4,
    opacity: 0.68,
  },
  {
    id: 'big-mining-licenses',
    name: 'Wilayah Izin Usaha Pertambangan — BIG',
    category: 'topography',
    provider: 'BIG — Kebijakan Satu Peta',
    attribution: '© BIG / Sekretariat Kebijakan Satu Peta',
    candidates: [{ url: BIG_KSP_MINING, serviceType: 'MapServer', layerIds: [4] }],
    sourceUrl: `${BIG_KSP_MINING}/4`,
    description: 'Layer polygon 4 Peta Wilayah Izin Usaha Pertambangan (IUP) nasional. Atribut sumber mencakup provinsi, kabupaten, operator, jenis operasi, komoditas, status dan tanggal.',
    updateCadence: 'Mengikuti pembaruan dataset perizinan pada Satu Peta',
    spatialResolution: 'Polygon wilayah izin usaha pertambangan',
    license: 'Akses REST publik; atribusi BIG/Satu Peta wajib. Bukan pengganti konfirmasi izin pada instansi penerbit.',
    minZoom: 4,
    opacity: 0.48,
  },
  {
    id: 'big-coal-iup',
    name: 'Wilayah IUP Komoditas Batu Bara — BIG (filter atribut)',
    category: 'topography',
    provider: 'BIG — Kebijakan Satu Peta',
    attribution: '© BIG / Sekretariat Kebijakan Satu Peta',
    candidates: [{
      url: BIG_KSP_MINING,
      serviceType: 'MapServer',
      layerIds: [4],
      layerDefinitions: {
        4: "UPPER(tiptmb) LIKE '%BATUBARA%' OR UPPER(tiptmb) LIKE '%BATU BARA%' OR UPPER(tiptmb) LIKE '%COAL%'",
      },
      note: 'Filter menggunakan atribut tiptmb pada layer IUP. Nilai domain dapat bervariasi; cek atribut fitur/metadata apabila area tidak tampil. Bukan Atlas BIG 1:250K.',
    }],
    sourceUrl: `${BIG_KSP_MINING}/4`,
    description: 'Subkumpulan layer IUP BIG yang difilter berdasarkan atribut komoditas tiptmb (BATUBARA/BATU BARA/COAL). Filter bersifat sesuai nilai atribut sumber; jika hasil kosong, periksa domain nilai pada layanan.',
    updateCadence: 'Mengikuti pembaruan dataset perizinan pada Satu Peta',
    spatialResolution: 'Polygon IUP yang lolos filter atribut komoditas',
    license: 'Akses REST publik; atribusi BIG/Satu Peta wajib. Status legal izin perlu verifikasi ke instansi penerbit.',
    minZoom: 4,
    opacity: 0.72,
  },
];
