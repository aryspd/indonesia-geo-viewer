import type { ImportedVectorLayer, VectorGeometryFamily } from '../types/vector';

const MAX_FILE_BYTES = 75 * 1024 * 1024;
const COORD_PRECISION = 9;

function stableStringify(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function roundCoord(value: number): number {
  return Number(value.toFixed(COORD_PRECISION));
}

function canonicalPosition(position: number[]): number[] {
  return position.map((n) => roundCoord(n));
}

function canonicalLine(line: number[][], ring = false): number[][] {
  const coords = line.map(canonicalPosition);
  if (coords.length < 2) return coords;
  // A line's direction and first/last vertex may carry meaning (e.g. river flow or route direction).
  // Only polygon rings are rotation/reversal invariant for duplicate matching.
  if (!ring) return coords;
  const body = coords.length > 2 ? coords.slice(0, -1) : coords;
  const minIndex = body.reduce((best, item, index) => {
    const current = stableStringify(item);
    const previous = stableStringify(body[best]);
    return current < previous ? index : best;
  }, 0);
  const rotate = (values: number[][], start: number) => [...values.slice(start), ...values.slice(0, start)];
  const forward = rotate(body, minIndex);
  const reverse = rotate([...body].reverse(), [...body].reverse().findIndex((p) => stableStringify(p) === stableStringify(body[minIndex])));
  const chosen = stableStringify(forward) <= stableStringify(reverse) ? forward : reverse;
  return ring ? [...chosen, chosen[0]] : chosen;
}

function canonicalGeometry(geometry: any): any {
  if (!geometry) return null;
  switch (geometry.type) {
    case 'Point': return { type: 'Point', coordinates: canonicalPosition(geometry.coordinates) };
    case 'MultiPoint': return { type: 'MultiPoint', coordinates: geometry.coordinates.map(canonicalPosition).sort((a: any,b: any) => stableStringify(a).localeCompare(stableStringify(b))) };
    case 'LineString': return { type: 'LineString', coordinates: canonicalLine(geometry.coordinates) };
    case 'MultiLineString': return { type: 'MultiLineString', coordinates: geometry.coordinates.map((line: number[][]) => canonicalLine(line)).sort((a: any,b: any) => stableStringify(a).localeCompare(stableStringify(b))) };
    case 'Polygon': return { type: 'Polygon', coordinates: geometry.coordinates.map((ring: number[][]) => canonicalLine(ring, true)).sort((a: any,b: any) => stableStringify(a).localeCompare(stableStringify(b))) };
    case 'MultiPolygon': return { type: 'MultiPolygon', coordinates: geometry.coordinates.map((polygon: number[][][]) => polygon.map((ring) => canonicalLine(ring, true)).sort((a: any,b: any) => stableStringify(a).localeCompare(stableStringify(b)))).sort((a: any,b: any) => stableStringify(a).localeCompare(stableStringify(b))) };
    default: return geometry;
  }
}

function geometryFamily(type: string): VectorGeometryFamily | null {
  if (type === 'Point' || type === 'MultiPoint') return 'Point';
  if (type === 'LineString' || type === 'MultiLineString') return 'LineString';
  if (type === 'Polygon' || type === 'MultiPolygon') return 'Polygon';
  return null;
}

function walkPositions(coordinates: any, callback: (position: number[]) => void): void {
  if (!Array.isArray(coordinates)) return;
  if (coordinates.length >= 2 && typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
    callback(coordinates as number[]);
    return;
  }
  for (const child of coordinates) walkPositions(child, callback);
}

function prepareGeometry(geometry: any): { geometry: any; closedRings: number } | null {
  if (!geometry || typeof geometry.type !== 'string') return null;
  let closedRings = 0;
  const closeRing = (ring: number[][]): number[][] | null => {
    if (!Array.isArray(ring) || ring.length < 3 || !ring.every((position) => Array.isArray(position) && position.length >= 2 && position.every((value) => Number.isFinite(value)))) return null;
    const cloned = ring.map((position) => [...position]);
    const first = cloned[0];
    const last = cloned[cloned.length - 1];
    if (!first || !last) return null;
    const isClosed = first.length >= 2 && last.length >= 2 && first[0] === last[0] && first[1] === last[1];
    if (!isClosed) {
      cloned.push([...first]);
      closedRings += 1;
    }
    const distinct = new Set(cloned.slice(0, -1).map((position) => `${position[0]},${position[1]}`));
    return distinct.size >= 3 ? cloned : null;
  };

  if (geometry.type === 'Polygon') {
    const rings = (geometry.coordinates || []).map(closeRing);
    if (!rings.length || rings.some((ring: any) => !ring)) return null;
    return { geometry: { ...geometry, coordinates: rings }, closedRings };
  }
  if (geometry.type === 'MultiPolygon') {
    const polygons = (geometry.coordinates || []).map((polygon: number[][][]) => polygon.map(closeRing));
    if (!polygons.length || polygons.some((polygon: any[]) => !polygon.length || polygon.some((ring) => !ring))) return null;
    return { geometry: { ...geometry, coordinates: polygons }, closedRings };
  }
  if (geometry.type === 'LineString' && Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2) {
    return { geometry, closedRings };
  }
  if (geometry.type === 'MultiLineString' && Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0 && geometry.coordinates.every((line: any[]) => line.length >= 2)) {
    return { geometry, closedRings };
  }
  if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) return { geometry, closedRings };
  if (geometry.type === 'MultiPoint' && Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0) return { geometry, closedRings };
  if (geometry.type === 'GeometryCollection') return { geometry, closedRings };
  return null;
}

