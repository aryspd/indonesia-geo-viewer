import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { ARCGIS_OVERLAY_SERVICES } from "../src/data/arcgisServices.ts";

const catalogSource = fs.readFileSync(
  new URL("../src/data/layersCatalog.ts", import.meta.url),
  "utf8",
);
const directCatalogSource =
  catalogSource.split("export const INITIAL_LAYERS:")[1] || "";
const directIds = [
  ...directCatalogSource.matchAll(/id:\s*['"]([^'"]+)['"]/g),
].map((match) => match[1]);
import path from "node:path";

const expectedDirectIds = [
  "admin-provinces",
  "disaster-viirs-snpp",
  "disaster-viirs-noaa20",
  "disaster-viirs-noaa21",
  "weather-wind-particles",
  "weather-air-quality",
  "weather-rain-potential",
  "weather-bmkg-nowcast",
  "weather-gpm-precipitation",
  "gfw-tree-cover-loss",
  "gfw-peatlands",
  "gfw-mangrove-extent",
  "gfw-wood-fiber-concessions",
  "gfw-oil-palm",
];

test("new thematic source catalogue contains only the requested direct layer groups", () => {
  assert.deepEqual([...directIds].sort(), [...expectedDirectIds].sort());
  assert.equal(
    directIds.length,
    14,
    "expected 14 active thematic catalogue layers",
  );
  assert.equal(
    new Set(directIds).size,
    directIds.length,
    "direct layer IDs must be unique",
  );
});

test("basemaps are retained separately from the replaced thematic catalogue", () => {
  const basemapSource =
    catalogSource
      .split("export const BASEMAPS:")[1]
      ?.split("export const INITIAL_LAYERS:")[0] || "";
  const basemapIds = [...basemapSource.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(basemapIds, ["esri-satellite", "opentopomap"]);
  assert.ok(!basemapIds.includes("osm"));
  assert.ok(!basemapIds.includes("carto-dark"));
});

test("every direct thematic layer documents provider, attribution, source and use terms", () => {
  const directBlocks = directCatalogSource.split(/\n  \{/).slice(1);
  for (const id of expectedDirectIds) {
    const block = directBlocks.find((candidate) =>
      new RegExp(`id:\\s*['"]${id}['"]`).test(candidate),
    );
    assert.ok(block, `${id} block must exist`);
    for (const field of [
      "provider:",
      "attribution:",
      "sourceUrl:",
      "license:",
    ]) {
      assert.ok(block.includes(field), `${id} metadata is missing ${field}`);
    }
  }
  for (const service of ARCGIS_OVERLAY_SERVICES) {
    assert.ok(service.provider.trim());
    assert.ok(service.attribution.trim());
    assert.match(service.sourceUrl, /^https:\/\//);
    assert.ok(service.license.trim());
  }
});

test("GFW Tile Cache IDs are used as documented by the official dataset catalogue", () => {
  for (const dataset of ["idn_wood_fiber", "gfw_oil_palm"]) {
    assert.ok(
      directCatalogSource.includes(dataset),
      `${dataset} missing from catalogue`,
    );
  }
  assert.match(directCatalogSource, /gfw_peatlands/);
  assert.match(directCatalogSource, /umd_tree_cover_loss/);
});

test("obsolete thematic IDs and restricted BIG PTRA coal atlas are excluded", () => {
  const allCatalogSource = `${directCatalogSource}\n${fs.readFileSync(new URL("../src/data/arcgisServices.ts", import.meta.url), "utf8")}`;
  for (const oldId of [
    "satellite-sentinel2",
    "weather-precipitation-radar",
    "weather-cloud-cover",
    "disaster-bmkg-quakes",
    "env-tree-cover-loss",
    "env-indonesia-forest-zones",
    "topo-copernicus-dem",
    "admin-kabkota-boundaries",
    "admin-kecamatan-boundaries",
    "big-atlas-batubara",
    "gfw-fire-history",
    "gfw-peat-lands",
    "gfw-palm-oil-mills",
  ])
    assert.doesNotMatch(allCatalogSource, new RegExp(oldId));
  assert.doesNotMatch(
    allCatalogSource,
    /url:\s*['\"]https?:\/\/[^'\"]*Atlas_250K_BatuBara/i,
  );
});

test("frontend source never embeds secret API keys or server environment variables", () => {
  const srcDirPath = path.resolve(process.cwd(), "src");
  const walkFiles = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walkFiles(full));
      else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) out.push(full);
    }
    return out;
  };
  for (const filePath of walkFiles(srcDirPath)) {
    const content = fs.readFileSync(filePath, "utf8");
    const rel = path.relative(process.cwd(), filePath);
    assert.doesNotMatch(
      content,
      /process\.env\b|import\.meta\.env\b/,
      `${rel} must not read env vars`,
    );
    assert.doesNotMatch(
      content,
      new RegExp("GEMINI_API_KEY|GFW_API_KEY|x-api-key|mapKey" + "=", "i"),
      `${rel} must not reference server API keys`,
    );
    assert.doesNotMatch(
      content,
      /['"][0-9a-f]{32}['"]/i,
      `${rel} must not contain 32-char API key literals`,
    );
    assert.doesNotMatch(
      content,
      /NASA_FIRMS_MAP_KEY\s*[:=]/i,
      `${rel} must not define NASA_FIRMS_MAP_KEY`,
    );
  }
});
