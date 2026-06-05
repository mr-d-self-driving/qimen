# Bazi Report Reading Order Implementation Plan

> **For agentic workers:** Execute this plan inline, one checkpoint at a time. After every checkpoint, stop for user Preview approval before continuing.

**Goal:** Reorganize every Bazi question report mode into a clear reading sequence, restore missing four-pillar data, remove duplicated content, and align the rendered report with the normalized v2 LLM output.

**Architecture:** Keep the existing normalized v2 output contract and Vue Teleport panel components. Change the `HomeView.vue` presentation mapping so each field has one clear display owner. Use shared report-section render helpers for consistent layout, while preserving mode-specific content for `status`, `timing`, `pattern`, `character`, and `profile_driven`.

**Tech Stack:** Vue 3, dynamic HTML report builder in `HomeView.vue`, existing `BaziStaticPanel` / `BaziDynamicPanel`, Node test runner, Vite Preview, Playwright/browser visual QA.

---

## Working Rules

- Do not modify more than one checkpoint before user approval.
- At each checkpoint:
  1. Write or update the focused regression test.
  2. Run the focused test and build.
  3. Reload `http://localhost:5178/`.
  4. Show the visible result or screenshot.
  5. Stop and ask for confirmation.
- Do not change the LLM schema unless the existing v2 output cannot represent the required UI.
- Preserve unrelated local changes in `vite.config.js`, worker audit files, and untracked tooling folders.

## Target Reading Order

1. Hero conclusion
2. 结论先行
3. 命局解读
4. 推演解读
5. 时间节奏, only when useful
6. 行动建议

---

### Checkpoint 1: Restore Four Pillars And Move Panels First

**User-visible result:** Under the `命局解读` heading, the static/dynamic panel appears first and the static panel includes the four pillars.

**Files:**
- Modify: `src/views/HomeView.vue`
- Test: `src/views/HomeView.domain-view.test.mjs`

- [ ] Add a regression assertion that the `bazi-panel-anchor` occurs immediately after the `命局解读` heading.
- [ ] Add a regression assertion that missing panel matrix data is fetched even when `state_report` already exists.
- [ ] Split panel hydration conditions:
  - Recalculate panel analysis only when `state_report` is missing.
  - Fetch profile `bazi_detail.matrix.pillars` whenever `baziPanelMatrix` is missing.
- [ ] Normalize fetched `hidden_stems` and store them in `_panel_matrix`.
- [ ] Move `#bazi-panel-anchor` to the first content position under the `命局解读` heading.
- [ ] Run:

```bash
node --test src/views/HomeView.domain-view.test.mjs
npm run build
```

- [ ] Preview the existing production-audit example and stop for approval.

**Approval question:** Are the four pillars present, and are the static/dynamic panels correctly placed directly below `命局解读`?

---

### Checkpoint 2: Remove Duplicate Conclusion

**User-visible result:** `summary.conclusion` appears only in the hero. `结论先行` contains the user question and `summary.basis`, without repeating the hero conclusion.

**Files:**
- Modify: `src/views/HomeView.vue`
- Test: `src/views/HomeView.domain-view.test.mjs`

- [ ] Add a regression assertion that `m1HTML` does not render `bazi-verdict-body`.
- [ ] Remove the duplicated `verdict` paragraph from `结论先行`.
- [ ] Keep `summary.basis` as the explanatory paragraph.
- [ ] Remove now-unused duplicate-conclusion styling if no other renderer uses it.
- [ ] Run focused test and build.
- [ ] Reload Preview and stop for approval.

**Approval question:** Does the opening now read cleanly without repeating the conclusion?

---

### Checkpoint 3: Rebuild 命局解读 Content Order

**User-visible result:** After the panel, `命局解读` shows concise phenomena, then a clearly labeled `用神状态`, then the base-foundation explanation.

**Files:**
- Modify: `src/views/HomeView.vue`
- Test: `src/views/HomeView.domain-view.test.mjs`

- [ ] Add a display helper that reduces a signal string to the text before the first Chinese or ASCII colon.

