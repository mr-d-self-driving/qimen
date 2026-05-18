# Bazi LLM Schema Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 收敛八字问答 LLM 输出字段，减少语义重复，让判断依据、原局底盘、当前状态、应期、先天结构都以更少字段输出更长、更贴合命主主题的解释。

**Architecture:** 后端 `lib/baziQuestionCore.js` 继续负责 pipeline 预计算、prompt 组装和 normalized 输出；LLM 只负责把后端候选和断语包翻译、筛选、组织成用户可读文本。前端 `src/views/HomeView.vue` 只展示收敛后的字段，并用固定模块标题承载「支撑」「阻力」「依据」等解释，不再要求 LLM 为同一语义生成多组近义字段。

**Tech Stack:** Node.js `node:test`、Vue 3、Vite、现有八字 rule/pipeline、现有 `BaziBackingPanel`。

---

## 1. 当前语义重复复盘

### 1.1 全局 summary 与判断依据

当前字段：

- `summary.conclusion`
- `summary.keyword`
- `summary.basis.logic`
- `summary.basis.interaction_summary`
- `summary.basis.positive_signals`
- `summary.basis.negative_signals`

问题：

- `interaction_summary` 与 `logic` 都在做「依据总结」，新增字段反而增加了前端判断分支。
- `logic` 现在容易被模型写成一句很短的归纳，没有基于正向/逆向标签展开，也不一定贴合用户问题主题。
- `positive_signals` / `negative_signals` 是标签型证据，适合短标签展示；`logic` 应承担「把这些标签串成一段判断报告」的职责。

收敛方向：

- 删除 `summary.basis.interaction_summary`。
- 保留 `summary.basis.logic`，并强约束为 80-160 字判断依据报告。
- `logic` 必须点名命主主题，例如事业、感情、财运、健康、学业。
- `logic` 必须综合 `positive_signals` 与 `negative_signals`，不能只复述单边标签。

### 1.2 原局底盘

当前字段：

- `chart_foundation.base_state`
- `chart_foundation.supports`
- `chart_foundation.obstacles`
- `chart_foundation.evidence`
- `chart_foundation.overall_stability`
- `chart_foundation.capacity_level`
- `chart_foundation.core_stars`
- `chart_foundation.core_palaces`

问题：

- `base_state` 作为 summary 过短，无法承担原局断语。
- `supports` / `obstacles` / `evidence` 在前端平铺成标签，用户不知道哪些是支撑，哪些是阻力，哪些是依据。
- `capacity_level` 与 pattern 模式里的容量判断容易重复。

收敛方向：

- 保留 `base_state`，强约束为 80-160 字原局底盘断语。
- 保留 `supports` / `obstacles` / `evidence` 三组数组，但前端按固定分组展示：
  - `supports` 标题为「支撑」
  - `obstacles` 标题为「阻力」
  - `evidence` 标题为「依据」
- 不新增 `support_explanation`、`obstacle_explanation` 等字段，避免字段膨胀。
- `capacity_level` 仅用于 badge 或内部兼容；用户主要读 `base_state`。

### 1.3 dynamic_context 与 status mode_analysis

当前字段：

- `dynamic_context.current_climate`
- `mode_analysis.current_climate`
- `mode_analysis.dayun_reading`
- `mode_analysis.liunian_reading`
- `mode_analysis.target_state_reading`
- `mode_analysis.event_type`
- `mode_analysis.domain_state`
- `mode_analysis.near_term_trend`
- `mode_analysis.opportunities`
- `mode_analysis.pressure_points`

问题：

- `dynamic_context.current_climate` 与 `mode_analysis.current_climate` 语义重复。
- `event_type`、`near_term_trend`、`opportunities`、`pressure_points` 很容易让模型自行推理，且与 `summary.basis.positive_signals` / `negative_signals` 重叠。
- `dayun_reading`、`liunian_reading`、`target_state_reading` 才是 status 模式真正需要的三段结构化解释。

收敛方向：

- 所有模式下 `dynamic_context` 改为 `null`，不要求 LLM 输出。
- status 模式只保留：
  - `dayun_reading`
  - `liunian_reading`
  - `target_state_reading`
- 删除 status schema 中的：
  - `current_climate`
  - `event_type`
  - `domain_state`
  - `near_term_trend`
  - `opportunities`
  - `pressure_points`
- 三个 reading 字段各写 80-140 字，必须引用系统断语中的大运、流年或目标元素机制。

