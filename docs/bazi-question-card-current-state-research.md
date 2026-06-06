# 八字问事卡片现状研究报告

> 分支：`preview/bazi-report-restructure`
> 范围：问事（`/api/bazi-question`）链路下，八字分支从语义路由到前端出组件的完整逻辑
> 目的：①梳理静态/动态分支、命理解读出组件、后端计算、LLM 契约、最终输出；②论证两个核心问题——profile_driven 场景如何出组件、命局解读产物如何反向引导 LLM

---

## 一、整体链路

```
用户问题
  │
  ▼
[路由层] /api/divination-route （LLM 语义分类）→ route { branch, category, subcategory, analysis_mode... }
  │
  ▼
[问事入口] worker/src/index.js handleBaziQuestion
  │  buildBaziQuestionPrompt({ profile, question, route })
  │
  ├─▶ normalizeBaziSemanticRoute + inferBaziRouteFromQuestion （规则二次裁决 analysis_mode）
  │
  ├─▶ 按 analysis_mode 分派到 5 条 pipeline（见 §2）
  │     每条 pipeline 产出 { prompt, pipelineResult }
  │     pipelineResult = { targetSpec, stateReport, dynamicReport?, timingCandidates? }
  │
  ▼
[LLM 推演] requestLLM(prompt) → llmJson（统一 envelope，见 §4）
  │
  ▼
[组装层] normalizeBaziQuestionOutput(llmJson, { pipelineResult })
  │  把 pipeline 的 quality / trigger_windows 回填进 readings
  │
  ▼
[SSE 输出] outputWithSnapshot = { ...output, state_report, target_spec, dynamic_report, timing_candidates, five_shens, subject_snapshot }
  │
  ▼
[前端] HomeView.vue
  │  buildCardHTML → 5 个 tab（结论先行/命局解读/推演解读/时间节奏/行动建议）
  │  命局解读 section 内有 #bazi-panel-anchor
  │  Teleport 注入 BaziStaticPanel + BaziDynamicPanel（依赖 state_report）
```

关键文件：

| 层 | 文件 | 职责 |
|---|---|---|
| 目标元素解析 | `lib/baziTargetElement.js` | subcategory→category→general 三级回退，产出 targetSpec |
| 原局静态评估 | `lib/baziStateAssessor.js` | 目标十神/宫位的旺衰、刑冲合害、入墓、空亡 → stateReport |
| 动态引动评估 | `lib/baziDynamicAssessor.js` | 大运+流年干支对目标元素的引动机制 → dynamicReport |
| Prompt 装配 + 组装 | `lib/baziQuestionCore.js` | 5 mode 的 pipeline、prompt、normalize 输出 |
| Worker 入口 | `worker/src/index.js` | handleBaziQuestion / handleBaziPanel |
| 静态面板 | `src/components/BaziStaticPanel.vue` | 四柱牌面 + 目标十神/宫位卡 + 稳定性结论 |
| 动态面板 | `src/components/BaziDynamicPanel.vue` | status 单运 / timing 单运 / timing 跨大运轮播 |
| 卡片装配 | `src/views/HomeView.vue` | buildCardHTML + Teleport 注入 + 模式降级 |

---

## 二、五种分析模式（analysis_mode）

模式由路由 LLM 给出，再由 `inferBaziRouteFromQuestion`（`baziQuestionCore.js:157`）做规则二次裁决（命中"什么时候/哪年/未来五年"→timing；命中"画像/对象/性格"→character；命中"适合/格局/创业还是打工"→pattern；年龄区间→强制 timing）。

| mode | 静/动 | pipeline | 走 targetSpec? | 是否出动态面板 | 典型问题 |
|---|---|---|---|---|---|
| **status** | 动态（当前大运+当年流年） | `runStatusPipeline` | ✅ | ✅ 单运卡（大运建场+流年触发） | "我今年事业怎么样" |
| **timing** | 动态（候选年逐年遍历+排序） | `runTimingPipeline` | ✅ | ✅ 候选年列表/跨大运轮播 | "五年内能结婚吗" |
| **pattern** | 静态（先天结构/容量） | `runStaticPipeline`(可选 secondary=status) | ✅ | secondary=status 时才有 | "我适合创业还是打工" |
| **character** | 静态（人物画像） | `runStaticPipeline`(可选 secondary=status) | ✅ | secondary=status 时才有 | "我老公什么性格" |
| **profile_driven** | **绕过 pipeline** | 无 | ❌ | **❌ 无任何面板** | 开放战略型/路由低置信 |

此外还有一条 `target_resolution === 'llm_derived'` 旁路（`baziQuestionCore.js:1547`）：后端没有可用 targetSpec 时直接交 LLM 自拟框架，同样 `pipelineResult: null`，也不出面板。

**关键事实：profile_driven 与 llm_derived 两条路径 `pipelineResult` 恒为 `null`**（`baziQuestionCore.js:1547-1559`）→ 后端不计算 state_report → 前端 `syncBaziPanelAnchor` 因 `!state_report` 不挂载面板（`HomeView.vue:1618`）→ `computePanelData` 对 profile_driven 直接 `return null`（`baziQuestionCore.js:1845`）→ `fetchMissingPanelData` 也对 profile_driven 提前 return（`HomeView.vue:1628`）。

---

## 三、命局解读如何"出组件"

### 3.1 后端计算产物

**targetSpec**（`baziTargetElement.js`）携带 `fallback_level`，这是置信度的源头：

- `subcategory`：精确命中 32 个子类映射表（如 `relationship_timing.male` → 妻星[正财/偏财]+妻宫[日支]+动态机制[合动/冲动/开墓库/妻星透干]）。**唯一可给 high confidence 的层级。**
- `category`：只命中大类（如 finance_wealth → [正财,偏财]），机制泛化。
- `general`：完全无映射，`primary_shishen: []`、`primary_gongwei: []`，只能靠"用神/忌神"兜底——**此时静态评估几乎拾取不到任何目标十神**。

**stateReport**（`baziStateAssessor.js`）：对 targetSpec 里的 primary_shishen / primary_gongwei 逐个定位、评估旺衰（十二长生 vigor）、刑冲合害、入墓、空亡、盖头截脚，产出 `shishen_assessments[]` / `gongwei_assessments[]` / `overall_stability` / `base_state`。

**dynamicReport**（`baziDynamicAssessor.js`）：大运/流年干支对目标元素的引动机制（透干引动/合动/冲动/开墓库/伏吟/填实三合…），每条机制带 `vigor_check.is_effective`（旺衰校验是否有效）与 `target_pillar`。

### 3.2 前端出组件

**BaziStaticPanel**：四柱牌面（永远显示，靠 matrix）+ 格局/形象/调候 + 目标十神卡 + 目标宫位卡 + 稳定性结论。