```js
const baziPhenomenonLabel = value =>
  String(value || '').split(/[：:]/, 1)[0].trim()
```

- [ ] Render `readings.base_foundation.signals` as concise phenomenon labels immediately after the panel.
- [ ] Do not render `key_signals` inside `命局解读`; they mix original chart, dayun, and liunian layers.
- [ ] Add a visible `用神状态` subtitle.
- [ ] Render `readings.target_state` under `用神状态`, preserving each item title and short explanation.
- [ ] Add a visible `原局底盘` subtitle, followed by `base_foundation.text`.
- [ ] Ensure target-state items are no longer duplicated in `推演解读`.
- [ ] Run focused test and build.
- [ ] Reload Preview and stop for approval.

**Approval question:** Is the order `Panel → 命局现象 → 用神状态 → 原局底盘` understandable and concise?

---

### Checkpoint 4: Consolidate 推演解读 By Mode

**User-visible result:** Dynamic interpretation is no longer scattered. Each mode presents only the sections that logically belong to it.

**Files:**
- Modify: `src/views/HomeView.vue`
- Test: `src/views/HomeView.domain-view.test.mjs`

- [ ] Add shared vertical interpretation-row rendering modeled on the Qimen reference:
  - left: section title
  - right: optional short factor
  - below: readable paragraph
  - optional phenomenon rows
- [ ] Apply mode mapping:

| Mode | 推演解读 contents |
|---|---|
| `status` | 大运建场, 流年触发 |
| `profile_driven` | 大运建场, 流年触发, then path readings |
| `timing` | 大运建场 when available, then candidate flow-year windows |
| `pattern` | 先天格局, 结构支撑, 结构风险, optional 当前时机 |
| `character` | 外貌气质, 性格倾向, 行事风格, 关系动态 |

- [ ] Remove `target_state` from this section because it belongs to `命局解读`.
- [ ] Prevent `key_signals`, dynamic panel mechanisms, and LLM prose from repeating the same paragraph.
- [ ] Keep optional right-side factors absent when no meaningful value exists.
- [ ] Run focused test and build.
- [ ] Preview at least `status` plus one non-status fixture and stop for approval.

**Approval question:** Does `推演解读` now read as one coherent mode-specific narrative?

---

### Checkpoint 5: Simplify 时间节奏

**User-visible result:** `时间节奏` only appears when it adds information not already shown in `推演解读`.

**Files:**
- Modify: `src/views/HomeView.vue`
- Test: `src/views/HomeView.domain-view.test.mjs`

- [ ] Keep rhythm segments when they contain a distinct period strategy or key flow years.
- [ ] Avoid repeating the current dayun/liunian prose already displayed in `推演解读`.
- [ ] Preserve timing-mode candidate windows and best/worst-window context.
- [ ] Hide the tab when no meaningful rhythm content remains.
- [ ] Run focused test and build.
- [ ] Reload Preview and stop for approval.

**Approval question:** Is `时间节奏` now additive rather than repetitive?

---

### Checkpoint 6: Rebuild 行动建议 As Numbered Single-Column List

**User-visible result:** Action recommendations appear as a single vertical list with black circular `01`, `02`, `03` markers, without forced columns.

**Files:**
- Modify: `src/views/HomeView.vue`
- Test: `src/views/HomeView.domain-view.test.mjs`

- [ ] Render `action_guide.text` as a short introduction, without wrapping it in another inference card.
- [ ] Render `action_guide.items` through the existing `mag-action-list` / `mag-action-item` pattern.
- [ ] Format indices with `String(index + 1).padStart(2, '0')`.
- [ ] Convert v1 `do` / `avoid` fallback items into the same single numbered list.
- [ ] Remove the Bazi report's use of `guidance-grid`, `guidance-card`, and `guidance-kicker`.
- [ ] Run focused test and build.
- [ ] Reload Preview and stop for approval.

**Approval question:** Does the action section match the reference's single-column numbered rhythm?

---

### Checkpoint 7: Final Spacing And Typography Pass

**User-visible result:** The full report has consistent hierarchy, spacing, separators, and mobile readability.

