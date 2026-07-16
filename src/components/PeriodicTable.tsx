import { useRef, useEffect } from "react";
import { ELEMENTS, REACTIONS } from "@/data";
import { useChemStore } from "@/store/chemStore";
import ElementCard from "./ElementCard";

export default function PeriodicTable() {
  const {
    firstElement,
    reactiveSymbols,
    currentReaction,
    setFirstElement,
    setReactiveSymbols,
    setCurrentReaction,
    setMessage,
  } = useChemStore();

  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleElementClick = (symbol: string) => {
    const element = ELEMENTS.find((e) => e.symbol === symbol);
    if (!element) return;

    if (!firstElement) {
      setFirstElement(element);
      const partners = REACTIONS.filter((r) =>
        r.reactants.includes(element.symbol)
      )
        .map((r) => r.reactants.find((s) => s !== element.symbol))
        .filter((s): s is string => Boolean(s));

      const unique = Array.from(new Set(partners));
      setReactiveSymbols(unique);
      setCurrentReaction(null);
      setMessage(
        unique.length > 0
          ? `已选择 ${element.name}（${element.symbol}），请选择一个可化合的元素`
          : `${element.name}（${element.symbol}）暂无内置化合反应，请重新选择`
      );
      return;
    }

    if (firstElement.symbol === element.symbol) {
      setMessage("已取消选择，请重新选择第一个元素");
      setFirstElement(null);
      setReactiveSymbols([]);
      setCurrentReaction(null);
      return;
    }

    if (reactiveSymbols.includes(element.symbol)) {
      const reaction = REACTIONS.find(
        (r) =>
          r.reactants.includes(firstElement.symbol) &&
          r.reactants.includes(element.symbol)
      );
      if (reaction) {
        setCurrentReaction(reaction);
        setMessage(`生成 ${reaction.productName}：${reaction.equation}`);
      } else {
        setMessage("暂未收录该组合的方程式");
      }
      setReactiveSymbols([]);
    } else {
      setMessage(`${element.name} 无法与 ${firstElement.name} 直接化合，请重新选择`);
    }
  };

  const maxRow = Math.max(...ELEMENTS.map((e) => e.row));

  useEffect(() => {
    if (firstElement && refs.current[firstElement.symbol]) {
      refs.current[firstElement.symbol]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [firstElement]);

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50 p-3 backdrop-blur md:p-4">
      <div
        className="grid gap-1.5 md:gap-2"
        style={{
          gridTemplateColumns: "repeat(18, minmax(44px, 1fr))",
          minWidth: "760px",
        }}
      >
        {Array.from({ length: maxRow * 18 }, (_, i) => i).map((index) => {
          const row = Math.floor(index / 18) + 1;
          const col = (index % 18) + 1;
          const element = ELEMENTS.find((e) => e.row === row && e.col === col);

          if (!element) {
            return <div key={`empty-${row}-${col}`} className="min-h-[44px] min-w-[44px]" />;
          }

          const isSelected = firstElement?.symbol === element.symbol;
          const isProduct =
            currentReaction?.reactants.includes(element.symbol) ?? false;
          const isReactive = reactiveSymbols.includes(element.symbol);
          const isDimmed =
            Boolean(firstElement) &&
            !isSelected &&
            !isReactive &&
            !isProduct;

          return (
            <div key={element.symbol} className="relative flex items-center justify-center pb-4">
              <ElementCard
                element={element}
                isSelected={isSelected || (Boolean(currentReaction) && isProduct)}
                isReactive={isReactive}
                isDimmed={isDimmed}
                onClick={() => handleElementClick(element.symbol)}
                size="md"
                ref={(el) => {
                  refs.current[element.symbol] = el;
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
