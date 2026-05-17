# 八字问答 Prompt 组装工程化 PRD

> 上游：`baziTargetElement.js`（Step 1）、`baziStateAssessor.js`（Step 2）、`baziDynamicAssessor.js`（Step 3）  
> 下游：LLM（Claude API）  
> 主要改动文件：`lib/baziQuestionCore.js`  
> 关联改动：必要时扩展 `normalizeBaziQuestionOutput` 与前端消费字段

---

## 一、背景与目标

当前 `buildBaziQuestionPrompt` 是一个无差别模板，把 profile 里的原始字段拼进 prompt，由 LLM 自行推导命理逻辑。这导致：

- LLM 推理质量不稳定，不同模型输出差异大。
- 缺乏分步骤的结构化分析数据注入。
- 无论用户问“什么时候结婚”“老婆什么样”“今年事业怎么样”，LLM 拿到的上下文基本相同。
- 输出 JSON 语义偏像奇门事件判断，容易把评分误读为“成功概率”。

本 PRD 的目标是在 `buildBaziQuestionPrompt` 内加入**两级路由 + 结构化 Pipeline + Prompt Assembler + 统一 JSON 输出协议**，让 LLM 主要负责叙述、温度和信息组织，不再负责排盘、干支关系推导和核心吉凶计算。

八字分支的产品定位：

- 八字回答的是“命主结构、领域容量、当前/未来岁运状态、候选时间窗口”。
- 奇门回答的是“此时此事的成败、应期、方位、A/B 决策”。
- 八字只有在用户问题包含明确年份/事件时才给近似 yes/no；多数情况下输出状态、趋势、容量和时间窗。

---

## 二、当前 PRD 已完成的设计范围

本 PRD 目前已经完成以下设计决策，后续实现应按这些边界推进：

1. **统一语义路由架构已确定**
   - 不再新增一个独立的 `analysis_mode` LLM。
   - 上游 subcategory LLM 升级为 `classifyBaziSemanticRoute`，一次性输出 `branch/category/subcategory/analysis_mode/secondary_mode/time_scope/target_resolution`。
   - `ruleRouteHint` 不替换现有 `classifyByRules`，而是在其基础上补充 `analysis_mode_hint`、时间线索等 cheap hints。
   - `normalizeBaziSemanticRoute` 归属 `baziQuestionCore.js`，负责枚举校验、冲突修正、低置信追问和 time_scope 默认值处理。

2. **四类主分析模式与复合模式已确定**
   - `status`：当前或指定阶段状态。
   - `timing`：遍历候选流年，输出时间窗口。
   - `pattern`：先天格局、能力、领域容量。
   - `character`：人物画像与关系表达倾向。
   - 支持 `secondary_mode`，例如 `pattern + status`、`character + status`、`character + timing`。

3. **时间范围与长程扫描策略已确定**
   - LLM 可输出自然语言时间类型，如 `next_3_years/next_5_years/next_10_years`。
   - `resolveConcreteTimeScope` 使用 `currentLiunian.year` 转成实际 `start_year/end_year`。
   - `resolveCandidateYears` 负责从 `liunianList` 过滤候选年份。
   - `resolveDayunForYear` 负责跨大运年份匹配。
   - `rankTimingCandidate` 和 `deriveQuality` 负责候选窗口排序，LLM 不自行决定强弱。

4. **目标元素缺失时的处理已确定**
   - 不强行把所有问题套进后端 `targetSpec`。
   - 引入 `target_resolution=backend_mapped|llm_derived|unsupported`。
   - 后端无匹配规则但仍可解释的问题，可走 `llm_derived`，由语义路由 LLM 给出自拟观察框架和限制。
   - `llm_derived` 必须低置信展示，不能伪装成后端规则结论。

5. **上游断语包注入方式已确定**
   - Prompt 不直接注入 raw `stateReport/dynamicReport` JSON。
   - 上游 formatter 负责将 Step 1-3 的结构化结果封装成自然语言断语包注入 Prompt 上下文（INPUT 侧）。
   - **数据层边界（重要）**：pipeline 计算字段（`trigger_vigor`、`activation_strength`、`activates_target`、`is_major_window`、`effective_strength`、`vigor_check.*` 等）只流向三处：①Prompt 上下文（以自然语言描述形式，让 LLM 能推理）；②审计快照（`buildBaziAuditSnapshot`，不对用户展示）；③后端组装层（由 `normalizeBaziQuestionOutput` 从 pipeline 结果中拼装到最终 result）。LLM **不应被要求在输出 JSON 中回显这些字段**。
   - 用户可见的呈现层（卡片/BaziBackingPanel）如需展示量化信号，只能使用友好标签（如"引动强度：强"、"双重引动：是"），不直接暴露字段名或原始数值。
   - 现有 `formatStateReportForPrompt` 和 `formatDynamicReportForPrompt` 采用 in-place 升级，避免平行 formatter 分叉。

6. **统一 JSON 输出协议已确定**
   - 所有模式返回统一 envelope：`meta / summary / chart_foundation / dynamic_context / mode_analysis / advice`。
   - 八字分析不强制给分，`summary.score` 可为 `null`。
   - 主表达使用 `summary.level` 与 `summary.assessment_type`。
   - `mode_analysis` 根据 mode 承载 status/timing/pattern/character 的专属结果。

7. **Prompt 样例与测试边界已覆盖**
   - 已补充 status、timing、pattern、character、llm_derived character、pattern+status 六类 Prompt 样例。
   - 已补充 rule hint、time scope 展开、跨大运候选年、deriveQuality、secondary mode、formatter 断语包、无 targetSpec 等测试要求。

仍未完成的是代码实现与真实数据回归验证；本文档目前是实现契约，不代表对应函数已经落地。

---

## 三、整体架构

```
用户问题 + profile
    │
    ▼
┌─────────────────────────────────────────────┐
│ 规则预判层（cheap hints）                    │
│ ruleRouteHint(question)                      │
│ - branch/category/subcategory 候选            │
│ - analysis_mode 候选                          │
│ - 时间范围线索                                │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│ 统一语义路由 LLM                              │
│ classifyBaziSemanticRoute(question, hint)    │
│ 一次性决定：                                 │
│ branch/category/subcategory                  │
│ analysis_mode/secondary_mode                 │
│ needs_time_scan/time_scope                   │
│ needs_bazi_profile/unsupported_reason        │
│ followupQuestion                             │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│ Deterministic Normalizer                     │
│ normalizeBaziSemanticRoute(llmRoute, hint)   │
│ 归属：baziQuestionCore.js（消费端）          │
│ 路由层只透传 raw LLM 结果，不做 normalize    │
│ - 枚举校验                                   │
│ - 冲突修正                                   │
│ - 低置信降级/追问                            │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│ 参数提取与数据校验                           │
│ extractBaziAnalysisParams(profile, semanticRoute) │
│ - 四柱矩阵                                   │
│ - 当前大运/流年                              │
│ - 可选未来流年列表 liunian_list              │
│ - 喜忌五行                                   │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│ Pipeline Selector                            │
│                                              │
│ status  → Step1 → Step2 → Step3 current      │
│ timing  → Step1 → Step2 → Step3 scan years   │
│ pattern → Step1 → Step2                      │
│ character → Step1 → Step2                    │
│ character + status/timing → Step1 → Step2 → Step3 │
│ unsupported → 不跑目标元素 Pipeline           │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
               Prompt Assembler
                       │
                       ▼
                    LLM JSON
```

---

## 四、统一语义路由器：`classifyBaziSemanticRoute`

### 4.1 函数签名

```js
/**
 * @param {string} question
 * @param {object} hint - 规则预判结果，只作为 LLM 输入提示
 * @returns {BaziSemanticRoute}
 */
async function classifyBaziSemanticRoute(question, hint = {})
```

### 4.2 为什么合并上游 subcategory LLM

`category/subcategory` 与 `analysis_mode` 是强耦合关系，不应拆成两个 LLM：

- “我老婆是什么样的人”天然是 `relationship / partner_profile / character`。
- “什么时候结婚”天然是 `relationship / relationship_timing / timing`。
- “我婚姻格局怎么样”天然是 `relationship / marriage_pattern / pattern` 或 `status`。
- “我适合创业吗，现在能不能做”天然是 `career_business / entrepreneurship_vs_job / pattern + status`。

如果先让 LLM A 判 subcategory，再让 LLM B 判 mode，容易出现 `subcategory=marriage_pattern` 但 `analysis_mode=timing` 这类不一致。统一路由器应一次性输出领域、子类、分析模式和时间扫描需求。

### 4.3 规则预判层：`ruleRouteHint`

规则仍然保留，但只做 fast path hint，不做最终裁判。

`ruleRouteHint` **不替换**现有 `divinationRouter.js` 的 `classifyByRules`。两者关系如下：

- `classifyByRules(question, options)` 继续作为现有规则分类器，负责产出 `branch/category/subcategory/confidence/reason/followupQuestion` 等基础路由结果。
- `ruleRouteHint(question)` 是语义路由 LLM 的输入准备层，内部应优先调用 `classifyByRules`，复用其结果作为 `branch_hint/category_hint/subcategory_hint`。
- `ruleRouteHint` 在 `classifyByRules` 基础上补充八字问答特有 hint：`analysis_mode_hint`、`has_explicit_year`、`has_future_range`、`time_keywords`、`matched_keywords`。
- 最终裁判仍是 `classifyBaziSemanticRoute` + `normalizeBaziSemanticRoute`；规则结果只是 hint，不直接决定最终 mode。

```js
function ruleRouteHint(question) {
  const ruleResult = classifyByRules(question);
  return {
    branch_hint: ruleResult.branch,
    category_hint: ruleResult.category,
    subcategory_hint: ruleResult.subcategory,
    analysis_mode_hint: 'timing|status|pattern|character|unsupported|unknown',
    has_explicit_year: false,
    has_future_range: false,
    time_keywords: [],
    matched_keywords: [],
    confidence: ruleResult.confidence,
    rule_reason: ruleResult.reason,
    followupQuestion: ruleResult.followupQuestion
  };
}
```

规则适合处理：

- 明显关键词，如“什么时候/哪年/几岁”提示 `timing`。
- 明确画像词，如“什么样/长相/性格/伴侣画像”提示 `character`。
- 明确先天结构词，如“适合/格局/上限/容量/命中有没有”提示 `pattern`。
- 明确当前阶段词，如“今年/现在/当前/这步大运”提示 `status`。

规则不适合作为最终判断：

- “今年能不能结婚”含“能不能”，但应是 `status`。
- “命里有没有婚姻”含“有没有”，但应是 `pattern`。
- “未来几年感情会怎样”没有“什么时候”，但需要 time scan。
- “适合创业吗，现在能不能做”需要 `primary_mode=pattern` 且 `secondary_mode=status`。

### 4.4 LLM 输出结构

```json
{
  "branch": "bazi",
  "category": "relationship",
  "subcategory": "relationship_timing",
  "analysis_mode": "timing",
  "secondary_mode": null,
  "needs_time_scan": true,
  "time_scope": {
    "type": "current_year|next_3_years|next_5_years|next_10_years|specified_range|specified_dayun|unknown",
    "start_year": null,
    "end_year": null,
    "dayun_ganzhi": null
  },
  "target_focus": {
    "subject": "marriage|wealth|career|health|study|spouse|partner|self|other",
    "object": "self|spouse|partner|job|money|exam|identity|unknown",
    "is_specific_event": false
  },
  "target_resolution": "backend_mapped|llm_derived|unsupported",
  "llm_derived_target": null,
  "needs_bazi_profile": true,
  "can_fallback_to_qimen_only": false,
  "unsupported_reason": "",
  "confidence": "high|medium|low",
  "reason": "",
  "followupQuestion": ""
}
```

### 4.5 LLM Prompt 约束

语义路由 LLM 只做分类，不做命理解读。Prompt 必须包含：

- 用户原始问题。
- `ruleRouteHint` 的结果。
- 当前允许的 `category/subcategory` 枚举。
- 四种 `analysis_mode` 定义。
- few-shots，覆盖冲突语义。

few-shots：

```json
[
  {
    "question": "我今年能不能结婚",
    "output": {
      "category": "relationship",
      "subcategory": "relationship_timing",
      "analysis_mode": "status",
      "secondary_mode": null,
      "needs_time_scan": false,
      "time_scope": { "type": "current_year" }
    }
  },
  {
    "question": "什么时候结婚",
    "output": {
      "category": "relationship",
      "subcategory": "relationship_timing",
      "analysis_mode": "timing",
      "needs_time_scan": true,
      "time_scope": { "type": "next_10_years" }
    }
  },
  {
    "question": "我适合创业吗，现在能不能做",
    "output": {
      "category": "career_business",
      "subcategory": "entrepreneurship_vs_job",
      "analysis_mode": "pattern",
      "secondary_mode": "status",
      "needs_time_scan": false
    }
  },
  {
    "question": "我老婆是什么样的人",
    "output": {
      "category": "relationship",
      "subcategory": "partner_profile",
      "analysis_mode": "character",
      "needs_time_scan": false
    }
  }
]
```

### 4.6 Deterministic Normalizer

**归属：`baziQuestionCore.js`，不在路由层。**

路由层（`divinationRouter.js`）的职责只是调用 LLM 并透传 raw 结果。`normalizeBaziSemanticRoute` 由消费端（`baziQuestionCore.js`）在拿到 raw LLM 路由结果后立即调用，避免 `baziQuestionCore` 反向 require `divinationRouter` 造成耦合方向错误。

LLM 输出必须经过 deterministic normalizer：

```js
// 文件：baziQuestionCore.js
function normalizeBaziSemanticRoute(llmRoute, hint = {}) {
  // 1. 枚举校验：branch/category/subcategory/analysis_mode/time_scope
  // 2. 子类与 mode 冲突修正
  // 3. 低置信 fallback
  // 4. 生成 followupQuestion
}
```

`time_scope.start_year/end_year` 不要求 LLM 直接给准。LLM 可以只输出 `time_scope.type`（如 `next_5_years`）。具体年份归一化分两步：

1. `normalizeBaziSemanticRoute` 只校验 `time_scope.type`、保留用户显式年份区间，并为缺省类型补默认值（如 timing + unknown → `next_10_years`）。
2. `extractBaziAnalysisParams` 取到 `params.currentLiunian.year` 后，由 `resolveConcreteTimeScope(semanticRoute.time_scope, params.currentLiunian.year)` 转成实际 `start_year/end_year`。

```js
function resolveConcreteTimeScope(timeScope, currentYear, { analysisMode } = {}) {
  if (!currentYear) {
    const fallbackYear = new Date().getFullYear();
    return {
      ...timeScope,
      type: analysisMode === 'status' ? 'current_year' : 'next_10_years',
      start_year: fallbackYear,
      end_year: analysisMode === 'status' ? fallbackYear : fallbackYear + 9,
      source: 'system_year_fallback',
      limitations: ['profile.currentLiunian.year 缺失，使用服务器当前年份作为临时基准']
    };
  }

  const type = timeScope?.type || 'unknown';
  if (type === 'current_year') return { ...timeScope, start_year: currentYear, end_year: currentYear };
  if (type === 'next_3_years') return { ...timeScope, start_year: currentYear, end_year: currentYear + 2 };
  if (type === 'next_5_years') return { ...timeScope, start_year: currentYear, end_year: currentYear + 4 };
  if (type === 'next_10_years') return { ...timeScope, start_year: currentYear, end_year: currentYear + 9 };
  if (type === 'specified_range') return clampSpecifiedRange(timeScope, currentYear);
  if (type === 'specified_dayun') return timeScope; // 交给 resolveCandidateYears 按 dayun_list 展开
  return { ...timeScope, type: 'next_10_years', start_year: currentYear, end_year: currentYear + 9 };
}
```

