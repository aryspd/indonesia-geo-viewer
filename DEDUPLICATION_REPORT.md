# Deduplication and cleanup report

## Actions applied

1. Earlier versions consolidated VIIRS sensor displays into one logical layer. The current implementation has since changed to three independent per-sensor map layers (`disaster-viirs-snpp`, `disaster-viirs-noaa20`, `disaster-viirs-noaa21`) so each sensor endpoint and display can be tested separately.
2. Added a single server-side hotspot normalization/deduplication function shared by map data and exports. Observations are grouped only when acquisition date matches, acquisition time is within five minutes (including midnight wrap), and coordinates are within 375 m. Each raw observation remains in `properties.observations`; sensor IDs remain in `properties.sensorCodes`; the strongest-FRP observation is used as the representative point.
3. Added cross-provider earthquake event consolidation: distance <=12 km, time <=10 minutes, magnitude difference <=0.4. Original source records are retained in `properties.observations`, source labels in `properties.sources`. These thresholds are conservative matching heuristics, not scientific identity proof.
4. Removed synthetic province bounding-box polygons. Province reference centroids remain available for search only. The displayed official boundary layer uses BIG RBI layer 8, whose metadata identifies geometry as Polyline and an extent spanning the Indonesian archipelago; no area calculations are allowed from that line layer. This service is not the same as BIG Satu Peta boundary layer 0, which has a narrower service extent.
5. Removed hardcoded FIRMS credential and browser key-entry/localStorage flow. Server uses only `NASA_FIRMS_MAP_KEY`.
6. Removed the fake seasonal wind-vector fallback. If Open-Meteo fails, the API reports `UNAVAILABLE` and the particle visualization is disabled rather than displaying invented observations.
7. Removed stale static GFW and forest-moratorium tile overlays pending validation of current dataset/version and layer provenance. Retained dataset catalog/discovery endpoints instead.
8. Replaced fixed NASA GIBS `2026-03-01` dates with a selected-time template and clamp future selections to today's UTC date.
9. Replaced guessed RainViewer timestamp tile with provider metadata discovery and a proxy for the latest advertised past frame.

## File-level duplicate scan

- Archive source files scanned: 26 files before generated documentation/tests.
- SHA-256 identical-file groups found: 0.
- Files deleted based on identical file bytes: 0 (no exact duplicate files were found).
- Unit/deduplication tests: 4 passed (event merge, distinct events retained, hotspot grouping with provenance, separate acquisition dates retained).
- Redundant logical hotspot layer definitions retired: 4.

Machine-readable per-file SHA-256 inventory is included as `FILE_DUPLICATE_AUDIT.csv`. It contains paths, byte sizes and checksums; it does not expose any embedded secret values.

## Safety rule

No historical version, sensor observation, separate provider record, different geometry, or different thematic dataset is discarded solely because of similar names or spatial overlap. Grouping preserves raw observations and provenance. Audit/backup should precede future bulk data deletions.

## Deduplikasi file vektor yang diimpor

Panel impor menghitung fingerprint layer dari fitur yang diserialisasi secara kanonis. Polygon dinormalisasi berdasarkan titik awal ring dan arah ring, MultiPolygon/MultiLineString/MultiPoint dinormalisasi dan diurutkan, serta urutan fitur tidak memengaruhi fingerprint. Feature ID dan seluruh atribut ikut diperhitungkan. Ini membantu mendeteksi unggahan ulang dataset identik tanpa menggabungkan objek yang sekadar beririsan.

Dalam satu file, fitur hanya dilewati sebagai duplikat bila Feature ID, geometri kanonis dan atributnya sama. Fitur dengan geometri sama tetapi atribut berbeda dipertahankan. Fitur yang berdekatan, tumpang tindih sebagian, atau beda tahun/sensor/atribut tidak dihapus otomatis.
