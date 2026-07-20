import type { Edge, Node } from "@xyflow/react";
import { ELEMENTS, GROUP_COLORS, type ChemicalElement, type ElementGroup } from "./elements";
import {
  REACTIONS,
  type ChemicalReaction,
  type ReactionType,
  parseEquationLeft,
  parseEquationRight,
} from "./reactions";

export { parseEquationLeft, parseEquationRight } from "./reactions";

export interface NodeData extends Record<string, unknown> {
  label: string;
  nodeType: "element" | "compound" | "reaction";
  color: string;
  element?: ChemicalElement;
  canExpand?: boolean;
}

export interface EdgeData extends Record<string, unknown> {
  condition: string;
  reactionType: ReactionType;
  reactionId: string;
  equation: string;
  description?: string;
  ionicEquation?: string;
  productName: string;
}

const MAX_CHAIN_DEPTH = 5;
const MAX_CHAIN_REACTIONS = 8;
const LAYER_WIDTH = 220;
const NODE_HEIGHT = 90;

const DIATOMIC_ELEMENTS = new Set([
  "H₂", "O₂", "N₂", "F₂", "Cl₂", "Br₂", "I₂", "O₃", "P₄", "S₈",
]);

function getElementColor(symbol: string): string {
  const el = ELEMENTS.find((e) => e.symbol === symbol);
  return el ? GROUP_COLORS[el.group as ElementGroup] : "#64748b";
}

function getTypeColor(type: ReactionType): string {
  const colors: Record<ReactionType, string> = {
    "化合": "#22d3ee",
    "分解": "#fb923c",
    "置换": "#fbbf24",
    "复分解": "#fb7185",
    "氧化还原": "#a78bfa",
    "其他": "#94a3b8",
  };
  return colors[type] || "#94a3b8";
}

function isElementLike(symbol: string): boolean {
  if (ELEMENTS.some((e) => e.symbol === symbol)) return true;
  if (DIATOMIC_ELEMENTS.has(symbol)) return true;
  return false;
}

function getItemKey(name: string, type: "element" | "compound"): string {
  return type === "element" ? `el:${name}` : `cpd:${name}`;
}

function normalizeCompounds(compounds: string[]): string[] {
  return compounds
    .map((c) => c.replace(/[\d]+/g, "").replace(/[↑↓]/g, "").trim())
    .sort();
}

function areReverseReactions(r1: ChemicalReaction, r2: ChemicalReaction): boolean {
  const left1 = normalizeCompounds(parseEquationLeft(r1.equation));
  const right1 = normalizeCompounds(parseEquationRight(r1.equation));
  const left2 = normalizeCompounds(parseEquationLeft(r2.equation));
  const right2 = normalizeCompounds(parseEquationRight(r2.equation));
  return (
    left1.length === right2.length &&
    left1.every((c, i) => c === right2[i]) &&
    right1.length === left2.length &&
    right1.every((c, i) => c === left2[i])
  );
}

function cleanCompoundLabel(label: string): string {
  return label.replace(/\([^)]*(?:[\u4e00-\u9fa5]|\s)[^)]*\)/g, "").trim();
}

function findReactionsProducing(compound: string): ChemicalReaction[] {
  const cleanCompound = cleanCompoundLabel(compound);
  return REACTIONS.filter((r) => {
    const products = parseEquationRight(r.equation);
    return products.some((p) => {
      const cleanProduct = cleanCompoundLabel(p);
      return cleanProduct === cleanCompound;
    });
  });
}

function selectBestPredecessor(
  predecessors: ChemicalReaction[],
  target: ChemicalReaction
): ChemicalReaction | null {
  if (predecessors.length === 0) return null;

  const filtered = predecessors.filter((r) => !areReverseReactions(r, target));
  if (filtered.length === 0) return null;

  const elementSynthesis = filtered.find((r) => {
    const left = parseEquationLeft(r.equation);
    return left.every(isElementLike);
  });
  if (elementSynthesis) return elementSynthesis;

  return filtered[0];
}

