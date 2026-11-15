import { ALL_ROOMS } from '../lib/rooms';
import { useGo } from '../lib/transition';
import { Meta, PressButton } from './kit';

/** Footer that leads to the next room in the exhibition. */
export function NextRoom({ current, dark }: { current: string; dark?: boolean }) {
  const go = useGo();
  const i = ALL_ROOMS.findIndex((r) => r.key === current);
  const next = ALL_ROOMS[(i + 1) % ALL_ROOMS.length];
  return (
    <section className={`relative w-full border-t ${dark ? 'border-background/15 bg-foreground text-background' : 'border-border bg-background text-foreground'}`}>
      <button onClick={() => go(next.path, next.kind, next.label)} className="group w-full text-left px-5 md:px-8 py-14 md:py-20 flex flex-col gap-4">
        <Meta className="opacity-60">Next room — {next.n}</Meta>
        <span className="display text-[14vw] md:text-[10vw] leading-[0.85] transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-x-6">
          {next.label} <span className="text-primary inline-block transition-transform duration-700 group-hover:translate-x-4">→</span>
        </span>
        <Meta className="opacity-60">{next.blurb}</Meta>
      </button>
      <div className={`flex flex-wrap justify-between gap-4 px-5 md:px-8 py-5 border-t ${dark ? 'border-background/15' : 'border-border'}`}>
        <Meta className="opacity-60">MORROW® — The future is a form.</Meta>
        <Meta className="opacity-60">All aircraft, data and specifications are fictional concepts.</Meta>
      </div>
    </section>
  );
}

export function NotFound() {
  const go = useGo();
  return (
    <div className="min-h-screen flex flex-col items-start justify-center gap-6 px-5 md:px-8">
      <Meta className="text-muted-foreground">Error 404 — no such room</Meta>
      <h1 className="display text-[18vw] leading-[0.85]">LOST<br />FORM.</h1>
      <PressButton onClick={() => go('/', 'type', 'MORROW')}>Return to arrival →</PressButton>
    </div>
  );
}
