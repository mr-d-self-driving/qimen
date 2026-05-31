# 八字形象 / 从化接入产品设计

## 一、背景与目标

现有八字主排盘引擎已经存在一版特殊气势启发式判断：当日主无根、天干无印比帮助且某一五行占比超过阈值时，提示疑似从格；命中后可将喜忌路径切换为顺势逻辑。现有实现能够粗略映射从财、从官杀、从食伤、从势和专旺，但仍存在以下问题：

- 将强弱、特殊气势和喜忌覆盖混合在同一判断中。
- 没有真从、假从、不从的分层。
- 专旺判断条件不准确：专旺不应要求日主无根。
- 化气格尚未作为全局形象建模。
- 问答卡片使用的静态分析链路没有接入特殊形象上下文。
- 前端只能展示最终格局，无法解释基础格局、特殊形象和最终格局的关系。

本设计新增独立的 `image_analysis` 形象分析层，在不破坏现有月令格局的前提下，为从格、专旺格、化气格和两气成象提供统一评估、可解释匹配度和覆盖决策。

## 二、核心原则

### 2.1 形象与格局分层

形象不是现有格局字段的别名。

```text
基础格局：月令取格，例如正财格
形象分析：检查原局是否存在特殊气势
最终格局：根据形象匹配度决定是否覆盖
喜忌路径：根据最终格局选择常规或顺势逻辑
```

基础格局必须始终保留。特殊形象只在满足覆盖条件时改写 `final_pattern` 和喜忌路径。

### 2.2 匹配度不是事件概率

`match_score` 取值为 `0-100`，定义为命局对某一种形象模板的结构匹配度。它不是统计学概率，也不是人生事件成功概率。

### 2.3 静态分类与动态影响分离

原局形象由出生盘决定，不被大运流年重写。岁运只能改变当前状态，例如助势、破格、去假存真。

## 三、产品决策

### 3.1 采用独立 `image_analysis`

选择新增独立字段，而不是继续扩展现有 `special_pattern`。

原因：

- 形象层可以独立测试和校准。
- 可以统一覆盖从格、专旺、化气和两气成象。
- 可以为前端和问答链路提供同一份可解释结构。
- 覆盖逻辑可以集中处理，不再依赖 `strongWeak.includes('从格')` 一类字符串判断。

### 3.2 统一形象类型

```text
NONE                 未成象
SINGLE_IMAGE         独象 / 专旺
TWO_QI_IMAGE         两气成象
FOLLOW_IMAGE         从财、从官杀、从儿、从势
TRANSFORMATION_IMAGE 化气
```

### 3.3 阈值与覆盖规则

| 匹配度 | 状态 | 展示 | 引擎行为 |
|---|---|---|---|
| `0-59` | 未成象 | 不在主卡突出，仅在专业弹窗保留诊断 | 不覆盖 |
| `60-79` | 疑似成象 | 显示候选类型和匹配度 | 不覆盖，维持常规喜忌 |
| `80-94` | 成象 | 显示形象类型和匹配度 | 允许覆盖最终格局与喜忌 |
| `95-100` | 高纯度成象 | 显示真从、真化或纯粹专旺倾向 | 允许覆盖最终格局与喜忌 |

第一期仅 `SINGLE_IMAGE`、`FOLLOW_IMAGE` 和 `TRANSFORMATION_IMAGE` 可以覆盖喜忌。`TWO_QI_IMAGE` 默认只影响结构说明，待取用规则和案例集成熟后再开放覆盖。

## 四、数据契约

### 4.1 `image_analysis`

