import json
import re
import collections

ELEMENTS = {
    'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
    'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar',
    'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn',
    'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr',
    'Rb', 'Sr', 'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd',
    'In', 'Sn', 'Sb', 'Te', 'I', 'Xe',
    'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy',
    'Ho', 'Er', 'Tm', 'Yb', 'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt',
    'Au', 'Hg', 'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn',
    'Fr', 'Ra', 'Ac', 'Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf',
    'Es', 'Fm', 'Md', 'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds',
    'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og'
}

SUBSCRIPT_MAP = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
    '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9'
}

def replace_subscripts(text):
    for sub, num in SUBSCRIPT_MAP.items():
        text = text.replace(sub, num)
    return text

def parse_formula(formula):
    atoms = collections.defaultdict(int)
    formula = replace_subscripts(formula)
    
    if '·' in formula:
        parts = formula.split('·')
        for part in parts:
            match = re.match(r'^(\d*)(.+)$', part)
            if match:
                coef = int(match.group(1)) if match.group(1) else 1
                sub_formula = match.group(2)
            else:
                coef = 1
                sub_formula = part
            
            part_atoms = parse_simple_formula(sub_formula)
            for elem, count in part_atoms.items():
                atoms[elem] += coef * count
    else:
        atoms = parse_simple_formula(formula)
    
    return atoms

def parse_simple_formula(formula):
    atoms = collections.defaultdict(int)
    
    def parse_segment(seg, multiplier=1):
        nonlocal atoms
        while '(' in seg:
            match = re.search(r'\(([^()]+)\)(\d*)', seg)
            if not match:
                break
            inner = match.group(1)
            inner_mult = int(match.group(2)) if match.group(2) else 1
            parse_segment(inner, multiplier * inner_mult)
            seg = seg[:match.start()] + seg[match.end():]
        
        matches = re.findall(r'([A-Z][a-z]?)(\d*)', seg)
        for elem, count in matches:
            if elem in ELEMENTS:
                atoms[elem] += (int(count) if count else 1) * multiplier
    
    parse_segment(formula)
    return atoms

def remove_comment_parentheses(equation):
    result = []
    i = 0
    while i < len(equation):
        if equation[i] == '(':
            j = i + 1
            depth = 1
            while j < len(equation) and depth > 0:
                if equation[j] == '(':
                    depth += 1
                elif equation[j] == ')':
                    depth -= 1
                j += 1
            
            content = equation[i+1:j-1]
            has_chinese = any('\u4e00' <= c <= '\u9fff' for c in content)
            has_space = ' ' in content or '\u3000' in content
            
            if has_chinese or has_space:
                i = j
                continue
            else:
                result.append(equation[i:j])
                i = j
        else:
            result.append(equation[i])
            i += 1
    
    return ''.join(result)

def parse_equation(equation):
    eq_clean = equation
    eq_clean = eq_clean.replace('→', '=').replace('⇌', '=').replace('→', '=').replace('＝', '=')
    eq_clean = eq_clean.replace('↑', '').replace('↓', '')
    
    eq_clean = remove_comment_parentheses(eq_clean)
    
    parts = eq_clean.split('=')
    if len(parts) != 2:
        return None, None, False
    
    left = parts[0].strip()
    right = parts[1].strip()
    
    if not left or not right:
        return None, None, False
    
    left_compounds = [c.strip() for c in left.split('+')]
    right_compounds = [c.strip() for c in right.split('+')]
    
    left_atoms = collections.defaultdict(int)
    for compound in left_compounds:
        match = re.match(r'^(\d*)(.+)$', compound)
        if match:
            coef = int(match.group(1)) if match.group(1) else 1
            formula = match.group(2)
        else:
            coef = 1
            formula = compound
        
        compound_atoms = parse_formula(formula)
        for elem, count in compound_atoms.items():
            left_atoms[elem] += coef * count
    
    right_atoms = collections.defaultdict(int)
    for compound in right_compounds:
        match = re.match(r'^(\d*)(.+)$', compound)
        if match:
            coef = int(match.group(1)) if match.group(1) else 1
            formula = match.group(2)
        else:
            coef = 1
            formula = compound
        
        compound_atoms = parse_formula(formula)
        for elem, count in compound_atoms.items():
            right_atoms[elem] += coef * count
    
    is_balanced = dict(left_atoms) == dict(right_atoms)
    return left_atoms, right_atoms, is_balanced