export function buildReactionChain(target: ChemicalReaction): ChemicalReaction[] {
  const reactionChain = new Set<string>();
  const visited = new Set<string>();

  function shouldStopTracing(r: ChemicalReaction): boolean {
    const reactants = parseEquationLeft(r.equation);
    if (reactants.length === 0) return true;
    if (reactants.length === 1 && reactants[0] === r.product) return true;
    return reactants.every(isElementLike);
  }

  function traverse(r: ChemicalReaction, depth: number) {
    if (visited.has(r.id)) return;
    if (depth > MAX_CHAIN_DEPTH) return;
    if (reactionChain.size >= MAX_CHAIN_REACTIONS) return;

    visited.add(r.id);
    reactionChain.add(r.id);

    if (shouldStopTracing(r)) return;

    const reactants = parseEquationLeft(r.equation);
    const compoundReactants = reactants.filter((r) => !isElementLike(r));

    if (compoundReactants.length === 0) return;

    for (const targetCompound of compoundReactants) {
      if (reactionChain.size >= MAX_CHAIN_REACTIONS) break;

      const producers = findReactionsProducing(targetCompound);
      const filtered = producers.filter((p) => {
        if (reactionChain.has(p.id)) return false;
        for (const chainId of reactionChain) {
          const chainReaction = REACTIONS.find((rr) => rr.id === chainId);
          if (chainReaction && areReverseReactions(p, chainReaction)) {
            return false;
          }
        }
        return true;
      });

      const best = selectBestPredecessor(filtered, r);
      if (best && !visited.has(best.id)) {
        traverse(best, depth + 1);
      }
    }
  }

  traverse(target, 0);

  if (reactionChain.size === 0) return [target];

  const reactionDepthMap = new Map<string, number>();
  const visitedForDepth = new Set<string>();

  function computeDepth(r: ChemicalReaction, depth: number) {
    if (visitedForDepth.has(r.id)) return;
    visitedForDepth.add(r.id);

    const existing = reactionDepthMap.get(r.id);
    if (existing === undefined || depth < existing) {
      reactionDepthMap.set(r.id, depth);
    }

    const reactants = parseEquationLeft(r.equation);
    for (const reactant of reactants) {
      if (isElementLike(reactant)) continue;
      const producers = findReactionsProducing(reactant);
      const inChain = producers.find((p) => reactionChain.has(p.id));
      if (inChain) {
        computeDepth(inChain, depth + 1);
      }
    }
  }

  computeDepth(target, 0);

  const maxDepth = Math.max(...Array.from(reactionDepthMap.values()), 0);
  const normalizedDepths = new Map<string, number>();
  reactionDepthMap.forEach((depth, id) => {
    normalizedDepths.set(id, maxDepth - depth);
  });

  return Array.from(normalizedDepths.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => REACTIONS.find((r) => r.id === id)!)
    .filter(Boolean);
}

