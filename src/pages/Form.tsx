import { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import Stage from '../model/Stage';
import Aircraft from '../model/Aircraft';
import { Meta, MaskImage, SideSVG, PlanformSVG, EASE } from '../components/kit';
import { NextRoom } from '../components/NextRoom';
import { airfoilLoop } from '../model/geom';

function TypeToOutline() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const squash = useTransform(scrollYProgress, [0, 0.55], [1, 0.08]);
  const stretch = useTransform(scrollYProgress, [0, 0.55], [1, 1.35]);
  const typeOpacity = useTransform(scrollYProgress, [0.4, 0.6], [1, 0]);
  const draw = useTransform(scrollYProgress, [0.35, 0.9], [0, 1]);
  const svgOpacity = useTransform(scrollYProgress, [0.3, 0.45], [0, 1]);
  const caption = useTransform(scrollYProgress, [0.75, 0.95], [0, 1]);
  return (
    <section ref={ref} className="relative" style={{ height: '280vh' }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden flex flex-col justify-center px-5 md:px-8">
        <Meta className="text-muted-foreground mb-6">02 / Form — essay, 6 min</Meta>
        <motion.h1 className="display text-[22vw] md:text-[16vw] leading-[0.8] origin-left" style={{ scaleY: squash, scaleX: stretch, opacity: typeOpacity }}>
          FORM
        </motion.h1>
        <motion.div className="display text-[9vw] md:text-[6vw] leading-[0.9] mt-2" style={{ opacity: typeOpacity }}>
          FOLLOWS FLIGHT.
        </motion.div>
        <motion.div className="absolute inset-x-5 md:inset-x-8 top-1/2 -translate-y-1/2" style={{ opacity: svgOpacity }}>
          <SideSVG className="w-full h-[46vh] text-foreground" progress={draw} />
        </motion.div>
        <motion.div className="absolute left-5 md:left-8 bottom-8 flex gap-10" style={{ opacity: caption }}>
          <Meta>Fig. 02.1 — M01 side elevation</Meta>
          <Meta className="text-muted-foreground">The word becomes the line; the line becomes the object.</Meta>
        </motion.div>
      </div>
    </section>
  );
}

function OutlineToObject() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [p, setP] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => setP(Math.round(v * 200) / 200));
  const t = Math.min(1, Math.max(0, (p - 0.1) / 0.7));
  const pos: [number, number, number] = [Math.sin(t * 1.1) * 70, 2 + t * 24, Math.cos(t * 1.1) * 150 - t * 60];
  const steps = [
    ['Orthographic', 'We begin in elevation: a single side view, drawn until every curve is earned.'],
    ['Extrusion', 'Sections are lofted along the line. The drawing gains thickness and edge.'],
    ['Surface', 'Light arrives. The object takes its skin, its weight and its shadow.'],
  ];
  const idx = Math.min(2, Math.floor(t * 3));
  return (
    <section ref={ref} className="relative" style={{ height: '320vh' }}>
      <div className={`sticky top-0 h-[100svh] overflow-hidden transition-colors duration-700 ${t < 0.4 ? 'bp-grid text-secondary-foreground' : 'bg-background'}`}>
        <Stage className="absolute inset-0" pose={{ position: pos, target: [0, -1, 0], fov: 24 - t * 4 }} orbit={false} tone={t < 0.4 ? 'blueprint' : 'light'} rigSpeed={6}>
          <Aircraft variant="M01" controls={{ blueprint: 1 - Math.min(1, t * 1.4), spin: t > 0.8 ? 0.6 : 0, gear: 1 }} instant={!!reduce} damping={6} />
        </Stage>
        <div className="absolute left-5 md:left-8 bottom-8 md:bottom-12 max-w-md z-10">
          <Meta className="opacity-70">Fig. 02.2 — From outline to object · {Math.round(t * 100)}%</Meta>
          <motion.div key={idx} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
            <h2 className="display text-5xl md:text-7xl mt-2">{steps[idx][0].toUpperCase()}</h2>
            <p className="mt-3 text-base leading-relaxed opacity-80">{steps[idx][1]}</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function AirfoilDiagram() {
  const loop = airfoilLoop(0, 1, 40, 0.12);
  const d = 'M' + loop.map(([x, y]) => `${(x * 100).toFixed(2)},${(-y * 100).toFixed(2)}`).join(' L') + ' Z';
  return (
    <svg viewBox="-5 -15 110 30" className="w-full" aria-hidden>
      <line x1="-5" x2="105" y1="0" y2="0" stroke="currentColor" strokeWidth="0.15" strokeDasharray="1 1" opacity="0.5" />
      <motion.path d={d} fill="none" stroke="currentColor" strokeWidth="0.35" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 2, ease: EASE }} />
      {[0.12, 0.7].map((x) => (
        <line key={x} x1={x * 100} x2={x * 100} y1="-12" y2="12" stroke="hsl(var(--primary))" strokeWidth="0.25" />
      ))}
      <text x="12" y="-13" fontSize="2.6" className="font-mono" fill="currentColor">FRONT SPAR 12%</text>
      <text x="70" y="-13" fontSize="2.6" className="font-mono" fill="currentColor">REAR SPAR 70%</text>
    </svg>
  );
}

