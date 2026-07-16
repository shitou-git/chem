import { useState } from "react";
import { Bookmark, X, Trash2, ChevronUp } from "lucide-react";
import { REACTIONS } from "@/data/reactions";
import { ELEMENTS } from "@/data/elements";
import { useChemStore, type SavedReaction } from "@/store/chemStore";
import { cn } from "@/lib/utils";

export default function FavoritesDrawer() {
  const { savedReactions, removeSavedReaction, toggleElement, setCurrentReactions } = useChemStore();
  const [isOpen, setIsOpen] = useState(false);

  const loadReaction = (saved: SavedReaction) => {
    const reaction = REACTIONS.find((r) => r.id === saved.id);
    if (!reaction) return;
    const elements = reaction.reactants
      .map((s) => ELEMENTS.find((e) => e.symbol === s))
      .filter(Boolean) as typeof ELEMENTS;
    useChemStore.setState({
      selectedElements: elements,
      currentReactions: [reaction],
      reactiveSymbols: [],
      message: `已载入收藏：${reaction.productName} — ${reaction.equation}`,
    });
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-purple-500/40 bg-slate-900/90 text-purple-400 shadow-lg backdrop-blur transition hover:scale-110 hover:bg-purple-500/15 md:bottom-8 md:right-8"
        aria-label="打开收藏夹"
      >
        <Bookmark className="h-5 w-5" />
        {savedReactions.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-[10px] font-bold text-white">
            {savedReactions.length}
          </span>
        )}
      </button>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setIsOpen(false)}
      />

      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-slate-700 bg-slate-900/95 p-5 shadow-2xl backdrop-blur transition-transform duration-300 md:left-auto md:right-0 md:top-0 md:w-80 md:rounded-none md:border-l md:border-t-0 md:px-6 md:py-8",
          isOpen ? "translate-y-0" : "translate-y-full md:translate-x-full md:translate-y-0"
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-100">
            <Bookmark className="h-5 w-5 text-purple-400" />
            收藏夹
          </h3>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {savedReactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500">
            <Bookmark className="mb-2 h-10 w-10 opacity-30" />
            <p className="text-sm">暂无收藏的方程式</p>
            <p className="text-xs">生成反应后点击保存即可收藏</p>
          </div>
        ) : (
          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1 md:max-h-[80vh]">
            {savedReactions.map((saved) => (
              <div
                key={saved.id}
                className="group rounded-xl border border-slate-800 bg-slate-950/60 p-3 transition hover:border-purple-500/40"
              >
                <button
                  type="button"
                  onClick={() => loadReaction(saved)}
                  className="w-full text-left"
                >
                  <div className="mb-1 font-mono text-base font-semibold text-cyan-300">
                    {saved.equation}
                  </div>
                  <div className="text-sm text-slate-400">{saved.productName}</div>
                  <div className="mt-1 text-[10px] text-slate-600">
                    {new Date(saved.savedAt).toLocaleString()}
                  </div>
                </button>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeSavedReaction(saved.id)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-400 transition hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3" />
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-center md:hidden">
          <ChevronUp className="h-5 w-5 text-slate-600" />
        </div>
      </div>
    </>
  );
}
