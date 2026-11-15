import { useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { submitRequest } from 'zitejs/api';
import Stage, { type Pose } from '../model/Stage';
import Aircraft from '../model/Aircraft';
import { VARIANT_LIST, VARIANTS, type VariantId } from '../model/variants';
import { SKINS, type SkinKey } from '../model/materials';
import { getAircraft } from '../model/generator';
import { Meta, PressButton, EASE } from '../components/kit';
import { Field, inputCls } from '../components/InquiryForm';
import { NextRoom } from '../components/NextRoom';
import { cn } from '@project/components/lib/utils';

const STEPS = ['AIRCRAFT', 'RANGE', 'CABIN', 'PROPULSION', 'MATERIAL', 'LIVERY', 'REVIEW'] as const;
const RANGES = [
  { v: 'Regional', d: 'Up to 4,000 km — short sectors, quick turns.' },
  { v: 'Long-range', d: 'Up to 11,000 km — intercontinental.' },
  { v: 'Ultra-long-range', d: 'Up to 15,200 km — the far side of the world, non-stop (concept).' },
] as const;
const CABINS = ['2-class high density', '3-class premium', 'All-business', 'Research / crew'];
const PROPS = [
  { v: 'Geared turbofan', d: 'Bypass ratio 14:1, the reference engine (concept).' },
  { v: 'Hydrogen-ready turbofan', d: 'Combustor and fuel system provisioned for H₂ blends (concept).' },
  { v: 'Sustainable-fuel optimised', d: 'Certified-concept for 100% SAF operation.' },
];
const LIVERIES = [
  { n: 'Vermilion', c: '#B34A32' },
  { n: 'Graphite', c: '#191A19' },
  { n: 'Mineral', c: '#8E8C84' },
  { n: 'Ultramarine', c: '#2A4C8C' },
];
const contact = z.object({
  contactName: z.string().trim().min(2, 'Please enter your name.').max(120),
  email: z.string().trim().email('Please enter a valid email.'),
  organization: z.string().trim().min(2, 'Please enter your organisation.').max(200),
  message: z.string().trim().max(4000).optional(),
});

export default function Configure() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [ac, setAc] = useState<VariantId>('M01');
  const [range, setRange] = useState<(typeof RANGES)[number]['v']>('Long-range');
  const [cabin, setCabin] = useState(CABINS[0]);
  const [prop, setProp] = useState(PROPS[0].v);
  const [mat, setMat] = useState<SkinKey>('paint');
  const [liv, setLiv] = useState(LIVERIES[0]);
  const [c, setC] = useState({ contactName: '', email: '', organization: '', message: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState<string | null>(null);
  const v = VARIANTS[ac];
  const k = v.length / 68.4;
  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(Math.max(0, Math.min(STEPS.length - 1, n)));
  };

  const s = STEPS[step];
  const eng = v.engines[0];
  const fin = v.fin.stations[0];
  const pose: Pose =
    s === 'CABIN' ? { position: [14 * k, 24 * k, 40 * k], target: [4 * k, -0.5, 0], fov: 34 }
    : s === 'PROPULSION' ? { position: [eng.x + 9, eng.y + 2, eng.z + (eng.z > 0 ? 9 : -9) * 1.2], target: [eng.x - 3, eng.y, eng.z], fov: 32 }
    : s === 'LIVERY' ? { position: [fin.le + 10, 10 * k, -30 * k], target: [fin.le - 3, 4 * k, 0], fov: 34 }
    : s === 'RANGE' ? { position: [0.01, 150 * k, 20 * k], target: [0, 0, 0], fov: 34 }
    : s === 'MATERIAL' ? { position: [30 * k, 6 * k, 30 * k], target: [0, 0, 6 * k], fov: 32 }
    : { position: [56 * k, 14 * k, -52 * k], target: [0, -1, 0], fov: 32 };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = contact.safeParse(c);
    if (!r.success) {
      const out: Record<string, string> = {};
      r.error.issues.forEach((i) => (out[String(i.path[0])] ??= i.message));
      setErrs(out);
      return;
    }
    setErrs({});
    setBusy(true);
    try {
      const res = await submitRequest({ requestType: 'Proposal', ...r.data, aircraft: ac, range, cabinLayout: cabin, propulsion: prop, material: SKINS[mat].label, livery: liv.n });
      setRef(res.reference);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const Option = ({ on, onClick, title, detail }: { on: boolean; onClick: () => void; title: string; detail?: string }) => (
    <button onClick={onClick} aria-pressed={on} className={cn('text-left p-4 border transition-all press', on ? 'border-primary border-2 bg-primary/5' : 'border-border hover:border-foreground')}>
      <span className="block font-semibold">{title}</span>
      {detail && <span className="block text-sm text-muted-foreground mt-1">{detail}</span>}
    </button>
  );

  const summary: [string, string][] = [
    ['Aircraft', `${v.name} — ${v.descriptor}`],
    ['Range', range],
    ['Cabin', cabin],
    ['Propulsion', prop],
    ['Material', SKINS[mat].label],
    ['Livery', liv.n],
  ];

  return (
    <div className="bg-background">
      <section className="pt-20 min-h-[100svh] flex flex-col">
        <nav aria-label="Configurator steps" className="px-5 md:px-8 py-4 flex gap-4 md:gap-6 overflow-x-auto border-b border-border">
          {STEPS.map((x, i) => (
            <button key={x} onClick={() => go(i)} aria-current={step === i ? 'step' : undefined} className={cn('meta shrink-0 pb-1 border-b-2 transition-colors', step === i ? 'border-primary text-foreground' : i < step ? 'border-transparent text-foreground/70' : 'border-transparent text-muted-foreground')}>
              {String(i + 1).padStart(2, '0')} {x} {i < step && '✓'}
            </button>
          ))}
        </nav>
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2 relative min-h-[48vh] bg-muted/40">
            <Stage className="absolute inset-0" pose={pose} tone="light" ground={v.gear.ground} zoom={false}>
              <Aircraft variant={ac} skin={mat} livery={liv.c} focusSystem={s === 'RANGE' ? 'fuel' : null} controls={{ cut: s === 'CABIN' ? 1 : 0, spin: s === 'PROPULSION' ? 1 : 0.25, lights: 0.6 }} />
            </Stage>
            <div className="absolute left-5 bottom-5 pointer-events-none">
              <Meta className="text-muted-foreground">Live — {v.name} · {SKINS[mat].label} · {liv.n} · {getAircraft(ac).partCount.toLocaleString()} parts</Meta>
            </div>
          </div>
          <div className="relative overflow-hidden px-5 md:px-8 py-8 flex flex-col">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={step} custom={dir} initial={{ x: dir * 60, opacity: 0, clipPath: 'inset(0 0 0 100%)' }} animate={{ x: 0, opacity: 1, clipPath: 'inset(0 0 0 0%)' }} exit={{ x: -dir * 60, opacity: 0 }} transition={{ duration: 0.55, ease: EASE }} className="flex-1 flex flex-col gap-4">
                <Meta className="text-muted-foreground">{String(step + 1).padStart(2, '0')} — {s}</Meta>
                {s === 'AIRCRAFT' && VARIANT_LIST.map((x) => <Option key={x.id} on={ac === x.id} onClick={() => setAc(x.id)} title={x.name} detail={x.descriptor} />)}
                {s === 'RANGE' && RANGES.map((x) => <Option key={x.v} on={range === x.v} onClick={() => setRange(x.v)} title={x.v} detail={x.d} />)}
                {s === 'CABIN' && CABINS.map((x) => <Option key={x} on={cabin === x} onClick={() => setCabin(x)} title={x} />)}
                {s === 'PROPULSION' && PROPS.map((x) => <Option key={x.v} on={prop === x.v} onClick={() => setProp(x.v)} title={x.v} detail={x.d} />)}
                {s === 'MATERIAL' && (['paint', 'aluminium', 'carbon', 'titanium', 'ceramic', 'polymer'] as SkinKey[]).map((x) => <Option key={x} on={mat === x} onClick={() => setMat(x)} title={SKINS[x].label} detail={SKINS[x].code} />)}
                {s === 'LIVERY' && (
                  <div className="grid grid-cols-2 gap-3">
                    {LIVERIES.map((x) => (
                      <button key={x.n} onClick={() => setLiv(x)} aria-pressed={liv.n === x.n} className={cn('p-3 border text-left press', liv.n === x.n ? 'border-primary border-2' : 'border-border')}>
                        <span className="block h-10 mb-2" style={{ background: x.c }} />
                        <span className="meta">{x.n}</span>
                      </button>
                    ))}
                  </div>
                )}
                {s === 'REVIEW' && (ref ? (
                  <div className="flex flex-col gap-3">
                    <Meta className="text-primary">Proposal request filed — {ref}</Meta>
                    <p className="text-3xl font-semibold tracking-tight leading-tight">Your {v.name} is on the long table.</p>
                    <p className="text-muted-foreground">Configuration saved. This is a fictional studio — no proposal will be issued, but your request has been recorded.</p>
                  </div>
                ) : (
                  <>
                    <dl className="border-t border-foreground">
                      {summary.map(([a, b], i) => (
                        <motion.div key={a} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="flex justify-between gap-4 py-2 border-b border-border">
                          <dt className="meta text-muted-foreground">{a}</dt>
                          <dd className="text-sm text-right">{b}</dd>
                        </motion.div>
                      ))}
                    </dl>
                    <form onSubmit={submit} noValidate className="flex flex-col gap-4 mt-2">
                      <Field label="Name" id="cf-name" error={errs.contactName}><input id="cf-name" className={inputCls} value={c.contactName} onChange={(e) => setC({ ...c, contactName: e.target.value })} aria-invalid={!!errs.contactName} /></Field>
                      <Field label="Email" id="cf-email" error={errs.email}><input id="cf-email" type="email" className={inputCls} value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} aria-invalid={!!errs.email} /></Field>
                      <Field label="Organisation" id="cf-org" error={errs.organization}><input id="cf-org" className={inputCls} value={c.organization} onChange={(e) => setC({ ...c, organization: e.target.value })} aria-invalid={!!errs.organization} /></Field>
                      <Field label="Notes (optional)" id="cf-msg"><textarea id="cf-msg" rows={2} className={cn(inputCls, 'resize-none')} value={c.message} onChange={(e) => setC({ ...c, message: e.target.value })} /></Field>
                      <PressButton type="submit" disabled={busy}>{busy ? 'Filing…' : 'Request proposal →'}</PressButton>
                    </form>
                  </>
                ))}
              </motion.div>
            </AnimatePresence>
            <div className="flex justify-between items-center pt-6 mt-6 border-t border-border">
              <PressButton variant="ghost" onClick={() => go(step - 1)} disabled={step === 0}>← Back</PressButton>
              <div className="flex gap-1">{STEPS.map((_, i) => <span key={i} className={cn('h-1 w-5', i <= step ? 'bg-primary' : 'bg-muted')} />)}</div>
              {step < STEPS.length - 1 ? <PressButton onClick={() => go(step + 1)}>Next →</PressButton> : <span className="w-16" />}
            </div>
          </div>
        </div>
      </section>
      <NextRoom current="configure" />
    </div>
  );
}
