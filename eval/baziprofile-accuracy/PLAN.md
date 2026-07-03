# Bazi Profile 格局 / 旺衰 / 喜忌 / 用神准确性评测计划

> 创建日期：2026-06-10
> 评测对象：`buildCompleteBaziDetail()` 生成的 `bazi_detail` 与 `bazi_profiles` 关键字段
> 评测原则：准确性优先，先评确定性规则引擎，不把 LLM 解释质量混入主指标
> 相关现有材料：
> - `eval/gemini-flash-accuracy/cases.js`
> - `eval/gemini-flash-accuracy/backend_judge.mjs`
> - `docs/eval/yongshen-eval-2026-06.md`

## 1. 背景

当前 Bazi Profile 的格局、旺衰、喜忌、用神不是由 LLM 自由生成，而是由本地规则引擎确定性计算后写入或透传：

```text
四柱 baZi
  -> buildCompleteBaziDetail()
  -> BaziRuleEngine.calculateStrength()
  -> assessBaziImage()
  -> getGeJu() / getChengGe()
  -> BaziRuleEngine.getFavorableUnfavorable()
  -> bazi_detail.strong_weak / geju / pattern_analysis / image_analysis
     / favorable_gods / unfavorable_gods / five_shens / decision_chain
```

因此本评测的主目标不是判断模型文案是否顺畅，而是判断规则引擎是否能从真实命例中准确拾取：

- 格局：普通格、特殊格、格局转换。
- 旺衰：身强、身弱、身中，以及偏强、偏弱、极强、极弱边界。
- 喜忌：喜神、忌神、仇神、闲神方向。
- 用神：`five_shens.yong` 及其对应五行、具体天干、取法依据。

## 2. 评测目标

### P0 目标

1. 建立结构化 gold cases，把 NotebookLM / 教材结论从自然语言沉淀为可机评字段。
2. 用真实 `buildCompleteBaziDetail()` 跑当前引擎，得到与产品同源的 profile 输出。
3. 对最终产物和关键中间产物同时评分，定位错误来源。
4. 输出可复现的 `results/latest.json` 和人工可读 `RESULTS.md`。

### 非目标

- 不评 LLM 问事输出质量。
- 不用 prompt 注入的教材结论作为引擎结果。
- 不把“自然语言里碰巧出现关键词”当作用神命中。

## 3. 为什么必须评中间产物

当前用神计算是多层前序依赖后的分数聚合：

```text
旺衰
  -> 特殊格 / 形象覆盖
  -> 调候
  -> 病药
  -> 通关
  -> 扶抑
  -> 格局辅神
  -> 印星救主 / 羊刃驾杀等修正
  -> classifyFiveShens()
  -> five_shens.yong / xi / ji / chou / xian
```

最终 `five_shens.yong` 只是最高分十神。若只评最终用神，会出现两个问题：

1. 用神错了，但不知道是旺衰、调候、特殊格、格局顺逆还是聚合阈值导致。
2. 用神碰巧对了，但决策链错误，后续大运流年解释仍可能被错误前提带偏。

所以本评测采用双层评分：

- **最终产物准确性**：用户和下游模块实际消费的结果是否正确。
- **中间产物归因**：哪一层计算正确、错误、缺失或权重异常。

## 4. Gold Case 数据结构

建议新增 `gold-cases.js`，每个案例必须结构化，避免只靠自然语言匹配。

```js
{
  id: 'case_001_yuanshushan_qisha',
  label: '袁树珊 七杀格食神制杀',
  source: {
    type: 'textbook',
    title: '陆致极《八字命理动态分析教程》',
    note: 'NotebookLM 摘录或教材章节说明'
  },
  input: {
    pillars: ['辛巳', '丁酉', '乙巳', '戊寅'],
    gender: 'male',
    searchFromYear: 1880
  },
  gold: {
    geju: {
      primary: '七杀格',
      aliases: [],
      method: '月令取格'
    },
    image: {
      category: null,
      subtype: null,
      shouldOverrideNormalPattern: false
    },
    strength: {
      class: '身弱',
      band: '偏弱',
      acceptable: ['身弱']
    },
    tiaohou: {
      primary: [],
      secondary: [],
      avoid: [],
      note: '若教材无明确调候结论，可留空，不参与硬评分'
    },
    yong: [
      { shen: '食神', wuxing: '火', stem: '丁', priority: 1, method: '食神制杀' }
    ],
    xi: [
      { shen: '正印', wuxing: '水', priority: 2 }
    ],
    ji: [
      { shen: '七杀', wuxing: '金', priority: 1 },
      { shen: '正财', wuxing: '土', priority: 2 }
    ],
    methodTags: ['格局制化', '七杀格', '食神制杀']
  }
}
```

