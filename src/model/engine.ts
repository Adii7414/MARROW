import * as THREE from 'three';
import type { EngineSpec } from './variants';
import { Builder } from './builder';
import { V, latheX, bladeGeometry, compose, beamMatrix, unitBox } from './geom';

const spinRate = 9; // rad/s at full spin

export function buildEngine(b: Builder, e: EngineSpec, idx: number, pylonTo: THREE.Vector3 | null) {
  const rf = e.rf;
  const at = V(e.x, e.y, e.z);
  const tag = `E${idx + 1}`;
  const side = e.z >= 0 ? 'R' : 'L';
  const out = V(0, e.mount === 'under' ? -1 : 1, Math.sign(e.z) || 1).normalize();
  const asm = `Engine ${idx + 1}`;
  const g = (geom: THREE.BufferGeometry) => geom.translate(at.x, at.y, at.z);
  const spinFrame = { pivot: at.clone(), axis: V(1, 0, 0), anim: 'spin' as const, max: spinRate };
  const base = { assembly: asm, prefix: 'MP', stage: 3, system: 'propulsion' as const };
  const ex = (k: number) => out.clone().multiplyScalar(4 + k).add(V(0, e.mount === 'under' ? -2 : 2, 0));

  // Nacelle
  b.add({
    ...base, key: `${tag}-inlet`, label: 'Inlet cowl', phase: 0.35, mat: 'skin', cuttable: true,
    geometry: g(latheX([[-1.9, rf * 1.0], [-0.25, rf * 1.0], [0.02, rf * 1.06], [0.05, rf * 1.12], [-0.12, rf * 1.19], [-0.8, rf * 1.23], [-1.9, rf * 1.24]], 64)),
    items: [{ name: `Inlet cowl ${tag}` }], explode: ex(0).add(V(5, 0, 0)), enter: V(12, 0, 0),
    note: 'Acoustically lined inlet with anti-iced composite lip.',
  });
  (['L', 'R'] as const).forEach((h, k) => {
    b.add({
      ...base, key: `${tag}-fancowl-${h}`, label: 'Fan cowl', phase: 0.4, mat: 'skin', cuttable: true,
      geometry: g(latheX([[-1.9, rf * 1.24], [-3.0, rf * 1.25], [-4.3, rf * 1.2]], 48, k * Math.PI, Math.PI)),
      items: [{ name: `Fan cowl ${tag}-${h}` }], explode: ex(1).add(V(0, k ? -2 : 2, 0)), enter: V(0, 8, 0),
      note: 'Hinged fan cowl door giving access to fan-case accessories.',
    });
    b.add({
      ...base, key: `${tag}-trsleeve-${h}`, label: 'Thrust reverser sleeve', phase: 0.45, mat: 'skin', cuttable: true,
      geometry: g(latheX([[-4.3, rf * 1.2], [-5.4, rf * 1.12], [-6.3, rf * 0.92]], 48, k * Math.PI, Math.PI)),
      items: [{ name: `Thrust reverser sleeve ${tag}-${h}` }], explode: ex(1).add(V(-3, k ? -2 : 2, 0)), enter: V(-10, 0, 0),
      note: 'Translating sleeve exposing cascade vanes on landing rollout.',
    });
  });
  b.add({
    ...base, key: `${tag}-cascades`, label: 'Cascade vane', phase: 0.2, mat: 'dark', geometry: unitBox(), interior: true,
    items: Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      return { matrix: compose(at.clone().add(V(-4.6, Math.cos(a) * rf * 1.1, Math.sin(a) * rf * 1.1)), new THREE.Euler(a, 0, 0), V(0.7, 0.06, rf * 0.36)), name: `Cascade vane ${tag}-${i + 1}` };
    }),
    explode: ex(2), enter: V(-8, 0, 0), note: 'Cast cascade vane directing reverse thrust forward.',
  });
  b.add({
    ...base, key: `${tag}-fancase`, label: 'Fan case', phase: 0.1, mat: 'metal', interior: true,
    geometry: g(latheX([[-0.3, rf * 0.99], [-2.2, rf * 0.98]], 48)), items: [{ name: `Fan containment case ${tag}` }], explode: ex(0), enter: V(10, 0, 0),
    note: 'Kevlar-wrapped containment case rated for blade-off events.',
  });
  b.add({
    ...base, key: `${tag}-core`, label: 'Core cowl', phase: 0.3, mat: 'metal', cuttable: true,
    geometry: g(latheX([[-2.0, rf * 0.62], [-4.0, rf * 0.68], [-5.8, rf * 0.62], [-7.6, rf * 0.46]], 48)), items: [{ name: `Core cowl ${tag}` }],
    explode: ex(0).add(V(-2, 0, 0)), enter: V(-8, 0, 0), note: 'Inner fixed structure — forms the inner wall of the bypass duct.',
  });
  b.add({
    ...base, key: `${tag}-nozzle`, label: 'Core nozzle', phase: 0.35, mat: 'dark',
    geometry: g(latheX([[-7.5, rf * 0.47], [-8.3, rf * 0.4]], 40)), items: [{ name: `Core exhaust nozzle ${tag}` }], explode: ex(0).add(V(-5, 0, 0)), enter: V(-8, 0, 0),
    note: 'Inconel exhaust nozzle.',
  });
  b.add({
    ...base, key: `${tag}-plug`, label: 'Exhaust plug', phase: 0.35, mat: 'dark',
    geometry: g(latheX([[-7.0, rf * 0.32], [-8.2, rf * 0.22], [-9.0, rf * 0.02]], 32)), items: [{ name: `Exhaust plug ${tag}` }], explode: ex(0).add(V(-7, 0, 0)), enter: V(-8, 0, 0),
    note: 'Ceramic-matrix exhaust centre-body.',
  });

  // Rotor (spinning)
  b.add({
    ...base, key: `${tag}-spinner`, label: 'Spinner', phase: 0.2, mat: 'metal', frame: spinFrame,
    geometry: g(latheX([[-0.05, 0.01], [-0.4, rf * 0.22], [-0.9, rf * 0.33]], 32)), items: [{ name: `Spinner ${tag}` }], explode: ex(0).add(V(4, 0, 0)), enter: V(10, 0, 0),
    note: 'Elliptical spinner with integrated anti-ice spiral marking.',
  });
  const fanBlade = bladeGeometry(0.6, rf * 0.68, 0.05, 1.05, 0.22, 0.12);
  b.add({
    ...base, key: `${tag}-fan`, label: 'Fan blade', phase: 0.15, mat: 'metal', frame: spinFrame, geometry: fanBlade,
    items: Array.from({ length: 22 }, (_, i) => {
      const a = (i / 22) * Math.PI * 2;
      const m = new THREE.Matrix4().makeTranslation(at.x - 0.75, at.y, at.z).multiply(new THREE.Matrix4().makeRotationX(a)).multiply(new THREE.Matrix4().makeTranslation(0, rf * 0.3, 0));
      return { matrix: m, name: `Fan blade ${tag}-${String(i + 1).padStart(2, '0')}` };
    }),
    explode: ex(0).add(V(3, 0, 0)), enter: V(10, 0, 0), note: 'Hollow titanium wide-chord fan blade, 3D woven composite leading edge.',
  });
  b.add({
    ...base, key: `${tag}-ogv`, label: 'Outlet guide vane', phase: 0.1, mat: 'structure', geometry: bladeGeometry(0.4, 1, 0.03, 0.3, 0.3), interior: true,
    items: Array.from({ length: 40 }, (_, i) => {
      const a = (i / 40) * Math.PI * 2;
      const m = new THREE.Matrix4().makeTranslation(at.x - 1.7, at.y, at.z).multiply(new THREE.Matrix4().makeRotationX(a)).multiply(new THREE.Matrix4().makeTranslation(0, rf * 0.62, 0)).multiply(new THREE.Matrix4().makeScale(1, rf * 0.36, 1));
      return { matrix: m, name: `Outlet guide vane ${tag}-${String(i + 1).padStart(2, '0')}` };
    }),
    explode: ex(0).add(V(1.5, 0, 0)), enter: V(10, 0, 0), note: 'Bypass outlet guide vane straightening fan swirl.',
  });
  // Compressor & turbine rows
  const unitBlade = bladeGeometry(1, 1, 0.08, 0.7, 0.35);
  const rows: { fam: string; label: string; x: number; n: number; r0: number; r1: number; chord: number; mat: 'metal' | 'dark' }[] = [];
  for (let i = 0; i < 3; i++) rows.push({ fam: 'booster', label: 'Booster blade', x: -2.1 - i * 0.28, n: 16, r0: 0.3, r1: 0.6 - i * 0.03, chord: 0.18, mat: 'metal' });
  for (let i = 0; i < 9; i++) rows.push({ fam: 'hpc', label: 'HP compressor blade', x: -3.0 - i * 0.17, n: 14, r0: 0.24, r1: 0.42 - i * 0.012, chord: 0.11, mat: 'metal' });
  for (let i = 0; i < 2; i++) rows.push({ fam: 'hpt', label: 'HP turbine blade', x: -5.25 - i * 0.24, n: 18, r0: 0.26, r1: 0.38, chord: 0.12, mat: 'dark' });
  for (let i = 0; i < 4; i++) rows.push({ fam: 'lpt', label: 'LP turbine blade', x: -5.85 - i * 0.3, n: 16, r0: 0.25, r1: 0.42 + i * 0.03, chord: 0.15, mat: 'dark' });
  (['booster', 'hpc', 'hpt', 'lpt'] as const).forEach((fam) => {
    const items: { matrix: THREE.Matrix4; name: string }[] = [];
    rows.filter((r) => r.fam === fam).forEach((r, ri) => {
      for (let i = 0; i < r.n; i++) {
        const a = (i / r.n) * Math.PI * 2 + ri * 0.2;
        const m = new THREE.Matrix4().makeTranslation(at.x + r.x, at.y, at.z).multiply(new THREE.Matrix4().makeRotationX(a))
          .multiply(new THREE.Matrix4().makeTranslation(0, rf * r.r0, 0)).multiply(new THREE.Matrix4().makeScale(r.chord * rf, rf * (r.r1 - r.r0), r.chord * rf));
        items.push({ matrix: m, name: `${r.label} ${tag} S${ri + 1}-${String(i + 1).padStart(2, '0')}` });
      }
    });
    const row0 = rows.find((r) => r.fam === fam)!;
    b.add({
      ...base, key: `${tag}-${fam}`, label: row0.label, phase: 0.05, mat: row0.mat, frame: spinFrame, geometry: unitBlade.clone(), items, interior: true,
      explode: ex(0).add(V(fam === 'booster' ? 1 : fam === 'hpc' ? 0 : fam === 'hpt' ? -1.5 : -3, 0, 0)), enter: V(0, -6, 0),
      note: {
        booster: 'Low-pressure booster stage — first squeeze of the core flow.',
        hpc: 'Nine-stage high-pressure compressor, blisk construction, pressure ratio 22:1 (concept).',
        hpt: 'Single-crystal high-pressure turbine blade with film cooling.',
        lpt: 'Low-pressure turbine blade driving the fan shaft.',
      }[fam],
    });
  });
  b.add({
    ...base, key: `${tag}-shaft`, label: 'Main shaft', phase: 0, mat: 'metal', frame: spinFrame, interior: true,
    geometry: g(new THREE.CylinderGeometry(rf * 0.06, rf * 0.06, 7.6, 16).rotateZ(Math.PI / 2).translate(-4.1, 0, 0)), items: [{ name: `LP/HP shaft assembly ${tag}` }],
    explode: ex(0), enter: V(0, -6, 0), note: 'Concentric LP/HP shafts on squeeze-film damped bearings.',
  });
  b.add({
    ...base, key: `${tag}-combustor`, label: 'Combustor', phase: 0.05, mat: 'dark', interior: true,
    geometry: g(new THREE.TorusGeometry(rf * 0.33, rf * 0.07, 12, 40).rotateY(Math.PI / 2).translate(-4.75, 0, 0)), items: [{ name: `Annular combustor ${tag}` }],
    explode: ex(0).add(V(-0.5, 0, 0)), enter: V(0, -6, 0), note: 'Lean-burn annular combustor (concept) — low NOx staging.',
  });
  b.add({
    ...base, key: `${tag}-fuelnozzles`, label: 'Fuel nozzle', phase: 0.1, system: 'fuel', mat: 'metal', interior: true,
    geometry: new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8),
    items: Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * Math.PI * 2;
      return { matrix: compose(at.clone().add(V(-4.55, Math.cos(a) * rf * 0.33, Math.sin(a) * rf * 0.33)), new THREE.Euler(0, 0, Math.PI / 2)), name: `Fuel nozzle ${tag}-${i + 1}` };
    }),
    explode: ex(1), enter: V(0, -6, 0), note: 'Twin-annular premixing swirler fuel nozzle.',
  });
  b.add({
    ...base, key: `${tag}-igniters`, label: 'Igniter', phase: 0.1, system: 'electrical', mat: 'metal', interior: true, geometry: new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8),
    items: [0.6, 2.4].map((a, i) => ({ matrix: compose(at.clone().add(V(-4.7, Math.cos(a) * rf * 0.45, Math.sin(a) * rf * 0.45)), new THREE.Euler(a, 0, 0)), name: `Igniter plug ${tag}-${i + 1}` })),
    explode: ex(1), enter: V(0, -6, 0), note: 'High-energy igniter plug.',
  });
  b.add({
    ...base, key: `${tag}-agb`, label: 'Accessory gearbox', phase: 0.2, system: 'electrical', mat: 'dark', interior: true, geometry: unitBox(),
    items: [{ name: `Accessory gearbox + IDG ${tag}`, matrix: compose(at.clone().add(V(-2.6, -rf * 0.95, 0)), undefined, V(1.1, 0.3, 0.6)) }],
    explode: ex(2), enter: V(0, -6, 0), note: 'Drives the integrated drive generator, hydraulic and fuel pumps.',
  });

  // Pylon & mounts
  if (pylonTo) {
    const top = at.clone().add(V(-2.6, (e.mount === 'under' ? 1 : -1) * rf * 1.18, 0));
    const tgt = pylonTo.clone();
    const a = V(top.x + 1.6, (top.y + tgt.y) / 2, e.z);
    const c = V(top.x - 3.8, (top.y + tgt.y) / 2, e.z);
    b.add({
      ...base, key: `${tag}-pylon`, label: 'Pylon', phase: 0, system: 'airframe', mat: 'skin', geometry: unitBox(), cuttable: true,
      items: [{ name: `Engine pylon ${tag}`, matrix: beamMatrix(a, c, 0.45, Math.abs(tgt.y - top.y) + 0.5) }],
      explode: ex(0).multiplyScalar(0.5), enter: V(0, e.mount === 'under' ? -8 : 8, 0), note: 'Titanium pylon box with fuse-pin engine mounts.',
    });
    b.add({
      ...base, key: `${tag}-mounts`, label: 'Engine mount', phase: 0.2, system: 'airframe', mat: 'metal', geometry: unitBox(), interior: true,
      items: [-1.0, -4.6].map((dx, i) => ({ name: `${i ? 'Aft' : 'Forward'} engine mount ${tag}`, matrix: compose(at.clone().add(V(dx, (e.mount === 'under' ? 1 : -1) * rf * 1.0, 0)), undefined, V(0.4, 0.35, 0.5)) })),
      explode: ex(0).multiplyScalar(0.7), enter: V(0, -6, 0), note: 'Fail-safe engine mount with dual load paths.',
    });
  }
  return { at, rf, side };
}