该函数归属 `baziQuestionCore.js`，在 `extractBaziAnalysisParams` 之后、Pipeline 之前调用。

范围约定：

- `next_3_years/next_5_years/next_10_years` 均为“含当前年”的自然年窗口，例如当前流年为 2026，则 `next_3_years=2026-2028`。
- `specified_range` 优先使用用户显式年份；如果只给“30 到 35 岁”，需结合出生年转成年份，无法转换时追问。
- `specified_dayun` 不在 `resolveConcreteTimeScope` 展开年份，交由 `resolveCandidateYears` 根据 `dayunList` 展开。
- 如果范围超过系统可用 `liunianList`，不得合成不存在的干支；只扫描可用年份，并写入 limitation。

冲突修正规则：

| 冲突 | 处理 |
|------|------|
| `branch !== bazi/hybrid` | 不进入八字 Pipeline |
| `analysis_mode=timing` 但 `needs_time_scan=false` | 改为 `status` 或补 `needs_time_scan=true` |
| `subcategory=partner_profile` 但 mode 非 `character` | 优先改为 `character`，置信降为 medium |
| `subcategory=wealth_capacity/income_model` 但 mode 为 `timing` | 改为 `pattern`，除非问题明确“哪年财富机会” |
| `time_scope=unknown` 且 mode=timing | 默认 `next_10_years`，并写入 limitations |
| 问题无现成后端 targetSpec，但仍属于 character/pattern 可解释范围 | 保持原 mode，`target_resolution=llm_derived`，由 LLM 给出自拟目标元素与置信边界 |
| 问题完全无法形成可解释目标，或用户要求输出确定标签 | `analysis_mode=unsupported` 或追问，不调用 Step 1-3 |
| `confidence=low` 且缺关键对象 | 返回 `clarify` 或追问 |

---

### 4.7 无后端目标元素时的 LLM-derived target

现有 `baziTargetElement.js` 不可能覆盖所有用户问题。统一语义路由器不能为了跑通后端分析，强行把问题塞进错误的财官印食伤规则；但也不应把所有未覆盖问题一律 `unsupported`。更合理的是引入目标解析来源：

```json
{
  "target_resolution": "backend_mapped|llm_derived|unsupported",
  "llm_derived_target": {
    "primary_symbols": [],
    "secondary_symbols": [],
    "reasoning_frame": "",
    "confidence": "high|medium|low",
    "limitations": []
  }
}
```

三种情况：

| target_resolution | 含义 | Pipeline |
|-------------------|------|----------|
| `backend_mapped` | 现有 `resolveTargetElement` 有明确规则 | 正常 Step 1-3 |
| `llm_derived` | 无现成后端规则，但 LLM 能提出可解释的象义/十神/宫位观察框架 | 可走对应 mode，但不调用或弱调用后端 targetSpec；必须降低置信并展示 limitations |
| `unsupported` | 无法形成可靠分析对象，或用户要求输出确定标签/窥探性结论 | 不跑 Step 1-3，输出边界说明或追问 |

示例：用户问“这个人是不是同性恋？”时，它仍可能被路由为 `relationship / partner_profile / character`，但不能硬套 `partner_profile` 的配偶星规则，也不能把结论写成确定身份标签。更合适的路由是：

```json
{
  "branch": "bazi",
  "category": "relationship",
  "subcategory": "partner_profile",
  "analysis_mode": "character",
  "secondary_mode": null,
  "needs_time_scan": false,
  "time_scope": { "type": "unknown" },
  "target_focus": {
    "subject": "other",
    "object": "identity",
    "is_specific_event": false
  },
  "target_resolution": "llm_derived",
  "llm_derived_target": {
    "primary_symbols": ["亲密关系表达方式", "桃花/合冲关系信号", "自我与伴侣星互动"],
    "secondary_symbols": ["夫妻宫", "食伤表达", "财官关系象"],
    "reasoning_frame": "只能分析亲密关系表达、吸引模式和关系边界倾向，不能判定性取向身份。",
    "confidence": "low",
    "limitations": ["现有后端目标元素没有性取向映射", "不能输出确定身份标签"]
  },
  "needs_bazi_profile": true,
  "can_fallback_to_qimen_only": false,
  "unsupported_reason": "",
  "confidence": "medium",
  "reason": "问题属于 character 分支，但无后端 targetSpec 可直接覆盖，需要 LLM 自拟观察框架并限制结论边界。",
  "followupQuestion": ""
}
```

llm-derived character 输出必须明确边界：

```json
{
  "meta": {
    "analysis_mode": "character",
    "branch": "bazi",
    "category": "relationship",
    "subcategory": "partner_profile",
    "target": {
      "shishen": [],
      "gongwei": [],
      "fallback_level": "llm_derived"
    },
    "confidence": "low",
    "limitations": ["后端无可靠 targetSpec", "只能分析关系表达倾向，不能判定身份标签"]
  },
  "summary": {
    "title": "关系表达倾向",
    "conclusion": "此类问题不能用八字断定身份，只能从亲密关系表达、吸引模式和互动边界做低置信倾向分析。",
    "level": "unknown",
    "assessment_type": "portrait_confidence",
    "score": null,
    "score_label": "",
    "keyword": "低置信画像",
    "basis": {
      "positive_signals": ["LLM 给出了可解释的关系表达观察框架"],
      "negative_signals": ["后端没有对应目标元素规则，不能给确定身份判断"],
      "logic": "保留 character 分支，但 target_resolution=llm_derived，结论必须带限制。"
    }
  },
  "chart_foundation": null,
  "dynamic_context": null,
  "mode_analysis": {
    "portrait_subject": "other",
    "relationship_dynamic": "仅能描述关系表达和互动倾向，不能判定性取向。",
    "do_not_overclaim": "这是 LLM-derived 低置信分析，不是后端规则结论。"
  },
  "advice": {
    "strategy": ["如果要分析关系，请改问具体互动、沟通、吸引模式或关系选择"],
    "risk": "不要把低置信象义分析当作身份判断。",
    "avoid": ["避免输出确定标签"],
    "timing": [],
    "leverage": ""
  }
}
```

---

## 五、数据准备层：`extractBaziAnalysisParams`

### 5.1 函数签名

```js
/**
 * 从 profile 提取 Step 1-3 所需入参。
 * 数据不足时返回 { ok: false, reason, params }，由调用方决定降级。
 */
function extractBaziAnalysisParams(profile, semanticRoute)
```

### 5.2 返回结构

```js
{
  ok: true,
  params: {
    matrix: {
      pillars: [
        { name: '年', gan, zhi, hidden_stems: [...], is_kong },
        { name: '月', gan, zhi, hidden_stems: [...], is_kong },
        { name: '日', gan, zhi, hidden_stems: [...], is_kong },
        { name: '时', gan, zhi, hidden_stems: [...], is_kong }
      ]
    },
    dayStem,
    gender,              // 'male' | 'female' | 'unknown'
    birthYear,           // number | null，用于按年龄/大运反推年份
    currentDayun: { gan, zhi, start_age, shi_shen },
    currentLiunian: { gan, zhi, year, shi_shen },
    currentLiuyue: { gan, zhi, month, shi_shen },
    liunianList: [
      { year, gan, zhi, shi_shen }
    ],
    dayunList: [
      { gan, zhi, start_age, end_age, shi_shen }
    ],
    favorableWuxing,     // Set<string> | null
    unfavorableWuxing,   // Set<string> | null
    rawContext: {
      strong_weak,
      geju,
      favorable_elements,
      unfavorable_elements,
      favorable_shishen,
      unfavorable_shishen,
      favorable_wuxing,
      unfavorable_wuxing,
      shensha,
      tiaohou_detail,
      chengge_detail,
      strength_detail,
      five_shens,
      decision_chain,
      classic_verdict,
      upstream_summary_text
    }
  }
}
```

### 5.3 字段映射

| 入参字段 | profile 路径（按优先级尝试） |
|---------|-------------------------------|
| `matrix.pillars` | `profile.bazi_detail.matrix.pillars` |
| `dayStem` | `profile.bazi_str` 日柱首字 / `profile.bazi_detail.pillars.ganzhi.day` |
| `gender` | `profile.gender` 标准化为 `male/female/unknown` |
| `birthYear` | `profile.birth_year` / `profile.birthDate` / `profile.bazi_detail.solar_birth` |
| `currentDayun` | `profile.bazi_detail.matrix.current_dayun` |
| `currentLiunian` | `profile.bazi_detail.matrix.current_liunian` |
| `currentLiuyue` | `profile.bazi_detail.matrix.current_liuyue` 或当月 `liuyue_list` |
| `liunianList` | `profile.bazi_detail.matrix.liunian_list` |
| `dayunList` | `profile.bazi_detail.matrix.dayun_list` |
| `favorableWuxing` | `profile.favorable_elements` / `profile.bazi_detail.favorable_gods` |
| `unfavorableWuxing` | `profile.unfavorable_elements` / `profile.bazi_detail.unfavorable_gods` |
| `favorableShishen` | `profile.bazi_detail.core_shens.favorable` / `profile.bazi_detail.five_shens.favorable` / `profile.bazi_detail.favorable_gods` |
| `unfavorableShishen` | `profile.bazi_detail.core_shens.unfavorable` / `profile.bazi_detail.five_shens.unfavorable` / `profile.bazi_detail.unfavorable_gods` |
| `upstreamSummary` | `strength_detail.summary`、`tiaohou_detail.explanation`、`chengge_detail`、`decision_chain`、`classic_verdict.summary` 拼成自然语言摘要 |

### 5.4 上游命局分析摘要

新版 Prompt 的【命主基础信息】后必须追加【上游命局分析摘要】，给 LLM 一个短而稳定的命局背景包。该块由后端 formatter 生成自然语言，不直接注入大段 raw JSON。

建议字段：

```text
【上游命局分析摘要】
旺衰判断：日主偏弱，喜火土扶身。
格局判断：食神生财格，成格。
调候判断：初春余寒未退，先要丙火向阳。
喜用十神：正印、偏印、比肩；忌仇十神：正财、偏财
喜用五行：火、土；忌仇五行：水、木
当前大运：辛酉（伤官，35岁起）
当前流年：丙午（偏印）
取用链路：L1 调候：初春余寒，先取丙火暖局；L2 扶抑：日主偏弱，取印比扶身
简短断语：此局喜印比扶身，财官不宜过重。
```

使用原则：

- LLM 必须优先相信该摘要，不得自行重判旺衰、调候、格局和喜忌。
- 摘要只提供全局底盘，具体问题仍以 Step 1 targetSpec、Step 2 原局状态、Step 3 动态引动为准。
- 若某字段缺失，写“未提供”，不要编造。

### 5.5 降级规则

| 情形 | 处理 |
|------|------|
| 四柱缺失、pillar 缺 `gan/zhi`、日干未知 | 降级到 legacy prompt |
| `semanticRoute.analysis_mode=unsupported` | 不提取命理分析参数，直接走 unsupported 输出 |
| `semanticRoute.target_resolution=llm_derived` | 不强制调用 `resolveTargetElement`；由 Assembler 注入 `llm_derived_target`，可选择只跑 profile/context，不跑 Step 2/3 |
| `status` 缺当前大运或当前流年 | 降级为 `pattern`，并在 `meta.limitations` 说明无法做当前岁运判断 |
| `timing` 缺 `liunianList` 或未来候选不足 | 降级为“当前流年状态判断”，`analysis_mode` 改为 `status` |
| 喜忌解析失败 | 继续执行，但 Step 3 不得给高置信吉凶，只能按旺衰/触发机制描述 |
| `resolveTargetElement` 使用 category/general fallback | 继续执行，写入 `meta.target.fallback_level` 和 `limitations` |

### 5.6 喜忌五行解析

```js
function parseWuxingSet(raw) {
  if (!raw) return null;
  const WX = new Set(['木', '火', '土', '金', '水']);
  const str = typeof raw === 'string' ? raw : JSON.stringify(raw);
  const found = [...new Set([...str].filter(ch => WX.has(ch)))];
  return found.length ? new Set(found) : null;
}
```

---

## 六、Pipeline 设计

### 6.1 通用 Step

Step 1：目标元素定位

```js
const targetSpec = resolveTargetElement({
  category: semanticRoute.category,
  subcategory: semanticRoute.subcategory,
  gender: params.gender
});
```

Step 2：原局状态评估

```js
const stateReport = assessOriginalChartState({
  matrix: params.matrix,
  targetSpec,
  dayStem: params.dayStem,
  gender: params.gender
});
```

Step 3：大运流年动态评估

```js
const dynamicReport = assessDynamicTriggers({
  matrix: params.matrix,
  targetSpec,
  stateReport,
  dayStem: params.dayStem,
  dayunGan,
  dayunZhi,
  liunianGan,
  liunianZhi,
  favorableWuxing: params.favorableWuxing,
  unfavorableWuxing: params.unfavorableWuxing
});
```

### 6.2 Pipeline A：`status`

适用：

- “今年事业怎么样”
- “现在财运如何”
- “这步大运婚姻状态”
- “今年能不能结婚/考试能不能上岸”

运行：

```js
function runStatusPipeline(params, semanticRoute) {
  const targetSpec = resolveTargetElement({ ...semanticRoute, gender: params.gender });
  const stateReport = assessOriginalChartState({ matrix: params.matrix, targetSpec, dayStem: params.dayStem, gender: params.gender });
  const dynamicReport = assessDynamicTriggers({
    matrix: params.matrix,
    targetSpec,
    stateReport,
    dayStem: params.dayStem,
    dayunGan: params.currentDayun.gan,
    dayunZhi: params.currentDayun.zhi,
    liunianGan: params.currentLiunian.gan,
    liunianZhi: params.currentLiunian.zhi,
    favorableWuxing: params.favorableWuxing,
    unfavorableWuxing: params.unfavorableWuxing
  });
  return { targetSpec, stateReport, dynamicReport };
}
```

输出语义：当前或指定阶段的“领域气候”，不是具体事件成功率。

### 6.3 Pipeline B：`timing`

适用：

- “什么时候结婚”
- “哪年财运最好”
- “未来五年事业哪年有机会”
- “几岁容易有孩子”

关键要求：

- timing 不能只看当前流年。
- 必须遍历一段时间的动态评估，生成候选时间窗。
- 候选窗口需要排序，并保留触发机制与阻力。

候选范围：

| 用户问题 | 默认扫描范围 |
|----------|--------------|
| 近期/最近 | 当前年起 3 年 |
| 未来几年/未来五年 | 当前年起 5 年 |
| 什么时候/哪年/几岁 | 当前年起 10 年 |
| 指定大运 | 该大运覆盖年份 |
| 指定年份区间 | 用户给出的年份区间 |

运行：

```js
function runTimingPipeline(params, semanticRoute, options = {}) {
  const targetSpec = resolveTargetElement({ ...semanticRoute, gender: params.gender });
  const stateReport = assessOriginalChartState({ matrix: params.matrix, targetSpec, dayStem: params.dayStem, gender: params.gender });
  const concreteTimeScope = resolveConcreteTimeScope(semanticRoute.time_scope, params.currentLiunian.year, {
    analysisMode: semanticRoute.analysis_mode
  });
  const candidateYearResult = resolveCandidateYears({
    timeScope: concreteTimeScope,
    currentYear: params.currentLiunian.year,
    liunianList: params.liunianList,
    dayunList: params.dayunList,
    birthYear: params.birthYear,
    maxYears: options.maxYears || 10
  });
  const candidateYears = candidateYearResult.years;

  const candidates = candidateYears.map((yearItem) => {
    const dayun = resolveDayunForYear({
      dayunList: params.dayunList,
      year: yearItem.year,
      currentDayun: params.currentDayun,
      birthYear: params.birthYear
    });
    const dynamicReport = assessDynamicTriggers({
      matrix: params.matrix,
      targetSpec,
      stateReport,
      dayStem: params.dayStem,
      dayunGan: dayun.gan,
      dayunZhi: dayun.zhi,
      liunianGan: yearItem.gan,
      liunianZhi: yearItem.zhi,
      favorableWuxing: params.favorableWuxing,
      unfavorableWuxing: params.unfavorableWuxing
    });
    return rankTimingCandidate({ yearItem, dayun, stateReport, dynamicReport, targetSpec });
  });

  return {
    targetSpec,
    stateReport,
    timingCandidates: sortTimingCandidates(candidates).slice(0, 5),
    scanned_years: candidateYears.map(y => y.year),
    limitations: candidateYearResult.limitations
  };
}
```

