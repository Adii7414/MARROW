import * as THREE from 'three';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export { V };

/** Loft a series of point loops into a surface. */
export function loftLoops(loops: THREE.Vector3[][], closed: boolean, cap = false): THREE.BufferGeometry {
  const S = loops.length;
  const L = loops[0].length;
  const pos: number[] = [];
  const idx: number[] = [];
  loops.forEach((loop) => loop.forEach((p) => pos.push(p.x, p.y, p.z)));
  const segs = closed ? L : L - 1;
  for (let s = 0; s < S - 1; s++) {
    for (let j = 0; j < segs; j++) {
      const a = s * L + j;
      const b = s * L + ((j + 1) % L);
      const c = (s + 1) * L + j;
      const d = (s + 1) * L + ((j + 1) % L);
      idx.push(a, c, b, b, c, d);
    }
  }
  if (cap) {
    [0, S - 1].forEach((s, k) => {
      const centre = new THREE.Vector3();
      loops[s].forEach((p) => centre.add(p));
      centre.divideScalar(L);
      const ci = pos.length / 3;
      pos.push(centre.x, centre.y, centre.z);
      for (let j = 0; j < L; j++) {
        const a = s * L + j;
        const b = s * L + ((j + 1) % L);
        if (k === 0) idx.push(ci, b, a);
        else idx.push(ci, a, b);
      }
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Thickness distribution — NACA 4-digit, scaled. */
export function airfoilY(x: number, t: number, side: 1 | -1) {
  const xc = Math.min(Math.max(x, 0), 1);
  const yt = 5 * t * (0.2969 * Math.sqrt(xc) - 0.126 * xc - 0.3516 * xc ** 2 + 0.2843 * xc ** 3 - 0.1036 * xc ** 4);
  // flattened-top supercritical camber, aft loaded
  const camber = 0.018 * Math.sin(Math.PI * Math.pow(xc, 0.8)) + 0.012 * Math.pow(xc, 3) * (1 - xc) * 6;
  return camber + side * yt;
}

function cosSpace(a: number, b: number, n: number) {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) {
    const k = (1 - Math.cos((i / n) * Math.PI)) / 2;
    out.push(a + (b - a) * k);
  }
  return out;
}

/** Closed 2D loop of an airfoil chord slice: upper x1→x0 then lower x0→x1. */
export function airfoilLoop(x0: number, x1: number, n: number, t: number): [number, number][] {
  const xs = cosSpace(x0, x1, n);
  const up = [...xs].reverse().map((x) => [x, airfoilY(x, t, 1)] as [number, number]);
  const lo = xs.slice(1, xs.length - (x1 >= 0.999 ? 1 : 0)).map((x) => [x, airfoilY(x, t, -1)] as [number, number]);
  return [...up, ...lo];
}

export function airfoilSide(x0: number, x1: number, n: number, t: number, side: 1 | -1): [number, number][] {
  return cosSpace(x0, x1, n).map((x) => [x, airfoilY(x, t, side)] as [number, number]);
}

/** Beam matrix: unit box (1×1×1, long axis X) stretched from a to b. */
export function beamMatrix(a: THREE.Vector3, b: THREE.Vector3, w: number, h: number) {
  const dir = b.clone().sub(a);
  const len = dir.length() || 0.0001;
  const q = new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), dir.normalize());
  const mid = a.clone().add(b).multiplyScalar(0.5);
  return new THREE.Matrix4().compose(mid, q, V(len, h, w));
}

/** Matrix placing an object at p with +Z facing along normal. */
export function surfaceMatrix(p: THREE.Vector3, normal: THREE.Vector3, scale: THREE.Vector3, up = V(0, 1, 0)) {
  const m = new THREE.Matrix4().lookAt(V(), normal.clone().normalize(), Math.abs(normal.clone().normalize().dot(up)) > 0.98 ? V(1, 0, 0) : up);
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  return new THREE.Matrix4().compose(p, q, scale);
}

export function compose(p: THREE.Vector3, euler: THREE.Euler = new THREE.Euler(), s: THREE.Vector3 = V(1, 1, 1)) {
  return new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(euler), s);
}

/** Lathe around the X axis. profile: [x, r][] */
export function latheX(profile: [number, number][], segments = 48, phiStart = 0, phiLength = Math.PI * 2) {
  const pts = profile.map(([x, r]) => new THREE.Vector2(Math.max(r, 0.0001), x));
  const g = new THREE.LatheGeometry(pts, segments, phiStart, phiLength);
  g.rotateZ(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

export const unitBox = () => new THREE.BoxGeometry(1, 1, 1);

/** A twisted turbomachinery blade, root at y=0, span along +y. */
export function bladeGeometry(chord: number, span: number, thick: number, twistRoot: number, twistTip: number, sweep = 0) {
  const g = new THREE.BoxGeometry(chord, span, thick, 2, 10, 1);
  g.translate(0, span / 2, 0);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = y / span;
    const a = twistRoot + (twistTip - twistRoot) * k;
    const taper = 1 - 0.25 * k;
    const xx = x * taper;
    p.setXYZ(i, xx * Math.cos(a) - z * Math.sin(a) - sweep * k * span, y, xx * Math.sin(a) + z * Math.cos(a));
  }
  g.computeVertexNormals();
  return g;
}

export function merge(geoms: THREE.BufferGeometry[]) {
  // light-weight merge (non-indexed)
  const parts = geoms.map((g) => (g.index ? g.toNonIndexed() : g));
  let total = 0;
  parts.forEach((g) => (total += g.attributes.position.count));
  const pos = new Float32Array(total * 3);
  let o = 0;
  parts.forEach((g) => {
    pos.set(g.attributes.position.array as Float32Array, o);
    o += g.attributes.position.count * 3;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.computeVertexNormals();
  return out;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
