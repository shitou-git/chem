import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, useCursor } from "@react-three/drei";
import * as THREE from "three";
import type { ProductForm, VirtualLabExperiment } from "@/data/virtualLab";

/** 试剂载体停在的位置 */
export type ToolZone = "tray" | "flame" | "target";

/** 3D 场景向面板回传的操作状态 */
export interface LabInteractionState {
  lampLit: boolean;
  toolAt: ToolZone;
  /** 试剂已在火焰上点燃/加热 */
  ignited: boolean;
  /** 目标中的反应已完成 */
  reacted: boolean;
}

/** 兼容旧引用 */
export type LabPhase = "idle" | "adding" | "ready" | "igniting" | "reacting" | "done";

interface LabSceneProps {
  experiment: VirtualLabExperiment;
  onStateChange?: (state: LabInteractionState) => void;
  resetToken?: number;
}

/* ============================ 场景坐标 ============================ */
const TABLE_Y = -1.5;
const LAMP_X = -1.45;
const LAMP_Z = 0.3;
const TARGET_X = 0.55;
const TARGET_Z = -0.05;
const TRAY_X = 1.95;
const TRAY_Z = 0.45;

const FLAME_ANCHOR = new THREE.Vector3(LAMP_X, -0.38, LAMP_Z);
const JAR_ANCHOR = new THREE.Vector3(TARGET_X, 0.82, TARGET_Z);
const CRUCIBLE_ANCHOR = new THREE.Vector3(TARGET_X, -0.02, TARGET_Z);
const TRAY_ANCHOR = new THREE.Vector3(TRAY_X, -1.02, TRAY_Z);

const anchorFor = (zone: ToolZone, crucible: boolean): THREE.Vector3 => {
  if (zone === "flame") return FLAME_ANCHOR.clone();
  if (zone === "target") return (crucible ? CRUCIBLE_ANCHOR : JAR_ANCHOR).clone();
  return TRAY_ANCHOR.clone();
};

/** 只在火焰上加热就完成的实验 */
const isHeatOnly = (id: string) => id === "lab-cu" || id === "lab-h2";

/* ============================ 通用几何工具 ============================ */
function Rod({
  from,
  to,
  radius = 0.02,
  color = "#9AA3B2",
  metalness = 0.85,
  roughness = 0.25,
}: {
  from: [number, number, number];
  to: [number, number, number];
  radius?: number;
  color?: string;
  metalness?: number;
  roughness?: number;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    return {
      position: a.clone().add(b).multiplyScalar(0.5).toArray() as [number, number, number],
      quaternion: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.clone().normalize()
      ),
      length: dir.length(),
    };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}

/* ============================ 酒精灯 ============================ */
function AlcoholFlame({ big = false }: { big?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.scale.set(
      1 + Math.sin(t * 18) * 0.07 + Math.sin(t * 7) * 0.04,
      1 + Math.sin(t * 12) * 0.11,
      1 + Math.cos(t * 16) * 0.07
    );
  });
  const s = big ? 1.35 : 1;
  return (
    <group ref={ref} position={[0, 0.92, 0]}>
      <mesh position={[0, 0.19 * s, 0]}>
        <coneGeometry args={[0.135 * s, 0.5 * s, 20]} />
        <meshBasicMaterial
          color="#4DA6FF"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.1 * s, 0]}>
        <coneGeometry args={[0.092 * s, 0.33 * s, 16]} />
        <meshBasicMaterial
          color="#FFD25C"
          transparent
          opacity={0.82}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.03 * s, 0]}>
        <coneGeometry args={[0.045 * s, 0.18 * s, 12]} />
        <meshBasicMaterial
          color="#FFF8DE"
          transparent
          opacity={0.96}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <pointLight color="#FFB84D" intensity={big ? 2.4 : 1.5} distance={2.6} position={[0, 0.2, 0]} />
    </group>
  );
}

