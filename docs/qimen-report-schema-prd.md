# 奇门报告新 UI 数据结构 PRD

> 创建日期：2026-05-25
> 目标分支：`preview/new-ui`
> 相关文件：`lib/qimenPromptSections.js`、`worker/src/index.js`、`src/views/HomeView.vue`

---

## 背景

`preview/new-ui` 正在把奇门结果页改成更强叙事感的报告形态。当前前端主要依赖：

- `summary`
- `analysis`
- `advice`
- `domain_view`
- `display_blocks`
- `qimen_data`
- `backend_score_audit`
- `timing_analysis`

这些字段能支撑“总判、局势、建议”的文章式展示，但不适合稳定渲染新的 M1-M4 模块：

1. **M1 结论先行**：问题、总判、分数、行动建议。
2. **M2 奇门定基**：排盘信息、九宫格、格局吉凶、用神卡片。
3. **M3 局象推演**：自身状态、目标事态、制约因素、生克决断。
4. **M4 开运指南**：环境风水、时空行为。

核心问题不是旧字段不能用，而是旧字段语义过松：

- `display_blocks.situation/support/risk/timing` 是文章段落，不是术理推演顺序。
- `analysis.yong_shen` 是长文，不能稳定卡片化。
- `domain_view.axes` 是领域轴，不等于“用神提取卡片”。
- `advice.lucky_tips.direction/time/action` 太短，无法支撑“环境风水 + 时空行为”的精致模块。

---

## 决策

采用 **新 schema 作为唯一 LLM 用户态输出 + 旧字段由后端兼容派生**。

新增顶层字段：

```json
{
  "qimen_report": {
    "m1_conclusion": {},
    "m2_basis": {},
    "m3_inference": {},
    "m4_guidance": {}
  }
}
```

LLM 必填顶层字段收敛为：

```json
{
  "intent_audit": {},
  "score_review": {},
  "timing_review": {},
  "qimen_report": {}
}
```

以下旧展示字段不再要求模型输出：

- `summary`
- `analysis`
- `advice`
- `domain_view`
- `display_blocks`

以下审计字段必须继续输出，用于 `qimen_question_audit`、问题回放和后续调参排查：

- `intent_audit`
- `score_review`
- `timing_review`

原因：

- 新 UI 直接读取 `qimen_report`，结构稳定。
- 旧 UI、历史记录和落库数据继续可用。
- 旧记录没有 `qimen_report` 时，前端可以从旧字段 fallback。
- 新记录若仍需要旧展示字段兼容，由后端从 `qimen_report` 派生，不再消耗 LLM 输出预算。
- 审计流程字段仍由 LLM 输出并落入审计快照，不从 `qimen_report` 派生。
- 后端可对 `qimen_report` 中的分数、盘面、格局、关系等可靠字段做补全或覆盖，避免 LLM 幻觉。

---

## 模块字段与来源

### M1 结论先行

```json
{
  "m1_conclusion": {
    "question": "",
    "title": "",
    "keyword": "",
    "conclusion": "",
    "score": 0,
    "verdict_label": "大吉|小吉|平|凶",
    "tone": "strong|good|medium|cautious|low",
    "score_basis": {
      "positive_signals": [],
      "negative_signals": [],
      "score_logic": ""
    },
    "actions": []
  }
}
```

| 字段 | 来源 | 说明 |
|------|------|------|
| `question` | 后端 | 来自用户问题，等同现有 `question`。 |
| `title` | LLM | `qimen_report.m1_conclusion.title`，替代旧 `summary.title`。 |
| `keyword` | LLM | `qimen_report.m1_conclusion.keyword`，替代旧 `summary.keyword`。 |
| `conclusion` | LLM | `qimen_report.m1_conclusion.conclusion`，替代旧 `summary.conclusion`。 |
| `score` | 后端覆盖 | 后端最终分 `finalScore`，等同 `summary.score`。 |
| `verdict_label` | 后端/前端派生 | 根据 `score` 生成，大吉/小吉/平/凶。 |
| `tone` | 后端/前端派生 | 根据 `backend_score_audit.level` 或 `score` 生成。 |
| `score_basis` | LLM + 后端清洗 | 替代旧 `summary.score_basis`。 |
| `actions` | LLM | 替代旧 `advice.strategy`，固定 3 条。 |

### M2 奇门定基

```json
{
  "m2_basis": {
    "chart_summary": {
      "pillars": {},
      "timestamp": {},
      "ju_info": {},
      "auxiliary": {}
    },
    "palaces": [],
    "formation_tags": [],
    "yongshen_cards": []
  }
}
```

#### `chart_summary`

