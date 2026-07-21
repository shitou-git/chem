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
const LAYER_WIDTH = 110;
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
  const cleaned = symbol.replace(/^[\d]+/, "").replace(/[↑↓]/g, "").trim();
  if (ELEMENTS.some((e) => e.symbol === cleaned)) return true;
  if (DIATOMIC_ELEMENTS.has(cleaned)) return true;
  return false;
}

function getItemKey(name: string, type: "element" | "compound"): string {
  return type === "element" ? `el:${name}` : `cpd:${name}`;
}

interface EquationPart {
  formula: string;
  coefficient: number;
  label: string;
}

function parseEquationSide(side: string): EquationPart[] {
  return side
    .split("+")
    .map((p) => {
      const trimmed = p.trim();
      const stateMatch = trimmed.match(/([↑↓])$/);
      const stateSymbol = stateMatch ? stateMatch[1] : "";
      
      const cleaned = trimmed
        .replace(/\(浓\)|\(稀\)|\(熔融\)/g, "")
        .replace(/[↑↓]$/g, "")
        .trim();
        
      const match = cleaned.match(/^([\d]*)(.+)$/);
      if (match) {
        const coefficient = match[1] ? parseInt(match[1], 10) : 1;
        const formula = match[2].trim();
        const label = coefficient > 1 ? `${coefficient} ${formula}${stateSymbol}` : `${formula}${stateSymbol}`;
        return {
          formula,
          coefficient,
          label,
        };
      }
      return { formula: cleaned, coefficient: 1, label: `${cleaned}${stateSymbol}` };
    })
    .filter((p) => p.formula);
}

function parseEquationLeftWithCoef(equation: string): EquationPart[] {
  const arrow = equation.includes("→") ? "→" : equation.includes("⇌") ? "⇌" : "=";
  const leftSide = equation.split(arrow)[0].trim();
  return parseEquationSide(leftSide);
}

