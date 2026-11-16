/**
 * NASA FIRMS VIIRS Area API client and CSV normalizer.
 * Supported sensors: Suomi-NPP, NOAA-20 and NOAA-21 NRT.
 */
export type FirmsSensorCode = 'VIIRS_SNPP_NRT' | 'VIIRS_NOAA20_NRT' | 'VIIRS_NOAA21_NRT';
export type FirmsSensorFilter = 'ALL' | FirmsSensorCode;

const FIRMS_SENSOR_LABELS: Record<FirmsSensorCode, string> = {
  VIIRS_SNPP_NRT: 'VIIRS Suomi-NPP',
  VIIRS_NOAA20_NRT: 'VIIRS NOAA-20',
  VIIRS_NOAA21_NRT: 'VIIRS NOAA-21',
};
export const FIRMS_SENSOR_CODES = Object.keys(FIRMS_SENSOR_LABELS) as FirmsSensorCode[];
export const FIRMS_INDONESIA_BBOX = '94.7,-11.0,141.1,6.1';

function parseCsvRow(line: string): string[] {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      values.push(value);
      value = '';
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

export function parseFirmsCsv(text: string, sensorCode: FirmsSensorCode): any[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = parseCsvRow(lines[0]).map((header) => header.trim().replace(/^\uFEFF/, '').toLowerCase());
  const indexOf = (name: string) => headers.indexOf(name.toLowerCase());
  const read = (row: string[], ...names: string[]) => {
    for (const name of names) {
      const index = indexOf(name);
      if (index >= 0 && row[index] !== undefined) return row[index].trim();
    }
    return '';
  };
  const numeric = (value: string): number | null => {
    if (!value || value.toLowerCase() === 'null') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  // Check schema explicitly so an HTML error page or an API error message
  // cannot be mistaken for a valid empty hotspot response.
  if (indexOf('latitude') < 0 || indexOf('longitude') < 0 || indexOf('acq_date') < 0) {
    throw new Error(`Format CSV NASA FIRMS tidak dikenali untuk ${sensorCode}. Header: ${lines[0].slice(0, 180)}`);
  }

  const features: any[] = [];
  for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
    const row = parseCsvRow(lines[rowIndex]);
    const latitude = numeric(read(row, 'latitude'));
    const longitude = numeric(read(row, 'longitude'));
    if (latitude === null || longitude === null) continue;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) continue;

    const date = read(row, 'acq_date');
    const rawTime = read(row, 'acq_time');
    const timeDigits = rawTime.replace(/\D/g, '').padStart(4, '0').slice(-4);
    const formattedTime = `${timeDigits.slice(0, 2)}:${timeDigits.slice(2, 4)}`;
    const confidenceRaw = read(row, 'confidence').toLowerCase();
    const confidence = confidenceRaw === 'h'
      ? 'Tinggi (High)'
      : confidenceRaw === 'n'
      ? 'Nominal'
      : confidenceRaw === 'l'
      ? 'Rendah (Low)'
      : confidenceRaw || 'Tidak tersedia';

    const properties = {
      id: `firms-${sensorCode}-${date}-${timeDigits}-${latitude.toFixed(5)}-${longitude.toFixed(5)}`,
      sensor: FIRMS_SENSOR_LABELS[sensorCode],
      sensorCode,
      sensorCodes: [sensorCode],
      satellite: read(row, 'satellite') || (sensorCode === 'VIIRS_SNPP_NRT' ? 'NPP' : sensorCode === 'VIIRS_NOAA20_NRT' ? 'N20' : 'N21'),
      instrument: read(row, 'instrument') || 'VIIRS',
      latitude,
      longitude,
      frp: numeric(read(row, 'frp')),
      confidence,
      confidenceRaw,
      bright_ti4: numeric(read(row, 'bright_ti4', 'brightness')),
      bright_ti5: numeric(read(row, 'bright_ti5', 'bright_t31')),
      scan: numeric(read(row, 'scan')),
      track: numeric(read(row, 'track')),
      date,
      time: formattedTime,
      acquisitionTimeUtc: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T${formattedTime}:00Z` : null,
      daynight: read(row, 'daynight').toUpperCase() === 'D' ? 'Siang (Day)' : read(row, 'daynight').toUpperCase() === 'N' ? 'Malam (Night)' : 'Tidak diketahui',
      version: read(row, 'version'),
      source: 'NASA EOSDIS LANCE FIRMS',
    };

    features.push({
      type: 'Feature',
      id: properties.id,
      geometry: { type: 'Point', coordinates: [longitude, latitude] },
      properties,
    });
  }
  return features;
}

export async function fetchSensorCSV(mapKey: string, sensorCode: FirmsSensorCode, days: number = 1): Promise<any[]> {
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(mapKey)}/${sensorCode}/${FIRMS_INDONESIA_BBOX}/${days}`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'text/csv',
      'User-Agent': 'IndonesiaGeoViewer/1.1 (+NASA FIRMS data client)',
    },
    signal: AbortSignal.timeout(15000),
    redirect: 'follow',
  });

  const body = await response.text();
  if (!response.ok) {
    const detail = body.replace(/\s+/g, ' ').slice(0, 260);
    const hint = response.status === 400 || response.status === 401 || response.status === 403
      ? ' Periksa atau rotasi NASA_FIRMS_MAP_KEY; jangan gunakan key yang pernah dipublikasikan.'
      : response.status === 429
      ? ' Batas transaksi MAP_KEY mungkin tercapai; tunggu sebelum mencoba lagi.'
      : '';
    throw new Error(`NASA FIRMS ${sensorCode}: HTTP ${response.status}; ${detail}.${hint}`);
  }
  if (!body.trim()) throw new Error(`NASA FIRMS ${sensorCode}: respons CSV kosong.`);
  return parseFirmsCsv(body, sensorCode);
}