| 字段 | 来源 | 说明 |
|------|------|------|
| `pillars` | 后端 | `qimen_data.pillars`。 |
| `timestamp` | 后端 | `qimen_data.timestamp`。 |
| `ju_info` | 后端 | `qimen_data.ju_info`，包含阴阳遁局、节气、旬首、值符、值使。 |
| `auxiliary` | 后端 | `qimen_data.auxiliary`，包含空亡、马星。 |

#### `palaces`

| 字段 | 来源 | 说明 |
|------|------|------|
| `palaces[]` | 后端 | 直接复用 `qimen_data.palaces[]`。前端九宫格不依赖 LLM。 |

#### `formation_tags`

```json
{
  "name": "",
  "type": "ji|xiong",
  "effect": "",
  "reason": "",
  "text": ""
}
```

| 字段 | 来源 | 说明 |
|------|------|------|
| `name` | 后端 | `backend_score_audit.adjustments[].signal`，筛选 `layer === "named_formation"`。 |
| `type` | 后端派生 | `effect` 以 `+` 开头为 `ji`，以 `-` 开头为 `xiong`。 |
| `effect` | 后端 | `backend_score_audit.adjustments[].effect`。 |
| `reason` | 后端 | `backend_score_audit.adjustments[].reason`。 |
| `text` | 前端/后端可派生 | 现有 `GE_DESCRIPTIONS` 可继续兜底。 |

#### `yongshen_cards`

用神提取改为卡片组，不再只是“问测人 = 日干；目标事态 = 时干”的单行文本。

```json
{
  "key": "subject|target|environment|custom",
  "label": "问测人状态",
  "symbol": "日干 戊",
  "palace": "坤二宫",
  "tone": "positive|mixed|warning",
  "badge": "顺|参|慎",
  "verdict": "",
  "evidence": ""
}
```

| 字段 | 来源 | 说明 |
|------|------|------|
| `key` | LLM + 后端规则约束 | 固定优先输出 `subject`、`target`、`environment`。 |
| `label` | LLM | 面向具体问题命名，如“失主状态”“失物状态”“被盗可能”。 |
| `symbol` | 后端规则 + LLM | 来自 `yongshenRule.yongshen.primary/secondary/contextual` 与日干、时干。 |
| `palace` | 后端可补全 | 根据 `symbol` 在 `qimen_data.palaces[]` 中匹配。 |
| `tone` | LLM | `positive/mixed/warning`。 |
| `badge` | 前端派生 | `positive -> 顺`，`mixed -> 参`，`warning -> 慎`。 |
| `verdict` | LLM | 一句话状态判断。 |
| `evidence` | LLM | 必须引用落宫、门、星、神、空亡、马星或生克依据。 |

### M3 局象推演

```json
{
  "m3_inference": {
    "subject_state": {},
    "target_state": {},
    "environment_state": {},
    "support_factors": {},
    "constraint_factors": {},
    "interaction_decision": {}
  }
}
```

#### 通用推演结构

```json
{
  "symbol": "",
  "palace": "",
  "tone": "positive|mixed|warning",
  "reading": ""
}
```

| 子模块 | 字段来源 | 说明 |
|--------|----------|------|
| `subject_state` | 后端日干落宫 + LLM解释 | 固定分析“求测人/发问方”。只输出 `symbol/palace/tone/reading`。 |
| `target_state` | 后端用神/时干落宫 + LLM解释 | 固定分析“目标事态/物品/对方”。只输出 `symbol/palace/tone/reading`。 |
| `environment_state` | 值使门/值符 + LLM解释 | 固定分析流程管道与外部条件。只输出 `symbol/palace/tone/reading`。 |
| `support_factors` | 后端有利证据 + LLM提炼 | 只输出 `tone/summary/items[]`，items 每项 `name/impact`。 |
| `constraint_factors` | 后端调整项 + LLM解释 | 只输出 `tone/summary/items[]`，只保留 1-3 个关键因素，不堆术语。 |
| `interaction_decision` | 后端 `backend_score_audit.relations[]` + LLM解释 | 输出 `subject_symbol/target_symbol/tone/decision/reason`，承接生克关系与现实含义。 |

#### `constraint_factors` 额外字段

```json
{
  "primary_risk": "",
  "factors": [
    {
      "name": "",
      "source_symbol": "",
      "palace": "",
      "impact": ""
    }
  ]
}
```

| 字段 | 来源 | 说明 |
|------|------|------|
| `primary_risk` | LLM + 后端风险信号 | 一句话点明最主要制约，例如“信息过载”“流程空转”“对方意愿弱”。 |
| `factors[]` | 后端调整项 + LLM解释 | 每项必须对应空亡、凶门、凶星、凶格、值使流程、风险校准中的具体依据。 |

