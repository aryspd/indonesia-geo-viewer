import React, { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  FileUp,
  Info,
  Layers3,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import type { ImportedVectorLayer } from "../types/vector";
import { importVectorFile } from "../utils/vectorData";

const PALETTE = [
  "#38bdf8",
  "#f59e0b",
  "#a78bfa",
  "#34d399",
  "#fb7185",
  "#facc15",
  "#2dd4bf",
  "#c084fc",
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  layers: ImportedVectorLayer[];
  onAdd: (layers: ImportedVectorLayer[]) => void;
  onUpdate: (id: string, patch: Partial<ImportedVectorLayer>) => void;
  onRemove: (id: string) => void;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export const VectorDataManager: React.FC<Props> = ({
  isOpen,
  onClose,
  layers,
  onAdd,
  onUpdate,
  onRemove,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState(false);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | File[]) => {
    const incoming = Array.from(files);
    if (!incoming.length) return;
    setBusy(true);
    setError("");
    setNotice("");
    const added: ImportedVectorLayer[] = [];
    let skippedIdentical = 0;
    try {
      const handled = new Set<string>();
      for (const file of incoming) {
        const extension = file.name.toLowerCase().split(".").pop() || "";
        if (["shx", "dbf", "prj", "cpg"].includes(extension)) continue;
        if (extension === "shp") {
          const base = file.name.replace(/\.shp$/i, "").toLowerCase();
          if (handled.has(base)) continue;
          handled.add(base);
        }
        const parsed = await importVectorFile(
          file,
          PALETTE[(layers.length + added.length) % PALETTE.length],
          incoming,
        );
        for (const layer of parsed) {
          const alreadyExists = [...layers, ...added].some(
            (existing) => existing.fingerprint === layer.fingerprint,
          );
          if (alreadyExists) {
            skippedIdentical += 1;
            continue;
          }
          added.push(layer);
        }
      }
      if (added.length) onAdd(added);
      if (!added.length && !skippedIdentical)
        throw new Error(
          "Tidak ada layer yang dapat diproses. Pilih GeoJSON/JSON, ZIP Shapefile, atau file .shp bersama .prj dan file atributnya.",
        );
      setNotice(
        `${added.length} layer berhasil dimuat${skippedIdentical ? `; ${skippedIdentical} dataset identik dilewati` : ""}. Data lokal hanya tersimpan dalam sesi browser; refresh halaman akan menghapus layer impor. Berkas tidak diunggah ke server.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "File gagal dibaca. Periksa format dan kelengkapan berkas.",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-[var(--glass-overlay)] backdrop-blur-sm p-2.5 pt-16 sm:p-6 sm:pt-20"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="w-full max-w-2xl max-h-[calc(100dvh-5rem)] overflow-hidden rounded-2xl border border-[var(--accent-aqua-border)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--accent-aqua-border)] bg-gradient-to-r from-[var(--accent-aqua-soft)] to-[var(--bg-surface)] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald-bright)] border border-[var(--accent-emerald-border)]">
              <Layers3 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Data Vektor & Batas Wilayah
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                GeoJSON dan Shapefile ZIP · tampilan peta yang rapi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--accent-aqua-soft)] hover:text-[var(--text-primary)] cursor-pointer"
            aria-label="Tutup panel"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-[calc(100dvh-10rem)] space-y-4 overflow-y-auto p-4 sm:p-5">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void handleFiles(event.dataTransfer.files);
            }}
            className={`flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-5 py-7 text-center transition cursor-pointer ${dragging ? "border-[var(--accent-aqua)] bg-[var(--accent-aqua-soft)]" : "border-[var(--accent-aqua-border)] bg-[var(--bg-surface-elevated)] hover:border-[var(--accent-aqua)] hover:bg-[var(--bg-surface-hover)]"}`}
          >
            {busy ? (
              <Loader2 className="mb-2 h-7 w-7 animate-spin text-[var(--accent-aqua)]" />
            ) : (
              <FileUp className="mb-2 h-7 w-7 text-[var(--accent-aqua)]" />
            )}
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {busy ? "Memproses geometri…" : "Pilih atau tarik file ke sini"}
            </span>
            <span className="mt-1 text-[11px] text-[var(--text-secondary)]">
              .geojson / .json / .zip Shapefile · maksimum 75 MB per file
            </span>
            <span className="mt-2 text-[10px] text-[var(--text-muted)]">
              Shapefile bisa berupa ZIP berisi komponen pendukung, atau pilih
              .shp dan .prj sekaligus (.dbf/.shx dianjurkan).
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".geojson,.json,.zip,.shp,.shx,.dbf,.prj,.cpg,application/geo+json,application/json,application/zip"
            className="hidden"
            onChange={(event) => {
              if (event.target.files) void handleFiles(event.target.files);
            }}
          />

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {notice && (
            <div className="flex items-start gap-2 rounded-xl border border-[var(--accent-emerald-border)] bg-[var(--accent-emerald-soft)] p-3 text-xs text-[var(--text-primary)]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-emerald-bright)]" />
              <span>{notice}</span>
            </div>
          )}

          <div className="rounded-xl border border-[var(--accent-aqua-border)] bg-[var(--bg-surface-elevated)] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <Info className="h-3.5 w-3.5 text-[var(--accent-aqua)]" /> Standar agar
              geometri tepat
            </div>
            <ul className="space-y-1.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">
              <li>
                • GeoJSON harus memakai koordinat longitude/latitude WGS84
                (EPSG:4326).
              </li>
              <li>
                • Shapefile memakai .prj untuk reproyeksi ke WGS84; file .dbf
                menjaga atribut fitur tetap tersedia.
              </li>
              <li>
                • Polygon ditampilkan dengan fill transparan dan outline; garis
                memakai casing; titik otomatis dikelompokkan saat rapat.
              </li>
              <li>
                • Dataset identik yang diunggah lagi dilewati. Fitur hanya
                diduplikasi bila geometri dan atributnya identik; overlap bukan
                alasan penghapusan.
              </li>
              <li>
                • Untuk data besar, lakukan validasi/simplifikasi topologi di
                QGIS lalu layani sebagai vector tiles/PMTiles.
              </li>
            </ul>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                Layer yang dimuat
              </h3>
              <span className="rounded-full bg-[var(--accent-aqua-soft)] border border-[var(--accent-aqua-border)] px-2 py-0.5 text-[10px] text-[var(--accent-aqua)]">
                {layers.length} layer
              </span>
            </div>
            {layers.length === 0 ? (
              <div className="rounded-xl border border-[var(--accent-aqua-border)] bg-[var(--bg-surface-elevated)]/60 px-3 py-5 text-center text-xs text-[var(--text-muted)]">
                Belum ada file vektor yang dimuat.
              </div>
            ) : (
              <div className="space-y-2">
                {layers.map((layer) => (
                  <article
                    key={layer.id}
                    className="rounded-xl border border-[var(--accent-aqua-border)] bg-[var(--bg-surface-elevated)] p-3"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-1 h-3 w-3 shrink-0 rounded-sm border border-white/30"
                        style={{ backgroundColor: layer.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate text-xs font-semibold text-[var(--text-primary)]"
                          title={layer.name}
                        >
                          {layer.name}
                        </div>
                        <div className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
                          {layer.sourceFormat} ·{" "}
                          {formatNumber(layer.featureCount)} fitur ·{" "}
                          {layer.geometryTypes.join(", ")}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                          <span className="rounded bg-[var(--bg-obsidian)] px-1.5 py-0.5 text-[var(--accent-aqua)]">
                            Titik {formatNumber(layer.pointCount)}
                          </span>
                          <span className="rounded bg-[var(--bg-obsidian)] px-1.5 py-0.5 text-[var(--accent-emerald-bright)]">
                            Garis {formatNumber(layer.lineCount)}
                          </span>
                          <span className="rounded bg-[var(--bg-obsidian)] px-1.5 py-0.5 text-[var(--text-primary)]">
                            Polygon {formatNumber(layer.polygonCount)}
                          </span>
                          {layer.duplicateFeaturesRemoved > 0 && (
                            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-300">
                              Duplikat {layer.duplicateFeaturesRemoved}
                            </span>
                          )}
                          {layer.skippedInvalidFeatures > 0 && (
                            <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-rose-300">
                              Invalid {layer.skippedInvalidFeatures}
                            </span>
                          )}
                          {layer.polygonRingsClosed > 0 && (
                            <span className="rounded bg-[var(--accent-aqua-soft)] px-1.5 py-0.5 text-[var(--accent-aqua)]">
                              Ring ditutup {layer.polygonRingsClosed}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            onUpdate(layer.id, { visible: !layer.visible })
                          }
                          className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--accent-aqua-soft)] hover:text-[var(--text-primary)]"
                          title={
                            layer.visible
                              ? "Sembunyikan layer"
                              : "Tampilkan layer"
                          }
                        >
                          {layer.visible ? (
                            <Eye className="h-3.5 w-3.5" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => onRemove(layer.id)}
                          className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-rose-500/20 hover:text-rose-300"
                          title="Hapus layer dari peta"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
                        <input
                          type="checkbox"
                          checked={layer.showLabels}
                          onChange={(event) =>
                            onUpdate(layer.id, {
                              showLabels: event.target.checked,
                            })
                          }
                          className="rounded border-[var(--accent-aqua-border)] bg-[var(--bg-obsidian)] accent-[#10b981]"
                        />{" "}
                        Label
                      </label>
                      <label className="flex min-w-0 flex-1 items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                        Opacity{" "}
                        <input
                          type="range"
                          min="0.05"
                          max="1"
                          step="0.05"
                          value={layer.opacity}
                          onChange={(event) =>
                            onUpdate(layer.id, {
                              opacity: Number(event.target.value),
                            })
                          }
                          className="min-w-0 flex-1 accent-[#7de3e0]"
                        />
                        <span className="w-8 text-right tabular-nums text-[var(--accent-aqua)]">
                          {Math.round(layer.opacity * 100)}%
                        </span>
                      </label>
                    </div>
                    <div
                      className="mt-2 truncate font-mono text-[9px] text-[var(--text-muted)]"
                      title={layer.sourceFileName}
                    >
                      {layer.sourceFileName} · WGS84 ·{" "}
                      {layer.bbox.map((n) => n.toFixed(3)).join(", ")}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
