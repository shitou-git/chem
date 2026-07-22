#!/usr/bin/env python3
"""
化学反应描述质量提升脚本 v3
为 chemistry reactions.json 中描述质量不足的反应生成课堂级高质量描述。

策略：
1. 对于有专门生成器的反应（SPECIAL_GENERATORS），使用定制描述
2. 对于有额外字段（phenomenon/industrialUse/dailyLife/enthalpy）的反应，
   通用生成器会自然整合这些信息
3. 对于完全没有额外字段的反应，基于反应类型和化学知识生成有意义的通用描述
"""

import json
import re
import sys


def needs_update(description):
    """判断描述是否需要更新：长度 < 80 字"""
    return len(description) < 80


def join_parts(*parts):
    """拼接各部分，过滤空字符串，确保以句号结尾"""
    result = "".join(p for p in parts if p)
    result = result.rstrip("。") + "。"
    return result


# ============================================================
# 特殊反应的定制描述
# ============================================================

def desc_h_o(r):
    return join_parts(
        "氢气与氧气在点燃条件下发生化合反应生成水（H₂O）。"
        "氢气作为还原剂，从0价被氧化为+1价；氧气作为氧化剂，从0价被还原为-2价。"
        "反应释放大量热（ΔH = -285.8 kJ/mol），火焰呈淡蓝色。"
        "水是生命必需物质和最重要的极性溶剂，也是氢氧燃料电池和液氢液氧火箭推进剂的核心反应基础。"
    )

def desc_h_cl(r):
    return join_parts(
        "氢气与氯气在点燃或强光照射下化合生成氯化氢气体（HCl）。"
        "反应为链式自由基机理：光照使Cl₂均裂为Cl自由基引发反应，氢气从0价被氧化为+1价，氯气被还原为-1价。"
        "HCl为无色有刺激性气味气体，极易溶于水（1:500体积比），水溶液即为盐酸——三大强酸之一，"
        "在工业上广泛用于金属清洗、食品加工和化学合成"
    )

def desc_h_n(r):
    return join_parts(
        "氮气与氢气在高温高压（450-500°C、20-50MPa）和铁系催化剂作用下化合生成氨（NH₃），"
        "即工业上著名的Haber-Bosch合成氨法。N₂中N≡N叁键键能高达941 kJ/mol，需要高温和催化剂才能断裂。"
        "该反应为可逆放热反应（ΔH = -92.4 kJ/mol），低温有利于平衡但高温有利于速率，工业上采用折中条件和循环流程。"
        "合成氨是20世纪最重要的化工发明之一，全球约80%的合成氨用于生产氮肥，养活了世界近一半人口"
    )

def desc_h_c(r):
    return join_parts(
        "碳与氢气在高温条件下直接化合生成甲烷（CH₄）。"
        "碳的化合价为0，被氢还原为-4价（有机化学中碳的氧化数降低），氢气则被氧化。"
        "甲烷是最简单的烷烃，无色无味气体，难溶于水，是天然气的主要成分（约占85%-95%）。"
        "甲烷是重要的清洁能源和化工原料，广泛用于城市燃气、发电及合成氨、甲醇等化工产品的生产。"
        "在自然界中，甲烷是沼气、天然气和可燃冰的主要成分，也是重要的温室气体之一"
    )

def desc_c_o(r):
    return join_parts(
        "碳在氧气中充分燃烧（完全氧化）生成二氧化碳（CO₂）。"
        "碳从0价被氧化为+4价，氧气从0价被还原为-2价。"
        "CO₂是无色无味气体，能使澄清石灰水变浑浊（生成CaCO₃沉淀），这是检验CO₂的经典方法。"
        "该反应是化石燃料燃烧的基础反应，也是全球碳循环的关键环节。"
        "反应放热（ΔH = -393.5 kJ/mol），广泛用于火力发电和冶金工业的热源"
    )

def desc_c_o2(r):
    return join_parts(
        "碳在氧气不足时不完全燃烧生成一氧化碳（CO）。"
        "碳仅被氧化为+2价而非+4价。CO是无色无味的剧毒气体，"
        "与血红蛋白的结合力比氧气强约200倍，吸入后造成组织缺氧。"
        "此反应提醒我们：燃料在通风不良的环境中燃烧会产生致命气体，必须保证充分通风。"
        "CO也是重要的化工原料，用于合成甲醇和作为还原剂冶炼金属"
    )

def desc_n_o(r):
    return join_parts(
        "氮气与氧气在放电（如雷击）条件下直接化合生成一氧化氮（NO）。"
        "N₂分子中的N≡N叁键键能高达941 kJ/mol极为稳定，需要放电提供极高能量才能断裂。"
        "这是自然界固氮的重要途径——雷雨天气中生成的NO进一步氧化为NO₂，"
        "溶于雨水形成硝酸随降雨进入土壤，为植物提供氮素养分。"
        "NO也是重要的生物信号分子，在人体内参与血管舒张调节"
    )

def desc_n_o2(r):
    return join_parts(
        "一氧化氮与氧气在常温下即可迅速化合生成二氧化氮（NO₂）。"
        "NO是无色气体，而NO₂是红棕色有刺激性气味的有毒气体。"
        "此反应速率极快，是NO在空气中迅速被氧化消失的原因。"
        "NO₂是大气污染物之一，参与光化学烟雾的形成，也是酸雨的前体物质。"
        "NO₂溶于水生成硝酸和NO，是工业制硝酸的关键步骤之一"
    )

def desc_s_o(r):
    return join_parts(
        "硫在空气中点燃生成二氧化硫（SO₂）。"
        "硫从0价被氧化为+4价，火焰呈淡蓝色（纯氧中为明亮蓝紫色）。"
        "SO₂是有刺激性气味的无色气体，是酸雨的主要成因之一——"
        "SO₂在大气中被氧化为SO₃，再与水形成H₂SO₄。"
        "该反应也是接触法制硫酸的第一步，反应热为ΔH = -296.8 kJ/mol"
    )

def desc_p_o(r):
    return join_parts(
        "磷在氧气中剧烈燃烧生成五氧化二磷（P₂O₅，实际以P₄O₁₀二聚体形式存在）。"
        "反应放出大量热（ΔH = -2984 kJ/mol），产生浓厚的白色烟雾。"
        "P₂O₅是高效的干燥剂和脱水剂，吸湿性极强，能从许多化合物中夺取水分子，"
        "在有机合成中用作脱水剂。白磷在空气中能自燃，需保存在水中"
    )

def desc_mg_o(r):
    return join_parts(
        "镁条在空气中点燃发生剧烈化合反应生成氧化镁（MgO）。"
        "镁从0价被氧化为+2价，氧气被还原为-2价。"
        "反应发出耀眼白光（不可直视），放出大量热（ΔH = -601.6 kJ/mol），生成白色粉末。"
        "MgO熔点高达2852°C，是优良耐火材料；也用作胃酸中和剂（胃药成分）。"
        "镁燃烧的光效被用于照明弹、闪光灯和信号弹"
    )

def desc_fe_o(r):
    return join_parts(
        "细铁丝在纯氧中点燃发生剧烈化合反应生成四氧化三铁（Fe₃O₄）。"
        "铁丝剧烈燃烧火星四射，放出大量热（ΔH = -1118.4 kJ/mol），生成黑色固体。"
        "Fe₃O₄中铁为+2和+3混合价态（FeO·Fe₂O₃），具有磁性，是磁铁矿的主要成分。"
        "此反应原理应用于氧炔焰切割钢铁和钢铁冶炼中铁的氧化过程"
    )