**Files:**
- Modify: `src/views/HomeView.vue`
- Test: `src/views/HomeView.domain-view.test.mjs`

- [ ] Align section subtitles, panel margins, body widths, and separators.
- [ ] Ensure long text remains readable without card nesting.
- [ ] Verify desktop and mobile layouts.
- [ ] Verify tabs scroll to the correct section anchors.
- [ ] Run:

```bash
node --test src/views/HomeView.domain-view.test.mjs
node --test src/workerBaziAudit.test.mjs
npm run build
git diff --check
```

- [ ] Report unrelated existing full-suite failures separately.
- [ ] Show final desktop and mobile Preview screenshots and stop for final approval.

**Approval question:** Is the complete report hierarchy ready to keep?

---

## Mode Coverage Checklist

- `status`: panel, target state, dayun, liunian, rhythm, actions
- `timing`: panel, target state, candidate windows, rhythm, actions
- `pattern`: panel, target state, structural support/risk, optional current status, actions
- `character`: four pillars, portrait readings, relationship note, actions
- `profile_driven`: four pillars, low-confidence target state, dayun/liunian, path readings, rhythm, actions

## Out Of Scope

- Changing Supabase schema or audit storage
- Changing the Bazi calculation engine
- Redesigning the standalone Bazi profile page
- Rewriting the v2 LLM contract unless Preview exposes an unrecoverable missing field

---

## Appendix A: 非特定领域的「用神兜底」综合运势方案（基于陆致极原著）

> 适用分支：`profile_driven` 与 `target_resolution: llm_derived`——即问题没有明确目标十神的开放/综合型场景。
>
> 理论依据：陆致极《命运的求索——古代命理学研究》《八字命理动态分析》，并旁证《继善篇》《三命通会》《滴天髓》《穷通宝鉴》。

### A.0 问题与现状

当前 `buildProfileDrivenPrompt` / `buildLlmDerivedTargetPrompt` **完全绕过三步 pipeline**（`pipelineResult: null`）：没有 `targetSpec`、`state_report`、`dynamic_report`，把整副命盘丢给 LLM 自由推演。四柱面板退化为只剩牌面，动态触发面板不渲染，断语无结构化锚点。

这违背了陆致极体系断综合吉凶的**正法主轴**：综合运势不靠"找表面十神"，而靠**「用神是否得力、忌神是否被制」**，看岁运对用神是生扶还是破坏。原著铁律：

- 《继善篇》：**「用神不可损伤，日主最宜健旺」**
- 古诀：**「穷通寿夭，皆在用神一字定之」**
- 《三命通会》（陆致极引）：**「大运的喜忌要跟八字内的用神挂起钩来：对扶持用神者尽量帮助，对损用神者做出抑制」**
- 陆致极：**「命局特征是内因」「外因要通过内因发生作用」**（病药原理）

### A.1 方案总纲：把 LLM-driven 从「无锚自由推」升级为「用神锚定推」

无目标十神时，后端不应"什么都不算"，而应**以用神/忌神为目标元素**复用现有引擎，产出一套"用神综合运势底盘"，再交给 LLM 叙述。判断链路严格遵循原著三段：

```
静态定基（内因）        动态断应（外因）            综合裁定（应期）
取用神/忌神  ──▶  岁运对用神的生扶 vs 引动忌神  ──▶  吉凶档位 + 应期窗口
```

### A.2 Step 1 — 用神/忌神定位（直接复用命盘已算结果，不重算）

**用神/忌神在排盘阶段已经算好并存档**，运行时只需读取，不要重新"取用神"：

| 字段 | 内容 | 示例（林俊彦） |
|---|---|---|
| `favorable_gods` / `favorable_elements` | 用神 | `["正印"]` |
| `unfavorable_gods` / `unfavorable_elements` | 忌神 | `["偏财"]` |
| `bazi_detail.favorable_verdict` | 取用神依据（已含病药/扶抑逻辑） | "土势偏旺为病…日主身弱，需印比生扶" |

