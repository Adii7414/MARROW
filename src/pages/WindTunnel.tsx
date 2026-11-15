import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@project/components/ui/slider';
import { makeFlow, SECTIONS } from '../lib/flow';
import { Meta, PressButton, MaskImage, EASE } from '../components/kit';
import { NextRoom } from '../components/NextRoom';
import { cn } from '@project/components/lib/utils';

type Mode = 'FLOW' | 'PRESSURE' | 'VELOCITY';
const VIEWS = { FULL: [-3.2, -1.8, 6.4, 3.6], 'LEADING EDGE': [-2.9, -0.95, 2.6, 1.46], 'TRAILING EDGE': [0.5, -0.95, 2.6, 1.46] } as const;
type View = keyof typeof VIEWS;

function useField(flow: ReturnType<typeof makeFlow>, mode: Mode) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (mode === 'FLOW') return;
    const id = requestAnimationFrame(() => {
      const W = 240;
      const H = 135;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d')!;
      const img = ctx.createImageData(W, H);
      const ca = Math.cos(flow.a);
      const sa = Math.sin(flow.a);
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const sx = -3.2 + (6.4 * (i + 0.5)) / W;
          const sy = -(-1.8 + (3.6 * (j + 0.5)) / H);
          const zeta: [number, number] = [sx * ca - sy * sa, sx * sa + sy * ca];
          const z = flow.inverse(zeta);
          const k = (j * W + i) * 4;
          if (Math.hypot(z[0] - flow.mu[0], z[1] - flow.mu[1]) < flow.R) {
            img.data[k + 3] = 0;
            continue;
          }
          const v = flow.velZeta(z);
          const sp2 = Math.min(6, v[0] * v[0] + v[1] * v[1]);
          let r = 0, g = 0, b = 0;
          if (mode === 'PRESSURE') {
            const cp = Math.max(-2.5, Math.min(1, 1 - sp2));
            const band = Math.round(cp * 6) / 6;
            if (band < 0) {
              const t = Math.min(1, -band / 2.2);
              r = 233 - t * 160; g = 230 - t * 120; b = 222 - t * 30;
            } else {
              const t = band;
              r = 233 - t * 54; g = 230 - t * 156; b = 222 - t * 172;
            }
          } else {
            const sp = Math.sqrt(sp2);
            const t = Math.round(Math.min(1, sp / 1.8) * 8) / 8;
            r = 25 + t * 208; g = 26 + t * 204; b = 25 + t * 197;
            if (sp > 1.5) { r = 179; g = 74; b = 50; }
          }
          img.data[k] = r;
          img.data[k + 1] = g;
          img.data[k + 2] = b;
          img.data[k + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      setUrl(c.toDataURL());
    });
    return () => cancelAnimationFrame(id);
  }, [flow, mode]);
  return mode === 'FLOW' ? '' : url;
}