def desc_cu_o(r):
    return join_parts(
        "铜在加热条件下与氧气化合生成氧化铜（CuO）。"
        "铜从0价被氧化为+2价，红色铜片表面逐渐变黑生成CuO黑色固体。"
        "CuO为碱性氧化物，不溶于水但能与酸反应生成铜盐和水，"
        "在实验室中用于有机分析（检测碳氢化合物中C和H含量）和制备其他铜化合物"
    )

def desc_na_cl(r):
    return join_parts(
        "钠在氯气中点燃发生剧烈化合反应生成氯化钠（NaCl）。"
        "钠从0价被氧化为+1价，氯气被还原为-1价。"
        "反应产生黄色火焰和大量白烟（NaCl固体颗粒）。"
        "NaCl即食盐的主要成分，为无色立方晶体，易溶于水且溶解度受温度影响很小。"
        "工业上此反应用于制备高纯度氯化钠（食品级盐），生活中NaCl是人体必需的电解质"
    )

def desc_ca_o(r):
    return join_parts(
        "钙在氧气中点燃发生化合反应生成氧化钙（CaO）。"
        "钙从0价被氧化为+2价，氧气被还原为-2价。"
        "CaO俗称生石灰，为白色块状固体，熔点约2572°C，是碱性氧化物。"
        "CaO与水剧烈反应（石灰熟化）放出大量热，广泛用于建筑、"
        "炼钢脱氧和烟气脱硫等工业过程"
    )

def desc_al_o(r):
    return join_parts(
        "铝粉在氧��中点燃发生剧烈化合反应生成氧化铝（Al₂O₃）。"
        "铝从0价被氧化为+3价，发出耀眼白光生成白色固体粉末。"
        "Al₂O₃熔点高达2054°C，是典型的两性氧化物，既能溶于强酸也能溶于强碱。"
        "自然界中刚玉（红宝石、蓝宝石）主要成分为Al₂O₃，"
        "工业上用作铝热剂、耐火材料和研磨剂"
    )

def desc_k_o(r):
    return join_parts(
        "钾在氧气中点燃发生剧烈化合反应生成氧化钾（K₂O）。"
        "钾从0价被氧化为+1价，火焰呈紫色（需透过蓝色钴玻璃观察）。"
        "K₂O为淡黄色粉末，极易与水反应生成KOH并放热，在空气中迅速潮解需密封保存。"
        "钾是最活泼的碱金属之一，反应需在严格无水条件下进行"
    )

def desc_fe_cl(r):
    return join_parts(
        "铁在氯气中点燃发生化合反应生成氯化铁（FeCl₃）。"
        "铁从0价被氧化为+3价，氯气被还原为-1价，"
        "红热铁丝在氯气中剧烈燃烧产生大量棕黄色烟（FeCl₃固体颗粒）。"
        "FeCl₃无水物为棕黑色晶体，易溶于水且水解使溶液呈酸性。"
        "FeCl₃溶液在实验室中用于检验酚类物质（遇苯酚显紫色）和蚀刻铜制电路板（PCB制造），"
        "也用作水处理絮凝剂和有机合成催化剂"
    )

def desc_cu_cl(r):
    return join_parts(
        "铜在氯气中点燃发生化合反应生成氯化铜（CuCl₂）。"
        "铜从0价被氧化为+2价，氯气被还原为-1价。"
        "CuCl₂无水物为棕黄色粉末，二水合物为蓝绿色晶体，"
        "水溶液因Cu²⁺水合离子呈蓝绿色。"
        "CuCl₂在化学实验中常用作铜离子来源和焰色反应试剂（绿色特征焰色），"
        "也用于有机合成中的催化剂"
    )

def desc_zn_o(r):
    return join_parts(
        "锌在加热条件下与氧气化合生成氧化锌（ZnO）。"
        "锌从0价被氧化为+2价，氧气被还原为-2价。"
        "ZnO常温下为白色粉末（俗称锌白），加热时因晶体缺陷变为黄色，冷却恢复白色。"
        "ZnO是两性氧化物，工业上广泛用作橡胶硫化促进剂、白色颜料、"
        "防晒霜紫外线吸收剂及电子工业压敏电阻材料"
    )

def desc_li_o(r):
    return join_parts(
        "锂在氧气中点燃发生化合反应生成氧化锂（Li₂O）。"
        "锂从0价被氧化为+1价，氧气被还原为-2价。"
        "Li₂O为白色固体，能与水剧烈反应生成LiOH。"
        "锂是密度最小的金属（0.534 g/cm³），"
        "Li₂O是锂离子电池正极材料的重要前体物质，在新能源领域地位关键"
    )

def desc_ag_s(r):
    return join_parts(
        "银与硫在常温下直接化合生成硫化银（Ag₂S）。"
        "银从0价被氧化为+1价，硫被还原为-2价。"
        "Ag₂S为黑色固体，不溶于水和稀酸。这是银器在空气中变黑的原因——"
        "空气中的微量H₂S与银反应生成黑色Ag₂S膜。"
        "去除Ag₂S可用铝箔和小苏打热水浸泡，利用铝的还原性将Ag₂S还原回银"
    )

def desc_fe_s(r):
    return join_parts(
        "铁粉与硫粉混合加热发生化合反应生成硫化亚铁（FeS）。"
        "铁从0价被氧化为+2价，硫被还原为-2价。"
        "反应一旦引发即剧烈放热，混合物呈红热状态，生成黑色块状固体。"
        "FeS不溶于水但能与稀酸反应生成H₂S气体（臭鸡蛋气味），"
        "这是实验室制备H₂S的经典方法。自然界中FeS以磁黄铁矿等形式存在"
    )

def desc_cu_s(r):
    return join_parts(
        "铜与硫在加热条件下化合生成硫化亚铜（Cu₂S）。"
        "铜从0价被氧化为+1价，硫被还原为-2价。"
        "Cu₂S为黑色固体，不溶于水。"
        "辉铜矿主要成分即为Cu₂S，是重要的炼铜原料。"
        "工业炼铜中硫化物矿石经浮选富集后通过火法冶炼转化为粗铜，Cu₂S是关键中间产物"
    )

def desc_zn_s(r):
    return join_parts(
        "锌粉与硫粉混合加热发生化合反应生成硫化锌（ZnS）。"
        "锌从0价被氧化为+2价，硫被还原为-2价。"
        "ZnS为白色粉末状固体。闪锌矿的主要成分即为ZnS，是炼锌的主要原料。"
        "ZnS是重要荧光材料，掺入微量Cu或Ag激活剂后在电子束或紫外激发下发各色荧光，"
        "广泛用于CRT显示屏、荧光灯和X射线增感屏"
    )

def desc_na_s(r):
    return join_parts(
        "钠与硫在加热条件下化合生成硫化钠（Na₂S）。"
        "钠从0价被氧化为+1价，硫被还原为-2价。"
        "Na₂S为白色或微黄色固体，易潮解，溶于水后强烈水解使溶液呈碱性。"
        "工业上Na₂S主要用于造纸硫酸盐法制浆，也用于硫化染料生产和皮革脱毛。"
        "分析化学中Na₂S溶液可作为重金属离子沉淀剂用于定性分析和废水处理"
    )

def desc_k_cl(r):
    return join_parts(
        "钾在氯气中点燃发生剧烈化合反应生成氯化钾（KCl）。"
        "钾从0价被氧化为+1价，氯气被还原为-1价。"
        "火焰呈紫色（需蓝色钴玻璃观察），产生大量白烟（KCl颗粒）。"
        "KCl为无色立方晶体或白色粉末，味咸易溶，是最重要的钾肥品种。"
        "农业上KCl补充作物钾元素促进光合作用；医药上用作电解质补充液维持细胞渗透压"
    )

