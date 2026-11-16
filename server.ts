import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { deduplicateEarthquakeFeatures, deduplicateHotspotObservations } from './server/deduplication';
import { ARCGIS_OVERLAY_SERVICES, type ArcGisServiceCandidate } from './src/data/arcgisServices';
import { parseBmkgNowcastFeed, parseBmkgCap } from './server/bmkg';
import { FIRMS_SENSOR_CODES, FIRMS_INDONESIA_BBOX, fetchSensorCSV, type FirmsSensorFilter } from './server/firms';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

const BMKG_BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json, application/xml, text/xml, */*',
  Referer: 'https://www.bmkg.go.id/',
};

const BMKG_WEATHER_CITIES = [
  { name: 'Banda Aceh', adm4: '11.71.01.2001' },
  { name: 'Medan', adm4: '12.71.01.1001' },
  { name: 'Padang', adm4: '13.71.01.1001' },
  { name: 'Pekanbaru', adm4: '14.71.01.1002' },
  { name: 'Palembang', adm4: '16.71.01.1001' },
  { name: 'Jakarta Pusat', adm4: '31.71.01.1001' },
  { name: 'Bandung', adm4: '32.73.01.1001' },
  { name: 'Semarang', adm4: '33.74.01.1001' },
  { name: 'Yogyakarta', adm4: '34.71.01.1001' },
  { name: 'Surabaya', adm4: '35.78.01.1001' },
  { name: 'Serang', adm4: '36.73.01.1001' },
  { name: 'Denpasar', adm4: '51.71.01.1001' },
  { name: 'Kupang', adm4: '53.71.01.1001' },
  { name: 'Pontianak', adm4: '61.71.01.1002' },
  { name: 'Palangka Raya', adm4: '62.71.01.1001' },
  { name: 'Banjarmasin', adm4: '63.71.01.1001' },
  { name: 'Balikpapan', adm4: '64.71.01.1001' },
  { name: 'Samarinda', adm4: '64.72.01.1001' },
  { name: 'Manado', adm4: '71.71.01.1001' },
  { name: 'Makassar', adm4: '73.71.01.1001' },
  { name: 'Gorontalo', adm4: '75.71.01.1001' },
  { name: 'Ternate', adm4: '82.71.01.1001' },
  { name: 'Jayapura', adm4: '91.71.01.1001' },
];

app.use(express.json());

// In-memory cache with TTL
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}
const cache = new Map<string, CacheItem<unknown>>();

function getCached<T>(key: string): T | null {
  const item = cache.get(key) as CacheItem<T> | undefined;
  if (!item) return null;
  if (Date.now() - item.timestamp > item.ttlMs) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, timestamp: Date.now(), ttlMs });
}

// ----------------------------------------------------
// API 1: BMKG & USGS Earthquakes Proxy with Normalization
// ----------------------------------------------------
app.get('/api/quakes', async (req: Request, res: Response) => {
  const cacheKey = 'quakes_data';
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  let bmkgLatest = null;
  let bmkgRecent: any[] = [];
  let bmkgFelt: any[] = [];
  let usgsQuakes: any[] = [];
  let bmkgFeedRequestsSucceeded = 0;
  let usgsFeedSucceeded = false;

  // Fetch BMKG AutoGempa (latest detected quake)
  try {
    const autoRes = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', {
      headers: BMKG_BROWSER_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (autoRes.ok) {
      bmkgFeedRequestsSucceeded += 1;
      const json = await autoRes.json();
      bmkgLatest = json?.Infogempa?.gempa || null;
    }
  } catch (e) {
    console.warn('BMKG autogempa fetch warning:', (e as Error).message);
  }

  // Fetch BMKG M5+ Recent Quakes
  try {
    const terkiniRes = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json', {
      headers: BMKG_BROWSER_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (terkiniRes.ok) {
      bmkgFeedRequestsSucceeded += 1;
      const json = await terkiniRes.json();
      bmkgRecent = json?.Infogempa?.gempa || [];
    }
  } catch (e) {
    console.warn('BMKG gempaterkini fetch warning:', (e as Error).message);
  }

  // Fetch BMKG Felt Quakes
  try {
    const feltRes = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json', {
      headers: BMKG_BROWSER_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (feltRes.ok) {
      bmkgFeedRequestsSucceeded += 1;
      const json = await feltRes.json();
      bmkgFelt = json?.Infogempa?.gempa || [];
    }
  } catch (e) {
    console.warn('BMKG felt quake fetch warning:', (e as Error).message);
  }

  // Fetch USGS Quakes for Indonesia region (lat -12 to 7, lng 94 to 142)
  try {
    const usgsRes = await fetch(
      'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=2.5&minlatitude=-12&maxlatitude=7&minlongitude=94&maxlongitude=142&limit=50',
      {
        headers: { 'User-Agent': 'IndonesiaGeoViewer/1.0' },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (usgsRes.ok) {
      usgsFeedSucceeded = true;
      const json = await usgsRes.json();
      usgsQuakes = json?.features || [];
    }
  } catch (e) {
    console.warn('USGS quakes fetch warning:', (e as Error).message);
  }

  // Parse BMKG string coordinates: "Coordinates": "-8.23,115.12"
  const parseCoordinates = (coordStr?: string): [number, number] | null => {
    if (!coordStr) return null;
    const parts = coordStr.split(',').map((p) => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return [parts[1], parts[0]]; // [lng, lat] for GeoJSON
    }
    return null;
  };

  // Convert to standardized GeoJSON FeatureCollection
  const features: any[] = [];

  // Add BMKG latest
  if (bmkgLatest) {
    const coords = parseCoordinates(bmkgLatest.Coordinates);
    if (coords) {
      features.push({
        type: 'Feature',
        id: `bmkg-auto-${bmkgLatest.DateTime || Date.now()}`,
        geometry: { type: 'Point', coordinates: coords },
        properties: {
          id: `bmkg-auto-${bmkgLatest.DateTime || Date.now()}`,
          source: 'BMKG (Pusat Gempa Nasional)',
          type: 'autogempa',
          isLatest: true,
          date: bmkgLatest.Tanggal,
          time: bmkgLatest.Jam,
          datetime: bmkgLatest.DateTime,
          magnitude: parseFloat(bmkgLatest.Magnitude || '0'),
          depth: bmkgLatest.Kedalaman,
          area: bmkgLatest.Wilayah,
          potential: bmkgLatest.Potensi,
          shakemap: bmkgLatest.Shakemap ? `/api/bmkg/shakemap/${encodeURIComponent(bmkgLatest.Shakemap)}` : null,
          felt: bmkgLatest.Dirasakan || null,
        },
      });
    }
  }

  // Add BMKG M5+
  for (const q of bmkgRecent) {
    const coords = parseCoordinates(q.Coordinates);
    if (coords) {
      features.push({
        type: 'Feature',
        id: `bmkg-m5-${q.DateTime || q.Jam}-${q.Magnitude}`,
        geometry: { type: 'Point', coordinates: coords },
        properties: {
          id: `bmkg-m5-${q.DateTime || q.Jam}`,
          source: 'BMKG M5+',
          type: 'gempaterkini',
          isLatest: false,
          date: q.Tanggal,
          time: q.Jam,
          datetime: q.DateTime,
          magnitude: parseFloat(q.Magnitude || '0'),
          depth: q.Kedalaman,
          area: q.Wilayah,
          potential: q.Potensi,
          shakemap: q.Shakemap ? `/api/bmkg/shakemap/${encodeURIComponent(q.Shakemap)}` : null,
          felt: null,
        },
      });
    }
  }

  // Add BMKG Felt quakes
  for (const q of bmkgFelt) {
    const coords = parseCoordinates(q.Coordinates);
    if (coords) {
      features.push({
        type: 'Feature',
        id: `bmkg-felt-${q.DateTime || q.Jam}-${q.Magnitude}`,
        geometry: { type: 'Point', coordinates: coords },
        properties: {
          id: `bmkg-felt-${q.DateTime || q.Jam}`,
          source: 'BMKG Dirasakan',
          type: 'gempadirasakan',
          isLatest: false,
          date: q.Tanggal,
          time: q.Jam,
          datetime: q.DateTime,
          magnitude: parseFloat(q.Magnitude || '0'),
          depth: q.Kedalaman,
          area: q.Wilayah,
          potential: 'Dirasakan di wilayah sekitar',
          shakemap: null,
          felt: q.Dirasakan,
        },
      });
    }
  }

  // Add USGS features if BMKG features are sparse
  for (const u of usgsQuakes) {
    if (u.geometry && u.geometry.coordinates) {
      features.push({
        type: 'Feature',
        id: `usgs-${u.id}`,
        geometry: u.geometry,
        properties: {
          id: `usgs-${u.id}`,
          source: 'USGS Earthquake Hazards',
          type: 'usgs',
          isLatest: false,
          date: new Date(u.properties.time).toLocaleDateString('id-ID'),
          time: new Date(u.properties.time).toLocaleTimeString('id-ID'),
          datetime: new Date(u.properties.time).toISOString(),
          magnitude: u.properties.mag || 0,
          depth: `${Math.round(u.geometry.coordinates[2] || 0)} km`,
          area: u.properties.place || 'Wilayah Indonesia',
          potential: u.properties.tsunami === 1 ? 'Peringatan Tsunami Tercatat' : 'Tidak berpotensi tsunami',
          shakemap: null,
          felt: u.properties.felt ? `${u.properties.felt} laporan` : null,
          url: u.properties.url,
        },
      });
    }
  }

  // Cross-provider duplicates are consolidated in a tested pure helper.
  const mergedFeatures = deduplicateEarthquakeFeatures(features);

  const responsePayload = {
    type: 'FeatureCollection',
    metadata: {
      generatedAt: new Date().toISOString(),
      count: mergedFeatures.length,
      rawObservationCount: features.length,
      deduplication: 'Cross-provider match: <=12 km, <=10 minutes, magnitude difference <=0.4; source observations retained in properties.observations.',
      bmkgLatest: bmkgLatest
        ? {
            ...bmkgLatest,
            shakemap: bmkgLatest.Shakemap ? `/api/bmkg/shakemap/${encodeURIComponent(bmkgLatest.Shakemap)}` : null,
          }
        : null,
      providers: {
        bmkg: {
          status: bmkgFeedRequestsSucceeded === 0 ? 'UNAVAILABLE' : (bmkgLatest || bmkgRecent.length || bmkgFelt.length) ? 'DATA_PRESENT' : 'EMPTY',
          successfulFeeds: bmkgFeedRequestsSucceeded,
          quakes: bmkgRecent.length + bmkgFelt.length + (bmkgLatest ? 1 : 0),
        },
        usgs: { status: !usgsFeedSucceeded ? 'UNAVAILABLE' : usgsQuakes.length > 0 ? 'DATA_PRESENT' : 'EMPTY', quakes: usgsQuakes.length },
      },
    },
    features: mergedFeatures,
  };

  // Cache for 60 seconds
  setCache(cacheKey, responsePayload, 60 * 1000);
  return res.json(responsePayload);
});

// ----------------------------------------------------
// BMKG public data: latest earthquake mirror, CAP nowcast and village forecast
// Official BMKG feeds remain the primary source. Dhanypedia is a third-party
// read-only mirror of BMKG data and is labelled as such in the response.
// ----------------------------------------------------
app.get('/api/bmkg/earthquake/latest', async (_req: Request, res: Response) => {
  const cacheKey = 'bmkg_dhanypedia_earthquake_latest';
  const cached = getCached<any>(cacheKey);
  if (cached) return res.json(cached);
  try {
    const response = await fetch('https://bmkg-api.dhanypedia.com/v1/earthquake/latest', {
      headers: { 'User-Agent': 'IndonesiaGeoViewer/1.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) return res.status(response.status).json({ status: 'UPSTREAM_ERROR', provider: 'Dhanypedia BMKG API (third-party mirror)', upstreamStatus: response.status, data });
    const payload = {
      ...data,
      metadata: {
        provider: 'Dhanypedia BMKG API (third-party mirror)',
        primaryDataSource: 'BMKG',
        checkedAt: new Date().toISOString(),
        attribution: 'Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika). Endpoint perantara pihak ketiga: Dhanypedia; tidak berafiliasi dengan BMKG.',
      },
    };
    setCache(cacheKey, payload, 60 * 1000);
    return res.json(payload);
  } catch (error) {
    return res.status(502).json({ status: 'UNAVAILABLE', provider: 'Dhanypedia BMKG API (third-party mirror)', error: (error as Error).message, checkedAt: new Date().toISOString() });
  }
});

app.get('/api/bmkg/shakemap/:filename', async (req: Request, res: Response) => {
  const filename = String(req.params.filename || '').trim();
  if (!/^[A-Za-z0-9_.-]+\.(jpg|jpeg|png)$/i.test(filename)) {
    return res.status(400).json({ error: 'Nama file shakemap tidak valid.' });
  }
  const cacheKey = `bmkg_shakemap_${filename}`;
  const cached = getCached<{ contentType: string; bytes: Buffer }>(cacheKey);
  if (cached) {
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Cache-Control', 'public, max-age=1800');
    return res.send(cached.bytes);
  }
  try {
    const upstream = await fetch(`https://data.bmkg.go.id/DataMKG/TEWS/${encodeURIComponent(filename)}`, {
      headers: BMKG_BROWSER_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) return res.status(upstream.status).end();
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const bytes = Buffer.from(await upstream.arrayBuffer());
    setCache(cacheKey, { contentType, bytes }, 30 * 60 * 1000);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=1800');
    return res.send(bytes);
  } catch {
    return res.status(502).end();
  }
});

app.get('/api/bmkg/nowcast', async (req: Request, res: Response) => {
  const lang = String(req.query.lang || 'id').toLowerCase() === 'en' ? 'en' : 'id';
  const cacheKey = `bmkg_nowcast_feed_${lang}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return res.json(cached);
  try {
    const response = await fetch(`https://www.bmkg.go.id/alerts/nowcast/${lang}`, {
      headers: { ...BMKG_BROWSER_HEADERS, Accept: 'application/rss+xml, application/xml, text/xml' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`BMKG nowcast feed returned ${response.status}`);
    const xml = await response.text();
    const items = parseBmkgNowcastFeed(xml);
    const payload = {
      provider: 'BMKG (official nowcast RSS/CAP)', language: lang, checkedAt: new Date().toISOString(),
      lastBuildDate: xml.match(/<lastBuildDate\b[^>]*>([\s\S]*?)<\/lastBuildDate>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() || null,
      count: items.length, items,
      attribution: 'Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika).',
    };
    setCache(cacheKey, payload, 90 * 1000);
    return res.json(payload);
  } catch (error) {
    return res.status(502).json({ status: 'UNAVAILABLE', provider: 'BMKG official nowcast', error: (error as Error).message, checkedAt: new Date().toISOString() });
  }
});

// Aggregated alert polygons for the map. CAP polygons are true geographic areas;
// alerts without a polygon remain available from /api/bmkg/nowcast as feed items.
app.get('/api/bmkg/nowcast/geojson', async (req: Request, res: Response) => {
  const lang = String(req.query.lang || 'id').toLowerCase() === 'en' ? 'en' : 'id';
  const cacheKey = `bmkg_nowcast_geojson_${lang}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return res.json(cached);
  try {
    const feedResponse = await fetch(`https://www.bmkg.go.id/alerts/nowcast/${lang}`, {
      headers: { ...BMKG_BROWSER_HEADERS, Accept: 'application/rss+xml, application/xml, text/xml' },
      signal: AbortSignal.timeout(8000),
    });
    if (!feedResponse.ok) throw new Error(`BMKG nowcast feed returned ${feedResponse.status}`);
    const items = parseBmkgNowcastFeed(await feedResponse.text());
    const activeItems = items.filter((item) => item.alertCode).slice(0, 12);
    const details = await Promise.allSettled(activeItems.map(async (item) => {
      const url = `https://www.bmkg.go.id/alerts/nowcast/${lang}/${encodeURIComponent(item.alertCode!)}_alert.xml`;
      const response = await fetch(url, { headers: { ...BMKG_BROWSER_HEADERS, Accept: 'application/xml, text/xml' }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`CAP ${item.alertCode} returned ${response.status}`);
      return { item, parsed: parseBmkgCap(await response.text()) };
    }));
    const features: any[] = [];
    const detailErrors: string[] = [];
    for (const result of details) {
      if (result.status === 'fulfilled') {
        for (const feature of result.value.parsed.geojson.features) {
          features.push({ ...feature, properties: { ...feature.properties, feedTitle: result.value.item.title, feedDescription: result.value.item.description, feedPubDate: result.value.item.pubDate, alertCode: result.value.item.alertCode } });
        }
      } else detailErrors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
    }
    const payload = {
      type: 'FeatureCollection', features,
      metadata: {
        provider: 'BMKG (official nowcast RSS/CAP)', language: lang, checkedAt: new Date().toISOString(),
        feedAlerts: items.length, detailAlertsFetched: activeItems.length, polygonFeatures: features.length,
        detailErrors, attribution: 'Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika).',
        note: 'Hanya area CAP yang menyediakan elemen polygon yang digambar di peta. Peringatan tanpa geometri polygon tetap tersedia pada /api/bmkg/nowcast.',
      },
    };
    setCache(cacheKey, payload, 90 * 1000);
    return res.json(payload);
  } catch (error) {
    return res.status(502).json({ type: 'FeatureCollection', features: [], status: 'UNAVAILABLE', provider: 'BMKG official nowcast', error: (error as Error).message, checkedAt: new Date().toISOString() });
  }
});

app.get('/api/bmkg/nowcast/:alertCode', async (req: Request, res: Response) => {
  const alertCode = String(req.params.alertCode || '');
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(alertCode)) return res.status(400).json({ error: 'Kode peringatan CAP tidak valid.' });
  const lang = String(req.query.lang || 'id').toLowerCase() === 'en' ? 'en' : 'id';
  const cacheKey = `bmkg_nowcast_cap_${lang}_${alertCode}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return res.json(cached);
  try {
    const response = await fetch(`https://www.bmkg.go.id/alerts/nowcast/${lang}/${encodeURIComponent(alertCode)}_alert.xml`, {
      headers: { ...BMKG_BROWSER_HEADERS, Accept: 'application/xml, text/xml' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`BMKG CAP returned ${response.status}`);
    const parsed = parseBmkgCap(await response.text());
    const payload = { ...parsed, provider: 'BMKG official nowcast CAP', language: lang, checkedAt: new Date().toISOString(), attribution: 'Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika).' };
    setCache(cacheKey, payload, 90 * 1000);
    return res.json(payload);
  } catch (error) {
    return res.status(502).json({ status: 'UNAVAILABLE', provider: 'BMKG official nowcast CAP', error: (error as Error).message, checkedAt: new Date().toISOString() });
  }
});

// ----------------------------------------------------
// API 2: Open-Meteo Weather Point & Grid
// ----------------------------------------------------
app.get('/api/weather/point', async (req: Request, res: Response) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ status: 'INVALID_COORDINATES', error: 'lat/lng harus berupa koordinat WGS84 yang valid.' });
  }
  const cacheKey = `weather_${lat.toFixed(2)}_${lng.toFixed(2)}`;

  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FJakarta&forecast_days=3`;
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) {
      throw new Error(`Open-Meteo responded with status ${response.status}`);
    }
    const data = await response.json();
    const payload = {
      ...data,
      metadata: {
        provider: 'Open-Meteo',
        dataType: 'forecast',
        timezone: data.timezone || 'Asia/Jakarta',
        checkedAt: new Date().toISOString(),
        attribution: 'Open-Meteo forecast/model data; bukan pengamatan radar real-time.',
      },
    };
    setCache(cacheKey, payload, 15 * 60 * 1000); // 15 min cache
    return res.json(payload);
  } catch (err) {
    return res.status(502).json({ error: 'Failed to fetch weather data', message: (err as Error).message });
  }
});

// BMKG village-level weather forecast. This is forecast data, not live observation.
app.get('/api/weather/bmkg', async (req: Request, res: Response) => {
  const adm4 = String(req.query.adm4 || '').trim();
  if (!/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(adm4)) return res.status(400).json({ error: 'Parameter adm4 wajib berupa kode wilayah tingkat desa/kelurahan.' });
  const cacheKey = `bmkg_forecast_${adm4}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return res.json(cached);
  try {
    const response = await fetch(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(adm4)}`, {
      headers: BMKG_BROWSER_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`BMKG forecast returned ${response.status}`);
    const data = await response.json();
    const payload = { ...data, metadata: { provider: 'BMKG', dataType: 'forecast', requestedAdm4: adm4, checkedAt: new Date().toISOString(), attribution: 'Data prakiraan cuaca BMKG; periksa timestamp prakiraan pada setiap record.' } };
    setCache(cacheKey, payload, 30 * 60 * 1000);
    return res.json(payload);
  } catch (error) { return res.status(502).json({ status: 'UNAVAILABLE', provider: 'BMKG', error: (error as Error).message, checkedAt: new Date().toISOString() }); }
});

// Wind Field Matrix for Particle Simulation across Indonesia
// Primary: NOAA NCEP GFS 10m wind & surface temp via Sipongi Opsroom (/api/gfs)
// Fallback: Open-Meteo 28-point anchor forecast
app.get('/api/weather/wind-field', async (_req: Request, res: Response) => {
  const cacheKey = 'indonesia_wind_field_gfs';
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  // 1. Try Sipongi Opsroom GFS GRIB2-JSON endpoint
  try {
    const gfsRes = await fetch('https://opsroom.sipongidata.my.id/api/gfs', {
      headers: { 'User-Agent': BMKG_BROWSER_HEADERS['User-Agent'], Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (gfsRes.ok) {
      const gfs = await gfsRes.json();
      if (Array.isArray(gfs) && gfs.length >= 2) {
        const tempRec = gfs.find((r: any) => r?.header?.parameterCategory === 0 && r?.header?.parameterNumber === 0);
        const uRec = gfs.find((r: any) => r?.header?.parameterCategory === 2 && r?.header?.parameterNumber === 2);
        const vRec = gfs.find((r: any) => r?.header?.parameterCategory === 2 && r?.header?.parameterNumber === 3);

        if (uRec?.data && vRec?.data && uRec.header?.nx === 360) {
          const minLat = -15;
          const maxLat = 10;
          const minLng = 90;
          const maxLng = 145;
          const rows = maxLat - minLat + 1; // 26
          const cols = maxLng - minLng + 1; // 56
          const gridU: number[] = [];
          const gridV: number[] = [];
          const gridTemp: Array<number | null> = [];
          const points: any[] = [];

          for (let lat = minLat; lat <= maxLat; lat++) {
            const j = Math.round(90 - lat);
            for (let lng = minLng; lng <= maxLng; lng++) {
              const i = Math.round(lng);
              const idx = j * 360 + i;
              const uMs = Number(uRec.data[idx] ?? 0);
              const vMs = Number(vRec.data[idx] ?? 0);
              const u = Number((uMs * 3.6).toFixed(2)); // km/h
              const v = Number((vMs * 3.6).toFixed(2)); // km/h
              const speed = Number(Math.hypot(u, v).toFixed(2));
              const direction = Math.round(((Math.atan2(-uMs, -vMs) * 180) / Math.PI + 360) % 360);
              const tempC = tempRec?.data?.[idx] != null ? Number((Number(tempRec.data[idx]) - 273.15).toFixed(1)) : null;

              gridU.push(u);
              gridV.push(v);
              gridTemp.push(tempC);

              if (lat % 2 === 0 && lng % 3 === 0) {
                points.push({
                  name: `GFS (${lat}°, ${lng}°)`,
                  lat,
                  lng,
                  speed,
                  direction,
                  u,
                  v,
                  temp: tempC,
                });
              }
            }
          }

          const payload = {
            timestamp: new Date().toISOString(),
            refTime: uRec.header?.refTime || null,
            metadata: {
              provider: 'Sipongi Opsroom / NOAA NCEP GFS',
              dataType: 'gfs-grid',
              method: '1° × 1° GFS GRIB2 10m wind field with bilinear interpolation',
              sampleCount: gridU.length,
              refTime: uRec.header?.refTime || null,
              note: 'Data GFS 10m U/V angin (km/j) dan suhu permukaan via opsroom.sipongidata.my.id/api/gfs.',
            },
            gridBounds: { minLat, maxLat, minLng, maxLng },
            grid: { minLat, maxLat, minLng, maxLng, dLat: 1, dLng: 1, rows, cols, u: gridU, v: gridV, temp: gridTemp },
            points,
          };
          setCache(cacheKey, payload, 20 * 60 * 1000);
          return res.json(payload);
        }
      }
    }
  } catch (gfsErr) {
    console.warn('Sipongi GFS wind field unavailable, falling back to Open-Meteo:', (gfsErr as Error).message);
  }

  try {
    // Fallback: Open-Meteo multi-location forecast
    const samplePoints = [
      { name: 'Selat Malaka / Banda Aceh', lat: 5.5, lng: 95.3 },
      { name: 'Medan / Selat Malaka', lat: 3.6, lng: 98.7 },
      { name: 'Padang / Samudra Hindia', lat: -0.9, lng: 100.3 },
      { name: 'Pekanbaru / Riau', lat: 0.5, lng: 101.4 },
      { name: 'Palembang / Selat Bangka', lat: -2.9, lng: 104.7 },
      { name: 'Jakarta / Laut Jawa', lat: -6.2, lng: 106.8 },
      { name: 'Semarang / Laut Jawa', lat: -7.0, lng: 110.4 },
      { name: 'Surabaya / Selat Madura', lat: -7.2, lng: 112.7 },
      { name: 'Denpasar / Selat Bali', lat: -8.6, lng: 115.2 },
      { name: 'Mataram / Selat Lombok', lat: -8.6, lng: 116.1 },
      { name: 'Kupang / Laut Timor', lat: -10.2, lng: 123.6 },
      { name: 'Pontianak / Laut Natuna', lat: -0.0, lng: 109.3 },
      { name: 'Banjarmasin / Laut Jawa', lat: -3.3, lng: 114.6 },
      { name: 'Balikpapan / Selat Makassar', lat: -1.2, lng: 116.8 },
      { name: 'Samarinda / Selat Makassar', lat: -0.5, lng: 117.1 },
      { name: 'Tarakan / Laut Sulawesi', lat: 3.3, lng: 117.6 },
      { name: 'Manado / Laut Maluku', lat: 1.5, lng: 124.8 },
      { name: 'Palu / Selat Makassar', lat: -0.9, lng: 119.8 },
      { name: 'Makassar / Selat Makassar', lat: -5.1, lng: 119.4 },
      { name: 'Kendari / Laut Banda', lat: -3.9, lng: 122.5 },
      { name: 'Ambon / Laut Banda', lat: -3.7, lng: 128.2 },
      { name: 'Ternate / Laut Halmahera', lat: 0.8, lng: 127.4 },
      { name: 'Sorong / Laut Halmahera', lat: -0.8, lng: 131.2 },
      { name: 'Manokwari / Samudra Pasifik', lat: -0.8, lng: 134.0 },
      { name: 'Jayapura / Samudra Pasifik', lat: -2.5, lng: 140.7 },
      { name: 'Merauke / Laut Arafura', lat: -8.5, lng: 140.4 },
      { name: 'Laut Natuna Utara', lat: 4.5, lng: 108.0 },
      { name: 'Laut Arafura Barat', lat: -7.5, lng: 134.5 },
    ];

    const latList = samplePoints.map((p) => p.lat).join(',');
    const lngList = samplePoints.map((p) => p.lng).join(',');

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latList}&longitude=${lngList}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,temperature_2m&timezone=Asia%2FJakarta`;
    const omRes = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!omRes.ok) throw new Error(`Open-Meteo status ${omRes.status}`);

    const resJson = await omRes.json();
    const results = Array.isArray(resJson) ? resJson : [resJson];

    const windPoints = results.map((item, idx) => {
      const cur = item.current || {};
      const pt = samplePoints[idx];
      const speed = cur.wind_speed_10m == null ? NaN : Number(cur.wind_speed_10m);
      const deg = cur.wind_direction_10m == null ? NaN : Number(cur.wind_direction_10m);
      if (!Number.isFinite(speed) || !Number.isFinite(deg)) return null;
      const rad = ((deg + 180) % 360) * (Math.PI / 180);
      const u = speed * Math.sin(rad);
      const v = speed * Math.cos(rad);
      return {
        name: pt.name,
        lat: pt.lat,
        lng: pt.lng,
        speed,
        direction: deg,
        u,
        v,
        gust: cur.wind_gusts_10m == null ? null : Number(cur.wind_gusts_10m),
        temp: cur.temperature_2m == null ? null : Number(cur.temperature_2m),
        precip: cur.precipitation == null ? null : Number(cur.precipitation),
      };
    }).filter((point) => point !== null);

    if (windPoints.length === 0) throw new Error('Open-Meteo returned no valid wind anchor values');
    const payload = {
      timestamp: new Date().toISOString(),
      metadata: {
        provider: 'Open-Meteo',
        dataType: 'forecast',
        method: '28 anchor points with inverse-distance interpolation estimate',
        sampleCount: windPoints.length,
        note: 'Particles visualize an interpolation estimate from forecast anchors, not a continuous observed wind field.',
      },
      gridBounds: { minLat: -11.5, maxLat: 6.0, minLng: 95.0, maxLng: 141.5 },
      points: windPoints,
    };

    setCache(cacheKey, payload, 20 * 60 * 1000);
    return res.json(payload);
  } catch (err) {
    console.warn('Wind field unavailable:', (err as Error).message);
    return res.status(502).json({ status: 'UNAVAILABLE', error: 'Data angin GFS/Open-Meteo tidak tersedia.', checkedAt: new Date().toISOString() });
  }
});

// ----------------------------------------------------
// Open-Meteo national sample grid for air quality and rain probability.
// Points are model samples, not direct station observations or a continuous raster.
// Free API terms are non-commercial only; attribution is required.
// ----------------------------------------------------
const INDONESIA_WEATHER_GRID = (() => {
  const points: Array<{ lat: number; lng: number }> = [];
  for (const lat of [-9, -6, -3, 0, 3, 6]) {
    for (const lng of [96, 101, 106, 111, 116, 121, 126, 131, 136, 141]) {
      points.push({ lat, lng });
    }
  }
  return points;
})();

function closestHourlyIndex(times: string[] = []): number {
  if (!times.length) return -1;
  const now = Date.now();
  let selected = 0;
  let smallest = Number.POSITIVE_INFINITY;
  times.forEach((value, index) => {
    // Open-Meteo returns local Jakarta timestamps as YYYY-MM-DDTHH:mm.
    const timestamp = Date.parse(`${String(value).replace(' ', 'T')}:00+07:00`);
    if (!Number.isFinite(timestamp)) return;
    const delta = Math.abs(timestamp - now);
    if (delta < smallest) { smallest = delta; selected = index; }
  });
  return selected;
}

function estimateRainProbFromBmkg(weatherDesc = ''): number {
  const d = weatherDesc.toLowerCase();
  if (d.includes('petir') || d.includes('kilat')) return 90;
  if (d.includes('lebat')) return 85;
  if (d.includes('sedang')) return 75;
  if (d.includes('ringan')) return 60;
  if (d.includes('kabut') || d.includes('udara kabur')) return 30;
  if (d.includes('berawan tebal')) return 40;
  if (d.includes('berawan') && d.includes('cerah')) return 15;
  if (d.includes('berawan')) return 25;
  if (d.includes('cerah')) return 5;
  return 20;
}

app.get('/api/weather/grid', async (req: Request, res: Response) => {
  const kind = String(req.query.kind || '').toLowerCase();
  if (!['air', 'rain'].includes(kind)) return res.status(400).json({ error: 'kind harus air atau rain.' });
  const cacheKey = `weather_grid_v2_${kind}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return res.json(cached);

  // 1. Air Quality: Primary Sipongi AQMS (99 live stations), Fallback Open-Meteo CAMS
  if (kind === 'air') {
    try {
      const aqmsRes = await fetch('https://opsroom.sipongidata.my.id/api/aqms', {
        headers: { 'User-Agent': BMKG_BROWSER_HEADERS['User-Agent'], Accept: 'application/json' },
        signal: AbortSignal.timeout(12000),
      });
      if (aqmsRes.ok) {
        const aqmsRaw = await aqmsRes.json();
        if (Array.isArray(aqmsRaw?.features) && aqmsRaw.features.length > 0) {
          const features = aqmsRaw.features.flatMap((f: any) => {
            const lng = Number(f?.geometry?.coordinates?.[0]);
            const lat = Number(f?.geometry?.coordinates?.[1]);
            if (!Number.isFinite(lng) || !Number.isFinite(lat)) return [];
            const ispu = Number(f?.properties?.val ?? f?.properties?.nilai ?? 0);
            const safeIspu = Number.isFinite(ispu) ? ispu : 0;
            const rawCat = String(f?.properties?.cat || '').trim().toUpperCase();
            const category = rawCat || (safeIspu <= 50 ? 'BAIK' : safeIspu <= 100 ? 'SEDANG' : safeIspu <= 200 ? 'TIDAK SEHAT' : safeIspu <= 300 ? 'SANGAT TIDAK SEHAT' : 'BERBAHAYA');
            return [{
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [lng, lat] },
              properties: {
                dataType: 'aqms',
                provider: 'KLHK / Sipongi AQMS',
                kota: f?.properties?.kota || 'Stasiun AQMS',
                provinsi: f?.properties?.provinsi || '',
                alamat: f?.properties?.alamat || '',
                waktu: f?.properties?.waktu || '',
                ispu: safeIspu,
                pm2_5: safeIspu,
                category,
                cat: category,
                latitude: lat,
                longitude: lng,
              },
            }];
          });
          if (features.length > 0) {
            const payload = {
              type: 'FeatureCollection',
              metadata: {
                provider: 'KLHK / Opsroom Sipongi AQMS',
                kind: 'air',
                dataType: 'aqms-stations',
                sampleCount: features.length,
                checkedAt: new Date().toISOString(),
                attribution: 'Data Kualitas Udara AQMS via opsroom.sipongidata.my.id/api/aqms.',
                note: 'Stasiun pemantauan kualitas udara ISPU real-time KLHK di Indonesia.',
              },
              features,
            };
            setCache(cacheKey, payload, 15 * 60 * 1000);
            return res.json(payload);
          }
        }
      }
    } catch (aqmsErr) {
      console.warn('Sipongi AQMS unavailable, falling back to Open-Meteo CAMS:', (aqmsErr as Error).message);
    }
  }

  // 2. Rain & Weather Forecast: Primary BMKG 23 Provincial Capitals + Open-Meteo Grid
  if (kind === 'rain') {
    try {
      const bmkgResults = await Promise.allSettled(
        BMKG_WEATHER_CITIES.map(async (city) => {
          const r = await fetch(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(city.adm4)}`, {
            headers: BMKG_BROWSER_HEADERS,
            signal: AbortSignal.timeout(9000),
          });
          if (!r.ok) throw new Error(`BMKG ${city.adm4} HTTP ${r.status}`);
          return { city, data: await r.json() };
        })
      );

      const bmkgFeatures: any[] = [];
      for (const resItem of bmkgResults) {
        if (resItem.status !== 'fulfilled') continue;
        const { city, data } = resItem.value;
        const lokasi = data?.lokasi || data?.data?.[0]?.lokasi;
        const lat = Number(lokasi?.lat);
        const lon = Number(lokasi?.lon);
        const groups = Array.isArray(data?.data) ? data.data : [];
        const slots = groups.flatMap((g: any) => (Array.isArray(g?.cuaca) ? g.cuaca.flat() : []));
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || slots.length === 0) continue;

        const nowMs = Date.now();
        let cur = slots[0];
        let minDiff = Infinity;
        for (const s of slots) {
          const ts = Date.parse(s.datetime || s.utc_datetime || '');
          if (Number.isFinite(ts)) {
            const diff = Math.abs(ts - nowMs);
            if (diff < minDiff) { minDiff = diff; cur = s; }
          }
        }
        const prob = estimateRainProbFromBmkg(cur?.weather_desc || '');
        bmkgFeatures.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lon, lat] },
          properties: {
            dataType: 'bmkg-forecast',
            provider: 'BMKG Prakiraan Cuaca Terbuka',
            kota: lokasi?.kotkab || city.name,
            cityName: city.name,
            provinsi: lokasi?.provinsi || '',
            kecamatan: lokasi?.kecamatan || '',
            desa: lokasi?.desa || '',
            adm4: lokasi?.adm4 || city.adm4,
            weather_desc: cur?.weather_desc || 'Cerah Berawan',
            t: cur?.t ?? null,
            hu: cur?.hu ?? null,
            ws: cur?.ws ?? null,
            wd: cur?.wd || '',
            tcc: cur?.tcc ?? null,
            tp: cur?.tp ?? 0,
            image: cur?.image || null,
            local_datetime: cur?.local_datetime || cur?.datetime || '',
            precipitation_probability: prob,
            precipitation_mm: Number(cur?.tp ?? 0),
            latitude: lat,
            longitude: lon,
            forecastSlots: slots.slice(0, 8).map((s: any) => ({
              local_datetime: s.local_datetime || s.datetime,
              weather_desc: s.weather_desc,
              t: s.t,
              hu: s.hu,
              ws: s.ws,
              wd: s.wd,
              tp: s.tp,
              image: s.image,
            })),
          },
        });
      }

      if (bmkgFeatures.length >= 5) {
        const payload = {
          type: 'FeatureCollection',
          metadata: {
            provider: 'BMKG Prakiraan Cuaca Terbuka',
            kind: 'rain',
            dataType: 'bmkg-forecast-cities',
            sampleCount: bmkgFeatures.length,
            checkedAt: new Date().toISOString(),
            attribution: 'Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika).',
            note: 'Prakiraan cuaca resmi BMKG per 3 jam pada kota-kota utama di Indonesia.',
          },
          features: bmkgFeatures,
        };
        setCache(cacheKey, payload, 20 * 60 * 1000);
        return res.json(payload);
      }
    } catch (bmkgErr) {
      console.warn('BMKG weather grid unavailable, falling back to Open-Meteo:', (bmkgErr as Error).message);
    }
  }

  try {
    const latitudes = INDONESIA_WEATHER_GRID.map((point) => point.lat).join(',');
    const longitudes = INDONESIA_WEATHER_GRID.map((point) => point.lng).join(',');
    const endpoint = kind === 'air'
      ? `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitudes}&longitude=${longitudes}&hourly=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&forecast_days=1&timezone=Asia%2FJakarta`
      : `https://api.open-meteo.com/v1/forecast?latitude=${latitudes}&longitude=${longitudes}&hourly=precipitation_probability,precipitation,rain&forecast_days=1&timezone=Asia%2FJakarta`;
    const upstream = await fetch(endpoint, {
      headers: { 'User-Agent': 'IndonesiaGeoViewer/1.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
    if (!upstream.ok) throw new Error(`Open-Meteo ${kind} returned HTTP ${upstream.status}`);
    const raw = await upstream.json();
    const locations = Array.isArray(raw) ? raw : [raw];
    const features = locations.flatMap((item: any, index: number) => {
      const point = INDONESIA_WEATHER_GRID[index];
      if (!point || !item?.hourly || !Array.isArray(item.hourly.time)) return [];
      const timeIndex = closestHourlyIndex(item.hourly.time);
      if (timeIndex < 0) return [];
      const value = (name: string) => {
        const series = item.hourly[name];
        const result = Array.isArray(series) ? Number(series[timeIndex]) : NaN;
        return Number.isFinite(result) ? result : null;
      };
      const properties: Record<string, unknown> = {
        provider: 'Open-Meteo',
        modelType: kind === 'air' ? 'CAMS global atmospheric composition forecast' : 'Numerical weather forecast',
        sampleTime: item.hourly.time[timeIndex],
        latitude: point.lat,
        longitude: point.lng,
      };
      if (kind === 'air') {
        properties.pm2_5 = value('pm2_5');
        properties.ispu = properties.pm2_5;
        properties.pm10 = value('pm10');
        properties.carbon_monoxide = value('carbon_monoxide');
        properties.nitrogen_dioxide = value('nitrogen_dioxide');
        properties.sulphur_dioxide = value('sulphur_dioxide');
        properties.ozone = value('ozone');
      } else {
        properties.precipitation_probability = value('precipitation_probability');
        properties.precipitation_mm = value('precipitation');
        properties.rain_mm = value('rain');
      }
      const required = kind === 'air' ? properties.pm2_5 : properties.precipitation_probability;
      if (required === null || required === undefined) return [];
      return [{ type: 'Feature', geometry: { type: 'Point', coordinates: [point.lng, point.lat] }, properties }];
    });
    const payload = {
      type: 'FeatureCollection',
      metadata: {
        provider: 'Open-Meteo',
        kind,
        dataType: 'model sample grid',
        sampleCount: features.length,
        checkedAt: new Date().toISOString(),
        attribution: 'Weather data by Open-Meteo (CC BY 4.0). Free API is for non-commercial use only.',
        note: kind === 'air'
          ? 'CAMS global model (~0.4 degree / ~45 km, 3-hourly); not station-measured ISPU.'
          : 'Forecast probability and precipitation for the nearest hourly model timestep; not observed rainfall/radar.',
      },
      features,
    };
    setCache(cacheKey, payload, 20 * 60 * 1000);
    return res.json(payload);
  } catch (error) {
    return res.status(502).json({ status: 'UNAVAILABLE', provider: 'Weather Grid', kind, error: (error as Error).message, checkedAt: new Date().toISOString() });
  }
});

// ----------------------------------------------------
// API 3: NASA FIRMS VIIRS Hotspots (SNPP, NOAA-20, NOAA-21)
// Official Area API: https://firms.modaps.eosdis.nasa.gov/api/area
// ----------------------------------------------------
const DEFAULT_FIRMS_KEY = (process.env.NASA_FIRMS_MAP_KEY || '').trim();

// Safe diagnostics: never return the MAP_KEY or a URL containing it.
app.get('/api/firms/status', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    provider: 'NASA EOSDIS LANCE FIRMS',
    configured: Boolean(DEFAULT_FIRMS_KEY),
    status: DEFAULT_FIRMS_KEY ? 'KEY_CONFIGURED_NOT_YET_VALIDATED' : 'REQUIRES_SERVER_SECRET',
    bbox: FIRMS_INDONESIA_BBOX,
    sensors: FIRMS_SENSOR_CODES,
    requestTemplate: 'https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SENSOR}/94.7,-11.0,141.1,6.1/1',
    note: 'Status READY hanya dapat dipastikan setelah endpoint hotspots berhasil mengembalikan CSV. MAP_KEY tidak pernah dikirim ke browser.',
    configuration: 'Tambahkan NASA_FIRMS_MAP_KEY pada .env di root proyek, lalu restart npm run dev.',
  });
});

app.get('/api/firms/hotspots', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Expose-Headers', 'X-FIRMS-Sensor, X-FIRMS-Count');
  const mapKey = DEFAULT_FIRMS_KEY;
  if (!mapKey) {
    return res.status(503).json({
      status: 'REQUIRES_SERVER_SECRET',
      error: 'NASA_FIRMS_MAP_KEY belum dikonfigurasi pada backend. Tambahkan key pada .env server.',
    });
  }

  const sensor = String(req.query.sensor || 'ALL') as FirmsSensorFilter;
  const days = Number.parseInt(String(req.query.days || '1'), 10);
  if (sensor !== 'ALL' && !FIRMS_SENSOR_CODES.includes(sensor)) {
    return res.status(400).json({ status: 'INVALID_SENSOR', error: 'Gunakan ALL, VIIRS_SNPP_NRT, VIIRS_NOAA20_NRT, atau VIIRS_NOAA21_NRT.' });
  }
  if (!Number.isInteger(days) || days < 1 || days > 5) {
    return res.status(400).json({ status: 'INVALID_DAYS', error: 'Rentang hari NASA FIRMS harus 1 sampai 5.' });
  }

  const cacheKey = `firms_v2_${sensor}_${days}`;
  const forceRefresh = String(req.query.refresh || '') === '1';
  const cached = forceRefresh ? null : getCached<any>(cacheKey);
  if (cached) return res.json(cached);

  const selectedSensors = sensor === 'ALL' ? FIRMS_SENSOR_CODES : [sensor];
  const settled = await Promise.allSettled(selectedSensors.map((code) => fetchSensorCSV(mapKey, code, days)));
  const rawFeatures: any[] = [];
  const sensorStatus: Record<string, { status: string; count: number; error?: string }> = {};

  settled.forEach((result, index) => {
    const code = selectedSensors[index];
    if (result.status === 'fulfilled') {
      rawFeatures.push(...result.value);
      sensorStatus[code] = { status: 'OK', count: result.value.length };
    } else {
      const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
      sensorStatus[code] = { status: 'ERROR', count: 0, error: message.slice(0, 240) };
      console.warn(`NASA FIRMS ${code} unavailable:`, message);
    }
  });

  const failedSensors = Object.values(sensorStatus).filter((status) => status.status === 'ERROR').length;
  if (failedSensors === selectedSensors.length) {
    return res.status(502).json({
      status: 'UPSTREAM_UNAVAILABLE',
      error: 'NASA FIRMS tidak mengembalikan CSV yang valid. Periksa MAP_KEY, jaringan, pembatasan transaksi, dan status layanan NASA.',
      configured: Boolean(mapKey),
      sensorStatus,
      checkedAt: new Date().toISOString(),
      troubleshooting: 'HTTP 400/401/403 biasanya terkait MAP_KEY; HTTP 429 berarti batas transaksi; status 200 dengan count 0 berarti tidak ada deteksi pada bbox/periode tersebut.',
    });
  }

  // Cross-sensor grouping is only applied to ALL mode. A single-sensor
  // request keeps every observation from that sensor as an individual point.
  const features = sensor === 'ALL' ? deduplicateHotspotObservations(rawFeatures) : rawFeatures;
  const payload = {
    type: 'FeatureCollection',
    metadata: {
      generatedAt: new Date().toISOString(),
      totalCount: features.length,
      rawObservationCount: rawFeatures.length,
      dataStatus: failedSensors > 0 ? 'PARTIAL' : 'COMPLETE',
      sensorFilter: sensor,
      daysRequested: days,
      bbox: FIRMS_INDONESIA_BBOX,
      deduplication: sensor === 'ALL'
        ? 'Near-identical observations from different sensors are grouped within 375 m and 5 minutes. Original observations are retained in properties.observations.'
        : 'No cross-sensor grouping; individual observations from the selected sensor are retained.',
      sensors: {
        snpp: sensorStatus.VIIRS_SNPP_NRT?.count || 0,
        noaa20: sensorStatus.VIIRS_NOAA20_NRT?.count || 0,
        noaa21: sensorStatus.VIIRS_NOAA21_NRT?.count || 0,
      },
      sensorStatus,
      attribution: 'NASA EOSDIS Land, Atmosphere Near real-time Capability for EOS (LANCE) FIRMS',
    },
    features,
  };

  // Short cache keeps the display current while limiting requests to NASA.
  setCache(cacheKey, payload, failedSensors > 0 ? 30 * 1000 : 3 * 60 * 1000);
  res.setHeader('X-FIRMS-Sensor', sensor);
  res.setHeader('X-FIRMS-Count', String(features.length));
  return res.json(payload);
});

app.get('/api/firms/export', async (req: Request, res: Response) => {
  const mapKey = DEFAULT_FIRMS_KEY;
  if (!mapKey) return res.status(503).json({ status: 'REQUIRES_SERVER_SECRET', error: 'NASA_FIRMS_MAP_KEY belum dikonfigurasi pada backend.' });

  const sensor = String(req.query.sensor || 'ALL') as FirmsSensorFilter;
  const format = String(req.query.format || 'geojson');
  const days = Number.parseInt(String(req.query.days || '1'), 10);
  if (sensor !== 'ALL' && !FIRMS_SENSOR_CODES.includes(sensor)) return res.status(400).json({ status: 'INVALID_SENSOR', error: 'Kode sensor VIIRS tidak dikenal.' });
  if (!['csv', 'geojson'].includes(format)) return res.status(400).json({ status: 'INVALID_FORMAT', error: 'Format export hanya csv atau geojson.' });
  if (!Number.isInteger(days) || days < 1 || days > 5) return res.status(400).json({ status: 'INVALID_DAYS', error: 'Rentang hari harus 1 sampai 5.' });

  try {
    const selectedSensors = sensor === 'ALL' ? FIRMS_SENSOR_CODES : [sensor];
    const settled = await Promise.allSettled(selectedSensors.map((code) => fetchSensorCSV(mapKey, code, days)));
    const successful = settled.filter((result): result is PromiseFulfilledResult<any[]> => result.status === 'fulfilled');
    if (successful.length === 0) throw new Error('Semua sensor VIIRS gagal diakses.');
    const rawFeatures = successful.flatMap((result) => result.value);
    const features = sensor === 'ALL' ? deduplicateHotspotObservations(rawFeatures) : rawFeatures;

    if (format === 'csv') {
      const columns = ['latitude', 'longitude', 'sensor', 'sensorCode', 'confidence', 'frp', 'bright_ti4', 'bright_ti5', 'scan', 'track', 'date', 'time', 'daynight'];
      const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const rows = features.map((feature) => columns.map((column) => escapeCsv(feature.properties?.[column])).join(','));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="indonesia_hotspots_viirs.csv"');
      return res.send(`${columns.join(',')}\n${rows.join('\n')}`);
    }

    res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="indonesia_hotspots_viirs.geojson"');
    return res.json({
      type: 'FeatureCollection',
      metadata: {
        generatedAt: new Date().toISOString(),
        totalCount: features.length,
        rawObservationCount: rawFeatures.length,
        sensorFilter: sensor,
        daysRequested: days,
        source: 'NASA EOSDIS FIRMS VIIRS (SNPP, NOAA-20, NOAA-21)',
      },
      features,
    });
  } catch (err) {
    return res.status(502).json({ error: 'Export FIRMS gagal', message: (err as Error).message });
  }
});

// ----------------------------------------------------
// Indonesia Province Polygon — Official 38 Provinces (2026 / DOB Papua Included)
// Primary: Local curated Sipongi 38-provinces GeoJSON with live Sipongi & BIG STIG fallback
// ----------------------------------------------------
app.get('/api/admin/boundaries/province', async (_req: Request, res: Response) => {
  const cacheKey = 'id_38_province_boundary_polygons_2026';
  const cached = getCached<any>(cacheKey);
  if (cached) return res.json(cached);

  const localGeoJsonPath = path.join(__dirname, 'public', 'indonesia-38-provinces.geojson');
  if (fs.existsSync(localGeoJsonPath)) {
    try {
      const raw = fs.readFileSync(localGeoJsonPath, 'utf8');
      const geojson = JSON.parse(raw);
      const payload = {
        ...geojson,
        metadata: {
          provider: 'Sipongi KLHK & Badan Informasi Geospasial (BIG)',
          attribution: '© Sipongi Gakkum Kehutanan & BIG RI (38 Provinsi Indonesia)',
          source: 'https://sipongi.gakkum.kehutanan.go.id/data/indonesia_38_provinsi.geojson',
          edition: '2026 (Mencakup 38 Provinsi Termasuk 4 DOB Papua)',
          geometry: 'polygon',
          spatialReference: 'EPSG:4326',
          featureCount: geojson.features?.length || 38,
          checkedAt: new Date().toISOString(),
          note: 'Batas Administrasi 38 Provinsi Indonesia Terkini (2026), EPSG:4326.',
        },
      };
      setCache(cacheKey, payload, 24 * 60 * 60 * 1000);
      return res.json(payload);
    } catch (readErr) {
      console.warn('Failed reading local 38-provinces geojson, trying Sipongi upstream:', readErr);
    }
  }

  try {
    const sipongiRes = await fetch('https://sipongi.gakkum.kehutanan.go.id/data/indonesia_38_provinsi.geojson', {
      headers: { 'User-Agent': BMKG_BROWSER_HEADERS['User-Agent'], Accept: 'application/geo+json, application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (sipongiRes.ok) {
      const geojson: any = await sipongiRes.json();
      if (geojson?.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
        const payload = {
          ...geojson,
          metadata: {
            provider: 'Sipongi Gakkum Kehutanan',
            attribution: '© Sipongi Gakkum Kehutanan (38 Provinsi Indonesia)',
            source: 'https://sipongi.gakkum.kehutanan.go.id/data/indonesia_38_provinsi.geojson',
            geometry: 'polygon',
            spatialReference: 'EPSG:4326',
            featureCount: geojson.features.length,
            checkedAt: new Date().toISOString(),
          },
        };
        setCache(cacheKey, payload, 24 * 60 * 60 * 1000);
        return res.json(payload);
      }
    }
  } catch (sipongiErr) {
    console.warn('Sipongi 38-province GeoJSON fetch failed, falling back to BIG STIG:', (sipongiErr as Error).message);
  }

  const service = 'https://geoservices.big.go.id/gis/rest/services/STIG/Batas_Provinsi/MapServer/0/query';
  try {
    const query = new URLSearchParams({
      where: '1=1',
      outFields: '*',
      returnGeometry: 'true',
      outSR: '4326',
      f: 'geojson',
    });
    const response = await fetch(`${service}?${query.toString()}`, {
      headers: { 'User-Agent': 'IndonesiaGeoViewer/1.0', Accept: 'application/geo+json, application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`BIG province polygon query returned HTTP ${response.status}`);
    const geojson: any = await response.json();
    if (geojson?.error || geojson?.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
      throw new Error(geojson?.error?.message || 'BIG province service did not return a GeoJSON FeatureCollection');
    }
    const payload = {
      ...geojson,
      metadata: {
        provider: 'Badan Informasi Geospasial (BIG)',
        attribution: '© Badan Informasi Geospasial (BIG)',
        source: service,
        layerId: 0,
        geometry: 'polygon',
        spatialReference: 'EPSG:4326',
        featureCount: geojson.features.length,
        checkedAt: new Date().toISOString(),
        note: 'Batas Administrasi Provinsi; polygon resmi BIG STIG, bukan synthetic geometry.',
      },
    };
    setCache(cacheKey, payload, 24 * 60 * 60 * 1000);
    return res.json(payload);
  } catch (error) {
    return res.status(502).json({ status: 'UNAVAILABLE', provider: 'Batas Provinsi', error: (error as Error).message, checkedAt: new Date().toISOString() });
  }
});

// ----------------------------------------------------
// API 4: Dynamic RainViewer radar metadata and tile proxy
// Uses the currently advertised radar frames; never guesses timestamps.
// ----------------------------------------------------
app.get('/api/weather/radar/metadata', async (_req: Request, res: Response) => {
  const cacheKey = 'rainviewer_metadata';
  const cached = getCached<any>(cacheKey);
  if (cached) return res.json(cached);
  try {
    const response = await fetch('https://api.rainviewer.com/public/weather-maps.json', { signal: AbortSignal.timeout(7000) });
    if (!response.ok) throw new Error(`RainViewer metadata returned ${response.status}`);
    const metadata = await response.json();
    const frames = metadata?.radar?.past || [];
    setCache('rainviewer_raw_metadata', metadata, 5 * 60 * 1000);
    const latest = frames.length ? frames[frames.length - 1] : null;
    const payload = {
      provider: 'RainViewer',
      status: latest ? 'ONLINE' : 'NO_RADAR_FRAME',
      checkedAt: new Date().toISOString(),
      generatedAt: metadata?.generated,
      latestFrame: latest ? { time: latest.time, path: latest.path } : null,
      availablePastFrames: frames.length,
      attribution: 'RainViewer; terms and attribution requirements apply.',
      tileTemplate: latest?.path ? `/api/weather/radar/tiles/${latest.time}/{z}/{x}/{y}.png` : null,
    };
    setCache(cacheKey, payload, 5 * 60 * 1000);
    return res.json(payload);
  } catch (error) {
    return res.status(502).json({ provider: 'RainViewer', status: 'UNAVAILABLE', error: (error as Error).message, checkedAt: new Date().toISOString() });
  }
});

app.get('/api/weather/radar/tiles/:time/:z/:x/:y.png', async (req: Request, res: Response) => {
  const { time, z, x, y } = req.params;
  if (![time, z, x, y].every((v) => /^\d+$/.test(v))) return res.status(400).end();
  let metadata = getCached<any>('rainviewer_raw_metadata');
  if (!metadata) {
    metadata = await fetch('https://api.rainviewer.com/public/weather-maps.json', { signal: AbortSignal.timeout(5000) }).then((r) => r.ok ? r.json() : Promise.reject(new Error(`RainViewer ${r.status}`))).catch(() => null);
    if (metadata) setCache('rainviewer_raw_metadata', metadata, 5 * 60 * 1000);
  }
  const frames: any[] = metadata?.radar?.past || [];
  const frame = frames.find((item) => String(item.time) === String(time));
  if (!frame?.path) return res.status(404).end();
  try {
    const upstream = await fetch(`https://tilecache.rainviewer.com${frame.path}/256/${z}/${x}/${y}/2/1_1.png`, { signal: AbortSignal.timeout(8000) });
    if (!upstream.ok) return res.status(upstream.status).end();
    const bytes = await upstream.arrayBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.send(Buffer.from(bytes));
  } catch { return res.status(502).end(); }
});

// ----------------------------------------------------
// API: Konsesi Perkebunan Kelapa Sawit Indonesia (1.845 Poligon HGU/Izin Lokasi)
// ----------------------------------------------------
app.get('/api/gfw/oil-palm-concessions', (_req: Request, res: Response) => {
  const cacheKey = 'id_oil_palm_concessions_geojson';
  const cached = getCached<any>(cacheKey);
  if (cached) return res.json(cached);

  const localPath = path.join(__dirname, 'public', 'indonesia-oil-palm-concessions.geojson');
  if (!fs.existsSync(localPath)) {
    return res.status(404).json({ status: 'NOT_FOUND', error: 'Dataset konsesi kelapa sawit belum tersedia di server.' });
  }
  try {
    const raw = fs.readFileSync(localPath, 'utf8');
    const geojson = JSON.parse(raw);
    const payload = {
      ...geojson,
      metadata: {
        provider: 'Data Konsesi Kelapa Sawit Indonesia (GFW / BPN)',
        attribution: '© Global Forest Watch / Data Konsesi Kelapa Sawit Indonesia',
        featureCount: geojson.features?.length || 0,
        checkedAt: new Date().toISOString(),
        note: 'Poligon area konsesi kelapa sawit Indonesia beserta atribut perusahaan, grup, HGU/izin lokasi, dan luas hektar.',
      },
    };
    setCache(cacheKey, payload, 24 * 60 * 60 * 1000);
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', error: (err as Error).message });
  }
});

// ----------------------------------------------------
// API: Konsesi Serat Kayu / HTI Indonesia (539 Poligon HTI)
// ----------------------------------------------------
app.get('/api/gfw/wood-fiber-concessions', (_req: Request, res: Response) => {
  const cacheKey = 'id_wood_fiber_concessions_geojson';
  const cached = getCached<any>(cacheKey);
  if (cached) return res.json(cached);

  const localPath = path.join(__dirname, 'public', 'indonesia-wood-fiber-concessions.geojson');
  if (!fs.existsSync(localPath)) {
    return res.status(404).json({ status: 'NOT_FOUND', error: 'Dataset konsesi serat kayu (HTI) Indonesia belum tersedia di server.' });
  }
  try {
    const raw = fs.readFileSync(localPath, 'utf8');
    const geojson = JSON.parse(raw);
    const payload = {
      ...geojson,
      metadata: {
        provider: 'Data Konsesi Serat Kayu / HTI Indonesia (KLHK / GFW)',
        attribution: '© Kementerian LHK RI / Global Forest Watch (idn_wood_fiber)',
        featureCount: geojson.features?.length || 0,
        checkedAt: new Date().toISOString(),
        note: 'Poligon area konsesi serat kayu / Hutan Tanaman Industri (HTI) Indonesia beserta atribut perusahaan, grup korporasi, dan luas hektar.',
      },
    };
    setCache(cacheKey, payload, 24 * 60 * 60 * 1000);
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', error: (err as Error).message });
  }
});

// ----------------------------------------------------
// API: Kawasan Lahan Gambut Indonesia (1.524 Poligon Gambut)
// ----------------------------------------------------
app.get('/api/gfw/peatlands-geojson', (_req: Request, res: Response) => {
  const cacheKey = 'id_peatlands_geojson';
  const cached = getCached<any>(cacheKey);
  if (cached) return res.json(cached);

  const localPath = path.join(__dirname, 'public', 'indonesia-peat-lands.geojson');
  if (!fs.existsSync(localPath)) {
    return res.status(404).json({ status: 'NOT_FOUND', error: 'Dataset lahan gambut Indonesia belum tersedia di server.' });
  }
  try {
    const raw = fs.readFileSync(localPath, 'utf8');
    const geojson = JSON.parse(raw);
    const payload = {
      ...geojson,
      metadata: {
        provider: 'Data Lahan Gambut Indonesia (KLHK / BBSDLP / GFW)',
        attribution: '© Kementerian LHK / BBSDLP / Global Forest Watch (Peta Lahan Gambut Indonesia)',
        featureCount: geojson.features?.length || 0,
        checkedAt: new Date().toISOString(),
        note: 'Poligon sebaran kawasan lahan gambut Indonesia (1.524 poligon) beserta klasifikasi gambut, luas hektar, dan keliling.',
      },
    };
    setCache(cacheKey, payload, 24 * 60 * 60 * 1000);
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', error: (err as Error).message });
  }
});

// ----------------------------------------------------
// API: Sebaran Habitat Mangrove Indonesia (BIG Satu Peta Layer 57 & GMW / UNEP-WCMC / GFW)
// ----------------------------------------------------
const BIG_MANGROVE_MAPSERVER_URL = 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer';
const UNEP_WCMC_MANGROVE_ATLAS_URL = 'https://gis.unep-wcmc.org/arcgis/rest/services/HabitatsAndBiotopes/WCMC011_AtlasMangrove2010_v3/MapServer';
const UNEP_WCMC_GMW_CHANGE_URL = 'https://gis.unep-wcmc.org/arcgis/rest/services/marine/GMW_001_Change1996_2016/MapServer';

app.get('/api/mangrove/extent-geojson', async (req: Request, res: Response) => {
  const bboxParam = String(req.query.bbox || '').trim();
  const cacheKey = `id_mangrove_extent_geojson_${bboxParam || 'national'}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return res.json(cached);

  const localPath = path.join(__dirname, 'public', 'indonesia-mangrove-extent.geojson');
  if (!fs.existsSync(localPath)) {
    return res.status(404).json({ status: 'NOT_FOUND', error: 'Dataset sebaran habitat mangrove Indonesia belum tersedia di server.' });
  }

  try {
    const raw = fs.readFileSync(localPath, 'utf8');
    const localGeoJson = JSON.parse(raw);
    const localFeatures: any[] = Array.isArray(localGeoJson.features) ? localGeoJson.features : [];
    const liveBigFeatures: any[] = [];
    let bigUpstreamConnected = false;

    if (bboxParam) {
      const parts = bboxParam.split(',').map(Number);
      if (parts.length === 4 && parts.every(Number.isFinite)) {
        const [west, south, east, north] = parts;
        const params = new URLSearchParams({
          where: '1=1',
          geometry: `${west},${south},${east},${north}`,
          geometryType: 'esriGeometryEnvelope',
          inSR: '4326',
          spatialRel: 'esriSpatialRelIntersects',
          outFields: 'objectid,kttj,smbdt,thnbuat,ints,remark,bpdashl,fgsfrf,prov,kab,lsmgr',
          returnGeometry: 'true',
          outSR: '4326',
          resultRecordCount: '200',
          f: 'geojson',
        });
        try {
          const bigRes = await fetch(`${BIG_MANGROVE_MAPSERVER_URL}/57/query?${params.toString()}`, {
            headers: { 'User-Agent': 'IndonesiaGeoViewer/1.0', Accept: 'application/json' },
            signal: AbortSignal.timeout(8000),
          });
          if (bigRes.ok) {
            const bigJson: any = await bigRes.json();
            if (Array.isArray(bigJson?.features) && bigJson.features.length > 0) {
              bigUpstreamConnected = true;
              for (const f of bigJson.features) {
                const props = f.properties || {};
                const kttjStr = String(props.kttj || props.remark || 'Mangrove');
                const kerapatan = /lebat/i.test(kttjStr) ? 'Lebat' : /jarang/i.test(kttjStr) ? 'Jarang' : 'Sedang';
                liveBigFeatures.push({
                  ...f,
                  properties: {
                    ...props,
                    nama_kawasan: props.remark || `Mangrove ${props.kab || props.prov || 'Indonesia'}`,
                    kerapatan,
                    area_ha: props.lsmgr ?? null,
                  },
                });
              }
            }
          }
        } catch {
          // Fallback cleanly to national polygon dataset when upstream BIG query times out
        }
      }
    }

    const mergedFeatures = [...localFeatures, ...liveBigFeatures];
    const payload = {
      type: 'FeatureCollection',
      features: mergedFeatures,
      metadata: {
        provider: 'BIG Satu Peta (Peta Mangrove 1:25.000) & Global Mangrove Watch (UNEP-WCMC / GFW)',
        attribution: '© Sekretariat Kebijakan Satu Peta (BIG / KLHK); Global Mangrove Watch (DOI: 10.5281/zenodo.21346457); UNEP-WCMC; Global Forest Watch',
        sources: [
          `${BIG_MANGROVE_MAPSERVER_URL}/57`,
          UNEP_WCMC_MANGROVE_ATLAS_URL,
          UNEP_WCMC_GMW_CHANGE_URL,
          'https://tiles.globalforestwatch.org/gfw_mangroves/latest/dynamic/{z}/{x}/{y}.png',
        ],
        bigUpstreamConnected,
        liveBigFeatureCount: liveBigFeatures.length,
        nationalFeatureCount: localFeatures.length,
        featureCount: mergedFeatures.length,
        checkedAt: new Date().toISOString(),
        note: 'Sebaran ekosistem habitat mangrove Indonesia (42 kawasan pesisir prioritas nasional + integrasi BIG Satu Peta Layer 57 & GMW v3.0).',
      },
    };
    setCache(cacheKey, payload, bboxParam ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000);
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', error: (err as Error).message });
  }
});

app.get('/api/mangrove/tiles/:z/:x/:y.png', async (req: Request, res: Response) => {
  const z = Number(req.params.z);
  const x = Number(req.params.x);
  const y = Number(req.params.y);
  if (![z, x, y].every(Number.isInteger) || z < 0 || z > 20) return res.status(400).end();
  const tileCount = 2 ** z;
  if (x < 0 || y < 0 || x >= tileCount || y >= tileCount) return res.status(400).end();

  const cacheKey = `mangrove_tile_${z}_${x}_${y}`;
  const cached = getCached<{ bytes: Buffer; source: string }>(cacheKey);
  if (cached) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Data-Provider', cached.source);
    return res.send(cached.bytes);
  }

  const bbox = arcgisTileBbox(z, x, y);
  const arcgisQuery = (layerId: number) =>
    new URLSearchParams({
      bbox: bbox.map((v) => v.toFixed(3)).join(','),
      bboxSR: '3857',
      imageSR: '3857',
      size: '256,256',
      format: 'png32',
      transparent: 'true',
      layers: `show:${layerId}`,
      f: 'image',
    }).toString();

  const candidates = [
    {
      name: 'BIG Satu Peta Peta Mangrove Layer 57',
      url: `${BIG_MANGROVE_MAPSERVER_URL}/export?${arcgisQuery(57)}`,
    },
    {
      name: 'UNEP-WCMC World Atlas of Mangroves',
      url: `${UNEP_WCMC_MANGROVE_ATLAS_URL}/export?${arcgisQuery(0)}`,
    },
    {
      name: 'UNEP-WCMC Global Mangrove Watch Change',
      url: `${UNEP_WCMC_GMW_CHANGE_URL}/export?${arcgisQuery(0)}`,
    },
    {
      name: 'Global Forest Watch Mangroves',
      url: `https://tiles.globalforestwatch.org/gfw_mangroves/latest/dynamic/${z}/${x}/${y}.png`,
    },
  ];

  const errors: string[] = [];
  for (const candidate of candidates) {
    try {
      const upstream = await fetch(candidate.url, {
        headers: { 'User-Agent': 'IndonesiaGeoViewer/1.0', Accept: 'image/png,image/*,*/*' },
        signal: AbortSignal.timeout(12000),
      });
      if (!upstream.ok) {
        errors.push(`${candidate.name}: HTTP ${upstream.status}`);
        continue;
      }
      const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('image/')) {
        errors.push(`${candidate.name}: invalid content-type (${contentType || 'empty'})`);
        continue;
      }
      const bytes = Buffer.from(await upstream.arrayBuffer());
      if (!bytes.length) continue;
      setCache(cacheKey, { bytes, source: candidate.name }, 60 * 60 * 1000);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('X-Data-Provider', candidate.name);
      return res.send(bytes);
    } catch (err) {
      errors.push(`${candidate.name}: ${(err as Error).message}`);
    }
  }
  return res.status(502).json({ status: 'UNAVAILABLE', service: 'mangrove-tiles', errors });
});