#### `resolveCandidateYears`

```js
function resolveCandidateYears({
  timeScope,
  currentYear,
  liunianList = [],
  dayunList = [],
  birthYear,
  maxYears = 10
}) {
  // returns {
  //   years: Array<{ year, gan, zhi, shi_shen, source, dayun_hint?: { gan, zhi } }>,
  //   limitations: string[]
  // }
}
```

核心逻辑：

- `current_year/next_3_years/next_5_years/next_10_years/specified_range`：按 `start_year/end_year` 从 `liunianList` 过滤。
- `specified_dayun`：先在 `dayunList` 中找 `timeScope.dayun_ganzhi` 对应大运，再用该大运的年份范围过滤 `liunianList`。
- 如果 `liunianList` 缺年份字段，尝试从列表顺序和 `currentYear` 推导；仍失败则降级为 status，并在 `meta.limitations` 写明“未来流年列表不足”。
- 扫描范围最大建议限制为 10 年；用户指定更长范围时可截断并提示。
- 返回结果必须按年份升序排列。

边界处理：

| 情形 | 处理 |
|------|------|
| `liunianList` 缺目标年份 | 跳过该年，并记录 limitation |
| 过滤后为空 | timing 降级 status |
| 范围跨多个大运 | 保留所有候选年，后续每年用 `resolveDayunForYear` 查所属大运 |
| 指定大运找不到 | 降级 `next_10_years` 或追问，取决于 confidence |

#### `resolveDayunForYear`

```js
function resolveDayunForYear({
  dayunList = [],
  year,
  currentDayun,
  birthYear
}) {
  // returns {
  //   gan, zhi, start_year, end_year, start_age, end_age, shi_shen,
  //   source: 'exact|estimated|fallback_current',
  //   limitations: []
  // }
}
```

核心逻辑：

- 优先使用 `dayun.start_year/end_year` 命中年份。
- 如果 `dayunList` 只有 `start_age`，而 profile 有 `birthYear`，则由 `birthYear + start_age` 推导 `start_year`；否则使用列表顺序和当前大运作近似定位，并标记 `source='estimated'`。
- 若年份落在大运切换边界，优先选择覆盖该公历年的大运；无法确定时返回当前大运并增加 limitation。
- 返回的 `source` 可为 `exact|estimated|fallback_current`，LLM 断语包中需降低 estimated/fallback 的置信度。

`rankTimingCandidate` 不必在 P0 完成复杂算分；优先输出等级和依据。若产品需要图表或排序稳定性，可同时输出可选的 `rank_score`：

```js
{
  year,
  ganzhi,
  dayun_ganzhi,
  quality,           // strong|medium|weak，应期候选强度等级
  rank_score,        // number|null，可选；仅用于排序/可视化，不是成功率
  event_type,
  mechanisms: [],
  supporting_evidence: [],
  blocking_evidence: [],
  dynamicReport
}
```

### 6.4 Pipeline C：`pattern`

适用：

- “我适合什么行业”
- “我有没有财富容量”
- “婚姻格局如何”
- “适不适合创业”

运行 Step 1 + Step 2。默认不运行 Step 3；如果产品希望给阶段性建议，可把当前大运作为 `advice` 背景，但 JSON 中不能写成应期。

### 6.5 Pipeline D：`character`

适用：

- “我老婆/老公是什么样的人”
- “未来对象画像”
- “领导/合伙人是什么类型”

默认运行 Step 1 + Step 2，重点使用目标十神的五行、旺衰、位置、刑冲合害。输出必须是“倾向”而非确定事实，并带置信度。

复合模式：

- `character + status`：如“我今年老婆的状态怎么样”“今年对象对关系的状态如何”。在 Step 1/2 人物画像基础上，追加 Step 3 当前大运流年动态评估。
- `character + timing`：如“哪年容易遇到这种类型的伴侣”。在 Step 1/2 人物画像基础上，遍历候选流年。
- 若 `target_resolution=llm_derived`，不强制运行 Step 2/3；只注入 LLM-derived 目标框架和边界说明。

---

## 七、上游断语包注入

Prompt 不应把上游 raw JSON 直接丢给 LLM。凡是 Step 1-3 中对 LLM 解读有价值的结构化字段，都应先由上游 formatter 封装成**自然语言断语包**，再注入 Prompt。

原则：

- LLM 读到的是“命理判断材料”，不是数据对象。
- 关键量化信息要保留，但以括号标签或短句呈现，例如“引动强度 72，有效”“流年旺衰 0.88，强于目标 0.64”。
- Formatter 负责选择、排序、摘要 raw report；LLM 负责组织最终回答。
- Prompt 中禁止大段裸露 `dynamicReport` / `stateReport` JSON。
- 如需调试，可在日志或 debug 字段保存 raw JSON，但不要进入面向 LLM 的正文 Prompt。

### 7.1 Step 1：目标元素断语包

```json
{
  "targetSpec": {
    "primary_shishen": [],
    "primary_gongwei": [],
    "secondary_shishen": [],
    "analysis_question": "",
    "fallback_level": "subcategory|category|general|llm_derived|none"
  }
}
```

用途：

- 告诉 LLM 本次到底看财、官、印、食伤、夫妻宫、时柱等哪个目标。
- 若 `fallback_level !== subcategory`，LLM 必须降低置信，不得装作精确规则。
- 若 `fallback_level=llm_derived`，必须同时注入 `llm_derived_target`，并在输出中说明这是模型自拟观察框架，不是后端规则。

### 7.2 Step 2：原局状态断语包

上游可以保留 raw `stateReport` 供程序使用，但注入 Prompt 时应调用 formatter：

实现要求：**in-place 升级现有 `lib/baziStateAssessor.js` 的 `formatStateReportForPrompt(report)`**，不要新建平行 formatter，避免两套格式长期分叉。函数签名扩展为向后兼容：

```js
formatStateReportForPrompt(stateReport, {
  includeQuantTags: true,
  maxShishenItems: 3,
  maxGongweiItems: 2
})
```

默认无 options 时保持现有三行输出；传入 options 时输出证据列表、十神 vigor、宫位状态等扩展断语包。

断语包格式：

```text
【原局状态评估】
整体稳定性：动态（dynamic）
基准状态：夫星有显但夫妻宫受冲，婚恋有机会但稳定性不足。

关键依据：
1. 七杀透于月干，夫星有显；其十二长生为冠带，原局力度中等（vigor 0.58）。
2. 日支酉为夫妻宫，受卯酉冲，宫位主动荡；但未入墓、未空亡。
3. 夫妻宫本身有金气承接，说明不是无缘，而是“有动象、需岁运合稳”。
```

用途：

- `overall_stability/base_state` 决定原局底盘。
- `vigor/phase_score/status_tags` 可支撑强弱、入墓、空亡、受冲等判断。
- `gongwei_assessments` 用于星宫同参，避免只看十神不看宫位。

### 7.3 Step 3：动态引动断语包

`baziDynamicAssessor` 已经提供有价值的量化指标，必须引入到 status/timing Prompt，但同样要通过 formatter 转成自然语言断语包。

实现要求：**in-place 升级现有 `lib/baziDynamicAssessor.js` 的 `formatDynamicReportForPrompt(report)`**，扩展 options，不新建平行 formatter。

```js
formatDynamicReportForPrompt(dynamicReport, {
  includeStrengthTags: true,
  maxMechanismsPerPillar: 2,
  includeMajorWindowFlag: true
})
```

`is_major_window` 可由组装层计算：

```js
const isMajorWindow =
  dynamicReport.dayun_impact.activates_target &&
  dynamicReport.liunian_impact.activates_target;
```

LLM 解读要求：

- `effective_strength` 是引动机制强度，适合用于解释“为什么这个窗口强/弱”。
- `trigger_vigor` 是大运/流年自身旺衰系数，适合解释“有引动但力量不足”。
- `vigor_check.is_effective=false` 时，不得写成强应期，只能写成“有信号但力不足”。
- `vigor_check.direction` 可解释冲动方向：引动者强则事件爆发，弱冲旺则容易反激或效果反转。
- `activates_target=true` 表示该大运/流年确实作用到目标元素。
- `is_major_window=true` 表示大运和流年双重引动，适合作为重大候选窗口。
- `target_trigger.new_stability` 和 `state_change` 应进入最终结论，不要只写泛泛“运势好/不好”。

### 7.4 timing 候选窗口排序建议

`rankTimingCandidate` 应优先使用结构化指标，而不是让 LLM 自行排序：

```js
function rankTimingCandidate({ yearItem, dayun, stateReport, dynamicReport, targetSpec }) {
  const topMechanisms = [
    ...dynamicReport.dayun_impact.mechanisms,
    ...dynamicReport.liunian_impact.mechanisms
  ].sort((a, b) => b.effective_strength - a.effective_strength);

  const top = topMechanisms[0];
  const isMajorWindow =
    dynamicReport.dayun_impact.activates_target &&
    dynamicReport.liunian_impact.activates_target;

  return {
    year: yearItem.year,
    ganzhi: `${yearItem.gan}${yearItem.zhi}`,
    dayun_ganzhi: `${dayun.gan}${dayun.zhi}`,
    quality: deriveQuality({
      isMajorWindow,
      isActivated: dynamicReport.target_trigger.is_activated,
      topStrength: top?.effective_strength ?? 0,
      isEffective: top?.vigor_check?.is_effective ?? false,
      newStability: dynamicReport.target_trigger.new_stability
    }),
    rank_score: null,
    activation_strength: top?.effective_strength ?? 0,
    trigger_vigor: {
      dayun: dynamicReport.dayun_impact.trigger_vigor,
      liunian: dynamicReport.liunian_impact.trigger_vigor
    },
    is_major_window: isMajorWindow,
    event_type: dynamicReport.target_trigger.event_type,
    mechanisms: topMechanisms.slice(0, 3),
    supporting_evidence: [],
    blocking_evidence: [],
    dynamicReport
  };
}
```

`rank_score` 仍然可选；如果暂不做数值评分，至少要提供：

- `quality`
- `activation_strength`
- `trigger_vigor`
- `is_major_window`
- `mechanisms[]`
- `target_trigger`

#### `deriveQuality` 规则

`quality` 必须由确定性规则给出，LLM 不能自行决定强弱。

| 条件 | quality |
|------|---------|
| `isMajorWindow=true` 且 `isActivated=true` 且 `isEffective=true` 且 `topStrength >= 60` | `strong` |
| `isActivated=true` 且 `isEffective=true` 且 `topStrength >= 55` 且 `newStability` 为 `stable|dynamic` | `strong` |
| `isActivated=true` 且 `isEffective=true` 且 `topStrength >= 35` | `medium` |
| `isMajorWindow=true` 但 `topStrength < 35` 或 `isEffective=false` | `medium`，并在 blocking_evidence 写“有双重引动但力量不足” |
| `isActivated=true` 但 `topStrength < 35` | `weak` |
| `isActivated=false` | `weak` |
| `newStability=damaged` 且 event_type 为风险类 | `weak` 或风险窗口，不作为 best_window |

注意：`quality` 表示“应期信号强度”，不是吉凶方向。若强引动对应冲破、破财、关系动荡等负向事件，应输出为 `quality=strong` 且 `tone=warning`，或进入 `avoid_window/risk_window`，不能因为它“强”就写成好事。

排序建议：

1. `quality`：strong > medium > weak。
2. `is_major_window=true` 优先。
3. `activation_strength` 高者优先。
4. `target_trigger.new_stability=stable` 优先于 `dynamic`，`damaged` 作为风险窗口。

---

## 八、Prompt Assembler

所有模式共用固定段落：

```
【A】角色约束
【B】分析框架路由
【C】命主基础信息
【D】目标元素定位
【E】原局状态评估
【F】动态分析或候选时间窗（status/timing）
【G】推演指令
【H】输出 JSON Schema
```

### 8.0 Assembler 与 `secondary_mode`

Assembler 以 `analysis_mode` 选择主模板，再根据 `secondary_mode` 追加副分析段，不另建完全独立模板。

```js
function assemblePrompt({ semanticRoute, profile, params, pipelineResult }) {
  const base = assemblePrimaryPrompt(semanticRoute.analysis_mode, { semanticRoute, profile, params, pipelineResult });
  const secondary = assembleSecondaryPrompt(semanticRoute.secondary_mode, { semanticRoute, params, pipelineResult });
  return [base, secondary].filter(Boolean).join('\n\n');
}
```

处理规则：

| primary | secondary | Prompt 注入 |
|---------|-----------|-------------|
| `pattern` | `status` | 主体用 pattern 模板；追加“当前大运流年动态评估（secondary=status）”断语包；输出以 pattern `mode_analysis` 为主，`dynamic_context/advice.timing` 承接当前状态 |
| `character` | `status` | 主体用 character 模板；追加当前大运流年对目标人物/关系状态的动态断语包 |
| `character` | `timing` | 主体用 character 模板；追加候选流年扫描断语包 |
| `status` | null | 只用 status 模板 |
| `timing` | null | 只用 timing 模板 |

`secondary_mode` 不能覆盖主输出 schema，但必须进入 `meta.secondary_mode`，并在 `dynamic_context` 或 `advice.timing` 中保留副分析依据。

### 8.1 角色约束

```
你是子平八字推演专家。
重要约束：
- 你不排盘，不重新推导干支关系。
- 所有干支关系、旺衰、刑冲合害、引动机制，以系统提供的【目标元素】【原局状态】【动态评估】为依据。
- 如字段显示“未提供”或 limitations 中说明资料不足，必须降低置信度，不得编造。
- 八字问答不是奇门即时占事；如输出评分，不要把它写成具体事件成功概率。八字分析可以只输出等级、趋势和依据，不强制给分。
- 输出必须是严格 JSON，不要 Markdown。
```

### 8.2 分析模式说明

status：

```
分析模式：当前/阶段状态评估
分析链路：目标元素定位 → 原局底盘 → 当前大运建场 → 当前流年触发 → 当前领域气候
assessment_type：current_climate
评分：可选
```

timing：

```
分析模式：候选应期推断
分析链路：目标元素定位 → 原局底盘 → 遍历候选流年 → 候选窗口排序 → 最优窗口与风险窗口
assessment_type：timing_effectiveness
评分：可选
注意：候选年份等级/分数只代表应期信号强弱，不代表事件必然发生。
```

pattern：

```
分析模式：先天格局/能力评估
分析链路：目标元素定位 → 原局状态 → 领域容量/适配度
assessment_type：innate_capacity
评分：可选
注意：不输出具体应期年份。
```

character：

```
分析模式：六亲人物画像
分析链路：目标十神五行性质 → 旺衰位置 → 刑冲合害 → 人物倾向
assessment_type：portrait_confidence
评分：可选
注意：人物画像只能写倾向，不能写成确定事实。
```

---

## 九、统一 JSON 输出协议

所有模式必须返回统一 envelope，便于前端稳定消费。不同模式的差异放入 `mode_analysis`。

### 9.1 通用结构

