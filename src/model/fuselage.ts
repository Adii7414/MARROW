import * as THREE from 'three';
import type { Variant } from './variants';
import { Builder } from './builder';
import { V, loftLoops, beamMatrix, surfaceMatrix, compose, unitBox, clamp01 } from './geom';

export interface Prof { cy: number; ry: number; rz: number }

export function makeProfile(v: Variant) {
  const L = v.length;
  const R = v.radius;
  const Ln = v.noseFrac * L;
  const Lt = v.tailFrac * L;
  const nose = L / 2;
  return (x: number): Prof => {
    const s = Math.min(Math.max(nose - x, 0), L);
    let r = R;
    let cy = 0;
    let wz = 1;
    if (s < Ln) {
      const k = s / Ln;
      r = R * Math.pow(1 - Math.pow(1 - k, 2.1), 0.52);
      cy = -R * 0.22 * Math.pow(1 - k, 2);
    } else if (s > L - Lt) {
      const k = (s - (L - Lt)) / Lt;
      r = R * (1 - 0.86 * Math.pow(k, 1.35));
      cy = R * v.tailUp * Math.pow(k, 1.6);
      wz = 1 - 0.3 * k;
    }
    r = Math.max(r, R * 0.02);
    return { cy, ry: r, rz: r * v.flatten * wz };
  };
}

export const ringPoint = (p: Prof, x: number, theta: number, k = 1) =>
  V(x, p.cy + p.ry * k * Math.cos(theta), p.rz * k * Math.sin(theta));

const DEG = Math.PI / 180;

