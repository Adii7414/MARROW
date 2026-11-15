import * as THREE from 'three';
import type { SurfaceSpec, Station } from './variants';
import type { AnimKind, SystemKey } from './types';
import { Builder } from './builder';
import { V, loftLoops, airfoilLoop, airfoilSide, airfoilY, beamMatrix, unitBox } from './geom';

const DEG = Math.PI / 180;

export interface ControlDef {
  name: string;
  kind: AnimKind | 'fixed';
  s0: number;
  s1: number;
  x0: number;
  x1: number;
  system: SystemKey;
  prefixNote: string;
}

export interface SurfaceOpts {
  key: string;
  label: string; // Wing / Horizontal stabiliser / Fin
  prefix: 'MW' | 'MT';
  spec: SurfaceSpec;
  origin: THREE.Vector3; // root (y used, z used for vertical offset)
  vertical: boolean;
  side: 1 | -1;
  stage: number;
  rootS: number; // span coordinate where visible structure begins
  box: [number, number];
  controls: ControlDef[];
  stringers: number[];
  skinSegments: number;
  explode: THREE.Vector3;
  enter: THREE.Vector3;
}

export function interp(st: Station[], s: number) {
  if (s <= st[0].s) return st[0];
  for (let i = 0; i < st.length - 1; i++) {
    const a = st[i];
    const b = st[i + 1];
    if (s <= b.s) {
      const k = (s - a.s) / (b.s - a.s);
      return { s, le: a.le + (b.le - a.le) * k, c: a.c + (b.c - a.c) * k, tw: a.tw + (b.tw - a.tw) * k, t: a.t + (b.t - a.t) * k };
    }
  }
  return st[st.length - 1];
}

export function surfaceFrame(o: Pick<SurfaceOpts, 'spec' | 'origin' | 'vertical' | 'side'>) {
  const dih = Math.tan(o.spec.dihedral * DEG);
  /** world point for chord fraction x, thickness coordinate yn (normalised by chord), span s */
  const P = (x: number, yn: number, s: number) => {
    const st = interp(o.spec.stations, s);
    const tw = st.tw * DEG;
    const c = st.c;
    if (o.vertical) {
      const q = V(st.le - 0.25 * c, o.origin.y + s, o.origin.z);
      return q.add(V(-(x - 0.25) * c, 0, yn * c));
    }
    const q = V(st.le - 0.25 * c, o.origin.y + s * dih, o.side * s);
    const cd = V(-Math.cos(tw), -Math.sin(tw), 0);
    const td = V(-Math.sin(tw), Math.cos(tw), 0);
    return q.add(cd.multiplyScalar((x - 0.25) * c)).add(td.multiplyScalar(yn * c));
  };
  const spanSamples = (s0: number, s1: number, step = 1.5) => {
    const set = new Set<number>([s0, s1]);
    o.spec.stations.forEach((st) => st.s > s0 && st.s < s1 && set.add(st.s));
    const arr = [...set].sort((a, b) => a - b);
    const out: number[] = [];
    for (let i = 0; i < arr.length - 1; i++) {
      const n = Math.max(1, Math.ceil((arr[i + 1] - arr[i]) / step));
      for (let k = 0; k < n; k++) out.push(arr[i] + ((arr[i + 1] - arr[i]) * k) / n);
    }
    out.push(arr[arr.length - 1]);
    return out;
  };
  return { P, spanSamples, t: (s: number) => interp(o.spec.stations, s).t };
}