- 目标十神卡用 `buildMechanismLines` 把 stateReport 拆成"旺衰底盘/空亡折扣/盖头截脚/入墓封藏/刑冲干扰/合化变质"分行。
- `yongshenRelation`（`BaziStaticPanel.vue:293`）：把 targetSpec.primary_shishen 与 profile.five_shens 的喜忌做交集，输出"目标十神与命局用神同向/为忌神/喜忌混杂/闲神"——**这是当前唯一一处把置信度语义化呈现给用户的地方**，但它依赖 five_shens 且不读 fallback_level。

**BaziDynamicPanel**：通过 targetMap（`HomeView.vue:805`，由 shishen_assessments + gongwei_assessments 的 pillar 反查）把每条动态机制的 `target_pillar` 映射回十神/宫位 chip，实现"引动关系"的可视化拾取。

### 3.3 引动关系拾取的前提链条

```
fallback_level=subcategory  →  primary_shishen/gongwei 精确
  →  stateReport 能定位到具体柱位
  →  dynamicReport 机制带正确 target_pillar
  →  targetMap 反查命中
  →  动态面板能显示"甲透干引动月柱才星"这类引动 chip
```

任何一环退化（尤其 fallback_level 掉到 general），整条拾取链断裂。**这正是问题一的技术根因。**

---

## 四、LLM 输出契约（统一 envelope）

所有 mode 共用 `buildUnifiedOutputSchemaBlock`（`baziQuestionCore.js:786`）的外壳：

```jsonc
{
  "meta": { "analysis_mode", "secondary_mode", "category", "subcategory",
            "target": { "shishen", "gongwei", "fallback_level", "llm_derived_target" },
            "confidence": "high|medium|low", "limitations": [] },
  "verdict": "一句话定论 40-80字",
  "key_signals": [ { "title", "reading" } ],   // 渲染为"命局信号"inference-card
  "readings": { ...因 mode 而异... },           // buildReadingsSchema
  "rhythm": { "segments": [...] },              // 渲染为"时间节奏"tab
  "action_guide": { "do", "avoid", "hidden_insight" }
}
```

`readings` 是 mode 专属契约（`buildReadingsSchema`，`baziQuestionCore.js:841`）：

| mode | readings 关键字段 | 前端渲染位置（buildCardHTML） |
|---|---|---|
| status | psychological_mirror / movement_nature / dayun_reading / liunian_reading / target_state_reading / outcome_projection | 推演解读 tab 的 inference-card 序列 |
| timing | scanned_years / **trigger_windows[]** / best_window / avoid_window | trigger_windows 渲染为窗口卡；avoid_window→动态面板规避栏 |
| pattern | capacity_level / pattern_verdict / structural_supports / structural_risks / real_world_expression / how_to_leverage | 推演解读 tab |
| character | portrait_subject / appearance/personality/career_tendency(各带 confidence+evidence) / relationship_dynamic | 画像块 |
| profile_driven | framework_used / psychological_mirror / structural_reading / **path_readings[]** | 推演解读 tab |

**组装层回填**（`normalizeBaziQuestionOutput`，`baziQuestionCore.js:1628`）：
- status：把 pipeline 算出的 quality / is_major_window / trigger_vigor 注入 `readings._pipeline`。
- timing：以 LLM 选中的 `trigger_windows[].year` 去 `timingCandidates` 里匹配，回填 quality/is_major_window/_pipeline；LLM 选了未扫描年份则记入 limitations。

约束护栏：`buildGroundingConstraintBlock`（`baziQuestionCore.js:1095`）强制"所有机制只能引用系统已注入内容，缺失须写 limitations，不得编造"；并显式禁止把"已注入的动态数据"误写成"数据缺失"。

---

## 五、问题一：profile_driven（识别不准）场景如何出组件

### 5.1 现状缺口

- profile_driven / llm_derived 走 `pipelineResult: null`，**完全不出静态/动态面板**。命局解读 section 只剩 `key_signals` 的"命局信号"inference-card + 一个空的 `#bazi-panel-anchor`。
- 用户视觉落差大：status/timing 有精美的四柱牌面+引动卡，profile_driven 只有纯文字流，看起来像"降级残废版"。
- profile_driven 的 prompt（`buildProfileDrivenPrompt`，`baziQuestionCore.js:1481`）其实喂了**完整命盘+未来 50 年大运流年**（`formatSizhuDetailBlock`），数据比 status 还全，但前端一个结构化组件都没出。

### 5.2 根因

不是"算不出"，而是"主动不算"——profile_driven 的设计意图是"让 LLM 自主选框架"，所以跳过了 targetSpec 预定位。但跳过 targetSpec ≠ 不能出任何面板：四柱牌面、格局/形象/调候、全局喜用神，这些**与 targetSpec 无关**的静态信息完全可独立计算。

### 5.3 建议方案（分层出组件）

**方案 A（推荐，低风险）：拆出"无目标"静态面板**

把 BaziStaticPanel 的"四柱牌面 + 格局/形象/调候 + 命主旺衰/喜用神"作为**不依赖 targetSpec 的基础层**，profile_driven 也能出：

1. 后端新增一条轻量 pipeline：profile_driven 时也调用 `assessOriginalChartState`，但 targetSpec 用 GENERAL_FALLBACK（只算四柱/格局/形象/调候/overall 喜用，不强求 primary_shishen 定位）。
2. 前端 BaziStaticPanel 支持"目标十神/宫位为空"时隐藏这两个 section，只渲染牌面+结构+稳定性。
3. 动态面板：profile_driven 不出引动卡（因为没有目标 pillar），但可出一个"当前大运流年 + 未来关键流年时间轴"的轻量版（数据来自 prompt 已有的 dayun/liunian list）。

**方案 B：LLM 自拟 target 回流**

让 profile_driven 的 LLM 输出 `meta.target.llm_derived_target`（已在 schema 里预留），前端据此渲染一个"LLM 推断的关注十神（低置信标注）"chip 区，明确告知用户"这是模型推断，非规则结论"。配合方案 A 的基础面板。

**置信度可视化（横切两方案）**：
- 在面板顶部统一加 `fallback_level` / `confidence` 徽章：subcategory→"精准定位"、category→"领域通用框架"、general/profile_driven→"开放推演（低置信）"。
- 复用已有的 `yongshenRelation`（`BaziStaticPanel.vue:293`）的 LOW confidence 文案模式，扩展到面板级。

**结论**：profile_driven 不该"不出组件"，而该"出降级但诚实的组件"——基础命盘恒出，目标相关层按 fallback_level 渐进显示，并显式标注置信度。

---

## 六、问题二：命局解读产物如何反向引导 LLM（分支级 Prompt + 字段优化）

### 6.1 现状

- pipeline 产物（stateReport/dynamicReport）→ `formatStateReportForPrompt` / `formatDynamicReportForPrompt` / `formatTimingCandidatesForPrompt` 转成自然语言断语包注入 prompt——**单向**：算好喂给 LLM。
- LLM 输出 readings → 组装层只做 quality/trigger_windows **机械回填**，没有"用 pipeline 结论校验 LLM 文本"的闭环。
- 各 mode 的 readings 字段是固定模板，**没有按 fallback_level 动态裁剪**：general 级也要求 LLM 填满 dayun_reading/liunian_reading/target_state_reading，逼 LLM 在缺乏目标定位时硬写，易产出空话或编造。