function coordinateTreeValid(coordinates: any): boolean {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return false;
  if (typeof coordinates[0] === 'number') {
    return coordinates.length >= 2 && coordinates.every((value) => Number.isFinite(value));
  }
  return coordinates.every(coordinateTreeValid);
}

function geometryValid(geometry: any): boolean {
  if (!geometry || typeof geometry.type !== 'string') return false;
  if (geometry.type === 'GeometryCollection') return Array.isArray(geometry.geometries) && geometry.geometries.length > 0 && geometry.geometries.every(geometryValid);
  let positions = 0;
  let valid = true;
  walkPositions(geometry.coordinates, (position) => {
    positions += 1;
    const [lng, lat] = position;
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) valid = false;
  });
  return valid && positions > 0 && coordinateTreeValid(geometry.coordinates);
}

function flattenGeometryCollection(feature: any): any[] {
  if (feature.geometry?.type !== 'GeometryCollection') return [feature];
  return (feature.geometry.geometries || []).flatMap((geometry: any, index: number) => {
    const child = { ...feature, geometry, properties: { ...(feature.properties || {}), _geometry_part: index + 1 } };
    return flattenGeometryCollection(child);
  });
}

function makeLabel(properties: Record<string, any>): string {
  const preferred = ['namaobjek', 'namobj', 'name', 'nama', 'namobjek', 'wadmkc', 'wadmkd', 'kabupaten', 'provinsi', 'label', 'title'];
  const keys = Object.keys(properties || {});
  for (const wanted of preferred) {
    const key = keys.find((candidate) => candidate.toLowerCase().replace(/[_\s-]/g, '') === wanted);
    const value = key ? properties[key] : undefined;
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim().slice(0, 80);
  }
  return '';
}

function hashText(input: string): string {
  // Deterministic FNV-1a 64-bit style hash without a crypto dependency.
  let h1 = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < input.length; i++) {
    h1 ^= BigInt(input.charCodeAt(i));
    h1 = BigInt.asUintN(64, h1 * prime);
  }
  return h1.toString(16).padStart(16, '0');
}

function readFeatureCollection(input: any): any {
  if (input?.type === 'FeatureCollection' && Array.isArray(input.features)) return input;
  if (input?.type === 'Feature') return { type: 'FeatureCollection', features: [input] };
  if (input?.type && input?.coordinates) return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: input }] };
  if (Array.isArray(input) && input.every((item) => item?.type === 'Feature')) return { type: 'FeatureCollection', features: input };
  throw new Error('Struktur file tidak dikenali. Gunakan GeoJSON FeatureCollection, Feature, atau ZIP Shapefile.');
}

