// Joukowski potential flow — illustrative only.
export interface Section { name: string; mx: number; my: number }
export const SECTIONS: Section[] = [
  { name: 'ROOT', mx: -0.11, my: 0.07 },
  { name: 'KINK', mx: -0.085, my: 0.06 },
  { name: 'TIP', mx: -0.065, my: 0.045 },
];

type C = [number, number];
const add = (a: C, b: C): C => [a[0] + b[0], a[1] + b[1]];
const sub = (a: C, b: C): C => [a[0] - b[0], a[1] - b[1]];
const mul = (a: C, b: C): C => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const div = (a: C, b: C): C => {
  const d = b[0] * b[0] + b[1] * b[1] || 1e-9;
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
const exp = (t: number): C => [Math.cos(t), Math.sin(t)];
const sqrtC = (a: C): C => {
  const r = Math.hypot(a[0], a[1]);
  const t = Math.atan2(a[1], a[0]) / 2;
  return [Math.sqrt(r) * Math.cos(t), Math.sqrt(r) * Math.sin(t)];
};

export function makeFlow(sec: Section, alphaDeg: number) {
  const a = (alphaDeg * Math.PI) / 180;
  const mu: C = [sec.mx, sec.my];
  const R = Math.hypot(1 - mu[0], mu[1]);
  const beta = Math.asin(mu[1] / R);
  const G = 4 * Math.PI * R * Math.sin(a + beta);
  const joukowski = (z: C): C => add(z, div([1, 0], z));
  const W = (z: C): C => {
    const zm = sub(z, mu);
    const t1 = exp(-a);
    const t2 = div(mul([R * R, 0], exp(a)), mul(zm, zm));
    const t3 = div([0, G / (2 * Math.PI)], zm);
    return add(sub(t1, t2), t3);
  };
  const velZeta = (z: C): C => {
    const d = sub([1, 0], div([1, 0], mul(z, z)));
    return div(W(z), d);
  };
  const inverse = (zeta: C): C => {
    const s = sqrtC(sub(mul(zeta, zeta), [4, 0]));
    const z1: C = [(zeta[0] + s[0]) / 2, (zeta[1] + s[1]) / 2];
    const z2: C = [(zeta[0] - s[0]) / 2, (zeta[1] - s[1]) / 2];
    return Math.hypot(...sub(z1, mu)) >= Math.hypot(...sub(z2, mu)) ? z1 : z2;
  };
  const surface = Array.from({ length: 120 }, (_, i) => {
    const t = (i / 120) * Math.PI * 2;
    return joukowski(add(mu, [R * Math.cos(t), R * Math.sin(t)]));
  });
  const xs = surface.map((p) => p[0]);
  const chord = Math.max(...xs) - Math.min(...xs);
  const stall = Math.max(0, alphaDeg - 14);
  const CL = ((2 * G) / chord) * (stall > 0 ? Math.max(0.5, 1 - stall * 0.11) : 1);
  const CD = 0.0075 + 0.00065 * alphaDeg * alphaDeg + stall * 0.03;

  /** trace a streamline, return ζ points */
  const trace = (y0: number) => {
    let z: C = [-4.5 * Math.cos(a) - y0 * Math.sin(a), -4.5 * Math.sin(a) + y0 * Math.cos(a)];
    // rotate start so that freestream direction aligns
    const pts: C[] = [];
    let near = Infinity;
    for (let i = 0; i < 1400; i++) {
      const w = W(z);
      const v: C = [w[0], -w[1]];
      const sp = Math.hypot(v[0], v[1]);
      if (sp < 0.02) break;
      const h = 0.035 / Math.max(0.35, sp);
      const mid: C = [z[0] + (v[0] * h) / 2, z[1] + (v[1] * h) / 2];
      const wm = W(mid);
      z = [z[0] + wm[0] * h, z[1] - wm[1] * h];
      const zr = Math.hypot(...sub(z, mu));
      if (zr < R * 1.002) break;
      near = Math.min(near, zr - R);
      if (i % 2 === 0) pts.push(joukowski(z));
      if (z[0] * Math.cos(a) + z[1] * Math.sin(a) > 5.5 || Math.abs(z[1]) > 7) break;
    }
    return { pts, near };
  };
  return { a, mu, R, G, W, velZeta, inverse, surface, chord, CL, CD, trace, stall, joukowski };
}
