# 占卜链路 Prompt 全量清单

> 调研范围：`lib/`、`worker/src/index.js`、`src/`（只读调研，2026-07-09）
> 用途：作为 [langfuse-migration-plan.md](langfuse-migration-plan.md) 的原始材料，梳理当前所有会拼进
> 发给 Gemini 的 prompt 字符串的构建函数，标注类型（静态模板 / 逻辑重拼装 / 混合），供迁移优先级排序。
> 关联设计文档：[bazi-prompt-assembly-prd.md](bazi-prompt-assembly-prd.md)（八字问答 prompt 架构设计的来源）

## 术语约定

- **纯静态**：函数输出几乎不随输入变化，或只有个别变量插值，文案与业务规则解耦，可以直接迁移为 Langfuse 托管模板。
- **逻辑重**：函数内部有 if/for/规则表查询，输出内容完全由上游计算结果决定，文案与代码逻辑深度耦合，**不适合**脱离代码单独做模板管理，只适合在渲染完成后的输出处打观测点。
- **混合**：一部分是固定任务说明（静态），一部分是动态证据块拼接（逻辑重），需要拆开处理——静态部分迁移模板，动态部分保留代码 + 打观测点。

---

## 1. 路由分类 prompt —— `lib/divinationRouter.js`

| 函数 | 位置 | 职责 | 类型 | 规模 | 近 20 次提交中改动文案的比例 |
|---|---|---|---|---|---|
| `buildGeminiRoutePrompt` | `lib/divinationRouter.js:279-347` | 一级路由：判断 branch(bazi/qimen/hybrid/clarify)+category+subcategory+role | 偏静态（8 个 few-shot 案例 + 枚举定义固定，动态点仅 `categoryLines`/`ruleResult`/`question`） | ~69 行 / 2000+ 字符 | 约 3-4/11，中等 |
| `buildBaziSemanticRoutePrompt` | `lib/divinationRouter.js:349-441` | 二级路由（仅 bazi）：判断 analysis_mode + target_source 双轴 | 偏静态（9 个 few-shot 案例固定，动态点仅 `routeHint`/`question`） | ~93 行 / 3000+ 字符，全库最大静态 prompt 之一 | 约 4-5/11，较高——几乎每次语义路由迭代都要跟着改 |

支撑数据源 `DIVINATION_CATEGORIES`（`lib/divinationCategories.js`）非 prompt 函数，但其文案被 `buildGeminiRoutePrompt` 逐条拼入，做模板化时要一并纳入版本管理。

---

## 2. 八字问答主链路 —— `lib/baziQuestionCore.js`

`buildBaziQuestionPrompt`（`lib/baziQuestionCore.js:1875-1977`）是调度器，按 `analysis_mode` 分发到 7 个 `build*Prompt`，失败统一降级到 `buildLegacyBaziQuestionPrompt`。

### 2.1 mode-specific prompt 构建函数

| 函数 | 位置 | 触发条件 | 类型 | 规模（静态部分） |
|---|---|---|---|---|
| `buildLegacyBaziQuestionPrompt` | `790-938` | analysis_mode 缺失/解析失败/异常兜底 | 偏静态，全库最大单体静态模板 | ~148 行 / ~4100 字符 |
| `buildStatusPrompt` | `1579-1643` | mode=status | 混合（动态块来自 `formatStateReportForPrompt`/`formatDynamicReportForPrompt`） | 静态 ~53 行 / 1644 字符 + 动态 1000-3000 字符 |
| `buildTimingPrompt` | `1645-1709` | mode=timing | 混合（动态块来自 `formatTimingCandidatesForPrompt`） | 静态 ~56 行 / 1812 字符 + 动态 500-1500 字符 |
| `buildPatternPrompt` | `1427-1485` | mode=pattern | 混合 | 静态 ~49 行 / 1485 字符 |
| `buildCharacterPrompt` | `1487-1543` | mode=character | 混合 | ~46 行 / ~1400 字符 |
| `buildProfileDrivenPrompt` | `1807-1873` | mode=profile_driven（开放战略型问题） | 混合偏逻辑（`sizhuBlock` 可达 50-150 行） | 静态 ~45 行 / 1309 字符 |
| `buildLlmDerivedTargetPrompt` | `1545-1577` | target_source=llm_derived 边界问题兜底 | 偏静态 | ~33 行 / ~900 字符 |