function AlcoholLamp({
  lit,
  onToggle,
  showHint,
  occupied,
}: {
  lit: boolean;
  onToggle: () => void;
  showHint: boolean;
  /** 试剂正停在火焰上，此时不抢它的点击 */
  occupied: boolean;
}) {
  const cap = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered, "pointer", "auto");
  const bodyProfile = useMemo(
    () =>
      [
        [0, 0],
        [0.22, 0],
        [0.28, 0.035],
        [0.335, 0.13],
        [0.34, 0.27],
        [0.3, 0.4],
        [0.2, 0.51],
        [0.135, 0.56],
        [0.125, 0.63],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
    []
  );
  useFrame(() => {
    if (!cap.current) return;
    cap.current.position.lerp(
      new THREE.Vector3(lit ? 0.46 : 0, lit ? 0.12 : 0.78, lit ? 0.12 : 0),
      0.1
    );
    cap.current.rotation.z = THREE.MathUtils.lerp(cap.current.rotation.z, lit ? -1.35 : 0, 0.1);
  });
  return (
    <group
      position={[LAMP_X, TABLE_Y, LAMP_Z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onPointerDown={(e) => {
        if (occupied) return;
        e.stopPropagation();
        onToggle();
      }}
    >
      {/* 透明点击热区：器材较小，扩大命中范围 */}
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 1.45, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* 玻璃灯体：旋转成型，平底圆腹收颈 */}
      <mesh position={[0, 0.03, 0]} castShadow>
        <latheGeometry args={[bodyProfile, 36]} />
        <meshPhysicalMaterial
          color="#DCEFF9"
          transmission={0.9}
          thickness={0.22}
          transparent
          opacity={0.58}
          roughness={0.04}
          ior={1.46}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* 灯内酒精 */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.29, 0.3, 0.2, 28]} />
        <meshPhysicalMaterial
          color="#A8DEFA"
          transmission={0.45}
          transparent
          opacity={0.5}
          roughness={0.08}
        />
      </mesh>
      {/* 磨砂灯底 */}
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.22, 0.24, 0.035, 28]} />
        <meshStandardMaterial color="#A6B8C8" metalness={0.35} roughness={0.55} />
      </mesh>
      {/* 灯芯管 */}
      <mesh position={[0, 0.66, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.13, 0.15, 22]} />
        <meshStandardMaterial color="#B0BCC8" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.036, 0.042, 0.1, 12]} />
        <meshStandardMaterial color="#3B3026" roughness={1} />
      </mesh>
      {/* 灯帽：点燃后摘下放到桌面一侧 */}
      <group ref={cap} position={[0, 0.78, 0]}>
        <mesh position={[0, -0.06, 0]} castShadow>
          <cylinderGeometry args={[0.145, 0.155, 0.2, 22]} />
          <meshStandardMaterial color="#8493A2" metalness={0.8} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <sphereGeometry args={[0.052, 14, 10]} />
          <meshStandardMaterial color="#9AA9B8" metalness={0.8} roughness={0.25} />
        </mesh>
      </group>
      {lit && <AlcoholFlame />}
      {showHint && !hovered && (
        <Html position={[0, 1.5, 0]} center distanceFactor={9} style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-full border border-amber-400/60 bg-amber-500/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg">
            点击点燃酒精灯
          </div>
        </Html>
      )}
      {hovered && (
        <Html position={[0, 1.5, 0]} center distanceFactor={9} style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-full bg-slate-900/90 px-2.5 py-1 text-[11px] text-white">
            酒精灯 · 点击{lit ? "熄灭" : "点燃"}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ============================ 坩埚 / 三脚架 ============================ */
function CrucibleRig({ children }: { children?: React.ReactNode }) {
  const legs: [number, number][] = [
    [0, 1],
    [Math.cos((2 * Math.PI) / 3), Math.sin((2 * Math.PI) / 3)],
    [Math.cos((4 * Math.PI) / 3), Math.sin((4 * Math.PI) / 3)],
  ];
  return (
    <group position={[TARGET_X, TABLE_Y, TARGET_Z]}>
      {legs.map(([x, z], i) => (
        <group key={i}>
          <Rod
            from={[x * 0.78, 0, z * 0.78]}
            to={[x * 0.5, 1.24, z * 0.5]}
            radius={0.032}
            color="#5A6675"
          />
          <mesh position={[x * 0.82, 0.03, z * 0.82]}>
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {/* 泥三角：三截陶土管 */}
      {[0, 1, 2].map((i) => {
        const a = (i * 2 * Math.PI) / 3;
        const b = ((i + 1) * 2 * Math.PI) / 3;
        return (
          <Rod
            key={i}
            from={[Math.cos(a) * 0.42, 1.26, Math.sin(a) * 0.42]}
            to={[Math.cos(b) * 0.42, 1.26, Math.sin(b) * 0.42]}
            radius={0.042}
            color="#B8AEA0"
            metalness={0}
            roughness={0.95}
          />
        );
      })}
      {/* 坩埚：上宽下窄的陶土杯 */}
      <mesh position={[0, 1.28, 0]} castShadow>
        <latheGeometry
          args={[
            [
              [0, 0],
              [0.16, 0],
              [0.2, 0.04],
              [0.26, 0.3],
              [0.28, 0.36],
            ].map(([x, y]) => new THREE.Vector2(x, y)),
            28,
          ]}
        />
        <meshStandardMaterial color="#8E7F6C" side={THREE.DoubleSide} roughness={0.92} />
      </mesh>
      <mesh position={[0, 1.65, 0]}>
        <torusGeometry args={[0.28, 0.022, 8, 28]} />
        <meshStandardMaterial color="#A89A86" roughness={0.9} />
      </mesh>
      {/* 坩埚盖斜靠在旁 */}
      <mesh position={[0.42, 1.32, 0.12]} rotation={[0.3, 0, 0.55]} castShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.025, 24]} />
        <meshStandardMaterial color="#9B8D79" roughness={0.92} />
      </mesh>
      {children}
    </group>
  );
}

/* ============================ 集气瓶 ============================ */
function GasJar({ children }: { children?: React.ReactNode }) {
  return (
    <group position={[TARGET_X, TABLE_Y, TARGET_Z]}>
      {/* 瓶壁 */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.64, 0.62, 2.1, 36, 1, true]} />
        <meshPhysicalMaterial
          color="#DCEEF8"
          transmission={0.92}
          thickness={0.18}
          transparent
          opacity={0.34}
          roughness={0.04}
          ior={1.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* 瓶底 */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 0.07, 36]} />
        <meshPhysicalMaterial color="#C8E2F2" transmission={0.6} transparent opacity={0.5} roughness={0.08} />
      </mesh>
      {/* 磨砂瓶口 */}
      <mesh position={[0, 2.11, 0]}>
        <cylinderGeometry args={[0.67, 0.64, 0.11, 36]} />
        <meshPhysicalMaterial color="#C3D9E8" transparent opacity={0.62} roughness={0.62} />
      </mesh>
      <mesh position={[0, 2.17, 0]}>
        <torusGeometry args={[0.655, 0.024, 8, 36]} />
        <meshStandardMaterial color="#E8F2F8" transparent opacity={0.7} roughness={0.5} />
      </mesh>
      {/* 瓶口旁的毛玻璃片 */}
      <mesh position={[0.86, 0.06, 0.12]} rotation={[-Math.PI / 2, 0, 0.25]}>
        <planeGeometry args={[0.62, 0.62]} />
        <meshPhysicalMaterial color="#C8DCE8" transparent opacity={0.42} roughness={0.75} side={THREE.DoubleSide} />
      </mesh>
      {children}
    </group>
  );
}

/* ============================ 试管 ============================ */
function TestTubeRig({ children }: { children?: React.ReactNode }) {
  return (
    <group position={[TARGET_X, TABLE_Y, TARGET_Z]} rotation={[0, 0, -0.32]}>
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 1.9, 28, 1, true]} />
        <meshPhysicalMaterial
          color="#DCEEF8"
          transmission={0.9}
          thickness={0.12}
          transparent
          opacity={0.36}
          roughness={0.04}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.22, 20, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshPhysicalMaterial color="#DCEEF8" transmission={0.75} transparent opacity={0.42} roughness={0.05} />
      </mesh>
      <mesh position={[0, 1.91, 0]}>
        <torusGeometry args={[0.225, 0.028, 8, 28]} />
        <meshPhysicalMaterial color="#DCEEF8" transparent opacity={0.7} roughness={0.1} />
      </mesh>
      {/* 铁架台 */}
      <group position={[-0.55, 0, 0]} rotation={[0, 0, 0.32]}>
        <mesh position={[0, 0.06, 0]} castShadow>
          <boxGeometry args={[0.8, 0.12, 0.55]} />
          <meshStandardMaterial color="#4B5563" metalness={0.55} roughness={0.5} />
        </mesh>
        <Rod from={[0, 0.1, 0]} to={[0, 2.3, 0]} radius={0.035} color="#6B7280" />
        <Rod from={[0, 1.5, 0]} to={[0.5, 1.5, 0]} radius={0.028} color="#6B7280" />
        <mesh position={[0.5, 1.5, 0]}>
          <torusGeometry args={[0.25, 0.03, 8, 20]} />
          <meshStandardMaterial color="#8B95A3" metalness={0.7} roughness={0.35} />
        </mesh>
      </group>
      {children}
    </group>
  );
}

