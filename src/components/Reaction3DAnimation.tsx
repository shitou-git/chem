import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, ContactShadows } from "@react-three/drei";
import { Pause, Play, RotateCcw, X, Box } from "lucide-react";
import { Vector3, Quaternion, type Group, type Mesh } from "three";
import { parseEquationFor3D, type Molecule3D } from "@/lib/molecule3d";

interface Reaction3DAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  equation: string;
  condition?: string;
  type?: string;
  productName?: string;
}

interface MoleculeInstance {
  molecule: Molecule3D;
  formula: string;
}

const ANIM_DURATION = 5.2;

function expand(parts: { formula: string; coefficient: number; molecule: Molecule3D }[]) {
  const result: MoleculeInstance[] = [];
  parts.forEach((p) => {
    const count = Math.min(Math.max(p.coefficient, 1), 3);
    for (let i = 0; i < count; i++) result.push({ molecule: p.molecule, formula: p.formula });
  });
  return result;
}

function Bond({
  from,
  to,
  color,
  order,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  order: number;
}) {
  const { position, quaternion, length, offsets } = useMemo(() => {
    const start = new Vector3(...from);
    const end = new Vector3(...to);
    const dir = end.clone().sub(start);
    const len = dir.length();
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize());
    const perp = new Vector3(0, 1, 0);
    if (Math.abs(dir.clone().normalize().dot(perp)) > 0.9) perp.set(1, 0, 0);
    const side = new Vector3().crossVectors(dir.clone().normalize(), perp).normalize().multiplyScalar(0.085);
    return {
      position: mid,
      quaternion: q,
      length: len,
      offsets: order === 2 ? [side.clone().multiplyScalar(-1), side.clone()] : order === 3 ? [side.clone().multiplyScalar(-1.6), new Vector3(0, 0, 0), side.clone().multiplyScalar(1.6)] : [new Vector3(0, 0, 0)],
    };
  }, [from, to, order]);

  return (
    <>
      {offsets.map((offset, idx) => (
        <mesh
          key={idx}
          position={[position.x + offset.x, position.y + offset.y, position.z + offset.z]}
          quaternion={quaternion}
        >
          <cylinderGeometry args={[0.055, 0.055, length, 10]} />
          <meshStandardMaterial color={color} metalness={0.25} roughness={0.5} />
        </mesh>
      ))}
    </>
  );
}

function MoleculeView({ data, showLabel }: { data: MoleculeInstance; showLabel: boolean }) {
  const { atoms, bonds } = data.molecule;
  return (
    <group>
      {bonds.map((bond, idx) =>
        bond.from < atoms.length && bond.to < atoms.length ? (
          <Bond
            key={`bond-${idx}`}
            from={atoms[bond.from].position}
            to={atoms[bond.to].position}
            color="#7b8794"
            order={bond.order}
          />
        ) : null
      )}
      {atoms.map((atom, idx) => (
        <mesh key={`atom-${idx}`} position={atom.position}>
          <sphereGeometry args={[atom.radius, 24, 24]} />
          <meshStandardMaterial
            color={atom.color}
            metalness={0.15}
            roughness={0.38}
            emissive={atom.color}
            emissiveIntensity={0.12}
          />
        </mesh>
      ))}
      {showLabel && (
        <Html center position={[0, -1.35, 0]} distanceFactor={9} style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-md border border-slate-600 bg-slate-900/85 px-2 py-0.5 font-mono text-sm text-slate-100">
            {data.formula}
          </div>
        </Html>
      )}
    </group>
  );
}

function layout(count: number): [number, number, number][] {
  if (count <= 1) return [[0, 0, 0]];
  const gap = count === 2 ? 2.6 : 2.35;
  return Array.from({ length: count }, (_, i) => [(i - (count - 1) / 2) * gap, 0, 0]);
}

