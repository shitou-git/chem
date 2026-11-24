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
  },
];

/** 按 id 查找实验 */
export function getVirtualLab(id: string): VirtualLabExperiment | undefined {
  return VIRTUAL_LABS.find((lab) => lab.id === id);
}
