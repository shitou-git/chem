import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { NodeData } from "@/data/reactionGraph";

type ReactionNodeType = Node<NodeData, "reaction">;

function ReactionNodeComponent({ data, selected }: NodeProps<ReactionNodeType>) {
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
        boxShadow: selected ? `0 0 20px ${color || "#94a3b8"}40` : `0 0 10px ${color || "#94a3b8"}25`,
        minWidth: "100px",
        maxWidth: "180px",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-slate-700 !bg-slate-800"
        isConnectable={false}
      />
      <span className="z-10 text-center text-xs leading-tight">{label}</span>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-slate-700 !bg-slate-800"
        isConnectable={false}
      />
    </div>
  );
}

export const ReactionNode = memo(ReactionNodeComponent);
