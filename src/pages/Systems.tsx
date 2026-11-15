import { useMemo, useState } from 'react';
import { Html, Line } from '@react-three/drei';
import { AnimatePresence, motion } from 'framer-motion';
import Stage, { type Pose } from '../model/Stage';
import Aircraft from '../model/Aircraft';
import { getAircraft } from '../model/generator';
import { VARIANTS } from '../model/variants';
import { SYSTEM_LABELS, type SystemKey } from '../model/types';
import { partPoint } from '../model/partPoint';
import { Meta, EASE, Counter } from '../components/kit';
import { NextRoom } from '../components/NextRoom';
import { cn } from '@project/components/lib/utils';

const ORDER: SystemKey[] = ['airframe', 'propulsion', 'controls', 'avionics', 'electrical', 'hydraulics', 'fuel', 'gear'];
const INFO: Record<SystemKey, { pose: Pose; text: string }> = {
  airframe: { pose: { position: [60, 40, 62], target: [0, 0, 0], fov: 34 }, text: 'Frames, stringers, spars and ribs. A semi-monocoque shell in carbon and aluminium–lithium that carries every load to the wing box.' },
  propulsion: { pose: { position: [30, 6, 36], target: [2, -3, 8], fov: 34 }, text: 'Two geared turbofans, bypass ratio 14:1 (concept). Each is 388 parts from spinner to exhaust plug.' },
  controls: { pose: { position: [0.01, 150, 10], target: [0, 0, 0], fov: 28 }, text: 'Fly-by-wire primary and secondary surfaces — slats, flaps, ailerons, spoilers, elevators, rudder — on electro-hydrostatic actuators.' },
  avionics: { pose: { position: [44, 6, 16], target: [26, -1, 0], fov: 32 }, text: 'Integrated modular avionics in the nose bay, quadruplex flight-control computers and a sensor suite of antennas and air-data ports.' },
  electrical: { pose: { position: [36, 30, 40], target: [0, 1, 0], fov: 34 }, text: 'More-electric architecture: engine-driven generators, high-voltage DC distribution and segregated wire routes A and B.' },
  hydraulics: { pose: { position: [20, -8, 44], target: [-2, -3, 6], fov: 34 }, text: 'Three independent 5,000 psi systems — green, blue and yellow — now limited to gear and the highest-load surfaces.' },
  fuel: { pose: { position: [0.01, 120, 4], target: [0, 0, 0], fov: 32 }, text: 'Integral wing tanks between the spars, boost pumps, a refuel gallery and double-walled feed lines into each pylon.' },
  gear: { pose: { position: [22, -4.5, 34], target: [4, -4, 0], fov: 36 }, text: 'A two-wheel nose gear and two six-wheel bogies with electric carbon brakes. Retracts in eight seconds (concept).' },
  cabin: { pose: { position: [20, 20, 30], target: [0, 0, 0], fov: 34 }, text: '' },
};

const E = VARIANTS.M01.engines[0];
const STOPS = [
  { n: 'FAN', x: E.x - 0.75, text: '22 hollow titanium blades. 90% of the thrust is moved here, around the core, not through it.' },
  { n: 'COMPRESSOR', x: E.x - 3.3, text: 'Three booster stages, nine high-pressure stages. Air leaves 22 times denser than it arrived (concept).' },
  { n: 'COMBUSTOR', x: E.x - 4.75, text: 'An annular lean-burn chamber fed by 18 premixing nozzles. Flame held without touching the walls.' },
  { n: 'TURBINE', x: E.x - 6.0, text: 'Two HP and four LP stages extract the energy that drives the compressor and fan.' },
  { n: 'EXHAUST', x: E.x - 8.6, text: 'Core flow leaves through an Inconel nozzle around a ceramic plug. The bypass stream wraps it.' },
];

function Annotations({ system }: { system: SystemKey }) {
  const model = getAircraft('M01');
  const anchors = useMemo(() => {
    const seen = new Set<string>();
    return model.groups
      .filter((g) => g.system === system && !seen.has(g.label) && seen.add(g.label))
      .slice(0, 6)
      .map((g) => ({ label: g.label, n: g.instances.length, p: partPoint(g, Math.floor(g.instances.length / 2)) }));
  }, [model, system]);
  const hub = anchors[0]?.p;
  return (
    <group>
      {anchors.map((a, i) => (
        <group key={a.label}>
          {hub && i > 0 && <Line points={[hub, a.p]} color="#B34A32" lineWidth={1} dashed dashSize={0.6} gapSize={0.4} />}
          <Html position={a.p} zIndexRange={[20, 0]}>
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.12 }} className="flex items-center gap-2 -translate-y-1/2 pointer-events-none">
              <span className="block w-2 h-2 rounded-full bg-primary" />
              <span className="block w-6 h-px bg-secondary-foreground/70" />
              <span className="meta whitespace-nowrap bg-secondary text-secondary-foreground px-1.5 py-0.5 border border-secondary-foreground/20">{a.label} ×{a.n}</span>
            </motion.div>
          </Html>
        </group>
      ))}
    </group>
  );
}

