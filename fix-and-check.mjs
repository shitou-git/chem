import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reactionsPath = path.join(__dirname, 'src/data/reactions.json');
const data = JSON.parse(fs.readFileSync(reactionsPath, 'utf-8'));

console.log('总反应数:', data.length);

function toHalfWidth(str) {
  return str.replace(/[０-９]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  }).replace(/[₀-₉]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 0x2080 + 0x30);
  });
}

function parseFormula(formula) {
  const result = {};
  let cleaned = toHalfWidth(formula);
  cleaned = cleaned
    .replace(/\(g\)|\(l\)|\(s\)|\(aq\)/gi, '')
    .replace(/（g）|（l）|（s）|（aq）/gi, '')
    .replace(/[↑↓·]/g, '')
    .replace(/\[|\]/g, '')
    .replace(/熔融|浓|稀|过量|少量|催化剂|加热|点燃|高温|通电|电解|胶体|沉淀|气体/g, '');
  
  if (!cleaned.trim()) return result;
  
  const stack = [result];
  let i = 0;
  
  while (i < cleaned.length) {
    if (cleaned[i] === '(' || cleaned[i] === '（') {
      stack.push({});
      i++;
    } else if (cleaned[i] === ')' || cleaned[i] === '）') {
      i++;
      let numStr = '';
      while (i < cleaned.length && /\d/.test(cleaned[i])) {
        numStr += cleaned[i];
        i++;
      }
      const multiplier = numStr ? parseInt(numStr) : 1;
      const group = stack.pop();
      const top = stack[stack.length - 1];
      for (const [el, count] of Object.entries(group)) {
        top[el] = (top[el] || 0) + count * multiplier;
      }
    } else if (/[A-Z]/.test(cleaned[i])) {
      let element = cleaned[i];
      i++;
      if (i < cleaned.length && /[a-z]/.test(cleaned[i])) {
        element += cleaned[i];
        i++;
      }
      let numStr = '';
      while (i < cleaned.length && /\d/.test(cleaned[i])) {
        numStr += cleaned[i];
        i++;
      }
      const count = numStr ? parseInt(numStr) : 1;
      const top = stack[stack.length - 1];
      top[element] = (top[element] || 0) + count;
    } else {
      i++;
    }
  }
  
  return result;
}

function parseSide(side) {
  const total = {};
  const cleaned = toHalfWidth(side);
  const terms = cleaned.split('+').map(s => s.trim()).filter(s => s);
  for (const term of terms) {
    const match = term.match(/^(\d+)(\s*)(.+)$/);
    if (match) {
      const coef = parseInt(match[1]);
      const atoms = parseFormula(match[3]);
      for (const [el, count] of Object.entries(atoms)) {
        total[el] = (total[el] || 0) + count * coef;
      }
    } else {
      const atoms = parseFormula(term);
      for (const [el, count] of Object.entries(atoms)) {
        total[el] = (total[el] || 0) + count;
      }
    }
  }
  return total;
}

function checkBalance(equation) {
  const arrowMatch = equation.match(/[→⇌=]/);
  if (!arrowMatch) return { error: '缺少箭头', left: null, right: null };
  
  const arrowIdx = arrowMatch.index;
  const leftSide = equation.substring(0, arrowIdx).trim();
  const rightSide = equation.substring(arrowIdx + 1).trim();
  
  const leftAtoms = parseSide(leftSide);
  const rightAtoms = parseSide(rightSide);
  
  const allElements = new Set([...Object.keys(leftAtoms), ...Object.keys(rightAtoms)]);
  const mismatches = [];
  
  for (const el of allElements) {
    const left = leftAtoms[el] || 0;
    const right = rightAtoms[el] || 0;
    if (Math.abs(left - right) > 0.001) {
      mismatches.push({ element: el, left, right });
    }
  }
  
  return { mismatches, leftAtoms, rightAtoms, leftSide, rightSide };
}

console.log('\n=== 重复 ID 检查 ===');
const idCount = {};
data.forEach((r, i) => {
  idCount[r.id] = (idCount[r.id] || 0) + 1;
});
const dupIds = Object.entries(idCount).filter(([k, v]) => v > 1);
if (dupIds.length > 0) {
  console.log(`重复ID: ${dupIds.length} 个`);
  dupIds.forEach(([id, count]) => console.log(`  ${id}: ${count}次`));
} else {
  console.log('✅ 无重复ID');
}

console.log('\n=== 配平检查 ===');
let unbalancedCount = 0;
let skippedCount = 0;
const skipPatterns = ['nCH', '(C₆H', 'nC₆', 'nHCHO', '-(CH'];

