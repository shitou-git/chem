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

const MAX_CHAIN_DEPTH = 4;
const MAX_CHAIN_REACTIONS = 6;

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

  const twoReactantSynthesis = filtered.find((r) => {
    const left = parseEquationLeft(r.equation);
    return left.length === 2 && r.type === "化合";
  });
  if (twoReactantSynthesis) return twoReactantSynthesis;

  const synthesis = filtered.find((r) => r.type === "化合");
  if (synthesis) return synthesis;

  const decomp = filtered.find((r) => r.type === "分解");
  if (decomp) return decomp;

  return filtered[0];
}

function buildReactionChain(target: ChemicalReaction): ChemicalReaction[] {
  const reactionDepths = new Map<string, number>();
  const visitedReactions = new Set<string>();
  const chainReactions = new Set<string>();

  function traverse(r: ChemicalReaction, depth: number) {
    if (visitedReactions.has(r.id)) return;
    if (depth > MAX_CHAIN_DEPTH) return;
    if (chainReactions.size >= MAX_CHAIN_REACTIONS) return;

    visitedReactions.add(r.id);
    chainReactions.add(r.id);

    const existing = reactionDepths.get(r.id);
    if (existing === undefined || depth < existing) {
      reactionDepths.set(r.id, depth);
    }

    const reactants = parseEquationLeft(r.equation);
    for (const reactant of reactants) {
      if (isElementLike(reactant)) continue;
      const producers = findReactionsProducing(reactant);
      const filtered = producers.filter((p) => {
        if (chainReactions.has(p.id)) return false;
        for (const chainId of chainReactions) {
          const chainReaction = REACTIONS.find((rr) => rr.id === chainId);
          if (chainReaction && areReverseReactions(p, chainReaction)) {
            return false;
          }
        }
        return true;
      });
      const best = selectBestPredecessor(filtered, r);
      if (best && !visitedReactions.has(best.id)) {
        traverse(best, depth + 1);
      }
    }
  }

  traverse(target, 0);

  if (reactionDepths.size === 0) return [target];

  const maxDepth = Math.max(...Array.from(reactionDepths.values()));
  const normalizedDepths = new Map<string, number>();
  reactionDepths.forEach((depth, id) => {
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

  const reactionLayerMap = new Map<string, number>();
  reactionChain.forEach((r, idx) => {
    reactionLayerMap.set(r.id, idx);
  });

  const layers: Map<
    number,
    { elements: string[]; compounds: string[]; reactions: string[] }
  > = new Map();

  function ensureLayer(idx: number) {
    if (!layers.has(idx)) {
      layers.set(idx, { elements: [], compounds: [], reactions: [] });
    }
    return layers.get(idx)!;
  }

  reactionChain.forEach((r) => {
    const layerIdx = reactionLayerMap.get(r.id)!;
    const leftCompounds = parseEquationLeft(r.equation);
    const rightCompounds = parseEquationRight(r.equation);

    const layer = ensureLayer(layerIdx);
    if (!layer.reactions.includes(`rxn:${r.id}`)) {
      layer.reactions.push(`rxn:${r.id}`);
    }

    leftCompounds.forEach((c) => {
      if (isElementLike(c)) {
        if (!layer.elements.includes(c)) layer.elements.push(c);
      } else {
        if (!layer.compounds.includes(c)) layer.compounds.push(c);
      }
    });

    const rightLayer = ensureLayer(layerIdx + 1);
    rightCompounds.forEach((c) => {
      if (!rightLayer.compounds.includes(c)) rightLayer.compounds.push(c);
    });
  });

  const layerWidth = 260;
  const nodeVerticalGap = 100;
  const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b);

  sortedLayers.forEach((layerIdx) => {
    const layer = layers.get(layerIdx)!;
    const x = layerIdx * layerWidth + 60;

    const allItems = [...layer.elements, ...layer.compounds];
    const maxItems = Math.max(allItems.length, layer.reactions.length);
    const baseY = 100 + (maxItems - 1) * nodeVerticalGap / 2;

    allItems.forEach((item, idx) => {
      const isEl = isElementLike(item);
      const key = isEl ? `el:${item}` : `cpd:${item}`;
      if (!nodeMap.has(key)) {
        const baseSymbol = item.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, "");
        const element = isEl && ELEMENTS.some((e) => e.symbol === baseSymbol)
          ? ELEMENTS.find((e) => e.symbol === baseSymbol)
          : undefined;
        const typeColor = getTypeColor(targetReaction.type ?? "其他");
        nodeMap.set(key, {
          id: key,
          type: isEl ? "element" : "compound",
          data: {
            label: item,
            nodeType: isEl ? "element" : "compound",
            color: isEl ? getElementColor(baseSymbol) : typeColor,
            element,
          },
          position: {
            x,
            y: baseY + (idx - (allItems.length - 1) / 2) * nodeVerticalGap,
          },
        });
      }
    });

    layer.reactions.forEach((reactionKey, idx) => {
      const rId = reactionKey.replace("rxn:", "");
      const r = REACTIONS.find((rr) => rr.id === rId);
      const typeColor = getTypeColor(r?.type ?? "其他");
      if (nodeMap.has(reactionKey)) {
        const node = nodeMap.get(reactionKey)!;
        node.position = {
          x: x + layerWidth / 2,
          y: baseY + (idx - (layer.reactions.length - 1) / 2) * nodeVerticalGap,
        };
      } else {
        nodeMap.set(reactionKey, {
          id: reactionKey,
          type: "reaction",
          data: {
            label: `${r?.type ?? "反应"} / ${r?.condition ?? ""}`,
            nodeType: "reaction",
            color: typeColor,
          },
          position: {
            x: x + layerWidth / 2,
            y: baseY + (idx - (layer.reactions.length - 1) / 2) * nodeVerticalGap,
          },
        });
      }
    });
  });

  reactionChain.forEach((r) => {
    const leftCompounds = parseEquationLeft(r.equation);
    const rightCompounds = parseEquationRight(r.equation);
    const typeColor = getTypeColor(r.type ?? "其他");
    const reactionKey = `rxn:${r.id}`;

    leftCompounds.forEach((reactant) => {
      const isEl = isElementLike(reactant);
      const reactantKey = isEl ? `el:${reactant}` : `cpd:${reactant}`;
      const edgeId = `${reactantKey}-${reactionKey}`;
      if (!edgeMap.has(edgeId)) {
        edgeMap.set(edgeId, {
          id: edgeId,
          source: reactantKey,
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
          style: {
            stroke: typeColor,
            strokeWidth: 2,
          },
          animated: r.id === targetReaction.id,
        });
      }
    });

    rightCompounds.forEach((product) => {
      const productKey = `cpd:${product}`;
      const edgeId = `${reactionKey}-${productKey}`;
      if (!edgeMap.has(edgeId)) {
        edgeMap.set(edgeId, {
          id: edgeId,
          source: reactionKey,
          target: productKey,
          data: {
            condition: r.condition,
            reactionType: r.type ?? "其他",
            reactionId: r.id,
            equation: r.equation,
            description: r.description,
            ionicEquation: r.ionicEquation,
            productName: r.productName,
          },
          style: {
            stroke: typeColor,
            strokeWidth: 2,
          },
          animated: r.id === targetReaction.id,
        });
      }
    });
  });

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