#### `interaction_decision` 额外字段

```json
{
  "subject_symbol": "日干 戊",
  "target_symbol": "时干 癸",
  "relation": "target_generates_subject|same|target_controls_subject|subject_controls_target|subject_generates_target|unknown"
}
```

| 字段 | 来源 | 说明 |
|------|------|------|
| `subject_symbol` | 后端 | 求测人符号，默认日干。 |
| `target_symbol` | 后端 + 用神规则 | 目标符号，优先领域主用神，其次时干。 |
| `relation` | 后端派生 | 从 `backend_score_audit.relations[0].relation` 映射。 |
| `verdict` | LLM | 把生克关系转译成用户能理解的结论。 |
| `evidence` | LLM + 后端 | 承接 `backend_score_audit.relations[0].reason`。 |

### M4 开运指南

```json
{
  "m4_guidance": {
    "environment_fengshui": {
      "direction": "",
      "avoid_direction": "",
      "environment_advice": "",
      "reason": ""
    },
    "timing_behavior": {
      "best_window": "",
      "wait_until": "",
      "action": "",
      "avoid_action": "",
      "reason": ""
    }
  }
}
```

| 字段 | 来源 | 说明 |
|------|------|------|
| `environment_fengshui.direction` | LLM | 替代旧 `advice.lucky_tips.direction`。 |
| `environment_fengshui.avoid_direction` | LLM | 旧字段无稳定来源，新增。 |
| `environment_fengshui.environment_advice` | LLM | 环境布置、沟通方位、空间选择。 |
| `environment_fengshui.reason` | LLM | 必须说明盘面依据，不空泛。 |
| `timing_behavior.best_window` | 后端候选 + LLM | 优先基于 `timing_analysis.p2_scan.candidates[]`，替代旧 `advice.lucky_tips.time`。 |
| `timing_behavior.wait_until` | LLM | 若不宜立即行动，说明等待条件。 |
| `timing_behavior.action` | LLM | 替代旧 `advice.lucky_tips.action`。 |
| `timing_behavior.avoid_action` | LLM | 旧字段无稳定来源，新增。 |
| `timing_behavior.reason` | LLM + 后端候选 | 必须基于应期候选或明确写暂无窗口。 |

---

## LLM 修改方案

### 1. 输出契约

修改 `buildQimenOutputContractSection`：

- 顶层必填只保留 `intent_audit`、`score_review`、`timing_review`、`qimen_report`。
- 其中 `intent_audit`、`score_review`、`timing_review` 属于审计流程字段，必须继续进入审计快照。
- 下线旧展示字段的 LLM 必填要求：`summary`、`analysis`、`advice`、`display_blocks`、`domain_view`。
- `domain_view.axes` 的领域拆分能力迁移到 `qimen_report.m2_basis.yongshen_cards`：后端 rule 继续定义 axes，LLM 按 axes 填卡片内容。
- 明确 `qimen_report` 的四个子模块必填。
- 明确模型不得输出最终分数权威字段，`m1_conclusion.score` 如果输出也会被后端覆盖。
- 明确如果模型额外输出旧展示字段，后端可以忽略或用后处理覆盖，不作为契约依赖。

### 2. 前端断语协议

修改 `buildFrontendCopyProtocolSection`：

- 增加 `qimen_report.m2_basis.yongshen_cards[]` 写作要求：优先按后端领域 axes 逐项输出；无 axes 时才退回通用三卡。
- 增加 `qimen_report.m3_inference` 六段写作要求：翻译层 `reading`，提炼层 `summary + items[]`，拍板层 `decision + reason`。
- 增加 `qimen_report.m4_guidance` 写作要求。
- 约束 M3 不再要求模型输出 `label`、`verdict`、`evidence`、`key_components`、`user_implication`。

### 3. 后端后处理

修改 `worker/src/index.js`：

- 保留 `aiJsonData.qimen_report`。
- 后端覆盖或补全：
  - `qimen_report.m1_conclusion.question`
  - `qimen_report.m1_conclusion.score`
  - `qimen_report.m1_conclusion.verdict_label`
  - `qimen_report.m1_conclusion.tone`
  - `qimen_report.m1_conclusion.score_basis`
  - `qimen_report.m1_conclusion.actions`
  - `qimen_report.m2_basis.chart_summary`
  - `qimen_report.m2_basis.palaces`
  - `qimen_report.m2_basis.formation_tags`
  - `qimen_report.m3_inference.interaction_decision.relation`
