import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Stage, { type Pose } from '../model/Stage';
import Aircraft, { type Controls } from '../model/Aircraft';
import type { SystemKey } from '../model/types';
import type { SkinKey } from '../model/materials';
import { Meta, MaskImage, EASE } from '../components/kit';
import { InquiryForm } from '../components/InquiryForm';
import { NextRoom } from '../components/NextRoom';
import { cn } from '@project/components/lib/utils';

const D: { name: string; pose: Pose; text: string; focus?: SystemKey; controls?: Partial<Controls>; skin?: SkinKey; lite?: boolean }[] = [
  { name: 'AERODYNAMICS', pose: { position: [-6, 4, 40], target: [-12, -0.5, 28], fov: 34 }, text: 'Sections, sweep, twist and the raked tip. We draw where the air will go before we draw anything else.', controls: { flaps: 0.6 } },
  { name: 'INDUSTRIAL DESIGN', pose: { position: [48, 3, -14], target: [28, 0, 0], fov: 30 }, text: 'Proportion, surface continuity and the details a passenger touches — from the radome curve to the door handle.' },
  { name: 'PROPULSION', pose: { position: [12, -2.4, 13.2], target: [4.2, -3.15, 10.8], fov: 30 }, text: 'Engine integration: the nacelle, the pylon and the fan, tuned with our propulsion partners (concept).', controls: { spin: 1 } },
  { name: 'AVIONICS', pose: { position: [44, 8, 18], target: [26, -1, 0], fov: 32 }, text: 'Flight-deck architecture, sensors and the integrated modular avionics in the nose bay.', focus: 'avionics' },
  { name: 'MATERIALS', pose: { position: [-1, 2.2, 12], target: [-3, 0, 14], fov: 30 }, text: 'Composites, alloys and coatings — chosen per part, never per programme.', skin: 'carbon' },
  { name: 'SOFTWARE', pose: { position: [40, 30, 44], target: [0, 0, 0], fov: 34 }, text: 'Fly-by-wire control laws, health monitoring and the digital model every one of 2,487 parts is tracked in.', focus: 'electrical' },
  { name: 'MANUFACTURING', pose: { position: [70, 46, 72], target: [0, 0, 0], fov: 34 }, text: 'Assembly sequence, tooling and inspection. Designed to be built, so it is built as designed.', controls: { explode: 0.75 } },
];

export default function Studio() {
  const [i, setI] = useState(2);
  const d = D[i];
  return (
    <div className="bg-background">
      <section className="px-5 md:px-8 pt-28 pb-12 grid grid-cols-12 gap-6 border-b border-border">
        <Meta className="col-span-12 md:col-span-2 text-muted-foreground">07 / Studio</Meta>
        <div className="col-span-12 md:col-span-10">
          <h1 className="display text-[14vw] md:text-[8.5vw] leading-[0.84]">AN INDEPENDENT<br />AEROSPACE<br />DESIGN HOUSE.</h1>
        </div>
      </section>
      <section className="px-5 md:px-8 py-16 grid grid-cols-12 gap-6">
        <MaskImage src="https://images.fillout.com/924528/ewywqhgymh/generated-images/txkCMnfumNWaBkiRfwyUaL/img_g4e4JSyvYbS6KYic.jpg" alt="MORROW studio with a white scale aircraft model on a long table" className="col-span-12 md:col-span-8 aspect-[16/10]" focal="50% 60%" />
        <div className="col-span-12 md:col-span-4 flex flex-col justify-end gap-5">
          <Meta className="text-muted-foreground">Philosophy</Meta>
          <p className="text-2xl leading-snug tracking-tight">We are aerodynamicists, designers and engineers at one long table. We design aircraft the way architects design buildings people will live in for decades.</p>
          <p className="text-muted-foreground leading-relaxed">MORROW is fictional, and so is every aircraft here. The method is real: draw the wing first, earn every curve, number every part.</p>
        </div>
      </section>

      <section className="relative grid grid-cols-1 lg:grid-cols-12 border-y border-border">
        <div className="lg:col-span-5 px-5 md:px-8 py-12 flex flex-col gap-1" role="tablist" aria-label="Disciplines">
          <Meta className="text-muted-foreground mb-4">Disciplines — seven, one object</Meta>
          {D.map((x, k) => (
            <button key={x.name} role="tab" aria-selected={i === k} onMouseEnter={() => setI(k)} onFocus={() => setI(k)} onClick={() => setI(k)} className={cn('text-left display text-3xl md:text-[2.8vw] leading-[1.05] transition-all duration-500', i === k ? 'text-foreground translate-x-2' : 'text-muted-foreground/50 hover:text-muted-foreground')}>
              {x.name} {i === k && <span className="text-primary">→</span>}
            </button>
          ))}
          <AnimatePresence mode="wait">
            <motion.p key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }} className="mt-6 max-w-md text-muted-foreground leading-relaxed">{d.text}</motion.p>
          </AnimatePresence>
        </div>
        <div className="lg:col-span-7 relative h-[60vh] lg:h-auto min-h-[460px] bg-foreground">
          <Stage className="absolute inset-0" pose={d.pose} tone="dark" orbit={false} rigSpeed={1.8}>
            <Aircraft variant="M01" focusSystem={d.focus ?? null} skin={d.skin ?? 'paint'} controls={{ spin: 0.4, ...d.controls }} />
          </Stage>
          <Meta className="absolute left-4 top-4 text-background/70">Live — M01 · {d.name.toLowerCase()}</Meta>
        </div>
      </section>

      <section className="px-5 md:px-8 py-20 grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-4 flex flex-col gap-3">
          <Meta className="text-muted-foreground">Inquire</Meta>
          <h2 className="display text-5xl md:text-6xl leading-[0.9]">WRITE TO<br />THE STUDIO.</h2>
          <Meta className="text-muted-foreground">Concept site — messages are stored, not answered.</Meta>
        </div>
        <div className="col-span-12 md:col-span-7 md:col-start-6">
          <InquiryForm />
        </div>
      </section>
      <NextRoom current="studio" />
    </div>
  );
}
