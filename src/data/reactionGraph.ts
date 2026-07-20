import type { Edge, Node } from "@xyflow/react";
import { ELEMENTS, GROUP_COLORS, type ChemicalElement, type ElementGroup } from "./elements";
import {
  REACTIONS,
  type ChemicalReaction,
  type ReactionType,
  parseEquationLeft,
  parseEquationRight,
} from "./reactions";

export interface NodeData extends Record<string, unknown> {
  label: string;
  nodeType: "element" | "compound" | "reaction";
  color: string;
  element?: ChemicalElement;
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

function findReactionsProducing(compound: string): ChemicalReaction[] {
  return REACTIONS.filter((r) => {
    const products = parseEquationRight(r.equation);
    return products.includes(compound);
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

  return null;
}

function buildReactionChain(target: ChemicalReaction): ChemicalReaction[] {
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
  const nodeMap = new Map<string, Node<NodeData>>();
  const edgeMap = new Map<string, Edge<EdgeData>>();

  const reactionChain = buildReactionChain(targetReaction);
  const numReactions = reactionChain.length;

  const LAYER_WIDTH = 220;
  const NODE_HEIGHT = 90;
  const START_X = 80;
  const START_Y = 100;

  interface NodeLayout {
    key: string;
    label: string;
    type: "element" | "compound" | "reaction";
    color: string;
    layer: number;
    y: number;
    element?: ChemicalElement;
  }

  function getItemKey(name: string, type: "element" | "compound"): string {
    return type === "element" ? `el:${name}` : `cpd:${name}`;
  }

  const compoundNodeIds = new Map<string, string>();
  const layouts: NodeLayout[] = [];

  const layers: { nodeCount: number; nodes: { key: string; label: string }[] }[] = [];
  for (let ri = 0; ri < numReactions; ri++) {
    layers[ri * 2] = { nodeCount: 0, nodes: [] };
    layers[ri * 2 + 1] = { nodeCount: 0, nodes: [] };
  }
  layers[numReactions * 2] = { nodeCount: 0, nodes: [] };

  for (let ri = 0; ri < numReactions; ri++) {
    const r = reactionChain[ri];
    const left = parseEquationLeft(r.equation);
    const right = parseEquationRight(r.equation);

    const reactantLayer = ri * 2;
    const reactionLayer = ri * 2 + 1;
    const productLayer = ri * 2 + 2;

    layers[reactionLayer].nodeCount++;

    left.forEach((c) => {
      const isEl = isElementLike(c);
      if (!isEl && compoundNodeIds.has(c)) return;
      compoundNodeIds.set(c, getItemKey(c, isEl ? "element" : "compound"));
      layers[reactantLayer].nodeCount++;
    });

    right.forEach((c) => {
      const isEl = isElementLike(c);
      if (!isEl && compoundNodeIds.has(c)) return;
      if (!isEl) compoundNodeIds.set(c, getItemKey(c, "compound"));
      layers[productLayer].nodeCount++;
    });
  }

  const maxLayerHeight = Math.max(...layers.map((l) => l.nodeCount));
  const totalHeight = (maxLayerHeight - 1) * NODE_HEIGHT;

  const compoundYPositions = new Map<string, number>();

  for (let ri = 0; ri < numReactions; ri++) {
    const r = reactionChain[ri];
    const left = parseEquationLeft(r.equation);
    const right = parseEquationRight(r.equation);
    const typeColor = getTypeColor(r.type ?? "其他");

    const reactantLayer = ri * 2;
    const reactionLayer = ri * 2 + 1;
    const productLayer = ri * 2 + 2;

    const reactionKey = `rxn:${r.id}`;
    const reactionY = START_Y + (totalHeight / 2);
    layouts.push({
      key: reactionKey,
      label: `${r.type ?? "反应"} / ${r.condition ?? ""}`,
      type: "reaction",
      color: typeColor,
      layer: reactionLayer,
      y: reactionY,
    });

    let reactantY = reactionY - ((left.length - 1) * NODE_HEIGHT) / 2;
    left.forEach((c) => {
      const isEl = isElementLike(c);
      const key = getItemKey(c, isEl ? "element" : "compound");
      const baseSymbol = c.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, "");
      const element = isEl && ELEMENTS.some((e) => e.symbol === baseSymbol)
        ? ELEMENTS.find((e) => e.symbol === baseSymbol)
        : undefined;

      if (!isEl && compoundYPositions.has(c)) {
        return;
      }

      const currentYPos = isEl ? reactantY : (compoundYPositions.has(c) ? compoundYPositions.get(c)! : reactantY);
      compoundYPositions.set(c, currentYPos);

      layouts.push({
        key,
        label: c,
        type: isEl ? "element" : "compound",
        color: isEl ? getElementColor(baseSymbol) : typeColor,
        layer: reactantLayer,
        y: currentYPos,
        element,
      });

      reactantY += NODE_HEIGHT;
    });

    let productY = reactionY - ((right.length - 1) * NODE_HEIGHT) / 2;
    right.forEach((c) => {
      const isEl = isElementLike(c);
      const key = getItemKey(c, isEl ? "element" : "compound");
      const baseSymbol = c.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, "");
      const element = isEl && ELEMENTS.some((e) => e.symbol === baseSymbol)
        ? ELEMENTS.find((e) => e.symbol === baseSymbol)
        : undefined;

      if (!isEl && compoundYPositions.has(c)) {
        return;
      }

      const finalKey = isEl ? `${key}_prod_${ri}` : key;
      if (!isEl) {
        compoundYPositions.set(c, productY);
      }

      layouts.push({
        key: finalKey,
        label: c,
        type: isEl ? "element" : "compound",
        color: isEl ? getElementColor(baseSymbol) : typeColor,
        layer: productLayer,
        y: productY,
        element,
      });

      productY += NODE_HEIGHT;
    });
  }

  layouts.forEach((layout) => {
    const x = START_X + layout.layer * LAYER_WIDTH;
    nodeMap.set(layout.key, {
      id: layout.key,
      type: layout.type,
      data: {
        label: layout.label,
        nodeType: layout.type,
        color: layout.color,
        element: layout.element,
      },
      position: { x, y: layout.y },
    });
  });

  for (let ri = 0; ri < numReactions; ri++) {
    const r = reactionChain[ri];
    const left = parseEquationLeft(r.equation);
    const right = parseEquationRight(r.equation);
    const typeColor = getTypeColor(r.type ?? "其他");
    const reactionKey = `rxn:${r.id}`;
    const isTarget = r.id === targetReaction.id;

    left.forEach((c) => {
      const isEl = isElementLike(c);
      const key = getItemKey(c, isEl ? "element" : "compound");
      const sourceKey = !isEl && compoundNodeIds.has(c) ? compoundNodeIds.get(c)! : key;
      const edgeId = `${sourceKey}-${reactionKey}`;
      if (!edgeMap.has(edgeId)) {
        edgeMap.set(edgeId, {
          id: edgeId,
          source: sourceKey,
          target: reactionKey,
          data: {
            condition: r.condition,
            reactionType: r.type ?? "其他",
            reactionId: r.id,
            equation: r.equation,
            description: r.description,
            ionicEquation: r.ionicEquation,
            productName: r.productName,
          },
          style: { stroke: typeColor, strokeWidth: 2 },
          animated: isTarget,
        });
      }
    });

    right.forEach((c) => {
      const isEl = isElementLike(c);
      const key = getItemKey(c, isEl ? "element" : "compound");
      const targetKey = isEl ? `${key}_prod_${ri}` : (compoundNodeIds.has(c) ? compoundNodeIds.get(c)! : key);
      const edgeId = `${reactionKey}-${targetKey}`;
      if (!edgeMap.has(edgeId)) {
        edgeMap.set(edgeId, {
          id: edgeId,
          source: reactionKey,
          target: targetKey,
          data: {
            condition: r.condition,
            reactionType: r.type ?? "其他",
            reactionId: r.id,
            equation: r.equation,
            description: r.description,
            ionicEquation: r.ionicEquation,
            productName: r.productName,
          },
          style: { stroke: typeColor, strokeWidth: 2 },
          animated: isTarget,
        });
      }
    });
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
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