def desc_c_s(r):
    return join_parts(
        "碳与硫在高温条件下化合生成二硫化碳（CS₂）。"
        "碳从0价被氧化为+4价，硫被还原为-2价。"
        "CS₂常温下为无色液体，是重要有机溶剂，能溶解硫、磷、碘、油脂和橡胶。"
        "工业上用于生产粘胶纤维（人造丝）和玻璃纸，也是CCl₄合成的原料。"
        "CS₂极易燃（闪点约-30°C）且对神经系统有毒，使用须在通风橱中操作"
    )

def desc_si_c(r):
    return join_parts(
        "硅与碳在高温电炉中化合生成碳化硅（SiC）。"
        "Si和C形成共价晶体，SiC俗称金刚砂，为黑色或暗绿色晶体，"
        "具有类似金刚石结构，是典型原子晶体。"
        "SiC硬度仅次于金刚石和立方氮化硼（莫氏9.5），耐高温（分解约2700°C）。"
        "工业上用作磨料、耐火材料，近年作为第三代半导体在电动汽车和5G通信领域广泛应用"
    )

def desc_p_o2(r):
    return join_parts(
        "磷在氧气不足时燃烧生成三氧化二磷（P₂O₃/P₄O₆）。"
        "磷从0价被氧化为+3价，为不完全氧化产物。"
        "P₂O₃为白色蜡状固体，有蒜臭味，有毒，溶于冷水缓慢生成亚磷酸（H₃PO₃）。"
        "P₂O₃是磷的低价氧化物，体现了磷的多价态氧化特性"
    )

def desc_fe_o2(r):
    return join_parts(
        "铁在高温下与氧气反应生成氧化铁（Fe₂O₃）。"
        "铁从0价被氧化为+3价，Fe₂O₃为红棕色粉末，即铁锈的主要成分。"
        "赤铁矿的主要成分即为Fe₂O₃，是炼铁的主要原料。"
        "Fe₂O₃也用作颜料（铁红）、抛光剂和磁性材料前体"
    )

def desc_cu_o2(r):
    return join_parts(
        "铜在严格控制条件下氧化生成氧化亚铜（Cu₂O）。"
        "铜从0价被氧化为+1价，Cu₂O为红色或橙红色粉末。"
        "Cu₂O具有半导体性质，用于制造铜氧化物整流器和太阳能电池。"
        "在有机合成中，Cu₂O用作催化剂；在船舶防污漆中用作防污剂"
    )

def desc_mn_o2(r):
    return join_parts(
        "锰在加热条件下与氧气化合生成二氧化锰（MnO₂）。"
        "锰从0价被氧化为+4价，MnO₂为黑色或棕黑色粉末。"
        "MnO₂是重要催化剂，催化H₂O₂分解和KClO₃热分解制氧。"
        "工业上用于制造干电池（锌锰电池正极材料）、玻璃脱色剂和锰盐制备"
    )

def desc_mg_n2(r):
    return join_parts(
        "镁在高温下与氮气直接化合生成氮化镁（Mg₃N₂）。"
        "镁从0价被氧化为+2价，氮气被还原为-3价。"
        "Mg₃N₂为黄绿色固体，遇水剧烈水解生成Mg(OH)₂和NH₃，"
        "这是实验室制备少量氨气的方法之一。"
        "此反应说明镁不仅能与氧气反应，还能与稳定的N₂直接化合，体现镁的强还原性"
    )

def desc_cao_h2o(r):
    return join_parts(
        "氧化钙与水剧烈反应生成氢氧化钙Ca(OH)₂，俗称生石灰的熟化反应。"
        "反应放出大量热可使水沸腾，CaO从块状崩解为粉末状Ca(OH)₂。"
        "Ca(OH)₂微溶于水，其水溶液（石灰水）呈碱性，常用于检验CO₂（变浑浊）。"
        "此反应是建筑工业中制备熟石灰的基础，也是工业烟气脱硫的重要反应"
    )

def desc_mgo_h2o(r):
    return join_parts(
        "氧化镁与水缓慢反应生成氢氧化镁Mg(OH)₂。"
        "MgO微溶于水，反应速率较CaO慢得多，因为Mg(OH)₂溶解度更小。"
        "Mg(OH)₂为白色固体，是重要的无机阻燃剂，受热分解吸热并释放水蒸气。"
        "医药上Mg(OH)₂（镁乳）用作抗酸药中和胃酸，也可作为缓泻剂"
    )

def desc_na2o_h2o(r):
    return join_parts(
        "氧化钠与水剧烈反应生成氢氧化钠（NaOH）。"
        "Na₂O为碱性氧化物，与水反应放热，溶液呈强碱性。"
        "NaOH俗称烧碱、火碱或苛性钠，是最重要的基础化工原料之一，"
        "广泛用于造纸、纺织、肥皂、石油炼制和氧化铝提取等工业。"
        "NaOH有强腐蚀性，使用时需佩戴防护装备"
    )

def desc_k2o_h2o(r):
    return join_parts(
        "氧化钾与水剧烈反应生成氢氧化钾（KOH）。"
        "反应放热明显，KOH为白色固体，易潮解，溶解度比NaOH更大。"
        "KOH俗称苛性钾，碱性比NaOH更强，"
        "在工业上用于生产钾盐、肥皂和作为CO₂吸收剂"
    )

def desc_bao_h2o(r):
    return join_parts(
        "氧化钡与水反应生成氢氧化钡Ba(OH)₂。"
        "BaO为白色固体，与水反应放热。"
        "Ba(OH)₂是可溶性碱，其水溶液（重土水）在实验室中用作CO₂吸收剂和硫酸根检测试剂。"
        "注意钡盐有毒，操作需小心"
    )

def desc_na2o2_h2o(r):
    return join_parts(
        "过氧化钠与水在常温下反应生成氢氧化钠和氧气。"
        "Na₂O₂中氧为-1价，发生歧化反应——部分O被还原为-2价（OH⁻），部分被氧化为0价（O₂）。"
        "反应放热，溶液呈强碱性，产生的氧气可用带火星木条检验。"
        "Na₂O₂是重要供氧剂，用于潜艇和航天器中作为氧气再生剂"
    )

def desc_na2o2_co2(r):
    return join_parts(
        "过氧化钠与二氧化碳在常温下反应生成碳酸钠和氧气。"
        "Na₂O₂中-1价氧歧化——部分与CO₂结合为CO₃²⁻，部分生成O₂。"
        "此反应同时解决供氧和去除CO₂两个问题，"
        "在密闭空间（潜艇、航天器）呼吸系统中具有重要应用"
    )

def desc_fe_h2o(r):
    return join_parts(
        "铁与水蒸气在高温条件下发生置换反应生成四氧化三铁和氢气。"
        "铁从0价被氧化为Fe₃O₄中的混合价态，水中+1价氢被还原为H₂。"
        "铁在高温下与水蒸气反应而不与液态水反应，说明高温增强了铁的还原性。"
        "此反应是历史上发现氢气的方法之一，也是工业铁-水蒸气法制氢的原理"
    )

def desc_zn_h2o(r):
    return join_parts(
        "锌与水蒸气在高温条件下发生置换反应生成氧化锌和氢气。"
        "锌从0价被氧化为+2价，水中氢被还原为0价。"
        "锌在常温下与液态水反应极慢（表面生成Zn(OH)₂膜），高温水蒸气可克服此障碍。"
        "ZnO高温时呈黄色，冷却恢复白色，是其晶体缺陷导致的可逆颜色变化"
    )