### 6.2 建议优化（按分支）

**(1) status / timing（targetSpec 精准，引动链完整）**
- 字段层：trigger_windows 已是强结构，建议在 schema 里把 `mechanisms_text` 升级为结构化 `mechanisms[]`（type+target+effect），直接对齐 dynamicReport 机制，前端动态面板可直接复用，减少 LLM 自由发挥导致的术语漂移。
- Prompt 层：现有护栏（必须引用"引动有效/无效""三合成局"标签）已较强，可补一条"trigger_vigor 已由系统给出，verdict 中的强弱排序必须与 quality 一致，不得逆排"。

**(2) pattern / character（静态，secondary 可选）**
- 字段层：每个画像/结构字段已带 `confidence`+`evidence`（character），建议 pattern 的 structural_supports/risks 也强制 evidence 绑定到具体柱位，使前端能高亮对应四柱。
- Prompt 层：现有"非 subcategory 级不得给 high confidence"（`baziQuestionCore.js:1151`）应**从 prompt 文字提升为组装层硬校验**——若 fallback_level≠subcategory 而 LLM 仍输出 confidence:high，组装层强制降级并记 limitations。

**(3) profile_driven / llm_derived（低置信）**
- 字段层：`path_readings[]` 是好结构，但缺 confidence 标注；建议每条 path 加 `confidence` + `structural_evidence`（引用的干支），前端按 confidence 分色。
- Prompt 层：把"完整命盘 50 年"利用起来——要求 LLM 在 rhythm.segments 里**必须引用 prompt 中已列出的具体流年干支**（已有约束但偏弱），组装层可做"LLM 提到的年份是否在注入列表内"的校验，越界则记 limitations（与 timing 的 unmatchedYears 机制一致，目前 profile_driven 无此校验）。

**(4) 横切：建立"pipeline→LLM→pipeline 校验"闭环**
- 现状组装层只对 timing 做了 year 越界校验。建议把这套"系统结论 vs LLM 文本一致性校验"推广：
  - status：LLM 的 movement_nature.type 是否与 dynamicReport 的主导机制方向一致（如系统判"被动换"而 LLM 写"主动换"→记 limitations 或降权）。
  - 通用：confidence 与 fallback_level 的一致性硬约束（见上）。
- 这能把"命局解读产物"从"单向投喂"升级为"双向校验"，真正用规则结论约束 LLM 自由发挥。

### 6.3 字段优化优先级

| 优先级 | 改动 | 收益 | 风险 |
|---|---|---|---|
| P0 | confidence ↔ fallback_level 组装层硬校验 | 杜绝低置信场景虚高断言 | 低（纯后端） |
| P0 | profile_driven 也出基础静态面板（问题一方案A） | 消除视觉降级落差 | 中（需改 computePanelData + 面板空态） |
| P1 | trigger_windows.mechanisms 结构化 | 动态面板复用、减少术语漂移 | 中（改 schema+前端） |
| P1 | profile_driven path_readings 加 confidence+evidence | 低置信可视化诚实 | 低 |
| P2 | status movement_nature 与 dynamicReport 方向一致性校验 | 减少自相矛盾 | 中 |

---

## 七、近期已修复的相关 bug（本次会话）

1. `worker/src/index.js:923` — `outputWithSnapshot` 补 `timing_candidates`，否则 timing 模式前端 `baziPanelTimingWindows` 恒空，动态面板出空壳。
2. `HomeView.vue:820` — `baziPanelMode` 在无 timing_candidates 时降级到 status，避免旧存量记录出空 timing 视图。
3. `BaziDynamicPanel.vue:912` — `.tt-state-flow` 加 `flex:1/min-width:0`、`.tt-base` 加 ellipsis 截断，修复多星（财多身弱）长 base_state 挤成竖窄列的布局问题。

---

## 八、一句话总结

当前八字问事链路在 **subcategory 精准命中**时是一套完整、自洽、可视化拾取引动关系的好系统；短板集中在**低置信（category/general/profile_driven）退化路径**——后端"主动不算"导致前端"不出组件"，且 LLM 契约未按置信度分级裁剪与校验。两个问题本质同源：**置信度（fallback_level）应该成为贯穿"出不出组件"和"怎么引导/校验 LLM"的一等公民**，而不是只埋在 targetSpec 里、仅在一处 yongshenRelation 文案里被间接用到。

---

# 第二部分：Prompt 调优产品方案（v2 输出契约）

> 本部分为**待实施的产品方案**，先定契约、后改代码。
> 核心设计哲学：**字段即组件**——`readings` 的每个子模块 1:1 对应前端一个可渲染块；**置信度门控**——用神/领域识别置信度高时强制贴合 panel 后端计算，置信度低时允许模型自由发挥。

## 9.0 总原则

1. **字段即组件**：删掉现有 readings 里"散文式自由字段"（psychological_mirror / movement_nature / outcome_projection 等），改为与 UI 子模块严格对应的结构化字段。LLM 产什么，前端就渲染什么，不再有"产了不渲染/渲染没数据"的错位。
2. **置信度门控**（贯穿所有字段）：
   - `fallback_level === 'subcategory'`（高置信）：所有"现象/机制"类字段**必须引用 panel 后端已给的断语**（stateReport / dynamicReport / timingCandidates），不得自创干支关系。
   - `fallback_level ∈ {category, general}` 或 profile_driven（低/无置信）：放开约束，允许 LLM 基于命盘自主分析，但**必须在 meta.limitations 标注"开放推演，非规则结论"**，且对应字段降级（见 §9.6）。
3. **字数/条数硬约束写进 schema**：每个字段在 schema 注释里写死字数上限和条数上限，组装层做长度兜底截断。

## 9.1 共性字段（所有 mode 都要产出）

```jsonc
{
  "meta": { /* 不变：analysis_mode, target, fallback_level, confidence, limitations */ },

  "summary": {
    "title": "大字标题（hero 主标题，≤16字，凝练定性，非问题复述）",
    "conclusion": "hero 内小字（40-80字，开门见山回答问题：方向+核心理由+节奏）"
  },

  "summary": {
    "title": "...",
    "conclusion": "...",
    "basis": "80-160字：总结命局特点 + 本问题后端（用神/宫位定位、引动计算）和 LLM 各考虑了哪些因素 + 得到的重要结论。沿用现有 summary.basis 位置。"
  },

  "readings": { /* mode 专属，见 §9.2~9.6 */ },

  "action_guide": {
    "text": "80-160字：对上述内容的总结 + 对用户后续想法/行为的纲领性指引",
    "items": ["1-4条具象行动指引；尽量覆盖规避风险 / 借势行动 / 建议节奏等多个维度，但由模型按命局实际自由发挥，不必每维都凑"]
  }
}
```

