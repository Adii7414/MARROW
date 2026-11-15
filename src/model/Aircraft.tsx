import * as THREE from 'three';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import type { PartGroup, SystemKey } from './types';
import type { VariantId } from './variants';
import { getAircraft } from './generator';
import { createMaterials, PRIMER, SKINS, type MaterialSet, type SkinKey } from './materials';

export interface Controls {
  build: number; explode: number; cut: number; blueprint: number; gear: number; flaps: number; spoilers: number;
  roll: number; pitch: number; yaw: number; spin: number; lights: number;
}
export const DEFAULT_CONTROLS: Controls = { build: 8, explode: 0, cut: 0, blueprint: 0, gear: 1, flaps: 0, spoilers: 0, roll: 0, pitch: 0, yaw: 0, spin: 0.25, lights: 0.6 };

export interface PickedPart { group: PartGroup; index: number; name: string; number: string; point: THREE.Vector3 }

export interface AircraftProps {
  variant?: VariantId;
  controls?: Partial<Controls>;
  lite?: boolean;
  skin?: SkinKey;
  livery?: string;
  focusSystem?: SystemKey | null;
  focusStage?: number | null;
  isolate?: string | null;
  selected?: { key: string; index: number } | null;
  exclude?: (g: PartGroup) => boolean;
  onPick?: (p: PickedPart) => void;
  onHover?: (p: PickedPart | null) => void;
  instant?: boolean;
  damping?: number;
}

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const HL = new THREE.Color(2.4, 0.75, 0.45);
const WHITE = new THREE.Color(1, 1, 1);

export default function Aircraft(props: AircraftProps) {
  const { variant = 'M01', lite, skin = 'paint', livery = '#B34A32' } = props;
  const model = useMemo(() => getAircraft(variant), [variant]);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 200), []);
  const mats = useMemo(() => createMaterials(plane), [plane]);
  useEffect(() => () => mats.dispose(), [mats]);

  const target = useRef<Controls>({ ...DEFAULT_CONTROLS });
  target.current = { ...DEFAULT_CONTROLS, ...props.controls };
  const live = useRef<Controls>({ ...target.current });
  const skinTarget = useRef(new THREE.Color(SKINS[skin].color));
  skinTarget.current.set(SKINS[skin].color);
  const instant = !!props.instant;

  useFrame((_, dt) => {
    const k = instant ? 1 : 1 - Math.exp(-dt * (props.damping ?? 3.2));
    const L = live.current;
    const T = target.current;
    (Object.keys(T) as (keyof Controls)[]).forEach((key) => {
      L[key] += (T[key] - L[key]) * k;
      if (Math.abs(T[key] - L[key]) < 0.0005) L[key] = T[key];
    });
    plane.constant = 120 - 120 * L.cut;
    const paint = clamp01(L.build - 6);
    const sk = SKINS[skin];
    const b = L.blueprint;
    mats.pair('skin').forEach((m) => {
      const c = new THREE.Color().copy(PRIMER).lerp(skinTarget.current, paint);
      m.color.lerp(c, instant ? 1 : 0.12);
      m.metalness += ((paint > 0.5 ? sk.metalness : 0.05) - m.metalness) * 0.12;
      m.roughness += ((paint > 0.5 ? sk.roughness : 0.7) - m.roughness) * 0.12;
      m.clearcoat += ((paint > 0.5 ? sk.clearcoat : 0) - m.clearcoat) * 0.12;
    });
    mats.pair('accent').forEach((m) => m.color.set(livery));
    ['lightRed', 'lightGreen', 'lightWhite'].forEach((n) => mats.pair(n).forEach((m) => (m.emissiveIntensity = 0.15 + 3 * L.lights)));
    const transparent = b > 0.01;
    mats.all.forEach((m) => {
      if (m.transparent !== transparent) {
        m.transparent = transparent;
        m.depthWrite = !transparent;
        m.needsUpdate = true;
      }
      m.opacity = 1 - 0.96 * b;
    });
    mats.wire.opacity = 0.55 * b;
  });

  const groups = model.groups.filter((g) => !(lite && g.interior) && !(props.exclude && props.exclude(g)));
  return (
    <group>
      {groups.map((g) => {
        const ghosted =
          (!!props.focusSystem && g.system !== props.focusSystem) ||
          (props.focusStage != null && g.stage !== props.focusStage) ||
          (!!props.isolate && g.key !== props.isolate);
        return (
          <GroupMesh
            key={g.key}
            g={g}
            mats={mats}
            live={live}
            ghosted={ghosted}
            selIndex={props.selected?.key === g.key ? props.selected.index : -1}
            onPick={ghosted ? undefined : props.onPick}
            onHover={ghosted ? undefined : props.onHover}
          />
        );
      })}
    </group>
  );
}

