export type BasemapId =
  | 'esri-satellite'
  | 'osm'
  | 'carto-dark'
  | 'opentopomap';

export type LayerCategory =
  | "basemap"
  | "satellite"
  | "weather"
  | "disaster"
  | "environment"
  | "topography"
  | "administrative";

export interface LayerMetadata {
  provider: string;
  /** Human-readable source credit / attribution. */
  attribution?: string;
  updateCadence: string;
  spatialResolution: string;
  sourceUrl: string;
  alternativeSources?: string[];
  license: string;
  description: string;
  lastUpdated?: string;
  temporalCoverage?: string;
  downloadUrl?: string;
  downloadNote?: string;
}

export interface LegendItem {
  color: string;
  label: string;
}

export interface LayerDefinition {
  id: string;
  name: string;
  category: LayerCategory;
  description: string;
  visible: boolean;
  opacity: number;
  type:
    | "raster"
    | "vector"
    | "vector-tiles"
    | "wms"
    | "wmts"
    | "canvas"
    | "geojson";
  metadata: LayerMetadata;
  legend?: LegendItem[];
  tileSize?: number;
  tiles?: string[];
  wmsUrl?: string;
  wmsParams?: Record<string, string>;
  minZoom?: number;
  maxZoom?: number;
  attribution?: string;
  bounds?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  /** GFW Tile Cache dataset ID for public vector tile layers. */
  vectorDataset?: string;
  /** GFW Tile Cache endpoint mode; idn_wood_fiber is dynamic, other listed layers are static. */
  vectorTileMode?: "static" | "dynamic";
}

export type FirmsSensorCode =
  | "VIIRS_SNPP_NRT"
  | "VIIRS_NOAA20_NRT"
  | "VIIRS_NOAA21_NRT";

export interface FirmsSensorUiStatus {
  state: "loading" | "ok" | "empty" | "error";
  count: number;
  message?: string;
  checkedAt?: string;
}

export type FirmsSensorStatusMap = Partial<
  Record<FirmsSensorCode, FirmsSensorUiStatus>
>;

export interface EarthquakeProperties {
  id: string;
  source: string;
  type: "autogempa" | "gempaterkini" | "gempadirasakan" | "usgs";
  isLatest?: boolean;
  date: string;
  time: string;
  datetime: string;
  magnitude: number;
  depth: string;
  area: string;
  potential?: string;
  shakemap?: string | null;
  felt?: string | null;
  url?: string;
}

export interface HotspotData {
  lat: number;
  lng: number;
  frp: number;
  confidence: string;
  date: string;
  time: string;
  sensor: string;
}

export interface WeatherData {
  current?: {
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    rain: number;
    weather_code: number;
    cloud_cover: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weather_code: number[];
  };
}

export interface ProvinceInfo {
  id: string;
  name: string;
  capital: string;
  island: string;
  lat: number;
  lng: number;
  areaKm2: number;
  population: string;
}

export interface SelectedFeature {
  type:
    | "earthquake"
    | "weather"
    | "hotspot"
    | "province"
    | "coordinate"
    | "arcgis";
  title: string;
  coordinates: [number, number]; // [lng, lat]
  data: any;
}

export type MeasureMode = "none" | "distance" | "area";
