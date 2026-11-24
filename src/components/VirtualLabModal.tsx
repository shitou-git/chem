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
  Lightbulb,
  BookOpen,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ClipboardList,
  Stamp,
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

/** 课本式探究的三个环节 */
type Stage = "predict" | "experiment" | "conclusion";

const STAGES: { id: Stage; label: string; icon: typeof Lightbulb }[] = [
  { id: "predict", label: "先猜一猜", icon: Lightbulb },
  { id: "experiment", label: "动手实验", icon: Beaker },
  { id: "conclusion", label: "课本结论", icon: BookOpen },
];

export default function VirtualLabModal({
  isOpen,
  onClose,
  initialLabId,
}: VirtualLabModalProps) {
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("predict");
  const [selected, setSelected] = useState<number | null>(null);
  const [predictDone, setPredictDone] = useState(false);
  const [records, setRecords] = useState<string[]>([]);
  const [phase, setPhase] = useState<LabPhase>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const experiment: VirtualLabExperiment = VIRTUAL_LABS[index] ?? VIRTUAL_LABS[0];

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  /** 切换实验（含切换实验时复位整个探究流程） */
  const goLab = (i: number) => {
    clearTimers();
    setIndex((i + VIRTUAL_LABS.length) % VIRTUAL_LABS.length);
    setStage("predict");
    setSelected(null);
    setPredictDone(false);
    setRecords([]);
    setPhase("idle");
  };

  useEffect(() => {
    if (!isOpen) return;
    const found = initialLabId ? VIRTUAL_LABS.findIndex((l) => l.id === initialLabId) : -1;
    if (found >= 0) {
      goLab(found);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialLabId]);

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

  const chooseOption = (i: number) => {
    if (predictDone) return;
    setSelected(i);
    setPredictDone(true);
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
      setTimeout(() => {
        setPhase("done");
        setRecords((r) => [...r, experiment.phenomenon]);
      }, 600 + experiment.duration * 1000)
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
    done: "反应完成 · 记下你看到的现象",
  };

  const stageIndex = STAGES.findIndex((s) => s.id === stage);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950/95 backdrop-blur">
      {/* 顶部标题栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 p-2">
            <FlaskConical className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 md:text-lg">课本实验室</h2>
            <p className="text-xs text-slate-500">
              人教版九年级化学 · 先猜想 → 动手做 → 对答案
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/80 p-0.5">
          <button
            onClick={() => goLab(index - 1)}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="上一个实验"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[64px] text-center text-xs text-slate-400">
            {index + 1} / {VIRTUAL_LABS.length}
          </span>
          <button
            onClick={() => goLab(index + 1)}
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
            onClick={() => goLab(i)}
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

      {/* 探究流程导航：先猜一猜 → 动手实验 → 课本结论 */}
      <div className="flex items-center justify-center gap-1 border-b border-slate-800/70 bg-slate-900/30 px-4 py-2">
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          const active = i === stageIndex;
          const passed = i < stageIndex;
          return (
            <div key={s.id} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className="mx-1 h-3.5 w-3.5 text-slate-600" />}
              <button
                onClick={() => {
                  if (s.id === "conclusion" && !predictDone) return;
                  if (s.id === "experiment" && !predictDone) return;
                  setStage(s.id);
                }}
                disabled={(s.id === "experiment" || s.id === "conclusion") && !predictDone}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
                  active
                    ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
                    : passed
                    ? "text-emerald-400 hover:bg-slate-800"
                    : "text-slate-500",
                  (s.id === "experiment" || s.id === "conclusion") && !predictDone
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                    active
                      ? "bg-cyan-500/30 text-cyan-200"
                      : passed
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-slate-800 text-slate-500"
                  )}
                >
                  {passed ? "✓" : i + 1}
                </span>
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
            </div>
          );
        })}
      </div>

      {/* 主体：左 3D 场景 / 右 探究面板 */}
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

          {/* 方程式浮层（结论环节显示课本文字表达式） */}
          <div className="pointer-events-none absolute left-3 top-3 rounded-xl border border-slate-700/70 bg-slate-900/85 px-3 py-2 backdrop-blur">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              {stage === "conclusion" ? "课本文字表达式" : "化学方程式"}
            </div>
            <div className="mt-0.5 font-mono text-sm font-semibold text-cyan-300 md:text-base">
              {stage === "conclusion" ? experiment.textbook.expression : experiment.equation}
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
            {stage === "predict"
              ? "先想一想，再动手验证"
              : stage === "conclusion"
              ? "对照课本原文，看看结论对不对"
              : phaseLabel[phase]}
          </div>

          {/* 拖拽提示 */}
          <div className="pointer-events-none absolute right-3 top-3 rounded-lg border border-slate-700/70 bg-slate-900/85 px-2.5 py-1.5 text-[11px] text-slate-500 backdrop-blur">
            拖拽旋转视角 · 滚轮缩放
          </div>
        </div>

        {/* 探究面板 */}
        <div className="w-full overflow-y-auto border-t border-slate-800 bg-slate-900/40 p-4 lg:w-[400px] lg:border-l lg:border-t-0">
          {stage === "predict" && (
            <PredictPanel
              experiment={experiment}
              selected={selected}
              done={predictDone}
              onChoose={chooseOption}
              onNext={() => setStage("experiment")}
            />
          )}

          {stage === "experiment" && (
            <ExperimentPanel
              experiment={experiment}
              phase={phase}
              canAdd={canAdd}
              canIgnite={canIgnite}
              showPhenomenon={showPhenomenon}
              records={records}
              onAdd={addReagent}
              onIgnite={ignite}
              onReset={reset}
              onNext={() => setStage("conclusion")}
            />
          )}

          {stage === "conclusion" && (
            <ConclusionPanel
              experiment={experiment}
              selected={selected}
              onBack={() => setStage("experiment")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================ 先猜一猜 ============================ */
function PredictPanel({
  experiment,
  selected,
  done,
  onChoose,
  onNext,
}: {
  experiment: VirtualLabExperiment;
  selected: number | null;
  done: boolean;
  onChoose: (i: number) => void;
  onNext: () => void;
}) {
  const p = experiment.predict;
  const correct = selected === p.answer;
  return (
    <div>
      <div className="mb-1 flex items-baseline gap-2">
        <h3 className="text-lg font-bold text-slate-100">{experiment.title}</h3>
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">
          先猜一猜
        </span>
      </div>
      <p className="mb-4 text-xs text-slate-500">{p.hint}</p>

      <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-600/30 bg-amber-500/5 p-3">
        <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
        <p
          className="text-sm leading-relaxed text-amber-100/90"
          dangerouslySetInnerHTML={{ __html: p.question }}
        />
      </div>

      <div className="mb-4 space-y-2">
        {p.options.map((opt, i) => {
          const isAnswer = i === p.answer;
          const isChosen = i === selected;
          let style =
            "border-slate-700 bg-slate-950/40 text-slate-300 hover:border-slate-500 hover:bg-slate-800/60";
          if (done && isAnswer)
            style = "border-emerald-500/60 bg-emerald-500/10 text-emerald-200";
          else if (done && isChosen && !isAnswer)
            style = "border-red-500/60 bg-red-500/10 text-red-200";
          else if (done) style = "border-slate-800 bg-slate-950/30 text-slate-600";
          return (
            <button
              key={i}
              onClick={() => onChoose(i)}
              disabled={done}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition",
                style,
                done ? "cursor-default" : "cursor-pointer"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                  done && isAnswer
                    ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-300"
                    : done && isChosen
                    ? "border-red-400/60 bg-red-500/20 text-red-300"
                    : "border-slate-600 text-slate-400"
                )}
              >
                {done && isAnswer ? "✓" : done && isChosen ? "✕" : String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
            </button>
          );
        })}
      </div>

      {done && (
        <div
          className={cn(
            "mb-4 flex items-start gap-2 rounded-xl border p-3",
            correct
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-red-500/40 bg-red-500/10"
          )}
        >
          {correct ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
          )}
          <p className={cn("text-xs leading-relaxed", correct ? "text-emerald-200" : "text-red-200")}>
            {correct ? p.correct : p.wrong}
          </p>
        </div>
      )}

      <button
        onClick={onNext}
        disabled={!done}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
          done
            ? "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
            : "cursor-not-allowed bg-slate-800/50 text-slate-600"
        )}
      >
        带着猜想去做实验 <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ============================ 动手实验 ============================ */
function ExperimentPanel({
  experiment,
  phase,
  canAdd,
  canIgnite,
  showPhenomenon,
  records,
  onAdd,
  onIgnite,
  onReset,
  onNext,
}: {
  experiment: VirtualLabExperiment;
  phase: LabPhase;
  canAdd: boolean;
  canIgnite: boolean;
  showPhenomenon: boolean;
  records: string[];
  onAdd: () => void;
  onIgnite: () => void;
  onReset: () => void;
  onNext: () => void;
}) {
  const stepDone = (i: number) =>
    (phase === "adding" && i === 0) ||
    (phase === "ready" && i <= 1) ||
    ((phase === "igniting" || phase === "reacting" || phase === "done") && i <= 2);

  return (
    <div>
      <div className="mb-1 flex items-baseline gap-2">
        <h3 className="text-lg font-bold text-slate-100">{experiment.title}</h3>
        <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs text-cyan-400">
          动手实验
        </span>
      </div>
      <p className="mb-4 text-xs text-slate-500">按步骤操作，观察现象并记下来</p>

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
                stepDone(i)
                  ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                  : "border-slate-800 bg-slate-950/40 text-slate-400"
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  stepDone(i)
                    ? "bg-cyan-500/30 text-cyan-200"
                    : "bg-slate-800 text-slate-500"
                )}
              >
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* 操作按钮 */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          onClick={onAdd}
          disabled={!canAdd}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
            canAdd
              ? "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
              : "cursor-not-allowed bg-slate-800/50 text-slate-600"
          )}
        >
          <Plus className="h-4 w-4" />
          加入试剂
        </button>
        <button
          onClick={onIgnite}
          disabled={!canIgnite}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
            canIgnite
              ? "bg-orange-500/20 text-orange-300 hover:bg-orange-500/30"
              : "cursor-not-allowed bg-slate-800/50 text-slate-600"
          )}
        >
          <Flame className="h-4 w-4" />
          点火加热
        </button>
        <button
          onClick={onReset}
          className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
        >
          <RotateCcw className="h-4 w-4" />
          重置实验
        </button>
      </div>

      {/* 现象观察（可记录） */}
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

      {/* 观察记录表 */}
      <div className="mb-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <ClipboardList className="h-3.5 w-3.5" />
          观察记录
          <span className="ml-auto font-normal text-slate-600">{records.length} 条</span>
        </div>
        {records.length === 0 ? (
          <p className="text-xs text-slate-600">完成反应后，你看到的现象会自动记在这里。</p>
        ) : (
          <ol className="space-y-1.5">
            {records.map((r, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                <span className="font-mono text-cyan-500">{i + 1}.</span>
                <span>{r}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* 安全提示 */}
      <div className="mb-3 rounded-xl border border-amber-600/30 bg-amber-500/5 p-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-400">
          <ShieldAlert className="h-3.5 w-3.5" />
          安全提示
        </div>
        <p className="text-xs leading-relaxed text-amber-200/70">{experiment.safety}</p>
      </div>

      <button
        onClick={onNext}
        disabled={phase !== "done"}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
          phase === "done"
            ? "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30"
            : "cursor-not-allowed bg-slate-800/50 text-slate-600"
        )}
      >
        掀开课本上的结论 <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ============================ 课本结论 ============================ */
function ConclusionPanel({
  experiment,
  selected,
  onBack,
}: {
  experiment: VirtualLabExperiment;
  selected: number | null;
  onBack: () => void;
}) {
  const t = experiment.textbook;
  const correct = selected === experiment.predict.answer;
  return (
    <div>
      <div className="mb-1 flex items-baseline gap-2">
        <h3 className="text-lg font-bold text-slate-100">课本上这么说</h3>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
          {t.page}
        </span>
      </div>
      <p className="mb-4 text-xs text-slate-500">人教版九年级化学 · {t.chapter}</p>

      {/* 猜想对照 */}
      <div
        className={cn(
          "mb-3 flex items-start gap-2 rounded-xl border p-3",
          correct
            ? "border-emerald-500/40 bg-emerald-500/10"
            : "border-amber-500/40 bg-amber-500/10"
        )}
      >
        {correct ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
        ) : (
          <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
        )}
        <div>
          <div className={cn("mb-1 text-xs font-semibold", correct ? "text-emerald-300" : "text-amber-300")}>
            {correct ? "你的猜想是对的" : "你的猜想需要修正"}
          </div>
          <p className={cn("text-xs leading-relaxed", correct ? "text-emerald-200/80" : "text-amber-200/80")}>
            {correct
              ? experiment.predict.correct
              : `正确答案是：${experiment.predict.options[experiment.predict.answer]}`}
          </p>
        </div>
      </div>

      {/* 课本原文引用 */}
      <div className="mb-3 rounded-xl border border-slate-700 bg-slate-950/50 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
          <BookOpen className="h-3.5 w-3.5" />
          课本原文
        </div>
        <p className="border-l-2 border-cyan-500/50 pl-3 text-xs leading-relaxed text-slate-300">
          {t.quote}
        </p>
      </div>

      {/* 结论解读 */}
      <div className="mb-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-violet-300">
          <Sparkles className="h-3.5 w-3.5" />
          为什么
        </div>
        <div
          className="text-xs leading-relaxed text-slate-300"
          dangerouslySetInnerHTML={{ __html: t.why }}
        />
      </div>

      {/* 盖章 */}
      <div className="mb-3 flex flex-col items-center rounded-xl border border-emerald-500/30 bg-emerald-500/5 py-4">
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-500/60 bg-emerald-500/10">
          <Stamp className="h-8 w-8 text-emerald-400" />
        </div>
        <div className="text-sm font-bold tracking-wider text-emerald-300">已掌握</div>
        <div className="mt-1 text-[11px] text-emerald-500/70">{experiment.title}</div>
      </div>

      <button
        onClick={onBack}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
      >
        <RotateCcw className="h-4 w-4" />
        再做一次实验
      </button>
    </div>
  );
}