> 决策（三个待确认项已敲定）：
> - **①basis 保留在 `summary.basis`**（不提顶层）。省一次结构迁移，适配器对 `summary.basis` / `summary.score_basis.score_logic` 两种老形态都容错回退。`summary` 仍删除 score、score_basis、keyword。
> - **②action_guide 改"软引导"**：**不再用 do/avoid/hidden_insight 三槽**——三槽会诱导 LLM 硬往三个方向凑。改为 `{ text, items[] }`，prompt 里只说"给出行动建议，尽量覆盖规避/借势/节奏等面，但不硬凑"。让模型按命局实际自由组织。character 维持现状。
> - **③trigger_windows.strength 后端产 5 档**（见 §9.3 与 §9.12）：后端有足够原始信号（effective_strength 0–100 + trigger_vigor 0–1 + is_major_window），按陆致极理论映射，LLM 不自评强度。

## 9.2 mode = status（动态：当前大运 + 当年流年）

```jsonc
"readings": {
  "base_foundation": {                         // ① 原局底盘
    "text": "80-160字：基于用户问题 + 八字原盘的解读，须贴合静态组件（stateReport）的呈现",
    "signals": ["1~3条：基于原局底盘 + 目标用神状态提炼的关键信号"]
  },

  "target_state": [                            // ② 目标用神状态（≤3条）
    {
      "title": "≤15字：目标用神拾取逻辑/状态点（如『正官藏于年支』）",
      "text":  "≤50字：白话解释该用神为何被选为目标、当前什么状态"
    }
  ],

  "dayun_field": {                             // ③ 大运建场
    "text": "80-240字：原局在大运下的现象 + 大运 dynamicPanel 机制的白话解读；★必须映射到用户自身变化与外部环境变化"
  },

  "liunian_trigger": {                         // ④ 流年触发
    "text": "80-240字：原局在大运流年下的现象 + 流年 dynamicPanel 机制白话解读；★必须映射自身 + 外部环境变化",
    "phenomena": [                             // ≤4条：命盘在岁运中的"重要移动"
      {
        "tag":     "≤10字：现象标签（如『申冲月支寅』『用神癸水受克』）",
        "explain": "≤40字：该现象对本问题的含义解释"
      }
    ]
  }
}
// + 共性 action_guide
```

数据来源约束（高置信时）：
- `base_foundation` / `target_state` ← stateReport（shishen_assessments / gongwei_assessments / overall_stability / base_state）
- `dayun_field` ← dynamicReport.dayun_impact（field_type / mechanisms / gaitou_jiejiao）
- `liunian_trigger.phenomena` ← dynamicReport.liunian_impact.mechanisms + stateReport 的刑冲合害（**这正是动态面板已经在渲染的那批机制**，二者同源，避免术语漂移）

## 9.3 mode = timing（动态：候选年遍历 + 排序）

```jsonc
"readings": {
  "base_foundation": { /* 同 status ① */ },
  "target_state":    [ /* 同 status ② */ ],

  "trigger_windows": [                         // ③ 引动窗口：取 topN，N≤5
    {
      "year": 2029,
      "ganzhi": "己酉",
      "strength": "最强|次强|较强|中等|一般",   // 引动强度分级定性（★见下：后端权威）
      "phenomena": ["≤3条：贴合大运流年 panel 的现象"],
      "verdict": "≤80字：该年断语"
    }
  ],

  "best_window":  { "year": 0, "reason": "" }, // ④ 可选：仅当问题有明显"建议时间偏好"时产出
  "worst_window": { "year": 0, "reason": "" }  //    可选：仅当问题有明显"不建议时间偏好"时产出
}
// + 共性 action_guide
```

关键约束：
- **领域-年龄过滤**：候选年必须与咨询领域契合（怀孕仅 20–50 岁、升学仅 ≤30 岁 等）。建议在**后端候选年生成阶段**按领域加 age-range 预过滤（`resolveCandidateYears` / `runTimingPipeline`），prompt 再补一条软约束兜底，避免 LLM 返回离谱年份。
- **strength 后端权威**：`strength` 的分级不由 LLM 自由发挥，而由后端 `rankTimingCandidate` 的 quality/rank_score 映射出 5 档（最强/次强/较强/中等/一般），LLM 只负责写 `phenomena` + `verdict`。组装层校验 LLM 给的 strength 与后端档位一致，不一致以后端为准并记 limitations。
- **best/worst 可选**：不是每个 timing 问题都有时间偏好（"哪年最旺财"有偏好；"未来十年财运节奏"未必）。无偏好时这两个字段省略。

## 9.4 mode = pattern（静态：先天结构/容量）

```jsonc
"readings": {
  "base_foundation": { /* 同 status ① */ },
  "target_state":    [ /* 同 status ② */ ],

  "structural_supports": ["≤3条：原局在 panel 中支撑本领域的重要现象"],   // ③ 结构支撑
  "structural_risks":    ["≤3条：原局在 panel 中制约本领域的重要现象"],   //    结构风险
  "structural_verdict":  "supports + risks 的综合断语，共≤120字"
}
// + 共性 action_guide
```

> secondary_mode=status 时，额外允许在 `base_foundation.text` 末尾或 action_guide 中点一句当前大运流年是否适合推进（不展开成应期）。

## 9.5 mode = character

**本轮不变**，维持现有 portrait_subject / appearance_tendency / personality_tendency / career_style / relationship_dynamic（各带 confidence + evidence）契约。仅同步共性字段改动（summary 砍字段、basis 提层）。

## 9.6 mode = profile_driven / llm_derived（低置信兜底）

- 复用共性字段（summary/basis/action_guide）。
- `readings` 采用 **status 的子模块骨架**（base_foundation / target_state / dayun_field / liunian_trigger），但：
  - 解除"必须贴合 panel"约束（因为无 stateReport/dynamicReport）；
  - `target_state` 改为"LLM 自拟关注十神线"，每条强制带 `confidence` 标注；
  - `meta.confidence` 锁定为 low，`meta.limitations` 必须写明"开放推演，非后端规则结论"。
- 配合第一部分 §5.3 方案 A：即使 profile_driven 也出"无目标基础静态面板"（四柱牌面+格局+喜用），让 base_foundation 文本有对应的可视组件。

## 9.7 与现状 schema 的 Diff

