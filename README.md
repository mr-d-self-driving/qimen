# 奇门遁甲 · AI 决策引擎

> **将三千年玄学智慧，接入现代 AI 推理引擎。**  
> 时家奇门拆补转盘法 × 全息八字子平推演 × 日月年运确定性评分 × Gemini 大模型 × Vue 全栈应用

<p align="center">
  <img src="https://i.imgur.com/8MVTjsS.jpeg" width="200" alt="奇门卡片详情"/>
  &nbsp;&nbsp;
  <img src="https://i.imgur.com/Dr5tEar.jpeg" width="200" alt="日运分数"/>
  &nbsp;&nbsp;
  <img src="https://i.imgur.com/503GVir.jpeg" width="200" alt="八字断语"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-gold?style=flat-square"/>
  <img src="https://img.shields.io/badge/powered%20by-Gemini-blue?style=flat-square"/>
  <img src="https://img.shields.io/badge/deploy-Cloudflare-F38020?style=flat-square"/>
  <img src="https://img.shields.io/badge/db-Supabase-3ECF8E?style=flat-square"/>
  <img src="https://img.shields.io/badge/frontend-Vue%203-41B883?style=flat-square"/>
</p>

---

## 项目简介

坊间的奇门工具要么只会排盘，要么只会复读术语。这个项目想做的是另一件事：**让 AI 在稳定的术数规则底座上做结构化推演，而不是让大模型凭空编玄学。**

用户只需提问，系统就会**自动判断这道题该用哪套术数体系回答**——是奇门遁甲、八字命理，还是两者联合推演——完全不需要用户自己选择。这套分流能力由本地关键词规则引擎与 Gemini Flash 意图分类器双重驱动：规则层优先完成高置信度路由，置信度不足时自动上升到 LLM 二次研判，输出 `qimen`（奇门具体事件）、`bazi`（八字宏观命局）、`hybrid`（奇门 × 八字联合）或 `clarify`（追问补全信息）四种 branch 之一，再把对应领域的取用神规则与命盘上下文注入主推演 Prompt。

八字与运势模块则把客观计算交给本地规则引擎：强弱、喜忌、神煞、刑冲合害、日月年评分都由确定性代码生成，LLM 只负责把结论写成可读、可行动的断语。

这不是套模板，是一套"**先自动分流知识体系，再规则先行、AI 表达**"的命理推演系统。

---

## 核心能力

### 自动术数分流引擎（核心枢纽）

这是系统的大脑，每次用户提问都经过它——**在任何推演开始之前，先决定用哪套知识体系**。

- **双层路由机制**：本地关键词规则（`divinationRouter`）优先分类，高置信度直接路由；低置信度时自动调用 Gemini Flash 做二次意图研判
- **四条分流路径**：
  - `qimen` — 具体事件、短期决策、成败应期（例：「这个 offer 要不要接？」）
  - `bazi` — 长期命局、行业适配、体质结构（例：「我未来五年适合创业吗？」）
  - `hybrid` — 宏观命局背景 × 眼前具体事件联合推演（例：「我今年事业运差，这个机会还能抓吗？」）
  - `clarify` — 信息不足，自动生成追问，引导用户补全关键要素，不进入推演
- **10 大问题域 · 30+ 子类别**：事业职场、求财投资、婚恋感情、健康疾病、交易失物、考试学习、官司法务、风水家宅、孕产子嗣、杂事
- 路由结果（branch / category / subcategory / confidence）透传给主推演引擎，精确注入对应领域的取用神规则与命盘上下文

### 奇门遁甲推演

- **时家奇门拆补转盘法**：实现甲子隐遁、符头定位、九星八门八神飞布
- 自动处理天芮 / 天禽中宫寄坤、日空 / 时空 / 驿马星等关键盘面信息
- **极性规则引擎** (`qimenPolarityRules`)：自动识别同极、异极格局，覆盖默认用神方向
- **时机规则引擎** (`qimenTimingRules`)：解析有利方位、破局时辰与行动窗口
- 取用神规则按问题域动态切换（独立维护于 `qimenYongshenRules`），避免同一套话术套所有问题
- 结果卡片包含吉凶评分、风险信号、破局节点、有利方位 / 时间 / 行动建议
- 支持奇门历史记录回放，并在结果页提交「应验反馈」，沉淀后续校准样本

