/**
 * 分子 3D 结构解析与配色
 * 把化学式（如 H₂O、CO₂、Fe₂O₃）转成球棍模型所需的原子与化学键数据。
 * 常见分子使用真实几何构型，未知分子用通用球面分布兜底。
 */

export interface Atom3D {
  element: string;
  position: [number, number, number];
  radius: number;
  color: string;
}

export interface Bond3D {
  from: number;
  to: number;
  order: number;
}

export interface Molecule3D {
  formula: string;
  atoms: Atom3D[];
  bonds: Bond3D[];
}

const SUBSCRIPT: Record<string, string> = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
  "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
};

/** 标准 CPK 配色（暗色背景下略微提亮，保证可读） */
const CPK: Record<string, string> = {
  H: "#F5F7FA", He: "#D7F6F2",
  Li: "#B57BE8", Be: "#9BE86B", B: "#F5B8A8", C: "#5A6472", N: "#4B79F5", O: "#FF4B4B", F: "#5BE36B", Ne: "#7DE8E0",
  Na: "#A259E0", Mg: "#8FE36B", Al: "#C9B6B6", Si: "#EBC9A0", P: "#FF9A3C", S: "#F2E74B", Cl: "#3ED96A", Ar: "#8FD9E8",
  K: "#9B5BE0", Ca: "#5FE08A", Sc: "#E0E0E0", Ti: "#BFC2C7", V: "#A0A8B8", Cr: "#A8B0BC", Mn: "#B39BC8", Fe: "#E07B3C", Co: "#7C8FE0", Ni: "#8FC7B0", Cu: "#D98A4B", Zn: "#9AA6D8",
  Br: "#A04A2A", Ag: "#D6D6DC", I: "#8A4FD0", Ba: "#4FD98A",
};

const FALLBACK_COLORS = [
  "#7DD3FC", "#C084FC", "#F472B6", "#FBBF24", "#34D399", "#60A5FA", "#FB7185",
];

const ATOMIC_NUMBER: Record<string, number> = {
  H: 1, He: 2, Li: 3, Be: 4, B: 5, C: 6, N: 7, O: 8, F: 9, Ne: 10,
  Na: 11, Mg: 12, Al: 13, Si: 14, P: 15, S: 16, Cl: 17, Ar: 18,
  K: 19, Ca: 20, Fe: 26, Cu: 29, Zn: 30, Br: 35, Ag: 47, I: 53, Ba: 56,
};

const ATOM_RADIUS: Record<string, number> = {
  H: 0.26, C: 0.38, N: 0.36, O: 0.35, F: 0.32, S: 0.44, Cl: 0.44,
  P: 0.44, Na: 0.5, K: 0.55, Ca: 0.5, Mg: 0.46, Fe: 0.48, Cu: 0.46,
  Zn: 0.46, Br: 0.48, I: 0.54, Al: 0.48, Si: 0.46,
};

function getColor(element: string, index: number): string {
  return CPK[element] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function getRadius(element: string): number {
  return ATOM_RADIUS[element] || 0.46;
}

function normalizeFormula(formula: string): string {
  return formula
    .replace(/[₀-₉]/g, (c) => SUBSCRIPT[c] ?? c)
    .replace(/\(浓\)|\(稀\)|\(熔融\)|\(s\)|\(l\)|\(g\)|\(aq\)/g, "")
    .replace(/[↑↓?·]/g, "")
    .trim();
}

/** 解析化学式为元素计数，支持括号与括号外系数，如 Ca(OH)₂ -> Ca1 O2 H2 */
export function parseFormulaCounts(formula: string): Record<string, number> {
  const clean = normalizeFormula(formula);
  const stack: Record<string, number>[] = [{}];
  let i = 0;
  while (i < clean.length) {
    const ch = clean[i];
    if (ch === "(" || ch === "[") {
      stack.push({});
      i++;
      continue;
    }
    if (ch === ")" || ch === "]") {
      i++;
      let digits = "";
      while (i < clean.length && /\d/.test(clean[i])) digits += clean[i++];
      const factor = digits ? parseInt(digits, 10) : 1;
      const top = stack.pop();
      if (top && stack.length > 0) {
        const parent = stack[stack.length - 1];
        for (const [el, count] of Object.entries(top)) {
          parent[el] = (parent[el] || 0) + count * factor;
        }
      }
      continue;
    }
    if (/[A-Z]/.test(ch)) {
      let symbol = ch;
      i++;
      while (i < clean.length && /[a-z]/.test(clean[i])) symbol += clean[i++];
      let digits = "";
      while (i < clean.length && /\d/.test(clean[i])) digits += clean[i++];
      const count = digits ? parseInt(digits, 10) : 1;
      const current = stack[stack.length - 1];
      current[symbol] = (current[symbol] || 0) + count;
      continue;
    }
    i++;
  }
  return stack[0] || {};
}

interface Template {
  atoms: [string, [number, number, number]][];
  bonds: [number, number, number][];
}

/** 常见分子的球棍几何构型（坐标为相对单位，键级 1/2/3） */
const TEMPLATES: Record<string, Template> = {
  H2: { atoms: [["H", [-0.42, 0, 0]], ["H", [0.42, 0, 0]]], bonds: [[0, 1, 1]] },
  O2: { atoms: [["O", [-0.6, 0, 0]], ["O", [0.6, 0, 0]]], bonds: [[0, 1, 2]] },
  N2: { atoms: [["N", [-0.58, 0, 0]], ["N", [0.58, 0, 0]]], bonds: [[0, 1, 3]] },
  Cl2: { atoms: [["Cl", [-0.9, 0, 0]], ["Cl", [0.9, 0, 0]]], bonds: [[0, 1, 1]] },
  F2: { atoms: [["F", [-0.7, 0, 0]], ["F", [0.7, 0, 0]]], bonds: [[0, 1, 1]] },
  H2O: {
    atoms: [["O", [0, 0.08, 0]], ["H", [0.76, -0.56, 0]], ["H", [-0.76, -0.56, 0]]],
    bonds: [[0, 1, 1], [0, 2, 1]],
  },
  CO2: {
    atoms: [["C", [0, 0, 0]], ["O", [-1.15, 0, 0]], ["O", [1.15, 0, 0]]],
    bonds: [[0, 1, 2], [0, 2, 2]],
  },
  CO: { atoms: [["C", [-0.6, 0, 0]], ["O", [0.6, 0, 0]]], bonds: [[0, 1, 3]] },
  HCl: { atoms: [["H", [-0.7, 0, 0]], ["Cl", [0.7, 0, 0]]], bonds: [[0, 1, 1]] },
  HF: { atoms: [["H", [-0.6, 0, 0]], ["F", [0.6, 0, 0]]], bonds: [[0, 1, 1]] },
  NH3: {
    atoms: [
      ["N", [0, 0.32, 0]],
      ["H", [0.94, -0.28, 0]],
      ["H", [-0.47, -0.28, 0.82]],
      ["H", [-0.47, -0.28, -0.82]],
    ],
    bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]],
  },
  CH4: {
    atoms: [
      ["C", [0, 0, 0]],
      ["H", [0.63, 0.63, 0.63]],
      ["H", [-0.63, -0.63, 0.63]],
      ["H", [-0.63, 0.63, -0.63]],
      ["H", [0.63, -0.63, -0.63]],
    ],
    bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]],
  },
  SO2: {
    atoms: [["S", [0, 0.12, 0]], ["O", [1.1, -0.4, 0]], ["O", [-1.1, -0.4, 0]]],
    bonds: [[0, 1, 2], [0, 2, 2]],
  },
  H2SO4: {
    atoms: [
      ["S", [0, 0, 0]],
      ["O", [0, 0.95, 0]], ["O", [0, -0.95, 0]],
      ["O", [1.0, 0.15, 0]], ["O", [-1.0, 0.15, 0]],
      ["H", [1.7, 0.55, 0]], ["H", [-1.7, 0.55, 0]],
    ],
    bonds: [[0, 1, 2], [0, 2, 2], [0, 3, 1], [0, 4, 1], [3, 5, 1], [4, 6, 1]],
  },
  NaOH: {
    atoms: [["Na", [-1.1, 0, 0]], ["O", [0.2, 0.1, 0]], ["H", [1.1, 0.1, 0]]],
    bonds: [[0, 1, 1], [1, 2, 1]],
  },
};

