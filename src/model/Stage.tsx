import * as THREE from 'three';
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { useReducedMotion } from 'framer-motion';

export interface Pose {
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

export function CameraRig({ pose, speed = 2.4 }: { pose: Pose; speed?: number }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: { target: THREE.Vector3; update: () => void; addEventListener: (e: string, f: () => void) => void; removeEventListener: (e: string, f: () => void) => void } | null };
  const active = useRef(true);
  const reduce = useReducedMotion();
  const key = JSON.stringify(pose);
  const p = useRef(new THREE.Vector3());
  const t = useRef(new THREE.Vector3());
  useEffect(() => {
    active.current = true;
  }, [key]);
  useEffect(() => {
    if (!controls) return;
    const stop = () => (active.current = false);
    controls.addEventListener('start', stop);
    return () => controls.removeEventListener('start', stop);
  }, [controls]);
  useFrame((_, dt) => {
    if (!active.current) return;
    const k = reduce ? 1 : 1 - Math.exp(-dt * speed);
    p.current.set(...pose.position);
    t.current.set(...pose.target);
    camera.position.lerp(p.current, k);
    if (pose.fov && Math.abs(camera.fov - pose.fov) > 0.01) {
      camera.fov += (pose.fov - camera.fov) * k;
      camera.updateProjectionMatrix();
    }
    if (controls) {
      controls.target.lerp(t.current, k);
      controls.update();
    } else camera.lookAt(t.current);
    if (camera.position.distanceTo(p.current) < 0.02 && (!controls || controls.target.distanceTo(t.current) < 0.02)) active.current = false;
  });
  return null;
}

export type Tone = 'light' | 'dark' | 'blueprint';

export function StudioLights({ tone = 'light', ground = -6.45 }: { tone?: Tone; ground?: number }) {
  return (
    <>
      <hemisphereLight args={[tone === 'dark' ? '#d8d4ca' : '#fffaf0', tone === 'dark' ? '#1a1a19' : '#b8b6ae', tone === 'dark' ? 0.35 : 0.8]} />
      <directionalLight position={[30, 50, 25]} intensity={tone === 'dark' ? 2.2 : 1.8} color="#fff4e6" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-50} shadow-camera-right={50} shadow-camera-top={50} shadow-camera-bottom={-50} />
      <directionalLight position={[-40, 10, -30]} intensity={tone === 'dark' ? 0.9 : 0.5} color="#b9d0e8" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={tone === 'dark' ? 2 : 3} position={[0, 30, 0]} rotation-x={Math.PI / 2} scale={[80, 12, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[-40, 8, 0]} rotation-y={Math.PI / 2} scale={[60, 6, 1]} color="#ffe7d0" />
        <Lightformer form="rect" intensity={1.2} position={[40, 8, 10]} rotation-y={-Math.PI / 2} scale={[60, 4, 1]} color="#d6e6ff" />
        <Lightformer form="ring" intensity={tone === 'dark' ? 1 : 0.6} position={[0, 5, 40]} scale={12} color="#B34A32" />
      </Environment>
      {tone !== 'blueprint' && <ContactShadows position={[0, ground + 0.02, 0]} opacity={tone === 'dark' ? 0.65 : 0.38} scale={140} blur={2.6} far={14} resolution={1024} color="#191A19" />}
    </>
  );
}

export interface StageProps {
  children: ReactNode;
  pose: Pose;
  orbit?: boolean;
  tone?: Tone;
  className?: string;
  ground?: number;
  minDistance?: number;
  maxDistance?: number;
  onMissed?: () => void;
  rigSpeed?: number;
  zoom?: boolean;
}

export default function Stage({ children, pose, orbit = true, tone = 'light', className, ground, minDistance = 4, maxDistance = 220, onMissed, rigSpeed, zoom = true }: StageProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    const vis = () => setVisible(!document.hidden && el.getBoundingClientRect().bottom > 0);
    document.addEventListener('visibilitychange', vis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', vis);
    };
  }, []);
  return (
    <div ref={wrap} className={className}>
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={[1, 1.75]}
        shadows
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
        camera={{ position: pose.position, fov: pose.fov ?? 30, near: 0.1, far: 900 }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
        }}
        onPointerMissed={onMissed}
      >
        <Suspense fallback={null}>
          <StudioLights tone={tone} ground={ground} />
          {children}
        </Suspense>
        {orbit && <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={minDistance} maxDistance={maxDistance} enablePan={false} enableZoom={zoom} />}
        <CameraRig pose={pose} speed={rigSpeed} />
      </Canvas>
    </div>
  );
}
