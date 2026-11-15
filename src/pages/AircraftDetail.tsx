import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Html, Line } from '@react-three/drei';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Stage, { type Pose } from '../model/Stage';
import Aircraft, { type PickedPart } from '../model/Aircraft';
import { VARIANTS, type VariantId } from '../model/variants';
import { getAircraft } from '../model/generator';
import { STAGES, SYSTEM_LABELS } from '../model/types';
import { Counter, Meta, PressButton, EASE } from '../components/kit';
import { NextRoom } from '../components/NextRoom';
import { topView } from '../lib/planform';
import { useGo } from '../lib/transition';
import { cn } from '@project/components/lib/utils';

const MODES = ['HERO', '3D', 'BLUEPRINT', 'CUTAWAY', 'EXPLODED', 'DIMENSIONS'] as const;
type Mode = (typeof MODES)[number];

function Dimensions({ id }: { id: VariantId }) {
  const v = VARIANTS[id];
  const a = getAircraft(id);
  const g = v.gear.ground - 0.3;
  const L = v.length / 2;
  const s = a.bounds.span / 2;
  const top = g + a.bounds.height + 0.3;
  const tx = -L + 2.5;
  const lbl = (t: string, p: [number, number, number]) => (
    <Html position={p} center zIndexRange={[20, 0]}>
      <span className="meta whitespace-nowrap bg-foreground text-background px-2 py-1">{t}</span>
    </Html>
  );
  return (
    <group>
      <Line points={[[-L, g, s + 4], [L, g, s + 4]]} color="#B34A32" lineWidth={1.5} />
      <Line points={[[-L, g - 1, s + 4], [-L, g + 1, s + 4]]} color="#B34A32" lineWidth={1.5} />
      <Line points={[[L, g - 1, s + 4], [L, g + 1, s + 4]]} color="#B34A32" lineWidth={1.5} />
      {lbl(`LENGTH ${v.length.toFixed(1)} M`, [0, g, s + 4])}
      <Line points={[[L + 6, g, -s], [L + 6, g, s]]} color="#E9E6DE" lineWidth={1.2} />
      {lbl(`SPAN ${a.bounds.span.toFixed(1)} M`, [L + 6, g, 0])}
      <Line points={[[tx, g, 0], [tx, top, 0]]} color="#E9E6DE" lineWidth={1.2} />
      {lbl(`HEIGHT ${a.bounds.height.toFixed(1)} M`, [tx, (g + top) / 2, 0])}
    </group>
  );
}

