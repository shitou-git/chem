import { z } from "zod";
import reactionsData from "./reactions.json";

export type ReactionType =
  | "化合"
  | "分解"
  | "置换"
  | "复分解"
  | "氧化还原"
  | "水解"
  | "电解"
  | "取代"
  | "消去"
  | "加聚"
  | "缩聚"
  | "其他";

const ReactionTypeEnum = z.enum([
  "化合",
  "分解",
  "置换",
  "复分解",
  "氧化还原",
  "水解",
  "电解",
  "取代",
  "消去",
  "加聚",
  "缩聚",
  "其他",
]);

const ChemicalReactionSchema = z.object({
  id: z.string().min(1),
  type: ReactionTypeEnum.optional(),
  reactants: z.array(z.string().min(1)).min(1),
  product: z.string().min(1),
  productName: z.string().min(1),
  equation: z.string().min(1),
  condition: z.string().min(1),
  description: z.string().optional(),
  ionicEquation: z.string().min(1).optional(),
  ionicReactants: z.array(z.string().min(1)).optional(),
});

export type ChemicalReaction = z.infer<typeof ChemicalReactionSchema>;

const reactionsValidation = z.array(ChemicalReactionSchema).safeParse(reactionsData);

if (!reactionsValidation.success) {
  console.error("Reactions data validation failed:", reactionsValidation.error);
  throw new Error("Invalid reactions data");
}


/**
 * 找出"再选一个元素就能触发反应"的元素符号
 * 即：已选元素都是某反应的部分反应物，且该反应只差一个元素就能完全匹配
 */
export function findReactiveSymbols(selectedSymbols: string[]): string[] {
  if (selectedSymbols.length === 0) {
    return [];
  }
  
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

/**
 * 化合物链式高亮：找出能与当前已选化合物继续反应的元素
 * - 0或1个元素：与 findReactiveSymbols 相同
 * - 2+个元素：找出所有包含已选元素的反应，且只差1个元素就能匹配
 *   表示"选了这个元素，就能形成一个新的反应"
 */
export function findCompoundReactiveSymbols(selectedSymbols: string[]): string[] {
  return findReactiveSymbols(selectedSymbols);
}

export function findReactions(selectedSymbols: string[]): ChemicalReaction[] {
  const set = new Set(selectedSymbols);
  return REACTIONS.filter((r) =>
    r.reactants.every((s) => set.has(s))
  );
}

const SUBSCRIPT_MAP: Record<string, string> = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
  "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
};

const SUPERSCRIPT_MAP: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
  "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
  "⁺": "+", "⁻": "-",
};

function normalizeEquation(eq: string): string {
  return eq
    .replace(/\s+/g, "")
    .replace(/[₀-₉]/g, (ch) => SUBSCRIPT_MAP[ch] ?? ch)
    .replace(/[⁰-⁹⁺⁻]/g, (ch) => SUPERSCRIPT_MAP[ch] ?? ch)
    .replace(/[↑↓]/g, "")
    .replace(/[[\]]/g, "")
    .replace(/\(浓\)|\(稀\)|\(熔融\)/g, "")
    .toLowerCase();
}

function normalizeSide(side: string): string {
  return side
    .split("+")
    .map((s) => normalizeEquation(s).replace(/[()]/g, ""))
    .sort()
    .join("+");
}

function equationMatch(eq: string, query: string): boolean {
  const normalizedEq = normalizeEquation(eq);
  const normalizedQuery = normalizeEquation(query);

  if (normalizedEq.includes(normalizedQuery)) return true;

  const sepEq = eq.includes("→") ? "→" : eq.includes("⇌") ? "⇌" : "";
  const sepQuery = query.includes("→") ? "→" : query.includes("⇌") ? "⇌" : "";

  if (sepEq && sepQuery) {
    const [leftEq, rightEq] = eq.split(sepEq);
    const [leftQuery, rightQuery] = query.split(sepQuery);
    return (
      normalizeSide(leftEq) === normalizeSide(leftQuery) &&
      normalizeSide(rightEq) === normalizeSide(rightQuery)
    );
  }

  if (sepEq && !sepQuery) {
    const [leftEq, rightEq] = eq.split(sepEq);
    const sortedQuery = normalizeSide(normalizedQuery);
    return (
      sortedQuery === normalizeSide(leftEq) ||
      sortedQuery === normalizeSide(rightEq) ||
      normalizeSide(leftEq).includes(sortedQuery) ||
      normalizeSide(rightEq).includes(sortedQuery)
    );
  }

  return false;
}

/** 按物质名称或反应类型搜索反应
 *  支持匹配产物名称、产物化学式、方程式、反应类型
 *  特殊关键词：化合/分解/置换/复分解/氧化还原/其他
 *  @param strictProductOnly - 如果为true，只搜索产物名称精确匹配
 */
