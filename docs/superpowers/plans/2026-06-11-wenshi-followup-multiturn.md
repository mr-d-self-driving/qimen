# 问事追问（多轮 agent）实施方案

> 方案定调：**A. 客户端回传状态** + **锚定式增补（追问解读挂在相关段落下，不覆盖原文）** + **小判断器（同一局深挖 / 新事）**
> 范围：先做奇门（`/api/qimen`），八字（`/api/bazi-question`）作为 Phase 2 复用。

## 1. 设计原则

- **一局一解，正本不动**：本卦解读是固定正本，追问是在它之上**分层深挖**，不是修正它。追问结果以「增补子块」挂在它深挖的那一段下面，**不覆盖原文**。
- **盘面与分数不变**：追问不重算盘、不重新打分。一个局的 verdict 在它被起出来的那一刻就固定了，追问只换面向。
- **无状态后端**：Worker 不存会话。原局证据由前端回传（首轮的 `data` + `wenShiEngineResult` 本就在内存里）。
- **反臆造延续**：补丁 LLM 只能引用回传的盘证据，不得引入新盘面元素；越出本局 → 判为新事，不硬答。
- **修正是例外**：默认全部走增补（append）；仅当追问带来**改变前提的新信息**时才算 `revise`，且以「原结论 →（因新情况）调整为…」的**对照**呈现，绝不静默覆盖。
- **数字仍全由代码算**：追问若需要原盘没算的数据（如流年/大运/应期），由**判断器点菜 + 后端按白名单确定性补算**（见 §3.4），LLM 永远只读结果。**不用 LLM function calling**——需求在问题里就能预判，无需模型边想边取；且现有 SSE 是单次纯文本流，加 tool-use 循环成本高、时效长、控制流难测。

## 2. 现状锚点（代码事实）

- 前端问事主流程：`src/views/HomeView.vue`
  - 提交流 `~2480-2622`；SSE 消费 `readSSEStream` `~1715-1817`。
  - `complete` 事件的 `event.result`（= `data`）含全部结构化卡片数据（各 prose 段 + `data_json` 衍生字段 + `summary.score`）。
  - 盘面引擎产物存于 `wenShiEngineResult`（`engine_complete` 事件，`~1739`）。
  - 流式写入卡片槽位：`patchStreamSlot(section, text)`（奇门分段就地补丁，`~1796`）。
  - 终态卡片组装：`buildCardHTML(data)` + `applyCardMdBold`（`~2562/2608`）。
  - 已保存记录：`activeResultRecord` / `saveRecordToDatabase`。
- Worker：`worker/src/index.js`
  - 路由表 `~2673-2697`；`handleQimen` `~1626`，`handleBaziQuestion` `~1203`。
  - SSE：`createSSEResponse` `~284`。
  - 哨兵流式解析：`createSentinelStreamParser(visibleKeys,{onVisibleDelta})` `~800`（任意 `<<<END>>>` 闭合、错配自愈、标记不泄漏）。
  - 宽松 JSON：`parseSentinelDataJson` `~868`。
  - 纯文本流式 LLM：`requestLLMSimpleStream` `~578`；非流式：`requestLLMText`。
  - 路由分类范式：`lib/divinationRouter.js`（小判断器照此写）。
  - 奇门 prose 段集合（见 `qimenSectionsAreBad` `~886`）：
    `conclusion, subject_reading, target_reading, environment_reading, support_summary, constraint_summary, decision_reading` + `data_json`。

## 3. 后端：新增 `/api/qimen-followup`

