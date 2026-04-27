# 奇门遁甲 · AI 决策引擎

> **将三千年玄学智慧，接入现代 AI 推理引擎。**  
> 时家奇门拆补转盘法 × 全息八字子平推演 × Gemini 大模型 × 全栈 Web 应用

<p align="center">
  <img src="home.jpg" width="200" alt="主界面"/>
  &nbsp;&nbsp;
  <img src="menu_1.jpg" width="200" alt="历史占卜"/>
  &nbsp;&nbsp;
  <img src="sample_1.jpg" width="200" alt="决策卡片"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-gold?style=flat-square"/>
  <img src="https://img.shields.io/badge/powered%20by-Gemini-blue?style=flat-square"/>
  <img src="https://img.shields.io/badge/deploy-Vercel-black?style=flat-square"/>
  <img src="https://img.shields.io/badge/db-Supabase-3ECF8E?style=flat-square"/>
  <img src="https://img.shields.io/badge/frontend-Vue%203-41B883?style=flat-square"/>
</p>

<p align="center">
  <a href="https://github.com/oceanjustinlin/qimen">GitHub 源码</a>
  ·
  <a href="https://github.com/sponsors/oceanjustinlin">打赏支持</a>
</p>

---

## 为什么这个项目与众不同

坊间的奇门工具要么只会排盘，要么只会复读术语。

这个项目做了一件不同的事：**让 AI 真正读懂盘面，而不是背诵口诀。**

系统在每次推演前，先识别问题意图，再调用对应领域的解读策略，让不同问题得到不同侧重点的分析，而不是一套话术套到底。

八字模块同样不依赖 LLM 臆造数据：系统先完成本地结构化分析，再由 LLM 将结果转化成有温度的文案。核心判断与表达层解耦，输出更稳定。

这不是套模板，是结构化推理。

---

## 核心能力

### 奇门遁甲推演引擎

- **时家奇门拆补转盘法**，精确实现甲子隐遁、符头定位、九星八门八神飞布
- 自动处理寄宫逻辑（天芮 / 天禽中宫寄坤）
- 日空 / 时空 / 驿马星实时计算，同步渲染至九宫盘面
- 意图路由器识别六大问题域，主推演引擎按场景深度解盘

### 全息八字系统（全新）

这一模块实现了完整的子平八字推演链路，基础排盘、结构分析与 AI 文案各司其职：

**排盘层**
- 四柱干支 · 十神 · 藏干 · 十二长生（星运 / 自座双维度）· 纳音 · 旬空亡
- 扩展神煞（年支 / 月支 / 日支 / 日干四类起法，涵盖天乙、文昌、驿马、将星等 15+ 神煞）
- 特殊格局自动识别（魁罡、金神、天罗地网、四生四败四库局等）

**推演层**
- 日主状态、格局倾向与岁运变化自动分析
- 喜忌方向、关键助力与风险因素综合呈现
- 生克合化关系可视化，便于理解盘面互动

**大运流年联动**
- 大运（10柱）→ 流年（10年）→ 流月（12月）三级联动点击切换
- 每柱自动标记关键关系，按吉凶倾向着色
- 当前大运 / 流年柱自动高亮

### 日运评分引擎

内置独立日运评分能力，基于命主档案与当日盘面生成稳定分值，并提供对应解释文案。评分与文案分离，避免 AI 临场发挥导致结果漂移。

### 双层 AI 推演架构

```
用户提问
  └─► 意图路由器 (Gemini 1.5 Flash · 极低延迟)
        └─► 分类：career / finance / relationship / health / transaction / general
              └─► 场景化解读策略
                    └─► 主推演引擎 (Gemini Pro · 深度推理)
                          └─► 结构化 JSON 决策卡片
```

### 六大问题域精准解读

| 类型 | 解读重点 |
|------|----------|
| 💼 事业职场 | 机会窗口 · 竞争压力 · 行动建议 |
| 💰 求财投资 | 财务趋势 · 风险提醒 · 决策节奏 |
| ❤️ 感情婚恋 | 关系状态 · 沟通阻力 · 破冰时机 |
| 🏥 健康竞技 | 状态评估 · 风险信号 · 调整建议 |
| 📦 交易合同 | 成交概率 · 主导权 · 风险点 |
| 📋 日常杂事 | 动静判断 · 时间窗口 · 取舍建议 |