def desc_al_h2o(r):
    return join_parts(
        "铝与水蒸气在高温条件下反应生成氢氧化铝和氢气。"
        "铝从0价被氧化为+3价，水中氢被还原为0价。"
        "铝表面致密Al₂O₃保护膜在常温下阻止反应，高温水蒸气可破坏此膜。"
        "Al(OH)₃是两性氢氧化物，医药上用作抗酸药（胃舒平）"
    )

def desc_fe2o3_co(r):
    return join_parts(
        "氧化铁（赤铁矿）与一氧化碳在高温下发生氧化还原反应生成铁和二氧化碳。"
        "Fe₂O₃中+3价铁被CO还原为0价，CO中+2价碳被氧化为+4价（CO₂）。"
        "CO是重要还原剂，与铁的氧化物反应生成单质铁是工业高炉炼铁的核心化学原理。"
        "反应在炼铁高炉800-1200°C条件下进行，铁水从底部放出"
    )

def desc_fe3o4_co(r):
    return join_parts(
        "四氧化三铁（磁铁矿）与一氧化碳在高温下发生氧化还原反应生成铁和二氧化碳。"
        "Fe₃O₄中铁平均化合价+8/3，被CO还原为0价；CO被氧化为CO₂。"
        "Fe₃O₄是磁铁矿主要成分，具有天然磁性。"
        "此反应是高炉炼铁关键步骤——CO将铁的各级氧化物Fe₂O₃→Fe₃O₄→FeO→Fe逐步还原"
    )

def desc_feo_co(r):
    return join_parts(
        "氧化亚铁与一氧化碳在高温下发生氧化还原反应生成铁和二氧化碳。"
        "FeO中+2价铁被CO还原为0价，CO被氧化为CO₂。"
        "此反应是高炉炼铁还原过程最后一步，FeO为黑色粉末，"
        "在自然界中不稳定，通常以固溶体形式存在于其他矿物中"
    )

def desc_mg_co2(r):
    return join_parts(
        "镁条在二氧化碳中继续燃烧发生置换反应生成氧化镁和碳。"
        "镁从0价被氧化为+2价，CO₂中+4价碳被还原为0价单质碳。"
        "反应产生耀眼白光，生成白色MgO粉末和黑色碳颗粒。"
        "此反应说明镁还原性极强，能从CO₂中夺氧——"
        "因此镁燃烧时不能用CO₂灭火器扑灭。这是说明灭火原理局限性的经典演示实验"
    )

def desc_zn_co2(r):
    return join_parts(
        "锌与二氧化碳在高温条件下反应生成氧化锌和碳。"
        "锌从0价被氧化为+2价，CO₂中+4价碳被还原为0价。"
        "此反应与镁在CO₂中燃烧类似，说明锌也具有较强还原性能从CO₂中夺氧。"
        "ZnO在高温时呈黄色冷却恢复白色，是重要白色颜料和橡胶添加剂"
    )

def desc_fecl2_cl2(r):
    return join_parts(
        "氯化亚铁与氯气在常温下发生氧化还原反应生成氯化铁。"
        "Fe²⁺被Cl₂氧化为Fe³⁺（+2→+3），Cl₂被还原为Cl⁻（0→-1），Cl₂作氧化剂。"
        "溶液颜色由浅绿色（Fe²⁺）变为黄棕色（Fe³⁺），是检验离子转化的直观证据。"
        "FeCl₃是重要化工原料，用于水处理絮凝剂、PCB蚀刻液和有机合成催化剂"
    )

def desc_f2_h2o(r):
    return join_parts(
        "氟气与水在常温下发生氧化还原反应生成二氟化氧（OF₂）和氟化氢（HF）。"
        "氟是电负性最强的元素，F₂将水中O²⁻氧化，自身被还原为F⁻。"
        "OF₂中氧为+2价，是强氧化剂和剧毒气体。"
        "氟气是已知最活泼非金属单质，能与几乎所有物质反应包括水和玻璃，"
        "使用需极其严格的防护措施"
    )

def desc_dichromate_fe2(r):
    return join_parts(
        "重铬酸钾在酸性介质中氧化硫酸亚铁发生氧化还原反应。"
        "Cr₂O₇²⁻中Cr为+6价（橙色）被还原为Cr³⁺（+3价，绿色），"
        "Fe²⁺（浅绿）被氧化为Fe³⁺（黄棕），溶液由橙黄变为绿色。"
        "此反应是分析化学中重铬酸钾法测定铁含量的基础，"
        "用K₂Cr₂O₇标准溶液滴定含Fe²⁺样品，以二苯胺磺酸钠为指示剂"
    )

def desc_ca3p2_h2o(r):
    return join_parts(
        "磷化钙与水在常温下发生水解反应生成氢氧化钙和磷化氢（PH₃）。"
        "Ca₃P₂中磷为-3价，与水中的H⁺结合生成PH₃气体。"
        "PH₃俗称磷化氢或膦，为无色气体，有大蒜臭味，极毒且在空气中能自燃生成P₂O₅白烟。"
        "此反应也是谷物熏蒸剂磷化铝（遇水释放PH₃杀虫）的作用原理。PH₃剧毒易燃，操作须在通风橱中进行"
    )

def desc_c2h6_cl2_sub(r):
    return join_parts(
        "乙烷与氯气在光照条件下发生自由基取代反应生成氯乙烷和氯化氢。"
        "光照使Cl₂均裂产生Cl自由基，自由基抽取乙烷中H原子生成C₂H₅·自由基，"
        "再与Cl₂反应生成C₂H₅Cl和新的Cl自由基形成链式反应。"
        "此反应属烷烃卤代反应，是有机合成中引入官能团的重要方法。"
        "氯乙烷（C₂H₅Cl）常温为气体，曾用作局部麻醉剂和冷冻剂"
    )

def desc_chromate_dichromate(r):
    return join_parts(
        "铬酸根与重铬酸根在溶液中存在可逆酸碱平衡转化。"
        "碱性或中性溶液中铬以黄色CrO₄²⁻形式存在；"
        "加酸H⁺浓度增大平衡右移变为橙色Cr₂O₇²⁻；加碱OH⁻中和H⁺平衡左移恢复黄色。"
        "此反应是化学平衡移动的经典演示实验——通过改变H⁺浓度可逆改变溶液颜色，"
        "直观展示勒夏特列原理，在分析化学和工业氧化过程中有重要应用"
    )

def desc_c2h6_decomp(r):
    return join_parts(
        "乙烷在催化剂作用下高温裂解脱氢生成乙烯和氢气，属于分解反应。"
        "C-C键和C-H键在高温催化下断裂，碳原子杂化由sp³变为sp²，形成C=C双键的乙烯。"
        "乙烯是无色稍有甜味的气体，是石油化工最重要的基础原料——"
        "广泛用于生产聚乙烯、PVC、环氧乙烷、乙二醇等。乙烯也是植物激素促进果实成熟"
    )

def desc_mgcl2_electrolysis(r):
    return join_parts(
        "熔融氯化镁在通电条件下发生电解反应分解为金属镁和氯气。"
        "阴极Mg²⁺得电子被还原（Mg²⁺+2e⁻→Mg），阳极Cl⁻失电子被氧化（2Cl⁻-2e⁻→Cl₂↑）。"
        "此反应是工业电解法制镁的核心——从海水或盐湖卤水提取MgCl₂脱水后"
        "在约700-750°C熔融状态下电解得到液态镁。镁是最轻的结构金属广泛用于铝合金和航空航天"
    )

