import { useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useInView, useReducedMotion } from 'framer-motion';
import { cn } from '@project/components/lib/utils';
import { topView, sideView } from '../lib/planform';
import type { VariantId } from '../model/variants';

export const EASE = [0.76, 0, 0.24, 1] as const;
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function Meta({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('meta', className)}>{children}</span>;
}

/** Tactile button: compresses on press, label slides on hover, edge line draws in. */
export function PressButton({ children, onClick, variant = 'solid', className, type = 'button', disabled, ariaLabel }: { children: ReactNode; onClick?: () => void; variant?: 'solid' | 'line' | 'ghost'; className?: string; type?: 'button' | 'submit'; disabled?: boolean; ariaLabel?: string }) {
  return (
    <motion.button
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: 0.965 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      className={cn(
        'group relative inline-flex items-center gap-3 overflow-hidden px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] disabled:opacity-40 disabled:pointer-events-none',
        variant === 'solid' && 'bg-primary text-primary-foreground',
        variant === 'line' && 'border border-current',
        variant === 'ghost' && 'px-0',
        className,
      )}
    >
      <span className="relative block overflow-hidden">
        <span className="block transition-transform duration-300 ease-[cubic-bezier(.76,0,.24,1)] group-hover:-translate-y-full">{children}</span>
        <span aria-hidden className="absolute inset-0 block translate-y-full transition-transform duration-300 ease-[cubic-bezier(.76,0,.24,1)] group-hover:translate-y-0">{children}</span>
      </span>
      <span aria-hidden className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-500 group-hover:scale-x-100" />
    </motion.button>
  );
}

/** Mechanical number counter. */
export function Counter({ value, decimals = 0, className, duration = 1.4 }: { value: number; decimals?: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const inView = useInView(ref, { once: false });
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!inView || !ref.current) return;
    const el = ref.current;
    const fmt = (n: number) => n.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    if (reduce) {
      el.textContent = fmt(value);
      return;
    }
    const c = animate(prev.current, value, { duration, ease: EASE_OUT, onUpdate: (n) => (el.textContent = fmt(n)) });
    prev.current = value;
    return () => c.stop();
  }, [value, inView, decimals, duration, reduce]);
  return <span ref={ref} className={cn('tabular-nums', className)}>0</span>;
}

/** Glyph-split headline reveal. */
export function SplitText({ text, className, delay = 0, stagger = 0.028, show = true, as = 'span' }: { text: string; className?: string; delay?: number; stagger?: number; show?: boolean; as?: 'span' | 'h1' | 'h2' }) {
  const Tag = motion[as];
  return (
    <Tag className={cn('inline-block', className)} aria-label={text}>
      {text.split('\n').map((line, li) => (
        <span key={li} className="block overflow-hidden pb-[0.06em]" aria-hidden>
          {line.split('').map((c, i) => (
            <motion.span
              key={i}
              className="inline-block will-change-transform"
              initial={{ y: '105%', rotate: 6 }}
              animate={show ? { y: '0%', rotate: 0 } : { y: '105%', rotate: 6 }}
              transition={{ duration: 0.9, ease: EASE_OUT, delay: delay + (li * 8 + i) * stagger }}
            >
              {c === ' ' ? '\u00a0' : c}
            </motion.span>
          ))}
        </span>
      ))}
    </Tag>
  );
}

/** Image that reveals from its focal point via clip-path. */
export function MaskImage({ src, alt, className, focal = '50% 50%' }: { src: string; alt: string; className?: string; focal?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const [loaded, setLoaded] = useState(false);
  return (
    <div ref={ref} className={cn('relative overflow-hidden bg-muted', className)}>
      <motion.img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 h-full w-full object-cover"
        initial={{ clipPath: `circle(0% at ${focal})`, scale: 1.25 }}
        animate={inView && loaded ? { clipPath: `circle(150% at ${focal})`, scale: 1 } : {}}
        transition={{ duration: 1.5, ease: EASE }}
      />
    </div>
  );
}

export function PlanformSVG({ id = 'M01', className, draw = true, highlight, stroke = 'currentColor' }: { id?: VariantId; className?: string; draw?: boolean; highlight?: 'wing' | 'engine' | 'tail' | 'body' | null; stroke?: string }) {
  const p = topView(id);
  const pad = 3;
  const vb = `${p.bounds.minX - pad} ${p.bounds.minY - pad} ${p.bounds.maxX - p.bounds.minX + pad * 2} ${p.bounds.maxY - p.bounds.minY + pad * 2}`;
  const path = (d: string, k: string, i: number) => (
    <motion.path
      key={k}
      d={d}
      fill={highlight === k ? 'hsl(var(--primary) / 0.18)' : 'none'}
      stroke={highlight === k ? 'hsl(var(--primary))' : stroke}
      strokeWidth={0.18}
      vectorEffect="non-scaling-stroke"
      initial={draw ? { pathLength: 0 } : false}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.6, ease: EASE, delay: i * 0.15 }}
    />
  );
  return (
    <svg viewBox={vb} className={className} preserveAspectRatio="xMidYMid meet" aria-hidden>
      <line x1={p.bounds.minX - pad} x2={p.bounds.maxX + pad} y1={0} y2={0} stroke={stroke} strokeWidth={0.08} strokeDasharray="1 0.6" vectorEffect="non-scaling-stroke" opacity={0.4} />
      {path(p.wing, 'wing', 0)}
      {p.tail && path(p.tail, 'tail', 1)}
      {path(p.fuselage, 'body', 2)}
      {path(p.engines, 'engine', 3)}
    </svg>
  );
}

export function SideSVG({ id = 'M01', className, stroke = 'currentColor', progress }: { id?: VariantId; className?: string; stroke?: string; progress?: import('framer-motion').MotionValue<number> }) {
  const s = sideView(id);
  const pad = 2;
  const vb = `${s.bounds.minX - pad} ${s.bounds.minY - pad} ${s.bounds.maxX - s.bounds.minX + pad * 2} ${s.bounds.maxY - s.bounds.minY + pad * 2}`;
  const common = { fill: 'none', stroke, strokeWidth: 1, vectorEffect: 'non-scaling-stroke' as const };
  return (
    <svg viewBox={vb} className={className} preserveAspectRatio="xMidYMid meet" aria-hidden>
      <line x1={s.bounds.minX - pad} x2={s.bounds.maxX + pad} y1={s.ground} y2={s.ground} stroke={stroke} strokeWidth={0.6} vectorEffect="non-scaling-stroke" opacity={0.35} />
      <motion.path d={s.fuselage} {...common} style={progress ? { pathLength: progress } : undefined} />
      <motion.path d={s.fin} {...common} style={progress ? { pathLength: progress } : undefined} />
      <motion.path d={s.engines} {...common} style={progress ? { pathLength: progress } : undefined} />
      <path d={s.windows} stroke={stroke} strokeWidth={1.4} vectorEffect="non-scaling-stroke" opacity={0.5} />
    </svg>
  );
}