/* ============================ 烧杯 ============================ */
function BeakerModel({ mist = false }: { mist?: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.29, 0.68, 32, 1, true]} />
        <meshPhysicalMaterial
          color="#DCF0FA"
          transmission={0.9}
          thickness={0.1}
          transparent
          opacity={0.4}
          roughness={0.04}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.29, 0.29, 0.035, 32]} />
        <meshPhysicalMaterial color="#D6EAF6" transparent opacity={0.55} roughness={0.08} />
      </mesh>
      <mesh position={[0, 0.69, 0]}>
        <torusGeometry args={[0.32, 0.018, 8, 32]} />
        <meshPhysicalMaterial color="#EAF6FC" transparent opacity={0.7} roughness={0.1} />
      </mesh>
      {/* 刻度线 */}
      {[0.18, 0.35, 0.52].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.318, 0.005, 4, 28, i === 1 ? Math.PI * 1.3 : Math.PI * 0.8]} />
          <meshBasicMaterial color="#8FAFC0" transparent opacity={0.7} />
        </mesh>
      ))}
      {/* 内壁水雾（氢气燃烧） */}
      {mist &&
        Array.from({ length: 12 }, (_, i) => (
          <mesh
            key={i}
            position={[
              Math.cos(i * 1.7) * 0.29,
              0.25 + (i % 4) * 0.11,
              Math.sin(i * 1.7) * 0.29,
            ]}
          >
            <sphereGeometry args={[0.022, 8, 6]} />
            <meshPhysicalMaterial color="#EAF7FF" transparent opacity={0.85} roughness={0.02} />
          </mesh>
        ))}
    </group>
  );
}

