---
name: qimen-dunjia
description: Use when the user requests 奇门遁甲、时家奇门、奇门排盘、奇门解盘、具体事情成败判断、应期、方位、择时、趋吉避凶，或希望继续追问同一奇门局。
---

# 奇门遁甲完整推演

## 核心定位

使用“确定性规则引擎 + 受约束模型推理”完成奇门问事。

固定计算负责盘面事实、用神定位、格局检测、评分和应期。模型负责理解开放问题、在规则低置信时提出候选目标、综合证据并生成适合当前问题的报告。

遵守四条底线：

1. 盘面事实必须来自脚本。
2. 低置信目标可以由模型推导，但必须经过白名单和盘面校验。
3. 模型推导目标只能有界参与评分。
4. 报告结构可以自由，但关键语义不得遗漏。

默认规则集为 `mainline-cn-v1`：

- 时家转盘奇门
- 拆补法定局
- 中宫寄坤
- 默认时区 `Asia/Shanghai`

## 工作模式

根据请求选择一种模式：

| 模式 | 使用条件 | 是否起局 |
| --- | --- | --- |
| 正式问事 | 判断具体事件、成败、时机、方位或行动策略 | 是 |
| 同局追问 | 继续深挖已经生成的同一局 | 否 |
| 择时择方 | 比较行动时间或方向 | 是 |
| 理论教学 | 解释规则、格局、用神或案例 | 按需 |

长期命局、先天结构和多年人生趋势通常更适合八字。用户仍明确要求奇门时，可以分析当下事件切面，但不得把一局扩大成终生命运。

## 总工作流

严格按以下顺序执行：

1. 结构化访谈
2. 问题路由
3. 固定时间起局
4. 规则 `targetSpec` 解析
5. 必要时进行模型 `targetSpec` 推导
6. 宫位、格局和关系计算
7. 问题域极性修正
8. 有界评分
9. 应期扫描
10. 生成唯一证据包
11. 模型组织用户报告
12. 校验报告的证据引用和语义覆盖

不得跳过中间步骤直接自由解盘。

## 第一步：结构化访谈

正式起局前确认：

- 所问事项：一句话说清具体事情。
- 起局时间：默认取“问事当下”，即提问时的北京时间，由脚本解析真实时辰，模型不得臆测时辰。仅当用户明确要为某个指定时刻复盘时，才使用该指定公历时间。
- 事件发生时间（如面试、开庭、签约时刻）属于“事项背景”，用于理解问题，不作为起局时间，除非用户明确要求按该时刻起盘。
- 所在城市或时区。
- 最想判断的结果：能否成、何时动、如何选、往哪走或避开什么。
- 当前现实进展。
- 主动方与被动方。
- 用户偏好：直接结论或详细讲解。

只有事项、时间、时区和判断目标均明确后才能正式起局。

以下情况优先追问：

- 问题过于宽泛，无法确定判断对象。
- 用户明确要求按某个指定时刻起盘，却只给了日期没有具体时辰。
- 海外地点没有时区。
- 问题涉及多件彼此独立的事情。
- 主客身份会显著改变判断，但当前语义不明确。

医疗、法律、投资、孕产、失踪等高风险主题必须提示现实专业路径。

详细访谈规则见 `references/interview.md`。

## 第二步：问题路由

运行路由脚本：

```bash
python scripts/route_question.py \
  --input tmp/question.json \
  --output tmp/route.json
```

路由结果至少包含：

```json
{
  "branch": "qimen",
  "category": "career_business",
  "subcategory": "job_search",
  "role": "client",
  "confidence": "high",
  "reason": ""
}
```

支持的主要领域：

- `career_business`
- `finance_wealth`
- `relationship`
- `health_action`
- `item_transaction`
- `exam_study`
- `lawsuit_legal`
- `fengshui_house`
- `pregnancy_birth`
- `general`

路由遵守：

- 规则优先。
- 规则置信度低时，允许模型辅助判断领域、子类型、主客身份和核心目标。
- 用户明确要求奇门时，不因模型判断而静默切换体系。
- 关键信息缺失时返回 `clarify`，不要强行分类。
- 路由置信度表示分类证据质量，不表示吉凶程度。

