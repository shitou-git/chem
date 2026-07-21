import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reactionsPath = path.join(__dirname, 'src/data/reactions.json');
let data = JSON.parse(fs.readFileSync(reactionsPath, 'utf-8'));

let changes = [];

// 1. 删除重复方程式 n-o-no2 (保留描述更好的 n-o2)
const beforeDelete = data.length;
data = data.filter(r => r.id !== 'n-o-no2');
changes.push(`删除重复方程式 n-o-no2 (${beforeDelete} -> ${data.length})`);

// 2. 修复配平错误：c6h5oh-br2-c6h3br3oh
// 苯酚与溴水反应：C₆H₅OH + 3Br₂ → C₆H₂Br₃OH↓ + 3HBr
// 三溴苯酚应该是 C₆H₂Br₃OH (2个H)，不是 C₆H₃Br₃OH
const phenolRx = data.find(r => r.id === 'c6h5oh-br2-c6h3br3oh');
if (phenolRx) {
  phenolRx.equation = 'C₆H₅OH + 3Br₂ → C₆H₂Br₃OH↓ + 3HBr';
  phenolRx.product = 'C₆H₂Br₃OH + 3HBr';
  phenolRx.productName = '三溴苯酚和溴化氢';
  changes.push('修复 c6h5oh-br2-c6h3br3oh 配平：三溴苯酚为C₆H₂Br₃OH');
}

// 3. 修复配平错误：pb-o2-pbo2
// 2PbO + O₂ → 2PbO₂ (或 6PbO + O₂ → 2Pb₃O₄，但生成PbO₂的话是2PbO+O2→2PbO2)
const pboRx = data.find(r => r.id === 'pb-o2-pbo2');
if (pboRx) {
  pboRx.equation = '2PbO + O₂ → 2PbO₂';
  changes.push('修复 pb-o2-pbo2 配平：2PbO + O₂ → 2PbO₂');
}

// 4. 修复反应类型：h2-co2-ch3oh 从化合改为其他（CO₂+3H₂→CH₃OH+H₂O 不是化合反应，是氧化还原）
const methanolRx = data.find(r => r.id === 'h2-co2-ch3oh');
if (methanolRx) {
  methanolRx.type = '氧化还原';
  changes.push('修复 h2-co2-ch3oh 类型：化合 -> 氧化还原');
}

console.log('修复内容：');
changes.forEach((c, i) => console.log(`  ${i+1}. ${c}`));

fs.writeFileSync(reactionsPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
console.log(`\n已保存，当前总数: ${data.length}`);