export function searchReactions(query: string, strictProductOnly: boolean = false): ChemicalReaction[] {
  const trimmed = query.trim();
  const q = trimmed.toLowerCase();
  if (!q) return [];

  const typeKeywords: Record<string, ReactionType> = {
    "化合": "化合",
    "分解": "分解",
    "置换": "置换",
    "复分解": "复分解",
    "氧化还原": "氧化还原",
    "氧化": "氧化还原",
    "还原": "氧化还原",
    "水解": "水解",
    "电解": "电解",
    "取代": "取代",
    "消去": "消去",
    "消除": "消去",
    "加聚": "加聚",
    "聚合": "加聚",
    "缩聚": "缩聚",
    "其他": "其他",
  };
  if (trimmed in typeKeywords) {
    return REACTIONS.filter((r) => (r.type ?? "化合") === typeKeywords[trimmed]);
  }

  if (strictProductOnly) {
    return REACTIONS.filter(
      (r) =>
        r.productName === trimmed ||
        r.product === trimmed
    );
  }

  return REACTIONS.filter(
    (r) =>
      r.productName.includes(trimmed) ||
      r.product.toLowerCase().includes(q) ||
      r.equation.toLowerCase().includes(q) ||
      equationMatch(r.equation, trimmed) ||
      (r.type ?? "").toLowerCase().includes(q)
  );
}

/** 判断搜索词是否像一个化合物/单质化学式 */
export function isChemicalFormula(query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return false;
  // 包含大写字母+可能的小写字母+可能的下标数字+可能的括号
  // 但不能是纯元素符号（单个大写或大写+小写）
  const formulaPattern = /^[A-Z][a-z]?[₀-₉0-9A-Za-z\(\)（）·]+$/;
  if (!formulaPattern.test(trimmed)) return false;
  // 排除纯元素符号（如 Fe、O₂、Cl₂）
  const elementPattern = /^[A-Z][a-z]?[₂₃₄]?$/;
  if (elementPattern.test(trimmed)) return false;
  return true;
}

/** 搜索包含某物质（作为反应物或产物）的所有反应 */
export function searchReactionsBySubstance(substance: string): ChemicalReaction[] {
  const trimmed = substance.trim();
  if (!trimmed) return [];
  
  const normalized = trimmed.replace(/[↑↓]/g, "").trim();
  
  return REACTIONS.filter((r) => {
    const leftParts = parseEquationLeft(r.equation).map(p => p.replace(/[↑↓]/g, "").trim());
    const rightParts = parseEquationRight(r.equation).map(p => p.replace(/[↑↓]/g, "").trim());
    const allParts = [...leftParts, ...rightParts];
    return allParts.some(p => p === normalized || p.includes(normalized));
  });
}

/** 支持的反应类型列表（用于 UI 快捷按钮） */
export const REACTION_TYPES: ReactionType[] = [
  "化合",
  "分解",
  "置换",
  "复分解",
  "氧化还原",
  "水解",
  "电解",
  "取代",
  "消去",
  "加聚",
  "缩聚",
  "其他",
];

/** 按物质名称搜索，返回该物质涉及的所有元素符号 */
export function getSymbolsFromReactions(reactions: { reactants: string[] }[]): string[] {
  const symbols = new Set<string>();
  reactions.forEach((r) => r.reactants.forEach((s) => symbols.add(s)));
  return Array.from(symbols);
}

export function parseCompound(formula: string): string[] {
  const symbols: string[] = [];
  let i = 0;
  const f = formula.replace(/[₀-₉]/g, "");
  while (i < f.length) {
    if (f[i] === "(") {
      let depth = 1;
      let j = i + 1;
      while (j < f.length && depth > 0) {
        if (f[j] === "(") depth++;
        if (f[j] === ")") depth--;
        j++;
      }
      while (j < f.length && /[0-9]/.test(f[j])) j++;
      i = j;
    } else if (/[A-Z]/.test(f[i])) {
      let j = i + 1;
      while (j < f.length && /[a-z]/.test(f[j])) j++;
      symbols.push(f.slice(i, j));
      i = j;
      while (j < f.length && /[0-9]/.test(f[j])) j++;
      i = j;
    } else {
      i++;
    }
  }
  return symbols;
}

export function parseEquationLeft(equation: string): string[] {
  const arrow = equation.includes("→") ? "→" : equation.includes("⇌") ? "⇌" : "=";
  const leftSide = equation.split(arrow)[0].trim();
  return leftSide
    .split("+")
    .map((p) =>
      p
        .trim()
        .replace(/^\d+/, "")
        .replace(/\(浓\)|\(稀\)|\(熔融\)/g, "")
        .replace(/[↑↓]/g, "")
        .trim()
    )
    .filter(Boolean);
}

export function parseEquationRight(equation: string): string[] {
  const arrow = equation.includes("→") ? "→" : equation.includes("⇌") ? "⇌" : "=";
  const rightSide = equation.split(arrow)[1].trim();
  return rightSide
    .split("+")
    .map((p) =>
      p
        .trim()
        .replace(/^\d+/, "")
        .replace(/\(浓\)|\(稀\)|\(熔融\)/g, "")
        .replace(/[↑↓]/g, "")
        .trim()
    )
    .filter(Boolean);
}

