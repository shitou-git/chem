import { readFileSync } from "fs";

const data = JSON.parse(readFileSync("/workspace/src/data/reactions.json", "utf-8"));

console.log(`\n总反应数：${data.length}\n`);

// ==================== 1. 检查重复 ID ====================
const idMap = new Map();
let dupIds = [];
for (const r of data) {
  if (idMap.has(r.id)) {
    dupIds.push(r.id);
  }
  idMap.set(r.id, (idMap.get(r.id) || 0) + 1);
}
if (dupIds.length > 0) {
  console.log("=== 重复 ID ===");
  dupIds.forEach(id => console.log(`  ${id}: 出现 ${idMap.get(id)} 次`));
} else {
  console.log("✅ 无重复 ID");
}

// ==================== 2. 检查必填字段 ====================
const requiredFields = ["id", "type", "reactants", "product", "productName", "equation", "condition", "description"];
let missingFieldIssues = [];
for (const r of data) {
  for (const f of requiredFields) {
    if (r[f] === undefined || r[f] === null || r[f] === "") {
      missingFieldIssues.push({ id: r.id, field: f });
    }
  }
  if (!Array.isArray(r.reactants) || r.reactants.length === 0) {
    missingFieldIssues.push({ id: r.id, field: "reactants(非空数组)" });
  }
}
if (missingFieldIssues.length > 0) {
  console.log("\n=== 缺失/空字段 ===");
  missingFieldIssues.forEach(i => console.log(`  [${i.id}] 缺少 ${i.field}`));
} else {
  console.log("✅ 必填字段完整");
}

// ==================== 3. 检查反应类型 ====================
const validTypes = new Set([
  "化合", "分解", "置换", "复分解", "氧化还原",
  "水解", "电解", "取代", "消去", "加聚", "缩聚", "其他"
]);
let invalidTypes = [];
const typeCount = {};
for (const r of data) {
  if (!validTypes.has(r.type)) {
    invalidTypes.push({ id: r.id, type: r.type });
  }
  typeCount[r.type] = (typeCount[r.type] || 0) + 1;
}
if (invalidTypes.length > 0) {
  console.log("\n=== 无效反应类型 ===");
  invalidTypes.forEach(i => console.log(`  [${i.id}] ${i.type}`));
} else {
  console.log("✅ 所有反应类型有效");
}
console.log("\n  各类型数量：");
Object.entries(typeCount).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => {
  console.log(`    ${t}: ${c}`);
});

// ==================== 4. 检查反应物元素 vs 产物元素（元素守恒大致检查）====================
// 简单的元素符号提取（只检查大写字母开头的元素符号）
function extractElements(formula) {
  // 移除括号内容、下标数字、箭头、符号等
  const clean = formula.replace(/\([^)]*\)/g, '')
    .replace(/[₀-₉↑↓·\s→+\-]/g, '')
    .replace(/\d+/g, '');
  
  const elements = new Set();
  const regex = /[A-Z][a-z]?/g;
  let match;
  while ((match = regex.exec(clean)) !== null) {
    elements.add(match[0]);
  }
  return elements;
}

let elementMismatch = [];
for (const r of data) {
  // 从 equation 中提取反应物和产物的元素
  const parts = r.equation.split(" → ");
  if (parts.length !== 2) {
    elementMismatch.push({ id: r.id, issue: "方程式格式错误，缺少 →" });
    continue;
  }
  
  const reactantElements = extractElements(parts[0]);
  const productElements = extractElements(parts[1]);
  
  // 检查反应物中的元素是否都在产物中
  for (const el of reactantElements) {
    if (!productElements.has(el)) {
      elementMismatch.push({ id: r.id, issue: `反应物元素 ${el} 不在产物中` });
    }
  }
  // 检查产物中的元素是否都在反应物中
  for (const el of productElements) {
    if (!reactantElements.has(el)) {
      elementMismatch.push({ id: r.id, issue: `产物元素 ${el} 不在反应物中` });
    }
  }
  
  // 检查 reactants 数组与 equation 中的元素是否大致对应
  const reactantsFromArray = new Set(r.reactants);
  // 粗略检查
}

