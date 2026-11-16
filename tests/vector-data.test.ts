import test from 'node:test';
import assert from 'node:assert/strict';
import { importVectorFile } from '../src/utils/vectorData.ts';

const makeFile = (name: string, data: unknown) => new File([JSON.stringify(data)], name, { type: 'application/geo+json' });
const polygonFeature = (name: string, coordinates: number[][][]) => ({
  type: 'Feature',
  properties: { name },
  geometry: { type: 'Polygon', coordinates },
});

test('GeoJSON polygon imports with valid bounds and geometry family', async () => {
  const file = makeFile('area.geojson', {
    type: 'FeatureCollection',
    features: [polygonFeature('Area A', [[[110, -2], [111, -2], [111, -1], [110, -1], [110, -2]]])],
  });
  const [layer] = await importVectorFile(file, '#38bdf8');
  assert.equal(layer.featureCount, 1);
  assert.equal(layer.polygonCount, 1);
  assert.equal(layer.pointCount, 0);
  assert.deepEqual(layer.bbox, [110, -2, 111, -1]);
  assert.deepEqual(layer.geometryTypes, ['Polygon']);
});

test('exact duplicate GeoJSON features are removed but same geometry with different attributes is preserved', async () => {
  const samePolygon = [[[110, -2], [111, -2], [111, -1], [110, -1], [110, -2]]];
  const file = makeFile('duplicates.geojson', {
    type: 'FeatureCollection',
    features: [
      polygonFeature('Area A', samePolygon),
      polygonFeature('Area A', samePolygon),
      polygonFeature('Area B', samePolygon),
    ],
  });
  const [layer] = await importVectorFile(file, '#38bdf8');
  assert.equal(layer.featureCount, 2);
  assert.equal(layer.duplicateFeaturesRemoved, 1);
});

test('polygon fingerprint is stable when ring start position and direction differ', async () => {
  const a = makeFile('one.geojson', {
    type: 'FeatureCollection',
    features: [polygonFeature('same', [[[110, -2], [111, -2], [111, -1], [110, -1], [110, -2]]])],
  });
  const b = makeFile('two.geojson', {
    type: 'FeatureCollection',
    features: [polygonFeature('same', [[[111, -1], [111, -2], [110, -2], [110, -1], [111, -1]]])],
  });
  const [layerA] = await importVectorFile(a, '#38bdf8');
  const [layerB] = await importVectorFile(b, '#38bdf8');
  assert.equal(layerA.fingerprint, layerB.fingerprint);
});

test('GeometryCollection is split into independently renderable geometry features', async () => {
  const file = makeFile('mixed.geojson', {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature', properties: { name: 'mixed' },
      geometry: { type: 'GeometryCollection', geometries: [
        { type: 'Point', coordinates: [110, -2] },
        { type: 'LineString', coordinates: [[110, -2], [111, -1]] },
      ] },
    }],
  });
  const [layer] = await importVectorFile(file, '#38bdf8');
  assert.equal(layer.featureCount, 2);
  assert.equal(layer.pointCount, 1);
  assert.equal(layer.lineCount, 1);
});

test('projected coordinates are not misplotted as longitude and latitude', async () => {
  const file = makeFile('projected.geojson', {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [12000000, -800000] } }],
  });
  await assert.rejects(() => importVectorFile(file, '#38bdf8'), /tidak ada fitur valid|WGS84/i);
});

test('explicit non-WGS84 GeoJSON CRS is rejected with a reprojection instruction', async () => {
  const file = makeFile('wrong-crs.geojson', {
    type: 'FeatureCollection',
    crs: { type: 'name', properties: { name: 'EPSG:3857' } },
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [110, -2] } }],
  });
  await assert.rejects(() => importVectorFile(file, '#38bdf8'), /CRS.*WGS84/i);
});

test('MapLibre reserved cluster attributes from the source are preserved under safe property names', async () => {
  const file = makeFile('cluster-properties.geojson', {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: { name: 'site', point_count: 77, cluster_id: 12, cluster: true },
      geometry: { type: 'Point', coordinates: [110, -2] },
    }],
  });
  const [layer] = await importVectorFile(file, '#38bdf8');
  const props = layer.data.features[0].properties;
  assert.equal(props.point_count, undefined);
  assert.equal(props._source_point_count, 77);
  assert.equal(props._source_cluster_id, 12);
  assert.equal(props._source_cluster, true);
});

test('open polygon rings are closed for valid GeoJSON rendering and counted', async () => {
  const file = makeFile('open-ring.geojson', {
    type: 'FeatureCollection',
    features: [polygonFeature('Open ring', [[[110, -2], [111, -2], [111, -1], [110, -1]]])],
  });
  const [layer] = await importVectorFile(file, '#38bdf8');
  assert.equal(layer.polygonRingsClosed, 1);
  const ring = layer.data.features[0].geometry.coordinates[0];
  assert.deepEqual(ring[0], ring[ring.length - 1]);
});

test('malformed coordinate arrays are excluded rather than partially drawn', async () => {
  const file = makeFile('bad-coordinates.geojson', {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [110] } },
      { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [111, -2] } },
    ],
  });
  const [layer] = await importVectorFile(file, '#38bdf8');
  assert.equal(layer.featureCount, 1);
  assert.equal(layer.skippedInvalidFeatures, 1);
});


test('same geometry and attributes with different feature IDs are preserved', async () => {
  const polygon = [[[110, -2], [111, -2], [111, -1], [110, -1], [110, -2]]];
  const file = makeFile('different-ids.geojson', {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', id: 'feature-1', properties: { name: 'Area' }, geometry: { type: 'Polygon', coordinates: polygon } },
      { type: 'Feature', id: 'feature-2', properties: { name: 'Area' }, geometry: { type: 'Polygon', coordinates: polygon } },
    ],
  });
  const [layer] = await importVectorFile(file, '#38bdf8');
  assert.equal(layer.featureCount, 2);
  assert.equal(layer.duplicateFeaturesRemoved, 0);
});

test('dataset fingerprint does not depend on GeoJSON feature order', async () => {
  const first = { type: 'Feature', id: 'a', properties: { name: 'A' }, geometry: { type: 'Point', coordinates: [110, -2] } };
  const second = { type: 'Feature', id: 'b', properties: { name: 'B' }, geometry: { type: 'Point', coordinates: [111, -3] } };
  const fileA = makeFile('ordered-a.geojson', { type: 'FeatureCollection', features: [first, second] });
  const fileB = makeFile('ordered-b.geojson', { type: 'FeatureCollection', features: [second, first] });
  const [layerA] = await importVectorFile(fileA, '#38bdf8');
  const [layerB] = await importVectorFile(fileB, '#38bdf8');
  assert.equal(layerA.fingerprint, layerB.fingerprint);
});


test('line direction is not normalized away because it can carry network or flow meaning', async () => {
  const forward = makeFile('flow-forward.geojson', {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: { name: 'stream' }, geometry: { type: 'LineString', coordinates: [[110, -2], [111, -1], [112, 0]] } }],
  });
  const reverse = makeFile('flow-reverse.geojson', {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: { name: 'stream' }, geometry: { type: 'LineString', coordinates: [[112, 0], [111, -1], [110, -2]] } }],
  });
  const [a] = await importVectorFile(forward, '#38bdf8');
  const [b] = await importVectorFile(reverse, '#38bdf8');
  assert.notEqual(a.fingerprint, b.fingerprint);
});
