# Data sources index

The current active public thematic layer catalogue is maintained in `PUBLIC_LAYER_SOURCES.md`.

That document lists the 20 logical layers used in the current revision, official source URLs, local proxy routes, data formats, refresh/update classes, API key requirements and reuse caveats.

This file intentionally replaces the older integration inventory so the previous RainViewer, province-polyline, old RBI kabupaten/kecamatan, historical GFW mirrors and PTRA atlas service list are not mistaken for the current active layer catalogue.

Basemaps remain separately configured in `src/data/layersCatalog.ts` under `BASEMAPS`. Local GeoJSON and Shapefile import tools remain available and are independent of the public thematic layers.
