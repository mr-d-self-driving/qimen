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
  <img src="https://img.shields.io/badge/cloud-Cloudflare-F38020?style=flat-square"/>
  <img src="https://img.shields.io/badge/db-Supabase-3ECF8E?style=flat-square"/>
  <img src="https://img.shields.io/badge/frontend-Vue%203-41B883?style=flat-square"/>
</p>

<p align="center">
  简体中文 |
  <a href="./docs/readme/README.en.md">English</a> |
  <a href="./docs/readme/README.zh-TW.md">繁體中文</a>
</p>

---

## 项目简介

坊间的奇门工具要么只会排盘，要么只会复读术语。这个项目想做的是另一件事：**让 AI 在稳定的术数规则底座上做结构化推演，而不是让大模型凭空编玄学。**

用户只需提问，系统就会自动判断这道题该用哪套术数体系回答：奇门遁甲、八字命理，或两者联合推演。分流模块会先识别问题类型，再把对应的术数规则、命盘上下文与现实语境交给推演引擎处理。

奇门模块负责具体事件、短期决策、成败应期与行动窗口；八字模块负责命局结构、大运流年、行业适配与长期趋势；运势模块负责日、周、月、年节奏评分与可执行建议。客观计算由本地规则引擎完成，大模型只负责把结论写成可读、可行动的断语。

这不是套模板，是一套**先自动分流知识体系，再规则先行、AI 表达**的命理推演系统。

---

## 核心能力

### 自动术数分流引擎

这是系统的大脑。每次用户提问后，它会先判断问题属于具体事件、长期命局，还是需要奇门与八字联合推演。

- 通过本地规则和大模型意图判断，自动选择合适的术数体系
- 覆盖事业职场、求财投资、婚恋感情、健康疾病、交易失物、考试学习、官司法务、风水家宅、孕产子嗣等常见问题域
- 根据问题类型注入对应的取用神规则、命盘上下文和现实背景
- 信息不足时会先追问关键条件，不急着给出含混判断

### 奇门遁甲推演

- 实现时家奇门拆补转盘法，包含甲子隐遁、符头定位、九星、八门、八神飞布
- 自动处理天芮、天禽中宫寄坤、日空、时空、驿马星等盘面信息
- 按问题域动态切换取用神规则，避免同一套话术套所有问题
- 输出吉凶评分、风险信号、破局节点、有利方位、有利时间与行动建议
- 支持历史记录回放和应验反馈，用于后续校准

### 全息八字系统

- 支持阳历、农历、四柱反查三种录入方式
- 支持出生地经度、平太阳时、真太阳时修正
- 展开四柱干支、十神、藏干、十二长生、纳音、旬空亡、神煞与特殊格局
- 本地规则引擎负责日主强弱、喜忌神、格局断语和生克合化关系
- 提供五行力量条、打分明细、八字问答、断语反馈校准
- 支持大运、流年、流月三级联动，辅助理解命盘与当下时间的关系

### 运势评分系统

运势页从单一日运扩展为日、周、月、年四层结构：

| 维度 | 功能 |
| --- | --- |
| 日运 | 计算每日分数，展示洞察卡片、时间线、吉时与化解建议 |
| 周运 | 结合本周范围生成周度趋势和行动提醒 |
| 月运 | 按节气计算流月，展示月度曲线、高低分日和低谷期 |
| 年运 | 生成前后十年区间，叠加大运、流年、原局关系与神煞信号 |

月运详批支持综合、事业、财运、感情四个维度。用户可以填写长期基调与本月现实背景，系统会把这些上下文注入解读。

### 命理工程化看板

- 将复杂命理推演工作流拆解为清晰角色和步骤
- 提供规则、缓存、引擎状态与推演过程的集中观察视图
- 适合高级用户或管理员排查推演链路、观察系统状态

### 访客、认证与商业化

- 支持邮箱登录、Google 登录和密码重设
- 访客模式可体验一次奇门提问、添加一个本地八字档案、查看今日日运分数
- 访客事件会过滤姓名、生日、问题文本等隐私字段
- 登录与访客状态下展示底部导航，密码重设页自动隐藏主导航

---

## 推演架构

```text
用户提问
  │
  └─► 术数分流引擎
        │
        ├─► 奇门遁甲：具体事件、短期决策、成败应期
        ├─► 八字命理：命局结构、长期趋势、行业适配
        ├─► 联合推演：命局背景 × 当前事件
        └─► 信息追问：补全关键条件后再进入推演
              │
              └─► 领域规则注入
                    │
                    └─► 主推演引擎
                          │
                          └─► 结构化决策卡片
```

