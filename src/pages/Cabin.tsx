import * as THREE from 'three';
import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Stage, { type Pose } from '../model/Stage';
import Aircraft from '../model/Aircraft';
import { VARIANTS, type SeatBlock } from '../model/variants';
import { seatGeometry, seatLayout, type SeatPos } from '../model/cabin';
import { Meta, PressButton, EASE } from '../components/kit';
import { NextRoom } from '../components/NextRoom';
import { cn } from '@project/components/lib/utils';

const V = VARIANTS.M01;
const FLOOR = -0.24 * V.radius;
const LAYOUTS: Record<string, { label: string; blocks: SeatBlock[] }> = {
  '2-CLASS 312': { label: '2-class · 312 seats', blocks: V.cabin },
  '3-CLASS 268': {
    label: '3-class · 268 seats',
    blocks: [
      { kind: 'business', rows: 5, pitch: 1.95, z: [-2.2, -0.45, 0.45, 2.2] },
      { kind: 'premium', rows: 6, pitch: 0.97, z: [-2.35, -1.85, -0.75, -0.25, 0.25, 0.75, 1.85, 2.35] },
      { kind: 'economy', rows: 20, pitch: 0.81, z: [-2.5, -2.04, -1.58, -0.69, -0.23, 0.23, 0.69, 1.58, 2.04, 2.5] },
    ],
  },
};
type LayoutKey = keyof typeof LAYOUTS;
const SCENES = { DAWN: { c: '#ffb98a', i: 20 }, CRUISE: { c: '#fff1dc', i: 26 }, NIGHT: { c: '#7083ff', i: 8 } };
type Scene = keyof typeof SCENES;

const DOOR_X = V.length / 2 - 0.13 * V.length;
const POSES: Record<string, Pose> = {
  OUTSIDE: { position: [DOOR_X + 6, 0.5, -16], target: [DOOR_X, 0.3, -3], fov: 40 },
  DOOR: { position: [DOOR_X, 0.85, -2.2], target: [DOOR_X - 0.2, 0.75, 2], fov: 62 },
  BUSINESS: { position: [DOOR_X - 1.2, 0.95, -1.2], target: [DOOR_X - 12, 0.4, -0.2], fov: 62 },
  PREMIUM: { position: [DOOR_X - 10.5, 0.95, 1.1], target: [DOOR_X - 20, 0.4, 0], fov: 62 },
  ECONOMY: { position: [DOOR_X - 16, 0.95, -1.15], target: [DOOR_X - 34, 0.5, -1.0], fov: 60 },
  GALLEY: { position: [V.length / 2 - 0.33 * V.length + 1.6, 1.0, 1.2], target: [V.length / 2 - 0.33 * V.length - 2.4, 0.6, -0.4], fov: 60 },
};

function Seats({ layout }: { layout: LayoutKey }) {
  const reduce = useReducedMotion();
  const all = useMemo(() => {
    const out: Record<string, { a: (SeatPos | null)[]; b: (SeatPos | null)[] }> = {};
    const A = seatLayout(V, LAYOUTS['2-CLASS 312'].blocks);
    const B = seatLayout(V, LAYOUTS['3-CLASS 268'].blocks);
    (['business', 'premium', 'economy'] as const).forEach((k) => {
      const a = A.filter((s) => s.kind === k);
      const b = B.filter((s) => s.kind === k);
      const n = Math.max(a.length, b.length);
      out[k] = { a: Array.from({ length: n }, (_, i) => a[i] ?? null), b: Array.from({ length: n }, (_, i) => b[i] ?? null) };
    });
    return out;
  }, []);
  return (
    <>
      {(['business', 'premium', 'economy'] as const).map((k) => (
        <SeatMesh key={k} kind={k} a={all[k].a} b={all[k].b} useB={layout === '3-CLASS 268'} instant={!!reduce} />
      ))}
    </>
  );
}

