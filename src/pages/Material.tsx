import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Stage, { type Pose } from '../model/Stage';
import Aircraft from '../model/Aircraft';
import { SKINS, type SkinKey } from '../model/materials';
import { Meta, PressButton, EASE } from '../components/kit';
import { NextRoom } from '../components/NextRoom';
import { cn } from '@project/components/lib/utils';

const KEYS: SkinKey[] = ['titanium', 'aluminium', 'carbon', 'ceramic', 'polymer', 'paint'];
const LIGHT: Record<SkinKey, string> = { titanium: '#ffe2c4', aluminium: '#e6f0ff', carbon: '#fff4e6', ceramic: '#fff7ea', polymer: '#ffeedd', paint: '#fff4e6' };
const MACRO: Record<SkinKey, React.CSSProperties> = {
  titanium: { background: 'repeating-linear-gradient(90deg, #a9a59a 0 1px, #c3bfb4 1px 3px, #b3afa4 3px 4px), radial-gradient(circle at 30% 30%, rgba(255,255,255,.35), transparent 60%)', backgroundBlendMode: 'overlay' },
  aluminium: { background: 'linear-gradient(115deg, #9aa0a6 0%, #e9edf0 22%, #b8bec3 40%, #f4f6f7 58%, #a5abb0 80%, #dfe3e6 100%), repeating-linear-gradient(0deg, rgba(0,0,0,.05) 0 1px, transparent 1px 2px)', backgroundBlendMode: 'multiply' },
  carbon: { backgroundImage: 'url(https://images.fillout.com/924528/ewywqhgymh/generated-images/qu2b3XikNGF97P2CFnrbV3/img_5J_GoZeyoXDnb9uM.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' },
  ceramic: { background: 'repeating-radial-gradient(circle at 40% 60%, #e6e1d5 0 2px, #dcd6c8 2px 3px, #ebe6db 3px 5px)' },
  polymer: { background: 'linear-gradient(160deg, #e3d9c8, #cfc3b0 45%, #e8dfd0 70%, #c9bda9), repeating-linear-gradient(45deg, rgba(0,0,0,.03) 0 2px, transparent 2px 6px)', backgroundBlendMode: 'multiply' },
  paint: { background: 'radial-gradient(circle at 35% 30%, #ffffff, #ecebe5 45%, #d8d6cf)' },
};
const LAYERS: Record<SkinKey, [string, number][]> = {
  titanium: [['Ti-6Al-4V sheet', 3], ['Anodic oxide', 0.4], ['Primer', 0.6]],
  aluminium: [['Clad layer', 0.5], ['Al-Li 2198 core', 3], ['Clad layer', 0.5], ['Chromate-free primer', 0.6]],
  carbon: [['Lightning mesh', 0.4], ['0° ply', 0.8], ['±45° plies', 1.4], ['90° ply', 0.8], ['±45° plies', 1.4], ['Peel ply', 0.3]],
  ceramic: [['YSZ top coat', 2], ['Thermally grown oxide', 0.3], ['MCrAlY bond coat', 0.8], ['Superalloy substrate', 2]],
  polymer: [['PEEK skin', 1.4], ['Glass-fibre scrim', 0.6], ['PEEK core', 2]],
  paint: [['Clear coat', 0.6], ['MORROW white basecoat', 0.8], ['Primer', 0.6], ['CFRP skin', 3]],
};

