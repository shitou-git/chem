import { useState } from "react";
import { RotateCcw, Bookmark, Check, Beaker, FlaskConical } from "lucide-react";
import { useChemStore } from "@/store/chemStore";
import { cn } from "@/lib/utils";

export default function ReactionStage() {
  const {
    firstElement,
    currentReaction,
    message,
    savedReactions,
    reset,
    saveReaction,
  } = useChemStore();

  const [savedFlash, setSavedFlash] = useState(false);

  const handleSave = () => {
    if (!currentReaction) return;
    saveReaction(currentReaction);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  const isSaved = currentReaction
    ? savedReactions.some((r) => r.id === currentReaction.id)
    : false;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl backdrop-blur md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100 md:text-xl">
          <FlaskConical className="h-5 w-5 text-cyan-400" />
          反应舞台
        </h2>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1.5 rounded-lg border border-orange-500/60 px-3 py-1.5 text-sm font-medium text-orange-400 transition hover:bg-orange-500/10 hover:shadow-[0_0_14px_rgba(249,115,22,0.35)]"
        >
          <RotateCcw className="h-4 w-4" />
          重置
        </button>
      </div>

      <div className="mb-6 flex min-h-[80px] items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 md:min-h-[96px]">
        {firstElement ? (
          <div
            className="flex flex-col items-center rounded-lg border px-4 py-2"
            style={{
              borderColor: firstElement ? "#38BDF8" : "transparent",
              boxShadow: "0 0 16px rgba(56,189,248,0.25)",
            }}
          >
            <span className="text-2xl font-bold text-cyan-400 md:text-3xl">
              {firstElement.symbol}
            </span>
            <span className="text-xs text-slate-400">{firstElement.name}</span>
          </div>
        ) : (
          <div className="text-sm text-slate-500">选择第一个元素</div>
        )}

        <span className="text-xl text-slate-600 md:text-2xl">+</span>

        {currentReaction ? (
          <div
            className="flex flex-col items-center rounded-lg border px-4 py-2"
            style={{
              borderColor: "#F472B6",
              boxShadow: "0 0 16px rgba(244,114,182,0.25)",
            }}
          >
            <span className="text-2xl font-bold text-pink-400 md:text-3xl">
              {currentReaction.reactants.find((s) => s !== firstElement?.symbol) ?? "?"}
            </span>
            <span className="text-xs text-slate-400">反应物</span>
          </div>
        ) : (
          <div className="text-sm text-slate-500">选择第二个元素</div>
        )}

        <span className="text-xl text-slate-600 md:text-2xl">→</span>

        {currentReaction ? (
          <div
            className="flex flex-col items-center rounded-lg border px-4 py-2"
            style={{
              borderColor: "#06D6A0",
              boxShadow: "0 0 20px rgba(6,214,160,0.3)",
            }}
          >
            <span className="text-2xl font-bold text-emerald-400 md:text-3xl">
              {currentReaction.product}
            </span>
            <span className="text-xs text-slate-400">{currentReaction.productName}</span>
          </div>
        ) : (
          <div className="text-sm text-slate-500">生成物</div>
        )}
      </div>

      <div
        className={cn(
          "mb-4 rounded-xl border-l-4 bg-slate-950/50 p-4 text-sm text-slate-300 transition-all md:text-base",
          currentReaction
            ? "border-l-emerald-500"
            : firstElement
            ? "border-l-cyan-500"
            : "border-l-slate-600"
        )}
      >
        {message}
      </div>

      {currentReaction && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center gap-2">
            <Beaker className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              反应条件
            </span>
            <span className="rounded-full bg-purple-500/15 px-3 py-1 text-sm font-medium text-purple-300">
              {currentReaction.condition}
            </span>
          </div>

          <div className="flex flex-1 flex-col justify-center rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-5">
            <div className="mb-2 text-xs text-slate-500">配平方程式</div>
            <div className="break-words font-mono text-2xl leading-relaxed tracking-wide text-slate-100 md:text-3xl">
              {currentReaction.equation.split("").map((char, i) => {
                const isSub = "₀₁₂₃₄₅₆₇₈₉".includes(char);
                const isArrow = "→⇌".includes(char);
                const isNumber = /[0-9]/.test(char);
                return (
                  <span
                    key={i}
                    className={cn(
                      "inline-block animate-pop-in",
                      isSub && "text-emerald-400",
                      isArrow && "mx-1 text-cyan-400",
                      isNumber && !isSub && "text-pink-400"
                    )}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    {char}
                  </span>
                );
              })}
            </div>
            {currentReaction.description && (
              <p className="mt-3 text-sm text-slate-400">
                {currentReaction.description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaved}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition",
              isSaved
                ? "cursor-default bg-emerald-500/20 text-emerald-400"
                : "bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 hover:shadow-[0_0_18px_rgba(34,211,238,0.3)]"
            )}
          >
            {isSaved ? (
              <>
                <Check className="h-4 w-4" />
                已收藏
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4" />
                保存方程式
              </>
            )}
          </button>

          {savedFlash && (
            <div className="text-center text-xs text-emerald-400 animate-fade-up">
              已保存到本地收藏夹
            </div>
          )}
        </div>
      )}
    </div>
  );
}