/* ============================ 托盘 ============================ */
function Tray() {
  return (
    <group position={[TRAY_X, TABLE_Y, TRAY_Z]}>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[1.35, 0.08, 0.95]} />
        <meshStandardMaterial color="#8B6B4A" roughness={0.85} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.66, 0.12, 0]}>
          <boxGeometry args={[0.04, 0.14, 0.95]} />
          <meshStandardMaterial color="#6E5238" roughness={0.8} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.12, s * 0.46]}>
          <boxGeometry args={[1.35, 0.14, 0.04]} />
          <meshStandardMaterial color="#6E5238" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/* ============================ 试剂载体（可拖拽） ============================ */
function TongsWithStrip({ color, ignited }: { color: string; ignited: boolean }) {
  return (
    <group>
      <Rod from={[0.62, 0.58, 0.09]} to={[0.03, 0.06, 0]} radius={0.022} color="#AAB4C0" />
      <Rod from={[0.62, 0.58, -0.09]} to={[0.03, 0.06, 0]} radius={0.022} color="#AAB4C0" />
      <mesh position={[0.68, 0.64, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.26, 0.035, 0.2]} />
        <meshStandardMaterial color="#8B95A3" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.14, 0]} rotation={[0.15, 0, 0.12]}>
        <boxGeometry args={[0.085, 0.5, 0.035]} />
        <meshStandardMaterial
          color={ignited ? "#EDEDED" : color}
          emissive={ignited ? "#FFFFFF" : "#000000"}
          emissiveIntensity={ignited ? 1.2 : 0}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

