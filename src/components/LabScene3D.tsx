import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type {
  LabEffect,
  ProductForm,
  ReagentForm,
  VirtualLabExperiment,
} from "@/data/virtualLab";

/** 实验台的动画阶段 */
export type LabPhase =
  | "idle"
  | "adding"
  | "ready"
  | "igniting"
  | "reacting"
  | "done";

interface LabSceneProps {
  experiment: VirtualLabExperiment;
  phase: LabPhase;
}

/** 反应发生点（试剂所在位置），随器材类型变化 */
function reactionPoint(kind: VirtualLabExperiment["apparatus"]): [number, number, number] {
  switch (kind) {
    case "gasJar":
      return [0, -0.15, 0];
    case "testTube":
      // 试管场景：内容会被包在试管的旋转/位移组内，这里给出局部（管底）坐标
      return [0, -0.7, 0];
    default:
      return [0, 0.12, 0];
  }
}

/** 酒精灯火焰（可开关，带跳动） */
function LampFlame({ lit }: { lit: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const s = 1 + Math.sin(t * 17) * 0.1 + Math.sin(t * 6) * 0.06;
    ref.current.scale.set(s, 1 + Math.sin(t * 13) * 0.16, s);
  });
  if (!lit) return null;
  return (
    <group position={[0, -0.72, 0]}>
      <mesh ref={ref}>
        <coneGeometry args={[0.13, 0.42, 16]} />
        <meshStandardMaterial
          color="#5BA8FF"
          emissive="#3D7BFF"
          emissiveIntensity={2.2}
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh position={[0, -0.08, 0]}>
        <coneGeometry args={[0.08, 0.22, 12]} />
        <meshStandardMaterial color="#FFF3C4" emissive="#FFD54F" emissiveIntensity={3} />
      </mesh>
      <pointLight color="#7FB2FF" intensity={1.2} distance={2.5} />
    </group>
  );
}

/** 酒精灯 */
function AlcoholLamp({ lit }: { lit: boolean }) {
  return (
    <group>
      <mesh position={[0, -1.08, 0]} castShadow>
        <sphereGeometry args={[0.36, 24, 16]} />
        <meshPhysicalMaterial
          color="#BFE3FF"
          transmission={0.55}
          transparent
          opacity={0.6}
          roughness={0.15}
          metalness={0}
        />
      </mesh>
      {/* 灯内酒精 */}
      <mesh position={[0, -1.16, 0]}>
        <sphereGeometry args={[0.3, 20, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#9AD9FF" transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, -0.83, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.16, 16]} />
        <meshStandardMaterial color="#64748B" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.74, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.08, 10]} />
        <meshStandardMaterial color="#3F3F46" />
      </mesh>
      <LampFlame lit={lit} />
    </group>
  );
}

/** 三脚架 + 泥三角 + 坩埚 */
function Crucible({ children }: { children?: React.ReactNode }) {
  const legs: [number, number][] = [
    [0, 1],
    [Math.cos((2 * Math.PI) / 3), Math.sin((2 * Math.PI) / 3)],
    [Math.cos((4 * Math.PI) / 3), Math.sin((4 * Math.PI) / 3)],
  ];
  return (
    <group>
      {legs.map(([x, z], i) => (
        <mesh key={i} position={[x * 0.62, -0.72, z * 0.62]} rotation={[z * 0.12, 0, -x * 0.12]}>
          <cylinderGeometry args={[0.028, 0.035, 1.3, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.02, 8, 24]} />
        <meshStandardMaterial color="#57534E" metalness={0.4} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.32, 0.24, 0.28, 24, 1, true]} />
        <meshStandardMaterial color="#292524" side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.04, 24]} />
        <meshStandardMaterial color="#1C1917" roughness={0.9} />
      </mesh>
      {children}
    </group>
  );
}