def desc_electrolysis_agno3(r):
    return join_parts(
        "硝酸银水溶液在通电条件下发生电解反应。"
        "阴极Ag⁺得电子被还原析出银白色树枝状晶体（Ag⁺+e⁻→Ag），"
        "阳极水分子失电子被氧化产生O₂（2H₂O-4e⁻→O₂↑+4H⁺），同时生成HNO₃。"
        "此反应用于银的精炼和电镀银工艺，镀银制品广泛用于餐具、首饰和电子元件"
    )

def desc_electroplate_zn(r):
    return join_parts(
        "锌离子在阴极获得电子被还原沉积为金属锌镀层，属于电镀工艺。"
        "阳极锌板逐渐溶解补充Zn²⁺，阴极工件表面沉积均匀致密的银白色锌层。"
        "锌比铁活泼，镀锌层通过牺牲阳极的阴极保护法防止钢铁腐蚀——"
        "即使镀层破损锌仍优先腐蚀保护铁。镀锌钢板广泛用于建筑、汽车、家电和输电铁塔"
    )

def desc_electrorefine_cu(r):
    return join_parts(
        "粗铜在电解精炼中阳极溶解为Cu²⁺（Cu-2e⁻→Cu²⁺），"
        "Cu²⁺在阴极沉积为高纯铜（Cu²⁺+2e⁻→Cu）。"
        "阳极中比铜不活泼的杂质（Au、Ag、Pt）沉于槽底形成阳极泥可回收贵金属。"
        "电解精炼可获得纯度99.99%以上的精铜，是生产高导电性电线电缆的必备工艺"
    )

def desc_electrolysis_al2o3(r):
    return join_parts(
        "熔融氧化铝在冰晶石（Na₃AlF₆）助熔下通电电解分解为金属铝和氧气。"
        "Al³⁺在阴极被还原为液态铝，O²⁻在阳极被氧化为O₂。"
        "冰晶石将Al₂O₃熔点从2050°C降至约950°C大幅降低能耗，"
        "即工业上Hall-Héroult法电解制铝。铝是产量最大的有色金属广泛用于航空、建筑和包装"
    )

def desc_sucrose_hydrolysis(r):
    return join_parts(
        "蔗糖在稀酸或蔗糖酶催化下水解生成等摩尔葡萄糖和果糖。"
        "蔗糖由α-葡萄糖和β-果糖通过α-1,2-糖苷键缩合而成，水解时糖苷键断裂。"
        "产物转化糖比蔗糖更甜且不易结晶，广泛用于糖果和饮料工业。"
        "人体小肠中蔗糖酶催化此水解反应，将蔗糖消化为单糖后被吸收利用"
    )

def desc_starch_hydrolysis(r):
    return join_parts(
        "淀粉在酸或淀粉酶催化下水解最终生成葡萄糖。"
        "淀粉是由α-葡萄糖单元通过糖苷键连接的多糖，水解逐步进行："
        "淀粉→糊精→麦芽糖→葡萄糖，可用碘液检验水解程度（蓝色→红色→无色）。"
        "此反应是工业制葡萄糖和饴糖的基础，也是人体消化淀粉获取能量的核心生化过程"
    )

def desc_fat_saponification(r):
    return join_parts(
        "油脂与氢氧化钠溶液共热发生碱性水解（皂化反应）生成硬脂酸钠（肥皂）和甘油。"
        "酯键在碱性条件下断裂，OH⁻亲核进攻酯羰基碳，脂肪酸与Na⁺结合形成肥皂。"
        "加食盐可盐析出固体肥皂。皂化反应是制皂工业的基础，"
        "甘油是重要化工原料用于化妆品、食品和炸药生产"
    )

def desc_phenol_formaldehyde(r):
    return join_parts(
        "苯酚与甲醛在酸碱催化下发生缩聚反应生成酚醛树脂（电木）。"
        "甲醛羰基碳受苯酚邻对位活性氢进攻，经羟甲基化后脱水缩合形成-CH₂-桥键三维网状高分子。"
        "酚醛树脂是1907年Baekeland发明的第一种完全人工合成塑料，"
        "具有优良耐热性、电绝缘性和机械强度，开创了人工合成高分子材料时代"
    )

def desc_urea_formaldehyde(r):
    return join_parts(
        "尿素与甲醛发生缩聚反应生成脲醛树脂。"
        "尿素中-NH₂基团与甲醛羰基亲核加成，经羟甲基化后缩合脱水形成三维网状高分子。"
        "脲醛树脂成本低廉、固化快，广泛用作木材粘合剂（刨花板、胶合板、纤维板）。"
        "需注意脲醛树脂可能缓慢释放甲醛，室内装修应选环保标准产品"
    )

def desc_melamine_formaldehyde(r):
    return join_parts(
        "三聚氰胺与甲醛发生缩聚反应生成密胺树脂（三聚氰胺-甲醛树脂）。"
        "三聚氰胺的-NH₂基团与甲醛发生羟甲基化和缩合形成三维交联高分子。"
        "密胺树脂无毒无味、耐热、表面硬度高，"
        "广泛用于餐具、装饰板材和涂料。密胺餐具轻便不易碎但不可微波炉加热"
    )

def desc_al_mno2(r):
    return join_parts(
        "铝粉与二氧化锰在高温下发生铝热反应，铝将锰从MnO₂中置换出来。"
        "铝从0价被氧化为+3价（Al₂O₃），锰从+4价被还原为0价。"
        "反应放出大量热使温度高达2000°C以上。"
        "铝热反应利用铝的强还原性将活泼性较低金属从氧化物中还原，"
        "广泛用于野外铁轨焊接和难熔金属冶炼"
    )

def desc_cr2o3_al(r):
    return join_parts(
        "氧化铬与铝粉在高温下发生铝热反应生成铬和氧化铝。"
        "铝从0价被氧化为+3价，铬从+3价被还原为0价。"
        "Cr₂O₃为绿色固体，是铬最稳定氧化物。"
        "此反应用于金属铬冶炼——铬是冶炼不锈钢（含Cr≥12%）和高速工具钢的关键合金元素"
    )

def desc_cl_na_ti(r):
    return join_parts(
        "钠与熔融四氯化钛发生金属热还原反应，钠将钛从TiCl₄中还原。"
        "钠从0价被氧化为+1价（NaCl），钛从+4价被还原为0价。"
        "钛为银白色过渡金属，密度小强度高耐腐蚀，被誉为太空金属和海洋金属。"
        "此反应是工业Kroll法制钛关键步骤，海绵钛广泛用于航空航天和医疗器械"
    )

def desc_cu_h2so4(r):
    return join_parts(
        "铜与浓硫酸在加热条件下发生氧化还原反应生成硫酸铜、二氧化硫和水。"
        "铜从0价被氧化为+2价，浓硫酸中+6价硫被还原为+4价（SO₂），"
        "体现了浓硫酸的强氧化性（稀硫酸不能与铜反应）。"
        "溶液变蓝（Cu²⁺），产生刺激性SO₂气体。"
        "CuSO₄·5H₂O（胆矾）用于电镀、农药（波尔多液）和木材防腐"
    )

def desc_c_hno3(r):
    return join_parts(
        "碳与浓硝酸在加热条件下发生氧化还原反应，碳被氧化为CO₂，浓硝酸被还原为NO₂。"
        "碳从0价被氧化为+4价，硝酸中+5价氮被还原为+4价（NO₂红棕色气体），"
        "体现浓硝酸能将非金属碳氧化的强氧化性。"
        "浓硝酸是三大强酸之一兼具强氧化性，能氧化大多数金属和非金属"
    )