### 1.4 timing 模式

当前字段：

- 后端 `pipelineResult.timingCandidates`
- LLM `mode_analysis.trigger_windows`
- normalized `mode_analysis.trigger_windows`
- `mode_analysis.best_window`
- `mode_analysis.avoid_window`
- `mode_analysis.post_event_outlook`
- `mode_analysis.why_not_now`

问题：

- 当前 normalized 会遍历后端 `timingCandidates`，即使 LLM 没有选中某个窗口，前端仍可能展示。
- 这违反了「后端给候选，LLM 翻译和筛选，前端只展示 LLM 筛选结果」的产品逻辑。
- `why_not_now` 与 `avoid_window`、窗口 `blocking_evidence` 重叠。
- `post_event_outlook` 对应期扫描不是必需字段，容易扩写成未经扫描的后续预测。

收敛方向：

- 后端继续把所有候选窗口及指标喂给 LLM。
- LLM 输出 `trigger_windows` 时即完成筛选。
- normalized 只保留 LLM 输出的 `trigger_windows`，并按 `year` 回填后端计算的 `quality`、`is_major_window`、`dayun_ganzhi`、pipeline 内部元数据。
- LLM 未输出的后端候选不展示。
- LLM 输出了后端不存在的年份时丢弃，并写入 `meta.limitations`。
- 删除：
  - `why_not_now`
  - `post_event_outlook`

### 1.5 pattern 模式

当前字段：

- `mode_analysis.capacity_level`
- `mode_analysis.domain_fit`
- `mode_analysis.innate_ceiling`
- `mode_analysis.core_stars`
- `mode_analysis.structural_supports`
- `mode_analysis.structural_risks`
- `mode_analysis.verdict`
- prompt 中提到 `suitable_forms`，schema 中没有该字段。

问题：

- `domain_fit`、`innate_ceiling`、`verdict` 都在讲先天适配和容量，用户看到会像三段相似解释。
- prompt 要求 `suitable_forms`，但 schema 没有，模型容易输出额外字段。
- `core_stars` 与 `chart_foundation.core_stars` 重复。

收敛方向：

- pattern 模式只保留：
  - `capacity_level`
  - `verdict`
  - `structural_supports`
  - `structural_risks`
  - `current_status_note`，仅在 `secondary_mode=status` 时允许
- 删除：
  - `domain_fit`
  - `innate_ceiling`
  - `core_stars`
  - prompt 中的 `suitable_forms`
- `verdict` 写成 120-220 字完整段落，综合先天适配、容量上限、优势、风险。

---

## 2. 修改后的 LLM 字段枚举

### 2.1 所有 mode 共享 envelope

