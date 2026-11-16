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
  const statusClass = (status: string) => status === 'ONLINE' ? 'text-emerald-400' : status === 'DELAYED' || status === 'STALE' ? 'text-amber-400' : 'text-rose-400';
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#114232]/80 backdrop-blur-sm p-4">
    <div className="w-full max-w-xl bg-[#114232] border border-[#87A922]/75 rounded-2xl shadow-2xl p-5 text-[#F7F6BB] max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b border-[#87A922]/50">
        <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-[#FCDC2A]"/><h2 className="text-sm font-bold text-[#F7F6BB]">Status Sistem & Penyedia Data</h2></div>
        <button onClick={onClose} className="text-[#F7F6BB]/75 hover:text-white p-1 rounded-lg hover:bg-[#87A922]/30" aria-label="Tutup"><X className="w-4 h-4"/></button>
      </div>
      <div className="flex-1 overflow-y-auto py-4 space-y-5 text-xs">
        <section className="bg-[#87A922]/15 p-3.5 rounded-xl border border-[#87A922]/50 space-y-2">
          <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#FCDC2A]"/><h3 className="font-semibold text-[#F7F6BB]">Keamanan kredensial NASA FIRMS</h3></div>
          <p className="text-[#F7F6BB]/85 leading-relaxed text-[11px]">NASA FIRMS MAP_KEY hanya boleh disimpan sebagai secret/environment variable di backend server (<code>NASA_FIRMS_MAP_KEY</code>). Kunci tidak dimasukkan dari browser, tidak disimpan di localStorage, dan tidak dikirim sebagai query parameter. Status konfigurasi ditampilkan tanpa membocorkan nilainya.</p>
          <a href="https://firms.modaps.eosdis.nasa.gov/api/map_key/" target="_blank" rel="noreferrer" className="text-[#FCDC2A] hover:underline inline-flex items-center gap-1">Kelola MAP_KEY NASA FIRMS <ExternalLink className="w-3 h-3"/></a>
        </section>
        <section className="bg-[#87A922]/15 p-3.5 rounded-xl border border-[#87A922]/50 space-y-2">
          <div className="flex items-center justify-between"><span className="font-semibold text-[#F7F6BB]">Interval pembaruan cache gempa</span>
            <select value={refreshInterval} onChange={(e) => onChangeRefreshInterval(parseInt(e.target.value, 10))} className="bg-[#114232] border border-[#87A922]/70 rounded-lg px-2.5 py-1 text-xs text-[#F7F6BB]"><option value={60}>1 menit</option><option value={300}>5 menit</option><option value={900}>15 menit</option></select>
          </div><p className="text-[11px] text-[#F7F6BB]/75">Interval polling aplikasi tidak mengubah jadwal penerbitan sumber data.</p>
        </section>
        <section className="space-y-2">
          <div className="flex items-center justify-between"><h3 className="font-semibold text-[#F7F6BB]">Status koneksi penyedia data</h3>{isLoadingHealth && <span className="flex items-center gap-1 text-[#FCDC2A]"><RefreshCw className="w-3 h-3 animate-spin"/>Memeriksa…</span>}</div>
          <div className="overflow-x-auto border border-[#87A922]/60 rounded-xl"><table className="w-full text-left text-xs divide-y divide-[#87A922]/40"><thead className="bg-[#87A922]/25 text-[#FCDC2A] text-[10px] uppercase"><tr><th className="px-3 py-2">Penyedia</th><th className="px-3 py-2">Kategori</th><th className="px-3 py-2">Status</th></tr></thead><tbody className="divide-y divide-[#87A922]/30 bg-[#114232]/90 text-[11px]">{providers.map((provider) => <tr key={provider.id}><td className="px-3 py-2 text-[#F7F6BB]">{provider.name}<div className="text-[10px] text-[#F7F6BB]/65">{provider.updateCadence}</div></td><td className="px-3 py-2 text-[#F7F6BB]/75">{provider.category}</td><td className={`px-3 py-2 font-semibold ${statusClass(provider.status)}`}>{provider.status}</td></tr>)}</tbody></table></div>
        </section>
      </div>
      <div className="pt-3 border-t border-[#87A922]/50 flex justify-end"><button onClick={onClose} className="px-4 py-1.5 text-xs font-bold bg-[#FCDC2A] hover:bg-[#F7F6BB] text-[#114232] rounded-lg cursor-pointer">Tutup</button></div>
    </div>
  </div>;
};