function parseEquationRightWithCoef(equation: string): EquationPart[] {
  const arrow = equation.includes("→") ? "→" : equation.includes("⇌") ? "⇌" : "=";
  const rightSide = equation.split(arrow)[1].trim();
  return parseEquationSide(rightSide);
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

  const leftParts = parseEquationLeftWithCoef(targetReaction.equation);
  const rightParts = parseEquationRightWithCoef(targetReaction.equation);
  const typeColor = getTypeColor(targetReaction.type ?? "其他");
  const reactionKey = `rxn:${targetReaction.id}`;

  const reactantElements = leftParts.filter((p) => isElementLike(p.formula));
  const reactantCompounds = leftParts.filter((p) => !isElementLike(p.formula));
  const allReactants = [...reactantElements, ...reactantCompounds];

  const productElements = rightParts.filter((p) => isElementLike(p.formula));
  const productCompounds = rightParts.filter((p) => !isElementLike(p.formula));
  const allProducts = [...productCompounds, ...productElements];

  const totalReactants = allReactants.length;
  const totalProducts = allProducts.length;
  const maxCount = Math.max(totalReactants, totalProducts, 1);

  const totalHeight = (maxCount - 1) * NODE_HEIGHT;
  const centerY = START_Y + totalHeight / 2;

  const getY = (index: number, count: number) =>
    centerY - ((count - 1) * NODE_HEIGHT) / 2 + index * NODE_HEIGHT;

  allReactants.forEach((part, idx) => {
    const { formula, label } = part;
    const isEl = isElementLike(formula);
    const key = isEl ? getItemKey(formula, "element") : getItemKey(formula, "compound");
    const y = getY(idx, totalReactants);

    if (isEl) {
      const baseSymbol = formula.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, "");
      const element = ELEMENTS.find((e) => e.symbol === baseSymbol);
      nodes.push({
        id: key,
        type: "element",
        data: {
          label,
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
          label,
          nodeType: "compound",
          color: typeColor,
        },
        position: { x: START_X, y },
      });
    }

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

  allProducts.forEach((part, idx) => {
    const { formula, label } = part;
    const isEl = isElementLike(formula);
    const key = isEl
      ? `${getItemKey(formula, "element")}_prod_${targetReaction.id}`
      : `${getItemKey(formula, "compound")}_prod_${targetReaction.id}`;
    const y = getY(idx, totalProducts);

    if (isEl) {
      const baseSymbol = formula.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, "");
      const element = ELEMENTS.find((e) => e.symbol === baseSymbol);
      nodes.push({
        id: key,
        type: "element",
        data: {
          label,
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
          label,
          nodeType: "compound",
          color: typeColor,
        },
        position: { x: START_X + LAYER_WIDTH * 2, y },
      });
    }

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
  
  let compoundLabel = labelMatch[1];
  compoundLabel = compoundLabel.replace(/_prod_.+$/, "").replace(/_pred_.+_\d+$/, "");
  compoundLabel = compoundLabel.replace(/[↑↓]$/g, "");
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
  const updatedNodes: Node<NodeData>[] = [];
  
  const leftParts = parseEquationLeftWithCoef(bestProducer.equation);
  const rightParts = parseEquationRightWithCoef(bestProducer.equation);
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
  
  const reactantLayerX = reactionX - LAYER_WIDTH;
  
  const findSameNodeInLayer = (
    formula: string,
    targetX: number,
    nodeType: "element" | "compound"
  ): Node<NodeData> | undefined => {
    const cleanFormula = cleanCompoundLabel(formula);
    const layerTolerance = LAYER_WIDTH / 2;
    for (const node of existingNodeMap.values()) {
      if (node.data.nodeType !== nodeType) continue;
      if (Math.abs(node.position.x - targetX) > layerTolerance) continue;
      const nodeFormula = node.data.label.replace(/^\d+\s*/, "").replace(/[↑↓]$/g, "");
      const cleanNodeFormula = cleanCompoundLabel(nodeFormula);
      if (cleanNodeFormula === cleanFormula) {
        return node;
      }
    }
    return undefined;
  };
  
  const hasReactantStateSymbol = leftParts.some((part) => part.label.includes("↑") || part.label.includes("↓"));
  
  const updateNodeLabel = (
    existingNode: Node<NodeData>,
    newLabel: string
  ): Node<NodeData> | null => {
    let updated = false;
    let finalLabel = existingNode.data.label;
    
    const newCoefMatch = newLabel.match(/^(\d+)\s+/);
    const newCoef = newCoefMatch ? parseInt(newCoefMatch[1], 10) : 1;
    const oldCoefMatch = existingNode.data.label.match(/^(\d+)\s+/);
    const oldCoef = oldCoefMatch ? parseInt(oldCoefMatch[1], 10) : 1;
    
    if (newCoef > oldCoef) {
      const baseLabel = existingNode.data.label.replace(/^\d+\s*/, "");
      finalLabel = `${newCoef} ${baseLabel}`;
      updated = true;
    }
    
    if (!hasReactantStateSymbol) {
      const newStateSymbol = newLabel.match(/([↑↓])$/);
      if (newStateSymbol && !finalLabel.includes(newStateSymbol[1])) {
        finalLabel = finalLabel.replace(/[↑↓]$/g, "") + newStateSymbol[1];
        updated = true;
      }
    }
    
    if (!updated) return null;
    
    return {
      ...existingNode,
      data: { ...existingNode.data, label: finalLabel },
    };
  };
  
  const reactantElements = leftParts.filter((p) => isElementLike(p.formula));
  const reactantCompounds = leftParts.filter((p) => !isElementLike(p.formula));
  
  const totalReactants = reactantElements.length + reactantCompounds.length;
  const startY = reactionY - ((totalReactants - 1) * NODE_HEIGHT) / 2;
  
  const findAvailableY = (
    targetX: number,
    preferredY: number,
    nodeType: string
  ): number => {
    const occupiedYs: number[] = [];
    for (const node of existingNodeMap.values()) {
      if (node.data.nodeType !== nodeType) continue;
      if (Math.abs(node.position.x - targetX) > LAYER_WIDTH / 2) continue;
      occupiedYs.push(node.position.y);
    }
    
    if (occupiedYs.length === 0) return preferredY;
    
    let y = preferredY;
    const minSpacing = NODE_HEIGHT;
    let attempts = 0;
    while (attempts < 20) {
      const hasConflict = occupiedYs.some((oy) => Math.abs(oy - y) < minSpacing);
      if (!hasConflict) return y;
      y += minSpacing;
      attempts++;
    }
    return y;
  };
  
  leftParts.forEach((part, idx) => {
    const { formula, label } = part;
    const isEl = isElementLike(formula);
    const nodeType: "element" | "compound" = isEl ? "element" : "compound";
    
    const existingSameNode = findSameNodeInLayer(formula, reactantLayerX, nodeType);
    const key = existingSameNode ? existingSameNode.id : (
      isEl 
        ? `${getItemKey(formula, "element")}_pred_${bestProducer.id}_${idx}` 
        : `${getItemKey(formula, "compound")}_pred_${bestProducer.id}_${idx}`
    );
    
    if (existingSameNode) {
      const updatedNode = updateNodeLabel(existingSameNode, label);
      if (updatedNode) {
        updatedNodes.push(updatedNode);
        existingNodeMap.set(key, updatedNode);
      }
    } else if (!existingNodeMap.has(key)) {
      const x = reactantLayerX;
      const preferredY = startY + idx * NODE_HEIGHT;
      const y = findAvailableY(x, preferredY, nodeType);
      
      if (isEl) {
        const baseSymbol = formula.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, "");
        const element = ELEMENTS.some((e) => e.symbol === baseSymbol)
          ? ELEMENTS.find((e) => e.symbol === baseSymbol)
          : undefined;
        
        newNodes.push({
          id: key,
          type: "element",
          data: {
            label,
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
            label,
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
            label,
            nodeType: "compound",
            color: "#64748b",
          },
          position: { x, y },
        });
        existingNodeMap.set(key, {
          id: key,
          type: "compound",
          data: {
            label,
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
  
  rightParts.forEach((part, idx) => {
    const { formula, label } = part;
    const isEl = isElementLike(formula);
    
    const cleanProduct = cleanCompoundLabel(formula);
    const cleanCompoundLabelValue = cleanCompoundLabel(compoundLabel);
    const isTargetCompound = !isEl && cleanProduct === cleanCompoundLabelValue;
    
    let targetKey: string;
    if (isTargetCompound) {
      targetKey = compoundKey;
    } else {
      targetKey = isEl
        ? `${getItemKey(formula, "element")}_pred_${bestProducer.id}_${idx}`
        : `${getItemKey(formula, "compound")}_pred_${bestProducer.id}_${idx}`;
    }
    
    const x = isTargetCompound ? compoundPosition.x : compoundLayerX;
    const preferredY = isTargetCompound ? compoundPosition.y : compoundPosition.y;
    const nodeType: "element" | "compound" = isEl ? "element" : "compound";
    const y = isTargetCompound ? compoundPosition.y : findAvailableY(x, preferredY, nodeType);
    
    if (isTargetCompound) {
      const updatedNode = updateNodeLabel(existingNodeMap.get(compoundKey)!, label);
      if (updatedNode) {
        updatedNodes.push(updatedNode);
        existingNodeMap.set(compoundKey, updatedNode);
      }
    } else if (!existingNodeMap.has(targetKey)) {
      if (isEl) {
        const baseSymbol = formula.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, "");
        const element = ELEMENTS.some((e) => e.symbol === baseSymbol)
          ? ELEMENTS.find((e) => e.symbol === baseSymbol)
          : undefined;
        
        newNodes.push({
          id: targetKey,
          type: "element",
          data: {
            label,
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
            label,
            nodeType: "element",
            color: getElementColor(baseSymbol),
            element,
          },
          position: { x, y },
        });
      } else {
        newNodes.push({
          id: targetKey,
          type: "compound",
          data: {
            label,
            nodeType: "compound",
            color: "#64748b",
          },
          position: { x, y },
        });
        existingNodeMap.set(targetKey, {
          id: targetKey,
          type: "compound",
          data: {
            label,
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
  
  if (newNodes.length > 0) {
    const allNodes = [...existingNodes, ...newNodes];
    const shiftX = 0;
    
    allNodes.forEach((n) => {
      const existing = existingNodeMap.get(n.id);
      if (existing && existing.position.x !== n.position.x + shiftX) {
        const nodeToUpdate = updatedNodes.find((un) => un.id === n.id);
        if (!nodeToUpdate) {
          updatedNodes.push({ ...n, position: { ...n.position, x: n.position.x + shiftX } });
        }
      }
    });
  }
  
  return { nodes: newNodes, edges: newEdges, updatedNodes };
}

export function collapseCompoundPredecessors(
  compoundKey: string,
  existingNodes: Node<NodeData>[],
  existingEdges: Edge<EdgeData>[],
  currentReactionId: string
): {
  remainingNodes: Node<NodeData>[];
  remainingEdges: Edge<EdgeData>[];
  updatedNode: Node<NodeData> | null;
} {
  const labelMatch = compoundKey.match(/^cpd:(.+)$/);
  if (!labelMatch) {
    return { remainingNodes: existingNodes, remainingEdges: existingEdges, updatedNode: null };
  }

  let compoundLabel = labelMatch[1];
  compoundLabel = compoundLabel.replace(/_prod_.+$/, "").replace(/_pred_.+_\d+$/, "");
  compoundLabel = compoundLabel.replace(/[↑↓]$/g, "");
  const producers = findReactionsProducing(compoundLabel);
  const currentReaction = REACTIONS.find((r) => r.id === currentReactionId);
  if (!currentReaction) {
    return { remainingNodes: existingNodes, remainingEdges: existingEdges, updatedNode: null };
  }

  const validProducers = producers.filter((p) => !areReverseReactions(p, currentReaction));
  if (validProducers.length === 0) {
    return { remainingNodes: existingNodes, remainingEdges: existingEdges, updatedNode: null };
  }

  const bestProducer = validProducers[0];

  const reactionKey = `rxn:${bestProducer.id}`;

  const edgeIdsToRemove = new Set<string>();
  existingEdges.forEach((e) => {
    if (e.source === reactionKey || e.target === reactionKey) {
      edgeIdsToRemove.add(e.id);
    }
  });

  const remainingEdges = existingEdges.filter((e) => !edgeIdsToRemove.has(e.id));

  const remainingEdgeNodeIds = new Set<string>();
  remainingEdges.forEach((e) => {
    remainingEdgeNodeIds.add(e.source);
    remainingEdgeNodeIds.add(e.target);
  });

  const nodeIdsToRemove = new Set<string>();
  nodeIdsToRemove.add(reactionKey);

  const candidateNodeIds = new Set<string>();
  existingEdges.forEach((e) => {
    if (e.source === reactionKey) candidateNodeIds.add(e.target);
    if (e.target === reactionKey) candidateNodeIds.add(e.source);
  });

  candidateNodeIds.forEach((nodeId) => {
    if (!remainingEdgeNodeIds.has(nodeId) && nodeId !== compoundKey) {
      nodeIdsToRemove.add(nodeId);
    }
  });

  const remainingNodes = existingNodes.filter((n) => !nodeIdsToRemove.has(n.id));

  let updatedNode: Node<NodeData> | null = null;
  const compoundNode = existingNodes.find((n) => n.id === compoundKey);
  if (compoundNode && compoundNode.data.label.match(/[↑↓]$/)) {
    const newLabel = compoundNode.data.label.replace(/[↑↓]$/g, "");
    updatedNode = {
      ...compoundNode,
      data: { ...compoundNode.data, label: newLabel, canExpand: true },
    };
  } else if (compoundNode) {
    updatedNode = {
      ...compoundNode,
      data: { ...compoundNode.data, canExpand: true },
    };
  }

  return { remainingNodes, remainingEdges, updatedNode };
}

export function hasPredecessorReaction(compoundLabel: string, currentReactionId: string): boolean {
  const producers = findReactionsProducing(compoundLabel);
  const currentReaction = REACTIONS.find((r) => r.id === currentReactionId);
  if (!currentReaction) return false;
  
  const validProducers = producers.filter((p) => !areReverseReactions(p, currentReaction));
  return validProducers.length > 0;
}
