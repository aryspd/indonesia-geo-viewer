import React, { useMemo, useState } from "react";
import {
  X,
  Sliders,
  Info,
  ChevronRight,
  ChevronDown,
  CloudRain,
  Satellite,
  Flame,
  TreePine,
  Mountain,
  Landmark,
  Search,
  RotateCcw,
  ExternalLink,
  RefreshCw,
  Compass,
} from "lucide-react";
import {
  FirmsSensorCode,
  FirmsSensorStatusMap,
  LayerCategory,
  LayerDefinition,
  LayerMetadata,
} from "../types/gis";

interface SidebarLayersProps {
  isOpen: boolean;
  onClose: () => void;
  layers: LayerDefinition[];
  onToggleLayer: (id: string) => void;
  onChangeOpacity: (id: string, opacity: number) => void;
  onResetPreset: () => void;
  onZoomToExtent: () => void;
  firmsSensorStatus?: FirmsSensorStatusMap;
  onRefreshFirms?: () => void;
  quakesVisible?: boolean;
  onToggleQuakes?: () => void;
  quakesOpacity?: number;
  onChangeQuakesOpacity?: (opacity: number) => void;
  quakesCount?: number | null;
}

const BMKG_QUICK_CITIES = [
  { name: "Jakarta Pusat", adm4: "31.71.01.1001" },
  { name: "Surabaya", adm4: "35.78.01.1001" },
  { name: "Bandung", adm4: "32.73.01.1001" },
  { name: "Medan", adm4: "12.71.01.1001" },
  { name: "Makassar", adm4: "73.71.01.1001" },
  { name: "Denpasar", adm4: "51.71.01.1001" },
  { name: "Yogyakarta", adm4: "34.71.01.1001" },
  { name: "Semarang", adm4: "33.74.01.1001" },
  { name: "Palembang", adm4: "16.71.01.1001" },
  { name: "Balikpapan", adm4: "64.71.01.1001" },
  { name: "Samarinda", adm4: "64.72.01.1001" },
  { name: "Pontianak", adm4: "61.71.01.1002" },
  { name: "Banjarmasin", adm4: "63.71.01.1001" },
  { name: "Palangka Raya", adm4: "62.71.01.1001" },
  { name: "Banda Aceh", adm4: "11.71.01.2001" },
  { name: "Padang", adm4: "13.71.01.1001" },
  { name: "Pekanbaru", adm4: "14.71.01.1002" },
  { name: "Serang", adm4: "36.73.01.1001" },
  { name: "Kupang", adm4: "53.71.01.1001" },
  { name: "Manado", adm4: "71.71.01.1001" },
  { name: "Gorontalo", adm4: "75.71.01.1001" },
  { name: "Ternate", adm4: "82.71.01.1001" },
  { name: "Jayapura", adm4: "91.71.01.1001" },
];

const CATEGORY_CONFIG: Record<
  LayerCategory,
  { name: string; icon: React.FC<{ className?: string }>; description: string }
> = {
  basemap: {
    name: "Basemap",
    icon: Satellite,
    description: "Peta dasar satelit, toponimi, dan jalan",
  },
  satellite: {
    name: "Citra Satelit",
    icon: Satellite,
    description: "Kategori referensi; basemap dikelola terpisah",
  },
  administrative: {
    name: "Batas Administrasi Wilayah",
    icon: Landmark,
    description: "Batas 38 Provinsi Indonesia (2026)",
  },
  environment: {
    name: "Hutan, Mangrove, Gambut & Konsesi",
    icon: TreePine,
    description:
      "Habitat mangrove, lahan gambut, serat kayu HTI, tutupan pohon, dan sawit",
  },
  weather: {
    name: "Cuaca, Angin GFS & Kualitas Udara",
    icon: CloudRain,
    description:
      "Angin GFS, AQMS ISPU, Prakiraan BMKG, Nowcast, dan curah hujan GPM",
  },
  disaster: {
    name: "Gempa Bumi BMKG & Titik Panas",
    icon: Flame,
    description: "Gempa terkini BMKG/USGS dan hotspot VIIRS NASA FIRMS",
  },
  topography: {
    name: "Pertambangan & Energi",
    icon: Mountain,
    description: "Data tematik tambahan",
  },
};

