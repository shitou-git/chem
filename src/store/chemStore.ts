import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChemicalElement } from "@/data/elements";
import type { ChemicalReaction } from "@/data/reactions";

export interface SavedReaction {
  id: string;
  equation: string;
  productName: string;
  savedAt: number;
}

interface ChemState {
  selectedElements: ChemicalElement[];
  reactiveSymbols: string[];
  currentReactions: ChemicalReaction[];
  message: string;
  savedReactions: SavedReaction[];
  toggleElement: (el: ChemicalElement) => void;
  setReactiveSymbols: (symbols: string[]) => void;
  setCurrentReactions: (reactions: ChemicalReaction[]) => void;
  setMessage: (msg: string) => void;
  reset: () => void;
  saveReaction: (reaction: ChemicalReaction) => void;
  removeSavedReaction: (id: string) => void;
  loadSavedReaction: (saved: SavedReaction) => void;
}

const initialState = {
  selectedElements: [],
  reactiveSymbols: [],
  currentReactions: [],
  message: "点击元素周期表中的元素开始探索化学反应",
  savedReactions: [],
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
      setCurrentReactions: (reactions) => set({ currentReactions: reactions }),
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
        set({
          message: `已载入收藏的方程式：${saved.equation}`,
        }),
    }),
    {
      name: "chem-lab-favorites",
      partialize: (state) => ({ savedReactions: state.savedReactions }),
    }
  )
);