```json
{
  "meta": {
    "analysis_mode": "timing|status|pattern|character|unsupported",
    "secondary_mode": "status|timing|null",
    "branch": "bazi",
    "category": "",
    "subcategory": "",
    "target": {
      "shishen": [],
      "gongwei": [],
      "fallback_level": "subcategory|category|general|llm_derived|none",
      "llm_derived_target": null
    },
    "confidence": "high|medium|low",
    "limitations": []
  },
  "summary": {
    "title": "",
    "conclusion": "",
    "level": "strong|medium|weak|mixed|unknown",
    "assessment_type": "timing_effectiveness|current_climate|innate_capacity|portrait_confidence|unsupported",
    "score": null,
    "score_label": "",
    "keyword": "",
    "basis": {
      "positive_signals": [],
      "negative_signals": [],
      "logic": ""
    }
  },
  "chart_foundation": {
    "overall_stability": "",
    "base_state": "",
    "capacity_level": "strong|medium|weak|unknown",
    "core_stars": [],
    "core_palaces": [],
    "supports": [],
    "obstacles": [],
    "evidence": []
  },
  "dynamic_context": null,
  "mode_analysis": {},
  "advice": {
    "strategy": [],
    "risk": "",
    "avoid": [],
    "timing": [],
    "leverage": ""
  }
}
```

### 9.2 字段语义

| 字段 | 说明 |
|------|------|
| `meta.analysis_mode` | 实际执行模式，可能由 timing 降级为 status/pattern |
| `meta.secondary_mode` | 复合问题的副分析模式；不覆盖主 `mode_analysis` schema |
| `meta.confidence` | 基于字段完整度、fallback_level、触发机制强弱给出 |
| `meta.limitations` | 数据缺口或降级原因，如“未来流年列表不足，只评估当前年” |
| `meta.target.fallback_level` | 目标元素来源；`llm_derived` 表示模型自拟观察框架，不是后端规则 |
| `meta.target.llm_derived_target` | 当后端无 targetSpec 时注入模型自拟目标、理由和限制 |
| `summary.level` | 首选的强弱/顺逆/混合等级表达；八字分析不强制给分 |
| `summary.assessment_type` | 防止八字结论被误读成奇门成功率 |
| `summary.score` | 可选，允许为 `null`；仅用于需要量化展示的场景 |
| `chart_foundation.evidence` | 来自 Step 2 的十神/宫位/稳定性依据 |
| `dynamic_context` | status/timing 才有；pattern/character 为 null |
| `mode_analysis` | 各模式专属结构 |

### 9.3 Evidence Anchor 结构

所有主要结论都应尽量带依据锚点：

```json
{
  "source": "stateReport|dynamicReport|timingCandidate",
  "type": "shishen|gongwei|dayun|liunian|mechanism|limitation",
  "label": "正财坐日支 / 流年透官 / 日支受冲",
  "detail": "具体说明"
}
```

---

## 十、各模式 `mode_analysis`

### 10.1 status

> **注意**：以下是 LLM 应输出的字段。`trigger_vigor`、`activation_strength`、`activates_target`、`is_major_window`、`vigor_check.*`、`effective_strength` 等 pipeline 计算字段**不在此处**，它们由组装层从 pipeline 结果中注入，不要求 LLM 回显。

```json
{
  “current_climate”: “顺|逆|平|波动”,
  “dayun_reading”: “大运如何影响本命题的叙述（引用系统提供的干支、十神、机制，用自然语言说明）”,
  “liunian_reading”: “流年的触发效果叙述（说明是否能推进/合稳/逆向催动，以及程度）”,
  “target_state_reading”: “目标元素（十神/宫位）当前状态和变化的解读”,
  “event_type”: “”,
  “domain_state”: “”,
  “near_term_trend”: “”,
  “opportunities”: [],
  “pressure_points”: []
}
```

> **组装层补充字段**（`normalizeBaziQuestionOutput` 从 pipeline 结果中拼装，非 LLM 输出）：
> `dayun_ganzhi`、`liunian_ganzhi`、`is_major_window`、`quality`（= `deriveQuality` 结果）、`_audit`（完整 pipeline 数据，仅审计用）

评估语义：

- `assessment_type = current_climate`
- `level` 代表当前大运/流年对该问题域的支持等级，LLM 基于系统断语包推断，不得自行重新排盘。
- `score` 可选；如果输出，不能写成”成功率 80%”。

### 10.2 timing

> **注意**：以下是 LLM 应输出的字段。`quality`、`activation_strength`、`trigger_vigor`、`is_major_window`、`target_trigger.*`、`mechanisms.effective_strength`、`vigor_check.*` 等 pipeline 计算字段**不在此处**，由组装层从 pipeline 的 `rankTimingCandidate` 结果中注入。

```json
{
  “scanned_years”: [],
  “trigger_windows”: [
    {
      “year”: 2028,
      “ganzhi”: “戊申”,
      “dayun_ganzhi”: “”,
      “event_type”: “”,
      “verdict”: “此窗口的综合判断叙述（为何强/弱、核心机制是什么）”,
      “mechanisms_text”: “触发机制的自然语言说明”,
      “supporting_evidence”: [“命局依据文字...”],
      “blocking_evidence”: [“阻力文字...”]
    }
  ],
  “best_window”: “”,
  “avoid_window”: “”,
  “post_event_outlook”: “”,
  “why_not_now”: “”
}
```

> **组装层补充字段**（每个 trigger_window 由 `normalizeBaziQuestionOutput` 从 pipeline 的 `rankTimingCandidate` 结果中合并）：
> `quality`、`activation_strength`、`is_major_window`、`trigger_vigor.{dayun, liunian}`、`target_trigger`、`mechanisms.effective_strength`、`mechanisms.vigor_check`、`_audit`

评估语义：

- `assessment_type = timing_effectiveness`
- `summary.level` 可取最佳候选窗口的 `quality`（pipeline 计算，组装层注入，LLM 在生成 `best_window` 时可引用）。
- 不要求 LLM 自行给出数值强度，只需解释”为什么这个窗口强/弱”。

### 10.3 pattern

```json
{
  "capacity_level": "strong|medium|weak|unknown",
  "domain_fit": "",
  "innate_ceiling": "",
  "core_stars": "",
  "structural_supports": [],
  "structural_risks": [],
  "verdict": ""
}
```

评估语义：

- `assessment_type = innate_capacity`
- `level` 代表先天结构对该领域的承载度。
- `score` 可选。
- 不得输出具体年份或“今年会发生”。

### 10.4 character

```json
{
  "portrait_subject": "spouse|partner|boss|child|other",
  "target_resolution": "backend_mapped|llm_derived",
  "llm_derived_target_note": "",
  "appearance_tendency": {
    "text": "",
    "confidence": "high|medium|low",
    "evidence": []
  },
  "personality_tendency": {
    "text": "",
    "confidence": "high|medium|low",
    "evidence": []
  },
  "career_style": {
    "text": "",
    "confidence": "high|medium|low",
    "evidence": []
  },
  "relationship_dynamic": "",
  "do_not_overclaim": "以上为十神五行和宫位状态呈现的人物倾向，不等于现实中对方一定如此。"
}
```

评估语义：

- `assessment_type = portrait_confidence`
- `level` 或画像块内 `confidence` 代表画像依据充分程度。
- `score` 可选。
- 不代表对象好坏或关系成败。

---

## 十一、兼容层：`normalizeBaziQuestionOutput`

PRD 落地时必须同步更新 normalize，不然前端仍读取旧字段会变空。

兼容目标：

```js
function normalizeBaziQuestionOutput(raw = {}, { question = '', route = {} } = {}) {
  return {
    ...raw,
    question,
    branch: 'bazi',
    category: route.category || raw.meta?.category || 'general',
    subcategory: route.subcategory || raw.meta?.subcategory || '',
    route,
    analysis: {
      tensor: raw.mode_analysis?.current_climate || raw.dynamic_context?.current_climate || '',
      yong_shen: raw.chart_foundation?.core_stars?.join?.('、') || '',
      bazi_insight: raw.chart_foundation?.capacity_level || raw.mode_analysis?.domain_fit || '',
      pattern: raw.mode_analysis?.verdict || raw.chart_foundation?.base_state || '',
      god_help: raw.chart_foundation?.supports?.join?.('；') || '',
      dynamic_timing: raw.mode_analysis?.best_window || raw.mode_analysis?.near_term_trend || ''
    },
    advice: normalizeAdvice(raw.advice)
  };
}
```

前端若支持新版 UI，应优先读：

- `summary.assessment_type`
- `summary.level`
- `meta.analysis_mode`
- `chart_foundation`
- `dynamic_context`
- `mode_analysis`

### 11.1 前端卡片渲染契约

前端卡片不应继续复用奇门“成败/概率”样式。八字卡片按 `assessment_type` 切换信息层级：

| assessment_type | 主卡标题 | 主指标 | 重点模块 | 不应展示 |
|-----------------|----------|--------|----------|----------|
| `current_climate` | 当前阶段气候 | `summary.level` + `current_climate` | 大运建场、流年触发、机会/压力 | 成功率、是否必成 |
| `timing_effectiveness` | 候选时间窗 | best window + `trigger_windows[]` | 年份列表、quality 等级、是否双引动（友好标签）、阻力 | 单一 yes/no；原始数值如 activation_strength |
| `innate_capacity` | 先天结构适配 | `capacity_level` | 支撑结构、风险结构、策略 | 当前年份应期 |
| `portrait_confidence` | 人物倾向画像 | 画像置信度 | 外貌/性格/职业/互动倾向 | 确定事实、身份标签 |
| `unsupported` | 无法可靠解读 | 边界说明 | 可替代问题、限制原因 | 命理硬断 |

推荐组件结构：

- `SummaryCard`：消费 `summary.title/conclusion/level/keyword`，如果 `score=null`，不渲染分数环或百分比。
- `FoundationCard`：消费 `chart_foundation.base_state/evidence`，展示原局底盘。
- `DynamicCard`：仅 status/timing 渲染。展示内容来自**组装层从 pipeline 结果中注入的友好标签**，例如”引动：有效”、”双引动：是/否”；不展示 `trigger_vigor`、`activation_strength` 等原始数值或字段名，这些仅存于审计快照。
- `TimingWindowsCard`：仅 timing 渲染 `trigger_windows[]`，按 `quality` 与排序结果展示候选年。
- `LimitationsCard`：只要 `meta.limitations` 非空就展示，尤其是 `llm_derived`、`estimated`、`fallback_current`。

兼容要求：

- 旧前端仍可读 `analysis` 兼容字段。
- 新前端优先读 envelope；如果 `summary.score=null`，使用 `summary.level` 和文本标签完成展示。
- 卡片样式应支持“无分数但有等级”的八字输出，不强制所有模式都有量化仪表。

### 11.2 数仓落库与审计契约

为便于复盘路由、Prompt 组装和 LLM 输出质量，工程中间产物需要可选落表。落库对象分为“业务响应”和“审计快照”，避免把 raw JSON 直接暴露给前端。

建议新增或扩展审计表：

```sql
bazi_question_audit
```

建议字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string/uuid | 审计记录 id |
| `request_id` | string | 单次问答请求 id |
| `user_id` | string/null | 用户 id，按现有隐私策略脱敏 |
| `question` | text | 用户原始问题 |
| `rule_route_hint` | json | `ruleRouteHint` 输出 |
| `semantic_route_raw` | json | LLM 路由原始输出 |
| `semantic_route_normalized` | json | normalizer 后结果 |
| `time_scope_resolved` | json | `resolveConcreteTimeScope` 结果 |
| `analysis_params_snapshot` | json | 提取后的关键 params，避免落完整隐私 profile |
| `target_spec` | json | Step 1 输出或 llm_derived target |
| `state_report` | json | Step 2 raw report |
| `dynamic_report` | json/null | status 当前动态报告 |
| `timing_candidates` | json/null | timing 候选窗口排序结果 |
| `prompt_blocks` | json | 组装后的自然语言断语包列表，不必落完整最终 prompt |
| `llm_output_raw` | json/text | LLM 原始返回 |
| `llm_output_normalized` | json | `normalizeBaziQuestionOutput` 后结果 |
| `fallbacks` | json | 降级、fallback_level、limitations |
| `model_name` | string | 使用的模型 |
| `latency_ms` | number | 总耗时 |
| `created_at` | timestamp | 创建时间 |

审计原则：

- 面向 LLM 的 Prompt 只注入自然语言断语包；审计表可以保存 raw `stateReport/dynamicReport`，用于排查。
- `analysis_params_snapshot` 只保存排盘分析必要字段，避免落用户完整 profile。
- 每次 normalizer 改写、pipeline 降级、formatter 截断，都写入 `fallbacks`。
- 审计表不参与前端渲染；前端只消费 normalized envelope。

---

## 十二、主 Prompt 共用结构块

每个主 Prompt（status/timing/pattern/character）都注入以下两个固定块：

### 12.1 Pipeline 分析框架说明（buildPipelineContextBlock）

让模型理解数据来自结构化预计算，而不是自由推演：

```text
【分析框架说明】
本次分析由三步后端 Pipeline 预计算完成，你只需在这些结构化结论之上进行叙述和解释：
- Step 1（目标元素定位）：根据问题类别和命主性别，从规则库中锁定本次分析的核心十神（如正官、七杀）、宫位（如日支）及辅助神煞，确定观察框架。
- Step 2（原局状态评估）：对命局四柱中目标十神/宫位的强弱、稳定性、刑冲合害进行静态评分，输出命局”底盘”状态，作为所有动态评估的基准。
- Step 3（动态引动评估）：将大运/流年干支与命局目标元素逐一做生克冲合计算，判断是否能引动目标元素、引动方向（喜/忌）与强度。timing 模式下对候选年份逐年遍历并排序。
以上结论已格式化为自然语言断语包注入本 Prompt。你的任务是：基于这些断语包，用有温度的语言解释命主面临的具体情境，给出有依据的判断和可操作建议。
```

### 12.2 数据依据约束（grounding constraint）

所有模式通用，确保模型不自行编造干支关系：

```text
【数据依据约束】
- 所有干支关系、旺衰、刑冲合害、引动机制的判断，只能来自下方【目标元素】【原局状态】【动态评估】中系统已提供的内容。
- 如果某个字段或机制系统未提供，请在 meta.limitations 中说明”资料未提供”，不得自行推导或编造。
- 每条 chart_foundation.evidence、summary.basis.signals、mode_analysis 中的结论，必须对应系统已给出的具体干支、十神或机制标签，不能凭空引用。
```

### 12.3 Prompt 输出约束

所有模式通用：

- 必须严格返回 JSON。
- `summary.level` 必须存在，可用 `strong|medium|weak|mixed|unknown`。
- `summary.assessment_type` 必须匹配 `meta.analysis_mode`。
- `summary.score` 是可选字段，允许为 `null`；如输出数字，必须是 0-100 整数，并只能作为辅助量化。
- `summary.score_label` 仅在 `summary.score` 为数字时需要；无评分时可为空字符串。
- `summary.basis.positive_signals` 与 `summary.basis.negative_signals` 至少各 1 条；确实没有时写入 `limitations` 并降低 confidence。
- 结论必须引用 `chart_foundation.evidence` 或 `mode_analysis` 中的依据。
- 不得重新排盘，不得伪造神煞、格局、干支关系。
- 不得把八字评分或等级写成”成功概率”。
- 医疗、法律、投资等高风险问题必须加风险提示，不能替代专业意见。

---

## 十三、Prompt 组装示例

以下示例使用同一套组装框架，但不同 `analysis_mode` 会注入不同的数据段和推演指令。示例中的干支、机制和报告内容是格式样例，真实实现必须来自 Step 1-3 的结构化输出。

### 13.1 status 示例：今年能不能结婚

用户问题：

```text
我今年能不能结婚？
```

统一语义路由结果：