def desc_s_hno3(r):
    return join_parts(
        "硫与浓硝酸在加热条件下发生氧化还原反应生成硫酸和NO₂。"
        "硫从0价被氧化为+6价（H₂SO₄），硝酸中+5价氮被还原为+4价（NO₂）。"
        "反应产生大量红棕色NO₂气体，硫逐渐溶解。"
        "此反应体现浓硝酸能将非金属氧化至最高价态的强氧化性"
    )

def desc_p_hno3(r):
    return join_parts(
        "磷与浓硝酸在加热条件下发生氧化还原反应生成磷酸和NO₂。"
        "磷从0价被氧化为+5价（H₃PO₄），硝酸中+5价氮被还原为+4价。"
        "反应剧烈放热产生大量红棕色NO₂气体。"
        "H₃PO₄用于生产磷肥、食品添加剂和金属表面磷化处理"
    )

def desc_i_hno3(r):
    return join_parts(
        "碘与浓硝酸在加热条件下发生氧化还原反应生成碘酸（HIO₃）和NO₂。"
        "碘从0价被氧化为+5价，硝酸中+5价氮被还原为+4价。"
        "HIO₃为白色晶体是强氧化剂可用于碘量法标准溶液配制。"
        "碘被氧化到+5价而非+7价体现了浓硝酸氧化能力的限度"
    )

def desc_fe_zn(r):
    return join_parts(
        "锌与亚铁离子在溶液中发生置换反应，锌将Fe²⁺置换为单质铁。"
        "锌比铁活泼（金属活动性顺序Zn>Fe），Zn被氧化为Zn²⁺，Fe²⁺被还原为Fe。"
        "反应可观察到溶液颜色变化和铁在锌表面析出，"
        "是金属活动性顺序的典型应用——活泼金属将较不活泼金属从其盐溶液中置换"
    )

def desc_cu_ag(r):
    return join_parts(
        "铜与银离子在溶液中发生置换反应，铜将Ag⁺置换为单质银。"
        "铜比银活泼，Cu被氧化为Cu²⁺（溶液变蓝），Ag⁺被还原为Ag（银白色树枝状晶体析出）。"
        "此反应是湿法冶金提取银的化学原理，"
        "也常用于演示金属活动性顺序和金属树生长过程"
    )


def desc_co_disprop(r):
    return join_parts(
        "一氧化碳在高温条件下发生歧化反应生成碳和二氧化碳（2CO→C+CO₂）。"
        "CO中碳为+2价，歧化后一部分碳被还原为0价（单质碳），另一部分被氧化为+4价（CO₂），"
        "是典型的自身氧化还原反应。"
        "此反应在高炉炼铁中有重要意义——CO还原铁矿石时可能发生此副反应，"
        "生成的碳在高温下渗入铁中影响钢铁含碳量。"
        "CO的歧化也是碳纳米管和碳纤维制备的方法之一"
    )


def desc_c_h2o(r):
    return join_parts(
        "碳与水蒸气在高温条件下发生氧化还原反应生成甲烷和二氧化碳（2C+2H₂O→CH₄+CO₂）。"
        "碳从0价被氧化为+4价（CO₂）和被还原为-4价（CH₄），发生歧化；"
        "水中+1价氢被还原为-4价（CH₄中）。"
        "此反应是煤气化和生物质气化中可能发生的副反应，"
        "产物CH₄和CO₂的混合物可作为燃料气体使用"
    )


def desc_ch4_h2o_reform(r):
    return join_parts(
        "甲烷与水蒸气在催化剂和高温条件下发生重整反应生成氢气和一氧化碳（CH₄+H₂O→3H₂+CO）。"
        "这是工业上天然气蒸汽重整制氢的核心反应，"
        "生成的H₂和CO混合物（合成气）是合成氨、甲醇和费托合成液体燃料的基础原料。"
        "该反应为强吸热反应，需在镍基催化剂和800-900°C高温下进行，"
        "是目前全球氢气生产的主要方法"
    )


def desc_ch4_s(r):
    return join_parts(
        "甲烷与硫在催化剂和高温条件下反应生成二硫化碳和硫化氢（CH₄+4S→CS₂+2H₂S）。"
        "硫从0价被还原为-2价（H₂S和CS₂中），碳从-4价被氧化为+4价（CS₂中）。"
        "此反应用于工业制备二硫化碳（CS₂），CS₂是重要有机溶剂，"
        "用于生产粘胶纤维、玻璃纸和四氯化碳。反应产生的H₂S需用碱液吸收处理"
    )


def desc_f_h(r):
    return join_parts(
        "氟气与氢气在常温下即可发生爆炸性化合反应生成氟化氢（HF）。"
        "F₂和H₂均从0价分别变为-1价和+1价。"
        "氟是电负性最强、最活泼的非金属元素，与氢气的反应即使在黑暗和低温下也能瞬间完成。"
        "HF为无色气体或液体，具有强烈腐蚀性，能腐蚀玻璃（与SiO₂反应生成SiF₄），"
        "需用铅、蜡或塑料容器储存。HF用于蚀刻玻璃和制备氟利昂等含氟化合物"
    )


def desc_h_s(r):
    return join_parts(
        "氢气与硫蒸气在加热条件下化合生成硫化氢（H₂S）。"
        "氢气从0价被氧化为+1价，硫从0价被还原为-2价，反应放热（ΔH = -20.6 kJ/mol）。"
        "H₂S为无色气体，有臭鸡蛋气味，密度比空气大，能溶于水形成弱酸性的氢硫酸。"
        "H₂S有剧毒，是大气污染物之一，也是实验室中用于阳离子定性分析（硫化物沉淀法）的重要试剂"
    )


def desc_c_co2(r):
    return join_parts(
        "碳与二氧化碳在高温条件下发生氧化还原反应生成一氧化碳（C+CO₂→2CO）。"
        "碳从0价被氧化为+2价，CO₂中+4价碳被还原为+2价。"
        "此反应是煤气发生炉中产生CO的重要反应之一——"
        "将空气通过灼热焦炭，先生成CO₂，CO₂再被上层焦炭还原为CO。"
        "CO是重要的气体燃料和化工原料，用于合成甲醇和金属冶炼的还原剂"
    )


def desc_na_o(r):
    return join_parts(
        "钠在常温下与氧气缓慢反应生成氧化钠（Na₂O）。"
        "钠从0价被氧化为+1价，氧气被还原为-2价。"
        "Na₂O为白色固体，是典型的碱性氧化物，与水剧烈反应生成NaOH。"
        "正是由于钠在空气中极易氧化，实验室中钠需保存在煤油中以隔绝空气和水分。"
        "Na₂O在玻璃制造中用作助熔剂降低熔融温度"
    )


def desc_k_o2(r):
    return join_parts(
        "钾在过量氧气中点燃生成超氧化钾（KO₂）而非普通氧化物K₂O。"
        "KO₂中氧为-1/2价（超氧离子O₂⁻），钾为+1价。"
        "KO₂为黄色固体，是重要的供氧剂——"
        "能与水或CO₂反应释放O₂（4KO₂+2CO₂→2K₂CO₃+3O₂），"
        "因此用于潜艇、航天器和矿用自救器中的氧气再生装置"
    )


def desc_pb_s(r):
    return join_parts(
        "铅与硫在加热条件下化合生成硫化铅（PbS）。"
        "铅从0价被氧化为+2价，硫从0价被还原为-2价。"
        "PbS为黑色固体，不溶于水，自然界中以方铅矿形式存在，是炼铅的最主要原料。"
        "PbS具有半导体性质，早期用于制造无线电检波器（方铅矿检波器），"
        "也用作光电导材料（PbS红外探测器）"
    )