export default function Form() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const crop = useTransform(scrollYProgress, [0, 0.5, 1], ['inset(18% 30% 18% 30%)', 'inset(0% 0% 0% 0%)', 'inset(10% 0% 10% 0%)']);
  const zoom = useTransform(scrollYProgress, [0, 1], [1.3, 1]);
  return (
    <div className="bg-background">
      <TypeToOutline />

      <section className="px-5 md:px-8 py-24 md:py-32 grid grid-cols-12 gap-6 items-center">
        <MaskImage src="https://images.fillout.com/924528/ewywqhgymh/generated-images/wChuJX1vJztVh6obmnF9ir/img_AuOJxkloCB4VHbLc.jpg" alt="Ink drawing of a supercritical airfoil section on ivory paper" className="col-span-12 md:col-span-7 aspect-[4/3]" focal="40% 50%" />
        <div className="col-span-12 md:col-span-4 md:col-start-9 flex flex-col gap-6">
          <Meta className="text-muted-foreground">I. The section</Meta>
          <p className="text-2xl md:text-3xl leading-snug tracking-tight">A wing is a sentence written in pressure. We draw it a thousand times before we let it carry anything.</p>
          <p className="text-muted-foreground leading-relaxed">The M-series section is flat-topped and aft-loaded: it lets air accelerate across the crown without a shock, so the wing can be thinner, lighter and faster for the same lift.</p>
          <AirfoilDiagram />
        </div>
      </section>

      <OutlineToObject />

      <section className="px-5 md:px-8 py-24 md:py-32 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            ['Proportion', 'Span is 0.95 of length. The tail is sized by the wing, never the other way round.', <PlanformSVG key="p" className="w-full h-48 text-foreground" highlight="wing" />],
            ['Geometry', 'Sweep of 33° at the leading edge. A straight inboard trailing edge for the flap; a raked tip for the vortex.', <PlanformSVG key="g" className="w-full h-48 text-foreground" highlight="tail" id="M03" />],
            ['Surface', 'One continuous curvature from radome to tail cone. No step, no seam that the air can read.', <SideSVG key="s" className="w-full h-48 text-foreground" />],
          ].map(([h, p, fig], i) => (
            <motion.div key={String(h)} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.9, ease: EASE, delay: i * 0.12 }} className="flex flex-col gap-4">
              {fig}
              <Meta>0{i + 1} — {h}</Meta>
              <p className="text-muted-foreground leading-relaxed">{p}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section ref={ref} className="relative h-[110vh] overflow-hidden bg-foreground">
        <motion.div className="absolute inset-0" style={{ clipPath: crop }}>
          <motion.img style={{ scale: zoom }} src="https://images.fillout.com/924528/ewywqhgymh/generated-images/t6dF2uAKsJj3dZ8EbE4rP7/img_LvxuT2xjzF21-ZBq.jpg" alt="Raked wingtip against a pale dawn sky" className="h-full w-full object-cover" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute left-5 md:left-8 bottom-10 text-white max-w-2xl">
          <Meta className="opacity-80">Fig. 02.3 — The raked tip, dawn</Meta>
          <p className="display text-[9vw] md:text-[5vw] leading-[0.9] mt-3">THE EDGE IS<br />WHERE IT ENDS<br />QUIETLY.</p>
        </div>
      </section>
      <NextRoom current="form" />
    </div>
  );
}