/** 通用球面分布：中心放最重的原子，其余均匀散布并连键 */
function buildGeneric(counts: Record<string, number>): Template {
  const elements = Object.keys(counts);
  if (elements.length === 0) {
    return { atoms: [["?", [0, 0, 0]]], bonds: [] };
  }
  const center = [...elements].sort(
    (a, b) => (ATOMIC_NUMBER[b] || 0) - (ATOMIC_NUMBER[a] || 0)
  )[0];

  // 最重的原子放中心，其余（含同种元素的其他副本）均匀散布到球面
  const outer: string[] = [];
  for (const el of elements) {
    const count = el === center ? Math.max(0, counts[el] - 1) : counts[el];
    for (let k = 0; k < count; k++) outer.push(el);
  }

  const atoms: [string, [number, number, number]][] = [[center, [0, 0, 0]]];
  const bonds: [number, number, number][] = [];
  const total = outer.length;
  const radius = total <= 2 ? 0.85 : total <= 4 ? 1.05 : total <= 6 ? 1.25 : 1.45;
  const golden = Math.PI * (3 - Math.sqrt(5));

  outer.forEach((el, idx) => {
    const y = total === 1 ? 0 : 1 - (idx / (total - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * idx;
    atoms.push([
      el,
      [Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius],
    ]);
    bonds.push([0, atoms.length - 1, 1]);
  });

  if (atoms.length === 1) {
    atoms.push([center, [0.9, 0, 0]]);
    bonds.push([0, 1, 1]);
  }
  return { atoms, bonds };
}

/** 把一个分子的化学式转成球棍模型数据 */
export function buildMolecule(formula: string): Molecule3D {
  const clean = normalizeFormula(formula);
  const template = TEMPLATES[clean];
  const source = template || buildGeneric(parseFormulaCounts(clean));

  return {
    formula: clean,
    atoms: source.atoms.map(([element, position], index) => ({
      element,
      position,
      radius: getRadius(element),
      color: getColor(element, index),
    })),
    bonds: source.bonds.map(([from, to, order]) => ({ from, to, order })),
  };
}

/** 解析方程式左右两侧，返回每个分子的结构与配平系数 */
export function parseEquationFor3D(equation: string): {
  arrow: string;
  reactants: { formula: string; coefficient: number; molecule: Molecule3D }[];
  products: { formula: string; coefficient: number; molecule: Molecule3D }[];
} {
  const arrow = equation.includes("⇌") ? "⇌" : equation.includes("→") ? "→" : "=";
  const [left = "", right = ""] = equation.split(arrow);

  const parseSide = (side: string) =>
    side
      .split("+")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const cleaned = part
          .replace(/\(浓\)|\(稀\)|\(熔融\)/g, "")
          .replace(/[↑↓]/g, "")
          .trim();
        const match = cleaned.match(/^(\d+)\s*(.+)$/);
        const coefficient = match ? parseInt(match[1], 10) : 1;
        const formula = match ? match[2].trim() : cleaned;
        return { formula, coefficient, molecule: buildMolecule(formula) };
      });

  return { arrow, reactants: parseSide(left), products: parseSide(right) };
}