### 动态破局推演

不会停留在静态凶象。系统会进一步推演后续时间窗口，给出更具体的转机节点、风险时段与行动建议，而不是只给一句模糊的"近期不利"。

---

## 技术栈

```
前端框架      Vue 3 (Composition API · <script setup> · Pinia · Vue Router)
后端          Vercel Serverless Functions (Node.js)
数据库        Supabase (用户认证 · JWT 鉴权 · 历史记录 · 八字档案 · 日运缓存)
AI 模型       Gemini 1.5 Flash (意图路由) + Gemini Pro (主推演 / 八字断语)
历法计算      lunar-javascript (干支 · 节气 · 八字 · 大运流年流月)
构建工具      Vite
测试          Node.js Test Runner
```

### 关键工程细节

**安全防线三层设计**：CORS 域名白名单 → Supabase JWT 鉴权拦截 → 白名单邮箱 VIP 豁免 + 用量额度限制（免费用户 3 次）。

**云端内存缓存 + 数据库缓存双层**：奇门推演按`时辰 + 问题 + 命主`哈希缓存于内存；日运推演结果写入 `fortune_cache` 表，每日零点过期，命中缓存直接返回，零 Token 消耗。

**评分与文案解耦**：日运分值由本地引擎生成，AI 负责解释与表达，减少同一输入多次生成时的波动。

**60 秒超时熔断**：奇门主推演使用 `AbortController` 硬截断，防止 Serverless 函数长时间挂起计费。

**LLM 降级兜底**：八字接口 LLM 调用失败时，自动使用本地分析结果兜底，保证接口 SLA 不受 LLM 抖动影响。

---

## 快速开始与部署

### 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 启动开发环境
npm run dev

# 3. 构建生产包
npm run build
```

项目目前未在 `package.json` 中配置统一的 `test` script。如需运行现有测试，可使用 Node.js Test Runner：

```bash
node --test api/*.test.js lib/*.test.js src/**/*.test.mjs
```

### 前置条件

- [Vercel](https://vercel.com) 账号
- [Supabase](https://supabase.com) 项目
- Gemini API Key（[Google AI Studio](https://aistudio.google.com) 免费申请）

### 数据库建表

在 Supabase SQL Editor 执行基础表结构：

```sql
-- 奇门推演历史记录
create table qimen_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  question text not null,
  qimen_data jsonb,
  category varchar(30) default 'general',
  created_at timestamptz default now()
);

-- 命主八字档案
create table bazi_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  gender char(1) check (gender in ('M', 'F')),
  birth_date text,
  bazi_str text,
  bazi_summary text,
  bazi_detail jsonb,           -- 完整排盘 matrix（四柱 · 大运 · 流年 · 流月）
  strong_weak text,            -- 日主强弱
  favorable_elements text[],   -- 喜用神列表
  unfavorable_elements text[], -- 忌仇神列表
  display_yuanju_core text,    -- 展示用原局核心断语（优先 llm，回退 engine）
  display_current_dayun text,  -- 展示用当前大运断语（优先 llm，回退 engine）
  display_current_liunian text,-- 展示用当前流年断语（优先 llm，回退 engine）
  llm_yuanju_core text,        -- LLM 原局核心断语
  llm_current_dayun text,      -- LLM 当前大运断语
  llm_current_liunian text,    -- LLM 当前流年断语
  engine_yuanju_core text,     -- 规则引擎原局核心断语
  engine_current_dayun text,   -- 规则引擎当前大运断语
  engine_current_liunian text, -- 规则引擎当前流年断语
  shensha text,                -- 神煞 JSON
  geju text,                   -- 格局名称
  ri_zhu text,                 -- 日柱
  day_zhi text,                -- 日支
  year_zhi text,               -- 年支
  month_zhi text,              -- 月支
  is_default boolean default false,
  created_at timestamptz default now()
);

-- 日运推演缓存
create table fortune_cache (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  dimension text not null,     -- 'day' / 'month' / 'year'
  period_key text not null,    -- e.g. '2025-01-15'
  data_json jsonb,
  generated_at timestamptz,
  expires_at timestamptz,
  unique (user_id, dimension, period_key)
);