因此 `resolveBackendTargetSpec` 的 fallback 就是：当 semanticRoute 给不出问题十神（`llm_derived` / `profile_driven`）时，**把 `favorable_gods` 作为目标元素、`unfavorable_gods` 作为反向元素**构造 targetSpec，并把 `favorable_verdict` 作为取用依据注入 prompt。无需任何"择用神"分支逻辑。

**实现注意**：`favorable_gods` 存的是**十神**（如"正印"）而非五行。动态引动评估（A.4）需要五行口径时，要把用神十神展开为对应五行（如甲日正印→水，印比→水木），与 `assessDynamicTriggers` 的 `favorableWuxing` 对齐。

> **（理论背景，非运行步骤）** 命盘当初是怎么定的用神：取用神**按命局条件分叉**，不是固定优先级——常规格局走**扶抑**（善者财官印食顺用、不善者杀伤枭刃逆用）；火炎土燥/金寒水冷等失衡则**调候为先**；专旺从势则**顺应其势**不硬克；两强相战取**通关**。而**"病药原理"是贯穿全局的总原则**（忌神为病、用神为药），不是与上述并列的一个档位。这套逻辑已在排盘阶段执行并固化进 `favorable_gods` + `favorable_verdict`，本方案不重复。

### A.3 Step 2 — 用神静态状态评估（state_report on 用神）

复用 `assessOriginalChartState`，目标换成用神，按陆致极《动态分析教程》"干支优劣等级"的**四维度**评分，输出用神底盘强弱与受损与否：

1. **十二长生旺衰**（先天骨架）：用神天干坐支十二运；长生/冠带/临官最旺，衰病死绝最弱。帝旺(阳刃)虽强但"盈则亏、满则损"，需标注"有力却无情"。
2. **干支虚实·根气**（能否发力）：**「天干无根无生者虚；有根有生者实」**——用神有根/得生为实、坐死绝或受克为虚。
3. **上下关系与刑冲合害**（情协/破坏）：上下相生相合为"有情"，相克为"无情"；并审用神是否被邻支刑冲破害、被他干合绊（贪合忘用）。
4. **调候配合**（整体寒暖燥湿）：用神效能受全局调候制约（如金寒水冷无火暖，水用难发力）。

→ 产出 `state_report`：用神当前是"得力/虚弱/受损"，以及病灶所在柱位。

### A.4 Step 3 — 岁运对用神的动态引动与吉凶分级（dynamic_report）

复用 `assessDynamicTriggers`，把"目标"从"问题十神"换成"用神/忌神"，按原著"外因通过内因"分级。现有引擎信号（`twelve_phase`、`gaitou_jiejiao`、`mechanisms` 的合/冲/刑/反吟、`trigger_vigor`）正好对应：

| 档位 | 判据（原著） | 引擎信号映射 |
|---|---|---|
| **大吉·药到病除** | 岁运为喜用且生扶原局用神 / 制约忌神 | 用神被合动·生扶，`trigger_vigor` 高、`is_effective` |
| **吉·去病** | 岁运合去/冲去原局忌神（闲神合化为喜用） | 忌神被合化/冲去机制有效 |
| **凶·损伤用神** | 岁运克制/冲毁/合绊原局用神 | 用神被冲动·盖头截脚·合绊 |
| **凶·引动忌神** | 岁运生助原局忌神 | 忌神被透干引动·生扶 |
| **大凶·岁运交战/反吟** | 岁运与命柱天克地冲(反吟)且冲及用神/提纲 | `mechanisms` 含反吟/伏吟且 target_pillar 命中用神柱 |

> 原著范例：戚继光晚年己巳运似火土扶身，实则与日时两柱反吟（天克地冲）激活凶象——印证"不能空谈岁运五行本身好坏，必须放回原局看对用神的作用"。

### A.5 输出与渲染

- **面板**：profile_driven/llm_derived 也产出 `state_report` + `dynamic_report` → 四柱面板恢复「格局/形象/用神状态」行，动态触发面板可显示"用神综合运势"引动卡（标题从"目标十神"改为"用神/忌神"）。
- **Prompt 锚点**：在 prompt 注入"用神底盘 + 岁运对用神吉凶档位"作为结构化断语，LLM 在此之上叙述，而非裸推。`path_readings` 各条仍标 `confidence=low`，但其 `structural_fit`/`peak_period` 须引用用神状态与岁运档位。
- **口径一致性**：用神综合吉凶 = 静态用神得力度 × 岁运对用神的生扶/损伤方向，**不**输出成功率/概率分数（`summary.score=null`）。

