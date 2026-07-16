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

export const REACTIONS: ChemicalReaction[] = reactionsData as ChemicalReaction[];
