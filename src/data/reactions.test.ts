import { describe, it, expect } from "vitest";
import {
  findReactiveSymbols,
  findCompoundReactiveSymbols,
  findReactions,
  searchReactions,
  getSymbolsFromReactions,
} from "@/data/reactions";

describe("findReactiveSymbols", () => {
  it("should return empty array when no elements selected", () => {
    expect(findReactiveSymbols([])).toEqual([]);
  });

  it("should find elements that can react with hydrogen", () => {
    const result = findReactiveSymbols(["H"]);
    expect(result).toContain("O");
    expect(result).toContain("Cl");
    expect(result).toContain("N");
    expect(result).toContain("C");
    expect(result).toContain("S");
  });

  it("should find elements that can react with carbon and oxygen (forming compounds)", () => {
    const result = findReactiveSymbols(["C", "O"]);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("Ca");
    expect(result).toContain("Mg");
  });

  it("should find missing element for water formation", () => {
    const result = findReactiveSymbols(["H"]);
    expect(result).toContain("O");
  });
});

describe("findCompoundReactiveSymbols", () => {
  it("should behave like findReactiveSymbols when less than 2 elements selected", () => {
    const single = findCompoundReactiveSymbols(["H"]);
    const normal = findReactiveSymbols(["H"]);
    expect(single).toEqual(normal);
  });

  it("should find elements that can react with H-O compound", () => {
    const result = findCompoundReactiveSymbols(["H", "O"]);
    expect(result).toBeDefined();
  });
});

describe("findReactions", () => {
  it("should return empty array when no elements selected", () => {
    expect(findReactions([])).toEqual([]);
  });

  it("should find water formation reaction", () => {
    const result = findReactions(["H", "O"]);
    expect(result.length).toBeGreaterThan(0);
    const waterReaction = result.find((r) => r.productName === "水");
    expect(waterReaction).toBeDefined();
    expect(waterReaction?.equation).toBe("2H₂ + O₂ → 2H₂O");
  });

  it("should find carbon dioxide formation", () => {
    const result = findReactions(["C", "O"]);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((r) => r.productName === "二氧化碳")).toBe(true);
    expect(result.some((r) => r.productName === "一氧化碳")).toBe(true);
  });

  it("should not find reactions for unrelated elements", () => {
    const result = findReactions(["He", "Ne"]);
    expect(result).toEqual([]);
  });
});

describe("searchReactions", () => {
  it("should return empty array for empty query", () => {
    expect(searchReactions("")).toEqual([]);
    expect(searchReactions("   ")).toEqual([]);
  });

  it("should find reactions by product name", () => {
    const result = searchReactions("水");
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((r) => r.productName.includes("水"))).toBe(true);
  });

  it("should find reactions by product formula", () => {
    const result = searchReactions("H₂O");
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((r) => r.product.includes("H₂O"))).toBe(true);
  });

  it("should find reactions by equation", () => {
    const result = searchReactions("2H₂ + O₂");
    expect(result.length).toBeGreaterThan(0);
  });

  it("should be case insensitive", () => {
    const lower = searchReactions("h2o");
    const upper = searchReactions("H2O");
    expect(lower.length).toBe(upper.length);
  });
});

describe("getSymbolsFromReactions", () => {
  it("should return empty array for empty reactions", () => {
    expect(getSymbolsFromReactions([])).toEqual([]);
  });

  it("should extract unique symbols from reactions", () => {
    const mockReactions = [
      { reactants: ["H", "O"] },
      { reactants: ["H", "Cl"] },
      { reactants: ["O", "C"] },
    ] as { reactants: string[] }[];
    const result = getSymbolsFromReactions(mockReactions);
    expect(result.sort()).toEqual(["C", "Cl", "H", "O"].sort());
  });
});
