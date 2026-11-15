import { VARIANTS, type VariantId } from '../model/variants';
import { makeProfile } from '../model/fuselage';
import { interp } from '../model/surfaces';

export interface Planform {
  fuselage: string;
  wing: string;
  tail: string;
  engines: string;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  centerline: number;
}

const f = (n: number) => n.toFixed(2);

/** Top view: screen x = -modelX (nose to the right is reversed: nose LEFT→ we use nose right), screen y = modelZ */
export function topView(id: VariantId): Planform {
  const v = VARIANTS[id];
  const prof = makeProfile(v);
  const L = v.length;
  const xs = Array.from({ length: 80 }, (_, i) => L / 2 - (L * i) / 79);
  const up = xs.map((x) => `${f(x)},${f(-prof(x).rz)}`);
  const lo = [...xs].reverse().map((x) => `${f(x)},${f(prof(x).rz)}`);
  const fuselage = `M${up.join(' L')} L${lo.join(' L')} Z`;
  const surf = (st: typeof v.wing.stations) => {
    const le = st.map((s) => [s.le, s.s] as const);
    const te = [...st].reverse().map((s) => [s.le - s.c, s.s] as const);
    const r = [...le, ...te].map(([x, z]) => `${f(x)},${f(z)}`);
    const l = [...le, ...te].map(([x, z]) => `${f(x)},${f(-z)}`);
    return `M${r.join(' L')} Z M${l.join(' L')} Z`;
  };
  const engines = v.engines
    .map((e) => {
      const w = e.rf * 1.24;
      return `M${f(e.x)},${f(e.z - w)} L${f(e.x - 6.3)},${f(e.z - w * 0.9)} L${f(e.x - 8.3)},${f(e.z - w * 0.35)} L${f(e.x - 8.3)},${f(e.z + w * 0.35)} L${f(e.x - 6.3)},${f(e.z + w * 0.9)} L${f(e.x)},${f(e.z + w)} Z`;
    })
    .join(' ');
  const span = v.wing.stations[v.wing.stations.length - 1].s;
  return {
    fuselage,
    wing: surf(v.wing.stations),
    tail: v.hstab ? surf(v.hstab.stations) : '',
    engines,
    bounds: { minX: -L / 2, maxX: L / 2, minY: -span, maxY: span },
    centerline: 0,
  };
}

/** Side view: x = modelX, y = -modelY (svg down) */
export function sideView(id: VariantId) {
  const v = VARIANTS[id];
  const prof = makeProfile(v);
  const L = v.length;
  const xs = Array.from({ length: 90 }, (_, i) => L / 2 - (L * i) / 89);
  const top = xs.map((x) => `${f(x)},${f(-(prof(x).cy + prof(x).ry))}`);
  const bot = [...xs].reverse().map((x) => `${f(x)},${f(-(prof(x).cy - prof(x).ry))}`);
  const fuselage = `M${top.join(' L')} L${bot.join(' L')} Z`;
  const fs = v.fin.stations;
  const fx = fs[0].le - fs[0].c * 0.45;
  const fp = prof(fx);
  const y0 = fp.cy + fp.ry * 0.82;
  const le = fs.map((s) => `${f(s.le)},${f(-(y0 + s.s))}`);
  const te = [...fs].reverse().map((s) => `${f(s.le - s.c)},${f(-(y0 + s.s))}`);
  const fin = `M${le.join(' L')} L${te.join(' L')} Z`;
  const windows = Array.from({ length: 40 }, (_, i) => L / 2 - 0.17 * L - i * ((0.63 * L) / 39)).map((x) => `M${f(x)},${f(-(prof(x).cy + prof(x).ry * 0.2))} h0.25`).join(' ');
  const engines = v.engines.filter((e) => e.z >= 0).map((e) => `M${f(e.x)},${f(-(e.y + e.rf * 1.24))} L${f(e.x - 6.3)},${f(-(e.y + e.rf * 1.1))} L${f(e.x - 8.3)},${f(-(e.y + e.rf * 0.4))} L${f(e.x - 8.3)},${f(-(e.y - e.rf * 0.4))} L${f(e.x - 6.3)},${f(-(e.y - e.rf * 1.1))} L${f(e.x)},${f(-(e.y - e.rf * 1.24))} Z`).join(' ');
  const w0 = interp(v.wing.stations, 0);
  const wing = `M${f(w0.le)},${f(-(v.wing.y ?? 0))} L${f(w0.le - w0.c)},${f(-(v.wing.y ?? 0) + 0.3)}`;
  const finTop = y0 + fs[fs.length - 1].s;
  return { fuselage, fin, windows, engines, wing, bounds: { minX: -L / 2, maxX: L / 2, minY: -finTop, maxY: -v.gear.ground }, ground: -v.gear.ground };
}