```json
{
  "meta": {
    "analysis_mode": "status|timing|pattern|character|unsupported",
    "secondary_mode": "status|null",
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

字段质量约束：

- `summary.basis.logic`：80-160 字，基于正向和逆向标签生成贴合用户主题的判断依据报告。
- `chart_foundation.base_state`：80-160 字，说明原局底盘对当前问题的先天支撑与限制。
- `advice.strategy`：2-3 条行动建议。
- `advice.risk`、`advice.avoid`、`advice.timing`、`advice.leverage` 可以为空，但一旦输出必须能对应前文依据。

### 2.2 status mode

```json
{
  "mode_analysis": {
    "dayun_reading": "",
    "liunian_reading": "",
    "target_state_reading": ""
  }
}
```

字段质量约束：

- `dayun_reading`：80-140 字，解释当前大运如何建场、承接或压制该主题。
- `liunian_reading`：80-140 字，解释当前流年是否触发、放大、缓解或反向催动该主题。
- `target_state_reading`：80-140 字，解释目标十神/宫位当前状态变化。
- 不输出 `opportunities`、`pressure_points`、`event_type`、`near_term_trend`、`current_climate`。

### 2.3 timing mode

```json
{
  "mode_analysis": {
    "scanned_years": [],
    "best_window": "",
    "avoid_window": "",
    "trigger_windows": [
      {
        "year": 2028,
        "ganzhi": "戊申",
        "dayun_ganzhi": "",
        "verdict": "",
        "mechanisms_text": "",
        "supporting_evidence": [],
        "blocking_evidence": []
      }
    ]
  }
}
```

字段质量约束：

- `trigger_windows` 只允许来自后端候选年份断语包。
- LLM 可以过滤后端候选；被过滤年份不进入 normalized 输出。
- `verdict`：70-130 字，说明为什么该年值得展示。
- `mechanisms_text`：40-90 字，用用户可读语言说明核心触发机制。
- 删除 `why_not_now`、`post_event_outlook`。

Normalized 后附加字段：

```json
{
  "quality": "strong|medium|weak",
  "is_major_window": true,
  "_pipeline": {}
}
```

这些字段由后端按 LLM 选中的年份回填，不要求 LLM 输出。

### 2.4 pattern mode

```json
{
  "mode_analysis": {
    "capacity_level": "strong|medium|weak|unknown",
    "verdict": "",
    "structural_supports": [],
    "structural_risks": [],
    "current_status_note": ""
  }
}
```

字段质量约束：

- `verdict`：120-220 字，统一承载先天适配、容量、优势、风险，不再分拆成 `domain_fit` 与 `innate_ceiling`。
- `current_status_note` 仅在 `secondary_mode=status` 时输出；否则为空或不展示。
- 删除 `domain_fit`、`innate_ceiling`、`core_stars`、`suitable_forms`。

### 2.5 character mode

```json
{
  "mode_analysis": {
    "portrait_subject": "spouse|partner|boss|child|other",
    "target_resolution": "backend_mapped|llm_derived",
    "llm_derived_target_note": "",
    "appearance_tendency": { "text": "", "confidence": "high|medium|low", "evidence": [] },
    "personality_tendency": { "text": "", "confidence": "high|medium|low", "evidence": [] },
    "career_style": { "text": "", "confidence": "high|medium|low", "evidence": [] },
    "relationship_dynamic": "",
    "do_not_overclaim": ""
  }
}
```

本轮反馈未要求 character 收敛，暂保持现有结构。后续如果要进一步减少字段，可把三类 tendency 合并为 `portrait_points` 数组。

---

## 3. 实施任务

### Task 1: 更新 schema 与 prompt 约束

**Files:**

- Modify: `qimen/lib/baziQuestionCore.js`
- Test: `qimen/lib/baziQuestionCore.test.js`

- [ ] **Step 1: 写失败测试，锁定 schema 收敛**

在 `qimen/lib/baziQuestionCore.test.js` 增加测试：

```js
test('unified bazi schema removes duplicated dynamic and pattern fields', () => {
  const prompt = buildBaziQuestionPrompt({
    profile,
    question: '今年事业状态怎么样',
    route: {
      branch: 'bazi',
      category: 'career_business',
      subcategory: 'career_status',
      analysis_mode: 'status'
    }
  }).prompt;

  assert.doesNotMatch(prompt, /interaction_summary/);
  assert.doesNotMatch(prompt, /"dynamic_context": \{"current_climate": ""\}/);
  assert.doesNotMatch(prompt, /"opportunities"/);
  assert.doesNotMatch(prompt, /"pressure_points"/);
  assert.doesNotMatch(prompt, /"near_term_trend"/);
  assert.match(prompt, /"dayun_reading"/);
  assert.match(prompt, /"liunian_reading"/);
  assert.match(prompt, /"target_state_reading"/);
  assert.match(prompt, /summary\.basis\.logic/);
});
```

Run:

```bash
node --test lib/baziQuestionCore.test.js
```

Expected: FAIL because current schema still contains duplicated fields.

- [ ] **Step 2: 修改 `buildUnifiedOutputSchemaBlock`**

在 `qimen/lib/baziQuestionCore.js` 中：

- 从 `summary.basis` 删除 `interaction_summary`
- 将 `dynamic_context` 固定为 `null`
- 保留 `summary.basis.logic`
- 在字段说明中要求 `logic` 写 80-160 字

- [ ] **Step 3: 修改 `buildModeAnalysisSchema('status')`**

替换 status schema 为：

```js
return `{
    "dayun_reading": "80-140字，说明当前大运如何建场、承接或压制本命题，必须引用系统断语",
    "liunian_reading": "80-140字，说明当前流年如何触发、放大、缓解或反向催动本命题，必须引用系统断语",
    "target_state_reading": "80-140字，说明目标十神/宫位当前状态和变化，必须引用系统断语"
  }`;