/** 集气瓶（玻璃罐） */
function GasJar({ children }: { children?: React.ReactNode }) {
  return (
    <group>
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.66, 0.66, 2.3, 32, 1, true]} />
        <meshPhysicalMaterial
          color="#D6ECFA"
          transmission={0.6}
          transparent
          opacity={0.28}
          roughness={0.1}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <torusGeometry args={[0.66, 0.035, 10, 32]} />
        <meshStandardMaterial color="#A8C4D8" transparent opacity={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, -1.29, 0]}>
        <cylinderGeometry args={[0.66, 0.66, 0.08, 32]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.3} roughness={0.5} />
      </mesh>
      {children}
    </group>
  );
}

/** 试管（倾斜夹持） */
function TestTube({ children }: { children?: React.ReactNode }) {
  return (
    <group rotation={[0, 0, -0.42]} position={[0.05, 0.05, 0]}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 1.9, 24, 1, true]} />
        <meshPhysicalMaterial
          color="#D6ECFA"
          transmission={0.6}
          transparent
          opacity={0.28}
          roughness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, -0.95, 0]}>
        <sphereGeometry args={[0.22, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshPhysicalMaterial color="#D6ECFA" transmission={0.6} transparent opacity={0.3} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <torusGeometry args={[0.22, 0.03, 8, 24]} />
        <meshStandardMaterial color="#A8C4D8" transparent opacity={0.6} />
      </mesh>
      {children}
    </group>
  );
}

/** 试剂模型（按形态） */
function ReagentModel({ form, color }: { form: ReagentForm; color: string }) {
  const material = (
    <meshStandardMaterial color={color} metalness={0.5} roughness={0.35} />
  );
  switch (form) {
    case "wire":
      return (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, i * 0.06 - 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.13, 0.022, 8, 20]} />
              {material}
            </mesh>
          ))}
        </group>
      );
    case "powder":
      return (
        <mesh position={[0, -0.08, 0]}>
          <sphereGeometry args={[0.16, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshStandardMaterial color={color} roughness={0.95} />
        </mesh>
      );
    case "strip":
      return (
        <mesh position={[0, 0, 0]} rotation={[0.25, 0, 0.2]}>
          <boxGeometry args={[0.09, 0.5, 0.03]} />
          {material}
        </mesh>
      );
    case "sheet":
      return (
        <mesh position={[0, -0.06, 0]} rotation={[-0.3, 0, 0]}>
          <boxGeometry args={[0.34, 0.03, 0.3]} />
          {material}
        </mesh>
      );
    case "gas":
      return null;
  }
}

/** 生成物模型（按形态） */
function ProductModel({ form, color }: { form: ProductForm; color: string }) {
  switch (form) {
    case "powder":
      return (
        <group position={[0, -0.09, 0]}>
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            const r = 0.06 + (i % 3) * 0.045;
            return (
              <mesh key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]}>
                <dodecahedronGeometry args={[0.055, 0]} />
                <meshStandardMaterial color={color} roughness={1} />
              </mesh>
            );
          })}
        </group>
      );
    case "lump":
      return (
        <mesh position={[0, -0.05, 0]} rotation={[0.4, 0.6, 0]}>
          <dodecahedronGeometry args={[0.19, 0]} />
          <meshStandardMaterial color={color} roughness={0.85} metalness={0.15} />
        </mesh>
      );
    case "droplets":
      return (
        <group>
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={i} position={[Math.cos(i * 1.8) * 0.16, -0.1 + (i % 3) * 0.12, Math.sin(i * 1.8) * 0.16]}>
              <sphereGeometry args={[0.035, 10, 8]} />
              <meshPhysicalMaterial color={color} transmission={0.4} transparent opacity={0.85} roughness={0.05} />
            </mesh>
          ))}
        </group>
      );
    case "gas":
      return null;
  }
}

