import * as turf from '@turf/turf';

export function calculateDistanceKm(coordinates: [number, number][]): number {
  if (coordinates.length < 2) return 0;
  const line = turf.lineString(coordinates);
  return turf.length(line, { units: 'kilometers' });
}

export function calculateAreaKm2(coordinates: [number, number][]): { sqKm: number; hectares: number } {
  if (coordinates.length < 3) return { sqKm: 0, hectares: 0 };
  // Ensure closed ring
  const ring = [...coordinates];
  if (
    ring[0][0] !== ring[ring.length - 1][0] ||
    ring[0][1] !== ring[ring.length - 1][1]
  ) {
    ring.push(ring[0]);
  }
  const polygon = turf.polygon([ring]);
  const areaSqM = turf.area(polygon);
  const sqKm = areaSqM / 1_000_000;
  const hectares = areaSqM / 10_000;
  return { sqKm, hectares };
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(2)} km`;
}

export function formatArea(sqKm: number, hectares: number): string {
  if (sqKm < 0.1) {
    return `${hectares.toFixed(2)} Hektar (${Math.round(sqKm * 1_000_000).toLocaleString('id-ID')} m²)`;
  }
  return `${sqKm.toFixed(2)} km² (${Math.round(hectares).toLocaleString('id-ID')} Hektar)`;
}
