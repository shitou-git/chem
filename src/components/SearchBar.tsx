import { useState, useRef } from "react";
import { Search, X } from "lucide-react";
import { ELEMENTS, REACTIONS } from "@/data";
import { useChemStore } from "@/store/chemStore";

interface SearchBarProps {
  onLocate?: (symbol: string) => void;
}

export default function SearchBar({ onLocate }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<typeof ELEMENTS>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    setFirstElement,
    setReactiveSymbols,
    setCurrentReaction,
    setMessage,
  } = useChemStore();

  const handleInput = (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    const lower = value.toLowerCase();
    const matches = ELEMENTS.filter(
      (e) =>
        e.symbol.toLowerCase().includes(lower) ||
        e.name.toLowerCase().includes(lower)
    ).slice(0, 6);
    setSuggestions(matches);
  };

  const selectElement = (symbol: string) => {
    const element = ELEMENTS.find((e) => e.symbol === symbol);
    if (!element) return;

    setFirstElement(element);
    const partners = REACTIONS.filter((r) => r.reactants.includes(element.symbol))
      .map((r) => r.reactants.find((s) => s !== element.symbol))
      .filter((s): s is string => Boolean(s));
    const unique = Array.from(new Set(partners));
    setReactiveSymbols(unique);
    setCurrentReaction(null);
    setMessage(
      unique.length > 0
        ? `搜索定位：${element.name}（${element.symbol}），请选择一个可化合元素`
        : `${element.name}（${element.symbol}）暂无内置化合反应`
    );
    setQuery("");
    setSuggestions([]);
    onLocate?.(symbol);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && suggestions.length > 0) {
      selectElement(suggestions[0].symbol);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 shadow-inner backdrop-blur focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500/40">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索元素符号或名称，如 H、氧"
          className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSuggestions([]);
              inputRef.current?.focus();
            }}
            className="text-slate-500 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900/95 shadow-2xl backdrop-blur">
          {suggestions.map((e) => (
            <button
              key={e.symbol}
              type="button"
              onClick={() => selectElement(e.symbol)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-200 transition hover:bg-slate-800"
            >
              <span className="rounded bg-slate-800 px-2 py-0.5 font-mono font-bold text-cyan-400">
                {e.symbol}
              </span>
              <span>{e.name}</span>
              <span className="ml-auto text-xs text-slate-500">
                {e.atomicNumber}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