export const SidebarLayers: React.FC<SidebarLayersProps> = ({
  isOpen,
  onClose,
  layers,
  onToggleLayer,
  onChangeOpacity,
  onResetPreset,
  onZoomToExtent,
  firmsSensorStatus = {},
  onRefreshFirms,
  quakesVisible = true,
  onToggleQuakes,
  quakesOpacity = 0.95,
  onChangeQuakesOpacity,
  quakesCount = null,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "active">("all");
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({
    administrative: true,
    environment: true,
    weather: true,
    disaster: true,
  });
  const [bmkgAccordionOpen, setBmkgAccordionOpen] = useState(false);
  const [selectedMetadata, setSelectedMetadata] = useState<{
    name: string;
    meta: LayerMetadata;
  } | null>(null);
  const [expandedLegends, setExpandedLegends] = useState<
    Record<string, boolean>
  >({});
  const [bmkgAdm4Code, setBmkgAdm4Code] = useState("");
  const [bmkgForecast, setBmkgForecast] = useState<any>(null);
  const [bmkgForecastLoading, setBmkgForecastLoading] = useState(false);
  const [bmkgForecastError, setBmkgForecastError] = useState("");

  const bmkgForecastRows = useMemo(() => {
    const groups = Array.isArray(bmkgForecast?.data) ? bmkgForecast.data : [];
    return groups.flatMap((group: any) =>
      Array.isArray(group?.cuaca) ? group.cuaca.flat() : [],
    );
  }, [bmkgForecast]);

  const firmsSensorForLayer: Record<string, FirmsSensorCode> = {
    "disaster-viirs-snpp": "VIIRS_SNPP_NRT",
    "disaster-viirs-noaa20": "VIIRS_NOAA20_NRT",
    "disaster-viirs-noaa21": "VIIRS_NOAA21_NRT",
  };

  const firmsStatusLabel = (layerId: string) => {
    const sensor = firmsSensorForLayer[layerId];
    const status = sensor ? firmsSensorStatus[sensor] : undefined;
    if (!status) return "Menunggu pemeriksaan";
    if (status.state === "loading") return "Memuat data…";
    if (status.state === "error")
      return `Gagal: ${status.message || "Periksa koneksi/MAP_KEY"}`;
    if (status.state === "empty") return "0 deteksi pada periode 1 hari";
    return `${status.count.toLocaleString("id-ID")} hotspot diterima`;
  };

  const fetchBmkgForecast = async (overrideCode?: string) => {
    const code = (overrideCode ?? bmkgAdm4Code).trim();
    if (!/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(code)) {
      setBmkgForecastError("Masukkan kode ADM4 dengan format 00.00.00.0000.");
      setBmkgForecast(null);
      return;
    }
    if (overrideCode) setBmkgAdm4Code(overrideCode);
    setBmkgForecastLoading(true);
    setBmkgForecastError("");
    setBmkgForecast(null);
    try {
      let data: any = null;
      try {
        const response = await fetch(
          `/api/weather/bmkg?adm4=${encodeURIComponent(code)}`,
        );
        if (
          response.ok &&
          (response.headers.get("content-type") || "").includes("json")
        ) {
          data = await response.json();
        }
      } catch {
        // Fallback to direct BMKG API
      }
      if (!data) {
        const directRes = await fetch(
          `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(code)}`,
        );
        if (!directRes.ok)
          throw new Error(`BMKG merespons ${directRes.status}`);
        data = await directRes.json();
      }
      setBmkgForecast(data);
      if (!Array.isArray(data?.data) || !data.data.length)
        setBmkgForecastError(
          "Data prakiraan belum tersedia untuk kode ADM4 tersebut.",
        );
    } catch (error) {
      setBmkgForecastError(
        (error as Error).message || "Tidak dapat mengambil prakiraan BMKG.",
      );
    } finally {
      setBmkgForecastLoading(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const toggleLegend = (layerId: string) => {
    setExpandedLegends((prev) => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  const totalCount = layers.length + 1;
  const activeTotalCount =
    layers.filter((l) => l.visible).length + (quakesVisible ? 1 : 0);

  const filteredLayers = layers.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterMode === "active") return l.visible;
    return true;
  });

  const categories: LayerCategory[] = [
    "administrative",
    "environment",
    "weather",
    "disaster",
  ];

  return (
    <>
      {/* Floating Glassmorphic Sidebar Drawer */}
      <aside
        className={`fixed top-16 left-3 bottom-3 z-30 w-84 md:w-96 rounded-2xl bg-[#114232]/95 backdrop-blur-xl border border-[#87A922]/70 flex flex-col text-[#F7F6BB] shadow-2xl overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen
            ? "translate-x-0 opacity-100"
            : "-translate-x-[110%] opacity-0 pointer-events-none"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#87A922]/50 bg-gradient-to-r from-[#87A922]/25 to-[#114232]">
          <div>
            <h2 className="text-sm font-bold text-[#F7F6BB] tracking-tight">
              Katalog Layer Peta
            </h2>
            <p className="text-[11px] text-[#F7F6BB]/75">
              Pilih layer aktif & sesuaikan transparansi
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onResetPreset}
              className="p-1.5 text-[#F7F6BB]/80 hover:text-white hover:bg-[#87A922]/35 rounded-lg transition-colors cursor-pointer"
              title="Reset ke Preset Bawaan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#F7F6BB]/80 hover:text-white hover:bg-[#87A922]/35 rounded-lg transition-colors cursor-pointer"
              title="Tutup Katalog Layer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Quick Filter Pills */}
        <div className="p-3 border-b border-[#87A922]/45 space-y-2.5 bg-[#114232]/85">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#FCDC2A]/80 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari layer peta..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-[#87A922]/15 border border-[#87A922]/60 rounded-lg text-[#F7F6BB] placeholder:text-[#F7F6BB]/50 focus:outline-none focus:border-[#FCDC2A]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-[#F7F6BB]/75 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`py-1.5 px-2.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                filterMode === "all"
                  ? "bg-[#FCDC2A] text-[#114232] shadow-sm"
                  : "bg-[#87A922]/15 text-[#F7F6BB]/85 hover:bg-[#87A922]/30 border border-[#87A922]/50"
              }`}
            >
              Semua Layer ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("active")}
              className={`py-1.5 px-2.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                filterMode === "active"
                  ? "bg-[#FCDC2A] text-[#114232] shadow-sm"
                  : "bg-[#87A922]/15 text-[#F7F6BB]/85 hover:bg-[#87A922]/30 border border-[#87A922]/50"
              }`}
            >
              Layer Aktif ({activeTotalCount})
            </button>
          </div>
        </div>

        {/* Scrollable Layer Groups */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {categories.map((category) => {
            const catConfig = CATEGORY_CONFIG[category];
            const catLayers = filteredLayers.filter(
              (l) => l.category === category,
            );
            const showQuakeItem =
              category === "disaster" &&
              (filterMode === "all" || quakesVisible) &&
              (!searchQuery ||
                "gempabumi terkini bmkg tews usgs shakemap".includes(
                  searchQuery.toLowerCase(),
                ));

            if (catLayers.length === 0 && !showQuakeItem) return null;

            const Icon = catConfig.icon;
            const isExpanded = expandedCategories[category];
            const allCatLayers = layers.filter((l) => l.category === category);
            const activeCount =
              allCatLayers.filter((l) => l.visible).length +
              (category === "disaster" && quakesVisible ? 1 : 0);

            return (
              <div
                key={category}
                className="bg-[#87A922]/10 rounded-xl border border-[#87A922]/50 overflow-hidden"
              >
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-[#87A922]/25 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="p-1.5 rounded-lg bg-[#87A922]/30 text-[#FCDC2A] shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#F7F6BB] truncate">
                        {catConfig.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {activeCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#FCDC2A]/20 text-[#FCDC2A] border border-[#FCDC2A]/60 rounded-full">
                        {activeCount} aktif
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[#F7F6BB]/75" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#F7F6BB]/75" />
                    )}
                  </div>
                </button>

                {/* Category Layer Items */}
                {isExpanded && (
                  <div className="p-2.5 space-y-2 border-t border-[#87A922]/40 bg-[#114232]/70">
                    {category === "disaster" && (
                      <div className="flex items-center justify-between gap-2 px-1 pb-1">
                        <span className="text-[10px] text-[#F7F6BB]/70">
                          Sensor NASA FIRMS VIIRS 24 jam
                        </span>
                        <button
                          type="button"
                          onClick={onRefreshFirms}
                          className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-[#FCDC2A]/60 bg-[#87A922]/25 px-2 py-1 text-[10px] font-medium text-[#FCDC2A] hover:bg-[#87A922]/45 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="h-3 w-3" /> Muat ulang VIIRS
                        </button>
                      </div>
                    )}

                    {showQuakeItem && (
                      <div
                        className={`rounded-xl p-2.5 border transition-all ${
                          quakesVisible
                            ? "bg-[#87A922]/25 border-[#FCDC2A]/70 shadow-sm"
                            : "bg-[#87A922]/10 border-[#87A922]/35 hover:bg-[#87A922]/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2.5 cursor-pointer flex-1 select-none">
                            <input
                              type="checkbox"
                              checked={quakesVisible}
                              onChange={() => onToggleQuakes?.()}
                              className="mt-0.5 rounded border-[#87A922] bg-[#114232] accent-[#FCDC2A] focus:ring-0 focus:ring-offset-0"
                            />
                            <div className="min-w-0">
                              <div
                                className={`text-xs font-semibold leading-snug ${quakesVisible ? "text-white" : "text-[#F7F6BB]/80"}`}
                              >
                                Gempabumi Terkini — BMKG TEWS & USGS
                              </div>
                              <div className="text-[11px] text-[#F7F6BB]/70 mt-0.5 line-clamp-1">
                                Episenter gempa M5+, dirasakan, & shakemap
                                real-time BMKG
                              </div>
                              <div className="mt-1 text-[10px] text-[#FCDC2A] font-mono">
                                {quakesCount !== null
                                  ? `${quakesCount} kejadian gempa termuat`
                                  : "Memuat feed BMKG…"}
                              </div>
                            </div>
                          </label>
                        </div>
                        {quakesVisible && onChangeQuakesOpacity && (
                          <div className="mt-2.5 pl-6 pr-1 flex items-center gap-3">
                            <span className="text-[10px] text-[#F7F6BB]/75 font-mono">
                              Opasitas
                            </span>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={quakesOpacity}
                              onChange={(e) =>
                                onChangeQuakesOpacity(
                                  parseFloat(e.target.value),
                                )
                              }
                              className="w-full h-1.5 bg-[#114232] rounded-lg appearance-none cursor-pointer accent-[#FCDC2A]"
                            />
                            <span className="text-[10px] text-[#FCDC2A] font-mono w-8 text-right tabular-nums">
                              {Math.round(quakesOpacity * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {catLayers.map((layer) => (
                      <div
                        key={layer.id}
                        className={`rounded-xl p-2.5 border transition-all ${
                          layer.visible
                            ? "bg-[#87A922]/25 border-[#FCDC2A]/70 shadow-sm"
                            : "bg-[#87A922]/10 border-[#87A922]/35 hover:bg-[#87A922]/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2.5 cursor-pointer flex-1 select-none min-w-0">
                            <input
                              type="checkbox"
                              checked={layer.visible}
                              onChange={() => onToggleLayer(layer.id)}
                              className="mt-0.5 rounded border-[#87A922] bg-[#114232] accent-[#FCDC2A] focus:ring-0 focus:ring-offset-0 shrink-0"
                            />
                            <div className="min-w-0">
                              <div
                                className={`text-xs font-semibold leading-snug ${
                                  layer.visible
                                    ? "text-white"
                                    : "text-[#F7F6BB]/80"
                                }`}
                              >
                                {layer.name}
                              </div>
                              <div className="text-[11px] text-[#F7F6BB]/70 mt-0.5 line-clamp-1">
                                {layer.description}
                              </div>
                              {firmsSensorForLayer[layer.id] && (
                                <div
                                  title={
                                    firmsSensorStatus[
                                      firmsSensorForLayer[layer.id]
                                    ]?.message || ""
                                  }
                                  className={`mt-1 text-[10px] leading-snug font-mono ${
                                    firmsSensorStatus[
                                      firmsSensorForLayer[layer.id]
                                    ]?.state === "error"
                                      ? "text-rose-300"
                                      : firmsSensorStatus[
                                            firmsSensorForLayer[layer.id]
                                          ]?.state === "ok"
                                        ? "text-[#FCDC2A]"
                                        : firmsSensorStatus[
                                              firmsSensorForLayer[layer.id]
                                            ]?.state === "loading"
                                          ? "text-[#F7F6BB]"
                                          : "text-amber-300"
                                  }`}
                                >
                                  {firmsStatusLabel(layer.id)}
                                </div>
                              )}
                            </div>
                          </label>

                          <div className="flex items-center gap-1 shrink-0">
                            {layer.legend && (
                              <button
                                onClick={() => toggleLegend(layer.id)}
                                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                  expandedLegends[layer.id]
                                    ? "bg-[#FCDC2A] text-[#114232]"
                                    : "text-[#F7F6BB]/75 hover:text-white hover:bg-[#87A922]/35"
                                }`}
                                title="Lihat Legenda Simbol"
                              >
                                <Sliders className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() =>
                                setSelectedMetadata({
                                  name: layer.name,
                                  meta: layer.metadata,
                                })
                              }
                              className="p-1 rounded-lg text-[#F7F6BB]/75 hover:text-white hover:bg-[#87A922]/35 transition-colors cursor-pointer"
                              title="Informasi Metadata & Sumber Data"
                            >
                              <Info className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Opacity Slider (visible when layer is checked) */}
                        {layer.visible && (
                          <div className="mt-2.5 pl-6 pr-1 flex items-center gap-3">
                            <span className="text-[10px] text-[#F7F6BB]/75 font-mono">
                              Opasitas
                            </span>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={layer.opacity}
                              onChange={(e) =>
                                onChangeOpacity(
                                  layer.id,
                                  parseFloat(e.target.value),
                                )
                              }
                              className="flex-1 h-1.5 bg-[#114232] rounded-lg appearance-none cursor-pointer accent-[#FCDC2A]"
                            />
                            <span className="text-[10px] text-[#FCDC2A] font-mono tabular-nums w-8 text-right">
                              {Math.round(layer.opacity * 100)}%
                            </span>
                          </div>
                        )}

                        {/* Inline Legend */}
                        {expandedLegends[layer.id] && layer.legend && (
                          <div className="mt-2 ml-6 mr-1 px-2.5 py-2 bg-[#114232]/90 rounded-lg border border-[#87A922]/55 text-[11px] space-y-1.5">
                            <div className="text-[10px] font-semibold text-[#FCDC2A] uppercase tracking-wider">
                              Legenda Simbol:
                            </div>
                            {layer.legend.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2"
                              >
                                <span
                                  className="w-3 h-3 rounded-xs shrink-0 border border-white/25"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="text-[#F7F6BB]">
                                  {item.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Collapsible BMKG Village-Level Forecast (ADM4) Accordion */}
          <div className="bg-[#87A922]/10 rounded-xl border border-[#87A922]/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setBmkgAccordionOpen((prev) => !prev)}
              className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-[#87A922]/25 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-[#87A922]/30 text-[#FCDC2A]">
                  <Compass className="w-3.5 h-3.5" />
                </span>
                <div>
                  <div className="text-xs font-semibold text-[#F7F6BB]">
                    Cek Cuaca BMKG per Kota/Desa
                  </div>
                  <div className="text-[10px] text-[#F7F6BB]/65">
                    Lookup kode wilayah ADM4 & 23 kota cepat
                  </div>
                </div>
              </div>
              {bmkgAccordionOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#F7F6BB]/75" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[#F7F6BB]/75" />
              )}
            </button>

            {bmkgAccordionOpen && (
              <div className="p-3 border-t border-[#87A922]/40 bg-[#114232]/75 space-y-2">
                <select
                  value={
                    BMKG_QUICK_CITIES.some((c) => c.adm4 === bmkgAdm4Code)
                      ? bmkgAdm4Code
                      : ""
                  }
                  onChange={(e) => {
                    const code = e.target.value;
                    if (code) void fetchBmkgForecast(code);
                  }}
                  className="w-full px-2.5 py-1.5 text-[11px] bg-[#114232] border border-[#87A922]/65 rounded-lg text-[#F7F6BB] focus:outline-none focus:border-[#FCDC2A]"
                  aria-label="Pilih cepat kota Indonesia"
                >
                  <option value="">
                    -- Pilih cepat 23 kota di Indonesia --
                  </option>
                  {BMKG_QUICK_CITIES.map((city) => (
                    <option key={city.adm4} value={city.adm4}>
                      {city.name} ({city.adm4})
                    </option>
                  ))}
                </select>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={bmkgAdm4Code}
                    onChange={(event) => setBmkgAdm4Code(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void fetchBmkgForecast();
                    }}
                    placeholder="Kode ADM4: 31.71.01.1001"
                    maxLength={13}
                    className="min-w-0 flex-1 px-2.5 py-1.5 text-[11px] bg-[#114232] border border-[#87A922]/65 rounded-lg text-[#F7F6BB] placeholder:text-[#F7F6BB]/50 focus:outline-none focus:border-[#FCDC2A]"
                    aria-label="Kode wilayah ADM4"
                  />
                  <button
                    type="button"
                    onClick={() => void fetchBmkgForecast()}
                    disabled={bmkgForecastLoading}
                    className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-[#FCDC2A] hover:bg-[#F7F6BB] disabled:opacity-50 text-[#114232] transition-colors cursor-pointer"
                  >
                    {bmkgForecastLoading ? "Memuat…" : "Cek"}
                  </button>
                </div>
                {bmkgForecastError && (
                  <p className="text-[10px] text-amber-300">
                    {bmkgForecastError}
                  </p>
                )}
                {bmkgForecast?.lokasi && (
                  <div className="mt-2 p-2.5 rounded-lg bg-[#87A922]/15 border border-[#87A922]/55 text-[10px] text-[#F7F6BB] space-y-1">
                    <div className="font-semibold text-[#FCDC2A]">
                      {bmkgForecast.lokasi.desa ||
                        bmkgForecast.lokasi.kecamatan}
                    </div>
                    <div className="text-[#F7F6BB]/75">
                      {[
                        bmkgForecast.lokasi.kecamatan,
                        bmkgForecast.lokasi.kotkab,
                        bmkgForecast.lokasi.provinsi,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                    <div className="pt-1 space-y-1">
                      {bmkgForecastRows
                        .slice(0, 5)
                        .map((row: any, index: number) => (
                          <div
                            key={`${row.datetime || row.local_datetime || "forecast"}-${index}`}
                            className="flex items-center justify-between gap-2 border-t border-[#87A922]/35 pt-1"
                          >
                            <span className="text-[#F7F6BB]/75 font-mono">
                              {row.local_datetime || row.datetime || "—"}
                            </span>
                            <span className="text-right text-[#F7F6BB]">
                              {row.weather_desc || "Cuaca"} · {row.t ?? "—"}°C ·{" "}
                              {row.hu ?? "—"}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="px-4 py-2.5 border-t border-[#87A922]/50 bg-[#114232]/90 flex items-center justify-between text-[11px] text-[#F7F6BB]/80">
          <button
            onClick={onZoomToExtent}
            className="text-[#FCDC2A] hover:underline font-medium flex items-center gap-1 cursor-pointer"
          >
            Pusatkan ke Indonesia
          </button>
          <span className="font-mono text-[10px]">WGS 84 · EPSG:4326</span>
        </div>
      </aside>

      {/* Layer Metadata Modal */}
      {selectedMetadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#114232]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#114232] border border-[#87A922]/75 rounded-2xl shadow-2xl p-5 text-[#F7F6BB]">
            <div className="flex items-center justify-between pb-3 border-b border-[#87A922]/50">
              <div>
                <h3 className="text-sm font-bold text-[#F7F6BB]">
                  {selectedMetadata.name}
                </h3>
                <p className="text-[11px] text-[#F7F6BB]/75">
                  Spesifikasi Metadata & Lisensi Data
                </p>
              </div>
              <button
                onClick={() => setSelectedMetadata(null)}
                className="text-[#F7F6BB]/75 hover:text-white p-1 rounded-lg hover:bg-[#87A922]/30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="text-[#F7F6BB]/90 leading-relaxed">
                {selectedMetadata.meta.description}
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-[#87A922]/15 p-2.5 rounded-lg border border-[#87A922]/55">
                  <div className="text-[10px] text-[#FCDC2A] font-semibold uppercase">
                    Penyedia / Sumber
                  </div>
                  <div className="font-medium text-[#F7F6BB] mt-0.5">
                    {selectedMetadata.meta.provider}
                  </div>
                </div>

                <div className="bg-[#87A922]/15 p-2.5 rounded-lg border border-[#87A922]/55">
                  <div className="text-[10px] text-[#FCDC2A] font-semibold uppercase">
                    Interval Pembaruan
                  </div>
                  <div className="font-medium text-[#F7F6BB] mt-0.5">
                    {selectedMetadata.meta.updateCadence}
                  </div>
                </div>
                {selectedMetadata.meta.attribution && (
                  <div className="col-span-2 bg-[#87A922]/20 p-2.5 rounded-lg border border-[#FCDC2A]/60">
                    <div className="text-[10px] text-[#FCDC2A] font-semibold uppercase">
                      Atribusi / Kredit Sumber
                    </div>
                    <div className="font-medium text-[#F7F6BB] mt-0.5 leading-relaxed">
                      {selectedMetadata.meta.attribution}
                    </div>
                  </div>
                )}

                <div className="bg-[#87A922]/15 p-2.5 rounded-lg border border-[#87A922]/55">
                  <div className="text-[10px] text-[#FCDC2A] font-semibold uppercase">
                    Resolusi Spasial
                  </div>
                  <div className="font-medium text-[#F7F6BB] mt-0.5">
                    {selectedMetadata.meta.spatialResolution}
                  </div>
                </div>

                <div className="bg-[#87A922]/15 p-2.5 rounded-lg border border-[#87A922]/55">
                  <div className="text-[10px] text-[#FCDC2A] font-semibold uppercase">
                    Lisensi Penggunaan
                  </div>
                  <div className="font-medium text-[#F7F6BB] mt-0.5">
                    {selectedMetadata.meta.license}
                  </div>
                </div>
              </div>

              {selectedMetadata.meta.sourceUrl && (
                <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <a
                    href={selectedMetadata.meta.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#FCDC2A] hover:underline"
                  >
                    <span>Kunjungi Portal Sumber</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-[#87A922]/50 flex justify-end">
              <button
                onClick={() => setSelectedMetadata(null)}
                className="px-4 py-1.5 text-xs font-bold bg-[#FCDC2A] hover:bg-[#F7F6BB] rounded-lg text-[#114232] transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
