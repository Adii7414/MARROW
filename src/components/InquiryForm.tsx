import { useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { submitRequest } from 'zitejs/api';
import { Meta, PressButton, EASE } from './kit';
import { cn } from '@project/components/lib/utils';

const schema = z.object({
  contactName: z.string().trim().min(2, 'Please enter your name.').max(120),
  email: z.string().trim().email('Please enter a valid email.'),
  organization: z.string().trim().max(200).optional(),
  message: z.string().trim().min(10, 'A sentence or two, please (10+ characters).').max(4000),
});
type Values = z.infer<typeof schema>;

export function Field({ label, error, children, id }: { label: string; error?: string; children: React.ReactNode; id: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="meta text-muted-foreground">{label}</label>
      {children}
      <AnimatePresence>{error && <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} id={`${id}-err`} className="text-xs text-destructive">{error}</motion.span>}</AnimatePresence>
    </div>
  );
}
export const inputCls = 'bg-transparent border-b border-foreground/30 py-2.5 text-lg outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/60';

export function InquiryForm() {
  const [v, setV] = useState<Values>({ contactName: '', email: '', organization: '', message: '' });
  const [errs, setErrs] = useState<Partial<Record<keyof Values, string>>>({});
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState<string | null>(null);
  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(v);
    if (!r.success) {
      const out: Partial<Record<keyof Values, string>> = {};
      r.error.issues.forEach((i) => (out[i.path[0] as keyof Values] ??= i.message));
      setErrs(out);
      return;
    }
    setErrs({});
    setBusy(true);
    try {
      const res = await submitRequest({ requestType: 'Inquiry', ...r.data });
      setRef(res.reference);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send your inquiry. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  if (ref)
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }} className="flex flex-col gap-3">
        <Meta className="text-primary">Received — {ref}</Meta>
        <p className="text-3xl font-semibold tracking-tight">Thank you, {v.contactName.split(' ')[0]}.</p>
        <p className="text-muted-foreground">Your note is filed with the studio. This is a concept site, so no one will call — but it has been kept, carefully.</p>
        <button className="meta text-left text-muted-foreground hover:text-foreground mt-2" onClick={() => { setRef(null); setV({ contactName: '', email: '', organization: '', message: '' }); }}>Send another →</button>
      </motion.div>
    );
  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Field label="Name" id="iq-name" error={errs.contactName}><input id="iq-name" value={v.contactName} onChange={set('contactName')} className={inputCls} aria-invalid={!!errs.contactName} placeholder="Ada Morrow" /></Field>
      <Field label="Email" id="iq-email" error={errs.email}><input id="iq-email" type="email" value={v.email} onChange={set('email')} className={inputCls} aria-invalid={!!errs.email} placeholder="ada@studio.com" /></Field>
      <Field label="Organisation (optional)" id="iq-org"><input id="iq-org" value={v.organization} onChange={set('organization')} className={inputCls} placeholder="Independent" /></Field>
      <div className="md:col-span-2">
        <Field label="Message" id="iq-msg" error={errs.message}><textarea id="iq-msg" rows={3} value={v.message} onChange={set('message')} className={cn(inputCls, 'resize-none')} aria-invalid={!!errs.message} placeholder="Tell us what you would like to make move." /></Field>
      </div>
      <div className="md:col-span-2"><PressButton type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send inquiry →'}</PressButton></div>
    </form>
  );
}