if (elementMismatch.length > 0) {
  console.log(`\n=== 元素不守恒/元素不匹配（${elementMismatch.length} 处）===(可能有误报，需人工复核)`);
  elementMismatch.slice(0, 30).forEach(i => console.log(`  [${i.id}] ${i.issue}`));
  if (elementMismatch.length > 30) console.log(`  ... 还有 ${elementMismatch.length - 30} 条`);
} else {
  console.log("✅ 元素守恒检查通过（粗略）");
}

// ==================== 5. 检查 reactants 数组与 equation 元素的对应 ====================
let reactantsMismatch = [];
for (const r of data) {
  const parts = r.equation.split(" → ");
  if (parts.length !== 2) continue;
  
  const eqElements = extractElements(parts[0]);
  const arrElements = new Set(r.reactants);
  
  // 数组中的元素是否都在方程式中
  for (const el of arrElements) {
    if (!eqElements.has(el)) {
      reactantsMismatch.push({ id: r.id, issue: `reactants 数组中的 ${el} 不在方程式反应物中` });
    }
  }
}

if (reactantsMismatch.length > 0) {
  console.log(`\n=== reactants 数组与方程式不匹配（${reactantsMismatch.length} 处）===`);
  reactantsMismatch.slice(0, 30).forEach(i => console.log(`  [${i.id}] ${i.issue}`));
  if (reactantsMismatch.length > 30) console.log(`  ... 还有 ${reactantsMismatch.length - 30} 条`);
} else {
  console.log("✅ reactants 数组与方程式匹配");
}

// ==================== 6. 检查离子方程式 ====================
let ionicIssues = [];
for (const r of data) {
  if (r.ionicEquation) {
    // 简单检查：离子方程式应该包含 + 或 - 电荷符号
    if (!r.ionicEquation.includes("⁺") && !r.ionicEquation.includes("⁻") && 
        !r.ionicEquation.includes("+") && !r.ionicEquation.includes("-")) {
      ionicIssues.push({ id: r.id, issue: "离子方程式不含电荷符号" });
    }
  }
}
if (ionicIssues.length > 0) {
  console.log(`\n=== 离子方程式问题（${ionicIssues.length} 处）===`);
  ionicIssues.slice(0, 20).forEach(i => console.log(`  [${i.id}] ${i.issue}`));
}

// ==================== 7. 统计有离子方程式的数量 ====================
const ionicCount = data.filter(r => r.ionicEquation).length;
console.log(`\n📊 有离子方程式的反应：${ionicCount} 条`);

// ==================== 8. 检查常见的错误模式 ====================
console.log("\n=== 常见错误模式检查 ===");

// 8.1 检查 CO₂ + Ca(OH)₂ 类，反应物有气体但产物有↑的（应该没问题，但看看）
// 跳过，之前已经检查过了

// 8.2 检查 product 字段和 equation 产物是否一致
let productMismatch = [];
for (const r of data) {
  // 简单检查：product 中的物质应该在 equation 产物中能找到
  const parts = r.equation.split(" → ");
  if (parts.length !== 2) continue;
  
  // 提取 product 中的主要物质（去掉 + 和空格）
  const productParts = r.product.split(/\s*\+\s*/).map(s => s.trim().replace(/[↑↓]/g, ''));
  const eqProductParts = parts[1].split(/\s*\+\s*/).map(s => s.trim().replace(/[↑↓]/g, ''));
  
  // 检查 product 中的每个物质是否在 equation 产物中
  for (const p of productParts) {
    if (p && !eqProductParts.includes(p)) {
      // 再试试部分匹配（去除前后缀）
      const found = eqProductParts.some(ep => ep.includes(p) || p.includes(ep));
      if (!found) {
        productMismatch.push({ id: r.id, issue: `product字段中的 ${p} 不在方程式产物中` });
        break;
      }
    }
  }
}
if (productMismatch.length > 0) {
  console.log(`\n  product 字段与方程式产物不匹配（${productMismatch.length} 处）：`);
  productMismatch.slice(0, 20).forEach(i => console.log(`    [${i.id}] ${i.issue}`));
} else {
  console.log("  ✅ product 字段与方程式产物一致");
}

console.log("\n🎉 全面检查完成");
