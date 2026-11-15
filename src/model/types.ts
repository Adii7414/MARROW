import * as THREE from 'three';

export type MatKey =
  | 'skin' | 'structure' | 'metal' | 'dark' | 'glass' | 'accent' | 'interior'
  | 'seat' | 'rubber' | 'lightRed' | 'lightGreen' | 'lightWhite' | 'fuel' | 'hydraulic' | 'electric' | 'composite';

export type SystemKey =
  | 'airframe' | 'propulsion' | 'controls' | 'avionics' | 'electrical'
  | 'hydraulics' | 'fuel' | 'gear' | 'cabin';

export type AnimKind =
  | 'spin' | 'flap' | 'slat' | 'aileronL' | 'aileronR' | 'spoiler' | 'elevator' | 'rudder'
  | 'gearMain' | 'gearNose' | 'strobe' | 'beacon';

export interface PartInstance {
  matrix: THREE.Matrix4;
  name: string;
  number: string;
}

export interface PartFrame {
  pivot: THREE.Vector3;
  axis: THREE.Vector3;
  anim: AnimKind;
  max: number; // radians (or rad/s for spin)
}

export interface PartGroup {
  key: string;
  label: string; // group label (e.g. "Fuselage frame")
  assembly: string; // e.g. "Fuselage"
  stage: number; // 0..7
  phase: number; // 0..0.55 offset inside the stage
  system: SystemKey;
  mat: MatKey;
  geometry: THREE.BufferGeometry;
  instances: PartInstance[];
  explode: THREE.Vector3; // exploded-view offset
  enter: THREE.Vector3; // assembly entry offset
  frame?: PartFrame;
  cuttable?: boolean; // removed by cutaway plane
  interior?: boolean; // hidden in lite mode
  note: string;
}

export interface BuiltAircraft {
  id: string;
  groups: PartGroup[];
  partCount: number;
  bounds: { length: number; span: number; height: number };
  stageCounts: number[];
}

export const STAGES = [
  'Primary structure',
  'Fuselage',
  'Wings',
  'Propulsion',
  'Systems',
  'Cabin',
  'Paint',
  'Inspection',
] as const;

export const SYSTEM_LABELS: Record<SystemKey, string> = {
  airframe: 'Airframe',
  propulsion: 'Propulsion',
  controls: 'Flight controls',
  avionics: 'Avionics',
  electrical: 'Electrical',
  hydraulics: 'Hydraulics',
  fuel: 'Fuel',
  gear: 'Landing gear',
  cabin: 'Cabin',
};
