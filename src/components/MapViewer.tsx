import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import {
  NavigationControl,
  GeolocateControl,
  ScaleControl,
  MapLayerMouseEvent,
  StyleSpecification,
  GeoJSONSource,
  RasterTileSource,
  setWorkerUrl,
} from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

// Configure Web Worker URL for Vite bundling
setWorkerUrl(maplibreWorkerUrl);
import { BasemapId, FirmsSensorCode, FirmsSensorUiStatus, LayerDefinition, MeasureMode, SelectedFeature } from '../types/gis';
import { BASEMAPS } from '../data/layersCatalog';
import { WindParticleCanvas } from './WindParticleCanvas';
import { calculateDistanceKm, calculateAreaKm2, formatDistance, formatArea } from '../utils/measurement';
import { MapPin, Ruler, Trash2 } from 'lucide-react';
import type { ImportedVectorLayer } from '../types/vector';

const FIRMS_SENSOR_LAYERS = [
  {
    sensorCode: 'VIIRS_SNPP_NRT',
    layerId: 'disaster-viirs-snpp',
    sourceId: 'firms-snpp-source',
    clusterId: 'firms-snpp-clusters',
    countId: 'firms-snpp-cluster-count',
    pointId: 'firms-snpp-points',
    statsKey: 'snpp',
  },
  {
    sensorCode: 'VIIRS_NOAA20_NRT',
    layerId: 'disaster-viirs-noaa20',
    sourceId: 'firms-noaa20-source',
    clusterId: 'firms-noaa20-clusters',
    countId: 'firms-noaa20-cluster-count',
    pointId: 'firms-noaa20-points',
    statsKey: 'noaa20',
  },
  {
    sensorCode: 'VIIRS_NOAA21_NRT',
    layerId: 'disaster-viirs-noaa21',
    sourceId: 'firms-noaa21-source',
    clusterId: 'firms-noaa21-clusters',
    countId: 'firms-noaa21-cluster-count',
    pointId: 'firms-noaa21-points',
    statsKey: 'noaa21',
  },
] as const;

interface MapViewerProps {
  currentBasemap: BasemapId;
  layers: LayerDefinition[];
  measureMode: MeasureMode;
  onSetMeasureMode: (mode: MeasureMode) => void;
  onSelectFeature: (feature: SelectedFeature) => void;
  selectedCoordinates: [number, number] | null; // [lng, lat] to fly to
  currentDate: string; // YYYY-MM-DD for GIBS
  onQuakesLoaded?: (count: number, latestMag: number | null) => void;
  onHotspotsLoaded?: (count: number, sensors?: { snpp: number; noaa20: number; noaa21: number }) => void;
  onFirmsSensorStatus?: (sensor: FirmsSensorCode, status: FirmsSensorUiStatus) => void;
  firmsRefreshKey?: number;
  importedVectorLayers: ImportedVectorLayer[];
  quakesVisible?: boolean;
  quakesOpacity?: number;
}

