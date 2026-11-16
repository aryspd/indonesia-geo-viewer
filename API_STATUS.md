# API status — current public thematic catalogue

This revision replaces the previous thematic layer list. The live layer inventory and current official source URLs are documented in `PUBLIC_LAYER_SOURCES.md`.

| Provider | Local route / layer | Key or access | Data class |
|---|---|---|---|
| BIG STIG | `/api/admin/boundaries/province` → `admin-provinces` | Public REST, attribution required | Province polygon reference |
| NASA FIRMS | `/api/firms/status`, `/api/firms/hotspots?sensor=...` → 3 VIIRS layers | `NASA_FIRMS_MAP_KEY` server-only | Near-real-time thermal anomalies |
| Open-Meteo forecast | `/api/weather/wind-field` → wind particle layer | Free API non-commercial only; attribution | Current model / forecast |
| Open-Meteo Air Quality | `/api/weather/grid?kind=air` → quality grid | Free API non-commercial only; attribution | CAMS model estimate |
| Open-Meteo forecast | `/api/weather/grid?kind=rain` → rain probability grid | Free API non-commercial only; attribution | Forecast model |
| BMKG CAP | `/api/bmkg/nowcast`, `/api/bmkg/nowcast/geojson` | Public, 60 req/min/IP, BMKG attribution | Official current weather alerts |
| BMKG village forecast | `/api/weather/bmkg?adm4=...` | Public, 60 req/min/IP, BMKG attribution | 3-day forecast, 3-hourly |
| NASA GIBS / GPM | WMTS layer `IMERG_Precipitation_Rate_30min` | Public WMTS, NASA attribution | 30-minute product with processing delay |
| BIG PTRA volcano atlas | `/api/arcgis/tiles/big-gunung-api/...` | Public service endpoint; verify use terms | Reference atlas, production 2021 |
| BIG Satu Peta forest | `/api/arcgis/tiles/big-forest-zones/...` | Public service endpoint; BIG attribution | Forest-zone polygons rendered as raster tiles; metadata dated 2024-08-08 in reviewed service |
| BIG Satu Peta IUP | `/api/arcgis/tiles/big-mining-licenses/...` and `/api/arcgis/tiles/big-coal-iup/...` | Public service endpoint; BIG attribution | General IUP and best-effort coal filter |
| GFW raster tiles | `/api/gfw/raster-tiles/umd_tree_cover_loss/...`, `/api/gfw/raster-tiles/gfw_peatlands/...` | Public Tile Cache; dataset terms apply | Annual tree cover loss and peat reference raster |
| GFW vector tiles | `/api/gfw/vector-style/:dataset`, `/api/gfw/vector-tiles/:dataset/:z/:x/:y.pbf` | Public Tile Cache; dataset terms apply | Wood fiber, mills, plantations, oil palm, mining |

## Security

- NASA FIRMS MAP_KEY stays in `.env` as `NASA_FIRMS_MAP_KEY` and is used only on the Express server. Never embed it in a frontend URL or bundle. Rotate the previously exposed key.
- Optional GFW download `GFW_API_KEY` is server-only and is not needed for the public Tile Cache map tiles.
- No provider key is included in this source archive.

## Validation limits

`npm test` runs pure Node tests and the static source audit. A passing static test does not confirm live provider uptime, current map-key validity, source-layer metadata, use rights or every remote tile. After starting the app, check the local endpoints listed in `PUBLIC_LAYER_SOURCES.md`, and run `npm run lint` / `npm run build` on the deployment machine after `npm install`.

## Temporal and licence notes

- NASA FIRMS is near-real-time, tied to satellite overpass and NRT processing, not a live video feed.
- Open-Meteo values are model products. The free Open-Meteo API is for non-commercial usage only; a commercial/monetized public viewer needs the appropriate license.
- NASA GPM IMERG is a 30-minute satellite precipitation product with processing latency.
- BIG boundaries, forest zones and volcano maps are reference datasets with service-specific update dates, not continuous real-time data.
- GFW `latest` points to the latest published dataset version, not continuous real-time observation.
- GFW `gfw_mining_concessions` is multi-commodity and should not be labelled as a coal-only layer.
- BIG PTRA `Atlas_250K_BatuBara` is intentionally excluded because its service-use note restricts it to the BIG Atlas application. The public catalogue uses Satu Peta IUP layer 4 filtered on the `tiptmb` commodity attribute instead; validate actual source-domain values before analysis.