-- 开启行级安全
alter table qimen_records enable row level security;
alter table bazi_profiles enable row level security;
alter table fortune_cache enable row level security;

create policy "用户只能访问自己的奇门记录" on qimen_records
  for all using (auth.uid() = user_id);

create policy "用户只能访问自己的八字档案" on bazi_profiles
  for all using (auth.uid() = user_id);

create policy "用户只能访问自己的日运缓存" on fortune_cache
  for all using (auth.uid() = user_id);
```

仓库的 `docs/` 目录还包含后续迁移脚本，可按功能需要继续执行：

- `docs/bazi-llm-engine-migration.sql`：八字 LLM / 规则引擎断语字段
- `docs/bazi-calibration-migration.sql`：八字校准反馈与再生成相关字段
- `docs/guest-events.sql`：访客模式事件记录

### 部署步骤

```bash
# 1. Fork 本仓库并克隆
git clone https://github.com/your-username/qimen-ai.git
cd qimen-ai

# 2. 安装依赖
npm install

# 3. 部署到 Vercel
vercel deploy

# 4. 在 Vercel Dashboard → Settings → Environment Variables 中添加：
#    GEMINI_API_KEY      = your_gemini_api_key
#    SUPABASE_URL        = https://xxxx.supabase.co
#    SUPABASE_SERVICE_KEY = your_service_role_key
#    FRONTEND_URL        = https://your-domain.vercel.app
#    WHITELIST_EMAILS    = admin@example.com,vip@example.com  （可选，VIP 白名单）
#    VITE_GITHUB_URL     = https://github.com/oceanjustinlin/qimen      （可选，前端源码入口）
#    VITE_SPONSOR_URL    = https://github.com/sponsors/oceanjustinlin   （可选，前端打赏入口）
```

在 `src/App.vue`、`src/views/HomeView.vue`、`src/views/BaziView.vue` 与 `src/views/FortuneView.vue` 顶部填入你的 Supabase 项目 URL 和 Anon Key，完成前端登录与接口鉴权配置。

前端顶部栏的 GitHub 与打赏图标默认指向本仓库与 GitHub Sponsors；如需换成 Ko-fi、爱发电、Buy Me a Coffee 或自己的 `/support` 页面，只需要设置 `VITE_SPONSOR_URL`。

---

## 项目结构

```
/
├── api/
│   ├── qimen.js              # 奇门推演接口：排盘 · 意图路由 · AI 推演 · 结果组装
│   ├── bazi.js               # 八字断语接口：全局排盘 · 规则引擎 · LLM 文案 · 数据落库
│   ├── bazi-calibrate.js     # 八字反馈校准接口：用户反馈 · Prompt 再生成 · 字段回写
│   ├── fortune-daily.js      # 日运接口：每日评分 · 缓存管理
│   └── fortune-daily-interpretation.js # 日运解读接口：LLM 文案 · 结果落库
│
├── lib/
│   ├── BaziRuleEngine.js     # 八字分析模块
│   ├── BaziConstants.js      # 八字基础数据入口
│   ├── calculateDailyScore.js # 日运评分模块
│   ├── fortuneDailyCore.js   # 日运数据组装
│   ├── siziSummary.js        # 四柱摘要生成
│   ├── constants/
│   │   ├── core.js           # 基础常量
│   │   ├── relations.js      # 关系常量
│   │   ├── tiaohou.js        # 调候资料
│   │   └── shensha.js        # 神煞资料
│   ├── classics/
│   │   └── sizi.py           # 子平经典资料参考
│   ├── QimenCalculations.js  # 奇门排盘模块
│   ├── QimenConstants.js     # 奇门静态数据：节气局数 · 洛书轨迹 · 地盘配置
│   └── QimenUtils.js         # 奇门工具函数：旬首查询 · 干支提取 · 数组旋转
│
├── src/
│   ├── main.js               # Vue 应用入口
│   ├── App.vue               # 根组件：星空背景 · 底部导航 · 抽屉容器
│   ├── router/index.js       # 路由配置（奇门首页 / 八字 / 日运）
│   ├── store.js              # 全局状态（抽屉开关等）
│   ├── fortuneCache.mjs      # 日运缓存读写与过期判断
│   ├── fortuneWarmup.mjs     # 日运预热任务
│   ├── guestMode.mjs         # 访客模式额度与事件上报
│   ├── styles/
│   │   ├── global.css        # 全局 CSS 变量 · 背景 · 字体
│   │   └── fortune-view.css  # 日运页面样式
│   ├── utils/
│   │   ├── baziInterpretation.mjs # 八字解读结果格式化
│   │   ├── baziLocalMatrix.mjs    # 前端本地八字矩阵构建
│   │   ├── baziProfileInput.mjs   # 命主档案输入校验与清洗
│   │   ├── baziTransit.mjs        # 大运流年流月联动工具
│   │   └── buildCalibrationPrompt.mjs # 校准再生成 Prompt 构建
│   └── views/
│       ├── HomeView.vue      # 奇门主界面：起局 · 推演 · 历史抽屉 · 八字注入
│       ├── BaziView.vue      # 八字界面：档案管理 · 排盘表格 · 大运流年联动
│       └── FortuneView.vue   # 日运界面：每日分值 · 运势解读 · 缓存回放
│
├── docs/
│   ├── bazi-calibration-migration.sql # 八字校准迁移脚本
│   ├── bazi-llm-engine-migration.sql  # 八字引擎字段迁移脚本
│   ├── bazi-ui-prototype.html         # 八字 UI 原型
│   └── guest-events.sql               # 访客事件记录表
│
├── index.html                # HTML 入口
├── vite.config.js            # Vite 构建配置
└── package.json
```

---

## 效果展示

<p align="center">
  <img src="sample_1.jpg" width="220" alt="核心概览"/>
  &nbsp;
  <img src="sample_2.jpg" width="220" alt="决策指引"/>
</p>

**奇门结果卡片包含：**
- 吉凶评分（0–100，自动变换主题色）与五段式断语（大吉 / 小吉 / 平 / 小凶 / 大凶）
- 评分依据：吉象支撑标签 + 风险信号标签 + 简明解释
- 九宫排盘可视化（值符 / 值使高亮，空亡 / 马星标注）
- 动态应期推演（精确到时辰的破局节点）
- 有利方位 / 有利时间 / 助运行为三项锦囊

**八字全息面板包含：**
- 四柱主星 · 天干 · 地支 · 藏干 · 星运 / 自座 · 空亡 · 纳音 · 神煞（点击查看含义）
- 专业细盘：流年 + 大运叠入四柱对比，当前大运 / 流年高亮
- 大运 → 流年 → 流月三级联动时间轴（点击切换，十神自动着色）
- 生克合化可视化面板（天干合克 + 地支刑冲合害全量展示）
- 天机锦囊：喜忌神 · 原局核心 · 岁运推演三段式断语

**日运面板包含：**
- 当日综合分值与重点提示，由本地评分能力稳定生成
- 关键依据摘要展示，帮助用户理解当天节奏
- 缓存命中回放与 AI 解读分离，降低重复生成成本

**历史记录抽屉：**
- 按六类问题域筛选（胶囊切换）
- 条目展示时间 · 分类标签 · 吉凶评分三维 meta 信息，点击直接回放

---

## 设计理念

**诚实的推演**

这个项目拒绝"结果永远向好"的讨好式输出。凶象如实呈现，吉象才有说服力。

**结果的稳定性**

日运评分与八字结构判断由本地分析能力承接，结果更稳定、更可复现。LLM 是语言表达层，不替代核心判断。

**语境决定象意**

不同问题有不同解读语境：感情看互动，事业看机会，健康看风险，交易看取舍。语境准确，断语才不会错位。

---

## 鸣谢

- [lunar-javascript](https://github.com/6tail/lunar-javascript) — 干支历法底层计算
- [Google Gemini](https://deepmind.google/technologies/gemini/) — AI 推演引擎
- [Supabase](https://supabase.com) — 开源数据库与认证服务
- [Vue 3](https://vuejs.org) — 前端框架
- [Vite](https://vitejs.dev) — 构建工具

---

## 开源协议

MIT License · 可自由使用、修改与分发，保留原作者声明即可。

> 玄学推演结果仅供参考，请理性决策。  
> 天机可以问，终究要自渡。