interface GMProps {
  g: PartGroup;
  mats: MaterialSet;
  live: React.MutableRefObject<Controls>;
  ghosted: boolean;
  selIndex: number;
  onPick?: (p: PickedPart) => void;
  onHover?: (p: PickedPart | null) => void;
}

function GroupMesh({ g, mats, live, ghosted, selIndex, onPick, onHover }: GMProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const wire = useRef<THREE.InstancedMesh>(null);
  const outer = useRef<THREE.Group>(null);
  const last = useRef({ build: -1, explode: -1 });
  const spin = useRef(Math.random() * 6);
  const n = g.instances.length;
  const tmp = useMemo(() => new THREE.Matrix4(), []);
  const off = useMemo(() => new THREE.Vector3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);

  useLayoutEffect(() => {
    const m = mesh.current!;
    for (let i = 0; i < n; i++) m.setColorAt(i, i === selIndex ? HL : WHITE);
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [selIndex, n]);

  useLayoutEffect(() => {
    if (wire.current && mesh.current) wire.current.instanceMatrix = mesh.current.instanceMatrix;
    last.current = { build: -1, explode: -1 };
  }, []);

  useFrame((state, dt) => {
    const L = live.current;
    const m = mesh.current;
    if (!m) return;
    if (Math.abs(L.build - last.current.build) > 0.0004 || Math.abs(L.explode - last.current.explode) > 0.0004) {
      last.current = { build: L.build, explode: L.explode };
      const local = clamp01((L.build - g.stage - g.phase) / 0.45);
      for (let i = 0; i < n; i++) {
        const a = n > 1 ? (i / (n - 1)) * 0.55 : 0;
        const t = clamp01((local - a) / 0.45);
        if (t <= 0) {
          m.setMatrixAt(i, ZERO);
          continue;
        }
        const e = easeOut(t);
        off.copy(g.enter).multiplyScalar(1 - e).addScaledVector(g.explode, L.explode);
        tmp.makeTranslation(off.x, off.y, off.z).multiply(g.instances[i].matrix);
        m.setMatrixAt(i, tmp);
      }
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
    }
    if (wire.current) wire.current.visible = L.blueprint > 0.01 && !ghosted;
    const f = g.frame;
    if (f && (f.anim === 'strobe' || f.anim === 'beacon')) {
      const period = f.anim === 'strobe' ? 1.3 : 1.0;
      const on = f.anim === 'strobe' ? 0.08 : 0.5;
      m.visible = L.lights < 0.5 || state.clock.elapsedTime % period < on;
    } else if (f && outer.current) {
      let ang = 0;
      switch (f.anim) {
        case 'spin': spin.current += dt * f.max * L.spin; ang = spin.current; break;
        case 'flap': ang = f.max * L.flaps; break;
        case 'slat': ang = f.max * L.flaps; break;
        case 'spoiler': ang = f.max * Math.max(L.spoilers, L.roll > 0 && g.key.includes('wing-r') ? L.roll : L.roll < 0 && g.key.includes('wing-l') ? -L.roll : 0); break;
        case 'aileronR': ang = f.max * L.roll; break;
        case 'aileronL': ang = -f.max * L.roll; break;
        case 'elevator': ang = f.max * L.pitch; break;
        case 'rudder': ang = f.max * L.yaw; break;
        case 'gearMain':
        case 'gearNose': ang = f.max * (1 - L.gear); break;
      }
      q.setFromAxisAngle(f.axis, ang);
      outer.current.quaternion.copy(q);
    }
  });

  const material = ghosted ? mats.ghost : mats.get(g.mat, g.cuttable);
  const info = (e: ThreeEvent<PointerEvent | MouseEvent>): PickedPart | null => {
    const i = e.instanceId;
    if (i == null) return null;
    return { group: g, index: i, name: g.instances[i].name, number: g.instances[i].number, point: e.point.clone() };
  };
  const meshes = (
    <>
      <instancedMesh
        ref={mesh}
        args={[g.geometry, undefined, n]}
        material={material}
        frustumCulled={false}
        castShadow={!ghosted && g.mat !== 'glass'}
        receiveShadow
        onClick={onPick ? (e) => { e.stopPropagation(); const p = info(e); if (p) onPick(p); } : undefined}
        onPointerMove={onHover ? (e) => { e.stopPropagation(); onHover(info(e)); } : undefined}
        onPointerOut={onHover ? () => onHover(null) : undefined}
      />
      <instancedMesh ref={wire} args={[g.geometry, mats.wire, n]} frustumCulled={false} visible={false} raycast={() => null} />
    </>
  );
  if (!g.frame || g.frame.anim === 'strobe' || g.frame.anim === 'beacon') return meshes;
  const p = g.frame.pivot;
  return (
    <group position={p}>
      <group ref={outer}>
        <group position={[-p.x, -p.y, -p.z]}>{meshes}</group>
      </group>
    </group>
  );
}
