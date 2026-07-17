import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { GROUP_COLORS, type ChemicalElement } from "@/data/elements";

interface ElementCardProps {
  element: ChemicalElement;
  isSelected: boolean;
  isReactive: boolean;
  isDimmed: boolean;
  onClick: () => void;
  size?: "sm" | "md";
}

const ElementCard = forwardRef<HTMLButtonElement, ElementCardProps>(
  ({ element, isSelected, isReactive, isDimmed, onClick, size = "md" }, ref) => {
    const accent = GROUP_COLORS[element.group];

    return (
      <button
        ref={ref}
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg border transition-all duration-200 select-none touch-manipulation",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
        size === "md" ? "min-h-[48px] min-w-[48px] p-1" : "min-h-[36px] min-w-[36px] p-0.5",
        isSelected && "scale-110 z-10",
        isReactive && !isSelected && "animate-pulse-glow z-10",
        isDimmed && "opacity-25",
        !isSelected && !isReactive && !isDimmed && "hover:scale-105 hover:z-10"
      )}
      style={{
        backgroundColor: `${accent}20`,
        borderColor: isSelected || isReactive ? accent : `${accent}55`,
        boxShadow: isSelected
          ? `0 0 20px ${accent}, inset 0 0 12px ${accent}40`
          : isReactive
          ? `0 0 14px ${accent}80`
          : `0 0 0 transparent`,
        color: accent,
      }}
      aria-label={`${element.name} ${element.symbol}`}
    >
      {/* 原子序数 - 左上角 */}
      <span
        className={cn(
          "absolute left-1 top-0.5 font-mono text-slate-400",
          size === "md" ? "text-[9px]" : "text-[8px]"
        )}
      >
        {element.atomicNumber}
      </span>
      {/* 元素符号 - 居中 */}
      <span
        className={cn(
          "font-mono font-bold leading-none mt-2",
          size === "md" ? "text-sm" : "text-xs"
        )}
      >
        {element.symbol}
      </span>
      {/* 中文名 - 底部 */}
      <span
        className={cn(
          "text-slate-300 mt-0.5",
          size === "md" ? "text-[10px]" : "text-[9px]"
        )}
      >
        {element.name}
      </span>
    </button>
  );
}
);

ElementCard.displayName = "ElementCard";

export default ElementCard;