### 3.1 请求体（A 方案，前端回传原局）
```jsonc
{
  "followup": "你说的转机具体在几月？",
  "branch": "qimen",                 // Phase 2: "bazi"
  "origin": {
    "question": "原问题",
    "route": { /* 原 routeData */ },
    "evidence": { /* 原 data_json 结构证据（compact，盘锚） */ },
    "sections": {                    // 原各 prose 段，供上下文 + 定位改哪段
      "conclusion": "...",
      "decision_reading": "...",
      "...": "..."
    },
    "score": 72,                     // 只读，不改
    "seed": {                        // 用于后端确定性复现原盘、按需补算（见 §3.4）
      // 奇门：原起局时间 + 起局参数 → 后端重排出一模一样的局
      "cast_at": "2026-06-11T10:00:00+08:00", "cast_params": { /* ... */ }
      // 八字：改为 "profileId": "..." → 后端 fetch 命盘即可算任意年/月/大运
    }
  }
}
```
> 体积优化：`evidence` 用 `data_json` 结构证据（已是机器可读），不回传整段散文以外的渲染 HTML。`sections` 传纯文本即可。
> **种子而非整局**：补算靠回传的 `seed` 在后端确定性复现（奇门同一时刻起局结果唯一；八字命盘固定），前端无需回传庞大的局 blob。

### 3.2 处理流程（两段式，gate 在前）

**Step A — 小判断器（cheap / flash 模型，一次调用）**
输入：原 route + 原 conclusion 摘要 + 追问。输出 JSON：
```jsonc
{
  "scope": "same_casting" | "new_matter",
  "nature": "deepen" | "revise",   // same_casting 时：纯深挖 / 因新信息修正（默认 deepen）
  "target_sections": ["conclusion", "decision_reading"],  // same_casting 时：增补挂在哪几段下
  "needs_data": [                  // same_casting 时：原盘没算、需后端补算的能力（白名单，见 §3.4）
    { "capability": "liunian_scan", "params": { "years": [2026, 2027] } }
  ],
  "reason": "..."
}
```
- `new_matter` → 直接 `emit({type:'followup_route', scope:'new_matter'})` 后 close，**不花大模型**。前端弹「重新起局?」。
- `same_casting` → 进 Step A2 / B。
- 判断器只能从 §3.4 白名单点 `needs_data`；点不到的能力（如奇门盘上要八字式年运）→ 应判 `new_matter`。

**Step A2 — 按需补算（确定性，无 LLM；needs_data 非空时）**
- 用 `origin.seed` 复现原盘：奇门按 `cast_at`+`cast_params` 重排局；八字按 `profileId` fetch 命盘。
- 对 `needs_data` 每项，查 §3.4 注册表 → 调对应计算函数 → 得新证据 `extra_evidence`。
- 注册表是**白名单**：capability 不在表内一律忽略（判断器越界的兜底）。
- 重读类（证据已在 `evidence` 里，见 §3.4 表）不进此步，直接交给 Step B。

**Step B — 补丁 LLM（与问事同档模型，流式）**
Prompt 契约（新建 `buildFollowupPatchPrompt`，可放 `lib/qimenPromptSections.js` 旁）：
- 注入：原盘 `evidence` + `extra_evidence`（补算结果）+ 原各段全文（只读上下文）+ 追问 + `target_sections` + `nature`。
- 硬约束：只依据上述盘证据回答；不得引入新盘面元素 / 不得改分数 / 不得泄漏指标数值（复用现有规则段）；**输出的是针对追问的「增补解读」，不是改写原段**；`nature=revise` 时须以「原结论 → 调整为…」对照写。
- 输出（哨兵分段，每个 `target_section` 一段增补文 + 一个 meta 头）：
```
<<<SEC:patch_meta>>>{"sections":["conclusion","decision_reading"],"nature":"deepen"}<<<END:patch_meta>>>
<<<SEC:conclusion>>>针对「具体几月」的增补：以值符落宫推，应在……<<<END:conclusion>>>
<<<SEC:decision_reading>>>对应行事补充：……<<<END:decision_reading>>>
```
> 段 key 复用原段名，仅用于**定位锚点**（增补挂到哪段下），不代表覆盖该段。
- 用 `createSentinelStreamParser(new Set(target_sections), { onVisibleDelta:(section,text)=>emit({type:'patch_delta',section,text}) })` 流式转发。
- 结束 `emit({type:'patch_complete', supplements:{section:text,...}, meta})` 后 close。
- 结构兜底：复用 `qimenSectionsAreBad` 思路做精简版（patch 段为空 / 解析失败 → 非流式重试一次）。