| 字段 | 现状 | v2 方案 | 动作 |
|---|---|---|---|
| summary.score / score_basis / keyword | 有 | 删 | **删除** |
| summary.title / conclusion | 有 | 保留 | 保留 |
| basis | 埋在 summary.basis（命名不一） | 提为顶层 `basis` | **重命名+提层** |
| readings.psychological_mirror | status 有 | 并入 dayun_field/liunian_trigger 的"映射自身变化" | **删字段、语义并入** |
| readings.movement_nature | status 有 | 删（并入文本叙述） | **删除** |
| readings.dayun_reading / liunian_reading | status 有 | → `dayun_field.text` / `liunian_trigger.text`（加"映射内外环境"+扩到 240字） | **改名+增强** |
| readings.target_state_reading | status 单文本 | → `target_state[]`（标题+文本列表，≤3条） | **改结构** |
| readings.outcome_projection | status 有 | 删（价值并入 action_guide） | **删除** |
| readings.base_foundation | 无（base_state 散在别处） | 新增 { text, signals[] } | **新增** |
| readings.liunian_trigger.phenomena | 无 | 新增（≤4条 tag+explain，源自 dynamicReport 机制） | **新增** |
| readings.trigger_windows[].mechanisms_text | 自由文本 | → `phenomena[]`（≤3条结构化）+ `strength`（后端权威） | **改结构** |
| readings.scanned_years / best_window(字符串) | 有 | best/worst_window 改为 {year,reason} 可选对象 | **改结构** |
| readings.structural_supports/risks | pattern 有（字符串数组） | 保留数组 + 增 `structural_verdict`(120字) | **微调** |
| action_guide.do/avoid/hidden_insight | 顶层三段式 | → { text(80-160字), items[](1-4条多维度) } | **改结构** |

## 9.8 置信度门控规则（组装层硬校验）

| 检查 | 条件 | 动作 |
|---|---|---|
| confidence ↔ fallback_level | fallback_level≠subcategory 但 LLM 给 confidence=high | 强制降为 medium，记 limitations |
| phenomena 引用校验（高置信） | fallback_level=subcategory 时，phenomena.tag 是否能在 dynamicReport/stateReport 机制里找到对应 | 找不到的条目剔除或标注"模型补充" |
| trigger_windows.strength | 与后端 quality/rank_score 档位不一致 | 以后端为准覆盖 |
| trigger_windows.year | 不在 scanned_years 内 | 剔除 + 记 limitations（现状仅 timing 有，保留） |
| 领域-年龄越界 | timing 候选年超出领域合理年龄段 | 后端预过滤 + LLM 兜底 |

## 9.9 前端渲染映射

| v2 字段 | 渲染组件/位置 | 现有可复用 |
|---|---|---|
| summary.title / conclusion | hero 大字/小字 | `mag-hero`（现成） |
| basis | 结论先行 tab 正文 或 hero 下方 | 现 verdict 区可承接 |
| readings.base_foundation | 命局解读 tab：BaziStaticPanel 上方文本 + signals chips | 复用 signalsFlowHTML |
| readings.target_state[] | BaziStaticPanel 目标十神区 / 或独立 标题+文本 列表 | 部分复用 yongshenRelation |
| readings.dayun_field.text | BaziDynamicPanel"大运建场"卡下方解读文本 | 动态面板已有卡，补文本槽 |
| readings.liunian_trigger.text + phenomena | BaziDynamicPanel"流年触发"卡 + phenomena 渲染为 mech 行 | 动态面板 mech-row 现成 |
| readings.trigger_windows[] | 候选年列表（截图那套表格：流年/分析要点/动婚力） | BaziDynamicPanel timing 视图现成 |
| readings.structural_supports/risks/verdict | 推演解读 tab：双列支撑/风险 + 断语 | 新增轻量块 |
| action_guide.text + items | 行动建议 tab | 复用 guidance-card |

## 9.10 落地步骤建议（先 Prompt 后渲染）

1. **P0 改 `buildReadingsSchema` + 各 `buildXxxPrompt`**（`baziQuestionCore.js`）：按 §9.1~9.6 重写 schema 与推演任务说明，加入置信度门控话术。
2. **P0 改 `normalizeBaziQuestionOutput`**：summary 砍字段、basis 提层、action_guide 转结构；加 §9.8 的硬校验（confidence 降级、strength 覆盖、phenomena 引用校验）。
3. **P1 后端候选年领域-年龄预过滤**（`runTimingPipeline` / `resolveCandidateYears`）。
4. **P1 前端 buildCardHTML + 两个 panel**：按 §9.9 接新字段；dayun_field/liunian_trigger 文本槽、phenomena 行、structural 双列块。
5. **P2 profile_driven 基础面板**（联动第一部分 §5.3 方案 A）。

> 待确认项：①`basis` 是提为顶层还是保留 `summary.basis`（本方案按顶层写）；②`action_guide` 是否彻底替换现有 do/avoid/hidden_insight（本方案按替换写，character 除外）；③trigger_windows.strength 的 5 档与后端现有 3 档 quality(strong/medium/weak) 的映射表需补一版。

## 9.11 存量数据兼容（contract 变更必做）

### 9.11.1 为什么必须做

contract 改了字段名/结构，但数据库里已有大量按 **v1 契约**存的历史问事记录（`saveRecordToDatabase` 存的 `qimen_data`）。关键事实：

> **老记录从 DB 读出后，不经过 worker 的 `normalizeBaziQuestionOutput`**（那只在新请求链路跑），而是直接进 `activateBaziResultPanel` → `buildCardHTML`（`HomeView.vue:1693,1923`）。

所以如果直接把 `buildCardHTML` 改成读 v2 新字段（base_foundation / dayun_field / target_state[] / action_guide.items …），**所有历史记录会渲染成空白块**——这正是本次会话开头 timing 空壳 bug 的同类问题，必须前置解决。

### 9.11.2 方案：统一的 read-time 适配器（单一入口）

新增一个**纯函数** `adaptBaziResultToV2(data)`（建议放 `lib/baziQuestionCore.js` 导出，前后端共用、可单测）：

- 入口幂等：v2 数据进去原样出（靠 `meta.schema_version === 2` 短路）；v1 数据进去映射成 v2 出。
- 调用点**两处**，保证 buildCardHTML 永远只面对 v2：
  1. worker `normalizeBaziQuestionOutput` 末尾 → 给新输出盖 `meta.schema_version = 2`（新数据天然 v2）。
  2. 前端读取路径：`activateBaziResultPanel(data)` 和历史记录 `loadRecord` 进入渲染前，先 `data = adaptBaziResultToV2(data)`。
- **不做 DB 迁移写回**（只读适配）：避免批量回写风险；老记录留在库里仍是 v1，每次读时即时适配。若后续要省算力可加"读到即懒迁移回写"，非必须。

### 9.11.3 v1 → v2 字段映射表（适配器实现依据）