/** 烟雾粒子 */
function Smoke({ color, intensity }: { color: string; intensity: number }) {
  const group = useRef<THREE.Group>(null);
  const count = Math.round(22 * intensity);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 0.5,
        z: (Math.random() - 0.5) * 0.5,
        speed: 0.35 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
        size: 0.14 + Math.random() * 0.14,
      })),
    [count]
  );
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    group.current?.children.forEach((child, i) => {
      const s = seeds[i];
      if (!s) return;
      const life = ((t * s.speed + s.phase) % 3) / 3;
      child.position.set(
        s.x + Math.sin(t + s.phase) * 0.12,
        life * 2.4,
        s.z + Math.cos(t * 0.7 + s.phase) * 0.12
      );
      child.scale.setScalar((0.5 + life * 1.9) * (s.size / 0.16));
      const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.opacity = (1 - life) * 0.42;
    });
  });
  if (intensity <= 0) return null;
  return (
    <group ref={group}>
      {seeds.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.16, 8, 8]} />
          <meshStandardMaterial color={color} transparent opacity={0.35} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** 火星迸射粒子 */
function Sparks({ color }: { color: string }) {
  const group = useRef<THREE.Group>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: 46 }, () => ({
        angle: Math.random() * Math.PI * 2,
        speed: 1.4 + Math.random() * 1.6,
        up: 1.2 + Math.random() * 2,
        size: 0.018 + Math.random() * 0.024,
        phase: Math.random() * 2.4,
      })),
    []
  );
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    group.current?.children.forEach((child, i) => {
      const s = seeds[i];
      const life = ((t + s.phase) % 2.4) / 2.4;
      const rad = Math.sin(life * Math.PI) * s.speed * 0.55;
      child.position.set(
        Math.cos(s.angle) * rad,
        s.up * life - 3.4 * life * life,
        Math.sin(s.angle) * rad
      );
      child.scale.setScalar(1 - life * 0.6);
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = 1 - life;
    });
  });
  return (
    <group ref={group}>
      {seeds.map((s, i) => (
        <mesh key={i}>
          <sphereGeometry args={[s.size, 6, 6]} />
          <meshBasicMaterial color={color} transparent />
        </mesh>
      ))}
    </group>
  );
}

/** 反应火焰（大，带颜色与辉光） */
function ReactionFlame({ effect }: { effect: LabEffect }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const s = effect.flameSize;
    ref.current.scale.set(
      s * (1 + Math.sin(t * 20) * 0.13),
      s * (1 + Math.sin(t * 15) * 0.18),
      s * (1 + Math.cos(t * 18) * 0.13)
    );
  });
  return (
    <group position={[0, 0.2, 0]}>
      <mesh ref={ref}>
        <coneGeometry args={[0.2, 0.62, 18]} />
        <meshStandardMaterial
          color={effect.flameColor}
          emissive={effect.flameColor}
          emissiveIntensity={2.6}
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>
      <pointLight color={effect.glowColor} intensity={effect.glowIntensity * 3} distance={4.5} />
    </group>
  );
}

