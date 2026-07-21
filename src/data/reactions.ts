import { z } from "zod";
import reactionsData from "./reactions.json";

export type ReactionType = "化合" | "分解" | "置换" | "复分解" | "氧化还原" | "其他";

const ReactionTypeEnum = z.enum(["化合", "分解", "置换", "复分解", "氧化还原", "其他"]);

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
    .replace(/[\[\]]/g, "")
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

/** 支持的反应类型列表（用于 UI 快捷按钮） */
export const REACTION_TYPES: ReactionType[] = ["化合", "分解", "置换", "复分解", "氧化还原", "其他"];

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
