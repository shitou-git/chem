import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
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
  parseEquationLeftWithCoef,
  parseEquationRightWithCoef,
} from "@/data/reactionGraph";
import { REACTIONS } from "@/data/reactions";
import AIExplainModal from "./AIExplainModal";

const nodeTypes = {
  element: ElementNode,
  compound: CompoundNode,
  reaction: ReactionNode,
};

function extractFormula(label: string): string {
  return label.replace(/^\d+\s*/, "").replace(/[↑↓]$/, "");
}

function markExpandableNodes(
  nodes: Node<NodeData>[],
  expandedFormulas: Set<string>,
  reactionId: string
): Node<NodeData>[] {
  return nodes.map((n) => {
    if (n.data.nodeType === "compound") {
      const formula = extractFormula(n.data.label);
      const canExpand = !expandedFormulas.has(formula) && hasPredecessorReaction(formula, reactionId);
      return { ...n, data: { ...n.data, canExpand, isExpanded: false } };
    }
    return n;
  });
}

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

  const [expandedFormulas, setExpandedFormulas] = useState<Set<string>>(new Set());

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
      reactants.filter((c: string) => !/^[A-Z][a-z]?$/.test(c.replace(/[₀-₉]/g, "")))
    );

    const nodesWithExpandInfo = markExpandableNodes(
      result.nodes.map((node) => {
        if (node.data.nodeType === "compound") {
          const formula = extractFormula(node.data.label);
          const isReactant = reactantCompounds.has(formula);
          const canExpand = isReactant && hasPredecessorReaction(formula, reactionId);
          return { ...node, data: { ...node.data, canExpand, isExpanded: false } };
        }
        return node;
      }),
      new Set(),
      reactionId
    );
    
    return { nodes: nodesWithExpandInfo, edges: result.edges };
  }, [isOpen, reaction, reactionId]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>(
    initialNodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<EdgeData>>(
    initialEdges
  );
  const [currentProductName, setCurrentProductName] = useState<string>(reaction?.productName || "");
  const [currentEquation, setCurrentEquation] = useState<string>(reaction?.equation || "");

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setExpandedFormulas(new Set());
    setCurrentProductName(reaction?.productName || "");
    setCurrentEquation(reaction?.equation || "");
  }, [initialNodes, initialEdges, setNodes, setEdges, reaction]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<NodeData>) => {
      if (node.data.nodeType === "compound" && node.data.canExpand) {
        const formula = extractFormula(node.data.label);
        if (!expandedFormulas.has(formula)) {
          const result = expandCompoundPredecessors(node.id, nodes, edges, reactionId);

          if (result.nodes.length > 0 || result.edges.length > 0 || result.updatedNodes.length > 0) {
            const nodesWithExpandInfo = markExpandableNodes(result.nodes, expandedFormulas, reactionId);
            const updateMap = new Map(result.updatedNodes.map((n) => [n.id, n]));

            setNodes((nds) => {
              let next = nds;
              if (result.nodes.length > 0) {
                next = [...next, ...nodesWithExpandInfo];
              }
              next = next.map((n) => {
                if (n.id === node.id) {
                  return { ...n, data: { ...n.data, isExpanded: true } };
                }
                const update = updateMap.get(n.id);
                return update ? { ...n, data: update.data } : n;
              });
              return next;
            });

            if (result.edges.length > 0) {
              setEdges((eds) => [...eds, ...result.edges]);
            }

            setExpandedFormulas((prev) => new Set([...prev, formula]));
            return;
          }
        } else {
          const result = collapseCompoundPredecessors(node.id, nodes, edges, reactionId);

          setNodes(() => {
            let next = result.remainingNodes;
            if (result.updatedNode) {
              next = next.map((n) =>
                n.id === result.updatedNode!.id
                  ? { ...n, data: { ...n.data, ...result.updatedNode!.data, isExpanded: false } }
                  : n
              );
            } else {
              next = next.map((n) =>
                n.id === node.id
                  ? { ...n, data: { ...n.data, isExpanded: false, canExpand: true } }
                  : n
              );
            }
            return next;
          });
          setEdges(() => result.remainingEdges);

          setExpandedFormulas((prev) => {
            const next = new Set(prev);
            next.delete(formula);
            return next;
          });

          return;
        }
      }

      if (node.data.nodeType === "reaction") {
        if (node.data.productName) {
          setCurrentProductName(node.data.productName);
        }
        if (node.data.equation) {
          setCurrentEquation(node.data.equation);
          
          const leftParts = parseEquationLeftWithCoef(node.data.equation);
          const rightParts = parseEquationRightWithCoef(node.data.equation);
          
          const formulaLabelMap = new Map<string, string>();
          leftParts.forEach((part) => {
            formulaLabelMap.set(part.formula, part.label);
          });
          rightParts.forEach((part) => {
            formulaLabelMap.set(part.formula, part.label);
          });
          
          const neighborIds = getNeighborNodes(node.id, edges);
          
          setNodes((nds) =>
            nds.map((n) => {
              if (!neighborIds.includes(n.id)) return n;
              
              const currentFormula = extractFormula(n.data.label);
              const newLabel = formulaLabelMap.get(currentFormula);
              if (newLabel && newLabel !== n.data.label) {
                return { ...n, data: { ...n.data, label: newLabel } };
              }
              return n;
            })
          );
        }
      }

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
    [edges, setNodes, setEdges, expandedFormulas, reactionId, nodes]
  );

  const handlePaneClick = useCallback(() => {
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
        <div className="flex flex-col border-b border-slate-800 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-fuchsia-400" />
              <h2 className="text-base font-bold text-slate-100">反应网络图</h2>
              <span className="text-xs text-slate-500">
                {nodes.length}节点 · {edges.length}连线
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
                <ZoomIn className="h-3 w-3" />
                <span>滚轮缩放</span>
                <Maximize2 className="ml-2 h-3 w-3" />
                <span>拖拽平移</span>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
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

          </ReactFlow>

          <div className="absolute left-3 top-3 rounded-lg border border-slate-700 bg-slate-900/90 px-2.5 py-2 backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-300">{currentProductName}</span>
              <span className="text-xs text-slate-400">{currentEquation}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
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
