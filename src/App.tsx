import { useState, useEffect, useCallback } from 'react';
import { BasemapId, FirmsSensorCode, FirmsSensorStatusMap, FirmsSensorUiStatus, LayerDefinition, MeasureMode, SelectedFeature } from './types/gis';
import { INITIAL_LAYERS } from './data/layersCatalog';
import { Header } from './components/Header';
import { SidebarLayers } from './components/SidebarLayers';
import { MapViewer } from './components/MapViewer';
import { InfoPanel } from './components/InfoPanel';
import { TimelineBar } from './components/TimelineBar';
import { SettingsModal } from './components/SettingsModal';
import { VectorDataManager } from './components/VectorDataManager';
import type { ImportedVectorLayer } from './types/vector';

export default function App() {
  // 1. Theme State (Dark GIS default)
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('geo_viewer_theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('geo_viewer_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('geo_viewer_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  // 2. Basemap State
  const [currentBasemap, setCurrentBasemap] = useState<BasemapId>('esri-satellite');

  // 3. Layer Catalog State
  const [layers, setLayers] = useState<LayerDefinition[]>(() => INITIAL_LAYERS.map((layer) => ({ ...layer })));

  // 4. Sidebar & Panel State
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeature | null>(null);
  const [infoPanelOpen, setInfoPanelOpen] = useState<boolean>(true);

  // 5. Measurement Mode
  const [measureMode, setMeasureMode] = useState<MeasureMode>('none');

  // 6. Navigation FlyTo Target
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);

  // 7. Timeline Date State
  const [currentDate, setCurrentDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // 8. Earthquake & Hotspot Live Statistics
  const [quakesCount, setQuakesCount] = useState<number | null>(null);
  const [latestQuakeMag, setLatestQuakeMag] = useState<number | null>(null);
  const [quakesVisible, setQuakesVisible] = useState<boolean>(true);
  const [quakesOpacity, setQuakesOpacity] = useState<number>(0.95);
  const [hotspotsCount, setHotspotsCount] = useState<number | null>(null);
  const [hotspotSensors, setHotspotSensors] = useState<{ snpp: number; noaa20: number; noaa21: number } | null>(null);
  const [firmsSensorStatus, setFirmsSensorStatus] = useState<FirmsSensorStatusMap>({});
  const [firmsRefreshKey, setFirmsRefreshKey] = useState(0);
  const handleFirmsSensorStatus = useCallback((sensor: FirmsSensorCode, status: FirmsSensorUiStatus) => {
    setFirmsSensorStatus((current) => ({ ...current, [sensor]: status }));
  }, []);
  const handleRefreshFirms = useCallback(() => {
    setFirmsSensorStatus((current) => ({
      ...current,
      VIIRS_SNPP_NRT: { state: 'loading', count: current.VIIRS_SNPP_NRT?.count || 0, message: 'Memuat ulang…' },
      VIIRS_NOAA20_NRT: { state: 'loading', count: current.VIIRS_NOAA20_NRT?.count || 0, message: 'Memuat ulang…' },
      VIIRS_NOAA21_NRT: { state: 'loading', count: current.VIIRS_NOAA21_NRT?.count || 0, message: 'Memuat ulang…' },
    }));
    setFirmsRefreshKey((value) => value + 1);
  }, []);

  // 9. Settings Modal; all provider credentials remain server-side.
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [vectorDataOpen, setVectorDataOpen] = useState(false);
  const [importedVectorLayers, setImportedVectorLayers] = useState<ImportedVectorLayer[]>([]);
  const [refreshInterval, setRefreshInterval] = useState<number>(60);

  // Toggle layer visibility
  const handleToggleLayer = (id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  };

  // Change layer opacity
  const handleChangeOpacity = (id: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity } : l))
    );
  };

  // Reset layers to Default Preset (Disaster & Weather Monitor)
  const handleResetPreset = () => {
    setLayers(INITIAL_LAYERS.map((layer) => ({ ...layer })));
  };

  // Fly to location
  const handleFlyTo = useCallback((lng: number, lat: number) => {
    setFlyToCoords([lng, lat]);
  }, []);

  // Zoom to entire Indonesia extent
  const handleZoomToExtent = useCallback(() => {
    setFlyToCoords([118.0149, -2.5489]);
  }, []);

  // When a feature is selected on map, open info panel
  const handleSelectFeature = useCallback((feature: SelectedFeature) => {
    setSelectedFeature(feature);
    setInfoPanelOpen(true);
  }, []);

  const handleQuakesLoaded = useCallback((count: number, latestMag: number | null) => {
    setQuakesCount(count);
    setLatestQuakeMag(latestMag);
  }, []);

  const handleHotspotsLoaded = useCallback((count: number, sensors?: { snpp: number; noaa20: number; noaa21: number }) => {
    setHotspotsCount(count);
    if (sensors) setHotspotSensors(sensors);
  }, []);

  const activeLayersCount = layers.filter((l) => l.visible).length + (quakesVisible ? 1 : 0) + importedVectorLayers.filter((layer) => layer.visible).length;
  const handleAddVectorLayers = useCallback((newLayers: ImportedVectorLayer[]) => {
    setImportedVectorLayers((current) => [...current, ...newLayers]);
  }, []);
  const handleUpdateVectorLayer = useCallback((id: string, patch: Partial<ImportedVectorLayer>) => {
    setImportedVectorLayers((current) => current.map((layer) => layer.id === id ? { ...layer, ...patch } : layer));
  }, []);
  const handleRemoveVectorLayer = useCallback((id: string) => {
    setImportedVectorLayers((current) => current.filter((layer) => layer.id !== id));
  }, []);
  const satelliteLayerActive = layers.some(
    (l) => (l.id === 'weather-gpm-precipitation' || l.id === 'gfw-tree-cover-loss') && l.visible
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#114232] text-[#F7F6BB] flex flex-col font-sans select-none">
      {/* 1. Header Navigation Bar */}
      <Header
        currentBasemap={currentBasemap}
        onSelectBasemap={setCurrentBasemap}
        onFlyTo={handleFlyTo}
        measureMode={measureMode}
        onSetMeasureMode={setMeasureMode}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenSidebar={() => setSidebarOpen((prev) => !prev)}
        sidebarOpen={sidebarOpen}
        infoPanelOpen={infoPanelOpen}
        onToggleInfoPanel={() => setInfoPanelOpen((prev) => !prev)}
        activeLayersCount={activeLayersCount}
        onOpenVectorData={() => setVectorDataOpen(true)}
      />

      {/* 2. Main Map Canvas Container (Fills 100% of Viewport) */}
      <main className="relative flex-1 w-full h-full pt-14">
        <MapViewer
          currentBasemap={currentBasemap}
          layers={layers}
          measureMode={measureMode}
          onSetMeasureMode={setMeasureMode}
          onSelectFeature={handleSelectFeature}
          selectedCoordinates={flyToCoords}
          currentDate={currentDate}
          onQuakesLoaded={handleQuakesLoaded}
          onHotspotsLoaded={handleHotspotsLoaded}
          onFirmsSensorStatus={handleFirmsSensorStatus}
          firmsRefreshKey={firmsRefreshKey}
          importedVectorLayers={importedVectorLayers}
          quakesVisible={quakesVisible}
          quakesOpacity={quakesOpacity}
        />

        {/* 3. Left Sidebar: Layer Catalog */}
        <SidebarLayers
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          layers={layers}
          onToggleLayer={handleToggleLayer}
          onChangeOpacity={handleChangeOpacity}
          onResetPreset={handleResetPreset}
          onZoomToExtent={handleZoomToExtent}
          firmsSensorStatus={firmsSensorStatus}
          onRefreshFirms={handleRefreshFirms}
          quakesVisible={quakesVisible}
          onToggleQuakes={() => setQuakesVisible((v) => !v)}
          quakesOpacity={quakesOpacity}
          onChangeQuakesOpacity={setQuakesOpacity}
          quakesCount={quakesCount}
        />

        {/* 4. Right Information & Inspection Panel */}
        {infoPanelOpen && (
          <InfoPanel
            selectedFeature={selectedFeature}
            onClose={() => setInfoPanelOpen(false)}
            quakesCount={quakesCount}
            latestQuakeMag={latestQuakeMag}
            activeLayersCount={activeLayersCount}
            hotspotsCount={hotspotsCount}
            hotspotSensors={hotspotSensors}
            onFlyToCoords={handleFlyTo}
          />
        )}

        {/* 5. Bottom Timeline Bar (Only visible when temporal satellite layer is active) */}
        {satelliteLayerActive && (
          <TimelineBar
            currentDate={currentDate}
            onChangeDate={setCurrentDate}
            satelliteLayerActive={satelliteLayerActive}
          />
        )}
      </main>

      <VectorDataManager
        isOpen={vectorDataOpen}
        onClose={() => setVectorDataOpen(false)}
        layers={importedVectorLayers}
        onAdd={handleAddVectorLayers}
        onUpdate={handleUpdateVectorLayer}
        onRemove={handleRemoveVectorLayer}
      />

      {/* 6. Settings & System Health Diagnostics Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        refreshInterval={refreshInterval}
        onChangeRefreshInterval={setRefreshInterval}
      />
    </div>
  );
}
