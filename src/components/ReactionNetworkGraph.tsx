import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { X, ZoomIn, Maximize2, Network } from "lucide-react";

import { ElementNode } from "./ElementNode";
import { CompoundNode } from "./CompoundNode";
import { ReactionNode } from "./ReactionNode";
import {
  buildSingleReactionGraph,
  type NodeData,
  type EdgeData,
  getNeighborNodes,
  getEdgesForNode,
  expandCompoundPredecessors,
  collapseCompoundPredecessors,
  hasPredecessorReaction,
  parseEquationLeft,
} from "@/data/reactionGraph";
import { REACTIONS } from "@/data/reactions";
import AIExplainModal from "./AIExplainModal";

const nodeTypes = {
  element: ElementNode,
  compound: CompoundNode,
  reaction: ReactionNode,
};

interface ReactionNetworkGraphProps {
  isOpen: boolean;
  onClose: () => void;
  reactionId: string;
}

export default function ReactionNetworkGraph({
  isOpen,
  onClose,
  reactionId,
}: ReactionNetworkGraphProps) {
  const [aiModalData, setAiModalData] = useState<{
    equation: string;
    productName: string;
    condition: string;
    type: string;
    ionicEquation?: string;
  } | null>(null);

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const reaction = useMemo(
    () => REACTIONS.find((r) => r.id === reactionId),
    [reactionId]
  );

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!isOpen || !reaction) {
      return { nodes: [], edges: [] };
    }
    const result = buildSingleReactionGraph(reaction);
    
    const reactants = parseEquationLeft(reaction.equation);
    const reactantCompounds = new Set(
      reactants.filter((c: string) => !/^[A-Z][a-z]?$/.test(c.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, "")))
    );
    
    const nodesWithExpandInfo = result.nodes.map((node) => {
      if (node.data.nodeType === "compound") {
        const formula = node.data.label.replace(/^\d+\s+/, "");
        const isReactant = reactantCompounds.has(formula);
        const canExpand = isReactant && hasPredecessorReaction(formula, reactionId);
        return {
          ...node,
          data: { ...node.data, canExpand, isExpanded: false },
        };
      }
      return node;
    });
    
    return { nodes: nodesWithExpandInfo, edges: result.edges };
  }, [isOpen, reaction, reactionId]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>(
    initialNodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<EdgeData>>(
    initialEdges
  );
  const [, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setSelectedNodeId(null);
    setExpandedNodes(new Set());
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<NodeData>) => {
      if (node.data.nodeType === "compound" && node.data.canExpand) {
        if (!expandedNodes.has(node.id)) {
          const result = expandCompoundPredecessors(node.id, nodes, edges, reactionId);
          
          if (result.nodes.length > 0) {
            const nodesWithExpandInfo = result.nodes.map((n) => {
              if (n.data.nodeType === "compound") {
                const formula = n.data.label.replace(/^\d+\s+/, "").replace(/[↑↓]$/g, "");
                const canExpand = hasPredecessorReaction(formula, reactionId);
                return { ...n, data: { ...n.data, canExpand, isExpanded: false } };
              }
              return n;
            });
            
            setNodes((nds) => [...nds, ...nodesWithExpandInfo]);
            setEdges((eds) => [...eds, ...result.edges]);
            
            if (result.updatedNodes.length > 0) {
              const updateMap = new Map(result.updatedNodes.map((n) => [n.id, n]));
              setNodes((nds) =>
                nds.map((n) => {
                  const update = updateMap.get(n.id);
                  return update ? { ...n, data: update.data } : n;
                })
              );
            }
            
            setExpandedNodes((prev) => new Set([...prev, node.id]));
            
            setNodes((nds) =>
              nds.map((n) => {
                if (n.id === node.id) {
                  return { ...n, data: { ...n.data, isExpanded: true } };
                }
                return n;
              })
            );
            
            return;
          }
        } else {
          const result = collapseCompoundPredecessors(node.id, nodes, edges, reactionId);
          
          setNodes(() => result.remainingNodes);
          setEdges(() => result.remainingEdges);
          
          if (result.updatedNode) {
            setNodes((nds) =>
              nds.map((n) => {
                if (n.id === result.updatedNode!.id) {
                  return { ...n, data: { ...n.data, ...result.updatedNode!.data, isExpanded: false } };
                }
                return n;
              })
            );
          } else {
            setNodes((nds) =>
              nds.map((n) => {
                if (n.id === node.id) {
                  return { ...n, data: { ...n.data, isExpanded: false, canExpand: true } };
                }
                return n;
              })
            );
          }
          
          setExpandedNodes((prev) => {
            const next = new Set(prev);
            next.delete(node.id);
            return next;
          });
          
          return;
        }
      }

      setSelectedNodeId(node.id);

      const neighborIds = getNeighborNodes(node.id, edges);
      const connectedEdgeIds = new Set(
        getEdgesForNode(node.id, edges).map((e) => e.id)
      );

      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          style: {
            ...n.style,
            opacity:
              n.id === node.id || neighborIds.includes(n.id) ? 1 : 0.2,
            transition: "opacity 0.2s",
          },
        }))
      );

      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          style: {
            ...e.style,
            opacity: connectedEdgeIds.has(e.id) ? 1 : 0.1,
            transition: "opacity 0.2s",
          },
          animated: connectedEdgeIds.has(e.id),
        }))
      );
    },
    [edges, setNodes, setEdges, expandedNodes, reactionId, nodes]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        style: {
          ...n.style,
          opacity: 1,
        },
      }))
    );
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        style: {
          ...e.style,
          opacity: 1,
        },
        animated: false,
      }))
    );
  }, [setNodes, setEdges]);

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge<EdgeData>) => {
      if (!edge.data) return;
      setAiModalData({
        equation: edge.data.equation,
        productName: edge.data.productName,
        condition: edge.data.condition,
        type: edge.data.reactionType,
        ionicEquation: edge.data.ionicEquation,
      });
    },
    []
  );

  if (!isOpen || !reaction) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <Network className="h-6 w-6 text-fuchsia-400" />
            <h2 className="text-xl font-bold text-slate-100">反应网络图</h2>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
              {reaction.equation}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-4 border-b border-slate-800 px-6 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="rounded bg-slate-800 px-2 py-1">
              反应类型：{reaction.type ?? "其他"}
            </span>
            <span className="rounded bg-slate-800 px-2 py-1">
              条件：{reaction.condition}
            </span>
            <span className="rounded bg-slate-800 px-2 py-1">
              {nodes.length} 个节点 · {edges.length} 条连线
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <ZoomIn className="h-4 w-4" />
            <span>滚轮缩放</span>
            <Maximize2 className="ml-2 h-4 w-4" />
            <span>拖拽平移</span>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            onEdgeClick={handleEdgeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2}
            onlyRenderVisibleElements
            colorMode="dark"
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#1e293b" gap={20} size={1} />
            <Controls
              className="!border-slate-700 !bg-slate-900"
              position="bottom-right"
            />
            <MiniMap
              className="!border-slate-700 !bg-slate-900"
              nodeColor={(node) => (node.data as NodeData).color || "#64748b"}
              maskColor="rgba(15, 23, 42, 0.7)"
              position="bottom-left"
            />
          </ReactFlow>

          <div className="absolute left-4 top-4 rounded-lg border border-slate-700 bg-slate-900/90 p-3 backdrop-blur">
            <div className="mb-1 text-xs font-medium text-slate-300">
              {reaction.productName}
            </div>
            <div className="text-xs text-slate-500">
              点击化合物节点向左扩展前驱反应 · 点击连线查看 AI 解释
            </div>
          </div>
        </div>
      </div>

      {aiModalData && (
        <AIExplainModal
          isOpen={!!aiModalData}
          onClose={() => setAiModalData(null)}
          equation={aiModalData.equation}
          productName={aiModalData.productName}
          condition={aiModalData.condition}
          type={aiModalData.type}
          ionicEquation={aiModalData.ionicEquation}
        />
      )}
    </div>
  );
}
