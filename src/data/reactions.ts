export interface ChemicalReaction {
  id: string;
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

export const REACTIONS: ChemicalReaction[] = [
  {
    id: "h-o",
    reactants: ["H", "O"],
    product: "H₂O",
    productName: "水",
    equation: "2H₂ + O₂ → 2H₂O",
    condition: "点燃",
    description: "氢气在氧气中燃烧生成水。",
  },
  {
    id: "h-cl",
    reactants: ["H", "Cl"],
    product: "HCl",
    productName: "氯化氢",
    equation: "H₂ + Cl₂ → 2HCl",
    condition: "点燃或光照",
    description: "氢气与氯气化合生成氯化氢气体。",
  },
  {
    id: "h-n",
    reactants: ["H", "N"],
    product: "NH₃",
    productName: "氨",
    equation: "N₂ + 3H₂ ⇌ 2NH₃",
    condition: "高温高压、催化剂",
    description: "工业合成氨反应，需铁系催化剂。",
  },
  {
    id: "h-c",
    reactants: ["H", "C"],
    product: "CH₄",
    productName: "甲烷",
    equation: "C + 2H₂ → CH₄",
    condition: "高温",
    description: "碳与氢气化合生成甲烷。",
  },
  {
    id: "c-o",
    reactants: ["C", "O"],
    product: "CO₂",
    productName: "二氧化碳",
    equation: "C + O₂ → CO₂",
    condition: "点燃",
    description: "碳在氧气中充分燃烧生成二氧化碳。",
  },
  {
    id: "c-o2",
    reactants: ["C", "O"],
    product: "CO",
    productName: "一氧化碳",
    equation: "2C + O₂ → 2CO",
    condition: "不充分燃烧",
    description: "碳在氧气不足时不完全燃烧生成一氧化碳。",
  },
  {
    id: "n-o",
    reactants: ["N", "O"],
    product: "NO",
    productName: "一氧化氮",
    equation: "N₂ + O₂ → 2NO",
    condition: "放电或高温",
    description: "空气中氮气与氧气在放电条件下反应。",
  },
  {
    id: "n-o2",
    reactants: ["N", "O"],
    product: "NO₂",
    productName: "二氧化氮",
    equation: "2NO + O₂ → 2NO₂",
    condition: "常温",
    description: "一氧化氮与氧气进一步化合。",
  },
  {
    id: "s-o",
    reactants: ["S", "O"],
    product: "SO₂",
    productName: "二氧化硫",
    equation: "S + O₂ → SO₂",
    condition: "点燃",
    description: "硫在空气中燃烧产生二氧化硫。",
  },
  {
    id: "p-o",
    reactants: ["P", "O"],
    product: "P₂O₅",
    productName: "五氧化二磷",
    equation: "4P + 5O₂ → 2P₂O₅",
    condition: "点燃",
    description: "磷在氧气中燃烧生成五氧化二磷。",
  },
  {
    id: "mg-o",
    reactants: ["Mg", "O"],
    product: "MgO",
    productName: "氧化镁",
    equation: "2Mg + O₂ → 2MgO",
    condition: "点燃",
    description: "镁条在空气中燃烧发出耀眼白光。",
  },
  {
    id: "fe-o",
    reactants: ["Fe", "O"],
    product: "Fe₃O₄",
    productName: "四氧化三铁",
    equation: "3Fe + 2O₂ → Fe₃O₄",
    condition: "点燃",
    description: "铁丝在氧气中剧烈燃烧生成四氧化三铁。",
  },
  {
    id: "cu-o",
    reactants: ["Cu", "O"],
    product: "CuO",
    productName: "氧化铜",
    equation: "2Cu + O₂ → 2CuO",
    condition: "加热",
    description: "铜在加热条件下与氧气反应生成黑色氧化铜。",
  },
  {
    id: "na-cl",
    reactants: ["Na", "Cl"],
    product: "NaCl",
    productName: "氯化钠",
    equation: "2Na + Cl₂ → 2NaCl",
    condition: "点燃",
    description: "钠在氯气中燃烧生成氯化钠。",
  },
  {
    id: "h-s",
    reactants: ["H", "S"],
    product: "H₂S",
    productName: "硫化氢",
    equation: "H₂ + S → H₂S",
    condition: "加热",
    description: "氢气与硫蒸气化合生成硫化氢。",
  },
  {
    id: "ca-o",
    reactants: ["Ca", "O"],
    product: "CaO",
    productName: "氧化钙",
    equation: "2Ca + O₂ → 2CaO",
    condition: "点燃",
    description: "钙在氧气中燃烧生成氧化钙。",
  },
  {
    id: "al-o",
    reactants: ["Al", "O"],
    product: "Al₂O₃",
    productName: "氧化铝",
    equation: "4Al + 3O₂ → 2Al₂O₃",
    condition: "点燃",
    description: "铝在氧气中燃烧生成氧化铝。",
  },
  {
    id: "zn-o",
    reactants: ["Zn", "O"],
    product: "ZnO",
    productName: "氧化锌",
    equation: "2Zn + O₂ → 2ZnO",
    condition: "加热",
    description: "锌在加热条件下与氧气反应。",
  },
  {
    id: "k-o",
    reactants: ["K", "O"],
    product: "K₂O",
    productName: "氧化钾",
    equation: "4K + O₂ → 2K₂O",
    condition: "点燃",
    description: "钾在氧气中燃烧生成氧化钾。",
  },
  {
    id: "li-o",
    reactants: ["Li", "O"],
    product: "Li₂O",
    productName: "氧化锂",
    equation: "4Li + O₂ → 2Li₂O",
    condition: "点燃",
    description: "锂在氧气中燃烧生成氧化锂。",
  },
  {
    id: "fe-cl",
    reactants: ["Fe", "Cl"],
    product: "FeCl₃",
    productName: "氯化铁",
    equation: "2Fe + 3Cl₂ → 2FeCl₃",
    condition: "点燃",
    description: "铁丝在氯气中燃烧生成棕黄色氯化铁。",
  },
  {
    id: "cu-cl",
    reactants: ["Cu", "Cl"],
    product: "CuCl₂",
    productName: "氯化铜",
    equation: "Cu + Cl₂ → CuCl₂",
    condition: "点燃",
    description: "铜在氯气中燃烧生成棕黄色氯化铜。",
  },
  {
    id: "h-br",
    reactants: ["H", "Br"],
    product: "HBr",
    productName: "溴化氢",
    equation: "H₂ + Br₂ → 2HBr",
    condition: "加热",
    description: "氢气与溴蒸气加热化合。",
  },
  {
    id: "h-i",
    reactants: ["H", "I"],
    product: "HI",
    productName: "碘化氢",
    equation: "H₂ + I₂ ⇌ 2HI",
    condition: "加热、可逆",
    description: "氢气与碘蒸气加热生成碘化氢，反应可逆。",
  },
  {
    id: "c-h",
    reactants: ["C", "H"],
    product: "C₂H₂",
    productName: "乙炔",
    equation: "2C + H₂ → C₂H₂",
    condition: "高温电弧",
    description: "碳与氢气在高温电弧下生成乙炔。",
  },
  {
    id: "si-o",
    reactants: ["Si", "O"],
    product: "SiO₂",
    productName: "二氧化硅",
    equation: "Si + O₂ → SiO₂",
    condition: "高温",
    description: "硅在高温下与氧气化合生成二氧化硅。",
  },
  {
    id: "ca-c",
    reactants: ["Ca", "C"],
    product: "CaC₂",
    productName: "碳化钙",
    equation: "Ca + 2C → CaC₂",
    condition: "高温",
    description: "氧化钙与碳在高温电炉中反应（此处简化为单质化合）。",
  },
  {
    id: "ag-s",
    reactants: ["Ag", "S"],
    product: "Ag₂S",
    productName: "硫化银",
    equation: "2Ag + S → Ag₂S",
    condition: "常温",
    description: "银器在含硫环境中变黑即生成硫化银。",
  },
];
