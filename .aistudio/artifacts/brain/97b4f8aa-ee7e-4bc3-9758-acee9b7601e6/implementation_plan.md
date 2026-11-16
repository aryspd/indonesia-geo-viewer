# INDONESIA GEO VIEWER — Public Web GIS & Environmental Monitoring Platform

A production-grade, full-screen Web GIS platform tailored for the Indonesian archipelago. It synthesizes real-time seismic events, atmospheric wind particle flows, precipitation radar/forecasts, NASA FIRMS thermal hotspots, multi-provider satellite imagery (Esri, NASA GIBS, Sentinel-2), and national administrative boundaries into an intuitive, high-performance dashboard.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design and architectural choices have been locked based on your clarifications:

- **Default Active Layer Preset**: Initial load starts with **Disaster & Weather Monitor** enabled (BMKG recent earthquakes + Open-Meteo precipitation overlay + latest cloud cover), providing immediate situational awareness.
- **Wind & Atmospheric Visualization**: Implemented as an **animated dynamic particle flow layer** on a synchronized HTML5 canvas with real-time velocity color gradients and an interactive wind speed legend.
- **NASA FIRMS Integration**: Powered by **NASA FIRMS WMS tile layers** for instant archipelago-wide thermal anomaly coverage, with an in-app **API Key Settings Modal** where users or researchers can input their personal `MAP_KEY` for high-resolution CSV queries.
- **Map Engine**: **MapLibre GL JS** (lightweight, open-source WebGL/WebGPU-ready geospatial engine) paired with custom canvas overlay layers for vector and raster streaming.

---

## 1. Overview & Core Concept

- **What It Does**: Provides an interactive, public Web GIS dashboard visualizing Indonesia's geography, disaster events, atmospheric weather, thermal hotspots, deforestation/land cover, topography, and administrative divisions.
- **Geographic Center**: Centered on Indonesia (`lng: 118.0149, lat: -2.5489`, zoom: 5.0) covering Sabang to Merauke (94.5°E to 141.5°E, 6.0°N to 11.5°S).
- **Target Audience**: Researchers, disaster response analysts, forestry observers, students, GIS specialists, and the general public.
- **Key Value**: Unified geospatial situational awareness without mandatory account logins, fake data, or artificial mockup states.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Situational Overview (Zero-State)**: User opens the viewer and immediately sees the Indonesian archipelago in Dark GIS mode. Current BMKG earthquakes pulse with magnitude-scaled rings, precipitation overlays show active storm fronts, and wind particles flow across the straits and seas.
2. **Layer Catalog Exploration**: User opens the collapsible Left Sidebar to toggle thematic groups (Basemaps, Satellites, Weather, Disasters, Environment, Topography, Administrative Boundaries), adjusts layer opacity sliders, and inspects layer legends.
3. **Feature Identification & Drilldown**: User clicks on an earthquake epicenter, hotspot point, or weather grid point. The Right Information Panel animates open displaying verified metadata (e.g. earthquake depth, magnitude, tsunami alert status, felt regions; or hotspot fire radiative power and sensor source).
4. **Interactive Measurement & Coordinate Navigation**: User measures maritime distances or island land areas using polygon/line measurement tools, searches for Indonesian cities/regencies, or inputs exact DD/DMS coordinates to fly to.
5. **Temporal Timeline Slider**: User slides through dates to view satellite imagery changes (NASA GIBS daily composite layers) and historical earthquake trends.

### Visual Identity & Theme

- **Design Posture**: Utilitarian, high-precision Dark GIS theme as default, paired with a clean Light Topographic theme.
- **Dual-Theme Setup**: Uses `@custom-variant dark (&:where(.dark, .dark *));` in Tailwind v4 with clean CSS variables and explicit light/dark contrast pairings.
- **Typography**: `Plus Jakarta Sans` for clean display and navigation typography, paired with `JetBrains Mono` / `tabular-nums` for coordinates, magnitudes, wind velocities, and telemetry metrics.
- **Zero-Pill Discipline**: Statuses and metadata use clean, unboxed inline typographic markers with subtle separators (`·`), avoiding cluttered candy-pill badges.
- **Spatial Composition**: Map occupies 100% of the viewport; floating glassmorphic panels (Header bar, Left catalog drawer, Right inspector, Bottom timeline) maintain $\ge 40\text{px}$ touch targets, smooth backdrop blurs, and collapsible states for maximum spatial immersion.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Map Engine Architecture
- **Chosen Approach**: `maplibre-gl` with custom Canvas overlay for wind particle simulation.
- **Why**: Native WebGL performance, raster/vector tile compatibility (XYZ, WMS, GeoJSON), smooth 60fps pan/zoom, and no proprietary API token locks.
- **Alternatives Considered**: Leaflet (lower performance with thousands of points and dynamic particles), Cesium (heavyweight 3D overhead for 2D GIS workflows).