### 全息八字系统

**排盘层**

- 支持阳历、农历、四柱反查三种录入方式
- 支持出生地经度、平太阳时 / 真太阳时修正，保存原始时间与修正后时间
- 四柱干支、十神、藏干、十二长生、纳音、旬空亡、神煞与特殊格局完整展开

**推演层**

- `BaziRuleEngine` 负责日主强弱、喜忌神、格局断语和生克合化关系
- **4维打分系统**：通过调候 (Tiaohou)、病药 (Bingyao)、通关 (Tongguan)、扶抑 (Fuyi) 进行严密的逻辑打分，并支持特殊结构（如从格）与矛盾格局的自动化处理
- **推演逻辑可视化**：提供五行力量可视化条 (Wuxing Power Bar) 与打分明细卡片 (Scoring Breakdown Cards)，清晰展示计算过程与判分依据
- LLM 与规则引擎结果分层存储，展示字段可优先使用校准结果，失败时回退本地引擎
- 支持八字断语反馈校准，按用户反馈重新生成原局、大运、流年文案
- 支持八字问答（`/api/bazi-question`）：基于完整命盘就任意问题进行六亲 / 格局级别的具体解读

**岁运联动**

- 大运（10柱）→ 流年（10年）→ 流月（12月）三级点击联动
- 每柱自动计算对应日干十神，并按喜忌着色
- 当前大运 / 流年高亮，辅助理解命盘与当下时间的关系

### 运势评分系统

运势页已经从单一日运升级为 **日 / 周 / 月 / 年** 四层结构：

| 维度 | 能力                               | 说明                                                                                                                           |
| ---- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 日运 | `calculateDailyScore`              | 流日十神、地支刑冲合害、十二神与空亡降维，输出 45-98 分。并展示 4 宫格洞察卡片、运势时间线及基于结果的化解 (Resolve/Hook) 方案 |
| 周运 | `fortuneWeeklyCore`                | 结合本周范围进行周运程推演，生成周度评分与趋势指导                                                                             |
| 月运 | `calculateMonthlyScore` + 节气流月 | 按节气边界计算流月，不按自然月硬切；展示月度曲线、高低分日、低谷期                                                             |
| 年运 | `calculateAnnualScore`             | 生成目标年前后 10 年年运区间，叠加大运、流年、原局关系与神煞信号                                                               |

月运详批支持综合、事业、财运、感情四个维度。用户可以填写长期基调与本月现实背景，系统会把这些上下文注入月运解读；当基调明显更新时，前端会标记并自动刷新对应详批。

### 命理工程化看板 (Engineering Dashboard)

- **全局角色协同**：将复杂命理推演工作流拆解，提供基于清晰角色的全屏滚动式 (Scroll-snap) 操作界面
- **系统状态总览**：为高级用户或管理员提供一站式的命理规则、数据缓存和引擎状态分析监控视图

### 访客、认证与商业化

- 支持邮箱登录、Google OAuth、密码重设页
- 访客模式可体验 1 次奇门提问、添加 1 个本地八字档案、查看今日日运分数
- 访客事件写入 `guest_events`，同时过滤姓名、生日、问题文本等隐私字段
- 底部导航在登录或访客状态下展示，重设密码页自动隐藏主导航

### 三层推演架构

```text
用户提问
  │
  └─► 第一层：术数分流引擎（规则优先 → Gemini Flash 兜底）
        │
        ├─► branch = qimen   ──→ 奇门排盘 + 九宫 Prompt
        ├─► branch = bazi    ──→ 八字命盘 + 格局 Prompt
        ├─► branch = hybrid  ──→ 八字背景 × 奇门事件 联合 Prompt
        └─► branch = clarify ──→ 追问缺失信息，不进入推演
              │
              └─► 第二层：领域规则注入（依 category / subcategory）
                    └─► 取用神规则 + 极性/时机覆盖规则
                          │
                          └─► 第三层：主推演引擎（Gemini Pro · 深度断语）
                                └─► 结构化 JSON 决策卡片
```