// ----------------------------------------------------
// API: Global Forest Watch dataset catalogue/version discovery
// Returns provider metadata; does not assume a fixed tree-cover-loss release.
// ----------------------------------------------------
app.get('/api/gfw/datasets', async (_req: Request, res: Response) => {
  const cacheKey = 'gfw_dataset_catalogue';
  const cached = getCached<any>(cacheKey);
  if (cached) return res.json(cached);
  try {
    const response = await fetch('https://data-api.globalforestwatch.org/datasets', { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`GFW API returned ${response.status}`);
    const data = await response.json();
    const payload = { provider: 'Global Forest Watch', checkedAt: new Date().toISOString(), apiVersion: '0.3.0 documented', data };
    setCache(cacheKey, payload, 60 * 60 * 1000);
    return res.json(payload);
  } catch (error) { return res.status(502).json({ provider: 'Global Forest Watch', status: 'UNAVAILABLE', error: (error as Error).message, checkedAt: new Date().toISOString() }); }
});

// ----------------------------------------------------
// GFW Tile Cache public tiles. Dataset IDs are allow-listed to avoid proxy abuse.
// Vector style metadata is read from the provider's official root.json resource.
// ----------------------------------------------------
const GFW_VECTOR_TILE_DATASETS: Record<string, { mode: 'static' | 'dynamic' }> = {
  idn_wood_fiber: { mode: 'dynamic' },
  gfw_plantations: { mode: 'static' },
  gfw_oil_palm: { mode: 'static' },
  gfw_mining_concessions: { mode: 'static' },
};
const GFW_RASTER_TILE_DATASETS = new Set(['umd_tree_cover_loss', 'gfw_peatlands', 'gfw_mangroves']);

app.get('/api/gfw/vector-style/:dataset', async (req: Request, res: Response) => {
  const dataset = String(req.params.dataset || '');
  const config = GFW_VECTOR_TILE_DATASETS[dataset];
  if (!config) return res.status(404).json({ error: 'GFW vector dataset tidak diizinkan.' });
  const cacheKey = `gfw_vector_style_v2_${dataset}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return res.json(cached);

  const primarySeg = config.mode === 'static' ? 'default' : 'dynamic';
  const altSeg = primarySeg === 'default' ? 'dynamic' : 'default';
  const segments = [primarySeg, altSeg];
  const errors: string[] = [];

  for (const seg of segments) {
    const base = `https://tiles.globalforestwatch.org/${dataset}/latest/${seg}`;
    const candidates = seg === 'default'
      ? [`${base}/root.json`, `${base}/VectorTileServer?f=pjson`, `${base}/resources/styles/root.json`]
      : [`${base}/VectorTileServer?f=pjson`, `${base}/root.json`, `${base}/resources/styles/root.json`];
    for (const url of candidates) {
      try {
        const upstream = await fetch(url, { headers: { 'User-Agent': 'IndonesiaGeoViewer/1.0', Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
        if (!upstream.ok) throw new Error(`HTTP ${upstream.status}`);
        const json: any = await upstream.json();
        const styleLayers = Array.isArray(json?.layers) ? json.layers : [];
        let sourceLayers = [...new Set(styleLayers
          .map((layer: any) => layer?.['source-layer'])
          .filter((value: any) => typeof value === 'string' && value.length))] as string[];
        if (!sourceLayers.length && styleLayers.length && styleLayers.every((layer: any) => typeof layer?.name === 'string')) {
          sourceLayers = [...new Set(styleLayers.map((layer: any) => String(layer.name)).filter(Boolean))] as string[];
        }
        if (sourceLayers.length) {
          const payload = { dataset, mode: config.mode, segment: seg, sourceLayers, provider: 'Global Forest Watch Tile Cache', checkedAt: new Date().toISOString(), styleUrl: url };
          setCache(cacheKey, payload, 24 * 60 * 60 * 1000);
          return res.json(payload);
        }
        // Esri root.json may point to a Mapbox style file rather than containing layers itself.
        const stylePath = typeof json?.styles === 'string' ? json.styles : null;
        if (stylePath) {
          const styleBase = new URL(stylePath.endsWith('/') ? stylePath : `${stylePath.replace(/\/$/, '')}/`, `${base}/`).toString();
          const styleUrl = new URL('root.json', styleBase).toString();
          const styleResponse = await fetch(styleUrl, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
          if (styleResponse.ok) {
            const styleJson: any = await styleResponse.json();
            const styleEntries = Array.isArray(styleJson?.layers) ? styleJson.layers : [];
            const names = [...new Set(styleEntries
              .map((layer: any) => layer?.['source-layer'])
              .filter((value: any) => typeof value === 'string' && value.length))] as string[];
            if (names.length) {
              const payload = { dataset, mode: config.mode, segment: seg, sourceLayers: names, provider: 'Global Forest Watch Tile Cache', checkedAt: new Date().toISOString(), styleUrl };
              setCache(cacheKey, payload, 24 * 60 * 60 * 1000);
              return res.json(payload);
            }
          }
        }
        // Esri VectorTileServer?f=pjson for dynamic datasets (e.g. idn_wood_fiber, gfw_plantations)
        // exposes currentVersion/tiles without a nested layers array; the protobuf source-layer matches the dataset name.
        if ((json?.currentVersion || Array.isArray(json?.tiles)) && url.includes('VectorTileServer')) {
          const payload = { dataset, mode: config.mode, segment: seg, sourceLayers: [dataset], provider: 'Global Forest Watch Tile Cache', checkedAt: new Date().toISOString(), styleUrl: url };
          setCache(cacheKey, payload, 24 * 60 * 60 * 1000);
          return res.json(payload);
        }
        errors.push(`${url}: no source-layer metadata`);
      } catch (error) { errors.push(`${url}: ${(error as Error).message}`); }
    }
  }
  return res.status(502).json({ status: 'STYLE_UNAVAILABLE', dataset, errors, checkedAt: new Date().toISOString(), note: 'Vector tile tidak akan ditampilkan tanpa source-layer metadata yang valid.' });
});

app.get('/api/gfw/vector-tiles/:dataset/:z/:x/:y.pbf', async (req: Request, res: Response) => {
  const dataset = String(req.params.dataset || '');
  const config = GFW_VECTOR_TILE_DATASETS[dataset];
  if (!config) return res.status(404).end();
  const z = Number(req.params.z); const x = Number(req.params.x); const y = Number(req.params.y);
  if (![z, x, y].every(Number.isInteger) || z < 0 || z > 20 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) return res.status(400).end();
  const cacheKey = `gfw_vector_tile_v2_${dataset}_${z}_${x}_${y}`;
  const cached = getCached<Buffer>(cacheKey);
  if (cached) { res.setHeader('Content-Type', 'application/x-protobuf'); res.setHeader('Cache-Control', 'public, max-age=1800'); return res.send(cached); }

  const primarySeg = config.mode === 'static' ? 'default' : 'dynamic';
  const altSeg = primarySeg === 'default' ? 'dynamic' : 'default';
  let lastStatus = 502;
  for (const seg of [primarySeg, altSeg]) {
    try {
      const url = `https://tiles.globalforestwatch.org/${dataset}/latest/${seg}/${z}/${x}/${y}.pbf`;
      const upstream = await fetch(url, { headers: { 'User-Agent': 'IndonesiaGeoViewer/1.0', Accept: 'application/x-protobuf, application/vnd.mapbox-vector-tile' }, signal: AbortSignal.timeout(15000) });
      if (!upstream.ok) {
        lastStatus = upstream.status;
        continue;
      }
      const bytes = Buffer.from(await upstream.arrayBuffer());
      if (!bytes.length) return res.status(204).end();
      setCache(cacheKey, bytes, 30 * 60 * 1000);
      res.setHeader('Content-Type', 'application/x-protobuf');
      res.setHeader('Cache-Control', 'public, max-age=1800');
      res.setHeader('X-Data-Provider', 'Global Forest Watch Tile Cache');
      return res.send(bytes);
    } catch {
      continue;
    }
  }
  return res.status(lastStatus).json({ error: `GFW Tile Cache HTTP ${lastStatus}`, dataset });
});

app.get('/api/gfw/raster-tiles/:dataset/:z/:x/:y.png', async (req: Request, res: Response) => {
  const dataset = String(req.params.dataset || '');
  if (!GFW_RASTER_TILE_DATASETS.has(dataset)) return res.status(404).end();
  const z = Number(req.params.z); const x = Number(req.params.x); const y = Number(req.params.y);
  if (![z, x, y].every(Number.isInteger) || z < 0 || z > 20 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) return res.status(400).end();
  const cacheKey = `gfw_raster_${dataset}_${z}_${x}_${y}`;
  const cached = getCached<Buffer>(cacheKey);
  if (cached) { res.setHeader('Content-Type', 'image/png'); res.setHeader('Cache-Control', 'public, max-age=3600'); return res.send(cached); }
  try {
    const params = dataset === 'umd_tree_cover_loss'
      ? '?start_year=2001&end_year=' + Math.max(2001, new Date().getUTCFullYear() - 1) + '&tree_cover_density_threshold=30&render_type=true_color'
      : '';
    const url = `https://tiles.globalforestwatch.org/${dataset}/latest/dynamic/${z}/${x}/${y}.png${params}`;
    const upstream = await fetch(url, { headers: { 'User-Agent': 'IndonesiaGeoViewer/1.0', Accept: 'image/png' }, signal: AbortSignal.timeout(15000) });
    if (!upstream.ok) return res.status(upstream.status).json({ error: `GFW raster tile HTTP ${upstream.status}`, dataset });
    const bytes = Buffer.from(await upstream.arrayBuffer());
    if (!bytes.length) return res.status(204).end();
    setCache(cacheKey, bytes, 60 * 60 * 1000);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Data-Provider', 'Global Forest Watch Tile Cache');
    return res.send(bytes);
  } catch (error) { return res.status(502).json({ error: (error as Error).message, dataset }); }
});

// ----------------------------------------------------
// API: Copernicus Data Space STAC collections and search
// ----------------------------------------------------
app.get('/api/copernicus/collections', async (_req: Request, res: Response) => {
  const cacheKey = 'copernicus_stac_collections';
  const cached = getCached<any>(cacheKey);
  if (cached) return res.json(cached);
  try {
    const response = await fetch('https://stac.dataspace.copernicus.eu/v1/collections', { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Copernicus STAC returned ${response.status}`);
    const data = await response.json();
    setCache(cacheKey, data, 60 * 60 * 1000);
    return res.json({ provider: 'Copernicus Data Space Ecosystem', checkedAt: new Date().toISOString(), data });
  } catch (error) { return res.status(502).json({ status: 'UNAVAILABLE', provider: 'Copernicus STAC', error: (error as Error).message }); }
});

app.post('/api/copernicus/search', async (req: Request, res: Response) => {
  const body = req.body || {};
  const limit = Math.min(100, Math.max(1, Number(body.limit || 20)));
  const searchBody: Record<string, unknown> = { limit };
  if (Array.isArray(body.collections) && body.collections.every((v: unknown) => typeof v === 'string')) searchBody.collections = body.collections;
  if (Array.isArray(body.bbox) && body.bbox.length === 4 && body.bbox.every((v: unknown) => Number.isFinite(Number(v)))) searchBody.bbox = body.bbox.map(Number);
  if (typeof body.datetime === 'string') searchBody.datetime = body.datetime;
  if (body.intersects && typeof body.intersects === 'object') searchBody.intersects = body.intersects;
  try {
    const response = await fetch('https://stac.dataspace.copernicus.eu/v1/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(searchBody), signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Copernicus STAC search returned ${response.status}`);
    const data = await response.json();
    return res.json({ provider: 'Copernicus Data Space STAC', query: searchBody, checkedAt: new Date().toISOString(), data });
  } catch (error) { return res.status(502).json({ status: 'UNAVAILABLE', provider: 'Copernicus STAC', error: (error as Error).message }); }
});

// ----------------------------------------------------
// BIG RBI administrative polygon Feature Layers (Kabupaten/Kota & Kecamatan)
// Data is filtered by the current map extent, queried in bounded ObjectID batches,
// and returned as EPSG:4326 GeoJSON. A zoom threshold and feature cap protect
// the browser from downloading the complete national dataset at once.
// ----------------------------------------------------
const BIG_RBI_POLYGON_SERVICES = {
  kabkota: {
    url: 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_KABKOTA_AR/MapServer/0/query',
    label: 'Area Batas Wilayah Administrasi Kabupaten/Kota',
    layerId: 0,
    minZoom: 6,
    maxFeatures: 1800,
  },
  kecamatan: {
    url: 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_KECAMATAN_AR/MapServer/0/query',
    label: 'Area Batas Wilayah Administrasi Kecamatan',
    layerId: 0,
    minZoom: 8,
    maxFeatures: 1800,
  },
} as const;

async function queryBigRbiPolygons(
  key: keyof typeof BIG_RBI_POLYGON_SERVICES,
  bboxText: string,
): Promise<any> {
  const config = BIG_RBI_POLYGON_SERVICES[key];
  const bbox = bboxText.split(',').map((value) => Number(value));
  if (bbox.length !== 4 || bbox.some((value) => !Number.isFinite(value))) {
    throw new Error('bbox must contain west,south,east,north');
  }
  const [west, south, east, north] = bbox;
  if (west < 94 || east > 142 || south < -12 || north > 7 || west >= east || south >= north) {
    throw new Error('bbox is outside the valid Indonesia extent or has invalid bounds');
  }

  const cacheKey = `big_rbi_${key}_${bbox.map((v) => v.toFixed(2)).join('_')}`;
  const cachedPayload = getCached<any>(cacheKey);
  if (cachedPayload) return cachedPayload;

  const idParams = new URLSearchParams({
    where: '1=1',
    returnIdsOnly: 'true',
    geometry: `${west},${south},${east},${north}`,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    f: 'json',
  });
  const idResponse = await fetch(`${config.url}?${idParams.toString()}`, { signal: AbortSignal.timeout(20000) });
  if (!idResponse.ok) throw new Error(`BIG RBI ObjectIDs request returned HTTP ${idResponse.status}`);
  const idData: any = await idResponse.json();
  if (idData?.error) throw new Error(idData.error.message || 'BIG RBI ObjectIDs response error');
  const objectIds: number[] = Array.isArray(idData?.objectIds) ? idData.objectIds : [];

  if (objectIds.length > config.maxFeatures) {
    const error = new Error(`Area memuat ${objectIds.length} fitur. Perbesar peta agar maksimal ${config.maxFeatures} fitur per permintaan.`) as Error & { statusCode?: number; featureCount?: number };
    error.statusCode = 413;
    error.featureCount = objectIds.length;
    throw error;
  }

  const features: any[] = [];
  for (let offset = 0; offset < objectIds.length; offset += 250) {
    const params = new URLSearchParams({
      objectIds: objectIds.slice(offset, offset + 250).join(','),
      outFields: '*',
      returnGeometry: 'true',
      outSR: '4326',
      returnZ: 'false',
      returnM: 'false',
      f: 'geojson',
    });
    const featureResponse = await fetch(`${config.url}?${params.toString()}`, { signal: AbortSignal.timeout(20000) });
    if (!featureResponse.ok) throw new Error(`BIG RBI feature query returned HTTP ${featureResponse.status}`);
    const payload: any = await featureResponse.json();
    if (payload?.error) throw new Error(payload.error.message || 'BIG RBI feature query error');
    if (!Array.isArray(payload?.features)) throw new Error('BIG RBI returned no GeoJSON feature array');
    features.push(...payload.features);
  }

  const result = {
    type: 'FeatureCollection',
    features,
    metadata: {
      provider: 'Badan Informasi Geospasial (BIG) - RBI',
      layerName: config.label,
      layerId: config.layerId,
      geometryType: 'Polygon',
      spatialReference: 'EPSG:4326',
      edition: 'Juni 2026 (sesuai metadata service)',
      featureCount: features.length,
      bbox: [west, south, east, north],
      checkedAt: new Date().toISOString(),
      sourceUrl: config.url.replace('/query', ''),
      note: 'Feature Layer resmi BIG RBI; fitur diminta berdasarkan extent peta. Bukan data sintetis.',
    },
  };
  setCache(cacheKey, result, 24 * 60 * 60 * 1000);
  return result;
}

app.get('/api/admin/boundaries/kabkota', async (req: Request, res: Response) => {
  try {
    const bbox = String(req.query.bbox || '');
    const result = await queryBigRbiPolygons('kabkota', bbox);
    return res.json(result);
  } catch (error) {
    const statusCode = Number((error as any)?.statusCode || 502);
    return res.status(statusCode).json({ status: statusCode === 413 ? 'ZOOM_IN_REQUIRED' : 'UNAVAILABLE', provider: 'BIG RBI', layer: 'BATAS_KABKOTA_AR/0', featureCount: (error as any)?.featureCount, error: (error as Error).message, checkedAt: new Date().toISOString() });
  }
});

app.get('/api/admin/boundaries/kecamatan', async (req: Request, res: Response) => {
  try {
    const bbox = String(req.query.bbox || '');
    const result = await queryBigRbiPolygons('kecamatan', bbox);
    return res.json(result);
  } catch (error) {
    const statusCode = Number((error as any)?.statusCode || 502);
    return res.status(statusCode).json({ status: statusCode === 413 ? 'ZOOM_IN_REQUIRED' : 'UNAVAILABLE', provider: 'BIG RBI', layer: 'BATAS_KECAMATAN_AR/0', featureCount: (error as any)?.featureCount, error: (error as Error).message, checkedAt: new Date().toISOString() });
  }
});

// ----------------------------------------------------
// API 5: BIG source service metadata catalogue
// These are metadata discovery endpoints, not fabricated geometry downloads.
// ----------------------------------------------------
const BIG_SERVICES = {
  rbi_kabkota: 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_KABKOTA_AR/MapServer',
  rbi_kecamatan: 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_KECAMATAN_AR/MapServer',
  ptra_gunung_api: 'https://geoservices.big.go.id/gis/rest/services/PTRA/Atlas_Sebaran_GunungApi/MapServer',
  ptra_batubara: 'https://geoservices.big.go.id/gis/rest/services/PTRA/Atlas_250K_BatuBara/MapServer',
  ptra_penutup_lahan: 'https://geoservices.big.go.id/gis/rest/services/PTRA/Atlas_250K_PenutupLahan/MapServer',
  ptra_wilayah_sungai: 'https://geoservices.big.go.id/gis/rest/services/PTRA/Atlas_250K_WilayahSungai/MapServer',
  ptra_fauna: 'https://geoservices.big.go.id/gis/rest/services/PTRA/Atlas_Fauna/MapServer',
  ptra_flora: 'https://geoservices.big.go.id/gis/rest/services/PTRA/Atlas_Flora/MapServer',
  ptra_hidrogeologi: 'https://geoservices.big.go.id/gis/rest/services/PTRA/Atlas_Hidrogeologi/MapServer',
  ptra_produksi_tambang: 'https://geoservices.big.go.id/gis/rest/services/PTRA/Atlas_Produksi_Tambang/MapServer',
  ptra_konservasi: 'https://geoservices.big.go.id/gis/rest/services/PTRA/Atlas_Sebaran_Wilayah_Konservasi/MapServer',
  rbi_50k: 'https://geoservices.big.go.id/rbi/rest/services/INDEKS/RBI_50K/MapServer',
  sda: 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer',
  forestry: 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/KEHUTANAN/MapServer',
  boundaries: 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/BATAS_WILAYAH/MapServer',
  transmigration: 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/KAWASAN_KHUSUS_DAN_TRANSMIGRASI/MapServer',
  land_permits: 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/PERIZINAN_DAN_PERTANAHAN/MapServer',
  infrastructure: 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SARANA_PRASARANA/MapServer',
};
app.get('/api/big/services', async (_req: Request, res: Response) => {
  const cacheKey = 'big_services_catalogue';
  const cached = getCached<any>(cacheKey);
  if (cached) return res.json(cached);
  const results = await Promise.all(Object.entries(BIG_SERVICES).map(async ([id, endpoint]) => {
    try {
      const response = await fetch(`${endpoint}?f=pjson`, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const meta: any = await response.json();
      return { id, endpoint, status: 'ONLINE', serviceDescription: meta.serviceDescription, spatialReference: meta.spatialReference, capabilities: meta.capabilities, layers: meta.layers || [], checkedAt: new Date().toISOString() };
    } catch (error) {
      return { id, endpoint, status: 'UNAVAILABLE', error: (error as Error).message, checkedAt: new Date().toISOString() };
    }
  }));
  const payload = { provider: 'BIG Satu Peta', checkedAt: new Date().toISOString(), services: results };
  setCache(cacheKey, payload, 60 * 60 * 1000);
  return res.json(payload);
});

// ----------------------------------------------------
// API 4: System Provider Status Health Check
// ----------------------------------------------------
app.get('/api/providers/status', async (_req: Request, res: Response) => {
  const checks = [
    { id: 'sipongi_gfs', name: 'Sipongi Opsroom GFS Wind', category: 'Wind field', url: 'https://opsroom.sipongidata.my.id/api/gfs', license: 'Publik Sipongi / NCEP GFS', updateCadence: 'Siklus model GFS' },
    { id: 'sipongi_aqms', name: 'Sipongi Opsroom AQMS', category: 'Air quality', url: 'https://opsroom.sipongidata.my.id/api/aqms', license: 'Publik KLHK / Sipongi', updateCadence: 'Per jam' },
    { id: 'sipongi_provinces', name: 'Sipongi 38 Provinsi GeoJSON', category: 'Administrative boundaries', url: 'https://sipongi.gakkum.kehutanan.go.id/data/indonesia_38_provinsi.geojson', license: 'Publik Sipongi KLHK', updateCadence: 'Edisi 38 Provinsi 2026' },
    { id: 'bmkg_tews', name: 'BMKG TEWS', category: 'Earthquake', url: 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', license: 'Open Data BMKG', updateCadence: 'Menurut penerbitan BMKG' },
    { id: 'bmkg_earthquake_mirror', name: 'Dhanypedia BMKG API (mirror pihak ketiga)', category: 'Earthquake', url: 'https://bmkg-api.dhanypedia.com/v1/earthquake/latest', license: 'Atribusi BMKG; layanan perantara Dhanypedia', updateCadence: 'Cache sekitar 60 detik' },
    { id: 'bmkg_nowcast', name: 'BMKG Peringatan Dini Cuaca (RSS/CAP)', category: 'Weather warning', url: 'https://www.bmkg.go.id/alerts/nowcast/id', license: 'Atribusi BMKG wajib', updateCadence: 'Diperbarui setiap saat' },
    { id: 'bmkg_weather', name: 'BMKG Prakiraan Cuaca', category: 'Forecast', url: 'https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=31.71.01.1001', license: 'BMKG attribution required', updateCadence: '3 jam; pembaruan 2 kali sehari' },
    { id: 'open_meteo', name: 'Open-Meteo', category: 'Weather forecast', url: 'https://api.open-meteo.com/v1/forecast?latitude=-0.0263&longitude=109.3425&current=wind_speed_10m&timezone=Asia%2FJakarta', license: 'Open-Meteo terms', updateCadence: 'Model-dependent forecast' },
    { id: 'usgs_earthquake', name: 'USGS Earthquake Hazards', category: 'Earthquake', url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson', license: 'Public Domain', updateCadence: 'Feed-dependent' },
    { id: 'nasa_firms', name: 'NASA FIRMS VIIRS', category: 'Hotspots', url: 'https://firms.modaps.eosdis.nasa.gov/api/area', license: 'NASA data terms', updateCadence: 'Near-real-time', configured: Boolean(DEFAULT_FIRMS_KEY) },
    { id: 'rainviewer', name: 'RainViewer Radar', category: 'Radar', url: 'https://api.rainviewer.com/public/weather-maps.json', license: 'RainViewer terms; attribution required', updateCadence: 'Menurut metadata provider' },
    { id: 'big_satu_peta', name: 'BIG Satu Peta', category: 'Vector GIS', url: `${BIG_SERVICES.boundaries}?f=pjson`, license: 'Peraturan/lisensi sumber', updateCadence: 'Periksa metadata service' },
    { id: 'big_rbi_kabkota', name: 'BIG RBI Kabupaten/Kota Polygon', category: 'Administrative boundaries', url: `${BIG_SERVICES.rbi_kabkota}?f=pjson`, license: 'Atribusi BIG', updateCadence: 'Edisi Juni 2026 (metadata service)' },
    { id: 'big_rbi_kecamatan', name: 'BIG RBI Kecamatan Polygon', category: 'Administrative boundaries', url: `${BIG_SERVICES.rbi_kecamatan}?f=pjson`, license: 'Atribusi BIG', updateCadence: 'Edisi Juni 2026 (metadata service)' },
    { id: 'big_ptra_atlas', name: 'BIG PTRA Atlas Services', category: 'Thematic Atlas', url: `${BIG_SERVICES.ptra_gunung_api}?f=pjson`, license: 'Atribusi BIG; periksa penggunaan khusus atlas.big.go.id', updateCadence: 'Periksa metadata masing-masing service' },
    { id: 'big_rbi_50k', name: 'BIG RBI Index 1:50K', category: 'Topographic reference', url: `${BIG_SERVICES.rbi_50k}?f=pjson`, license: 'Atribusi BIG', updateCadence: 'Periksa metadata service' },
    { id: 'gfw_arcgis_reference', name: 'GFW ArcGIS reference services', category: 'Forest monitoring', url: 'https://gis.bnpb.go.id/server/rest/services/InAWARE/Global_forest_watch2/MapServer?f=pjson', license: 'Dataset-specific; verify source metadata', updateCadence: 'Periksa metadata service' },
    { id: 'nasa_gibs', name: 'NASA GIBS WMTS', category: 'Satellite imagery', url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml', license: 'NASA EOSDIS', updateCadence: 'Produk harian/produk-spesifik' },
    { id: 'copernicus_stac', name: 'Copernicus Data Space STAC', category: 'Satellite catalogue', url: 'https://stac.dataspace.copernicus.eu/v1/', license: 'Per collection/product', updateCadence: 'Collection-dependent' },
    { id: 'gfw_api', name: 'Global Forest Watch Data API', category: 'Forest monitoring', url: 'https://data-api.globalforestwatch.org/datasets', license: 'Dataset-dependent', updateCadence: 'Dataset version-dependent' },
  ];
  const providers = await Promise.all(checks.map(async (provider) => {
    if (provider.id === 'nasa_firms' && !provider.configured) return { ...provider, status: 'REQUIRES_KEY', checkedAt: new Date().toISOString() };
    try {
      const headers = provider.id.startsWith('bmkg_') || provider.id.startsWith('sipongi_')
        ? BMKG_BROWSER_HEADERS
        : undefined;
      const response = await fetch(provider.url, { headers, signal: AbortSignal.timeout(5000) });
      return { ...provider, status: response.ok ? 'ONLINE' : 'DELAYED', httpStatus: response.status, checkedAt: new Date().toISOString() };
    } catch (error) {
      return { ...provider, status: 'UNAVAILABLE', error: (error as Error).message, checkedAt: new Date().toISOString() };
    }
  }));
  return res.json({ timestamp: new Date().toISOString(), providers });
});


// ----------------------------------------------------
// API: BIG PTRA/RBI and GFW ArcGIS raster export proxy
// All external ArcGIS calls stay server-side. The browser requests local XYZ
// tiles, preventing mixed-content and cross-origin failures and keeping provider
// configuration centralized in src/data/arcgisServices.ts.
// ----------------------------------------------------
function arcgisTileBbox(z: number, x: number, y: number): [number, number, number, number] {
  const halfWorld = 20037508.342789244;
  const tileCount = 2 ** z;
  const span = (2 * halfWorld) / tileCount;
  const xmin = -halfWorld + x * span;
  const xmax = xmin + span;
  const ymax = halfWorld - y * span;
  const ymin = ymax - span;
  return [xmin, ymin, xmax, ymax];
}

function arcgisExportUrl(candidate: ArcGisServiceCandidate, bbox: number[]): string {
  const params = new URLSearchParams({
    bbox: bbox.map((value) => value.toFixed(3)).join(','),
    bboxSR: '3857',
    imageSR: '3857',
    size: '256,256',
    format: 'png32',
    transparent: 'true',
    f: 'image',
  });
  if (candidate.serviceType === 'MapServer' && candidate.layerIds?.length) {
    params.set('layers', `show:${candidate.layerIds.join(',')}`);
  }
  if (candidate.serviceType === 'MapServer' && candidate.layerDefinitions) {
    params.set('layerDefs', JSON.stringify(candidate.layerDefinitions));
  }
  const operation = candidate.serviceType === 'ImageServer' ? 'exportImage' : 'export';
  return `${candidate.url.replace(/\/$/, '')}/${operation}?${params.toString()}`;
}

app.get('/api/arcgis/services', (_req: Request, res: Response) => {
  return res.json({
    checkedAt: new Date().toISOString(),
    services: ARCGIS_OVERLAY_SERVICES.map((service) => ({
      id: service.id,
      name: service.name,
      provider: service.provider,
      attribution: service.attribution,
      license: service.license,
      sourceUrl: service.sourceUrl,
      serviceTypes: [...new Set(service.candidates.map((candidate) => candidate.serviceType))],
      hasFallback: service.candidates.length > 1,
      hasDownload: Boolean(service.downloadUrl),
    })),
  });
});

app.get('/api/arcgis/services/:serviceId/metadata', async (req: Request, res: Response) => {
  const service = ARCGIS_OVERLAY_SERVICES.find((item) => item.id === req.params.serviceId);
  if (!service) return res.status(404).json({ error: 'ArcGIS service ID tidak dikenal.' });
  const errors: string[] = [];
  for (const candidate of service.candidates) {
    try {
      const response = await fetch(`${candidate.url.replace(/\/$/, '')}?f=pjson`, {
        headers: { 'User-Agent': 'IndonesiaGeoViewer/1.0' },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const metadata: any = await response.json();
      if (metadata?.error) throw new Error(metadata.error.message || 'ArcGIS metadata error');
      return res.json({
        id: service.id,
        name: service.name,
        provider: service.provider,
        attribution: String(metadata?.copyrightText || '').trim() || service.attribution,
        license: service.license,
        selectedSource: candidate.url,
        sourceNote: candidate.note || null,
        checkedAt: new Date().toISOString(),
        metadata,
      });
    } catch (error) {
      errors.push(`${candidate.url}: ${(error as Error).message}`);
    }
  }
  return res.status(502).json({ id: service.id, status: 'UNAVAILABLE', errors, checkedAt: new Date().toISOString() });
});

// ArcGIS Identify: fetch the actual source attributes when a user clicks a visible
// BIG/GFW raster overlay. Aliases and coded-value domains come from layer metadata.
const arcgisFieldMetadataCache = new Map<string, Promise<any>>();

async function getArcgisLayerFieldMetadata(serviceUrl: string, layerId: number): Promise<any> {
  const key = `${serviceUrl.replace(/\/$/, '')}/${layerId}`;
  let pending = arcgisFieldMetadataCache.get(key);
  if (!pending) {
    pending = (async () => {
      const response = await fetch(`${key}?f=pjson`, {
        headers: { 'User-Agent': 'IndonesiaGeoViewer/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`Layer metadata HTTP ${response.status}`);
      const json: any = await response.json();
      if (json?.error) throw new Error(json.error.message || 'ArcGIS layer metadata error');
      return json && typeof json === 'object' ? json : { fields: [] };
    })();
    arcgisFieldMetadataCache.set(key, pending);
  }
  try {
    return await pending;
  } catch (error) {
    arcgisFieldMetadataCache.delete(key);
    throw error;
  }
}

function arcgisIdentifyUrl(
  candidate: ArcGisServiceCandidate,
  params: { lon: number; lat: number; extent: string; width: number; height: number; dpi: number },
): string {
  const query = new URLSearchParams({
    geometry: `${params.lon},${params.lat}`,
    geometryType: 'esriGeometryPoint',
    sr: '4326',
    returnGeometry: 'false',
    f: 'json',
  });
  if (candidate.serviceType === 'MapServer') {
    query.set('mapExtent', params.extent);
    query.set('imageDisplay', `${params.width},${params.height},${params.dpi}`);
    query.set('tolerance', '8');
    if (candidate.layerIds?.length) query.set('layers', `all:${candidate.layerIds.join(',')}`);
    else query.set('layers', 'visible');
    if (candidate.layerDefinitions) query.set('layerDefs', JSON.stringify(candidate.layerDefinitions));
  } else {
    query.set('returnCatalogItems', 'false');
  }
  return `${candidate.url.replace(/\/$/, '')}/identify?${query.toString()}`;
}

app.get('/api/arcgis/identify/:serviceId', async (req: Request, res: Response) => {
  const service = ARCGIS_OVERLAY_SERVICES.find((item) => item.id === req.params.serviceId);
  if (!service) return res.status(404).json({ error: 'ArcGIS service ID tidak dikenal.' });

  const lon = Number(req.query.lon);
  const lat = Number(req.query.lat);
  const extentRaw = String(req.query.extent || '');
  const extentValues = extentRaw.split(',').map(Number);
  const width = Math.min(4096, Math.max(256, Number(req.query.width) || 1024));
  const height = Math.min(4096, Math.max(256, Number(req.query.height) || 768));
  const dpi = Math.min(300, Math.max(48, Number(req.query.dpi) || 96));

  if (!Number.isFinite(lon) || !Number.isFinite(lat) || lon < -180 || lon > 180 || lat < -90 || lat > 90) {
    return res.status(400).json({ error: 'Koordinat lon/lat tidak valid.' });
  }
  if (extentValues.length !== 4 || !extentValues.every(Number.isFinite) || extentValues[0] >= extentValues[2] || extentValues[1] >= extentValues[3]) {
    return res.status(400).json({ error: 'Extent peta tidak valid. Format: west,south,east,north.' });
  }

  const errors: string[] = [];
  for (const candidate of service.candidates) {
    try {
      const response = await fetch(arcgisIdentifyUrl(candidate, {
        lon, lat, extent: extentValues.join(','), width, height, dpi,
      }), {
        headers: { 'User-Agent': 'IndonesiaGeoViewer/1.0' },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload: any = await response.json();
      if (payload?.error) throw new Error(payload.error.message || 'ArcGIS identify error');

      const rawResults = Array.isArray(payload?.results)
        ? payload.results
        : candidate.serviceType === 'ImageServer' && (payload?.value !== undefined || payload?.properties)
          ? [{ layerId: -1, layerName: 'Nilai piksel raster', value: payload.value, attributes: payload.properties || {} }]
          : [];
      const results = await Promise.all(rawResults.map(async (result: any) => {
        const layerId = Number(result.layerId);
        const rawAttributes = result.attributes && typeof result.attributes === 'object' ? result.attributes : {};
        let layerMetadata: any = null;
        if (Number.isInteger(layerId) && candidate.serviceType === 'MapServer') {
          try { layerMetadata = await getArcgisLayerFieldMetadata(candidate.url, layerId); }
          catch (error) { errors.push(`Field metadata ${layerId}: ${(error as Error).message}`); }
        }
        const fieldsByName = new Map((Array.isArray(layerMetadata?.fields) ? layerMetadata.fields : []).map((field: any) => [field.name, field]));
        const subtypeField = layerMetadata?.typeIdField;
        const subtypeValue = subtypeField ? rawAttributes[subtypeField] : undefined;
        const subtype = Array.isArray(layerMetadata?.types)
          ? layerMetadata.types.find((item: any) => String(item.id) === String(subtypeValue))
          : undefined;
        const attributes = Object.entries(rawAttributes).map(([fieldName, value]) => {
          const field: any = fieldsByName.get(fieldName);
          const fieldDomain = subtype?.domains?.[fieldName] || field?.domain;
          const codedValues = fieldDomain?.codedValues;
          const coded = Array.isArray(codedValues)
            ? codedValues.find((entry: any) => String(entry.code) === String(value))
            : undefined;
          const displayValue = coded?.name ?? (field?.type === 'esriFieldTypeDate' && value !== null && value !== undefined
            ? new Date(Number(value)).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
            : value);
          return {
            field: fieldName,
            alias: field?.alias || fieldName,
            value,
            displayValue: displayValue === null || displayValue === undefined || displayValue === '' ? '—' : String(displayValue),
            fieldType: field?.type || null,
          };
        });
        return {
          layerId,
          layerName: result.layerName || `Layer ${layerId}`,
          displayFieldName: result.displayFieldName || null,
          value: result.value ?? null,
          attributes,
          rawAttributes,
          geometryType: result.geometryType || null,
          layerAttribution: String(layerMetadata?.copyrightText || '').trim() || null,
        };
      }));

      return res.json({
        id: service.id,
        name: service.name,
        provider: service.provider,
        attribution: String(payload?.copyrightText || '').trim() || service.attribution,
        license: service.license,
        sourceUrl: service.sourceUrl,
        selectedSource: candidate.url,
        sourceNote: candidate.note || null,
        checkedAt: new Date().toISOString(),
        count: results.length,
        results,
        warnings: errors,
      });
    } catch (error) {
      errors.push(`${candidate.url}: ${(error as Error).message}`);
    }
  }
  return res.status(502).json({
    id: service.id,
    status: 'UNAVAILABLE',
    attribution: service.attribution,
    errors,
    checkedAt: new Date().toISOString(),
  });
});

app.get('/api/arcgis/tiles/:serviceId/:z/:x/:y.png', async (req: Request, res: Response) => {
  const service = ARCGIS_OVERLAY_SERVICES.find((item) => item.id === req.params.serviceId);
  if (!service) return res.status(404).end();
  const z = Number(req.params.z);
  const x = Number(req.params.x);
  const y = Number(req.params.y);
  if (![z, x, y].every(Number.isInteger) || z < 0 || z > 20) return res.status(400).end();
  const tileCount = 2 ** z;
  if (x < 0 || y < 0 || x >= tileCount || y >= tileCount) return res.status(400).end();

  const cacheKey = `arcgis_tile_${service.id}_${z}_${x}_${y}`;
  const cached = getCached<Buffer>(cacheKey);
  if (cached) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Data-Provider', service.provider);
    res.setHeader('X-Data-Attribution', service.attribution);
    return res.send(cached);
  }

  const bbox = arcgisTileBbox(z, x, y);
  const errors: string[] = [];
  for (const candidate of service.candidates) {
    try {
      const upstream = await fetch(arcgisExportUrl(candidate, bbox), {
        headers: { 'User-Agent': 'IndonesiaGeoViewer/1.0' },
        signal: AbortSignal.timeout(16000),
      });
      if (!upstream.ok) throw new Error(`HTTP ${upstream.status}`);
      const contentType = upstream.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('image/')) {
        const body = (await upstream.text()).slice(0, 300);
        throw new Error(`Respons bukan gambar (${contentType || 'content-type kosong'}): ${body}`);
      }
      const bytes = Buffer.from(await upstream.arrayBuffer());
      if (!bytes.length) throw new Error('Tile kosong');
      setCache(cacheKey, bytes, 60 * 60 * 1000);
      res.setHeader('Content-Type', contentType.includes('jpeg') ? 'image/jpeg' : 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('X-Data-Provider', service.provider);
      res.setHeader('X-Data-Attribution', service.attribution);
      res.setHeader('X-Data-Source', candidate.url);
      if (candidate.note) res.setHeader('X-Data-Source-Note', candidate.note.slice(0, 200));
      return res.send(bytes);
    } catch (error) {
      errors.push(`${candidate.url}: ${(error as Error).message}`);
    }
  }
  console.warn(`ArcGIS tile unavailable (${service.id} ${z}/${x}/${y}):`, errors.join(' | '));
  return res.status(502).json({ status: 'UNAVAILABLE', service: service.id, error: errors.join(' | '), checkedAt: new Date().toISOString() });
});

// ----------------------------------------------------
// Production vs Dev Server integration
// ----------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[INDONESIA GEO VIEWER] Server running at http://0.0.0.0:${PORT} (Mode: ${process.env.NODE_ENV || 'development'})`);
  });
}

startServer();