export function buildSingleReactionGraph(targetReaction: ChemicalReaction): {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
} {
  const nodes: Node<NodeData>[] = [];
  const edges: Edge<EdgeData>[] = [];

  const START_X = 80;
  const START_Y = 100;

  const left = parseEquationLeft(targetReaction.equation);
  const right = parseEquationRight(targetReaction.equation);
  const typeColor = getTypeColor(targetReaction.type ?? "其他");
  const reactionKey = `rxn:${targetReaction.id}`;

  // Separate reactants into elements and compounds
  const reactantElements = left.filter(isElementLike);
  const reactantCompounds = left.filter((c) => !isElementLike(c));
  const allReactants = [...reactantElements, ...reactantCompounds];

  // Separate products into elements and compounds
  const productElements = right.filter(isElementLike);
  const productCompounds = right.filter((c) => !isElementLike(c));
  const allProducts = [...productCompounds, ...productElements];

  const totalReactants = allReactants.length;
  const totalProducts = allProducts.length;
  const maxCount = Math.max(totalReactants, totalProducts, 1);

  const totalHeight = (maxCount - 1) * NODE_HEIGHT;
  const centerY = START_Y + totalHeight / 2;

  // Helper to create Y position
  const getY = (index: number, count: number) =>
    centerY - ((count - 1) * NODE_HEIGHT) / 2 + index * NODE_HEIGHT;

  // Layer 0: Reactants (elements and compounds on the left)
  allReactants.forEach((c, idx) => {
    const isEl = isElementLike(c);
    const key = isEl ? getItemKey(c, "element") : getItemKey(c, "compound");
    const y = getY(idx, totalReactants);

    if (isEl) {
      const baseSymbol = c.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, "");
      const element = ELEMENTS.find((e) => e.symbol === baseSymbol);
      nodes.push({
        id: key,
        type: "element",
        data: {
          label: c,
          nodeType: "element",
          color: getElementColor(baseSymbol),
          element,
        },
        position: { x: START_X, y },
      });
    } else {
      nodes.push({
        id: key,
        type: "compound",
        data: {
          label: c,
          nodeType: "compound",
          color: typeColor,
        },
        position: { x: START_X, y },
      });
    }

    // Edge: reactant -> reaction
    edges.push({
      id: `${key}-${reactionKey}`,
      source: key,
      target: reactionKey,
      data: {
        condition: targetReaction.condition,
        reactionType: targetReaction.type ?? "其他",
        reactionId: targetReaction.id,
        equation: targetReaction.equation,
        description: targetReaction.description,
        ionicEquation: targetReaction.ionicEquation,
        productName: targetReaction.productName,
      },
      style: { stroke: typeColor, strokeWidth: 2 },
      animated: true,
    });
  });

  // Layer 1: Reaction node (center)
  const reactionY = centerY;
  nodes.push({
    id: reactionKey,
    type: "reaction",
    data: {
      label: `${targetReaction.type ?? "反应"} / ${targetReaction.condition ?? ""}`,
      nodeType: "reaction",
      color: typeColor,
    },
    position: { x: START_X + LAYER_WIDTH, y: reactionY },
  });

  // Layer 2: Products (compounds and elements on the right)
  allProducts.forEach((c, idx) => {
    const isEl = isElementLike(c);
    const key = isEl
      ? `${getItemKey(c, "element")}_prod_${targetReaction.id}`
      : `${getItemKey(c, "compound")}_prod_${targetReaction.id}`;
    const y = getY(idx, totalProducts);

    if (isEl) {
      const baseSymbol = c.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, "");
      const element = ELEMENTS.find((e) => e.symbol === baseSymbol);
      nodes.push({
        id: key,
        type: "element",
        data: {
          label: c,
          nodeType: "element",
          color: getElementColor(baseSymbol),
          element,
        },
        position: { x: START_X + LAYER_WIDTH * 2, y },
      });
    } else {
      nodes.push({
        id: key,
        type: "compound",
        data: {
          label: c,
          nodeType: "compound",
          color: typeColor,
        },
        position: { x: START_X + LAYER_WIDTH * 2, y },
      });
    }

    // Edge: reaction -> product
    edges.push({
      id: `${reactionKey}-${key}`,
      source: reactionKey,
      target: key,
      data: {
        condition: targetReaction.condition,
        reactionType: targetReaction.type ?? "其他",
        reactionId: targetReaction.id,
        equation: targetReaction.equation,
        description: targetReaction.description,
        ionicEquation: targetReaction.ionicEquation,
        productName: targetReaction.productName,
      },
      style: { stroke: typeColor, strokeWidth: 2 },
      animated: true,
    });
  });

  return { nodes, edges };
}

export function getNeighborNodes(
  nodeId: string,
  edges: Edge<EdgeData>[]
): string[] {
  const neighbors = new Set<string>();
  edges.forEach((edge) => {
    if (edge.source === nodeId) {
      neighbors.add(edge.target);
    }
    if (edge.target === nodeId) {
      neighbors.add(edge.source);
    }
  });
  return Array.from(neighbors);
}

export function getEdgesForNode(
  nodeId: string,
  edges: Edge<EdgeData>[]
): Edge<EdgeData>[] {
  return edges.filter((e) => e.source === nodeId || e.target === nodeId);
}

export function getReactionFromEdge(
  edge: Edge<EdgeData>
): ChemicalReaction | null {
  if (!edge.data?.reactionId) return null;
  return REACTIONS.find((r) => r.id === edge.data!.reactionId) || null;
}

export interface ExpandResult {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  updatedNodes: Node<NodeData>[];
}