---

## 技术栈

```text
前端框架      Vue 3、组合式接口、Pinia、Vue Router、vue-i18n
后端          Cloudflare Workers
数据库        Supabase Auth、Postgres、行级安全策略
AI 模型       Gemini 兼容接口
历法计算      lunar-javascript
构建工具      Vite
测试          Node.js Test Runner
线上形态      Cloudflare Pages + Cloudflare Workers
```

### 工程特性

- **确定性算分**：日运、月运、年运评分由本地规则引擎生成，大模型不能擅自改分
- **缓存分层**：运势结果写入数据库，前端也有本地缓存与内存缓存
- **预热机制**：登录后可预热未来七天日运，减少首次打开等待
- **接口兜底**：八字断语失败时回退本地规则，运势文案失败时仍先展示分数
- **测试覆盖**：覆盖跨域配置、八字接口、访客模式、缓存、预热、月运、年运等核心逻辑
- **单文件接口入口**：所有后端接口收敛在 `worker/src/index.js`，方便维护与审计

---

## 本地开发

```bash
npm install
npm run dev
npm test
npm run build
```

### 后端本地调试

```bash
cd worker
npx wrangler dev
```

后端会在 `http://localhost:8787` 启动，前端代理会自动将 `/api/*` 请求转发到该地址。

---

## 运维说明

这是作者维护的个人网站，线上服务由 Cloudflare Workers、Cloudflare Pages、Supabase 与 Gemini 兼容接口组成。本文档只保留项目形态与本地开发说明，不提供公开部署教程、密钥配置或自建实例步骤。

数据库迁移脚本保留在 `docs/sql/`，用于作者维护表结构与功能迭代。

---

## 项目结构

```text
/
├── worker/          # 后端接口入口与 Cloudflare Workers 配置
├── lib/             # 奇门、八字、运势评分和提示词构建核心逻辑
├── src/             # Vue 前端应用
├── docs/sql/        # 数据库迁移脚本
├── mock/            # 前端访客与测试模拟数据
├── public/          # 静态资源与单页应用兜底配置
├── archive/         # 历史接口与旧版原型
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
- 九宫排盘可视化，值符、值使、空亡、马星同步标注
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

- 阳历、农历、四柱录入，支持出生地与真太阳时校正
- 四柱主星、藏干、星运、自座、空亡、纳音、神煞与专业细盘
- 大运、流年、流月联动时间轴
- 生克合化可视化与天机锦囊
- 八字校准反馈与断语再生成

<p align="center">
  <img src="https://i.imgur.com/Dr5tEar.jpeg" width="220" alt="日运分数"/>
  &nbsp;
  <img src="https://i.imgur.com/lnU5q6I.png" width="220" alt="月度分数与曲线"/>
  &nbsp;
  <img src="https://i.imgur.com/397MAVl.jpeg" width="220" alt="月运详批"/>
</p>

**运势面板包含：**

- 日运：七日切换、分数先行、断语异步补齐、吉时与开运指南
- 月运：节气流月、月度曲线、高低分日、低谷期、四维度月度详批
- 年运：前后十年区间、大运背景、流年十神、原局关系与岁运信号
- 命主切换与前端缓存回放

---

## 设计理念

**诚实的推演**

提示词中明确禁止“因为问题积极就盲目高分”。凶象必须如实呈现，吉象才有说服力。

**算法的权威性**

日主强弱、喜忌神、日月年评分都由本地确定性引擎完成。大模型是表达层，不是判分层。

**语境决定象意**

同一个盘面信号，在事业、感情、健康、竞技、交易中含义不同。项目通过问题域、八字档案与现实背景，把象意落到更具体的处境里。

---

## 鸣谢

- [lunar-javascript](https://github.com/6tail/lunar-javascript) — 干支历法底层计算
- [Google Gemini](https://deepmind.google/technologies/gemini/) — AI 推演引擎
- [Supabase](https://supabase.com) — 数据库与认证服务
- [Vue 3](https://vuejs.org) — 前端框架
- [Vite](https://vitejs.dev) — 构建工具
- [Cloudflare Workers](https://workers.cloudflare.com) — 无服务器接口运行时

---

## 开源协议

MIT License · 可自由使用、修改与分发，保留原作者声明即可。

> 玄学推演结果仅供参考，请理性决策。  
> 天机可以问，终究要自渡。