function TongsWithWire({ color, ignited }: { color: string; ignited: boolean }) {
  return (
    <group>
      <Rod from={[0.62, 0.6, 0.08]} to={[0.02, 0.12, 0]} radius={0.02} color="#AAB4C0" />
      <Rod from={[0.62, 0.6, -0.08]} to={[0.02, 0.12, 0]} radius={0.02} color="#AAB4C0" />
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, -0.08 - i * 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.13, 0.021, 8, 22]} />
          <meshStandardMaterial
            color={color}
            emissive={ignited ? "#FF6D00" : "#000000"}
            emissiveIntensity={ignited ? 1.1 : 0}
            metalness={0.65}
            roughness={0.35}
          />
        </mesh>
      ))}
      {/* 下端引燃的火柴 */}
      <mesh position={[0.06, -0.44, 0]} rotation={[0, 0, 0.25]}>
        <cylinderGeometry args={[0.018, 0.018, 0.2, 8]} />
        <meshStandardMaterial color="#C2410C" roughness={0.9} />
      </mesh>
    </group>
  );
}

function SpoonWithPowder({ color, ignited }: { color: string; ignited: boolean }) {
  return (
    <group>
      <Rod from={[0.68, 0.68, 0]} to={[0, 0.02, 0]} radius={0.022} color="#A9B4C0" />
      <mesh position={[0, 0, 0]} scale={[1, 0.34, 1]}>
        <sphereGeometry args={[0.14, 18, 12]} />
        <meshStandardMaterial color="#9CA8B4" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.035, 0]} scale={[1, 0.34, 1]}>
        <sphereGeometry args={[0.115, 16, 10]} />
        <meshStandardMaterial
          color={color}
          emissive={ignited ? color : "#000000"}
          emissiveIntensity={ignited ? 0.9 : 0}
          roughness={0.95}
        />
      </mesh>
    </group>
  );
}