所有 7 个函数末尾共享 `buildUnifiedOutputSchemaBlock(mode, ...)`（`956-1013`），非各自重复定义。

### 2.2 支撑用 format*/build* 函数

| 函数 | 位置 | 类型 | 备注 |
|---|---|---|---|
| `formatBasicProfileBlock` | `940-954` | 偏静态 | 六个 mode prompt 共用的命主信息段 |
| `buildPipelineContextBlock` | `1405-1413` | **纯静态** | 五个 prompt 共用同一段说明文案 |
| `buildGroundingConstraintBlock` | `1415-1425` | **纯静态** | 五个 prompt 共用的"数据依据约束"文案 |
| `formatTimingCandidatesForPrompt` | `1347-1357` | 逻辑重 | 候选年渲染，内容完全由计算结果决定 |
| `formatOptionalDynamicBlock` | `1359-1364` | 逻辑重 | 包裹标题，内容来自 `formatDynamicReportForPrompt` |
| `formatAvoidImpactForPrompt` | `1367-1376` | 逻辑重 | 忌神动态引动断语 |
| `formatLlmDerivedTargetForPrompt` | `1378-1403` | 逻辑重，输出结构相对固定 | LLM 自拟目标框架文本 |
| `formatSizhuDetailBlock` | `1715-1801` | **逻辑重，全库最复杂拼装函数之一** | 双重循环，四柱+全量大运+50年流年 |
| `buildBaziEvidenceBlock` | `1984-2005` | 逻辑重 | 追问链路专用，供 `wenshiFollowup.buildBaziFollowupPrompt` 使用 |

### 2.3 共享 Schema 尾块

| 函数 | 位置 | 类型 | 备注 |
|---|---|---|---|
| `buildUnifiedOutputSchemaBlock` | `956-1013` | 偏静态 | 外层字段说明固定，`readingsSchema` 按 mode 变化 |
| `buildReadingsSchema` | `1015-1135` | **纯 if/switch 选择静态块，5 个分支各自固定** | **最适合直接拆成 5 个 Langfuse 模板变量的候选** |

### 2.4 外部证据转译函数（被 5 个 mode prompt 直接拼入）

| 函数 | 位置 | 类型 |
|---|---|---|
| `formatTargetSpecForPrompt` | `lib/baziTargetElement.js:643-676` | 逻辑重 |
| `formatStateReportForPrompt` | `lib/baziStateAssessor.js:755-825` | 逻辑重，全库最长动态格式化函数之一 |
| `formatDynamicReportForPrompt` | `lib/baziDynamicAssessor.js:910-966` | 逻辑重 |

**结论**：这三个 + 2.2 中的 format* 函数是"命理计算结果 → 自然语言证据块"的转译层，只适合在边界处打观测点，不适合做模板管理。

git 提交比例：`lib/baziQuestionCore.js` 近 20 次提交约 60-70% 直接涉及 prompt/schema 文案，是版本管理收益最大的候选之一。

---

## 3. 奇门主解读 prompt —— `worker/src/index.js` 的 `finalPrompt` + 各 section

### 3.1 组装位置

`finalPrompt` 本体：`worker/src/index.js:2216-2264`（`handleQimen` 内），拼入以下 section：

