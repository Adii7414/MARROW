export type VariantId = 'M01' | 'M02' | 'M03' | 'M04';

export interface Station { s: number; le: number; c: number; tw: number; t: number }

export interface SurfaceSpec {
  stations: Station[];
  dihedral: number;
  y?: number; // root y (wing). Tail surfaces derive from fuselage.
  tipStart: number; // span where the tip piece begins
  ribs: number;
}

export interface EngineSpec { x: number; y: number; z: number; rf: number; mount: 'under' | 'over' }

export interface SeatBlock { rows: number; pitch: number; z: number[]; kind: 'business' | 'premium' | 'economy' }

export interface Variant {
  id: VariantId;
  name: string;
  descriptor: string;
  length: number;
  radius: number;
  flatten: number; // rz / ry
  noseFrac: number;
  tailFrac: number;
  tailUp: number;
  wing: SurfaceSpec;
  hstab: SurfaceSpec | null;
  fin: SurfaceSpec;
  engines: EngineSpec[];
  gear: { noseX: number; mainX: number; mainZ: number; ground: number; wheelR: number; bogieAxles: number };
  cabin: SeatBlock[];
  specs: { label: string; value: number; unit: string; decimals?: number }[];
  accent: string;
}

const wideEco = (n: number, half: number) => {
  const out: number[] = [];
  const blocks = Math.ceil(n / 4);
  const span = half * 2 - 1.2;
  for (let b = 0; b < blocks; b++) {
    const c = -span / 2 + (span * (b + 0.5)) / blocks;
    for (let k = 0; k < 4 && out.length < n; k++) out.push(c + (k - 1.5) * 0.47);
  }
  return out;
};