```

- [ ] **Step 4: 修改 `buildModeAnalysisSchema('timing')`**

删除 `post_event_outlook` 和 `why_not_now`：

```js
return `{
    "scanned_years": [],
    "trigger_windows": [
      {
        "year": 2028,
        "ganzhi": "戊申",
        "dayun_ganzhi": "",
        "verdict": "70-130字，说明该年为什么被筛选出来",
        "mechanisms_text": "40-90字，解释核心触发机制",
        "supporting_evidence": [],
        "blocking_evidence": []
      }
    ],
    "best_window": "",
    "avoid_window": ""
  }`;
```

- [ ] **Step 5: 修改 `buildModeAnalysisSchema('pattern')`**

替换 pattern schema 为：

```js
return `{
    "capacity_level": "strong|medium|weak|unknown",
    "verdict": "120-220字，综合先天适配、容量、优势与风险",
    "structural_supports": [],
    "structural_risks": []${secondaryMode === 'status' ? `,
    "current_status_note": "secondary=status 时用60-100字说明当前大运流年是否适合推进"` : ''}
  }`;
```

- [ ] **Step 6: 修改 prompt 任务文字**

在 `buildGroundingConstraintBlock` 和各 mode prompt 中：

- 把 `summary.basis.interaction_summary` 改为 `summary.basis.logic`
- 删除 `suitable_forms`
- 删除 `dynamic_context current_climate` 的任务要求
- 明确 `logic`、`base_state`、三段 reading 的字数和依据要求

- [ ] **Step 7: 运行测试**

```bash
node --test lib/baziQuestionCore.test.js
```

Expected: PASS。

### Task 2: 修改 timing normalize 逻辑

**Files:**

- Modify: `qimen/lib/baziQuestionCore.js`
- Test: `qimen/lib/baziQuestionCore.test.js`

- [ ] **Step 1: 写失败测试，锁定 LLM 筛选优先**

在 `qimen/lib/baziQuestionCore.test.js` 增加测试：

```js
test('timing normalization only keeps LLM selected candidate windows', () => {
  const pipelineResult = {
    timingCandidates: [
      { year: 2027, ganzhi: '丁未', dayun_ganzhi: '甲寅', quality: 'strong', is_major_window: true, event_type: '落定', supporting_evidence: ['双引动'], blocking_evidence: [], _pipeline: { rank_score: 88 } },
      { year: 2028, ganzhi: '戊申', dayun_ganzhi: '甲寅', quality: 'medium', is_major_window: false, event_type: '波动', supporting_evidence: ['单引动'], blocking_evidence: [], _pipeline: { rank_score: 61 } }
    ],
    scanned_years: [2027, 2028]
  };
  const output = normalizeBaziQuestionOutput({
    meta: { analysis_mode: 'timing', limitations: [] },
    summary: { basis: { positive_signals: [], negative_signals: [], logic: '2027年被模型选为主窗口。' } },
    mode_analysis: {
      trigger_windows: [
        { year: 2027, verdict: '2027年大运流年同时引动，适合作为重点窗口。', mechanisms_text: '大运和流年同时触发目标宫位。' }
      ]
    }
  }, { pipelineResult });

  assert.equal(output.mode_analysis.trigger_windows.length, 1);
  assert.equal(output.mode_analysis.trigger_windows[0].year, 2027);
  assert.equal(output.mode_analysis.trigger_windows[0].quality, 'strong');
});
```

Run:

```bash
node --test lib/baziQuestionCore.test.js
```

Expected: FAIL because current code keeps all pipeline candidates.

- [ ] **Step 2: 修改 timing normalize**

在 `normalizeBaziQuestionOutput` 的 timing 分支中：

- 以 `modeAnalysis.trigger_windows` 作为主列表
- 用 `year` 匹配 `pipelineResult.timingCandidates`
- 只返回匹配到 pipeline 的 LLM 窗口
- 把未匹配的 LLM 年份加入 `meta.limitations`
- 不把未被 LLM 选择的 pipeline candidates 注入前端

- [ ] **Step 3: 运行测试**

```bash
node --test lib/baziQuestionCore.test.js
```

Expected: PASS。

### Task 3: 更新前端展示

**Files:**

- Modify: `qimen/src/views/HomeView.vue`
- Test: `qimen/src/views/HomeView.domain-view.test.mjs`

- [ ] **Step 1: 写失败测试，锁定前端不再读取冗余字段**

在 `qimen/src/views/HomeView.domain-view.test.mjs` 增加测试：

```js
test('八字问答前端展示收敛后的 schema 字段', () => {
  assert.match(source, /summary\.basis\?\.logic/);
  assert.doesNotMatch(source, /interaction_summary/);
  assert.doesNotMatch(source, /mode\.why_not_now/);
  assert.doesNotMatch(source, /mode\.domain_fit/);
  assert.doesNotMatch(source, /mode\.innate_ceiling/);
  assert.doesNotMatch(source, /mode\.domain_state/);
  assert.match(source, /支撑/);
  assert.match(source, /阻力/);
  assert.match(source, /依据/);
});
```

Run:

```bash
node --test src/views/HomeView.domain-view.test.mjs
```

Expected: FAIL because current frontend still references redundant fields.

- [ ] **Step 2: 修改判断依据模块**

在 `buildBaziQuestionCardHTML`：

- 删除 `interactionSummary`
- 将 `summary.basis.logic` 作为判断依据主段落
- `positive_signals` / `negative_signals` 继续作为短标签

- [ ] **Step 3: 修改原局底盘模块**

把原局底盘展示改成固定分组：

```html
<div class="bazi-foundation-group">
  <div class="foundation-group-label">支撑</div>
  ...
