import React, { useEffect, useState } from 'react';
import { X, Activity, RefreshCw, ShieldCheck, ExternalLink } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  refreshInterval: number;
  onChangeRefreshInterval: (interval: number) => void;
}
interface ProviderStatus { id: string; name: string; category: string; status: string; license: string; updateCadence: string; endpoint?: string; checkedAt?: string; message?: string; }

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, refreshInterval, onChangeRefreshInterval }) => {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    (async () => {
      setIsLoadingHealth(true);
      try {
        const response = await fetch('/api/providers/status', { signal: controller.signal });
        if (response.ok) { const data = await response.json(); setProviders(data.providers || []); }
      } catch (error) { if (!controller.signal.aborted) console.warn('Provider health check failed:', error); }
      finally { if (!controller.signal.aborted) setIsLoadingHealth(false); }
    })();
    return () => controller.abort();
  }, [isOpen]);
  if (!isOpen) return null;
  const statusClass = (status: string) => status === 'ONLINE' ? 'text-[var(--accent-emerald-bright)]' : status === 'DELAYED' || status === 'STALE' ? 'text-amber-400' : 'text-rose-400';
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--glass-overlay)] backdrop-blur-sm p-3 sm:p-4">
    <div className="w-full max-w-xl bg-[var(--bg-surface)] border border-[var(--accent-aqua-border)] rounded-2xl shadow-2xl p-4 sm:p-5 text-[var(--text-primary)] max-h-[90dvh] flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--accent-aqua-border)]">
        <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-[var(--accent-emerald-bright)]"/><h2 className="text-sm font-bold text-[var(--text-primary)]">Status Sistem & Penyedia Data</h2></div>
        <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-[var(--accent-aqua-soft)] cursor-pointer" aria-label="Tutup"><X className="w-4 h-4"/></button>
      </div>
      <div className="flex-1 overflow-y-auto py-4 space-y-5 text-xs">
        <section className="bg-[var(--bg-surface-elevated)] p-3.5 rounded-xl border border-[var(--accent-aqua-border)] space-y-2">
          <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[var(--accent-aqua)]"/><h3 className="font-semibold text-[var(--text-primary)]">Keamanan kredensial NASA FIRMS</h3></div>
          <p className="text-[var(--text-secondary)] leading-relaxed text-[11px]">NASA FIRMS MAP_KEY hanya boleh disimpan sebagai secret/environment variable di backend server (<code>NASA_FIRMS_MAP_KEY</code>). Kunci tidak dimasukkan dari browser, tidak disimpan di localStorage, dan tidak dikirim sebagai query parameter. Status konfigurasi ditampilkan tanpa membocorkan nilainya.</p>
          <a href="https://firms.modaps.eosdis.nasa.gov/api/map_key/" target="_blank" rel="noreferrer" className="text-[var(--accent-aqua)] hover:underline inline-flex items-center gap-1">Kelola MAP_KEY NASA FIRMS <ExternalLink className="w-3 h-3"/></a>
        </section>
        <section className="bg-[var(--bg-surface-elevated)] p-3.5 rounded-xl border border-[var(--accent-aqua-border)] space-y-2">
          <div className="flex items-center justify-between gap-2"><span className="font-semibold text-[var(--text-primary)]">Interval pembaruan cache gempa</span>
            <select value={refreshInterval} onChange={(e) => onChangeRefreshInterval(parseInt(e.target.value, 10))} className="bg-[var(--bg-obsidian)] border border-[var(--accent-aqua-border)] rounded-lg px-2.5 py-1 text-xs text-[var(--text-primary)]"><option value={60}>1 menit</option><option value={300}>5 menit</option><option value={900}>15 menit</option></select>
          </div><p className="text-[11px] text-[var(--text-secondary)]">Interval polling aplikasi tidak mengubah jadwal penerbitan sumber data.</p>
        </section>
        <section className="space-y-2">
          <div className="flex items-center justify-between"><h3 className="font-semibold text-[var(--text-primary)]">Status koneksi penyedia data</h3>{isLoadingHealth && <span className="flex items-center gap-1 text-[var(--accent-aqua)]"><RefreshCw className="w-3 h-3 animate-spin"/>Memeriksa…</span>}</div>
          <div className="overflow-x-auto border border-[var(--accent-aqua-border)] rounded-xl"><table className="w-full text-left text-xs divide-y divide-[var(--accent-aqua-border)]"><thead className="bg-[var(--bg-surface-elevated)] text-[var(--accent-aqua)] text-[10px] uppercase"><tr><th className="px-3 py-2">Penyedia</th><th className="px-3 py-2">Kategori</th><th className="px-3 py-2">Status</th></tr></thead><tbody className="divide-y divide-[var(--accent-aqua-border)] bg-[var(--bg-obsidian)]/60 text-[11px]">{providers.map((provider) => <tr key={provider.id}><td className="px-3 py-2 text-[var(--text-primary)]">{provider.name}<div className="text-[10px] text-[var(--text-muted)]">{provider.updateCadence}</div></td><td className="px-3 py-2 text-[var(--text-secondary)]">{provider.category}</td><td className={`px-3 py-2 font-semibold ${statusClass(provider.status)}`}>{provider.status}</td></tr>)}</tbody></table></div>
        </section>
      </div>
      <div className="pt-3 border-t border-[var(--accent-aqua-border)] flex justify-end"><button onClick={onClose} className="px-4 py-1.5 text-xs font-bold bg-[var(--accent-aqua)] hover:bg-[var(--accent-aqua-strong)] text-[#050d0f] rounded-xl cursor-pointer">Tutup</button></div>
    </div>
  </div>;
};
