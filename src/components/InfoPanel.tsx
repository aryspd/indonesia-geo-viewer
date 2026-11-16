import React, { useState } from 'react';
import {
  X,
  Activity,
  CloudRain,
  Wind,
  Thermometer,
  Flame,
  MapPin,
  ExternalLink,
  BarChart3,
  Layers,
  ShieldAlert,
  Download,
} from 'lucide-react';
import { SelectedFeature } from '../types/gis';

interface InfoPanelProps {
  selectedFeature: SelectedFeature | null;
  onClose: () => void;
  quakesCount: number | null;
  latestQuakeMag: number | null;
  activeLayersCount: number;
  hotspotsCount?: number | null;
  hotspotSensors?: { snpp: number; noaa20: number; noaa21: number } | null;
  onFlyToCoords: (lng: number, lat: number, zoom?: number) => void;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({
  selectedFeature,
  onClose,
  quakesCount,
  latestQuakeMag,
  activeLayersCount,
  hotspotsCount = null,
  hotspotSensors,
  onFlyToCoords,
}) => {
  const [activeTab, setActiveTab] = useState<'inspect' | 'summary'>('inspect');

  // If no feature is clicked, default to summary tab
  const currentTab = selectedFeature ? activeTab : 'summary';

  return (
    <aside className="fixed top-16 right-3 z-30 w-80 md:w-92 max-h-[calc(100vh-4.75rem)] bg-[#114232]/95 backdrop-blur-xl border border-[#87A922]/75 rounded-2xl flex flex-col text-[#F7F6BB] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Tab Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#87A922]/55 bg-gradient-to-r from-[#87A922]/25 to-[#114232]">
        <div className="flex items-center gap-1.5">
          {selectedFeature && (
            <button
              onClick={() => setActiveTab('inspect')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                currentTab === 'inspect'
                  ? 'bg-[#FCDC2A] text-[#114232] shadow-sm'
                  : 'text-[#F7F6BB]/80 hover:text-white hover:bg-[#87A922]/30'
              }`}
            >
              Inspeksi Objek
            </button>
          )}
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              currentTab === 'summary'
                ? 'bg-[#FCDC2A] text-[#114232] shadow-sm'
                : 'text-[#F7F6BB]/80 hover:text-white hover:bg-[#87A922]/30'
            }`}
          >
            Ringkasan Situasi
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-[#F7F6BB]/75 hover:text-white rounded-lg hover:bg-[#87A922]/30 transition-colors cursor-pointer"
          title="Tutup Panel Informasi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {currentTab === 'inspect' && selectedFeature && (
          <div>
            {/* Feature Header */}
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono uppercase text-sky-400 font-semibold tracking-wider">
                  {selectedFeature.type === 'earthquake'
                    ? 'Laporan Kegempaan'
                    : selectedFeature.type === 'weather'
                    ? 'Observasi Cuaca'
                    : selectedFeature.type === 'hotspot'
                    ? 'Deteksi Titik Panas'
                    : selectedFeature.type === 'province'
                    ? 'Wilayah Administratif'
                    : selectedFeature.type === 'arcgis'
                    ? 'Atribut Layanan BIG / GFW'
                    : selectedFeature.data?.source === 'BIG RBI'
                    ? 'Batas Administrasi BIG'
                    : selectedFeature.data?.source === 'File lokal GeoJSON/Shapefile'
                    ? 'Fitur Vektor'
                    : 'Koordinat Spasial'}
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5 leading-snug">
                  {selectedFeature.title}
                </h3>
              </div>
              <button
                onClick={() =>
                  onFlyToCoords(
                    selectedFeature.coordinates[0],
                    selectedFeature.coordinates[1],
                    8
                  )
                }
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-md transition-colors shrink-0"
                title="Pusatkan Peta ke Objek Ini"
              >
                <MapPin className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Feature Specific Body */}
            {selectedFeature.type === 'earthquake' && (
              <div className="space-y-3 pt-3">
                {/* Magnitude Badge & Depth */}
                <div className="flex items-center gap-3">
                  <div
                    className={`px-3 py-1.5 rounded-lg font-bold text-base font-mono tabular-nums ${
                      selectedFeature.data.magnitude >= 6.0
                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50'
                        : selectedFeature.data.magnitude >= 5.0
                        ? 'bg-amber-600 text-white'
                        : 'bg-sky-600 text-white'
                    }`}
                  >
                    M {selectedFeature.data.magnitude.toFixed(1)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">
                      Kedalaman: {selectedFeature.data.depth}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {selectedFeature.data.date} · {selectedFeature.data.time} WIB
                    </div>
                  </div>
                </div>

                {/* Potential & Alert */}
                {selectedFeature.data.potential && (
                  <div className="p-2.5 rounded-md bg-slate-800/80 border border-slate-700 flex items-start gap-2">
                    <ShieldAlert
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        selectedFeature.data.potential.toLowerCase().includes('tsunami')
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}
                    />
                    <div>
                      <div className="font-semibold text-slate-200">Status Peringatan:</div>
                      <div className="text-slate-300 leading-tight mt-0.5">
                        {selectedFeature.data.potential}
                      </div>
                    </div>
                  </div>
                )}

                {/* Felt Reports */}
                {selectedFeature.data.felt && (
                  <div className="p-2.5 rounded-md bg-slate-800/50 border border-slate-800">
                    <div className="font-semibold text-slate-300 text-[11px] mb-0.5">
                      Wilayah Dirasakan:
                    </div>
                    <div className="text-slate-300 leading-snug">{selectedFeature.data.felt}</div>
                  </div>
                )}

                {/* Shakemap Image */}
                {selectedFeature.data.shakemap && (
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-300 text-[11px]">
                      Peta Guncangan (BMKG Shakemap):
                    </div>
                    <a
                      href={selectedFeature.data.shakemap}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-md border border-slate-700 hover:border-sky-500 transition-colors"
                    >
                      <img
                        src={selectedFeature.data.shakemap}
                        alt="Shakemap BMKG"
                        className="w-full h-auto object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </a>
                  </div>
                )}

                {/* Source attribution */}
                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 flex justify-between items-center">
                  <span>Sumber Data: {selectedFeature.data.source}</span>
                  <span className="font-mono">
                    {selectedFeature.coordinates[1].toFixed(2)}°,{' '}
                    {selectedFeature.coordinates[0].toFixed(2)}°
                  </span>
                </div>
              </div>
            )}

            {/* Weather Specific Body */}
            {selectedFeature.type === 'weather' && (
              <div className="space-y-3 pt-3">
                {selectedFeature.data?.dataType === 'weather-warning' ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-amber-950/40 border border-amber-700/60 rounded-md">
                      <div className="text-[10px] uppercase tracking-wide text-amber-300 font-semibold">Peringatan resmi BMKG</div>
                      <div className="text-sm font-bold text-white mt-1">{selectedFeature.data.headline || selectedFeature.data.feedTitle || selectedFeature.data.event || 'Peringatan dini cuaca'}</div>
                      <div className="text-[11px] text-slate-300 mt-1">{selectedFeature.data.areaDescription || selectedFeature.data.feedDescription || 'Wilayah terdampak mengikuti area dalam dokumen CAP.'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {[
                        ['Jenis kejadian', selectedFeature.data.event],
                        ['Tingkat bahaya', selectedFeature.data.severity],
                        ['Urgensi', selectedFeature.data.urgency],
                        ['Kepastian', selectedFeature.data.certainty],
                        ['Mulai berlaku', selectedFeature.data.effective || selectedFeature.data.onset],
                        ['Berakhir', selectedFeature.data.expires],
                      ].map(([label, value]) => (
                        <div key={label} className="p-2 bg-slate-800/70 rounded border border-slate-700/70">
                          <div className="text-[9px] uppercase text-slate-400">{label}</div>
                          <div className="text-slate-100 mt-0.5">{value || 'Tidak tersedia pada CAP'}</div>
                        </div>
                      ))}
                    </div>
                    {selectedFeature.data.description && <p className="text-[11px] leading-relaxed text-slate-300">{selectedFeature.data.description}</p>}
                    {selectedFeature.data.instruction && <p className="text-[11px] leading-relaxed text-amber-200">Instruksi: {selectedFeature.data.instruction}</p>}
                    <div className="text-[10px] text-slate-500">{selectedFeature.data.attribution || 'Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)'}. Periksa pembaruan peringatan di kanal resmi BMKG.</div>
                  </div>
                ) : selectedFeature.data?.dataType === 'aqms' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/70 border border-slate-700/80">
                      <div
                        className={`px-3 py-1.5 rounded-lg font-bold text-base font-mono tabular-nums text-white ${
                          Number(selectedFeature.data.ispu) <= 50
                            ? 'bg-emerald-600'
                            : Number(selectedFeature.data.ispu) <= 100
                            ? 'bg-blue-600'
                            : Number(selectedFeature.data.ispu) <= 200
                            ? 'bg-orange-600'
                            : 'bg-rose-600'
                        }`}
                      >
                        ISPU {selectedFeature.data.ispu ?? '—'}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white">
                          {selectedFeature.data.category || selectedFeature.data.cat || 'TERPANTAU'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {selectedFeature.data.kota}{selectedFeature.data.provinsi ? `, ${selectedFeature.data.provinsi}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-md border border-slate-800 space-y-2 text-[11px]">
                      {selectedFeature.data.alamat && (
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Lokasi Stasiun AQMS</div>
                          <div className="text-slate-200 mt-0.5 leading-snug">{selectedFeature.data.alamat}</div>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-slate-800/80">
                        <span className="text-slate-400">Waktu Observasi:</span>
                        <span className="font-mono text-slate-200">{selectedFeature.data.waktu || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sumber Data:</span>
                        <span className="text-sky-300">KLHK / Sipongi AQMS</span>
                      </div>
                    </div>
                  </div>
                ) : selectedFeature.data?.dataType === 'bmkg-forecast' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-800/75 border border-slate-700/80">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-sky-400 font-semibold">
                          Prakiraan Resmi BMKG
                        </div>
                        <div className="text-sm font-bold text-white mt-0.5">
                          {selectedFeature.data.weather_desc || 'Cuaca'}
                        </div>
                        <div className="text-[11px] text-slate-300">
                          {[selectedFeature.data.desa, selectedFeature.data.kecamatan, selectedFeature.data.kota].filter(Boolean).join(', ')}
                        </div>
                      </div>
                      {selectedFeature.data.image && (
                        <img
                          src={selectedFeature.data.image}
                          alt={selectedFeature.data.weather_desc || 'Ikon Cuaca BMKG'}
                          className="w-12 h-12 object-contain shrink-0"
                        />
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 bg-slate-800/80 rounded-md border border-slate-700/80 flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-rose-400" />
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Suhu Udara</div>
                          <div className="font-mono font-bold text-sm text-slate-100">{selectedFeature.data.t ?? '—'}°C</div>
                        </div>
                      </div>
                      <div className="p-2.5 bg-slate-800/80 rounded-md border border-slate-700/80 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-400" />
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Kelembapan</div>
                          <div className="font-mono font-bold text-sm text-slate-100">{selectedFeature.data.hu ?? '—'}%</div>
                        </div>
                      </div>
                      <div className="p-2.5 bg-slate-800/80 rounded-md border border-slate-700/80 flex items-center gap-2">
                        <Wind className="w-4 h-4 text-emerald-400" />
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Angin</div>
                          <div className="font-mono font-bold text-sm text-slate-100">
                            {selectedFeature.data.ws ?? '—'} km/j {selectedFeature.data.wd || ''}
                          </div>
                        </div>
                      </div>
                      <div className="p-2.5 bg-slate-800/80 rounded-md border border-slate-700/80 flex items-center gap-2">
                        <CloudRain className="w-4 h-4 text-sky-400" />
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Tutupan Awan</div>
                          <div className="font-mono font-bold text-sm text-slate-100">{selectedFeature.data.tcc ?? '—'}%</div>
                        </div>
                      </div>
                    </div>
                    {(() => {
                      let slots: any[] = [];
                      try {
                        const raw = selectedFeature.data.forecastSlots;
                        slots = typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
                      } catch {
                        slots = [];
                      }
                      if (!slots.length) return null;
                      return (
                        <div className="p-2.5 bg-slate-800/50 rounded-md border border-slate-800 space-y-1.5">
                          <div className="font-semibold text-slate-300 text-[11px]">Prakiraan 3-Jam Mendatang:</div>
                          {slots.slice(0, 6).map((slot: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-[11px] text-slate-300 border-t border-slate-800/60 pt-1">
                              <span className="font-mono text-[10px] text-slate-400">{slot.local_datetime || '—'}</span>
                              <span>{slot.weather_desc} · {slot.t}°C</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    <div className="text-[10px] text-slate-500">
                      Kode ADM4: {selectedFeature.data.adm4 || '—'} · Sumber: BMKG (data.bmkg.go.id)
                    </div>
                  </div>
                ) : (
                  <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-800/80 rounded-md border border-slate-700/80 flex items-center gap-2.5">
                    <Thermometer className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Suhu Model</div>
                      <div className="font-mono font-bold text-sm text-slate-100">
                        {selectedFeature.data.current?.temperature_2m != null ? `${selectedFeature.data.current.temperature_2m}°C` : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-800/80 rounded-md border border-slate-700/80 flex items-center gap-2.5">
                    <CloudRain className="w-4 h-4 text-sky-400" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Presipitasi Model</div>
                      <div className="font-mono font-bold text-sm text-slate-100">
                        {selectedFeature.data.current?.precipitation != null ? `${selectedFeature.data.current.precipitation} mm` : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-800/80 rounded-md border border-slate-700/80 flex items-center gap-2.5">
                    <Wind className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Angin Model</div>
                      <div className="font-mono font-bold text-sm text-slate-100">
                        {selectedFeature.data.current?.wind_speed_10m != null ? `${selectedFeature.data.current.wind_speed_10m} km/j` : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-800/80 rounded-md border border-slate-700/80 flex items-center gap-2.5">
                    <Activity className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Kelembapan Model</div>
                      <div className="font-mono font-bold text-sm text-slate-100">
                        {selectedFeature.data.current?.relative_humidity_2m != null ? `${selectedFeature.data.current.relative_humidity_2m}%` : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3-day forecast summary */}
                {selectedFeature.data.daily && (
                  <div className="p-2.5 bg-slate-800/50 rounded-md border border-slate-800 space-y-1.5">
                    <div className="font-semibold text-slate-300 text-[11px]">
                      Prakiraan 3 Hari Mendatang:
                    </div>
                    {selectedFeature.data.daily.time.slice(0, 3).map((dateStr: string, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] text-slate-300 font-mono">
                        <span>{new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        <span>
                          {selectedFeature.data.daily.temperature_2m_min[idx]}° - {selectedFeature.data.daily.temperature_2m_max[idx]}°C
                        </span>
                        <span className="text-sky-400">
                          {selectedFeature.data.daily.precipitation_sum[idx]} mm
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-slate-500">{selectedFeature.data.metadata?.attribution || 'Prakiraan model Open-Meteo; bukan pengamatan stasiun atau radar real-time.'}</div>
                  </>
                )}
              </div>
            )}

            {/* ArcGIS feature attributes from BIG / GFW Identify service */}
            {selectedFeature.type === 'arcgis' && (
              <div className="space-y-3 pt-3">
                <div className="rounded-lg border border-slate-700 bg-slate-800/55 p-3 space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wide font-semibold text-sky-300">Informasi sumber data</div>
                  <div className="text-[11px] text-slate-200">{selectedFeature.data.provider || 'ArcGIS REST service'}</div>
                  <div className="text-[10px] text-slate-400 leading-relaxed">{selectedFeature.data.attribution || 'Atribusi mengikuti metadata penyedia data.'}</div>
                  {selectedFeature.data.license && (
                    <div className="pt-1 text-[10px] text-slate-400">Ketentuan: {selectedFeature.data.license}</div>
                  )}
                  {selectedFeature.data.sourceNote && <div className="pt-1 text-[10px] text-amber-200/80">Catatan sumber: {selectedFeature.data.sourceNote}</div>}
                  {(selectedFeature.data.selectedSource || selectedFeature.data.sourceUrl) && (
                    <a href={selectedFeature.data.selectedSource || selectedFeature.data.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 pt-1 text-[10px] text-sky-300 hover:text-sky-200">
                      Buka sumber asli <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {(selectedFeature.data.results || []).map((result: any, resultIndex: number) => (
                  <div key={`${result.layerId}-${resultIndex}`} className="overflow-hidden rounded-lg border border-slate-700">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-700 bg-slate-800/80 px-3 py-2">
                      <div className="font-semibold text-[11px] text-slate-100">{result.serviceName || result.layerName || 'Layer ArcGIS'}</div>
                      <span className="shrink-0 rounded bg-slate-700 px-1.5 py-0.5 font-mono text-[9px] text-slate-300">Layer {result.layerId}</span>
                    </div>
                    {result.value && <div className="border-b border-slate-800 bg-slate-800/35 px-3 py-2 text-[11px] text-sky-200">{result.value}</div>}
                    <div className="divide-y divide-slate-800/80">
                      {(result.attributes || []).map((attribute: any, attributeIndex: number) => (
                        <div key={`${attribute.field}-${attributeIndex}`} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3 px-3 py-2 text-[11px]">
                          <span className="break-words text-slate-400" title={attribute.field}>{attribute.alias || attribute.field}</span>
                          <span className="break-words text-right text-slate-100">{attribute.displayValue ?? '—'}</span>
                        </div>
                      ))}
                      {(!result.attributes || result.attributes.length === 0) && (
                        <div className="px-3 py-3 text-center text-[10px] text-slate-500">Fitur ditemukan, tetapi service tidak mengembalikan atribut pada permintaan ini.</div>
                      )}
                    </div>
                    <div className="border-t border-slate-800 px-3 py-1.5 text-[9px] text-slate-500">
                      {result.geometryType || 'Geometri tidak dikembalikan'} · {result.layerAttribution || selectedFeature.data.attribution || 'ArcGIS REST'}
                    </div>
                  </div>
                ))}
                {(!selectedFeature.data.results || selectedFeature.data.results.length === 0) && (
                  <div className="rounded-lg border border-slate-800 p-3 text-center text-[11px] text-slate-500">Tidak ditemukan fitur pada titik klik. Coba klik bagian dalam objek atau perbesar skala peta.</div>
                )}
                <div className="text-[9px] text-slate-500">Nilai dan nama field berasal dari service sumber. Nama tampilan mengikuti alias field ArcGIS jika tersedia; nilai asli tetap dipertahankan oleh API.</div>
              </div>
            )}

            {/* Hotspot Specific Body */}
            {selectedFeature.type === 'hotspot' && (
              <div className="space-y-3 pt-3">
                <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-md flex items-center gap-3">
                  <Flame className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-bold text-amber-200">
                      FRP: {selectedFeature.data.frp} MW
                    </div>
                    <div className="text-[11px] text-amber-300/80">
                      Tingkat Kepercayaan: {selectedFeature.data.confidence}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/60 p-2.5 rounded-md border border-slate-800 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sensor Satelit:</span>
                    <span className="font-mono font-medium text-slate-200">{selectedFeature.data.sensor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Waktu Akuisisi:</span>
                    <span className="font-mono font-medium text-slate-200">
                      {selectedFeature.data.date} {selectedFeature.data.time} UTC
                    </span>
                  </div>
                  {selectedFeature.data.bright_ti4 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Suhu Kecerahan:</span>
                      <span className="font-mono font-medium text-amber-300">
                        {selectedFeature.data.bright_ti4} K ({Math.round(selectedFeature.data.bright_ti4 - 273.15)}°C)
                      </span>
                    </div>
                  )}
                  {selectedFeature.data.daynight && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Waktu Deteksi:</span>
                      <span className="font-mono font-medium text-slate-200">{selectedFeature.data.daynight}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sumber:</span>
                    <span className="font-mono text-slate-400">{selectedFeature.data.source || 'NASA FIRMS'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Attributes for local vectors and official BIG RBI boundaries */}
            {selectedFeature.type === 'coordinate' && (
              <div className="space-y-3 pt-3">
                {selectedFeature.data?.dataType === 'oil-palm-concession' && (
                  <div className="rounded-lg border border-emerald-700/60 bg-emerald-950/35 p-3 space-y-2 text-[11px]">
                    <div className="text-[10px] uppercase tracking-wide font-semibold text-emerald-300">
                      Konsesi Perkebunan Kelapa Sawit
                    </div>
                    <div className="font-bold text-sm text-white">
                      {selectedFeature.data.company || selectedFeature.data.name || 'Perusahaan Sawit'}
                    </div>
                    <div className="space-y-1.5 pt-1 border-t border-emerald-800/40">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-400">Grup Perusahaan:</span>
                        <span className="font-medium text-slate-100 text-right">{selectedFeature.data.group_comp || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-400">Status Legalitas:</span>
                        <span className="font-medium text-emerald-300 text-right">
                          {selectedFeature.data.type || selectedFeature.data.po_legalst || '—'}
                        </span>
                      </div>
                      {selectedFeature.data.po_hgu && selectedFeature.data.po_hgu !== ' ' && (
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Nomor SK HGU:</span>
                          <span className="font-mono text-slate-200 text-right">{selectedFeature.data.po_hgu}</span>
                        </div>
                      )}
                      {selectedFeature.data.area_ha != null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Luas Area Konsesi:</span>
                          <span className="font-mono font-semibold text-slate-100 text-right">
                            {Number(selectedFeature.data.area_ha).toLocaleString('id-ID')} Ha
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {selectedFeature.data?.dataType === 'peatland-area' && (
                  <div className="rounded-lg border border-amber-700/60 bg-amber-950/35 p-3 space-y-2 text-[11px]">
                    <div className="text-[10px] uppercase tracking-wide font-semibold text-amber-300">
                      Kawasan Lahan Gambut Indonesia
                    </div>
                    <div className="font-bold text-sm text-white">
                      {selectedFeature.data.jenis_gambut || selectedFeature.data.layer_revi || 'Lahan Gambut'}
                    </div>
                    <div className="space-y-1.5 pt-1 border-t border-amber-800/40">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-400">Klasifikasi Gambut:</span>
                        <span className="font-medium text-amber-300 text-right">
                          {selectedFeature.data.jenis_gambut || selectedFeature.data.layer_revi || 'Lahan Gambut'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-400">ID Objek Gambut:</span>
                        <span className="font-mono text-slate-200 text-right">
                          {selectedFeature.data.objectid || selectedFeature.data.objectid_1 || '—'}
                        </span>
                      </div>
                      {selectedFeature.data.area_ha != null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Luas Area Gambut:</span>
                          <span className="font-mono font-semibold text-slate-100 text-right">
                            {Number(selectedFeature.data.area_ha).toLocaleString('id-ID')} Ha
                          </span>
                        </div>
                      )}
                      {selectedFeature.data.keliling_km != null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Keliling Poligon:</span>
                          <span className="font-mono text-slate-200 text-right">
                            {Number(selectedFeature.data.keliling_km).toLocaleString('id-ID')} km
                          </span>
                        </div>
                      )}
                      {selectedFeature.data.globalid && (
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Global ID:</span>
                          <span className="font-mono text-[10px] text-slate-300 text-right break-all">
                            {selectedFeature.data.globalid}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {selectedFeature.data?.dataType === 'mangrove-extent' && (
                  <div className="rounded-lg border border-teal-600/60 bg-teal-950/40 p-3 space-y-2 text-[11px]">
                    <div className="text-[10px] uppercase tracking-wide font-semibold text-teal-300">
                      Sebaran Ekosistem Habitat Mangrove
                    </div>
                    <div className="font-bold text-sm text-white">
                      {selectedFeature.data.nama_kawasan || selectedFeature.data.remark || 'Kawasan Mangrove Indonesia'}
                    </div>
                    <div className="space-y-1.5 pt-1 border-t border-teal-800/40">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-400">Kerapatan Tajuk:</span>
                        <span className="font-medium text-teal-300 text-right">
                          {selectedFeature.data.kttj || selectedFeature.data.kerapatan || 'Mangrove'}
                        </span>
                      </div>
                      {(selectedFeature.data.prov || selectedFeature.data.kab) && (
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Wilayah:</span>
                          <span className="font-medium text-slate-100 text-right">
                            {[selectedFeature.data.kab, selectedFeature.data.prov].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                      {(selectedFeature.data.lsmgr ?? selectedFeature.data.area_ha) != null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Luas Habitat Mangrove:</span>
                          <span className="font-mono font-semibold text-teal-200 text-right">
                            {Number(selectedFeature.data.lsmgr ?? selectedFeature.data.area_ha).toLocaleString('id-ID')} Ha
                          </span>
                        </div>
                      )}
                      {selectedFeature.data.fgsfrf && (
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Fungsi Kawasan:</span>
                          <span className="font-medium text-slate-200 text-right">{selectedFeature.data.fgsfrf}</span>
                        </div>
                      )}
                      {selectedFeature.data.bpdashl && (
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Wilayah BPDASHL:</span>
                          <span className="font-medium text-slate-200 text-right">{selectedFeature.data.bpdashl}</span>
                        </div>
                      )}
                      {selectedFeature.data.spesies_utama && (
                        <div className="flex flex-col gap-0.5 pt-1 border-t border-teal-900/50">
                          <span className="text-slate-400">Spesies Mangrove Dominan:</span>
                          <span className="italic text-teal-200">{selectedFeature.data.spesies_utama}</span>
                        </div>
                      )}
                      {selectedFeature.data.cadangan_karbon_ton_ha != null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Estimasi Karbon Biru:</span>
                          <span className="font-mono font-semibold text-emerald-300 text-right">
                            {Number(selectedFeature.data.cadangan_karbon_ton_ha).toLocaleString('id-ID')} ton C/Ha
                          </span>
                        </div>
                      )}
                      {(selectedFeature.data.smbdt || selectedFeature.data.thnbuat) && (
                        <div className="flex flex-col gap-0.5 pt-1 border-t border-teal-900/50 text-[10px]">
                          <span className="text-slate-400">Sumber & Tahun Data:</span>
                          <span className="text-slate-300">
                            {[selectedFeature.data.smbdt, selectedFeature.data.thnbuat ? `Tahun ${selectedFeature.data.thnbuat}` : ''].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {selectedFeature.data?.dataType === 'wood-fiber-concession' && (
                  <div className="rounded-xl border border-[#FCDC2A]/60 bg-[#87A922]/20 p-3 space-y-2 text-[11px]">
                    <div className="text-[10px] uppercase tracking-wide font-semibold text-[#FCDC2A]">
                      Konsesi Serat Kayu / HTI Indonesia
                    </div>
                    <div className="font-bold text-sm text-[#F7F6BB]">
                      {selectedFeature.data.name || 'Konsesi HTI'}
                    </div>
                    <div className="space-y-1.5 pt-1 border-t border-[#87A922]/45">
                      <div className="flex justify-between gap-2">
                        <span className="text-[#F7F6BB]/75">Grup Korporasi:</span>
                        <span className="font-medium text-[#FCDC2A] text-right">
                          {selectedFeature.data.grup_perusahaan || selectedFeature.data.group_comp || 'Mandiri'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#F7F6BB]/75">Kategori Afiliasi:</span>
                        <span className="font-medium text-[#F7F6BB] text-right">
                          {selectedFeature.data.kategori_grup || 'HTI'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#F7F6BB]/75">Jenis Perizinan:</span>
                        <span className="font-medium text-[#F7F6BB] text-right">
                          {selectedFeature.data.jenis_izin || selectedFeature.data.type || 'HT'}
                        </span>
                      </div>
                      {selectedFeature.data.area_ha != null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[#F7F6BB]/75">Luas Area Konsesi:</span>
                          <span className="font-mono font-semibold text-[#FCDC2A] text-right">
                            {Number(selectedFeature.data.area_ha).toLocaleString('id-ID')} Ha
                          </span>
                        </div>
                      )}
                      {selectedFeature.data.keliling_km != null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[#F7F6BB]/75">Keliling Poligon:</span>
                          <span className="font-mono text-[#F7F6BB] text-right">
                            {Number(selectedFeature.data.keliling_km).toLocaleString('id-ID')} km
                          </span>
                        </div>
                      )}
                      {(selectedFeature.data.source || selectedFeature.data.last_updat) && (
                        <div className="flex flex-col gap-0.5 pt-1 border-t border-[#87A922]/40 text-[10px]">
                          <span className="text-[#F7F6BB]/75">Sumber & Pembaruan:</span>
                          <span className="text-[#F7F6BB]">
                            {[selectedFeature.data.source, selectedFeature.data.last_updat ? `Update ${selectedFeature.data.last_updat}` : ''].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="rounded-xl border border-[#87A922]/60 bg-[#87A922]/15 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#FCDC2A]">Tipe geometri</span>
                    <span className="rounded-md bg-[#FCDC2A]/20 border border-[#FCDC2A]/50 px-2 py-0.5 font-mono text-[10px] text-[#FCDC2A]">{selectedFeature.data.geometryType || 'Vector'}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[10px] text-[#F7F6BB]/75">
                    <div>Longitude <div className="mt-0.5 text-xs text-[#F7F6BB]">{selectedFeature.coordinates[0].toFixed(6)}°</div></div>
                    <div>Latitude <div className="mt-0.5 text-xs text-[#F7F6BB]">{selectedFeature.coordinates[1].toFixed(6)}°</div></div>
                  </div>
                  <div className="mt-2 text-[10px] text-[#F7F6BB]">Sumber: {selectedFeature.data.provider || selectedFeature.data.source || 'Fitur vektor'}</div>
                  {selectedFeature.data.attribution && <div className="mt-1 text-[10px] leading-relaxed text-[#F7F6BB]/75">{selectedFeature.data.attribution}</div>}
                  {selectedFeature.data.sourceUrl && <a href={selectedFeature.data.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#FCDC2A] hover:underline">Buka sumber <ExternalLink className="w-3 h-3" /></a>}
                </div>
                <div className="overflow-hidden rounded-xl border border-[#87A922]/55">
                  <div className="border-b border-[#87A922]/50 bg-[#87A922]/25 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#FCDC2A]">Atribut Fitur</div>
                  <div className="divide-y divide-[#87A922]/30 bg-[#114232]/65">
                    {Object.entries(selectedFeature.data)
                      .filter(([key]) => !['_map_label', 'geometryType', 'source', 'clickedAt', 'provider', 'attribution', 'sourceUrl', 'layer', 'edition', 'dataType'].includes(key))
                      .slice(0, 60)
                      .map(([key, value]) => (
                        <div key={key} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3 px-3 py-2 text-[11px]">
                          <span className="break-words text-[#F7F6BB]/75">{key}</span>
                          <span className="break-words text-right text-[#F7F6BB]">{value === null || value === undefined || value === '' ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                        </div>
                      ))}
                    {Object.keys(selectedFeature.data).filter((key) => !['_map_label', 'geometryType', 'source', 'clickedAt', 'provider', 'attribution', 'sourceUrl', 'layer', 'edition', 'dataType'].includes(key)).length === 0 && (
                      <div className="px-3 py-4 text-center text-[11px] text-[#F7F6BB]/65">Tidak ada atribut yang disediakan sumber.</div>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-[#F7F6BB]/65">Atribut ditampilkan sesuai nilai sumber. Periksa metadata dan tahun data sebelum digunakan sebagai dasar analisis formal.</p>
              </div>
            )}

            {/* Province Specific Body */}
            {selectedFeature.type === 'province' && (
              <div className="space-y-3 pt-3">
                <div className="bg-[#87A922]/15 p-3 rounded-xl border border-[#87A922]/60 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#F7F6BB]/75">Ibu Kota:</span>
                    <span className="font-medium text-[#F7F6BB]">{selectedFeature.data.capital}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#F7F6BB]/75">Gugusan Pulau:</span>
                    <span className="font-medium text-[#F7F6BB]">{selectedFeature.data.island}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#F7F6BB]/75">Luas Daratan:</span>
                    <span className="font-mono font-medium text-[#FCDC2A]">
                      {selectedFeature.data.areaKm2?.toLocaleString('id-ID')} km²
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#F7F6BB]/75">Jumlah Penduduk:</span>
                    <span className="font-mono font-medium text-[#F7F6BB]">{selectedFeature.data.population}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary Tab */}
        {currentTab === 'summary' && (
          <div className="space-y-3.5">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#FCDC2A] font-semibold tracking-wider">
                Dasbor Geospasial Nusantara
              </span>
              <h3 className="text-sm font-bold text-[#F7F6BB] mt-0.5">
                Ringkasan Layer & Situasi Indonesia
              </h3>
            </div>

            {/* Metric Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 bg-[#87A922]/15 rounded-xl border border-[#87A922]/60">
                <div className="text-[10px] text-[#F7F6BB]/80 font-semibold uppercase flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-[#FCDC2A]" />
                  Gempa Terkini
                </div>
                <div className="font-mono font-bold text-lg text-[#F7F6BB] mt-1">
                  {quakesCount == null ? '—' : quakesCount}{' '}
                  <span className="text-xs font-normal text-[#F7F6BB]/70">kejadian</span>
                </div>
                {latestQuakeMag && (
                  <div className="text-[10px] text-[#FCDC2A] font-mono mt-0.5">
                    Terbaru: M {latestQuakeMag.toFixed(1)}
                  </div>
                )}
              </div>

              <div className="p-3 bg-[#87A922]/15 rounded-xl border border-[#87A922]/60">
                <div className="text-[10px] text-[#F7F6BB]/80 font-semibold uppercase flex items-center gap-1.5">
                  <Flame className="w-3 h-3 text-[#FCDC2A]" />
                  Hotspot VIIRS
                </div>
                <div className="font-mono font-bold text-lg text-[#FCDC2A] mt-1">
                  {hotspotsCount == null ? '—' : hotspotsCount.toLocaleString('id-ID')}{' '}
                  <span className="text-xs font-normal text-[#F7F6BB]/70">titik</span>
                </div>
                {hotspotSensors && (
                  <div className="text-[10px] text-[#F7F6BB]/75 font-mono mt-0.5">
                    N20: {hotspotSensors.noaa20} · N21: {hotspotSensors.noaa21} · SNPP: {hotspotSensors.snpp}
                  </div>
                )}
              </div>

              <div className="p-3 bg-gradient-to-br from-[#87A922]/25 to-[#114232] rounded-xl border border-[#FCDC2A]/60 col-span-2">
                <div className="text-[10px] text-[#FCDC2A] font-semibold uppercase flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-[#FCDC2A]" />
                  Layer Tematik Terhubung API
                </div>
                <div className="font-mono font-bold text-lg text-[#F7F6BB] mt-1">
                  {activeLayersCount}{' '}
                  <span className="text-xs font-normal text-[#F7F6BB]/80">layer aktif di peta</span>
                </div>
                <div className="text-[10px] text-[#F7F6BB]/80 mt-0.5 leading-relaxed">
                  38 Provinsi · Angin GFS · AQMS ISPU · Cuaca BMKG · Gambut · Mangrove · Serat Kayu HTI · Sawit · Gempa & Hotspot
                </div>
              </div>
            </div>

            {/* NASA FIRMS 3 Sensors Details & Export */}
            <div className="p-3 bg-[#87A922]/15 rounded-xl border border-[#87A922]/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-[#F7F6BB] flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-[#FCDC2A]" />
                  Deteksi Satelit VIIRS (24 Jam)
                </div>
                <span className="text-[10px] font-mono text-[#FCDC2A] bg-[#114232] border border-[#87A922] px-1.5 py-0.5 rounded">
                  VIIRS NRT
                </span>
              </div>

              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between items-center py-0.5 border-b border-[#87A922]/35">
                  <span className="text-[#F7F6BB]/75">VIIRS NOAA-20 (NRT)</span>
                  <span className="text-[#FCDC2A] font-semibold">{hotspotSensors ? `${hotspotSensors.noaa20} titik` : '—'}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-[#87A922]/35">
                  <span className="text-[#F7F6BB]/75">VIIRS NOAA-21 (NRT)</span>
                  <span className="text-[#FCDC2A] font-semibold">{hotspotSensors ? `${hotspotSensors.noaa21} titik` : '—'}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-[#F7F6BB]/75">VIIRS Suomi-NPP (NRT)</span>
                  <span className="text-[#F7F6BB] font-semibold">{hotspotSensors ? `${hotspotSensors.snpp} titik` : '—'}</span>
                </div>
              </div>

              <div className="pt-1.5 flex items-center gap-2">
                <a
                  href="/api/firms/export?format=csv"
                  download="indonesia_hotspots_viirs.csv"
                  className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-[#87A922]/30 hover:bg-[#87A922]/50 border border-[#87A922]/70 text-[#F7F6BB] rounded-lg text-[11px] font-medium transition-colors"
                  title="Unduh seluruh data hotspot Indonesia dalam format CSV"
                >
                  <Download className="w-3 h-3 text-[#FCDC2A]" />
                  Ekspor CSV
                </a>
                <a
                  href="/api/firms/export?format=geojson"
                  download="indonesia_hotspots_viirs.geojson"
                  className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-[#FCDC2A] hover:bg-[#F7F6BB] text-[#114232] rounded-lg text-[11px] font-bold transition-colors"
                  title="Unduh seluruh data hotspot Indonesia dalam format GeoJSON"
                >
                  <Download className="w-3 h-3 text-[#114232]" />
                  Ekspor GeoJSON
                </a>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-3 bg-[#87A922]/10 rounded-xl border border-[#87A922]/45 text-[11px] space-y-2 text-[#F7F6BB]">
              <div className="font-semibold text-[#FCDC2A]">Panduan Eksplorasi Peta:</div>
              <ul className="space-y-1 list-disc list-inside text-[#F7F6BB]/80">
                <li>Klik poligon Serat Kayu HTI, Mangrove, Gambut, Sawit, atau Provinsi untuk melihat detail.</li>
                <li>Klik titik stasiun AQMS / kota BMKG untuk melihat ISPU dan prakiraan cuaca.</li>
                <li>Klik episenter gempa atau titik hotspot untuk rincian kedalaman & FRP.</li>
                <li>Gunakan panel kiri untuk menyaring layer aktif atau mengatur opasitas.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