function prepareCollection(raw: any, fileName: string, sourceFormat: ImportedVectorLayer['sourceFormat'], color: string): ImportedVectorLayer {
  // GeoJSON follows RFC 7946 WGS84. Reject projected coordinates rather than plotting them in the wrong place.
  if (raw?.crs && !/4326|CRS84|WGS.?84/i.test(stableStringify(raw.crs))) {
    throw new Error(`CRS pada ${fileName} bukan WGS84/EPSG:4326. Reproject GeoJSON ke EPSG:4326 sebelum impor.`);
  }

  const source = readFeatureCollection(raw);
  const features: any[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  let invalid = 0;
  let pointCount = 0;
  let lineCount = 0;
  let polygonCount = 0;
  let polygonRingsClosed = 0;
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  const geometryFamilies = new Set<VectorGeometryFamily>();

  for (const original of source.features) {
    if (!original?.geometry) { invalid += 1; continue; }
    const parts = flattenGeometryCollection(original);
    for (const part of parts) {
      const prepared = prepareGeometry(part.geometry);
      if (!prepared || !geometryValid(prepared.geometry)) { invalid += 1; continue; }
      polygonRingsClosed += prepared.closedRings;
      part.geometry = prepared.geometry;
      const family = geometryFamily(part.geometry.type);
      if (!family) { invalid += 1; continue; }
      const properties = part.properties && typeof part.properties === 'object' ? { ...part.properties } : {};
      // MapLibre reserves these keys for point clustering. Preserve source values under a safe alias.
      for (const reserved of ['cluster', 'cluster_id', 'point_count', 'point_count_abbreviated']) {
        if (Object.prototype.hasOwnProperty.call(properties, reserved)) {
          properties[`_source_${reserved}`] = properties[reserved];
          delete properties[reserved];
        }
      }
      if (Object.prototype.hasOwnProperty.call(properties, '_map_label')) {
        properties._source_map_label = properties._map_label;
      }
      const label = makeLabel(properties);
      const feature = {
        type: 'Feature',
        ...(part.id !== undefined ? { id: part.id } : {}),
        geometry: part.geometry,
        properties: { ...properties, _map_label: label },
      };
      const key = stableStringify({ id: feature.id ?? null, geometry: canonicalGeometry(feature.geometry), properties: feature.properties });
      if (seen.has(key)) { duplicates += 1; continue; }
      seen.add(key);
      features.push(feature);
      geometryFamilies.add(family);
      if (family === 'Point') pointCount += 1;
      if (family === 'LineString') lineCount += 1;
      if (family === 'Polygon') polygonCount += 1;
      walkPositions(feature.geometry.coordinates, ([lng, lat]) => {
        bounds[0] = Math.min(bounds[0], lng);
        bounds[1] = Math.min(bounds[1], lat);
        bounds[2] = Math.max(bounds[2], lng);
        bounds[3] = Math.max(bounds[3], lat);
      });
    }
  }

  if (!features.length) throw new Error(`${fileName}: tidak ada fitur valid dengan koordinat WGS84.`);
  const bbox = bounds as [number, number, number, number];
  const canonicalFeatures = features.map((feature) => stableStringify({ id: feature.id ?? null, geometry: canonicalGeometry(feature.geometry), properties: feature.properties })).sort();
  const fingerprint = hashText(canonicalFeatures.join('\n'));
  const basename = fileName.replace(/\.(geojson|json|zip)$/i, '');
  return {
    id: `user-${fingerprint}`,
    name: raw?.fileName || basename,
    sourceFileName: fileName,
    sourceFormat,
    data: { type: 'FeatureCollection', features, bbox },
    geometryTypes: [...geometryFamilies],
    featureCount: features.length,
    duplicateFeaturesRemoved: duplicates,
    skippedInvalidFeatures: invalid,
    polygonRingsClosed,
    pointCount,
    lineCount,
    polygonCount,
    bbox,
    fingerprint,
    color,
    visible: true,
    opacity: 0.28,
    showLabels: false,
  };
}

export async function importVectorFile(file: File, color: string, relatedFiles: File[] = []): Promise<ImportedVectorLayer[]> {
  const extension = file.name.toLowerCase().split('.').pop();
  let parsed: any;
  let sourceFormat: ImportedVectorLayer['sourceFormat'];
  if (extension === 'geojson' || extension === 'json') {
    if (file.size > MAX_FILE_BYTES) throw new Error('Ukuran file melebihi 75 MB. Untuk dataset besar, gunakan GeoPackage/PMTiles atau layanan PostGIS/GeoServer.');
    parsed = JSON.parse(await file.text());
    sourceFormat = 'GeoJSON';
  } else if (extension === 'zip') {
    if (file.size > MAX_FILE_BYTES) throw new Error('Ukuran file melebihi 75 MB. Untuk dataset besar, gunakan GeoPackage/PMTiles atau layanan PostGIS/GeoServer.');
    const shpModule = await import('shpjs');
    parsed = await shpModule.default(await file.arrayBuffer());
    sourceFormat = 'Shapefile ZIP';
  } else if (extension === 'shp') {
    const stem = file.name.replace(/\.shp$/i, '').toLowerCase();
    const siblings = relatedFiles.filter((candidate) => candidate.name.replace(/\.[^.]+$/, '').toLowerCase() === stem);
    const sidecars = new Map(siblings.map((candidate) => [candidate.name.split('.').pop()!.toLowerCase(), candidate]));
    const prjFile = sidecars.get('prj');
    if (!prjFile) throw new Error(`${file.name}: file .prj tidak ditemukan. Sertakan .prj agar koordinat dapat diproyeksikan dengan benar ke WGS84.`);
    const totalBytes = siblings.reduce((sum, candidate) => sum + candidate.size, 0);
    if (totalBytes > MAX_FILE_BYTES) throw new Error('Ukuran satu paket Shapefile melebihi 75 MB. Untuk dataset besar, gunakan GeoPackage/PMTiles atau layanan server.');
    const bundle: Record<string, ArrayBuffer> = { shp: await file.arrayBuffer(), prj: await prjFile.arrayBuffer() };
    const dbf = sidecars.get('dbf');
    const shx = sidecars.get('shx');
    const cpg = sidecars.get('cpg');
    if (dbf) bundle.dbf = await dbf.arrayBuffer();
    if (shx) bundle.shx = await shx.arrayBuffer();
    if (cpg) bundle.cpg = await cpg.arrayBuffer();
    const shpModule = await import('shpjs');
    parsed = await shpModule.default(bundle as any);
    sourceFormat = 'Shapefile';
  } else {
    throw new Error('Format belum didukung. Gunakan .geojson/.json, ZIP Shapefile, atau pilih .shp bersama file .shx/.dbf/.prj.');
  }

  const collections = Array.isArray(parsed) ? parsed : [parsed];
  return collections.map((collection) => {
    const name = collection?.fileName ? `${collection.fileName}` : file.name;
    return prepareCollection(collection, name, sourceFormat, color);
  });
}
