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
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#114232]/95 hover:bg-[#87A922]/30 text-[#F7F6BB] border border-[#87A922]/70 rounded-full shadow-lg backdrop-blur-md text-xs font-medium transition-colors"
        >
          <Calendar className="w-3.5 h-3.5 text-[#FCDC2A]" />
          <span>Timeline Temporal ({currentDate})</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-xl bg-[#114232]/95 backdrop-blur-xl border border-[#87A922]/75 rounded-2xl px-4 py-2.5 text-[#F7F6BB] shadow-2xl flex items-center justify-between gap-3 text-xs">
      {/* Play / Pause & Steps */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-1.5 rounded-lg transition-colors ${
            isPlaying
              ? 'bg-[#FCDC2A] text-[#114232]'
              : 'bg-[#87A922]/25 hover:bg-[#87A922]/45 border border-[#87A922]/50 text-[#F7F6BB]'
          }`}
          title={isPlaying ? 'Jeda Animasi Temporal' : 'Putar Animasi Harian'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-[#FCDC2A]" />}
        </button>

        <button
          onClick={() => stepDay(-1)}
          className="p-1.5 bg-[#87A922]/25 hover:bg-[#87A922]/45 border border-[#87A922]/50 text-[#F7F6BB] hover:text-white rounded-lg transition-colors"
          title="Hari Sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => stepDay(1)}
          className="p-1.5 bg-[#87A922]/25 hover:bg-[#87A922]/45 border border-[#87A922]/50 text-[#F7F6BB] hover:text-white rounded-lg transition-colors"
          title="Hari Berikutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Date Display and Input */}
      <div className="flex items-center gap-2 flex-1 justify-center">
        <Calendar className="w-3.5 h-3.5 text-[#FCDC2A]" />
        <span className="font-semibold text-[#F7F6BB] hidden sm:inline">Dimensi Waktu:</span>
        <input
          type="date"
          value={currentDate}
          max={new Date().toISOString().split('T')[0]}
          onChange={(e) => {
            if (e.target.value) onChangeDate(e.target.value);
          }}
          className="bg-[#114232] border border-[#87A922]/70 rounded-lg px-2 py-0.5 text-xs text-[#F7F6BB] font-mono focus:outline-none focus:border-[#FCDC2A]"
        />

        {satelliteLayerActive && (
          <span className="hidden md:inline px-1.5 py-0.5 text-[10px] bg-[#87A922]/25 text-[#FCDC2A] border border-[#FCDC2A]/60 rounded">
            Temporal Sinkron
          </span>
        )}
      </div>

      {/* Reset & Minimize */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={resetToToday}
          className="p-1.5 text-[#F7F6BB]/80 hover:text-white hover:bg-[#87A922]/30 rounded-lg transition-colors"
          title="Kembali ke Hari Ini"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-[11px] text-[#F7F6BB]/80 hover:text-white px-1.5 py-0.5 rounded-lg hover:bg-[#87A922]/30"
          title="Sembunyikan Timeline"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
