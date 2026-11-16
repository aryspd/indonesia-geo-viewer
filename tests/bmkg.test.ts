import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBmkgCap, parseBmkgNowcastFeed } from '../server/bmkg.ts';

test('BMKG nowcast RSS parser extracts links, descriptions and CAP identifiers', () => {
  const xml = `<?xml version="1.0"?><rss><channel><item><title>Hujan lebat - Jawa Barat</title><link>https://www.bmkg.go.id/alerts/nowcast/id/ABC.123_alert.xml</link><description><![CDATA[Wilayah terdampak &amp; sekitarnya]]></description><pubDate>Sun, 08 Nov 2026 10:00:00 +0700</pubDate></item></channel></rss>`;
  const items = parseBmkgNowcastFeed(xml);
  assert.equal(items.length, 1);
  assert.equal(items[0].alertCode, 'ABC.123');
  assert.equal(items[0].title, 'Hujan lebat - Jawa Barat');
  assert.match(items[0].description, /Wilayah terdampak & sekitarnya/);
});

test('BMKG CAP parser converts CAP lat-lon polygon to closed GeoJSON lon-lat ring', () => {
  const xml = `<alert><identifier>id-1</identifier><sender>BMKG</sender><sent>2026-11-08T10:00:00+07:00</sent><info><event>Hujan Lebat</event><urgency>Immediate</urgency><severity>Severe</severity><certainty>Likely</certainty><headline>Peringatan hujan</headline><description>Hujan lebat dan petir.</description><expires>2026-11-08T12:00:00+07:00</expires><area><areaDesc>Kecamatan Contoh</areaDesc><polygon>-0.1,109.2 -0.1,109.4 0.1,109.4 0.1,109.2</polygon></area></info></alert>`;
  const parsed = parseBmkgCap(xml);
  assert.equal(parsed.alert.identifier, 'id-1');
  assert.equal(parsed.geojson.features.length, 1);
  const feature = parsed.geojson.features[0];
  assert.equal(feature.geometry.type, 'Polygon');
  assert.equal(feature.properties.areaDescription, 'Kecamatan Contoh');
  assert.deepEqual(feature.geometry.coordinates[0][0], [109.2, -0.1]);
  assert.deepEqual(feature.geometry.coordinates[0][0], feature.geometry.coordinates[0].at(-1));
});

test('CAP areas without valid polygons are not fabricated into GeoJSON', () => {
  const xml = `<alert><info><event>Cuaca</event><area><areaDesc>Tanpa batas</areaDesc><polygon>invalid</polygon></area></info></alert>`;
  assert.equal(parseBmkgCap(xml).geojson.features.length, 0);
});