- 从 `qimen_report` 派生 legacy 字段，供旧前端/历史展示兼容：
  - `summary`
  - `analysis`
  - `advice`
  - `display_blocks`
  - `domain_view` 不再由新 prompt 要求输出，只保留旧记录原值作为前端 fallback。
- 保留 LLM 原始审计流程字段进入审计快照：
  - `intent_audit`
  - `score_review`
  - `timing_review`
- 如果 LLM 缺 `qimen_report`，后端只做最小失败兜底，不再依赖旧字段补生成新结构。

### 4. 测试

新增或更新测试：

- `lib/qimenPromptSections.test.js`
  - 断言 output contract 包含 `qimen_report`。
  - 断言 output contract 仍要求 `intent_audit`、`score_review`、`timing_review`。
  - 断言 output contract 不再要求旧展示字段 `analysis`、`display_blocks`、`advice`、`summary`、`domain_view`。
  - 断言 frontend protocol 包含 `yongshen_cards`、`m3_inference`、`m4_guidance`。
- `src/views/HomeView.domain-view.test.mjs`
  - 断言前端优先读取 `qimen_report`。
  - 断言旧字段 fallback 仍存在。
- 如新增后处理 helper，增加对应 worker/lib 单测。

---

## Prompt 修改详案

### 当前 Prompt 结构（修改前）

当前 `worker/src/index.js` 组装 prompt 时，核心段落顺序如下：

1. `buildYongshenPromptSection`
2. `buildQimenInferenceRulesSection`
3. 静态断吉凶说明
4. 动态应期说明
5. 行动建议说明
6. `buildScoreAuditPromptSection`
7. `buildSummaryPromptSection`
8. `buildDomainViewPromptSection`
9. `buildPolarityPromptSection`
10. `buildTimingPromptSection`
11. `buildFrontendCopyProtocolSection`
12. `buildQimenOutputContractSection`

当前模型必须输出的顶层字段：

```json
{
  "summary": {},
  "intent_audit": {},
  "score_review": {},
  "analysis": {},
  "advice": {},
  "domain_view": {},
  "timing_review": {},
  "display_blocks": {}
}
```

当前输出问题：

- `summary` 与 `display_blocks` 都在表达“总判/局势”，存在语义重叠。
- `analysis.yong_shen` 是长文，无法稳定渲染成用神卡片。
- `domain_view.axes` 是领域轴，不是通用的 subject/target/environment 用神结构。
- `display_blocks.situation/support/risk/timing` 不符合 M3 的推导顺序。
- `advice.lucky_tips` 只能提供短句，不足以支撑 M4。
- 旧展示字段增加模型输出负担，也让前端需要二次拼装。

### 目标 Prompt 结构（修改后）

保留推理输入段落，但调整输出 contract 和前端写作协议：

1. `buildYongshenPromptSection`
2. `buildQimenInferenceRulesSection`
3. 静态断吉凶说明
4. 动态应期说明
5. 行动建议说明
6. `buildScoreAuditPromptSection`
7. `buildReportSchemaPromptSection`（新增）
8. `buildPolarityPromptSection`
9. `buildTimingPromptSection`
10. `buildFrontendCopyProtocolSection`（改为服务 `qimen_report`）
11. `buildQimenOutputContractSection`（收敛输出字段）

修改后模型必须输出的顶层字段：

```json
{
  "intent_audit": {},
  "score_review": {},
  "timing_review": {},
  "qimen_report": {}
}
```

不再要求模型输出旧展示字段：

```json
{
  "summary": "由后端从 qimen_report 派生或兼容旧记录",
  "analysis": "由后端从 qimen_report 派生或不再写入",
  "advice": "由后端从 qimen_report 派生",
  "domain_view": "不再要求输出，仅旧记录 fallback",
  "display_blocks": "由后端从 qimen_report 派生"
}
```

### 新增 `buildReportSchemaPromptSection`

建议新增一个独立 prompt section，而不是把所有要求塞进 `buildQimenOutputContractSection`。

职责：

- 约束 `qimen_report` 的字段形状。
- 约束 M1-M4 的推导顺序。
- 约束卡片字段与 M3 `reading/summary/items/decision/reason` 的写法。
- 明确哪些字段模型可以写，哪些字段会被后端覆盖。

建议 prompt 文案：

