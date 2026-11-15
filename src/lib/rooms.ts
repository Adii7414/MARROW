import type { TransitionKind } from './transition';

export interface Room {
  n: string;
  key: string;
  label: string;
  path: string;
  kind: TransitionKind;
  blurb: string;
  focus: 'wing' | 'nose' | 'engine' | 'tail' | 'body' | 'cabin' | 'all';
}

export const ROOMS: Room[] = [
  { n: '01', key: 'objects', label: 'OBJECTS', path: '/objects', kind: 'sections', blurb: 'Four aircraft, one hangar. M01 to M04.', focus: 'all' },
  { n: '02', key: 'form', label: 'FORM', path: '/form', kind: 'type', blurb: 'Proportion, geometry, surface.', focus: 'wing' },
  { n: '03', key: 'systems', label: 'SYSTEMS', path: '/systems', kind: 'iris', blurb: 'The engineering lab. Eight systems, one engine passage.', focus: 'engine' },
  { n: '04', key: 'material', label: 'MATERIAL', path: '/material', kind: 'horizon', blurb: 'A museum of surfaces.', focus: 'body' },
  { n: '05', key: 'flight', label: 'FLIGHT', path: '/flight', kind: 'iris', blurb: 'The global range room.', focus: 'all' },
  { n: '06', key: 'journal', label: 'JOURNAL', path: '/journal', kind: 'type', blurb: 'Design observations.', focus: 'tail' },
  { n: '07', key: 'studio', label: 'STUDIO', path: '/studio', kind: 'sections', blurb: 'An independent aerospace design house.', focus: 'nose' },
];

export const ANNEX: Room[] = [
  { n: 'A', key: 'foundry', label: 'FOUNDRY', path: '/foundry', kind: 'sections', blurb: 'Watch M01 assemble from 2,487 parts.', focus: 'all' },
  { n: 'B', key: 'm01', label: 'M01', path: '/objects/M01', kind: 'sections', blurb: 'The flagship object.', focus: 'all' },
  { n: 'C', key: 'tunnel', label: 'WIND TUNNEL', path: '/wind-tunnel', kind: 'horizon', blurb: 'Aerodynamic lab.', focus: 'wing' },
  { n: 'D', key: 'cabin', label: 'CABIN', path: '/cabin', kind: 'iris', blurb: 'Step through the door.', focus: 'cabin' },
  { n: 'E', key: 'configure', label: 'CONFIGURE', path: '/configure', kind: 'sections', blurb: 'Request a proposal.', focus: 'all' },
];

export const ALL_ROOMS = [...ROOMS, ...ANNEX];

export function roomFor(pathname: string) {
  return [...ALL_ROOMS].sort((a, b) => b.path.length - a.path.length).find((r) => pathname.startsWith(r.path));
}