### Gold 标注要求

- 教材明确写出者，作为 hard label。
- 教材只写五行不写十神时，按日主换算十神，并保留原文五行。
- 教材存在多解时，列入 `acceptable`，但必须标注主取法。
- 对“调候为急”“特殊格覆盖”“格局转换”单独打标签，避免被常规扶抑口径误判。

## 5. 待评字段映射

从 `buildCompleteBaziDetail()` 输出读取：

| 评测项 | 读取字段 |
| --- | --- |
| 格局 | `geju`, `geju_detail`, `chengge_detail`, `pattern_analysis` |
| 特殊格 / 形象 | `image_analysis`, `pattern_analysis.final_pattern` |
| 旺衰 | `strong_weak`, `strength_detail`, `strength_basis` |
| 调候 | `tiaohou_detail`, `dimension_breakdown.*.tiaohou` |
| 病药 | `wuxing_ratio`, `dimension_breakdown.*.bingyao`, `decision_chain` |
| 通关 | `dimension_breakdown.*.tongguan` |
| 扶抑 | `dimension_breakdown.*.fuyi`, `strength_detail` |
| 格局辅神 | `dimension_breakdown.*.geju`, `decision_chain` |
| 救主 / 羊刃修正 | `dimension_breakdown.*.rescue`, `decision_chain` |
| 用神分层 | `five_shens.yong`, `five_shens.xi`, `five_shens.ji`, `five_shens.chou`, `five_shens.xian` |
| 向后兼容喜忌 | `favorable_gods`, `unfavorable_gods` |

## 6. 评分规则

每个案例总分 100，准确性优先。

| 维度 | 权重 | 说明 |
| --- | ---: | --- |
| 用神 top1 | 35 | `five_shens.yong` 的十神、五行、具体干是否与 gold 主用神一致 |
| 喜忌方向 | 25 | `xi/ji/chou` 与 gold 喜忌是否同向，是否出现喜忌反向 |
| 旺衰 | 15 | 身强 / 身弱 / 身中 及边界是否符合教材 |
| 格局 / 特殊格 | 15 | 普通格、专旺、从格、两气成象、四库全、格局转换是否识别 |
| 决策链 | 10 | 主导取法是否出现在 `decision_chain`，例如调候为急、印星救主、羊刃驾杀 |

### 用神 top1 细则

| 分值 | 判定 |
| ---: | --- |
| 1.0 | 十神和五行一致；若 gold 有具体干，具体干也一致或同等可接受 |
| 0.7 | 五行一致，十神同类，如正印 / 偏印、正财 / 偏财 |
| 0.4 | top1 不对，但进入 `xi` 或 `favorable_gods`，且方向不反 |
| 0 | 未命中 |
| critical fail | top1 落入 gold 忌神，或喜忌方向完全反向 |

### 喜忌方向细则

- `gold.yong` 不得出现在实际 `ji/chou/unfavorable_gods`。
- `gold.ji` 不得出现在实际 `yong/xi/favorable_gods`。
- 若教材标明“忌金水”，实际 favorable 包含金水，记为方向反向。
- 若只漏掉次级喜神，但主用神正确，可扣小分。

### 中间产物归因枚举

每个失败案例必须标注 `root_cause_layer`：

```text
strength
image_analysis
geju
tiaohou
bingyao
tongguan
fuyi
geju_scoring
rescue_override
five_shen_classification
gold_ambiguous
```

严重程度：

```text
critical：喜忌反向、用神落忌神、特殊格漏识别导致全链错
major：主用神错，但喜忌大方向部分一致
minor：主用神对，次级喜忌或解释链有偏差
```

## 7. 案例分桶

结果必须按桶统计，不能只看总体平均。

| 桶 | 目的 |
| --- | --- |
| 常规格 | 验证月令取格、顺逆取用、扶抑基础稳定性 |
| 特殊格 | 验证从儿、从财、从官杀、专旺、两气成象、四库全 |
| 调候为急 | 验证调候神何时作用神，何时只作喜神 |
| 身弱救主 | 验证弃官就印、印星救主、羊刃驾杀 |
| 格局转换 | 验证前后柱视角、财库、食神生财等非单一月令场景 |
| 旺衰边界 | 验证身中、偏强、偏弱的临界盘 |