data.forEach((r, i) => {
  const shouldSkip = skipPatterns.some(p => r.equation.includes(p));
  if (shouldSkip) {
    skippedCount++;
    return;
  }
  
  const result = checkBalance(r.equation);
  if (result.error) {
    console.log(`[${r.id}] ${result.error}: ${r.equation}`);
    unbalancedCount++;
  } else if (result.mismatches.length > 0) {
    const details = result.mismatches.map(m => `${m.element}:${m.left}vs${m.right}`).join(',');
    console.log(`[${r.id}] 配平不平衡: ${r.equation}`);
    console.log(`  ${details}`);
    unbalancedCount++;
  }
});
console.log(`配平有问题: ${unbalancedCount} 条 (跳过聚合类: ${skippedCount} 条)`);

console.log('\n=== reactants数组 vs 方程式反应物元素 ===');
let reactantMismatch = 0;
data.forEach((r, i) => {
  const arrowMatch = r.equation.match(/[→⇌=]/);
  if (!arrowMatch) return;
  
  const leftSide = r.equation.substring(0, arrowMatch.index).trim();
  const leftAtoms = parseSide(leftSide);
  const eqElements = new Set(Object.keys(leftAtoms));
  const arrElements = new Set(r.reactants);
  
  const missingInArr = [...eqElements].filter(e => !arrElements.has(e));
  const extraInArr = [...arrElements].filter(e => !eqElements.has(e));
  
  if (missingInArr.length > 0 || extraInArr.length > 0) {
    console.log(`[${r.id}] ${r.equation}`);
    if (missingInArr.length > 0) console.log(`  reactants缺少: ${missingInArr.join(',')}`);
    if (extraInArr.length > 0) console.log(`  reactants多余: ${extraInArr.join(',')}`);
    reactantMismatch++;
  }
});
console.log(`reactants不匹配: ${reactantMismatch} 条`);

console.log('\n=== 重复方程式检查 ===');
const eqMap = {};
data.forEach((r, i) => {
  const normalized = toHalfWidth(r.equation).replace(/\s+/g, '').replace(/[→⇌=]/g, '→');
  if (!eqMap[normalized]) eqMap[normalized] = [];
  eqMap[normalized].push({ id: r.id, index: i, type: r.type });
});
const dupEqs = Object.entries(eqMap).filter(([k, v]) => v.length > 1);
console.log(`重复方程式: ${dupEqs.length} 组`);
dupEqs.forEach(([eq, items]) => {
  console.log(`  ${eq}`);
  items.forEach(item => console.log(`    ID:${item.id} 类型:${item.type}`));
});

console.log('\n=== 反应类型检查（基本规则）===');
let typeSuspects = [];
data.forEach((r) => {
  const arrowMatch = r.equation.match(/[→⇌=]/);
  if (!arrowMatch) return;
  
  const leftSide = r.equation.substring(0, arrowMatch.index).trim();
  const rightSide = r.equation.substring(arrowMatch.index + 1).trim();
  const leftCount = leftSide.split('+').length;
  const rightCount = rightSide.split('+').length;
  
  let suspect = false;
  let reason = '';
  
  if (r.type === '化合' && !(leftCount > 1 && rightCount === 1)) {
    suspect = true;
    reason = `化合反应应有1种产物，实际${rightCount}种`;
  } else if (r.type === '分解' && !(leftCount === 1 && rightCount > 1)) {
    suspect = true;
    reason = `分解反应应有1种反应物，实际${leftCount}种`;
  }
  
  if (suspect) {
    typeSuspects.push({ id: r.id, type: r.type, equation: r.equation, reason });
  }
});
console.log(`可能分类有疑问的: ${typeSuspects.length} 条`);
typeSuspects.forEach(r => {
  console.log(`  [${r.id}] 类型:${r.type} - ${r.equation}`);
  console.log(`    ${r.reason}`);
});

console.log('\n=== 必填字段检查 ===');
const requiredFields = ['id', 'type', 'reactants', 'product', 'productName', 'equation', 'condition', 'description'];
let missingFieldCount = 0;
data.forEach((r, i) => {
  for (const field of requiredFields) {
    if (!r[field] || (Array.isArray(r[field]) && r[field].length === 0)) {
      console.log(`[${r.id}] 缺少字段: ${field}`);
      missingFieldCount++;
    }
  }
});
console.log(`缺少字段: ${missingFieldCount} 处`);

console.log('\n🎉 检查完成');
