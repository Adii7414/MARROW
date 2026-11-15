import * as THREE from 'three';
import type { AnimKind, MatKey, PartGroup, SystemKey } from './types';
import { V } from './geom';

const PREFIX_BASE: Record<string, number> = { MF: 1000, MW: 3000, MT: 4000, MP: 5000, MG: 6000, MC: 7000, MS: 8000, ML: 9000 };

export interface AddOpts {
  key: string;
  label: string;
  assembly: string;
  prefix: keyof typeof PREFIX_BASE | string;
  stage: number;
  phase?: number;
  system: SystemKey;
  mat: MatKey;
  geometry: THREE.BufferGeometry;
  items: { matrix?: THREE.Matrix4; name: string }[];
  explode?: THREE.Vector3;
  enter?: THREE.Vector3;
  frame?: { pivot: THREE.Vector3; axis: THREE.Vector3; anim: AnimKind; max: number };
  cuttable?: boolean;
  interior?: boolean;
  note: string;
}

export class Builder {
  groups: (PartGroup & { phase: number })[] = [];
  private counters: Record<string, number> = {};

  add(o: AddOpts) {
    if (!o.items.length) return;
    const base = PREFIX_BASE[o.prefix] ?? 1000;
    const n = this.counters[o.prefix] ?? base;
    const instances = o.items.map((it, i) => ({
      matrix: it.matrix ?? new THREE.Matrix4(),
      name: it.name,
      number: `${o.prefix}-${String(n + i).padStart(4, '0')}`,
    }));
    this.counters[o.prefix] = n + o.items.length;
    let key = o.key;
    let k = 2;
    while (this.groups.some((g) => g.key === key)) key = `${o.key}-${k++}`;
    this.groups.push({
      key,
      label: o.label,
      assembly: o.assembly,
      stage: o.stage,
      phase: o.phase ?? 0,
      system: o.system,
      mat: o.mat,
      geometry: o.geometry,
      instances,
      explode: o.explode ?? V(),
      enter: o.enter ?? V(0, 12, 0),
      frame: o.frame,
      cuttable: o.cuttable,
      interior: o.interior,
      note: o.note,
    });
  }
}
