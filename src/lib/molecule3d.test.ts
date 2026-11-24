import { describe, it, expect } from "vitest";
import { parseFormulaCounts, buildMolecule, parseEquationFor3D } from "./molecule3d";

describe("parseFormulaCounts", () => {
  it("解析下标数字", () => {
    expect(parseFormulaCounts("H₂O")).toEqual({ H: 2, O: 1 });
    expect(parseFormulaCounts("CO₂")).toEqual({ C: 1, O: 2 });
    expect(parseFormulaCounts("Fe₂O₃")).toEqual({ Fe: 2, O: 3 });
  });

  it("解析括号与括号外系数", () => {
    expect(parseFormulaCounts("Ca(OH)₂")).toEqual({ Ca: 1, O: 2, H: 2 });
    expect(parseFormulaCounts("Al₂(SO₄)₃")).toEqual({ Al: 2, S: 3, O: 12 });
  });

  it("忽略浓度与状态符号", () => {
    expect(parseFormulaCounts("H₂SO₄(浓)")).toEqual({ H: 2, S: 1, O: 4 });
  });
});

describe("buildMolecule", () => {
  it("常见分子使用真实构型", () => {
    const water = buildMolecule("H₂O");
    expect(water.atoms).toHaveLength(3);
    expect(water.bonds).toHaveLength(2);
    expect(water.atoms[0].element).toBe("O");

    const co2 = buildMolecule("CO₂");
    expect(co2.atoms).toHaveLength(3);
    expect(co2.bonds[0].order).toBe(2);
  });

  it("未知分子用通用算法兜底", () => {
    const fe2o3 = buildMolecule("Fe₂O₃");
    expect(fe2o3.atoms).toHaveLength(5);
    expect(fe2o3.atoms[0].element).toBe("Fe");
    expect(fe2o3.bonds).toHaveLength(4);
  });

  it("原子带有 CPK 配色", () => {
    const water = buildMolecule("H₂O");
    expect(water.atoms[0].color).toBe("#FF4B4B");
  });
});

describe("parseEquationFor3D", () => {
  it("解析配平系数与左右两侧", () => {
    const result = parseEquationFor3D("2H₂ + O₂ → 2H₂O");
    expect(result.arrow).toBe("→");
    expect(result.reactants).toHaveLength(2);
    expect(result.reactants[0].coefficient).toBe(2);
    expect(result.products[0].coefficient).toBe(2);
    expect(result.products[0].molecule.atoms).toHaveLength(3);
  });

  it("支持可逆箭头与沉淀气体符号", () => {
    const result = parseEquationFor3D("Ca(OH)₂ + CO₂ ⇌ CaCO₃↓ + H₂O");
    expect(result.arrow).toBe("⇌");
    expect(result.products[0].molecule.formula).toBe("CaCO3");
  });
});