| v2 目标字段 | v1 来源（按优先级回退） | 处理 |
|---|---|---|
| `summary.title` | `summary.title` | 直接取 |
| `summary.conclusion` | `summary.conclusion` ‖ `verdict` | 回退到 verdict |
| `basis` | `basis` ‖ `summary.basis` ‖ `summary.score_basis.score_logic` | 多级回退 |
| `readings.base_foundation.text` | `chart_foundation.base_state` ‖ `analysis.pattern` ‖ `readings.pattern_verdict` | 老 base_state 散落处兜底 |
| `readings.base_foundation.signals` | `key_signals[].title` 取前 3 | 老 key_signals 降维 |
| `readings.target_state[]` | `readings.target_state_reading`(单文本) → 包成 `[{title:'目标用神状态', text}]` | 单→数组 |
| `readings.dayun_field.text` | `readings.dayun_reading` ‖ `dayun_liunian.dayun_verdict` | 改名回退 |
| `readings.liunian_trigger.text` | `readings.liunian_reading` ‖ `dayun_liunian.liunian_verdict` | 改名回退 |
| `readings.liunian_trigger.phenomena[]` | 无 → 优先用前端实时 `dynamic_report.liunian_impact.mechanisms` 兜底；都没有则 `[]`（前端空态隐藏） | panel 同源兜底 |
| `readings.trigger_windows[].strength` | `trigger_windows[].quality`(strong/medium/weak) → 映射 5 档 | 见 §9.11.4 |
| `readings.trigger_windows[].phenomena[]` | `trigger_windows[].mechanisms_text`(string) → 包成 `[{tag:'', explain: mechanisms_text}]` | 字符串→单条 |
| `readings.trigger_windows[].verdict` | `trigger_windows[].verdict` | 直接取 |
| `readings.best_window` | `readings.best_window`(字符串) → `{year:null, reason: 原字符串}` | 字符串→对象 |
| `readings.worst_window` | `readings.avoid_window`(字符串) → `{year:null, reason}` | 改名+对象化 |
| `readings.structural_supports/risks` | 同名 v1 字段 | 直接取 |
| `readings.structural_verdict` | `readings.pattern_verdict` 截断 ‖ '' | 回退 |
| `action_guide.text` | `action_guide.hidden_insight` ‖ `advice.risk` | 回退 |
| `action_guide.items[]` | `action_guide.do` + `action_guide.avoid` 合并（avoid 加"避："前缀）‖ `advice.strategy` | 三段式→单列表 |

**数据保全原则**：v1 里被 v2 删掉的字段（`psychological_mirror` / `movement_nature` / `outcome_projection`）不强行丢——适配器把它们的文本**并入最相近的 v2 文本槽**（如 psychological_mirror 追加到 `dayun_field.text` 或单独保留为 `readings._legacy_extras` 供降级展示），确保老记录信息量不缩水。

### 9.11.4 strength 5 档兼容（老 timing 记录）

新数据由后端 `deriveStrengthTier` 直接产 5 档（理论依据与阈值见 §9.12）。老记录只有 `quality`(strong/medium/weak)，适配器按下表降级映射（无 _pipeline 原始信号时的兜底）：

| 老 quality | v2 strength（兜底） |
|---|---|
| strong | 最强 |
| medium | 较强 |
| weak | 一般 |

> 若老记录的 `_pipeline` 里仍存有 `activation_strength` / `trigger_vigor` / `is_major_window`（c6f78d8 之后的记录有），适配器优先调用同一个 `deriveStrengthTier` 重算 5 档，回到精确档位；只有完全缺信号的极老记录才走上面的 3→3 兜底。

### 9.11.5 渲染层双保险

适配器是主防线；`buildCardHTML` 内每个子模块**仍做空态判断**（有内容才渲染该块，无则整块隐藏），作为适配器漏映射时的第二道兜底。两个 panel 已有的"无 state_report 不挂载""无 timing_candidates 降级 status"逻辑保留。

### 9.11.6 落地补充（并入 §9.10）

- **P0**：实现 `adaptBaziResultToV2` + 单测（用 1 条真实 v1 历史记录 fixture 跑通映射），先于 buildCardHTML 改造合入。
- **P0**：worker normalize 盖 `meta.schema_version=2`；前端两处读取入口接适配器。
- 验收：①新问一题（v2）正常；②打开一条改造前存的老记录（v1）所有 tab 不空白、信息不丢。

## 9.12 引动强弱 5 档：理论依据与后端实现

> 来源：陆致极《八字命理动态分析教程》《八字命理学进阶教程》（NotebookLM 笔记本"奇门遁甲预测培训资料汇编"，source c4b15b46 / 634a5f8f）。
> 结论：后端**有能力且应当**直接产 5 档；LLM 只写 phenomena/verdict，不自评强度（避免术语漂移与置信度虚高）。

### 9.12.1 引动机制强弱排序（陆致极理论）

按对原局结构的破坏力/能量改变程度，从强到弱：

`反吟 > 填实三合 > 合化(化神透干) > 六冲 > 伏吟 > 透干引动 > 开墓库 > 刑 > 合而不化 > 害`

这与后端 `baziDynamicAssessor` 给各机制赋的 `effective_strength` 基准分（反吟/三合类高、害类低）方向一致，可作为校准依据。

### 9.12.2 "有效引动 vs 潜伏"的判据（陆致极四标准）

1. **合化还是合绊**：相合需化神透干且得月令 → 合化(有效强力)；否则合而不化(潜伏/羁绊)。
2. **虚实原理**：引动天干有根有生为"实"(有效)，坐绝地为"虚"(力大打折)。→ 对应后端 `trigger_vigor`（≥0.35 为衰相以上、可有效引动）。
3. **贪合解冲**：本要冲克的字被先合住 → 引动被阻断转潜伏。
4. **干支扭曲**：天干顺/地支逆(如甲子见乙亥)带分裂破坏力 → 重大凶灾潜伏信号。

后端现有 `vigor_check.is_effective = trigger_vigor >= 0.35` 正是标准二的工程化；标准一/三/四目前部分由机制识别覆盖，可作后续增强项。

### 9.12.3 5 档 ↔ 后端三信号的阈值映射（核心产出）

陆致极理论的优先级：**首重虚实(`trigger_vigor`) → 次看岁运共振(`is_major_window`) → 末看机制威力(`effective_strength`)**。据此定义 `deriveStrengthTier`（按优先级 cascade，命中即返回）：

```js
// 输入取自该候选年 top 机制：
//   v = topMech.vigor_check.trigger_vigor   (0–1)
//   major = dynamicReport.dayun_impact.activates_target && liunian_impact.activates_target
//   s = topMech.effective_strength          (0–100)
function deriveStrengthTier({ v, major, s }) {
  // 最强：实神 + 岁月共振 + 机制极强（反吟/填实合局级）
  if (v >= 0.35 && major && s >= 80)            return '最强';
  // 次强：实神，且(共振 或 单点高强度冲击)
  if (v >= 0.35 && (major || s >= 60))          return '次强';
  // 较强：实神、无共振、常规有效交锋（开库/刑/普通冲）
  if (v >= 0.35 && s >= 40)                      return '较强';
  // 中等：实但力弱(合而不化/穿害) 或 虚神但靠岁运强行造势
  if ((v >= 0.35 && s < 40) || (v < 0.35 && major)) return '中等';
  // 一般/潜伏：虚神且无共振（被贪合解冲/落空亡）
  return '一般';
}
```

