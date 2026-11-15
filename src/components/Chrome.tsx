import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ROOMS, ANNEX, roomFor, type Room } from '../lib/rooms';
import { useGo } from '../lib/transition';
import { PlanformSVG, EASE } from './kit';

function Clock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const i = window.setInterval(() => setT(new Date()), 1000);
    return () => window.clearInterval(i);
  }, []);
  return <span className="tabular-nums">{t.toLocaleTimeString('en-GB', { hour12: false })}</span>;
}

export function Header({ onIndex }: { onIndex: () => void }) {
  const { pathname } = useLocation();
  const go = useGo();
  const room = roomFor(pathname);
  return (
    <header className="fixed inset-x-0 top-0 z-50 mix-blend-difference text-[#E9E6DE] pointer-events-none">
      <div className="flex items-center justify-between px-5 md:px-8 py-4 md:py-5">
        <button onClick={() => go('/', 'type', 'MORROW')} className="pointer-events-auto display text-lg md:text-xl tracking-tight" aria-label="MORROW home">
          MORROW<sup className="text-[9px] align-super ml-0.5">®</sup>
        </button>
        <div className="hidden md:flex items-center gap-10 meta">
          <span className="opacity-70">Independent aerospace design house</span>
          <span className="opacity-70">51.4700° N / 0.4543° W — <Clock /></span>
          {room && <span>{room.n} / {room.label}</span>}
        </div>
        <button onClick={onIndex} className="pointer-events-auto meta group flex items-center gap-3 py-2" aria-label="Open index">
          <span>Index</span>
          <span className="flex flex-col gap-[3px]">
            <span className="block h-px w-5 bg-current transition-all group-hover:w-3" />
            <span className="block h-px w-5 bg-current" />
            <span className="block h-px w-5 bg-current transition-all group-hover:w-4" />
          </span>
        </button>
      </div>
    </header>
  );
}

const FOCUS: Record<Room['focus'], 'wing' | 'engine' | 'tail' | 'body' | null> = { wing: 'wing', engine: 'engine', tail: 'tail', body: 'body', nose: 'body', cabin: 'body', all: null };

export function IndexOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const go = useGo();
  const { pathname } = useLocation();
  const [hover, setHover] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const all = [...ROOMS, ...ANNEX];
  const current = roomFor(pathname);

  useEffect(() => {
    if (!open) return;
    const idx = Math.max(0, all.findIndex((r) => r.key === current?.key));
    setHover(idx);
    window.setTimeout(() => refs.current[idx]?.focus(), 450);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setHover((h) => {
          const n = (h + (e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length;
          refs.current[n]?.focus();
          return n;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const open_ = (r: Room) => {
    onClose();
    go(r.path, r.kind, r.label);
  };
  const active = all[hover] ?? all[0];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Studio index"
          className="fixed inset-0 z-[80] bg-foreground text-background overflow-y-auto"
          initial={{ clipPath: 'inset(0 0 100% 0)' }}
          animate={{ clipPath: 'inset(0 0 0% 0)' }}
          exit={{ clipPath: 'inset(100% 0 0 0)' }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <div className="flex items-center justify-between px-5 md:px-8 py-5 meta opacity-70">
            <span>MORROW® / Index — {all.length} rooms</span>
            <button onClick={onClose} className="hover:opacity-100 opacity-80 py-2">Esc to close ✕</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-5 md:px-8 pb-10">
            <nav className="lg:col-span-8 flex flex-col" aria-label="Rooms">
              {ROOMS.map((r, i) => {
                const on = hover === i;
                return (
                  <motion.button
                    key={r.key}
                    ref={(el) => (refs.current[i] = el)}
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onClick={() => open_(r)}
                    className="group text-left flex items-start gap-3 md:gap-5 outline-none focus-visible:outline-none"
                    initial={{ y: 60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, ease: EASE, delay: 0.15 + i * 0.05 }}
                  >
                    <span className="meta mt-3 md:mt-5 w-6 opacity-60">{r.n}</span>
                    <motion.span
                      className="display leading-[0.92] block origin-left"
                      animate={{ opacity: on ? 1 : 0.28, fontSize: on ? 'clamp(3.2rem, 10vw, 9.5rem)' : 'clamp(2.2rem, 6vw, 5.2rem)', x: on ? 12 : 0 }}
                      transition={{ duration: 0.55, ease: EASE }}
                    >
                      {r.label}
                    </motion.span>
                    {current?.key === r.key && <span className="meta mt-4 text-primary">● here</span>}
                  </motion.button>
                );
              })}
              <div className="mt-10 border-t border-background/20 pt-5 flex flex-wrap gap-x-8 gap-y-3">
                {ANNEX.map((r, j) => {
                  const i = ROOMS.length + j;
                  return (
                    <button
                      key={r.key}
                      ref={(el) => (refs.current[i] = el)}
                      onMouseEnter={() => setHover(i)}
                      onFocus={() => setHover(i)}
                      onClick={() => open_(r)}
                      className={`meta py-1 transition-opacity ${hover === i ? 'opacity-100 text-primary' : 'opacity-60'}`}
                    >
                      {r.n} — {r.label}
                    </button>
                  );
                })}
              </div>
            </nav>
            <aside className="lg:col-span-4 hidden lg:flex flex-col gap-4 sticky top-24 self-start">
              <div className="aspect-[3/4] border border-background/15 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div key={active.key} className="absolute inset-0 p-6 flex items-center" initial={{ opacity: 0, scale: 1.08, rotate: -4 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.5, ease: EASE }}>
                    <PlanformSVG className="w-full h-full rotate-90 text-background/70" highlight={FOCUS[active.focus]} />
                  </motion.div>
                </AnimatePresence>
                <span className="absolute left-4 top-4 meta opacity-60">Preview / {active.n}</span>
              </div>
              <span className="meta opacity-80">{active.n} / {active.label} — {active.blurb}</span>
              <span className="meta opacity-40">↑ ↓ to move · Enter to open · Esc to close</span>
            </aside>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