### A.6 落地顺序建议（独立于正文 Checkpoint）

1. `resolveBackendTargetSpec`：加"无问题十神 → 喜用神为目标"fallback（A.2）。
2. `assessOriginalChartState`：支持以五行(用神)为目标的四维度评分（A.3）。
3. `assessDynamicTriggers`：目标支持用神/忌神，输出吉凶档位（A.4）。
4. `buildProfileDrivenPrompt` / `buildLlmDerivedTargetPrompt`：不再绕过 pipeline，注入用神底盘断语（A.5）。
5. 前端：放开 profile_driven 的面板渲染与 `fetchMissingPanelData` 闸门（当前对 profile_driven 直接 return）。

> 取用神的细则（扶抑/调候/通关/病药的边界与冲突仲裁）落地前，建议再就具体命例在 NotebookLM 核对原著，确保引擎择用神口径与陆致极一致。

---

## Appendix B: 「分析框架 ⟂ 目标来源」双轴解耦（架构重构方向）

> 这是 Appendix A 能干净落地的**前提**。当前 `analysis_mode` 把两个正交决策焊在一起，导致"动态框架 + 用神目标"这种组合无法表达。

### B.0 病灶

`buildBaziQuestionPrompt` 的 dispatch 用单一 `analysis_mode` 决定一切，把两件本应独立的事耦合了：

- **`profile_driven`**：名义上是框架值，实际同时决定了"目标=用神/无后端"且"整个 pipeline 绕过"。
- **`target_resolution=llm_derived`**：本是"目标来源"的值，却在 dispatch 里[被第一个判断短路](lib/baziQuestionCore.js:1603)，等价于"关掉整个分析框架引擎"。

> 一句话：**"没有后端目标十神"（目标轴的条件）被实现成了"跳过整个分析框架"（框架轴的后果）。**

### B.1 两个正交轴

| 轴 | 决定 | 取值 |
|---|---|---|
| **A. 分析框架 `framework`** | 输出 schema + panel 露出 | `static_structure`(结构容量) / `dynamic_current`(当下引动) / `dynamic_scan`(应期扫描) / `portrait`(十神画像) |
| **B. 目标来源 `target_source`** | Step1 锚定谁 | `backend_shishen`(规则映射目标十神) / `yongshen`(原局用神忌神) / `llm_derived`(LLM 自拟) |

现有 5 个 mode 在 (A×B) 网格上的位置（暴露耦合）：

| 旧 mode | framework(A) | target_source(B) | 跑引擎? |
|---|---|---|---|
| status | dynamic_current | backend_shishen | ✅ |
| timing | dynamic_scan | backend_shishen | ✅ |
| pattern | static_structure | backend_shishen | ✅ |
| character | portrait | backend_shishen / llm_derived | ✅ |
| profile_driven | dynamic_current+structure | **yongshen/无** | ❌ 绕过 |
| (flag) llm_derived | —不改框架— | **llm_derived** | ❌ 短路 |

### B.2 解耦后的路由形状

```
route = {
  framework:     'static_structure' | 'dynamic_current' | 'dynamic_scan' | 'portrait',
  target_source: 'backend_shishen'  | 'yongshen'        | 'llm_derived',
  secondary?:    框架叠加（如 pattern + 当下动态）
  time_scope?:   仅 dynamic_scan 用
}
```

`character` 现有的 `backend_mapped | llm_derived` 就是这个思路的**雏形**——只是只在一个 mode 里做了，没抽象成通用轴。

### B.3 目标解析：`resolveTarget(target_source, params, route)`

把"取目标"从各 framework runner 里抽出来，按来源分三支，统一返回 `{ targetSpec | null, anchor_kind }`：

