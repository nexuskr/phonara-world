// PR-B Empire Hall — 3D castle stage.
// Lightweight R3F scene: rotating central keep, four towers, animated banner that
// changes color per Empire Level, particle Crown fountain, and a floating Booster
// halo when an Empire Booster is active. Performance: a few hundred verts +
// instanced particles — safe on mobile.
import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const TIER_HEX: Record<number, string> = {
  1: "#a1a1aa", 2: "#10b981", 3: "#0ea5e9", 4: "#6366f1", 5: "#a855f7",
  6: "#f59e0b", 7: "#ec4899", 8: "#d946ef", 9: "#38bdf8", 10: "#fbbf24",
};

function Tower({ x, z, h = 2.4 }: { x: number; z: number; h?: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.55, h, 16]} />
        <meshStandardMaterial color="#2b2519" roughness={0.85} metalness={0.15} />
      </mesh>
      <mesh position={[0, h + 0.25, 0]}>
        <coneGeometry args={[0.55, 0.6, 16]} />
        <meshStandardMaterial color="#181208" roughness={0.7} metalness={0.2} />
      </mesh>
    </group>
  );
}

function Keep({ levelColor }: { levelColor: string }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((_, dt) => { if (g.current) g.current.rotation.y += dt * 0.12; });
  return (
    <group ref={g}>
      {/* Main keep */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[2.2, 3, 2.2]} />
        <meshStandardMaterial color="#3a3122" roughness={0.8} metalness={0.2} />
      </mesh>
      {/* Crenellation */}
      {[-0.9, -0.3, 0.3, 0.9].map((x) => (
        <mesh key={x} position={[x, 3.15, 1.05]}>
          <boxGeometry args={[0.35, 0.3, 0.2]} />
          <meshStandardMaterial color="#3a3122" />
        </mesh>
      ))}
      {/* Door */}
      <mesh position={[0, 0.7, 1.11]}>
        <planeGeometry args={[0.7, 1.4]} />
        <meshStandardMaterial color="#0c0905" />
      </mesh>
      {/* Banner */}
      <group position={[0, 4.3, 0]}>
        <mesh>
          <cylinderGeometry args={[0.04, 0.04, 1.6, 8]} />
          <meshStandardMaterial color="#cbb472" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[0.55, 0.1, 0]}>
          <planeGeometry args={[1.0, 0.7]} />
          <meshStandardMaterial color={levelColor} side={THREE.DoubleSide} emissive={levelColor} emissiveIntensity={0.45} />
        </mesh>
      </group>
    </group>
  );
}

function CrownFountain({ count = 80 }: { count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () => Array.from({ length: count }).map(() => ({
      a: Math.random() * Math.PI * 2,
      r: 0.05 + Math.random() * 0.4,
      sp: 0.6 + Math.random() * 1.1,
      ph: Math.random() * 4,
    })),
    [count],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!mesh.current) return;
    seeds.forEach((s, i) => {
      const life = ((t * s.sp + s.ph) % 4) / 4; // 0..1
      const y = life * 3.2;
      const x = Math.cos(s.a) * (s.r + life * 0.15);
      const z = Math.sin(s.a) * (s.r + life * 0.15);
      const sc = 0.06 * (1 - life * 0.6);
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(Math.max(0.005, sc));
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined as any, undefined as any, count]} position={[0, 0.05, 0]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#fce8a1" emissive="#d4af37" emissiveIntensity={1.4} roughness={0.2} />
    </instancedMesh>
  );
}

function BoosterHalo({ active }: { active: boolean }) {
  const ring = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const t = clock.elapsedTime;
    ring.current.rotation.z = t * 0.4;
    const s = 1 + Math.sin(t * 2.2) * 0.04;
    ring.current.scale.set(s, s, 1);
  });
  if (!active) return null;
  return (
    <mesh ref={ring} position={[0, 4.6, 0]} rotation={[Math.PI / 2.2, 0, 0]}>
      <torusGeometry args={[0.95, 0.06, 12, 64]} />
      <meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={1.6} />
    </mesh>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <circleGeometry args={[6, 64]} />
      <meshStandardMaterial color="#0d0a06" roughness={0.95} metalness={0.05} />
    </mesh>
  );
}

export function EmpireHallScene({ level, boosterActive }: { level: number; boosterActive: boolean }) {
  const lv = Math.max(1, Math.min(10, level));
  const color = TIER_HEX[lv];
  return (
    <Canvas
      shadows
      dpr={[1, 1.6]}
      camera={{ position: [4.4, 3.6, 5.6], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#06050b"]} />
      <fog attach="fog" args={["#06050b", 7, 16]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow color={color} />
      <pointLight position={[0, 4, 0]} intensity={0.8} color="#fce8a1" />
      <Suspense fallback={null}>
        <Ground />
        <Tower x={-2.2} z={-2.2} />
        <Tower x={2.2} z={-2.2} />
        <Tower x={-2.2} z={2.2} />
        <Tower x={2.2} z={2.2} />
        <Keep levelColor={color} />
        <CrownFountain />
        <BoosterHalo active={boosterActive} />
      </Suspense>
    </Canvas>
  );
}

export default EmpireHallScene;
