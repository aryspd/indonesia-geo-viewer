# Indonesia Geo Viewer — Public thematic layers

Catalogue revision: 2026-11-10

This catalogue replaces the previous thematic layer list. Basemaps remain in their separate basemap selector. The thematic catalogue contains 20 logical layers (16 directly registered plus 4 BIG ArcGIS MapServer overlays).

## Temporal labels — do not call every layer real-time

- **Near-real-time:** NASA FIRMS VIIRS NRT and BMKG Nowcast CAP alerts.
- **Model/current estimate or forecast:** Open-Meteo wind, air quality and precipitation probability. These are model products, not station observations.
- **Satellite-derived with latency:** NASA GPM IMERG 30-minute precipitation-rate product; data availability is delayed by processing.
- **Reference / periodic:** BIG administrative boundary, volcano atlas, forest-zone and mining permit polygons; GFW tree-cover loss, peatland, wood-fiber concessions, mills, plantations and mining concessions.

## Current layer inventory

| Logical layer | Provider and official source | Integration in this app | Data type / limitations |
|---|---|---|---|
| Province boundaries | BIG STIG `https://geoservices.big.go.id/gis/rest/services/STIG/Batas_Provinsi/MapServer/0` | Backend `/api/admin/boundaries/province` queries layer 0 with `f=geojson` | Polygon, EPSG:4326; official boundary reference. Check service metadata for edition and reuse terms. |
| VIIRS SNPP hotspots | NASA FIRMS Area API `https://firms.modaps.eosdis.nasa.gov/api/area` (`VIIRS_SNPP_NRT`) | `/api/firms/hotspots?sensor=VIIRS_SNPP_NRT` | NRT thermal anomalies, nominal 375 m; not proof of a confirmed ground fire. Server-only `NASA_FIRMS_MAP_KEY`. |
| VIIRS NOAA-20 hotspots | NASA FIRMS Area API (`VIIRS_NOAA20_NRT`) | `/api/firms/hotspots?sensor=VIIRS_NOAA20_NRT` | NRT thermal anomalies, nominal 375 m; separate sensor layer. |
| VIIRS NOAA-21 hotspots | NASA FIRMS Area API (`VIIRS_NOAA21_NRT`) | `/api/firms/hotspots?sensor=VIIRS_NOAA21_NRT` | NRT thermal anomalies, nominal 375 m; separate sensor layer. |
| Wind movement | Open-Meteo Forecast API `https://api.open-meteo.com/v1/forecast` | `/api/weather/wind-field` → canvas particle interpolation | Current model field sampled at regional anchor points; not continuous observed wind. Open-Meteo free API is non-commercial only; attribution required. |
| Air quality | Open-Meteo Air Quality API `https://air-quality-api.open-meteo.com/v1/air-quality` (CAMS Global) | `/api/weather/grid?kind=air` → GeoJSON points | CAMS Global model, about 0.4° / 45 km, 3-hourly, updated around every 12 hours; not station ISPU. Free tier non-commercial only; attribution required. |
| Rain potential | Open-Meteo Forecast API `https://api.open-meteo.com/v1/forecast` | `/api/weather/grid?kind=rain` → GeoJSON points | Precipitation probability and forecast precipitation; not observed rainfall or radar. Free tier non-commercial only; attribution required. |
| BMKG nowcast | BMKG CAP/RSS `https://www.bmkg.go.id/alerts/nowcast/id` | `/api/bmkg/nowcast` and `/api/bmkg/nowcast/geojson` | Official alerts, updated whenever issued; geometry is drawn only when supplied in CAP. 60 requests/minute/IP; BMKG attribution is required. |
| Satellite rainfall | NASA GPM IMERG / EOSDIS GIBS WMTS `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml` | WMTS raster layer using `IMERG_Precipitation_Rate_30min` | 30-minute precipitation-rate product with several hours of processing latency; not an instantaneous rain gauge. Check available date in WMTS capabilities. |
| BIG volcano distribution | BIG PTRA `https://geoservices.big.go.id/gis/rest/services/PTRA/Atlas_Sebaran_GunungApi/MapServer` | ArcGIS MapServer export proxy `/api/arcgis/tiles/big-gunung-api/{z}/{x}/{y}.png` | Reference volcano distribution Atlas, production 2021, scale-dependent sublayers 1,3,5,7,9,11; not current eruption status. |
| GFW tree-cover loss | GFW Tile Cache `https://tiles.globalforestwatch.org/umd_tree_cover_loss/latest/dynamic/{z}/{x}/{y}.png` | `/api/gfw/raster-tiles/umd_tree_cover_loss/{z}/{x}/{y}.png` | Annual UMD raster; configured through previous completed year. Tree-cover loss is not automatically deforestation. |
| BIG forest zones | BIG Satu Peta Forestry `https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/KEHUTANAN/MapServer/0` | ArcGIS MapServer export proxy `/api/arcgis/tiles/big-forest-zones/{z}/{x}/{y}.png` | Layer 0 Penetapan Kawasan Hutan polygon. The service metadata in the reviewed catalogue is dated 2024-08-08; verify effective SK/date for legal use. |
| GFW wood-fiber concessions | GFW Tile Cache dynamic vector dataset `idn_wood_fiber`: `https://tiles.globalforestwatch.org/idn_wood_fiber/latest/dynamic/VectorTileServer` | `/api/gfw/vector-tiles/idn_wood_fiber/{z}/{x}/{y}.pbf` | Indonesia wood-fiber concession dataset. Version/cut-off follows GFW `latest`; check dataset metadata before analysis. |
| GFW peatlands | GFW Tile Cache raster dataset `gfw_peatlands`: `https://tiles.globalforestwatch.org/gfw_peatlands/latest/dynamic/{z}/{x}/{y}.png` | `/api/gfw/raster-tiles/gfw_peatlands/{z}/{x}/{y}.png` | Raster reference layer; not a legal peat boundary or automatically suitable for parcel area calculation. |
| GFW palm oil mills | GFW Tile Cache static vector dataset `gfw_universal_mill_list`: `https://tiles.globalforestwatch.org/gfw_universal_mill_list/latest/default/VectorTileServer` | `/api/gfw/vector-tiles/gfw_universal_mill_list/{z}/{x}/{y}.pbf` | Mill locations; dataset-specific license and attribution apply. For downloadable data, GFW Data API may require server-only `GFW_API_KEY`. |
| GFW plantations | GFW Tile Cache static vector dataset `gfw_plantations`: `https://tiles.globalforestwatch.org/gfw_plantations/latest/default/VectorTileServer` | `/api/gfw/vector-tiles/gfw_plantations/{z}/{x}/{y}.pbf` | General plantation category; not equal to a complete legal oil-palm parcel inventory. |
| GFW oil palm | GFW Tile Cache static vector dataset `gfw_oil_palm`: `https://tiles.globalforestwatch.org/gfw_oil_palm/latest/default/VectorTileServer` | `/api/gfw/vector-tiles/gfw_oil_palm/{z}/{x}/{y}.pbf` | Oil-palm thematic data; does not establish certification or land-right legality. |
| BIG coal IUP | BIG Satu Peta IUP layer 4 `https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/PERIZINAN_DAN_PERTANAHAN/MapServer/4` | ArcGIS export proxy `/api/arcgis/tiles/big-coal-iup/{z}/{x}/{y}.png` | Best-effort filter on `tiptmb` for BATUBARA/BATU BARA/COAL. Filter depends on actual source values/domains. It is not the restricted PTRA 1:250K Coal Atlas. |
| BIG mining permits | BIG Satu Peta IUP layer 4, same service as above | ArcGIS export proxy `/api/arcgis/tiles/big-mining-licenses/{z}/{x}/{y}.png` | All commodity IUP polygons; not a replacement for authoritative verification with the issuing agency. |
| GFW mining concessions | GFW Tile Cache static vector dataset `gfw_mining_concessions`: `https://tiles.globalforestwatch.org/gfw_mining_concessions/latest/default/VectorTileServer` | `/api/gfw/vector-tiles/gfw_mining_concessions/{z}/{x}/{y}.pbf` | General mining concessions across available countries/commodities; not coal-specific. Check Indonesia coverage and dataset metadata. |

