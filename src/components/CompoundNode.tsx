import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { NodeData } from "@/data/reactionGraph";

type CompoundNodeType = Node<NodeData, "compound">;

function CompoundNodeComponent({ data, selected }: NodeProps<CompoundNodeType>) {
  const { label, color } = data;

  return (
    <div
      className={`
        relative flex items-center justify-center
        rounded-full border-2 bg-slate-900/95 px-4 py-2
        font-medium text-sm
        transition-all duration-200
        ${selected ? "border-cyan-400 ring-2 ring-cyan-400/50 scale-105" : "border-slate-700"}
      `}
      style={{
        color: color || "#94a3b8",
        boxShadow: selected ? `0 0 20px ${color || "#94a3b8"}40` : `0 0 10px ${color || "#94a3b8"}20`,
        minWidth: "80px",
      }}
    >
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
