export type GeoFeature = {
  type: 'Feature';
  id?: string | number;
  geometry: { type: string; coordinates: number[] };
  properties: Record<string, any>;
};

const distanceKm = (a: number[], b: number[]): number => {
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const minuteOfDay = (value: unknown): number => {
  const text = String(value || '').replace(':', '').padStart(4, '0');
  const hours = Number(text.slice(0, 2));
  const minutes = Number(text.slice(2, 4));
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : NaN;
};

/**
 * Conservative cross-provider earthquake matching. All input observations
 * remain available in properties.observations and properties.sources.
 */
export function deduplicateEarthquakeFeatures(features: GeoFeature[]): GeoFeature[] {
  const deduplicated: GeoFeature[] = [];
  for (const feature of features) {
    const properties = feature.properties || {};
    const timestamp = Date.parse(properties.datetime || '');
    const match = deduplicated.find((candidate) => {
      const candidateProperties = candidate.properties || {};
      const candidateTime = Date.parse(candidateProperties.datetime || '');
      if (!feature.geometry?.coordinates || !candidate.geometry?.coordinates) return false;
      const sameTime = Number.isFinite(timestamp) && Number.isFinite(candidateTime) && Math.abs(timestamp - candidateTime) <= 10 * 60 * 1000;
      const similarMagnitude = Math.abs(Number(properties.magnitude || 0) - Number(candidateProperties.magnitude || 0)) <= 0.4;
      return sameTime && similarMagnitude && distanceKm(feature.geometry.coordinates, candidate.geometry.coordinates) <= 12;
    });
    const observation = {
      source: properties.source,
      sourceId: properties.id,
      type: properties.type,
      datetime: properties.datetime,
      magnitude: properties.magnitude,
      coordinates: feature.geometry?.coordinates,
    };
    if (match) {
      const target = match.properties;
      target.observations = [...(target.observations || []), observation];
      target.sources = Array.from(new Set([...(target.sources || [target.source]), properties.source]));
      if (String(properties.source || '').startsWith('BMKG') && !String(target.source || '').startsWith('BMKG')) {
        match.properties = { ...properties, sources: target.sources, observations: target.observations };
      }
    } else {
      feature.properties = { ...properties, sources: [properties.source], observations: [observation] };
      deduplicated.push(feature);
    }
  }
  return deduplicated;
}

/**
 * Group co-located VIIRS observations from multiple sensors to avoid drawing
 * duplicate points. Each original observation stays nested in the grouped feature.
 */
export function deduplicateHotspotObservations(rawFeatures: GeoFeature[]): GeoFeature[] {
  const groups: GeoFeature[] = [];
  for (const observation of rawFeatures) {
    const properties = observation.properties || {};
    const time = minuteOfDay(properties.time);
    const match = groups.find((group) => {
      const candidate = group.properties || {};
      const candidateTime = minuteOfDay(candidate.time);
      const rawDifference = Number.isFinite(time) && Number.isFinite(candidateTime) ? Math.abs(time - candidateTime) : Infinity;
      const minuteDifference = Math.min(rawDifference, 1440 - rawDifference);
      return candidate.date === properties.date && minuteDifference <= 5 && distanceKm(group.geometry.coordinates, observation.geometry.coordinates) <= 0.375;
    });
    if (match) {
      const observations = [...(match.properties.observations || []), { ...properties }];
      const sensorCodes = Array.from(new Set([...(match.properties.sensorCodes || []), properties.sensorCode]));
      if (Number(properties.frp || 0) > Number(match.properties.frp || 0)) {
        match.geometry = observation.geometry;
        match.properties = { ...properties, observations, sensorCodes };
      } else {
        match.properties.observations = observations;
        match.properties.sensorCodes = sensorCodes;
      }
    } else {
      groups.push({ ...observation, properties: { ...properties, sensorCodes: [properties.sensorCode], observations: [{ ...properties }] } });
    }
  }
  return groups;
}