function TongsWithSheet({ color, ignited }: { color: string; ignited: boolean }) {
  return (
    <group>
      <Rod from={[0.66, 0.6, 0.06]} to={[0.02, 0.06, 0]} radius={0.02} color="#A8B2BE" />
      <Rod from={[0.66, 0.6, -0.06]} to={[0.02, 0.06, 0]} radius={0.02} color="#A8B2BE" />
      <mesh position={[0, -0.1, 0]} rotation={[0.1, 0, 0.18]}>
        <boxGeometry args={[0.32, 0.035, 0.28]} />
        <meshStandardMaterial
          color={ignited ? "#1C1C1C" : color}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

function ToolModel({
  experiment,
  ignited,
  reacted,
}: {
  experiment: VirtualLabExperiment;
  ignited: boolean;
  reacted: boolean;
}) {
  if (experiment.id === "lab-h2") return <BeakerModel mist={reacted} />;
  // 烧完的试剂不再显示；铜片加热后仍保留黑色铜片
  if (reacted && experiment.id !== "lab-cu") return null;
  const reagent = experiment.reagents[0];
  switch (reagent.form) {
    case "strip":
      return <TongsWithStrip color={reagent.color} ignited={ignited} />;
    case "wire":
      return <TongsWithWire color={reagent.color} ignited={ignited} />;
    case "powder":
      return <SpoonWithPowder color={reagent.color} ignited={ignited} />;
    case "sheet":
      return <TongsWithSheet color={reagent.color} ignited={ignited} />;
    case "gas":
      return <BeakerModel />;
  }
}

function DraggableTool({
  experiment,
  ignited,
  reacted,
  locked,
  onDrop,
  onDraggingChange,
}: {
  experiment: VirtualLabExperiment;
  ignited: boolean;
  reacted: boolean;
  locked: boolean;
  onDrop: (zone: ToolZone) => void;
  onDraggingChange: (dragging: boolean) => void;
}) {
  const { camera, gl } = useThree();
  const ref = useRef<THREE.Group>(null);
  const desired = useRef<THREE.Vector3>(TRAY_ANCHOR.clone());
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [previewZone, setPreviewZone] = useState<ToolZone>("tray");
  useCursor(hovered && !locked && !dragging, "grab", "auto");

  const crucible = experiment.apparatus === "crucible";

  /** 按屏幕距离判定落点：把器材投影到屏幕，靠近谁就吸附到谁 */
  const zoneByScreen = (clientX: number, clientY: number): ToolZone => {
    const rect = gl.domElement.getBoundingClientRect();
    const project = (v: THREE.Vector3) => {
      const p = v.clone().project(camera);
      return {
        x: rect.left + ((p.x + 1) / 2) * rect.width,
        y: rect.top + ((1 - p.y) / 2) * rect.height,
      };
    };
    const flame = project(FLAME_ANCHOR);
    const target = project(crucible ? CRUCIBLE_ANCHOR : JAR_ANCHOR);
    if (Math.hypot(clientX - flame.x, clientY - flame.y) < 120) return "flame";
    if (Math.hypot(clientX - target.x, clientY - target.y) < 130) return "target";
    return "tray";
  };

  useEffect(() => {
    if (!dragging) return;
    // capture 阶段监听，避免 3D 场景的 stopPropagation 拦截拖拽
    const move = (e: PointerEvent) => {
      const zone = zoneByScreen(e.clientX, e.clientY);
      desired.current.copy(anchorFor(zone, crucible));
      setPreviewZone(zone);
    };
    const up = (e: PointerEvent) => {
      const zone = zoneByScreen(e.clientX, e.clientY);
      desired.current.copy(anchorFor(zone, crucible));
      setPreviewZone("tray");
      setDragging(false);
      onDraggingChange(false);
      onDrop(zone);
    };
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
    return () => {
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, camera, gl, crucible, onDrop, onDraggingChange]);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.lerp(desired.current, dragging ? 0.32 : 0.13);
    if (dragging) ref.current.rotation.y += 0.015;
  });

  const hintZone = dragging ? previewZone : null;

  return (
    <>
      <group
        ref={ref}
        position={TRAY_ANCHOR.toArray()}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!locked) setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onPointerDown={(e) => {
          if (locked) return;
          e.stopPropagation();
          setDragging(true);
          onDraggingChange(true);
        }}
      >
        {/* 透明拖拽热区（靠前放置，优先于器材命中） */}
        <mesh position={[0.25, 0.2, 0.45]}>
          <boxGeometry args={[1.3, 1.1, 0.7]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <ToolModel experiment={experiment} ignited={ignited} reacted={reacted} />
        {(hovered || dragging) && !locked && !reacted && (
          <Html position={[0, 0.85, 0]} center distanceFactor={9} style={{ pointerEvents: "none" }}>
            <div className="whitespace-nowrap rounded-full bg-slate-900/90 px-2.5 py-1 text-[11px] text-cyan-300">
              拖动{experiment.reagents[0].name}
            </div>
          </Html>
        )}
      </group>

      {/* 拖拽时的落点高亮圈 */}
      {hintZone && hintZone !== "tray" && (
        <mesh
          position={
            hintZone === "flame"
              ? [LAMP_X, TABLE_Y + 0.02, LAMP_Z]
              : [TARGET_X, TABLE_Y + 0.03, TARGET_Z]
          }
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.68, 0.76, 40]} />
          <meshBasicMaterial
            color={hintZone === "flame" ? "#F59E0B" : "#22D3EE"}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </>
  );
}

/* ============================ 反应特效 ============================ */
function ReactionFlame({ color, size }: { color: string; size: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.scale.set(
      size * (1 + Math.sin(t * 21) * 0.14),
      size * (1 + Math.sin(t * 16) * 0.2),
      size * (1 + Math.cos(t * 19) * 0.14)
    );
  });
  return (
    <group position={[0, 0.18, 0]}>
      <mesh ref={ref}>
        <coneGeometry args={[0.23, 0.72, 20]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.86}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <pointLight color={color} intensity={3.2} distance={4.5} />
    </group>
  );
}

