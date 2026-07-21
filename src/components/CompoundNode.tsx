import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import type { NodeData } from "@/data/reactionGraph";

type CompoundNodeType = Node<NodeData, "compound">;

interface CompoundNodeComponentProps extends NodeProps<CompoundNodeType> {
  onPrecipitateClick?: (info: string) => void;
}

function CompoundNodeComponent({ data, selected, ...props }: CompoundNodeComponentProps) {
  const { label, color, canExpand, isExpanded, hasPrecipitate, precipitateInfo } = data;

  const handlePrecipitateClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (precipitateInfo && props.onPrecipitateClick) {
      props.onPrecipitateClick(precipitateInfo);
    }
  }, [precipitateInfo, props]);

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
      {hasPrecipitate && precipitateInfo && (
        <div
          className="absolute -right-2 -top-2 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white cursor-pointer hover:bg-blue-400 transition-colors shadow-lg"
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
  );
}

export const CompoundNode = memo(CompoundNodeComponent);