```json
{
  "branch": "bazi",
  "category": "relationship",
  "subcategory": "relationship_timing",
  "analysis_mode": "status",
  "secondary_mode": null,
  "needs_time_scan": false,
  "time_scope": { "type": "current_year", "start_year": 2026, "end_year": 2026 },
  "target_focus": { "subject": "marriage", "object": "self", "is_specific_event": false },
  "needs_bazi_profile": true,
  "confidence": "high",
  "reason": "问题限定今年，适合评估当前大运流年对婚姻目标的触发状态。"
}
```

Prompt 样例：

```text
你是子平八字推演专家。
重要约束：
- 你不排盘，不重新推导干支关系。
- 所有干支关系、旺衰、刑冲合害、引动机制，以系统提供的【目标元素】【原局状态】【动态评估】为依据。
- 八字问答不是奇门即时占事；如输出评分，不要把它写成具体事件成功概率。
- 输出必须是严格 JSON，不要 Markdown。

【用户问题】
我今年能不能结婚？

【语义路由】
branch: bazi
category/subcategory: relationship / relationship_timing
analysis_mode: status
assessment_type: current_climate
time_scope: current_year, 2026

【命主基础信息】
性别：女
八字：甲子 丁卯 癸酉 辛酉
日主：癸
系统旺衰：偏弱
系统格局：偏印格
喜用神：金、水
忌仇神：火、土

【上游命局分析摘要】
旺衰判断：癸水生卯月，日主偏弱，需金水承接。
格局判断：偏印格，以印星护身为主。
调候判断：春木渐旺，水弱需金生水，火土过旺则压身。
喜用十神：正印、偏印、比肩、劫财；忌仇十神：正财、偏财、正官、七杀
喜用五行：金、水；忌仇五行：火、土
当前大运：辛酉（偏印，32岁起）
当前流年：丙午（正财）
简短断语：原局夫星有显，但日主承载力不足，婚恋判断需先看夫妻宫稳定性，再看岁运是否合稳。

【目标元素定位 Step 1】
主要分析十神：正官、七杀
主要分析宫位：日支
辅助参考元素：桃花、天喜、红鸾
fallback_level: subcategory

【原局状态评估 Step 2】
整体稳定性：动态（dynamic）
基准状态：夫星有显但夫妻宫受冲，婚恋有机会但稳定性不足。
依据：
- 七杀透于月干，夫星有显。
- 日支酉为夫妻宫，受卯酉冲，关系宫位主动荡。
- 夫星不入墓，但受原局冲动影响，容易先动后稳。

【当前大运流年动态评估 Step 3】
【大运分析】庚申大运扶起夫妻宫金气，能增强关系承接力。大运自身旺衰系数 0.82，作用有效；最强机制为“申与日支酉同属金气，扶起夫妻宫承接力”，引动强度 38，触发者强于目标（0.82 对 0.64，direction=wins）。大运 activates_target=true。

【流年分析】丙午流年能引动关系议题，但不是直接合稳夫妻宫。流年旺衰系数 0.71，透干引动官杀压力，引动强度 31，作用有效；但 liunian activates_target=false，说明它更多是把议题推到台前，不是直接落定机制。

【目标元素引动结论】原局“夫星有显但夫妻宫受冲”的基准状态被大运扶起，流年引动关系议题；新稳定性仍为 dynamic。target_trigger.is_activated=true，event_type=感情推进。大运流年不是双重直接引动（is_major_window=false），因此更像推进窗口，不宜写成确定结婚落定。

【推演任务】
请判断今年婚恋是否具备推进和落定条件。
必须区分：
1. 原局婚姻底盘是否支持；
2. 当前大运是否建场（依据系统提供的大运断语）；
3. 当前流年是否触发（依据系统提供的流年断语）；
4. 系统断语中大运和流年的引动质量是否支撑强结论（”作用有效/无效”、”双重引动/单一引动”）；
5. 今年适合推进到什么程度。
不要输出”成功率”。如不输出分数，summary.score 使用 null。

【输出 JSON Schema】
返回统一 envelope。meta.analysis_mode=status，summary.assessment_type=current_climate。
mode_analysis 使用 status 结构：current_climate、dayun_reading、liunian_reading、target_state_reading、domain_state、near_term_trend、opportunities、pressure_points。
不要在输出 JSON 中回显 trigger_vigor、activation_strength、activates_target、is_major_window 等 pipeline 内部字段；这些由组装层处理。
```

### 13.2 timing 示例：什么时候结婚

用户问题：

```text
我什么时候结婚？
```

统一语义路由结果：

```json
{
  "branch": "bazi",
  "category": "relationship",
  "subcategory": "relationship_timing",
  "analysis_mode": "timing",
  "secondary_mode": null,
  "needs_time_scan": true,
  "time_scope": { "type": "next_10_years", "start_year": 2026, "end_year": 2035 },
  "target_focus": { "subject": "marriage", "object": "self", "is_specific_event": false },
  "needs_bazi_profile": true,
  "confidence": "high",
  "reason": "用户询问婚姻应期，需要遍历未来流年候选窗口。"
}
```

Prompt 样例：

```text
你是子平八字推演专家。
重要约束：
- 你不排盘，不重新推导干支关系。
- timing 模式必须基于候选年份动态评估，不得只看当前流年。
- 候选年份等级/分数只代表应期信号强弱，不代表事件必然发生。
- 输出必须是严格 JSON，不要 Markdown。

【用户问题】
我什么时候结婚？

【语义路由】
category/subcategory: relationship / relationship_timing
analysis_mode: timing
assessment_type: timing_effectiveness
needs_time_scan: true
time_scope: 2026-2035

【命主基础信息】
性别：女
八字：甲子 丁卯 癸酉 辛酉
日主：癸，偏弱
喜用神：金、水
忌仇神：火、土

【上游命局分析摘要】
旺衰判断：癸水偏弱，原局需要金水补源。
格局判断：偏印格，印星可用但夫妻宫受冲。
调候判断：春令木旺，先看金水能否承接，火土过旺则形成压力。
喜用十神：正印、偏印、比肩、劫财；忌仇十神：正财、偏财、正官、七杀
喜用五行：金、水；忌仇五行：火、土
当前大运：辛酉（偏印，32岁起）
当前流年：丙午（正财）
简短断语：婚恋不是无缘，但应期需看流年是否能解冲、合动或稳定夫妻宫。

【目标元素定位 Step 1】
主要分析十神：正官、七杀
主要分析宫位：日支

【原局状态评估 Step 2】
整体稳定性：dynamic
基准状态：夫星可见，夫妻宫受冲，婚恋不是无缘，但需要岁运合动或解冲才能落定。
evidence:
- 七杀透月干，夫星有显。
- 日支酉受卯冲，夫妻宫不静。
- 原局缺少直接合稳夫妻宫的结构。

【候选流年扫描 Step 3】
扫描年份：2026-2035。

候选窗口断语：
1. 2029 己酉年（strong）
   这是当前扫描段中最强窗口。庚申大运承接夫妻宫，己酉流年填实夫妻宫，婚姻主题被明显放大。最强机制为“填实三合/填实夫妻宫”，引动强度 72；流年旺衰 0.88，高于目标旺衰 0.64，vigor_check 为有效，direction=wins。大运与流年均直接引动目标（is_major_window=true），target_trigger 显示“原局冲动状态被阶段性合稳”，新稳定性为 stable。阻力是原局卯酉冲仍在，推进中会有选择、距离或现实条件的拉扯。

2. 2031 辛亥年（medium）
   这是次强推进窗口。辛金透出扶身，亥水帮身，利于关系稳定和现实承接；引动强度 46，流年旺衰 0.67，作用有效。但它对夫妻宫的直接触发弱于 2029，且不是大运流年双重直接引动（is_major_window=false），所以更像关系推进或稳定沟通窗口，不如 2029 明确落定。

3. 2026 丙午年（weak）
   这是当前年弱窗口。丙午流年能引动官杀压力和关系议题，引动强度 31，作用有效；但缺少合稳夫妻宫的机制，且 is_major_window=false。它适合观察、推进、确认关系意愿，不宜直接断为结婚落定。

【推演任务】
请输出未来结婚候选窗口，而不是只回答”会/不会”。
必须说明：
1. 最强窗口是哪一年，依据系统提供的候选窗口排序；
2. 为什么不是当前年（依据系统断语中的引动质量说明）；
3. 每个候选窗口的触发机制叙述和阻力（用自然语言解释，不要回显 pipeline 数值字段）；
4. 哪些窗口是大运和流年双重引动的强应期；
5. 如果没有强窗口，说明资料或岁运条件不足。

【输出 JSON Schema】
返回统一 envelope。meta.analysis_mode=timing。
mode_analysis 使用 timing 结构：scanned_years、trigger_windows（每项含 year/ganzhi/dayun_ganzhi/event_type/verdict/mechanisms_text/supporting_evidence/blocking_evidence）、best_window、avoid_window、why_not_now。
不要在输出 JSON 中包含 activation_strength、trigger_vigor、is_major_window、mechanisms.effective_strength、vigor_check、target_trigger 等 pipeline 内部字段；这些由组装层从 rankTimingCandidate 结果中合并。
summary.score 可以为 null，summary.level 引用系统断语中最佳窗口的强弱评级。
```

### 13.3 pattern 示例：适合创业还是打工

用户问题：

```text
我适合创业还是打工？
```

统一语义路由结果：

```json
{
  "branch": "bazi",
  "category": "career_business",
  "subcategory": "entrepreneurship_vs_job",
  "analysis_mode": "pattern",
  "secondary_mode": null,
  "needs_time_scan": false,
  "time_scope": { "type": "unknown" },
  "target_focus": { "subject": "career", "object": "self", "is_specific_event": false },
  "needs_bazi_profile": true,
  "confidence": "high",
  "reason": "用户询问先天职业路径适配，优先评估原局格局和事业结构。"
}
```

Prompt 样例：

```text
你是子平八字推演专家。
重要约束：
- pattern 模式只评估先天格局/能力/适配度。
- 不输出具体应期年份，不写“今年会创业成功”。
- 可在 advice 中提示阶段性取舍，但不得伪装成应期判断。
- 输出必须是严格 JSON。

【用户问题】
我适合创业还是打工？

【语义路由】
category/subcategory: career_business / entrepreneurship_vs_job
analysis_mode: pattern
assessment_type: innate_capacity

【命主基础信息】
性别：男
八字：戊辰 甲寅 丙午 庚寅
日主：丙，偏旺
系统格局：食神生财倾向
喜用神：金、水
忌仇神：木、火

【上游命局分析摘要】
旺衰判断：丙火生寅月，木火偏旺，日主承载力强但燥烈。
格局判断：食神生财倾向，适合产品、表达、经营变现。
调候判断：木火偏旺，喜金水调剂，忌木火再助燥势。
喜用十神：正财、偏财、正官、七杀；忌仇十神：正印、偏印、比肩、劫财
喜用五行：金、水；忌仇五行：木、火
当前大运：辛酉（正财，35岁起）
当前流年：丙午（比肩）
简短断语：命局有经营和资源变现通路，但需用金水收束执行冲动，避免火旺急进。

【目标元素定位 Step 1】
主要分析十神：食神、伤官、偏财、正官
主要分析宫位：月柱
辅助参考元素：正印、七杀

【原局状态评估 Step 2】
整体稳定性：stable
基准状态：食伤财星可用，表达/产品/经营倾向较强；官印约束不足，纯打工服从型路径不是最优。
evidence:
- 食神透出并能生财，适合靠技能、产品、服务变现。
- 偏财在时柱显现，有经营与资源整合倾向。
- 正官弱，规则型组织上升路径承接一般。
- 日主偏旺，能承担一定试错，但忌木火过旺导致急进。

【推演任务】
请判断命主更适合创业、打工，还是先打工后创业。
必须输出：
1. 先天职业模式；
2. 创业优势；
3. 打工优势或短板；
4. 结构性风险；
5. 可执行策略。
不要给具体年份应期。

【输出 JSON Schema】
返回统一 envelope。meta.analysis_mode=pattern。
mode_analysis 使用 pattern 结构，包含 capacity_level、domain_fit、innate_ceiling、structural_supports、structural_risks、verdict。
summary.score 可以为 null。
```

### 13.4 character 示例：伴侣画像

用户问题：

```text
我未来老婆是什么样的人？
```

统一语义路由结果：

```json
{
  "branch": "bazi",
  "category": "relationship",
  "subcategory": "partner_profile",
  "analysis_mode": "character",
  "secondary_mode": null,
  "needs_time_scan": false,
  "time_scope": { "type": "unknown" },
  "target_focus": { "subject": "spouse", "object": "spouse", "is_specific_event": false },
  "needs_bazi_profile": true,
  "confidence": "high",
  "reason": "用户询问配偶人物特征，应走六亲人物画像。"
}
```

Prompt 样例：

```text
你是子平八字推演专家。
重要约束：
- character 模式只输出人物倾向，不做应期推断。
- 外貌、性格、职业风格必须写成“倾向”，不能写成确定事实。
- 每个画像块都要带 confidence 和 evidence。
- 输出必须是严格 JSON。

【用户问题】
我未来老婆是什么样的人？

【语义路由】
category/subcategory: relationship / partner_profile
analysis_mode: character
assessment_type: portrait_confidence

【命主基础信息】
性别：男
八字：乙丑 己卯 壬申 丁未
日主：壬

【上游命局分析摘要】
旺衰判断：壬水生卯月，泄气较重，需金水扶助。
格局判断：财星透出，配偶星有显，但藏透不一。
调候判断：春木旺，水势被泄，先看金水承接与火土财官是否过重。
喜用十神：正印、偏印、比肩、劫财；忌仇十神：正财、偏财、正官、七杀
喜用五行：金、水；忌仇五行：火、土
当前大运：庚辰（偏印）
当前流年：丙午（偏财）
简短断语：配偶画像可从财星和夫妻宫看倾向，但只能输出关系互动与气质倾向。

【目标元素定位 Step 1】
主要分析十神：正财、偏财
主要分析宫位：日支

【原局状态评估 Step 2】
整体稳定性：mixed
基准状态：财星有根但藏透不一，配偶画像有明显土火气质，同时夫妻宫受合，关系互动有依附和现实考量。
evidence:
- 丁火偏财透时干，配偶星外显，偏热情主动。
- 丑未土中藏财官，现实感较强，重稳定和资源。
- 日支申与财星不完全同位，伴侣与命主互动中有距离感或节奏差。

【推演任务】
请描绘配偶人物倾向：
1. appearance_tendency：外貌气质倾向；
2. personality_tendency：性格倾向；
3. career_style：职业/行事风格倾向；
4. relationship_dynamic：与命主互动模式；
5. do_not_overclaim：提醒这是命理倾向，不是现实确定事实。
不要输出结婚年份或当前感情成败。

【输出 JSON Schema】
返回统一 envelope。meta.analysis_mode=character。
mode_analysis 使用 character 结构。
summary.score 可以为 null，summary.level 表示画像依据充分度。
```

### 13.5 character + llm_derived target 示例：后端查不到目标元素

用户问题：

```text
这个人是不是同性恋？
```

统一语义路由结果：

```json
{
  "branch": "bazi",
  "category": "relationship",
  "subcategory": "partner_profile",
  "analysis_mode": "character",
  "secondary_mode": null,
  "needs_time_scan": false,
  "time_scope": { "type": "unknown" },
  "target_focus": { "subject": "other", "object": "identity", "is_specific_event": false },
  "target_resolution": "llm_derived",
  "llm_derived_target": {
    "primary_symbols": ["亲密关系表达方式", "吸引模式", "关系边界"],
    "secondary_symbols": ["桃花/合冲关系信号", "食伤表达", "夫妻宫互动"],
    "reasoning_frame": "只能分析亲密关系表达、吸引模式与关系边界倾向，不能判定性取向身份。",
    "confidence": "low",
    "limitations": ["后端 targetSpec 没有性取向映射", "不能输出确定身份标签"]
  },
  "needs_bazi_profile": true,
  "confidence": "medium",
  "reason": "问题仍属于 character/relationship 的人物倾向类，但后端没有可靠目标元素规则，需由 LLM 自拟低置信观察框架。",
  "followupQuestion": ""
}
```

