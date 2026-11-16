import test from "node:test";
import assert from "node:assert/strict";
import { parseFirmsCsv, type FirmsSensorCode } from "../../server/firms.ts";

const sampleCsv = [
  "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight",
  "-0.12345,109.12345,342.1,0.42,0.39,2026-11-09,131, N20,VIIRS,h,2.0NRT,294.4,12.6,D",
].join("\r\n");

test("NASA FIRMS CSV normalizes NOAA-20 VIIRS attributes and coordinates", () => {
  const features = parseFirmsCsv(sampleCsv, "VIIRS_NOAA20_NRT");
  assert.equal(features.length, 1);
  assert.deepEqual(features[0].geometry.coordinates, [109.12345, -0.12345]);
  assert.equal(features[0].properties.sensor, "VIIRS NOAA-20");
  assert.equal(features[0].properties.sensorCode, "VIIRS_NOAA20_NRT");
  assert.equal(features[0].properties.confidenceRaw, "h");
  assert.equal(features[0].properties.confidence, "Tinggi (High)");
  assert.equal(features[0].properties.time, "01:31");
  assert.equal(features[0].properties.frp, 12.6);
  assert.deepEqual(features[0].properties.sensorCodes, ["VIIRS_NOAA20_NRT"]);
});

test("NASA FIRMS parser accepts UTF-8 BOM and empty data rows", () => {
  const csv = "\uFEFFlatitude,longitude,acq_date,acq_time,confidence,frp\n";
  assert.deepEqual(parseFirmsCsv(csv, "VIIRS_SNPP_NRT"), []);
});

test("NASA FIRMS parser supports quoted CSV fields", () => {
  const csv =
    'latitude,longitude,acq_date,acq_time,satellite,instrument,confidence,frp\n1,100,2026-11-09,930,"N21","VIIRS","n",4.2';
  const features = parseFirmsCsv(csv, "VIIRS_NOAA21_NRT");
  assert.equal(features[0].properties.satellite, "N21");
  assert.equal(features[0].properties.time, "09:30");
});

test("NASA FIRMS parser rejects non-CSV error responses", () => {
  assert.throws(
    () => parseFirmsCsv("<html>API key invalid</html>", "VIIRS_SNPP_NRT"),
    /Format CSV NASA FIRMS tidak dikenali/,
  );
});

test("NASA FIRMS parser identifies each requested VIIRS sensor code independently", () => {
  const base =
    "latitude,longitude,acq_date,acq_time,satellite,instrument,confidence,frp";
  const cases: Array<{
    code: FirmsSensorCode;
    satellite: string;
    expected: string;
  }> = [
    { code: "VIIRS_SNPP_NRT", satellite: "NPP", expected: "VIIRS Suomi-NPP" },
    { code: "VIIRS_NOAA20_NRT", satellite: "N20", expected: "VIIRS NOAA-20" },
    { code: "VIIRS_NOAA21_NRT", satellite: "N21", expected: "VIIRS NOAA-21" },
  ];

  for (const item of cases) {
    const csv = `${base}\n-0.5,110.25,2026-11-09,1234,${item.satellite},VIIRS,h,8.7`;
    const feature = parseFirmsCsv(csv, item.code)[0];
    assert.equal(feature.properties.sensorCode, item.code);
    assert.equal(feature.properties.sensor, item.expected);
    assert.deepEqual(feature.geometry.coordinates, [110.25, -0.5]);
  }
});
