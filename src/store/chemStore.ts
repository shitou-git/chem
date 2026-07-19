import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ELEMENTS, type ChemicalElement } from "@/data/elements";
import { REACTIONS, type ChemicalReaction } from "@/data/reactions";

export interface SavedReaction {
  id: string;
  equation: string;
  productName: string;
  savedAt: number;
}

export type HighlightMode = "element" | "compound";

interface ChemState {
  selectedElements: ChemicalElement[];
  reactiveSymbols: string[];
  currentReactions: ChemicalReaction[];
  message: string;
  savedReactions: SavedReaction[];
  highlightMode: HighlightMode;
  searchOverride: boolean;
  networkViewOpen: boolean;
  networkReactionId?: string;
  toggleElement: (el: ChemicalElement) => void;
  setReactiveSymbols: (symbols: string[]) => void;
  setCurrentReactions: (reactions: ChemicalReaction[]) => void;
  setMessage: (msg: string) => void;
  reset: () => void;
  saveReaction: (reaction: ChemicalReaction) => void;
  removeSavedReaction: (id: string) => void;
  loadSavedReaction: (saved: SavedReaction) => void;
  setHighlightMode: (mode: HighlightMode) => void;
  setSearchOverride: (on: boolean) => void;
  openNetworkForReaction: (reactionId: string) => void;
  closeNetwork: () => void;
}

const initialState = {
  selectedElements: [],
  reactiveSymbols: [],
  currentReactions: [],
  message: "点击元素周期表中的元素开始探索化学反应",
  savedReactions: [],
  highlightMode: "element" as HighlightMode,
  searchOverride: false,
  networkViewOpen: false,
  networkReactionId: undefined as string | undefined,
};

export const useChemStore = create<ChemState>()(
  persist(
    (set) => ({
      ...initialState,
      toggleElement: (el) =>
        set((state) => {
          const exists = state.selectedElements.some((e) => e.symbol === el.symbol);
          if (exists) {
            return { selectedElements: state.selectedElements.filter((e) => e.symbol !== el.symbol) };
          } else {
            return { selectedElements: [...state.selectedElements, el] };
          }
        }),
      setReactiveSymbols: (symbols) => set({ reactiveSymbols: symbols }),
      setCurrentReactions: (reactions) =>
        set(() => {
          // 反应去重：同一反应（忽略反应物顺序和状态符号）只保留第一个
          const normalize = (eq: string): string => {
            const sep = eq.includes("→") ? "→" : eq.includes("⇌") ? "⇌" : "";
            if (!sep) return eq;
            const [left, right] = eq.split(sep);
            const sortSide = (side: string) =>
              side
                .split("+")
                .map((s) => s.trim().replace(/[↑↓]/g, ""))
                .sort()
                .join("+");
            return `${sortSide(left)}${sep}${sortSide(right)}`;
          };
          const seen = new Set<string>();
          const deduped = reactions.filter((r) => {
            const key = normalize(r.equation);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return { currentReactions: deduped };
        }),
      setMessage: (msg) => set({ message: msg }),
      reset: () =>
        set((state) => ({
          ...initialState,
          savedReactions: state.savedReactions,
        })),
      saveReaction: (reaction) =>
        set((state) => {
          const exists = state.savedReactions.some((r) => r.id === reaction.id);
          if (exists) return state;
          const item: SavedReaction = {
            id: reaction.id,
            equation: reaction.equation,
            productName: reaction.productName,
            savedAt: Date.now(),
          };
          return { savedReactions: [item, ...state.savedReactions] };
        }),
      removeSavedReaction: (id) =>
        set((state) => ({
          savedReactions: state.savedReactions.filter((r) => r.id !== id),
        })),
      loadSavedReaction: (saved) =>
        set(() => {
          const reaction = REACTIONS.find((r) => r.id === saved.id);
          if (!reaction) {
            return { message: `未找到收藏的方程式：${saved.productName}` };
          }
          const elements = reaction.reactants
            .map((s) => ELEMENTS.find((e) => e.symbol === s))
            .filter(Boolean) as ChemicalElement[];
          return {
            selectedElements: elements,
            currentReactions: [reaction],
            reactiveSymbols: [],
            message: `已载入收藏：${reaction.productName} — ${reaction.equation}`,
          };
        }),
      setHighlightMode: (mode) => set({ highlightMode: mode }),
      setSearchOverride: (on) => set({ searchOverride: on }),
      openNetworkForReaction: (reactionId) =>
        set({ networkViewOpen: true, networkReactionId: reactionId }),
      closeNetwork: () =>
        set({ networkViewOpen: false, networkReactionId: undefined }),
    }),
    {
      name: "chem-lab-favorites",
      partialize: (state) => ({ savedReactions: state.savedReactions }),
    }
  )
);
