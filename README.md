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
  <img src="https://img.shields.io/badge/deploy-Vercel-black?style=flat-square"/>
  <img src="https://img.shields.io/badge/db-Supabase-3ECF8E?style=flat-square"/>
  <img src="https://img.shields.io/badge/frontend-Vue%203-41B883?style=flat-square"/>
</p>

---

## 项目简介

坊间的奇门工具要么只会排盘，要么只会复读术语。这个项目想做的是另一件事：**让 AI 在稳定的术数规则底座上做结构化推演，而不是让大模型凭空编玄学。**

系统会先用轻量路由模型识别问题意图（事业 / 财运 / 感情 / 健康 / 交易 / 日常），再把对应领域的取用神规则注入主推演 Prompt。八字与运势模块则把客观计算交给本地规则引擎：强弱、喜忌、神煞、刑冲合害、日月年评分都由确定性代码生成，LLM 只负责把结论写成可读、可行动的断语。

这不是套模板，是一套“规则先行、AI 表达”的命理推演系统。

---

## 核心能力

### 奇门遁甲推演

- **时家奇门拆补转盘法**：实现甲子隐遁、符头定位、九星八门八神飞布
- 自动处理天芮 / 天禽中宫寄坤、日空 / 时空 / 驿马星等关键盘面信息
- 意图路由器动态切换六大问题域取用神规则（独立维护于 `qimenYongshenRules`），避免同一套话术套所有问题
- 结果卡片包含吉凶评分、风险信号、破局节点、有利方位 / 时间 / 行动建议
- 支持奇门历史记录回放，并在结果页提交“应验反馈”，沉淀后续校准样本

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

**岁运联动**

- 大运（10柱）→ 流年（10年）→ 流月（12月）三级点击联动
- 每柱自动计算对应日干十神，并按喜忌着色
- 当前大运 / 流年高亮，辅助理解命盘与当下时间的关系

### 运势评分系统

运势页已经从单一日运升级为 **日 / 月 / 年** 三层结构：

| 维度 | 能力 | 说明 |
|------|------|------|
| 日运 | `calculateDailyScore` | 流日十神、地支刑冲合害、十二神与空亡降维，输出 45-98 分。并展示 4 宫格洞察卡片、运势时间线及基于结果的化解 (Resolve/Hook) 方案 |
| 月运 | `calculateMonthlyScore` + 节气流月 | 按节气边界计算流月，不按自然月硬切；展示月度曲线、高低分日、低谷期 |
| 年运 | `calculateAnnualScore` | 生成目标年前后 10 年年运区间，叠加大运、流年、原局关系与神煞信号 |

月运详批支持综合、事业、财运、感情四个维度。用户可以填写长期基调与本月现实背景，系统会把这些上下文注入月运解读；当基调明显更新时，前端会标记并自动刷新对应详批。

### 命理工程化看板 (Engineering Dashboard)

- **全局角色协同**：将复杂命理推演工作流拆解，提供基于清晰角色的全屏滚动式 (Scroll-snap) 操作界面
- **系统状态总览**：为高级用户或管理员提供一站式的命理规则、数据缓存和引擎状态分析监控视图

### 访客与认证

- 支持邮箱登录、Google OAuth、密码重设页
- 访客模式可体验 1 次奇门提问、添加 1 个本地八字档案、查看今日日运分数
- 访客事件写入 `guest_events`，同时过滤姓名、生日、问题文本等隐私字段
- 底部导航在登录或访客状态下展示，重设密码页自动隐藏主导航

### 双层 AI 架构

```text
用户提问
  └─► 意图路由器 (Gemini Flash · 低延迟分类)
        └─► career / finance / relationship / health / transaction / general
              └─► 注入领域专属用神规则
                    └─► 主推演引擎 (Gemini Pro · 深度断语)
                          └─► 结构化 JSON 决策卡片
```

---

## 技术栈

```text
前端框架      Vue 3 · Composition API · Pinia · Vue Router · vue-i18n
后端          Vercel Serverless Functions (Node.js)
数据库        Supabase Auth + Postgres + RLS
AI 模型       Gemini 兼容接口，用于奇门主推演、八字断语、日/月运文案
历法计算      lunar-javascript
构建工具      Vite
测试          Node.js Test Runner
```

### 工程特性

