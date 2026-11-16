import test from 'node:test';
import assert from 'node:assert/strict';
import { deduplicateEarthquakeFeatures, deduplicateHotspotObservations, type GeoFeature } from '../server/deduplication.ts';

const quake = (id: string, source: string, lon: number, lat: number, datetime: string, magnitude: number): GeoFeature => ({
  type: 'Feature', id, geometry: { type: 'Point', coordinates: [lon, lat] },
  properties: { id, source, type: source, datetime, magnitude },
});
const fire = (id: string, sensorCode: string, lon: number, lat: number, time: string, frp: number): GeoFeature => ({
  type: 'Feature', id, geometry: { type: 'Point', coordinates: [lon, lat] },
  properties: { id, sensorCode, date: '2026-11-08', time, frp },
});

test('same earthquake from BMKG and USGS consolidates and retains both sources', () => {
  const result = deduplicateEarthquakeFeatures([
    quake('bmkg-1', 'BMKG TEWS', 110, -6, '2026-11-08T10:00:00Z', 4.8),
    quake('usgs-1', 'USGS', 110.02, -6.01, '2026-11-08T10:05:00Z', 4.9),
  ]);
  assert.equal(result.length, 1);
  assert.deepEqual(new Set(result[0].properties.sources), new Set(['BMKG TEWS', 'USGS']));
  assert.equal(result[0].properties.observations.length, 2);
});

test('earthquakes outside matching thresholds remain distinct', () => {
  const result = deduplicateEarthquakeFeatures([
    quake('bmkg-1', 'BMKG TEWS', 110, -6, '2026-11-08T10:00:00Z', 4.8),
    quake('usgs-2', 'USGS', 111, -6, '2026-11-08T10:05:00Z', 4.8),
  ]);
  assert.equal(result.length, 2);
});

test('near-identical cross-sensor hotspots group but raw sensors remain preserved', () => {
  const result = deduplicateHotspotObservations([
    fire('snpp-1', 'VIIRS_SNPP_NRT', 110, -6, '23:58', 10),
    fire('noaa20-1', 'VIIRS_NOAA20_NRT', 110.001, -6, '00:02', 22),
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].properties.observations.length, 2);
  assert.deepEqual(new Set(result[0].properties.sensorCodes), new Set(['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT']));
  assert.equal(result[0].properties.frp, 22);
});

test('separate hotspot dates remain separate', () => {
  const a = fire('snpp-1', 'VIIRS_SNPP_NRT', 110, -6, '10:00', 10);
  const b = fire('noaa20-1', 'VIIRS_NOAA20_NRT', 110, -6, '10:00', 10);
  b.properties.date = '2026-11-07';
  assert.equal(deduplicateHotspotObservations([a, b]).length, 2);
});
