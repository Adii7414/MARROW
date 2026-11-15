import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion';
import { Search, Play, Pause } from 'lucide-react';
import Stage, { type Pose } from '../model/Stage';
import Aircraft from '../model/Aircraft';
import { getAircraft } from '../model/generator';
import { STAGES, SYSTEM_LABELS, type PartGroup } from '../model/types';
import { partPoint } from '../model/partPoint';
import { Meta, PressButton, EASE } from '../components/kit';
import { NextRoom } from '../components/NextRoom';
import { cn } from '@project/components/lib/utils';

const POSES: Pose[] = [
  { position: [44, 30, 52], target: [0, 0, 0], fov: 34 },
  { position: [52, 16, 40], target: [2, 0, 0], fov: 34 },
  { position: [12, 72, 62], target: [-4, 0, 0], fov: 36 },
  { position: [26, -1, 30], target: [2, -3, 10.8], fov: 32 },
  { position: [26, -3, -40], target: [2, -3, 0], fov: 36 },
  { position: [12, 26, 38], target: [6, -0.5, 0], fov: 34 },
  { position: [56, 6, -46], target: [0, 0, 0], fov: 32 },
  { position: [74, 26, 70], target: [0, -1, 0], fov: 32 },
];
const NOTES = [
  'Frames, keel, floor grid and spars — the skeleton that carries every load.',
  'Barrel skins close over the frames. Doors, windows and the radome seal the shell. Primer only.',
  'Ribs, spars and stringers form the wing box; skins, slats, flaps, spoilers and the tail follow.',
  'Two turbofans assemble from the shaft outward: blades, combustor, cowls, pylons.',
  'Fuel, hydraulics, electrical and avionics are routed. The landing gear is hung.',
  '312 seats, bins, galleys and the flight deck are installed through the doors.',
  'Primer becomes MORROW white. The vermilion cheatline and tail field are applied.',
  'Lights on. Control surfaces exercised. Gear cycled. M01 is complete.',
];

