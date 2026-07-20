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

  function getItemKey(name: string, type: "element" | "compound"): string {
    return type === "element" ? `el:${name}` : `cpd:${name}`;
  }

  // Step 1: Identify all nodes and their relationships
  const elements = new Set<string>();
  const allCompounds = new Set<string>();
  const compoundProducers = new Map<string, number>(); // compound -> reaction index that produces it

  for (let ri = 0; ri < numReactions; ri++) {
    const r = reactionChain[ri];
    const left = parseEquationLeft(r.equation);
    const right = parseEquationRight(r.equation);

    left.forEach((c) => {
      if (isElementLike(c)) {
        elements.add(c);
      } else {
        allCompounds.add(c);
      }
    });

    right.forEach((c) => {
      if (!isElementLike(c)) {
        allCompounds.add(c);
        compoundProducers.set(c, ri);
      }
    });
  }

  // Step 2: Compute layer for each node using iterative approach
  // Layer 0: all elements and compounds without predecessors
  // Reaction layer: max(reactant layers) + 1
  // Product layer: reaction layer + 1
  const nodeLayers = new Map<string, number>();

  // Initialize elements at layer 0
  elements.forEach((el) => {
    nodeLayers.set(getItemKey(el, "element"), 0);
  });

  // Initialize compounds without predecessors at layer 0
  allCompounds.forEach((compound) => {
    if (!compoundProducers.has(compound)) {
      nodeLayers.set(getItemKey(compound, "compound"), 0);
    }
  });

  // Iteratively compute layers for reactions and their products
  let changed = true;
  while (changed) {
    changed = false;
    for (let ri = 0; ri < numReactions; ri++) {
      const r = reactionChain[ri];
      const left = parseEquationLeft(r.equation);
      const right = parseEquationRight(r.equation);
      const reactionKey = `rxn:${r.id}`;

      // Compute reaction layer based on reactants
      const reactantLayers = left.map((c) => {
        const key = isElementLike(c) ? getItemKey(c, "element") : getItemKey(c, "compound");
        return nodeLayers.get(key) ?? 0;
      });
      const maxReactantLayer = Math.max(...reactantLayers);
      const reactionLayer = maxReactantLayer + 1;

      if (nodeLayers.get(reactionKey) !== reactionLayer) {
        nodeLayers.set(reactionKey, reactionLayer);
        changed = true;
      }

      // Compute product layers
      right.forEach((c) => {
        if (!isElementLike(c)) {
          const key = getItemKey(c, "compound");
          const productLayer = reactionLayer + 1;
          if (nodeLayers.get(key) !== productLayer) {
            nodeLayers.set(key, productLayer);
            changed = true;
          }
        }
      });
    }
  }

  // Step 3: Group nodes by layer
  const maxLayer = Math.max(0, ...Array.from(nodeLayers.values()));
  const layers: { key: string; label: string; type: "element" | "compound" | "reaction" }[][] = [];
  for (let li = 0; li <= maxLayer; li++) {
    layers[li] = [];
  }

  // Add elements
  elements.forEach((el) => {
    const key = getItemKey(el, "element");
    const layer = nodeLayers.get(key) ?? 0;
    if (layer <= maxLayer) {
      layers[layer].push({ key, label: el, type: "element" });
    }
  });

  // Add compounds
  allCompounds.forEach((compound) => {
    const key = getItemKey(compound, "compound");
    const layer = nodeLayers.get(key) ?? 0;
    if (layer <= maxLayer) {
      layers[layer].push({ key, label: compound, type: "compound" });
    }
  });

  // Add reactions
  reactionChain.forEach((r) => {
    const key = `rxn:${r.id}`;
    const layer = nodeLayers.get(key) ?? 1;
    if (layer <= maxLayer) {
      layers[layer].push({ key, label: `${r.type} / ${r.condition}`, type: "reaction" });
    }
  });

  // Step 4: Compute Y positions for each layer
  const maxLayerHeight = Math.max(...layers.map((l) => l.length), 1);
  const totalHeight = (maxLayerHeight - 1) * NODE_HEIGHT;
  const centerY = START_Y + (totalHeight / 2);

  const nodeYPositions = new Map<string, number>();

  layers.forEach((layer) => {
    const nodeCount = layer.length;
    const startY = centerY - ((nodeCount - 1) * NODE_HEIGHT) / 2;

    layer.forEach((node, ni) => {
      nodeYPositions.set(node.key, startY + ni * NODE_HEIGHT);
    });
  });

  // Step 5: Create nodes
  // Elements
  elements.forEach((el) => {
    const key = getItemKey(el, "element");
    const baseSymbol = el.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, "");
    const element = ELEMENTS.some((e) => e.symbol === baseSymbol)
      ? ELEMENTS.find((e) => e.symbol === baseSymbol)
      : undefined;
    const layer = nodeLayers.get(key) ?? 0;

    nodeMap.set(key, {
      id: key,
      type: "element",
      data: {
        label: el,
        nodeType: "element",
        color: getElementColor(baseSymbol),
        element,
      },
      position: { x: START_X + layer * LAYER_WIDTH, y: nodeYPositions.get(key)! },
    });
  });

  // Compounds
  allCompounds.forEach((compound) => {
    const key = getItemKey(compound, "compound");
    const layer = nodeLayers.get(key) ?? 0;
    const producerIdx = compoundProducers.get(compound);
    const reaction = producerIdx !== undefined ? reactionChain[producerIdx] : undefined;
    const typeColor = reaction ? getTypeColor(reaction.type ?? "其他") : "#64748b";

    nodeMap.set(key, {
      id: key,
      type: "compound",
      data: {
        label: compound,
        nodeType: "compound",
        color: typeColor,
      },
      position: { x: START_X + layer * LAYER_WIDTH, y: nodeYPositions.get(key)! },
    });
  });

  // Reactions
  reactionChain.forEach((r) => {
    const key = `rxn:${r.id}`;
    const layer = nodeLayers.get(key) ?? 1;
    const typeColor = getTypeColor(r.type ?? "其他");

    nodeMap.set(key, {
      id: key,
      type: "reaction",
      data: {
        label: `${r.type ?? "反应"} / ${r.condition ?? ""}`,
        nodeType: "reaction",
        color: typeColor,
      },
      position: { x: START_X + layer * LAYER_WIDTH, y: nodeYPositions.get(key)! },
    });
  });

  // Step 6: Create edges
  for (let ri = 0; ri < numReactions; ri++) {
    const r = reactionChain[ri];
    const left = parseEquationLeft(r.equation);
    const right = parseEquationRight(r.equation);
    const typeColor = getTypeColor(r.type ?? "其他");
    const reactionKey = `rxn:${r.id}`;
    const isTarget = r.id === targetReaction.id;

    left.forEach((c) => {
      const isEl = isElementLike(c);
      const sourceKey = isEl ? getItemKey(c, "element") : getItemKey(c, "compound");
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
      const targetKey = isEl ? `${getItemKey(c, "element")}_prod_${ri}` : getItemKey(c, "compound");

      if (isEl) {
        const baseSymbol = c.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, "");
        const element = ELEMENTS.some((e) => e.symbol === baseSymbol)
          ? ELEMENTS.find((e) => e.symbol === baseSymbol)
          : undefined;
        const reactionLayer = nodeLayers.get(reactionKey) ?? 1;
        const productLayer = reactionLayer + 1;
        const x = START_X + productLayer * LAYER_WIDTH;
        const y = nodeYPositions.get(getItemKey(c, "element")) ?? (centerY + ri * NODE_HEIGHT);

        nodeMap.set(targetKey, {
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
      }

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