---

## 技术栈

```text
前端框架      Vue 3 · Composition API · Pinia · Vue Router · vue-i18n
后端          Cloudflare Workers (单文件 ES Module，运行时为 V8)
数据库        Supabase Auth + Postgres + RLS
AI 模型       Gemini 兼容接口，用于奇门主推演、八字断语、日/月运文案
历法计算      lunar-javascript
构建工具      Vite
测试          Node.js Test Runner
部署          Cloudflare Pages (前端静态) + Cloudflare Workers (API)
```

### 工程特性

- **确定性算分**：日运、月运、年运评分由 JS 引擎生成，LLM 不能擅自改分
- **缓存分层**：日运 / 月运写入 `fortune_cache`，前端也有 localStorage 与内存缓存
- **预热机制**：登录后可预热未来 7 天日运，减少首次打开等待
- **CORS 白名单**：`FRONTEND_URL` 支持多域名配置，也支持本地开发源
- **接口兜底**：八字 LLM 失败时回退本地规则引擎，运势文案失败时仍先展示分数
- **测试覆盖**：覆盖 CORS、八字接口、访客模式、缓存、预热、月运、年运相关核心算法与 UI 约束
- **Worker 单文件部署**：所有 API 路由收敛在 `worker/src/index.js`，通过 `wrangler deploy` 一键发布

---

## 快速开始

```bash
# 安装依赖
npm install

# 启动前端开发服务器
npm run dev

# 运行测试
npm test

# 构建生产包
npm run build
```

### Worker 本地调试

```bash
# 进入 worker 目录
cd worker

# 启动 Wrangler 本地开发服务器
npx wrangler dev
```

Worker 会在 `http://localhost:8787` 启动，前端 `vite.config.js` 中的代理会自动将 `/api/*` 请求转发到该地址。

---

## 部署

本项目采用 **Cloudflare Pages + Cloudflare Workers** 双轨部署，Vercel 已作为历史存档保留。

### 前置条件

