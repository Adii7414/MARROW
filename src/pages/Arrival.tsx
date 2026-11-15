import * as THREE from 'three';
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { motion, useReducedMotion } from 'framer-motion';
import Aircraft from '../model/Aircraft';
import { StudioLights } from '../model/Stage';
import { getAircraft } from '../model/generator';
import { STAGES } from '../model/types';
import { Counter, Meta, PressButton, SplitText, EASE, EASE_OUT, PlanformSVG } from '../components/kit';
import { NextRoom } from '../components/NextRoom';
import { ROOMS } from '../lib/rooms';
import { useGo } from '../lib/transition';

const CLOSE = { pos: new THREE.Vector3(38, 0.6, -19), look: new THREE.Vector3(17, -1.2, -5), fov: 26 };
const WIDE = { pos: new THREE.Vector3(58, 16, -62), look: new THREE.Vector3(0, -1.5, 0), fov: 30 };

function DriftCamera({ entered, pointer }: { entered: boolean; pointer: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree() as { camera: THREE.PerspectiveCamera };
  const reduce = useReducedMotion();
  const look = useRef(CLOSE.look.clone());
  const tmp = useRef(new THREE.Vector3());
  useFrame((state, dt) => {
    const T = entered ? WIDE : CLOSE;
    const k = reduce ? 1 : 1 - Math.exp(-dt * (entered ? 1.4 : 2));
    const t = state.clock.elapsedTime;
    const orbit = reduce ? 0 : Math.sin(t * 0.08) * (entered ? 6 : 2.2);
    tmp.current.copy(T.pos).add(new THREE.Vector3(pointer.current.x * 2.5 + orbit, pointer.current.y * 1.5, orbit * 0.6));
    camera.position.lerp(tmp.current, k);
    look.current.lerp(T.look, k);
    camera.lookAt(look.current);
    camera.fov += (T.fov - camera.fov) * k;
    camera.updateProjectionMatrix();
  });
  return null;
}

function SweepLight() {
  const ref = useRef<THREE.DirectionalLight>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime * 0.12;
    ref.current?.position.set(Math.cos(t) * 40, 22 + Math.sin(t * 1.3) * 8, Math.sin(t) * 40);
  });
  return <directionalLight ref={ref} intensity={1.2} color="#ffd9b8" />;
}

