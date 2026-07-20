import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { NodeData } from "@/data/reactionGraph";

type CompoundNodeType = Node<NodeData, "compound">;

function CompoundNodeComponent({ data, selected }: NodeProps<CompoundNodeType>) {
  const { label, color, canExpand, isExpanded } = data;

  return (
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
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-slate-700 !bg-slate-800"
      />
      <span className="z-10 whitespace-nowrap">{label}</span>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-slate-700 !bg-slate-800"
      />
    </div>
  );
}

export const CompoundNode = memo(CompoundNodeComponent);
