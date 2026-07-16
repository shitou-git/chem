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

export function findReactiveSymbols(selectedSymbols: string[]): string[] {
  const partners = new Set<string>();
  REACTIONS.forEach((r) => {
    const hasSelected = r.reactants.some((s) => selectedSymbols.includes(s));
    if (hasSelected) {
      r.reactants.forEach((s) => {
        if (!selectedSymbols.includes(s)) {
          partners.add(s);
        }
      });
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
