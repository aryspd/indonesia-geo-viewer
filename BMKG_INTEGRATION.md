# BMKG integration

The viewer now groups BMKG access into three functions: earthquake latest, village-level weather forecast, and official early-weather-warning (nowcast).

## Sources and trust labels

- Official earthquake source already used by `/api/quakes`: BMKG TEWS AutoGempa, M5+, and felt-earthquake feeds. USGS observations are also included and deduplicated conservatively.
- Additional latest-earthquake JSON mirror: `https://bmkg-api.dhanypedia.com/v1/earthquake/latest`. This is a third-party service that republishes BMKG-derived information; it is clearly labelled as a Dhanypedia mirror and is not called an official BMKG API.
- Official village forecast: `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={kode_wilayah_tingkat_iv}`. The code must be an ADM4 village/kelurahan code in `00.00.00.0000` format. It returns a three-day forecast in three-hour periods and should be treated as a forecast, not a station observation or radar product.
- Official nowcast: `https://www.bmkg.go.id/alerts/nowcast/id` (RSS/XML) and `/en`; CAP detail documents are linked from the feed and use Common Alerting Protocol XML.

BMKG requires attribution to “BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)” in applications using its open data. Keep this attribution visible in the Sidebar and metadata.

## Local viewer endpoints

| Local endpoint | Purpose |
|---|---|
| `GET /api/bmkg/earthquake/latest` | Proxies the Dhanypedia latest-earthquake mirror; cache 60 seconds |
| `GET /api/bmkg/nowcast?lang=id` | Parses official BMKG RSS feed into JSON items with CAP alert IDs |
| `GET /api/bmkg/nowcast/:alertCode?lang=id` | Parses one official CAP XML alert and returns GeoJSON polygons |
| `GET /api/bmkg/nowcast/geojson?lang=id` | Aggregates up to 12 active CAP details into a GeoJSON FeatureCollection for MapLibre |
| `GET /api/weather/bmkg?adm4=61.01.01.2001` | Proxies official BMKG village forecast. Replace the example with the actual village's ADM4 code. |

The Sidebar has an ADM4 field in “Prakiraan Cuaca BMKG per Desa”. Enter the correct village or kelurahan code to view forecast slots. The example in the API documentation (`31.71.03.1001`) is Kemayoran, Jakarta Pusat; it is only an example, not a default for the user's project.

## Map rendering behaviour

- The BMKG Nowcast layer reads official RSS items, obtains CAP details, then draws only valid CAP `polygon` areas.
- CAP polygon coordinates are provided as latitude,longitude pairs. The parser converts them to GeoJSON longitude,latitude order and closes the ring.
- Alerts without a valid polygon are not given synthetic geometry. They remain available in the feed endpoint.
- Active-warning overlay refresh interval is two minutes; the server proxy caches its aggregate GeoJSON for 90 seconds.
- Clicking an alert polygon opens the feature inspector with headline, event, severity, certainty, urgency, validity, description, and area description where supplied.

## Operational caveats

- Official BMKG forecast documentation says the village forecast covers three days with three-hour intervals and is updated twice daily. It also documents an access limit of 60 requests/minute/IP. Server-side caching is enabled.
- BMKG nowcast documentation says the feed is updated continuously, is available in Indonesian and English, and is provided in RSS/CAP XML. It documents the same 60 requests/minute/IP limit. The aggregate route limits detail fetching to at most 12 feed alerts per refresh.
- The Dhanypedia API is a shared third-party mirror, documents its own rate limit and cache, and is not affiliated with BMKG. Do not use it as the sole source for critical warnings or decisions.
- An empty polygon FeatureCollection does not mean there are no warnings: warnings without polygon geometry can still appear in the RSS feed and can be reviewed from `/api/bmkg/nowcast?lang=id`.
- Avoid making safety decisions from this visual layer alone. Consult BMKG's official web and channel releases for authoritative instructions.