export const VARIANTS: Record<VariantId, Variant> = {
  M01: {
    id: 'M01',
    name: 'M01',
    descriptor: 'Long-range widebody concept',
    length: 68.4,
    radius: 3.05,
    flatten: 1,
    noseFrac: 0.11,
    tailFrac: 0.27,
    tailUp: 0.62,
    wing: {
      stations: [
        { s: 0, le: 7.5, c: 13.0, tw: 3.5, t: 0.15 },
        { s: 10.5, le: 0.68, c: 7.0, tw: 1.8, t: 0.125 },
        { s: 29.6, le: -11.74, c: 2.7, tw: -1.5, t: 0.105 },
        { s: 32.4, le: -14.8, c: 1.0, tw: -2, t: 0.1 },
      ],
      dihedral: 6,
      y: -1.55,
      tipStart: 29.6,
      ribs: 38,
    },
    hstab: {
      stations: [
        { s: 0, le: -24.6, c: 7.2, tw: 0, t: 0.11 },
        { s: 10.4, le: -31.9, c: 2.4, tw: 0, t: 0.1 },
        { s: 11.2, le: -32.8, c: 1.5, tw: 0, t: 0.1 },
      ],
      dihedral: 7,
      tipStart: 10.4,
      ribs: 14,
    },
    fin: {
      stations: [
        { s: 0, le: -19.6, c: 10, tw: 0, t: 0.11 },
        { s: 10.2, le: -28.1, c: 3.6, tw: 0, t: 0.1 },
        { s: 11.0, le: -28.9, c: 2.6, tw: 0, t: 0.1 },
      ],
      dihedral: 0,
      tipStart: 10.2,
      ribs: 16,
    },
    engines: [
      { x: 4.6, y: -3.15, z: 10.8, rf: 1.6, mount: 'under' },
      { x: 4.6, y: -3.15, z: -10.8, rf: 1.6, mount: 'under' },
    ],
    gear: { noseX: 27.6, mainX: -2.6, mainZ: 5.4, ground: -6.45, wheelR: 0.66, bogieAxles: 3 },
    cabin: [
      { kind: 'business', rows: 8, pitch: 1.9, z: [-2.2, -0.45, 0.45, 2.2] },
      { kind: 'economy', rows: 28, pitch: 0.81, z: [-2.5, -2.04, -1.58, -0.69, -0.23, 0.23, 0.69, 1.58, 2.04, 2.5] },
    ],
    specs: [
      { label: 'Length', value: 68.4, unit: 'm', decimals: 1 },
      { label: 'Wingspan', value: 64.8, unit: 'm', decimals: 1 },
      { label: 'Range', value: 15200, unit: 'km' },
      { label: 'Seats', value: 312, unit: '' },
      { label: 'Cruise', value: 0.86, unit: 'Mach', decimals: 2 },
      { label: 'Fan diameter', value: 3.2, unit: 'm', decimals: 1 },
    ],
    accent: '#B34A32',
  },
  M02: {
    id: 'M02',
    name: 'M02',
    descriptor: 'Efficient single-aisle concept',
    length: 44.5,
    radius: 2.0,
    flatten: 1,
    noseFrac: 0.12,
    tailFrac: 0.27,
    tailUp: 0.55,
    wing: {
      stations: [
        { s: 0, le: 4.5, c: 8.2, tw: 3, t: 0.15 },
        { s: 6.5, le: 0.9, c: 4.6, tw: 1.5, t: 0.125 },
        { s: 16.8, le: -4.74, c: 1.6, tw: -1.5, t: 0.105 },
        { s: 17.9, le: -6.0, c: 0.6, tw: -2, t: 0.1 },
      ],
      dihedral: 5.5,
      y: -1.05,
      tipStart: 16.8,
      ribs: 30,
    },
    hstab: {
      stations: [
        { s: 0, le: -15.6, c: 4.4, tw: 0, t: 0.11 },
        { s: 5.8, le: -19.6, c: 1.6, tw: 0, t: 0.1 },
        { s: 6.3, le: -20.2, c: 1.0, tw: 0, t: 0.1 },
      ],
      dihedral: 6,
      tipStart: 5.8,
      ribs: 10,
    },
    fin: {
      stations: [
        { s: 0, le: -12.4, c: 6.4, tw: 0, t: 0.11 },
        { s: 6.4, le: -17.8, c: 2.4, tw: 0, t: 0.1 },
        { s: 6.9, le: -18.3, c: 1.7, tw: 0, t: 0.1 },
      ],
      dihedral: 0,
      tipStart: 6.4,
      ribs: 12,
    },
    engines: [
      { x: 3.9, y: -2.15, z: 5.9, rf: 1.05, mount: 'under' },
      { x: 3.9, y: -2.15, z: -5.9, rf: 1.05, mount: 'under' },
    ],
    gear: { noseX: 17.5, mainX: -1.4, mainZ: 3.4, ground: -4.25, wheelR: 0.55, bogieAxles: 1 },
    cabin: [
      { kind: 'business', rows: 3, pitch: 1.2, z: [-1.3, -0.7, 0.7, 1.3] },
      { kind: 'economy', rows: 28, pitch: 0.79, z: [-1.55, -1.09, -0.63, 0.63, 1.09, 1.55] },
    ],
    specs: [
      { label: 'Length', value: 44.5, unit: 'm', decimals: 1 },
      { label: 'Wingspan', value: 35.8, unit: 'm', decimals: 1 },
      { label: 'Range', value: 6400, unit: 'km' },
      { label: 'Seats', value: 180, unit: '' },
      { label: 'Cruise', value: 0.79, unit: 'Mach', decimals: 2 },
      { label: 'Fan diameter', value: 2.1, unit: 'm', decimals: 1 },
    ],
    accent: '#B34A32',
  },
  M03: {
    id: 'M03',
    name: 'M03',
    descriptor: 'Experimental high-speed research aircraft',
    length: 36,
    radius: 1.35,
    flatten: 1.1,
    noseFrac: 0.3,
    tailFrac: 0.18,
    tailUp: 0.2,
    wing: {
      stations: [
        { s: 0, le: 6.5, c: 20, tw: 1, t: 0.07 },
        { s: 4, le: 3.5, c: 16.5, tw: 0.5, t: 0.06 },
        { s: 9.8, le: -9.5, c: 2.2, tw: -0.5, t: 0.05 },
        { s: 10.5, le: -11.2, c: 0.8, tw: -1, t: 0.05 },
      ],
      dihedral: -2,
      y: -0.45,
      tipStart: 9.8,
      ribs: 24,
    },
    hstab: null,
    fin: {
      stations: [
        { s: 0, le: -8.6, c: 8.4, tw: 0, t: 0.07 },
        { s: 4.6, le: -15.2, c: 2.6, tw: 0, t: 0.06 },
        { s: 5.1, le: -16.0, c: 1.6, tw: 0, t: 0.06 },
      ],
      dihedral: 0,
      tipStart: 4.6,
      ribs: 12,
    },
    engines: [
      { x: -2.5, y: -1.75, z: 2.7, rf: 0.72, mount: 'under' },
      { x: -2.5, y: -1.75, z: -2.7, rf: 0.72, mount: 'under' },
    ],
    gear: { noseX: 9, mainX: -6.5, mainZ: 3.3, ground: -3.6, wheelR: 0.45, bogieAxles: 1 },
    cabin: [{ kind: 'business', rows: 2, pitch: 1.4, z: [-0.42, 0.42] }],
    specs: [
      { label: 'Length', value: 36, unit: 'm', decimals: 1 },
      { label: 'Wingspan', value: 21, unit: 'm', decimals: 1 },
      { label: 'Range', value: 7400, unit: 'km' },
      { label: 'Crew', value: 4, unit: '' },
      { label: 'Cruise', value: 1.7, unit: 'Mach', decimals: 2 },
      { label: 'Fan diameter', value: 1.4, unit: 'm', decimals: 1 },
    ],
    accent: '#B34A32',
  },
  M04: {
    id: 'M04',
    name: 'M04',
    descriptor: 'Blended-wing demonstrator',
    length: 42,
    radius: 3.0,
    flatten: 2.4,
    noseFrac: 0.2,
    tailFrac: 0.3,
    tailUp: 0.25,
    wing: {
      stations: [
        { s: 0, le: 9, c: 26, tw: 2, t: 0.13 },
        { s: 7.2, le: 1.2, c: 15, tw: 1, t: 0.12 },
        { s: 23.5, le: -12.6, c: 3.2, tw: -1.5, t: 0.1 },
        { s: 25.6, le: -15.2, c: 1.2, tw: -2, t: 0.1 },
      ],
      dihedral: 4,
      y: -0.6,
      tipStart: 23.5,
      ribs: 34,
    },
    hstab: null,
    fin: {
      stations: [
        { s: 0, le: -12.5, c: 6.8, tw: 0, t: 0.1 },
        { s: 5.4, le: -17.2, c: 2.6, tw: 0, t: 0.1 },
        { s: 6.0, le: -17.9, c: 1.8, tw: 0, t: 0.1 },
      ],
      dihedral: 0,
      tipStart: 5.4,
      ribs: 12,
    },
    engines: [
      { x: -9.5, y: 2.95, z: 3.4, rf: 1.15, mount: 'over' },
      { x: -9.5, y: 2.95, z: -3.4, rf: 1.15, mount: 'over' },
    ],
    gear: { noseX: 13, mainX: -4.5, mainZ: 4.6, ground: -4.3, wheelR: 0.6, bogieAxles: 2 },
    cabin: [{ kind: 'economy', rows: 14, pitch: 0.82, z: wideEco(16, 6.4) }],
    specs: [
      { label: 'Length', value: 42, unit: 'm', decimals: 1 },
      { label: 'Wingspan', value: 51.2, unit: 'm', decimals: 1 },
      { label: 'Range', value: 11800, unit: 'km' },
      { label: 'Seats', value: 224, unit: '' },
      { label: 'Cruise', value: 0.84, unit: 'Mach', decimals: 2 },
      { label: 'Fan diameter', value: 2.3, unit: 'm', decimals: 1 },
    ],
    accent: '#B34A32',
  },
};

export const VARIANT_LIST = [VARIANTS.M01, VARIANTS.M02, VARIANTS.M03, VARIANTS.M04];