详细分类树见 `references/routing.md`。

## 第三步：固定排盘

将访谈结果写入输入文件：

```json
{
  "question": "",
  "question_goal": "",
  "time_input": "",
  "calendar_type": "solar",
  "location": {
    "country": "",
    "city": "",
    "timezone": ""
  },
  "ruleset": "mainline-cn-v1"
}
```

问事起局时 `time_input` 填 `now`，由脚本按北京时间解析当下时辰；只有指定时间盘才填明确公历时间。模型不得自行填入猜测的时辰。

运行：

```bash
python scripts/qimen_cli.py \
  --input tmp/qimen-input.json \
  --output tmp/qimen-chart.json
```

固定计算必须以脚本输出为准。脚本不可用或输出校验失败时，停止正式解盘，不得心算替代。

重点读取：

- `normalized_input`
- `calendar`
- `ganzhi`
- `chart.dun_type`
- `chart.yuan`
- `chart.ju_number`
- `chart.xunshou`
- `chart.hidden_yi`
- `chart.kongwang`
- `chart.zhifu`
- `chart.zhishi`
- `chart.palaces`（每宫除星门神干外，须含 `prosperity` 旺衰、`stem_relation` 天地盘干生克方向，供深度解读引用，不由模型臆造）
- `warnings`

中宫相关判断统一寄坤。节气边界、时区回退和寄宫情况必须保留在证据包中。

## 第四步：解析 `targetSpec`

`targetSpec` 描述“当前问题应该观察谁、观察什么符号、比较哪些关系”。

标准结构：

```json
{
  "source": "rule_mapped",
  "confidence": "high",
  "fallback_level": "subcategory",
  "subject_role": "求测人",
  "target_role": "岗位机会",
  "primary_symbols": ["日干", "开门"],
  "secondary_symbols": ["值符", "值使门", "时干"],
  "relation_focus": ["日干与开门", "日干与值符"],
  "key_questions": ["岗位是否真实有力", "决策方是否支持"],
  "reason": "",
  "limitations": []
}
```

优先从规则库按以下层级解析：

1. `subcategory`
2. `category`
3. `general`

只有 `subcategory` 精确命中可以默认视为高置信。领域级或通用级回退必须降低置信度。

读取当前领域对应的 `references/yongshen-*.md`。

## 第五步：低置信 `targetSpec` 模型推导

当满足任一条件时，允许模型使用自身推理能力提出候选 `targetSpec`：

- 规则只命中 `general`。
- 领域映射无法描述用户真正关心的对象。
- 问题存在复合语义，固定映射会丢失关键目标。
- 规则结果与用户明确表达的判断目标冲突。
- 规则 `targetSpec.confidence` 为 `low`。

信息不足造成的低置信不得直接交给模型猜测，应先追问用户。

模型只输出目标语义，不判断盘面状态：

```json
{
  "source": "llm_derived",
  "confidence": "low",
  "subject_role": "求测人",
  "target_role": "审批结果",
  "primary_symbols": ["开门", "值符"],
  "secondary_symbols": ["值使门", "时干"],
  "relation_focus": ["日干与开门", "日干与值符"],
  "key_questions": ["审批口是否支持", "流程是否真正推进"],
  "reason": "问题核心是职位审批及关键决策人的态度",
  "limitations": ["规则库未精确覆盖当前场景"]
}
```

模型不得在此阶段输出：

- 某符号实际落在哪一宫
- 某宫实际存在什么门、星、神或干
- 实际空亡、马星、旺衰或格局
- 吉凶分数
- 应期日期

### 候选校验

脚本必须对模型候选进行校验：

1. 符号是否在合法白名单中。
2. 符号是否能在当前盘面中定位。
3. 关系表达的两端是否真实存在。
4. 主用神数量是否过多。
5. 是否存在互相矛盾的目标定义。
6. 是否把现实人物身份错误等同于盘面事实。

非法项直接删除并记录原因，不得让模型补造。

校验后至少保留一个合法主目标。全部候选无效时：

- 回退到规则 `targetSpec`；或
- 向用户追问；或
- 只做通用盘势观察，并明确限制。

### 有界评分

经过校验的模型目标可以参与评分，但必须降权：

