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
  firstElement: ChemicalElement | null;
  reactiveSymbols: string[];
  currentReaction: ChemicalReaction | null;
  message: string;
  savedReactions: SavedReaction[];
  setFirstElement: (el: ChemicalElement | null) => void;
  setReactiveSymbols: (symbols: string[]) => void;
  setCurrentReaction: (reaction: ChemicalReaction | null) => void;
  setMessage: (msg: string) => void;
  reset: () => void;
  saveReaction: (reaction: ChemicalReaction) => void;
  removeSavedReaction: (id: string) => void;
  loadSavedReaction: (saved: SavedReaction) => void;
}

const initialState = {
  firstElement: null,
  reactiveSymbols: [],
  currentReaction: null,
  message: "点击元素周期表中的元素开始探索化学反应",
  savedReactions: [],
};

export const useChemStore = create<ChemState>()(
  persist(
    (set) => ({
      ...initialState,
      setFirstElement: (el) => set({ firstElement: el }),
      setReactiveSymbols: (symbols) => set({ reactiveSymbols: symbols }),
      setCurrentReaction: (reaction) => set({ currentReaction: reaction }),
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