export default function Material() {
  const [skin, setSkin] = useState<SkinKey>('carbon');
  const [macro, setMacro] = useState(false);
  const s = SKINS[skin];
  const pose: Pose = macro ? { position: [-2.4, 1.0, 13.2], target: [-3.6, -0.1, 14.6], fov: 26 } : { position: [46, 14, 58], target: [0, -1, 0], fov: 30 };
  const total = LAYERS[skin].reduce((n, [, t]) => n + t, 0);
  return (
    <div className="bg-foreground text-background">
      <section className="relative h-[100svh] min-h-[680px] overflow-hidden">
        <Stage className="absolute inset-0" pose={pose} tone="dark" orbit={!macro} zoom={false} rigSpeed={macro ? 1.4 : 1.8}>
          <directionalLight position={[-20, 30, 40]} intensity={1.6} color={LIGHT[skin]} />
          <Aircraft variant="M01" lite skin={skin} controls={{ spin: 0.3 }} />
        </Stage>
        <AnimatePresence>
          {macro && (
            <motion.div
              key={skin}
              className="absolute inset-0 z-[5]"
              style={MACRO[skin]}
              initial={{ clipPath: 'circle(0% at 50% 50%)', scale: 1.4 }}
              animate={{ clipPath: 'circle(42% at 50% 50%)', scale: 1 }}
              exit={{ clipPath: 'circle(0% at 50% 50%)', scale: 1.2 }}
              transition={{ duration: 1.1, ease: EASE, delay: 0.6 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/40 mix-blend-overlay" />
            </motion.div>
          )}
        </AnimatePresence>
        {macro && (
          <motion.svg className="absolute inset-0 z-[6] w-full h-full pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
            <circle cx="50%" cy="50%" r="42.2%" fill="none" stroke="#E9E6DE" strokeOpacity="0.5" strokeWidth="1" />
            <line x1="50%" y1="8%" x2="50%" y2="14%" stroke="#B34A32" strokeWidth="1" />
            <text x="51%" y="11%" className="font-mono" fontSize="11" fill="#E9E6DE">×240 — {s.code}</text>
          </motion.svg>
        )}
        <div className="pointer-events-none absolute inset-0 z-[7] bg-gradient-to-r from-foreground/85 via-foreground/20 to-transparent" />
        <div className="absolute z-10 left-5 md:left-8 top-24 bottom-8 flex flex-col justify-between max-w-md">
          <div className="flex flex-col gap-1">
            <Meta className="opacity-60 mb-2">04 / Material</Meta>
            {KEYS.map((k) => (
              <button key={k} onClick={() => setSkin(k)} aria-pressed={skin === k} className={cn('text-left display text-2xl md:text-4xl transition-all duration-500', skin === k ? 'text-primary translate-x-2' : 'opacity-40 hover:opacity-80')}>
                {SKINS[k].label.toUpperCase()}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={skin} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5, ease: EASE }} className="flex flex-col gap-3">
              <Meta className="text-primary">{s.code} · density {s.density}</Meta>
              <p className="text-base leading-relaxed opacity-85">{s.note}</p>
              <div className="pointer-events-auto flex gap-2">
                <PressButton onClick={() => setMacro((m) => !m)}>{macro ? '↑ Return to aircraft' : 'Dive to macro ↓'}</PressButton>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="absolute z-10 right-5 md:right-8 bottom-8 w-72 hidden md:flex flex-col gap-2">
          <Meta className="opacity-60">Cross-section — not to scale</Meta>
          <div className="flex flex-col border border-background/20">
            {LAYERS[skin].map(([n, t], i) => (
              <motion.div key={`${skin}-${i}`} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, ease: EASE, delay: i * 0.07 }} style={{ height: `${(t / total) * 120}px`, originX: 0 }} className={cn('flex items-center px-2 border-b border-background/15 last:border-0', i % 2 ? 'bg-background/10' : 'bg-background/[0.04]')}>
                <span className="meta text-[9px] opacity-80 truncate">{n}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <section className="px-5 md:px-8 py-20 grid grid-cols-2 md:grid-cols-6 gap-px bg-background/10">
        {KEYS.map((k) => (
          <button key={k} onClick={() => { setSkin(k); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="group bg-foreground p-4 text-left flex flex-col gap-3">
            <div className="aspect-square overflow-hidden" style={MACRO[k]}>
              <div className="w-full h-full transition-transform duration-700 group-hover:scale-110" style={MACRO[k]} />
            </div>
            <Meta>{SKINS[k].label}</Meta>
            <Meta className="opacity-50">{SKINS[k].code}</Meta>
          </button>
        ))}
      </section>
      <NextRoom current="material" dark />
    </div>
  );
}