export const MapViewer: React.FC<MapViewerProps> = ({
  currentBasemap,
  layers,
  measureMode,
  onSetMeasureMode,
  onSelectFeature,
  selectedCoordinates,
  currentDate,
  onQuakesLoaded,
  onHotspotsLoaded,
  onFirmsSensorStatus,
  firmsRefreshKey = 0,
  importedVectorLayers,
  quakesVisible = true,
  quakesOpacity = 0.95,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const importedFingerprintsRef = useRef<Map<string, string>>(new Map());
  const hotspotCountsRef = useRef({ snpp: 0, noaa20: 0, noaa21: 0 });
  const loadedGeoJsonWeatherRef = useRef<Set<string>>(new Set());
  const layerVisibilityRef = useRef<Record<string, boolean>>(
    Object.fromEntries(layers.map((layer) => [layer.id, layer.visible]))
  );
  const onFirmsSensorStatusRef = useRef(onFirmsSensorStatus);
  useEffect(() => { onFirmsSensorStatusRef.current = onFirmsSensorStatus; }, [onFirmsSensorStatus]);
  useEffect(() => {
    layerVisibilityRef.current = Object.fromEntries(
      layers.map((layer) => [layer.id, layer.visible])
    );
  }, [layers]);
  const onSelectFeatureHandlerRef = useRef(onSelectFeature);
  useEffect(() => { onSelectFeatureHandlerRef.current = onSelectFeature; }, [onSelectFeature]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [cursorCoords, setCursorCoords] = useState<{ lng: number; lat: number; zoom: number }>({
    lng: 118.01,
    lat: -2.55,
    zoom: 5,
  });

  // Measurement state
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
  const [measureResult, setMeasureResult] = useState<string>('');

  // 1. Initialize MapLibre GL Instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const baseConfig = BASEMAPS.find((b) => b.id === currentBasemap) || BASEMAPS[0];

    const initialStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        'basemap-source': {
          type: 'raster',
          tiles: baseConfig.tiles,
          tileSize: 256,
          attribution: baseConfig.attribution,
          maxzoom: baseConfig.maxZoom,
        },
      },
      layers: [
        {
          id: 'basemap-layer',
          type: 'raster',
          source: 'basemap-source',
          paint: {
            'raster-opacity': 1,
            'raster-fade-duration': 150,
          },
        },
      ],
    };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: initialStyle,
      center: [118.0149, -2.5489], // Center Indonesia
      zoom: 5.0,
      minZoom: 3.5,
      maxZoom: 19,
      maxBounds: [
        [88.0, -16.0], // Southwest bounds [lng, lat]
        [146.0, 10.0],  // Northeast bounds [lng, lat]
      ],
      attributionControl: {
        compact: true,
      },
    });

    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');

    const geolocate = new GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    });
    map.addControl(geolocate, 'top-right');

    const scale = new ScaleControl({ maxWidth: 120, unit: 'metric' });
    map.addControl(scale, 'bottom-left');

    map.on('load', () => {
      mapRef.current = map;
      setMapLoaded(true);
    });

    map.on('mousemove', (e: MapLayerMouseEvent) => {
      setCursorCoords({
        lng: parseFloat(e.lngLat.lng.toFixed(4)),
        lat: parseFloat(e.lngLat.lat.toFixed(4)),
        zoom: parseFloat(map.getZoom().toFixed(1)),
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Basemap Switcher handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const baseConfig = BASEMAPS.find((b) => b.id === currentBasemap);
    if (!baseConfig) return;

    const source = map.getSource('basemap-source') as maplibregl.RasterTileSource;
    if (source && (source as any).setTiles) {
      (source as any).setTiles(baseConfig.tiles);
    } else {
      // Re-add basemap source & layer if needed
      if (map.getLayer('basemap-layer')) map.removeLayer('basemap-layer');
      if (map.getSource('basemap-source')) map.removeSource('basemap-source');

      map.addSource('basemap-source', {
        type: 'raster',
        tiles: baseConfig.tiles,
        tileSize: 256,
        attribution: baseConfig.attribution,
        maxzoom: baseConfig.maxZoom,
      });

      // Insert at the bottom-most layer
      const firstLayerId = map.getStyle().layers[0]?.id;
      map.addLayer(
        {
          id: 'basemap-layer',
          type: 'raster',
          source: 'basemap-source',
          paint: { 'raster-opacity': 1 },
        },
        firstLayerId !== 'basemap-layer' ? firstLayerId : undefined
      );
    }
  }, [currentBasemap, mapLoaded]);

  // 3. Fly to coordinates trigger
  useEffect(() => {
    if (!mapRef.current || !selectedCoordinates) return;
    mapRef.current.flyTo({
      center: selectedCoordinates,
      zoom: 9,
      essential: true,
      duration: 1800,
    });
  }, [selectedCoordinates]);

  // 4. Quakes Layer (BMKG & USGS)
  const loadQuakesLayer = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    try {
      const res = await fetch('/api/quakes');
      if (!res.ok) return;
      const data = await res.json();

      if (onQuakesLoaded && data.features) {
        const latestMag = data.metadata?.bmkgLatest?.Magnitude
          ? parseFloat(data.metadata.bmkgLatest.Magnitude)
          : data.features[0]?.properties?.magnitude || null;
        onQuakesLoaded(data.features.length, latestMag);
      }

      if (map.getSource('quakes-source')) {
        (map.getSource('quakes-source') as maplibregl.GeoJSONSource).setData(data);
      } else {
        map.addSource('quakes-source', {
          type: 'geojson',
          attribution: 'Data gempa: BMKG (Pusat Gempa Nasional) dan USGS Earthquake Hazards Program',
          data,
        });

        // 0. Outer pulsing glow halo for quakes
        map.addLayer({
          id: 'quakes-glow-layer',
          type: 'circle',
          source: 'quakes-source',
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'magnitude'],
              2,
              10,
              4,
              16,
              5,
              24,
              6,
              34,
              7,
              46,
            ],
            'circle-color': [
              'step',
              ['get', 'magnitude'],
              '#3b82f6',
              4.0,
              '#eab308',
              5.0,
              '#f97316',
              6.0,
              '#ef4444',
            ],
            'circle-opacity': 0.25,
            'circle-blur': 0.65,
          },
        });

        // 1. Quake circles
        map.addLayer({
          id: 'quakes-circle-layer',
          type: 'circle',
          source: 'quakes-source',
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'magnitude'],
              2,
              5,
              4,
              8,
              5,
              12,
              6,
              18,
              7,
              25,
            ],
            'circle-color': [
              'step',
              ['get', 'magnitude'],
              '#3b82f6', // < 4
              4.0,
              '#eab308', // 4.0 - 4.9
              5.0,
              '#f97316', // 5.0 - 5.9
              6.0,
              '#ef4444', // 6.0+
            ],
            'circle-opacity': 0.9,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#ffffff',
          },
        });

        // 2. Quake magnitude text label
        map.addLayer({
          id: 'quakes-label-layer',
          type: 'symbol',
          source: 'quakes-source',
          layout: {
            'text-field': ['concat', 'M', ['to-string', ['get', 'magnitude']]],
            'text-size': 10,
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-offset': [0, 1.4],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#020617',
            'text-halo-width': 1.5,
          },
        });

        // Click handler on earthquake circles
        map.on('click', 'quakes-circle-layer', (e: MapLayerMouseEvent) => {
          if (!e.features || !e.features[0]) return;
          const feat = e.features[0];
          const props = feat.properties as any;
          const geom = feat.geometry as any;

          onSelectFeatureHandlerRef.current({
            type: 'earthquake',
            title: `Gempa M ${props.magnitude} - ${props.area}`,
            coordinates: geom.coordinates as [number, number],
            data: props,
          });
        });

        map.on('mouseenter', 'quakes-circle-layer', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'quakes-circle-layer', () => {
          map.getCanvas().style.cursor = '';
        });
      }
    } catch (err) {
      console.warn('Failed to load earthquake points:', err);
    }
  }, [mapLoaded, onQuakesLoaded, onSelectFeature]);

  // 5. Indonesia Province Boundaries (38 Provinsi Indonesia 2026)
  const loadProvincesLayer = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    try {
      let geojson: any = null;
      try {
        const res = await fetch('/api/admin/boundaries/province');
        if (res.ok) {
          geojson = await res.json();
        }
      } catch (fetchErr) {
        console.warn('Backend province API fetch failed, trying direct static fallback:', fetchErr);
      }

      if (!geojson || !geojson.features) {
        const fallbackRes = await fetch('/indonesia-38-provinces.geojson');
        if (fallbackRes.ok) {
          geojson = await fallbackRes.json();
        }
      }

      if (!geojson || !geojson.features) return;

      const sourceId = 'source-admin-provinces';
      const beforeId = map.getLayer('quakes-glow-layer')
        ? 'quakes-glow-layer'
        : map.getLayer('quakes-circle-layer')
        ? 'quakes-circle-layer'
        : undefined;

      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson,
          attribution: 'Batas Provinsi: © Sipongi KLHK & BIG RI 2026',
        });

        const initialVis = layerVisibilityRef.current['admin-provinces'] !== false ? 'visible' : 'none';

        // Fill layer
        map.addLayer(
          {
            id: 'provinces-fill-layer',
            type: 'fill',
            source: sourceId,
            layout: {
              visibility: initialVis,
            },
            paint: {
              'fill-color': '#06b6d4',
              'fill-opacity': 0.07,
            },
          },
          beforeId
        );

        // Hover highlight fill layer
        map.addLayer(
          {
            id: 'provinces-hover-fill-layer',
            type: 'fill',
            source: sourceId,
            filter: ['==', ['get', 'PROVINSI'], ''],
            layout: {
              visibility: initialVis,
            },
            paint: {
              'fill-color': '#22d3ee',
              'fill-opacity': 0.22,
            },
          },
          beforeId
        );

        // Dark outer casing for crisp satellite readability
        map.addLayer(
          {
            id: 'provinces-line-casing-layer',
            type: 'line',
            source: sourceId,
            layout: {
              visibility: initialVis,
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#042f2e',
              'line-width': ['interpolate', ['linear'], ['zoom'], 4, 2.8, 7, 4.5, 11, 6.5],
              'line-opacity': 0.7,
            },
          },
          beforeId
        );

        // Boundary outline line layer
        map.addLayer(
          {
            id: 'provinces-line-layer',
            type: 'line',
            source: sourceId,
            layout: {
              visibility: initialVis,
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#22d3ee',
              'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.3, 7, 2.4, 11, 3.8],
              'line-opacity': 0.9,
            },
          },
          beforeId
        );

        // Hover highlight border line layer
        map.addLayer(
          {
            id: 'provinces-hover-line-layer',
            type: 'line',
            source: sourceId,
            filter: ['==', ['get', 'PROVINSI'], ''],
            layout: {
              visibility: initialVis,
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#ffffff',
              'line-width': ['interpolate', ['linear'], ['zoom'], 4, 2.2, 7, 3.4, 11, 4.8],
              'line-opacity': 0.95,
            },
          },
          beforeId
        );

        // Province Name Labels
        map.addLayer(
          {
            id: 'provinces-label-layer',
            type: 'symbol',
            source: sourceId,
            layout: {
              visibility: initialVis,
              'text-field': ['coalesce', ['get', 'WADMPR'], ['get', 'PROVINSI'], ['get', 'name']],
              'text-size': ['interpolate', ['linear'], ['zoom'], 4, 9, 7, 13, 10, 16],
              'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
              'text-transform': 'uppercase',
              'text-letter-spacing': 0.1,
              'text-max-width': 10,
            },
            paint: {
              'text-color': '#e2e8f0',
              'text-halo-color': '#0f172a',
              'text-halo-width': 2,
              'text-opacity': 0.92,
            },
          },
          beforeId
        );

        // Click handler to select and inspect clicked province (yields to point/alert layers above)
        map.on('click', 'provinces-fill-layer', (e: MapLayerMouseEvent) => {
          const priorityLayers = [
            'quakes-circle-layer',
            'layer-weather-air-quality-circle',
            'layer-weather-rain-potential-circle',
            'layer-weather-bmkg-nowcast-fill',
            'layer-gfw-oil-palm-fill',
            'layer-gfw-peatlands-fill',
            'layer-gfw-mangrove-extent-fill',
            'layer-gfw-wood-fiber-fill',
            ...FIRMS_SENSOR_LAYERS.flatMap((s) => [s.clusterId, s.pointId]),
          ].filter((id) => Boolean(map.getLayer(id)));
          if (priorityLayers.length > 0 && map.queryRenderedFeatures(e.point, { layers: priorityLayers }).length > 0) {
            return;
          }
          if (!e.features || !e.features[0]) return;
          const feat = e.features[0];
          const props = feat.properties as any;
          const name = props.WADMPR || props.PROVINSI || props.name || 'Provinsi';
          onSelectFeatureHandlerRef.current({
            type: 'province',
            title: `Provinsi ${name}`,
            coordinates: [e.lngLat.lng, e.lngLat.lat],
            data: {
              name,
              capital: props.capital || props.IBUKOTA || '—',
              island: props.island || props.PULAU || '—',
              areaKm2: props.areaKm2 ? Number(props.areaKm2) : undefined,
              population: props.population || '—',
              code: props.KDPPUM || props.KODE_PROV || props.id || '',
              edition: '2026 (38 Provinsi Termasuk DOB Papua)',
              ...props,
            },
          });
        });

        map.on('mousemove', 'provinces-fill-layer', (e: MapLayerMouseEvent) => {
          map.getCanvas().style.cursor = 'pointer';
          const name = e.features?.[0]?.properties?.PROVINSI || '';
          if (map.getLayer('provinces-hover-fill-layer')) {
            map.setFilter('provinces-hover-fill-layer', ['==', ['get', 'PROVINSI'], name]);
          }
          if (map.getLayer('provinces-hover-line-layer')) {
            map.setFilter('provinces-hover-line-layer', ['==', ['get', 'PROVINSI'], name]);
          }
        });
        map.on('mouseleave', 'provinces-fill-layer', () => {
          map.getCanvas().style.cursor = '';
          if (map.getLayer('provinces-hover-fill-layer')) {
            map.setFilter('provinces-hover-fill-layer', ['==', ['get', 'PROVINSI'], '']);
          }
          if (map.getLayer('provinces-hover-line-layer')) {
            map.setFilter('provinces-hover-line-layer', ['==', ['get', 'PROVINSI'], '']);
          }
        });
      }
    } catch (err) {
      console.warn('Failed to load province boundaries:', err);
    }
  }, [mapLoaded, onSelectFeature]);

  // 6. NASA FIRMS VIIRS layers. Each sensor has its own API request,
  // GeoJSON source and independently switchable MapLibre layer.
  const loadHotspotsLayers = useCallback(async (forceRefresh = false) => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const emptyFeatureCollection = { type: 'FeatureCollection', features: [] } as any;

    const ensureSensorMapLayers = (config: typeof FIRMS_SENSOR_LAYERS[number]) => {
      if (!map.getSource(config.sourceId)) {
        map.addSource(config.sourceId, {
          type: 'geojson',
          data: emptyFeatureCollection,
          cluster: true,
          clusterMaxZoom: 12,
          clusterRadius: 35,
          attribution: 'NASA EOSDIS LANCE FIRMS',
        });
      }

      if (!map.getLayer(config.clusterId)) {
        map.addLayer({
          id: config.clusterId,
          type: 'circle',
          source: config.sourceId,
          filter: ['has', 'point_count'],
          layout: { visibility: layerVisibilityRef.current[config.layerId] ? 'visible' : 'none' },
          paint: {
            'circle-color': ['step', ['get', 'point_count'], '#f59e0b', 25, '#ea580c', 100, '#dc2626'],
            'circle-radius': ['step', ['get', 'point_count'], 14, 25, 18, 100, 24],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
          },
        });

        map.on('click', config.clusterId, (event: MapLayerMouseEvent) => {
          const rendered = map.queryRenderedFeatures(event.point, { layers: [config.clusterId] });
          if (!rendered.length) return;
          const clusterId = rendered[0].properties?.cluster_id;
          const source = map.getSource(config.sourceId) as any;
          if (source?.getClusterExpansionZoom && clusterId !== undefined) {
            source.getClusterExpansionZoom(clusterId, (error: Error | null, zoom: number) => {
              if (error) return;
              map.easeTo({
                center: (rendered[0].geometry as any).coordinates,
                zoom: Math.min(zoom, 14),
              });
            });
          }
        });
        map.on('mouseenter', config.clusterId, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', config.clusterId, () => { map.getCanvas().style.cursor = ''; });
      }

      if (!map.getLayer(config.countId)) {
        map.addLayer({
          id: config.countId,
          type: 'symbol',
          source: config.sourceId,
          filter: ['has', 'point_count'],
          layout: {
            visibility: layerVisibilityRef.current[config.layerId] ? 'visible' : 'none',
            'text-field': '{point_count_abbreviated}',
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-size': 11,
          },
          paint: { 'text-color': '#ffffff' },
        });
      }

      if (!map.getLayer(config.pointId)) {
        map.addLayer({
          id: config.pointId,
          type: 'circle',
          source: config.sourceId,
          filter: ['!', ['has', 'point_count']],
          layout: { visibility: layerVisibilityRef.current[config.layerId] ? 'visible' : 'none' },
          paint: {
            'circle-color': ['match', ['get', 'confidenceRaw'], 'h', '#ef4444', 'n', '#f97316', '#eab308'],
            'circle-radius': 4.8,
            'circle-stroke-width': 1.2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.95,
          },
        });

        map.on('click', config.pointId, (event: MapLayerMouseEvent) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const properties = feature.properties as any;
          const geometry = feature.geometry as any;
          onSelectFeatureHandlerRef.current({
            type: 'hotspot',
            title: `Hotspot ${properties?.sensor || config.sensorCode} (FRP ${properties?.frp ?? '—'} MW)`,
            coordinates: geometry.coordinates as [number, number],
            data: properties,
          });
        });
        map.on('mouseenter', config.pointId, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', config.pointId, () => { map.getCanvas().style.cursor = ''; });
      }
    };

    // Create the map layers first so the layer controls exist even while
    // NASA is responding or a key is not configured.
    for (const config of FIRMS_SENSOR_LAYERS) ensureSensorMapLayers(config);

    const sensorRequests = FIRMS_SENSOR_LAYERS.map(async (config) => {
      const statusCallback = onFirmsSensorStatusRef.current;
      statusCallback?.(config.sensorCode as FirmsSensorCode, { state: 'loading', count: hotspotCountsRef.current[config.statsKey], message: 'Menghubungi NASA FIRMS…' });
      try {
        const response = await fetch(`/api/firms/hotspots?sensor=${encodeURIComponent(config.sensorCode)}&days=1&refresh=${forceRefresh ? '1' : '0'}`, {
          cache: 'no-store',
          headers: { Accept: 'application/geo+json, application/json' },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const detail = payload?.sensorStatus?.[config.sensorCode]?.error;
          throw new Error([payload?.error || payload?.message || `NASA FIRMS HTTP ${response.status}`, detail].filter(Boolean).join(' — '));
        }
        if (payload?.type !== 'FeatureCollection' || !Array.isArray(payload.features)) {
          throw new Error('Respons bukan GeoJSON FeatureCollection. Periksa parser CSV/API backend.');
        }

        // Guard MapLibre against malformed or non-point records; only valid
        // lon/lat observations for this one sensor are passed to its source.
        const validFeatures = payload.features.filter((feature: any) => {
          const coordinates = feature?.geometry?.coordinates;
          return feature?.geometry?.type === 'Point' && Array.isArray(coordinates) && coordinates.length >= 2
            && Number.isFinite(Number(coordinates[0])) && Number.isFinite(Number(coordinates[1]))
            && Number(coordinates[0]) >= -180 && Number(coordinates[0]) <= 180
            && Number(coordinates[1]) >= -90 && Number(coordinates[1]) <= 90;
        });
        const cleanPayload = { ...payload, features: validFeatures };
        const source = map.getSource(config.sourceId) as GeoJSONSource | undefined;
        if (!source) throw new Error(`MapLibre source ${config.sourceId} belum dibuat.`);
        source.setData(cleanPayload as any);
        hotspotCountsRef.current[config.statsKey] = validFeatures.length;
        const state = validFeatures.length > 0 ? 'ok' : 'empty';
        statusCallback?.(config.sensorCode as FirmsSensorCode, {
          state, count: validFeatures.length, checkedAt: new Date().toISOString(),
          message: validFeatures.length > 0 ? `${validFeatures.length.toLocaleString('id-ID')} titik diterima.` : 'NASA merespons valid, tetapi tidak ada deteksi pada Indonesia untuk periode 1 hari terakhir.',
        });
        console.info(`[FIRMS] ${config.sensorCode}: ${validFeatures.length} fitur ditampilkan.`);
      } catch (error) {
        // Preserve previous successful source data, but expose the actual
        // error in Sidebar instead of silently leaving an apparently empty layer.
        const message = error instanceof Error ? error.message : String(error);
        statusCallback?.(config.sensorCode as FirmsSensorCode, { state: 'error', count: hotspotCountsRef.current[config.statsKey], checkedAt: new Date().toISOString(), message });
        console.error(`[FIRMS] ${config.sensorCode} gagal:`, message);
      }
    });

    await Promise.allSettled(sensorRequests);
    const counts = { ...hotspotCountsRef.current };
    onHotspotsLoaded?.(counts.snpp + counts.noaa20 + counts.noaa21, counts);
  }, [mapLoaded, onHotspotsLoaded]);

  useEffect(() => {
    loadHotspotsLayers(firmsRefreshKey > 0);
  }, [loadHotspotsLayers, firmsRefreshKey]);

  // Load official 38 provinces layer on map initialization
  useEffect(() => {
    loadProvincesLayer();
  }, [loadProvincesLayer]);

  // Load BMKG + USGS earthquakes on map initialization and refresh every 3 minutes
  useEffect(() => {
    if (!mapLoaded) return;
    void loadQuakesLayer();
    const quakesInterval = window.setInterval(() => {
      void loadQuakesLayer();
    }, 3 * 60 * 1000);
    return () => window.clearInterval(quakesInterval);
  }, [mapLoaded, loadQuakesLayer]);

  // Sync earthquake visibility and opacity
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const vis = quakesVisible ? 'visible' : 'none';
    if (map.getLayer('quakes-glow-layer')) {
      map.setLayoutProperty('quakes-glow-layer', 'visibility', vis);
      map.setPaintProperty('quakes-glow-layer', 'circle-opacity', 0.25 * quakesOpacity);
    }
    if (map.getLayer('quakes-circle-layer')) {
      map.setLayoutProperty('quakes-circle-layer', 'visibility', vis);
      map.setPaintProperty('quakes-circle-layer', 'circle-opacity', 0.9 * quakesOpacity);
    }
    if (map.getLayer('quakes-label-layer')) {
      map.setLayoutProperty('quakes-label-layer', 'visibility', vis);
    }
  }, [mapLoaded, quakesVisible, quakesOpacity]);

  // Weather & Air Quality GeoJSON Layer Loader (AQMS, BMKG Forecast/Rain, BMKG Nowcast)
  const loadWeatherGeoJsonLayer = useCallback(async (layerId: string, opacity: number) => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (loadedGeoJsonWeatherRef.current.has(layerId)) return;
    loadedGeoJsonWeatherRef.current.add(layerId);

    try {
      if (layerId === 'weather-air-quality') {
        const res = await fetch('/api/weather/grid?kind=air');
        if (!res.ok) throw new Error(`AQMS HTTP ${res.status}`);
        const data = await res.json();
        const sourceId = 'source-weather-air-quality';
        if (map.getSource(sourceId)) {
          (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
        } else {
          map.addSource(sourceId, {
            type: 'geojson',
            data,
            attribution: data.metadata?.attribution || 'KLHK / Sipongi AQMS',
          });
          map.addLayer({
            id: 'layer-weather-air-quality-glow',
            type: 'circle',
            source: sourceId,
            layout: { visibility: layerVisibilityRef.current['weather-air-quality'] ? 'visible' : 'none' },
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 10, 8, 18, 12, 24],
              'circle-color': [
                'step',
                ['coalesce', ['get', 'ispu'], ['get', 'pm2_5'], 0],
                '#22c55e',
                51, '#3b82f6',
                101, '#f97316',
                201, '#ef4444',
              ],
              'circle-opacity': 0.28 * opacity,
              'circle-blur': 0.5,
            },
          });
          map.addLayer({
            id: 'layer-weather-air-quality-circle',
            type: 'circle',
            source: sourceId,
            layout: { visibility: layerVisibilityRef.current['weather-air-quality'] ? 'visible' : 'none' },
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 5, 8, 9, 12, 12],
              'circle-color': [
                'step',
                ['coalesce', ['get', 'ispu'], ['get', 'pm2_5'], 0],
                '#22c55e',
                51, '#3b82f6',
                101, '#f97316',
                201, '#ef4444',
              ],
              'circle-opacity': opacity,
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#ffffff',
            },
          });
          map.addLayer({
            id: 'layer-weather-air-quality-label',
            type: 'symbol',
            source: sourceId,
            minzoom: 5.5,
            layout: {
              visibility: layerVisibilityRef.current['weather-air-quality'] ? 'visible' : 'none',
              'text-field': [
                'concat',
                'ISPU ',
                ['to-string', ['round', ['coalesce', ['get', 'ispu'], ['get', 'pm2_5'], 0]]],
                ['case', ['has', 'kota'], ['concat', ' · ', ['get', 'kota']], ''],
              ],
              'text-size': 10,
              'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
              'text-offset': [0, 1.3],
              'text-anchor': 'top',
            },
            paint: {
              'text-color': '#f8fafc',
              'text-halo-color': '#020617',
              'text-halo-width': 1.5,
            },
          });
          map.on('click', 'layer-weather-air-quality-circle', (e: MapLayerMouseEvent) => {
            const feat = e.features?.[0];
            if (!feat) return;
            const props = feat.properties as any;
            const geom = feat.geometry as any;
            onSelectFeatureHandlerRef.current({
              type: 'weather',
              title: props.kota ? `Kualitas Udara — ${props.kota}` : 'Stasiun AQMS',
              coordinates: geom.coordinates as [number, number],
              data: { ...props, dataType: props.dataType || 'aqms' },
            });
          });
          map.on('mouseenter', 'layer-weather-air-quality-circle', () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', 'layer-weather-air-quality-circle', () => { map.getCanvas().style.cursor = ''; });
        }
      } else if (layerId === 'weather-rain-potential') {
        const res = await fetch('/api/weather/grid?kind=rain');
        if (!res.ok) throw new Error(`Weather grid HTTP ${res.status}`);
        const data = await res.json();
        const sourceId = 'source-weather-rain-potential';
        if (map.getSource(sourceId)) {
          (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
        } else {
          map.addSource(sourceId, {
            type: 'geojson',
            data,
            attribution: data.metadata?.attribution || 'BMKG Prakiraan Cuaca Terbuka',
          });
          map.addLayer({
            id: 'layer-weather-rain-potential-glow',
            type: 'circle',
            source: sourceId,
            layout: { visibility: layerVisibilityRef.current['weather-rain-potential'] ? 'visible' : 'none' },
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 13, 8, 22, 12, 30],
              'circle-color': [
                'step',
                ['coalesce', ['get', 'precipitation_probability'], 0],
                '#38bdf8',
                25, '#60a5fa',
                50, '#2563eb',
                75, '#f59e0b',
              ],
              'circle-opacity': 0.25 * opacity,
              'circle-blur': 0.55,
            },
          });
          map.addLayer({
            id: 'layer-weather-rain-potential-circle',
            type: 'circle',
            source: sourceId,
            layout: { visibility: layerVisibilityRef.current['weather-rain-potential'] ? 'visible' : 'none' },
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 6.5, 8, 10, 12, 13],
              'circle-color': [
                'step',
                ['coalesce', ['get', 'precipitation_probability'], 0],
                '#38bdf8',
                25, '#60a5fa',
                50, '#2563eb',
                75, '#f59e0b',
              ],
              'circle-opacity': opacity,
              'circle-stroke-width': 1.75,
              'circle-stroke-color': '#f8fafc',
            },
          });
          map.addLayer({
            id: 'layer-weather-rain-potential-label',
            type: 'symbol',
            source: sourceId,
            layout: {
              visibility: layerVisibilityRef.current['weather-rain-potential'] ? 'visible' : 'none',
              'text-field': [
                'case',
                ['has', 't'],
                [
                  'concat',
                  ['coalesce', ['get', 'cityName'], ['get', 'kota'], ''],
                  ' · ',
                  ['to-string', ['get', 't']],
                  '°C',
                ],
                ['concat', ['to-string', ['round', ['coalesce', ['get', 'precipitation_probability'], 0]]], '%'],
              ],
              'text-size': ['interpolate', ['linear'], ['zoom'], 4, 9.5, 8, 11.5],
              'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
              'text-offset': [0, 1.35],
              'text-anchor': 'top',
            },
            paint: {
              'text-color': '#e0f2fe',
              'text-halo-color': '#020617',
              'text-halo-width': 1.6,
            },
          });
          map.on('click', 'layer-weather-rain-potential-circle', (e: MapLayerMouseEvent) => {
            const feat = e.features?.[0];
            if (!feat) return;
            const props = feat.properties as any;
            const geom = feat.geometry as any;
            onSelectFeatureHandlerRef.current({
              type: 'weather',
              title: props.kota ? `Prakiraan Cuaca — ${props.kota}` : 'Potensi Hujan Model',
              coordinates: geom.coordinates as [number, number],
              data: { ...props, dataType: props.dataType || 'bmkg-forecast' },
            });
          });
          map.on('mouseenter', 'layer-weather-rain-potential-circle', () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', 'layer-weather-rain-potential-circle', () => { map.getCanvas().style.cursor = ''; });
        }
      } else if (layerId === 'weather-bmkg-nowcast') {
        const res = await fetch('/api/bmkg/nowcast/geojson?lang=id');
        if (!res.ok) throw new Error(`BMKG Nowcast HTTP ${res.status}`);
        const data = await res.json();
        const sourceId = 'source-weather-bmkg-nowcast';
        if (map.getSource(sourceId)) {
          (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
        } else {
          map.addSource(sourceId, {
            type: 'geojson',
            data,
            attribution: data.metadata?.attribution || 'Sumber data: BMKG',
          });
          map.addLayer({
            id: 'layer-weather-bmkg-nowcast-fill',
            type: 'fill',
            source: sourceId,
            layout: { visibility: layerVisibilityRef.current['weather-bmkg-nowcast'] ? 'visible' : 'none' },
            paint: {
              'fill-color': [
                'match',
                ['downcase', ['coalesce', ['get', 'severity'], '']],
                'extreme', '#b91c1c',
                'severe', '#f97316',
                'moderate', '#eab308',
                '#f59e0b',
              ],
              'fill-opacity': opacity,
            },
          });
          map.addLayer({
            id: 'layer-weather-bmkg-nowcast-line',
            type: 'line',
            source: sourceId,
            layout: { visibility: layerVisibilityRef.current['weather-bmkg-nowcast'] ? 'visible' : 'none' },
            paint: {
              'line-color': '#fde047',
              'line-width': 2,
              'line-opacity': Math.min(1, opacity + 0.3),
            },
          });
          map.addLayer({
            id: 'layer-weather-bmkg-nowcast-label',
            type: 'symbol',
            source: sourceId,
            layout: {
              visibility: layerVisibilityRef.current['weather-bmkg-nowcast'] ? 'visible' : 'none',
              'text-field': ['coalesce', ['get', 'event'], ['get', 'headline'], 'Peringatan Cuaca'],
              'text-size': 10,
              'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            },
            paint: {
              'text-color': '#fef08a',
              'text-halo-color': '#020617',
              'text-halo-width': 1.5,
            },
          });
          map.on('click', 'layer-weather-bmkg-nowcast-fill', (e: MapLayerMouseEvent) => {
            const feat = e.features?.[0];
            if (!feat) return;
            const props = feat.properties as any;
            onSelectFeatureHandlerRef.current({
              type: 'weather',
              title: props.headline || props.event || 'Peringatan Dini Cuaca BMKG',
              coordinates: [e.lngLat.lng, e.lngLat.lat],
              data: { ...props, dataType: 'weather-warning' },
            });
          });
          map.on('mouseenter', 'layer-weather-bmkg-nowcast-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', 'layer-weather-bmkg-nowcast-fill', () => { map.getCanvas().style.cursor = ''; });
        }
      } else if (layerId === 'gfw-oil-palm') {
        let data: any = null;
        try {
          const res = await fetch('/api/gfw/oil-palm-concessions');
          if (res.ok) data = await res.json();
        } catch (fetchErr) {
          console.warn('API oil palm failed, trying direct static fallback:', fetchErr);
        }
        if (!data || !data.features) {
          const fallbackRes = await fetch('/indonesia-oil-palm-concessions.geojson');
          if (fallbackRes.ok) data = await fallbackRes.json();
        }
        if (!data || !data.features) throw new Error('Data konsesi kelapa sawit tidak tersedia');

        const sourceId = 'source-gfw-oil-palm';
        const beforeId = map.getLayer('quakes-glow-layer')
          ? 'quakes-glow-layer'
          : map.getLayer('quakes-circle-layer')
          ? 'quakes-circle-layer'
          : undefined;

        if (map.getSource(sourceId)) {
          (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
        } else {
          map.addSource(sourceId, {
            type: 'geojson',
            data,
            attribution: data.metadata?.attribution || 'Data Konsesi Kelapa Sawit Indonesia',
          });
          const vis = layerVisibilityRef.current['gfw-oil-palm'] ? 'visible' : 'none';
          map.addLayer(
            {
              id: 'layer-gfw-oil-palm-fill',
              type: 'fill',
              source: sourceId,
              layout: { visibility: vis },
              paint: {
                'fill-color': [
                  'match',
                  ['coalesce', ['get', 'type'], ['get', 'po_legalst'], ''],
                  'HGU', '#10b981',
                  'Ijin Lokasi', '#f59e0b',
                  'Izin Lokasi', '#f59e0b',
                  'Ijin Prinsip', '#f59e0b',
                  'HGU in process', '#06b6d4',
                  '#eab308',
                ],
                'fill-opacity': 0.45 * opacity,
                'fill-antialias': true,
              },
            },
            beforeId
          );
          map.addLayer(
            {
              id: 'layer-gfw-oil-palm-line',
              type: 'line',
              source: sourceId,
              layout: { visibility: vis, 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': '#34d399',
                'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.8, 8, 1.6, 12, 2.5],
                'line-opacity': opacity,
              },
            },
            beforeId
          );
          map.addLayer(
            {
              id: 'layer-gfw-oil-palm-label',
              type: 'symbol',
              source: sourceId,
              minzoom: 7.5,
              layout: {
                visibility: vis,
                'text-field': ['coalesce', ['get', 'company'], ['get', 'name'], 'Konsesi Sawit'],
                'text-size': 10,
                'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                'text-max-width': 12,
              },
              paint: {
                'text-color': '#ecfdf5',
                'text-halo-color': '#022c22',
                'text-halo-width': 1.5,
              },
            },
            beforeId
          );
          map.on('click', 'layer-gfw-oil-palm-fill', (e: MapLayerMouseEvent) => {
            const priorityLayers = [
              'quakes-circle-layer',
              'layer-weather-air-quality-circle',
              'layer-weather-rain-potential-circle',
              'layer-weather-bmkg-nowcast-fill',
              ...FIRMS_SENSOR_LAYERS.flatMap((s) => [s.clusterId, s.pointId]),
            ].filter((id) => Boolean(map.getLayer(id)));
            if (priorityLayers.length > 0 && map.queryRenderedFeatures(e.point, { layers: priorityLayers }).length > 0) {
              return;
            }
            const feat = e.features?.[0];
            if (!feat) return;
            const props = feat.properties as any;
            onSelectFeatureHandlerRef.current({
              type: 'coordinate',
              title: props.company || props.name || 'Konsesi Kelapa Sawit',
              coordinates: [e.lngLat.lng, e.lngLat.lat],
              data: {
                ...props,
                dataType: 'oil-palm-concession',
                geometryType: 'Polygon',
                provider: 'Data Konsesi Kelapa Sawit Indonesia (GFW / BPN)',
              },
            });
          });
          map.on('mouseenter', 'layer-gfw-oil-palm-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', 'layer-gfw-oil-palm-fill', () => { map.getCanvas().style.cursor = ''; });
        }
      } else if (layerId === 'gfw-peatlands') {
        let data: any = null;
        try {
          const res = await fetch('/api/gfw/peatlands-geojson');
          if (res.ok) data = await res.json();
        } catch (fetchErr) {
          console.warn('API peatlands failed, trying direct static fallback:', fetchErr);
        }
        if (!data || !data.features) {
          const fallbackRes = await fetch('/indonesia-peat-lands.geojson');
          if (fallbackRes.ok) data = await fallbackRes.json();
        }
        if (!data || !data.features) throw new Error('Data lahan gambut Indonesia tidak tersedia');

        const sourceId = 'source-gfw-peatlands';
        const beforeId = map.getLayer('layer-gfw-oil-palm-fill')
          ? 'layer-gfw-oil-palm-fill'
          : map.getLayer('quakes-glow-layer')
          ? 'quakes-glow-layer'
          : map.getLayer('quakes-circle-layer')
          ? 'quakes-circle-layer'
          : undefined;

        if (map.getSource(sourceId)) {
          (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
        } else {
          map.addSource(sourceId, {
            type: 'geojson',
            data,
            attribution: data.metadata?.attribution || 'Data Lahan Gambut Indonesia (KLHK / BBSDLP / GFW)',
          });
          const vis = layerVisibilityRef.current['gfw-peatlands'] ? 'visible' : 'none';
          map.addLayer(
            {
              id: 'layer-gfw-peatlands-fill',
              type: 'fill',
              source: sourceId,
              layout: { visibility: vis },
              paint: {
                'fill-color': [
                  'match',
                  ['coalesce', ['get', 'jenis_gambut'], ['get', 'layer_revi'], ''],
                  'Gambut Tipis', '#eab308',
                  'gambut tipis', '#eab308',
                  'Gambut 40 cm', '#ca8a04',
                  'gambut 40cm', '#ca8a04',
                  'Tanah Mineral', '#78716c',
                  'tanah mineral (bukan', '#78716c',
                  '#b45309',
                ],
                'fill-opacity': 0.42 * opacity,
                'fill-antialias': true,
              },
            },
            beforeId
          );
          map.addLayer(
            {
              id: 'layer-gfw-peatlands-line',
              type: 'line',
              source: sourceId,
              layout: { visibility: vis, 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': '#f59e0b',
                'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.7, 8, 1.4, 12, 2.2],
                'line-opacity': opacity,
              },
            },
            beforeId
          );
          map.on('click', 'layer-gfw-peatlands-fill', (e: MapLayerMouseEvent) => {
            const priorityLayers = [
              'quakes-circle-layer',
              'layer-weather-air-quality-circle',
              'layer-weather-rain-potential-circle',
              'layer-weather-bmkg-nowcast-fill',
              'layer-gfw-oil-palm-fill',
              'layer-gfw-mangrove-extent-fill',
              'layer-gfw-wood-fiber-fill',
              ...FIRMS_SENSOR_LAYERS.flatMap((s) => [s.clusterId, s.pointId]),
            ].filter((id) => Boolean(map.getLayer(id)));
            if (priorityLayers.length > 0 && map.queryRenderedFeatures(e.point, { layers: priorityLayers }).length > 0) {
              return;
            }
            const feat = e.features?.[0];
            if (!feat) return;
            const props = feat.properties as any;
            onSelectFeatureHandlerRef.current({
              type: 'coordinate',
              title: `Kawasan Lahan Gambut #${props.objectid || props.objectid_1 || ''}`,
              coordinates: [e.lngLat.lng, e.lngLat.lat],
              data: {
                ...props,
                dataType: 'peatland-area',
                geometryType: feat.geometry?.type || 'MultiPolygon',
                provider: 'Data Lahan Gambut Indonesia (KLHK / BBSDLP / GFW)',
              },
            });
          });
          map.on('mouseenter', 'layer-gfw-peatlands-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', 'layer-gfw-peatlands-fill', () => { map.getCanvas().style.cursor = ''; });
        }
      } else if (layerId === 'gfw-mangrove-extent') {
        const beforeId = map.getLayer('quakes-glow-layer')
          ? 'quakes-glow-layer'
          : map.getLayer('quakes-circle-layer')
          ? 'quakes-circle-layer'
          : undefined;

        const rasterSourceId = 'source-gfw-mangrove-extent-raster';
        const vis = layerVisibilityRef.current['gfw-mangrove-extent'] ? 'visible' : 'none';
        if (!map.getSource(rasterSourceId)) {
          map.addSource(rasterSourceId, {
            type: 'raster',
            tiles: ['/api/mangrove/tiles/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: 'BIG Kebijakan Satu Peta (Layer 57) / UNEP-WCMC / GMW / GFW',
          });
          map.addLayer(
            {
              id: 'layer-gfw-mangrove-extent-raster',
              type: 'raster',
              source: rasterSourceId,
              layout: { visibility: vis },
              paint: {
                'raster-opacity': 0.65 * opacity,
                'raster-fade-duration': 150,
              },
            },
            beforeId
          );
        }

        let data: any = null;
        try {
          const res = await fetch('/api/mangrove/extent-geojson');
          if (res.ok) data = await res.json();
        } catch (fetchErr) {
          console.warn('API mangrove extent failed, trying direct static fallback:', fetchErr);
        }
        if (!data || !data.features) {
          const fallbackRes = await fetch('/indonesia-mangrove-extent.geojson');
          if (fallbackRes.ok) data = await fallbackRes.json();
        }
        if (!data || !data.features) throw new Error('Data sebaran habitat mangrove Indonesia tidak tersedia');

        const sourceId = 'source-gfw-mangrove-extent';
        if (map.getSource(sourceId)) {
          (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
        } else {
          map.addSource(sourceId, {
            type: 'geojson',
            data,
            attribution: data.metadata?.attribution || 'BIG Satu Peta Layer 57 & Global Mangrove Watch (UNEP-WCMC / GFW)',
          });
          map.addLayer(
            {
              id: 'layer-gfw-mangrove-extent-glow',
              type: 'line',
              source: sourceId,
              layout: { visibility: vis, 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': '#2dd4bf',
                'line-width': ['interpolate', ['linear'], ['zoom'], 4, 3.5, 8, 6, 12, 9],
                'line-blur': 3,
                'line-opacity': 0.38 * opacity,
              },
            },
            beforeId
          );
          map.addLayer(
            {
              id: 'layer-gfw-mangrove-extent-fill',
              type: 'fill',
              source: sourceId,
              layout: { visibility: vis },
              paint: {
                'fill-color': [
                  'match',
                  ['coalesce', ['get', 'kerapatan'], ['get', 'kttj'], ''],
                  'Lebat', '#14b8a6',
                  'Mangrove Lebat (>70%)', '#14b8a6',
                  'Sedang', '#22c55e',
                  'Mangrove Sedang (30-70%)', '#22c55e',
                  'Jarang', '#84cc16',
                  'Mangrove Jarang (<30%)', '#84cc16',
                  '#14b8a6',
                ],
                'fill-opacity': 0.55 * opacity,
                'fill-antialias': true,
              },
            },
            beforeId
          );
          map.addLayer(
            {
              id: 'layer-gfw-mangrove-extent-line',
              type: 'line',
              source: sourceId,
              layout: { visibility: vis, 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': '#5eead4',
                'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.2, 8, 2.0, 12, 3.0],
                'line-opacity': opacity,
              },
            },
            beforeId
          );
          map.addLayer(
            {
              id: 'layer-gfw-mangrove-extent-label',
              type: 'symbol',
              source: sourceId,
              minzoom: 5.5,
              layout: {
                visibility: vis,
                'text-field': [
                  'concat',
                  ['coalesce', ['get', 'nama_kawasan'], 'Habitat Mangrove'],
                  '\n',
                  ['to-string', ['coalesce', ['get', 'lsmgr'], ['get', 'area_ha'], 0]],
                  ' Ha',
                ],
                'text-size': ['interpolate', ['linear'], ['zoom'], 5.5, 9.5, 9, 11.5],
                'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                'text-max-width': 13,
              },
              paint: {
                'text-color': '#ccfbf1',
                'text-halo-color': '#042f2e',
                'text-halo-width': 1.8,
              },
            },
            beforeId
          );
          map.on('click', 'layer-gfw-mangrove-extent-fill', (e: MapLayerMouseEvent) => {
            const priorityLayers = [
              'quakes-circle-layer',
              'layer-weather-air-quality-circle',
              'layer-weather-rain-potential-circle',
              'layer-weather-bmkg-nowcast-fill',
              ...FIRMS_SENSOR_LAYERS.flatMap((s) => [s.clusterId, s.pointId]),
            ].filter((id) => Boolean(map.getLayer(id)));
            if (priorityLayers.length > 0 && map.queryRenderedFeatures(e.point, { layers: priorityLayers }).length > 0) {
              return;
            }
            const feat = e.features?.[0];
            if (!feat) return;
            const props = feat.properties as any;
            onSelectFeatureHandlerRef.current({
              type: 'coordinate',
              title: props.nama_kawasan || 'Kawasan Habitat Mangrove',
              coordinates: [e.lngLat.lng, e.lngLat.lat],
              data: {
                ...props,
                dataType: 'mangrove-extent',
                geometryType: feat.geometry?.type || 'Polygon',
                provider: 'BIG Satu Peta (Layer 57) & Global Mangrove Watch (GMW v3.0)',
              },
            });
          });
          map.on('mouseenter', 'layer-gfw-mangrove-extent-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', 'layer-gfw-mangrove-extent-fill', () => { map.getCanvas().style.cursor = ''; });
        }
      } else if (layerId === 'gfw-wood-fiber-concessions') {
        let data: any = null;
        try {
          const res = await fetch('/api/gfw/wood-fiber-concessions');
          if (res.ok) data = await res.json();
        } catch (fetchErr) {
          console.warn('API wood fiber failed, trying direct static fallback:', fetchErr);
        }
        if (!data || !data.features) {
          const fallbackRes = await fetch('/indonesia-wood-fiber-concessions.geojson');
          if (fallbackRes.ok) data = await fallbackRes.json();
        }
        if (!data || !data.features) throw new Error('Data konsesi serat kayu (HTI) Indonesia tidak tersedia');

        const sourceId = 'source-gfw-wood-fiber';
        const beforeId = map.getLayer('quakes-glow-layer')
          ? 'quakes-glow-layer'
          : map.getLayer('quakes-circle-layer')
          ? 'quakes-circle-layer'
          : undefined;

        if (map.getSource(sourceId)) {
          (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
        } else {
          map.addSource(sourceId, {
            type: 'geojson',
            data,
            attribution: data.metadata?.attribution || 'Data Konsesi Serat Kayu / HTI Indonesia (KLHK / GFW)',
          });
          const vis = layerVisibilityRef.current['gfw-wood-fiber-concessions'] ? 'visible' : 'none';
          map.addLayer(
            {
              id: 'layer-gfw-wood-fiber-fill',
              type: 'fill',
              source: sourceId,
              layout: { visibility: vis },
              paint: {
                'fill-color': [
                  'match',
                  ['coalesce', ['get', 'kategori_grup'], ''],
                  'Sinar Mas / APP', '#f43f5e',
                  'APRIL / RGE', '#a855f7',
                  'BUMN Inhutani & Grup Korporasi', '#f97316',
                  '#facc15',
                ],
                'fill-opacity': 0.46 * opacity,
                'fill-antialias': true,
              },
            },
            beforeId
          );
          map.addLayer(
            {
              id: 'layer-gfw-wood-fiber-line',
              type: 'line',
              source: sourceId,
              layout: { visibility: vis, 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': '#fde047',
                'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.8, 8, 1.5, 12, 2.4],
                'line-opacity': opacity,
              },
            },
            beforeId
          );
          map.addLayer(
            {
              id: 'layer-gfw-wood-fiber-label',
              type: 'symbol',
              source: sourceId,
              minzoom: 7,
              layout: {
                visibility: vis,
                'text-field': ['coalesce', ['get', 'name'], 'Konsesi Serat Kayu'],
                'text-size': 10,
                'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                'text-max-width': 12,
              },
              paint: {
                'text-color': '#fef9c3',
                'text-halo-color': '#114232',
                'text-halo-width': 1.6,
              },
            },
            beforeId
          );
          map.on('click', 'layer-gfw-wood-fiber-fill', (e: MapLayerMouseEvent) => {
            const priorityLayers = [
              'quakes-circle-layer',
              'layer-weather-air-quality-circle',
              'layer-weather-rain-potential-circle',
              'layer-weather-bmkg-nowcast-fill',
              ...FIRMS_SENSOR_LAYERS.flatMap((s) => [s.clusterId, s.pointId]),
            ].filter((id) => Boolean(map.getLayer(id)));
            if (priorityLayers.length > 0 && map.queryRenderedFeatures(e.point, { layers: priorityLayers }).length > 0) {
              return;
            }
            const feat = e.features?.[0];
            if (!feat) return;
            const props = feat.properties as any;
            onSelectFeatureHandlerRef.current({
              type: 'coordinate',
              title: props.name || 'Konsesi Serat Kayu (HTI)',
              coordinates: [e.lngLat.lng, e.lngLat.lat],
              data: {
                ...props,
                dataType: 'wood-fiber-concession',
                geometryType: feat.geometry?.type || 'MultiPolygon',
                provider: 'Data Konsesi Serat Kayu / HTI Indonesia (KLHK / GFW)',
              },
            });
          });
          map.on('mouseenter', 'layer-gfw-wood-fiber-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', 'layer-gfw-wood-fiber-fill', () => { map.getCanvas().style.cursor = ''; });
        }
      }
    } catch (err) {
      loadedGeoJsonWeatherRef.current.delete(layerId);
      console.warn(`Failed to load ${layerId}:`, err);
    }
  }, [mapLoaded]);

  // NASA FIRMS NRT data refreshes periodically; each satellite is queried
  // separately so one failed upstream endpoint does not block the others.
  useEffect(() => {
    if (!mapLoaded) return;
    const refreshId = window.setInterval(() => {
      void loadHotspotsLayers(true);
    }, 15 * 60 * 1000);
    return () => window.clearInterval(refreshId);
  }, [mapLoaded, loadHotspotsLayers]);

  // 7. Manage Thematic Layers (Visibility, Opacity, WMS/Raster)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    layers.forEach((layer) => {
      const layerId = `layer-${layer.id}`;
      const sourceId = `source-${layer.id}`;

      // Earthquake GeoJSON layer toggle
      if (layer.id === 'disaster-bmkg-quakes') {
        const vis = layer.visible ? 'visible' : 'none';
        if (map.getLayer('quakes-circle-layer')) {
          map.setLayoutProperty('quakes-circle-layer', 'visibility', vis);
          map.setPaintProperty('quakes-circle-layer', 'circle-opacity', layer.opacity);
        }
        if (map.getLayer('quakes-label-layer')) {
          map.setLayoutProperty('quakes-label-layer', 'visibility', vis);
        }
        return;
      }

      // Individual FIRMS sensor layers are managed together below.
      if (FIRMS_SENSOR_LAYERS.some((sensor) => sensor.layerId === layer.id)) return;

      // Province Boundaries layer toggle
      if (layer.id === 'admin-provinces') {
        const vis = layer.visible ? 'visible' : 'none';
        if (map.getLayer('provinces-fill-layer')) {
          map.setLayoutProperty('provinces-fill-layer', 'visibility', vis);
          map.setPaintProperty('provinces-fill-layer', 'fill-opacity', 0.07 * layer.opacity);
        }
        if (map.getLayer('provinces-hover-fill-layer')) {
          map.setLayoutProperty('provinces-hover-fill-layer', 'visibility', vis);
        }
        if (map.getLayer('provinces-line-casing-layer')) {
          map.setLayoutProperty('provinces-line-casing-layer', 'visibility', vis);
          map.setPaintProperty('provinces-line-casing-layer', 'line-opacity', 0.7 * layer.opacity);
        }
        if (map.getLayer('provinces-line-layer')) {
          map.setLayoutProperty('provinces-line-layer', 'visibility', vis);
          map.setPaintProperty('provinces-line-layer', 'line-opacity', 0.9 * layer.opacity);
        }
        if (map.getLayer('provinces-hover-line-layer')) {
          map.setLayoutProperty('provinces-hover-line-layer', 'visibility', vis);
        }
        if (map.getLayer('provinces-label-layer')) {
          map.setLayoutProperty('provinces-label-layer', 'visibility', vis);
        }
        return;
      }

      // Weather, Air Quality, Oil Palm Concessions, Peatlands, Mangrove & Wood Fiber GeoJSON layers
      if (['weather-air-quality', 'weather-rain-potential', 'weather-bmkg-nowcast', 'gfw-oil-palm', 'gfw-peatlands', 'gfw-mangrove-extent', 'gfw-wood-fiber-concessions'].includes(layer.id)) {
        const vis = layer.visible ? 'visible' : 'none';
        if (layer.visible && !loadedGeoJsonWeatherRef.current.has(layer.id)) {
          void loadWeatherGeoJsonLayer(layer.id, layer.opacity);
        }
        if (layer.id === 'weather-air-quality') {
          if (map.getLayer('layer-weather-air-quality-glow')) {
            map.setLayoutProperty('layer-weather-air-quality-glow', 'visibility', vis);
            map.setPaintProperty('layer-weather-air-quality-glow', 'circle-opacity', 0.28 * layer.opacity);
          }
          if (map.getLayer('layer-weather-air-quality-circle')) {
            map.setLayoutProperty('layer-weather-air-quality-circle', 'visibility', vis);
            map.setPaintProperty('layer-weather-air-quality-circle', 'circle-opacity', layer.opacity);
          }
          if (map.getLayer('layer-weather-air-quality-label')) {
            map.setLayoutProperty('layer-weather-air-quality-label', 'visibility', vis);
          }
        } else if (layer.id === 'weather-rain-potential') {
          if (map.getLayer('layer-weather-rain-potential-glow')) {
            map.setLayoutProperty('layer-weather-rain-potential-glow', 'visibility', vis);
            map.setPaintProperty('layer-weather-rain-potential-glow', 'circle-opacity', 0.25 * layer.opacity);
          }
          if (map.getLayer('layer-weather-rain-potential-circle')) {
            map.setLayoutProperty('layer-weather-rain-potential-circle', 'visibility', vis);
            map.setPaintProperty('layer-weather-rain-potential-circle', 'circle-opacity', layer.opacity);
          }
          if (map.getLayer('layer-weather-rain-potential-label')) {
            map.setLayoutProperty('layer-weather-rain-potential-label', 'visibility', vis);
          }
        } else if (layer.id === 'weather-bmkg-nowcast') {
          if (map.getLayer('layer-weather-bmkg-nowcast-fill')) {
            map.setLayoutProperty('layer-weather-bmkg-nowcast-fill', 'visibility', vis);
            map.setPaintProperty('layer-weather-bmkg-nowcast-fill', 'fill-opacity', layer.opacity);
          }
          if (map.getLayer('layer-weather-bmkg-nowcast-line')) {
            map.setLayoutProperty('layer-weather-bmkg-nowcast-line', 'visibility', vis);
          }
          if (map.getLayer('layer-weather-bmkg-nowcast-label')) {
            map.setLayoutProperty('layer-weather-bmkg-nowcast-label', 'visibility', vis);
          }
        } else if (layer.id === 'gfw-oil-palm') {
          if (map.getLayer('layer-gfw-oil-palm-fill')) {
            map.setLayoutProperty('layer-gfw-oil-palm-fill', 'visibility', vis);
            map.setPaintProperty('layer-gfw-oil-palm-fill', 'fill-opacity', 0.45 * layer.opacity);
          }
          if (map.getLayer('layer-gfw-oil-palm-line')) {
            map.setLayoutProperty('layer-gfw-oil-palm-line', 'visibility', vis);
            map.setPaintProperty('layer-gfw-oil-palm-line', 'line-opacity', layer.opacity);
          }
          if (map.getLayer('layer-gfw-oil-palm-label')) {
            map.setLayoutProperty('layer-gfw-oil-palm-label', 'visibility', vis);
          }
        } else if (layer.id === 'gfw-peatlands') {
          if (map.getLayer('layer-gfw-peatlands-fill')) {
            map.setLayoutProperty('layer-gfw-peatlands-fill', 'visibility', vis);
            map.setPaintProperty('layer-gfw-peatlands-fill', 'fill-opacity', 0.42 * layer.opacity);
          }
          if (map.getLayer('layer-gfw-peatlands-line')) {
            map.setLayoutProperty('layer-gfw-peatlands-line', 'visibility', vis);
            map.setPaintProperty('layer-gfw-peatlands-line', 'line-opacity', layer.opacity);
          }
        } else if (layer.id === 'gfw-mangrove-extent') {
          if (map.getLayer('layer-gfw-mangrove-extent-raster')) {
            map.setLayoutProperty('layer-gfw-mangrove-extent-raster', 'visibility', vis);
            map.setPaintProperty('layer-gfw-mangrove-extent-raster', 'raster-opacity', 0.65 * layer.opacity);
          }
          if (map.getLayer('layer-gfw-mangrove-extent-glow')) {
            map.setLayoutProperty('layer-gfw-mangrove-extent-glow', 'visibility', vis);
            map.setPaintProperty('layer-gfw-mangrove-extent-glow', 'line-opacity', 0.38 * layer.opacity);
          }
          if (map.getLayer('layer-gfw-mangrove-extent-fill')) {
            map.setLayoutProperty('layer-gfw-mangrove-extent-fill', 'visibility', vis);
            map.setPaintProperty('layer-gfw-mangrove-extent-fill', 'fill-opacity', 0.55 * layer.opacity);
          }
          if (map.getLayer('layer-gfw-mangrove-extent-line')) {
            map.setLayoutProperty('layer-gfw-mangrove-extent-line', 'visibility', vis);
            map.setPaintProperty('layer-gfw-mangrove-extent-line', 'line-opacity', layer.opacity);
          }
          if (map.getLayer('layer-gfw-mangrove-extent-label')) {
            map.setLayoutProperty('layer-gfw-mangrove-extent-label', 'visibility', vis);
          }
        } else if (layer.id === 'gfw-wood-fiber-concessions') {
          if (map.getLayer('layer-gfw-wood-fiber-fill')) {
            map.setLayoutProperty('layer-gfw-wood-fiber-fill', 'visibility', vis);
            map.setPaintProperty('layer-gfw-wood-fiber-fill', 'fill-opacity', 0.46 * layer.opacity);
          }
          if (map.getLayer('layer-gfw-wood-fiber-line')) {
            map.setLayoutProperty('layer-gfw-wood-fiber-line', 'visibility', vis);
            map.setPaintProperty('layer-gfw-wood-fiber-line', 'line-opacity', layer.opacity);
          }
          if (map.getLayer('layer-gfw-wood-fiber-label')) {
            map.setLayoutProperty('layer-gfw-wood-fiber-label', 'visibility', vis);
          }
        }
        return;
      }

      // Canvas layers (like wind particles) are handled outside MapLibre layers
      if (layer.type === 'canvas') {
        return;
      }

      // WMS layer (NASA FIRMS)
      if (layer.type === 'wms' && layer.wmsUrl) {
        if (layer.visible) {
          if (!map.getSource(sourceId)) {
            // MapLibre WMS requires {bbox-epsg-3857}
            const wmsTileUrl = `${layer.wmsUrl}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=fires_viirs_snpp_24&STYLES=&FORMAT=image/png&TRANSPARENT=TRUE&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}`;
            map.addSource(sourceId, {
              type: 'raster',
              tiles: [wmsTileUrl],
              tileSize: 256,
            });
            map.addLayer({
              id: layerId,
              type: 'raster',
              source: sourceId,
              paint: { 'raster-opacity': layer.opacity },
            });
          } else {
            if (map.getLayer(layerId)) {
              map.setLayoutProperty(layerId, 'visibility', 'visible');
              map.setPaintProperty(layerId, 'raster-opacity', layer.opacity);
            }
          }
        } else {
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, 'visibility', 'none');
          }
        }
        return;
      }

      // Standard XYZ Raster layers
      if (layer.type === 'raster' && layer.tiles && layer.tiles.length > 0) {
        // Handle NASA GIBS date parameter substitution
        const todayUtc = new Date().toISOString().slice(0, 10);
        const validDate = currentDate > todayUtc ? todayUtc : currentDate;
        const tilesWithDate = layer.tiles.map((t) => t.replace(/\{DATE\}/g, validDate));

        if (layer.visible) {
          if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
              type: 'raster',
              tiles: tilesWithDate,
              tileSize: 256,
              attribution: layer.attribution || layer.metadata.provider,
            });
            map.addLayer({
              id: layerId,
              type: 'raster',
              source: sourceId,
              paint: { 'raster-opacity': layer.opacity },
            });
          } else {
            // Update date-dependent tile template when the timeline changes.
            const source = map.getSource(sourceId) as any;
            if (source?.setTiles) source.setTiles(tilesWithDate);
            if (map.getLayer(layerId)) {
              map.setLayoutProperty(layerId, 'visibility', 'visible');
              map.setPaintProperty(layerId, 'raster-opacity', layer.opacity);
            }
          }
        } else {
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, 'visibility', 'none');
          }
        }
      }
    });

    // Each VIIRS sensor can be switched on/off independently.
    FIRMS_SENSOR_LAYERS.forEach((sensor) => {
      const layer = layers.find((candidate) => candidate.id === sensor.layerId);
      const visibility = layer?.visible ? 'visible' : 'none';
      const opacity = layer?.opacity ?? 0.9;
      for (const mapLayerId of [sensor.clusterId, sensor.countId, sensor.pointId]) {
        if (map.getLayer(mapLayerId)) map.setLayoutProperty(mapLayerId, 'visibility', visibility);
      }
      if (map.getLayer(sensor.clusterId)) map.setPaintProperty(sensor.clusterId, 'circle-opacity', opacity);
      if (map.getLayer(sensor.pointId)) map.setPaintProperty(sensor.pointId, 'circle-opacity', opacity);
    });
  }, [layers, mapLoaded, currentDate, loadWeatherGeoJsonLayer]);

  // GFW official vector tile layers. Source-layer names are obtained from the
  // official GFW Tile Cache root/style metadata; never guess a protobuf layer name.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    let cancelled = false;
    const vectorLayers = layers.filter(
      (layer) =>
        layer.type === 'vector-tiles' &&
        layer.vectorDataset &&
        layer.id !== 'gfw-oil-palm' &&
        layer.id !== 'gfw-wood-fiber-concessions'
    );
    const sync = async () => {
      for (const layer of vectorLayers) {
        const sourceId = `gfw-vector-source-${layer.id}`;
        const prefix = `gfw-vector-${layer.id}-`;
        const styleLayers = (map.getStyle().layers || []).filter((item) => item.id.startsWith(prefix));
        if (!layer.visible) {
          styleLayers.forEach((item) => map.setLayoutProperty(item.id, 'visibility', 'none'));
          continue;
        }
        if (!map.getSource(sourceId)) {
          try {
            const metadataResponse = await fetch(`/api/gfw/vector-style/${encodeURIComponent(layer.vectorDataset!)}`);
            const metadata = await metadataResponse.json();
            if (!metadataResponse.ok) throw new Error(metadata?.errors?.join('; ') || metadata?.error || `GFW vector metadata ${metadataResponse.status}`);
            const sourceLayers: string[] = Array.isArray(metadata.sourceLayers) ? metadata.sourceLayers : [];
            if (!sourceLayers.length) throw new Error('GFW tidak memberikan source-layer metadata; layer tidak dibuat agar tidak tampil kosong.');
            if (cancelled) return;
            map.addSource(sourceId, {
              type: 'vector',
              tiles: [`/api/gfw/vector-tiles/${encodeURIComponent(layer.vectorDataset!)}/{z}/{x}/{y}.pbf`],
              minzoom: 0,
              maxzoom: 22,
              attribution: layer.metadata.attribution || 'Global Forest Watch',
            });
            const color = layer.id.includes('mill') ? '#f59e0b'
              : layer.id.includes('wood') ? '#b45309'
              : layer.id.includes('oil-palm') ? '#84cc16'
              : layer.id.includes('plantations') ? '#16a34a' : '#a855f7';
            sourceLayers.forEach((sourceLayer, index) => {
              const safe = sourceLayer.replace(/[^a-zA-Z0-9_-]/g, '-');
              const fillId = `${prefix}${safe}-${index}-fill`;
              const lineId = `${prefix}${safe}-${index}-line`;
              const circleId = `${prefix}${safe}-${index}-circle`;
              map.addLayer({
                id: fillId, type: 'fill', source: sourceId, 'source-layer': sourceLayer,
                filter: ['==', ['geometry-type'], 'Polygon'],
                paint: { 'fill-color': color, 'fill-opacity': 0.17 * layer.opacity, 'fill-antialias': true },
              });
              map.addLayer({
                id: lineId, type: 'line', source: sourceId, 'source-layer': sourceLayer,
                filter: ['==', ['geometry-type'], 'LineString'],
                paint: { 'line-color': color, 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.6, 8, 1.4, 13, 2.4], 'line-opacity': layer.opacity },
              });
              map.addLayer({
                id: circleId, type: 'circle', source: sourceId, 'source-layer': sourceLayer,
                filter: ['==', ['geometry-type'], 'Point'],
                paint: { 'circle-color': color, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 2.5, 8, 5, 13, 7], 'circle-opacity': layer.opacity, 'circle-stroke-color': '#0f172a', 'circle-stroke-width': 1 },
              });
              const inspect = (event: MapLayerMouseEvent) => {
                const feature = event.features?.[0];
                if (!feature) return;
                onSelectFeatureHandlerRef.current({
                  type: 'coordinate',
                  title: String(feature.properties?.name || feature.properties?.nama || feature.properties?.company || feature.properties?.mill_name || layer.name),
                  coordinates: [event.lngLat.lng, event.lngLat.lat],
                  data: { ...feature.properties, provider: layer.metadata.provider, attribution: layer.metadata.attribution, sourceUrl: layer.metadata.sourceUrl, vectorDataset: layer.vectorDataset, sourceLayer, geometryType: feature.geometry.type },
                });
              };
              for (const id of [fillId, lineId, circleId]) {
                map.on('click', id, inspect);
                map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
                map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
              }
            });
          } catch (error) {
            console.warn(`GFW vector layer ${layer.id} unavailable:`, error);
            continue;
          }
        }
        const currentStyleLayers = (map.getStyle().layers || []).filter((item) => item.id.startsWith(prefix));
        currentStyleLayers.forEach((item) => {
          map.setLayoutProperty(item.id, 'visibility', 'visible');
          if (item.type === 'fill') map.setPaintProperty(item.id, 'fill-opacity', 0.17 * layer.opacity);
          if (item.type === 'line') map.setPaintProperty(item.id, 'line-opacity', layer.opacity);
          if (item.type === 'circle') map.setPaintProperty(item.id, 'circle-opacity', layer.opacity);
        });
      }
    };
    void sync();
    return () => { cancelled = true; };
  }, [layers, mapLoaded]);

  // 7. Imported GeoJSON / Shapefile vector layers.
  // Every imported file is one logical source; geometry families are styled independently.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const activeIds = new Set(importedVectorLayers.map((layer) => layer.id));
    const existingVectorSources = Object.keys(map.getStyle().sources).filter((id) => id.startsWith('imported-vector-source-'));
    existingVectorSources.forEach((sourceId) => {
      const layerId = sourceId.replace('imported-vector-source-', '');
      if (activeIds.has(layerId)) return;
      const prefix = `imported-vector-${layerId}-`;
      map.getStyle().layers.filter((layer) => layer.id.startsWith(prefix)).forEach((layer) => map.removeLayer(layer.id));
      map.removeSource(sourceId);
      importedFingerprintsRef.current.delete(layerId);
    });

    const newLayerBounds: [number, number, number, number][] = [];
    importedVectorLayers.forEach((dataset) => {
      const prefix = `imported-vector-${dataset.id}-`;
      const sourceId = `imported-vector-source-${dataset.id}`;
      const sourceExists = Boolean(map.getSource(sourceId));
      if (sourceExists) {
        if (importedFingerprintsRef.current.get(dataset.id) !== dataset.fingerprint) {
          (map.getSource(sourceId) as GeoJSONSource).setData(dataset.data as any);
          importedFingerprintsRef.current.set(dataset.id, dataset.fingerprint);
        }
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: dataset.data as any,
          cluster: dataset.pointCount > 80,
          clusterMaxZoom: 13,
          clusterRadius: 52,
        });
        importedFingerprintsRef.current.set(dataset.id, dataset.fingerprint);

        const beforeId = map.getLayer('quakes-circle-layer') ? 'quakes-circle-layer' : undefined;
        const add = (definition: any) => map.addLayer(definition, beforeId);

        // Polygon fill is deliberately translucent so the basemap and overlapping themes remain legible.
        if (dataset.polygonCount > 0) {
          add({
            id: `${prefix}polygon-fill`,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': dataset.color,
              'fill-opacity': 0.34 * dataset.opacity,
              'fill-antialias': true,
            },
          });
          add({
            id: `${prefix}polygon-outline-casing`,
            type: 'line',
            source: sourceId,
            filter: ['==', ['geometry-type'], 'Polygon'],
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#07111f',
              'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1.4, 8, 2.6, 13, 4],
              'line-opacity': 0.65 * dataset.opacity,
            },
          });
          add({
            id: `${prefix}polygon-outline`,
            type: 'line',
            source: sourceId,
            filter: ['==', ['geometry-type'], 'Polygon'],
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': dataset.color,
              'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.55, 8, 1.15, 13, 1.8],
              'line-opacity': 0.98 * dataset.opacity,
            },
          });
          add({
            id: `${prefix}polygon-label`,
            type: 'symbol',
            source: sourceId,
            filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['!=', ['get', '_map_label'], '']],
            minzoom: 8,
            layout: {
              'text-field': ['get', '_map_label'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 8, 9, 12, 12, 15, 13],
              'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
              'text-max-width': 12,
              'text-allow-overlap': false,
              'text-ignore-placement': false,
              'symbol-placement': 'point',
            },
            paint: { 'text-color': '#f8fafc', 'text-halo-color': '#0f172a', 'text-halo-width': 1.6, 'text-opacity': 0.95 },
          });
        }

        if (dataset.lineCount > 0) {
          add({
            id: `${prefix}line-casing`,
            type: 'line',
            source: sourceId,
            filter: ['==', ['geometry-type'], 'LineString'],
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#07111f',
              'line-width': ['interpolate', ['linear'], ['zoom'], 3, 2, 9, 4, 14, 6],
              'line-opacity': 0.65 * dataset.opacity,
            },
          });
          add({
            id: `${prefix}line-stroke`,
            type: 'line',
            source: sourceId,
            filter: ['==', ['geometry-type'], 'LineString'],
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': dataset.color,
              'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1, 9, 2, 14, 3],
              'line-opacity': 0.98 * dataset.opacity,
            },
          });
          add({
            id: `${prefix}line-label`,
            type: 'symbol',
            source: sourceId,
            filter: ['all', ['==', ['geometry-type'], 'LineString'], ['!=', ['get', '_map_label'], '']],
            minzoom: 10,
            layout: {
              'symbol-placement': 'line',
              'text-field': ['get', '_map_label'],
              'text-size': 10,
              'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
              'text-keep-upright': true,
              'text-max-angle': 35,
            },
            paint: { 'text-color': '#f8fafc', 'text-halo-color': '#0f172a', 'text-halo-width': 1.5 },
          });
        }

        if (dataset.pointCount > 0) {
          if (dataset.pointCount > 80) {
            add({
              id: `${prefix}point-clusters`,
              type: 'circle',
              source: sourceId,
              filter: ['has', 'point_count'],
              paint: {
                'circle-color': ['step', ['get', 'point_count'], dataset.color, 25, '#f59e0b', 100, '#ef4444', 500, '#be123c'],
                'circle-radius': ['step', ['get', 'point_count'], 14, 25, 18, 100, 23, 500, 29],
                'circle-stroke-color': '#f8fafc',
                'circle-stroke-width': 1.5,
                'circle-opacity': 0.93,
              },
            });
            add({
              id: `${prefix}point-cluster-count`,
              type: 'symbol',
              source: sourceId,
              filter: ['has', 'point_count'],
              layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 11, 'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'] },
              paint: { 'text-color': '#ffffff', 'text-halo-color': '#0f172a', 'text-halo-width': 0.6 },
            });
          }
          add({
            id: `${prefix}point-circles`,
            type: 'circle',
            source: sourceId,
            filter: dataset.pointCount > 80 ? ['!', ['has', 'point_count']] : ['==', ['geometry-type'], 'Point'],
            paint: {
              'circle-color': dataset.color,
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 2.5, 7, 4, 11, 5.7, 16, 7.5],
              'circle-stroke-color': '#0b1220',
              'circle-stroke-width': 1.5,
              'circle-opacity': 0.96,
            },
          });
          add({
            id: `${prefix}point-label`,
            type: 'symbol',
            source: sourceId,
            filter: ['all', ['==', ['geometry-type'], 'Point'], ['!=', ['get', '_map_label'], '']],
            minzoom: 11,
            layout: {
              'text-field': ['get', '_map_label'],
              'text-size': 10,
              'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
              'text-offset': [0, 1.05],
              'text-anchor': 'top',
              'text-optional': true,
            },
            paint: { 'text-color': '#f8fafc', 'text-halo-color': '#0f172a', 'text-halo-width': 1.5 },
          });
        }
        newLayerBounds.push(dataset.bbox);
      }

      const renderIds = map.getStyle().layers.filter((layer) => layer.id.startsWith(prefix)).map((layer) => layer.id);
      for (const layerId of renderIds) {
        if (!map.getLayer(layerId)) continue;
        map.setLayoutProperty(layerId, 'visibility', dataset.visible ? 'visible' : 'none');
        if (layerId.endsWith('polygon-fill')) map.setPaintProperty(layerId, 'fill-opacity', 0.34 * dataset.opacity);
        if (layerId.endsWith('polygon-outline')) map.setPaintProperty(layerId, 'line-opacity', dataset.visible ? 0.98 * dataset.opacity : 0);
        if (layerId.endsWith('line-stroke')) map.setPaintProperty(layerId, 'line-opacity', dataset.visible ? 0.98 * dataset.opacity : 0);
        if (layerId.endsWith('line-casing') || layerId.endsWith('polygon-outline-casing')) map.setPaintProperty(layerId, 'line-opacity', dataset.visible ? 0.65 * dataset.opacity : 0);
        if (layerId.endsWith('point-circles')) map.setPaintProperty(layerId, 'circle-opacity', dataset.opacity);
        if (layerId.endsWith('point-clusters')) map.setPaintProperty(layerId, 'circle-opacity', dataset.opacity);
        if (layerId.endsWith('polygon-label') || layerId.endsWith('line-label') || layerId.endsWith('point-label')) {
          map.setLayoutProperty(layerId, 'visibility', dataset.visible && dataset.showLabels ? 'visible' : 'none');
        }
      }
    });

    if (newLayerBounds.length) {
      const combined: [number, number, number, number] = [
        Math.min(...newLayerBounds.map((bounds) => bounds[0])),
        Math.min(...newLayerBounds.map((bounds) => bounds[1])),
        Math.max(...newLayerBounds.map((bounds) => bounds[2])),
        Math.max(...newLayerBounds.map((bounds) => bounds[3])),
      ];
      const [west, south, east, north] = combined;
      const fitWest = Math.abs(east - west) < 0.0001 ? west - 0.02 : west;
      const fitEast = Math.abs(east - west) < 0.0001 ? east + 0.02 : east;
      const fitSouth = Math.abs(north - south) < 0.0001 ? south - 0.02 : south;
      const fitNorth = Math.abs(north - south) < 0.0001 ? north + 0.02 : north;
      map.fitBounds([[fitWest, fitSouth], [fitEast, fitNorth]], {
        padding: { top: 88, right: 90, bottom: 105, left: 90 },
        maxZoom: newLayerBounds.length === 1 ? 11 : 8,
        duration: 900,
      });
    }
  }, [importedVectorLayers, mapLoaded]);

  // 7. Click on Map Handler (Identify Weather Point or Measure)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const handleMapClick = async (e: MapLayerMouseEvent) => {
      // If measurement mode is active, handle measurement point addition
      if (measureMode !== 'none') {
        const newPt: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        setMeasurePoints((prev) => {
          const updated = [...prev, newPt];
          if (measureMode === 'distance') {
            const dist = calculateDistanceKm(updated);
            setMeasureResult(`Jarak Total: ${formatDistance(dist)} (${updated.length} Titik)`);
          } else if (measureMode === 'area') {
            const { sqKm, hectares } = calculateAreaKm2(updated);
            setMeasureResult(`Luas Wilayah: ${formatArea(sqKm, hectares)} (${updated.length} Titik)`);
          }
          return updated;
        });
        return;
      }

      // If clicked on an existing feature, the feature layer handler will catch it.
      // Check if user clicked on blank map to identify point weather:
      const activePointLayers = [
        'quakes-circle-layer',
        'layer-weather-air-quality-circle',
        'layer-weather-rain-potential-circle',
        'layer-weather-bmkg-nowcast-fill',
        'layer-gfw-oil-palm-fill',
        'layer-gfw-peatlands-fill',
        'layer-gfw-mangrove-extent-fill',
        'layer-gfw-wood-fiber-fill',
      ].filter((id) => Boolean(map.getLayer(id)));
      if (activePointLayers.length > 0 && map.queryRenderedFeatures(e.point, { layers: activePointLayers }).length > 0) {
        return;
      }

      const hotspotHitLayerIds = FIRMS_SENSOR_LAYERS.flatMap((sensor) => [sensor.clusterId, sensor.pointId]).filter((id) => Boolean(map.getLayer(id)));
      const clickedHotspots = hotspotHitLayerIds.length
        ? map.queryRenderedFeatures(e.point, { layers: hotspotHitLayerIds })
        : [];
      if (clickedHotspots.length > 0) return;

      const provinceHitLayers = ['provinces-line-layer', 'provinces-fill-layer'].filter((id) => Boolean(map.getLayer(id)));
      if (provinceHitLayers.length > 0 && map.queryRenderedFeatures(e.point, { layers: provinceHitLayers }).length > 0) {
        return;
      }

      const adminPolygonLayerIds = ['admin-kabkota-fill', 'admin-kecamatan-fill'].filter((id) => Boolean(map.getLayer(id)));
      if (adminPolygonLayerIds.length > 0) {
        const clickedAdminPolygons = map.queryRenderedFeatures(e.point, { layers: adminPolygonLayerIds });
        if (clickedAdminPolygons.length > 0) return;
      }

      const importedClusterIds = importedVectorLayers.filter((layer) => layer.visible && layer.pointCount > 80).map((layer) => `imported-vector-${layer.id}-point-clusters`).filter((id) => Boolean(map.getLayer(id)));
      if (importedClusterIds.length) {
        const clusterHit = map.queryRenderedFeatures(e.point, { layers: importedClusterIds })[0];
        if (clusterHit) {
          const sourceId = `imported-vector-${importedVectorLayers.find((layer) => `imported-vector-${layer.id}-point-clusters` === clusterHit.layer.id)?.id}`;
          const source = map.getSource(sourceId) as any;
          const clusterId = clusterHit.properties?.cluster_id;
          if (source?.getClusterExpansionZoom && clusterId !== undefined) {
            source.getClusterExpansionZoom(clusterId, (error: Error | null, zoom: number) => {
              if (error) return;
              map.easeTo({ center: (clusterHit.geometry as any).coordinates, zoom: Math.min(zoom, 16), duration: 550 });
            });
            return;
          }
        }
      }

      const importedLayerIds = importedVectorLayers.filter((layer) => layer.visible).flatMap((layer) => {
        const prefix = `imported-vector-${layer.id}-`;
        return map.getStyle().layers.filter((styleLayer) => styleLayer.id.startsWith(prefix) && !styleLayer.id.endsWith('label') && !styleLayer.id.endsWith('cluster-count')).map((styleLayer) => styleLayer.id);
      });
      if (importedLayerIds.length) {
        const importedHits = map.queryRenderedFeatures(e.point, { layers: importedLayerIds });
        if (importedHits[0]) {
          const hit = importedHits[0];
          const properties = hit.properties || {};
          const label = properties._map_label || properties.name || properties.nama || properties.NAMOBJ || 'Fitur vektor';
          onSelectFeature({
            type: 'coordinate',
            title: String(label),
            coordinates: [e.lngLat.lng, e.lngLat.lat],
            data: { ...properties, geometryType: hit.geometry.type, source: 'File lokal GeoJSON/Shapefile', clickedAt: new Date().toISOString() },
          });
          return;
        }
      }

      // If another rendered vector feature (CAP warning, RBI boundary, etc.)
      // is under the pointer, its dedicated layer handler owns the inspection.
      const nonRasterHits = map.queryRenderedFeatures(e.point).filter((feature) => {
        const styleLayer = map.getLayer(feature.layer.id);
        return Boolean(styleLayer && styleLayer.type !== 'raster');
      });
      if (nonRasterHits.length) return;

      // Query visible BIG/GFW ArcGIS overlays so the inspector receives true
      // feature attributes instead of only the raster tile image.
      const activeArcgisLayers = layers
        .filter((layer) => layer.visible && layer.type === 'raster' && layer.tiles?.some((tile) => tile.startsWith('/api/arcgis/tiles/')))
        .slice(-8);
      if (activeArcgisLayers.length) {
        const bounds = map.getBounds();
        const extent = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(',');
        const canvas = map.getCanvas();
        const identifyResponses = await Promise.allSettled(activeArcgisLayers.map(async (layer) => {
          const tileTemplate = layer.tiles?.find((tile) => tile.startsWith('/api/arcgis/tiles/'));
          const serviceId = tileTemplate?.match(/^\/api\/arcgis\/tiles\/([^/]+)/)?.[1];
          if (!serviceId) return null;
          const query = new URLSearchParams({
            lon: String(Number(e.lngLat.lng.toFixed(6))),
            lat: String(Number(e.lngLat.lat.toFixed(6))),
            extent,
            width: String(canvas.clientWidth || 1024),
            height: String(canvas.clientHeight || 768),
            dpi: '96',
          });
          const response = await fetch(`/api/arcgis/identify/${encodeURIComponent(serviceId)}?${query.toString()}`);
          if (!response.ok) return null;
          const payload = await response.json();
          return { layer, payload };
        }));

        const identified = identifyResponses
          .filter((entry): entry is PromiseFulfilledResult<{ layer: LayerDefinition; payload: any }> => entry.status === 'fulfilled' && Boolean(entry.value?.payload?.results?.length))
          .flatMap((entry) => entry.value.payload.results.map((result: any) => ({
            ...result,
            serviceName: entry.value.layer.name,
            provider: entry.value.payload.provider,
            attribution: entry.value.payload.attribution || entry.value.layer.attribution,
            sourceUrl: entry.value.payload.sourceUrl || entry.value.layer.metadata.sourceUrl,
            license: entry.value.payload.license || entry.value.layer.metadata.license,
            selectedSource: entry.value.payload.selectedSource,
            sourceNote: entry.value.payload.sourceNote,
          })));

        if (identified.length) {
          const first = identified[0];
          const preferredName = first.value || first.attributes?.find((attribute: any) => /nama|name|namobj|wadm/i.test(`${attribute.field} ${attribute.alias}`))?.displayValue;
          onSelectFeatureHandlerRef.current({
            type: 'arcgis',
            title: `${first.serviceName}: ${preferredName || first.layerName}`,
            coordinates: [e.lngLat.lng, e.lngLat.lat],
            data: {
              source: 'ArcGIS REST Identify',
              provider: first.provider,
              attribution: first.attribution,
              sourceUrl: first.sourceUrl,
              license: first.license,
              selectedSource: first.selectedSource,
              sourceNote: first.sourceNote,
              clickedAt: new Date().toISOString(),
              results: identified,
            },
          });
          return;
        }
      }

      // Fetch forecast/model weather at the clicked coordinate
      const lng = parseFloat(e.lngLat.lng.toFixed(4));
      const lat = parseFloat(e.lngLat.lat.toFixed(4));

      try {
        const res = await fetch(`/api/weather/point?lat=${lat}&lng=${lng}`);
        if (res.ok) {
          const weatherData = await res.json();
          onSelectFeature({
            type: 'weather',
            title: `Prakiraan cuaca di koordinat (${lat}°, ${lng}°)`,
            coordinates: [lng, lat],
            data: weatherData,
          });
        }
      } catch (err) {
        console.warn('Weather fetch error:', err);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [mapLoaded, measureMode, onSelectFeature, importedVectorLayers, layers]);

  // 8. Measurement Source & Layer synchronization
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Measurement source
    if (!map.getSource('measure-source')) {
      map.addSource('measure-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Measurement line
      map.addLayer({
        id: 'measure-line-layer',
        type: 'line',
        source: 'measure-source',
        paint: {
          'line-color': '#f59e0b',
          'line-width': 2.5,
          'line-dasharray': [2, 1],
        },
      });

      // Measurement fill for area
      map.addLayer({
        id: 'measure-fill-layer',
        type: 'fill',
        source: 'measure-source',
        paint: {
          'fill-color': '#f59e0b',
          'fill-opacity': 0.2,
        },
      });

      // Measurement points
      map.addLayer({
        id: 'measure-points-layer',
        type: 'circle',
        source: 'measure-source',
        paint: {
          'circle-radius': 5,
          'circle-color': '#f59e0b',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
    }

    // Update measurement data
    const source = map.getSource('measure-source') as maplibregl.GeoJSONSource;
    if (source) {
      const features: any[] = [];
      if (measurePoints.length > 0) {
        // Point features
        measurePoints.forEach((pt) => {
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: pt },
            properties: {},
          });
        });

        // Line feature
        if (measurePoints.length >= 2) {
          features.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: measurePoints },
            properties: {},
          });
        }

        // Polygon feature if area mode and >= 3 points
        if (measureMode === 'area' && measurePoints.length >= 3) {
          const closedRing = [...measurePoints, measurePoints[0]];
          features.push({
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [closedRing] },
            properties: {},
          });
        }
      }

      source.setData({
        type: 'FeatureCollection',
        features,
      });
    }
  }, [measurePoints, measureMode, mapLoaded]);

  const resetMeasurement = () => {
    setMeasurePoints([]);
    setMeasureResult('');
  };

  const windLayer = layers.find((l) => l.id === 'weather-wind-particles');

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* MapLibre DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* HTML5 Canvas Wind Particle Overlay */}
      <WindParticleCanvas
        map={mapRef.current}
        visible={Boolean(windLayer?.visible)}
        opacity={windLayer ? windLayer.opacity : 0.9}
      />

      {/* Live Coordinates and Map Zoom Indicator (Bottom-Right) */}
      <div className="absolute bottom-4 right-4 z-20 hidden sm:flex items-center gap-3 px-3.5 py-1.5 bg-[#114232]/90 backdrop-blur-md border border-[#87A922]/65 rounded-xl text-[11px] font-mono tabular-nums text-[#F7F6BB] shadow-lg">
        <span>Lng: {cursorCoords.lng.toFixed(4)}° E</span>
        <span>Lat: {cursorCoords.lat.toFixed(4)}° S</span>
        <span className="text-[#FCDC2A] font-semibold">Zoom: {cursorCoords.zoom}x</span>
      </div>

      {/* Measurement Mode Floating HUD */}
      {measureMode !== 'none' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-[#114232]/95 backdrop-blur-xl border border-[#FCDC2A] rounded-2xl px-4 py-2.5 shadow-2xl text-[#F7F6BB] flex items-center gap-3 text-xs animate-in fade-in">
          <Ruler className="w-4 h-4 text-[#FCDC2A] shrink-0" />
          <div>
            <div className="font-semibold text-[#FCDC2A]">
              {measureMode === 'distance' ? 'Mode Pengukuran Jarak' : 'Mode Pengukuran Luas'}
            </div>
            <div className="text-[11px] text-[#F7F6BB]">
              {measureResult || 'Klik pada peta untuk menambahkan titik pengukuran'}
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={resetMeasurement}
              className="p-1.5 bg-[#87A922]/25 hover:bg-[#87A922]/45 border border-[#87A922]/60 text-[#F7F6BB] rounded-lg transition-colors"
              title="Reset Titik Pengukuran"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                onSetMeasureMode('none');
                resetMeasurement();
              }}
              className="px-2.5 py-1 text-[11px] bg-[#FCDC2A] hover:bg-[#F7F6BB] text-[#114232] rounded-lg font-bold transition-colors"
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
