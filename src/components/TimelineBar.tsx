import React, { useState, useEffect } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Calendar, RotateCcw } from 'lucide-react';

interface TimelineBarProps {
  currentDate: string; // YYYY-MM-DD
  onChangeDate: (date: string) => void;
  satelliteLayerActive: boolean;
}

export const TimelineBar: React.FC<TimelineBarProps> = ({
  currentDate,
  onChangeDate,
  satelliteLayerActive,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Play animation step through dates (past 7 days)
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const cur = new Date(currentDate);
      cur.setDate(cur.getDate() + 1);

      const today = new Date();
      if (cur > today) {
        // Loop back 7 days
        const loopDate = new Date();
        loopDate.setDate(loopDate.getDate() - 7);
        onChangeDate(loopDate.toISOString().split('T')[0]);
      } else {
        onChangeDate(cur.toISOString().split('T')[0]);
      }
    }, 2200);

    return () => clearInterval(interval);
  }, [isPlaying, currentDate, onChangeDate]);

  const stepDay = (days: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    const today = new Date();
    if (d <= today) {
      onChangeDate(d.toISOString().split('T')[0]);
    }
  };

  const resetToToday = () => {
    const today = new Date().toISOString().split('T')[0];
    onChangeDate(today);
  };

  if (isCollapsed) {
    return (
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--glass-bg)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] border border-[var(--accent-aqua-border)] rounded-full shadow-lg backdrop-blur-md text-xs font-medium transition-colors cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5 text-[var(--accent-aqua)]" />
          <span>Timeline ({currentDate})</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-1rem)] sm:w-[94%] max-w-xl bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--accent-aqua-border)] rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-[var(--text-primary)] shadow-2xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3 text-xs">
      {/* Play / Pause & Steps */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isPlaying
              ? 'bg-[var(--accent-emerald)] text-[#050d0f]'
              : 'bg-[var(--accent-aqua-soft)] hover:bg-[var(--bg-surface-hover)] border border-[var(--accent-aqua-border)] text-[var(--text-primary)]'
          }`}
          title={isPlaying ? 'Jeda Animasi Temporal' : 'Putar Animasi Harian'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-[var(--accent-aqua)]" />}
        </button>

        <button
          onClick={() => stepDay(-1)}
          className="p-1.5 bg-[var(--accent-aqua-soft)] hover:bg-[var(--bg-surface-hover)] border border-[var(--accent-aqua-border)] text-[var(--text-primary)] rounded-lg transition-colors cursor-pointer"
          title="Hari Sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => stepDay(1)}
          className="p-1.5 bg-[var(--accent-aqua-soft)] hover:bg-[var(--bg-surface-hover)] border border-[var(--accent-aqua-border)] text-[var(--text-primary)] rounded-lg transition-colors cursor-pointer"
          title="Hari Berikutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Date Display and Input */}
      <div className="flex items-center gap-2 flex-1 justify-center">
        <Calendar className="w-3.5 h-3.5 text-[var(--accent-aqua)] shrink-0" />
        <span className="font-semibold text-[var(--text-primary)] hidden sm:inline">Dimensi Waktu:</span>
        <input
          type="date"
          value={currentDate}
          max={new Date().toISOString().split('T')[0]}
          onChange={(e) => {
            if (e.target.value) onChangeDate(e.target.value);
          }}
          className="bg-[var(--bg-surface-elevated)] border border-[var(--accent-aqua-border)] rounded-lg px-2 py-0.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-aqua)]"
        />

        {satelliteLayerActive && (
          <span className="hidden md:inline px-1.5 py-0.5 text-[10px] bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald-bright)] border border-[var(--accent-emerald-border)] rounded">
            Temporal Sinkron
          </span>
        )}
      </div>

      {/* Reset & Minimize */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={resetToToday}
          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-aqua-soft)] rounded-lg transition-colors cursor-pointer"
          title="Kembali ke Hari Ini"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-1.5 py-0.5 rounded-lg hover:bg-[var(--accent-aqua-soft)] cursor-pointer"
          title="Sembunyikan Timeline"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
