import { useRef, useEffect } from "react";
import { ELEMENTS } from "@/data/elements";
import { useChemStore } from "@/store/chemStore";
import ElementCard from "./ElementCard";

interface PeriodicTableProps {
  highlightSymbol?: string | null;
  onElementClick?: (symbol: string) => void;
}

export default function PeriodicTable({ highlightSymbol, onElementClick }: PeriodicTableProps) {
  const { selectedElements, reactiveSymbols, currentReactions } = useChemStore();

  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const selectedSymbols = selectedElements.map((e) => e.symbol);
  const reactionReactantSymbols = new Set(
    currentReactions.flatMap((r) => r.reactants)
  );

  const maxRow = Math.max(...ELEMENTS.map((e) => e.row));

  useEffect(() => {
    if (highlightSymbol && refs.current[highlightSymbol]) {
      refs.current[highlightSymbol]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [highlightSymbol]);

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50 p-3 backdrop-blur md:p-4">
      <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(18, 1fr)" }}>
        {Array.from({ length: maxRow * 18 }, (_, i) => i).map((index) => {
          const row = Math.floor(index / 18) + 1;
          const col = (index % 18) + 1;
          const element = ELEMENTS.find((e) => e.row === row && e.col === col);

          if (!element) {
            return <div key={`empty-${row}-${col}`} />;
          }

          const isSelected = selectedSymbols.includes(element.symbol);
          const isReactive = reactiveSymbols.includes(element.symbol);
          const isProduct = reactionReactantSymbols.has(element.symbol);
          const isHighlighted = highlightSymbol === element.symbol;
          const isDimmed =
            selectedSymbols.length > 0 &&
            !isSelected &&
            !isReactive &&
            !isProduct;

          return (
            <div key={element.symbol} className="relative flex items-center justify-center aspect-square">
              <ElementCard
                element={element}
                isSelected={isSelected || (currentReactions.length > 0 && isProduct) || isHighlighted}
                isReactive={isReactive}
                isDimmed={isDimmed}
                onClick={() => onElementClick?.(element.symbol)}
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