export function expandCompoundPredecessors(
  compoundKey: string,
  existingNodes: Node<NodeData>[],
  existingEdges: Edge<EdgeData>[],
  currentReactionId: string
): ExpandResult {
  const labelMatch = compoundKey.match(/^cpd:(.+)$/);
  if (!labelMatch) {
    return { nodes: [], edges: [], updatedNodes: [] };
  }
  
  const compoundLabel = labelMatch[1];
  const producers = findReactionsProducing(compoundLabel);
  
  const currentReaction = REACTIONS.find((r) => r.id === currentReactionId);
  if (!currentReaction) {
    return { nodes: [], edges: [], updatedNodes: [] };
  }
  
  const validProducers = producers.filter((p) => !areReverseReactions(p, currentReaction));
  
  if (validProducers.length === 0) {
    return { nodes: [], edges: [], updatedNodes: [] };
  }
  
  const bestProducer = selectBestPredecessor(validProducers, currentReaction);
  if (!bestProducer) {
    return { nodes: [], edges: [], updatedNodes: [] };
  }
  
  const existingNodeMap = new Map<string, Node<NodeData>>();
  existingNodes.forEach((n) => existingNodeMap.set(n.id, n));
  
  const existingEdgeIds = new Set(existingEdges.map((e) => e.id));
  
  const compoundNode = existingNodeMap.get(compoundKey);
  if (!compoundNode) {
    return { nodes: [], edges: [], updatedNodes: [] };
  }
  
  const compoundPosition = compoundNode.position;
  const compoundLayerX = compoundPosition.x;
  
  const newNodes: Node<NodeData>[] = [];
  const newEdges: Edge<EdgeData>[] = [];
  
  const left = parseEquationLeft(bestProducer.equation);
  const right = parseEquationRight(bestProducer.equation);
  const typeColor = getTypeColor(bestProducer.type ?? "其他");
  
  const reactionKey = `rxn:${bestProducer.id}`;
  const reactionX = compoundLayerX - LAYER_WIDTH;
  const reactionY = compoundPosition.y;
  
  if (!existingNodeMap.has(reactionKey)) {
    newNodes.push({
      id: reactionKey,
      type: "reaction",
      data: {
        label: `${bestProducer.type ?? "反应"} / ${bestProducer.condition ?? ""}`,
        nodeType: "reaction",
        color: typeColor,
      },
      position: { x: reactionX, y: reactionY },
    });
    existingNodeMap.set(reactionKey, {
      id: reactionKey,
      type: "reaction",
      data: {
        label: `${bestProducer.type ?? "反应"} / ${bestProducer.condition ?? ""}`,
        nodeType: "reaction",
        color: typeColor,
      },
      position: { x: reactionX, y: reactionY },
    });
  }
  
  const reactantElements = left.filter(isElementLike);
  const reactantCompounds = left.filter((c) => !isElementLike(c));
  
  const totalReactants = reactantElements.length + reactantCompounds.length;
  const startY = reactionY - ((totalReactants - 1) * NODE_HEIGHT) / 2;
  
  left.forEach((c, idx) => {
    const isEl = isElementLike(c);
    const key = isEl ? `${getItemKey(c, "element")}_pred_${bestProducer.id}_${idx}` : getItemKey(c, "compound");
    
    if (!existingNodeMap.has(key)) {
      const x = reactionX - LAYER_WIDTH;
      const y = startY + idx * NODE_HEIGHT;
      
      if (isEl) {
        const baseSymbol = c.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, "");
        const element = ELEMENTS.some((e) => e.symbol === baseSymbol)
          ? ELEMENTS.find((e) => e.symbol === baseSymbol)
          : undefined;
        
        newNodes.push({
          id: key,
          type: "element",
          data: {
            label: c,
            nodeType: "element",
            color: getElementColor(baseSymbol),
            element,
          },
          position: { x, y },
        });
        existingNodeMap.set(key, {
          id: key,
          type: "element",
          data: {
            label: c,
            nodeType: "element",
            color: getElementColor(baseSymbol),
            element,
          },
          position: { x, y },
        });
      } else {
        newNodes.push({
          id: key,
          type: "compound",
          data: {
            label: c,
            nodeType: "compound",
            color: "#64748b",
          },
          position: { x, y },
        });
        existingNodeMap.set(key, {
          id: key,
          type: "compound",
          data: {
            label: c,
            nodeType: "compound",
            color: "#64748b",
          },
          position: { x, y },
        });
      }
    }
    
    const edgeId = `${key}-${reactionKey}`;
    if (!existingEdgeIds.has(edgeId)) {
      newEdges.push({
        id: edgeId,
        source: key,
        target: reactionKey,
        data: {
          condition: bestProducer.condition,
          reactionType: bestProducer.type ?? "其他",
          reactionId: bestProducer.id,
          equation: bestProducer.equation,
          description: bestProducer.description,
          ionicEquation: bestProducer.ionicEquation,
          productName: bestProducer.productName,
        },
        style: { stroke: typeColor, strokeWidth: 2 },
        animated: false,
      });
      existingEdgeIds.add(edgeId);
    }
  });
  
  right.forEach((c) => {
    const isEl = isElementLike(c);
    let targetKey: string;
    
    if (isEl) {
      targetKey = `${getItemKey(c, "element")}_pred_${bestProducer.id}`;
    } else {
      const cleanProduct = cleanCompoundLabel(c);
      const cleanCompoundLabelValue = cleanCompoundLabel(compoundLabel);
      
      if (cleanProduct === cleanCompoundLabelValue) {
        targetKey = compoundKey;
      } else {
        targetKey = `${getItemKey(c, "compound")}_pred_${bestProducer.id}`;
      }
    }
    
    if (!existingNodeMap.has(targetKey)) {
      const x = compoundLayerX;
      const y = compoundPosition.y;
      
      if (isEl) {
        const baseSymbol = c.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, "");
        const element = ELEMENTS.some((e) => e.symbol === baseSymbol)
          ? ELEMENTS.find((e) => e.symbol === baseSymbol)
          : undefined;
        
        newNodes.push({
          id: targetKey,
          type: "element",
          data: {
            label: c,
            nodeType: "element",
            color: getElementColor(baseSymbol),
            element,
          },
          position: { x, y },
        });
        existingNodeMap.set(targetKey, {
          id: targetKey,
          type: "element",
          data: {
            label: c,
            nodeType: "element",
            color: getElementColor(baseSymbol),
            element,
          },
          position: { x, y },
        });
      } else if (targetKey !== compoundKey) {
        newNodes.push({
          id: targetKey,
          type: "compound",
          data: {
            label: c,
            nodeType: "compound",
            color: "#64748b",
          },
          position: { x, y },
        });
        existingNodeMap.set(targetKey, {
          id: targetKey,
          type: "compound",
          data: {
            label: c,
            nodeType: "compound",
            color: "#64748b",
          },
          position: { x, y },
        });
      }
    }
    
    const edgeId = `${reactionKey}-${targetKey}`;
    if (!existingEdgeIds.has(edgeId)) {
      newEdges.push({
        id: edgeId,
        source: reactionKey,
        target: targetKey,
        data: {
          condition: bestProducer.condition,
          reactionType: bestProducer.type ?? "其他",
          reactionId: bestProducer.id,
          equation: bestProducer.equation,
          description: bestProducer.description,
          ionicEquation: bestProducer.ionicEquation,
          productName: bestProducer.productName,
        },
        style: { stroke: typeColor, strokeWidth: 2 },
        animated: false,
      });
      existingEdgeIds.add(edgeId);
    }
  });
  
  const updatedNodes: Node<NodeData>[] = [];
  
  if (newNodes.length > 0) {
    const allNodes = [...existingNodes, ...newNodes];
    const shiftX = 0;
    
    allNodes.forEach((n) => {
      const existing = existingNodeMap.get(n.id);
      if (existing && existing.position.x !== n.position.x + shiftX) {
        updatedNodes.push({ ...n, position: { ...n.position, x: n.position.x + shiftX } });
      }
    });
  }
  
  return { nodes: newNodes, edges: newEdges, updatedNodes };
}

export function hasPredecessorReaction(compoundLabel: string, currentReactionId: string): boolean {
  const producers = findReactionsProducing(compoundLabel);
  const currentReaction = REACTIONS.find((r) => r.id === currentReactionId);
  if (!currentReaction) return false;
  
  const validProducers = producers.filter((p) => !areReverseReactions(p, currentReaction));
  return validProducers.length > 0;
}