def validate_writing(equation):
    issues = []
    
    if '＝' in equation:
        issues.append('使用了全角等号"＝"而不是"→"或"⇌"')
    
    if '→' in equation and ' → ' not in equation:
        issues.append('"→"两侧缺少空格')
    
    if '⇌' in equation and ' ⇌ ' not in equation:
        issues.append('"⇌"两侧缺少空格')
    
    if '=' in equation and '→' not in equation and '⇌' not in equation and '＝' not in equation:
        issues.append('使用了半角等号"="而不是"→"或"⇌"')
    
    has_fullwidth_space = re.search(r'[\u3000]', equation)
    if has_fullwidth_space:
        issues.append('使用了全角空格')
    
    if re.search(r'\d+[A-Z]', equation):
        issues.append('系数和化学式之间缺少空格')
    
    return issues

def main():
    with open('/workspace/src/data/reactions.json', 'r', encoding='utf-8') as f:
        reactions = json.load(f)
    
    balanced_count = 0
    unbalanced_count = 0
    parse_error_count = 0
    writing_issues = []
    total_reactions = len(reactions)
    
    for idx, reaction in enumerate(reactions, 1):
        eq = reaction.get('equation', '')
        eq_id = reaction.get('id', '')
        
        if not eq or eq.strip() == '':
            parse_error_count += 1
            continue
        
        left_atoms, right_atoms, is_balanced = parse_equation(eq)
        
        if left_atoms is None:
            parse_error_count += 1
            continue
        
        if not is_balanced:
            unbalanced_count += 1
        else:
            balanced_count += 1
        
        issues = validate_writing(eq)
        if issues:
            writing_issues.append({
                'index': idx,
                'id': eq_id,
                'equation': eq,
                'issues': issues
            })
    
    print('=' * 60)
    print(f'验证结果:')
    print(f'  总方程式数: {total_reactions}')
    print(f'  配平正确: {balanced_count}')
    print(f'  配平错误: {unbalanced_count}')
    print(f'  无法解析: {parse_error_count}')
    print(f'  书写规范问题: {len(writing_issues)}')
    print()
    
    if unbalanced_count > 0:
        print(f'配平错误列表（前10个）:')
        count = 0
        for idx, reaction in enumerate(reactions, 1):
            eq = reaction.get('equation', '')
            eq_id = reaction.get('id', '')
            left_atoms, right_atoms, is_balanced = parse_equation(eq)
            if left_atoms is not None and not is_balanced:
                print(f'  [{idx}] ID: {eq_id}')
                print(f'    方程式: {eq}')
                print(f'    反应物: {dict(left_atoms)}')
                print(f'    生成物: {dict(right_atoms)}')
                count += 1
                if count >= 10:
                    break
        if unbalanced_count > 10:
            print(f'    ... 还有 {unbalanced_count - 10} 个配平错误')
    
    if writing_issues:
        print(f'\n书写规范问题列表（前10个）:')
        for issue in writing_issues[:10]:
            print(f'  [{issue["index"]}] ID: {issue["id"]}')
            print(f'    方程式: {issue["equation"]}')
            print(f'    问题: {", ".join(issue["issues"])}')
        if len(writing_issues) > 10:
            print(f'    ... 还有 {len(writing_issues) - 10} 个书写规范问题')
    
    return unbalanced_count == 0 and parse_error_count == 0 and len(writing_issues) == 0

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)