```json
{
  "scoring_policy": {
    "mode": "bounded",
    "weight": 0.5,
    "max_score_impact": 8
  }
}
```

约束：

- 模型目标只影响核心用神宫和相关关系层。
- 所有模型目标带来的总修正限制在 `-8` 到 `+8`。
- 不得改变排盘、格局命中、空亡或应期事实。
- 不得覆盖规则目标，只能补充或在明确冲突时形成可审计替代。
- 同时存在规则目标与模型目标时，分别计算后再按权重合成。
- 报告中可说明采用“开放取用”，不得展示内部权重或修正数值。

审计结果保留：

```json
{
  "target_spec_audit": {
    "rule_candidate": {},
    "llm_candidate_raw": {},
    "llm_candidate_validated": {},
    "rejected_items": [],
    "selected_target_spec": {},
    "scoring_policy": {},
    "actual_score_impact": 0
  }
}
```

## 第六步：规则评估

运行：

```bash
python scripts/evaluate_chart.py \
  --chart tmp/qimen-chart.json \
  --route tmp/route.json \
  --target-spec tmp/target-spec.json \
  --output tmp/qimen-evidence.json
```

评分顺序固定为：

1. 主客动静
2. 值符、值使等大局提纲
3. 核心用神宫
4. 有名格
5. 主体、目标和事项生克
6. 问题域极性修正
7. 高风险保守校准
8. 空亡中线回归
9. 模型目标有界修正

评分从中线开始，不把分数解释为概率。

防止重复计分：

- 空亡若已进入中线回归，不再机械扣分。
- 门迫、入墓、击刑若已进入宫位底板，不再重复扣分。
- 马星表示动象或速度，不单独大幅加分。
- 同组凶格按规则聚合，避免多次惩罚同一结构。
- 极性翻转已经处理的信号，不在其他层重复加扣。
- 模型目标不得重复计算规则目标已经覆盖的同一关系。

详细规则见：

- `references/scoring.md`
- `references/formations.md`
- `references/polarity.md`

## 第七步：问题域极性修正

同一盘面信号在不同问题中可能有不同现实含义。

例如：

- 伤门在催收、竞技中可能形成推动力，但仍带风险。
- 杜门在保密、研究、技术排查中可能代表保护或深挖。
- 玄武在调查取证中可能有用，在感情隐瞒中则是警示。
- 空亡落在坏事或风险对象上，可能削弱坏事兑现。

极性修正必须：

- 绑定当前 `category/subcategory`。
- 同时保留有利面和残余风险。
- 不把 `positive_with_risk` 洗成纯吉。
- 不修改盘面事实。

## 第八步：应期扫描

运行：

```bash
python scripts/scan_timing.py \
  --evidence tmp/qimen-evidence.json \
  --output tmp/qimen-timing.json
```

应期优先级：

1. 空亡填实或冲空
2. 马星发动
3. 墓库冲开
4. 刑冲触发
5. 逢合落实

只允许使用脚本输出的候选窗口。

应期表示可能启动、沟通、催动、兑现或适合复核的窗口，不保证现实事件必然发生。输出时结合现实常理过滤不合理时段和等待周期。

详细规则见 `references/timing.md`。

## 第九步：生成唯一证据包

最终证据包至少包含：

```json
{
  "ruleset": "mainline-cn-v1",
  "normalized_input": {},
  "route": {},
  "chart": {},
  "target_spec": {},
  "target_spec_audit": {},
  "yongshen_nodes": [],
  "formations": [],
  "relations": [],
  "polarity_overrides": [],
  "score_audit": {},
  "timing_analysis": {},
  "warnings": []
}
```

深度解读所需字段必须由引擎写入证据包，供报告引用而非模型推算：

- `chart.palaces[].prosperity`：该宫旺衰地利。
- `chart.palaces[].stem_relation`：天盘干与地盘干的生克方向（如 `天生地`、`地克天`、`比和`）。
- `formations[].palace_index`：格局落点宫位索引。
- `formations[].affected_role`：格局影响的角色或用神（如岗位、决策端、求测人）。

后续报告只能使用该证据包。

如果一句判断无法关联到证据包中的字段，应删除、降级为假设或明确标注为传统象义延伸。