Prompt 样例：

```text
你是子平八字推演专家。
重要约束：
- 本次 character 问题没有后端 targetSpec，target_resolution=llm_derived。
- 不能强行套用配偶星、桃花、夫妻宫来断定性取向身份。
- 只能分析“亲密关系表达、吸引模式、关系边界”这类低置信倾向。
- 结论必须明确：不能用八字给他人贴确定身份标签。
- 输出必须是严格 JSON。

【用户问题】
这个人是不是同性恋？

【语义路由】
category/subcategory: relationship / partner_profile
analysis_mode: character
assessment_type: portrait_confidence
target_resolution: llm_derived

【命主基础信息】
性别：男
八字：乙丑 己卯 壬申 丁未
日主：壬

【上游命局分析摘要】
旺衰判断：壬水偏弱，命局互动表达需看金水承接。
格局判断：财星有显，但本问题无稳定后端 targetSpec。
调候判断：春木泄水，火土过旺时关系表达容易被现实压力牵引。
喜用十神：正印、偏印、比肩、劫财；忌仇十神：正财、偏财、正官、七杀
喜用五行：金、水；忌仇五行：火、土
当前大运：庚辰（偏印）
当前流年：丙午（偏财）
简短断语：该摘要只能作为关系表达背景，不可用于判定性取向身份。

【LLM 自拟目标元素框架】
后端未找到可用 targetSpec。本次不调用 Step 2/3 的后端目标元素分析。
允许观察的象义范围：
1. 亲密关系表达方式：看表达、吸引、依恋、边界，而不是身份标签。
2. 吸引模式：可参考桃花、合冲关系信号，但只能作为关系互动倾向。
3. 关系边界：可参考食伤表达、夫妻宫互动，但不得导出“是不是同性恋”的确定判断。

置信边界：
- confidence: low
- limitations:
  - 后端 targetSpec 没有性取向映射。
  - 八字无法可靠判定性取向身份。
  - 不得输出确定标签，只能给“这个问题不适合这样断”的解释和安全替代分析。

【推演任务】
请输出 character 分支结果，但把重点放在边界说明和可替代分析：
1. 先说明不能用八字判断某人是不是同性恋；
2. 再说明如果用户关心的是关系互动，可以分析亲密表达、沟通边界、吸引模式；
3. mode_analysis.character_portrait 中不要写 appearance/career 的具体断语；
4. relationship_dynamic 可以写“无法判定身份，只能讨论关系表达倾向”；
5. do_not_overclaim 必须明确标注这是 llm_derived 低置信框架，不是后端规则结论。

【输出 JSON Schema】
返回统一 envelope。meta.analysis_mode=character。
meta.target.fallback_level=llm_derived，并写入 llm_derived_target。
chart_foundation 可以为 null，dynamic_context 必须为 null。
mode_analysis 使用 character 结构，target_resolution=llm_derived。
summary.score 使用 null，summary.level 使用 unknown 或 weak。
```

### 13.6 pattern + status 复合示例：适合创业吗，现在能不能做

用户问题：

```text
我适合创业吗，现在能不能做？
```

统一语义路由结果：

```json
{
  "branch": "bazi",
  "category": "career_business",
  "subcategory": "entrepreneurship_vs_job",
  "analysis_mode": "pattern",
  "secondary_mode": "status",
  "needs_time_scan": false,
  "time_scope": { "type": "current_year", "start_year": 2026, "end_year": 2026 },
  "target_focus": { "subject": "career", "object": "self", "is_specific_event": false },
  "needs_bazi_profile": true,
  "confidence": "high",
  "reason": "问题同时包含先天适配和当前执行窗口，应先看原局适配，再看当前岁运气候。"
}
```

Prompt 样例：

```text
你是子平八字推演专家。
重要约束：
- 本次是复合模式：primary=pattern，secondary=status。
- 先回答“是否适合创业”这个先天结构问题，再回答“现在能不能做”这个当前阶段问题。
- 当前阶段判断不是奇门 yes/no，不输出成功概率。
- 输出必须是严格 JSON。

【用户问题】
我适合创业吗，现在能不能做？

【语义路由】
category/subcategory: career_business / entrepreneurship_vs_job
analysis_mode: pattern
secondary_mode: status
assessment_type: innate_capacity
time_scope: current_year, 2026

【命主基础信息】
性别：男
八字：戊辰 甲寅 丙午 庚寅
日主：丙，偏旺
喜用神：金、水
忌仇神：木、火

【上游命局分析摘要】
旺衰判断：丙火偏旺，执行力强但易急。
格局判断：食神生财倾向，具备经营/产品/表达变现底色。
调候判断：木火偏旺，喜金水收束和降温。
喜用十神：正财、偏财、正官、七杀；忌仇十神：正印、偏印、比肩、劫财
喜用五行：金、水；忌仇五行：木、火
当前大运：辛酉（正财，35岁起）
当前流年：丙午（比肩）
简短断语：当前大运财星透出，有商业化窗口；流年火旺，宜试水和验证，不宜重仓冒进。

【目标元素定位 Step 1】
主要分析十神：食神、伤官、偏财、正官
主要分析宫位：月柱

【原局状态评估 Step 2】
整体稳定性：stable
基准状态：食伤财星可用，具备经营/产品/表达变现倾向。
evidence:
- 食伤能生财，是创业/经营的基本通路。
- 偏财有显，资源整合意识较强。
- 正官弱，纯组织晋升路线不是最强项。

【当前大运流年动态评估 Step 3（secondary=status）】
【大运分析】辛酉大运财星透出，商业化和资源变现信号明确。大运旺衰系数 0.86，作用有效；最强机制为“辛金财星透出”，引动强度 65，触发者强于目标（0.86 对 0.58，direction=wins）。大运 activates_target=true。

【流年分析】丙午流年火旺，推动执行欲、曝光度和竞争压力。流年旺衰系数 0.90，机制为“伏吟/火旺叠压”，引动强度 60，作用有效；流年 activates_target=true。

【目标元素引动结论】原局“食伤财星可用，具备经营/产品/表达变现倾向”，当前大运财星透出，流年火旺推动执行，但也放大急进风险。target_trigger.is_activated=true，event_type=事业推进，新稳定性为 dynamic。大运与流年均引动目标（is_major_window=true），说明现在有启动/试水窗口，但不宜重仓。

【推演任务】
请按两段输出：
1. pattern：命主先天是否适合创业，适合哪种创业模式；
2. status：当前年份是否适合启动，适合试水、转型、合伙还是等待（依据系统提供的大运流年断语，说明当前引动质量是否支撑启动）。
不要把当前状态写成”必然成功/必然失败”。

【输出 JSON Schema】
返回统一 envelope。
meta.analysis_mode=pattern，meta 中保留 secondary_mode=status。
mode_analysis 以 pattern 结构为主，同时在 dynamic_context 或 advice.timing 中体现当前状态评估（用 dayun_reading/liunian_reading 形式说明当前动态）。
不要在输出 JSON 中包含 activation_strength、trigger_vigor、is_major_window、target_trigger 等 pipeline 字段；这些由组装层从 pipeline 结果中补充。
summary.score 可以为 null，summary.level 综合先天适配与当前气候给出。
```

---

## 十四、测试要求

| 测试场景 | 期望 mode | 验证点 |
|----------|-----------|--------|
| “我今年能不能结婚” | `status` | 统一路由器不能因“能不能”误判为 `pattern`；`time_scope.type=current_year` |
| “命里有没有婚姻” | `pattern` | 统一路由器不能因“有没有”误判为 `status/timing` |
| “我适合创业吗，现在能不能做” | `pattern + status` | `analysis_mode=pattern`，`secondary_mode=status` |
| “未来几年感情会怎样” | `timing` | 即使没有“什么时候”，也应 `needs_time_scan=true` |
| `time_scope.type=next_5_years` | timing | `resolveConcreteTimeScope` 用 `currentLiunian.year` 展开为实际 `start_year/end_year` |
| 候选年份跨大运 | timing | `resolveDayunForYear` 为每个年份匹配所属大运，边界年有 limitation |
| `deriveQuality` | timing | strong/medium/weak 由确定性表驱动，LLM 不自行定级 |
| “我今年老婆的状态怎么样” | `character + status` | 主模板 character，追加 Step 3 当前动态断语包 |
| `subcategory=partner_profile` 但 LLM 输出非 character | `character` | normalizer 修正 mode，confidence 降为 medium |
| “什么时候结婚” | `timing` | 遍历 `liunianList`，输出 `trigger_windows[]`，含 `scanned_years` |
| “未来五年哪年财运最好” | `timing` | 默认扫描 5 年，候选窗口按 `quality`、`activation_strength` 和可选 `rank_score` 排序 |
| “我今年婚姻怎么样” | `status` | 输出 `mode_analysis.current_climate/dayun_reading/liunian_reading/target_state_reading`；pipeline 字段（trigger_vigor/activation_strength/target_trigger）由组装层补充，不在 LLM 输出中；不输出 timing 专属 `trigger_windows` |
| Prompt 组装 | 所有动态模式 | 注入 LLM 的 Step 2/3 内容必须是 formatter 生成的自然语言断语包，不得裸露 raw `stateReport/dynamicReport` JSON |
| “我今年能结婚吗” | `status` | 可给倾向结论，但 `assessment_type=current_climate` |
| “我有没有婚姻格局” | `pattern` | 不运行 Step 3，不输出具体年份 |
| “我适合创业还是打工” | `pattern` | 输出 `domain_fit` 和 `structural_risks` |
| “我老婆是什么样的人” | `character` | 输出画像倾向，每个画像块有 confidence/evidence |
| 后端无 targetSpec 的 character 问题 | `character` | `target_resolution=llm_derived`，输出 `llm_derived_target` 和 limitations，不强行套后端规则 |
| `target_resolution=llm_derived` 且 secondary=status | `character` | 默认不运行 Step 3，除非 LLM-derived target 能映射到明确后端 targetSpec |
| `matrix.pillars` 缺失 | legacy | 不崩溃，返回旧模板 |
| timing 缺 `liunianList` | 降级 `status` | `meta.limitations` 说明未来流年不足 |
| `currentLiunian.year` 缺失 | fallback | `resolveConcreteTimeScope` 使用服务器年份，并写入 limitation |
| 指定年龄区间但缺出生年 | clarify | 无法从年龄换算年份，返回追问或降级 |
| 指定大运但 `dayunList` 无年份范围 | timing | `resolveDayunForYear.source=estimated/fallback_current`，confidence 降级 |
| `resolveTargetElement` fallback | 原 mode | `meta.target.fallback_level` 非 subcategory，confidence 不得 high |
| 无评分输出 | 所有 | `summary.score` 可为 `null`，但必须有 `level`、`assessment_type` 和 `basis` |
| 前端新版卡片 | 所有 | `score=null` 时不渲染百分比；按 `assessment_type` 切卡片结构 |
| 审计落库 | 所有 | route/raw report/prompt blocks/normalized output 可追踪，且不把完整 profile 落库 |

---

## 十五、实现优先级

| 优先级 | 任务 |
|--------|------|
| P0 | 抽出 `buildLegacyPrompt`，保证安全降级 |
| P0 | `ruleRouteHint`：规则预判，只产 hint；内部复用现有 `classifyByRules` |
| P0 | `classifyBaziSemanticRoute`：合并 category/subcategory/analysis_mode 的 LLM 语义路由 |
| P0 | `normalizeBaziSemanticRoute`：枚举校验、冲突修正、低置信追问（实现在 `baziQuestionCore.js`，不在路由层）|
| P0 | `extractBaziAnalysisParams`：profile → 入参提取 + 格式适配 |
| P0 | `status` Pipeline + `assembleStatusPrompt` |
| P0 | `formatStateReportForPrompt` / `formatDynamicReportForPrompt` 输出自然语言断语包，保留关键量化标签但不裸露 JSON |
| P0 | 统一 JSON envelope + `normalizeBaziQuestionOutput` 兼容 |
| P0 | 审计快照结构：记录 route、normalizer、pipeline、formatter、LLM output 的关键中间产物 |
| P1 | `pattern` Pipeline + `assemblePatternPrompt` |
| P1 | `character` Pipeline + `assembleCharacterPrompt` |
| P1 | `timing` 候选流年扫描器：`resolveConcreteTimeScope` / `resolveCandidateYears` / `resolveDayunForYear` / `rankTimingCandidate` / `deriveQuality` |
| P1 | 前端新版八字卡片：支持 status/timing/pattern/character 四类结构，移除八字概率化表达 |
| P2 | 更细的候选窗口排序规则，纳入大运切换、流月、用户指定年份区间；评分仍保持可选 |
| P2 | 数仓宽表/指标层：按 mode、fallback_level、target_resolution、latency、LLM 修复率做质量分析 |
| P2 | 单元测试 + 集成测试覆盖 |

建议先做 `status`，因为当前 Step 3 已经天然支持“当前大运 + 当前流年”。再做 `pattern/character`，最后做真正需要遍历未来流年的 `timing`。

### 15.1 当前执行进度（2026-05-17）

| 模块 | 状态 | 已落地内容 | 后续 |
|------|------|------------|------|
| `buildLegacyPrompt` 安全降级 | 已完成 | `buildBaziQuestionPrompt` 内部保留 legacy 路径；非八字新语义路线或分析入参不足时降级旧模板 | 后续接入线上调用链时继续保留 fallback 监控 |
| `ruleRouteHint` | 已完成 | 在 `divinationRouter.js` 中新增增强函数，复用 `classifyByRules`，只补充 `analysis_mode_hint/secondary_mode_hint/time_scope_hint/needs_time_scan_hint`，不替换原 branch/category/subcategory | 已作为上游 LLM semantic router 的输入 hint |
| `normalizeBaziSemanticRoute` | 已完成基础版 | 在 `baziQuestionCore.js` 中校验 mode、修正 `partner_profile → character`、补默认 time_scope，并支持 rule hint 与 LLM raw route 字段 | 后续补更严格的追问策略 |
| `extractBaziAnalysisParams` | 已完成基础版 | 从 profile 提取 matrix、日干、性别、出生年、当前大运流年、候选流年、大运列表、喜忌五行 | 后续补更多 profile 历史字段兼容 |
| `status` Pipeline + Prompt | 已完成基础版 | 跑 Step 1/2/3，注入目标元素、原局状态、当前大运流年动态评估；Prompt 明确不输出成功率 | 后续接入真实上游 LLM route 后继续校验输出稳定性 |
| Formatter 自然语言断语包 | 已完成基础版 | `formatStateReportForPrompt`、`formatDynamicReportForPrompt` 支持 options 扩展，将 pipeline 量化结果（vigor/activation/is_major_window 等）转为自然语言断语注入 Prompt 上下文（INPUT 侧），不裸露 raw JSON；LLM 输出侧不要求回显这些字段 | 后续按产品展示继续优化文案排序 |
| 统一 JSON envelope + output normalizer | 已完成基础版 | Prompt 注入统一 envelope；`normalizeBaziQuestionOutput` 兼容新版 `meta/chart_foundation/mode_analysis/dynamic_context` 与旧结构 | 后续和前端新版卡片字段一起收敛 |
| 审计快照结构 | 已完成基础版 | `buildBaziAuditSnapshot` 保存 route hint、semantic raw route、normalized route、time scope、analysis params snapshot、pipeline result、prompt blocks、LLM output 摘要；worker 已尝试写入 `bazi_question_audit`，失败只 warn 不阻断问答 | 后续接入 Supabase 实库验证 |
| `timing` 遍历工具 | 已完成基础版 | 已实现 `resolveConcreteTimeScope`、`resolveCandidateYears`、`resolveDayunForYear`、`deriveQuality`、`rankTimingCandidate`；`timing` Prompt 注入候选年份自然语言断语包 | 后续补更细的跨大运边界、流月候选、用户指定年龄区间 |
| `pattern` Pipeline + Assembler | 已完成基础版 | 已接入 Step 1/2 静态结构分析；`secondary_mode=status` 时追加当前大运流年 Step 3 断语包；Prompt 明确 pattern 只判断先天结构/容量/适配度，不做应期 | 后续补更细的 pattern mode_analysis 字段规范和前端卡片 |
| `character` Pipeline + Assembler | 已完成基础版 | 已接入 Step 1/2 人物倾向画像；`secondary_mode=status` 时追加当前动态状态；Prompt 要求画像必须有 evidence/confidence，不能写确定事实 | 后续补更多 character 专属 targetSpec 与前端卡片 |
| `llm_derived target` 安全路径 | 已完成基础版 | 当 `target_resolution=llm_derived` 时，不调用后端 Step 2/3；Prompt 注入模型自拟目标框架、观察范围和 limitations，并要求 `meta.target.fallback_level=llm_derived` | 后续继续扩充敏感/不可映射问题的 few-shot |
| 上游 LLM semantic router | 已完成基础版 | 新增 `buildBaziSemanticRoutePrompt`；worker `/api/bazi-question` 在生成解读 Prompt 前调用 `gemini-3-flash-preview` 产出 `analysis_mode/secondary_mode/time_scope/target_resolution/llm_derived_target`，失败时回落到 rule hint，并在 audit 中记录 raw/normalized route | 后续接入实流量观察 LLM 修复率和 fallback 率 |
| Supabase 报表 SQL | 已完成基础版 | 新增 `docs/sql/bazi-question-reporting.sql`，包含 flat 宽视图、daily report、route report、timing report；视图使用 `security_invoker=true`，默认 revoke anon/authenticated | 后续在 Supabase 实库执行并按 dashboard 需求决定是否 grant 内部只读角色 |
| 前端新版八字卡片 | 未完成 | 后端 Prompt 与 normalizer 先行 | 等四类 mode 输出稳定后实现 |

