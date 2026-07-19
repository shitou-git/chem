# 化学方程式互动实验室

一个面向课堂演示的单页 Web 应用，让化学元素的"相遇"过程直观、可交互、易复用。

## 功能特性

- **元素周期表互动**：点击元素，系统自动高亮可与之发生反应的其他元素
- **反应方程式生成**：选择元素组合，实时展示配平后的化学方程式
- **AI 智能解释**：流式输出反应原理、工业应用、安全提示、延伸知识
- **双模式探索**：元素高亮模式 / 化合物链式模式
- **收藏与本地存储**：一键保存常用方程式到浏览器 localStorage
- **搜索定位**：输入元素符号或物质名称快速定位
- **响应式设计**：支持桌面端与移动端触摸操作

## 技术栈

- React 18 + TypeScript
- Vite 6
- Tailwind CSS 3
- Zustand 5 (状态管理)
- Lucide React (图标)
- Vitest (测试)

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 运行测试
npm run test

# TypeScript 类型检查
npm run check

# ESLint 检查
npm run lint
```

## AI 解释服务配置

项目使用 Agnes 2.0 Flash API 提供 AI 解释功能。

### 环境变量

在项目根目录创建 `.env` 文件：

```env
VITE_AGNES_API_URL=https://your-proxy-url.com
```

### Cloudflare Worker 代理（推荐）

为确保安全性和稳定性，建议通过 Cloudflare Worker 代理 AI 请求：

1. 部署 `worker/api01-worker.js` 到 Cloudflare Workers
2. 在 Worker 配置中添加环境变量 `API_KEY`（Agnes API 密钥）
3. 设置 `.env` 中的 `VITE_AGNES_API_URL` 为你的 Worker 域名

Worker 内置限流：每分钟最多 30 次请求/客户端。

## 反应库扩展

所有化学反应数据存储在 `src/data/reactions.json`，包含 400+ 条反应。

### 添加新反应

按照以下格式添加：

```json
{
  "id": "unique-id",
  "type": "化合",
  "reactants": ["H", "O"],
  "product": "H₂O",
  "productName": "水",
  "equation": "2H₂ + O₂ → 2H₂O",
  "condition": "点燃",
  "description": "氢气在氧气中燃烧生成水。"
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 唯一标识 |
| type | string | 否 | 反应类型：化合/分解/置换/复分解/氧化还原/其他 |
| reactants | string[] | 是 | 反应物元素符号列表 |
| product | string | 是 | 生成物化学式 |
| productName | string | 是 | 生成物中文名称 |
| equation | string | 是 | 配平后的方程式 |
| condition | string | 是 | 反应条件 |
| description | string | 否 | 简短说明 |

### 数据校验

项目使用 Zod 对反应数据进行运行时校验。启动时若数据格式错误会在控制台输出详细信息。

## 项目结构

```
chem-lab/
├── src/
│   ├── components/          # UI 组件
│   │   ├── PeriodicTable.tsx    # 元素周期表
│   │   ├── ElementCard.tsx      # 元素卡片
│   │   ├── ReactionStage.tsx    # 反应舞台
│   │   ├── AIExplainModal.tsx   # AI 解释弹窗
│   │   └── FavoritesDrawer.tsx  # 收藏夹抽屉
│   ├── data/               # 数据层
│   │   ├── elements.ts          # 元素数据
│   │   ├── reactions.ts         # 反应逻辑
│   │   └── reactions.json       # 反应库
│   ├── services/           # 服务层
│   │   └── aiExplainService.ts  # AI 解释服务
│   ├── store/              # 状态管理
│   │   └── chemStore.ts         # Zustand store
│   ├── pages/              # 页面
│   │   └── Home.tsx             # 主页
│   ├── lib/                # 工具函数
│   │   └── utils.ts             # 通用工具
│   ├── App.tsx             # 应用入口
│   └── main.tsx            # React 入口
├── worker/                 # Cloudflare Workers
│   └── api01-worker.js          # AI 代理 Worker
├── .github/workflows/      # CI 配置
│   └── ci.yml                   # GitHub Actions
└── vite.config.ts          # Vite 配置
```

## CI/CD

项目配置了 GitHub Actions CI，在 push 和 pull request 时自动运行：
- TypeScript 类型检查
- ESLint 代码检查
- Vitest 测试
- 生产构建

## 部署

### 静态部署

构建产物输出到 `dist/` 目录，可部署到任意静态托管服务：

```bash
npm run build
# 将 dist/ 目录上传到托管服务
```

### GitHub Pages

在仓库设置中配置 GitHub Pages，选择 `dist` 目录作为源。

### Cloudflare Pages

连接 GitHub 仓库，设置构建命令：

```
npm install && npm run build
```

输出目录：`dist`

## 许可证

MIT