| target_source | 来源 | 后端可评估? |
|---|---|---|
| `backend_shishen` | `resolveBackendTargetSpec`（规则库映射问题→十神/宫位） | ✅ |
| `yongshen` | 读 `favorable_gods`/`unfavorable_gods`（见 A.2，十神→五行展开） | ✅ |
| `llm_derived` | LLM 自拟，**后端无 targetSpec** | ❌（Step2/3 跳过） |

关键：`yongshen` 是**后端可评估**的——这正是今天做不到的，因为它被 profile_driven 连引擎一起关了。

### B.4 框架执行：`runFramework(framework, targetSpec, params)`

现有 `runStatusPipeline / runTimingPipeline / runStaticPipeline` 改造为**参数化吃 targetSpec**，不再自己内部 `resolveBackendTargetSpec`：

- `targetSpec != null`（backend_shishen 或 yongshen）→ 正常跑 `assessOriginalChartState` + `assessDynamicTriggers`（static 框架可只跑前者）。
- `targetSpec == null`（llm_derived）→ Step2/3 跳过，但**框架仍决定 schema 与 panel**，prompt 走 LLM 自拟目标块（现 `formatLlmDerivedTargetForPrompt`）。

### B.5 Dispatch 重写（核心改动）

```
const targetSpec = resolveTarget(route.target_source, params, route)   // 不再让 B 轴短路
const pipelineResult = runFramework(route.framework, targetSpec, params)
const prompt = buildPromptFor(route.framework, { ...,
                  targetBlock: targetSpec ? backendTargetBlock : llmDerivedTargetBlock })
```

**删掉**现在 1603/1613 处对 `llm_derived` / `profile_driven` 的整体短路；它们降级为 `target_source` 与 `framework` 的普通取值组合。

### B.6 Schema 与 Panel 绑定——只看 A 轴

> **两轴非对称（关键约束）**：`framework` + `target_source` 共同拼出最终 **prompt**，但**只有 `framework` 决定输出结构(JSON schema)与 panel 露出**。`target_source` 不选 schema，它只决定"对准谁"（Step1 锚定对象、断语措辞、confidence、目标标签文案）。换言之**目标换了，输出契约不能跟着抖**——否则前端渲染与存量记录又会碎。实现者切勿把两轴当成对称地各管一半结构。

- `buildReadingsSchema` / `buildUnifiedOutputSchemaBlock` 的 key 从 `mode` 换成 `framework`。
- 前端 `baziPanelMode` 与面板露出只读 `framework`（`meta.framework`），不再读 `analysis_mode`。
- `target_source` **只**影响：Step1 断语块的措辞、`confidence`（llm_derived/yongshen 标 low/medium）、面板里"目标"标签文案（"目标十神" vs "用神/忌神" vs "LLM 自拟框架"）。

### B.7 向后兼容（存量记录 + 客户端路由器）

- 加一层 `migrateLegacyRoute(oldRoute)`：把旧 `analysis_mode`+`target_resolution` 映射到新 `framework`+`target_source`（按 B.1 表）。`profile_driven → {dynamic_current, yongshen}`、`llm_derived flag → target_source=llm_derived`。
- 存量 `qimen_records.meta.analysis_mode` 读取时经同一 migrate 兜底，渲染不破。
- 客户端语义路由 LLM 的产出 schema 同步改为输出双轴（过渡期两套都接）。

### B.8 落地顺序

1. 定义 `framework`/`target_source` 常量 + `migrateLegacyRoute`（纯映射，零行为变化，先上线兜底）。
2. 抽 `resolveTarget`（含 `yongshen` 分支，复用 A.2）。
3. `runFramework` 参数化吃 targetSpec；framework runner 去掉内部取目标。
4. Dispatch 改成 `runFramework(framework, resolveTarget(...))`，删短路。
5. schema/panel 改 key 为 framework；`target_source` 仅作 Step1 与文案。
6. 客户端路由器输出双轴；存量经 migrate。

> 收益：Appendix A（动态框架 + 用神目标）变成一个**普通组合**而非特例；`profile_driven` 这个"什么都管"的 mode 被拆解消除；`character` 的 backend/llm 二选一推广为全局能力。
