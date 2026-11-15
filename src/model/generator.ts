import * as THREE from 'three';
import { VARIANTS, type VariantId, type Variant } from './variants';
import { Builder } from './builder';
import { buildFuselage } from './fuselage';
import { buildSurface, surfaceFrame, type ControlDef } from './surfaces';
import { buildEngine } from './engine';
import { buildGear } from './gear';
import { buildCabin } from './cabin';
import { V, airfoilY, airfoilSide, beamMatrix, compose, loftLoops, unitBox } from './geom';
import type { BuiltAircraft, PartGroup } from './types';

const linspace = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

function wingControls(v: Variant, rootS: number, side: 1 | -1): ControlDef[] {
  const st = v.wing.stations;
  const tip = v.wing.tipStart;
  const kink = Math.max(st[1].s, rootS + 1);
  const eng = v.engines.filter((e) => e.mount === 'under' && Math.abs(e.z) > rootS).map((e) => Math.abs(e.z));
  const slatStart = eng.length ? Math.max(...eng) + 1.4 : rootS + (tip - rootS) * 0.15;
  const ail = rootS + (tip - rootS) * 0.74;
  const out: ControlDef[] = [
    { name: 'Inboard leading edge', kind: 'fixed', s0: rootS, s1: slatStart, x0: 0, x1: 0.12, system: 'airframe', prefixNote: 'Fixed inboard leading edge with Krueger fairing.' },
    ...linspace(slatStart, tip - 0.1, 6).slice(0, 5).map((s0, i, arr) => ({
      name: `Slat ${i + 1}`, kind: 'slat' as const, s0, s1: i < 4 ? arr[i + 1] : tip - 0.1, x0: 0, x1: 0.12, system: 'controls' as const,
      prefixNote: 'Leading-edge slat — extends forward and down to delay stall at low speed.',
    })),
    { name: 'Inboard flap', kind: 'flap', s0: rootS, s1: kink, x0: 0.7, x1: 1, system: 'controls', prefixNote: 'Single-slotted Fowler flap on drop-hinge kinematics.' },
    { name: 'Outboard flap', kind: 'flap', s0: kink, s1: ail, x0: 0.7, x1: 1, system: 'controls', prefixNote: 'Outboard Fowler flap with adaptive camber trailing edge.' },
    { name: 'Aileron', kind: side > 0 ? 'aileronR' : 'aileronL', s0: ail, s1: tip, x0: 0.7, x1: 1, system: 'controls', prefixNote: 'Outboard aileron — primary roll control.' },
  ];
  linspace(rootS + (kink - rootS) * 0.35, ail, 7).slice(0, 6).forEach((s0, i, arr) => {
    out.push({ name: `Spoiler ${i + 1}`, kind: 'spoiler', s0: s0 + 0.05, s1: (i < 5 ? arr[i + 1] : ail) - 0.05, x0: 0.58, x1: 0.7, system: 'controls', prefixNote: 'Spoiler panel — roll assist, speed brake and lift dump.' });
  });
  return out;
}