```json
{
  "image_analysis": {
    "primary_candidate": {
      "category": "FOLLOW_IMAGE",
      "subtype": "从财格",
      "match_score": 86,
      "match_label": "成象",
      "status": "FORMED",
      "override_normal_pattern": true,
      "yongshen_strategy": "FOLLOW_FORCE"
    },
    "alternatives": [
      {
        "category": "TWO_QI_IMAGE",
        "subtype": "木火成象",
        "match_score": 54,
        "status": "NOT_FORMED"
      }
    ],
    "dimensions": [
      {
        "key": "target_dominance",
        "score": 31,
        "max": 35,
        "text": "财星阵营占比集中"
      },
      {
        "key": "dm_root",
        "score": 20,
        "max": 20,
        "text": "日主四支无根"
      }
    ],
    "penalties": [
      {
        "key": "minor_mixed_qi",
        "score": -5,
        "text": "原局仍有少量杂气"
      }
    ],
    "reason_codes": [
      "DM_ROOTLESS",
      "WEALTH_QI_DOMINANT"
    ],
    "config_version": "image-score-v1"
  }
}
```

### 4.2 `pattern_analysis` 保留基础格局与最终格局

```json
{
  "pattern_analysis": {
    "extraction": {
      "basis": "SPECIAL_IMAGE_OVERRIDE",
      "base_pattern": "正财格",
      "final_pattern": {
        "name": "从财格",
        "category": "SPECIAL_FORCE",
        "base_pattern": "正财格",
        "description": "原局财势成象，已按从财格顺势取用。"
      }
    }
  }
}
```

### 4.3 问答静态报告透传形象上下文

```json
{
  "image_context": {
    "category": "FOLLOW_IMAGE",
    "subtype": "从财格",
    "match_score": 86,
    "match_label": "成象",
    "override_normal_pattern": true,
    "yongshen_strategy": "FOLLOW_FORCE"
  }
}
```

`assessOriginalChartState()` 接收上游已计算的 `imageAnalysis`，不在问答链路重复计算。

## 五、评分模型初稿

以下分值均为工程初值，需要通过命例回放校准。古籍提供的是定性原则，不提供数值阈值。

### 5.1 统一评分流程

```text
为每一种候选形象分别评分
→ 应用硬性否决或封顶条件
→ 取最高分作为 primary_candidate
→ 保留次高分作为 alternatives
→ 根据阈值决定是否覆盖
```

统一输出：

```text
match_score =
  基础气势分
  + 分类成立分
  + 月令与流通加分
  - 根气、混杂、冲破等扣分
```

最终限制在 `0-100`。

### 5.2 从格评分

适用范围：从财、从官杀、从儿、从势。

| 维度 | 分值 | 说明 |
|---|---:|---|
| 目标阵营五行占比 | `0-35` | 越集中越高 |
| 月令支持目标阵营 | `0-15` | 得令是重要加分 |
| 日主无根 | `0-20` | 无根满分；余气、墓库、长生、临官分级扣减 |
| 天干无印比援助 | `0-15` | 明透印比扣分明显 |
| 气势流通 | `0-10` | 如从财见食伤生财、从官杀见财生官杀 |
| 阴阳干顺从倾向 | `0-5` | 仅作轻量权重，不作为否决条件 |

主要扣分：

| 破格因素 | 扣分 |
|---|---:|
| 日主有临官、帝旺强根 | `-35` |
| 日主有长生、中气根 | `-15 ~ -25` |
| 印比透干并有根 | `-20 ~ -35` |
| 目标阵营被强力反制 | `-10 ~ -25` |
| 力量混杂，无法明确归类 | 降级为从势或疑似 |

子类型要求：

- 从财：财星形成主导气势，食伤生财可加分。
- 从官杀：官杀形成主导气势，财生官杀可加分；印化杀、食伤强制杀需要扣分。
- 从儿：食伤形成主导气势且见财流通；不能只按日主极弱映射。
- 从势：日主无根，食伤、财、官杀混合成势，没有单一阵营足以独立归类。

### 5.3 专旺格评分

| 维度 | 分值 |
|---|---:|
| 日主同类与印星阵营占比 | `0-40` |
| 月令支持旺神 | `0-20` |
| 比劫、印星成党成势 | `0-20` |
| 允许顺泄的食伤 | `0-10` |
| 结构纯度 | `0-10` |

