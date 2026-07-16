import { useRef } from "react";
import { Atom } from "lucide-react";
import PeriodicTable from "@/components/PeriodicTable";
import ReactionStage from "@/components/ReactionStage";
import SearchBar from "@/components/SearchBar";
import FavoritesDrawer from "@/components/FavoritesDrawer";
import { GROUP_COLORS, GROUP_LABELS, type ElementGroup } from "@/data/elements";

export default function Home() {
  const tableRef = useRef<HTMLDivElement>(null);

  const handleLocate = () => {
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(56,189,248,0.08),_transparent_50%),radial-gradient(ellipse_at_bottom_left,_rgba(244,114,182,0.06),_transparent_50%)]" />

      <header className="relative z-10 border-b border-slate-800/60 bg-slate-950/80 px-4 py-4 backdrop-blur md:px-8 md:py-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.25)]">
              <Atom className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight md:text-xl">
                化学方程式互动实验室
              </h1>
              <p className="text-xs text-slate-500">
                点击元素 → 高亮可化合元素 → 生成方程式
              </p>
            </div>
          </div>
          <SearchBar onLocate={handleLocate} />
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 p-4 md:p-6">
        <div ref={tableRef}>
          <PeriodicTable />

          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3 backdrop-blur">
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
        </div>

        <div className="w-full">
          <ReactionStage />
        </div>
      </main>

      <footer className="relative z-10 px-4 pb-24 pt-2 text-center text-xs text-slate-600 md:pb-8">
        课堂演示模式 · 支持触摸操作 · 方程式自动保存到浏览器本地
      </footer>

      <FavoritesDrawer />
    </div>
  );
}