```text
**【新 UI 报告结构：qimen_report】**
你必须输出 qimen_report，供前端直接渲染 M1-M4 报告。qimen_report 是唯一用户态展示结构。
旧展示字段 summary、analysis、advice、display_blocks、domain_view 不再需要你输出。domain_view 只作为旧记录 fallback。

qimen_report 必须包含：
1. m1_conclusion：结论先行。
2. m2_basis：奇门定基。
3. m3_inference：局象推演。
4. m4_guidance：开运指南。

所有 evidence 必须引用具体盘面依据，至少包含以下之一：
落宫、门、星、神、天地盘干、空亡、马星、有名格、日时生克、后端应期候选。

tone 只能是 positive、mixed、warning。
badge 不需要输出，由前端从 tone 派生。
score、verdict_label、chart_summary、palaces、formation_tags、interaction_decision.relation 会由后端补全或覆盖。
```

### 修改后的 LLM JSON Schema

模型输出必须是单个 JSON 对象：

```json
{
  "intent_audit": {
    "route_confidence": "low|medium|high",
    "is_route_acceptable": true,
    "is_role_acceptable": true,
    "suggested_category": "",
    "suggested_subcategory": "",
    "suggested_role": "client|master|observer|auto",
    "reason": ""
  },
  "score_review": {
    "audit_delta": 0,
    "confidence": "low|medium|high",
    "role_review": "",
    "layer_reviews": [],
    "audit_delta_breakdown": [],
    "missed_or_overweighted_factors": [],
    "audit_reason": ""
  },
  "timing_review": {
    "summary": "",
    "usable_candidates": [],
    "limitations": []
  },
  "qimen_report": {
    "m1_conclusion": {
      "title": "",
      "keyword": "",
      "conclusion": "",
      "score_basis": {
        "positive_signals": [],
        "negative_signals": [],
        "score_logic": ""
      },
      "actions": []
    },
    "m2_basis": {
      "yongshen_cards": []
    },
    "m3_inference": {
      "subject_state": {},
      "target_state": {},
      "environment_state": {},
      "support_factors": {},
      "constraint_factors": {},
      "interaction_decision": {}
    },
    "m4_guidance": {
      "environment_fengshui": {},
      "timing_behavior": {}
    }
  }
}
```

说明：

- `qimen_report.m1_conclusion.question/score/verdict_label/tone` 不要求模型输出，由后端补全。
- `qimen_report.m2_basis.chart_summary/palaces/formation_tags` 不要求模型输出，由后端补全。
- `qimen_report.m3_inference.interaction_decision.relation` 不要求模型输出，由后端补全。
- 模型如误输出这些字段，后端覆盖。

### `qimen_report` 详细 schema

#### M1 结论先行

```json
{
  "m1_conclusion": {
    "title": "8-14字问题标题",
    "keyword": "4-12字核心判断词",
    "conclusion": "35-80字总判，说明倾向、边界和关键原因",
    "score_basis": {
      "positive_signals": ["24-60字有利依据"],
      "negative_signals": ["24-60字风险依据"],
      "score_logic": "50-100字分数逻辑，不提后端、模型、程序"
    },
    "actions": [
      "动词开头，28-70字，可执行建议",
      "固定输出3条",
      "不得超过3条"
    ]
  }
}
```

推导逻辑：

1. 先读后端初分和 LLM 审计后的分数区间，但不输出权威分数。
2. 从核心用神、主客关系、格局、空亡/马星、应期候选中抽一个最关键主线。
3. 用一句总判说明“可推进/宜观察/需保守”的边界。
4. 行动建议必须从盘面风险反推，不写泛泛鸡汤。

#### M2 奇门定基

```json
{
  "m2_basis": {
    "yongshen_cards": [
      {
        "key": "subject",
        "label": "问测人状态",
        "symbol": "日干 戊",
        "palace": "坤二宫",
        "tone": "mixed",
        "verdict": "底气尚有但陷入死理",
        "evidence": "日干戊落坤宫，临死门与朱雀，表示求测人当前容易反复论证但行动卡住。"
      },
      {
        "key": "target",
        "label": "目标事态",
        "symbol": "时干 癸",
        "palace": "坎一宫",
        "tone": "positive",
        "verdict": "目标本身可用但尚未完全落地",
        "evidence": "时干癸所在宫位得休门和值符，说明目标有质量或机会，但若逢空则仍待落实。"
      },
      {
        "key": "environment",
        "label": "关键环境因素",
        "symbol": "天蓬",
        "palace": "坎一宫",
        "tone": "warning",
        "verdict": "存在过度消耗或信息不透明",
        "evidence": "天蓬主暗耗与贪多，若与目标宫同现，提示需要控制预算和信息风险。"
      }
    ]
  }
}
```

推导逻辑：