def desc_k_i(r):
    return join_parts(
        "钾与碘在加热条件下化合生成碘化钾（KI）。"
        "钾从0价被氧化为+1价，碘从0价被还原为-1价。"
        "KI为无色或白色立方晶体，易溶于水，水溶液呈中性。"
        "KI是重要的碘源，用于防治碘缺乏病（加碘食盐）、"
        "在核事故中用作甲状腺保护剂（阻断放射性碘吸收），"
        "也是实验室中碘量法分析的重要试剂"
    )


def desc_ba_s(r):
    return join_parts(
        "钡与硫在加热条件下化合生成硫化钡（BaS）。"
        "钡从0价被氧化为+2价，硫从0价被还原为-2价。"
        "BaS为无色或浅灰色固体，具有NaCl型晶体结构。"
        "BaS是制备其他钡化合物的重要中间体——"
        "在工业上与硫酸锌反应可制取锌钡白（立德粉）白色颜料，"
        "广泛用于涂料、油墨和橡胶填充剂。注意钡盐有毒需妥善处理"
    )


def desc_cu_s2(r):
    return join_parts(
        "铜与过量硫在加热条件下化合生成硫化铜（CuS）。"
        "铜从0价被氧化为+2价，硫从0价被还原为-2价。"
        "CuS为黑色固体，不溶于水和稀酸，但可溶于热的稀硝酸和氰化物溶液。"
        "CuS在自然界中以铜蓝（covellite）矿物存在，是炼铜的原料之一。"
        "在分析化学中，利用CuS不溶于稀酸的特性可将Cu²⁺与其他离子分离"
    )


def desc_c_f(r):
    return join_parts(
        "碳与氟气在常温下直接化合生成四氟化碳（CF₄）。"
        "碳从0价被氧化为+4价，氟从0价被还原为-1价。"
        "CF₄为无色无味气体，化学性质极其稳定，不燃无毒，"
        "但属于强温室气体（温室效应约为CO₂的6500倍，大气寿命约50000年）。"
        "CF₄在半导体工业中用作等离子刻蚀气体，也用于制备其他含氟有机化合物"
    )


def desc_mg_s(r):
    return join_parts(
        "镁与硫在加热条件下化合生成硫化镁（MgS）。"
        "镁从0价被氧化为+2价，硫从0价被还原为-2价。"
        "MgS为无色或浅黄色固体，具有NaCl型晶体结构。"
        "MgS在潮湿空气中缓慢水解产生H₂S气体。"
        "MgS可作为荧光材料的基质，掺杂稀土离子（如Eu²⁺）后可发出橙红色荧光，用于显示器和照明领域"
    )


# ============================================================
# 扩大的特殊反应ID映射表
# ============================================================

SPECIAL_GENERATORS = {
    # 化合反应 - 非金属 + 非金属/金属
    'h-o': desc_h_o,
    'h-cl': desc_h_cl,
    'h-n': desc_h_n,
    'h-c': desc_h_c,
    'c-o': desc_c_o,
    'c-o2': desc_c_o2,
    'n-o': desc_n_o,
    'n-o2': desc_n_o2,
    's-o': desc_s_o,
    'p-o': desc_p_o,
    'p-o-p2o3': desc_p_o2,
    'zn-o': desc_zn_o,
    'li-o': desc_li_o,
    'ag-s': desc_ag_s,
    'fe-s': desc_fe_s,
    'cu-s': desc_cu_s,
    'zn-s': desc_zn_s,
    'na-s': desc_na_s,
    'k-cl': desc_k_cl,
    'c-s': desc_c_s,
    'si-c': desc_si_c,
    'mg-o': desc_mg_o,
    'fe-o': desc_fe_o,
    'cu-o': desc_cu_o,
    'na-cl': desc_na_cl,
    'ca-o': desc_ca_o,
    'al-o': desc_al_o,
    'k-o': desc_k_o,
    'fe-cl': desc_fe_cl,
    'cu-cl': desc_cu_cl,
    'fe-o2-fe2o3': desc_fe_o2,
    'cu-o-cu2o': desc_cu_o2,
    'mn-o2': desc_mn_o2,
    'mg-n2-mg3n2': desc_mg_n2,
    'mg-s': desc_mg_s,

    # 简单化合反应（缺字段的）
    'h-s': desc_h_s,
    'redox-c-co2': desc_c_co2,
    'na-o-na2o': desc_na_o,
    'k-o-ko2': desc_k_o2,
    'pb-s': desc_pb_s,
    'k-i': desc_k_i,
    'ba-s': desc_ba_s,
    'cu-s-cus': desc_cu_s2,
    'c-f': desc_c_f,

    # 碱性氧化物 + 水
    'cao-h2o-caoh2': desc_cao_h2o,
    'mgo-h2o-mgoh2': desc_mgo_h2o,
    'na2o-h2o-naoh': desc_na2o_h2o,
    'k2o-h2o-koh': desc_k2o_h2o,
    'bao-h2o-baoh2': desc_bao_h2o,

    # 过氧化物
    'na2o2-h2o-naoh-o2': desc_na2o2_h2o,
    'na2o2-co2-na2co3-o2': desc_na2o2_co2,

    # 金属与水蒸气
    'fe-h2o-fe3o4-h2': desc_fe_h2o,
    'zn-h2o-zno-h2': desc_zn_h2o,
    'al-h2o-aloh3-h2': desc_al_h2o,

    # 铁的氧化物 + CO（高炉炼铁）
    'fe2o3-co-fe-co2': desc_fe2o3_co,
    'fe3o4-co-fe-co2': desc_fe3o4_co,
    'feo-co-fe-co2': desc_feo_co,

    # 金属 + CO₂
    'mg-co2-mgo-c': desc_mg_co2,
    'zn-co2-zno-c': desc_zn_co2,

    # 氧化还原
    'fecl2-cl2-fecl3': desc_fecl2_cl2,
    'phet-f2-h2o-of2': desc_f2_h2o,
    'dichromate-fe2-redox': desc_dichromate_fe2,

    # 其他
    'ca3p2-h2o-caph2': desc_ca3p2_h2o,
    'phet-c2h6-cl2-sub': desc_c2h6_cl2_sub,
    'chromate-dichromate-conversion': desc_chromate_dichromate,

    # 分解
    'phet-c2h6-decomp': desc_c2h6_decomp,
    'edu-mgcl2-electrolysis': desc_mgcl2_electrolysis,

    # 电解
    'electrolysis-agno3': desc_electrolysis_agno3,
    'electrochem-electroplate-zn': desc_electroplate_zn,
    'electrochem-electrorefine-cu': desc_electrorefine_cu,
    'electrolysis-al2o3': desc_electrolysis_al2o3,

    # 水解
    'organic-sucrose-hydrolysis': desc_sucrose_hydrolysis,
    'organic-starch-hydrolysis': desc_starch_hydrolysis,
    'organic-fat-saponification': desc_fat_saponification,

    # 缩聚
    'organic-phenol-formaldehyde': desc_phenol_formaldehyde,
    'organic-urea-formaldehyde': desc_urea_formaldehyde,
    'organic-melamine-formaldehyde': desc_melamine_formaldehyde,

    # 铝热反应
    'al-mno2-al2o3-mn': desc_al_mno2,
    'cr2o3-al-cr-al2o3': desc_cr2o3_al,
    'cl-na': desc_cl_na_ti,

    # 浓硫酸/浓硝酸氧化
    'cu-h2so4-cuso4-so2': desc_cu_h2so4,
    'c-hno3-co2-no2': desc_c_hno3,
    's-hno3-h2so4-no2': desc_s_hno3,
    'p-hno3-h3po4-no2': desc_p_hno3,
    'i2-hno3-hio3-no2': desc_i_hno3,

    # 金属置换
    'fe-zn': desc_fe_zn,
    'cu-ag': desc_cu_ag,

    # CO歧化
    'phet-co-disprop': desc_co_disprop,

    # 特殊其他反应
    'phet-c-h2o-ch4-co2': desc_c_h2o,
    'phet-ch4-h2o-reform': desc_ch4_h2o_reform,
    'phet-ch4-s-cs2-h2s': desc_ch4_s,
    'f-h': desc_f_h,
}


