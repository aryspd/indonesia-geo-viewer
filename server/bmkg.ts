/** Small, dependency-free parsers for BMKG RSS/CAP XML feeds. */
function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

function tagValue(xml: string, tag: string): string | null {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = xml.match(new RegExp(`<(?:[\\w.-]+:)?${escaped}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${escaped}\\s*>`, 'i'));
  return match ? decodeXml(match[1]) : null;
}

function blocks(xml: string, tag: string): string[] {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(`<(?:[\\w.-]+:)?${escaped}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${escaped}\\s*>`, 'gi');
  return [...xml.matchAll(expression)].map((match) => match[1]);
}

function alertCodeFromLink(link: string): string | null {
  try {
    const url = new URL(link, 'https://www.bmkg.go.id');
    const match = url.pathname.match(/\/([^/]+)_alert\.xml$/i);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

export interface BmkgNowcastFeedItem {
  title: string;
  link: string;
  description: string;
  author: string | null;
  pubDate: string | null;
  alertCode: string | null;
}

export function parseBmkgNowcastFeed(xml: string): BmkgNowcastFeedItem[] {
  return blocks(xml, 'item').map((item) => {
    const link = tagValue(item, 'link') || '';
    return {
      title: tagValue(item, 'title') || 'Peringatan dini cuaca BMKG',
      link,
      description: tagValue(item, 'description') || '',
      author: tagValue(item, 'author') || tagValue(item, 'creator'),
      pubDate: tagValue(item, 'pubDate'),
      alertCode: alertCodeFromLink(link),
    };
  }).filter((item) => item.link || item.title);
}

function parseCapPolygon(text: string): [number, number][] | null {
  const points = text.trim().split(/\s+/).map((pair) => {
    const [latText, lonText] = pair.split(',');
    const lat = Number(latText);
    const lon = Number(lonText);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return [lon, lat] as [number, number];
  }).filter((point): point is [number, number] => point !== null);
  if (points.length < 3) return null;
  const first = points[0];
  const last = points[points.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) points.push([first[0], first[1]]);
  return points;
}

export interface ParsedBmkgCap {
  alert: Record<string, string | null>;
  geojson: {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      id: string;
      geometry: { type: 'Polygon'; coordinates: [number, number][][] };
      properties: Record<string, string | null>;
    }>;
  };
}

export function parseBmkgCap(xml: string): ParsedBmkgCap {
  const alert = {
    identifier: tagValue(xml, 'identifier'),
    sender: tagValue(xml, 'sender'),
    sent: tagValue(xml, 'sent'),
    status: tagValue(xml, 'status'),
    msgType: tagValue(xml, 'msgType'),
    source: tagValue(xml, 'source'),
  };
  const features: ParsedBmkgCap['geojson']['features'] = [];
  const infoBlocks = blocks(xml, 'info');
  infoBlocks.forEach((info, infoIndex) => {
    const infoProperties = {
      event: tagValue(info, 'event'),
      urgency: tagValue(info, 'urgency'),
      severity: tagValue(info, 'severity'),
      certainty: tagValue(info, 'certainty'),
      effective: tagValue(info, 'effective'),
      onset: tagValue(info, 'onset'),
      expires: tagValue(info, 'expires'),
      senderName: tagValue(info, 'senderName'),
      headline: tagValue(info, 'headline'),
      description: tagValue(info, 'description'),
      instruction: tagValue(info, 'instruction'),
      web: tagValue(info, 'web'),
      language: tagValue(info, 'language'),
    };
    blocks(info, 'area').forEach((area, areaIndex) => {
      const areaDescription = tagValue(area, 'areaDesc');
      blocks(area, 'polygon').forEach((polygon, polygonIndex) => {
        const ring = parseCapPolygon(decodeXml(polygon));
        if (!ring) return;
        features.push({
          type: 'Feature',
          id: `${alert.identifier || 'bmkg-alert'}-${infoIndex}-${areaIndex}-${polygonIndex}`,
          geometry: { type: 'Polygon', coordinates: [ring] },
          properties: { ...alert, ...infoProperties, areaDescription },
        });
      });
    });
  });
  return { alert, geojson: { type: 'FeatureCollection', features } };
}