1. `subject` 固定优先取日干；如果有年命且问题需要，可在 evidence 中补充年命，但不要替代日干。
2. `target` 根据问题域取主用神：优先 `yongshenRule.yongshen.primary`，通用问题可用时干。
3. `environment` 根据问题域取辅用神/情境用神：例如失物可取天蓬/玄武，财务可取生门/戊，关系可取六合/乙庚。
4. 每张卡必须说明“符号 + 落宫 + 门星神/空亡马星 + 用户态含义”。
5. 不得只写术语，不得只输出格局名称。

#### M3 局象推演

```json
{
  "m3_inference": {
    "subject_state": {
      "symbol": "日干 戊",
      "palace": "坤二宫",
      "tone": "mixed",
      "reading": "日干戊落坤宫，临死门与朱雀，并见空亡，表示求测人当前思路反复、行动感不足。"
    },
    "target_state": {
      "symbol": "时干 癸",
      "palace": "坎一宫",
      "tone": "positive",
      "reading": "时干癸落坎宫，临休门和值符，目标本身有稳定与长期可用的信号。"
    },
    "environment_state": {
      "symbol": "值使 休门",
      "palace": "坎一宫",
      "tone": "mixed",
      "reading": "值使门落坎宫，流程偏向保守与等待，适合先确认条件再推进。"
    },
    "support_factors": {
      "tone": "positive",
      "summary": "目标端有长期稳定价值，可作为升级的主要支撑。",
      "items": [
        {
          "name": "目标状态稳定",
          "impact": "值符与休门同宫，代表换来的是长期安稳和少折腾。"
        }
      ]
    },
    "constraint_factors": {
      "tone": "warning",
      "summary": "主要阻力是信息过载与过度消费感。",
      "items": [
        {
          "name": "天网四张",
          "impact": "提示不要继续堆参数，否则会增加焦虑而不是帮助决策。"
        }
      ]
    },
    "interaction_decision": {
      "subject_symbol": "日干 戊",
      "target_symbol": "时干 癸",
      "tone": "mixed",
      "decision": "可以推进，但不要继续扩大配置。",
      "reason": "日干与时干关系显示本人能消化这次消费，但空亡与凶格要求控制边界。"
    }
  }
}
```

推导逻辑必须按顺序执行：

1. **subject_state**：先看日干落宫，只用 `reading` 描述求测人当前承接力、心态和行动状态。
2. **target_state**：再看目标用神落宫，只用 `reading` 描述事情本身是否有力、是否虚、是否可动。
3. **environment_state**：再看值使门和值符，说明流程管道与外部条件。
4. **support_factors**：提炼有利因素，用 `summary + items[]`，不要再输出 `verdict/evidence`。
5. **constraint_factors**：提炼不利因素，用 `summary + items[]`，只选 1-3 个关键因素，不堆术语。
6. **interaction_decision**：最后用日干宫与目标宫/时干宫的生克关系做最终互动判断，用 `decision + reason`。

约束：

- M3 不要求 LLM 输出 `label`、`key_components`、`user_implication`、`verdict`、`evidence`。
- `interaction_decision.reason` 必须承接 `backend_score_audit.relations[0].reason` 的现实含义。
- 若后端没有明确关系，写 `relation unknown` 对应的现实解释，不得自行发明宫位关系。
- `support_factors.items[]` 和 `constraint_factors.items[]` 每项只保留 `name`、`impact`。
- `constraint_factors` 必须包含至少一个具体风险，不允许只写“谨慎”。

#### M4 开运指南

```json
{
  "m4_guidance": {
    "environment_fengshui": {
      "direction": "",
      "avoid_direction": "",
      "environment_advice": "",
      "reason": ""
    },
    "timing_behavior": {
      "best_window": "",
      "wait_until": "",
      "action": "",
      "avoid_action": "",
      "reason": ""
    }
  }
}
```

推导逻辑：

1. **环境风水**：从有利宫位、目标用神宫、值使门宫、避险宫位中提炼空间建议。
2. **时空行为**：只能基于后端 `timing_analysis` 候选或明确写暂无窗口。
3. 如果盘面不宜主动推进，`action` 应写“先观察再行动”一类保守动作。
4. `avoid_action` 必须对应 M3 的制约因素，不得另起无依据的新风险。

### 审计流程字段保留要求

#### `intent_audit`

继续用于审计分类、子分类、role 是否合理。保留原因：

- `qimen_question_audit.llmOutputNormalized.intent_audit`
- 未来分类错误追踪
- route confidence 调参

#### `score_review`

继续用于审计后端初分。保留原因：

- 后端需要 `score_review.audit_delta` 计算最终分。
- 需要 `layer_reviews`、`missed_or_overweighted_factors` 追踪模型为何修分。
- 不属于前端展示字段，不能下线。

#### `timing_review`

