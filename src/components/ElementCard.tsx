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
        size === "md" ? "min-h-[72px] min-w-[52px] p-1.5" : "min-h-[60px] min-w-[44px] p-1",
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
      <span
        className={cn(
          "font-mono font-bold leading-none",
          size === "md" ? "text-sm" : "text-xs"
        )}
      >
        {element.symbol}
      </span>
      <span
        className={cn(
          "mt-0.5 text-slate-300",
          size === "md" ? "text-[10px]" : "text-[9px]"
        )}
      >
        {element.atomicNumber}
      </span>
      <span
        className={cn(
          "mt-1 text-slate-300",
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
