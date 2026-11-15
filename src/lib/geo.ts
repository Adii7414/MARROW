export interface City { code: string; name: string; lat: number; lon: number }
export const CITIES: City[] = [
  { code: 'LHR', name: 'London', lat: 51.47, lon: -0.45 },
  { code: 'JFK', name: 'New York', lat: 40.64, lon: -73.78 },
  { code: 'LAX', name: 'Los Angeles', lat: 33.94, lon: -118.41 },
  { code: 'GRU', name: 'São Paulo', lat: -23.43, lon: -46.47 },
  { code: 'SIN', name: 'Singapore', lat: 1.36, lon: 103.99 },
  { code: 'HND', name: 'Tokyo', lat: 35.55, lon: 139.78 },
  { code: 'SYD', name: 'Sydney', lat: -33.94, lon: 151.18 },
  { code: 'DXB', name: 'Dubai', lat: 25.25, lon: 55.36 },
  { code: 'JNB', name: 'Johannesburg', lat: -26.14, lon: 28.24 },
  { code: 'KEF', name: 'Reykjavík', lat: 63.99, lon: -22.62 },
  { code: 'BOM', name: 'Mumbai', lat: 19.09, lon: 72.87 },
  { code: 'HKG', name: 'Hong Kong', lat: 22.31, lon: 113.91 },
  { code: 'CDG', name: 'Paris', lat: 49.01, lon: 2.55 },
  { code: 'MEX', name: 'Mexico City', lat: 19.44, lon: -99.07 },
  { code: 'NBO', name: 'Nairobi', lat: -1.32, lon: 36.93 },
  { code: 'ANC', name: 'Anchorage', lat: 61.17, lon: -149.99 },
  { code: 'HNL', name: 'Honolulu', lat: 21.32, lon: -157.92 },
  { code: 'AKL', name: 'Auckland', lat: -37.0, lon: 174.79 },
  { code: 'SCL', name: 'Santiago', lat: -33.39, lon: -70.79 },
  { code: 'CAI', name: 'Cairo', lat: 30.12, lon: 31.41 },
  { code: 'BLR', name: 'Bengaluru', lat: 13.2, lon: 77.7 },
  { code: 'YVR', name: 'Vancouver', lat: 49.19, lon: -123.18 },
  { code: 'IST', name: 'Istanbul', lat: 41.26, lon: 28.74 },
  { code: 'LIM', name: 'Lima', lat: -12.02, lon: -77.11 },
];

const R2D = 180 / Math.PI;
const D2R = Math.PI / 180;
export const EARTH_KM = 6371;
export type V3 = [number, number, number];

export const toVec = (lat: number, lon: number): V3 => [Math.cos(lat * D2R) * Math.cos(lon * D2R), Math.cos(lat * D2R) * Math.sin(lon * D2R), Math.sin(lat * D2R)];
export const toLatLon = (v: V3): [number, number] => [Math.asin(Math.max(-1, Math.min(1, v[2]))) * R2D, Math.atan2(v[1], v[0]) * R2D];
export const angDist = (a: V3, b: V3) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
export const distKm = (a: City, b: City) => angDist(toVec(a.lat, a.lon), toVec(b.lat, b.lon)) * EARTH_KM;

export function slerp(a: V3, b: V3, t: number): V3 {
  const w = angDist(a, b);
  if (w < 1e-6) return a;
  const s = Math.sin(w);
  const k1 = Math.sin((1 - t) * w) / s;
  const k2 = Math.sin(t * w) / s;
  return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
}

/** Destination point given start, bearing (rad) and angular distance (rad). */
export function destination(lat: number, lon: number, brg: number, d: number): [number, number] {
  const p1 = lat * D2R;
  const l1 = lon * D2R;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(brg));
  const l2 = l1 + Math.atan2(Math.sin(brg) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [p2 * R2D, l2 * R2D];
}

/** Orthographic projection. Returns [x, y, z] where z<0 is the far side. */
export function project(lat: number, lon: number, lon0: number, lat0: number): V3 {
  const p = lat * D2R;
  const l = (lon - lon0) * D2R;
  const p0 = lat0 * D2R;
  const x = Math.cos(p) * Math.sin(l);
  const y = Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l);
  const z = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
  return [x, y, z];
}