模型不得创造：

- 不存在的宫、门、星、神、干
- 未命中的格局
- 未计算的生克、刑冲合害
- 未扫描出的日期和时辰
- 不存在的用户现实信息

## 第十步：生成自由结构报告

报告章节、标题、数量和顺序由模型根据问题复杂度自行决定。

不要强制 M1-M4、固定十章或统一标题。简单问题可以短答，复杂问题可以分层展开。

### 产出物

正式解盘必须将最终报告写入 `tmp/qimen-report-{时间戳}.md`，并在对话中同时给出摘要。报告 MD 与证据包 `tmp/qimen-evidence.json` 一一对应保存，时间戳取起局所用时刻。理论教学与同局追问不强制落盘。

报告开头必须渲染一个九宫格盘面，紧跟基本信息（局名、节气元、值符/值使、空亡、马星）。

### 九宫格渲染

数据一律取自证据包 `chart.palaces`，不得自行编排。盘面字段：`star`(九星) `sky`(天盘干) `door`(八门) `god`(八神) `earth`(地盘干) `kong_wang`(空亡) `ma_xing`(马星)，中宫 `is_center` 寄坤。

宫位到方格的位置固定按洛书排布（`palaces` 数组顺序即行优先视觉顺序）：

```
巽4(东南)  离9(正南)  坤2(西南)
震3(正东)  中5(中宫)  兑7(正西)
艮8(东北)  坎1(正北)  乾6(西北)
```

每宫单元格自上而下堆叠：八神 → 九星 → 八门 → 天盘干 → 地盘干 → 标记。标记含 `空`(空亡) `马`(马星)，并标注 `值符宫`/`值使宫`/`用神宫`。中宫只显示寄坤的地盘干并标「中宫·寄坤」。

用 markdown 表格渲染（空表头 + 3 行 3 列，单元格内用 `<br>` 换行）：

```markdown
|  |  |  |
|---|---|---|
| **巽4·东南** 〔值符宫〕<br>玄武<br>天蓬<br>开门<br>丙(天)<br>戊(地)<br>空·马 | **离9·正南**<br>… | **坤2·西南**<br>… |
| **震3·正东** 〔用神宫〕<br>… | **中5·中宫**<br>寄坤·戊 | **兑7·正西**<br>… |
| **艮8·东北**<br>… | **坎1·正北**<br>… | **乾6·西北**<br>… |
```

渲染规则：

- 单元格内容缺失时留空，不得补造星、门、神、干。
- 命中的 `值符宫`/`值使宫`/`用神宫` 必须标注；空亡、马星按 `chart.palaces` 实际布尔值显示。
- 九宫格只呈现盘面事实，吉凶判断放到正文，不在格内写结论。

推荐但不强制的数据结构：

```json
{
  "report": {
    "title": "",
    "opening": "",
    "sections": [
      {
        "id": "",
        "title": "",
        "purpose": "conclusion",
        "content": "",
        "evidence_refs": ["EV-001"]
      }
    ],
    "closing": ""
  }
}
```

模型可以：

- 自定义章节名称和叙事顺序。
- 合并或拆分用神、生克、应期和建议的叙述顺序（命中的有名格必须保留渲染，不得省略）。
- 根据用户偏好决定简洁或详细。
- 先讲结论，也可以先交代关键矛盾，只要用户能快速获得答案。
- 使用自然、贴合问题的标题。

### 必须覆盖的语义

不要求独立成章，但整份报告必须覆盖：

- `direct_answer`：直接回应用户最关心的问题。
- `target_spec_explanation`：说明本次观察对象和取用逻辑。
- `supporting_evidence`：说明主要支撑。
- `palace_depth_reading`：每个核心用神宫不止报符号，必须读到第二层——天盘干与地盘干的生克方向（天生地为泄、地克天为受制等）、旺衰地利（`palace.prosperity`）、门星神组合的合力或矛盾。当某宫的干生克或旺衰与门星神表层吉凶相反时，必须点出这层张力，不得只取有利面。
- `formations_rendered`：命中的有名格（吉格与凶格）必须显式列出，逐条说明：格局名称、落在哪一宫（`formation.palace_index`）、影响哪个角色或用神、与核心用神的关系、现实含义与吉凶倾向；无命中时明确说明“本局无有名格命中”。不得只列格名配通用象义。
- `constraints_and_risks`：说明主要制约和风险。
- `interaction_judgment`：解释主体与目标之间的关系。
- `timing_if_available`：有应期候选时说明观察窗口。
- `actionable_guidance`：给出可执行建议。
- `limitations`：说明低置信、开放取用或现实边界。

