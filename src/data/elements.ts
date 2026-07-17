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
  transition: "#E85D04",
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
  { symbol: "Sc", name: "钪", atomicNumber: 21, group: "transition", row: 4, col: 3 },
  { symbol: "Ti", name: "钛", atomicNumber: 22, group: "transition", row: 4, col: 4 },
  { symbol: "V", name: "钒", atomicNumber: 23, group: "transition", row: 4, col: 5 },
  { symbol: "Cr", name: "铬", atomicNumber: 24, group: "transition", row: 4, col: 6 },
  { symbol: "Mn", name: "锰", atomicNumber: 25, group: "transition", row: 4, col: 7 },
  { symbol: "Fe", name: "铁", atomicNumber: 26, group: "transition", row: 4, col: 8 },
  { symbol: "Co", name: "钴", atomicNumber: 27, group: "transition", row: 4, col: 9 },
  { symbol: "Ni", name: "镍", atomicNumber: 28, group: "transition", row: 4, col: 10 },
  { symbol: "Cu", name: "铜", atomicNumber: 29, group: "transition", row: 4, col: 11 },
  { symbol: "Zn", name: "锌", atomicNumber: 30, group: "transition", row: 4, col: 12 },
  { symbol: "Ga", name: "镓", atomicNumber: 31, group: "metal", row: 4, col: 13 },
  { symbol: "Ge", name: "锗", atomicNumber: 32, group: "metalloid", row: 4, col: 14 },
  { symbol: "As", name: "砷", atomicNumber: 33, group: "metalloid", row: 4, col: 15 },
  { symbol: "Se", name: "硒", atomicNumber: 34, group: "nonmetal", row: 4, col: 16 },
  { symbol: "Br", name: "溴", atomicNumber: 35, group: "halogen", row: 4, col: 17 },
  { symbol: "Kr", name: "氪", atomicNumber: 36, group: "noble", row: 4, col: 18 },

  { symbol: "Rb", name: "铷", atomicNumber: 37, group: "alkali", row: 5, col: 1 },
  { symbol: "Sr", name: "锶", atomicNumber: 38, group: "alkaline", row: 5, col: 2 },
  { symbol: "Y", name: "钇", atomicNumber: 39, group: "transition", row: 5, col: 3 },
  { symbol: "Zr", name: "锆", atomicNumber: 40, group: "transition", row: 5, col: 4 },
  { symbol: "Nb", name: "铌", atomicNumber: 41, group: "transition", row: 5, col: 5 },
  { symbol: "Mo", name: "钼", atomicNumber: 42, group: "transition", row: 5, col: 6 },
  { symbol: "Tc", name: "锝", atomicNumber: 43, group: "transition", row: 5, col: 7 },
  { symbol: "Ru", name: "钌", atomicNumber: 44, group: "transition", row: 5, col: 8 },
  { symbol: "Rh", name: "铑", atomicNumber: 45, group: "transition", row: 5, col: 9 },
  { symbol: "Pd", name: "钯", atomicNumber: 46, group: "transition", row: 5, col: 10 },
  { symbol: "Ag", name: "银", atomicNumber: 47, group: "transition", row: 5, col: 11 },
  { symbol: "Cd", name: "镉", atomicNumber: 48, group: "transition", row: 5, col: 12 },
  { symbol: "In", name: "铟", atomicNumber: 49, group: "metal", row: 5, col: 13 },
  { symbol: "Sn", name: "锡", atomicNumber: 50, group: "metal", row: 5, col: 14 },
  { symbol: "Sb", name: "锑", atomicNumber: 51, group: "metalloid", row: 5, col: 15 },
  { symbol: "Te", name: "碲", atomicNumber: 52, group: "metalloid", row: 5, col: 16 },
  { symbol: "I", name: "碘", atomicNumber: 53, group: "halogen", row: 5, col: 17 },
  { symbol: "Xe", name: "氙", atomicNumber: 54, group: "noble", row: 5, col: 18 },

  { symbol: "Cs", name: "铯", atomicNumber: 55, group: "alkali", row: 6, col: 1 },
  { symbol: "Ba", name: "钡", atomicNumber: 56, group: "alkaline", row: 6, col: 2 },
  { symbol: "La", name: "镧", atomicNumber: 57, group: "transition", row: 6, col: 3 },
  { symbol: "Hf", name: "铪", atomicNumber: 72, group: "transition", row: 6, col: 4 },
  { symbol: "Ta", name: "钽", atomicNumber: 73, group: "transition", row: 6, col: 5 },
  { symbol: "W", name: "钨", atomicNumber: 74, group: "transition", row: 6, col: 6 },
  { symbol: "Re", name: "铼", atomicNumber: 75, group: "transition", row: 6, col: 7 },
  { symbol: "Os", name: "锇", atomicNumber: 76, group: "transition", row: 6, col: 8 },
  { symbol: "Ir", name: "铱", atomicNumber: 77, group: "transition", row: 6, col: 9 },
  { symbol: "Pt", name: "铂", atomicNumber: 78, group: "transition", row: 6, col: 10 },
  { symbol: "Au", name: "金", atomicNumber: 79, group: "transition", row: 6, col: 11 },
  { symbol: "Hg", name: "汞", atomicNumber: 80, group: "transition", row: 6, col: 12 },
  { symbol: "Tl", name: "铊", atomicNumber: 81, group: "metal", row: 6, col: 13 },
  { symbol: "Pb", name: "铅", atomicNumber: 82, group: "metal", row: 6, col: 14 },
  { symbol: "Bi", name: "铋", atomicNumber: 83, group: "metal", row: 6, col: 15 },
  { symbol: "Po", name: "钋", atomicNumber: 84, group: "metalloid", row: 6, col: 16 },
  { symbol: "At", name: "砹", atomicNumber: 85, group: "halogen", row: 6, col: 17 },
  { symbol: "Rn", name: "氡", atomicNumber: 86, group: "noble", row: 6, col: 18 },

  { symbol: "Fr", name: "钫", atomicNumber: 87, group: "alkali", row: 7, col: 1 },
  { symbol: "Ra", name: "镭", atomicNumber: 88, group: "alkaline", row: 7, col: 2 },
  { symbol: "Ac", name: "锕", atomicNumber: 89, group: "transition", row: 7, col: 3 },
  { symbol: "Rf", name: "𬬻", atomicNumber: 104, group: "transition", row: 7, col: 4 },
  { symbol: "Db", name: "𬭊", atomicNumber: 105, group: "transition", row: 7, col: 5 },
  { symbol: "Sg", name: "𬭳", atomicNumber: 106, group: "transition", row: 7, col: 6 },
  { symbol: "Bh", name: "𬭛", atomicNumber: 107, group: "transition", row: 7, col: 7 },
  { symbol: "Hs", name: "𬭶", atomicNumber: 108, group: "transition", row: 7, col: 8 },
  { symbol: "Mt", name: "鿏", atomicNumber: 109, group: "transition", row: 7, col: 9 },
  { symbol: "Ds", name: "𬬭", atomicNumber: 110, group: "transition", row: 7, col: 10 },
  { symbol: "Rg", name: "鿔", atomicNumber: 111, group: "transition", row: 7, col: 11 },
  { symbol: "Cn", name: "鿫", atomicNumber: 112, group: "transition", row: 7, col: 12 },
  { symbol: "Nh", name: "鿭", atomicNumber: 113, group: "metal", row: 7, col: 13 },
  { symbol: "Fl", name: "𫓧", atomicNumber: 114, group: "metal", row: 7, col: 14 },
  { symbol: "Mc", name: "镆", atomicNumber: 115, group: "metal", row: 7, col: 15 },
  { symbol: "Lv", name: "𫟷", atomicNumber: 116, group: "metal", row: 7, col: 16 },
  { symbol: "Ts", name: "鿬", atomicNumber: 117, group: "halogen", row: 7, col: 17 },
  { symbol: "Og", name: "鿫", atomicNumber: 118, group: "noble", row: 7, col: 18 },
];
