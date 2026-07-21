import { memo, useCallback, useState } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import type { NodeData } from "@/data/reactionGraph";

type CompoundNodeType = Node<NodeData, "compound">;

function extractShortInfo(fullInfo: string): string {
  const idx = fullInfo.indexOf("生成");
  if (idx !== -1) {
    return fullInfo.slice(idx + 2).trim().replace(/^[，,]?\s*/, "");
  }
  return fullInfo;
}

const colorMap: Record<string, string> = {
  黄: "#f59e0b",
  金: "#f59e0b",
  蓝: "#3b82f6",
  红: "#ef4444",
  白: "#e2e8f0",
  黑: "#334155",
  绿: "#22c55e",
  棕: "#a0522d",
  褐: "#a0522d",
};

function extractPrecipitateColor(info: string): string | null {
  for (const [key, value] of Object.entries(colorMap)) {
    if (info.includes(key)) {
      return value;
    }
  }
  return null;
}

function CompoundNodeComponent({ data, selected }: NodeProps<CompoundNodeType>) {
  const { label, color, canExpand, isExpanded, hasPrecipitate, precipitateInfo } = data;
  const [showInfo, setShowInfo] = useState(false);

  const shortInfo = precipitateInfo ? extractShortInfo(precipitateInfo) : "";
  const dotColor = precipitateInfo ? extractPrecipitateColor(precipitateInfo) : null;

  const handlePrecipitateClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInfo((prev) => !prev);
  }, []);

  const handleCloseInfo = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInfo(false);
  }, []);

  return (
    <div className="relative">
      <div
        className={`
          relative flex items-center justify-center
          rounded-full border-2 bg-slate-900/95 px-4 py-2
          font-medium text-sm
          transition-all duration-200 cursor-pointer
          ${selected ? "border-cyan-400 ring-2 ring-cyan-400/50 scale-105" : "border-slate-700"}
          ${canExpand ? "hover:border-cyan-500" : ""}
        `}
        style={{
          color: color || "#94a3b8",
          boxShadow: selected ? `0 0 20px ${color || "#94a3b8"}40` : `0 0 10px ${color || "#94a3b8"}20`,
          minWidth: "80px",
        }}
      >
        {canExpand && (
          <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex items-center justify-center">
            {isExpanded ? (
              <ChevronRight className="h-4 w-4 text-cyan-400 opacity-60 hover:opacity-100 transition-opacity" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-cyan-400 opacity-60 hover:opacity-100 transition-opacity" />
            )}
          </div>
        )}
        {hasPrecipitate && (
          <div
            className="absolute -right-2 -top-2 z-20 flex h-5 w-5 items-center justify-center rounded-full text-white cursor-pointer hover:opacity-80 transition-opacity shadow-lg"
            style={{ backgroundColor: dotColor || "#3b82f6" }}
            onClick={handlePrecipitateClick}
            title="查看沉淀信息"
          >
            <Info className="h-3 w-3" />
          </div>
        )}
        <Handle
          type="target"
          position={Position.Left}
          className="!h-2 !w-2 !border-slate-700 !bg-slate-800"
          isConnectable={false}
        />
        <span className="z-10 whitespace-nowrap">{label}</span>
        <Handle
          type="source"
          position={Position.Right}
          className="!h-2 !w-2 !border-slate-700 !bg-slate-800"
          isConnectable={false}
        />
      </div>

      {showInfo && shortInfo && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-9 z-30 flex items-center gap-1.5 rounded-md border border-blue-500/40 bg-slate-800/95 px-2.5 py-1 text-xs text-blue-300 whitespace-nowrap shadow-lg backdrop-blur"
          onClick={(e) => e.stopPropagation()}
        >
          <span>{shortInfo}</span>
          <X
            className="h-3 w-3 cursor-pointer text-slate-400 hover:text-slate-200 shrink-0"
            onClick={handleCloseInfo}
          />
        </div>
      )}
    </div>
  );
}

export const CompoundNode = memo(CompoundNodeComponent);