主要扣分：

| 破格因素 | 扣分 |
|---|---:|
| 有力官杀逆克旺神 | `-20 ~ -40` |
| 有力财星耗旺生杀 | `-10 ~ -25` |
| 结构混杂 | `-10 ~ -25` |

专旺不要求日主无根。后续可以根据旺神五行细分曲直、炎上、稼穑、从革、润下。

### 5.4 化气格评分

| 维度 | 分值 |
|---|---:|
| 日干参与紧贴五合 | `0 或 25` |
| 化神得月令支持 | `0-20` |
| 化神在地支成势 | `0-20` |
| 原神根气弱，可随化 | `0-15` |
| 无争合、妒合 | `0-10` |
| 化神不受强力克破 | `0-10` |

特殊规则：

- 没有日干紧贴五合时，不进入化气候选。
- 严重争合时，最高只能进入疑似阶段。
- “必须见辰才能化”作为可配置策略，不全局写死。
- “阳干不能从化”不能写成硬拒绝，仅可作为权重因素。
- 非指定月令时默认减分或降级，不直接全局否决。

### 5.5 两气成象评分

| 维度 | 分值 |
|---|---:|
| 两种主导五行合计占比 | `0-45` |
| 两者力量接近程度 | `0-25` |
| 其余五行杂气少 | `0-20` |
| 相生流通或相克有通关 | `0-10` |

两气成象第一期只用于结构说明，不自动覆盖喜忌。

## 六、覆盖决策

新增集中式覆盖函数：

```text
resolvePatternOverride({
  basePattern,
  imageAnalysis
})
```

逻辑：

```text
match_score < 80
→ 保留基础格局
→ 继续常规喜忌

match_score >= 80 且类型允许覆盖
→ final_pattern 使用形象子类型
→ 喜忌路径切换为 FOLLOW_FORCE 或 TRANSFORM_FORCE

TWO_QI_IMAGE
→ 第一期只展示，不覆盖
```

喜忌评分入口不再根据 `strongWeak.includes('从格')` 推断特殊格局，而是消费结构化的 `image_analysis.primary_candidate`。

## 七、调用链与模块边界

### 7.1 新增模块

```text
lib/baziImageAssessor.js
```

职责：

- 枚举形象候选。
- 分别计算匹配度。
- 应用硬性否决、封顶和降级条件。
- 输出 `image_analysis`。
- 不直接修改喜忌、不拼接前端文案。

建议入口：

```js
assessBaziImage({
  dayGan,
  gans,
  zhis,
  monthZhi,
  strengthDetail,
  interactions,
  config
})
```

### 7.2 主排盘调用链

```text
calculateStrength()
→ assessBaziImage()
→ resolvePatternOverride()
→ getFavorableUnfavorable()
→ buildPatternAnalysis()
```

### 7.3 问答链路

```text
buildCompleteBaziDetail()
→ image_analysis
→ baziQuestionCore 参数整理
→ assessOriginalChartState({ imageAnalysis })
→ status / pattern / timing / profile_driven 共用
```

问答链路只消费上游结果，不重复实现形象规则。

## 八、前端展示

不新增首页卡片。形象分析并入现有格局卡和专业弹窗。

### 8.1 成象并覆盖

```text
旺衰格局
从财格                  形象匹配度 86%
基础格局：正财格
财势成象，已按从财格顺势取用
```

### 8.2 疑似成象

```text
旺衰格局
正财格                  从财格倾向 72%
存在从财倾向，证据尚不足
当前仍按正财格常规喜忌处理
```

### 8.3 专业弹窗

格局判断步骤扩展为：

```text
月令取格 → 形象校验 → 喜忌路径 → 成破说明
```

形象校验展示：