## 8. 输出格式

### `results/latest.json`

```js
{
  generated_at: '2026-06-10T00:00:00.000Z',
  summary: {
    total: 20,
    weighted_accuracy: 0.86,
    yong_top1_accuracy: 0.82,
    xiji_direction_accuracy: 0.88,
    strength_accuracy: 0.9,
    geju_accuracy: 0.85,
    critical_fail_count: 0
  },
  bucket_summary: {
    normal_pattern: {},
    special_pattern: {},
    tiaohou_urgent: {},
    rescue: {}
  },
  rows: [
    {
      id: 'case_001_yuanshushan_qisha',
      score: 72,
      severity: 'major',
      root_cause_layer: 'tiaohou',
      gold: {},
      actual: {
        geju: '七杀格',
        strong_weak: '身弱',
        yong: '偏印',
        xi: [],
        ji: ['正官'],
        decision_chain: []
      },
      dimension_scores: {
        yong_top1: 0,
        xiji_direction: 0.6,
        strength: 1,
        geju: 1,
        decision_chain: 0.3
      },
      notes: [
        '格局与旺衰正确，但调候癸水被顶为 top1，教材主取食神制杀。'
      ]
    }
  ]
}
```

### `RESULTS.md`

人工可读报告包含：

1. 总体结论。
2. 各桶准确率。
3. critical fail 清单。
4. root cause 分布。
5. 逐案例对照表。
6. 下一步修复优先级。

## 9. 脚本计划

### `gold-cases.js`

职责：

- 保存结构化 gold cases。
- 从现有 `gemini-flash-accuracy/cases.js` 和 `docs/eval/yongshen-eval-2026-06.md` 迁移。
- 保留来源说明，方便回查教材或 NotebookLM 摘录。

### `run.mjs`

职责：

1. 读取 `gold-cases.js`。
2. 对四柱反查任一匹配阳历日期。
3. 构造真实 `baZi + yun`。
4. 调用 `buildCompleteBaziDetail()`。
5. 调用 `scorer.mjs` 输出评分。
6. 写入 `results/latest.json`。

### `scorer.mjs`

职责：

- 标准化十神别名：印 / 枭、财 / 才、官 / 杀等。
- 将十神映射为五行。
- 计算用神 top1、喜忌方向、旺衰、格局、决策链分。
- 标注 `critical_fail`、`root_cause_layer`、`severity`。

### `report.mjs`

职责：

- 从 `results/latest.json` 生成 `RESULTS.md`。
- 汇总桶表现、失败模式、修复建议。

## 10. 通过标准

建议作为后续规则引擎上线门槛：

| 指标 | 通过阈值 |
| --- | ---: |
| 总体 weighted accuracy | >= 85% |
| 用神 top1 accuracy | >= 80% |
| 喜忌方向 accuracy | >= 85% |
| 旺衰三分类 accuracy | >= 90% |
| 格局 / 特殊格 accuracy | >= 85% |
| 特殊格 recall | >= 80% |
| critical fail | 0 |

若 critical fail > 0，不建议把对应结果用于生产解释链，因为 LLM 会放大错误前提的说服力。

## 11. 初始迁移清单

优先迁移以下现有案例：

1. `eval/gemini-flash-accuracy/cases.js` 的 10 个陆致极案例。
2. `docs/eval/yongshen-eval-2026-06.md` 的 10 个用神案例。
3. NotebookLM 中已经标注格局、旺衰、喜忌、用神的真实命例。

迁移顺序建议：

1. 先迁移 hard label 最明确的纯用神案例。
2. 再迁移特殊格、调候为急、格局转换案例。
3. 最后迁移存在多派分歧的案例，并标注 `gold_ambiguous`。

## 12. 后续修复闭环

每次修改规则引擎后执行：

```bash
node eval/baziprofile-accuracy/run.mjs
```

对比：

- 总分是否提升。
- critical fail 是否减少。
- 原本通过的桶是否被打坏。
- `root_cause_layer` 分布是否收敛。

规则修复不以单案例通过为准，必须看分桶回归。尤其是调候、特殊格、旺衰边界三类，容易修好一例、误伤另一类。
