import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const catalog = read('src/data/layersCatalog.ts');
const arcgisCatalog = read('src/data/arcgisServices.ts');
const serverSource = read('server.ts');
const mapViewerSource = read('src/components/MapViewer.tsx');
const sidebarSource = read('src/components/SidebarLayers.tsx');
const ids = [...catalog.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
const issues = [];
const expectedLayerIds = [
  'admin-provinces',
  'disaster-viirs-snpp', 'disaster-viirs-noaa20', 'disaster-viirs-noaa21',
  'weather-wind-particles', 'weather-air-quality', 'weather-rain-potential',
  'weather-bmkg-nowcast', 'weather-gpm-precipitation',
  'gfw-tree-cover-loss', 'gfw-peatlands', 'gfw-mangrove-extent', 'gfw-wood-fiber-concessions', 'gfw-oil-palm',
];
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicateIds.length) issues.push(`Duplicate catalogue IDs: ${[...new Set(duplicateIds)].join(', ')}`);
for (const id of expectedLayerIds) {
  if (ids.filter((value) => value === id).length !== 1) issues.push(`Expected exactly one ${id} catalogue entry.`);
}
const bigOverlayIds = ['big-gunung-api', 'big-forest-zones', 'big-mining-licenses', 'big-coal-iup'];
for (const id of bigOverlayIds) {
  if (!new RegExp(`id:\\s*['"]${id}['"]`).test(arcgisCatalog)) issues.push(`Missing BIG ArcGIS overlay ${id}.`);
}
const obsoleteIds = [
  'satellite-sentinel2', 'satellite-nasa-gibs-terra', 'satellite-nasa-gibs-night',
  'weather-precipitation-radar', 'weather-cloud-cover', 'disaster-bmkg-quakes',
  'env-tree-cover-loss', 'env-indonesia-forest-zones', 'topo-copernicus-dem',
  'admin-kabkota-boundaries', 'admin-kecamatan-boundaries', 'big-atlas-batubara',
  'big-atlas-penutup-lahan', 'gfw-fire-history', 'gfw-peat-lands', 'gfw-palm-oil-mills',
];
for (const id of obsoleteIds) {
  if (ids.includes(id) || new RegExp(`id:\\s*['"]${id}['"]`).test(arcgisCatalog)) issues.push(`Obsolete layer remains in new catalogue: ${id}`);
}
if (/url:\s*['"]https:\/\/[^'"]*Atlas_250K_BatuBara/i.test(arcgisCatalog)) issues.push('Restricted BIG PTRA coal atlas must not be embedded in the public catalogue.');

for (const sensorCode of ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT']) {
  if (!mapViewerSource.includes(sensorCode)) issues.push(`MapViewer does not request ${sensorCode} independently.`);
}
if (!/onFirmsSensorStatus/.test(mapViewerSource) || !/'empty'/.test(mapViewerSource) || !/state: 'error'/.test(mapViewerSource)) {
  issues.push('VIIRS per-sensor status diagnostics are missing.');
}
if (!/Muat ulang VIIRS/.test(sidebarSource)) issues.push('VIIRS manual refresh control is missing.');
if (!/api\/firms\/status/.test(serverSource)) issues.push('NASA FIRMS status diagnostic endpoint is missing.');

if (!/api\/admin\/boundaries\/province/.test(serverSource) || !/STIG\/Batas_Provinsi\/MapServer\/0\/query/.test(serverSource)) {
  issues.push('Official BIG province polygon endpoint is missing.');
}
if (!/api\/weather\/grid/.test(serverSource) || !/air-quality-api\.open-meteo\.com/.test(serverSource) || !/api\.open-meteo\.com\/v1\/forecast/.test(serverSource)) {
  issues.push('Weather model grid API routes are missing.');
}
for (const id of ['idn_wood_fiber', 'gfw_plantations', 'gfw_oil_palm', 'gfw_mining_concessions']) {
  if (!serverSource.includes(id)) issues.push(`GFW vector tile dataset ${id} proxy missing from server.`);
}
for (const id of ['idn_wood_fiber', 'gfw_oil_palm']) {
  if (!catalog.includes(id)) issues.push(`GFW vector tile dataset ${id} missing from catalogue.`);
}
for (const id of ['umd_tree_cover_loss', 'gfw_peatlands']) {
  if (!serverSource.includes(id) || !catalog.includes(id)) issues.push(`GFW raster tile dataset ${id} is not configured end-to-end.`);
}
for (const route of ['/api/gfw/vector-style/:dataset', '/api/gfw/vector-tiles/:dataset/:z/:x/:y.pbf', '/api/gfw/raster-tiles/:dataset/:z/:x/:y.png']) {
  if (!serverSource.includes(route)) issues.push(`Missing GFW proxy route ${route}.`);
}
if (!/GFW_API_KEY/.test(read('.env.example'))) issues.push('GFW_API_KEY configuration key note missing from .env.example.');
if (!/IMERG_Precipitation_Rate_30min/.test(catalog)) issues.push('NASA GPM IMERG 30-minute layer missing.');
if (!/alerts\/nowcast\/id/.test(serverSource)) issues.push('Official BMKG CAP Nowcast route missing.');
if (!/weather\/bmkg/.test(sidebarSource)) issues.push('BMKG ADM4 forecast lookup is missing from Sidebar.');

const allSourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|jsx|json|md|env)$/.test(entry.name) || entry.name === '.env.example') allSourceFiles.push(full);
  }
}
walk(root);
for (const file of allSourceFiles) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  if (rel === '.env') continue;
  const contents = fs.readFileSync(file, 'utf8');
  if (new RegExp('ab489d74c348a57' + 'ded166d6d90e37e42', 'i').test(contents)) issues.push(`Exposed NASA FIRMS key literal in ${rel}`);
  if (new RegExp('8563c2789597fca' + '7800cae91e3f39898', 'i').test(contents)) issues.push(`Exposed NASA FIRMS key literal in ${rel}`);
  if (/NASA_FIRMS_MAP_KEY\s*=\s*["']?[0-9a-f]{32}/i.test(contents)) issues.push(`Hardcoded NASA FIRMS key assignment in ${rel}`);
  if (/localStorage\.(getItem|setItem)\(['"]nasa_firms_key/.test(contents)) issues.push(`NASA FIRMS key still stored in localStorage in ${rel}`);
  if (/mapKey=/.test(contents)) issues.push(`Client-supplied mapKey parameter remains in ${rel}`);
}

const frontendFiles = allSourceFiles.filter((file) => {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  return rel.startsWith('src/') || rel === 'index.html';
});
for (const file of frontendFiles) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const contents = fs.readFileSync(file, 'utf8');
  if (/process\.env\b|import\.meta\.env\b/.test(contents)) issues.push(`Environment variable reference found in frontend file ${rel}`);
  if (/GEMINI_API_KEY|GFW_API_KEY|x-api-key/i.test(contents)) issues.push(`Server secret reference found in frontend file ${rel}`);
  if (/['"][0-9a-f]{32}['"]/i.test(contents)) issues.push(`Potential 32-hex API key literal found in frontend file ${rel}`);
}
if (/getProvincesGeoJSON|representative provincial boundary box polygon/.test(read('src/data/indonesiaLocations.ts'))) issues.push('Synthetic province polygons remain.');
if (/2026-03-01/.test(catalog) || /replace\(\/2026-03-01/.test(mapViewerSource)) issues.push('Fixed stale GIBS date remains.');
if (!/deduplicateHotspotObservations/.test(serverSource)) issues.push('Hotspot deduplication helper is missing.');
if (!/mergedFeatures/.test(serverSource)) issues.push('Earthquake cross-provider deduplication helper is missing.');

const vectorImporter = read('src/components/VectorDataManager.tsx');
const vectorParser = read('src/utils/vectorData.ts');
if (!/GeoJSON/.test(vectorImporter) || !/Shapefile/.test(vectorImporter)) issues.push('GeoJSON/Shapefile importer UI is missing.');
for (const style of ['polygon-fill', 'line-casing', 'point-circles', 'point-clusters']) {
  if (!mapViewerSource.includes(style)) issues.push(`Geometry-specific MapLibre style missing: ${style}`);
}
if (!/WGS84|4326/.test(vectorParser) || !/fingerprint/.test(vectorParser)) issues.push('Vector CRS validation or dataset fingerprint missing.');

if (issues.length) {
  console.error('DATA AUDIT FAILED');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}
const thematicIds = [...(catalog.split('export const INITIAL_LAYERS:')[1] || '').matchAll(/id:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
console.log(`DATA AUDIT PASSED — ${thematicIds.length} active catalogue layers; ${BASEMAPS_COUNT()} basemaps retained separately; 3 independent VIIRS layers; 4 GFW vector proxies + 2 GFW raster datasets; no exposed provider keys; no legacy thematic IDs.`);
function BASEMAPS_COUNT() {
  const match = read('src/data/layersCatalog.ts').match(/export const BASEMAPS:[\s\S]*?= \[([\s\S]*?)\];/);
  return match ? (match[1].match(/id:\s*['"]/g) || []).length : 0;
}