当前测试：

- `node --test lib/divinationRouter.test.js lib/baziQuestionCore.test.js src/workerBaziAudit.test.mjs` 通过，29 个链路测试通过。
- `npm test` 全量通过，256 个测试通过。

---

## 十六、结果卡片展示方案

### 16.1 整体布局

八字问答结果分为两个层：

```
┌───────────────────────────────────────┐
│  LLM 结果卡 (v-html 注入)             │
│  buildBaziQuestionCardHTML(data)       │
│  summary / basis / foundation /        │
│  mode_analysis / limitations / advice  │
└───────────────────────────────────────┘
┌───────────────────────────────────────┐
│  八字排盘背书板块（Vue 响应式）        │
│  BaziBackingPanel.vue                  │
│  四柱展示（带目标元素高亮）            │
│  大运轴 + 流年轴（带应期标注）         │
└───────────────────────────────────────┘
```

第一层已实现（`buildBaziQuestionCardHTML`）。第二层是本节设计目标。

两层分离的原因：`v-html` 注入块无法嵌入 Vue 响应式组件；响应式大运/流年轴必须用 Vue 模板构建。

### 16.2 架构决策：不引入 BaziEngine

BaziView.vue 的大运流年轴依赖 `BaziEngine` 排盘引擎运算，耦合重。`activeBaziProfile.bazi_detail.matrix` 已包含预计算数据：

- `matrix.pillars` → 四柱（含 gan/zhi/hidden_stems/is_kong）
- `matrix.dayun_list` → 大运列表（含 gan/zhi/start_age/start_year/end_year/shi_shen）
- `matrix.liunian_list` → 流年列表（含 year/gan/zhi/shi_shen）

**不复用 BaziEngine，从 matrix 直接读取**，新建轻量 `BaziBackingPanel.vue`。

### 16.3 新组件：`BaziBackingPanel.vue`

**文件**：`src/components/BaziBackingPanel.vue`

**Props**：

```js
props: {
  profile: Object,         // activeBaziProfile，含 bazi_detail.matrix
  resultData: Object,      // LLM 输出的 normalized 结果 (含 meta/mode_analysis)
  analysisMode: String,    // 'status' | 'timing' | 'pattern' | 'character' | 'llm_derived'
  selectedYear: Number,    // 外部传入当前选中流年（双向绑定）
}
```

**Emits**：`update:selectedYear`

**内部 state**：

```js
const localSelectedYear = ref(props.selectedYear)
const autoHighlightedYears = computed(() => {
  // 来自 mode_analysis.trigger_windows，所有候选年份
})
const bestYear = computed(() => {
  // trigger_windows 中 quality=strong 的第一个，或第一个
})
```

### 16.4 四柱展示（目标元素高亮）

**数据来源**：`profile.bazi_detail.matrix.pillars` + `resultData.meta.target`

**高亮规则**：

| 高亮类型 | 判断来源 | 视觉 |
|---------|---------|------|
| 目标宫位（如日支） | `meta.target.gongwei` 包含 `"日支"` → 高亮日柱整列 | 金色描边 + 背景发光 |
| 目标十神（在透干位置） | `chart_foundation.evidence[].label` 解析 "正财坐月干" → 高亮月柱天干 | 十神字符下红点标注 |
| 空亡 | `matrix.pillars[i].is_kong === true` | 半透明遮罩 + "空" 字 |
| 受冲宫位 | `chart_foundation.evidence` 含 "受冲" 且 `type=gongwei` | 橙色描边 |

`meta.target.gongwei` 到柱名映射：
```js
const GONGWEI_TO_PILLAR = {
  '年柱': '年', '月柱': '月', '日柱': '日', '时柱': '时',
  '日支': '日', '月支': '月', '时支': '时'
}
```

**Evidence label 解析**（用于十神高亮）：

```js
// "正财坐日支" → pillar=日, position=zhi, shishen=正财
// "七杀透月干" → pillar=月, position=gan, shishen=七杀
function parseEvidenceLabel(label) {
  const pillarMatch = label.match(/(年|月|日|时)(干|支)/)
  if (!pillarMatch) return null
  return { pillar: pillarMatch[1], position: pillarMatch[2] === '干' ? 'gan' : 'zhi' }
}
```

### 16.5 大运/流年轴（应期高亮）

**数据来源**：`matrix.dayun_list` + `matrix.liunian_list` + `mode_analysis.trigger_windows`

**流年轴标注**：

| 年份状态 | 判断 | 视觉 |
|---------|------|------|
| 最优应期 | `quality === 'strong'` | 金色描边 + `强` 徽章 |
| 次优应期 | `quality === 'medium'` | 蓝色描边 + `中` 徽章 |
| 弱应期 | `quality === 'weak'` | 灰色描边 + `弱` 徽章 |
| 当前选中 | `year === localSelectedYear` | 亮白背景 + 下划线 |
| 非应期年 | 无 | 默认样式 |
| 大运流年双引动 | `is_major_window === true` | 角标 `双` |

**机制摘要**：每个候选年的流年格子底部展示 `mechanisms[0]` 的机制类型（如"冲动"、"合动"、"开墓库"），截断到 4 字。

**大运轴标注**：大运格子中，若该大运包含任何 `trigger_windows` 的年份，显示 `⊙` 标记。若包含 `best` 年，整个大运格子有金色高亮。

**自动定位行为**：

```
timing 模式 → 自动选中 best_window 年，滚动到可视范围
status 模式 → 自动选中 current_liunian.year，不做高亮
pattern/character 模式 → 不显示应期标注，仅展示当前选中的大运流年作为背书参照
llm_derived 模式 → 降低显示优先级，组件折叠默认收起
```

### 16.6 HomeView.vue 改动点

**1. 新增响应式状态**

```js
const activeBaziResultData = ref(null)
const baziCardSelectedYear = ref(null)
```

**2. bazi question 结果处理扩展**

```js
// 在 resultHtml.value = buildCardHTML(data) 之后
if (data.branch === 'bazi' && data.meta?.analysis_mode) {
  activeBaziResultData.value = data
  // timing 模式：自动选中最强窗口年
  if (data.meta.analysis_mode === 'timing') {
    const windows = data.mode_analysis?.trigger_windows || []
    const best = windows.find(w => w.quality === 'strong') || windows[0]
    baziCardSelectedYear.value = best?.year ?? null
  } else {
    baziCardSelectedYear.value = activeBaziProfile.value
      ?.bazi_detail?.matrix?.current_liunian?.year ?? null
  }
}
```

**3. 模板结构调整**

```html
<!-- 现有 v-html 注入块（不改） -->
<div v-html="resultHtml" class="html-container"></div>

<!-- 新增：背书排盘板块，仅对八字新版结果展示 -->
<BaziBackingPanel
  v-if="activeBaziResultData && activeBaziProfile"
  :profile="activeBaziProfile"
  :result-data="activeBaziResultData"
  :analysis-mode="activeBaziResultData.meta?.analysis_mode"
  :selected-year="baziCardSelectedYear"
  @update:selected-year="baziCardSelectedYear = $event"
/>
```

**4. 导入新组件**

```js
import BaziBackingPanel from '@/components/BaziBackingPanel.vue'
```

**5. 结果重置时清空状态**

```js
// 新提问时
activeBaziResultData.value = null
baziCardSelectedYear.value = null
```

### 16.7 score=null 时的展示策略

当前 `bazi-level-chip` 固定金色，无强弱视觉差异，需补充：

```css
/* 在 BaziBackingPanel.vue 或 HomeView.vue :deep() 中 */
.bazi-level-chip.level-strong { border-color: rgba(78,205,196,0.4); color: #4ECDC4; }
.bazi-level-chip.level-medium { border-color: rgba(212,175,55,0.4); color: #D4AF37; }
.bazi-level-chip.level-weak   { border-color: rgba(255,154,86,0.4); color: #FF9A56; }
.bazi-level-chip.level-mixed  { border-color: rgba(167,139,250,0.4); color: #A78BFA; }
.bazi-level-chip.level-unknown{ border-color: rgba(255,255,255,0.12); color: var(--text-muted); }
```

同时在 `buildBaziQuestionCardHTML` 中，level chip 需带 level class：
```js
: `<div class="bazi-level-chip level-${summary.level || 'unknown'}">${levelLabel}</div>`
```

`quality-strong/medium/weak` CSS 也需补充（现已在 HTML 中引用但未定义）：
```css
:deep(.bazi-timing-window-card.quality-strong) { border-color: rgba(78,205,196,0.3); }
:deep(.bazi-timing-window-card.quality-medium) { border-color: rgba(212,175,55,0.25); }
:deep(.bazi-timing-window-card.quality-weak)   { border-color: rgba(255,255,255,0.08); }
```

### 16.8 各模式 mode_analysis 差异渲染补充

当前 `buildBaziQuestionCardHTML` 不区分 mode，`pattern/character` 专属字段丢失。需要按 mode 分支：

**`pattern` mode** 新增区块（插入 foundationHTML 之后）：

```js
const patternHTML = meta.analysis_mode === 'pattern' && (mode.domain_fit || mode.capacity_level)
  ? `<section class="result-module bazi-mode-card reveal">
      <div class="ai-header-title">先天结构适配</div>
      <div class="bazi-capacity-row">
        <span class="capacity-label">容量</span>
        <span class="capacity-level level-${mode.capacity_level}">${baziLevelLabel(mode.capacity_level)}</span>
      </div>
      ${mode.domain_fit ? `<p class="bazi-card-copy">${mode.domain_fit}</p>` : ''}
      ${buildTextListHTML(mode.structural_supports || [], 'bazi-signal-list positive')}
      ${buildTextListHTML(mode.structural_risks || [], 'bazi-signal-list warning')}
      ${mode.innate_ceiling ? `<p class="bazi-logic">${mode.innate_ceiling}</p>` : ''}
    </section>`
  : ''
```

**`character` mode** 新增区块：

```js
const characterHTML = meta.analysis_mode === 'character' && mode.character_portrait
  ? `<section class="result-module bazi-mode-card reveal">
      <div class="ai-header-title">人物倾向画像</div>
      ${buildPortraitBlockHTML(mode.appearance_tendency, '外貌气质')}
      ${buildPortraitBlockHTML(mode.personality_tendency, '性格倾向')}
      ${buildPortraitBlockHTML(mode.career_style, '行事风格')}
      ${mode.relationship_dynamic ? `<div class="bazi-logic">${mode.relationship_dynamic}</div>` : ''}
      ${mode.do_not_overclaim ? `<div class="bazi-disclaimer">${mode.do_not_overclaim}</div>` : ''}
    </section>`
  : ''

function buildPortraitBlockHTML(block, label) {
  if (!block?.text) return ''
  return `<div class="bazi-portrait-block confidence-${block.confidence || 'low'}">
    <div class="portrait-label">${label}<span class="confidence-badge">${block.confidence || 'low'}</span></div>
    <p>${block.text}</p>
    ${buildTextListHTML(block.evidence || [], 'bazi-evidence-list')}
  </div>`
}
```

**`timing` mode** trigger_windows 扩展：在每个 window card 内补充 verdict 和 mechanisms_text：

> **注意**：`quality`、`is_major_window` 来自组装层（pipeline 计算后合并），可用于渲染友好标签；
> 不直接展示 `activation_strength`（原始数值）、`target_trigger`（内部字段路径）。
> `verdict`、`mechanisms_text`、`supporting_evidence`、`blocking_evidence` 均来自 LLM 输出。

```js
${windows.map(item => `<div class="bazi-timing-window-card quality-${item.quality || 'weak'}">
  <div class="bazi-window-top">
    <strong>${item.ganzhi ? `${item.year} ${item.ganzhi}` : item.year || '-'}</strong>
    <span class="quality-badge quality-${item.quality}">${baziLevelLabel(item.quality)}</span>
    ${item.is_major_window ? '<span class="major-window-badge">双引动</span>' : ''}
  </div>
  ${item.event_type ? `<p class="window-event">${item.event_type}</p>` : ''}
  <div class="bazi-window-meta">
    <span>大运 ${item.dayun_ganzhi || '-'}</span>
  </div>
  ${item.verdict ? `<p class="bazi-card-copy">${item.verdict}</p>` : ''}
  ${item.mechanisms_text ? `<div class="bazi-logic">${item.mechanisms_text}</div>` : ''}
  ${buildTextListHTML(item.supporting_evidence || [], 'bazi-signal-list positive')}
  ${buildTextListHTML(item.blocking_evidence || [], 'bazi-signal-list warning')}
</div>`).join('')}
```

同时在 timing mode 展示 `best_window` / `avoid_window` / `why_not_now`：

```js
const timingMeta = meta.analysis_mode === 'timing'
  ? `<div class="bazi-timing-meta">
      ${mode.best_window ? `<div class="timing-best">最优窗口：${mode.best_window}</div>` : ''}
      ${mode.avoid_window ? `<div class="timing-avoid">回避：${mode.avoid_window}</div>` : ''}
      ${mode.why_not_now ? `<div class="bazi-logic">${mode.why_not_now}</div>` : ''}
      <div class="timing-disclaimer">候选强度代表应期信号强弱，不是事件必然发生概率</div>
    </div>`
  : ''
```

### 16.9 新增 CSS 类（补充至 HomeView.vue :deep 区域）