- 匹配度百分比。
- 分类与子类型。
- 加分证据。
- 扣分因素。
- 是否覆盖常规喜忌。
- 基础格局与最终格局。

## 九、动态岁运影响

原局 `match_score` 固定。动态层新增：

```json
{
  "image_luck_effect": {
    "status": "BROKEN_BY_LUCK",
    "score_delta": -22,
    "reason_codes": [
      "RESOURCE_LUCK_SUPPORTS_DM"
    ],
    "text": "大运印比助身，与原局财势形成交战。"
  }
}
```

状态建议：

```text
NEUTRAL
SUPPORTED_BY_LUCK
FAKE_TO_TRUE
WEAKENED_BY_LUCK
BROKEN_BY_LUCK
```

示例：

```text
原局假从财 74%
→ 大运财旺且拔除微根
→ 动态状态：FAKE_TO_TRUE

原局从财格 88%
→ 大运比劫强力助身
→ 动态状态：BROKEN_BY_LUCK
```

动态状态可以改变当前解读，但不能回写出生盘的 `match_score`。

## 十、Reason Codes

第一期至少支持：

```text
DM_ROOTLESS
DM_HAS_MINOR_ROOT
DM_HAS_STRONG_ROOT
DM_HAS_VISIBLE_SUPPORT
TARGET_QI_DOMINANT
TARGET_QI_MIXED
WEALTH_QI_DOMINANT
OFFICIAL_QI_DOMINANT
OUTPUT_QI_DOMINANT
OUTPUT_GENERATES_WEALTH
RESOURCE_CONTROLS_OUTPUT
WEALTH_GENERATES_OFFICIAL
OFFICIAL_RESTRAINS_DM
ADJACENT_STEM_COMBINE
TRANSFORM_QI_SUPPORTED_BY_MONTH
TRANSFORM_QI_SUPPORTED_BY_BRANCHES
TRANSFORM_QI_DAMAGED
JEALOUS_COMBINE
TWO_QI_BALANCED
MIXED_QI_TOO_STRONG
```

Reason code 用于：

- 前端专业弹窗解释。
- 单元测试断言。
- 命例校准统计。
- 后续 NotebookLM 或 LLM prompt 的结构化输入。

## 十一、验证策略

### 11.1 单元测试

分别覆盖：

- 真从财、疑似从财、不从财。
- 真从官杀、官杀被印化、官杀被食伤制。
- 从儿见财、从儿不见财、强印破从儿。
- 从势混合成局。
- 专旺成立、官杀逆克破专旺。
- 真化、假化、合而不化、争合封顶。
- 两气成象成立、杂气过多降级。
- `60-79` 不覆盖、`80+` 覆盖。

### 11.2 命例回放

建立带人工结论的命例集：

```text
fixtures/bazi-image-cases/
```

每条命例至少记录：

```json
{
  "pillars": ["年柱", "月柱", "日柱", "时柱"],
  "expected_category": "FOLLOW_IMAGE",
  "expected_subtype": "从财格",
  "expected_score_band": "80-94",
  "expected_override": true,
  "notes": "人工复核说明"
}
```

先验证分类，再调整分值。禁止为了单个案例直接添加不可解释的特判。

### 11.3 兼容性

- 没有 `image_analysis` 的旧档案继续使用现有格局字段。
- 前端优先读取 `image_analysis`，缺失时降级到 `pattern_analysis`。
- 问答链路缺少 `image_context` 时保持当前行为。

## 十二、实施边界

第一期包含：

- 新增形象评估器。
- 接入主排盘、格局卡和问答静态链路。
- 输出统一匹配度和 reason codes。
- 支持动态状态字段，但动态评分可分阶段接入。
- 建立命例夹具和基础测试。

第一期不包含：

- 用统计模型训练权重。
- 自动从用户反馈反向修改原局 `match_score`。
- 两气成象自动覆盖喜忌。
- 为每一种传统专旺子格设计独立前端卡片。

