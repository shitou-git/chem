import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { NodeData } from "@/data/reactionGraph";

type ElementNodeType = Node<NodeData, "element">;

function ElementNodeComponent({ data, selected }: NodeProps<ElementNodeType>) {
  const { label, color, element } = data;

  return (
    <div
      className={`
        relative flex h-14 w-14 items-center justify-center
        rounded-lg border-2 bg-slate-900/95 font-bold text-lg
        transition-all duration-200
        ${selected ? "border-cyan-400 ring-2 ring-cyan-400/50 scale-110" : "border-slate-700"}
      `}
      style={{
        color: color || "#64748b",
        boxShadow: selected ? `0 0 20px ${color || "#64748b"}40` : `0 0 10px ${color || "#64748b"}20`,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-slate-700 !bg-slate-800"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-slate-700 !bg-slate-800"
      />
      <span className="z-10">{label}</span>
      {element && (
        <span className="absolute -bottom-4 text-[10px] font-normal text-slate-500">
          {element.name}
        </span>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-slate-700 !bg-slate-800"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-slate-700 !bg-slate-800"
      />
    </div>
  );
}

export const ElementNode = memo(ElementNodeComponent);
