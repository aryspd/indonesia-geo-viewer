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
  SlidersHorizontal,
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [coordInput, setCoordInput] = useState('');
  const [showCoordModal, setShowCoordModal] = useState(false);
  const [coordError, setCoordError] = useState('');
  const [basemapDropdownOpen, setBasemapDropdownOpen] = useState(false);
  const [measureDropdownOpen, setMeasureDropdownOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const basemapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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
      const target = e.target as Node;
      if (
        searchRef.current &&
        !searchRef.current.contains(target) &&
        (!mobileSearchRef.current || !mobileSearchRef.current.contains(target))
      ) {
        setIsSearchOpen(false);
      }
      if (basemapRef.current && !basemapRef.current.contains(target)) {
        setBasemapDropdownOpen(false);
      }
      if (measureRef.current && !measureRef.current.contains(target)) {
        setMeasureDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLocation = (loc: LocationSearchResult) => {
    onFlyTo(loc.lng, loc.lat, loc.zoom);
    setSearchQuery(loc.name);
    setIsSearchOpen(false);
    setMobileSearchOpen(false);
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
    <header className="absolute top-0 left-0 right-0 z-40 h-14 flex items-center justify-between gap-2 sm:gap-3 px-2.5 sm:px-4 bg-[var(--glass-bg)] backdrop-blur-xl border-b border-[var(--accent-aqua-border)] text-[var(--text-primary)] shadow-lg shadow-black/25">
      {/* Zone 1: Brand Wordmark & Drawer Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
        <button
          onClick={onOpenSidebar}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
            sidebarOpen
              ? 'bg-[var(--accent-aqua)] border-[var(--accent-aqua)] text-[#050d0f] shadow-md shadow-[#7de3e0]/20'
              : 'bg-[var(--accent-aqua-soft)] hover:bg-[var(--bg-surface-hover)] border-[var(--accent-aqua-border)] text-[var(--text-primary)]'
          }`}
          title="Buka / Tutup Katalog Layer"
        >
          <Layers className={`w-4 h-4 ${sidebarOpen ? 'text-[#050d0f]' : 'text-[var(--accent-aqua)]'}`} />
          <span className="hidden md:inline">Katalog Layer</span>
          <span
            className={`px-1.5 py-0.2 text-[10px] rounded-md font-mono font-bold ${
              sidebarOpen
                ? 'bg-[#050d0f] text-[#7de3e0]'
                : 'bg-[var(--bg-obsidian)] border border-[var(--accent-emerald-border)] text-[var(--accent-emerald-bright)]'
            }`}
          >
            {activeLayersCount}
          </span>
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10b981] ring-2 ring-[#7de3e0]/30" />
          </span>
          <div className="flex flex-col leading-none min-w-0">
            <span className="text-xs sm:text-sm font-bold tracking-tight text-[var(--text-primary)] truncate">
              <span className="sm:hidden">GEO VIEWER ID</span>
              <span className="hidden sm:inline">INDONESIA GEO VIEWER</span>
            </span>
            <span className="hidden xl:inline text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">
              Geospasial · Cuaca · Ekosistem & Kebencanaan
            </span>
          </div>
        </div>
      </div>

      {/* Zone 2: Search, Coordinate Jump, and Basemap Selection (Tablet/iPad/Desktop) */}
      <div className="hidden sm:flex items-center gap-1.5 md:gap-2 flex-1 max-w-2xl justify-center">
        {/* Search Autocomplete */}
        <div ref={searchRef} className="relative flex-1 max-w-xs md:max-w-sm">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-[var(--accent-aqua)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Cari kota, pulau, gunung..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] focus:bg-[var(--bg-surface)] border border-[var(--accent-aqua-border)] focus:border-[var(--accent-aqua)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="absolute right-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-[var(--bg-surface)]/95 backdrop-blur-xl border border-[var(--accent-aqua-border)] rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-[var(--accent-aqua-border)]">
              {searchResults.map((loc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectLocation(loc)}
                  className="w-full px-3 py-2 text-left hover:bg-[var(--accent-aqua-soft)] flex items-center justify-between transition-colors text-xs cursor-pointer"
                >
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">{loc.name}</div>
                    <div className="text-[11px] text-[var(--text-secondary)]">{loc.detail}</div>
                  </div>
                  <span className="text-[10px] text-[var(--accent-aqua)] font-mono border border-[var(--accent-aqua-border)] bg-[var(--bg-obsidian)] px-1.5 py-0.5 rounded-md">
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
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-[var(--accent-aqua-soft)] hover:bg-[var(--bg-surface-hover)] border border-[var(--accent-aqua-border)] rounded-xl text-[var(--text-primary)] transition-colors shrink-0 cursor-pointer"
          title="Buka Navigasi Koordinat"
        >
          <Crosshair className="w-3.5 h-3.5 text-[var(--accent-aqua)]" />
          <span className="hidden lg:inline">Koordinat</span>
        </button>

        {/* Basemap Switcher Dropdown */}
        <div ref={basemapRef} className="relative shrink-0">
          <button
            onClick={() => setBasemapDropdownOpen(!basemapDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-[var(--accent-aqua-soft)] hover:bg-[var(--bg-surface-hover)] border border-[var(--accent-aqua-border)] rounded-xl text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Pilih Peta Dasar (Basemap)"
          >
            <span>{selectedBasemap.thumbnail}</span>
            <span className="hidden xl:inline whitespace-nowrap">{selectedBasemap.name}</span>
            <ChevronDown className="w-3 h-3 text-[var(--accent-aqua)]" />
          </button>

          {basemapDropdownOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-64 bg-[var(--bg-surface)]/95 backdrop-blur-xl border border-[var(--accent-aqua-border)] rounded-xl shadow-2xl p-1.5 z-50 divide-y divide-[var(--accent-aqua-border)]">
              <div className="px-2 py-1 text-[10px] font-semibold text-[var(--accent-aqua)] uppercase tracking-wider">
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
                    className={`w-full px-2.5 py-2 text-left rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      currentBasemap === base.id
                        ? 'bg-[var(--accent-emerald-soft)] text-[var(--accent-aqua)] border border-[var(--accent-emerald-border)]'
                        : 'hover:bg-[var(--accent-aqua-soft)] text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{base.thumbnail}</span>
                      <div>
                        <div className="font-medium">{base.name}</div>
                        <div className="text-[10px] text-[var(--text-secondary)] line-clamp-1">{base.description}</div>
                      </div>
                    </div>
                    {currentBasemap === base.id && <Check className="w-3.5 h-3.5 text-[var(--accent-emerald-bright)] shrink-0" />}
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
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-xl transition-colors cursor-pointer ${
              measureMode !== 'none'
                ? 'bg-[var(--accent-emerald)] border-[var(--accent-emerald)] text-[#050d0f] font-semibold'
                : 'bg-[var(--accent-aqua-soft)] hover:bg-[var(--bg-surface-hover)] border-[var(--accent-aqua-border)] text-[var(--text-primary)]'
            }`}
            title="Alat Pengukuran Geodesik"
          >
            <Ruler className={`w-3.5 h-3.5 ${measureMode !== 'none' ? 'text-[#050d0f]' : 'text-[var(--accent-aqua)]'}`} />
            <span className="hidden lg:inline">
              {measureMode === 'distance' ? 'Ukur Jarak' : measureMode === 'area' ? 'Ukur Luas' : 'Pengukuran'}
            </span>
            <ChevronDown className="w-3 h-3 opacity-80" />
          </button>

          {measureDropdownOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-48 bg-[var(--bg-surface)]/95 backdrop-blur-xl border border-[var(--accent-aqua-border)] rounded-xl shadow-2xl p-1 z-50">
              <button
                onClick={() => {
                  onSetMeasureMode('none');
                  setMeasureDropdownOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 text-left text-xs rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                  measureMode === 'none' ? 'bg-[var(--accent-aqua-soft)] text-[var(--accent-aqua)]' : 'text-[var(--text-primary)] hover:bg-[var(--accent-aqua-soft)]'
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
                className={`w-full px-2.5 py-1.5 text-left text-xs rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                  measureMode === 'distance' ? 'bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald-bright)]' : 'text-[var(--text-primary)] hover:bg-[var(--accent-aqua-soft)]'
                }`}
              >
                <span>Ukur Jarak (Garis)</span>
                {measureMode === 'distance' && <Check className="w-3.5 h-3.5 text-[var(--accent-emerald-bright)]" />}
              </button>
              <button
                onClick={() => {
                  onSetMeasureMode('area');
                  setMeasureDropdownOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 text-left text-xs rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                  measureMode === 'area' ? 'bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald-bright)]' : 'text-[var(--text-primary)] hover:bg-[var(--accent-aqua-soft)]'
                }`}
              >
                <span>Ukur Luas (Poligon)</span>
                {measureMode === 'area' && <Check className="w-3.5 h-3.5 text-[var(--accent-emerald-bright)]" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Zone 3: Actions (Mobile Quick Controls + Desktop Actions) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Mobile Search Toggle (< 640px) */}
        <button
          onClick={() => {
            setMobileSearchOpen((prev) => !prev);
            setMobileMenuOpen(false);
          }}
          className={`sm:hidden p-2 rounded-xl border transition-colors cursor-pointer ${
            mobileSearchOpen
              ? 'bg-[var(--accent-aqua)] border-[var(--accent-aqua)] text-[#050d0f]'
              : 'bg-[var(--accent-aqua-soft)] border-[var(--accent-aqua-border)] text-[var(--accent-aqua)]'
          }`}
          title="Cari Lokasi"
          aria-label="Cari Lokasi"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Import GeoJSON / Shapefile (Tablet & Desktop) */}
        <button
          onClick={onOpenVectorData}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-[var(--accent-emerald)] hover:bg-[var(--accent-emerald-bright)] border border-[var(--accent-emerald)] text-[#050d0f] rounded-xl transition-colors cursor-pointer shadow-sm shadow-[#10b981]/25"
          title="Impor GeoJSON atau Shapefile ZIP"
        >
          <FileUp className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Data Vektor</span>
        </button>

        {/* Info Panel Toggle */}
        <button
          onClick={onToggleInfoPanel}
          className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-medium border rounded-xl transition-colors cursor-pointer ${
            infoPanelOpen
              ? 'bg-[var(--accent-aqua)] border-[var(--accent-aqua)] text-[#050d0f] font-semibold'
              : 'bg-[var(--accent-aqua-soft)] hover:bg-[var(--bg-surface-hover)] border-[var(--accent-aqua-border)] text-[var(--text-primary)]'
          }`}
          title={infoPanelOpen ? 'Sembunyikan Panel Informasi' : 'Tampilkan Panel Informasi'}
        >
          <PanelRight className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${infoPanelOpen ? 'text-[#050d0f]' : 'text-[var(--accent-aqua)]'}`} />
          <span className="hidden xl:inline">Panel Info</span>
        </button>

        {/* System Diagnostics / Provider Health (Tablet & Desktop) */}
        <button
          onClick={onOpenSettings}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-[var(--accent-aqua-soft)] hover:bg-[var(--bg-surface-hover)] border border-[var(--accent-aqua-border)] text-[var(--text-primary)] rounded-xl transition-colors cursor-pointer"
          title="Status Sistem & Pengaturan API"
        >
          <Activity className="w-3.5 h-3.5 text-[var(--accent-emerald-bright)]" />
          <span className="hidden xl:inline">Status API</span>
        </button>

        {/* Dark / Light Mode Switch (Tablet & Desktop) */}
        <button
          onClick={onToggleTheme}
          className="hidden sm:flex p-1.5 text-[var(--text-primary)] bg-[var(--accent-aqua-soft)] hover:bg-[var(--bg-surface-hover)] border border-[var(--accent-aqua-border)] rounded-xl transition-colors cursor-pointer"
          title={isDark ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Obsidian Teal)'}
        >
          {isDark ? <Sun className="w-4 h-4 text-[var(--accent-aqua)]" /> : <Moon className="w-4 h-4 text-[var(--accent-aqua)]" />}
        </button>

        {/* Fullscreen Button (Tablet & Desktop) */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 text-[var(--text-primary)] bg-[var(--accent-aqua-soft)] hover:bg-[var(--bg-surface-hover)] border border-[var(--accent-aqua-border)] rounded-xl transition-colors hidden md:flex cursor-pointer"
          title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh (Fullscreen)'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Mobile Tools Menu (< 640px) */}
        <div ref={mobileMenuRef} className="relative sm:hidden">
          <button
            onClick={() => {
              setMobileMenuOpen((prev) => !prev);
              setMobileSearchOpen(false);
            }}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              mobileMenuOpen
                ? 'bg-[var(--accent-aqua)] border-[var(--accent-aqua)] text-[#050d0f]'
                : 'bg-[var(--accent-aqua-soft)] border-[var(--accent-aqua-border)] text-[var(--text-primary)]'
            }`}
            title="Alat & Pengaturan"
            aria-label="Alat & Pengaturan"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {mobileMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-[var(--bg-surface)]/95 backdrop-blur-xl border border-[var(--accent-aqua-border)] rounded-2xl shadow-2xl p-2 z-50 space-y-1.5 text-xs">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-aqua)]">
                Alat Peta & Navigasi
              </div>

              <button
                onClick={() => {
                  setShowCoordModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 hover:bg-[var(--accent-aqua-soft)] text-[var(--text-primary)] text-left"
              >
                <Crosshair className="w-4 h-4 text-[var(--accent-aqua)]" />
                <span>Navigasi Koordinat</span>
              </button>

              <button
                onClick={() => {
                  onOpenVectorData();
                  setMobileMenuOpen(false);
                }}
                className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 bg-[var(--accent-emerald-soft)] border border-[var(--accent-emerald-border)] text-[var(--accent-emerald-bright)] font-semibold text-left"
              >
                <FileUp className="w-4 h-4" />
                <span>Impor Data Vektor</span>
              </button>

              <div className="pt-1 border-t border-[var(--accent-aqua-border)]">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Pengukuran Geodesik
                </div>
                <div className="grid grid-cols-3 gap-1 px-1">
                  {(['none', 'distance', 'area'] as MeasureMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        onSetMeasureMode(mode);
                        setMobileMenuOpen(false);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-colors ${
                        measureMode === mode
                          ? 'bg-[var(--accent-emerald)] border-[var(--accent-emerald)] text-[#050d0f] font-bold'
                          : 'bg-[var(--bg-surface-elevated)] border-[var(--accent-aqua-border)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {mode === 'none' ? 'Off' : mode === 'distance' ? 'Jarak' : 'Luas'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-1 border-t border-[var(--accent-aqua-border)]">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Basemap
                </div>
                <div className="space-y-1">
                  {BASEMAPS.map((base) => (
                    <button
                      key={base.id}
                      onClick={() => {
                        onSelectBasemap(base.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-left ${
                        currentBasemap === base.id
                          ? 'bg-[var(--accent-emerald-soft)] text-[var(--accent-aqua)] border border-[var(--accent-emerald-border)]'
                          : 'hover:bg-[var(--accent-aqua-soft)] text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span>{base.thumbnail}</span>
                        <span className="truncate">{base.name}</span>
                      </span>
                      {currentBasemap === base.id && <Check className="w-3.5 h-3.5 text-[var(--accent-emerald-bright)] shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-1 border-t border-[var(--accent-aqua-border)] flex items-center gap-1.5">
                <button
                  onClick={() => {
                    onOpenSettings();
                    setMobileMenuOpen(false);
                  }}
                  className="flex-1 px-2.5 py-2 rounded-xl flex items-center justify-center gap-1.5 bg-[var(--bg-surface-elevated)] border border-[var(--accent-aqua-border)] text-[var(--text-primary)]"
                >
                  <Activity className="w-3.5 h-3.5 text-[var(--accent-emerald-bright)]" />
                  <span>Status API</span>
                </button>
                <button
                  onClick={() => {
                    onToggleTheme();
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-2 rounded-xl flex items-center justify-center bg-[var(--bg-surface-elevated)] border border-[var(--accent-aqua-border)] text-[var(--accent-aqua)]"
                  title="Ganti Tema"
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Slide-Down Search Bar (< 640px) */}
      {mobileSearchOpen && (
        <div
          ref={mobileSearchRef}
          className="sm:hidden absolute top-14 left-0 right-0 z-40 bg-[var(--bg-surface)]/95 backdrop-blur-xl border-b border-[var(--accent-aqua-border)] p-2.5 shadow-xl"
        >
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-[var(--accent-aqua)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Cari kota, pulau, gunung..."
              autoFocus
              className="w-full pl-9 pr-8 py-2 text-sm bg-[var(--bg-surface-elevated)] border border-[var(--accent-aqua-border)] focus:border-[var(--accent-aqua)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
            <button
              onClick={() => {
                if (searchQuery) {
                  setSearchQuery('');
                  setSearchResults([]);
                } else {
                  setMobileSearchOpen(false);
                }
              }}
              className="absolute right-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isSearchOpen && searchResults.length > 0 && (
            <div className="mt-2 max-h-60 overflow-y-auto bg-[var(--bg-surface-elevated)] border border-[var(--accent-aqua-border)] rounded-xl divide-y divide-[var(--accent-aqua-border)]">
              {searchResults.map((loc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectLocation(loc)}
                  className="w-full px-3 py-2.5 text-left hover:bg-[var(--accent-aqua-soft)] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">{loc.name}</div>
                    <div className="text-[11px] text-[var(--text-secondary)]">{loc.detail}</div>
                  </div>
                  <span className="text-[10px] text-[var(--accent-aqua)] font-mono border border-[var(--accent-aqua-border)] bg-[var(--bg-obsidian)] px-1.5 py-0.5 rounded">
                    {loc.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Coordinate Input Modal */}
      {showCoordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--glass-overlay)] backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--accent-aqua-border)] rounded-2xl shadow-2xl p-5 text-[var(--text-primary)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--accent-aqua-border)]">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[var(--accent-aqua)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Navigasi Koordinat Presisi</h3>
              </div>
              <button
                onClick={() => setShowCoordModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-[var(--accent-aqua-soft)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCoordinateSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Masukkan Latitude, Longitude (Decimal Degrees):
                </label>
                <input
                  type="text"
                  value={coordInput}
                  onChange={(e) => setCoordInput(e.target.value)}
                  placeholder="Contoh: -6.2088, 106.8456 (Jakarta)"
                  className="w-full px-3 py-2 text-sm sm:text-xs bg-[var(--bg-surface-elevated)] border border-[var(--accent-aqua-border)] rounded-xl text-[var(--text-primary)] font-mono placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-aqua)]"
                  autoFocus
                />
              </div>

              {coordError && (
                <div className="text-[11px] text-rose-400 font-medium">
                  {coordError}
                </div>
              )}

              <div className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-surface-elevated)] p-3 rounded-xl border border-[var(--accent-aqua-border)]">
                <div className="font-semibold text-[var(--accent-aqua)] mb-1">Batas Wilayah Nusantara:</div>
                <div className="font-mono">Lat: -11.0° s/d +6.0° (Lintang Selatan - Utara)</div>
                <div className="font-mono">Lng: 95.0° s/d 141.0° (Bujur Timur)</div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCoordModal(false)}
                  className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--accent-aqua-soft)] rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-[var(--accent-emerald)] hover:bg-[var(--accent-emerald-bright)] text-[#050d0f] rounded-xl transition-colors cursor-pointer"
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
