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
    <aside className="fixed inset-x-2 bottom-2 top-auto max-h-[68dvh] sm:inset-x-auto sm:top-16 sm:right-3 sm:bottom-auto sm:w-84 md:w-92 lg:w-96 sm:max-h-[calc(100dvh-4.75rem)] z-30 bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--accent-aqua-border)] rounded-2xl flex flex-col text-[var(--text-primary)] shadow-2xl shadow-black/45 overflow-hidden animate-in fade-in duration-200">
      {/* Mobile Sheet Handle */}
      <div className="sm:hidden flex justify-center pt-2 pb-0.5 bg-[var(--bg-surface)]/80">
        <div className="w-10 h-1 rounded-full bg-[var(--accent-aqua-border)]" />
      </div>

      {/* Tab Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--accent-aqua-border)] bg-gradient-to-r from-[var(--accent-aqua-soft)] via-[var(--bg-surface)] to-[var(--bg-surface)]">
        <div className="flex items-center gap-1.5">
          {selectedFeature && (
            <button
              onClick={() => setActiveTab('inspect')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                currentTab === 'inspect'
                  ? 'bg-[var(--accent-aqua)] text-[#050d0f] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-aqua-soft)]'
              }`}
            >
              Inspeksi Objek
            </button>
          )}
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              currentTab === 'summary'
                ? 'bg-[var(--accent-emerald)] text-[#050d0f] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-aqua-soft)]'
            }`}
          >
            Ringkasan Situasi
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-aqua-soft)] transition-colors cursor-pointer"
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
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--accent-aqua-border)]">
              <div>
                <span className="text-[10px] font-mono uppercase text-[var(--accent-aqua)] font-semibold tracking-wider">
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
                <h3 className="text-sm font-bold text-[var(--text-primary)] mt-0.5 leading-snug">
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
                className="p-1.5 bg-[var(--accent-aqua-soft)] hover:bg-[var(--bg-surface-hover)] border border-[var(--accent-aqua-border)] text-[var(--accent-aqua)] rounded-lg transition-colors shrink-0 cursor-pointer"
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
                    <div className="font-semibold text-[var(--text-primary)]">
                      Kedalaman: {selectedFeature.data.depth}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] font-mono">
                      {selectedFeature.data.date} · {selectedFeature.data.time} WIB
                    </div>
                  </div>
                </div>

                {/* Potential & Alert */}
                {selectedFeature.data.potential && (
                  <div className="p-2.5 rounded-md bg-[var(--bg-surface-elevated)] border border-[var(--accent-aqua-border)] flex items-start gap-2">
                    <ShieldAlert
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        selectedFeature.data.potential.toLowerCase().includes('tsunami')
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}
                    />
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">Status Peringatan:</div>
                      <div className="text-[var(--text-secondary)] leading-tight mt-0.5">
                        {selectedFeature.data.potential}
                      </div>
                    </div>
                  </div>
                )}

                {/* Felt Reports */}
                {selectedFeature.data.felt && (
                  <div className="p-2.5 rounded-md bg-[var(--bg-surface-elevated)] border border-[var(--accent-aqua-border)]">
                    <div className="font-semibold text-[var(--text-secondary)] text-[11px] mb-0.5">
                      Wilayah Dirasakan:
                    </div>
                    <div className="text-[var(--text-secondary)] leading-snug">{selectedFeature.data.felt}</div>
                  </div>
                )}

                {/* Shakemap Image */}
                {selectedFeature.data.shakemap && (
                  <div className="space-y-1">
                    <div className="font-semibold text-[var(--text-secondary)] text-[11px]">
                      Peta Guncangan (BMKG Shakemap):
                    </div>
                    <a
                      href={selectedFeature.data.shakemap}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-md border border-[var(--accent-aqua-border)] hover:border-sky-500 transition-colors"
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
                <div className="text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--accent-aqua-border)] flex justify-between items-center">
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
                      <div className="text-[11px] text-[var(--text-secondary)] mt-1">{selectedFeature.data.areaDescription || selectedFeature.data.feedDescription || 'Wilayah terdampak mengikuti area dalam dokumen CAP.'}</div>
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
                        <div key={label} className="p-2 bg-[var(--bg-surface-elevated)] rounded border border-[var(--accent-aqua-border)]">
                          <div className="text-[9px] uppercase text-[var(--text-muted)]">{label}</div>
                          <div className="text-[var(--text-primary)] mt-0.5">{value || 'Tidak tersedia pada CAP'}</div>
                        </div>
                      ))}
                    </div>
                    {selectedFeature.data.description && <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">{selectedFeature.data.description}</p>}
                    {selectedFeature.data.instruction && <p className="text-[11px] leading-relaxed text-amber-200">Instruksi: {selectedFeature.data.instruction}</p>}
                    <div className="text-[10px] text-[var(--text-muted)]">{selectedFeature.data.attribution || 'Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)'}. Periksa pembaruan peringatan di kanal resmi BMKG.</div>
                  </div>
                ) : selectedFeature.data?.dataType === 'aqms' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--accent-aqua-border)]">
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
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {selectedFeature.data.kota}{selectedFeature.data.provinsi ? `, ${selectedFeature.data.provinsi}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="bg-[var(--bg-surface-elevated)] p-3 rounded-md border border-[var(--accent-aqua-border)] space-y-2 text-[11px]">
                      {selectedFeature.data.alamat && (
                        <div>
                          <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Lokasi Stasiun AQMS</div>
                          <div className="text-[var(--text-primary)] mt-0.5 leading-snug">{selectedFeature.data.alamat}</div>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-[var(--accent-aqua-border)]">
                        <span className="text-[var(--text-muted)]">Waktu Observasi:</span>
                        <span className="font-mono text-[var(--text-primary)]">{selectedFeature.data.waktu || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Sumber Data:</span>
                        <span className="text-[var(--accent-aqua)]">KLHK / Sipongi AQMS</span>
                      </div>
                    </div>
                  </div>
                ) : selectedFeature.data?.dataType === 'bmkg-forecast' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--accent-aqua-border)]">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-[var(--accent-aqua)] font-semibold">
                          Prakiraan Resmi BMKG
                        </div>
                        <div className="text-sm font-bold text-white mt-0.5">
                          {selectedFeature.data.weather_desc || 'Cuaca'}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
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
                      <div className="p-2.5 bg-[var(--bg-surface-elevated)] rounded-md border border-[var(--accent-aqua-border)] flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-rose-400" />
                        <div>
                          <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Suhu Udara</div>
                          <div className="font-mono font-bold text-sm text-[var(--text-primary)]">{selectedFeature.data.t ?? '—'}°C</div>
                        </div>
                      </div>
                      <div className="p-2.5 bg-[var(--bg-surface-elevated)] rounded-md border border-[var(--accent-aqua-border)] flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-400" />
                        <div>
                          <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Kelembapan</div>
                          <div className="font-mono font-bold text-sm text-[var(--text-primary)]">{selectedFeature.data.hu ?? '—'}%</div>
                        </div>
                      </div>
                      <div className="p-2.5 bg-[var(--bg-surface-elevated)] rounded-md border border-[var(--accent-aqua-border)] flex items-center gap-2">
                        <Wind className="w-4 h-4 text-emerald-400" />
                        <div>
                          <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Angin</div>
                          <div className="font-mono font-bold text-sm text-[var(--text-primary)]">
                            {selectedFeature.data.ws ?? '—'} km/j {selectedFeature.data.wd || ''}
                          </div>
                        </div>
                      </div>
                      <div className="p-2.5 bg-[var(--bg-surface-elevated)] rounded-md border border-[var(--accent-aqua-border)] flex items-center gap-2">
                        <CloudRain className="w-4 h-4 text-[var(--accent-aqua)]" />
                        <div>
                          <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Tutupan Awan</div>
                          <div className="font-mono font-bold text-sm text-[var(--text-primary)]">{selectedFeature.data.tcc ?? '—'}%</div>
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
                        <div className="p-2.5 bg-[var(--bg-surface-elevated)] rounded-md border border-[var(--accent-aqua-border)] space-y-1.5">
                          <div className="font-semibold text-[var(--text-secondary)] text-[11px]">Prakiraan 3-Jam Mendatang:</div>
                          {slots.slice(0, 6).map((slot: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-[11px] text-[var(--text-secondary)] border-t border-[var(--accent-aqua-border)] pt-1">
                              <span className="font-mono text-[10px] text-[var(--text-muted)]">{slot.local_datetime || '—'}</span>
                              <span>{slot.weather_desc} · {slot.t}°C</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    <div className="text-[10px] text-[var(--text-muted)]">
                      Kode ADM4: {selectedFeature.data.adm4 || '—'} · Sumber: BMKG (data.bmkg.go.id)
                    </div>
                  </div>
                ) : (
                  <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-[var(--bg-surface-elevated)] rounded-md border border-[var(--accent-aqua-border)] flex items-center gap-2.5">
                    <Thermometer className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">Suhu Model</div>
                      <div className="font-mono font-bold text-sm text-[var(--text-primary)]">
                        {selectedFeature.data.current?.temperature_2m != null ? `${selectedFeature.data.current.temperature_2m}°C` : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[var(--bg-surface-elevated)] rounded-md border border-[var(--accent-aqua-border)] flex items-center gap-2.5">
                    <CloudRain className="w-4 h-4 text-[var(--accent-aqua)]" />
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">Presipitasi Model</div>
                      <div className="font-mono font-bold text-sm text-[var(--text-primary)]">
                        {selectedFeature.data.current?.precipitation != null ? `${selectedFeature.data.current.precipitation} mm` : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[var(--bg-surface-elevated)] rounded-md border border-[var(--accent-aqua-border)] flex items-center gap-2.5">
                    <Wind className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">Angin Model</div>
                      <div className="font-mono font-bold text-sm text-[var(--text-primary)]">
                        {selectedFeature.data.current?.wind_speed_10m != null ? `${selectedFeature.data.current.wind_speed_10m} km/j` : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[var(--bg-surface-elevated)] rounded-md border border-[var(--accent-aqua-border)] flex items-center gap-2.5">
                    <Activity className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">Kelembapan Model</div>
                      <div className="font-mono font-bold text-sm text-[var(--text-primary)]">
                        {selectedFeature.data.current?.relative_humidity_2m != null ? `${selectedFeature.data.current.relative_humidity_2m}%` : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3-day forecast summary */}
                {selectedFeature.data.daily && (
                  <div className="p-2.5 bg-[var(--bg-surface-elevated)] rounded-md border border-[var(--accent-aqua-border)] space-y-1.5">
                    <div className="font-semibold text-[var(--text-secondary)] text-[11px]">
                      Prakiraan 3 Hari Mendatang:
                    </div>
                    {selectedFeature.data.daily.time.slice(0, 3).map((dateStr: string, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] text-[var(--text-secondary)] font-mono">
                        <span>{new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        <span>
                          {selectedFeature.data.daily.temperature_2m_min[idx]}° - {selectedFeature.data.daily.temperature_2m_max[idx]}°C
                        </span>
                        <span className="text-[var(--accent-aqua)]">
                          {selectedFeature.data.daily.precipitation_sum[idx]} mm
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-[var(--text-muted)]">{selectedFeature.data.metadata?.attribution || 'Prakiraan model Open-Meteo; bukan pengamatan stasiun atau radar real-time.'}</div>
                  </>
                )}
              </div>
            )}

            {/* ArcGIS feature attributes from BIG / GFW Identify service */}
            {selectedFeature.type === 'arcgis' && (
              <div className="space-y-3 pt-3">
                <div className="rounded-lg border border-[var(--accent-aqua-border)] bg-[var(--bg-surface-elevated)] p-3 space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wide font-semibold text-[var(--accent-aqua)]">Informasi sumber data</div>
                  <div className="text-[11px] text-[var(--text-primary)]">{selectedFeature.data.provider || 'ArcGIS REST service'}</div>
                  <div className="text-[10px] text-[var(--text-muted)] leading-relaxed">{selectedFeature.data.attribution || 'Atribusi mengikuti metadata penyedia data.'}</div>
                  {selectedFeature.data.license && (
                    <div className="pt-1 text-[10px] text-[var(--text-muted)]">Ketentuan: {selectedFeature.data.license}</div>
                  )}
                  {selectedFeature.data.sourceNote && <div className="pt-1 text-[10px] text-amber-200/80">Catatan sumber: {selectedFeature.data.sourceNote}</div>}
                  {(selectedFeature.data.selectedSource || selectedFeature.data.sourceUrl) && (
                    <a href={selectedFeature.data.selectedSource || selectedFeature.data.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 pt-1 text-[10px] text-[var(--accent-aqua)] hover:text-sky-200">
                      Buka sumber asli <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {(selectedFeature.data.results || []).map((result: any, resultIndex: number) => (
                  <div key={`${result.layerId}-${resultIndex}`} className="overflow-hidden rounded-lg border border-[var(--accent-aqua-border)]">
                    <div className="flex items-center justify-between gap-2 border-b border-[var(--accent-aqua-border)] bg-[var(--bg-surface-elevated)] px-3 py-2">
                      <div className="font-semibold text-[11px] text-[var(--text-primary)]">{result.serviceName || result.layerName || 'Layer ArcGIS'}</div>
                      <span className="shrink-0 rounded bg-slate-700 px-1.5 py-0.5 font-mono text-[9px] text-[var(--text-secondary)]">Layer {result.layerId}</span>
                    </div>
                    {result.value && <div className="border-b border-[var(--accent-aqua-border)] bg-[var(--bg-surface-elevated)] px-3 py-2 text-[11px] text-sky-200">{result.value}</div>}
                    <div className="divide-y divide-[var(--accent-aqua-border)]">
                      {(result.attributes || []).map((attribute: any, attributeIndex: number) => (
                        <div key={`${attribute.field}-${attributeIndex}`} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3 px-3 py-2 text-[11px]">
                          <span className="break-words text-[var(--text-muted)]" title={attribute.field}>{attribute.alias || attribute.field}</span>
                          <span className="break-words text-right text-[var(--text-primary)]">{attribute.displayValue ?? '—'}</span>
                        </div>
                      ))}
                      {(!result.attributes || result.attributes.length === 0) && (
                        <div className="px-3 py-3 text-center text-[10px] text-[var(--text-muted)]">Fitur ditemukan, tetapi service tidak mengembalikan atribut pada permintaan ini.</div>
                      )}
                    </div>
                    <div className="border-t border-[var(--accent-aqua-border)] px-3 py-1.5 text-[9px] text-[var(--text-muted)]">
                      {result.geometryType || 'Geometri tidak dikembalikan'} · {result.layerAttribution || selectedFeature.data.attribution || 'ArcGIS REST'}
                    </div>
                  </div>
                ))}
                {(!selectedFeature.data.results || selectedFeature.data.results.length === 0) && (
                  <div className="rounded-lg border border-[var(--accent-aqua-border)] p-3 text-center text-[11px] text-[var(--text-muted)]">Tidak ditemukan fitur pada titik klik. Coba klik bagian dalam objek atau perbesar skala peta.</div>
                )}
                <div className="text-[9px] text-[var(--text-muted)]">Nilai dan nama field berasal dari service sumber. Nama tampilan mengikuti alias field ArcGIS jika tersedia; nilai asli tetap dipertahankan oleh API.</div>
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

                <div className="bg-[var(--bg-surface-elevated)] p-2.5 rounded-md border border-[var(--accent-aqua-border)] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Sensor Satelit:</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">{selectedFeature.data.sensor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Waktu Akuisisi:</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">
                      {selectedFeature.data.date} {selectedFeature.data.time} UTC
                    </span>
                  </div>
                  {selectedFeature.data.bright_ti4 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Suhu Kecerahan:</span>
                      <span className="font-mono font-medium text-amber-300">
                        {selectedFeature.data.bright_ti4} K ({Math.round(selectedFeature.data.bright_ti4 - 273.15)}°C)
                      </span>
                    </div>
                  )}
                  {selectedFeature.data.daynight && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Waktu Deteksi:</span>
                      <span className="font-mono font-medium text-[var(--text-primary)]">{selectedFeature.data.daynight}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Sumber:</span>
                    <span className="font-mono text-[var(--text-muted)]">{selectedFeature.data.source || 'NASA FIRMS'}</span>
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
                        <span className="text-[var(--text-muted)]">Grup Perusahaan:</span>
                        <span className="font-medium text-[var(--text-primary)] text-right">{selectedFeature.data.group_comp || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[var(--text-muted)]">Status Legalitas:</span>
                        <span className="font-medium text-emerald-300 text-right">
                          {selectedFeature.data.type || selectedFeature.data.po_legalst || '—'}
                        </span>
                      </div>
                      {selectedFeature.data.po_hgu && selectedFeature.data.po_hgu !== ' ' && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[var(--text-muted)]">Nomor SK HGU:</span>
                          <span className="font-mono text-[var(--text-primary)] text-right">{selectedFeature.data.po_hgu}</span>
                        </div>
                      )}
                      {selectedFeature.data.area_ha != null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[var(--text-muted)]">Luas Area Konsesi:</span>
                          <span className="font-mono font-semibold text-[var(--text-primary)] text-right">
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
                        <span className="text-[var(--text-muted)]">Klasifikasi Gambut:</span>
                        <span className="font-medium text-amber-300 text-right">
                          {selectedFeature.data.jenis_gambut || selectedFeature.data.layer_revi || 'Lahan Gambut'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[var(--text-muted)]">ID Objek Gambut:</span>
                        <span className="font-mono text-[var(--text-primary)] text-right">
                          {selectedFeature.data.objectid || selectedFeature.data.objectid_1 || '—'}
                        </span>
                      </div>
                      {selectedFeature.data.area_ha != null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[var(--text-muted)]">Luas Area Gambut:</span>
                          <span className="font-mono font-semibold text-[var(--text-primary)] text-right">
                            {Number(selectedFeature.data.area_ha).toLocaleString('id-ID')} Ha
                          </span>
                        </div>
                      )}
                      {selectedFeature.data.keliling_km != null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[var(--text-muted)]">Keliling Poligon:</span>
                          <span className="font-mono text-[var(--text-primary)] text-right">
                            {Number(selectedFeature.data.keliling_km).toLocaleString('id-ID')} km
                          </span>
                        </div>
                      )}
                      {selectedFeature.data.globalid && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[var(--text-muted)]">Global ID:</span>
                          <span className="font-mono text-[10px] text-[var(--text-secondary)] text-right break-all">
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
                        <span className="text-[var(--text-muted)]">Kerapatan Tajuk:</span>
                        <span className="font-medium text-teal-300 text-right">
                          {selectedFeature.data.kttj || selectedFeature.data.kerapatan || 'Mangrove'}
                        </span>
                      </div>
                      {(selectedFeature.data.prov || selectedFeature.data.kab) && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[var(--text-muted)]">Wilayah:</span>
                          <span className="font-medium text-[var(--text-primary)] text-right">
                            {[selectedFeature.data.kab, selectedFeature.data.prov].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                      {(selectedFeature.data.lsmgr ?? selectedFeature.data.area_ha) != null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[var(--text-muted)]">Luas Habitat Mangrove:</span>
                          <span className="font-mono font-semibold text-teal-200 text-right">
                            {Number(selectedFeature.data.lsmgr ?? selectedFeature.data.area_ha).toLocaleString('id-ID')} Ha
                          </span>
                        </div>
                      )}
                      {selectedFeature.data.fgsfrf && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[var(--text-muted)]">Fungsi Kawasan:</span>
                          <span className="font-medium text-[var(--text-primary)] text-right">{selectedFeature.data.fgsfrf}</span>
                        </div>
                      )}
                      {selectedFeature.data.bpdashl && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[var(--text-muted)]">Wilayah BPDASHL:</span>
                          <span className="font-medium text-[var(--text-primary)] text-right">{selectedFeature.data.bpdashl}</span>
                        </div>
                      )}
                      {selectedFeature.data.spesies_utama && (
                        <div className="flex flex-col gap-0.5 pt-1 border-t border-teal-900/50">
                          <span className="text-[var(--text-muted)]">Spesies Mangrove Dominan:</span>
                          <span className="italic text-teal-200">{selectedFeature.data.spesies_utama}</span>
                        </div>
                      )}
                      {selectedFeature.data.cadangan_karbon_ton_ha != null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[var(--text-muted)]">Estimasi Karbon Biru:</span>
                          <span className="font-mono font-semibold text-emerald-300 text-right">
                            {Number(selectedFeature.data.cadangan_karbon_ton_ha).toLocaleString('id-ID')} ton C/Ha
                          </span>
                        </div>
                      )}
                      {(selectedFeature.data.smbdt || selectedFeature.data.thnbuat) && (
                        <div className="flex flex-col gap-0.5 pt-1 border-t border-teal-900/50 text-[10px]">
                          <span className="text-[var(--text-muted)]">Sumber & Tahun Data:</span>
                          <span className="text-[var(--text-secondary)]">
                            {[selectedFeature.data.smbdt, selectedFeature.data.thnbuat ? `Tahun ${selectedFeature.data.thnbuat}` : ''].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {selectedFeature.data?.dataType === 'wood-fiber-concession' && (
                  <div className="rounded-xl border border-[var(--accent-aqua-border)] bg-[var(--accent-aqua-soft)] p-3 space-y-2 text-[11px]">
                    <div className="text-[10px] uppercase tracking-wide font-semibold text-[var(--accent-aqua)]">
                      Konsesi Serat Kayu / HTI Indonesia
                    </div>
                    <div className="font-bold text-sm text-[var(--text-primary)]">
                      {selectedFeature.data.name || 'Konsesi HTI'}
                    </div>
                    <div className="space-y-1.5 pt-1 border-t border-[var(--accent-aqua-border)]">
                      <div className="flex justify-between gap-2">
                        <span className="text-[var(--text-secondary)]">Grup Korporasi:</span>
                        <span className="font-medium text-[var(--accent-aqua)] text-right">
                          {selectedFeature.data.grup_perusahaan || selectedFeature.data.group_comp || 'Mandiri'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[var(--text-secondary)]">Kategori Afiliasi:</span>
                        <span className="font-medium text-[var(--text-primary)] text-right">
                          {selectedFeature.data.kategori_grup || 'HTI'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[var(--text-secondary)]">Jenis Perizinan:</span>
                        <span className="font-medium text-[var(--text-primary)] text-right">
                          {selectedFeature.data.jenis_izin || selectedFeature.data.type || 'HT'}
                        </span>
                      </div>
                      {selectedFeature.data.area_ha != null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[var(--text-secondary)]">Luas Area Konsesi:</span>
                          <span className="font-mono font-semibold text-[var(--accent-emerald-bright)] text-right">
                            {Number(selectedFeature.data.area_ha).toLocaleString('id-ID')} Ha
                          </span>
                        </div>
                      )}
                      {selectedFeature.data.keliling_km != null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[var(--text-secondary)]">Keliling Poligon:</span>
                          <span className="font-mono text-[var(--text-primary)] text-right">
                            {Number(selectedFeature.data.keliling_km).toLocaleString('id-ID')} km
                          </span>
                        </div>
                      )}
                      {(selectedFeature.data.source || selectedFeature.data.last_updat) && (
                        <div className="flex flex-col gap-0.5 pt-1 border-t border-[var(--accent-aqua-border)] text-[10px]">
                          <span className="text-[var(--text-secondary)]">Sumber & Pembaruan:</span>
                          <span className="text-[var(--text-primary)]">
                            {[selectedFeature.data.source, selectedFeature.data.last_updat ? `Update ${selectedFeature.data.last_updat}` : ''].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="rounded-xl border border-[var(--accent-aqua-border)] bg-[var(--bg-surface-elevated)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-aqua)]">Tipe geometri</span>
                    <span className="rounded-md bg-[var(--accent-aqua-soft)] border border-[var(--accent-aqua-border)] px-2 py-0.5 font-mono text-[10px] text-[var(--accent-aqua)]">{selectedFeature.data.geometryType || 'Vector'}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[10px] text-[var(--text-secondary)]">
                    <div>Longitude <div className="mt-0.5 text-xs text-[var(--text-primary)]">{selectedFeature.coordinates[0].toFixed(6)}°</div></div>
                    <div>Latitude <div className="mt-0.5 text-xs text-[var(--text-primary)]">{selectedFeature.coordinates[1].toFixed(6)}°</div></div>
                  </div>
                  <div className="mt-2 text-[10px] text-[var(--text-primary)]">Sumber: {selectedFeature.data.provider || selectedFeature.data.source || 'Fitur vektor'}</div>
                  {selectedFeature.data.attribution && <div className="mt-1 text-[10px] leading-relaxed text-[var(--text-secondary)]">{selectedFeature.data.attribution}</div>}
                  {selectedFeature.data.sourceUrl && <a href={selectedFeature.data.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--accent-aqua)] hover:underline">Buka sumber <ExternalLink className="w-3 h-3" /></a>}
                </div>
                <div className="overflow-hidden rounded-xl border border-[var(--accent-aqua-border)]">
                  <div className="border-b border-[var(--accent-aqua-border)] bg-[var(--bg-surface-elevated)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-aqua)]">Atribut Fitur</div>
                  <div className="divide-y divide-[var(--accent-aqua-border)] bg-[var(--bg-obsidian)]/40">
                    {Object.entries(selectedFeature.data)
                      .filter(([key]) => !['_map_label', 'geometryType', 'source', 'clickedAt', 'provider', 'attribution', 'sourceUrl', 'layer', 'edition', 'dataType'].includes(key))
                      .slice(0, 60)
                      .map(([key, value]) => (
                        <div key={key} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3 px-3 py-2 text-[11px]">
                          <span className="break-words text-[var(--text-secondary)]">{key}</span>
                          <span className="break-words text-right text-[var(--text-primary)]">{value === null || value === undefined || value === '' ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                        </div>
                      ))}
                    {Object.keys(selectedFeature.data).filter((key) => !['_map_label', 'geometryType', 'source', 'clickedAt', 'provider', 'attribution', 'sourceUrl', 'layer', 'edition', 'dataType'].includes(key)).length === 0 && (
                      <div className="px-3 py-4 text-center text-[11px] text-[var(--text-muted)]">Tidak ada atribut yang disediakan sumber.</div>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">Atribut ditampilkan sesuai nilai sumber. Periksa metadata dan tahun data sebelum digunakan sebagai dasar analisis formal.</p>
              </div>
            )}

            {/* Province Specific Body */}
            {selectedFeature.type === 'province' && (
              <div className="space-y-3 pt-3">
                <div className="bg-[var(--bg-surface-elevated)] p-3 rounded-xl border border-[var(--accent-aqua-border)] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Ibu Kota:</span>
                    <span className="font-medium text-[var(--text-primary)]">{selectedFeature.data.capital}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Gugusan Pulau:</span>
                    <span className="font-medium text-[var(--text-primary)]">{selectedFeature.data.island}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Luas Daratan:</span>
                    <span className="font-mono font-medium text-[var(--accent-aqua)]">
                      {selectedFeature.data.areaKm2?.toLocaleString('id-ID')} km²
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Jumlah Penduduk:</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">{selectedFeature.data.population}</span>
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
              <span className="text-[10px] font-mono uppercase text-[var(--accent-aqua)] font-semibold tracking-wider">
                Dasbor Geospasial Nusantara
              </span>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                Ringkasan Layer & Situasi Indonesia
              </h3>
            </div>

            {/* Metric Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 bg-[var(--bg-surface-elevated)] rounded-xl border border-[var(--accent-aqua-border)]">
                <div className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-[var(--accent-aqua)]" />
                  Gempa Terkini
                </div>
                <div className="font-mono font-bold text-lg text-[var(--text-primary)] mt-1">
                  {quakesCount == null ? '—' : quakesCount}{' '}
                  <span className="text-xs font-normal text-[var(--text-secondary)]">kejadian</span>
                </div>
                {latestQuakeMag && (
                  <div className="text-[10px] text-[var(--accent-aqua)] font-mono mt-0.5">
                    Terbaru: M {latestQuakeMag.toFixed(1)}
                  </div>
                )}
              </div>

              <div className="p-3 bg-[var(--bg-surface-elevated)] rounded-xl border border-[var(--accent-aqua-border)]">
                <div className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase flex items-center gap-1.5">
                  <Flame className="w-3 h-3 text-amber-400" />
                  Hotspot VIIRS
                </div>
                <div className="font-mono font-bold text-lg text-[var(--accent-aqua)] mt-1">
                  {hotspotsCount == null ? '—' : hotspotsCount.toLocaleString('id-ID')}{' '}
                  <span className="text-xs font-normal text-[var(--text-secondary)]">titik</span>
                </div>
                {hotspotSensors && (
                  <div className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">
                    N20: {hotspotSensors.noaa20} · N21: {hotspotSensors.noaa21} · SNPP: {hotspotSensors.snpp}
                  </div>
                )}
              </div>

              <div className="p-3 bg-gradient-to-br from-[var(--accent-emerald-soft)] to-[var(--bg-surface-elevated)] rounded-xl border border-[var(--accent-emerald-border)] col-span-2">
                <div className="text-[10px] text-[var(--accent-emerald-bright)] font-semibold uppercase flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-[var(--accent-emerald-bright)]" />
                  Layer Tematik Terhubung API
                </div>
                <div className="font-mono font-bold text-lg text-[var(--text-primary)] mt-1">
                  {activeLayersCount}{' '}
                  <span className="text-xs font-normal text-[var(--text-secondary)]">layer aktif di peta</span>
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                  38 Provinsi · Angin GFS · AQMS ISPU · Cuaca BMKG · Gambut · Mangrove · Serat Kayu HTI · Sawit · Gempa & Hotspot
                </div>
              </div>
            </div>

            {/* NASA FIRMS 3 Sensors Details & Export */}
            <div className="p-3 bg-[var(--bg-surface-elevated)] rounded-xl border border-[var(--accent-aqua-border)] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Deteksi Satelit VIIRS (24 Jam)
                </div>
                <span className="text-[10px] font-mono text-[var(--accent-aqua)] bg-[var(--bg-obsidian)] border border-[var(--accent-aqua-border)] px-1.5 py-0.5 rounded">
                  VIIRS NRT
                </span>
              </div>

              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between items-center py-0.5 border-b border-[var(--accent-aqua-border)]">
                  <span className="text-[var(--text-secondary)]">VIIRS NOAA-20 (NRT)</span>
                  <span className="text-[var(--accent-aqua)] font-semibold">{hotspotSensors ? `${hotspotSensors.noaa20} titik` : '—'}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-[var(--accent-aqua-border)]">
                  <span className="text-[var(--text-secondary)]">VIIRS NOAA-21 (NRT)</span>
                  <span className="text-[var(--accent-aqua)] font-semibold">{hotspotSensors ? `${hotspotSensors.noaa21} titik` : '—'}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-[var(--text-secondary)]">VIIRS Suomi-NPP (NRT)</span>
                  <span className="text-[var(--text-primary)] font-semibold">{hotspotSensors ? `${hotspotSensors.snpp} titik` : '—'}</span>
                </div>
              </div>

              <div className="pt-1.5 flex items-center gap-2">
                <a
                  href="/api/firms/export?format=csv"
                  download="indonesia_hotspots_viirs.csv"
                  className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-[var(--accent-aqua-soft)] hover:bg-[var(--bg-surface-hover)] border border-[var(--accent-aqua-border)] text-[var(--text-primary)] rounded-xl text-[11px] font-medium transition-colors"
                  title="Unduh seluruh data hotspot Indonesia dalam format CSV"
                >
                  <Download className="w-3 h-3 text-[var(--accent-aqua)]" />
                  Ekspor CSV
                </a>
                <a
                  href="/api/firms/export?format=geojson"
                  download="indonesia_hotspots_viirs.geojson"
                  className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-[var(--accent-emerald)] hover:bg-[var(--accent-emerald-bright)] text-[#050d0f] rounded-xl text-[11px] font-bold transition-colors"
                  title="Unduh seluruh data hotspot Indonesia dalam format GeoJSON"
                >
                  <Download className="w-3 h-3 text-[#050d0f]" />
                  Ekspor GeoJSON
                </a>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-3 bg-[var(--bg-surface-elevated)]/70 rounded-xl border border-[var(--accent-aqua-border)] text-[11px] space-y-2 text-[var(--text-primary)]">
              <div className="font-semibold text-[var(--accent-aqua)]">Panduan Eksplorasi Peta:</div>
              <ul className="space-y-1 list-disc list-inside text-[var(--text-secondary)]">
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
