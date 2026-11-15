import * as THREE from 'three';
import type { SeatBlock, Variant } from './variants';
import { Builder } from './builder';
import { V, compose, merge, unitBox } from './geom';

export function seatGeometry(kind: 'economy' | 'premium' | 'business') {
  const w = kind === 'business' ? 0.75 : kind === 'premium' ? 0.5 : 0.44;
  const d = kind === 'business' ? 0.95 : 0.5;
  const box = (sx: number, sy: number, sz: number, x: number, y: number, z: number, rz = 0) => {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    if (rz) g.rotateZ(rz);
    return g.translate(x, y, z);
  };
  const parts = [
    box(d, 0.12, w, 0, 0.42, 0),
    box(0.1, kind === 'business' ? 0.85 : 0.7, w, -d / 2 + 0.02, 0.82, 0, -0.18),
    box(d * 0.8, 0.06, 0.06, 0, 0.62, w / 2 + 0.03),
    box(d * 0.8, 0.06, 0.06, 0, 0.62, -w / 2 - 0.03),
    box(0.06, 0.36, 0.06, 0.1, 0.18, w / 2 - 0.05),
    box(0.06, 0.36, 0.06, 0.1, 0.18, -w / 2 + 0.05),
  ];
  if (kind === 'business') parts.push(box(0.2, 0.75, w + 0.2, -d / 2 - 0.12, 0.6, 0));
  return merge(parts);
}

export interface SeatPos { x: number; z: number; kind: 'economy' | 'premium' | 'business'; row: number; col: number }

export function seatLayout(v: Variant, blocks: SeatBlock[] = v.cabin): SeatPos[] {
  const L = v.length;
  let x = L / 2 - 0.165 * L;
  const doorS = [0.13, 0.33, 0.57, 0.8].map((f) => L / 2 - f * L);
  const out: SeatPos[] = [];
  let row = 0;
  blocks.forEach((blk, bi) => {
    if (bi > 0) x -= 1.4;
    for (let r = 0; r < blk.rows; r++) {
      while (doorS.some((d) => Math.abs(d - x) < 0.9)) x -= 0.35;
      row++;
      blk.z.forEach((z, c) => out.push({ x, z, kind: blk.kind, row, col: c }));
      x -= blk.pitch;
    }
  });
  return out;
}

