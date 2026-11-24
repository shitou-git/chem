/**
 * 3D 虚拟实验台 - 化合反应实验数据
 *
 * 每个实验描述一套可在 3D 场景中演示的化合反应：
 * 器材、试剂、操作步骤、现象，以及驱动 3D 动画的视觉参数。
 */

/** 试剂在 3D 场景中的形态 */
export type ReagentForm = "strip" | "wire" | "powder" | "sheet" | "gas";

/** 反应容器类型 */
export type ApparatusType = "crucible" | "gasJar" | "testTube";

/** 生成物形态 */
export type ProductForm = "powder" | "lump" | "droplets" | "gas";

export interface LabReagent {
  name: string;
  formula: string;
  color: string;
  form: ReagentForm;
}

export interface LabEffect {
  /** 火焰主色 */
  flameColor: string;
  /** 火焰相对大小 0.6 ~ 1.6 */
  flameSize: number;
  /** 反应时环境辉光色 */
  glowColor: string;
  /** 辉光强度 0 ~ 3 */
  glowIntensity: number;
  /** 烟的颜色（不产生烟则可省略） */
  smokeColor?: string;
  /** 烟量 0 ~ 1 */
  smokeIntensity?: number;
  /** 是否迸发火星 */
  sparks?: boolean;
  /** 火星颜色 */
  sparkColor?: string;
  /** 生成物颜色 */
  productColor: string;
  /** 生成物形态 */
  productForm: ProductForm;
}

/** 课本式探究：先猜一猜 */
export interface LabPredict {
  /** 预测问题（可含 <b> 标签） */
  question: string;
  /** 课本出处提示 */
  hint: string;
  options: string[];
  /** 正确选项下标 */
  answer: number;
  /** 答对后的提示 */
  correct: string;
  /** 答错后的提示 */
  wrong: string;
}

/** 课本式探究：课本结论 */
export interface LabTextbook {
  /** 课本页码，如「第 38–41 页」 */
  page: string;
  /** 章节，如「第二单元 课题2 氧气」 */
  chapter: string;
  /** 课本原文引用 */
  quote: string;
  /** 课本中的文字表达式 */
  expression: string;
  /** 结论解读（可含 <b> 标签） */
  why: string;
}

export interface VirtualLabExperiment {
  id: string;
  /** 对应 reactions.json 中的反应 id */
  reactionId: string;
  title: string;
  equation: string;
  productName: string;
  condition: string;
  apparatus: ApparatusType;
  /** 反应环境说明，如「氧气中」「空气中」 */
  medium: string;
  reagents: LabReagent[];
  effect: LabEffect;
  steps: string[];
  phenomenon: string;
  safety: string;
  /** 现象动画时长（秒） */
  duration: number;
  /** 课本式探究：先猜一猜 */
  predict: LabPredict;
  /** 课本式探究：结论对照 */
  textbook: LabTextbook;
}