## Access, attribution and public website terms

- **BIG:** REST services are reachable publicly. Public access does not automatically grant unrestricted republication or remove attribution/use conditions. Show BIG/Satu Peta attribution and preserve each service's terms.
- **NASA FIRMS:** requests require a free MAP_KEY. Keep it on the Express server only as `NASA_FIRMS_MAP_KEY`; never put it in a frontend URL or JavaScript bundle. NASA documents a default 5,000 transaction / 10-minute limit. The Area API day range is 1–5 and observations are acquired on satellite passes; NRT is not a second-by-second feed.
- **NASA GIBS:** public WMTS; read Capabilities for the actual available dates and layer identifiers. Include NASA GPM/EOSDIS attribution.
- **BMKG:** official CAP open feed has a 60 requests/minute/IP limit; BMKG must be credited in the app.
- **Open-Meteo:** its free API is non-commercial only. A publicly reachable website that is monetized or used commercially needs an appropriate paid license or another licensed provider. Credit Open-Meteo and follow the dataset attribution.
- **GFW Tile Cache:** public tile endpoints are documented in the official GFW Tile Cache catalogue. Tile access is not blanket permission to redistribute raw datasets; follow the individual dataset terms and attribution. `latest` resolves to the current published dataset version, not continuous real-time observation.

## Services intentionally excluded

- BIG `PTRA/Atlas_250K_BatuBara/MapServer` is not included in the public catalogue because its service-use note restricts it to the BIG Atlas application. The app instead uses the public Satu Peta IUP layer with a best-effort coal commodity filter.
- GFW mining concessions is a general mining layer, not specifically coal. No coal-specific GFW dataset is asserted here.
- The previous RBI kabupaten/kecamatan overlays, RainViewer radar layer, legacy satellite theme layers and other previous thematic layer IDs have been removed from the new catalogue. Basemaps and local GeoJSON/Shapefile import tools remain available.

## Local runtime checks

- `GET /api/admin/boundaries/province`
- `GET /api/firms/status`
- `GET /api/firms/hotspots?sensor=VIIRS_SNPP_NRT&days=1`
- `GET /api/weather/grid?kind=air`
- `GET /api/weather/grid?kind=rain`
- `GET /api/bmkg/nowcast`
- `GET /api/gfw/vector-style/gfw_universal_mill_list`
- `GET /api/gfw/vector-style/idn_wood_fiber`
- `GET /api/arcgis/services`

A successful build or static test does not prove every remote provider is online. Validate each runtime endpoint from the deployment server and monitor HTTP errors/timeouts.