function PartDiagram({ id, part }: { id: VariantId; part: PickedPart }) {
  const p = topView(id);
  const pad = 3;
  const vb = `${p.bounds.minX - pad} ${p.bounds.minY - pad} ${p.bounds.maxX - p.bounds.minX + 2 * pad} ${p.bounds.maxY - p.bounds.minY + 2 * pad}`;
  return (
    <svg viewBox={vb} className="w-full h-40" aria-hidden>
      {[p.wing, p.tail, p.fuselage, p.engines].map((d, i) => (
        <path key={i} d={d} fill="none" stroke="currentColor" strokeOpacity={0.45} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      <motion.circle cx={part.point.x} cy={part.point.z} r={1.4} fill="hsl(var(--primary))" initial={{ scale: 0 }} animate={{ scale: 1 }} />
      <motion.circle cx={part.point.x} cy={part.point.z} fill="none" stroke="hsl(var(--primary))" strokeWidth={1} vectorEffect="non-scaling-stroke" initial={{ r: 1 }} animate={{ r: [1.4, 5, 1.4] }} transition={{ repeat: Infinity, duration: 2 }} />
      <line x1={part.point.x} y1={p.bounds.minY - pad} x2={part.point.x} y2={p.bounds.maxY + pad} stroke="hsl(var(--primary))" strokeWidth={0.6} vectorEffect="non-scaling-stroke" strokeDasharray="3 3" />
      <line y1={part.point.z} x1={p.bounds.minX - pad} y2={part.point.z} x2={p.bounds.maxX + pad} stroke="hsl(var(--primary))" strokeWidth={0.6} vectorEffect="non-scaling-stroke" strokeDasharray="3 3" />
    </svg>
  );
}

export default function AircraftDetail() {
  const params = useParams();
  const id = (Object.keys(VARIANTS).includes(String(params.id).toUpperCase()) ? String(params.id).toUpperCase() : 'M01') as VariantId;
  const v = VARIANTS[id];
  const model = getAircraft(id);
  const go = useGo();
  const reduce = useReducedMotion();
  const k = v.length / 68.4;
  const [mode, setMode] = useState<Mode>('HERO');
  const [picked, setPicked] = useState<PickedPart | null>(null);
  const [hover, setHover] = useState<PickedPart | null>(null);
  const [compare, setCompare] = useState(false);
  const [gear, setGear] = useState(true);
  const [flaps, setFlaps] = useState(0);
  const [spin, setSpin] = useState(true);
  const [lights, setLights] = useState(true);
  const [nonce, setNonce] = useState(0);
  const mouse = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPicked(null);
      const n = Number(e.key);
      if (n >= 1 && n <= 6 && !(e.target instanceof HTMLInputElement)) {
        setMode(MODES[n - 1]);
        setPicked(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pose = useMemo<Pose & { n?: number }>(() => {
    const s = (a: number, b: number, c: number) => [a * k, b * k, c * k] as [number, number, number];
    if (picked) {
      const p = picked.point;
      const side = p.z >= 0 ? 1 : -1;
      return { position: [p.x + 9 * k, p.y + 5 * k, p.z + side * 12 * k], target: [p.x, p.y, p.z], fov: 30, n: nonce };
    }
    if (compare) return { position: [0.01, 300 * k, -31 * k], target: [0, 0, -31 * k], fov: 20, n: nonce };
    const map: Record<Mode, Pose> = {
      HERO: { position: s(54, 7, -48), target: [0, -1.2 * k, 0], fov: 30 },
      '3D': { position: s(64, 34, 66), target: [0, -1, 0], fov: 32 },
      BLUEPRINT: { position: [0.01, 330 * k, 0], target: [0, 0, 0], fov: 14 },
      CUTAWAY: { position: s(14, 22, 52), target: [0, -0.5, 0], fov: 34 },
      EXPLODED: { position: s(78, 52, 80), target: [0, 0, 0], fov: 32 },
      DIMENSIONS: { position: s(72, 46, 96), target: [0, -2, 0], fov: 34 },
    };
    return { ...map[mode], n: nonce } as Pose;
  }, [mode, picked, compare, k, nonce]);

  const controls = {
    blueprint: mode === 'BLUEPRINT' && !picked ? 1 : 0,
    cut: mode === 'CUTAWAY' ? 1 : 0,
    explode: mode === 'EXPLODED' ? 1 : 0,
    gear: gear ? 1 : 0,
    flaps,
    spoilers: flaps > 0.9 ? 0.2 : 0,
    spin: spin ? 1 : 0,
    lights: lights ? 1 : 0,
  };
  const dark = mode !== 'BLUEPRINT';
  const m2 = VARIANTS.M02;

  return (
    <div className={cn('transition-colors duration-700', dark ? 'bg-foreground text-background' : 'text-secondary-foreground')}>
      <section
        ref={mouse}
        className={cn('relative h-[100svh] min-h-[680px] w-full overflow-hidden transition-colors duration-700', !dark && 'bp-grid')}
        onPointerMove={(e) => {
          const el = document.getElementById('cursor-label');
          if (el) el.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 16}px)`;
        }}
      >
        <Stage
          className="absolute inset-0"
          pose={pose}
          tone={dark ? 'dark' : 'blueprint'}
          ground={v.gear.ground}
          onMissed={() => setPicked(null)}
          minDistance={3}
          zoom
        >
          <Aircraft
            variant={id}
            controls={controls}
            instant={!!reduce}
            isolate={picked ? picked.group.key : null}
            selected={picked ? { key: picked.group.key, index: picked.index } : null}
            onPick={(p) => setPicked(p)}
            onHover={setHover}
          />
          {compare && id === 'M01' && (
            <group position={[34.2 - m2.length / 2, v.gear.ground - m2.gear.ground, -62]}>
              <Aircraft variant="M02" lite controls={{ ...controls, explode: 0, cut: 0 }} />
              <Line points={[[-m2.length / 2, -4, 22], [m2.length / 2, -4, 22]]} color="#B34A32" lineWidth={1.5} />
              <Html position={[0, -4, 22]} center><span className="meta bg-foreground text-background px-2 py-1">M02 {m2.length} M</span></Html>
            </group>
          )}
          {compare && <Line points={[[-v.length / 2, -4, 38], [v.length / 2, -4, 38]]} color="#E9E6DE" lineWidth={1.5} />}
          {mode === 'DIMENSIONS' && !picked && !compare && <Dimensions id={id} />}
        </Stage>

        <div id="cursor-label" aria-hidden className="pointer-events-none fixed left-0 top-0 z-40 hidden md:block">
          <span className="meta bg-background text-foreground px-2 py-1 shadow">{hover ? `${hover.number} · ${hover.name}` : picked ? 'ESC · RETURN' : 'DRAG · ROTATE'}</span>
        </div>

        {/* Top bar */}
        <div className="absolute inset-x-0 top-16 md:top-20 z-10 px-5 md:px-8 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <button onClick={() => go('/objects', 'sections', 'OBJECTS')} className="meta self-start opacity-80 hover:opacity-100">← Objects / {v.name}</button>
          <div role="tablist" aria-label="View mode" className="flex flex-wrap gap-1">
            {MODES.map((m, i) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setPicked(null);
                  setCompare(false);
                }}
                className={cn('relative meta px-3 py-2 transition-colors', mode === m ? 'text-primary-foreground' : 'opacity-70 hover:opacity-100')}
              >
                {mode === m && <motion.span layoutId="mode-pill" className="absolute inset-0 bg-primary" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <span className="relative">
                  <span className="opacity-50 mr-1">{i + 1}</span>
                  {m}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-4 meta">
            <button onClick={() => { setPicked(null); setNonce((n) => n + 1); }} className="opacity-80 hover:opacity-100">⟲ Recenter</button>
            {id === 'M01' && (
              <button onClick={() => { setCompare((c) => !c); setPicked(null); }} className={cn('hover:opacity-100', compare ? 'text-primary' : 'opacity-80')}>
                {compare ? '● Comparing M02' : 'Compare M02'}
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="pointer-events-none absolute left-5 md:left-8 bottom-6 md:bottom-8 z-10">
          <motion.div key={mode} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
            <Meta className="opacity-70">{v.descriptor} — {model.partCount.toLocaleString()} parts · view {mode.toLowerCase()}</Meta>
          </motion.div>
          <h1 className="display text-[22vw] md:text-[13vw] leading-[0.8]">{v.name}</h1>
        </div>

        {/* Right panel */}
        <div className="absolute right-5 md:right-8 bottom-6 md:bottom-8 z-10 w-[min(340px,calc(100vw-2.5rem))]">
          <AnimatePresence mode="wait">
            {picked ? (
              <motion.div key="part" initial={{ clipPath: 'inset(0 0 100% 0)' }} animate={{ clipPath: 'inset(0 0 0% 0)' }} exit={{ clipPath: 'inset(100% 0 0 0)' }} transition={{ duration: 0.5, ease: EASE }} className="bg-background text-foreground p-5 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <Meta className="text-primary">{picked.number}</Meta>
                  <button onClick={() => setPicked(null)} className="meta opacity-60 hover:opacity-100" aria-label="Close part">Esc ✕</button>
                </div>
                <h2 className="text-2xl font-semibold leading-tight">{picked.name}</h2>
                <PartDiagram id={id} part={picked} />
                <p className="text-sm text-muted-foreground leading-relaxed">{picked.group.note}</p>
                <dl className="grid grid-cols-2 gap-2 border-t border-border pt-3">
                  {[
                    ['Assembly', picked.group.assembly],
                    ['System', SYSTEM_LABELS[picked.group.system]],
                    ['Stage', `${String(picked.group.stage + 1).padStart(2, '0')} ${STAGES[picked.group.stage]}`],
                    ['Family', `${picked.index + 1} of ${picked.group.instances.length}`],
                  ].map(([a, b]) => (
                    <div key={a}>
                      <dt className="meta text-muted-foreground">{a}</dt>
                      <dd className="text-sm">{b}</dd>
                    </div>
                  ))}
                </dl>
              </motion.div>
            ) : compare ? (
              <motion.div key="cmp" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="bg-background text-foreground p-5 flex flex-col gap-4">
                <Meta className="text-muted-foreground">M01 vs M02 — concept figures</Meta>
                {v.specs.slice(0, 5).map((s, i) => {
                  const o = m2.specs[i];
                  const max = Math.max(s.value, o.value);
                  return (
                    <div key={s.label} className="flex flex-col gap-1">
                      <Meta>{s.label}</Meta>
                      {[[v.name, s.value], [m2.name, o.value]].map(([n, val]) => (
                        <div key={String(n)} className="flex items-center gap-2">
                          <span className="meta w-7">{n}</span>
                          <div className="flex-1 h-1.5 bg-muted"><motion.div className={n === 'M01' ? 'h-full bg-primary' : 'h-full bg-foreground'} initial={{ width: 0 }} animate={{ width: `${(Number(val) / max) * 100}%` }} transition={{ duration: 1, ease: EASE }} /></div>
                          <span className="meta w-16 text-right tabular-nums">{Number(val).toLocaleString()} {s.unit}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div key="spec" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.5, ease: EASE }} className="flex flex-col gap-4">
                <Meta className="opacity-60">Concept specifications — fictional</Meta>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {v.specs.map((s) => (
                    <div key={s.label}>
                      <dt className="meta opacity-60">{s.label}</dt>
                      <dd className="text-3xl md:text-4xl font-semibold tracking-tight"><Counter value={s.value} decimals={s.decimals ?? 0} /><span className="text-sm font-normal opacity-60 ml-1">{s.unit}</span></dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-current/20 pt-3 meta">
                  <button onClick={() => setGear((g) => !g)} className={gear ? 'text-primary' : 'opacity-70'}>Gear {gear ? 'down' : 'up'}</button>
                  <button onClick={() => setFlaps((f) => (f === 0 ? 0.5 : f === 0.5 ? 1 : 0))} className={flaps ? 'text-primary' : 'opacity-70'}>Flaps {Math.round(flaps * 32)}°</button>
                  <button onClick={() => setSpin((s) => !s)} className={spin ? 'text-primary' : 'opacity-70'}>Engines {spin ? 'run' : 'off'}</button>
                  <button onClick={() => setLights((s) => !s)} className={lights ? 'text-primary' : 'opacity-70'}>Lights {lights ? 'on' : 'off'}</button>
                </div>
                <Meta className="opacity-50">Click any part to isolate it · keys 1–6 switch views</Meta>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <section className="px-5 md:px-8 py-20 grid grid-cols-1 md:grid-cols-12 gap-8 bg-foreground text-background">
        <Meta className="md:col-span-2 opacity-60">Object notes</Meta>
        <div className="md:col-span-6 flex flex-col gap-6">
          <p className="text-2xl md:text-3xl leading-snug tracking-tight">
            {v.name} is drawn as one continuous idea: a wing that sets the proportions, a fuselage that follows it, and {model.partCount.toLocaleString()} parts that each have a number, a stage and a reason.
          </p>
          <div className="flex flex-wrap gap-3">
            <PressButton onClick={() => go('/foundry', 'sections', 'FOUNDRY')}>See it assembled →</PressButton>
            <PressButton variant="line" onClick={() => go('/configure', 'sections', 'CONFIGURE')}>Request a proposal</PressButton>
          </div>
        </div>
        <dl className="md:col-span-4 grid grid-cols-2 gap-4">
          {STAGES.map((s, i) => (
            <div key={s} className="border-t border-background/20 pt-2">
              <dt className="meta opacity-60">{String(i + 1).padStart(2, '0')} {s}</dt>
              <dd className="text-xl tabular-nums">{model.stageCounts[i].toLocaleString()}</dd>
            </div>
          ))}
        </dl>
      </section>
      <NextRoom current="m01" dark />
    </div>
  );
}