export const REACTIONS: ChemicalReaction[] = reactionsValidation.data;

/** 化合物名称映射表（从产物名称自动提取 + 补充常见反应物） */
export const COMPOUND_NAMES: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  REACTIONS.forEach((r) => {
    if (r.product && r.productName) {
      // 处理多产物情况，只取第一个产物
      const firstProduct = r.product.split("+")[0].trim();
      if (!map[firstProduct]) {
        map[firstProduct] = r.productName.split("、")[0].trim();
      }
    }
  });
  // 补充常见反应物名称
  const extras: Record<string, string> = {
    "O₂": "氧气",
    "H₂": "氢气",
    "N₂": "氮气",
    "Cl₂": "氯气",
    "Br₂": "溴",
    "I₂": "碘",
    "S": "硫",
    "C": "碳",
    "P": "磷",
    "Si": "硅",
    "Fe": "铁",
    "Cu": "铜",
    "Zn": "锌",
    "Al": "铝",
    "Mg": "镁",
    "Na": "钠",
    "K": "钾",
    "Ca": "钙",
    "Ba": "钡",
    "Ag": "银",
    "Hg": "汞",
    "Pb": "铅",
    "Sn": "锡",
    "Mn": "锰",
    "Cr": "铬",
    "W": "钨",
    "Mo": "钼",
    "CO": "一氧化碳",
    "CO₂": "二氧化碳",
    "SO₂": "二氧化硫",
    "SO₃": "三氧化硫",
    "NO": "一氧化氮",
    "NO₂": "二氧化氮",
    "H₂O": "水",
    "HCl": "氯化氢",
    "H₂SO₄": "硫酸",
    "HNO₃": "硝酸",
    "H₂S": "硫化氢",
    "NH₃": "氨",
    "CH₄": "甲烷",
    "NaOH": "氢氧化钠",
    "NaCl": "氯化钠",
    "Na₂CO₃": "碳酸钠",
    "NaHCO₃": "碳酸氢钠",
    "CaO": "氧化钙",
    "CaCO₃": "碳酸钙",
    "Ca(OH)₂": "氢氧化钙",
    "CaCl₂": "氯化钙",
    "Fe₂O₃": "氧化铁",
    "Fe₃O₄": "四氧化三铁",
    "CuO": "氧化铜",
    "Cu(OH)₂": "氢氧化铜",
    "CuSO₄": "硫酸铜",
    "BaSO₄": "硫酸钡",
    "BaCl₂": "氯化钡",
    "AgNO₃": "硝酸银",
    "KCl": "氯化钾",
    "KMnO₄": "高锰酸钾",
    "MnO₂": "二氧化锰",
    "Al₂O₃": "氧化铝",
    "MgO": "氧化镁",
    "ZnO": "氧化锌",
    "ZnCl₂": "氯化锌",
    "ZnSO₄": "硫酸锌",
    "FeCl₃": "氯化铁",
    "FeCl₂": "氯化亚铁",
    "FeSO₄": "硫酸亚铁",
    "Fe(NO₃)₃": "硝酸铁",
    "KI": "碘化钾",
    "KBr": "溴化钾",
    "NaI": "碘化钠",
    "NaBr": "溴化钠",
    "AgCl": "氯化银",
    "AgBr": "溴化银",
    "AgI": "碘化银",
    "Ag₂O": "氧化银",
    "HgO": "氧化汞",
    "PbO": "氧化铅",
    "PbO₂": "二氧化铅",
    "PbS": "硫化铅",
    "PbCl₂": "氯化铅",
    "SiO₂": "二氧化硅",
    "Na₂SiO₃": "硅酸钠",
    "Na₂SO₄": "硫酸钠",
    "Na₂SO₃": "亚硫酸钠",
    "NaNO₃": "硝酸钠",
    "KNO₃": "硝酸钾",
    "K₂SO₄": "硫酸钾",
    "K₂CO₃": "碳酸钾",
    "NH₄Cl": "氯化铵",
    "NH₄NO₃": "硝酸铵",
    "(NH₄)₂SO₄": "硫酸铵",
    "(NH₄)₂CO₃": "碳酸铵",
    "CaSO₄": "硫酸钙",
    "Ca(NO₃)₂": "硝酸钙",
    "BaCO₃": "碳酸钡",
    "Ba(OH)₂": "氢氧化钡",
    "Ba(NO₃)₂": "硝酸钡",
    "Fe(OH)₃": "氢氧化铁",
    "Al(OH)₃": "氢氧化铝",
    "Mg(OH)₂": "氢氧化镁",
    "Zn(OH)₂": "氢氧化锌",
    "Cu₂O": "氧化亚铜",
    "CuS": "硫化铜",
    "Cu₂S": "硫化亚铜",
    "FeS": "硫化亚铁",
    "ZnS": "硫化锌",
    "MgS": "硫化镁",
    "Na₂S": "硫化钠",
    "CaC₂": "碳化钙",
    "CS₂": "二硫化碳",
    "SiC": "碳化硅",
    "CH₃CHO": "乙醛",
    "CH₃COOH": "乙酸",
    "C₂H₅OH": "乙醇",
    "CH₃OH": "甲醇",
    "C₂H₆": "乙烷",
    "C₂H₄": "乙烯",
    "C₂H₂": "乙炔",
    "C₆H₆": "苯",
    "CH₃COONa": "乙酸钠",
    "CH₃COONH₄": "乙酸铵",
    "H₂SiO₃": "硅酸",
    "H₃PO₄": "磷酸",
    "Na₃PO₄": "磷酸钠",
    "Na₂HPO₄": "磷酸氢二钠",
    "NaH₂PO₄": "磷酸二氢钠",
    "Ca(H₂PO₄)₂": "磷酸二氢钙",
    "Na₂O": "氧化钠",
    "Na₂O₂": "过氧化钠",
    "K₂O": "氧化钾",
    "KO₂": "超氧化钾",
    "Li₂O": "氧化锂",
    "LiOH": "氢氧化锂",
    "Li₂CO₃": "碳酸锂",
    "LiCl": "氯化锂",
    "LiH": "氢化锂",
    "BaO": "氧化钡",
    "BaO₂": "过氧化钡",
    "NaAlO₂": "偏铝酸钠",
    "Na₂ZnO₂": "锌酸钠",
    "K₂MnO₄": "锰酸钾",
    "Cr₂O₃": "三氧化二铬",
    "CrCl₂": "氯化亚铬",
    "WO₃": "三氧化钨",
    "MoO₃": "三氧化钼",
    "HgS": "硫化汞",
    "BeCl₂": "氯化铍",
    "SiF₄": "四氟化硅",
    "CF₄": "四氟化碳",
    "CCl₄": "四氯化碳",
    "SiCl₄": "四氯化硅",
    "SnO₂": "二氧化锡",
    "SnCl₄": "四氯化锡",
    "Mn₃O₄": "四氧化三锰",
    "P₂O₃": "三氧化二磷",
    "P₂O₅": "五氧化二磷",
    "N₂O": "一氧化二氮",
    "N₂O₅": "五氧化二氮",
    "PH₃": "磷化氢",
    "AsH₃": "砷化氢",
    "PF₃": "三氟化磷",
    "HIO₃": "碘酸",
    "H₃AsO₄": "砷酸",
    "Cu₃P": "磷化亚铜",
    "OF₂": "二氟化氧",
    "C₆H₅Br": "溴苯",
    "C₆H₅NO₂": "硝基苯",
    "C₆H₅NH₂": "苯胺",
    "C₆H₃Br₃OH": "三溴苯酚",
    "CuSO₄·5H₂O": "五水硫酸铜",
    "Ca₃P₂": "磷化钙",
    "NaNH₂": "氨基钠",
    "NaPO₃": "偏磷酸钠",
    "Ag₂CO₃": "碳酸银",
    "Ag₂S": "硫化银",
    "MgBr₂": "溴化镁",
    "Al(NO₃)₃": "硝酸铝",
    "FeBr₃": "溴化铁",
    "Na₂FeO₄": "高铁酸钠",
    "Fe(SCN)₃": "硫氰化铁",
    "Fe(OH)₂": "氢氧化亚铁",
    "Fe₂(SO₄)₃": "硫酸铁",
    "Cr₂(SO₄)₃": "硫酸铬",
    "MnSO₄": "硫酸锰",
    "K₂SO₃": "亚硫酸钾",
    "NaHSO₃": "亚硫酸氢钠",
    "CaSO₃": "亚硫酸钙",
    "Ca(HCO₃)₂": "碳酸氢钙",
    "Ba(HCO₃)₂": "碳酸氢钡",
    "NH₃·H₂O": "一水合氨",
    "H₂SO₃": "亚硫酸",
    "HBr": "溴化氢",
    "HI": "碘化氢",
    "HClO": "次氯酸",
    "HBrO": "次溴酸",
    "NaClO": "次氯酸钠",
    "Ca(ClO)₂": "次氯酸钙",
    "NaClO₃": "氯酸钠",
    "CH₃Cl": "一氯甲烷",
    "CH₃CH₂Cl": "氯乙烷",
    "C₂H₅Cl": "氯乙烷",
    "CH₂Cl₂": "二氯甲烷",
    "CHCl₃": "三氯甲烷",
    "CH₃CHO + H₂O": "乙醛和水",
    "CH₃COOH + Cu₂O": "乙酸和氧化亚铜",
    "CH₃COONa + C₂H₅OH": "乙酸钠和乙醇",
    "CH₃COONa + CO₂ + H₂O": "乙酸钠、二氧化碳和水",
    "C₂H₅OH + CO₂": "乙醇和二氧化碳",
    "C₂H₄ + H₂": "乙烯和氢气",
    "C₂H₂Br₂": "二溴乙烯",
    "C₂H₂Br₄": "四溴乙烷",
    "C₂H₃Cl": "氯乙烯",
    "CH₂BrCH₂Br": "二溴乙烷",
    "H₂ + Cl₂": "氢气和氯气",
    "CO + O₂": "一氧化碳和氧气",
    "N₂ + H₂": "氮气和氢气",
    "N₂ + O₂": "氮气和氧气",
    "SO₂ + O₂": "二氧化硫和氧气",
    "CO₂ + SO₂": "二氧化碳和二氧化硫",
    "CH₄ + CO₂": "甲烷和二氧化碳",
    "H₂ + CO": "氢气和一氧化碳",
    "CS₂ + H₂S": "二硫化碳和硫化氢",
    "C + CO₂": "碳和二氧化碳",
    "H₂S + H₂O": "硫化氢和水",
    "OF₂ + HF": "二氟化氧和氟化氢",
    "O₂ + HF": "氧气和氟化氢",
    "N₂ + H₂O": "氮气和水",
    "NO₂ + H₂O": "二氧化氮和水",
    "Al + O₂": "铝和氧气",
    "Mg + Cl₂": "镁和氯气",
    "Fe + CO₂": "铁和二氧化碳",
    "Zn + CO₂": "锌和二氧化碳",
    "Cu + H₂O": "铜和水",
    "Fe + H₂O": "铁和水",
    "ZnCl₂ + Fe": "氯化锌和铁",
    "CuSO₄ + Hg": "硫酸铜和汞",
    "MgSO₄ + Zn": "硫酸镁和锌",
    "FeSO₄ + Cu": "硫酸亚铁和铜",
    "ZnSO₄ + Cu": "硫酸锌和铜",
    "ZnCl₂ + H₂": "氯化锌和氢气",
    "FeCl₂ + H₂": "氯化亚铁和氢气",
    "MgCl₂ + H₂": "氯化镁和氢气",
    "AlCl₃ + H₂": "氯化铝和氢气",
    "Cu(NO₃)₂ + Ag": "硝酸铜和银",
    "NaCl + Br₂": "氯化钠和溴",
    "KCl + I₂": "氯化钾和碘",
    "ZnSO₄ + H₂": "硫酸锌和氢气",
    "CO₂ + Cu": "二氧化碳和铜",
    "CuSO₄ + SO₂ + H₂O": "硫酸铜、二氧化硫和水",
    "Cu(NO₃)₂ + NO₂ + H₂O": "硝酸铜、二氧化氮和水",
    "CO₂ + NO + H₂O": "二氧化碳、一氧化氮和水",
    "MnCl₂ + Cl₂ + H₂O": "氯化锰、氯气和水",
    "NaCl + H₂O": "氯化钠和水",
    "Na₂SO₄ + H₂O": "硫酸钠和水",
    "BaSO₄ + NaCl": "硫酸钡和氯化钠",
    "NaCl + H₂O + CO₂": "氯化钠、水和二氧化碳",
    "CaCl₂ + H₂O + CO₂": "氯化钙、水和二氧化碳",
    "Cu(OH)₂ + Na₂SO₄": "氢氧化铜和硫酸钠",
    "KNO₃ + H₂O": "硝酸钾和水",
    "NaNO₃ + H₂O": "硝酸钠和水",
    "CaCl₂ + H₂O": "氯化钙和水",
    "CaSO₄ + H₂O": "硫酸钙和水",
    "BaSO₄ + CuCl₂": "硫酸钡和氯化铜",
    "CaCO₃ + NaCl": "碳酸钙和氯化钠",
    "BaCO₃ + NaCl": "碳酸钡和氯化钠",
    "Mg(OH)₂ + NaCl": "氢氧化镁和氯化钠",
    "CuCO₃ + Na₂SO₄": "碳酸铜和硫酸钠",
    "NaCl + NH₃ + H₂O": "氯化钠、氨气和水",
    "NaNO₃ + NH₃ + H₂O": "硝酸钠、氨气和水",
    "Na₂SO₄ + H₂O + CO₂": "硫酸钠、水和二氧化碳",
    "KCl + H₂O": "氯化钾和水",
    "Cu + CO₂": "铜和二氧化碳",
    "Fe(NO₃)₃ + NO + H₂O": "硝酸铁、一氧化氮和水",
    "Fe(NO₃)₂ + NH₄NO₃ + H₂O": "硝酸亚铁、硝酸铵和水",
    "NaNO₃ + NaNO₂ + H₂O": "硝酸钠、亚硝酸钠和水",
    "FeCl₂ + KCl + I₂": "氯化亚铁、氯化钾和碘",
    "FeCl₂ + S + HCl": "氯化亚铁、硫和盐酸",
    "Fe(SCN)₃ + KCl": "硫氰化铁和氯化钾",
    "Fe₂(SO₄)₃ + H₂O": "硫酸铁和水",
    "Fe₂(SO₄)₃ + MnSO₄ + K₂SO₄ + H₂O": "硫酸铁、硫酸锰、硫酸钾和水",
    "Fe(OH)₂ + Na₂SO₄": "氢氧化亚铁和硫酸钠",
    "CuCl₂ + H₂O": "氯化铜和水",
    "CuSO₄ + H₂O": "硫酸铜和水",
    "Cu(OH)₂ + NaCl": "氢氧化铜和氯化钠",
    "FeCl₂ + Cu": "氯化亚铁和铜",
    "PbCl₂ + H₂O": "氯化铅和水",
    "Pb + H₂O": "铅和水",
    "PbO + SO₂": "氧化铅和二氧化硫",
    "Pb + CO": "铅和一氧化碳",
    "Pb + CO₂": "铅和二氧化碳",
    "PbS + NaNO₃": "硫化铅和硝酸钠",
    "C₂H₄Br₂": "二溴乙烷",
    "HCl + HClO": "盐酸和次氯酸",
    "NaCl + NaClO + H₂O": "氯化钠、次氯酸钠和水",
    "CaCl₂ + Ca(ClO)₂ + H₂O": "氯化钙、次氯酸钙和水",
    "HCl + O₂": "盐酸和氧气",
    "NaOH + H₂ + Cl₂": "氢氧化钠、氢气和氯气",
    "Na₂SO₃ + H₂O": "亚硫酸钠和水",
    "CaSO₃ + H₂O": "亚硫酸钙和水",
    "H₂SO₄ + HCl": "硫酸和盐酸",
    "CO₂ + SO₂ + H₂O": "二氧化碳、二氧化硫和水",
    "NO + H₂O": "一氧化氮和水",
    "HNO₃ + NO": "硝酸和一氧化氮",
    "NH₃ + CaCl₂ + H₂O": "氨气、氯化钙和水",
    "Na₂SiO₃ + H₂": "硅酸钠和氢气",
    "Na₂SiO₃ + H₂O": "硅酸钠和水",
    "H₂SiO₃ + Na₂CO₃": "硅酸和碳酸钠",
    "SiO₂ + H₂O": "二氧化硅和水",
    "MgO + C": "氧化镁和碳",
    "Mg(OH)₂ + NH₃": "氢氧化镁和氨气",
    "Mg(OH)₂ + H₂": "氢氧化镁和氢气",
    "CaCO₃ + NaOH": "碳酸钙和氢氧化钠",
    "BaS + CO": "硫化钡和一氧化碳",
    "BaCO₃ + Na₂SO₄": "碳酸钡和硫酸钠",
    "Mn + CO": "锰和一氧化碳",
    "MnSO₄ + K₂SO₄ + O₂ + H₂O": "硫酸锰、硫酸钾、氧气和水",
    "HCl + O₂ + H₂O": "盐酸、氧气和水",
    "KCl + CrCl₃ + Cl₂ + H₂O": "氯化钾、氯化铬、氯气和水",
    "K₂SO₄ + Cr₂(SO₄)₃ + Fe₂(SO₄)₃ + H₂O": "硫酸钾、硫酸铬、硫酸铁和水",
    "Cr + Al₂O₃": "铬和氧化铝",
    "Cr + H₂O": "铬和水",
    "CrCl₂ + H₂": "氯化亚铬和氢气",
    "W + H₂O": "钨和水",
    "Mo + H₂O": "钼和水",
    "Ag + H₂O": "银和水",
    "NH₃ + H₂O": "氨气和水",
    "N₂O + H₂O": "一氧化二氮和水",
    "N₂ + O₂ + H₂O": "氮气、氧气和水",
    "CaSO₄ + NH₃ + H₂O": "硫酸钙、氨气和水",
    "Ca(OH)₂ + PH₃": "氢氧化钙和磷化氢",
    "Na₂HPO₄ + H₂O": "磷酸氢二钠和水",
    "Na₃PO₄ + H₂O": "磷酸钠和水",
    "Ca(H₂PO₄)₂ + CaSO₄": "磷酸二氢钙和硫酸钙",
    "NO + O₂": "一氧化氮和氧气",
    "P + Cl₂": "磷和氯气",
    "PCl₃ + Cl₂": "三氯化磷和氯气",
    "Ag + O₂": "银和氧气",
    "Hg + O₂": "汞和氧气",
    "ZnO + H₂": "氧化锌和氢气",
    "ZnCl₂ + H₂O": "氯化锌和水",
    "ZnO + H₂O": "氧化锌和水",
    "PbO + O₂": "氧化铅和氧气",
    "Fe₃O₄ + H₂": "四氧化三铁和氢气",
    "FeCl₃ + H₂O": "氯化铁和水",
    "FeCl₂ + H₂O": "氯化亚铁和水",
    "FeCl₂ + FeCl₃ + H₂O": "氯化亚铁、氯化铁和水",
    "Cu(NO₃)₂ + NO + H₂O": "硝酸铜、一氧化氮和水",
    "Na₂O + CO₂": "氧化锂和二氧化碳",
    "Li₂O + CO₂": "氧化锂和二氧化碳",
    "Na₂CO₃ + H₂O": "碳酸钠和水",
    "NaAlO₂ + H₂": "偏铝酸钠和氢气",
    "NaAlO₂ + H₂O": "偏铝酸钠和水",
    "AlCl₃ + H₂O": "氯化铝和水",
    "Al₂O₃ + Fe": "氧化铝和铁",
    "Al₂O₃ + Mn": "氧化铝和锰",
    "Al(OH)₃ + NH₄Cl": "氢氧化铝和氯化铵",
    "Al(OH)₃ + NaCl": "氢氧化铝和氯化钠",
    "Al(OH)₃ + NaHCO₃": "氢氧化铝和碳酸氢钠",
    "Al(OH)₃ + (NH₄)₂SO₄": "氢氧化铝和硫酸铵",
    "Cu(NO₃)₂ + Hg": "硝酸铜和汞",
    "CO₂ + NO₂ + H₂O": "二氧化碳、二氧化氮和水",
    "Fe(NO₃)₃ + NO₂ + H₂O": "硝酸铁、二氧化氮和水",
    "FeCl₂ + H₂S": "氯化亚铁和硫化氢",
    "Na₂SO₄ + S + H₂O": "硫酸钠、硫和水",
    "CO + H₂": "一氧化碳和氢气",
    "Si + HCl": "硅和氯化氢",
    "NaCl + NaClO₃ + H₂O": "氯化钠、氯酸钠和水",
    "HCl + S": "氯化氢和硫",
    "NaCl + I₂": "氯化钠和碘",
    "KCl + Cl₂ + H₂O": "氯化钾、氯气和水",
    "Na₂SO₄ + SO₂ + H₂O": "硫酸钠、二氧化硫和水",
    "FeSO₄ + H₂S": "硫酸亚铁和硫化氢",
    "CuS + H₂SO₄": "硫化铜和硫酸",
    "PbS + 2HNO₃": "硫化铅和硝酸",
    "H₂SiO₃ + NaCl": "硅酸和氯化钠",
    "SiF₄ + H₂O": "四氟化硅和水",
    "CaSiO₃ + CO₂": "硅酸钙和二氧化碳",
    "Na₂SiO₃ + CO₂": "硅酸钠和二氧化碳",
    "AgNO₃ + NO₂ + H₂O": "硝酸银、二氧化氮和水",
    "AgNO₃ + NO + H₂O": "硝酸银、一氧化氮和水",
    "Zn(NO₃)₂ + NO₂ + H₂O": "硝酸锌、二氧化氮和水",
    "Zn(NO₃)₂ + N₂O + H₂O": "硝酸锌、一氧化二氮和水",
    "AgBr + HNO₃": "溴化银和硝酸",
    "AgI + HNO₃": "碘化银和硝酸",
    "CH₃Cl + HCl": "一氯甲烷和氯化氢",
    "C₂H₅Cl + HCl": "氯乙烷和氯化氢",
    "CH₂Cl₂ + HCl": "二氯甲烷和氯化氢",
    "CHCl₃ + HCl": "三氯甲烷和氯化氢",
    "CCl₄ + HCl": "四氯化碳和氯化氢",
    "CH₃CHO + Cu + H₂O": "乙醛、铜和水",
    "CH₃COONH₄ + 2Ag↓ + 3NH₃↑ + H₂O": "乙酸铵、银和氨",
    "C₆H₅Br + HBr": "溴苯和溴化氢",
    "C₆H₅NO₂ + H₂O": "硝基苯和水",
    "C₆H₅NH₂ + Fe₃O₄ + H₂O": "苯胺、四氧化三铁和水",
    "C₆H₃Br₃OH + HBr": "三溴苯酚和溴化氢",
    "(NH₄)₂CO₃ + Ag + NH₃": "碳酸铵、银和氨",
    "H₂ + O₂": "氢气和氧气",
    "CaO + CO₂": "氧化钙和二氧化碳",
    "H₂O + O₂": "水和氧气",
    "KCl + O₂": "氯化钾和氧气",
    "K₂MnO₄ + MnO₂ + O₂": "锰酸钾、二氧化锰和氧气",
    "CuO + H₂O": "氧化铜和水",
    "NH₃ + H₂O + CO₂": "氨气、水和二氧化碳",
    "Fe₂O₃ + H₂O": "氧化铁和水",
    "Al₂O₃ + H₂O": "氧化铝和水",
    "MgO + H₂O": "氧化镁和水",
    "Na₂CO₃ + H₂O + CO₂": "碳酸钠、水和二氧化碳",
    "MgO + CO₂": "氧化镁和二氧化碳",
    "NH₃ + HCl": "氨气和氯化氢",
    "NO₂ + O₂ + H₂O": "二氧化氮、氧气和水",
    "NaCl + H₂": "氯化钠和氢气",
    "Na₂CO₃ + O₂": "碳酸钠和氧气",
    "NaOH + O₂": "氢氧化钠和氧气",
    "2NaNO₂ + H₂O": "亚硝酸钠和水",
    "H₂CO₃": "碳酸",
    "BaS": "硫化钡",
    "FeO": "氧化亚铁",
    "KOH": "氢氧化钾",
    "MgCl₂": "氯化镁",
    "CuCl₂": "氯化铜",
    "AlCl₃": "氯化铝",
    "KHCO₃": "碳酸氢钾",
    "MgCO₃": "碳酸镁",
    "MgSO₄": "硫酸镁",
    "Al₂(SO₄)₃": "硫酸铝",
    "Cu(NO₃)₂": "硝酸铜",
    "Zn(NO₃)₂": "硝酸锌",
    "PCl₃": "三氯化磷",
    "PCl₅": "五氯化磷",
    "HF": "氟化氢"
  };
  return { ...map, ...extras };
})();