export default function Foundry() {
  const model = getAircraft('M01');
  const reduce = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: track, offset: ['start start', 'end end'] });
  const [build, setBuild] = useState(0);
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState<{ g: PartGroup; i: number } | null>(null);
  const [focusOnly, setFocusOnly] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState<string | null>('Fuselage');
  const [tick, setTick] = useState(0);

  useMotionValueEvent(scrollYProgress, 'change', (p) => setBuild(Math.min(8, Math.round(p * 8.15 * 200) / 200)));
  const stage = Math.min(7, Math.floor(build));

  useEffect(() => {
    if (!playing) return;
    const el = track.current;
    if (!el) return;
    const id = window.setInterval(() => {
      const end = el.offsetTop + el.offsetHeight - window.innerHeight;
      if (window.scrollY >= end - 2) {
        setPlaying(false);
        return;
      }
      window.scrollBy({ top: 6 });
    }, 16);
    return () => window.clearInterval(id);
  }, [playing]);

  useEffect(() => {
    if (stage !== 7 || reduce) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 2200);
    return () => window.clearInterval(id);
  }, [stage, reduce]);

  const jump = (s: number) => {
    const el = track.current;
    if (!el) return;
    const h = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.offsetTop + (h * (s + 0.98)) / 8.15, behavior: reduce ? 'auto' : 'smooth' });
  };

  const placed = useMemo(() => {
    let n = 0;
    model.groups.forEach((g) => {
      const local = Math.min(1, Math.max(0, (build - g.stage - g.phase) / 0.45));
      const c = g.instances.length;
      for (let i = 0; i < c; i++) if (local > (c > 1 ? (i / (c - 1)) * 0.55 : 0)) n++;
    });
    return n;
  }, [build, model]);

  const assemblies = useMemo(() => {
    const m = new Map<string, PartGroup[]>();
    model.groups.forEach((g) => m.set(g.assembly, [...(m.get(g.assembly) ?? []), g]));
    return [...m.entries()];
  }, [model]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: { g: PartGroup; i: number }[] = [];
    for (const g of model.groups) {
      for (let i = 0; i < g.instances.length && out.length < 80; i++) {
        const it = g.instances[i];
        if (it.name.toLowerCase().includes(q) || it.number.toLowerCase().includes(q)) out.push({ g, i });
      }
    }
    return out;
  }, [query, model]);

  const pose = useMemo<Pose>(() => {
    if (sel) {
      const p = partPoint(sel.g, sel.i);
      return { position: [p.x + 10, p.y + 7, p.z + (p.z >= 0 ? 14 : -14)], target: [p.x, p.y, p.z], fov: 32 };
    }
    return POSES[stage];
  }, [stage, sel]);

  const pick = (g: PartGroup, i: number) => {
    setSel({ g, i });
    if (build < g.stage + 1) jump(g.stage);
  };

  return (
    <div className="bg-background">
      <section className="px-5 md:px-8 pt-28 pb-12 grid grid-cols-12 gap-6 border-b border-border">
        <Meta className="col-span-12 md:col-span-2 text-muted-foreground">Annex A / Foundry</Meta>
        <div className="col-span-12 md:col-span-10">
          <h1 className="display text-[15vw] md:text-[9vw] leading-[0.84]">HOW IT<br />IS MADE.</h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            M01 assembles itself from {model.partCount.toLocaleString()} individually modelled, numbered parts, in eight stages. Scroll to build, or jump straight to a stage. Every part can be searched and picked.
          </p>
        </div>
      </section>

      <div ref={track} className="relative" style={{ height: '820vh' }}>
        <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
          <Stage className="absolute inset-0" pose={pose} tone="light" orbit zoom={false} onMissed={() => setSel(null)}>
            <Aircraft
              variant="M01"
              controls={{
                build,
                cut: stage === 5 ? 1 : 0,
                lights: stage >= 7 ? 1 : 0,
                spin: stage >= 7 ? 1 : 0,
                flaps: stage >= 7 ? (tick % 3) / 2 : 0,
                gear: stage >= 7 ? (tick % 4 === 2 ? 0 : 1) : 1,
                roll: stage >= 7 ? Math.sin(tick) * 0.6 : 0,
              }}
              instant={!!reduce}
              focusStage={focusOnly ? stage : null}
              selected={sel ? { key: sel.g.key, index: sel.i } : null}
              onPick={(p) => setSel({ g: p.group, i: p.index })}
            />
          </Stage>

          {/* Header strip */}
          <div className="absolute inset-x-0 top-16 md:top-20 z-10 px-5 md:px-8 flex flex-wrap justify-between gap-2 meta">
            <span>Foundry / M01 assembly</span>
            <span>Stage {String(stage + 1).padStart(2, '0')} of 08 — {STAGES[stage]}</span>
            <span className="tabular-nums">Parts {placed.toLocaleString().padStart(5, '0')} / {model.partCount.toLocaleString()}</span>
          </div>

          {/* Stage index */}
          <nav aria-label="Assembly stages" className="absolute left-5 md:left-8 top-32 z-10 w-60 hidden md:flex flex-col gap-1">
            {STAGES.map((s, i) => {
              const done = build >= i + 1;
              const cur = i === stage && build < 8;
              return (
                <button key={s} onClick={() => jump(i)} className={cn('group text-left meta py-1.5 pl-3 border-l-2 transition-all', cur ? 'border-primary text-foreground pl-4' : done ? 'border-foreground/40 text-muted-foreground' : 'border-transparent text-muted-foreground/70')}>
                  <span className="mr-2">{String(i + 1).padStart(2, '0')}</span>
                  {s} {done && '✓'}
                  <span className="float-right tabular-nums opacity-60">{model.stageCounts[i]}</span>
                </button>
              );
            })}
            <div className="mt-3 h-1 bg-muted relative overflow-hidden">
              <motion.div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${(build / 8) * 100}%` }} />
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setPlaying((p) => !p)} className="meta flex items-center gap-1 border border-foreground px-2 py-1.5 press" aria-label={playing ? 'Pause assembly' : 'Play assembly'}>
                {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />} {playing ? 'Pause' : 'Play'}
              </button>
              <button onClick={() => setFocusOnly((f) => !f)} className={cn('meta border px-2 py-1.5 press', focusOnly ? 'border-primary text-primary' : 'border-foreground')}>
                Isolate stage
              </button>
            </div>
            <motion.p key={stage} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="mt-4 text-sm text-muted-foreground leading-relaxed">
              {NOTES[stage]}
            </motion.p>
          </nav>

          {/* Part tree */}
          <aside className="absolute right-3 md:right-8 top-28 md:top-32 bottom-6 z-10 w-[min(320px,calc(100vw-1.5rem))] flex flex-col bg-background/85 backdrop-blur-sm border border-border">
            <div className="p-3 border-b border-border flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${model.partCount.toLocaleString()} parts — name or number`} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" aria-label="Search parts" />
            </div>
            {sel && (
              <div className="p-3 border-b border-border bg-foreground text-background flex flex-col gap-1">
                <div className="flex justify-between"><Meta className="text-primary">{sel.g.instances[sel.i].number}</Meta><button className="meta opacity-70" onClick={() => setSel(null)}>Clear ✕</button></div>
                <span className="text-sm font-semibold">{sel.g.instances[sel.i].name}</span>
                <span className="text-xs opacity-70 leading-relaxed">{sel.g.note}</span>
                <Meta className="opacity-60">{SYSTEM_LABELS[sel.g.system]} · Stage {sel.g.stage + 1}</Meta>
              </div>
            )}
            <div className="flex-1 overflow-y-auto text-xs font-mono">
              {query.trim().length >= 2 ? (
                results.length ? (
                  results.map(({ g, i }) => (
                    <button key={`${g.key}-${i}`} onClick={() => pick(g, i)} className={cn('w-full text-left px-3 py-1.5 hover:bg-muted flex gap-2', sel?.g === g && sel.i === i && 'bg-muted text-primary')}>
                      <span className="text-muted-foreground w-16 shrink-0">{g.instances[i].number}</span>
                      <span className="truncate">{g.instances[i].name}</span>
                    </button>
                  ))
                ) : (
                  <p className="p-3 text-muted-foreground">No parts match “{query}”.</p>
                )
              ) : (
                assemblies.map(([asm, groups]) => {
                  const count = groups.reduce((n, g) => n + g.instances.length, 0);
                  const isOpen = open === asm;
                  return (
                    <div key={asm} className="border-b border-border/60">
                      <button onClick={() => setOpen(isOpen ? null : asm)} className="w-full flex justify-between px-3 py-2 uppercase tracking-wider hover:bg-muted" aria-expanded={isOpen}>
                        <span>{isOpen ? '▾' : '▸'} {asm}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </button>
                      {isOpen &&
                        groups.map((g) => (
                          <button key={g.key} onClick={() => pick(g, 0)} className={cn('w-full flex justify-between pl-6 pr-3 py-1 text-left hover:bg-muted', sel?.g === g && 'text-primary')}>
                            <span className="truncate">{g.instances[0].number} {g.instances.length > 1 ? g.label : g.instances[0].name}</span>
                            <span className="text-muted-foreground">{g.instances.length > 1 ? `×${g.instances.length}` : ''}</span>
                          </button>
                        ))}
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* mobile stage pills */}
          <div className="md:hidden absolute left-3 right-3 bottom-4 z-10 flex gap-1 overflow-x-auto">
            {STAGES.map((s, i) => (
              <button key={s} onClick={() => jump(i)} className={cn('meta shrink-0 px-2 py-2 border', i === stage ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border')}>{String(i + 1).padStart(2, '0')}</button>
            ))}
          </div>
        </div>
      </div>

      <section className="px-5 md:px-8 py-20 grid grid-cols-1 md:grid-cols-12 gap-8 border-t border-border">
        <Meta className="md:col-span-2 text-muted-foreground">Bill of materials</Meta>
        <div className="md:col-span-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {assemblies.map(([asm, groups]) => (
            <div key={asm} className="border-t border-foreground pt-3">
              <Meta>{asm}</Meta>
              <div className="text-4xl font-semibold tabular-nums mt-1">{groups.reduce((n, g) => n + g.instances.length, 0).toLocaleString()}</div>
              <Meta className="text-muted-foreground">{groups.length} part families</Meta>
            </div>
          ))}
        </div>
        <div className="md:col-start-3 md:col-span-10">
          <PressButton onClick={() => jump(0)} variant="line">Rebuild from stage 01 ↑</PressButton>
        </div>
      </section>
      <NextRoom current="foundry" />
    </div>
  );
}
