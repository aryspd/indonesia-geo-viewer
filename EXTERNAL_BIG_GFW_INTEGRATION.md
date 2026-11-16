# BIG and Global Forest Watch public layers

The current application uses 4 BIG MapServer overlays and 7 Global Forest Watch raster/vector tile layers. It no longer uses the previous legacy BIG atlas list or `gis-gfw.wri.org` / BNPB preview fallbacks.

See `PUBLIC_LAYER_SOURCES.md` for the complete current catalogue, provider URLs, terms, limitations and local route tests.

## BIG ArcGIS overlays

| Layer ID | Primary source | Local tiles |
|---|---|---|
| `big-gunung-api` | `https://geoservices.big.go.id/gis/rest/services/PTRA/Atlas_Sebaran_GunungApi/MapServer` | `/api/arcgis/tiles/big-gunung-api/{z}/{x}/{y}.png` |
| `big-forest-zones` | `https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/KEHUTANAN/MapServer/0` | `/api/arcgis/tiles/big-forest-zones/{z}/{x}/{y}.png` |
| `big-mining-licenses` | `https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/PERIZINAN_DAN_PERTANAHAN/MapServer/4` | `/api/arcgis/tiles/big-mining-licenses/{z}/{x}/{y}.png` |
| `big-coal-iup` | Same BIG Satu Peta IUP layer 4 with `tiptmb` commodity filter | `/api/arcgis/tiles/big-coal-iup/{z}/{x}/{y}.png` |

The BIG PTRA 1:250K Coal Atlas is intentionally omitted because its service-use note restricts it to the BIG Atlas application. The coal layer in this public catalogue is therefore a filtered BIG Satu Peta IUP layer and its filter is only as complete as the source commodity attribute values.

## Global Forest Watch Tile Cache

| Layer ID | Dataset ID | Official tile route |
|---|---|---|
| `gfw-tree-cover-loss` | `umd_tree_cover_loss` | `https://tiles.globalforestwatch.org/umd_tree_cover_loss/latest/dynamic/{z}/{x}/{y}.png` |
| `gfw-peatlands` | `gfw_peatlands` | `https://tiles.globalforestwatch.org/gfw_peatlands/latest/dynamic/{z}/{x}/{y}.png` |
| `gfw-wood-fiber-concessions` | `idn_wood_fiber` | `https://tiles.globalforestwatch.org/idn_wood_fiber/latest/dynamic/{z}/{x}/{y}.pbf` |
| `gfw-palm-oil-mills` | `gfw_universal_mill_list` | `https://tiles.globalforestwatch.org/gfw_universal_mill_list/latest/default/{z}/{x}/{y}.pbf` |
| `gfw-plantations` | `gfw_plantations` | `https://tiles.globalforestwatch.org/gfw_plantations/latest/default/{z}/{x}/{y}.pbf` |
| `gfw-oil-palm` | `gfw_oil_palm` | `https://tiles.globalforestwatch.org/gfw_oil_palm/latest/default/{z}/{x}/{y}.pbf` |
| `gfw-mining-concessions` | `gfw_mining_concessions` | `https://tiles.globalforestwatch.org/gfw_mining_concessions/latest/default/{z}/{x}/{y}.pbf` |

Vector tile source-layer names are obtained from the official GFW Tile Cache metadata/style resources. If that metadata is unavailable, the renderer does not guess a `source-layer`; the API returns `STYLE_UNAVAILABLE` rather than silently drawing an empty layer.

## Local routes

- `GET /api/arcgis/services`
- `GET /api/arcgis/services/:serviceId/metadata`
- `GET /api/arcgis/tiles/:serviceId/:z/:x/:y.png`
- `GET /api/arcgis/identify/:serviceId`
- `GET /api/gfw/vector-style/:dataset`
- `GET /api/gfw/vector-tiles/:dataset/:z/:x/:y.pbf`
- `GET /api/gfw/raster-tiles/:dataset/:z/:x/:y.png`

GFW Tile Cache tiles do not require placing a GFW Data API key in the browser. `GFW_API_KEY` remains optional and server-only for the separate download endpoint. Verify each dataset's own attribution and license before redistributing underlying data.