### 3.3 复用清单
`createSSEResponse` / `createSentinelStreamParser` / `parseSentinelDataJson` / `requestLLMSimpleStream` / `requestLLMText` / 鉴权 `getAuthedUser` / 配额（见 §5）。
路由表加：`if (url.pathname === '/api/qimen-followup') return handleQimenFollowup(request, env);`

### 3.4 能力注册表（重读 vs 重算）

追问要的数据分两层——一半根本不用"算"：

| 层 | 含义 | 处理 |
|---|---|---|
| **重读** | 证据本就在盘里、首轮答案没展开（奇门换宫/方位、八字换十神/宫位） | 不进注册表；直接把 `evidence` 喂给 Step B 增补 LLM |
| **重算** | 首轮 pipeline 因路由没要、压根没算（主要是时间维度） | 走注册表，Step A2 确定性补算 |

注册表 = `capability → 现成计算函数` 的白名单。**全部对应已存在的 lib 函数，无需新写算法：**

**八字（`branch:"bazi"`，seed=profileId）**

| capability | 触发例 | 调用函数 | params |
|---|---|---|---|
| `liunian_scan` | "具体哪一年" | `lib/baziDynamicAssessor.assessDynamicTriggers` + `lib/calculateAnnualScore.calculateAnnualScore` | `{ years:[] }` |
| `liuyue_scan` | "那年哪几个月" | `lib/fortuneMonthlyCore.buildMonthlyFortunePayload` | `{ year }` |
| `dayun_window` | "哪步大运转好" | `lib/baziDynamicAssessor`（大运 impact）+ `lib/baziCore` 大运表 | `{}` |
| `tiaohou` | "适不适合往南方/夏天" | `lib/calculateTiaohouRatio.calculateTiaohouRatio` | `{ flowGan? }` |
| `retarget` | 原问事业、追问财/婚 | `lib/baziQuestionCore.runDynamicPipeline`（传新 `targetSpec`） | `{ target }` |

**奇门（`branch:"qimen"`，seed=cast_at+cast_params）**

| capability | 触发例 | 调用函数 / 来源 | 备注 |
|---|---|---|---|
| `yingqi` | "什么时候应验" | `lib/qimenScoringEngine.timingCandidates` / `getTimingRecovery` | 重算（从复现的局取 timingAnalysis） |
| `fangwei` / `regong` | "哪个方向有利" "换看官鬼宫" | 读原局九宫（`evidence`） | **重读**，不进 Step A2 |

> 注册表外的 capability 一律忽略；判断器若把奇门盘上要八字式年运，应直接判 `new_matter`。

## 4. 前端：追问交互（锚定式增补）

### 4.1 布局
原卦解读为固定正本（不改）；每条追问 = 挂在它深挖的那一段锚点下的小补充块：
```
┌─ 结论：近期事业有转机… ─────────────┐   ← 原文保留，仅淡高亮
│  ↳ 追问：转机具体在几月？            │   ← 增补子块，流式写入
│    解读：以值符落宫推，应在……        │
└──────────────────────────────────┘
        ┊ 追问输入条 ┊
```

### 4.2 流程
- 终态卡片下方常驻**追问输入条**（卡片渲染完成后出现）。
- 提交 → POST `/api/qimen-followup`，body 用内存里的 `activeResultRecord`/`data`/`wenShiEngineResult` 拼 `origin`。
- 复用 `readSSEStream` 的解析骨架，新增事件分支：
  - 收到 `patch_meta` / 首个 `patch_delta` → 在每个 `target_section` 锚点后**插入一个空的增补子块**（含追问文案 + 流式占位），淡高亮对应原段。
  - `patch_delta {section,text}` → **append** 到该段的增补子块（流式），**不动原段文字**。（渲染从「覆写槽位」改为「向增补块追加」，`patchStreamSlot` 可改造或新写 `appendSupplementSlot`。）
  - `patch_complete {supplements}` → 增补块定稿、收掉占位动画；`revise` 类用「原结论 → 调整为…」对照样式。
  - `followup_route {scope:'new_matter'}` → 行内提示「这看起来是个新问题，要重新起一局吗？」→ 确认则用 `followup` 作为新 `question` 跑现有 `submit` 流程。