# ============================================================
# 改进的通用生成器 - 按反应类型
# ============================================================

def gen_generic(reaction):
    """通用描述生成器：基于已有字段自然整合"""
    eq = reaction.get('equation', '')
    cond = reaction.get('condition', '')
    pn = reaction.get('productName', '')
    pf = reaction.get('product', '')
    rtype = reaction.get('type', '')
    ph = reaction.get('phenomenon', '')
    ind = reaction.get('industrialUse', '')
    dly = reaction.get('dailyLife', '')
    ent = reaction.get('enthalpy', '')

    # 反应概述 - 基于类型定制
    if rtype == '化合':
        overview = f"{eq}在{cond}条件下发生化合反应生成{pn}（{pf}），属于化合反应（A+B→AB）。"
    elif rtype == '分解':
        overview = f"{eq}在{cond}条件下发生分解反应生成{pn}，属于分解反应（AB→A+B）。"
    elif rtype == '置换':
        overview = f"{eq}在{cond}条件下发生置换反应生成{pn}，属于置换反应（A+BC→AC+B），较活泼单质将较不活泼元素从化合物中置换出来。"
    elif rtype == '复分解':
        overview = f"{eq}在{cond}条件下发生复分解反应生成{pn}，两种化合物互相交换成分（阴、阳离子）。复分解反应发生的条件是有沉淀、气体或弱电解质生成。"
    elif rtype == '氧化还原':
        overview = f"{eq}在{cond}条件下发生氧化还原反应生成{pn}，反应中发生了电子转移和元素化合价变化。"
    elif rtype == '电解':
        overview = f"{eq}在{cond}条件下发生电解反应生成{pn}，外加电能驱动非自发的氧化还原反应。"
    elif rtype == '水解':
        overview = f"{eq}在{cond}条件下发生水解反应生成{pn}，水分子参与反应使化学键断裂并重新组合。"
    elif rtype == '取代':
        overview = f"{eq}在{cond}条件下发生取代反应生成{pn}，有机分子中某原子或原子团被取代。"
    elif rtype in ('加聚', '缩聚'):
        overview = f"{eq}在{cond}条件下发生{rtype}反应生成{pn}，单体分子通过化学键连接形成高分子聚合物。"
    elif rtype == '消去':
        overview = f"{eq}在{cond}条件下发生消去反应生成{pn}，有机分子中脱去小分子形成不饱和键。"
    else:
        overview = f"{eq}在{cond}条件下发生{rtype}反应生成{pn}。"

    # 现象
    phenom_part = ph.rstrip('。') + "。" if ph else ""

    # 产物性质 - 只在有额外内容时才添加，避免套话
    product_part = ""

    # 如果没有任何额外字段，添加基于类型的补充说明（不重复overview已包含的信息）
    if not any([ph, ind, dly, ent]):
        if rtype == '化合':
            product_part = "该反应体现了元素间直接化合的能力，是制备化合物的重要途径。"
        elif rtype == '分解':
            product_part = "分解反应需要外界提供能量来断裂化学键，是制备单质或简单化合物的重要方法。"
        elif rtype == '置换':
            product_part = "置换反应直观展示了元素活泼性的差异，是湿法冶金和金属提取的重要原理。"
        elif rtype == '复分解':
            product_part = "复分解反应广泛用于离子鉴别、物质制备和工业除杂等过程。"
        elif rtype == '氧化还原':
            product_part = "氧化还原反应是自然界和工业生产中最普遍的反应类型之一，涉及能量的转化与利用。"
        elif rtype == '电解':
            product_part = "电解是实现非自发反应的重要手段，在金属冶炼和电化学工业中具有核心地位。"
        elif rtype == '水解':
            product_part = "水解反应在生物体内新陈代谢和工业生产中都具有重要意义。"
        elif rtype in ('加聚', '缩聚'):
            product_part = f"{rtype}反应是现代高分子材料工业的化学基础。"
        elif rtype == '取代':
            product_part = "取代反应是改造有机分子结构、引入新官能团的基本手段。"
        elif rtype == '消去':
            product_part = "消去反应是制备含不饱和键化合物的重要方法，在有机合成中应用广泛。"
        else:
            product_part = "该反应体现了化学变化的多样性，是理解化学反应原理的重要实例。"

    # 工业应用
    ind_part = f"工业上{ind}。" if ind else ""

    # 生活应用
    dly_part = f"生活中{dly}。" if dly else ""

    # 热化学
    ent_part = f"热化学数据方面{ent}。" if ent else ""

    return join_parts(overview, phenom_part, product_part, ind_part, dly_part, ent_part)


# ============================================================
# 主处理
# ============================================================

TYPE_GENERATORS = {
    '化合': gen_generic,
    '分解': gen_generic,
    '置换': gen_generic,
    '氧化还原': gen_generic,
    '电解': gen_generic,
    '水解': gen_generic,
    '取代': gen_generic,
    '加聚': gen_generic,
    '缩聚': gen_generic,
    '复分解': gen_generic,
    '消去': gen_generic,
    '其他': gen_generic,
}


def generate_description(reaction):
    """根据反应ID或类型生成描述"""
    rid = reaction.get('id', '')
    if rid in SPECIAL_GENERATORS:
        return SPECIAL_GENERATORS[rid](reaction)
    rtype = reaction.get('type', '其他')
    gen = TYPE_GENERATORS.get(rtype, gen_generic)
    return gen(reaction)


def process_reactions(input_path, output_path):
    with open(input_path, 'r', encoding='utf-8') as f:
        reactions = json.load(f)

    total = len(reactions)
    updated = 0
    skipped = 0

    for r in reactions:
        old = r.get('description', '')
        if needs_update(old):
            new = generate_description(r)
            new = new.rstrip('。') + '。'
            r['description'] = new
            updated += 1
            if updated <= 5:
                print(f"\n[{r['id']}] 已更新 ({len(old)}字 -> {len(new)}字)")
                print(f"  旧: {old}")
                print(f"  新: {new[:150]}...")
        else:
            skipped += 1

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(reactions, f, ensure_ascii=False, indent=2)

    print(f"\n处理完成: 总{total}条, 更新{updated}条, 保持不变{skipped}条")

    # 验证
    lens = [len(r.get('description', '')) for r in reactions]
    very_short = [(r['id'], len(r.get('description', '')))
                  for r in reactions if len(r.get('description', '')) < 50]
    print(f"描述长度: 最短{min(lens)}, 最长{max(lens)}, 平均{sum(lens)/len(lens):.1f}")
    if very_short:
        print(f"仍有{len(very_short)}条极短(<50字): {very_short[:5]}")


if __name__ == '__main__':
    process_reactions(
        '/workspace/chem/src/data/reactions.json',
        '/workspace/chem/src/data/reactions.json'
    )
