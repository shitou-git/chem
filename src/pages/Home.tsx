import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Sparkles, Layers, GitBranch } from "lucide-react";
import PeriodicTable from "@/components/PeriodicTable";
import ReactionStage from "@/components/ReactionStage";
import FavoritesDrawer from "@/components/FavoritesDrawer";
import { useChemStore } from "@/store/chemStore";
import { ELEMENTS, GROUP_COLORS, GROUP_LABELS, type ElementGroup } from "@/data/elements";
import { findReactiveSymbols, findCompoundReactiveSymbols, findReactions, searchReactions, getSymbolsFromReactions } from "@/data/reactions";
import { cn } from "@/lib/utils";

export default function Home() {
  const {
    selectedElements,
    toggleElement,
    setReactiveSymbols,
    setCurrentReactions,
    setMessage,
    reset,
    highlightMode,
    setHighlightMode,
  } = useChemStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const selectedSymbols = useMemo(
    () => selectedElements.map((e) => e.symbol),
    [selectedElements]
  );

  const reactiveSymbols = useMemo(() => {
    if (selectedElements.length === 0) return [];
    if (highlightMode === "compound") {
      return findCompoundReactiveSymbols(selectedSymbols);
    }
    return findReactiveSymbols(selectedSymbols);
  }, [selectedSymbols, highlightMode]);

  const matchedReactions = useMemo(() => {
    if (selectedElements.length < 2) return [];
    const all = findReactions(selectedSymbols);
    if (highlightMode === "compound") {
      return all.filter((r) => r.reactants.length === selectedElements.length);
    }
    return all;
  }, [selectedSymbols, highlightMode]);

  useEffect(() => {
    setReactiveSymbols(reactiveSymbols);
  }, [reactiveSymbols, setReactiveSymbols]);

  useEffect(() => {
    setCurrentReactions(matchedReactions);
  }, [matchedReactions, setCurrentReactions]);

  useEffect(() => {
    if (selectedElements.length === 0) {
      setMessage(
        highlightMode === "compound"
          ? "【化合物链式】点击元素开始探索，选两个元素形成化合物后，高亮能与之继续反应的元素"
          : "点击元素周期表中的元素开始探索化学反应，支持二元和多元化合物"
      );
    } else if (selectedElements.length === 1) {
      const el = selectedElements[0];
      if (reactiveSymbols.length > 0) {
        setMessage(`已选择 ${el.name}，高亮的元素可与它发生化合反应`);
      } else {
        setMessage(`已选择 ${el.name}，暂无已知的化合反应`);
      }
    } else {
      const names = selectedElements.map((e) => e.name).join("、");
      if (matchedReactions.length > 0) {
        if (highlightMode === "compound") {
          setMessage(`已形成化合物（${names}），高亮的元素能与该化合物继续反应`);
        } else {
          setMessage(`已选择 ${names}，共找到 ${matchedReactions.length} 个反应`);
        }
      } else {
        setMessage(`所选元素（${names}）之间暂无已知的化合反应，试试添加更多元素`);
      }
    }
  }, [selectedElements, reactiveSymbols, matchedReactions, setMessage, highlightMode]);

  const handleElementClick = (symbol: string) => {
    const element = ELEMENTS.find((e) => e.symbol === symbol);
    if (!element) return;

    // 已有元素被选中时，只允许：
    // 1. 取消已选元素（点击已选元素）
    // 2. 点击高亮（reactive）元素继续选择
    // 其他元素一律禁用，避免选了无反应的元素
    if (selectedElements.length > 0) {
      const isSelected = selectedSymbols.includes(symbol);
      if (!isSelected && !reactiveSymbols.includes(symbol)) {
        return;
      }
    }

    toggleElement(element);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResult(null);
      reset();
      return;
    }

    const q = query.trim().toLowerCase();

    // 先尝试匹配元素
    const foundElement = ELEMENTS.find(
      (e) =>
        e.symbol.toLowerCase() === q ||
        e.name === query.trim() ||
        e.symbol.toLowerCase().startsWith(q) ||
        e.name.startsWith(query.trim())
    );

    if (foundElement) {
      setSearchResult(foundElement.symbol);
      setTimeout(() => {
        const el = document.getElementById(`element-${foundElement.symbol}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        }
      }, 100);
      return;
    }

    // 再尝试搜索物质名称（如"四氧化三铁"）
    const foundReactions = searchReactions(query.trim());
    if (foundReactions.length > 0) {
      setSearchResult(null);
      // 获取所有涉及的元素并自动选中
      const symbols = getSymbolsFromReactions(foundReactions);
      const elements = symbols
        .map((s) => ELEMENTS.find((e) => e.symbol === s))
        .filter(Boolean) as typeof ELEMENTS;

      // 重置后批量选中
      reset();
      elements.forEach((el) => {
        if (!useChemStore.getState().selectedElements.some((s) => s.symbol === el.symbol)) {
          toggleElement(el);
        }
      });

      // 直接设置反应结果到舞台
      setCurrentReactions(foundReactions);
      setMessage(`搜索"${query.trim()}"，找到 ${foundReactions.length} 个相关反应`);

      // 滚动到第一个高亮元素
      setTimeout(() => {
        const el = document.getElementById(`element-${symbols[0]}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        }
      }, 100);
    } else {
      setSearchResult(null);
      setMessage(`未找到与"${query.trim()}"相关的物质或元素`);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-1/2 -right-40 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <header className="relative z-10 flex flex-col gap-4 px-4 pb-2 pt-6 md:px-6 md:pt-8">
        <div className="flex flex-col items-center gap-3 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h1 className="bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 bg-clip-text text-2xl font-bold text-transparent md:text-3xl">
              <Sparkles className="mr-2 inline h-6 w-6 text-cyan-400" />
              化学方程式互动实验室
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              点击元素 → 探索化合物 → 配平化学方程式
            </p>
          </div>

          <div className="flex w-full items-center gap-2 md:w-96">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="搜索元素或物质名称（如：四氧化三铁）..."
                className="w-full rounded-lg border border-slate-700 bg-slate-900/70 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 backdrop-blur focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 p-4 md:p-6">
        <div ref={tableRef}>
          <PeriodicTable
            highlightSymbol={searchResult}
            onElementClick={handleElementClick}
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3">
              {(Object.keys(GROUP_COLORS) as ElementGroup[]).map((group) => (
                <div key={group} className="flex items-center gap-1.5">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: GROUP_COLORS[group] }}
                  />
                  <span className="text-xs text-slate-400">{GROUP_LABELS[group]}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950/50 p-0.5">
              <button
                type="button"
                onClick={() => setHighlightMode("element")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
                  highlightMode === "element"
                    ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.25)]"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                元素高亮
              </button>
              <button
                type="button"
                onClick={() => setHighlightMode("compound")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
                  highlightMode === "compound"
                    ? "bg-fuchsia-500/20 text-fuchsia-400 shadow-[0_0_10px_rgba(232,121,249,0.25)]"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <GitBranch className="h-3.5 w-3.5" />
                化合物链式
              </button>
            </div>
          </div>
        </div>

        <div className="w-full">
          <ReactionStage />
        </div>
      </main>

      <FavoritesDrawer />

      <footer className="relative z-10 pb-6 pt-2 text-center text-xs text-slate-500">
        <p>课堂演示模式 · 支持触摸操作 · 方程式自动保存到浏览器本地</p>
        <p className="mt-1 font-mono">@Stone || v{__APP_VERSION__}</p>
      </footer>
    </div>
  );
}