| 档 | 条件（cascade） | 理论含义 |
|---|---|---|
| 最强 | v≥0.35 且 major 且 s≥80 | 结构性颠覆：质变/大灾大喜 |
| 次强 | v≥0.35 且 (major 或 s≥60) | 核心激活/连环共振（伏吟应局、强冲） |
| 较强 | v≥0.35 且 s≥40 | 关键节点开启（冲库、相刑） |
| 中等 | (v≥0.35 且 s<40) 或 (v<0.35 且 major) | 内部牵制摩擦 / 虚神强行造势 |
| 一般 | 其余（v<0.35 且非 major） | 虚浮潜伏，雷声大雨点小 |

> 落地：①`deriveStrengthTier` 放 `baziQuestionCore.js`，`rankTimingCandidate` 里算出 `strength` 字段一并存入候选；②组装层用它覆盖 LLM 自填的 strength（§9.8）；③适配器(§9.11.4)对有 `_pipeline` 信号的老记录复用同一函数重算。
> 注意：当前 `deriveQuality`(3 档)与本 5 档可并存——quality 继续用于排序/兼容，strength 用于展示。后续可考虑让 quality 由 strength 收敛（最强/次强→strong，较强/中等→medium，一般→weak）以统一口径。

## 9.13 后端产物 → Prompt 注入一致性审计

> 在改 schema 前，先核对"后端算了什么"与"实际喂给 LLM 什么"。审计了 `formatStateReportForPrompt`/`formatDynamicReportForPrompt`/`formatTargetSpecForPrompt`/`formatTimingCandidatesForPrompt`/`formatBasicProfileBlock`/`formatUpstreamAnalysisBlock` 与各 `buildXxxPrompt` 的装配。发现 6 处缺口，其中 A/B/C 直接影响 v2 字段质量，必须在 schema 改造同批修。

### 注入现状总览

| 后端产物 | 注入函数 | 实际进 prompt 的内容 | 各 mode |
|---|---|---|---|
| targetSpec | `formatTargetSpecForPrompt` | primary_shishen/gongwei、secondary、analysis_mode、dynamic_focus(机制+key_questions)、extra_static_checks、analysis_question、fallback_level | status/timing/pattern/character |
| stateReport | `formatStateReportForPrompt` | stability_label、image_context.subtype、base_state、summary_verdict（含每个十神/宫位的 `verdict` 自然语言） | status/timing/pattern/character |
| dynamicReport | `formatDynamicReportForPrompt` | dynamic_verdict（大运/流年各 **top-2** 机制 + 目标引动结论）、image_luck_effect | status；pattern/character 仅 secondary=status |
| timingCandidates | `formatTimingCandidatesForPrompt` | 每候选年 quality/rank_score/event_type + top-3 机制摘要 + 助力/限制 | timing |
| profile 上游 | `formatUpstreamAnalysisBlock` | 旺衰、格局、调候、喜用/忌仇（十神+五行）、当前大运/流年、取用链路、断语 | 全部 5 mode（含 profile_driven） |

### 缺口清单

**【A·必修】per-mode 调参是死参数（options 被忽略）**
- `formatStateReportForPrompt(report)` 与 `formatDynamicReportForPrompt(report)` 的函数签名**只接 1 个参数**，但调用方都传了第 2 个 options 对象：
  - `buildStatusPrompt`：`{ maxShishenItems:3, maxGongweiItems:2 }`、`{ maxMechanismsPerPillar:2, includeStrengthTags, includeMajorFlag }`
  - `buildPatternPrompt`：`{ maxShishenItems:4, maxGongweiItems:2 }`
  - `buildCharacterPrompt`：`{ maxShishenItems:4, maxGongweiItems:3 }`
  - `buildTimingPrompt`：`{ maxShishenItems:3, maxGongweiItems:2 }`
  - `formatOptionalDynamicBlock`：`{ maxMechanismsPerPillar:2, ... }`
- **后果**：所有"按 mode 裁剪十神/宫位/机制条数"的意图**完全没生效**——summary_verdict 永远全量输出所有十神/宫位 verdict，机制永远 top-2。pattern 想多看(4)、status 想精简(3) 的差异化从未发生。
- **修法**：给两个 format 函数真正实现 options（截断 shishen/gongwei/机制条数、可选数值标签）；或反过来删掉调用方的死参数、明确"全量注入"。**v2 要求 status 的 phenomena≤4、target_state≤3，必须先让 format 支持条数控制。**

**【B·必修】动态机制只注入 top-2/柱，喂不饱 v2 的 phenomena[≤4]**
- `buildDynamicVerdict` 对大运、流年各 `mechanisms.slice(0, 2)`。LLM 在 status 下最多只看到 2 条流年机制 + 2 条大运机制。
- **后果**：v2 新增 `liunian_trigger.phenomena[≤4]`（要求从静/动 panel 全部信息里选 ≤4 条重要"移动"），但 prompt 只给了 top-2，**素材不足**，LLM 只能复述那 2 条或自行编造补足。
- **修法**：status/timing 的动态注入上限提到 **≥4**，或单独注入一段结构化 `mechanisms[]`（type/target_pillar/description/effective_strength/is_effective），与动态面板同源——这同时呼应 §9.2「phenomena 与动态面板同源」。

**【C·必修】神煞(桃花/红鸾/天喜)算了但不注入,领域二级信号落空**
- `extractBaziQuestionContext` 算了 `ctx.shensha`，但 `formatBasicProfileBlock` 和 `formatUpstreamAnalysisBlock` **都不含 shensha**——5 个结构化 mode 的 prompt 里没有神煞。
- 同时，relationship 类 `targetSpec.secondary_shishen = ['桃花','天喜','红鸾']`，`formatTargetSpecForPrompt` 告诉 LLM "辅助参考：桃花/红鸾"，**却不给这些神煞落在哪一柱**。
- **后果**：婚恋/感情应期(timing)最依赖桃花、红鸾、天喜的引动（截图案例里 LLM 写了"红鸾天喜或到"全靠自由发挥，无后端依据），属于**置信度门控该兜底却没料**的典型。pregnancy(时支十二运)、exam 同理。
- **修法**：把 `ctx.shensha`（至少 targetSpec.secondary_shishen 命中的那几个神煞 + 所在柱）注入 prompt；高置信场景要求 LLM 引用，避免凭空"红鸾到"。

**【D·关注】stateReport 量化字段不入 prompt（有意设计，但"贴合 panel"需复核）**
- `formatStateReportForPrompt` 只输出 stability_label + image + base_state + summary_verdict（自然语言 verdict）。每个十神/宫位的 vigor / twelve_phase / relationships / effective_strength **只进 panel、不进 prompt**（"不回显数值"的有意设计）。
- **影响**：v2 要求 base_foundation/target_state「贴合静态组件」，但 LLM 看不到 panel 的量化细节，只能基于 verdict 文本复述。需确认 verdict 文本粒度是否够；若不够，可在高置信时补注入关键标签（如"才·月柱·死绝·空亡"这种短标签，非裸数值）。