- **确定性算分**：日运、月运、年运评分由 JS 引擎生成，LLM 不能擅自改分
- **缓存分层**：日运 / 月运写入 `fortune_cache`，前端也有 localStorage 与内存缓存
- **预热机制**：登录后可预热未来 7 天日运，减少首次打开等待
- **CORS 白名单**：`FRONTEND_URL` 支持多域名配置，也支持本地开发源
- **接口兜底**：八字 LLM 失败时回退本地规则引擎，运势文案失败时仍先展示分数
- **测试覆盖**：覆盖 CORS、八字接口、访客模式、缓存、预热、月运、年运相关核心算法与 UI 约束

---

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发环境
npm run dev

# 运行测试
npm test

# 构建生产包
npm run build
```

### 前置条件

- [Vercel](https://vercel.com) 账号
- [Supabase](https://supabase.com) 项目
- Gemini API Key 或兼容 OpenAI Chat Completions 格式的中转接口 Key

### AI 接口说明

当前项目使用了第三方中转 API，服务端请求走的是 OpenAI Chat Completions 兼容格式，并通过 `GEMINI_API_KEY` 作为鉴权 Key。也就是说，这里的变量名保留了 Gemini 语义，但实际请求地址并不一定是 Google 原生 Gemini API。

如果你要二开并改成 Google 原生 Gemini、OpenAI、Claude 或其他模型服务，需要自行替换对应 API 地址、请求体结构、鉴权 Header 与返回值解析逻辑。主要涉及：

- `api/qimen.js`
- `api/bazi.js`
- `api/bazi-calibrate.js`
- `api/fortune-daily-interpretation.js`
- `api/fortune-monthly-interpretation.js`

### 环境变量

在 Vercel Dashboard → Settings → Environment Variables 中配置：

```bash
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
FRONTEND_URL=https://your-domain.vercel.app
WHITELIST_EMAILS=admin@example.com,vip@example.com
VITE_GITHUB_URL=https://github.com/oceanjustinlin/qimen
```

前端 Supabase Anon Key 目前写在 `src/App.vue`、`src/views/HomeView.vue`、`src/views/BaziView.vue`、`src/views/FortuneView.vue` 与 `src/views/ResetPasswordView.vue` 中。部署自己的实例时，请替换为你的 Supabase 项目 URL 和 Anon Key。

### 数据库脚本

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

---

## 项目结构

```text
/
├── api/
│   ├── qimen.js                         # 奇门排盘、意图路由、AI 推演、历史落库
│   ├── bazi.js                          # 八字断语、规则引擎、LLM 文案、档案回写
│   ├── bazi-calibrate.js                # 八字反馈校准与再生成
│   ├── fortune-daily.js                 # 日运基础评分与缓存
│   ├── fortune-daily-interpretation.js  # 日运 LLM 解读
│   ├── fortune-monthly.js               # 节气流月基础评分
│   ├── fortune-monthly-interpretation.js # 月运分维度详批
│   ├── fortune-annual.js                # 年运区间评分
│   ├── context-notes.js                 # 长期基调 / 本月背景读写
│   └── cors.js                          # CORS 白名单
│
├── lib/
│   ├── BaziRuleEngine.js                # 子平规则引擎
│   ├── calculateDailyScore.js           # 日运算分
│   ├── calculateMonthlyScore.js         # 月运算分
│   ├── calculateAnnualScore.js          # 年运算分
│   ├── fortuneDailyCore.js              # 日运 payload / prompt / merge
│   ├── fortuneMonthlyCore.js            # 流月 payload 与缓存 key
│   ├── fortuneMonthlyInterpretationCore.js # 月运详批 prompt 与结果合并
│   ├── fortuneAnnualCore.js             # 年运区间 payload
│   ├── fortuneContextNotes.js           # 上下文笔记归一化
│   ├── flowMonth.js                     # 节气流月边界
│   ├── siziSummary.js                   # 四柱摘要
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
│       ├── FortuneView.vue              # 日/月/年运势
│       ├── EngineeringView.vue          # 命理工程化看板
│       └── ResetPasswordView.vue        # 密码重设
│
├── docs/sql/                            # Supabase 迁移脚本
├── mock/                                # 前端访客 / 测试 mock 数据
├── public/images/                       # README 截图与静态图片
├── archive/                             # 旧版原型与归档脚本
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

Prompt 中明确禁止“因为问题积极就盲目高分”。凶象必须如实呈现，吉象才有说服力。

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

---

## 开源协议

MIT License · 可自由使用、修改与分发，保留原作者声明即可。

> 玄学推演结果仅供参考，请理性决策。  
> 天机可以问，终究要自渡。