export const chemicalAliasMap: Record<string, string> = {
  // --- 氧化物与碱 ---
  "生石灰": "氧化钙",
  "CaO": "氧化钙",
  "熟石灰": "氢氧化钙",
  "消石灰": "氢氧化钙",
  "Ca(OH)2": "氢氧化钙",
  "烧碱": "氢氧化钠",
  "火碱": "氢氧化钠",
  "苛性钠": "氢氧化钠",
  "NaOH": "氢氧化钠",
  "干冰": "二氧化碳",
  "CO2": "二氧化碳",
  "石英": "二氧化硅",
  "硅石": "二氧化硅",
  "SiO2": "二氧化硅",
  "砒霜": "三氧化二砷",
  "As2O3": "三氧化二砷",
  "赤铁矿": "氧化铁",
  "Fe2O3": "氧化铁",
  "磁铁矿": "四氧化三铁",
  "Fe3O4": "四氧化三铁",

  // --- 盐类 ---
  "纯碱": "碳酸钠",
  "苏打": "碳酸钠",
  "Na2CO3": "碳酸钠",
  "小苏打": "碳酸氢钠",
  "NaHCO3": "碳酸氢钠",
  "食盐": "氯化钠",
  "NaCl": "氯化钠",
  "胆矾": "硫酸铜",
  "蓝矾": "硫酸铜",
  "CuSO4": "硫酸铜",
  "石膏": "硫酸钙",
  "CaSO4": "硫酸钙",
  "明矾": "硫酸铝钾",
  "绿矾": "硫酸亚铁",
  "FeSO4": "硫酸亚铁",
  "芒硝": "硫酸钠",
  "Na2SO4": "硫酸钠",
  "大苏打": "硫代硫酸钠",
  "海波": "硫代硫酸钠",
  "Na2S2O3": "硫代硫酸钠",
  "石灰石": "碳酸钙",
  "大理石": "碳酸钙",
  "CaCO3": "碳酸钙",
  "草木灰": "碳酸钾",
  "钾碱": "碳酸钾",
  "K2CO3": "碳酸钾",
  "水玻璃": "硅酸钠",
  "Na2SiO3": "硅酸钠",
  "泻盐": "硫酸镁",
  "MgSO4": "硫酸镁",

  // --- 酸类 ---
  "盐酸": "盐酸",
  "HCl": "盐酸",
  "硫酸": "硫酸",
  "H2SO4": "硫酸",
  "醋酸": "乙酸",
  "冰醋酸": "乙酸",
  "CH3COOH": "乙酸",
  "蚁酸": "甲酸",
  "HCOOH": "甲酸",
  "草酸": "乙二酸",
  "H2C2O4": "乙二酸",

  // --- 有机物 ---
  "酒精": "乙醇",
  "C2H5OH": "乙醇",
  "沼气": "甲烷",
  "CH4": "甲烷",
  "双氧水": "过氧化氢",
  "H2O2": "过氧化氢",
  "电石": "碳化钙",
  "CaC2": "碳化钙",
  "电石气": "乙炔",
  "C2H2": "乙炔",
  "甘油": "丙三醇",
  "C3H8O3": "丙三醇",
  "氯仿": "三氯甲烷",
  "CHCl3": "三氯甲烷",
  "福尔马林": "甲醛",
  "HCHO": "甲醛",

  // --- 气体 ---
  "笑气": "一氧化二氮",
  "N2O": "一氧化二氮",
  "光气": "碳酰氯",
  "COCl2": "碳酰氯",
};

export function resolveChemicalAlias(query: string): string {
  return chemicalAliasMap[query.trim()] || query.trim();
}
