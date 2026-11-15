import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export type TransitionKind = 'sections' | 'iris' | 'horizon' | 'type';

interface Ctx {
  go: (to: string, kind?: TransitionKind, label?: string) => void;
}
const TransitionCtx = createContext<Ctx>({ go: () => {} });
export const useGo = () => useContext(TransitionCtx).go;

const EASE = [0.76, 0, 0.24, 1] as const;
export const COVER_MS = 560;

export function TransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [state, setState] = useState<{ phase: 'idle' | 'cover' | 'reveal'; kind: TransitionKind; label: string }>({ phase: 'idle', kind: 'sections', label: '' });
  const busy = useRef(false);
  const go = useCallback(
    (to: string, kind: TransitionKind = 'sections', label = '') => {
      if (busy.current) return;
      if (reduce) {
        navigate(to);
        window.scrollTo(0, 0);
        return;
      }
      busy.current = true;
      setState({ phase: 'cover', kind, label });
      window.setTimeout(() => {
        navigate(to);
        window.scrollTo(0, 0);
        setState((s) => ({ ...s, phase: 'reveal' }));
        window.setTimeout(() => {
          setState((s) => ({ ...s, phase: 'idle' }));
          busy.current = false;
        }, 760);
      }, COVER_MS + 120);
    },
    [navigate, reduce],
  );
  return (
    <TransitionCtx.Provider value={{ go }}>
      {children}
      <AnimatePresence>{state.phase !== 'idle' && <Overlay key="ov" kind={state.kind} label={state.label} phase={state.phase} />}</AnimatePresence>
    </TransitionCtx.Provider>
  );
}

function Overlay({ kind, label, phase }: { kind: TransitionKind; label: string; phase: 'cover' | 'reveal' }) {
  const cover = phase === 'cover';
  const Label = (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: cover ? 1 : 0 }}
      transition={{ duration: cover ? 0.3 : 0.2, delay: cover ? 0.25 : 0 }}
    >
      <div className="flex items-center gap-4 text-background">
        <span className="meta opacity-60">MORROW® / ENTERING</span>
        <span className="display text-3xl md:text-5xl">{label}</span>
      </div>
    </motion.div>
  );
  if (kind === 'sections') {
    return (
      <div className="fixed inset-0 z-[90] pointer-events-auto" aria-hidden>
        {Array.from({ length: 7 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-0 right-0 bg-foreground"
            style={{ top: `${(i * 100) / 7}%`, height: `${100 / 7 + 0.2}%`, originX: cover ? 0 : 1 }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: cover ? 1 : 0 }}
            transition={{ duration: 0.55, ease: EASE, delay: (cover ? i : 6 - i) * 0.035 }}
          >
            <motion.div className="absolute right-0 top-0 bottom-0 w-[3px] bg-primary" animate={{ opacity: cover ? 1 : 0 }} />
          </motion.div>
        ))}
        {Label}
      </div>
    );
  }
  if (kind === 'iris') {
    return (
      <motion.div
        className="fixed inset-0 z-[90] bg-foreground"
        aria-hidden
        initial={{ clipPath: 'circle(0% at 50% 50%)' }}
        animate={{ clipPath: cover ? 'circle(75% at 50% 50%)' : 'circle(0% at 50% 50%)' }}
        transition={{ duration: 0.62, ease: EASE }}
      >
        <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          {Array.from({ length: 22 }).map((_, i) => (
            <motion.line key={i} x1="50" y1="50" x2={50 + 70 * Math.cos((i / 22) * Math.PI * 2)} y2={50 + 70 * Math.sin((i / 22) * Math.PI * 2)} stroke="hsl(var(--background))" strokeWidth="0.08" animate={{ rotate: cover ? 30 : 0 }} style={{ originX: '50px', originY: '50px' }} transition={{ duration: 0.8 }} />
          ))}
          <circle cx="50" cy="50" r="12" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.15" />
        </svg>
        {Label}
      </motion.div>
    );
  }
  if (kind === 'horizon') {
    return (
      <div className="fixed inset-0 z-[90]" aria-hidden>
        <motion.div className="absolute left-0 right-0 top-0 h-1/2 bg-foreground" initial={{ y: '-100%' }} animate={{ y: cover ? '0%' : '-100%' }} transition={{ duration: 0.55, ease: EASE }} />
        <motion.div className="absolute left-0 right-0 bottom-0 h-1/2 bg-foreground" initial={{ y: '100%' }} animate={{ y: cover ? '0%' : '100%' }} transition={{ duration: 0.55, ease: EASE }} />
        <motion.div className="absolute left-0 right-0 top-1/2 h-px bg-primary" initial={{ scaleX: 0 }} animate={{ scaleX: cover ? 1 : 0 }} transition={{ duration: 0.45, ease: EASE }} />
        {Label}
      </div>
    );
  }
  return (
    <motion.div
      className="fixed inset-0 z-[90] bg-background flex items-center justify-center overflow-hidden"
      aria-hidden
      initial={{ y: '100%' }}
      animate={{ y: cover ? '0%' : '-100%' }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <div className="flex">
        {label.split('').map((c, i) => (
          <motion.span key={i} className="display text-[18vw] leading-none text-foreground" initial={{ y: '110%' }} animate={{ y: cover ? '0%' : '-110%' }} transition={{ duration: 0.5, ease: EASE, delay: 0.12 + i * 0.03 }}>
            {c === ' ' ? '\u00a0' : c}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}