</div>
<div class="bazi-foundation-group">
  <div class="foundation-group-label">阻力</div>
  ...
</div>
<div class="bazi-foundation-group">
  <div class="foundation-group-label">依据</div>
  ...
</div>
```

- [ ] **Step 4: 修改 status 展示**

只展示：

- `mode.dayun_reading`
- `mode.liunian_reading`
- `mode.target_state_reading`

删除 `domain_state` 展示逻辑。

- [ ] **Step 5: 修改 timing 展示**

删除：

- `mode.why_not_now`
- `mode.post_event_outlook`

只展示：

- `mode.best_window`
- `mode.avoid_window`
- `mode.trigger_windows`

- [ ] **Step 6: 修改 pattern 展示**

只展示：

- `mode.capacity_level`
- `mode.verdict`
- `mode.structural_supports`
- `mode.structural_risks`
- `mode.current_status_note`

删除：

- `mode.domain_fit`
- `mode.innate_ceiling`

- [ ] **Step 7: 运行测试**

```bash
node --test src/views/HomeView.domain-view.test.mjs
```

Expected: PASS。

### Task 4: 回归测试与构建

**Files:**

- Verify only

- [ ] **Step 1: 运行八字问答相关测试**

```bash
node --test lib/baziQuestionCore.test.js src/views/HomeView.domain-view.test.mjs
```

Expected: PASS。

- [ ] **Step 2: 运行完整测试**

```bash
npm test
```

Expected: PASS，0 fail。

- [ ] **Step 3: 运行构建**

```bash
npm run build
```

Expected: exit 0。允许现有 Vite CJS deprecation 与 chunk size warning。

- [ ] **Step 4: 浏览器冒烟**

```bash
npm run dev -- --host 127.0.0.1
```

用 Playwright 打开：

```bash
node -e "const { chromium } = require('playwright'); (async () => { const browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); }); await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' }); const text = await page.locator('body').innerText({ timeout: 5000 }); console.log(JSON.stringify({ hasApp: text.length > 0, errors }, null, 2)); await browser.close(); if (errors.length) process.exit(1); })().catch(err => { console.error(err); process.exit(1); });"
```

Expected:

```json
{
  "hasApp": true,
  "errors": []
}
```

---

## 4. Acceptance Criteria

- `summary.basis.logic` 成为判断依据唯一长文本总结字段。
- `chart_foundation.base_state` 成为原局底盘唯一长文本总结字段。
- 前端原局底盘标签按「支撑」「阻力」「依据」分组展示。
- 所有 mode 的 `dynamic_context` 为 `null`。
- status 模式只展示三段 reading。
- timing 模式只展示 LLM 筛选后的窗口，后端未被 LLM 选中的候选不进入前端。
- timing 模式不再输出或展示 `why_not_now`、`post_event_outlook`。
- pattern 模式以 `verdict` 为唯一长段落，不再输出或展示 `domain_fit`、`innate_ceiling`、`suitable_forms`。
- 完整测试与构建通过。

---

## 5. Self Review

- Spec coverage: 用户 6 条反馈均映射到第 1-4 节与 Task 1-4。
- Placeholder scan: 文档没有使用 TBD、TODO、implement later。
- Type consistency: 字段枚举与任务中的测试字段一致，均使用 `summary.basis.logic`、`chart_foundation.base_state`、`mode_analysis.*`。
