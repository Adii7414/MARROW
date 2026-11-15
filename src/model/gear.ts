import * as THREE from 'three';
import type { Variant } from './variants';
import { Builder } from './builder';
import { V, beamMatrix, compose, unitBox } from './geom';

const cyl = new THREE.CylinderGeometry(1, 1, 1, 20);
export function cylMatrix(a: THREE.Vector3, b: THREE.Vector3, r: number) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.normalize());
  return new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, V(r, len, r));
}

export function buildGear(b: Builder, v: Variant, attachY: (x: number, z: number) => number) {
  const gy = v.gear.ground;
  const wr = v.gear.wheelR;
  const tyre = new THREE.TorusGeometry(wr * 0.72, wr * 0.28, 12, 32);
  const hub = new THREE.CylinderGeometry(wr * 0.5, wr * 0.5, wr * 0.5, 20).rotateX(Math.PI / 2);
  const brake = new THREE.CylinderGeometry(wr * 0.42, wr * 0.42, wr * 0.3, 16).rotateX(Math.PI / 2);

  const legs: { tag: string; x: number; z: number; nose: boolean }[] = [
    { tag: 'NLG', x: v.gear.noseX, z: 0, nose: true },
    { tag: 'MLG-R', x: v.gear.mainX, z: v.gear.mainZ, nose: false },
    { tag: 'MLG-L', x: v.gear.mainX, z: -v.gear.mainZ, nose: false },
  ];

  legs.forEach((leg) => {
    const side = Math.sign(leg.z) || 1;
    const A = V(leg.x, attachY(leg.x, leg.z), leg.z);
    const axleY = gy + wr;
    const B = V(leg.x, axleY + (leg.nose ? 0.15 : 0.35), leg.z);
    const frame = leg.nose
      ? { pivot: A.clone(), axis: V(0, 0, 1), anim: 'gearNose' as const, max: Math.PI / 2 * 0.98 }
      : { pivot: A.clone(), axis: V(side, 0, 0), anim: 'gearMain' as const, max: Math.PI / 2 * 0.97 };
    const base = { assembly: leg.nose ? 'Nose landing gear' : 'Main landing gear', prefix: 'MG', stage: 4, system: 'gear' as const, frame, enter: V(0, -10, 0), explode: V(0, -5, side * (leg.nose ? 0 : 3)) };
    const mid = A.clone().lerp(B, 0.5);
    const strutR = leg.nose ? 0.13 : 0.22;
    b.add({
      ...base, key: `${leg.tag}-struts`, label: 'Shock strut', phase: 0, mat: 'metal', geometry: cyl,
      items: [
        { name: `Shock strut cylinder ${leg.tag}`, matrix: cylMatrix(A, mid, strutR) },
        { name: `Oleo piston ${leg.tag}`, matrix: cylMatrix(mid.clone().add(V(0, 0.1, 0)), B, strutR * 0.7) },
      ],
      note: 'Oleo-pneumatic shock strut absorbing touchdown energy.',
    });
    const bogie: { matrix: THREE.Matrix4; name: string }[] = [];
    const axles = leg.nose ? 1 : v.gear.bogieAxles;
    const pitch = wr * 2.3;
    const ax = Array.from({ length: axles }, (_, i) => (i - (axles - 1) / 2) * pitch);
    const wz = leg.nose ? [-wr * 0.55, wr * 0.55] : [-wr * 1.1, wr * 1.1];
    const braces: { matrix: THREE.Matrix4; name: string }[] = [
      { name: `Drag brace ${leg.tag}`, matrix: beamMatrix(A.clone().add(V(leg.nose ? -2 : 2.2, 0, 0)), mid, 0.12, 0.12) },
      { name: `Torque link upper ${leg.tag}`, matrix: beamMatrix(mid.clone().add(V(0.25, -0.1, 0)), mid.clone().add(V(0.35, -0.5, 0)), 0.06, 0.14) },
      { name: `Torque link lower ${leg.tag}`, matrix: beamMatrix(mid.clone().add(V(0.35, -0.5, 0)), B.clone().add(V(0.25, 0.4, 0)), 0.06, 0.14) },
    ];
    if (!leg.nose) {
      braces.push({ name: `Side brace ${leg.tag}`, matrix: beamMatrix(A.clone().add(V(0, 0.2, -side * 2.2)), mid, 0.12, 0.12) });
      braces.push({ name: `Lock link ${leg.tag}`, matrix: beamMatrix(A.clone().add(V(0, 0.1, -side * 1.6)), A.clone().lerp(mid, 0.6), 0.07, 0.07) });
      bogie.push({ name: `Bogie beam ${leg.tag}`, matrix: beamMatrix(B.clone().add(V(ax[0] - 0.3, -0.35, 0)), B.clone().add(V(ax[ax.length - 1] + 0.3, -0.35, 0)), 0.22, 0.26) });
    }
    ax.forEach((dx, i) => bogie.push({ name: `Axle ${leg.tag}-${i + 1}`, matrix: beamMatrix(V(B.x + dx, axleY, leg.z + wz[0] * 1.1), V(B.x + dx, axleY, leg.z + wz[1] * 1.1), 0.12, 0.12) }));
    b.add({ ...base, key: `${leg.tag}-braces`, label: 'Brace', phase: 0.15, mat: 'metal', geometry: unitBox(), items: [...braces, ...bogie], note: 'Forged high-strength steel linkage.' });

    const tyres: { matrix: THREE.Matrix4; name: string }[] = [];
    const hubs: { matrix: THREE.Matrix4; name: string }[] = [];
    const brakes: { matrix: THREE.Matrix4; name: string }[] = [];
    const lines: { matrix: THREE.Matrix4; name: string }[] = [];
    let w = 0;
    ax.forEach((dx) => wz.forEach((dz) => {
      w++;
      const c = V(B.x + dx, axleY, leg.z + dz);
      tyres.push({ name: `Tyre ${leg.tag}-${w}`, matrix: compose(c) });
      hubs.push({ name: `Wheel hub ${leg.tag}-${w}`, matrix: compose(c) });
      if (!leg.nose) {
        brakes.push({ name: `Carbon brake stack ${leg.tag}-${w}`, matrix: compose(c.clone().add(V(0, 0, -Math.sign(dz) * wr * 0.3))) });
        lines.push({ name: `Brake line ${leg.tag}-${w}`, matrix: beamMatrix(mid, c.clone().add(V(0, wr * 0.4, 0)), 0.025, 0.025) });
      }
    }));
    b.add({ ...base, key: `${leg.tag}-tyres`, label: 'Tyre', phase: 0.3, mat: 'rubber', geometry: tyre, items: tyres, note: 'Radial aircraft tyre, nitrogen inflated.' });
    b.add({ ...base, key: `${leg.tag}-hubs`, label: 'Wheel hub', phase: 0.3, mat: 'metal', geometry: hub, items: hubs, note: 'Forged aluminium split-hub wheel.' });
    if (brakes.length) {
      b.add({ ...base, key: `${leg.tag}-brakes`, label: 'Brake', phase: 0.25, mat: 'dark', geometry: brake, items: brakes, note: 'Electric carbon brake — no hydraulic fluid at the wheel.' });
      b.add({ ...base, key: `${leg.tag}-lines`, label: 'Brake line', phase: 0.35, system: 'hydraulics', mat: 'hydraulic', geometry: unitBox(), items: lines, note: 'Brake harness / line routed down the strut.' });
    }
    b.add({
      ...base, key: `${leg.tag}-actuator`, label: 'Retraction actuator', phase: 0.2, system: 'hydraulics', mat: 'hydraulic', geometry: unitBox(),
      items: [{ name: `${leg.nose ? 'Steering / retraction' : 'Retraction'} actuator ${leg.tag}`, matrix: beamMatrix(A.clone().add(V(leg.nose ? 1.2 : 0, 0.1, leg.nose ? 0 : -side * 1.0)), A.clone().lerp(mid, 0.4), 0.1, 0.1) }],
      note: 'Hydraulic retraction actuator.',
    });
    const doorW = leg.nose ? 0.6 : 1.4;
    b.add({
      ...base, key: `${leg.tag}-doors`, label: 'Gear door', phase: 0.45, system: 'airframe', mat: 'skin', geometry: unitBox(),
      items: [1, -1].map((k) => ({ name: `Gear door ${leg.tag}-${k > 0 ? 'A' : 'B'}`, matrix: compose(A.clone().add(leg.nose ? V(0, -0.6, k * 0.5) : V(k * 0.9, -0.7, side * 0.3)), undefined, leg.nose ? V(2.4, 1.0, 0.04) : V(doorW, 1.6, 0.04)) })),
      note: 'Strut-mounted gear door, closes flush on retraction.',
    });
    b.add({
      ...base, key: `${leg.tag}-hinges`, label: 'Hinge', phase: 0.5, system: 'airframe', mat: 'metal', geometry: unitBox(),
      items: [0, 1, 2, 3].map((i) => ({ name: `Hinge fitting ${leg.tag}-${i + 1}`, matrix: compose(A.clone().add(V((i - 1.5) * 0.5, 0.05, 0)), undefined, V(0.14, 0.14, 0.14)) })),
      note: 'Titanium hinge fitting.',
    });
  });
}
