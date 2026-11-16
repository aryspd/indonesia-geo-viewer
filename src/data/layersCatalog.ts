import { BasemapId, LayerDefinition } from "../types/gis";

export interface BasemapConfig {
  id: BasemapId;
  name: string;
  thumbnail: string;
  description: string;
  tiles: string[];
  attribution: string;
  maxZoom: number;
}

export const BASEMAPS: BasemapConfig[] = [
  {
    id: "esri-satellite",
    name: "Esri World Imagery — Indonesia",
    thumbnail: "🛰️",
    description:
      "Basemap citra satelit Esri sebagai basemap default untuk seluruh wilayah Indonesia.",
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ],
    attribution:
      "Tiles © Esri — Sources: Esri, Maxar, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community",
    maxZoom: 19,
  },
  {
    id: "opentopomap",
    name: "OpenTopoMap Relief",
    thumbnail: "⛰️",
    description:
      "Peta topografi dengan kontur dan shading elevasi untuk analisis medan daratan.",
    tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
    attribution:
      "Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)",
    maxZoom: 17,
  },
];

export const INITIAL_LAYERS: LayerDefinition[] = [
  {
    id: "admin-provinces",
    name: "Batas Administrasi 38 Provinsi — Sipongi KLHK / BIG",
    category: "administrative",
    description:
      "Polygon batas administrasi 38 provinsi Indonesia edisi 2026 (termasuk 4 DOB Papua), EPSG:4326.",
    visible: true,
    opacity: 0.9,
    type: "geojson",
    metadata: {
      provider: "Sipongi KLHK & Badan Informasi Geospasial (BIG)",
      attribution:
        "© Sipongi Gakkum Kehutanan & Badan Informasi Geospasial (BIG)",
      updateCadence:
        "Edisi 38 Provinsi (2026); mencakup 4 Daerah Otonomi Baru Papua",
      spatialResolution: "Polygon batas provinsi nasional (38 fitur)",
      sourceUrl:
        "https://sipongi.gakkum.kehutanan.go.id/data/indonesia_38_provinsi.geojson",
      alternativeSources: [
        "https://geoservices.big.go.id/gis/rest/services/STIG/Batas_Provinsi/MapServer/0",
      ],
      license: "Data publik Sipongi KLHK / BIG; atribusi wajib.",
      description:
        "Batas Administrasi 38 Provinsi Indonesia (2026), polygon EPSG:4326 dengan atribut KODE_PROV, WADMPR, PROVINSI, ibu kota, pulau, dan populasi.",
    },
    legend: [
      { color: "#22d3ee", label: "Outline batas 38 provinsi" },
      { color: "#06b6d4", label: "Area provinsi (interaktif saat hover/klik)" },
    ],
  },
  {
    id: "disaster-viirs-snpp",
    name: "Titik Hotspot — VIIRS SNPP",
    category: "disaster",
    description:
      "Deteksi anomali termal NRT 375 m dari sensor VIIRS Suomi-NPP; bukan konfirmasi kebakaran lapangan.",
    visible: true,
    opacity: 1,
    type: "geojson",
    metadata: {
      provider: "NASA EOSDIS LANCE FIRMS",
      attribution: "NASA EOSDIS LANCE FIRMS — VIIRS Suomi-NPP NRT",
      updateCadence:
        "Near-real-time; mengikuti orbit dan pemrosesan NASA FIRMS",
      spatialResolution: "375 meter",
      sourceUrl: "https://firms.modaps.eosdis.nasa.gov/api/area",
      license: "NASA Earth Science Data Rights; MAP_KEY wajib untuk Area API",
      description:
        "Periksa acq_date, acq_time, confidence dan FRP. Data NRT tersedia setelah satelit melintas, bukan detik demi detik.",
    },
    legend: [
      { color: "#ef4444", label: "Kepercayaan tinggi" },
      { color: "#f97316", label: "Kepercayaan menengah" },
      { color: "#eab308", label: "Kepercayaan rendah" },
    ],
  },
  {
    id: "disaster-viirs-noaa20",
    name: "Titik Hotspot — VIIRS NOAA-20",
    category: "disaster",
    description: "Deteksi anomali termal NRT 375 m dari sensor VIIRS NOAA-20.",
    visible: false,
    opacity: 1,
    type: "geojson",
    metadata: {
      provider: "NASA EOSDIS LANCE FIRMS",
      attribution: "NASA EOSDIS LANCE FIRMS — VIIRS NOAA-20 NRT",
      updateCadence:
        "Near-real-time; mengikuti orbit dan pemrosesan NASA FIRMS",
      spatialResolution: "375 meter",
      sourceUrl: "https://firms.modaps.eosdis.nasa.gov/api/area",
      license: "NASA Earth Science Data Rights; MAP_KEY wajib",
      description:
        "Tampilkan terpisah dari SNPP dan NOAA-21; periksa confidence, FRP dan waktu akuisisi.",
    },
  },
  {
    id: "disaster-viirs-noaa21",
    name: "Titik Hotspot — VIIRS NOAA-21",
    category: "disaster",
    description: "Deteksi anomali termal NRT 375 m dari sensor VIIRS NOAA-21.",
    visible: false,
    opacity: 1,
    type: "geojson",
    metadata: {
      provider: "NASA EOSDIS LANCE FIRMS",
      attribution: "NASA EOSDIS LANCE FIRMS — VIIRS NOAA-21 NRT",
      updateCadence:
        "Near-real-time; mengikuti orbit dan pemrosesan NASA FIRMS",
      spatialResolution: "375 meter",
      sourceUrl: "https://firms.modaps.eosdis.nasa.gov/api/area",
      license: "NASA Earth Science Data Rights; MAP_KEY wajib",
      description:
        "Tampilkan terpisah dari SNPP dan NOAA-20; periksa confidence, FRP dan waktu akuisisi.",
    },
  },
  {
    id: "weather-wind-particles",
    name: "Pergerakan Angin — GFS (Sipongi / NCEP)",
    category: "weather",
    description:
      "Animasi partikel vektor angin 10 m dari grid GFS GRIB2 Opsroom Sipongi (dengan fallback Open-Meteo).",
    visible: true,
    opacity: 0.85,
    type: "canvas",
    metadata: {
      provider: "Opsroom Sipongi / NOAA NCEP GFS",
      attribution:
        "Wind GFS 10m via opsroom.sipongidata.my.id · Fallback: Open-Meteo (CC BY 4.0)",
      updateCadence:
        "Diperbarui mengikuti siklus run model GFS; cache aplikasi 20 menit",
      spatialResolution:
        "Grid global 1° × 1° (diinterpolasi bilinear di wilayah Indonesia)",
      sourceUrl: "https://opsroom.sipongidata.my.id/api/gfs",
      alternativeSources: ["https://api.open-meteo.com/v1/forecast"],
      license:
        "Data model prakiraan GFS publik untuk pemantauan non-komersial.",
      description:
        "Menampilkan komponen U/V angin permukaan 10m dalam animasi partikel warna-bertingkat dan suhu permukaan GFS.",
    },
    legend: [
      { color: "#38bdf8", label: "Angin lemah (< 15 km/j)" },
      { color: "#10b981", label: "Angin sedang (15–30 km/j)" },
      { color: "#f97316", label: "Angin kencang (30–45 km/j)" },
      { color: "#ef4444", label: "Angin sangat kencang (> 45 km/j)" },
    ],
  },
  {
    id: "weather-air-quality",
    name: "Kualitas Udara (ISPU) — AQMS KLHK / Sipongi",
    category: "weather",
    description:
      "Stasiun pemantauan kualitas udara (AQMS) KLHK real-time via Sipongi Opsroom dengan indeks ISPU per kota.",
    visible: true,
    opacity: 0.92,
    type: "geojson",
    metadata: {
      provider: "KLHK / Opsroom Sipongi AQMS",
      attribution:
        "Data AQMS via opsroom.sipongidata.my.id · Fallback: Open-Meteo CAMS",
      updateCadence:
        "Pembaruan per jam dari stasiun AQMS; cache aplikasi 15 menit",
      spatialResolution:
        "Titik stasiun pemantauan kualitas udara nasional (99 lokasi)",
      sourceUrl: "https://opsroom.sipongidata.my.id/api/aqms",
      alternativeSources: [
        "https://air-quality-api.open-meteo.com/v1/air-quality",
      ],
      license: "Data pemantauan kualitas udara publik KLHK / Sipongi.",
      description:
        "Menampilkan nilai ISPU (Indeks Standar Pencemar Udara), kategori mutu udara (BAIK, SEDANG, TIDAK SEHAT), alamat stasiun, dan waktu ukur.",
    },
    legend: [
      { color: "#22c55e", label: "BAIK (ISPU 0–50)" },
      { color: "#3b82f6", label: "SEDANG (ISPU 51–100)" },
      { color: "#f97316", label: "TIDAK SEHAT (ISPU 101–200)" },
      { color: "#ef4444", label: "SANGAT TIDAK SEHAT / BERBAHAYA (> 200)" },
    ],
  },
  {
    id: "weather-rain-potential",
    name: "Prakiraan Cuaca & Potensi Hujan — BMKG / Model",
    category: "weather",
    description:
      "Prakiraan cuaca resmi BMKG per kota/kelurahan dan grid probabilitas hujan nasional.",
    visible: true,
    opacity: 0.88,
    type: "geojson",
    metadata: {
      provider: "BMKG & Open-Meteo",
      attribution:
        "Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) & Open-Meteo (CC BY 4.0)",
      updateCadence:
        "Prakiraan BMKG diperbarui 2 kali sehari (slot 3-jaman); cache aplikasi 20 menit",
      spatialResolution:
        "Titik prakiraan ibu kota provinsi BMKG + grid model nasional",
      sourceUrl: "https://data.bmkg.go.id/prakiraan-cuaca/",
      alternativeSources: [
        "https://api.bmkg.go.id/publik/prakiraan-cuaca",
        "https://api.open-meteo.com/v1/forecast",
      ],
      license:
        "Data terbuka BMKG; atribusi BMKG wajib (batas akses 60 req/menit).",
      description:
        "Menampilkan kondisi cuaca BMKG, suhu (°C), kelembapan (%), kecepatan & arah angin, serta probabilitas hujan.",
    },
    legend: [
      { color: "#38bdf8", label: "Cerah / Berawan (0–25% hujan)" },
      { color: "#60a5fa", label: "Berawan Tebal (25–50%)" },
      { color: "#2563eb", label: "Hujan Ringan–Sedang (50–75%)" },
      { color: "#f59e0b", label: "Hujan Lebat / Petir (75–100%)" },
    ],
  },
  {
    id: "weather-bmkg-nowcast",
    name: "Peringatan / Potensi Hujan — BMKG Nowcast",
    category: "weather",
    description:
      "Peringatan dini cuaca BMKG format RSS/CAP; polygon hanya digambar jika CAP menyediakan geometri area.",
    visible: false,
    opacity: 0.36,
    type: "geojson",
    metadata: {
      provider: "BMKG",
      attribution:
        "Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)",
      updateCadence:
        "Pemutakhiran setiap saat; cache aplikasi sekitar 90 detik",
      spatialResolution:
        "Wilayah terdampak CAP, dapat mencapai tingkat kecamatan",
      sourceUrl: "https://www.bmkg.go.id/alerts/nowcast/id",
      alternativeSources: ["https://www.bmkg.go.id/alerts/nowcast/en"],
      license:
        "Data terbuka BMKG; atribusi BMKG wajib; batas akses 60 permintaan per menit per IP",
      description:
        "Feed peringatan resmi BMKG. Informasi warning bukan estimasi probabilitas hujan berbasis grid; baca severity, urgency, certainty dan waktu berlaku.",
    },
    legend: [
      { color: "#b91c1c", label: "Ekstrem" },
      { color: "#f97316", label: "Parah / Lebat" },
      { color: "#eab308", label: "Sedang / Waspada" },
    ],
  },
  {
    id: "weather-gpm-precipitation",
    name: "Curah Hujan — NASA GPM IMERG 30 Menit",
    category: "weather",
    description:
      "Raster laju presipitasi satelit IMERG 30 menit; memiliki jeda pemrosesan, bukan radar real-time detik ini.",
    visible: false,
    opacity: 0.76,
    type: "raster",
    tiles: [
      "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate_30min/default/{DATE}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png",
    ],
    attribution: "NASA Global Precipitation Measurement (GPM) / EOSDIS GIBS",
    metadata: {
      provider: "NASA GPM IMERG / EOSDIS GIBS",
      attribution: "NASA GPM IMERG; NASA EOSDIS GIBS",
      updateCadence:
        "Produk 30-menit; Early Run memiliki jeda pemrosesan beberapa jam",
      spatialResolution: "IMERG sekitar 0,1° (~10 km)",
      sourceUrl:
        "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml",
      license: "NASA Earthdata Open Data; atribusi NASA GPM/EOSDIS wajib",
      description:
        "Layer IMERG_Precipitation_Rate_30min. Menampilkan laju presipitasi satelit, bukan total akumulasi hujan stasiun.",
    },
    legend: [
      { color: "#c7e9ff", label: "Hujan ringan" },
      { color: "#4292c6", label: "Hujan sedang" },
      { color: "#fdae61", label: "Hujan lebat" },
      { color: "#d7191c", label: "Hujan sangat lebat" },
    ],
  },
  {
    id: "gfw-tree-cover-loss",
    name: "Kehilangan Tutupan Pohon — GFW / UMD",
    category: "environment",
    description:
      "Raster tree cover loss tahunan; gunakan sebagai indikator kehilangan tutupan pohon, bukan klasifikasi deforestasi otomatis.",
    visible: false,
    opacity: 0.78,
    type: "raster",
    tiles: ["/api/gfw/raster-tiles/umd_tree_cover_loss/{z}/{x}/{y}.png"],
    attribution: "Global Forest Watch / University of Maryland",
    metadata: {
      provider: "Global Forest Watch / University of Maryland",
      attribution: "Global Forest Watch; University of Maryland",
      updateCadence:
        "Tahunan; versi latest dari Tile Cache GFW (rilis loss terakhir yang tersedia)",
      spatialResolution: "30 meter (raster produk UMD)",
      sourceUrl:
        "https://tiles.globalforestwatch.org/umd_tree_cover_loss/latest/dynamic/{z}/{x}/{y}.png",
      license:
        "Periksa lisensi/atribusi dataset pada metadata GFW; layanan tile publik bukan izin redistribusi data mentah.",
      description:
        "UMD Tree Cover Loss. Kehilangan tutupan pohon tidak identik dengan deforestasi permanen dan dapat mencakup hutan tanaman/perkebunan.",
    },
    legend: [
      { color: "#f03b20", label: "Kehilangan tutupan pohon" },
      { color: "#feb24c", label: "Kehilangan pada tahun terpilih" },
    ],
  },
  {
    id: "gfw-peatlands",
    name: "Kawasan Lahan Gambut — Indonesia (1.524 Area)",
    category: "environment",
    description:
      "Peta poligon sebaran lahan gambut Indonesia (1.524 area gambut, gambut tipis, dan kedalaman 40 cm) terhubung langsung ke API lokal & GFW.",
    visible: true,
    opacity: 0.72,
    type: "raster",
    tiles: ["/api/gfw/raster-tiles/gfw_peatlands/{z}/{x}/{y}.png"],
    attribution: "Kementerian LHK / BBSDLP / Global Forest Watch",
    metadata: {
      provider: "Data Lahan Gambut Indonesia (KLHK / BBSDLP / GFW)",
      attribution: "Kementerian LHK / BBSDLP; Global Forest Watch",
      updateCadence:
        "Dataset referensi lahan gambut nasional Indonesia & versi latest GFW",
      spatialResolution:
        "Poligon vektor sebaran lahan gambut Indonesia (1.524 area)",
      sourceUrl:
        "https://tiles.globalforestwatch.org/gfw_peatlands/latest/dynamic/{z}/{x}/{y}.png",
      license:
        "Periksa metadata dataset KLHK/GFW untuk lisensi dan atribusi spesifik; tidak otomatis menjadi batas legal HGU/izin.",
      description:
        "Poligon kawasan lahan gambut Indonesia mencakup jenis gambut utama, gambut tipis, dan kedalaman 40 cm.",
    },
    legend: [
      { color: "#b45309", label: "Lahan Gambut Utama" },
      { color: "#eab308", label: "Gambut Tipis / Gambut 40 cm" },
      { color: "#f59e0b", label: "Garis Batas Kawasan Gambut" },
    ],
  },
  {
    id: "gfw-mangrove-extent",
    name: "Sebaran Habitat Mangrove (Mangrove Habitat Extent) — BIG & GMW",
    category: "environment",
    description:
      "Peta sebaran ekosistem habitat mangrove nasional (Mangrove Lebat, Sedang, dan Jarang) terhubung ke BIG Satu Peta (Skala 1:25.000 Layer 57), Global Mangrove Watch (GMW v3.0 / Zenodo 21346457), UNEP-WCMC, dan GFW.",
    visible: true,
    opacity: 0.85,
    type: "raster",
    tiles: ["/api/mangrove/tiles/{z}/{x}/{y}.png"],
    attribution:
      "BIG Kebijakan Satu Peta / KLHK / Global Mangrove Watch (UNEP-WCMC & GFW)",
    metadata: {
      provider:
        "BIG Satu Peta (Peta Mangrove 1:25.000) & Global Mangrove Watch (UNEP-WCMC / GFW)",
      attribution:
        "© Sekretariat Kebijakan Satu Peta (BIG / KLHK); Global Mangrove Watch (DOI: 10.5281/zenodo.21346457); UNEP-WCMC; Global Forest Watch",
      updateCadence:
        "Kompilasi Peta Mangrove Nasional BIG & Timeseries Global Mangrove Watch (GMW v3.0)",
      spatialResolution:
        "Poligon vektor ekosistem mangrove pesisir & raster 1:25.000 (BIG Layer 57 / GMW)",
      sourceUrl:
        "https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer/57",
      license:
        "Akses publik dengan wajib atribusi BIG Kebijakan Satu Peta dan Global Mangrove Watch (CC BY 4.0).",
      description:
        "Menampilkan poligon sebaran habitat mangrove Indonesia beserta klasifikasi kerapatan tajuk (Lebat, Sedang, Jarang), luas hektar (lsmgr), fungsi kawasan, BPDASHL, dan estimasi karbon biru.",
      alternativeSources: [
        "https://gis.unep-wcmc.org/arcgis/rest/services/HabitatsAndBiotopes/WCMC011_AtlasMangrove2010_v3/MapServer",
        "https://tiles.globalforestwatch.org/gfw_mangroves/latest/dynamic/{z}/{x}/{y}.png",
        "https://doi.org/10.5281/zenodo.21346457",
      ],
    },
    legend: [
      { color: "#14b8a6", label: "Mangrove Lebat (Kerapatan Tajuk > 70%)" },
      { color: "#22c55e", label: "Mangrove Sedang (Kerapatan Tajuk 30–70%)" },
      { color: "#84cc16", label: "Mangrove Jarang (Kerapatan Tajuk < 30%)" },
      { color: "#2dd4bf", label: "Garis Pesisir & Sabuk Habitat Mangrove" },
    ],
  },
  {
    id: "gfw-wood-fiber-concessions",
    name: "Konsesi Serat Kayu (HTI) — Indonesia (539 Area)",
    category: "environment",
    description:
      "Peta poligon 539 konsesi Hutan Tanaman Industri (HTI / serat kayu) di Indonesia beserta atribut perusahaan, grup korporasi (APP/Sinar Mas, APRIL/RGE, Inhutani), dan luas hektar.",
    visible: true,
    opacity: 0.78,
    type: "vector-tiles",
    vectorDataset: "idn_wood_fiber",
    vectorTileMode: "dynamic",
    metadata: {
      provider: "Kementerian LHK & Global Forest Watch (WRI)",
      attribution:
        "© Kementerian LHK RI; Global Forest Watch / World Resources Institute",
      updateCadence:
        "Dataset kurasi 539 area konsesi serat kayu (HTI) Indonesia & GFW idn_wood_fiber",
      spatialResolution: "Poligon vektor konsesi HTI nasional (539 area)",
      sourceUrl:
        "https://tiles.globalforestwatch.org/idn_wood_fiber/latest/dynamic/VectorTileServer",
      license: "Akses publik dengan atribusi KLHK & Global Forest Watch / WRI.",
      description:
        "Menampilkan poligon konsesi serat kayu / Hutan Tanaman Industri (HTI) di Indonesia lengkap dengan nama PT, afiliasi grup industri pulp & kertas, luas hektar, dan keliling poligon.",
    },
    legend: [
      { color: "#f43f5e", label: "Grup Sinar Mas / APP Supplier" },
      { color: "#a855f7", label: "Grup APRIL / Royal Golden Eagle (RGE)" },
      { color: "#f97316", label: "BUMN Inhutani & Grup Korporasi Lainnya" },
      { color: "#facc15", label: "Konsesi HTI Mandiri / Non-Grup" },
    ],
  },
  {
    id: "gfw-oil-palm",
    name: "Konsesi Perkebunan Kelapa Sawit — Indonesia (1.845 Area)",
    category: "environment",
    description:
      "Poligon area konsesi kelapa sawit di Indonesia (PT, grup perusahaan, status HGU/Izin Lokasi, dan luas hektar).",
    visible: true,
    opacity: 0.78,
    type: "vector-tiles",
    vectorDataset: "gfw_oil_palm",
    vectorTileMode: "static",
    metadata: {
      provider: "Data Konsesi Kelapa Sawit Indonesia (GFW / BPN)",
      attribution: "Global Forest Watch / World Resources Institute",
      updateCadence: "Dataset kurasi 1.845 area konsesi kelapa sawit Indonesia",
      spatialResolution: "Poligon vektor resolusi penuh Indonesia",
      sourceUrl:
        "https://tiles.globalforestwatch.org/gfw_oil_palm/latest/default/VectorTileServer",
      license: "Periksa lisensi dan atribusi spesifik dataset GFW/WRI.",
      description:
        "Poligon konsesi kelapa sawit Indonesia lengkap dengan atribut perusahaan, grup usaha, status legalitas (HGU/Izin Lokasi/Izin Prinsip), nomor SK, dan luas dalam hektar.",
    },
    legend: [
      { color: "#10b981", label: "Hak Guna Usaha (HGU)" },
      { color: "#f59e0b", label: "Izin Lokasi / Izin Prinsip" },
      { color: "#06b6d4", label: "HGU Dalam Proses" },
      { color: "#eab308", label: "Konsesi Sawit Lainnya" },
    ],
  },
];