export const VIRTUAL_LABS: VirtualLabExperiment[] = [
  {
    id: "lab-mg",
    reactionId: "mg-o",
    title: "镁条燃烧",
    equation: "2Mg + O₂ → 2MgO",
    productName: "氧化镁",
    condition: "点燃",
    apparatus: "crucible",
    medium: "空气中",
    reagents: [{ name: "镁条", formula: "Mg", color: "#D8DDE6", form: "strip" }],
    effect: {
      flameColor: "#FFFFFF",
      flameSize: 1.6,
      glowColor: "#FFF6D8",
      glowIntensity: 2.8,
      sparks: true,
      sparkColor: "#FFFBE6",
      smokeColor: "#F2F4F8",
      smokeIntensity: 0.35,
      productColor: "#F5F5F5",
      productForm: "powder",
    },
    steps: ["取一段打磨光亮的镁条", "用坩埚钳夹住，移至酒精灯火焰上", "点燃后迅速移入坩埚上方观察"],
    phenomenon: "镁条剧烈燃烧，发出耀眼白光（不可直视），放出大量热，生成白色粉末状固体氧化镁。",
    safety: "燃烧时发出的强光会伤害眼睛，切勿直视，应通过变色玻璃观察。",
    duration: 4,
    predict: {
      question: "点燃一段打磨光亮的镁条，会观察到什么？",
      hint: "课本第 110–115 页 · 第五单元 质量守恒定律（实验 5-2）",
      options: [
        "发出耀眼白光，放热，生成白色粉末",
        "产生淡蓝色火焰，生成无色气体",
        "只是红热，不燃烧",
      ],
      answer: 0,
      correct: "答对了。镁条燃烧发出耀眼白光，生成白色粉末氧化镁。",
      wrong: "再想想：镁是活泼金属，在空气中点燃后会剧烈燃烧，生成白色固体氧化镁。",
    },
    textbook: {
      page: "第 110–115 页",
      chapter: "第五单元 课题1 质量守恒定律",
      quote:
        "质量守恒定律是指参加化学反应的各物质的质量总和，等于反应后生成的各物质的质量总和。化学反应前后，原子的种类、数目和质量不变，因此化学反应前后各物质的质量总和必然相等。",
      expression: "镁 + 氧气 —点燃→ 氧化镁",
      why:
        "镁条燃烧时发出<b>耀眼的白光</b>，放出大量的热，生成<b>白色粉末</b>氧化镁。它是两种物质生成另一种物质的反应，属于<b>化合反应</b>。<br>注意：参加反应的氧气来自空气，反应前没有称进去；生成的氧化镁又有一部分以白烟散失，所以称量结果可能变大也可能变小——这并不违背质量守恒定律，验证时要考虑气体的进出。",
    },
  },
  {
    id: "lab-fe",
    reactionId: "fe-o",
    title: "铁丝在氧气中燃烧",
    equation: "3Fe + 2O₂ → Fe₃O₄",
    productName: "四氧化三铁",
    condition: "点燃",
    apparatus: "gasJar",
    medium: "氧气中",
    reagents: [{ name: "细铁丝", formula: "Fe", color: "#9AA3B2", form: "wire" }],
    effect: {
      flameColor: "#FF8A1E",
      flameSize: 1.1,
      glowColor: "#FF6D00",
      glowIntensity: 1.5,
      sparks: true,
      sparkColor: "#FFC233",
      productColor: "#1C1C22",
      productForm: "lump",
    },
    steps: ["将细铁丝绕成螺旋状，下端系一根火柴", "点燃火柴，待快燃尽时", "由上而下缓慢伸入盛有氧气的集气瓶中"],
    phenomenon: "细铁丝在氧气中剧烈燃烧，火星四射，放出大量热，生成黑色固体四氧化三铁。",
    safety: "集气瓶底部预先放少量水或细沙，防止高温熔融物溅落炸裂瓶底。",
    duration: 5,
    predict: {
      question: "细铁丝在酒精灯上烧——在<b>空气</b>里，和在一瓶<b>氧气</b>里，会怎样？",
      hint: "课本第 38–41 页 · 第二单元 课题2 氧气（实验 2-4）",
      options: [
        "在空气中只是红热、不燃烧；在氧气中剧烈燃烧，火星四射",
        "在空气和氧气中都剧烈燃烧",
        "在空气和氧气中都不能燃烧",
      ],
      answer: 0,
      correct: "答对了。空气中氧气只占约 1/5，铁丝只红热；在氧气瓶中才剧烈燃烧、火星四射。",
      wrong: "再想想：空气里氧气只有约 1/5，铁丝只是红热；在纯净氧气里才剧烈燃烧、火星四射。",
    },
    textbook: {
      page: "第 38–41 页",
      chapter: "第二单元 课题2 氧气",
      quote:
        "氧气的化学性质比较活泼，能支持燃烧，在一定条件下能与碳、硫、铁等发生反应。由两种或两种以上物质生成另一种物质的反应，叫作化合反应。物质与氧气发生的反应属于氧化反应。",
      expression: "铁 + 氧气 —点燃→ 四氧化三铁",
      why:
        "铁丝在氧气中剧烈燃烧，<b>火星四射</b>，生成黑色固体四氧化三铁。瓶底预先放少量水或细沙，是为了防止高温熔融物溅落<b>炸裂瓶底</b>。<br>同一种物质在氧气中比在空气中燃烧剧烈得多——物质在空气中燃烧，实际是和其中的氧气反应，而空气里氧气只占约 <b>1/5</b>。这个反应既是化合反应，也是氧化反应。",
    },
  },
  {
    id: "lab-s",
    reactionId: "s-o",
    title: "硫在氧气中燃烧",
    equation: "S + O₂ → SO₂",
    productName: "二氧化硫",
    condition: "点燃",
    apparatus: "gasJar",
    medium: "氧气中",
    reagents: [{ name: "硫粉", formula: "S", color: "#F4D03F", form: "powder" }],
    effect: {
      flameColor: "#7B2FF7",
      flameSize: 1.2,
      glowColor: "#5E35B1",
      glowIntensity: 1.4,
      smokeColor: "#B9A0E8",
      smokeIntensity: 0.5,
      productColor: "#AED6F1",
      productForm: "gas",
    },
    steps: ["取少量硫粉放入燃烧匙", "在酒精灯上点燃，硫先熔化再燃烧", "缓慢伸入盛有氧气的集气瓶中"],
    phenomenon: "硫在氧气中燃烧发出明亮的蓝紫色火焰（空气中为淡蓝色），生成有刺激性气味的无色气体二氧化硫。",
    safety: "二氧化硫有毒且刺激呼吸道，实验应在通风处进行，避免直接闻气体。",
    duration: 4,
    predict: {
      question: "同一份硫粉，在<b>空气</b>中和在<b>氧气</b>中燃烧，火焰颜色有什么不同？",
      hint: "课本第 38–41 页 · 第二单元 课题2 氧气（实验 2-3）",
      options: [
        "空气中淡蓝色，氧气中明亮的蓝紫色",
        "空气中蓝紫色，氧气中淡蓝色",
        "两处都是白色火焰",
      ],
      answer: 0,
      correct: "答对了。硫在空气中是微弱的淡蓝色火焰，在氧气中是明亮的蓝紫色火焰。",
      wrong: "再想想：氧气浓度越高燃烧越剧烈——空气中是淡蓝色，氧气中才是明亮的蓝紫色。",
    },
    textbook: {
      page: "第 38–41 页",
      chapter: "第二单元 课题2 氧气",
      quote:
        "氧气的化学性质比较活泼，能支持燃烧，在一定条件下能与碳、硫、铁等发生反应。由两种或两种以上物质生成另一种物质的反应，叫作化合反应。物质与氧气发生的反应属于氧化反应。",
      expression: "硫 + 氧气 —点燃→ 二氧化硫",
      why:
        "硫先熔化再燃烧。在空气中是微弱的<b>淡蓝色</b>火焰，在氧气中是明亮的<b>蓝紫色</b>火焰，放出热量，生成有刺激性气味的无色气体二氧化硫。<br>生成的二氧化硫有毒，会污染空气，实验应在通风处进行；集气瓶中预先放少量水可以吸收一部分二氧化硫，减少污染。",
    },
  },
  {
    id: "lab-p",
    reactionId: "p-o",
    title: "红磷燃烧",
    equation: "4P + 5O₂ → 2P₂O₅",
    productName: "五氧化二磷",
    condition: "点燃",
    apparatus: "gasJar",
    medium: "氧气中",
    reagents: [{ name: "红磷", formula: "P", color: "#A93226", form: "powder" }],
    effect: {
      flameColor: "#FF6B6B",
      flameSize: 1.2,
      glowColor: "#FF8A80",
      glowIntensity: 1.3,
      smokeColor: "#FFFFFF",
      smokeIntensity: 1,
      sparks: false,
      productColor: "#F5F5F5",
      productForm: "powder",
    },
    steps: ["取少量红磷放入燃烧匙", "在酒精灯火焰上点燃", "迅速伸入集气瓶并塞紧瓶塞"],
    phenomenon: "红磷剧烈燃烧，发出白光，放出大量热，产生大量白烟（五氧化二磷固体小颗粒）。",
    safety: "白烟会刺激呼吸道，不要吸入；操作时注意防火，实验后待冷却再打开瓶塞。",
    duration: 4,
    predict: {
      question: "红磷燃烧时看到的「白烟」是什么？",
      hint: "课本第 31–32 页 · 第二单元 课题1 我们周围的空气",
      options: [
        "五氧化二磷固体小颗粒",
        "水蒸气",
        "二氧化碳气体",
      ],
      answer: 0,
      correct: "答对了。白烟是生成的五氧化二磷固体小颗粒——「烟」是固体小颗粒，「雾」才是小液滴。",
      wrong: "再想想：化学里「烟」指固体小颗粒。红磷燃烧生成的是五氧化二磷白色固体。",
    },
    textbook: {
      page: "第 31–32 页",
      chapter: "第二单元 课题1 我们周围的空气",
      quote:
        "通过实验测定，空气的成分按体积计算，大约是：氮气 78%、氧气 21%、稀有气体 0.94%、二氧化碳 0.04%、其他气体 0.02%。",
      expression: "红磷 + 氧气 —点燃→ 五氧化二磷",
      why:
        "红磷剧烈燃烧，发出白光，产生<b>大量白烟</b>——白烟是五氧化二磷的固体小颗粒，不是气体。<br>课本用红磷燃烧来测定空气中氧气的含量：红磷消耗瓶里的氧气，生成的五氧化二磷是固体，冷却后瓶内压强变小，打开止水夹，水被压进瓶里，进入的水的体积约占瓶内空气的 <b>1/5</b>，说明氧气约占空气体积的 1/5。",
    },
  },
  {
    id: "lab-cu",
    reactionId: "cu-o",
    title: "铜片加热",
    equation: "2Cu + O₂ → 2CuO",
    productName: "氧化铜",
    condition: "加热",
    apparatus: "testTube",
    medium: "空气中",
    reagents: [{ name: "铜片", formula: "Cu", color: "#C8703C", form: "sheet" }],
    effect: {
      flameColor: "#FF9E2C",
      flameSize: 0.75,
      glowColor: "#FFB74D",
      glowIntensity: 0.6,
      sparks: false,
      productColor: "#141414",
      productForm: "lump",
    },
    steps: ["取一片光亮的紫红色铜片放入试管", "用酒精灯外焰加热铜片部位", "持续加热，观察铜片表面颜色变化"],
    phenomenon: "紫红色铜片在加热条件下表面逐渐变黑，生成黑色固体氧化铜。",
    safety: "试管受热后温度很高，不要用手直接触碰，冷却后再观察。",
    duration: 5,
    predict: {
      question: "把光亮的紫红色铜片放在酒精灯上持续加热，表面会变成什么颜色？",
      hint: "课本第 110–115 页 · 第五单元 质量守恒定律",
      options: [
        "逐渐变黑",
        "逐渐变白",
        "保持紫红色不变",
      ],
      answer: 0,
      correct: "答对了。铜和空气中的氧气反应，表面生成黑色的氧化铜。",
      wrong: "再想想：加热时铜与空气中的氧气反应，生成黑色固体氧化铜，所以表面会变黑。",
    },
    textbook: {
      page: "第 110–115 页",
      chapter: "第五单元 课题1 质量守恒定律",
      quote:
        "质量守恒定律是指参加化学反应的各物质的质量总和，等于反应后生成的各物质的质量总和。化学反应前后，原子的种类、数目和质量不变，因此化学反应前后各物质的质量总和必然相等。",
      expression: "铜 + 氧气 —加热→ 氧化铜",
      why:
        "紫红色的铜片加热后表面逐渐<b>变黑</b>，生成黑色固体氧化铜——铜与空气中的氧气发生了化合反应。<br>课本在质量守恒定律一节用「铜 + 氧气 → 氧化铜」作为方案之一：在<b>密闭</b>的锥形瓶里进行，参加反应的铜和氧气、生成的氧化铜都在瓶内，反应前后称得的质量相等。这说明化学反应前后原子的种类、数目和质量都不变。",
    },
  },
  {
    id: "lab-h2",
    reactionId: "h-o",
    title: "氢气燃烧",
    equation: "2H₂ + O₂ → 2H₂O",
    productName: "水",
    condition: "点燃",
    apparatus: "gasJar",
    medium: "空气中",
    reagents: [{ name: "氢气", formula: "H₂", color: "#8FD6FF", form: "gas" }],
    effect: {
      flameColor: "#8FD6FF",
      flameSize: 0.9,
      glowColor: "#B3E5FC",
      glowIntensity: 0.7,
      smokeColor: "#D6EAF8",
      smokeIntensity: 0.3,
      sparks: false,
      productColor: "#DCEEFB",
      productForm: "droplets",
    },
    steps: ["先检验氢气的纯度，确认纯净后再点燃", "从导管口点燃氢气", "在火焰上方罩一个干冷烧杯观察"],
    phenomenon: "氢气在空气中安静燃烧，发出淡蓝色火焰，放出热量，罩在火焰上方的烧杯内壁出现无色液滴（水）。",
    safety: "点燃前必须验纯，氢气与空气混合达到爆炸极限时遇明火会爆炸。",
    duration: 4,
    predict: {
      question: "点燃氢气前为什么一定要<b>检验纯度</b>？",
      hint: "课本第 91 页 · 第四单元 课题2 水的组成（实验 4-4）",
      options: [
        "混有空气的氢气遇明火可能爆炸",
        "不纯的氢气点不着",
        "为了让火焰更好看",
      ],
      answer: 0,
      correct: "答对了。氢气与空气混合，在爆炸极限内遇明火会爆炸，所以必须先验纯。",
      wrong: "再想想：氢气和空气混合后遇明火可能爆炸——尖锐爆鸣声表示不纯，声音很小才表示较纯。",
    },
    textbook: {
      page: "第 91 页",
      chapter: "第四单元 课题2 水的组成",
      quote:
        "混有一定量空气或氧气的氢气遇明火会发生爆炸，因此点燃氢气前一定要检验其纯度。……点燃氢气时，发出尖锐爆鸣声表明气体不纯，声音很小则表示气体较纯。研究表明，氢气在空气或氧气里燃烧生成水。",
      expression: "氢气 + 氧气 —点燃→ 水",
      why:
        "氢气在空气中安静燃烧，产生<b>淡蓝色火焰</b>；罩在火焰上方的干冷烧杯内壁出现<b>水雾</b>——说明氢气燃烧生成水，水里含有氢元素。<br>氢气和空气混合，氢气占 <b>4%~75%</b> 时遇明火都会爆炸（爆炸极限）。刚开始放出的气体混有装置里原有的空气，所以要先验纯：尖锐爆鸣声表示不纯，要继续收集再验；声音很小才表示较纯，可以点燃。",
    },
  },
];

/** 按 id 查找实验 */
export function getVirtualLab(id: string): VirtualLabExperiment | undefined {
  return VIRTUAL_LABS.find((lab) => lab.id === id);
}
