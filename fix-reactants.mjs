import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reactionsPath = path.join(__dirname, 'src/data/reactions.json');
let data = JSON.parse(fs.readFileSync(reactionsPath, 'utf-8'));

const subscriptMap = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9'
};

function toHalfWidth(str) {
  let result = '';
  for (const ch of str) {
    result += subscriptMap[ch] || ch;
  }
  return result.replace(/[０-９]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
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

function getReactantElements(equation) {
  const arrowMatch = equation.match(/[→⇌=]/);
  if (!arrowMatch) return [];
  
  const leftSide = equation.substring(0, arrowMatch.index).trim();
  const cleaned = toHalfWidth(leftSide);
  const terms = cleaned.split('+').map(s => s.trim()).filter(s => s);
  
  const elements = new Set();
  for (const term of terms) {
    const match = term.match(/^(\d+)(\s*)(.+)$/);
    const formula = match ? match[3] : term;
    const atoms = parseFormula(formula);
    for (const el of Object.keys(atoms)) {
      elements.add(el);
    }
  }
  
  return [...elements].sort();
}

let fixedCount = 0;
data.forEach((r, i) => {
  let correctElements;
  
  // 特殊反应手动指定
  const manualFixes = {
    'c2h5oh-cu-o2-ch3cho': ['C', 'H', 'O'],
    'electrolysis-nacl': ['Na', 'Cl', 'H', 'O'],
    'electrolysis-cuso4': ['Cu', 'S', 'O', 'H'],
    'electrolysis-agno3': ['Ag', 'N', 'O', 'H'],
    'electrolysis-nacl-molten': ['Na', 'Cl'],
    'electrolysis-al2o3-molten': ['Al', 'O'],
    'organic-ethylene-polymerization': ['C', 'H'],
    'organic-vinyl-chloride-polymerization': ['C', 'H', 'Cl'],
    'organic-styrene-polymerization': ['C', 'H'],
    'organic-phenol-formaldehyde': ['C', 'H', 'O'],
    'organic-starch-hydrolysis': ['C', 'H', 'O'],
    'organic-sucrose-hydrolysis': ['C', 'H', 'O'],
    'industrial-petroleum-cracking': ['C', 'H'],
    'industrial-petroleum-pyrolysis': ['C', 'H'],
  };
  
  if (manualFixes[r.id]) {
    correctElements = manualFixes[r.id].sort();
  } else {
    correctElements = getReactantElements(r.equation);
  }
  
  const currentElements = [...r.reactants].sort();
  
  if (JSON.stringify(correctElements) !== JSON.stringify(currentElements)) {
    console.log(`[${r.id}]`);
    console.log(`  原reactants: [${r.reactants.join(', ')}]`);
    console.log(`  正确reactants: [${correctElements.join(', ')}]`);
    r.reactants = correctElements;
    fixedCount++;
  }
});

console.log(`\n修复了 ${fixedCount} 条 reactants 数组`);

fs.writeFileSync(reactionsPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
console.log('已保存');