export default function Systems() {
  const model = getAircraft('M01');
  const [sys, setSys] = useState<SystemKey>('propulsion');
  const [stop, setStop] = useState(0);
  const counts = useMemo(() => {
    const c = {} as Record<SystemKey, number>;
    model.groups.forEach((g) => (c[g.system] = (c[g.system] ?? 0) + g.instances.length));
    return c;
  }, [model]);
  const s = STOPS[stop];
  const enginePose: Pose = { position: [s.x + 1.6, E.y + 1.4, E.z + 3.4 + (stop === 0 ? 1.5 : 0)], target: [s.x, E.y, E.z], fov: 40 };

  return (
    <div className="bp-grid text-secondary-foreground">
      <section className="relative h-[100svh] min-h-[680px] overflow-hidden">
        <Stage className="absolute inset-0" pose={INFO[sys].pose} tone="blueprint" zoom={false}>
          <Aircraft variant="M01" focusSystem={sys} controls={{ spin: sys === 'propulsion' ? 0.6 : 0, lights: sys === 'electrical' ? 1 : 0.2, flaps: sys === 'controls' ? 0.7 : 0, roll: sys === 'controls' ? 0.5 : 0, gear: 1 }} />
          <Annotations system={sys} />
        </Stage>
        <div className="absolute left-5 md:left-8 top-24 z-10 flex flex-col gap-1 w-64">
          <Meta className="opacity-60 mb-2">03 / Systems map</Meta>
          {ORDER.map((k) => (
            <button key={k} onClick={() => setSys(k)} className={cn('group flex justify-between items-baseline py-1 text-left transition-all', sys === k ? 'text-primary pl-2' : 'opacity-70 hover:opacity-100')} aria-pressed={sys === k}>
              <span className="display text-xl md:text-2xl">{sys === k ? '● ' : ''}{SYSTEM_LABELS[k].toUpperCase()}</span>
              <span className="meta tabular-nums">{counts[k] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="absolute right-5 md:right-8 bottom-8 z-10 max-w-sm">
          <AnimatePresence mode="wait">
            <motion.div key={sys} initial={{ clipPath: 'inset(0 100% 0 0)' }} animate={{ clipPath: 'inset(0 0% 0 0)' }} exit={{ clipPath: 'inset(0 0 0 100%)' }} transition={{ duration: 0.55, ease: EASE }} className="bg-secondary/90 border border-secondary-foreground/20 p-5 flex flex-col gap-3">
              <Meta className="text-primary">{SYSTEM_LABELS[sys]} — <Counter value={counts[sys] ?? 0} /> parts</Meta>
              <p className="text-sm leading-relaxed">{INFO[sys].text}</p>
              <Meta className="opacity-50">Illustrative — not engineering data</Meta>
            </motion.div>
          </AnimatePresence>
        </div>
        <h1 className="absolute left-5 md:left-8 bottom-6 z-10 display text-[16vw] md:text-[9vw] leading-[0.8] opacity-90 pointer-events-none">SYSTEMS</h1>
      </section>

      <section className="relative h-[100svh] min-h-[640px] overflow-hidden bg-foreground text-background">
        <Stage className="absolute inset-0" pose={enginePose} tone="dark" orbit={false} rigSpeed={1.6}>
          <Aircraft variant="M01" exclude={(g) => g.assembly !== 'Engine 1'} controls={{ cut: 1, spin: 0.5 }} />
        </Stage>
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/30 to-transparent pointer-events-none" />
        <div className="relative z-10 h-full flex flex-col justify-between px-5 md:px-8 pt-24 pb-8 max-w-xl">
          <div>
            <Meta className="opacity-60">Engine passage — cutaway turbofan</Meta>
            <h2 className="display text-[14vw] md:text-[7vw] leading-[0.85] mt-2">{s.n}</h2>
            <AnimatePresence mode="wait">
              <motion.p key={stop} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="mt-4 text-lg leading-relaxed opacity-85">
                {s.text}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex gap-1" role="tablist" aria-label="Engine stages">
              {STOPS.map((st, i) => (
                <button key={st.n} role="tab" aria-selected={stop === i} onClick={() => setStop(i)} className={cn('flex-1 text-left pt-2 border-t-2 meta transition-colors', stop === i ? 'border-primary text-primary' : 'border-background/25 opacity-70 hover:opacity-100')}>
                  {String(i + 1).padStart(2, '0')} {st.n}
                </button>
              ))}
            </div>
            <div className="flex gap-4 meta">
              <button onClick={() => setStop((s) => Math.max(0, s - 1))} disabled={stop === 0} className="disabled:opacity-30">← Upstream</button>
              <button onClick={() => setStop((s) => Math.min(STOPS.length - 1, s + 1))} disabled={stop === STOPS.length - 1} className="disabled:opacity-30">Downstream →</button>
              <span className="opacity-50 ml-auto">Illustrative — not engineering data</span>
            </div>
          </div>
        </div>
      </section>
      <NextRoom current="systems" dark />
    </div>
  );
}