export function buildAircraft(v: Variant): BuiltAircraft {
  const b = new Builder();
  const { prof, floorY } = buildFuselage(b, v);
  const L = v.length;

  // ── Wings
  const wr = v.wing.stations[0];
  const wingRootS = prof(wr.le - wr.c * 0.4).rz * 0.92;
  const wingFrames: Record<number, ReturnType<typeof surfaceFrame>> = {};
  const hinges: { name: string; a: THREE.Vector3; b: THREE.Vector3 }[] = [];
  ([1, -1] as const).forEach((side) => {
    const o = {
      key: `wing-${side > 0 ? 'r' : 'l'}`, label: 'Wing', prefix: 'MW' as const, spec: v.wing, origin: V(0, v.wing.y ?? 0, 0), vertical: false, side, stage: 2,
      rootS: wingRootS, box: [0.12, 0.7] as [number, number], controls: wingControls(v, wingRootS, side), stringers: linspace(0.16, 0.66, 12), skinSegments: 8,
      explode: V(0, 1.2, side * 9), enter: V(0, 4, side * 18),
    };
    const r = buildSurface(b, o);
    wingFrames[side] = surfaceFrame(o);
    hinges.push(...r.hinges);
  });
  const W = (side: 1 | -1) => wingFrames[side];

  // Wing internals: tanks, flap track fairings & carriages
  ([1, -1] as const).forEach((side) => {
    const { P, t } = W(side);
    const tip = v.wing.tipStart;
    const kink = Math.max(v.wing.stations[1].s, wingRootS + 1);
    const mid = (x: number, s: number) => P(x, (airfoilY(x, t(s), 1) + airfoilY(x, t(s), -1)) / 2, s);
    const ranges: [number, number, string][] = [[wingRootS + 0.3, kink, 'Inner'], [kink, tip * 0.82, 'Outer'], [tip * 0.82, tip - 0.4, 'Surge']];
    b.add({
      key: `tanks-${side}`, label: 'Fuel tank', assembly: 'Wing', prefix: 'MS', stage: 4, phase: 0, system: 'fuel', mat: 'fuel', geometry: unitBox(), interior: true,
      items: ranges.map(([a, c, n]) => {
        const sm = (a + c) / 2;
        const st = v.wing.stations;
        const ch = st[0].c + ((st[st.length - 1].c - st[0].c) * sm) / st[st.length - 1].s;
        return { matrix: beamMatrix(mid(0.4, a), mid(0.4, c), Math.max(ch * 0.4, 0.4), Math.max(t(sm) * ch * 0.45, 0.1)), name: `${n} fuel tank ${side > 0 ? 'R' : 'L'}` };
      }),
      explode: V(0, 3, side * 6), enter: V(0, 6, 0), note: 'Integral wing tank — the wing box itself, sealed, holds the fuel.',
    });
    const fpos = linspace(wingRootS + 1.5, tip * 0.72, 4);
    b.add({
      key: `ftf-${side}`, label: 'Flap track fairing', assembly: 'Wing', prefix: 'MW', stage: 2, phase: 0.55, system: 'controls', mat: 'skin',
      geometry: new THREE.SphereGeometry(1, 20, 10), cuttable: true,
      items: fpos.map((s, i) => {
        const p = P(0.88, airfoilY(0.88, t(s), -1), s);
        return { matrix: compose(p.add(V(-0.8, -0.32, 0)), undefined, V(2.6, 0.32, 0.26)), name: `Flap track fairing ${i + 1}${side > 0 ? 'R' : 'L'}` };
      }),
      explode: V(-2, -2, side * 8), enter: V(0, -5, 0), note: 'Canoe fairing enclosing the flap carriage — tuned to double as an anti-shock body.',
    });
    b.add({
      key: `carriages-${side}`, label: 'Flap carriage', assembly: 'Wing', prefix: 'MW', stage: 2, phase: 0.2, system: 'controls', mat: 'metal', geometry: unitBox(), interior: true,
      items: fpos.flatMap((s, i) => [0, 1].map((k) => ({ matrix: compose(P(0.75 + k * 0.1, airfoilY(0.8, t(s), -1) * 0.5, s), undefined, V(0.6, 0.12, 0.1)), name: `Flap carriage ${i + 1}.${k + 1}${side > 0 ? 'R' : 'L'}` }))),
      explode: V(-1, -1, side * 8), enter: V(0, -5, 0), note: 'Roller carriage running on the flap track.',
    });
  });

  // ── Tail
  if (v.hstab) {
    const hs = v.hstab;
    const hx = hs.stations[0].le - hs.stations[0].c * 0.4;
    const hp = prof(hx);
    ([1, -1] as const).forEach((side) => {
      const r = buildSurface(b, {
        key: `hstab-${side > 0 ? 'r' : 'l'}`, label: 'Horizontal stabiliser', prefix: 'MT', spec: hs, origin: V(0, hp.cy, 0), vertical: false, side, stage: 2,
        rootS: hp.rz * 0.85, box: [0.12, 0.68], stringers: linspace(0.2, 0.6, 3), skinSegments: 2,
        controls: [
          { name: 'Stabiliser leading edge', kind: 'fixed', s0: hp.rz * 0.85, s1: hs.tipStart, x0: 0, x1: 0.12, system: 'airframe', prefixNote: 'Erosion-shielded leading edge.' },
          { name: 'Elevator', kind: 'elevator', s0: hp.rz * 0.85, s1: hs.tipStart, x0: 0.68, x1: 1, system: 'controls', prefixNote: 'Elevator — pitch control, triplex electro-hydrostatic actuation.' },
        ],
        explode: V(-7, 0, side * 4), enter: V(-12, 3, side * 6),
      });
      hinges.push(...r.hinges);
    });
  }
  const fs = v.fin;
  const fx = fs.stations[0].le - fs.stations[0].c * 0.45;
  const fp = prof(fx);
  const finOrigin = V(0, fp.cy + fp.ry * 0.82, 0);
  const finOpts = {
    key: 'fin', label: 'Fin', prefix: 'MT' as const, spec: fs, origin: finOrigin, vertical: true, side: 1 as const, stage: 2, rootS: 0, box: [0.12, 0.68] as [number, number],
    stringers: linspace(0.2, 0.6, 3), skinSegments: 2,
    controls: [
      { name: 'Fin leading edge', kind: 'fixed' as const, s0: 0, s1: fs.tipStart, x0: 0, x1: 0.12, system: 'airframe' as const, prefixNote: 'Fin leading edge with lightning diverter strips.' },
      { name: 'Lower rudder', kind: 'rudder' as const, s0: 0.3, s1: fs.tipStart * 0.5, x0: 0.68, x1: 1, system: 'controls' as const, prefixNote: 'Lower rudder segment — yaw control.' },
      { name: 'Upper rudder', kind: 'rudder' as const, s0: fs.tipStart * 0.5, s1: fs.tipStart, x0: 0.68, x1: 1, system: 'controls' as const, prefixNote: 'Upper rudder segment — independent actuation for redundancy.' },
    ],
    explode: V(-4, 7, 0), enter: V(0, 14, 0),
  };
  const fin = buildSurface(b, finOpts);
  hinges.push(...fin.hinges);
  ([1, -1] as const).forEach((sd) => {
    const loops = fin.P && linspace(fs.tipStart * 0.45, fs.tipStart, 8).map((s) => airfoilSide(0.04, 0.96, 14, fin.t(s), sd).map(([x, y]) => fin.P(x, y + sd * 0.004, s)));
    b.add({
      key: `fin-livery-${sd}`, label: 'Fin livery panel', assembly: 'Livery', prefix: 'ML', stage: 6, system: 'airframe', mat: 'accent', geometry: loftLoops(loops, false),
      items: [{ name: `Fin livery panel ${sd > 0 ? 'R' : 'L'}` }], enter: V(0, 0, 0), explode: V(-4, 7, sd * 0.6), cuttable: true, note: 'Vermilion tail field — MORROW livery spec L-02.',
    });
  });

  // ── Engines
  v.engines.forEach((e, i) => {
    let pylon: THREE.Vector3 | null = null;
    if (e.mount === 'under') {
      const side = (e.z > 0 ? 1 : -1) as 1 | -1;
      const { P, t } = W(side);
      pylon = P(0.15, airfoilY(0.15, t(Math.abs(e.z)), -1), Math.abs(e.z));
    } else {
      const p = prof(e.x - 2.6);
      pylon = V(e.x - 2.6, p.cy + p.ry * 0.92, e.z);
    }
    buildEngine(b, e, i, pylon);
  });

  // ── Landing gear
  buildGear(b, v, (x, z) => {
    if (z === 0) {
      const p = prof(x);
      return p.cy - p.ry * 0.75;
    }
    const side = (z > 0 ? 1 : -1) as 1 | -1;
    const { P, t } = W(side);
    return P(0.6, airfoilY(0.6, t(Math.abs(z)), -1), Math.abs(z)).y + 0.2;
  });

  // ── Cabin
  buildCabin(b, v, floorY);

  // ── Systems
  const sysLines = (key: string, label: string, system: PartGroup['system'], mat: PartGroup['mat'], items: { a: THREE.Vector3; c: THREE.Vector3; name: string }[], note: string, r = 0.07) =>
    b.add({ key, label, assembly: 'Systems', prefix: 'MS', stage: 4, phase: 0.2, system, mat, geometry: unitBox(), interior: true, enter: V(0, 6, 0), explode: V(0, 4, 0), items: items.map((it) => ({ name: it.name, matrix: beamMatrix(it.a, it.c, r, r) })), note });

  const fuel: { a: THREE.Vector3; c: THREE.Vector3; name: string }[] = [];
  const hyd: { a: THREE.Vector3; c: THREE.Vector3; name: string }[] = [];
  ([1, -1] as const).forEach((side) => {
    const { P, t } = W(side);
    const tip = v.wing.tipStart;
    const tag = side > 0 ? 'R' : 'L';
    const m = (x: number, s: number) => P(x, (airfoilY(x, t(s), 1) + airfoilY(x, t(s), -1)) / 2, s);
    const ez = v.engines.find((e) => Math.sign(e.z) === side && e.mount === 'under');
    const es = ez ? Math.abs(ez.z) : tip * 0.35;
    fuel.push({ a: m(0.18, 0.3), c: m(0.18, es), name: `Engine feed line ${tag}` });
    fuel.push({ a: m(0.18, es), c: m(0.18, tip * 0.82), name: `Transfer line ${tag}` });
    fuel.push({ a: m(0.18, tip * 0.82), c: m(0.2, tip - 0.4), name: `Vent line ${tag}` });
    fuel.push({ a: m(0.3, 0.3), c: m(0.3, tip * 0.6), name: `Refuel gallery ${tag}` });
    if (ez) fuel.push({ a: m(0.18, es), c: V(ez.x - 3, ez.y, ez.z), name: `Pylon fuel line ${tag}` });
    hyd.push({ a: m(0.66, 0.4), c: m(0.66, tip * 0.5), name: `Hydraulic line inboard ${tag}` });
    hyd.push({ a: m(0.66, tip * 0.5), c: m(0.66, tip * 0.95), name: `Hydraulic line outboard ${tag}` });
    hyd.push({ a: m(0.66, 0.4), c: V(v.gear.mainX, floorY - 1.2, side * v.gear.mainZ), name: `Gear hydraulic line ${tag}` });
  });
  sysLines('fuel-lines', 'Fuel line', 'fuel', 'fuel', fuel, 'Double-walled fuel line with leak detection.', 0.09);
  sysLines('hyd-lines', 'Hydraulic line', 'hydraulics', 'hydraulic', hyd, '5,000 psi titanium hydraulic line.', 0.06);
  const elec: { a: THREE.Vector3; c: THREE.Vector3; name: string }[] = [];
  linspace(L / 2 - 0.1 * L, L / 2 - 0.85 * L, 11).forEach((x, i, arr) => {
    if (i === arr.length - 1) return;
    [1, -1].forEach((sd) => {
      const p0 = prof(x);
      const p1 = prof(arr[i + 1]);
      elec.push({ a: V(x, p0.cy + p0.ry * 0.8, sd * p0.rz * 0.4), c: V(arr[i + 1], p1.cy + p1.ry * 0.8, sd * p1.rz * 0.4), name: `Wire bundle ${sd > 0 ? 'R' : 'L'}${i + 1}` });
    });
  });
  sysLines('wiring', 'Wire bundle', 'electrical', 'electric', elec, 'Segregated power and data wire bundle (route A/B).', 0.08);

  const ebay = L / 2 - v.noseFrac * L * 1.05;
  const ny = floorY - 0.6;
  b.add({
    key: 'avionics-racks', label: 'Avionics rack', assembly: 'Avionics', prefix: 'MS', stage: 4, phase: 0.1, system: 'avionics', mat: 'dark', geometry: unitBox(), interior: true, enter: V(0, -6, 0), explode: V(5, -4, 0),
    items: Array.from({ length: 8 }, (_, i) => ({ name: `Avionics rack E${i + 1}`, matrix: compose(V(ebay - (i % 4) * 0.7, ny, (i < 4 ? 1 : -1) * Math.min(0.8, v.radius * 0.3)), undefined, V(0.55, 0.7, 0.5)) })),
    note: 'Integrated modular avionics cabinet — line-replaceable modules.',
  });
  b.add({
    key: 'flight-computers', label: 'Flight-control computer', assembly: 'Avionics', prefix: 'MS', stage: 4, phase: 0.2, system: 'avionics', mat: 'electric', geometry: unitBox(), interior: true, enter: V(0, -6, 0), explode: V(5, -4, 0),
    items: Array.from({ length: 4 }, (_, i) => ({ name: `Flight-control computer FCC-${i + 1}`, matrix: compose(V(ebay - 3 - i * 0.5, ny, 0), undefined, V(0.4, 0.4, 0.35)) })),
    note: 'Quadruplex dissimilar flight-control computer.',
  });
  b.add({
    key: 'power', label: 'Electrical unit', assembly: 'Systems', prefix: 'MS', stage: 4, phase: 0.2, system: 'electrical', mat: 'electric', geometry: unitBox(), interior: true, enter: V(0, -6, 0), explode: V(0, -4, 0),
    items: [
      { name: 'Main battery', matrix: compose(V(ebay - 4.6, ny, 0.5), undefined, V(0.5, 0.35, 0.4)) },
      { name: 'APU battery', matrix: compose(V(-L / 2 + 0.12 * L, prof(-L / 2 + 0.12 * L).cy, 0), undefined, V(0.5, 0.35, 0.4)) },
      ...[0, 1, 2, 3].map((i) => ({ name: `Power distribution panel P${i + 1}`, matrix: compose(V(ebay - 5.4 - i * 0.6, ny, -0.5), undefined, V(0.4, 0.7, 0.3)) })),
    ],
    note: 'High-voltage DC power conversion and distribution.',
  });
  b.add({
    key: 'hyd-units', label: 'Hydraulic unit', assembly: 'Systems', prefix: 'MS', stage: 4, phase: 0.2, system: 'hydraulics', mat: 'hydraulic', geometry: unitBox(), interior: true, enter: V(0, -6, 0), explode: V(0, -4, 0),
    items: [1, -1, 0].map((sd, i) => ({ name: `Hydraulic reservoir ${['GREEN', 'BLUE', 'YELLOW'][i]}`, matrix: compose(V(v.gear.mainX + 2 + i, floorY - 1.0, sd * 0.8), undefined, V(0.6, 0.4, 0.4)) })),
    note: 'Bootstrap hydraulic reservoir (three independent systems).',
  });
  const fuelPumps = ([1, -1] as const).flatMap((side) => {
    const { P, t } = W(side);
    return [0.25, 0.4, 0.55].map((f, i) => {
      const s = wingRootS + (v.wing.tipStart - wingRootS) * f * 0.6;
      return { name: `Boost pump ${side > 0 ? 'R' : 'L'}${i + 1}`, matrix: compose(P(0.4, (airfoilY(0.4, t(s), -1)) * 0.6, s), undefined, V(0.3, 0.2, 0.3)) };
    });
  });
  b.add({ key: 'fuel-pumps', label: 'Fuel pump', assembly: 'Systems', prefix: 'MS', stage: 4, phase: 0.3, system: 'fuel', mat: 'fuel', geometry: unitBox(), items: fuelPumps, interior: true, enter: V(0, -6, 0), explode: V(0, -4, 0), note: 'Electric boost pump, canister-mounted.' });

  const acts = hinges.flatMap((h) => [0.3, 0.7].map((k) => {
    const p = h.a.clone().lerp(h.b, k);
    return { name: `Actuator — ${h.name} ${k < 0.5 ? 'A' : 'B'}`, matrix: beamMatrix(p.clone().add(V(0.7, 0.05, 0)), p.clone().add(V(-0.05, 0, 0)), 0.08, 0.08) };
  }));
  b.add({ key: 'actuators', label: 'Control actuator', assembly: 'Systems', prefix: 'MS', stage: 4, phase: 0.4, system: 'controls', mat: 'hydraulic', geometry: unitBox(), items: acts, interior: true, enter: V(0, 4, 0), explode: V(0, 2, 0), note: 'Electro-hydrostatic actuator — local hydraulics, electric power.' });

  // ── Lights
  const wingEnd = v.wing.stations[v.wing.stations.length - 1].s;
  const tipL = W(-1).P(0.3, 0, wingEnd);
  const tipR = W(1).P(0.3, 0, wingEnd);
  const tail = V(-L / 2 + 0.2, prof(-L / 2 + 0.2).cy, 0);
  const sph = new THREE.SphereGeometry(0.12, 12, 8);
  const light = (key: string, label: string, mat: PartGroup['mat'], items: { p: THREE.Vector3; name: string }[], anim?: 'strobe' | 'beacon', note = 'LED exterior light.') =>
    b.add({ key, label, assembly: 'Lighting', prefix: 'MS', stage: 7, phase: 0.1, system: 'electrical', mat, geometry: sph, enter: V(0, 0, 0), items: items.map((i) => ({ name: i.name, matrix: compose(i.p) })), note,
      frame: anim ? { pivot: V(), axis: V(0, 1, 0), anim, max: 0 } : undefined });
  light('nav-red', 'Navigation light', 'lightRed', [{ p: tipL.clone().add(V(0.3, 0, 0)), name: 'Navigation light port (red)' }]);
  light('nav-green', 'Navigation light', 'lightGreen', [{ p: tipR.clone().add(V(0.3, 0, 0)), name: 'Navigation light starboard (green)' }]);
  light('nav-white', 'Navigation light', 'lightWhite', [{ p: tail.clone().add(V(-0.1, 0, 0)), name: 'Tail navigation light (white)' }]);
  light('strobes', 'Strobe', 'lightWhite', [{ p: tipL.clone().add(V(-0.3, 0, 0)), name: 'Wingtip strobe L' }, { p: tipR.clone().add(V(-0.3, 0, 0)), name: 'Wingtip strobe R' }, { p: tail.clone().add(V(-0.2, 0.2, 0)), name: 'Tail strobe' }], 'strobe', 'Anti-collision strobe.');
  const top = prof(L / 2 - 0.45 * L);
  light('beacons', 'Beacon', 'lightRed', [{ p: V(L / 2 - 0.45 * L, top.cy + top.ry + 0.08, 0), name: 'Upper beacon' }, { p: V(L / 2 - 0.5 * L, top.cy - top.ry - 0.08, 0), name: 'Lower beacon' }], 'beacon', 'Rotating red anti-collision beacon.');
  const landing = ([1, -1] as const).flatMap((side) => [0.4, 0.8].map((f, i) => ({ p: W(side).P(0.02, 0, wingRootS + f * 1.6), name: `${i ? 'Runway turn-off' : 'Landing'} light ${side > 0 ? 'R' : 'L'}` })));
  light('landing', 'Landing light', 'lightWhite', [...landing, { p: V(v.gear.noseX, prof(v.gear.noseX).cy - prof(v.gear.noseX).ry * 0.8 - 0.5, 0.3), name: 'Taxi light' }], undefined, 'High-intensity LED landing light.');
  light('logo', 'Logo / inspection light', 'lightWhite', ([1, -1] as const).map((sd) => ({ p: V(wr.le + 2, prof(wr.le + 2).cy + prof(wr.le + 2).ry * 0.3, sd * (prof(wr.le + 2).rz + 0.05)), name: `Wing inspection light ${sd > 0 ? 'R' : 'L'}` })), undefined, 'Wing inspection light illuminating the leading edge for ice checks.');

  // ── Final
  const groups = b.groups as PartGroup[];
  const partCount = groups.reduce((n, g) => n + g.instances.length, 0);
  const stageCounts = Array.from({ length: 8 }, (_, s) => groups.filter((g) => g.stage === s).reduce((n, g) => n + g.instances.length, 0));
  const finTop = finOrigin.y + fs.stations[fs.stations.length - 1].s;
  return { id: v.id, groups, partCount, stageCounts, bounds: { length: L, span: wingEnd * 2, height: finTop - v.gear.ground } };
}

const cache = new Map<VariantId, BuiltAircraft>();
export function getAircraft(id: VariantId) {
  let a = cache.get(id);
  if (!a) {
    a = buildAircraft(VARIANTS[id]);
    cache.set(id, a);
  }
  return a;
}
