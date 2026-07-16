import reactionsData from "./reactions.json";

export type ReactionType = "化合" | "分解" | "置换" | "复分解" | "氧化还原";

export interface ChemicalReaction {
  id: string;
  type?: ReactionType;
  reactants: string[];
  product: string;
  productName: string;
  equation: string;
  condition: string;
  description?: string;
}

/**
 * 找出"再选一个元素就能触发反应"的元素符号
 * 即：已选元素都是某反应的部分反应物，且该反应只差一个元素就能完全匹配
 */
export function findReactiveSymbols(selectedSymbols: string[]): string[] {
  const set = new Set(selectedSymbols);
  const partners = new Set<string>();

  REACTIONS.forEach((r) => {
    const reactantSet = new Set(r.reactants);
    const hasSelected = selectedSymbols.every((s) => reactantSet.has(s));
    if (!hasSelected) return;

    const missing = r.reactants.filter((s) => !set.has(s));
    if (missing.length === 1) {
      partners.add(missing[0]);
    }
  });

  return Array.from(partners);
}

export function findReactions(selectedSymbols: string[]): ChemicalReaction[] {
  const set = new Set(selectedSymbols);
  return REACTIONS.filter((r) =>
    r.reactants.every((s) => set.has(s))
  );
}

/** 按物质名称搜索反应（匹配产物名称或产物化学式） */
export function searchReactions(query: string): ChemicalReaction[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return REACTIONS.filter(
    (r) =>
      r.productName.includes(query.trim()) ||
      r.product.toLowerCase().includes(q) ||
      r.equation.toLowerCase().includes(q)
  );
}

/** 按物质名称搜索，返回该物质涉及的所有元素符号 */
export function getSymbolsFromReactions(reactions: ChemicalReaction[]): string[] {
  const symbols = new Set<string>();
  reactions.forEach((r) => r.reactants.forEach((s) => symbols.add(s)));
  return Array.from(symbols);
}

export const REACTIONS: ChemicalReaction[] = reactionsData as ChemicalReaction[];