function Scene({
  reactants,
  products,
  playing,
  resetToken,
  onProgress,
}: {
  reactants: MoleculeInstance[];
  products: MoleculeInstance[];
  playing: boolean;
  resetToken: number;
  onProgress: (p: number) => void;
}) {
  const reactantGroup = useRef<Group>(null);
  const productGroup = useRef<Group>(null);
  const flashRef = useRef<Mesh>(null);
  const elapsed = useRef(0);
  const lastReport = useRef(0);

  useEffect(() => {
    elapsed.current = 0;
    lastReport.current = 0;
  }, [resetToken]);

  useFrame((_, delta) => {
    if (playing) elapsed.current = (elapsed.current + delta) % ANIM_DURATION;
    const t = elapsed.current / ANIM_DURATION;
    const p = t;

    const approach = Math.min(1, p / 0.28);
    const easeIn = 1 - Math.pow(1 - approach, 3);
    const depart = Math.min(1, Math.max(0, (p - 0.42) / 0.3));
    const easeOut = depart * depart * (3 - 2 * depart);

    if (reactantGroup.current) {
      reactantGroup.current.position.x = -5.5 + easeIn * 4.9;
      const fade = p < 0.3 ? 1 : p < 0.42 ? Math.max(0, 1 - (p - 0.3) / 0.12) : 0;
      reactantGroup.current.scale.setScalar(Math.max(0.001, fade));
      reactantGroup.current.visible = fade > 0.01;
      reactantGroup.current.rotation.y = p * 2.2;
    }

    if (productGroup.current) {
      productGroup.current.position.x = 0.6 + easeOut * 4.9;
      const fade = p < 0.42 ? 0 : p < 0.55 ? Math.min(1, (p - 0.42) / 0.13) : p > 0.9 ? Math.max(0, 1 - (p - 0.9) / 0.1) : 1;
      productGroup.current.scale.setScalar(Math.max(0.001, fade));
      productGroup.current.visible = fade > 0.01;
      productGroup.current.rotation.y = -p * 2.2;
    }

    if (flashRef.current) {
      const flash = p > 0.28 && p < 0.5 ? Math.sin(((p - 0.28) / 0.22) * Math.PI) : 0;
      flashRef.current.scale.setScalar(0.2 + flash * 1.5);
      const mat = flashRef.current.material as { opacity: number; emissiveIntensity?: number };
      mat.opacity = flash * 0.85;
      if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = flash * 2.5;
    }

    if (playing && elapsed.current - lastReport.current > 0.12) {
      lastReport.current = elapsed.current;
      onProgress(p);
    }
  });

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[5, 6, 5]} intensity={1.1} />
      <pointLight position={[-4, 2, 3]} intensity={0.6} color="#7dd3fc" />
      <pointLight position={[4, -2, 3]} intensity={0.5} color="#f0abfc" />

      <group ref={reactantGroup}>
        {reactants.map((item, idx) => (
          <group key={`r-${idx}`} position={layout(reactants.length)[idx]} scale={0.82}>
            <MoleculeView data={item} showLabel={reactants.length <= 4} />
          </group>
        ))}
      </group>

      <group ref={productGroup}>
        {products.map((item, idx) => (
          <group key={`p-${idx}`} position={layout(products.length)[idx]} scale={0.82}>
            <MoleculeView data={item} showLabel={products.length <= 4} />
          </group>
        ))}
      </group>

      <mesh ref={flashRef} position={[0, 0, 0]}>
        <icosahedronGeometry args={[0.6, 1]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#fbbf24"
          emissiveIntensity={0}
          transparent
          opacity={0}
        />
      </mesh>

      <ContactShadows position={[0, -2.1, 0]} opacity={0.3} scale={14} blur={2.4} far={5} />
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={16}
        target={[0, 0, 0]}
      />
    </>
  );
}

export default function Reaction3DAnimation({
  isOpen,
  onClose,
  equation,
  condition,
  type,
  productName,
}: Reaction3DAnimationProps) {
  const [playing, setPlaying] = useState(true);
  const [resetToken, setResetToken] = useState(0);
  const [progress, setProgress] = useState(0);

  const parsed = useMemo(() => parseEquationFor3D(equation), [equation]);
  const reactants = useMemo(() => expand(parsed.reactants), [parsed]);
  const products = useMemo(() => expand(parsed.products), [parsed]);

  useEffect(() => {
    if (isOpen) {
      setPlaying(true);
      setResetToken((n) => n + 1);
      setProgress(0);
    }
  }, [isOpen, equation]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleReplay = () => {
    setResetToken((n) => n + 1);
    setProgress(0);
    setPlaying(true);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-3 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex h-full max-h-[760px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Box className="h-5 w-5 shrink-0 text-cyan-400" />
            <h2 className="shrink-0 text-base font-bold text-slate-100">3D 方程式演示</h2>
            {type && (
              <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs text-cyan-300">{type}</span>
            )}
            {condition && (
              <span className="rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-xs text-fuchsia-300">
                条件：{condition}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-slate-800 bg-slate-950/60 px-4 py-2 text-center">
          <div className="break-words font-mono text-base tracking-wide text-slate-100 md:text-lg">
            {parsed.reactants.map((r, i) => (
              <span key={`rl-${i}`}>
                {i > 0 && <span className="mx-1 text-slate-500">+</span>}
                {(r.coefficient > 1 || parsed.reactants.length > 1) && (
                  <span className="text-pink-400">{r.coefficient > 1 ? r.coefficient : ""}</span>
                )}
                <span>{r.formula}</span>
              </span>
            ))}
            <span className="mx-2 text-cyan-400">{parsed.arrow}</span>
            {parsed.products.map((p, i) => (
              <span key={`pl-${i}`}>
                {i > 0 && <span className="mx-1 text-slate-500">+</span>}
                {(p.coefficient > 1 || parsed.products.length > 1) && (
                  <span className="text-pink-400">{p.coefficient > 1 ? p.coefficient : ""}</span>
                )}
                <span>{p.formula}</span>
              </span>
            ))}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {productName ? `生成 ${productName} · ` : ""}拖拽旋转视角 · 滚轮缩放
          </div>
        </div>

        <div className="relative min-h-[300px] flex-1 bg-gradient-to-b from-slate-950 to-slate-900">
          <Canvas camera={{ position: [0, 1.5, 11], fov: 45 }} dpr={[1, 1.8]}>
            <Scene
              reactants={reactants}
              products={products}
              playing={playing}
              resetToken={resetToken}
              onProgress={setProgress}
            />
          </Canvas>
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs text-slate-400">
            <span>反应物</span>
            <span className="text-amber-400">→ 碰撞 →</span>
            <span>生成物</span>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-slate-800 px-4 py-3">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-500/15 px-3 py-1.5 text-sm font-medium text-cyan-400 transition hover:bg-cyan-500/25"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? "暂停" : "播放"}
          </button>
          <button
            onClick={handleReplay}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            <RotateCcw className="h-4 w-4" />
            重播
          </button>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400 transition-[width] duration-150"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