### 4.3 状态与留痕（A 方案）
- 内存：把 `supplements` 作为**追问记录**挂到 `data` 上（如 `data.followups: [{ q, nature, supplements, ts }]`），**不覆盖**原 `sections`。
- 渲染：原卡片正常 `buildCardHTML(data)`，追问块由 `data.followups` 锚定渲染到对应段下。
- 持久化（可选，Phase 2）：随记录存 `followups` 数组，扩展 `saveRecordToDatabase`；回看时同样按锚点重渲染。MVP 可只改内存不落库。

## 5. 配额与成本
- 追问复用原局，应有**独立轻配额**：每条记录追问上限 N 次，或追问按 0.x 折算扣 `assertDailyQimenQuota`。
- `new_matter` 不计追问额度（没花大模型），但确认重新起局后按正常起局计费。

## 6. 关键取舍（已定）
- **锚定式增补，不覆盖原文**：原卦解读是正本；追问以增补子块挂在相关段下。`revise` 例外，且对照呈现、不静默覆盖。
- **判断器与补丁分两次调用**：先 cheap 判断 gate 掉新事，避免无谓的大模型开销，也让补丁 prompt 保持干净。
- **缺数据走"判断器点菜 + 后端确定性补算"，不用 function calling**：理由不是数据安全（两种做法数据都来自接口），而是——需求在问题里就能预判、现有 SSE 单次流式管线改造成本高、控制流要可测可封顶。若未来追问走向链式多步推演，再考虑 function calling。
- **重读 vs 重算分层**：能从原盘直接读的（奇门方位/换宫等）不补算，只重读。
- **回传种子复现原盘**：奇门起局时间+参数 / 八字 profileId，后端确定性复现，前端不传整局。
- **锚点段 = prose 段**；`score` / `data_json` 盘面不动。
- **状态客户端持有**；DB 仅留痕，非追问前置条件。

## 7. 分期
- **Phase 1（MVP，奇门）**：`/api/qimen-followup`（判断器+补丁）→ 前端追问条 + `patch_delta` 锚定增补块 + `data.followups` 内存合并。先支持**重读类**追问（无需补算）+ 奇门 `yingqi` 一个重算能力打通注册表骨架。new_matter 仅提示文案。
- **Phase 2**：补全能力注册表（八字 `liunian_scan`/`liuyue_scan`/`dayun_window`/`tiaohou`/`retarget`）；new_matter「重新起局」确认流接回主流程；八字分支复用（命盘天然可复用，更简单）；追问落库历史；首轮可选输出 `followup_suggestions` 建议芯片。

## 8. 验证
- 单测：判断器对「同一局深挖 vs 新事」样例的分类；patch 解析器对只含部分段的输出。
- 端到端：起一卦 → 追问深挖（断言**原段文字不变**、目标段下新增增补块、分数不变）→ 追问新事（断言走 new_matter 提示）。

---

# 9. Phase 2 架构修订：统一单主-LLM（取代 Phase 1 的两节点）

> 状态：Phase 1（奇门）已上线，沿用「flash 判断器 + pro 增补」两节点。Phase 2 起八字改用本节的**统一单主-LLM**架构；奇门暂维持已上线版本，待八字验证顺畅后再回收（见 §9.4）。

## 9.1 为什么改：两节点设计的两个问题

1. **判断者上下文太薄**：Phase 1 的 flash 判断器只看到「原问题 + 一行结论摘要 + 追问」，却要同时判分流、又要从一行摘要里抽参数（如流年区间）填进 `needs_data.params`，脆弱。
2. **能力注册表 = 双轴的二次封装**：`FOLLOWUP_CAPABILITIES.bazi`（`liunian_scan`/`dayun_window`/`retarget`/`tiaohou`…）背后调的就是首轮双轴 pipeline 的同一批函数（`assessDynamicTriggers` / `calculateAnnualScore` / `resolveTarget` / `calculateTiaohouRatio`，由 `runStatusPipeline`/`runStaticPipeline`/`runTimingPipeline` 调度）。把它另起一套 capability/tier/params 分类法登记，等于**双份维护**：首轮改了轴定义/函数签名，注册表要单独同步。