**【E·关注】timing 的 stateReport 漏传 geju/tiaohou**
- `runTimingPipeline` 调 `assessOriginalChartState` 时只传 matrix/targetSpec/dayStem/gender/imageAnalysis，**没传 geju、tiaohou**（status/static pipeline 都传了）。导致 timing 的 base_state 少格局/调候维度。
- **修法**：runTimingPipeline 的 stateReport 调用补上 `geju`/`tiaohou`（与 runStatusPipeline 对齐），保证 base_foundation 在两 mode 一致。

**【F·关注】secondary_shishen 与"非标准十神"判据只到 LLM、不进 panel**
- `assessOriginalChartState` 只评估 primary_shishen + primary_gongwei；secondary_shishen 及"忌神五行/时支十二运/日主之根"这类非标准名不被定位评估。
- **影响**：health(脏腑弱五行)、pregnancy(时支十二运)、exam(印星截脚) 的领域专属二级判据，只以 targetSpec.key_questions 文本形式到达 LLM，panel 不呈现、组装层无法校验。属于可接受的"交给 LLM"，但需在置信度门控里明确：这类字段不参与 §9.8 的 phenomena 引用校验。

### 修复优先级（并入 §9.10）

| 优先级 | 缺口 | 动作 | 关联 v2 字段 |
|---|---|---|---|
| **P0** | A 死参数 | 实现 format 的条数/标签 options | target_state≤3 / phenomena≤4 的条数控制 |
| **P0** | B top-2 上限 | 动态机制注入提到 ≥4 或单独结构化注入 | liunian_trigger.phenomena |
| **P0** | C 神煞缺注入 | 注入 shensha（至少命中 secondary 的） | 婚恋/孕产 target_state、phenomena 的置信兜底 |
| **P1** | E timing 漏 geju/tiaohou | runTimingPipeline 补传 | base_foundation 跨 mode 一致 |
| **P1** | D 量化不入 prompt | 高置信时补短标签（非裸数值） | base_foundation/target_state「贴合 panel」 |
| **P2** | F 二级判据不进 panel | 门控规则排除其引用校验 | §9.8 校验边界 |

> 一句话：v2 契约的几个新字段（target_state 条数、phenomena≤4、婚恋神煞）依赖的 prompt 素材，当前**要么被死参数截断、要么根本没注入**。schema 改造必须与 A/B/C 三处注入修复同批进行，否则新字段会"契约要了、prompt 没给、LLM 硬编"。

## 9.14 修复实施记录（A–F 已落地）

> 状态：A–E 已改代码并通过测试（lib 全量 288 测试，286 pass / 2 fail 均为 KAI_MU 相关 pre-existing 失败，本次零回归）。F 为门控边界约定，无需代码改动。

| 缺口 | 改动文件 | 具体改法 |
|---|---|---|
| **A** 死参数 | `lib/baziStateAssessor.js` `formatStateReportForPrompt` | 真正实现 `{ maxShishenItems, maxGongweiItems, includeQuantTags }`：从 `shishen_assessments`/`gongwei_assessments` 结构化重建注入段并按条数裁剪；无目标十神/宫位时回退全量 `summary_verdict`（general 兜底）。各 buildXxxPrompt 既有的 `maxShishenItems:3/4` 等参数现在真正生效。 |
| **B** 机制 top-2 截断 | `lib/baziDynamicAssessor.js` `formatDynamicReportForPrompt` | 新增 `{ maxMechanisms=6 }`；在 dynamic_verdict 之外追加「引动机制清单」——合并大运+流年机制、按 `effective_strength` 排序、带 `target_pillar` + 旺衰校验（有效/潜伏），供 phenomena≤4 选取且与前端动态面板 mech 行同源。call sites（buildStatusPrompt / formatOptionalDynamicBlock）的死参数 `maxMechanismsPerPillar` 改为 `maxMechanisms:6`。 |
| **C** 神煞未注入 | `lib/baziQuestionCore.js` `extractBaziQuestionContext` + `formatUpstreamAnalysisBlock` | 新增 `ctx.shensha_by_pillar`（从 `matrix.pillars[].shensha` 按柱拼，如「日柱：桃花、红鸾」）；上游摘要块加「神煞分布」行。婚恋/孕产的桃花/红鸾/天喜应期判断终于有后端依据，不再靠 LLM 凭空"红鸾到"。 |
| **D** 量化不入 prompt | 同 A（`includeQuantTags`） | 高置信场景下每条目标十神/宫位附**短标签**（`［死绝·空亡·被冲］`，取自 status_tags，非裸数值），让 base_foundation/target_state 能"贴合 panel"又不回显原始分数。 |
| **E** timing 漏 geju/tiaohou | `lib/baziQuestionCore.js` `runTimingPipeline` | `assessOriginalChartState` 调用补传 `geju` / `tiaohou`（与 runStatusPipeline 对齐），timing 的 base_state 跨 mode 一致。 |
| **F** 二级判据不进 panel | —（约定，无代码） | secondary_shishen 及「时支十二运/忌神五行」等非标准判据仅以 targetSpec.key_questions 文本到达 LLM；§9.8 的 phenomena 引用校验**显式排除**这类，不因 panel 无对应项而误判 LLM 编造。 |

### 9.14.1 从化/形象数据注入核查（专项）

**结论：原本只注入了"皮"，本次补全到"骨"。**

- **改前**：`formatStateReportForPrompt` 仅输出 `形象判断：{subtype}，匹配度{score}%（{label}）{override}` 一行；`formatDynamicReportForPrompt` 输出 `image_luck_effect`（岁运对形象的增损）。即只有**名称+匹配度+是否覆盖喜忌**，以及岁运诊断。
- **未注入（引擎算了但没给 LLM）**：形象**类别**（FOLLOW/SINGLE/TRANSFORMATION，即从格/专旺/化气的本质区分）、**顺从/化神方向**（target_element/target_elements）、**用神取法**（yongshen_strategy）、以及被 override 时的**原始候选**（image_display_context，前端静态面板"原始候选"行显示、prompt 却没有）。
- **本次补全**（§9.14 A 行内）：`formatStateReportForPrompt` 形象行下追加两行——
  - `类别：从格（顺从旺神）；顺从/化神方向：水；用神取法：FOLLOW_FORCE`
  - `原始候选：从官杀格（匹配度88%，近象）`（仅 override 且与主候选不同时）
- **效果**：LLM 现在能区分"从财格"是真从还是化气、顺哪个五行、原始候选是什么，base_foundation 对从化命局的解读才不会只会复述"从财格 86%"。`image_luck_effect`（岁运破/扶形象）保持注入不变。
- **验证**：构造 fixture 直跑 format 函数，确认 `类别/顺从化神方向/用神取法/原始候选` 四项均出现在输出（见实测）。