继续用于审计应期候选。保留原因：

- 后端 `timing_analysis.llm_summary` 当前承接 `rawLlmTimingReview`。
- `qimen_question_audit` 需要记录模型对应期候选的可用性判断。
- 新 UI 的 M4 使用 `qimen_report.m4_guidance.timing_behavior`，但审计仍看 `timing_review`。

建议 schema：

```json
{
  "timing_review": {
    "summary": "对应期候选整体是否可用的审计意见",
    "usable_candidates": [
      {
        "date": "",
        "hour": "",
        "target_symbol": "",
        "trigger": "",
        "confidence": "low|medium|high",
        "reason": ""
      }
    ],
    "limitations": [
      "应期只代表启动/催动，不代表结果必然落地"
    ]
  }
}
```

### 修改前后对照

| 类型 | 修改前 | 修改后 |
|------|--------|--------|
| 用户态总判 | `summary` | `qimen_report.m1_conclusion`，后端派生 `summary` |
| 用神展示 | `analysis.yong_shen` 长文、`domain_view.axes` | `qimen_report.m2_basis.yongshen_cards[]`；后端领域 axes 直接喂给 M2 卡片 |
| 局象推演 | `display_blocks.situation/support/risk/timing` | `qimen_report.m3_inference.subject_state/target_state/environment_state/support_factors/constraint_factors/interaction_decision` |
| 开运指南 | `advice.lucky_tips.direction/time/action` | `qimen_report.m4_guidance.environment_fengshui/timing_behavior` |
| 分类审计 | `intent_audit` | 保留 |
| 评分审计 | `score_review` | 保留 |
| 应期审计 | `timing_review` | 保留 |
| 旧展示字段 | LLM 必填 | 不再要求 LLM 输出，由后端派生或仅旧记录 fallback |

---

## 旧字段兼容与兜底逻辑

### 新记录兼容派生

新记录的权威用户态字段是 `qimen_report`。如仍需写入旧字段，后端从 `qimen_report` 派生：

| 旧字段 | 派生来源 |
|--------|----------|
| `summary.title` | `qimen_report.m1_conclusion.title` |
| `summary.conclusion` | `qimen_report.m1_conclusion.conclusion` |
| `summary.keyword` | `qimen_report.m1_conclusion.keyword` |
| `summary.score` | 后端 `finalScore` |
| `summary.score_basis` | `qimen_report.m1_conclusion.score_basis` |
| `advice.strategy` | `qimen_report.m1_conclusion.actions` |
| `advice.risk` | `qimen_report.m3_inference.constraint_factors.summary` 或 `items[].impact` |
| `advice.lucky_tips.direction` | `qimen_report.m4_guidance.environment_fengshui.direction` |
| `advice.lucky_tips.time` | `qimen_report.m4_guidance.timing_behavior.best_window` |
| `advice.lucky_tips.action` | `qimen_report.m4_guidance.timing_behavior.action` |
| `display_blocks.situation` | `qimen_report.m3_inference.subject_state.reading` + `target_state.reading` |
| `display_blocks.support` | `qimen_report.m2_basis.yongshen_cards` 中 positive/mixed 卡片摘要 |
| `display_blocks.risk` | `qimen_report.m3_inference.constraint_factors.summary` |
| `display_blocks.timing` | `qimen_report.m4_guidance.timing_behavior.reason` |
| `analysis.yong_shen` | `qimen_report.m2_basis.yongshen_cards` 拼接文本 |
| `analysis.pattern` | `qimen_report.m2_basis.formation_tags` 拼接文本 |
| `analysis.dynamic_timing` | `qimen_report.m4_guidance.timing_behavior.reason` |
| `domain_view` | 不再派生、不要求 LLM 输出；仅旧记录原值作为 fallback。 |
| `timing_review` | 不派生为展示字段；继续保留 LLM 原始输出用于审计表。 |

### 旧记录前端 fallback

旧记录没有 `qimen_report` 时，前端读取顺序：

1. 如果 `data.qimen_report` 存在且结构完整，使用新结构。
2. 如果缺失，使用旧字段 fallback。
3. 如果旧字段也缺失，使用最小后端盘面 fallback。

### M1 fallback

| 新字段 | fallback |
|--------|----------|
| `m1_conclusion.question` | `data.question` |
| `m1_conclusion.title` | `summary.title` |
| `m1_conclusion.keyword` | `summary.keyword` |
| `m1_conclusion.conclusion` | `summary.conclusion` |
| `m1_conclusion.score` | `summary.score` |
| `m1_conclusion.score_basis` | `summary.score_basis` |
| `m1_conclusion.actions` | `advice.strategy.slice(0, 3)` |

