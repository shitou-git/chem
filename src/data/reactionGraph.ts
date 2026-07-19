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
  const numReactions = reactionChain.length;

  const colWidth = 200;
  const verticalGap = 90;
  const startX = 80;

  interface LayoutItem {
    key: string;
    type: "element" | "compound" | "reaction";
    label: string;
    color: string;
    element?: ChemicalElement;
  }

  const columns: LayoutItem[][] = [];
  for (let i = 0; i < numReactions * 2 + 1; i++) {
    columns.push([]);
  }

  function getItemKey(name: string, type: "element" | "compound"): string {
    return type === "element" ? `el:${name}` : `cpd:${name}`;
  }

  function addToColumn(colIdx: number, item: LayoutItem) {
    const col = columns[colIdx];
    if (!col.some((it) => it.key === item.key)) {
      col.push(item);
    }
  }

  for (let ri = 0; ri < numReactions; ri++) {
    const r = reactionChain[ri];
    const leftCompounds = parseEquationLeft(r.equation);
    const rightCompounds = parseEquationRight(r.equation);
    const typeColor = getTypeColor(r.type ?? "其他");
    const reactionKey = `rxn:${r.id}`;

    const reactantCol = ri * 2;
    const reactionCol = ri * 2 + 1;
    const productCol = ri * 2 + 2;

    leftCompounds.forEach((c) => {
      const isEl = isElementLike(c);
      const baseSymbol = c.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, "");
      const element = isEl && ELEMENTS.some((e) => e.symbol === baseSymbol)
        ? ELEMENTS.find((e) => e.symbol === baseSymbol)
        : undefined;
      addToColumn(reactantCol, {
        key: getItemKey(c, isEl ? "element" : "compound"),
        type: isEl ? "element" : "compound",
        label: c,
        color: isEl ? getElementColor(baseSymbol) : typeColor,
        element,
      });
    });

    addToColumn(reactionCol, {
      key: reactionKey,
      type: "reaction",
      label: `${r.type ?? "反应"} / ${r.condition ?? ""}`,
      color: typeColor,
    });

    rightCompounds.forEach((c) => {
      const isEl = isElementLike(c);
      const baseSymbol = c.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, "");
      const element = isEl && ELEMENTS.some((e) => e.symbol === baseSymbol)
        ? ELEMENTS.find((e) => e.symbol === baseSymbol)
        : undefined;
      addToColumn(productCol, {
        key: getItemKey(c, isEl ? "element" : "compound"),
        type: isEl ? "element" : "compound",
        label: c,
        color: isEl ? getElementColor(baseSymbol) : typeColor,
        element,
      });
    });
  }

  const maxColHeight = Math.max(...columns.map((c) => c.length));
  const totalHeight = (maxColHeight - 1) * verticalGap;
  const centerY = 100 + totalHeight / 2;

  columns.forEach((col, colIdx) => {
    const x = startX + colIdx * colWidth;
    const colHeight = (col.length - 1) * verticalGap;
    const baseY = centerY - colHeight / 2;

    col.forEach((item, idx) => {
      const y = baseY + idx * verticalGap;
      nodeMap.set(item.key, {
        id: item.key,
        type: item.type,
        data: {
          label: item.label,
          nodeType: item.type,
          color: item.color,
          element: item.element,
        },
        position: { x, y },
      });
    });
  });

  for (let ri = 0; ri < numReactions; ri++) {
    const r = reactionChain[ri];
    const leftCompounds = parseEquationLeft(r.equation);
    const rightCompounds = parseEquationRight(r.equation);
    const typeColor = getTypeColor(r.type ?? "其他");
    const reactionKey = `rxn:${r.id}`;
    const isTarget = r.id === targetReaction.id;

    leftCompounds.forEach((c) => {
      const isEl = isElementLike(c);
      const key = getItemKey(c, isEl ? "element" : "compound");
      const edgeId = `${key}-${reactionKey}`;
      if (!edgeMap.has(edgeId)) {
        edgeMap.set(edgeId, {
          id: edgeId,
          source: key,
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

    rightCompounds.forEach((c) => {
      const isEl = isElementLike(c);
      const key = getItemKey(c, isEl ? "element" : "compound");
      const edgeId = `${reactionKey}-${key}`;
      if (!edgeMap.has(edgeId)) {
        edgeMap.set(edgeId, {
          id: edgeId,
          source: reactionKey,
          target: key,
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
