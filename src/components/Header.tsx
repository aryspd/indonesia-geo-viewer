import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Search,
  Crosshair,
  Ruler,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  Activity,
  Compass,
  Check,
  X,
  ChevronDown,
  FileUp,
  PanelRight,
} from 'lucide-react';
import { BasemapId, MeasureMode } from '../types/gis';
import { BASEMAPS } from '../data/layersCatalog';
import { INDONESIA_LOCATIONS, LocationSearchResult } from '../data/indonesiaLocations';

interface HeaderProps {
  currentBasemap: BasemapId;
  onSelectBasemap: (id: BasemapId) => void;
  onFlyTo: (lng: number, lat: number, zoom?: number) => void;
  measureMode: MeasureMode;
  onSetMeasureMode: (mode: MeasureMode) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenSidebar: () => void;
  sidebarOpen: boolean;
  infoPanelOpen: boolean;
  onToggleInfoPanel: () => void;
  activeLayersCount: number;
  onOpenVectorData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentBasemap,
  onSelectBasemap,
  onFlyTo,
  measureMode,
  onSetMeasureMode,
  isDark,
  onToggleTheme,
  onOpenSettings,
  onOpenSidebar,
  sidebarOpen,
  infoPanelOpen,
  onToggleInfoPanel,
  activeLayersCount,
  onOpenVectorData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [coordInput, setCoordInput] = useState('');
  const [showCoordModal, setShowCoordModal] = useState(false);
  const [coordError, setCoordError] = useState('');
  const [basemapDropdownOpen, setBasemapDropdownOpen] = useState(false);
  const [measureDropdownOpen, setMeasureDropdownOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const basemapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // Filter locations on search query change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase().trim();
    const matches = INDONESIA_LOCATIONS.filter(
      (loc) => loc.name.toLowerCase().includes(q) || loc.detail.toLowerCase().includes(q)
    ).slice(0, 7);
    setSearchResults(matches);
  }, [searchQuery]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (basemapRef.current && !basemapRef.current.contains(e.target as Node)) {
        setBasemapDropdownOpen(false);
      }
      if (measureRef.current && !measureRef.current.contains(e.target as Node)) {
        setMeasureDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLocation = (loc: LocationSearchResult) => {
    onFlyTo(loc.lng, loc.lat, loc.zoom);
    setSearchQuery(loc.name);
    setIsSearchOpen(false);
  };

  const handleCoordinateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCoordError('');
    const parts = coordInput.split(/[\s,]+/).map((p) => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      let lat = parts[0];
      let lng = parts[1];

      // Handle common user mixup if longitude (>50) is passed first
      if (lat > 60 && Math.abs(lng) <= 90) {
        const temp = lat;
        lat = lng;
        lng = temp;
      }

      if (lat >= -15 && lat <= 10 && lng >= 90 && lng <= 145) {
        onFlyTo(lng, lat, 10);
        setShowCoordModal(false);
        setCoordInput('');
      } else {
        setCoordError('Koordinat di luar wilayah Indonesia (Lat: -11 s/d 6, Lng: 95 s/d 141)');
      }
    } else {
      setCoordError('Format tidak valid. Contoh: -6.2088, 106.8456');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const selectedBasemap = BASEMAPS.find((b) => b.id === currentBasemap) || BASEMAPS[0];

  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between gap-3 px-4 py-2 bg-gradient-to-r from-[#114232]/95 via-[#114232] to-[#114232]/95 backdrop-blur-xl border-b border-[#87A922]/60 text-[#F7F6BB] shadow-lg">
      {/* Zone 1: Brand Wordmark & Drawer Toggle */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenSidebar}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
            sidebarOpen
              ? 'bg-[#FCDC2A] border-[#FCDC2A] text-[#114232] shadow-md shadow-[#114232]/50'
              : 'bg-[#87A922]/20 hover:bg-[#87A922]/35 border-[#87A922]/60 text-[#F7F6BB]'
          }`}
          title="Buka / Tutup Katalog Layer"
        >
          <Layers className={`w-4 h-4 ${sidebarOpen ? 'text-[#114232]' : 'text-[#FCDC2A]'}`} />
          <span className="hidden sm:inline">Katalog Layer</span>
          <span
            className={`px-1.5 py-0.2 text-[10px] rounded-md font-mono font-bold ${
              sidebarOpen
                ? 'bg-[#114232] text-[#FCDC2A]'
                : 'bg-[#114232]/85 border border-[#87A922]/60 text-[#FCDC2A]'
            }`}
          >
            {activeLayersCount}
          </span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FCDC2A] ring-4 ring-[#FCDC2A]/25 hidden sm:block" />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight text-[#F7F6BB] whitespace-nowrap">
              INDONESIA GEO VIEWER
            </span>
            <span className="hidden lg:inline text-[10px] text-[#F7F6BB]/70 font-mono mt-0.5">
              Geospasial · Cuaca · Ekosistem & Kebencanaan
            </span>
          </div>
        </div>
      </div>

      {/* Zone 2: Search, Coordinate Jump, and Basemap Selection */}
      <div className="flex items-center gap-2 flex-1 max-w-2xl justify-center">
        {/* Search Autocomplete */}
        <div ref={searchRef} className="relative flex-1 max-w-xs md:max-w-sm">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-[#FCDC2A]/80 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Cari kota, pulau, gunung..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-[#87A922]/15 hover:bg-[#87A922]/25 focus:bg-[#114232] border border-[#87A922]/60 focus:border-[#FCDC2A] rounded-lg text-[#F7F6BB] placeholder:text-[#F7F6BB]/55 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="absolute right-2 text-[#F7F6BB]/75 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#114232]/95 backdrop-blur-xl border border-[#87A922]/75 rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-[#87A922]/35">
              {searchResults.map((loc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectLocation(loc)}
                  className="w-full px-3 py-2 text-left hover:bg-[#87A922]/25 flex items-center justify-between transition-colors text-xs"
                >
                  <div>
                    <div className="font-medium text-[#F7F6BB]">{loc.name}</div>
                    <div className="text-[11px] text-[#F7F6BB]/70">{loc.detail}</div>
                  </div>
                  <span className="text-[10px] text-[#FCDC2A] font-mono border border-[#FCDC2A]/50 bg-[#114232] px-1.5 py-0.5 rounded">
                    {loc.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Coordinate Jump Button */}
        <button
          onClick={() => setShowCoordModal(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-[#87A922]/20 hover:bg-[#87A922]/35 border border-[#87A922]/60 rounded-lg text-[#F7F6BB] transition-colors shrink-0 cursor-pointer"
          title="Buka Navigasi Koordinat"
        >
          <Crosshair className="w-3.5 h-3.5 text-[#FCDC2A]" />
          <span className="hidden md:inline">Koordinat</span>
        </button>

        {/* Basemap Switcher Dropdown */}
        <div ref={basemapRef} className="relative shrink-0">
          <button
            onClick={() => setBasemapDropdownOpen(!basemapDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-[#87A922]/20 hover:bg-[#87A922]/35 border border-[#87A922]/60 rounded-lg text-[#F7F6BB] transition-colors cursor-pointer"
          >
            <span>{selectedBasemap.thumbnail}</span>
            <span className="hidden lg:inline whitespace-nowrap">{selectedBasemap.name}</span>
            <ChevronDown className="w-3 h-3 text-[#FCDC2A]/80" />
          </button>

          {basemapDropdownOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-64 bg-[#114232]/95 backdrop-blur-xl border border-[#87A922]/75 rounded-xl shadow-2xl p-1.5 z-50 divide-y divide-[#87A922]/35">
              <div className="px-2 py-1 text-[10px] font-semibold text-[#FCDC2A] uppercase tracking-wider">
                Pilih Peta Dasar (Basemap)
              </div>
              <div className="pt-1 space-y-1">
                {BASEMAPS.map((base) => (
                  <button
                    key={base.id}
                    onClick={() => {
                      onSelectBasemap(base.id);
                      setBasemapDropdownOpen(false);
                    }}
                    className={`w-full px-2.5 py-2 text-left rounded-lg flex items-center justify-between text-xs transition-colors ${
                      currentBasemap === base.id
                        ? 'bg-[#87A922]/30 text-[#FCDC2A] border border-[#FCDC2A]/70'
                        : 'hover:bg-[#87A922]/20 text-[#F7F6BB]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{base.thumbnail}</span>
                      <div>
                        <div className="font-medium">{base.name}</div>
                        <div className="text-[10px] text-[#F7F6BB]/70 line-clamp-1">{base.description}</div>
                      </div>
                    </div>
                    {currentBasemap === base.id && <Check className="w-3.5 h-3.5 text-[#FCDC2A] shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Measurement Tool Dropdown */}
        <div ref={measureRef} className="relative shrink-0">
          <button
            onClick={() => setMeasureDropdownOpen(!measureDropdownOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors cursor-pointer ${
              measureMode !== 'none'
                ? 'bg-[#FCDC2A] border-[#FCDC2A] text-[#114232]'
                : 'bg-[#87A922]/20 hover:bg-[#87A922]/35 border-[#87A922]/60 text-[#F7F6BB]'
            }`}
            title="Alat Pengukuran Geodesik"
          >
            <Ruler className={`w-3.5 h-3.5 ${measureMode !== 'none' ? 'text-[#114232]' : 'text-[#FCDC2A]'}`} />
            <span className="hidden md:inline">
              {measureMode === 'distance' ? 'Ukur Jarak' : measureMode === 'area' ? 'Ukur Luas' : 'Pengukuran'}
            </span>
            <ChevronDown className="w-3 h-3 opacity-80" />
          </button>

          {measureDropdownOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-48 bg-[#114232]/95 backdrop-blur-xl border border-[#87A922]/75 rounded-xl shadow-2xl p-1 z-50">
              <button
                onClick={() => {
                  onSetMeasureMode('none');
                  setMeasureDropdownOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 text-left text-xs rounded-lg transition-colors flex items-center justify-between ${
                  measureMode === 'none' ? 'bg-[#87A922]/30 text-[#FCDC2A]' : 'text-[#F7F6BB] hover:bg-[#87A922]/20'
                }`}
              >
                <span>Nonaktifkan Pengukuran</span>
                {measureMode === 'none' && <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => {
                  onSetMeasureMode('distance');
                  setMeasureDropdownOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 text-left text-xs rounded-lg transition-colors flex items-center justify-between ${
                  measureMode === 'distance' ? 'bg-[#FCDC2A]/20 text-[#FCDC2A]' : 'text-[#F7F6BB] hover:bg-[#87A922]/20'
                }`}
              >
                <span>Ukur Jarak (Garis)</span>
                {measureMode === 'distance' && <Check className="w-3.5 h-3.5 text-[#FCDC2A]" />}
              </button>
              <button
                onClick={() => {
                  onSetMeasureMode('area');
                  setMeasureDropdownOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 text-left text-xs rounded-lg transition-colors flex items-center justify-between ${
                  measureMode === 'area' ? 'bg-[#FCDC2A]/20 text-[#FCDC2A]' : 'text-[#F7F6BB] hover:bg-[#87A922]/20'
                }`}
              >
                <span>Ukur Luas (Poligon)</span>
                {measureMode === 'area' && <Check className="w-3.5 h-3.5 text-[#FCDC2A]" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Zone 3: Actions (Import, Info Panel Toggle, Status, Theme, Fullscreen) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Import GeoJSON / Shapefile */}
        <button
          onClick={onOpenVectorData}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-[#FCDC2A] hover:bg-[#F7F6BB] border border-[#FCDC2A] text-[#114232] rounded-lg transition-colors cursor-pointer"
          title="Impor GeoJSON atau Shapefile ZIP"
        >
          <FileUp className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Data Vektor</span>
        </button>

        {/* Info Panel Toggle */}
        <button
          onClick={onToggleInfoPanel}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors cursor-pointer ${
            infoPanelOpen
              ? 'bg-[#87A922] border-[#87A922] text-[#114232] font-semibold'
              : 'bg-[#87A922]/20 hover:bg-[#87A922]/35 border-[#87A922]/60 text-[#F7F6BB]'
          }`}
          title={infoPanelOpen ? 'Sembunyikan Panel Informasi' : 'Tampilkan Panel Informasi'}
        >
          <PanelRight className={`w-3.5 h-3.5 ${infoPanelOpen ? 'text-[#114232]' : 'text-[#FCDC2A]'}`} />
          <span className="hidden xl:inline">Panel Info</span>
        </button>

        {/* System Diagnostics / Provider Health */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-[#87A922]/20 hover:bg-[#87A922]/35 border border-[#87A922]/60 text-[#F7F6BB] rounded-lg transition-colors cursor-pointer"
          title="Status Sistem & Pengaturan API"
        >
          <Activity className="w-3.5 h-3.5 text-[#FCDC2A]" />
          <span className="hidden xl:inline">Status API</span>
        </button>

        {/* Dark / Light Mode Switch */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 text-[#F7F6BB] hover:text-white bg-[#87A922]/20 hover:bg-[#87A922]/35 border border-[#87A922]/60 rounded-lg transition-colors cursor-pointer"
          title={isDark ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Dark GIS)'}
        >
          {isDark ? <Sun className="w-4 h-4 text-[#FCDC2A]" /> : <Moon className="w-4 h-4 text-[#F7F6BB]" />}
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 text-[#F7F6BB] hover:text-white bg-[#87A922]/20 hover:bg-[#87A922]/35 border border-[#87A922]/60 rounded-lg transition-colors hidden sm:flex cursor-pointer"
          title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh (Fullscreen)'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Coordinate Input Modal */}
      {showCoordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#114232]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#114232] border border-[#87A922]/75 rounded-2xl shadow-2xl p-5 text-[#F7F6BB]">
            <div className="flex items-center justify-between pb-3 border-b border-[#87A922]/50">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#FCDC2A]" />
                <h3 className="text-sm font-semibold text-[#F7F6BB]">Navigasi Koordinat Presisi</h3>
              </div>
              <button
                onClick={() => setShowCoordModal(false)}
                className="text-[#F7F6BB]/75 hover:text-white p-1 rounded-lg hover:bg-[#87A922]/30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCoordinateSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#F7F6BB] mb-1">
                  Masukkan Latitude, Longitude (Decimal Degrees):
                </label>
                <input
                  type="text"
                  value={coordInput}
                  onChange={(e) => setCoordInput(e.target.value)}
                  placeholder="Contoh: -6.2088, 106.8456 (Jakarta)"
                  className="w-full px-3 py-2 text-xs bg-[#87A922]/15 border border-[#87A922]/70 rounded-lg text-[#F7F6BB] font-mono placeholder:text-[#F7F6BB]/50 focus:outline-none focus:border-[#FCDC2A]"
                  autoFocus
                />
              </div>

              {coordError && (
                <div className="text-[11px] text-rose-300 font-medium">
                  {coordError}
                </div>
              )}

              <div className="text-[11px] text-[#F7F6BB]/80 bg-[#87A922]/15 p-3 rounded-lg border border-[#87A922]/55">
                <div className="font-semibold text-[#FCDC2A] mb-1">Batas Wilayah Nusantara:</div>
                <div className="font-mono">Lat: -11.0° s/d +6.0° (Lintang Selatan - Utara)</div>
                <div className="font-mono">Lng: 95.0° s/d 141.0° (Bujur Timur)</div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCoordModal(false)}
                  className="px-3 py-1.5 text-xs text-[#F7F6BB] hover:bg-[#87A922]/30 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-[#FCDC2A] hover:bg-[#F7F6BB] text-[#114232] rounded-lg transition-colors"
                >
                  Terbang ke Lokasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
