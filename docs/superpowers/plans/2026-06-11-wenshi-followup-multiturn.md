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
