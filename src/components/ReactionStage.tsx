import { useState } from "react";
import { RotateCcw, Bookmark, Check, Beaker, FlaskConical, X, Sparkles } from "lucide-react";
import { useChemStore } from "@/store/chemStore";
import { cn } from "@/lib/utils";
import { ELEMENTS } from "@/data/elements";
import type { ChemicalReaction } from "@/data/reactions";
import AIExplainModal from "./AIExplainModal";

export default function ReactionStage() {
  const {
    selectedElements,
    currentReactions,
    message,
    savedReactions,
    reset,
    saveReaction,
    toggleElement,
  } = useChemStore();

  const [savedFlashId, setSavedFlashId] = useState<string | null>(null);
  const [aiModalReaction, setAiModalReaction] = useState<ChemicalReaction | null>(null);

  const handleSave = (reaction: ChemicalReaction) => {
    saveReaction(reaction);
    setSavedFlashId(reaction.id);
    setTimeout(() => setSavedFlashId(null), 1200);
  };

  const handleAIExplain = (reaction: ChemicalReaction) => {
    setAiModalReaction(reaction);
  };

  const getElementInfo = (symbol: string) => {
    return ELEMENTS.find((e) => e.symbol === symbol);
  };

  return (
    <>
      <div className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl backdrop-blur md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100 md:text-xl">
            <FlaskConical className="h-5 w-5 text-cyan-400" />
            反应舞台
            {selectedElements.length > 0 && (
              <span className="ml-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs font-normal text-cyan-400">
                已选 {selectedElements.length} 个
              </span>
            )}
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

        {selectedElements.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            {selectedElements.map((el, idx) => (
              <div
                key={el.symbol}
                className="group relative flex items-center gap-1.5 rounded-lg border px-3 py-1.5"
                style={{
                  borderColor: "#38BDF8",
                  backgroundColor: "rgba(56,189,248,0.08)",
                  boxShadow: "0 0 12px rgba(56,189,248,0.2)",
                }}
              >
                <span className="font-mono font-bold text-cyan-400">{el.symbol}</span>
                <span className="text-xs text-slate-400">{el.name}</span>
                <button
                  type="button"
                  onClick={() => toggleElement(el)}
                  className="ml-1 rounded-full p-0.5 text-slate-500 transition hover:bg-cyan-500/20 hover:text-cyan-400"
                  aria-label={`移除 ${el.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {idx < selectedElements.length - 1 && (
                  <span className="absolute -right-2 text-slate-600">+</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div
          className={cn(
            "mb-4 rounded-xl border-l-4 bg-slate-950/50 p-4 text-sm text-slate-300 transition-all md:text-base",
            currentReactions.length > 0
              ? "border-l-emerald-500"
              : selectedElements.length > 0
              ? "border-l-cyan-500"
              : "border-l-slate-600"
          )}
        >
          {message}
        </div>

        {currentReactions.length > 0 ? (
          <div className="flex flex-1 flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              {currentReactions.map((reaction) => {
                const isSaved = savedReactions.some((r) => r.id === reaction.id);
                return (
                  <div
                    key={reaction.id}
                    className="flex flex-col rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-4"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Beaker className="h-4 w-4 text-purple-400" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        反应条件
                      </span>
                      <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-xs font-medium text-purple-300">
                        {reaction.condition}
                      </span>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        (reaction.type ?? "化合") === "化合" && "bg-cyan-500/15 text-cyan-300",
                        (reaction.type ?? "化合") === "分解" && "bg-orange-500/15 text-orange-300",
                        (reaction.type ?? "化合") === "置换" && "bg-amber-500/15 text-amber-300",
                        (reaction.type ?? "化合") === "复分解" && "bg-rose-500/15 text-rose-300",
                        (reaction.type ?? "化合") === "氧化还原" && "bg-violet-500/15 text-violet-300",
                      )}>
                        {reaction.type ?? "化合"}
                      </span>
                    </div>

                    <div className="mb-3 text-xs text-slate-500">配平方程式</div>
                    <div className="mb-3 break-words font-mono text-lg leading-relaxed tracking-wide text-slate-100 md:text-xl">
                      {reaction.equation.split("").map((char, i) => {
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
                            style={{ animationDelay: `${i * 20}ms` }}
                          >
                            {char}
                          </span>
                        );
                      })}
                    </div>

                    <div className="mb-3 text-sm text-slate-400">
                      {(reaction.type ?? "化合") === "分解" ? "分解为" : "生成"} <span className="font-semibold text-emerald-400">{reaction.productName}</span>
                    </div>

                    {reaction.description && (
                      <p className="mb-3 text-xs text-slate-500">{reaction.description}</p>
                    )}

                    {/* 按钮组 */}
                    <div className="mt-auto flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSave(reaction)}
                        disabled={isSaved}
                        className={cn(
                          "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
                          isSaved
                            ? "cursor-default bg-emerald-500/20 text-emerald-400"
                            : "bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 hover:shadow-[0_0_14px_rgba(34,211,238,0.25)]"
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
                            保存
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAIExplain(reaction)}
                        className="flex items-center justify-center gap-2 rounded-lg bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-400 transition hover:bg-amber-500/25 hover:shadow-[0_0_14px_rgba(251,191,36,0.25)]"
                      >
                        <Sparkles className="h-4 w-4" />
                        AI解释
                      </button>
                    </div>

                    {savedFlashId === reaction.id && (
                      <div className="mt-2 text-center text-xs text-emerald-400 animate-fade-up">
                        已保存到本地收藏夹
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          selectedElements.length > 0 && (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/30 p-8 text-center text-sm text-slate-500">
              <div>
                <p className="mb-1">继续选择更多元素</p>
                <p className="text-xs text-slate-600">高亮的元素可与已选元素发生反应</p>
              </div>
            </div>
          )
        )}
      </div>

      {/* AI 解释弹窗 */}
      {aiModalReaction && (
        <AIExplainModal
          isOpen={true}
          onClose={() => setAiModalReaction(null)}
          equation={aiModalReaction.equation}
          productName={aiModalReaction.productName}
          condition={aiModalReaction.condition}
          type={aiModalReaction.type ?? "化合"}
        />
      )}
    </>
  );
}
