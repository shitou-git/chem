import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  X,
  Flame,
  Plus,
  RotateCcw,
  Beaker,
  ShieldAlert,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { VIRTUAL_LABS, type VirtualLabExperiment } from "@/data/virtualLab";
import { cn } from "@/lib/utils";
import type { LabPhase } from "./LabScene3D";

const LabScene3D = lazy(() => import("./LabScene3D"));

interface VirtualLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLabId?: string;
}

export default function VirtualLabModal({
  isOpen,
  onClose,
  initialLabId,
}: VirtualLabModalProps) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<LabPhase>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const experiment: VirtualLabExperiment = VIRTUAL_LABS[index] ?? VIRTUAL_LABS[0];

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    if (!isOpen) return;
    const found = initialLabId ? VIRTUAL_LABS.findIndex((l) => l.id === initialLabId) : -1;
    if (found >= 0) setIndex(found);
  }, [isOpen, initialLabId]);

  useEffect(() => {
    // 切换实验时复位
    clearTimers();
    setPhase("idle");
  }, [index]);

  useEffect(() => {
    return () => clearTimers();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectLab = (i: number) => {
    setIndex((i + VIRTUAL_LABS.length) % VIRTUAL_LABS.length);
  };

  const addReagent = () => {
    clearTimers();
    setPhase("adding");
    timers.current.push(setTimeout(() => setPhase("ready"), 950));
  };

  const ignite = () => {
    clearTimers();
    setPhase("igniting");
    timers.current.push(setTimeout(() => setPhase("reacting"), 600));
    timers.current.push(
      setTimeout(() => setPhase("done"), 600 + experiment.duration * 1000)
    );
  };

  const reset = () => {
    clearTimers();
    setPhase("idle");
  };

  const canAdd = phase === "idle" || phase === "done";
  const canIgnite = phase === "ready";
  const showPhenomenon = phase === "reacting" || phase === "done";

  const phaseLabel: Record<LabPhase, string> = {
    idle: "准备就绪 · 请先加入试剂",
    adding: "正在加入试剂…",
    ready: "试剂已就位 · 可以点火了",
    igniting: "点燃酒精灯…",
    reacting: "反应进行中，观察现象…",
    done: "反应完成",
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950/95 backdrop-blur">
      {/* 顶部标题栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 p-2">
            <FlaskConical className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 md:text-lg">3D 虚拟实验台</h2>
            <p className="text-xs text-slate-500">化合反应 · Drag &amp; Drop 沉浸式实验</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/80 p-0.5">
          <button
            onClick={() => selectLab(index - 1)}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="上一个实验"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[64px] text-center text-xs text-slate-400">
            {index + 1} / {VIRTUAL_LABS.length}
          </span>
          <button
            onClick={() => selectLab(index + 1)}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="下一个实验"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="mx-1 h-5 w-px bg-slate-700" />
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 实验选择条 */}
      <div className="flex gap-2 overflow-x-auto border-b border-slate-800/70 px-4 py-2.5">
        {VIRTUAL_LABS.map((lab, i) => (
          <button
            key={lab.id}
            onClick={() => setIndex(i)}
            className={cn(
              "flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              i === index
                ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300"
                : "border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-500 hover:text-slate-200"
            )}
          >
            <span className="font-mono">{lab.reagents[0].formula}</span>
            {lab.title}
          </button>
        ))}
      </div>

      {/* 主体：左 3D 场景 / 右 控制面板 */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* 3D 视口 */}
        <div className="relative min-h-[320px] flex-1">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center gap-3 text-sm text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                正在加载 3D 实验场景…
              </div>
            }
          >
            <LabScene3D experiment={experiment} phase={phase} />
          </Suspense>

          {/* 方程式浮层 */}
          <div className="pointer-events-none absolute left-3 top-3 rounded-xl border border-slate-700/70 bg-slate-900/85 px-3 py-2 backdrop-blur">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">化学方程式</div>
            <div className="mt-0.5 font-mono text-sm font-semibold text-cyan-300 md:text-base">
              {experiment.equation}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {experiment.condition} · {experiment.medium}
            </div>
          </div>

          {/* 阶段状态条 */}
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-slate-700/70 bg-slate-900/85 px-4 py-1.5 text-xs text-slate-300 backdrop-blur">
            <span
              className={cn(
                "mr-2 inline-block h-2 w-2 rounded-full",
                phase === "reacting" || phase === "done"
                  ? "animate-pulse bg-emerald-400"
                  : phase === "ready"
                  ? "bg-amber-400"
                  : "bg-slate-500"
              )}
            />
            {phaseLabel[phase]}
          </div>

          {/* 拖拽提示 */}
          <div className="pointer-events-none absolute right-3 top-3 rounded-lg border border-slate-700/70 bg-slate-900/85 px-2.5 py-1.5 text-[11px] text-slate-500 backdrop-blur">
            拖拽旋转视角 · 滚轮缩放
          </div>
        </div>

        {/* 控制面板 */}
        <div className="w-full overflow-y-auto border-t border-slate-800 bg-slate-900/40 p-4 lg:w-[360px] lg:border-l lg:border-t-0">
          <div className="mb-1 flex items-baseline gap-2">
            <h3 className="text-lg font-bold text-slate-100">{experiment.title}</h3>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
              {experiment.productName}
            </span>
          </div>
          <p className="mb-4 text-xs text-slate-500">生成物：{experiment.productName}</p>

          {/* 操作步骤 */}
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Beaker className="h-3.5 w-3.5" />
              实验步骤
            </div>
            <ol className="space-y-1.5">
              {experiment.steps.map((step, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition",
                    (phase === "adding" && i === 0) ||
                    (phase === "ready" && i <= 1) ||
                    ((phase === "igniting" || phase === "reacting" || phase === "done") && i <= 2)
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                      : "border-slate-800 bg-slate-950/40 text-slate-400"
                  )}
                >
                  <span className="font-mono text-slate-500">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* 操作按钮 */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              onClick={addReagent}
              disabled={!canAdd}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
                canAdd
                  ? "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 hover:shadow-[0_0_14px_rgba(34,211,238,0.25)]"
                  : "cursor-not-allowed bg-slate-800/50 text-slate-600"
              )}
            >
              <Plus className="h-4 w-4" />
              加入试剂
            </button>
            <button
              onClick={ignite}
              disabled={!canIgnite}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
                canIgnite
                  ? "bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 hover:shadow-[0_0_14px_rgba(249,115,22,0.3)]"
                  : "cursor-not-allowed bg-slate-800/50 text-slate-600"
              )}
            >
              <Flame className="h-4 w-4" />
              点火加热
            </button>
            <button
              onClick={reset}
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" />
              重置实验
            </button>
          </div>

          {/* 现象观察 */}
          <div
            className={cn(
              "mb-3 rounded-xl border p-3 transition",
              showPhenomenon
                ? "border-violet-500/40 bg-violet-500/10"
                : "border-slate-800 bg-slate-950/40"
            )}
          >
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              实验现象
            </div>
            <p
              className={cn(
                "text-xs leading-relaxed",
                showPhenomenon ? "text-slate-200" : "text-slate-600"
              )}
            >
              {showPhenomenon ? experiment.phenomenon : "点火后观察实验现象…"}
            </p>
          </div>

          {/* 安全提示 */}
          <div className="rounded-xl border border-amber-600/30 bg-amber-500/5 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <ShieldAlert className="h-3.5 w-3.5" />
              安全提示
            </div>
            <p className="text-xs leading-relaxed text-amber-200/70">{experiment.safety}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
