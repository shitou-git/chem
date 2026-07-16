export type ElementGroup =
  | "alkali"
  | "alkaline"
  | "transition"
  | "metal"
  | "metalloid"
  | "nonmetal"
  | "halogen"
  | "noble";

export interface ChemicalElement {
  symbol: string;
  name: string;
  atomicNumber: number;
  group: ElementGroup;
  row: number;
  col: number;
}

export const GROUP_COLORS: Record<ElementGroup, string> = {
  alkali: "#FF4D6D",
  alkaline: "#FFB703",
  transition: "#3A86FF",
  metal: "#4895EF",
  metalloid: "#FB5607",
  nonmetal: "#06D6A0",
  halogen: "#9D4EDD",
  noble: "#00B4D8",
};

export const GROUP_LABELS: Record<ElementGroup, string> = {
  alkali: "碱金属",
  alkaline: "碱土金属",
  transition: "过渡金属",
  metal: "金属",
  metalloid: "类金属",
  nonmetal: "非金属",
  halogen: "卤素",
  noble: "稀有气体",
};

export const ELEMENTS: ChemicalElement[] = [
  { symbol: "H", name: "氢", atomicNumber: 1, group: "nonmetal", row: 1, col: 1 },
  { symbol: "He", name: "氦", atomicNumber: 2, group: "noble", row: 1, col: 18 },

  { symbol: "Li", name: "锂", atomicNumber: 3, group: "alkali", row: 2, col: 1 },
  { symbol: "Be", name: "铍", atomicNumber: 4, group: "alkaline", row: 2, col: 2 },
  { symbol: "B", name: "硼", atomicNumber: 5, group: "metalloid", row: 2, col: 13 },
  { symbol: "C", name: "碳", atomicNumber: 6, group: "nonmetal", row: 2, col: 14 },
  { symbol: "N", name: "氮", atomicNumber: 7, group: "nonmetal", row: 2, col: 15 },
  { symbol: "O", name: "氧", atomicNumber: 8, group: "nonmetal", row: 2, col: 16 },
  { symbol: "F", name: "氟", atomicNumber: 9, group: "halogen", row: 2, col: 17 },
  { symbol: "Ne", name: "氖", atomicNumber: 10, group: "noble", row: 2, col: 18 },

  { symbol: "Na", name: "钠", atomicNumber: 11, group: "alkali", row: 3, col: 1 },
  { symbol: "Mg", name: "镁", atomicNumber: 12, group: "alkaline", row: 3, col: 2 },
  { symbol: "Al", name: "铝", atomicNumber: 13, group: "metal", row: 3, col: 13 },
  { symbol: "Si", name: "硅", atomicNumber: 14, group: "metalloid", row: 3, col: 14 },
  { symbol: "P", name: "磷", atomicNumber: 15, group: "nonmetal", row: 3, col: 15 },
  { symbol: "S", name: "硫", atomicNumber: 16, group: "nonmetal", row: 3, col: 16 },
  { symbol: "Cl", name: "氯", atomicNumber: 17, group: "halogen", row: 3, col: 17 },
  { symbol: "Ar", name: "氩", atomicNumber: 18, group: "noble", row: 3, col: 18 },

  { symbol: "K", name: "钾", atomicNumber: 19, group: "alkali", row: 4, col: 1 },
  { symbol: "Ca", name: "钙", atomicNumber: 20, group: "alkaline", row: 4, col: 2 },
  { symbol: "Fe", name: "铁", atomicNumber: 26, group: "transition", row: 4, col: 8 },
  { symbol: "Cu", name: "铜", atomicNumber: 29, group: "transition", row: 4, col: 11 },
  { symbol: "Zn", name: "锌", atomicNumber: 30, group: "transition", row: 4, col: 12 },
  { symbol: "Br", name: "溴", atomicNumber: 35, group: "halogen", row: 4, col: 17 },
  { symbol: "Kr", name: "氪", atomicNumber: 36, group: "noble", row: 4, col: 18 },

  { symbol: "Ag", name: "银", atomicNumber: 47, group: "transition", row: 5, col: 11 },
  { symbol: "I", name: "碘", atomicNumber: 53, group: "halogen", row: 5, col: 17 },
  { symbol: "Xe", name: "氙", atomicNumber: 54, group: "noble", row: 5, col: 18 },

  { symbol: "Au", name: "金", atomicNumber: 79, group: "transition", row: 6, col: 11 },
  { symbol: "Hg", name: "汞", atomicNumber: 80, group: "transition", row: 6, col: 12 },
  { symbol: "Pb", name: "铅", atomicNumber: 82, group: "metal", row: 6, col: 14 },
];
