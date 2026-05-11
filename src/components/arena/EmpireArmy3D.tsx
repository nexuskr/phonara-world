import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ArmyState, Side } from "@/lib/trading/armyMapping";

/**
 * 3D 군대 렌더러 — InstancedMesh로 수백개 병사를 단일 draw call로 그림.
 * 가격 변동 → frontline/marchSpeed/shake/particle 매핑으로 실시간 전투 연출.
 */

const ALLY_COLOR = new THREE.Color("#FFD700");
const ENEMY_COLOR = new THREE.Color("#FF4D4D");
const ALLY_COUNT = 80;
const ENEMY_COUNT = 64;

function Formation({
  count, color, baseX, side, state,
}: { count: number; color: THREE.Color; baseX: number; side: "ally" | "enemy"; state: ArmyState }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Static slot offsets (grid formation)
  const slots = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const arr: { x: number; z: number; phase: number }[] = [];
    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      arr.push({
        x: (c - cols / 2) * 0.55 + (r % 2) * 0.27,
        z: (r - rows / 2) * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    const m = meshRef.current;
    if (!m) return;
    const t = clock.getElapsedTime();
    // direction: ally advances when frontline grows; enemy retreats inversely
    const advance = (state.frontline - 0.4) * 4; // -1.6 ~ 2.4
    const targetX = side === "ally" ? baseX + advance : baseX - advance;
    const shake = state.shake;
    const bob = 0.04 + state.marchSpeed * 0.1;
    for (let i = 0; i < count; i++) {
      const s = slots[i];
      const shakeX = (Math.sin(t * 8 + s.phase) - 0.5) * shake * 0.25;
      const shakeZ = (Math.cos(t * 7 + s.phase) - 0.5) * shake * 0.25;
      const y = Math.abs(Math.sin(t * 5 + s.phase)) * bob;
      dummy.position.set(targetX + s.x + shakeX, y, s.z + shakeZ);
      dummy.rotation.y = side === "ally" ? -Math.PI / 2 : Math.PI / 2;
      dummy.scale.setScalar(0.4 + state.morale * 0.3);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow>
      <capsuleGeometry args={[0.12, 0.3, 4, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.6} />
    </instancedMesh>
  );
}

function Banner({ x, color, count }: { x: number; color: THREE.Color; count: number }) {
  return (
    <group position={[x, 0.7, -2]}>
      <mesh>
        <coneGeometry args={[0.18, 0.55, 5]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function Sparks({ state }: { state: ArmyState }) {
  const ref = useRef<THREE.Points>(null!);
  const count = 60;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 2;
      arr[i * 3 + 1] = Math.random() * 1.2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    const p = ref.current;
    if (!p) return;
    const t = clock.getElapsedTime();
    p.rotation.y = t * 0.4;
    const mat = p.material as THREE.PointsMaterial;
    mat.opacity = state.particle;
    mat.size = 0.05 + state.particle * 0.08;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#FFD27A" transparent opacity={0} sizeAttenuation />
    </points>
  );
}

function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[14, 8]} />
        <meshStandardMaterial color="#1a1410" roughness={1} />
      </mesh>
      {/* center battle line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[0.05, 6]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={0.35} />
      </mesh>
    </>
  );
}

function Scene({ side, state }: { side: Side; state: ArmyState }) {
  // Ally always on the left when long; flip when short to keep narrative
  const allyBaseX = side === "long" ? -2.2 : 2.2;
  const enemyBaseX = side === "long" ? 2.2 : -2.2;

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 3]} intensity={1.1} castShadow />
      <pointLight position={[0, 1.2, 0]} intensity={state.particle * 4} color="#FFB347" distance={6} />
      <fog attach="fog" args={["#0a0a0f", 4, 12]} />

      <Ground />
      <Formation count={ALLY_COUNT} color={ALLY_COLOR} baseX={allyBaseX} side="ally" state={state} />
      <Formation count={ENEMY_COUNT} color={ENEMY_COLOR} baseX={enemyBaseX} side="enemy" state={state} />
      <Banner x={allyBaseX} color={ALLY_COLOR} count={ALLY_COUNT} />
      <Banner x={enemyBaseX} color={ENEMY_COLOR} count={ENEMY_COUNT} />
      <Sparks state={state} />
    </>
  );
}

export default function EmpireArmy3D({ side, state }: { side: Side; state: ArmyState }) {
  return (
    <div className="w-full" style={{ height: 260 }}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 2.6, 5.2], fov: 50 }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <Scene side={side} state={state} />
        </Suspense>
      </Canvas>
    </div>
  );
}
