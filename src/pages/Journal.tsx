import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { ARTICLES, type Article } from '../lib/articles';
import { Meta, EASE, EASE_OUT } from '../components/kit';
import { NextRoom } from '../components/NextRoom';
import { cn } from '@project/components/lib/utils';

const SPREAD = [
  'md:col-span-7 aspect-[4/3]',
  'md:col-span-4 md:col-start-9 md:mt-40 aspect-[3/4]',
  'md:col-span-5 md:col-start-2 aspect-square',
  'md:col-span-5 md:col-start-8 md:-mt-24 aspect-[4/5]',
  'md:col-span-8 md:col-start-3 aspect-[16/9]',
  'md:col-span-4 aspect-[3/4]',
];

function Card({ a, i, onOpen }: { a: Article; i: number; onOpen: () => void }) {
  return (
    <motion.article initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-10%' }} transition={{ duration: 0.9, ease: EASE_OUT }} className={cn('col-span-12 flex flex-col gap-3', SPREAD[i].replace(/aspect-\S+/g, ''))}>
      <button onClick={onOpen} className="group text-left flex flex-col gap-3" aria-label={`Read ${a.title}`}>
        <motion.div layoutId={`img-${a.slug}`} className={cn('relative overflow-hidden bg-muted w-full', SPREAD[i].match(/aspect-\S+/)?.[0])}>
          <img src={a.image} alt={a.alt} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06]" />
        </motion.div>
        <Meta className="text-muted-foreground">{a.topic} — {a.date} — {a.minutes} min</Meta>
        <motion.h2 layoutId={`t-${a.slug}`} className={cn('font-semibold tracking-tight leading-[1.02]', i === 0 || i === 4 ? 'text-4xl md:text-5xl' : 'text-2xl md:text-3xl')}>
          {a.title}
        </motion.h2>
        <p className="text-muted-foreground">{a.dek}</p>
      </button>
    </motion.article>
  );
}

function Story({ a, onClose }: { a: Article; onClose: (to?: string) => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const idx = ARTICLES.indexOf(a);
  const next = ARTICLES[(idx + 1) % ARTICLES.length];
  return (
    <article className="bg-background">
      <motion.div layoutId={`img-${a.slug}`} className="relative w-full h-[78svh] overflow-hidden" transition={{ duration: 0.9, ease: EASE }}>
        <img src={a.image} alt={a.alt} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute left-5 md:left-8 right-5 bottom-10 text-white max-w-5xl">
          <Meta className="opacity-80">{a.topic} — {a.date} — {a.minutes} min read</Meta>
          <motion.h1 layoutId={`t-${a.slug}`} className="display text-[10vw] md:text-[6vw] leading-[0.9] mt-3">{a.title}</motion.h1>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.5 }} className="px-5 md:px-8 py-16 grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-3 flex flex-col gap-3">
          <button onClick={() => onClose()} className="meta text-left text-muted-foreground hover:text-foreground">← Journal (Esc)</button>
          <Meta className="text-muted-foreground">MORROW® Design Observations</Meta>
        </div>
        <div className="col-span-12 md:col-span-6 flex flex-col gap-6">
          <p className="text-2xl md:text-3xl leading-snug tracking-tight">{a.dek}</p>
          {a.body.map((p, i) => (
            <p key={i} className={cn('text-lg leading-[1.7] text-foreground/85', i === 0 && 'first-letter:float-left first-letter:display first-letter:text-7xl first-letter:leading-[0.8] first-letter:mr-2 first-letter:mt-1')}>{p}</p>
          ))}
          <blockquote className="my-6 border-l-2 border-primary pl-6 text-3xl md:text-4xl font-semibold tracking-tight leading-tight">“{a.pull}”</blockquote>
        </div>
      </motion.div>
      <div className="px-5 md:px-8 pb-16">
        <button onClick={() => onClose(next.slug)} className="group w-full text-left border-t border-border pt-6 flex flex-col gap-2">
          <Meta className="text-muted-foreground">Next feature</Meta>
          <span className="text-3xl md:text-5xl font-semibold tracking-tight transition-transform duration-500 group-hover:translate-x-3">{next.title} →</span>
        </button>
      </div>
    </article>
  );
}

export default function Journal() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const open = ARTICLES.find((a) => a.slug === slug);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);
  const close = (to?: string) => navigate(to ? `/journal/${to}` : '/journal');
  return (
    <LayoutGroup>
      <AnimatePresence mode="popLayout">
        {open ? (
          <motion.div key={open.slug} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <Story a={open} onClose={close} />
          </motion.div>
        ) : (
          <motion.div key="list" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <section className="px-5 md:px-8 pt-28 pb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border">
              <h1 className="display text-[18vw] md:text-[11vw] leading-[0.82]">JOURNAL</h1>
              <div className="flex flex-col gap-1 md:text-right">
                <Meta className="text-muted-foreground">06 / Design observations</Meta>
                <Meta className="text-muted-foreground">Issue 07 — Autumn 2026 — {ARTICLES.length} features</Meta>
              </div>
            </section>
            <section className="px-5 md:px-8 py-16 grid grid-cols-12 gap-x-6 gap-y-20">
              {ARTICLES.map((a, i) => (
                <Card key={a.slug} a={a} i={i} onOpen={() => navigate(`/journal/${a.slug}`)} />
              ))}
            </section>
          </motion.div>
        )}
      </AnimatePresence>
      {!open && <NextRoom current="journal" />}
    </LayoutGroup>
  );
}
