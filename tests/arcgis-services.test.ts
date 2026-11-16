import test from 'node:test';
import assert from 'node:assert/strict';
import { ARCGIS_OVERLAY_SERVICES } from '../src/data/arcgisServices.ts';

test('public BIG ArcGIS layer catalog has unique IDs and valid service candidates', () => {
  const ids = ARCGIS_OVERLAY_SERVICES.map((service) => service.id);
  assert.equal(new Set(ids).size, ids.length, 'service IDs must be unique');
  assert.deepEqual(ids.sort(), [
    'big-coal-iup',
    'big-gunung-api',
    'big-forest-zones',
    'big-mining-licenses',
  ].sort());
  for (const service of ARCGIS_OVERLAY_SERVICES) {
    assert.ok(service.name.length > 0, `${service.id} needs a display name`);
    assert.ok(service.candidates.length > 0, `${service.id} needs at least one source`);
    assert.ok(service.attribution.trim().length > 0, `${service.id} needs attribution`);
    assert.ok(service.license.trim().length > 0, `${service.id} needs a use note`);
    for (const candidate of service.candidates) {
      assert.match(candidate.url, /^https:\/\//, `${service.id} source must use HTTPS`);
      assert.equal(candidate.serviceType, 'MapServer');
      if (candidate.layerIds) assert.ok(candidate.layerIds.every((id) => Number.isInteger(id) && id >= 0));
    }
  }
});

test('public coal layer uses BIG KSP IUP commodity filter, not restricted BIG PTRA Atlas service', () => {
  const coal = ARCGIS_OVERLAY_SERVICES.find((service) => service.id === 'big-coal-iup');
  assert.ok(coal);
  assert.equal(coal.candidates[0].layerIds?.[0], 4);
  assert.match(coal.candidates[0].layerDefinitions?.[4] || '', /tiptmb/i);
  assert.doesNotMatch(coal.candidates[0].url, /Atlas_250K_BatuBara/i);
});

test('volcano reference uses the six scale-dependent BIG atlas sublayers', () => {
  const volcano = ARCGIS_OVERLAY_SERVICES.find((service) => service.id === 'big-gunung-api');
  assert.deepEqual(volcano?.candidates[0].layerIds, [1, 3, 5, 7, 9, 11]);
  assert.match(volcano?.description || '', /status gunung api/i);
});