export function buildFuselage(b: Builder, v: Variant) {
  const prof = makeProfile(v);
  const L = v.length;
  const R = v.radius;
  const nose = L / 2;
  const xs = (s: number) => nose - s;
  const Ln = v.noseFrac * L;

  // ── Radome
  const rad: THREE.Vector3[][] = [];
  for (let i = 0; i <= 14; i++) {
    const s = 0.001 + (0.32 * Ln * i) / 14;
    const p = prof(xs(s));
    rad.push(Array.from({ length: 40 }, (_, j) => ringPoint(p, xs(s), (j / 40) * Math.PI * 2)));
  }
  b.add({
    key: 'radome', label: 'Radome', assembly: 'Fuselage', prefix: 'MF', stage: 1, phase: 0.3, system: 'avionics', mat: 'skin',
    geometry: loftLoops(rad, true, true), items: [{ name: 'Nose radome' }], explode: V(9, 0, 0), cuttable: true,
    note: 'Composite nose radome housing the weather radar antenna.',
  });

  // ── Skin panels (barrel sections × quadrants)
  const s0 = 0.32 * Ln;
  const s1 = 0.975 * L;
  const NS = 14;
  const quads = [
    { n: 'crown', a: -45, b: 45, e: V(0, 1, 0) },
    { n: 'right', a: 45, b: 135, e: V(0, 0, 1) },
    { n: 'keel', a: 135, b: 225, e: V(0, -1, 0) },
    { n: 'left', a: 225, b: 315, e: V(0, 0, -1) },
  ];
  for (let sec = 0; sec < NS; sec++) {
    const sa = s0 + ((s1 - s0) * sec) / NS;
    const sb = s0 + ((s1 - s0) * (sec + 1)) / NS;
    quads.forEach((q) => {
      const loops: THREE.Vector3[][] = [];
      for (let i = 0; i <= 6; i++) {
        const s = sa + ((sb - sa) * i) / 6;
        const p = prof(xs(s));
        const pts: THREE.Vector3[] = [];
        for (let j = 0; j <= 14; j++) pts.push(ringPoint(p, xs(s), (q.a + ((q.b - q.a) * j) / 14) * DEG));
        loops.push(pts);
      }
      b.add({
        key: `skin-${sec}-${q.n}`, label: 'Skin panel', assembly: 'Fuselage', prefix: 'MF', stage: 1, phase: 0.25 + (sec / NS) * 0.25,
        system: 'airframe', mat: 'skin', geometry: loftLoops(loops, false), cuttable: true,
        items: [{ name: `Skin panel S${String(sec + 1).padStart(2, '0')} ${q.n}` }],
        explode: q.e.clone().multiplyScalar(R * 1.6).add(V((sec - NS / 2) * 0.55, 0, 0)),
        enter: q.e.clone().multiplyScalar(10),
        note: 'Aluminium–lithium skin panel, chemically milled, riveted to frames and stringers.',
      });
    });
  }

  // ── Tail cone + APU exhaust
  const tc: THREE.Vector3[][] = [];
  for (let i = 0; i <= 8; i++) {
    const s = s1 + ((L - s1) * i) / 8;
    const p = prof(xs(s));
    tc.push(Array.from({ length: 32 }, (_, j) => ringPoint(p, xs(s), (j / 32) * Math.PI * 2)));
  }
  b.add({
    key: 'tailcone', label: 'APU tail cone', assembly: 'Fuselage', prefix: 'MF', stage: 1, phase: 0.5, system: 'airframe', mat: 'skin',
    geometry: loftLoops(tc, true, true), items: [{ name: 'APU tail cone' }], explode: V(-6, 0, 0), cuttable: true,
    note: 'Titanium firewall cone enclosing the auxiliary power unit.',
  });
  const tp = prof(xs(L));
  b.add({
    key: 'apu-exhaust', label: 'APU exhaust', assembly: 'Fuselage', prefix: 'MF', stage: 4, system: 'electrical', mat: 'dark',
    geometry: new THREE.CylinderGeometry(0.16, 0.2, 0.6, 20).rotateZ(Math.PI / 2),
    items: [{ name: 'APU exhaust nozzle', matrix: compose(V(xs(L) - 0.15, tp.cy, 0)) }], explode: V(-8, 0, 0),
    note: 'Auxiliary power unit exhaust — provides ground power and bleed air.',
  });

  // ── Frames
  const torus = new THREE.TorusGeometry(1, 0.022, 5, 56).rotateY(Math.PI / 2);
  const frames = Array.from({ length: 96 }, (_, i) => {
    const s = 0.05 * L + (0.91 * L * i) / 95;
    const p = prof(xs(s));
    return { matrix: compose(V(xs(s), p.cy, 0), undefined, V(1, p.ry * 0.975, p.rz * 0.975)), name: `Frame F${String(i + 1).padStart(3, '0')}` };
  });
  b.add({
    key: 'frames', label: 'Fuselage frame', assembly: 'Fuselage', prefix: 'MF', stage: 0, system: 'airframe', mat: 'structure',
    geometry: torus, items: frames, interior: true, enter: V(0, 16, 0),
    note: 'Circumferential Z-section frame. Spacing 0.65 m; carries hoop pressure loads.',
  });

  // ── Stringers
  const bs0 = Ln;
  const bs1 = L - v.tailFrac * L;
  const strs: { matrix: THREE.Matrix4; name: string }[] = [];
  const NA = 40;
  for (let seg = 0; seg < 3; seg++) {
    const sa = bs0 + ((bs1 - bs0) * seg) / 3;
    const sb = bs0 + ((bs1 - bs0) * (seg + 1)) / 3 - 0.05;
    for (let a = 0; a < NA; a++) {
      const th = (a / NA) * Math.PI * 2;
      strs.push({
        matrix: beamMatrix(ringPoint(prof(xs(sa)), xs(sa), th, 0.96), ringPoint(prof(xs(sb)), xs(sb), th, 0.96), 0.045, 0.08),
        name: `Stringer ${['FWD', 'MID', 'AFT'][seg]}-${String(a + 1).padStart(2, '0')}`,
      });
    }
  }
  b.add({
    key: 'stringers', label: 'Fuselage stringer', assembly: 'Fuselage', prefix: 'MF', stage: 0, phase: 0.3, system: 'airframe', mat: 'structure',
    geometry: unitBox(), items: strs, interior: true, enter: V(30, 0, 0),
    note: 'Longitudinal hat-section stringer stabilising the skin against buckling.',
  });

  // ── Keel, bulkheads
  const yf = -0.24 * R;
  b.add({
    key: 'keel', label: 'Keel beam', assembly: 'Fuselage', prefix: 'MF', stage: 0, system: 'airframe', mat: 'structure', geometry: unitBox(), interior: true,
    items: [{ name: 'Keel beam', matrix: beamMatrix(V(xs(0.3 * L), -R * 0.9, 0), V(xs(0.62 * L), -R * 0.9, 0), 0.5, 0.35) }],
    note: 'Primary longitudinal beam through the wing-box cut-out.',
  });
  const fb = prof(xs(0.085 * L));
  const ab = prof(xs(0.84 * L));
  b.add({
    key: 'bulkhead-fwd', label: 'Forward pressure bulkhead', assembly: 'Fuselage', prefix: 'MF', stage: 0, system: 'airframe', mat: 'structure',
    geometry: new THREE.CircleGeometry(1, 40).rotateY(Math.PI / 2), interior: true,
    items: [{ name: 'Forward pressure bulkhead', matrix: compose(V(xs(0.085 * L), fb.cy, 0), undefined, V(1, fb.ry * 0.97, fb.rz * 0.97)) }],
    note: 'Flat forward bulkhead sealing the pressurised volume ahead of the flight deck.',
  });
  b.add({
    key: 'bulkhead-aft', label: 'Aft pressure dome', assembly: 'Fuselage', prefix: 'MF', stage: 0, system: 'airframe', mat: 'structure',
    geometry: new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(Math.PI / 2), interior: true,
    items: [{ name: 'Aft pressure dome', matrix: compose(V(xs(0.84 * L), ab.cy, 0), undefined, V(1.4, ab.ry * 0.96, ab.rz * 0.96)) }],
    note: 'Hemispherical composite dome closing the pressure cabin.',
  });

  // ── Floor beams & seat tracks
  const fbeams: { matrix: THREE.Matrix4; name: string }[] = [];
  for (let i = 0; i < 96; i++) {
    const s = 0.05 * L + (0.91 * L * i) / 95;
    if (s < 0.09 * L || s > 0.83 * L) continue;
    const p = prof(xs(s));
    const k = (yf - p.cy) / p.ry;
    if (Math.abs(k) >= 0.97) continue;
    const w = p.rz * Math.sqrt(1 - k * k) * 0.96;
    fbeams.push({ matrix: beamMatrix(V(xs(s), yf - 0.1, -w), V(xs(s), yf - 0.1, w), 0.08, 0.18), name: `Floor beam FB${String(i + 1).padStart(3, '0')}` });
  }
  b.add({
    key: 'floor-beams', label: 'Floor beam', assembly: 'Fuselage', prefix: 'MF', stage: 0, phase: 0.5, system: 'airframe', mat: 'structure',
    geometry: unitBox(), items: fbeams, interior: true, enter: V(0, 0, 14),
    note: 'Transverse floor beam carrying cabin loads into the frames.',
  });
  const half = Math.max(...v.cabin.flatMap((c) => c.z.map(Math.abs)), 0.5);
  const tracks = [-1, -0.62, -0.2, 0.2, 0.62, 1].map((f, i) => ({
    matrix: beamMatrix(V(xs(0.12 * L), yf, f * half), V(xs(0.82 * L), yf, f * half), 0.06, 0.05),
    name: `Seat track ST-${i + 1}`,
  }));
  b.add({
    key: 'seat-tracks', label: 'Seat track', assembly: 'Fuselage', prefix: 'MF', stage: 0, phase: 0.55, system: 'cabin', mat: 'metal',
    geometry: unitBox(), items: tracks, interior: true, enter: V(30, 0, 0),
    note: 'Continuous titanium seat track allowing infinite cabin reconfiguration.',
  });

  // ── Doors
  const doorS = [0.13, 0.33, 0.57, 0.8].map((f) => f * L);
  const doorItems: { matrix: THREE.Matrix4; name: string }[] = [];
  const doorFrames: { matrix: THREE.Matrix4; name: string }[] = [];
  doorS.forEach((s, i) => {
    [1, -1].forEach((side) => {
      const p = prof(xs(s));
      const pt = V(xs(s), p.cy + 0.1, side * (p.rz + 0.02));
      doorItems.push({ matrix: surfaceMatrix(pt, V(0, 0, side), V(1.07, 1.93, 0.05)), name: `Passenger door ${i + 1}${side > 0 ? 'R' : 'L'}` });
      doorFrames.push({ matrix: surfaceMatrix(V(pt.x, pt.y, side * (p.rz - 0.08)), V(0, 0, side), V(1.4, 2.25, 0.12)), name: `Door surround ${i + 1}${side > 0 ? 'R' : 'L'}` });
    });
  });
  b.add({
    key: 'doors', label: 'Passenger door', assembly: 'Fuselage', prefix: 'MF', stage: 1, phase: 0.55, system: 'airframe', mat: 'skin', geometry: unitBox(),
    items: doorItems, cuttable: true, explode: V(0, 0, 0), enter: V(0, 0, 0),
    note: 'Plug-type door, outward opening, with integrated escape slide.',
  });
  b.add({
    key: 'door-frames', label: 'Door surround', assembly: 'Fuselage', prefix: 'MF', stage: 0, phase: 0.4, system: 'airframe', mat: 'structure', geometry: unitBox(),
    items: doorFrames, interior: true,
    note: 'Machined door surround redistributing loads around the cut-out.',
  });
  const cargo = [0.3, 0.66, 0.73].map((f, i) => {
    const s = f * L;
    const p = prof(xs(s));
    const th = 122 * DEG;
    const n = V(0, Math.cos(th) / p.ry, Math.sin(th) / p.rz).normalize();
    return { matrix: surfaceMatrix(ringPoint(p, xs(s), th, 1.006), n, V(i === 2 ? 1.2 : 2.7, 1.7, 0.05)), name: ['Forward cargo door', 'Aft cargo door', 'Bulk cargo door'][i] };
  });
  b.add({
    key: 'cargo-doors', label: 'Cargo door', assembly: 'Fuselage', prefix: 'MF', stage: 1, phase: 0.55, system: 'airframe', mat: 'skin', geometry: unitBox(),
    items: cargo, cuttable: true, enter: V(0, 0, 0),
    note: 'Outward-opening hydraulically actuated cargo door.',
  });

  // ── Windows + window frames
  const wins: { matrix: THREE.Matrix4; name: string }[] = [];
  const wframes: { matrix: THREE.Matrix4; name: string }[] = [];
  const wy = 0.2;
  const th = Math.acos(wy);
  const winCount = v.id === 'M03' ? 6 : 64;
  [1, -1].forEach((side) => {
    let k = 0;
    for (let i = 0; i < 90 && k < winCount; i++) {
      const s = 0.165 * L + i * ((0.81 * L - 0.165 * L) / 89);
      if (doorS.some((d) => Math.abs(d - s) < 1.0)) continue;
      const p = prof(xs(s));
      const t = side * th;
      const n = V(0, Math.cos(t) / p.ry, Math.sin(t) / p.rz).normalize();
      const pt = ringPoint(p, xs(s), t, 1).add(n.clone().multiplyScalar(0.012));
      wins.push({ matrix: surfaceMatrix(pt, n, V(0.27, 0.4, 0.03)), name: `Cabin window ${side > 0 ? 'R' : 'L'}${String(k + 1).padStart(2, '0')}` });
      wframes.push({ matrix: surfaceMatrix(pt.clone().sub(n.clone().multiplyScalar(0.16)), n, V(0.42, 0.56, 0.08)), name: `Window reveal ${side > 0 ? 'R' : 'L'}${String(k + 1).padStart(2, '0')}` });
      k++;
    }
  });
  b.add({
    key: 'windows', label: 'Cabin window', assembly: 'Fuselage', prefix: 'MF', stage: 1, phase: 0.55, system: 'cabin', mat: 'glass', geometry: unitBox(),
    items: wins, cuttable: true, enter: V(0, 0, 0),
    note: 'Triple-pane stretched acrylic window, 27 × 40 cm, electrochromic dimming.',
  });
  b.add({
    key: 'window-frames', label: 'Window reveal', assembly: 'Cabin', prefix: 'MC', stage: 5, system: 'cabin', mat: 'interior', geometry: unitBox(),
    items: wframes, interior: true, enter: V(0, 0, 0),
    note: 'Moulded interior window reveal with integrated shade track.',
  });

  // ── Flight-deck windows
  const sw = Ln * 0.8;
  const pw = prof(xs(sw));
  const pw2 = prof(xs(sw + 0.2));
  const slope = (pw2.ry - pw.ry) / 0.2;
  const fd = [-62, -36, -12, 12, 36, 62].map((d, i) => {
    const t = d * DEG;
    const n = V(slope * 1.2, Math.cos(t) / pw.ry, Math.sin(t) / pw.rz).normalize();
    const pt = ringPoint(pw, xs(sw), t, 1.0).add(n.clone().multiplyScalar(0.015));
    return { matrix: surfaceMatrix(pt, n, V(R * 0.33, R * 0.18, 0.03)), name: `Flight-deck window W${i + 1}` };
  });
  b.add({
    key: 'fd-windows', label: 'Flight-deck window', assembly: 'Fuselage', prefix: 'MF', stage: 1, phase: 0.5, system: 'avionics', mat: 'glass', geometry: unitBox(),
    items: fd, cuttable: true, enter: V(0, 0, 0),
    note: 'Heated laminated glass windshield, bird-strike rated (concept).',
  });

  // ── Belly fairing
  const wr = v.wing.stations[0];
  const bx0 = wr.le + 1.5;
  const bx1 = wr.le - wr.c - 1.5;
  const belly = Array.from({ length: 10 }, (_, i) => {
    const f = (i + 0.5) / 10;
    const x = bx0 + (bx1 - bx0) * f;
    const bulge = Math.sin(Math.PI * clamp01(f * 1.05)) * 0.35 + 0.65;
    const p = prof(x);
    return { matrix: compose(V(x, p.cy - p.ry * 0.72, 0), undefined, V(Math.abs(bx1 - bx0) / 10 * 0.75, p.ry * 0.42 * bulge, p.rz * 0.88 * bulge)), name: `Belly fairing panel BF-${i + 1}` };
  });
  b.add({
    key: 'belly', label: 'Belly fairing panel', assembly: 'Fuselage', prefix: 'MF', stage: 2, phase: 0.55, system: 'airframe', mat: 'skin',
    geometry: new THREE.SphereGeometry(1, 24, 12), items: belly, cuttable: true, explode: V(0, -3, 0), enter: V(0, -6, 0),
    note: 'Composite wing-to-body fairing smoothing the junction flow.',
  });

  // ── Antennas & static ports
  const ant = [0.2, 0.42, 0.62].flatMap((f, i) => {
    const x = xs(f * L);
    const p = prof(x);
    return [
      { matrix: compose(V(x, p.cy + p.ry + 0.15, 0), new THREE.Euler(0, 0, -0.35), V(0.45, 0.3, 0.04)), name: `Antenna top A${i + 1}` },
      { matrix: compose(V(x - 1.5, p.cy - p.ry - 0.15, 0), new THREE.Euler(0, 0, 0.35), V(0.45, 0.3, 0.04)), name: `Antenna bottom B${i + 1}` },
    ];
  });
  b.add({
    key: 'antennas', label: 'Antenna', assembly: 'Avionics', prefix: 'MS', stage: 4, phase: 0.4, system: 'avionics', mat: 'dark', geometry: unitBox(),
    items: ant, enter: V(0, 4, 0), note: 'Blade antenna — VHF, SATCOM, GPS and transponder.',
  });
  const sp = prof(xs(Ln * 0.95));
  const ports = [1, -1].flatMap((side) => [0, 0.5].map((dx, i) => ({
    matrix: compose(V(xs(Ln * 0.95) - dx, sp.cy - 0.2 - i * 0.3, side * (sp.rz + 0.01)), new THREE.Euler(Math.PI / 2, 0, 0), V(0.1, 0.02, 0.1)),
    name: `Static port ${side > 0 ? 'R' : 'L'}${i + 1}`,
  })));
  b.add({
    key: 'static-ports', label: 'Static port', assembly: 'Avionics', prefix: 'MS', stage: 4, phase: 0.4, system: 'avionics', mat: 'metal',
    geometry: new THREE.CylinderGeometry(1, 1, 1, 16), items: ports, enter: V(0, 0, 0), note: 'Air-data static pressure port.',
  });

  // ── Livery
  const band = (a: number, bb: number, sa: number, sb: number, off: number, n = 4) => {
    const loops: THREE.Vector3[][] = [];
    for (let i = 0; i <= 40; i++) {
      const s = sa + ((sb - sa) * i) / 40;
      const p = prof(xs(s));
      loops.push(Array.from({ length: n + 1 }, (_, j) => ringPoint(p, xs(s), (a + ((bb - a) * j) / n) * DEG, off)));
    }
    return loftLoops(loops, false);
  };
  b.add({
    key: 'cheat-r', label: 'Cheatline', assembly: 'Livery', prefix: 'ML', stage: 6, system: 'airframe', mat: 'accent', geometry: band(97, 101, 0.1 * L, 0.88 * L, 1.004),
    items: [{ name: 'Cheatline right' }], cuttable: true, enter: V(0, 0, 0), note: 'Vermilion cheatline — MORROW livery spec L-01.',
  });
  b.add({
    key: 'cheat-l', label: 'Cheatline', assembly: 'Livery', prefix: 'ML', stage: 6, system: 'airframe', mat: 'accent', geometry: band(-101, -97, 0.1 * L, 0.88 * L, 1.004),
    items: [{ name: 'Cheatline left' }], cuttable: true, enter: V(0, 0, 0), note: 'Vermilion cheatline — MORROW livery spec L-01.',
  });
  b.add({
    key: 'tail-band', label: 'Graphite tail band', assembly: 'Livery', prefix: 'ML', stage: 6, system: 'airframe', mat: 'dark', geometry: band(0, 360, 0.935 * L, 0.965 * L, 1.004, 48),
    items: [{ name: 'Graphite tail band' }], cuttable: true, enter: V(0, 0, 0), note: 'Graphite band marking the APU firewall station.',
  });

  return { prof, xs, floorY: yf };
}