### M2 fallback

| 新字段 | fallback |
|--------|----------|
| `chart_summary` | `qimen_data.pillars/timestamp/ju_info/auxiliary` |
| `palaces` | `qimen_data.palaces` |
| `formation_tags` | `backend_score_audit.adjustments.filter(layer === "named_formation")` |
| `yongshen_cards` | 新记录优先 LLM 按后端领域 axes 输出；旧记录 fallback 到 `domain_view.axes` 映射；再退到 `analysis.yong_shen` 单文本卡片 |

### M3 fallback

| 新字段 | fallback |
|--------|----------|
| `subject_state` | 优先旧 `subject_day_stem_state` / `self_state`；否则从 `display_blocks.situation` 生成“自身状态”文本段 |
| `target_state` | 优先旧 `target_yongshen_state` / `target_state`；否则从 `display_blocks.support` 或 `analysis.yong_shen` 生成“目标事态”文本段 |
| `support_factors` | 优先新 `summary + items[]`；旧记录 fallback 到 `primary_support/verdict/factors[]` 或 `display_blocks.support` |
| `constraint_factors` | 优先新 `summary + items[]`；旧记录 fallback 到 `primary_risk/verdict/factors[]` 或 `display_blocks.risk` |
| `interaction_decision` | 优先旧 `m3_inference.interaction_verdict`；否则从 `backend_score_audit.relations[0]` + `display_blocks.situation` 生成 |

### M4 fallback

| 新字段 | fallback |
|--------|----------|
| `environment_fengshui.direction` | `advice.lucky_tips.direction` |
| `environment_fengshui.environment_advice` | `advice.risk` 或 `advice.strategy[0]` |
| `timing_behavior.best_window` | `advice.lucky_tips.time` 或 `timing_analysis.p2_scan.candidates[0]` |
| `timing_behavior.action` | `advice.lucky_tips.action` |
| `timing_behavior.reason` | `display_blocks.timing` 或 `timing_review.summary` |

---

## 实施计划与进度跟踪

| 阶段 | 状态 | 任务 | 文件 |
|------|------|------|------|
| P0 | ✅ 已完成 | 明确新 schema 与旧字段兼容策略 | `docs/qimen-report-schema-prd.md` |
| P1 | 🔲 待开发 | 在 prompt output contract 中改为只要求 `intent_audit`、`score_review`、`timing_review`、`qimen_report` | `lib/qimenPromptSections.js` |
| P1 | ✅ 已开发 | 下线 `summary/analysis/advice/domain_view/display_blocks` 的 LLM 必填要求；M2 按后端领域 axes 输出 | `lib/qimenPromptSections.js`, `lib/qimenYongshenRules.js` |
| P1 | 🔲 待开发 | 在 frontend copy protocol 中约束 M2/M3/M4 文案 | `lib/qimenPromptSections.js` |
| P1 | 🔲 待开发 | 添加 prompt section 单测 | `lib/qimenPromptSections.test.js` |
| P2 | 🔲 待开发 | 后端补全/覆盖 `qimen_report` 可靠字段 | `worker/src/index.js` |
| P2 | 🔲 待开发 | 后端 legacy 字段派生 helper 与单测 | `worker/src/index.js` 或 `lib/` |
| P3 | 🔲 待开发 | 前端结果页优先渲染 `qimen_report` | `src/views/HomeView.vue` |
| P3 | 🔲 待开发 | 前端旧字段 fallback 单测 | `src/views/HomeView.domain-view.test.mjs` |
| P4 | 🔲 待开发 | 视觉实现：总判 hero、M1-M4 sticky nav、用神卡片、指南卡片 | `src/views/HomeView.vue` |
| P5 | 🔲 待验证 | 本地 build、unit tests、浏览器截图验证桌面/移动端 | `npm run build`、`npm test` |

---

## 验收标准

1. 新生成的奇门结果包含 `qimen_report`。
2. 老历史记录没有 `qimen_report` 时仍能正常展示。
3. M2 用神卡片至少包含 `subject`、`target`，能根据问题域补 `environment`。
4. M3 必须稳定显示四段：自身状态、目标事态、制约因素、生克决断。
5. M4 必须稳定显示两段：环境风水、时空行为。
6. 前端不从长文中正则解析术理字段，只做结构化字段 fallback。
7. 后端权威字段不由 LLM 决定：分数、盘面、格局命中、关系枚举必须后端补全或覆盖。
8. `npm run build` 与 `npm test` 通过。
9. 浏览器验证结果页首屏总判 hero、滚动 nav、M1-M4 锚点在桌面和移动端都可用。