function Smoke({ color, intensity }: { color: string; intensity: number }) {
  const group = useRef<THREE.Group>(null);
  const count = Math.round(24 * intensity);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 0.5,
        z: (Math.random() - 0.5) * 0.5,
        speed: 0.32 + Math.random() * 0.42,
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
        life * 2.5,
        s.z + Math.cos(t * 0.7 + s.phase) * 0.12
      );
      child.scale.setScalar((0.5 + life * 2) * (s.size / 0.16));
      ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity =
        (1 - life) * 0.42;
    });
  });
  if (intensity <= 0) return null;
  return (
    <group ref={group}>
      {seeds.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.16, 8, 8]} />
          <meshStandardMaterial color={color} transparent opacity={0.34} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Sparks({ color }: { color: string }) {
  const group = useRef<THREE.Group>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: 48 }, () => ({
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
      ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 1 - life;
    });
  });
  return (
    <group ref={group}>
      {seeds.map((s, i) => (
        <mesh key={i}>
          <sphereGeometry args={[s.size, 6, 6]} />
          <meshBasicMaterial color={color} transparent blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

function ProductModel({ form, color }: { form: ProductForm; color: string }) {
  switch (form) {
    case "powder":
      return (
        <group position={[0, -0.06, 0]}>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
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
        <mesh position={[0, -0.03, 0]} rotation={[0.4, 0.6, 0]}>
          <dodecahedronGeometry args={[0.19, 0]} />
          <meshStandardMaterial color={color} roughness={0.85} metalness={0.15} />
        </mesh>
      );
    case "droplets":
      return (
        <group>
          {Array.from({ length: 9 }, (_, i) => (
            <mesh
              key={i}
              position={[
                Math.cos(i * 1.8) * 0.18,
                -0.08 + (i % 3) * 0.12,
                Math.sin(i * 1.8) * 0.18,
              ]}
            >
              <sphereGeometry args={[0.036, 10, 8]} />
              <meshPhysicalMaterial color={color} transmission={0.4} transparent opacity={0.85} roughness={0.04} />
            </mesh>
          ))}
        </group>
      );
    case "gas":
      return null;
  }
}

function ReactionBurst({
  experiment,
  active,
  done,
  crucible,
}: {
  experiment: VirtualLabExperiment;
  active: boolean;
  done: boolean;
  crucible: boolean;
}) {
  const anchor = crucible
    ? new THREE.Vector3(TARGET_X, 0.18, TARGET_Z)
    : new THREE.Vector3(TARGET_X, 0.82, TARGET_Z);
  const { effect } = experiment;
  if (!active && !done) return null;
  return (
    <group position={anchor.toArray()}>
      {(active || done) && <ProductModel form={effect.productForm} color={effect.productColor} />}
      {active && (
        <>
          <ReactionFlame color={effect.flameColor} size={effect.flameSize} />
          {effect.smokeIntensity ? (
            <Smoke color={effect.smokeColor ?? "#FFF"} intensity={effect.smokeIntensity} />
          ) : null}
          {effect.sparks && <Sparks color={effect.sparkColor ?? "#FFB300"} />}
        </>
      )}
      {/* 反应结束后的余温辉光 */}
      {done && !active && (
        <pointLight color={effect.glowColor} intensity={effect.glowIntensity * 0.5} distance={2.2} />
      )}
    </group>
  );
}

/* ============================ 场景 ============================ */
function Scene({
  experiment,
  onStateChange,
}: {
  experiment: VirtualLabExperiment;
  onStateChange?: (s: LabInteractionState) => void;
}) {
  const [lampLit, setLampLit] = useState(false);
  const [toolAt, setToolAt] = useState<ToolZone>("tray");
  const [ignited, setIgnited] = useState(false);
  const [reacted, setReacted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const heatOnly = isHeatOnly(experiment.id);
  const crucible = experiment.apparatus === "crucible";

  useEffect(() => {
    onStateChange?.({ lampLit, toolAt, ignited, reacted });
  }, [lampLit, toolAt, ignited, reacted, onStateChange]);

  // 在火焰上加热一段时间后点燃
  useEffect(() => {
    if (!lampLit || toolAt !== "flame" || ignited) return;
    const t = setTimeout(() => setIgnited(true), 1000);
    return () => clearTimeout(t);
  }, [lampLit, toolAt, ignited]);

  // 常规实验：点燃后移入目标容器开始反应
  useEffect(() => {
    if (!ignited || reacted || toolAt !== "target" || heatOnly) return;
    const t = setTimeout(() => setReacted(true), experiment.duration * 1000);
    return () => clearTimeout(t);
  }, [ignited, reacted, toolAt, heatOnly, experiment.duration]);

  // 只在火焰上完成的实验（铜片加热、氢气燃烧）
  useEffect(() => {
    if (!heatOnly || !ignited || reacted) return;
    const t = setTimeout(() => setReacted(true), 1600);
    return () => clearTimeout(t);
  }, [heatOnly, ignited, reacted]);

  const ignoreDrop = useRef(false);
  const handleDrop = (zone: ToolZone) => {
    if (ignoreDrop.current) return;
    setToolAt(zone);
  };

  const lampFlameLit = lampLit && !reacted;
  const reactionActive = ignited && !reacted && (toolAt === "target" || (heatOnly && toolAt === "flame"));

  return (
    <>
      <ambientLight intensity={0.75} />
      <hemisphereLight args={["#CFE4FF", "#202036", 0.7]} />
      <directionalLight position={[4, 6, 3]} intensity={1.25} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-4, 2, -3]} intensity={0.45} color="#8B5CF6" />

      {/* 实验台 */}
      <mesh position={[0, TABLE_Y - 0.16, 0]} receiveShadow>
        <boxGeometry args={[9.2, 0.3, 6]} />
        <meshStandardMaterial color="#253246" roughness={0.82} metalness={0.08} />
      </mesh>
      <mesh position={[0, TABLE_Y + 0.01, 0]} receiveShadow>
        <boxGeometry args={[9.2, 0.05, 6]} />
        <meshStandardMaterial color="#3E4E63" roughness={0.65} />
      </mesh>

      {/* 器材 */}
      <AlcoholLamp
        lit={lampFlameLit}
        onToggle={() => setLampLit((v) => !v)}
        showHint={!lampLit && toolAt === "tray"}
        occupied={toolAt === "flame"}
      />
      {experiment.apparatus === "crucible" && <CrucibleRig />}
      {experiment.apparatus === "gasJar" && <GasJar />}
      {experiment.apparatus === "testTube" && <TestTubeRig />}
      <Tray />

      <DraggableTool
        experiment={experiment}
        ignited={ignited}
        reacted={reacted}
        locked={reactionActive || reacted}
        onDrop={handleDrop}
        onDraggingChange={setDragging}
      />

      <ReactionBurst
        experiment={experiment}
        active={reactionActive}
        done={reacted}
        crucible={crucible || heatOnly}
      />

      <ContactShadows position={[0, TABLE_Y + 0.04, 0]} opacity={0.52} scale={10} blur={2.5} far={4} />
      <OrbitControls
        enabled={!dragging}
        enablePan={false}
        minDistance={3.6}
        maxDistance={9}
        minPolarAngle={0.5}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, -0.25, 0]}
        makeDefault
      />
    </>
  );
}

export default function LabScene3D({ experiment, onStateChange, resetToken }: LabSceneProps) {
  return (
    <Canvas
      key={`${experiment.id}-${resetToken ?? 0}`}
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [3.4, 2.1, 5.4], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
    >
      <Scene experiment={experiment} onStateChange={onStateChange} />
    </Canvas>
  );
}