## 9.2 统一架构（单主-LLM · 全量上下文 · 封顶一跳）

```
追问回合
  │
  ▼
主 LLM（pro，全量上下文：原盘自然语言叙述 + 各段全文 + 历轮增补 + 本次追问）
  │  输出决策三选一（哨兵 <<<SEC:decision>>>）：
  ├─ answer     → 同一次响应里直接流式增补（哨兵分段）           ──► 完
  ├─ new_matter → 提示重新起局                                  ──► 完
  └─ recompute  → 输出 route_delta（首轮路由词汇：analysis_mode/time_scope/target_source，**不是 capability 名**）
        → 代码：mergedRoute = normalizeBaziSemanticRoute({...originRoute, ...route_delta})
        → 用 seed 复现命盘 → 跑首轮同一 run*Pipeline → 得 dynamicReport
        → formatDynamicReportForPrompt(dynamicReport)  ← 复用首轮的自然语言格式化器
        → 主 LLM 第二跳：拿补算结果写最终增补                    ──► 完（本回合封顶一跳）
```

**循环语义采 (a)**：每个追问回合一次判断、最多补算一跳、然后答；下个回合再来一次。**不在单回合内反复**（那是 function calling，留待真链式多步推演时再升级）。理由仍是最初反 function calling 的那条：需求基本可从追问预判、SSE 单次流式管线、控制流要可测可封顶。

**相对 Phase 1 的变化：**
- 删 flash 判断器 → 判断与回答合并为一个**有全量上下文**的主 LLM 节点（修问题 1）。
- 删 `FOLLOWUP_CAPABILITIES.bazi` 独立分类法 → 补算 = 带 `route_delta` 重进首轮 `run*Pipeline`，双轴只有首轮一处真相（修问题 2）。
- 「数字全由代码算、模型只读结果」不变；`formatDynamicReportForPrompt` 复用 → 补算结果自然语言化零新增。

## 9.3 八字落地步骤（不动已上线奇门）

| 步 | 内容 | 文件 | 验证 |
|---|---|---|---|
| 1 | `buildBaziEvidenceNarrative`（结构证据→自然语言，替 `JSON.stringify`）+ `buildBaziFollowupPrompt`（决策协议） | `lib/wenshiFollowup.js` | 纯函数单测 |
| 2 | `handleBaziFollowup` 的 answer/new_matter 路径（不含补算） | `worker/src/index.js` `/api/bazi-followup` | 重读/深挖类端到端 |
| 3 | 前端 bazi 适配：解锁 `canFollowup`、`buildBaziOrigin`、`extractBaziSections`、增补烘焙进 `buildBaziQuestionCardHTML`、SSE 分支、落库/历史 | `src/views/HomeView.vue` | UI 锚定增补 + 刷新可见 |
| 4 | recompute 一跳：`route_delta`→`run*Pipeline`→`formatDynamicReportForPrompt` | `worker/src/index.js` | 流年/大运/换靶类跑通 |
| 5 | 审计（复用 `qimen_followup_audit`，字段语义重映射：classifier_*→决策跳、patch_*→回答跳，加记 route_delta + dynamicReport）+ 单测补全 | — | 留痕完整 |

第 1–3 步 = 八字「深挖类」可上线（覆盖多数）；第 4 步补「时间/换靶类」。

**默认（已定）**：① seed = `profileId` + 后端 fetch 命盘（八字本就强制登录，RLS 无碍，payload 小）；② 先八字单独做这套，奇门维持旧两节点。

### 9.3.1 step 1 落地校准（对照生产 `bazi_question_audit.llm_prompt_text` 后确定）