function SeatMesh({ kind, a, b, useB, instant }: { kind: 'business' | 'premium' | 'economy'; a: (SeatPos | null)[]; b: (SeatPos | null)[]; useB: boolean; instant: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geom = useMemo(() => seatGeometry(kind), [kind]);
  const n = a.length;
  const cur = useRef(Array.from({ length: n }, (_, i) => { const p = a[i]; return p ? { x: p.x, y: FLOOR, z: p.z, s: 1 } : { x: 0, y: FLOOR - 3, z: 0, s: 0 }; }));
  const m = useMemo(() => new THREE.Matrix4(), []);
  const start = useRef(0);
  const last = useRef(useB);
  useFrame((state, dt) => {
    if (!ref.current) return;
    if (last.current !== useB) {
      last.current = useB;
      start.current = state.clock.elapsedTime;
    }
    const el = state.clock.elapsedTime - start.current;
    for (let i = 0; i < n; i++) {
      const t = (useB ? b : a)[i];
      const delay = (i / n) * 0.9;
      const k = instant ? 1 : el < delay ? 0 : 1 - Math.exp(-dt * 6);
      const c = cur.current[i];
      const tx = t ? t.x : c.x;
      const ty = t ? FLOOR : FLOOR - 1.2;
      const tz = t ? t.z : c.z;
      const ts = t ? 1 : 0;
      c.x += (tx - c.x) * k;
      c.z += (tz - c.z) * k;
      c.y += (ty - c.y) * k + (t && Math.abs(tx - c.x) > 0.05 ? (FLOOR + 0.25 - c.y) * k * 0.6 : 0);
      c.s += (ts - c.s) * k;
      m.compose(new THREE.Vector3(c.x, c.y, c.z), new THREE.Quaternion(), new THREE.Vector3(c.s, c.s, c.s));
      ref.current.setMatrixAt(i, m);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[geom, undefined, n]} frustumCulled={false} castShadow>
      <meshStandardMaterial color={kind === 'business' ? '#3a3b39' : kind === 'premium' ? '#6b5a4c' : '#4a4c4a'} roughness={0.85} />
    </instancedMesh>
  );
}

function CabinLights({ scene }: { scene: Scene }) {
  const refs = useRef<(THREE.PointLight | null)[]>([]);
  const col = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    col.set(SCENES[scene].c);
    refs.current.forEach((l) => {
      if (!l) return;
      l.color.lerp(col, 0.06);
      l.intensity += (SCENES[scene].i - l.intensity) * 0.06;
    });
  });
  return (
    <>
      {Array.from({ length: 9 }).map((_, i) => (
        <pointLight key={i} ref={(el) => (refs.current[i] = el)} position={[DOOR_X - 1 - i * 5.2, 1.6, 0]} distance={10} decay={1.4} intensity={24} />
      ))}
    </>
  );
}