生成后执行语义覆盖检查。缺少必要语义时，只补充缺失内容，不要求重写成固定章节。

### 证据引用

每个核心结论应能关联一个或多个证据 ID：

```json
{
  "id": "EV-001",
  "type": "palace|formation|relation|timing|target_spec",
  "source": "rule|llm_derived_validated",
  "summary": ""
}
```

面向用户的正文不必展示 ID，但审计输出必须保存引用关系。

### 写作要求

- 先说人话，再补必要术语。
- 术语第一次出现时解释现实含义。
- 同时呈现支撑条件和风险条件。
- 风险之后给出应对建议。
- 不展示内部评分计算、权重和置信度数字。
- 不说“必成、必败、一定、百分百”。
- 不用恐吓式语言。
- 不因用户期待正面结果而提高结论。
- 建议必须绑定具体盘面信号（某宫、某门星神、某格局、某应期），不堆通用、换个场景也成立的空话。
- 不靠重复同一结论充字数；同一判断在不同章节只补新证据或新角度，不复述。

医疗、法律、投资和孕产等高风险内容必须降低确定性，并建议咨询现实专业人士。

## 第十一步：同局追问

追问前先判断：

- `same_casting/deepen`：同一件事的深挖。
- `same_casting/revise`：新增现实信息改变了前提。
- `new_matter`：已经是另一件事。

同局追问必须遵守：

- 不重新排盘。
- 不修改原始评分。
- 不静默覆盖原结论。
- 只增加补充内容。
- `revise` 使用“原结论 → 因新情况调整为……”的表达。
- 只引用原证据包和白名单补算结果。

允许的补算能力：

- 原盘应期重算
- 指定宫位重读
- 方位重读

不在白名单中的补算需求应提示另起一局或说明无法从原局回答。

详细规则见 `references/followup.md`。

## 输出边界

每次正式解盘结尾附上：

> 温馨提示：奇门遁甲属于传统文化中的术数模型，本次解读用于辅助观察与思考，不代替医疗、法律、财务等专业意见。涉及重大决策时，请同时结合现实信息理性判断。

## 资源导航

- `references/interview.md`：访谈和追问条件
- `references/ruleset-mainline.md`：排盘口径
- `references/routing.md`：问题分类和主客识别
- `references/yongshen-*.md`：各领域规则用神
- `references/target-spec.md`：规则和模型目标契约
- `references/formations.md`：有名格检测
- `references/scoring.md`：分层评分和去重
- `references/polarity.md`：领域极性翻转
- `references/timing.md`：应期扫描
- `references/report-contract.md`：自由报告和语义覆盖
- `references/followup.md`：同局追问

## 禁止事项

- 不在核心信息缺失时直接起局。
- 不在脚本失败时改用心算。
- 不混用多个规则集。
- 不让模型决定盘面事实。
- 不让未经校验的模型 `targetSpec` 进入评分。
- 不让模型目标对评分产生无上限影响。
- 不把低置信推导伪装成规则精确结论。
- 不强迫所有报告使用固定章节。
- 不允许自由报告遗漏直接答案、证据、风险、建议和限制。
- 不在同一局追问中重排盘或重打分。
- 不把事件发生时间（如面试时刻）当作起局时间，问事一律以问事当下起局。
- 不让模型自行臆测起局时辰，时辰一律由脚本按北京时间解析。
- 不在报告中省略已命中的有名格。
- 不在正式解盘时跳过报告 md 落盘。
- 不在报告开头省略九宫格盘面，不在九宫格中编造或挪动 `chart.palaces` 的符号。
- 不让核心用神宫只停留在符号层，必须读到干生克、旺衰与门星神合力的第二层。
- 不把有名格写成“格名 + 通用象义”，必须落到具体宫位与受影响角色。