- **证据块 = 首轮逐字同款（方向 A）**：证据由 `extractBaziQuestionContext(profile)` → `formatBasicProfileBlock` + `formatUpstreamAnalysisBlock` + `formatTargetSpec/State/DynamicReportForPrompt` 产出（含命主基础信息/格局/调候/取用链路/目标十神状态/候选年份断语包）。这是首轮的单一真相，**不再手搓子集**。
  - 落地：worker 用 `profileId` fetch 命盘 → 按首轮 route 跑同一 `run*Pipeline` → 用上述 format 函数拼出 `evidenceText` → 传给 `buildBaziFollowupPrompt({ evidenceText })`。
  - `wenshiFollowup.buildBaziEvidenceNarrative` 仅作缺省兜底（无 profile 时的降级），主路径走 `evidenceText`。
  - 这一组合应抽到 `baziQuestionCore` 的导出函数（如 `buildBaziEvidenceBlock`），首轮 mode builders 与追问共用。
- **route_delta 用双轴**（FRAMEWORK ⟂ TARGET_SOURCE，与 `baziQuestionCore` 原生消费一致）：
  - framework 轴：`static_structure | dynamic_current | dynamic_scan | portrait | open_strategy`
  - target_source 轴：`backend_shishen | yongshen | llm_derived`（换领域/换靶 = 动此轴 + 新 `category`，即 §9.4 用神取用轴）
  - 时间粒度归 `time_scope`（方向 1）：逐年 `dynamic_scan`+`{start_year,end_year}`；**流月** `{type:"month_scan", year}`（补算调 `fortuneMonthlyCore.buildMonthlyFortunePayload`），framework 轴不增值。
- **first-hop prompt 内容**：evidenceText + 原各段 + 历轮增补（截最近 2–3 轮）+ **首轮原问题** + 本次追问 + 决策协议。原问题必带（否则追问脱离上下文）。
- **token 控量**：证据只用 format* 紧凑断语，**不塞** `sizhu_matrix`/原始 JSON；历轮增补截断；体量与首轮 prompt 同量级（~8K）。
- **第二跳不重跑 base**：一次请求内 `evidenceText` 只拼一次、内存复用；recompute 只跑**窄补算**（`assessDynamicTriggers`/`calculateAnnualScore`/`buildMonthlyFortunePayload`），不重算 base pipeline。
- **决策归一化**：`normalizeBaziFollowupDecision`（未知 action→answer；new_matter 短路；recompute 空 delta→降级 answer）+ `normalizeRouteDelta`（双轴白名单，`time_scope` 原样透传）。

## 9.4 奇门要不要也用这套？—— 取决于「用神取用是否确定」

**结论：架构（单主-LLM + 全量上下文 + 封顶一跳决策）共用。奇门的盘出即冻结，但它仍有一个不可让 LLM 临场发挥的确定性环节——按领域取用神（`qimenYongshenRules`），等同八字的 TARGET_SOURCE 轴。所以奇门的 recompute 分支不是「空」，而是「应期 + 重取用神」两个确定性后端。**

关键差异在两种术数的「轴」是否在出盘后被冻结：

| | 八字 | 奇门 |
|---|---|---|
| 盘面 / 时间轴 | 命盘固定，但**时间轴（大运/流年）随追问年份而变**，需逐年重算 | **起局即冻结**，无时间轴重算 |
| 用神取用（TARGET_SOURCE 轴） | 喜用神需算旺衰/调候/格局（多步），由 `resolveTarget` 定 | **按领域查规则表**，由 `lib/qimenYongshenRules.js` 的 `domainView.axes` 定（事业取值符/开门、婚取六合、疾取天芮/死门…），相对确定但**仍是后端规则** |

**奇门追问分三类**（这是上一版漏掉第 3 类的修正）：

1. **纯重读（同用神）**：「这个方向具体怎样」→ 全盘已在 context，主 LLM 直接 `answer`。
2. **重读（用户点名宫位）**：「换看官鬼宫」→ 用户已指定，LLM 读那宫即可。
3. **换领域 → 重取用神（retarget）**：「那感情那块呢」→ 新领域该读哪些星/门/宫，**必须由 `qimenYongshenRules` 决定**。若直接让 LLM「重读」，它可能自己猜错映射（婚不知取六合），与首轮后端用神取用不一致。→ 走 `recompute` 分支。