- [Cloudflare](https://cloudflare.com) 账号（Pages + Workers）
- [Supabase](https://supabase.com) 项目
- Gemini API Key 或兼容 OpenAI Chat Completions 格式的中转接口 Key

### Cloudflare Pages（前端）

在 Cloudflare Dashboard → Pages 中创建项目，连接 GitHub 仓库，使用以下构建配置：

```text
Framework preset:      Vue
Root directory:        /
Build command:         npm run build
Build output directory: dist
Production branch:     main
```

Pages 环境变量（仅前端可见）：

```bash
VITE_GITHUB_URL=https://github.com/oceanjustinlin/qimen
```

> **注意**：不要把任何服务端密钥放入 Pages 环境变量。

### Cloudflare Workers（API）

Worker 项目位于 `worker/`，配置文件为 `worker/wrangler.toml`。

```text
Build command:         echo "skip build"
Deploy command:        npx wrangler deploy
Path:                  worker
Production branch:     main
```

在 Cloudflare Worker → Settings → Variables and Secrets 中配置：

```bash
# Secrets（加密存储，仅 Worker 内可见）
GEMINI_API_KEY=your_api_key
SUPABASE_SERVICE_KEY=your_service_role_key

# Variables（明文，可在 Dashboard 查看）
SUPABASE_URL=https://xxxx.supabase.co
FRONTEND_URL=https://qimendao.com,https://www.qimendao.com
WHITELIST_EMAILS=admin@example.com,vip@example.com
```

`FRONTEND_URL` 支持逗号分隔的多域名，Worker 会自动匹配并返回对应的 CORS `Access-Control-Allow-Origin`。

### AI 接口说明

当前项目使用第三方中转 API，请求走 OpenAI Chat Completions 兼容格式，通过 `GEMINI_API_KEY` 鉴权。如需改用 Google 原生 Gemini、OpenAI 或其他模型，需替换 `worker/src/index.js` 中的 `LLM_API_URL` 以及对应的请求体结构与返回值解析逻辑。

---

## 数据库脚本

基础表需要包含：

- `qimen_records`：奇门推演历史
- `bazi_profiles`：八字档案与规则 / LLM / 校准断语
- `fortune_cache`：日运、月运与解读缓存
- `qimen_feedback`：奇门应验反馈
- `guest_events`：访客事件
- `profile_contexts` / `monthly_context_logs`：月运长期基调与本月背景

仓库已提供以下迁移脚本：

- `docs/sql/bazi-llm-engine-migration.sql`
- `docs/sql/bazi-calibration-migration.sql`
- `docs/sql/bazi-birthplace-solar-time-migration.sql`
- `docs/sql/qimen-feedback.sql`
- `docs/sql/guest-events.sql`

如果你是从空 Supabase 项目开始，需要先建基础表和 RLS 策略，再按功能执行这些迁移。

前端 Supabase Anon Key 目前内嵌在 `src/App.vue`、`src/views/HomeView.vue`、`src/views/BaziView.vue`、`src/views/FortuneView.vue` 与 `src/views/ResetPasswordView.vue` 中。部署自己的实例时，请替换为你的 Supabase 项目 URL 和 Anon Key。

---

## 项目结构

```text
/
├── worker/
│   ├── src/index.js                     # Cloudflare Worker 入口，所有 /api/* 路由
│   └── wrangler.toml                    # Worker 部署配置
│
├── lib/
│   ├── BaziRuleEngine.js                # 子平规则引擎（强弱、喜忌、格局）
│   ├── QimenCalculations.js             # 奇门拆补转盘核心算法
│   ├── QimenConstants.js                # 奇门常量（九星、八门、八神、节气局数）
│   ├── QimenUtils.js                    # 奇门工具函数（旬头、飞步、伏吟）
│   ├── qimenCore.js                     # 马星、地支宫位映射
│   ├── qimenYongshenRules.js            # 六大问题域取用神规则（~63KB）
│   ├── qimenPolarityRules.js            # 极性覆盖规则（同极/异极格局识别）
│   ├── qimenTimingRules.js              # 时机分析（方位、时辰、破局窗口）
│   ├── qimenPromptSections.js           # 奇门评分审计 Prompt 构建
│   ├── divinationRouter.js              # 意图路由器（规则 + LLM 兜底）
│   ├── divinationCategories.js          # 问题域分类与归一化
│   ├── baziCore.js                      # 八字核心：排盘、Prompt、格局判断
│   ├── baziQuestionCore.js              # 八字问答 Prompt 构建与输出归一化
│   ├── BaziConstants.js                 # 八字常量
│   ├── calculateDailyScore.js           # 日运算分
│   ├── calculateMonthlyScore.js         # 月运算分
│   ├── calculateAnnualScore.js          # 年运算分
│   ├── fortuneDailyCore.js              # 日运 payload / prompt / merge
│   ├── fortuneWeeklyCore.js             # 周运 payload 与核心逻辑
│   ├── fortuneMonthlyCore.js            # 流月 payload 与缓存 key
│   ├── fortuneMonthlyInterpretationCore.js # 月运详批 prompt 与结果合并
│   ├── fortuneAnnualCore.js             # 年运区间 payload
│   ├── fortuneContextNotes.js           # 上下文笔记归一化
│   ├── flowMonth.js                     # 节气流月边界
│   ├── siziSummary.js                   # 四柱摘要
│   ├── cors.js                          # CORS 白名单（Vercel 函数用）
│   └── constants/                       # 干支、十神、关系、神煞、调候常量
│
├── src/
│   ├── App.vue                          # 根组件、全局登录态、底部导航
│   ├── router/index.js                  # 首页 / 八字 / 运势 / 密码重设
│   ├── store.js                         # 全局状态
│   ├── guestMode.mjs                    # 访客额度与事件上报
│   ├── qimenFeedback.mjs                # 奇门反馈合并与状态判断
│   ├── fortuneCache.mjs                 # 日/月运前端缓存与刷新信号
│   ├── fortuneWarmup.mjs                # 日运预热
│   ├── auth/                            # Google OAuth 与密码重设参数
│   ├── i18n/                            # zh-CN / en-US 文案
│   ├── utils/                           # 八字输入、矩阵、岁运、校准 prompt
│   ├── styles/                          # 全局样式与运势页样式
│   └── views/
│       ├── HomeView.vue                 # 奇门首页、登录、访客、历史、反馈
│       ├── BaziView.vue                 # 八字档案、排盘、真太阳时、校准
│       ├── FortuneView.vue              # 日/周/月/年运势
│       ├── EngineeringView.vue          # 命理工程化看板
│       ├── LegalView.vue                # 服务条款与隐私政策
│       └── ResetPasswordView.vue        # 密码重设
│
├── docs/
│   ├── sql/                             # Supabase 迁移脚本
│   └── cloudflare-migration.md          # Cloudflare 迁移交接文档
├── mock/                                # 前端访客 / 测试 mock 数据
├── public/                              # 静态文件（含 _redirects SPA 兜底）
├── archive/                             # 旧版 Vercel API 函数与历史原型
└── package.json
```

---

## 效果展示

<p align="center">
  <img src="https://i.imgur.com/8MVTjsS.jpeg" width="220" alt="奇门卡片详情"/>
  &nbsp;
  <img src="https://i.imgur.com/wI8vWzc.jpeg" width="220" alt="断事笔记"/>
</p>

**奇门结果卡片包含：**

- 吉凶评分、五段式断语、评分依据与风险标签
- 九宫排盘可视化，值符 / 值使、空亡 / 马星同步标注
- 破局时辰、有利方位、有利时间与行动锦囊
- 结果页应验反馈入口

<p align="center">
  <img src="https://i.imgur.com/M0O7GR3.png" width="220" alt="添加八字档案"/>
  &nbsp;
  <img src="https://i.imgur.com/RP92YQs.png" width="220" alt="专业排盘"/>
  <br/>
  <img src="https://i.imgur.com/503GVir.jpeg" width="220" alt="八字断语"/>
</p>

**八字全息面板包含：**

- 阳历 / 农历 / 四柱录入，支持出生地与真太阳时校正
- 四柱主星、藏干、星运 / 自座、空亡、纳音、神煞与专业细盘
- 大运、流年、流月联动时间轴
- 生克合化可视化与天机锦囊
- 八字校准反馈与再生成断语

<p align="center">
  <img src="https://i.imgur.com/Dr5tEar.jpeg" width="220" alt="日运分数"/>
  &nbsp;
  <img src="https://i.imgur.com/lnU5q6I.png" width="220" alt="月度分数与曲线"/>
  &nbsp;
  <img src="https://i.imgur.com/397MAVl.jpeg" width="220" alt="月运详批"/>
</p>

**运势面板包含：**

- 日运：7 日切换、分数先行、LLM 断语异步补齐、吉时与开运指南
- 月运：节气流月、月度曲线、高低分日、低谷期、四维度月度详批
- 年运：前后 10 年区间、大运背景、流年十神、原局关系与岁运信号
- 命主切换与前端缓存回放

---

## 设计理念

**诚实的推演**

Prompt 中明确禁止"因为问题积极就盲目高分"。凶象必须如实呈现，吉象才有说服力。

**算法的权威性**

日主强弱、喜忌神、日月年评分都由本地确定性引擎完成。LLM 是表达层，不是判分层。

**语境决定象意**

同一个盘面信号，在事业、感情、健康、竞技、交易中含义不同。项目通过问题域、八字档案与现实背景，把象意落到更具体的处境里。

---

## 鸣谢

- [lunar-javascript](https://github.com/6tail/lunar-javascript) — 干支历法底层计算
- [Google Gemini](https://deepmind.google/technologies/gemini/) — AI 推演引擎
- [Supabase](https://supabase.com) — 数据库与认证服务
- [Vue 3](https://vuejs.org) — 前端框架
- [Vite](https://vitejs.dev) — 构建工具
- [Cloudflare Workers](https://workers.cloudflare.com) — 无服务器 API 运行时

---

## 开源协议

MIT License · 可自由使用、修改与分发，保留原作者声明即可。

> 玄学推演结果仅供参考，请理性决策。  
> 天机可以问，终究要自渡。