### Decision 2: Weather & Disaster Data Flow
- **Chosen Approach**: Direct integration with verified open APIs:
  - BMKG Earthquake APIs (`autogempa.json`, `gempaterkini.json`, `gempadirasakan.json`)
  - USGS Global Earthquake Feed (`summary/all_day.geojson`)
  - Open-Meteo Weather API (`temperature_2m`, `precipitation`, `wind_speed_10m`, `wind_direction_10m`)
  - NASA GIBS WMTS & FIRMS WMS overlays
- **Why**: Real, verifiable, live data without mock generation or synthetic hallucination.
- **Security & Caching**: Express backend server handles API proxying and memory caching to prevent CORS blockages, enforce rate limits, and safely handle optional NASA FIRMS MAP_KEY credentials.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          INDONESIA GEO VIEWER                          │
├───────────────────────────────┬────────────────────────────────────────┤
│ Top Header & Search           │ Lat/Lng Inspector & Basemap Switcher   │
├───────────────────────────────┴────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────┐    ┌────────────────────┐    ┌─────────────────┐ │
│  │  Layer Catalog   │    │  MapLibre GL Map   │    │   Inspection    │ │
│  │  (Left Sidebar)  │    │  - Esri / OSM      │    │  Detail Panel   │ │
│  │  - Basemaps      │    │  - BMKG Quake Pts  │    │  - Quake Info   │ │
│  │  - Satellite     │    │  - FIRMS WMS Fire  │    │  - Weather Obs  │ │
│  │  - Weather       │    │  - GIBS Imagery    │    │  - Hotspot FRP  │ │
│  │  - Disasters     │    │  - Admin GeoJSON   │    │  - Statistics   │ │
│  │  - Environment   │    │  - Wind Particles  │    │                 │ │
│  │  - Topography    │    │    (HTML5 Canvas)  │    │                 │ │
│  └──────────────────┘    └────────────────────┘    └─────────────────┘ │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ Bottom Timeline Bar (NASA GIBS Date Scrubber, Historical Playback)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │   Express Backend Proxy & Cache Gateway (`server.ts`)   │
       ├────────────────────────────────────────────────────────┤
       │ • `/api/quakes`       -> BMKG & USGS GeoJSON Proxy     │
       │ • `/api/weather`      -> Open-Meteo API Cache          │
       │ • `/api/firms`        -> NASA FIRMS Area / WMS Gateway │
       │ • `/api/admin-geojson`-> Indonesian Province Boundaries│
       └────────────────────────────────────────────────────────┘
```

### Component Hierarchy & State Store

- **`App.tsx`**: Root container with theme context, active layer registry, map state, and notification dispatcher.
- **`components/MapViewer.tsx`**: MapLibre GL wrapper, viewport events, cursor coordinates, identify click dispatcher, and canvas wind particle orchestrator.
- **`components/WindParticleCanvas.tsx`**: High-performance canvas particle animation engine calculating wind vectors from Open-Meteo matrix points.
- **`components/Header.tsx`**: Brand mark, place search autocomplete (Indonesian capitals, islands, regencies), coordinate manual fly-to, theme toggle, and fullscreen trigger.
- **`components/SidebarLayers.tsx`**: Layer catalog with 7 thematic categories, toggles, opacity sliders, legends, and metadata modals.
- **`components/InfoPanel.tsx`**: Responsive inspector for selected features, disaster alerts, and live statistical metrics.
- **`components/TimelineBar.tsx`**: Temporal controls for GIBS satellite timeline, date picker, play/pause cycle.
- **`components/MeasureTools.tsx`**: Distance (geodesic km) and area (hectares/sq km) interactive polygon/line measurement.
- **`components/SettingsModal.tsx`**: User settings, custom NASA FIRMS MAP_KEY input, refresh intervals, and data provider status diagnostics.

---

## 5. Implementation Phases

1. **Dependencies & Server Setup**:
   - Install `maplibre-gl`, `@types/maplibre-gl`, `@turf/turf` (for geodesic calculations and measurements).
   - Configure `server.ts` with proxy endpoints for BMKG, USGS, Open-Meteo, and GeoJSON boundary delivery.
2. **Core Map Engine & Basemaps**:
   - Initialize MapLibre GL instance centered on Indonesia with Esri Satellite, OSM, Topo, Hillshade, and Wayback.
   - Configure `@custom-variant dark` in `src/index.css`.
3. **Disaster & Weather Real-Time Layers**:
   - Integrate BMKG real-time earthquake feeds (`autogempa` + `gempaterkini` + `gempadirasakan`) with magnitude-based heat styling.
   - Implement Open-Meteo weather radar/precipitation raster overlays and dynamic canvas wind particle simulation.
4. **NASA FIRMS & Environmental Layers**:
   - Integrate NASA FIRMS WMS layer for live fire hotspots + optional API key query route.
   - Integrate NASA GIBS WMTS daily true-color satellite composites.
   - Add Indonesian administrative boundaries (provinces, regencies) and land cover overlays.
5. **Interactive Controls & Inspection Experience**:
   - Build Header, Layer Catalog, Feature Inspector, Measure Tools, Coordinate Locator, and Timeline scrubber.
   - Add status diagnostics showing live provider health (BMKG, USGS, Open-Meteo, NASA).