**第 3 类的处理（盘冻结，故比八字轻）：**
```
主 LLM 判定：换领域、同一局
  → recompute, route_delta = { category: "relationship" }
  → 代码：qimenYongshenRules["relationship"].axes → 定出该读哪些星/门/宫
        → 从冻结的原盘九宫取这些宫的状态（确定性，不重算盘）
  → 主 LLM 第二跳：拿「规则定好的用神 + 宫位状态」写增补（LLM 不决定取哪个用神）
```
要点：**用神取用永远由 `qimenYongshenRules` 出，LLM 只读规则结果**——与八字 `route_delta` 的 TARGET_SOURCE 轴同一机制，奇门只是少了时间轴。

推论：
- 奇门**该**采用统一的判断节点设计（单主-LLM、全量上下文 → 修 Phase 1 flash 判断器上下文太薄；并让换领域走规则而非 LLM 猜）。
- §9.1 的「问题 2（注册表=双轴二次封装）」对奇门**部分成立**：奇门没有八字那样的时间轴 pipeline，但**有** TARGET_SOURCE 轴（`qimenYongshenRules`）。所以奇门 recompute 后端 = 应期（`timingCandidates`）+ 重取用神（`qimenYongshenRules`）两块确定性逻辑，仍应走 `route_delta` 而非独立 capability 分类法。
- **共用架构骨架（一个主 LLM、决策 answer/new_matter/recompute、封顶一跳）；branch-specific 的是 recompute 后端**——八字再入 `run*Pipeline`（含时间轴），奇门重跑 `qimenYongshenRules` + 至多 `timingCandidates`（盘不重算）。

**待定子问题**：换领域到什么程度算 same_casting 的 retarget、到什么程度算 `new_matter`（古法一事一占）。倾向保守：明显跨事 → new_matter；同事换面向（如「事业」→「该事里上级的态度」）→ retarget。由主 LLM 判，规则兜底。

落地建议：先在八字把这套跑顺；回收奇门时，retarget 直接复用 `qimenYongshenRules`（首轮已在用），迁移成本仍低。

## 9.5 回收奇门待办（八字验证通过后执行，勿提前给将拆掉的两节点打补丁）

现状缺口：当前奇门追问只有 `yingqi(stub)/fangwei(reread)/regong(reread)`，**缺 `retarget`（换领域重取用神）**，导致换领域追问要么被增补 LLM 自行猜用神（与首轮后端不一致 = bug），要么被判 `new_matter` 挡掉。保守兜底不出错，故无线上事故压力，不热修，随回收一并根治。

- [ ] 奇门主 LLM **决策 prompt**：加 `recompute` 分支，`route_delta` 支持 `{ category }`（retarget）与 `timing` 标志（应期）。
- [ ] 后端 recompute（在冻结原盘上补，不重排盘）：
  - [ ] `retarget`：`qimenYongshenRules[category].domainView.axes` → 取对应星/门/宫 → 从原盘九宫读状态 → 自然语言 `extra_evidence`。**用神取用由规则出，LLM 只读结果。**
  - [ ] `yingqi`：把现有 stub 换成真调 `lib/qimenScoringEngine.timingCandidates` / `getTimingRecovery`（从回传种子 `cast_at`+`cast_params` 复现局后取 timingAnalysis）。
- [ ] retarget vs new_matter 边界细化（§9.4 待定子问题）：跨事→new_matter，同事换面向→retarget，主 LLM 判 + 规则兜底。
- [ ] 删除 `FOLLOWUP_CAPABILITIES.qimen` 独立分类法，奇门改走 `route_delta`（与八字统一）。
- [ ] 删除旧两节点 `buildFollowupClassifierPrompt`（回收后两术数都不再用 flash 判断器）。
- [ ] 前端奇门 SSE 分支对齐统一架构的事件（decision/recompute/patch_*）。