| 变量名 | 来源函数 | 位置 | 类型 | 规模 |
|---|---|---|---|---|
| `yongshenPromptSection` | `buildYongshenPromptSection` | `lib/qimenYongshenRules.js:1314-1352` | 逻辑重（按 category 从 11 个领域规则表取规则） | 25-40 行 / 700-1200 字符，随 category 差异巨大 |
| `domainViewPromptSection` | `buildDomainViewPromptSection` | `lib/qimenYongshenRules.js:1354-1391` | 逻辑重（有 axes）/ 纯静态兜底（无 axes） | 21 行/834 字符 或 ~10 行 |
| `timingPromptSection` | `buildTimingPromptSection` | `lib/qimenTimingRules.js:339-386` | 逻辑重，末尾拼固定 `TIMING_REALISM_RULES` | ~21 行框架 + 动态候选 |
| `polarityPromptSection` | `buildPolarityPromptSection` | `lib/qimenPolarityRules.js:436-461` | 逻辑重，**未命中时整段为空字符串** | 命中时每条 ~5 行 |
| `summaryPromptSection` | `buildSummaryPromptSection` | `lib/qimenPromptSections.js:223-234` | **纯静态，无参数** | ~10 行 |
| `reportSchemaSection` | `buildReportSchemaPromptSection` | `lib/qimenPromptSections.js:327-370` | **纯静态，无参数** | ~43 行 / 2386 字符，奇门链路最大静态块 |
| `inferenceRulesSection` | `buildQimenInferenceRulesSection` | `lib/qimenPromptSections.js:236-294` | **纯静态，无参数** | ~58 行 / 1615 字符 |
| `scoreAuditPromptSection` | `buildScoreAuditPromptSection` | `lib/qimenPromptSections.js:190-221` | 逻辑重（内部再调 3 个 narrative 函数） | 静态外壳 ~20 行 + 动态 20-60 行 |
| `frontendCopyProtocolSection` | `buildFrontendCopyProtocolSection` | `lib/qimenPromptSections.js:296-325` | **纯静态，无参数** | ~29 行 / 1519 字符 |
| `outputContractSection` | `buildQimenOutputContractSection` | `lib/qimenPromptSections.js:372-398` | 偏静态（仅 2 个插值点） | ~26 行 |

> 订正：`buildYongshenPromptSection`/`buildDomainViewPromptSection` 实际在 `qimenYongshenRules.js`，`buildTimingPromptSection` 在 `qimenTimingRules.js`，`buildPolarityPromptSection` 在 `qimenPolarityRules.js`，不在 `qimenPromptSections.js`。

### 3.2 `finalPrompt` 本体

除 9 段 section 外，头部还有起局时间/干支四柱/值符值使/空亡驿马（逻辑重插值）、`palacesText`（九宫盘面文本，逻辑重）、`effectiveBaziInfo`（**用户自由文本**，见第 7 节）、固定的"核心推演逻辑"1-4 步说明文案、末尾 `问题：${userQuestion}`（**用户自由文本**）。

- 骨架本身约 49 行 / 1549 字符；**完整拼装后通常 200-400 行、8000-15000 字符**，是全库单次请求体量最大的 prompt。
- 不建议整体当成一个模板迁移，应保留"9 段 section + 头部起局信息"的拼装结构，只把纯静态的几段（`summaryPromptSection`/`reportSchemaSection`/`inferenceRulesSection`/`frontendCopyProtocolSection` + "核心推演逻辑"4 步说明）搬进 Langfuse 模板管理。

### 3.3 输出格式二次改写

| 函数 | 位置 | 职责 | 类型 |
|---|---|---|---|
| `convertQimenPromptToTextMode` | `worker/src/index.js:749-832` | 把输出契约段替换成 9 段哨兵标记格式说明，用于流式输出 | `SENTINEL_INSTRUCTION` 常量（`752-823`）**纯静态大块文案**，~72 行 / 4500+ 字符 |
| `convertPromptToTextMode` | `worker/src/index.js:694-717` | 八字链路对应版本（`WRAP` 常量） | 纯静态 + 字段名拼接 |

**注意**：奇门用 `<<<SEC:key>>>...<<<END:key>>>`，八字档案首次生成（见 5.1）用 `<<<SECTION:key>>>...<<<END_SECTION:key>>>`——两套哨兵语法不统一。