export default function Arrival() {
  const go = useGo();
  const reduce = useReducedMotion();
  const total = getAircraft('M01').partCount;
  const [booted, setBooted] = useState(() => sessionStorage.getItem('morrow-booted') === '1');
  const [build, setBuild] = useState(booted ? 8 : 0);
  const [entered, setEntered] = useState(false);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (booted) return;
    const t1 = window.setTimeout(() => setBuild(8), 150);
    const t2 = window.setTimeout(() => {
      setBooted(true);
      sessionStorage.setItem('morrow-booted', '1');
    }, 2100);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [booted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !entered && document.activeElement === document.body) setEntered(true);
    };
    const onScroll = () => window.scrollY > 40 && setEntered(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
    };
  }, [entered]);

  return (
    <div className="bg-background">
      <section
        className="relative h-[100svh] min-h-[620px] w-full overflow-hidden"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          pointer.current = { x: (e.clientX - r.left) / r.width - 0.5, y: -((e.clientY - r.top) / r.height - 0.5) };
        }}
      >
        <div className="absolute inset-0">
          <Canvas dpr={[1, 1.75]} shadows gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }} camera={{ position: CLOSE.pos.toArray(), fov: CLOSE.fov, near: 0.1, far: 900 }} onCreated={({ gl }) => (gl.localClippingEnabled = true)}>
            <StudioLights tone="light" />
            <SweepLight />
            <Aircraft variant="M01" controls={{ build, spin: 0.35, gear: 1, lights: 0.8, flaps: entered ? 0 : 0.25 }} damping={booted ? 3 : 1.9} />
            <DriftCamera entered={entered} pointer={pointer} />
          </Canvas>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/70 via-transparent to-background/60" />

        <div className="relative z-10 flex h-full flex-col justify-between px-5 md:px-8 pt-24 pb-6 md:pb-8 pointer-events-none">
          <div className="relative">
            <SplitText as="h1" text={'THE FUTURE\nIS A FORM.'} show={!entered} delay={booted ? 0.1 : 0.9} className="display text-[17vw] md:text-[12.5vw] leading-[0.82] text-foreground" />
            <motion.div className="absolute left-0 top-0" initial={false} animate={{ opacity: entered ? 1 : 0 }} transition={{ duration: 0.4, delay: entered ? 0.6 : 0 }}>
              <SplitText as="h2" text={'WE MAKE\nMACHINES MOVE.'} show={entered} delay={0.7} className="display text-[13vw] md:text-[8.5vw] leading-[0.85] text-foreground" />
            </motion.div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: EASE_OUT, delay: 1.2 }} className="flex flex-col gap-1">
              <Meta className="text-foreground">M01 / Long-range widebody concept</Meta>
              <Meta className="text-muted-foreground">Fig. 001 — concept only, not certified</Meta>
              <Meta className="text-muted-foreground">
                {booted ? `${total.toLocaleString()} parts — assembled` : <>Assembling — <Counter value={total} duration={1.8} /> / {total.toLocaleString()} parts</>}
              </Meta>
            </motion.div>
            <div className="pointer-events-auto flex gap-3 items-center">
              {!entered ? (
                <PressButton onClick={() => setEntered(true)}>Enter the studio →</PressButton>
              ) : (
                <>
                  <PressButton onClick={() => go('/objects/M01', 'sections', 'M01')}>Explore the object →</PressButton>
                  <PressButton variant="line" onClick={() => go('/foundry', 'sections', 'FOUNDRY')}>Watch it built</PressButton>
                </>
              )}
            </div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="hidden md:flex flex-col items-end gap-1">
              <Meta className="text-muted-foreground">{entered ? 'Scroll to continue ↓' : 'Scroll or press Enter'}</Meta>
              <Meta className="text-muted-foreground">Sound: off · {reduce ? 'Reduced motion' : 'Full motion'}</Meta>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="px-5 md:px-8 py-24 md:py-36 grid grid-cols-12 gap-6 border-t border-border">
        <Meta className="col-span-12 md:col-span-2 text-muted-foreground">Manifesto / 001</Meta>
        <div className="col-span-12 md:col-span-10">
          <SplitText text={'AN AIRCRAFT IS\nARCHITECTURE THAT\nLEAVES THE GROUND.'} className="display text-[8vw] md:text-[5.6vw] leading-[0.92]" stagger={0.012} />
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl">
            {[
              ['Precision', 'Every one of the 2,487 parts in M01 has a number, a stage, a reason. Nothing on the aircraft is decoration.'],
              ['Proportion', 'We draw the wing first. The fuselage follows the wing; the cabin follows the fuselage; the people follow the light.'],
              ['Patience', 'We are an independent house. We build fewer things, and we build them for decades of air.'],
            ].map(([h, p], i) => (
              <motion.div key={h} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.9, ease: EASE, delay: i * 0.1 }} className="flex flex-col gap-3 border-t border-foreground pt-4">
                <Meta>{String(i + 1).padStart(2, '0')} — {h}</Meta>
                <p className="text-[15px] leading-relaxed text-muted-foreground">{p}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-foreground text-background px-5 md:px-8 py-20 md:py-28">
        <div className="flex items-end justify-between mb-10">
          <h2 className="display text-[11vw] md:text-[6vw] leading-[0.85]">THE ROOMS</h2>
          <Meta className="opacity-60 hidden md:block">Seven rooms — one exhibition</Meta>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-background/20">
          {ROOMS.map((r, i) => (
            <motion.button
              key={r.key}
              onClick={() => go(r.path, r.kind, r.label)}
              initial={{ clipPath: 'inset(0 0 100% 0)' }}
              whileInView={{ clipPath: 'inset(0 0 0% 0)' }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: EASE, delay: (i % 4) * 0.08 }}
              className="group relative text-left border-b border-r border-background/20 p-5 min-h-[220px] flex flex-col justify-between overflow-hidden"
            >
              <PlanformSVG className="absolute -right-8 -bottom-8 w-48 h-48 text-background/10 transition-all duration-700 group-hover:text-primary/50 group-hover:rotate-12" draw={false} />
              <Meta className="opacity-60">{r.n}</Meta>
              <div>
                <span className="display text-4xl block transition-transform duration-500 group-hover:translate-x-2">{r.label}</span>
                <Meta className="opacity-60 mt-2 block">{r.blurb}</Meta>
              </div>
            </motion.button>
          ))}
          <button onClick={() => go('/foundry', 'sections', 'FOUNDRY')} className="group text-left border-b border-r border-background/20 p-5 min-h-[220px] flex flex-col justify-between bg-primary text-primary-foreground">
            <Meta>Annex A</Meta>
            <div>
              <span className="display text-4xl block transition-transform duration-500 group-hover:translate-x-2">FOUNDRY →</span>
              <Meta className="mt-2 block opacity-80">{STAGES.length} stages · {total.toLocaleString()} parts</Meta>
            </div>
          </button>
        </div>
      </section>
      <NextRoom current="" dark />
    </div>
  );
}