export default function WindTunnel() {
  const [alpha, setAlpha] = useState(6);
  const [mode, setMode] = useState<Mode>('FLOW');
  const [sec, setSec] = useState(1);
  const [view, setView] = useState<View>('FULL');
  const flow = useMemo(() => makeFlow(SECTIONS[sec], alpha), [sec, alpha]);
  const field = useField(flow, mode);
  const lines = useMemo(() => {
    const ys = Array.from({ length: 27 }, (_, i) => -2.6 + i * 0.2);
    return ys.map((y0, idx) => {
      const { pts, near } = flow.trace(y0);
      let d = '';
      pts.forEach(([x, y], i) => {
        let yy = y;
        if (flow.stall > 0 && near < 0.55 && y0 > 0 && x > -0.4) yy += flow.stall * 0.028 * Math.sin(x * 7 + idx * 1.7) * (x + 0.4);
        d += `${i ? 'L' : 'M'}${x.toFixed(3)},${yy.toFixed(3)}`;
      });
      return { d, near, idx };
    });
  }, [flow]);
  const surface = 'M' + flow.surface.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' L') + ' Z';
  const dark = mode === 'VELOCITY';
  const vb = VIEWS[view].join(' ');
  const prevAlpha = useRef(alpha);
  useEffect(() => {
    prevAlpha.current = alpha;
  }, [alpha]);

  return (
    <div className="bg-background">
      <section className={cn('relative min-h-[100svh] pt-24 pb-8 px-5 md:px-8 transition-colors duration-700', dark ? 'bg-foreground text-background' : 'bg-background text-foreground')}>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <Meta className="opacity-60">Annex C / Aerodynamic lab</Meta>
            <h1 className="display text-[14vw] md:text-[7.5vw] leading-[0.85]">WIND TUNNEL</h1>
          </div>
          <Meta className="opacity-60 max-w-xs text-right">Illustrative potential-flow sketch — not validated CFD. Separation is drawn, not solved.</Meta>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className={cn('lg:col-span-3 relative aspect-[16/9] overflow-hidden border', dark ? 'border-background/15' : 'border-border')}>
            <motion.svg className="absolute inset-0 w-full h-full" animate={{ viewBox: vb }} initial={false} transition={{ duration: 1.1, ease: EASE }} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Flow around a ${SECTIONS[sec].name.toLowerCase()} section at ${alpha} degrees angle of attack`}>
              <AnimatePresence>
                {field && (
                  <motion.image key={mode} href={field} x={-3.2} y={-1.8} width={6.4} height={3.6} preserveAspectRatio="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} style={{ imageRendering: 'auto' }} />
                )}
              </AnimatePresence>
              {Array.from({ length: 33 }).map((_, i) => (
                <line key={i} x1={-3.2 + i * 0.2} x2={-3.2 + i * 0.2} y1={-1.8} y2={1.8} stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.004} />
              ))}
              <g transform={`scale(1,-1) rotate(${-alpha})`}>
                {lines.map((l) => (
                  <path key={l.idx} d={l.d} fill="none" stroke={mode === 'PRESSURE' ? 'hsl(var(--foreground))' : l.near < 0.12 ? 'hsl(var(--primary))' : 'currentColor'} strokeOpacity={mode === 'FLOW' ? 0.75 : 0.45} strokeWidth={l.near < 0.12 ? 0.012 : 0.007} style={{ transition: 'd 0.35s ease' }} />
                ))}
                <path d={surface} fill={dark ? '#E9E6DE' : '#191A19'} />
              </g>
              <line x1={-3.2} x2={3.2} y1={0} y2={0} stroke="currentColor" strokeOpacity={0.15} strokeWidth={0.004} strokeDasharray="0.05 0.05" />
            </motion.svg>
            <div className="absolute left-3 top-3 meta opacity-70">Section {SECTIONS[sec].name} · α {alpha.toFixed(1)}° · {mode}</div>
            {flow.stall > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute right-3 top-3 meta bg-primary text-primary-foreground px-2 py-1">Flow separation — stall</motion.div>
            )}
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Meta className="opacity-60">Mode</Meta>
              <div className="flex gap-1">
                {(['FLOW', 'PRESSURE', 'VELOCITY'] as Mode[]).map((m) => (
                  <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} className={cn('meta px-2.5 py-2 border press', mode === m ? 'bg-primary text-primary-foreground border-primary' : 'border-current/30')}>{m}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between"><Meta className="opacity-60">Angle of attack</Meta><Meta className="tabular-nums">{alpha.toFixed(1)}°</Meta></div>
              <Slider value={[alpha]} min={-4} max={18} step={0.5} onValueChange={([v]) => setAlpha(v)} aria-label="Angle of attack" />
              <div className="flex justify-between meta opacity-50"><span>−4°</span><span>14° stall</span><span>18°</span></div>
            </div>
            <div className="flex flex-col gap-2">
              <Meta className="opacity-60">Section</Meta>
              <div className="flex gap-1">
                {SECTIONS.map((s, i) => (
                  <button key={s.name} onClick={() => setSec(i)} aria-pressed={sec === i} className={cn('meta px-2.5 py-2 border press', sec === i ? 'bg-foreground text-background border-foreground' : 'border-current/30', dark && sec === i && 'bg-background text-foreground')}>{s.name}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Meta className="opacity-60">Camera</Meta>
              <div className="flex flex-wrap gap-1">
                {(Object.keys(VIEWS) as View[]).map((v) => (
                  <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={cn('meta px-2.5 py-2 border press', view === v ? 'border-primary text-primary' : 'border-current/30')}>{v}</button>
                ))}
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-3 border-t border-current/20 pt-4">
              {[['CL', flow.CL.toFixed(2)], ['CD', flow.CD.toFixed(3)], ['L/D', (flow.CL / flow.CD).toFixed(1)]].map(([k, v]) => (
                <div key={k}><dt className="meta opacity-60">{k}</dt><dd className="text-3xl font-semibold tabular-nums">{v}</dd></div>
              ))}
            </dl>
            <PressButton variant="line" onClick={() => { setAlpha(6); setMode('FLOW'); setSec(1); setView('FULL'); }}>⟲ Reset tunnel</PressButton>
          </div>
        </div>
      </section>
      <section className="px-5 md:px-8 py-20 grid grid-cols-12 gap-6 items-center border-t border-border">
        <MaskImage src="https://images.fillout.com/924528/ewywqhgymh/generated-images/xgYxbvoPwkaxQxNeofomJr/img_QNEjrYDf2Dx02xaa.jpg" alt="White wing model in a wind tunnel test section" className="col-span-12 md:col-span-6 aspect-[4/3]" />
        <div className="col-span-12 md:col-span-5 md:col-start-8 flex flex-col gap-4">
          <Meta className="text-muted-foreground">Method note</Meta>
          <p className="text-2xl leading-snug tracking-tight">The sketch maps flow around a circle onto the wing section — a century-old transform that still teaches the eye where lift comes from.</p>
          <p className="text-muted-foreground leading-relaxed">Streamlines bunch over the crown where air accelerates and pressure falls; the vermilion line is the one that touches the skin. Past 14° the drawing lets the upper flow tear away, as a real wing would.</p>
        </div>
      </section>
      <NextRoom current="tunnel" />
    </div>
  );
}