```css
/* level chip 色系 */
:deep(.bazi-level-chip.level-strong) { color:#4ECDC4; border-color:rgba(78,205,196,0.35); }
:deep(.bazi-level-chip.level-medium) { color:#D4AF37; border-color:rgba(212,175,55,0.35); }
:deep(.bazi-level-chip.level-weak)   { color:#FF9A56; border-color:rgba(255,154,86,0.35); }
:deep(.bazi-level-chip.level-mixed)  { color:#A78BFA; border-color:rgba(167,139,250,0.35); }
:deep(.bazi-level-chip.level-unknown){ color:var(--text-muted); }

/* timing window quality */
:deep(.bazi-timing-window-card.quality-strong) { border-color:rgba(78,205,196,0.3); background:rgba(78,205,196,0.04); }
:deep(.bazi-timing-window-card.quality-medium) { border-color:rgba(212,175,55,0.25); }
:deep(.bazi-timing-window-card.quality-weak)   { border-color:rgba(255,255,255,0.07); }
:deep(.major-window-badge) { font-size:10px; padding:2px 6px; border-radius:6px; background:rgba(212,175,55,0.15); color:#D4AF37; }
:deep(.timing-disclaimer)  { font-size:11px; color:var(--text-muted); margin-top:8px; opacity:.7; }

/* pattern mode */
:deep(.bazi-capacity-row) { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
:deep(.capacity-label)    { font-size:11px; color:var(--text-muted); }
:deep(.capacity-level)    { font-size:14px; font-family:var(--font-serif); }

/* character portrait */
:deep(.bazi-portrait-block) { padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.07); background:rgba(0,0,0,0.1); margin-bottom:10px; }
:deep(.portrait-label)      { font-size:11px; color:var(--text-muted); margin-bottom:6px; display:flex; align-items:center; gap:6px; }
:deep(.confidence-badge)    { font-size:9px; padding:2px 5px; border-radius:4px; background:rgba(255,255,255,0.06); }
:deep(.bazi-disclaimer)     { font-size:11px; color:var(--text-muted); font-style:italic; margin-top:8px; line-height:1.6; }

/* BaziBackingPanel（定义在组件内 scoped）*/
/* 参照 BaziView .link-item / .dy-item / .ln-item 样式 */
```

### 16.10 BaziBackingPanel 目标元素高亮 CSS

```css
/* 在 BaziBackingPanel.vue scoped */
.pillar-cell.is-target-palace {
  border: 1px solid rgba(212,175,55,0.5);
  box-shadow: 0 0 12px rgba(212,175,55,0.2);
  border-radius: 8px;
}
.char-gan.is-target-star,
.char-zhi.is-target-star {
  position: relative;
}
.char-gan.is-target-star::after {
  content: '';
  position: absolute;
  bottom: -3px; left: 50%; transform: translateX(-50%);
  width: 4px; height: 4px;
  border-radius: 50%;
  background: var(--gold);
}
.target-star-badge {
  position: absolute;
  top: -8px; right: -6px;
  font-size: 9px; padding: 1px 4px;
  border-radius: 4px;
  background: rgba(212,175,55,0.2);
  color: var(--gold);
}
/* timing 候选年 */
.ln-item.timing-candidate  { border-color: rgba(212,175,55,0.35); }
.ln-item.best-window       { border-color: rgba(78,205,196,0.5); box-shadow: 0 0 8px rgba(78,205,196,0.15); }
.ln-item.is-target-trigger .timing-mech-tag {
  display: block;
  font-size: 9px; color: var(--text-muted);
  margin-top: 4px; overflow: hidden;
  white-space: nowrap; text-overflow: ellipsis;
}
/* 大运含应期标记 */
.dy-item.timing-window::after {
  content: '⊙';
  position: absolute; top: 4px; right: 4px;
  font-size: 8px; color: var(--gold); opacity: .6;
}
.dy-item.best-window { border-color: rgba(212,175,55,0.4); }
```

### 16.11 测试要求

| 测试场景 | 验证点 |
|---------|--------|
| timing 模式结果 | `BaziBackingPanel` 渲染，`best_window` 年自动选中，`baziCardSelectedYear` 等于最强窗口年 |
| status 模式结果 | `BaziBackingPanel` 渲染，`selectedYear` 等于 `current_liunian.year` |
| pattern/character 模式 | `BaziBackingPanel` 渲染，无应期高亮，无 quality badge |
| 目标宫位高亮 | `meta.target.gongwei = ["日支"]` 时，日柱有 `is-target-palace` class |
| 目标十神高亮 | `chart_foundation.evidence[].label = "正财坐月干"` 时，月柱天干有 `is-target-star` class |
| `score=null` | level chip 有 `level-${level}` class；无圆环分数动画 |
| `quality-strong/medium/weak` | timing window 卡有对应边框色 |
| `is_major_window=true` | 流年格和 window card 有 `major-window-badge` |
| profile 为空 | `BaziBackingPanel` 不渲染；`v-if` 守护 |
| llm_derived 模式 | `BaziBackingPanel` 折叠默认收起，显示折叠按钮 |

### 16.12 与 15.1 进度表的关系

前端新版八字卡片的实现分两步：

1. **P1（已有基础，需补齐）**：`buildBaziQuestionCardHTML` 补充 pattern/character 专属区块 + timing window 详情 + level chip 色系 CSS（见 16.8/16.9 节）
2. **P1（本节新增）**：`BaziBackingPanel.vue` 新组件 + HomeView 响应式状态接入（见 16.3-16.6 节）

---

## 十七、Few-shot 输出模板

### 背景

LLM 收到结构化 Prompt 后，输出质量在以下维度容易偏弱：
- `chart_foundation.evidence` 只写标签不写细节；
- `mode_analysis` 中的 `verdict`、`domain_state` 流于泛泛；
- `advice.strategy` 没有针对命局具体依据，只是通用套话；
- `summary.basis` 的 positive/negative signals 不对应任何干支或机制。

以下 few-shot 以 **12.1 status 示例（女命癸酉日，今年能不能结婚）** 为基础，给出一个覆盖全字段、表达丰富的模型输出范本，供注入 Prompt 时作为格式示范。

---

### 17.1 Few-shot：status 模式完整输出示例

**场景**：女命，八字甲子 丁卯 癸酉 辛酉，日主癸水偏弱，喜用金水、忌火土。当前大运庚申，当前流年丙午。用户问：我今年能不能结婚？

**期望模型输出**：

```json
{
  "meta": {
    "analysis_mode": "status",
    "secondary_mode": null,
    "branch": "bazi",
    "category": "relationship",
    "subcategory": "relationship_timing",
    "target": {
      "shishen": ["正官", "七杀"],
      "gongwei": ["日支"],
      "fallback_level": "subcategory",
      "llm_derived_target": null
    },
    "confidence": "medium",
    "limitations": [
      "原局卯酉冲持续存在，流年未合稳夫妻宫，今年落定条件仍不充分",
      "丙午流年可引动议题但未能直接合稳夫妻宫，落定机制不足"
    ]
  },
  "summary": {
    "title": "2026 年婚恋推进窗口评估",
    "conclusion": "今年有明显推进信号，但落定条件尚不充分——大运扶起承接力，流年推动议题浮现，关系容易走到台面，却不宜押注今年必定登记。",
    "level": "medium",
    "assessment_type": "current_climate",
    "score": null,
    "score_label": "",
    "keyword": "大运建场有力，流年催动有余，合稳机制不足",
    "basis": {
      "positive_signals": [
        "庚申大运庚金为正官，夫星透干，大运本身与婚恋目标直接对应，建场效果明确",
        "申金与日支酉同气，大运有效扶起夫妻宫金气承接力，宏观气候支持婚恋推进",
        "系统断语显示大运引动有效且方向为顺，是此阶段婚恋最强的背景底盘",
        "丙午流年可引动关系议题浮出水面，官杀压力加大，有推进和浮现的动力"
      ],
      "negative_signals": [
        "原局卯酉六冲持续作用于夫妻宫，底盘不静，关系容易动荡而非稳定落定",
        "丙午为忌神（火），流年能催动议题但属逆向能量，容易引发纠结或压力而非顺畅推进",
        "系统断语确认流年未能直接合稳夫妻宫，缺少落定机制",
        "本年大运与流年未形成双重直接触发夫妻宫的强应期条件"
      ],
      "logic": "大运庚申扶起金气、建场有力，使今年婚恋议题确实处于活跃阶段；但流年丙午属忌神方向，能把话题推到台面却不能合稳夫妻宫，系统评为非强应期窗口，整体气候定性为推进窗口而非落定窗口，给 medium 级。"
    }
  },
  "chart_foundation": {
    "overall_stability": "dynamic",
    "base_state": "夫星有显但夫妻宫受冲，命局底盘呈动态——有婚恋机会，但关系不易自然稳定，必须等岁运合稳夫妻宫才能落定。",
    "capacity_level": "medium",
    "core_stars": ["正官", "七杀"],
    "core_palaces": ["日支"],
    "supports": [
      "七杀丁火透月干，夫星有显，命中有婚恋结构",
      "日支酉金为夫妻宫，金气有根，夫妻宫本身有力量",
      "时柱辛酉与日支同气，夫妻宫承接能力较好"
    ],
    "obstacles": [
      "月支卯与日支酉形成卯酉六冲，夫妻宫持续被冲动，关系稳定性存先天缺口",
      "日主癸水偏弱，七杀丁火无制时压力偏大，容易在关系中承压"
    ],
    "evidence": [
      {
        "source": "stateReport",
        "type": "shishen",
        "label": "七杀透月干",
        "detail": "丁火七杀透于月干，夫星有显，命局有婚恋承载结构；十二长生为冠带，原局力度中等（vigor 约 0.58）"
      },
      {
        "source": "stateReport",
        "type": "gongwei",
        "label": "日支酉受卯冲",
        "detail": "月支卯与日支酉六冲，夫妻宫持续受冲动，命局整体稳定性为动态；宫位受冲但未入墓、未空亡，说明有缘分但需岁运合稳"
      },
      {
        "source": "stateReport",
        "type": "gongwei",
        "label": "时柱辛酉扶日支",
        "detail": "时支辛酉与日支同气，金气重，夫妻宫有一定厚度，受冲后仍有承接能力"
      }
    ]
  },
  "dynamic_context": {
    "dayun_ganzhi": "庚申",
    "liunian_ganzhi": "丙午",
    "current_climate": "波动"
  },
  "mode_analysis": {
    "current_climate": "波动",
    "dayun_reading": "庚申大运是此阶段婚恋最重要的背景支撑。庚金正官即夫星，大运本身与婚恋目标直接对应；申金与日支酉同气，等于在宏观气候层面将夫妻宫的金气格调撑起来。系统评估大运对婚恋目标的引动有效，力量充分，方向顺。这步大运走完（约10年）是婚恋最有底盘的阶段，今年在此大运之内，底盘条件是充分的。",
    "liunian_reading": "丙午流年属忌神（火）方向，能催动官杀压力、把关系议题推到台前，但自身属火克金，无法提供合稳夫妻宫的直接机制。系统评估流年对夫妻宫目标元素未形成直接触发，更多扮演「把话题引出来」的角色——有推进动力，但缺落定机制。",
    "target_state_reading": "夫妻宫金气被大运扶起，原局冲动状态有所缓解；但流年未能合稳，整体处于推进有动象、稳定不到位的阶段。关系议题今年会浮出水面，但稳定落定需要等流年合稳夫妻宫的年份。",
    "event_type": "感情议题浮现",
    "domain_state": "今年婚恋处于活跃推进期，而非落定期。大运建场有力，流年催动有余，但夫妻宫合稳条件尚缺，关系容易走到台面、有明确进展，却不宜押注今年必定登记或宣布。",
    "near_term_trend": "上半年丙午流年的火能量偏旺，感情方面压力较大，容易出现催促感或关系走向的纠结；秋后金气渐复，氛围相对好转，是实质推进的较好窗口。",
    "opportunities": [
      "大运庚申金气扶夫妻宫，今年推进婚恋有底盘支撑，表白、确定关系、进入稳定期都有条件",
      "关系议题今年容易浮出水面，是推进沟通、明确双方意向的窗口",
      "若对方命局能合稳己方夫妻宫（如对方有子水或辰土化解卯酉冲），今年有落定机会"
    ],
    "pressure_points": [
      "丙午忌神当令，婚恋过程容易伴随压力、急迫感或双方节奏不同步",
      "原局卯酉冲未解，即使有进展，关系也容易在稳定之后出现反复或距离感",
      "今年大运与流年未形成双重直接触发夫妻宫的条件，属推进窗口而非强应期，不宜过度押注时机"
    ]
  },
  "advice": {
    "strategy": [
      "今年适合推进到「确定关系、明确意向」阶段——大运底盘有力，推进有支撑；但不要把「今年必须登记」作为心理预期，避免因急迫造成额外压力",
      "留意秋季（金气旺月，酉戌月份），大运金气与流月同向，是今年最适合推进实质谈婚论嫁的时间窗口",
      "若关系目前处于纠结或摩擦阶段，对照一下原局卯酉冲——这是底盘问题而非今年特有问题，不要因为今年有压力就否定整段感情"
    ],
    "risk": "丙午忌神当令，感情推进中容易有「催促—对抗」的互动模式，或因外部压力（家人、年龄焦虑）导致情绪化决定。今年做的决定要基于双方关系实际状态，不要单靠时间节点倒逼。",
    "avoid": [
      "避免因今年「感情活跃」误判为必然的落定年，把结婚登记当成今年必须达成的 KPI",
      "避免在火旺月份（午月6月、巳月5月）做重大感情决策，容易冲动后悔"
    ],
    "timing": [
      "最佳推进窗口：酉月（9月）前后，大运庚申与流月同气，夫妻宫金气最旺",
      "次优窗口：申月（8月），申金与大运同字，扶身效果好，利于稳定关系方向",
      "回避窗口：午月（6月）火旺极，原局金水受克最重，不宜做重大情感决定"
    ],
    "leverage": "金水方向是喜用神。日常可多走北方（水）和西方（金）；行业上与金融、珠宝、法律、音乐相关的社交圈更容易遇到命局金气较旺、能稳住夫妻宫的对象。"
  }
}
```

---

### 17.2 Few-shot 注入方式

将上述 JSON 作为 few-shot 追加到 Prompt 的【推演任务】之前：

```text
【Few-shot 参考输出】
以下是一个结构完整的 status 模式输出示例，用于说明字段填充深度和表达风格。
你的输出必须参照此格式，但内容完全基于本次命局数据，不得照搬文字：

{参见 17.1 节 JSON}

【推演任务】
...（正式任务）
```

### 17.3 Few-shot 有效性原则

| 原则 | 说明 |
|------|------|
| **字段完整度** | few-shot 中所有字段都有实质内容，尤其是 `evidence`、`pressure_points`、`timing`，让模型理解"完整"的标准 |
| **叙述质量示范** | `dayun_reading`、`liunian_reading`、`target_state_reading` 都有实质段落；pipeline 的量化结论（引动有效/无效、双重引动/单一）以自然语言表达，不回显字段名和原始数值 |
| **结论与依据绑定** | `summary.basis` 的每条 signal 都引用了具体干支或机制，而不是"整体不错"这类泛语 |
| **负面信号不回避** | `negative_signals` 和 `pressure_points` 数量不少于 positive，且不是敷衍的"可能有阻力" |
| **advice 有命局锚点** | `strategy` 和 `timing` 中的建议引用了具体干支时间（酉月、午月），不是通用建议 |
| **不伪造应期** | `score=null`，结论明确写"不宜押注今年必定登记"——示范如何给出有温度但不夸大的判断；pipeline 对当前年的评级（推进窗口 vs 强应期）必须如实转述，不美化 |
| **数据层边界** | few-shot 中不出现 `trigger_vigor`、`activation_strength`、`activates_target`、`is_major_window`、`vigor_check.*`、`effective_strength` 等 pipeline 内部字段；这些字段的语义通过自然语言断言体现（如"大运引动有效"、"非强应期窗口"），用户侧和模型输出侧都不直接看到字段名 |
