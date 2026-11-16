import React, { useEffect, useRef, useState } from "react";
import type { Map } from "maplibre-gl";

interface WindGrid {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  dLat: number;
  dLng: number;
  rows: number;
  cols: number;
  u: number[];
  v: number[];
}

interface WindPoint {
  lat: number;
  lng: number;
  speed: number;
  direction: number;
  u: number;
  v: number;
}

interface WindParticleCanvasProps {
  map: Map | null;
  visible: boolean;
  opacity: number;
}

interface Particle {
  lng: number;
  lat: number;
  age: number;
  maxAge: number;
  speed: number;
}

export const WindParticleCanvas: React.FC<WindParticleCanvasProps> = ({
  map,
  visible,
  opacity,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const windGridRef = useRef<WindGrid | null>(null);
  const windPointsRef = useRef<WindPoint[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [providerLabel, setProviderLabel] = useState(
    "GFS 10m Wind · Sipongi Opsroom",
  );

  // 1. Fetch real wind field from backend proxy
  useEffect(() => {
    let isMounted = true;
    async function loadWindField() {
      try {
        const res = await fetch("/api/weather/wind-field");
        if (!res.ok) throw new Error("Wind field error");
        const data = await res.json();
        if (!isMounted) return;
        if (
          data.grid &&
          Array.isArray(data.grid.u) &&
          Array.isArray(data.grid.v)
        ) {
          windGridRef.current = data.grid;
        }
        if (data.points && Array.isArray(data.points)) {
          windPointsRef.current = data.points;
        }
        if (data.metadata?.provider) {
          setProviderLabel(
            data.metadata.provider.includes("GFS")
              ? "GFS 10m Wind · Sipongi Opsroom"
              : `Angin 10m · ${data.metadata.provider}`,
          );
        }
        if (windGridRef.current || windPointsRef.current.length > 0) {
          setDataLoaded(true);
        }
      } catch (err) {
        windGridRef.current = null;
        windPointsRef.current = [];
        setDataLoaded(false);
        console.warn(
          "Wind field unavailable; particle visualization disabled:",
          err,
        );
      }
    }
    loadWindField();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Spatial interpolation function: O(1) bilinear grid lookup with IDW fallback
  const getWindVector = (
    lng: number,
    lat: number,
  ): { u: number; v: number; speed: number } => {
    const grid = windGridRef.current;
    if (
      grid &&
      lat >= grid.minLat &&
      lat <= grid.maxLat &&
      lng >= grid.minLng &&
      lng <= grid.maxLng
    ) {
      const fRow = (lat - grid.minLat) / grid.dLat;
      const fCol = (lng - grid.minLng) / grid.dLng;
      const r0 = Math.max(0, Math.min(grid.rows - 2, Math.floor(fRow)));
      const c0 = Math.max(0, Math.min(grid.cols - 2, Math.floor(fCol)));
      const r1 = r0 + 1;
      const c1 = c0 + 1;
      const dr = fRow - r0;
      const dc = fCol - c0;

      const idx00 = r0 * grid.cols + c0;
      const idx01 = r0 * grid.cols + c1;
      const idx10 = r1 * grid.cols + c0;
      const idx11 = r1 * grid.cols + c1;

      const u =
        grid.u[idx00] * (1 - dr) * (1 - dc) +
        grid.u[idx01] * (1 - dr) * dc +
        grid.u[idx10] * dr * (1 - dc) +
        grid.u[idx11] * dr * dc;
      const v =
        grid.v[idx00] * (1 - dr) * (1 - dc) +
        grid.v[idx01] * (1 - dr) * dc +
        grid.v[idx10] * dr * (1 - dc) +
        grid.v[idx11] * dr * dc;
      return { u, v, speed: Math.hypot(u, v) };
    }

    const pts = windPointsRef.current;
    if (!pts.length) return { u: 0, v: 0, speed: 0 };

    let weightSum = 0;
    let uSum = 0;
    let vSum = 0;
    let speedSum = 0;

    for (const p of pts) {
      const dLng = p.lng - lng;
      const dLat = p.lat - lat;
      const distSq = dLng * dLng + dLat * dLat;
      if (distSq < 0.001) {
        return { u: p.u, v: p.v, speed: p.speed };
      }
      const w = 1 / (distSq + 0.1);
      weightSum += w;
      uSum += p.u * w;
      vSum += p.v * w;
      speedSum += p.speed * w;
    }

    return {
      u: uSum / weightSum,
      v: vSum / weightSum,
      speed: speedSum / weightSum,
    };
  };

  // 3. Particle engine lifecycle
  useEffect(() => {
    if (
      !map ||
      !visible ||
      !dataLoaded ||
      (!windGridRef.current && !windPointsRef.current.length)
    ) {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const container = map.getContainer();
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();

    // Initialize ~1800-2400 particles within current bounds
    const initParticles = () => {
      const bounds = map.getBounds();
      const west = bounds.getWest();
      const east = bounds.getEast();
      const south = bounds.getSouth();
      const north = bounds.getNorth();

      const count = Math.min(
        2400,
        Math.max(900, Math.floor(window.innerWidth * 1.45)),
      );
      const particles: Particle[] = [];
      for (let i = 0; i < count; i++) {
        const lng = west + Math.random() * (east - west);
        const lat = south + Math.random() * (north - south);
        particles.push({
          lng,
          lat,
          age: Math.floor(Math.random() * 80),
          maxAge: 60 + Math.floor(Math.random() * 60),
          speed: 15,
        });
      }
      particlesRef.current = particles;
    };

    initParticles();

    const getSpeedColor = (speed: number): string => {
      if (speed < 10) return "#38bdf8"; // sky blue
      if (speed < 20) return "#06b6d4"; // cyan
      if (speed < 30) return "#10b981"; // emerald
      if (speed < 42) return "#eab308"; // yellow
      if (speed < 55) return "#f97316"; // orange
      return "#ef4444"; // red/storm
    };

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(0.04, (time - lastTime) / 1000);
      lastTime = time;

      // Soft trail fade effect
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = "rgba(0, 0, 0, 0.93)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      const bounds = map.getBounds();
      const west = bounds.getWest();
      const east = bounds.getEast();
      const south = bounds.getSouth();
      const north = bounds.getNorth();

      const particles = particlesRef.current;
      ctx.lineCap = "round";

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.age++;

        // Respawn if expired or out of visible viewport
        if (
          p.age > p.maxAge ||
          p.lng < west ||
          p.lng > east ||
          p.lat < south ||
          p.lat > north
        ) {
          p.lng = west + Math.random() * (east - west);
          p.lat = south + Math.random() * (north - south);
          p.age = 0;
          p.maxAge = 50 + Math.floor(Math.random() * 60);
          continue;
        }

        const wind = getWindVector(p.lng, p.lat);
        p.speed = wind.speed;

        // Current projected point
        const startPt = map.project([p.lng, p.lat]);

        // Integrate new position (conversion from km/h to degrees)
        const latRad = (p.lat * Math.PI) / 180;
        const cosLat = Math.max(0.2, Math.cos(latRad));
        const dLng = (wind.u * dt * 0.06) / (111.32 * cosLat);
        const dLat = (wind.v * dt * 0.06) / 110.57;

        p.lng += dLng;
        p.lat += dLat;

        const endPt = map.project([p.lng, p.lat]);

        // Draw particle line segment
        const alpha = Math.sin((p.age / p.maxAge) * Math.PI) * opacity;
        ctx.strokeStyle = getSpeedColor(p.speed);
        ctx.lineWidth = Math.min(2.6, Math.max(1.4, 1.3 + p.speed * 0.025));
        ctx.globalAlpha = Math.max(0.12, alpha);

        ctx.beginPath();
        ctx.moveTo(startPt.x, startPt.y);
        ctx.lineTo(endPt.x, endPt.y);
        ctx.stroke();
      }

      ctx.globalAlpha = 1.0;
      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    const onMapMove = () => {
      // Clear canvas on fast pan to avoid ghost streaking
      ctx.clearRect(0, 0, width(), height());
    };

    function width() {
      return canvas ? canvas.width : 0;
    }
    function height() {
      return canvas ? canvas.height : 0;
    }

    const onMapResize = () => {
      resizeCanvas();
      initParticles();
    };

    map.on("move", onMapMove);
    map.on("resize", onMapResize);

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
      map.off("move", onMapMove);
      map.off("resize", onMapResize);
    };
  }, [map, visible, opacity, dataLoaded]);

  if (!visible) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10"
        style={{ opacity }}
      />
      {dataLoaded && (
        <div className="pointer-events-none absolute bottom-12 left-4 z-20 hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-[#114232]/90 backdrop-blur-md border border-[#87A922]/65 rounded-xl text-[10px] text-[#F7F6BB] shadow-lg">
          <span className="font-semibold text-[#FCDC2A]">{providerLabel}</span>
          <div className="flex items-center gap-1 font-mono">
            <span className="text-slate-400">10</span>
            <span className="w-3 h-2 rounded-xs bg-[#38bdf8]" />
            <span className="w-3 h-2 rounded-xs bg-[#06b6d4]" />
            <span className="w-3 h-2 rounded-xs bg-[#10b981]" />
            <span className="w-3 h-2 rounded-xs bg-[#eab308]" />
            <span className="w-3 h-2 rounded-xs bg-[#f97316]" />
            <span className="w-3 h-2 rounded-xs bg-[#ef4444]" />
            <span className="text-slate-400">55+ km/j</span>
          </div>
        </div>
      )}
    </>
  );
};
