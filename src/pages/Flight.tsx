import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CITIES, EARTH_KM, destination, distKm, project, slerp, toLatLon, toVec, type City } from '../lib/geo';
import { VARIANT_LIST, VARIANTS, type VariantId } from '../model/variants';
import { Meta, EASE } from '../components/kit';
import { NextRoom } from '../components/NextRoom';
import { cn } from '@project/components/lib/utils';

type Mode = 'RANGE' | 'TIME' | 'ALTITUDE' | 'NETWORK' | 'EFFICIENCY';
const MODES: Mode[] = ['RANGE', 'TIME', 'ALTITUDE', 'NETWORK', 'EFFICIENCY'];
const RANGE: Record<VariantId, number> = { M01: 15200, M02: 6400, M03: 7400, M04: 11800 };
const SPEED: Record<VariantId, number> = { M01: 913, M02: 840, M03: 1800, M04: 890 };
const BURN: Record<VariantId, number> = { M01: 5.9, M02: 2.4, M03: 7.8, M04: 4.1 }; // kg per km (concept)
const SEATS: Record<VariantId, number> = { M01: 312, M02: 180, M03: 4, M04: 224 };

interface View { lon: number; lat: number; zoom: number }
const S = 300; // globe radius in svg units

function pathFor(pts: [number, number, number?][], v: View) {
  let d = '';
  let pen = false;
  for (const [lat, lon, h = 0] of pts) {
    const [x, y, z] = project(lat, lon, v.lon, v.lat);
    const k = 1 + h;
    const vis = z >= 0 || Math.hypot(x, y) * k > 1.0;
    if (!vis) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${(x * k * S).toFixed(1)},${(-y * k * S).toFixed(1)}`;
    pen = true;
  }
  return d;
}

function arcPts(a: City, b: City, lift = 0, n = 96): [number, number, number][] {
  const va = toVec(a.lat, a.lon);
  const vb = toVec(b.lat, b.lon);
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const [la, lo] = toLatLon(slerp(va, vb, t));
    return [la, lo, lift * Math.sin(Math.PI * t)];
  });
}

export default function Flight() {
  const reduce = useReducedMotion();
  const [origin, setOrigin] = useState('LHR');
  const [dest, setDest] = useState('SIN');
  const [mode, setMode] = useState<Mode>('RANGE');
  const [ac, setAc] = useState<VariantId>('M01');
  const [view, setView] = useState<View>({ lon: 20, lat: 30, zoom: 1 });
  const drag = useRef<{ x: number; y: number; v: View } | null>(null);
  const user = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const O = CITIES.find((c) => c.code === origin)!;
  const D = CITIES.find((c) => c.code === dest)!;
  const dist = distKm(O, D);
  const range = RANGE[ac];
  const inRange = dist <= range;
  const stop = useMemo(() => {
    if (inRange) return null;
    let best: City | null = null;
    let bestMax = Infinity;
    CITIES.forEach((c) => {
      if (c === O || c === D) return;
      const a = distKm(O, c);
      const b = distKm(c, D);
      if (a <= range && b <= range && Math.max(a, b) < bestMax) {
        bestMax = Math.max(a, b);
        best = c;
      }
    });
    return best as City | null;
  }, [O, D, range, inRange]);

  // Camera framing per mode
  const target = useMemo<View>(() => {
    const mid = toLatLon(slerp(toVec(O.lat, O.lon), toVec(D.lat, D.lon), 0.5));
    if (mode === 'RANGE') return { lat: Math.max(-50, Math.min(60, O.lat - 10)), lon: O.lon, zoom: 0.92 };
    if (mode === 'NETWORK') return { lat: Math.max(-50, Math.min(60, O.lat)), lon: O.lon, zoom: 0.85 };
    if (mode === 'ALTITUDE') return { lat: Math.max(-60, Math.min(60, mid[0] - 25)), lon: mid[1], zoom: 1.5 };
    if (mode === 'TIME') return { lat: Math.max(-60, Math.min(60, mid[0])), lon: mid[1], zoom: 1.2 };
    return { lat: Math.max(-60, Math.min(60, mid[0])), lon: mid[1], zoom: 1.05 };
  }, [mode, O, D]);

  useEffect(() => {
    user.current = false;
    let raf = 0;
    const tick = () => {
      setView((v) => {
        if (user.current) return v;
        const k = reduce ? 1 : 0.07;
        let dl = target.lon - v.lon;
        dl = ((dl + 540) % 360) - 180;
        const nv = { lon: v.lon + dl * k, lat: v.lat + (target.lat - v.lat) * k, zoom: v.zoom + (target.zoom - v.zoom) * k };
        return nv;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const stopT = window.setTimeout(() => cancelAnimationFrame(raf), 2600);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(stopT);
    };
  }, [target, reduce]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      user.current = true;
      setView((v) => ({ ...v, zoom: Math.max(0.7, Math.min(3, v.zoom * (e.deltaY > 0 ? 0.93 : 1.07))) }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const grat = useMemo(() => {
    const lines: [number, number][][] = [];
    for (let lat = -75; lat <= 75; lat += 15) lines.push(Array.from({ length: 121 }, (_, i) => [lat, -180 + i * 3]));
    for (let lon = -180; lon < 180; lon += 15) lines.push(Array.from({ length: 61 }, (_, i) => [-90 + i * 3, lon]));
    return lines;
  }, []);

  const ring = useMemo(() => {
    const d = range / EARTH_KM;
    return Array.from({ length: 181 }, (_, i) => destination(O.lat, O.lon, (i / 180) * Math.PI * 2, d)).map(([a, b]) => [a, b] as [number, number]);
  }, [O, range]);

  const lift = mode === 'ALTITUDE' ? 0.09 : 0;
  const routeLegs = stop ? [[O, stop], [stop, D]] : [[O, D]];
  const network = mode === 'NETWORK' ? CITIES.filter((c) => c !== O && distKm(O, c) <= range) : [];
  const hours = dist / SPEED[ac] + 0.5;
  const hourMarks = mode === 'TIME' ? Array.from({ length: Math.floor(hours) }, (_, i) => (i + 1) / hours).filter((t) => t < 1) : [];
  const zoomS = view.zoom;

  return (
    <div className="bg-foreground text-background">
      <section className="relative min-h-[100svh] pt-24 pb-8 px-5 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Meta className="opacity-60">05 / Flight room</Meta>
            <div role="tablist" aria-label="Encoding" className="flex flex-wrap gap-1">
              {MODES.map((m) => (
                <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cn('relative meta px-3 py-2', mode === m ? 'text-primary-foreground' : 'opacity-60 hover:opacity-100')}>
                  {mode === m && <motion.span layoutId="flight-mode" className="absolute inset-0 bg-primary" />}
                  <span className="relative">{m}</span>
                </button>
              ))}
            </div>
          </div>
          <svg
            ref={svgRef}
            viewBox={`${-S * 1.25} ${-S * 1.25} ${S * 2.5} ${S * 2.5}`}
            className="w-full aspect-square max-h-[78vh] mx-auto touch-none select-none cursor-grab active:cursor-grabbing"
            role="img"
            aria-label={`Globe showing a route from ${O.name} to ${D.name}`}
            onPointerDown={(e) => {
              (e.target as Element).setPointerCapture?.(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, v: view };
              user.current = true;
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const dx = e.clientX - drag.current.x;
              const dy = e.clientY - drag.current.y;
              const v0 = drag.current.v;
              setView({ ...v0, lon: v0.lon - dx * 0.35 / v0.zoom, lat: Math.max(-80, Math.min(80, v0.lat + dy * 0.35 / v0.zoom)) });
            }}
            onPointerUp={() => (drag.current = null)}
          >
            <g transform={`scale(${zoomS})`}>
              <circle r={S} fill="hsl(213 42% 13%)" stroke="hsl(208 40% 86% / 0.4)" strokeWidth={1 / zoomS} />
              {grat.map((l, i) => (
                <path key={i} d={pathFor(l, view)} fill="none" stroke="hsl(208 40% 86%)" strokeOpacity={i === 5 ? 0.35 : 0.12} strokeWidth={0.8 / zoomS} />
              ))}
              {mode === 'RANGE' && (
                <motion.path key={`${origin}-${ac}`} d={pathFor(ring, view)} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5 / zoomS} strokeDasharray={`${6 / zoomS} ${4 / zoomS}`} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: EASE }} />
              )}
              {network.map((c) => (
                <motion.path key={`n-${c.code}`} d={pathFor(arcPts(O, c), view)} fill="none" stroke="hsl(var(--background))" strokeOpacity={0.35} strokeWidth={0.8 / zoomS} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: EASE }} />
              ))}
              {routeLegs.map(([a, b], i) => (
                <motion.path
                  key={`${a.code}-${b.code}-${mode}`}
                  d={pathFor(arcPts(a, b, lift), view)}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth={(mode === 'EFFICIENCY' ? 2 + (BURN[ac] / 2) : 2.2) / zoomS}
                  strokeDasharray={stop ? `${8 / zoomS} ${4 / zoomS}` : undefined}
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.6, ease: EASE, delay: i * 0.5 }}
                />
              ))}
              {mode === 'ALTITUDE' && <path d={pathFor(arcPts(O, D), view)} fill="none" stroke="hsl(var(--background))" strokeOpacity={0.3} strokeWidth={0.8 / zoomS} strokeDasharray="2 3" />}
              {hourMarks.map((t, i) => {
                const [la, lo] = toLatLon(slerp(toVec(O.lat, O.lon), toVec(D.lat, D.lon), t));
                const [x, y, z] = project(la, lo, view.lon, view.lat);
                if (z < 0) return null;
                return (
                  <g key={i} transform={`translate(${x * S},${-y * S})`}>
                    <circle r={2.5 / zoomS} fill="hsl(var(--background))" />
                    <text x={5 / zoomS} y={-5 / zoomS} fontSize={10 / zoomS} className="font-mono" fill="hsl(var(--background))">{i + 1}h</text>
                  </g>
                );
              })}
              {CITIES.map((c) => {
                const [x, y, z] = project(c.lat, c.lon, view.lon, view.lat);
                if (z < 0.02) return null;
                const sel = c.code === origin || c.code === dest || c === stop;
                return (
                  <g key={c.code} transform={`translate(${x * S},${-y * S})`} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); if (c.code !== origin) setDest(c.code); }} onDoubleClick={() => setOrigin(c.code)}>
                    <circle r={(sel ? 4.5 : 2.5) / zoomS} fill={sel ? 'hsl(var(--primary))' : 'hsl(var(--background))'} />
                    <text x={7 / zoomS} y={3 / zoomS} fontSize={(sel ? 12 : 9) / zoomS} className="font-mono" fill="hsl(var(--background))" fillOpacity={sel ? 1 : 0.6}>{c.code}</text>
                  </g>
                );
              })}
            </g>
          </svg>
          <Meta className="opacity-50 block text-center">Drag to rotate · scroll to zoom · click a city to set destination · double-click to set origin</Meta>
        </div>

        <aside className="lg:col-span-4 flex flex-col gap-5 lg:pt-12">
          <h1 className="display text-[14vw] lg:text-[5.5vw] leading-[0.85]">FLIGHT<br />ROOM</h1>
          <div className="grid grid-cols-2 gap-3">
            {([['Origin', origin, setOrigin], ['Destination', dest, setDest]] as const).map(([l, val, set]) => (
              <label key={l} className="flex flex-col gap-1">
                <Meta className="opacity-60">{l}</Meta>
                <select value={val} onChange={(e) => set(e.target.value)} className="bg-transparent border-b border-background/30 py-2 text-lg outline-none focus:border-primary">
                  {CITIES.filter((c) => (l === 'Origin' ? c.code !== dest : c.code !== origin)).map((c) => (
                    <option key={c.code} value={c.code} className="text-foreground">{c.name} {c.code}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <Meta className="opacity-60">Aircraft</Meta>
            <div className="flex gap-1">
              {VARIANT_LIST.map((v) => (
                <button key={v.id} onClick={() => setAc(v.id)} aria-pressed={ac === v.id} className={cn('meta px-3 py-2 border press', ac === v.id ? 'bg-background text-foreground border-background' : 'border-background/30')}>{v.id}</button>
              ))}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-4 border-t border-background/20 pt-4">
            <div><dt className="meta opacity-60">Distance</dt><dd className="text-3xl font-semibold tabular-nums">{Math.round(dist).toLocaleString()} km</dd></div>
            <div><dt className="meta opacity-60">{VARIANTS[ac].name} range</dt><dd className="text-3xl font-semibold tabular-nums">{range.toLocaleString()} km</dd></div>
            <div><dt className="meta opacity-60">Block time</dt><dd className="text-xl tabular-nums">{Math.floor(hours)}h {Math.round((hours % 1) * 60)}m</dd></div>
            <div><dt className="meta opacity-60">Fuel / seat</dt><dd className="text-xl tabular-nums">{Math.round((dist * BURN[ac]) / SEATS[ac]).toLocaleString()} kg</dd></div>
          </dl>
          <motion.div key={`${origin}${dest}${ac}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('p-4 border', inRange ? 'border-background/20' : 'border-primary')}>
            {inRange ? (
              <p className="text-sm">Non-stop within {VARIANTS[ac].name} concept range — {Math.round((dist / range) * 100)}% of maximum.</p>
            ) : stop ? (
              <p className="text-sm">Beyond range by {Math.round(dist - range).toLocaleString()} km. Illustrative fuel stop at <strong>{stop.name} ({stop.code})</strong>.</p>
            ) : (
              <p className="text-sm">Beyond range, and no single listed city bridges it. Try a longer-range aircraft.</p>
            )}
          </motion.div>
          {mode === 'ALTITUDE' && (
            <svg viewBox="0 0 300 80" className="w-full" aria-label="Altitude profile">
              <motion.path d="M0,75 L40,15 L260,12 L300,75" fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2 }} />
              <text x="120" y="8" fontSize="8" className="font-mono" fill="currentColor">CRUISE FL{ac === 'M03' ? '550' : '410'} (CONCEPT)</text>
            </svg>
          )}
          {mode === 'EFFICIENCY' && (
            <div className="flex flex-col gap-2">
              {VARIANT_LIST.map((v) => {
                const ok = dist <= RANGE[v.id];
                const val = (BURN[v.id] * 1000) / SEATS[v.id];
                return (
                  <div key={v.id} className="flex items-center gap-2">
                    <span className="meta w-8">{v.id}</span>
                    <div className="flex-1 h-1.5 bg-background/10"><motion.div className={ok ? 'h-full bg-primary' : 'h-full bg-background/30'} initial={{ width: 0 }} animate={{ width: `${Math.min(100, val / 20)}%` }} /></div>
                    <span className="meta w-24 text-right">{ok ? `${val.toFixed(1)} kg/seat·1k km` : 'out of range'}</span>
                  </div>
                );
              })}
            </div>
          )}
          <Meta className="opacity-50">Concept data — not a schedule, not a performance claim.</Meta>
        </aside>
      </section>
      <NextRoom current="flight" dark />
    </div>
  );
}