git 提交比例：`qimenPromptSections.js`/`qimenYongshenRules.js`/`qimenPolarityRules.js`/`qimenTimingRules.js` 近 20 次提交约 80-90% 是 prompt/契约直接调整，是**全仓库 prompt 改动最频繁的一组文件**，版本管理收益最大。`worker/src/index.js` 本身因混杂大量非 prompt 逻辑（SSE/鉴权/DB/配额），改动 `finalPrompt` 的比例约 20-30%。

---

## 4. 追问（多轮）链路 —— `lib/wenshiFollowup.js`

| 函数 | 位置 | 职责 | 类型 | 规模 |
|---|---|---|---|---|
| `buildFollowupClassifierPrompt` | `120-153` | Step A：判断 same_casting / new_matter | 偏静态（分类规则+schema固定） | ~20 行 / 900 字符 |
| `buildQimenEvidenceNarrative` | `157-219` | 结构化奇门证据 → 自然语言盘面文本 | 逻辑重（九宫逐宫渲染） | 15-30 行 |
| `buildFollowupPatchPrompt` | `232-288` | Step B：奇门增补 patch prompt | 混合 | ~30 行框架 |
| `buildBaziEvidenceNarrative` | `294-337` | 八字证据 → 自然语言，复用首轮 format* 函数 | 逻辑重 | 视证据量 |
| `buildBaziFollowupPrompt` | `369-445` | 统一架构八字追问主决策 prompt | 混合（`lockAnswer` 时结构不同） | ~49 行框架 / 2222 字符 |

git 提交比例：7/7 次提交全部是 prompt/证据叙述器直接调整，接近 100%——该文件"纯粹为承载 prompt 逻辑而存在"，非常适合整体纳入 Langfuse 管理。

---

## 5. 此前未纳入统计范围的其他 Gemini 调用路径

### 5.1 八字命盘首次生成 —— `lib/baziLlmSections.js`

| 函数 | 位置 | 职责 | 类型 |
|---|---|---|---|
| `buildBaziProfileSectionPrompt` | `224-259` | 命盘首次生成时原局/大运/流年三段定性描述 | 偏静态，~31 行 / ~1400 字符 |

命中率高（每个新建档案跑一次），建议纳入同批迁移范围。

### 5.2 八字"定盘纠偏" —— **前端构建**，`src/utils/buildCalibrationPrompt.mjs:48-106`

**结构性特例**：prompt 在浏览器端（`BaziView.vue`）拼好后，作为 `body.prompt` 原样发给 `POST /api/bazi-calibrate`，worker 端 `handleBaziCalibrate`（`worker/src/index.js:1536-1568`）**完全没有 prompt 构建逻辑，只是转发**。

- Langfuse trace 只能在 `handleBaziCalibrate` 处记录成品字符串，看不到构建过程。
- `e.description`（用户填写的人生大事自由描述）是**全库敏感度最高的自由文本插入点**，可能包含婚姻/疾病/官司等隐私内容。

### 5.3 每日/每月运势解读 —— `lib/fortuneDailyCore.js`、`lib/fortuneMonthlyInterpretationCore.js`

| 函数 | 位置 | 类型 |
|---|---|---|
| `buildInterpretationPrompt` | `lib/fortuneDailyCore.js:310-~420` | 偏静态，字段插值密集但均为结构化数据 |
| `buildContextPromptBlock` | `lib/fortuneContextNotes.js:192-273` | 逻辑重 |
| `buildMonthlyInterpretationPrompt` | `lib/fortuneMonthlyInterpretationCore.js:337-~520` | 混合 |

与"问事"链路并行的另一套产品功能，同样调用 Gemini，建议不要遗漏。

---

## 6. 所有实际调用 Gemini 的出口点

统一打到 `https://yinli.one/v1/chat/completions`，但**分散在 5 个不同 wrapper 函数**，不是单一汇合点：

