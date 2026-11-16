# API Attribution & Feature Identify Update

## What changed

- Every BIG PTRA/RBI and GFW ArcGIS overlay now has a dedicated `attribution` credit, separate from `provider` and `license`.
- The MapLibre raster sources receive that credit so it appears in the map attribution control.
- BMKG Nowcast, BMKG/USGS earthquake, NASA FIRMS hotspot, BIG province and BIG administrative GeoJSON sources now declare credits as well.
- The layer metadata modal now presents the attribution credit as a separate row.
- BIG RBI feature inspection now displays source credits and field values in the generic feature inspector.
- BIG/GFW ArcGIS raster overlays now support click-to-identify through `GET /api/arcgis/identify/:serviceId`.

## ArcGIS Identify behavior

The backend uses the ArcGIS REST Identify operation against each service candidate. For MapServer features it also reads the corresponding layer metadata and maps:

- field names to their published aliases;
- coded-value domains to their display labels;
- subtype-specific domains when the service defines them;
- date values to Indonesian local date/time display.

Raw values are retained in the JSON response. If the provider exposes `copyrightText` at the service or layer level, that value takes precedence over the catalogue fallback credit.

For ImageServer sources, the Identify response is represented as a raster pixel value/property result where available. Not every raster service exposes feature-style attributes.

## API example

```text
GET /api/arcgis/identify/big-atlas-batubara?lon=110.2&lat=-1.4&extent=108,-3,112,0&width=1024&height=768
```

Required query parameters: `lon`, `lat`, and `extent` (`west,south,east,north`). `width`, `height`, and `dpi` are optional.

## Important limitation

An ArcGIS raster export tile is still a visual raster overlay. Identify requests retrieve provider-side attributes for the location; they do not convert or download the underlying layer as GeoJSON/Shapefile. Provider metadata, copyright and license/use restrictions remain authoritative.