/** 反应内容：试剂 → 生成物 的渐变切换 + 特效 */
function Reactor({
  experiment,
  phase,
}: {
  experiment: VirtualLabExperiment;
  phase: LabPhase;
}) {
  const reagentRef = useRef<THREE.Group>(null);
  const productRef = useRef<THREE.Group>(null);
  const startRef = useRef<number | null>(null);
  const prevPhase = useRef<LabPhase>(phase);
  const { effect } = experiment;

  useEffect(() => {
    if (prevPhase.current !== phase) {
      prevPhase.current = phase;
      startRef.current = null;
    }
  }, [phase]);

  const isReacting = phase === "reacting" || phase === "done";

  useFrame(({ clock }) => {
    if (!isReacting) {
      if (reagentRef.current) reagentRef.current.visible = phase !== "idle" && phase !== "adding";
      if (productRef.current) productRef.current.visible = false;
      return;
    }
    if (startRef.current === null) startRef.current = clock.getElapsedTime();
    const p = phase === "done" ? 1 : Math.min(1, (clock.getElapsedTime() - startRef.current) / experiment.duration);
    if (reagentRef.current) {
      reagentRef.current.visible = p < 0.95;
      reagentRef.current.scale.setScalar(1 - p * 0.5);
      reagentRef.current.position.y = -p * 0.06;
    }
    if (productRef.current) {
      productRef.current.visible = p > 0.15;
      const s = Math.max(0.001, (p - 0.15) / 0.85);
      productRef.current.scale.setScalar(s);
    }
  });

  const pt = reactionPoint(experiment.apparatus);
  const reagent = experiment.reagents[0];

  return (
    <>
      {/* 试剂入场动画 */}
      {phase === "adding" && (
        <DroppingReagent form={reagent.form} color={reagent.color} targetY={pt[1]} />
      )}

      <group position={pt}>
        <group ref={reagentRef} visible={phase !== "idle" && phase !== "adding"}>
          <ReagentModel form={reagent.form} color={reagent.color} />
        </group>
        <group ref={productRef} visible={false}>
          <ProductModel form={effect.productForm} color={effect.productColor} />
        </group>

        {isReacting && (
          <>
            <ReactionFlame effect={effect} />
            {effect.smokeIntensity ? <Smoke color={effect.smokeColor ?? "#FFF"} intensity={effect.smokeIntensity} /> : null}
            {effect.sparks && <Sparks color={effect.sparkColor ?? "#FFB300"} />}
          </>
        )}
      </group>
    </>
  );
}

/** 试剂从上方落入容器 */
function DroppingReagent({
  form,
  color,
  targetY,
}: {
  form: ReagentForm;
  color: string;
  targetY: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (start.current === null) start.current = clock.getElapsedTime();
    const p = Math.min(1, (clock.getElapsedTime() - start.current) / 0.9);
    ref.current.position.y = 1.6 + (targetY - 1.6) * (p * p);
    ref.current.rotation.y += 0.06;
  });
  return (
    <group ref={ref} position={[0, 1.6, 0]}>
      <ReagentModel form={form} color={color} />
    </group>
  );
}

/** 实验台场景内容 */
function Scene({ experiment, phase }: LabSceneProps) {
  const lampLit = phase === "igniting" || phase === "reacting" || phase === "done";

  return (
    <>
      {/* 环境光 */}
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#BFD8FF", "#1A1630", 0.6]} />
      <directionalLight position={[4, 6, 3]} intensity={1.1} castShadow />
      <pointLight position={[-4, 2, -3]} intensity={0.5} color="#8B5CF6" />

      {/* 桌面 */}
      <mesh position={[0, -1.5, 0]} receiveShadow>
        <boxGeometry args={[9, 0.3, 6]} />
        <meshStandardMaterial color="#1E293B" roughness={0.85} metalness={0.1} />
      </mesh>
      <mesh position={[0, -1.34, 0]} receiveShadow>
        <boxGeometry args={[9, 0.04, 6]} />
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>

      {/* 器材 */}
      <AlcoholLamp lit={lampLit} />
      {experiment.apparatus === "crucible" && <Crucible />}
      {experiment.apparatus === "gasJar" && <GasJar />}
      {experiment.apparatus === "testTube" && <TestTube />}

      {/* 反应内容（放到器材局部坐标） */}
      {experiment.apparatus === "testTube" ? (
        <group rotation={[0, 0, -0.42]} position={[0.05, 0.05, 0]}>
          <Reactor experiment={experiment} phase={phase} />
        </group>
      ) : (
        <Reactor experiment={experiment} phase={phase} />
      )}

      <ContactShadows position={[0, -1.33, 0]} opacity={0.5} scale={10} blur={2.5} far={4} />
      <OrbitControls
        enablePan={false}
        minDistance={3.5}
        maxDistance={9}
        minPolarAngle={0.5}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, -0.2, 0]}
        makeDefault
      />
    </>
  );
}

export default function LabScene3D({ experiment, phase }: LabSceneProps) {
  const key = `${experiment.id}`;
  return (
    <Canvas
      key={key}
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [3.6, 2.0, 5.2], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
    >
      <Scene experiment={experiment} phase={phase} />
    </Canvas>
  );
}