| 函数 | 位置 | 请求形态 | 使用场景 |
|---|---|---|---|
| `classifyByGeminiFlash` | `lib/divinationRouter.js:443-465` | 非流式 JSON | 生产环境不会触发（Node-only） |
| `classifyByGeminiFlashWithEnv` | `worker/src/index.js:340-366` | 非流式 JSON | 一级路由分类 |
| `requestLLM` | `worker/src/index.js:551-582` | 非流式 JSON | 二级语义路由、定盘纠偏、运势解读、追问判断器 |
| `requestLLMText` | `worker/src/index.js:586-611` | 非流式纯文本 | 流式失败后的重试兜底 |
| `requestLLMSimpleStream` | `worker/src/index.js:615-674` | SSE 流式纯文本 | 问事/奇门主答案、追问增补四条主链路 |
| `requestLLMStreamSections` | `worker/src/index.js:944-1011` | SSE 流式带命名分段 | 八字档案首次生成三段式画像 |

**建议**：先把这 5 个 wrapper 收敛成一个内部 `callLLM({...})` 基础函数，在这一处插桩即可同时覆盖流式/非流式/JSON/纯文本四种形态，比在每个业务函数里分别打点成本低得多。

---

## 7. 用户自由文本插入点（脱敏关注点）

| 插入点 | 位置 | 敏感度 |
|---|---|---|
| `question` | `divinationRouter.js:343,423` | 中——用户原始提问，一/二级路由均直接整段插入 |
| `userQuestion` | `baziQuestionCore.js`（7 处 mode prompt）、`worker/src/index.js:2264` | 中 |
| `baziInfo`/`effectiveBaziInfo` | `worker/src/index.js:2098,2223` | 中——用户自行粘贴的八字信息文本，且被截取前 15 字符用于缓存 key |
| `followup`/`originQuestion`/`f.q` | `lib/wenshiFollowup.js:135-137,276,350,406,410` | 中——追问原文及历轮追问累积拼接 |
| `e.description` | `src/utils/buildCalibrationPrompt.mjs:75` | **高**——用户填写的人生大事自由描述，常涉及婚姻/疾病/官司等隐私细节 |

**注意区分**：`worker/src/index.js:173-181` 的 `sanitizeUserText` 是对 **LLM 输出**做清洗（防止内部指标泄漏），方向与"用户输入脱敏"相反，不要混淆复用。

---

## 8. 结构性观察（供迁移方案参考）

1. **两套并行哨兵协议**：问事链路 `<<<SEC:key>>>` vs 八字档案首次生成 `<<<SECTION:key>>>`，做协议模板统一前需先决策是否顺带合并。
2. **`buildReadingsSchema` 是最适合"按变量切换模板"的候选**：纯 if 分支返回静态 JSON 片段，5 个 mode 无跨分支共享逻辑。
3. **`buildPipelineContextBlock`/`buildGroundingConstraintBlock`/纯静态 section 群**是天然的"prompt 片段复用"候选，当前靠 JS 函数调用复用，迁移后可用 Langfuse 的模板组合机制替代。
4. **规则表驱动的 section（用神/极性）不适合整体模板化**——文案迭代节奏与规则表（`QIMEN_YONGSHEN_RULES` 1398 行等）耦合，拆开会导致版本脱节。
5. **`worker/src/index.js` 是唯一的生产环境 prompt 组装现场**：`lib/*.js` 里都是纯函数，真正决定"这次请求发了什么"的是各 `handle*` 函数的调用顺序和参数。
6. **部署约束（关键分岔点）**：本仓库改 `lib/`/`worker/src/index.js` 后需手动 `wrangler deploy`，无 CI。如果只把 Langfuse 当"离线可视化 + 版本 diff 工具"，模板编辑后仍需走代码同步 + 手动部署才生效；如果要做到"编辑即生效"，需要 Worker 在请求时从 Langfuse 拉取模板，这是两条完全不同的技术路线，见迁移方案第 0 节的决策点。