export function buildCabin(b: Builder, v: Variant, floorY: number) {
  const L = v.length;
  const R = v.radius;
  const seats = seatLayout(v);
  const letters = 'ABCDEFGHJK';
  (['business', 'premium', 'economy'] as const).forEach((kind) => {
    const list = seats.filter((s) => s.kind === kind);
    if (!list.length) return;
    b.add({
      key: `seats-${kind}`, label: `${kind[0].toUpperCase()}${kind.slice(1)} seat`, assembly: 'Cabin', prefix: 'MC', stage: 5, phase: kind === 'business' ? 0 : 0.15,
      system: 'cabin', mat: kind === 'business' ? 'seat' : 'seat', geometry: seatGeometry(kind), interior: true, explode: V(0, 9, 0), enter: V(0, 7, 0),
      items: list.map((s) => ({ matrix: compose(V(s.x, floorY, s.z)), name: `${kind === 'business' ? 'Business suite' : 'Economy seat'} ${s.row}${letters[s.col] ?? s.col}` })),
      note: kind === 'business' ? 'Fully-flat suite with direct aisle access, 1-2-1.' : '17.5-inch economy seat, slimline back, 31-inch pitch (concept).',
    });
  });
  const x0 = L / 2 - 0.15 * L;
  const x1 = L / 2 - 0.8 * L;
  const binLen = 2.2;
  const nb = Math.floor((x0 - x1) / binLen);
  const half = Math.max(...v.cabin.flatMap((c) => c.z.map(Math.abs)), 0.6);
  const wide = half > 1.8;
  const bins: { matrix: THREE.Matrix4; name: string }[] = [];
  const coves: { matrix: THREE.Matrix4; name: string }[] = [];
  for (let i = 0; i < nb; i++) {
    const x = x0 - (i + 0.5) * binLen;
    [1, -1].forEach((sd) => {
      bins.push({ name: `Overhead bin ${i + 1}${sd > 0 ? 'R' : 'L'}`, matrix: compose(V(x, floorY + R * 0.57, sd * half * 0.86), undefined, V(binLen * 0.96, 0.42, 0.62)) });
      coves.push({ name: `Cove light ${i + 1}${sd > 0 ? 'R' : 'L'}`, matrix: compose(V(x, floorY + R * 0.66, sd * half * 0.62), undefined, V(binLen * 0.9, 0.03, 0.08)) });
    });
    if (wide) bins.push({ name: `Centre bin ${i + 1}C`, matrix: compose(V(x, floorY + R * 0.6, 0), undefined, V(binLen * 0.96, 0.4, 1.3)) });
  }
  b.add({ key: 'bins', label: 'Overhead bin', assembly: 'Cabin', prefix: 'MC', stage: 5, phase: 0.35, system: 'cabin', mat: 'interior', geometry: unitBox(), items: bins, interior: true, explode: V(0, 11, 0), enter: V(0, 6, 0), note: 'Pivoting overhead bin, fits four roller bags on edge.' });
  b.add({ key: 'coves', label: 'Cove light', assembly: 'Cabin', prefix: 'MC', stage: 5, phase: 0.45, system: 'electrical', mat: 'lightWhite', geometry: unitBox(), items: coves, interior: true, explode: V(0, 12, 0), enter: V(0, 6, 0), note: 'Full-spectrum LED cove strip with circadian scenes.' });

  const doorX = [0.13, 0.33, 0.57, 0.8].map((f) => L / 2 - f * L);
  const mon = doorX.flatMap((dx, i) => [
    { name: `Galley G${i + 1}`, matrix: compose(V(dx - 1.6, floorY + Math.min(0.95, R * 0.3), 0), undefined, V(1.2, Math.min(1.9, R * 0.6), Math.min(half * 1.1, 2.6))) },
  ]);
  b.add({ key: 'galleys', label: 'Galley', assembly: 'Cabin', prefix: 'MC', stage: 5, phase: 0.25, system: 'cabin', mat: 'interior', geometry: unitBox(), items: mon, interior: true, explode: V(0, 10, 0), enter: V(0, 6, 0), note: 'Modular galley monument with induction ovens.' });
  const lavs = doorX.flatMap((dx, i) => [1, -1].map((sd) => ({ name: `Lavatory L${i + 1}${sd > 0 ? 'R' : 'L'}`, matrix: compose(V(dx + 1.4, floorY + Math.min(1, R * 0.31), sd * half * 0.6), undefined, V(1.0, Math.min(2, R * 0.62), 0.8)) })));
  b.add({ key: 'lavs', label: 'Lavatory', assembly: 'Cabin', prefix: 'MC', stage: 5, phase: 0.25, system: 'cabin', mat: 'interior', geometry: unitBox(), items: lavs, interior: true, explode: V(0, 10, 0), enter: V(0, 6, 0), note: 'Touchless lavatory module with UV sanitising cycle.' });
  const parts = [0.2, 0.36, 0.5, 0.62, 0.7, 0.78].map((f, i) => ({ name: `Class divider P${i + 1}`, matrix: compose(V(L / 2 - f * L, floorY + 0.8, 0), undefined, V(0.05, 1.6, half * 1.6)) }));
  b.add({ key: 'partitions', label: 'Partition', assembly: 'Cabin', prefix: 'MC', stage: 5, phase: 0.3, system: 'cabin', mat: 'interior', geometry: unitBox(), items: parts, interior: true, explode: V(0, 10, 0), enter: V(0, 6, 0), note: 'Lightweight honeycomb class divider.' });

  // Flight deck
  const fx = L / 2 - v.noseFrac * L * 0.95;
  const fd = [
    { name: 'Captain seat', m: compose(V(fx - 0.3, floorY, 0.5), undefined, V(0.6, 1, 0.6)) },
    { name: 'First officer seat', m: compose(V(fx - 0.3, floorY, -0.5), undefined, V(0.6, 1, 0.6)) },
  ];
  b.add({ key: 'fd-seats', label: 'Pilot seat', assembly: 'Flight deck', prefix: 'MC', stage: 5, phase: 0.1, system: 'avionics', mat: 'seat', geometry: seatGeometry('premium'), items: fd.map((f) => ({ name: f.name, matrix: f.m })), interior: true, explode: V(6, 4, 0), enter: V(6, 0, 0), note: 'Adjustable pilot seat with integrated side-stick.' });
  b.add({
    key: 'fd-panels', label: 'Flight-deck panel', assembly: 'Flight deck', prefix: 'MS', stage: 5, phase: 0.2, system: 'avionics', mat: 'dark', geometry: unitBox(), interior: true, explode: V(6, 4, 0), enter: V(6, 0, 0),
    items: [
      { name: 'Main instrument panel', matrix: compose(V(fx + 0.6, floorY + 1.1, 0), new THREE.Euler(0, 0, 0.3), V(0.1, 0.6, Math.min(1.9, R * 0.9))) },
      { name: 'Centre pedestal', matrix: compose(V(fx + 0.1, floorY + 0.5, 0), undefined, V(1.0, 0.5, 0.35)) },
      { name: 'Overhead panel', matrix: compose(V(fx, floorY + 2.05, 0), new THREE.Euler(0, 0, -0.4), V(1.0, 0.06, 0.9)) },
      { name: 'Side console L', matrix: compose(V(fx - 0.2, floorY + 0.7, -R * 0.36), undefined, V(1.0, 0.1, 0.25)) },
      { name: 'Side console R', matrix: compose(V(fx - 0.2, floorY + 0.7, R * 0.36), undefined, V(1.0, 0.1, 0.25)) },
    ],
    note: 'Large-area touch displays with tactile backup controls (concept).',
  });
}
