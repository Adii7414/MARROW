import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import Stage, { type Pose } from '../model/Stage';
import Aircraft from '../model/Aircraft';
import { VARIANT_LIST, VARIANTS, type VariantId } from '../model/variants';
import { getAircraft } from '../model/generator';
import { Meta, PressButton, EASE, Counter } from '../components/kit';
import { NextRoom } from '../components/NextRoom';
import { useGo } from '../lib/transition';

const SLOTS: Record<VariantId, { p: [number, number, number]; r: number; cam: [number, number, number] }> = {
  M01: { p: [0, 0, 0], r: 0.55, cam: [48, 10, 52] },
  M02: { p: [-72, 0, 48], r: -0.5, cam: [-36, 8, 86] },
  M03: { p: [46, 0, 62], r: 1.15, cam: [76, 22, 92] },
  M04: { p: [-58, 0, -48], r: 2.3, cam: [-20, 30, -2] },
};
const OVERVIEW: Pose = { position: [96, 64, 150], target: [-8, -2, 14], fov: 38 };

function Exhibit({ id, active, dim, onHover, onPick }: { id: VariantId; active: boolean; dim: boolean; onHover: (id: VariantId | null) => void; onPick: (id: VariantId) => void }) {
  const ref = useRef<THREE.Group>(null);
  const slot = SLOTS[id];
  const dy = -6.45 - VARIANTS[id].gear.ground;
  useFrame((_, dt) => {
    if (!ref.current) return;
    const target = slot.r + (active ? 0.35 : 0);
    ref.current.rotation.y += (target - ref.current.rotation.y) * (1 - Math.exp(-dt * 3));
  });
  return (
    <group ref={ref} position={[slot.p[0], slot.p[1] + dy, slot.p[2]]} rotation={[0, slot.r, 0]}>
      <spotLight position={[0, 40 - dy, 0]} angle={0.5} penumbra={0.8} intensity={active ? 2600 : 900} color="#fff1df" distance={120} />
      <Aircraft
        variant={id}
        lite
        isolate={dim ? '__none__' : null}
        controls={{ spin: active ? 1 : 0.15, gear: 1, lights: active ? 1 : 0.2 }}
        onHover={(p) => onHover(p ? id : null)}
        onPick={() => onPick(id)}
      />
    </group>
  );
}

export default function Objects() {
  const go = useGo();
  const [hover, setHover] = useState<VariantId | null>(null);
  const [chosen, setChosen] = useState<VariantId | null>(null);
  const focus = chosen ?? hover;
  const pose = useMemo<Pose>(() => {
    if (!chosen) return OVERVIEW;
    const s = SLOTS[chosen];
    return { position: s.cam, target: [s.p[0], -2, s.p[2]], fov: 30 };
  }, [chosen]);

  const choose = (id: VariantId) => {
    if (chosen) return;
    setChosen(id);
    window.setTimeout(() => go(`/objects/${id}`, 'sections', id), 900);
  };

  return (
    <div className="bg-foreground text-background">
      <section className="relative h-[100svh] min-h-[640px] w-full overflow-hidden" style={{ cursor: hover ? 'pointer' : 'default' }}>
        <Stage className="absolute inset-0" pose={pose} tone="dark" orbit={false} rigSpeed={chosen ? 2.2 : 1.2}>
          {VARIANT_LIST.map((v) => (
            <Exhibit key={v.id} id={v.id} active={focus === v.id} dim={!!focus && focus !== v.id} onHover={setHover} onPick={choose} />
          ))}
          <mesh rotation-x={-Math.PI / 2} position={[0, -6.46, 0]} receiveShadow>
            <planeGeometry args={[600, 600]} />
            <meshStandardMaterial color="#1b1c1b" roughness={0.9} />
          </mesh>
        </Stage>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/10 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-between px-5 md:px-8 pt-24 pb-8 pointer-events-none">
          <div className="flex items-end justify-between">
            <motion.h1 initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1, ease: EASE }} className="display text-[18vw] md:text-[9vw] leading-[0.82]">
              OBJECTS
            </motion.h1>
            <Meta className="opacity-60 hidden md:block">04 aircraft — all concepts, not certified</Meta>
          </div>
          <ul className="pointer-events-auto flex flex-col gap-1 max-w-xl" aria-label="Aircraft">
            {VARIANT_LIST.map((v, i) => {
              const on = focus === v.id;
              return (
                <motion.li key={v.id} initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.8, ease: EASE, delay: 0.3 + i * 0.08 }}>
                  <button
                    onMouseEnter={() => setHover(v.id)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(v.id)}
                    onBlur={() => setHover(null)}
                    onClick={() => choose(v.id)}
                    className="group flex w-full items-baseline gap-4 border-t border-background/15 py-3 text-left"
                  >
                    <motion.span className="display leading-none" animate={{ fontSize: on ? '3.6rem' : '2.2rem', opacity: focus && !on ? 0.35 : 1 }} transition={{ duration: 0.5, ease: EASE }}>
                      {v.name}
                    </motion.span>
                    <span className="meta opacity-70 flex-1">{v.descriptor}</span>
                    <span className="meta opacity-70 tabular-nums">{getAircraft(v.id).partCount.toLocaleString()} parts</span>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="px-5 md:px-8 py-20 md:py-28 grid grid-cols-1 md:grid-cols-4 gap-px bg-background/10">
        {VARIANT_LIST.map((v) => (
          <div key={v.id} className="bg-foreground p-6 flex flex-col gap-6">
            <div className="flex items-baseline justify-between">
              <span className="display text-5xl">{v.name}</span>
              <Meta className="opacity-50">Concept</Meta>
            </div>
            <Meta className="opacity-70">{v.descriptor}</Meta>
            <dl className="grid grid-cols-2 gap-y-4">
              {v.specs.slice(0, 4).map((s) => (
                <div key={s.label}>
                  <dt className="meta opacity-50">{s.label}</dt>
                  <dd className="text-2xl font-semibold">
                    <Counter value={s.value} decimals={s.decimals ?? 0} /> <span className="text-sm opacity-60">{s.unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <PressButton variant="line" onClick={() => go(`/objects/${v.id}`, 'sections', v.id)} className="self-start">Open {v.name} →</PressButton>
          </div>
        ))}
      </section>
      <NextRoom current="objects" dark />
    </div>
  );
}