export default function Cabin() {
  const [inside, setInside] = useState(false);
  const [zone, setZone] = useState<keyof typeof POSES>('OUTSIDE');
  const [layout, setLayout] = useState<LayoutKey>('2-CLASS 312');
  const [scene, setScene] = useState<Scene>('CRUISE');
  const enter = () => {
    setZone('DOOR');
    window.setTimeout(() => {
      setInside(true);
      setZone('BUSINESS');
    }, 1300);
  };
  const exit = () => {
    setZone('DOOR');
    window.setTimeout(() => {
      setInside(false);
      setZone('OUTSIDE');
    }, 900);
  };
  const zones = layout === '3-CLASS 268' ? ['BUSINESS', 'PREMIUM', 'ECONOMY', 'GALLEY'] : ['BUSINESS', 'ECONOMY', 'GALLEY'];
  return (
    <div className="bg-background">
      <section className="relative h-[100svh] min-h-[640px] overflow-hidden bg-foreground">
        <Stage className="absolute inset-0" pose={POSES[zone]} tone="dark" orbit={!inside} zoom={false} minDistance={0.5} rigSpeed={1.5}>
          <Aircraft variant="M01" exclude={(g) => g.key.startsWith('seats-') || g.key === 'partitions'} controls={{ gear: 1, spin: 0.2, lights: 0.5 }} />
          <mesh position={[0, FLOOR - 0.02, 0]} receiveShadow>
            <boxGeometry args={[V.length * 0.7, 0.04, V.radius * 1.86]} />
            <meshStandardMaterial color="#5a5650" roughness={0.95} />
          </mesh>
          <Seats layout={layout} />
          <CabinLights scene={scene} />
        </Stage>
        <div className={cn('pointer-events-none absolute inset-0 transition-opacity duration-700', inside ? 'bg-gradient-to-t from-black/60 via-transparent to-black/30' : 'bg-gradient-to-r from-foreground/80 to-transparent')} />
        <div className="absolute z-10 left-5 md:left-8 top-24 text-background max-w-md">
          <Meta className="opacity-60">Annex D / Cabin — M01</Meta>
          <h1 className="display text-[14vw] md:text-[7vw] leading-[0.85] mt-1">{inside ? zone : 'STEP INSIDE.'}</h1>
          {!inside && (
            <p className="mt-4 text-base opacity-80 leading-relaxed">Door 1L. The camera walks through it with you: warm ivory panels, cove light, 312 seats placed one by one.</p>
          )}
        </div>
        <div className="absolute z-10 left-5 right-5 md:left-8 md:right-8 bottom-6 flex flex-col md:flex-row md:items-end justify-between gap-4 text-background">
          {!inside ? (
            <PressButton onClick={enter}>Enter through door 1L →</PressButton>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1" role="tablist" aria-label="Cabin zone">
                {zones.map((z) => (
                  <button key={z} role="tab" aria-selected={zone === z} onClick={() => setZone(z as keyof typeof POSES)} className={cn('meta px-3 py-2 border press', zone === z ? 'bg-primary border-primary text-primary-foreground' : 'border-background/30 bg-black/20')}>{z}</button>
                ))}
              </div>
              <button onClick={exit} className="meta self-start opacity-80 hover:opacity-100">← Return outside</button>
            </div>
          )}
          <AnimatePresence>
            {inside && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: EASE }} className="flex flex-col gap-3 md:items-end">
                <div className="flex gap-1" role="radiogroup" aria-label="Configuration">
                  {(Object.keys(LAYOUTS) as LayoutKey[]).map((l) => (
                    <button key={l} role="radio" aria-checked={layout === l} onClick={() => { setLayout(l); if (l === '2-CLASS 312' && zone === 'PREMIUM') setZone('ECONOMY'); }} className={cn('meta px-3 py-2 border press', layout === l ? 'bg-background text-foreground border-background' : 'border-background/30 bg-black/20')}>{l}</button>
                  ))}
                </div>
                <div className="flex gap-1" role="radiogroup" aria-label="Light scene">
                  {(Object.keys(SCENES) as Scene[]).map((s) => (
                    <button key={s} role="radio" aria-checked={scene === s} onClick={() => setScene(s)} className={cn('meta px-3 py-2 border press', scene === s ? 'border-primary text-primary bg-black/30' : 'border-background/30 bg-black/20')}>{s}</button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
      <section className="px-5 md:px-8 py-20 grid grid-cols-1 md:grid-cols-3 gap-10 border-b border-border">
        {[
          ['Seat zones', 'Business suites in 1-2-1 with direct aisle access; economy at 3-4-3 on a 31-inch pitch. A premium cabin can be inserted without moving a monument.'],
          ['Light', 'Full-spectrum LED coves run circadian scenes — dawn amber for arrival, cool cruise white, deep night blue — at 0.1 lux precision.'],
          ['Reconfiguration', 'Continuous titanium seat tracks let airlines re-plan the cabin overnight. Seats slide; partitions follow; nothing is drilled.'],
        ].map(([h, p], i) => (
          <motion.div key={h} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE, delay: i * 0.1 }} className="border-t border-foreground pt-4 flex flex-col gap-3">
            <Meta>0{i + 1} — {h}</Meta>
            <p className="text-muted-foreground leading-relaxed">{p}</p>
          </motion.div>
        ))}
      </section>
      <NextRoom current="cabin" />
    </div>
  );
}
