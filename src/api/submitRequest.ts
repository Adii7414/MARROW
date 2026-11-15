import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const AIRCRAFT = ['M01', 'M02', 'M03', 'M04'] as const;
const RANGES = ['Regional', 'Long-range', 'Ultra-long-range'] as const;

export default createEndpoint({
  description: 'Saves a proposal request or studio inquiry',
  inputSchema: z.object({
    requestType: z.enum(['Proposal', 'Inquiry']),
    contactName: z.string(),
    email: z.string(),
    organization: z.string().optional(),
    aircraft: z.enum(AIRCRAFT).optional(),
    range: z.enum(RANGES).optional(),
    cabinLayout: z.string().optional(),
    propulsion: z.string().optional(),
    material: z.string().optional(),
    livery: z.string().optional(),
    message: z.string().optional(),
  }),
  outputSchema: z.object({ reference: z.string() }),
  execute: async ({ input }) => {
    const name = input.contactName?.trim() ?? '';
    const email = input.email?.trim() ?? '';
    if (name.length < 2 || name.length > 120) throw new ZiteError({ code: 'BAD_REQUEST', message: 'Invalid name', userFacingMessage: 'Please enter your name.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new ZiteError({ code: 'BAD_REQUEST', message: 'Invalid email', userFacingMessage: 'Please enter a valid email address.' });
    if (input.requestType === 'Proposal' && !input.aircraft) throw new ZiteError({ code: 'BAD_REQUEST', message: 'Missing aircraft', userFacingMessage: 'Please choose an aircraft.' });
    const clip = (s?: string, n = 200) => (s ? s.trim().slice(0, n) : undefined);
    const rec = await zite.proposalRequests.create({
      record: {
        contactName: name,
        email,
        organization: clip(input.organization),
        requestType: input.requestType,
        aircraft: AIRCRAFT.includes(input.aircraft as (typeof AIRCRAFT)[number]) ? input.aircraft : undefined,
        range: RANGES.includes(input.range as (typeof RANGES)[number]) ? input.range : undefined,
        cabinLayout: clip(input.cabinLayout),
        propulsion: clip(input.propulsion),
        material: clip(input.material),
        livery: clip(input.livery),
        message: clip(input.message, 4000),
      },
    });
    return { reference: `MRW-${String(rec.id).slice(0, 6).toUpperCase()}` };
  },
});
