import json
import re

GAS_ELEMENTS = ['H₂', 'O₂', 'N₂', 'F₂', 'Cl₂', 'Br₂', 'I₂']
GAS_COMPOUNDS = ['CO₂', 'CO', 'SO₂', 'SO₃', 'NO', 'NO₂', 'NH₃', 'H₂S', 'CH₄', 'C₂H₄', 'C₂H₂', 'HCl']
PRECIPITATES = ['AgCl', 'AgBr', 'AgI', 'BaSO₄', 'CaCO₃', 'Cu(OH)₂', 'Fe(OH)₃']

def parse_equation(equation):
    arrow = '→' if '→' in equation else '⇌' if '⇌' in equation else '='
    parts = equation.split(arrow)
    return parts[0].strip(), parts[1].strip()

def get_substances(side):
    substances = []
    items = side.split('+')
    for item in items:
        item = item.strip()
        match = re.match(r'^(\d+)?\s*(.+)$', item)
        if match:
            formula = match.group(2).replace('↑', '').replace('↓', '')
            substances.append(formula.strip())
    return substances

def contains_gas(substances):
    for s in substances:
        if s in GAS_ELEMENTS or s in GAS_COMPOUNDS:
            return True
    return False

def contains_solid(substances):
    solids = ['S', 'C', 'Fe', 'Cu', 'Zn', 'Ag', 'Al', 'Mg', 'Na', 'K', 'Ca', 'Pb', 'Hg', 'Au']
    for s in substances:
        if s in solids:
            return True
    return False

def is_gas(substance):
    return substance in GAS_ELEMENTS or substance in GAS_COMPOUNDS

def is_precipitate(substance):
    return substance in PRECIPITATES

with open('/workspace/src/data/reactions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

fixed = 0

for reaction in data:
    eq = reaction.get('equation', '')
    if '→' not in eq and '⇌' not in eq and '=' not in eq:
        continue
    
    left, right = parse_equation(eq)
    left_substances = get_substances(left)
    right_substances = get_substances(right)
    
    has_gas_reactant = contains_gas(left_substances)
    has_solid_reactant = contains_solid(left_substances)
    
    new_right_parts = []
    right_items = right.split('+')
    
    for item in right_items:
        item = item.strip()
        match = re.match(r'^(\d+)?\s*(.+)$', item)
        if match:
            coef = match.group(1) if match.group(1) else ''
            formula = match.group(2)
            clean_formula = formula.replace('↑', '').replace('↓', '')
            
            if is_gas(clean_formula) and not has_gas_reactant:
                new_item = f"{coef}{clean_formula}↑".strip()
            elif is_precipitate(clean_formula) and not has_solid_reactant:
                new_item = f"{coef}{clean_formula}↓".strip()
            else:
                new_item = f"{coef}{clean_formula}".strip()
            
            new_right_parts.append(new_item)
    
    arrow = '→' if '→' in eq else '⇌' if '⇌' in eq else '='
    new_eq = f"{left} {arrow} {' + '.join(new_right_parts)}"
    
    if new_eq != eq:
        reaction['equation'] = new_eq
        fixed += 1

with open('/workspace/src/data/reactions.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Fixed {fixed} reactions")

print("\n关键反应验证：")
for r in data:
    eq = r.get('equation', '')
    if 'S + O₂' in eq or 'CuSO₄ + 2NaOH' in eq or 'CaCO₃ →' in eq or '2H₂ + O₂' in eq:
        print(f'  {eq}')