export function buildSurface(b: Builder, o: SurfaceOpts) {
  const { P, spanSamples, t } = surfaceFrame(o);
  const sideTag = o.vertical ? '' : o.side > 0 ? ' R' : ' L';
  const tipS = o.spec.tipStart;
  const endS = o.spec.stations[o.spec.stations.length - 1].s;
  const assembly = o.label;
  const hinges: { name: string; a: THREE.Vector3; b: THREE.Vector3 }[] = [];

  const slice = (x0: number, x1: number, s0: number, s1: number, lift = 0) =>
    loftLoops(spanSamples(s0, s1).map((s) => airfoilLoop(x0, x1, 10, t(s)).map(([x, y]) => P(x, y + lift, s))), true, true);
  const sideStrip = (x0: number, x1: number, s0: number, s1: number, side: 1 | -1, lift = 0) =>
    loftLoops(spanSamples(s0, s1).map((s) => airfoilSide(x0, x1, 14, t(s), side).map(([x, y]) => P(x, y + side * lift, s))), false);

  // ── Box skins (upper/lower per spanwise segment)
  const segs = o.skinSegments;
  for (let i = 0; i < segs; i++) {
    const s0 = o.rootS + ((tipS - o.rootS) * i) / segs;
    const s1 = o.rootS + ((tipS - o.rootS) * (i + 1)) / segs;
    ([1, -1] as const).forEach((sd) => {
      const nm = o.vertical ? (sd > 0 ? 'right' : 'left') : sd > 0 ? 'upper' : 'lower';
      b.add({
        key: `${o.key}-skin-${nm}-${i}`, label: `${assembly} skin`, assembly, prefix: o.prefix, stage: o.stage, phase: 0.3, system: 'airframe', mat: 'skin',
        geometry: sideStrip(o.box[0], o.box[1], s0, s1, sd), cuttable: true,
        items: [{ name: `${assembly} ${nm} skin panel ${i + 1}${sideTag}` }],
        explode: o.explode.clone().add(o.vertical ? V(0, 0, sd * 1.6) : V(0, sd * 1.6, 0)),
        enter: o.enter.clone().add(o.vertical ? V(0, 0, sd * 4) : V(0, sd * 5, 0)),
        note: 'Integrally stiffened composite skin panel, co-cured with stringers.',
      });
    });
  }

  // ── Control and fixed surfaces
  o.controls.forEach((cd) => {
    const geom = cd.kind === 'spoiler' ? sideStrip(cd.x0, cd.x1, cd.s0, cd.s1, 1, 0.004) : slice(cd.x0, cd.x1, cd.s0, cd.s1);
    let frame: { pivot: THREE.Vector3; axis: THREE.Vector3; anim: AnimKind; max: number } | undefined;
    if (cd.kind !== 'fixed') {
      const hx = cd.kind === 'slat' ? cd.x1 : cd.x0;
      const pa = P(hx, 0, cd.s0);
      const pb = P(hx, 0, cd.s1);
      const axis = pb.clone().sub(pa).normalize();
      const test = P(cd.kind === 'slat' ? cd.x0 : cd.kind === 'spoiler' ? cd.x1 : cd.x1, 0, (cd.s0 + cd.s1) / 2);
      const rot = test.clone().sub(pa).applyAxisAngle(axis, 0.2).add(pa);
      const d = rot.clone().sub(test);
      const wantUp = cd.kind === 'spoiler';
      if (cd.kind === 'rudder') {
        if (d.z < 0) axis.negate();
      } else if ((d.y > 0) !== wantUp) axis.negate();
      const max = { flap: 32, slat: 22, spoiler: 40, aileronL: 20, aileronR: 20, elevator: 22, rudder: 26 }[cd.kind as string] ?? 20;
      frame = { pivot: pa, axis, anim: cd.kind, max: max * DEG };
      hinges.push({ name: `${cd.name}${sideTag}`, a: pa, b: pb });
    }
    const outward = o.vertical ? V(-2, 0, 0) : cd.x0 < 0.2 ? V(2.5, -0.5, 0) : V(-2.5, -0.8, 0);
    b.add({
      key: `${o.key}-${cd.name.toLowerCase().replace(/\s+/g, '-')}`, label: cd.name.replace(/\s\d+$/, ''), assembly, prefix: o.prefix, stage: o.stage,
      phase: cd.kind === 'fixed' ? 0.4 : 0.5, system: cd.system, mat: cd.kind === 'fixed' ? 'skin' : 'skin',
      geometry: geom, items: [{ name: `${cd.name}${sideTag}` }], frame, cuttable: true,
      explode: o.explode.clone().add(outward), enter: o.enter.clone(), note: cd.prefixNote,
    });
  });

  // ── Tip
  b.add({
    key: `${o.key}-tip`, label: `${assembly} tip`, assembly, prefix: o.prefix, stage: o.stage, phase: 0.45, system: 'airframe', mat: 'skin',
    geometry: slice(0, 1, tipS, endS), items: [{ name: `${o.label === 'Wing' ? 'Raked wingtip' : `${assembly} tip`}${sideTag}` }], cuttable: true,
    explode: o.explode.clone().multiplyScalar(1.4), enter: o.enter.clone(),
    note: o.label === 'Wing' ? 'Raked composite wingtip reducing induced drag — no winglet required.' : 'Composite tip fairing.',
  });

  // ── Ribs (instanced unit shape)
  const loop = airfoilLoop(o.box[0], o.box[1], 12, 0.12);
  const shape = new THREE.Shape(loop.map(([x, y]) => new THREE.Vector2(x, y)));
  const ribGeom = new THREE.ShapeGeometry(shape);
  const ribs = Array.from({ length: o.spec.ribs }, (_, i) => {
    const s = o.rootS + 0.2 + ((tipS - o.rootS - 0.4) * i) / (o.spec.ribs - 1);
    const st = interp(o.spec.stations, s);
    const le = P(0, 0, s);
    const te = P(1, 0, s);
    const xcol = te.clone().sub(le);
    const up = P(0, 1, s).sub(le).normalize().multiplyScalar(st.c * (st.t / 0.12) * 0.94);
    const zcol = o.vertical ? V(0, 1, 0) : V(0, Math.sin(o.spec.dihedral * DEG), o.side);
    const m = new THREE.Matrix4().makeBasis(xcol, up, zcol.normalize().multiplyScalar(0.02));
    m.setPosition(le);
    return { matrix: m, name: `${assembly} rib R${String(i + 1).padStart(2, '0')}${sideTag}` };
  });
  b.add({
    key: `${o.key}-ribs`, label: `${assembly} rib`, assembly, prefix: o.prefix, stage: o.stage, phase: 0, system: 'airframe', mat: 'structure',
    geometry: ribGeom, items: ribs, interior: true, explode: o.explode.clone().multiplyScalar(0.6), enter: o.enter.clone().multiplyScalar(1.3),
    note: 'Machined aluminium rib maintaining aerofoil section and stabilising spar webs.',
  });

  // ── Spars
  const breaks = [o.rootS, ...o.spec.stations.map((s) => s.s).filter((s) => s > o.rootS && s < tipS), tipS];
  const spars: { matrix: THREE.Matrix4; name: string }[] = [];
  ([[o.box[0] + 0.01, 'Front spar'], [o.box[1] - 0.01, 'Rear spar']] as const).forEach(([f, nm]) => {
    for (let i = 0; i < breaks.length - 1; i++) {
      const a = P(f, (airfoilY(f, t(breaks[i]), 1) + airfoilY(f, t(breaks[i]), -1)) / 2, breaks[i]);
      const c = P(f, (airfoilY(f, t(breaks[i + 1]), 1) + airfoilY(f, t(breaks[i + 1]), -1)) / 2, breaks[i + 1]);
      const st = interp(o.spec.stations, (breaks[i] + breaks[i + 1]) / 2);
      const h = st.c * st.t * 0.75;
      spars.push({
        matrix: o.vertical ? beamMatrix(a, c, h, 0.08) : beamMatrix(a, c, 0.08, h),
        name: `${nm} ${['inboard', 'outboard', 'tip'][i] ?? i + 1}${sideTag}`,
      });
    }
  });
  b.add({
    key: `${o.key}-spars`, label: 'Spar', assembly, prefix: o.prefix, stage: o.stage, phase: 0, system: 'airframe', mat: 'composite',
    geometry: unitBox(), items: spars, interior: true, explode: o.explode.clone().multiplyScalar(0.5), enter: o.enter.clone().multiplyScalar(1.4),
    note: 'Carbon-fibre I-section spar — the primary bending member of the box.',
  });

  // ── Stringers
  const strs: { matrix: THREE.Matrix4; name: string }[] = [];
  o.stringers.forEach((f, k) => {
    ([1, -1] as const).forEach((sd) => {
      for (let i = 0; i < breaks.length - 1; i++) {
        const a = P(f, airfoilY(f, t(breaks[i]), sd) * 0.9, breaks[i]);
        const c = P(f, airfoilY(f, t(breaks[i + 1]), sd) * 0.9, breaks[i + 1]);
        strs.push({ matrix: beamMatrix(a, c, 0.05, 0.06), name: `${sd > 0 ? 'Upper' : 'Lower'} stringer ${k + 1}.${i + 1}${sideTag}` });
      }
    });
  });
  b.add({
    key: `${o.key}-stringers`, label: `${assembly} stringer`, assembly, prefix: o.prefix, stage: o.stage, phase: 0.15, system: 'airframe', mat: 'structure',
    geometry: unitBox(), items: strs, interior: true, explode: o.explode.clone().multiplyScalar(0.8), enter: o.enter.clone(),
    note: 'T-section stringer carrying spanwise bending in the skin.',
  });

  return { P, hinges, t };
}
