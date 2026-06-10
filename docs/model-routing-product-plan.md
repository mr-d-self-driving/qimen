# 问事卡片模型路由产品方案

> 创建日期：2026-06-08  
> 目标分支：`preview/model_change`  
> 相关文件：`lib/divinationRouter.js`、`lib/divinationCategories.js`、`lib/baziQuestionCore.js`、`lib/qimenPromptSections.js`

---

## 背景

问事卡片同时承载奇门与八字两条解读链路：

- 奇门适合判断具体事件、短期决策、成败、应期、方位与行动策略。
- 八字适合判断命局结构、长期趋势、领域容量、当前大运流年状态与候选时间窗口。

当前工程已经把八字核心推理前置到后端 Pipeline：目标元素定位、原局状态评估、动态引动评估都由规则层计算，LLM 主要负责解释、组织 JSON 与用户体验表达。因此模型选择不应简单地全量使用 Pro，而应按路由分支、置信度、问题风险与推理复杂度分层。

本方案目标：

1. 固化奇门、八字的路由分支和置信度枚举。
2. 明确 Flash / Pro 的默认分配策略。
3. 明确低置信用神、低置信目标元素与边界问题的升级或追问规则。
4. 为后续代码实现提供产品契约。

---

## 路由枚举

### 总分支

| 字段 | 枚举 | 产品含义 |
|------|------|----------|
| `branch` | `qimen` | 奇门分支：具体事件、短期决策、成败、应期、方位 |
| `branch` | `bazi` | 八字分支：长期趋势、命局结构、大运流年、行业/婚姻/体质底盘 |
| `branch` | `hybrid` | 混合分支：八字背景结合奇门事件判断 |
| `branch` | `clarify` | 信息不足，需要追问 |

### 置信度

| 字段 | 枚举 | 产品行为 |
|------|------|----------|
| `confidence` | `high` | 直接进入对应分支 |
| `confidence` | `medium` | 可以解读，但输出需要保留边界说明 |
| `confidence` | `low` | 优先追问或使用路由 LLM 兜底，不直接做强解读 |

### 路由来源

| 字段 | 枚举 | 产品含义 |
|------|------|----------|
| `source` | `rules` | 规则路由命中 |
| `source` | `llm` | LLM 兜底路由命中 |

### 奇门角色

| 字段 | 枚举 | 产品含义 |
|------|------|----------|
| `role` | `client` | 客/主动方：主动发起、追求、进攻、选择 |
| `role` | `master` | 主/守待方：等待对方行动、被动应对、被起诉、等还款等 |

---

## 八字语义路由

### 分析模式

| `analysis_mode` | 产品含义 | 默认模型 |
|-----------------|----------|----------|
| `status` | 当前/今年/这步大运的状态气候，判断能否推进到什么程度 | Flash |
| `timing` | 什么时候、哪年、未来几年应期，需要候选年份筛选 | Pro |
| `pattern` | 命里有没有、先天结构、容量、格局、适配度 | Flash |
| `character` | 伴侣/合伙人/领导等人物画像或关系表达倾向 | Flash |
| `profile_driven` | 开放战略型问题，多路径比较，如创业 vs 打工、主业 vs 副业 | Pro |
| `unsupported` | 八字不适合判断，或资料不足必须追问 | 不进入解读模型 |

### 目标来源

| `target_source` | 产品含义 | 默认模型 |
|-----------------|----------|----------|
| `backend_shishen` | 后端能映射到明确十神/宫位，如求财看财星、婚恋看夫妻宫/官杀 | Flash |
| `yongshen` | 无领域单一靶子，以命主用神/忌神锚定综合状态或路线 | Flash；复杂时 Pro |
| `llm_derived` | 后端无稳定规则，LLM 只能给低置信观察框架 | Flash + 低置信边界 |

### 目标解析旧字段

| `target_resolution` | 产品含义 |
|---------------------|----------|
| `backend_mapped` | 后端目标元素映射 |
| `llm_derived` | LLM 自拟观察框架 |
| `unsupported` | 不支持或需要追问 |

---

## 奇门模型策略

| 场景 | 常见子类 | 默认模型 | 升级条件 |
|------|----------|----------|----------|
| 职场事件 | `job_search`、`current_job_change`、`promotion_title`、`project_business` | Flash | 高金额、高法律风险或分类争议时 Pro |
| 感情事件 | `pursuit_dating`、`love_conflict`、`marriage_existing`、`online_romance` | Flash | 涉及婚姻重大决策或高冲突时 Pro |
| 财务交易 | `investment_business`、`trade_buy_sell`、`debt_repayment`、`real_estate_trade` | Flash | 大额投资、借贷、房产、合同纠纷时 Pro |
| 健康医疗 | `medical_diagnosis`、`treatment_effect`、`surgery_risk` | Pro | 默认 Pro，并弱化为参考，不替代医生 |
| 官司法务 | `civil_lawsuit`、`criminal_case`、`settlement_evidence` | Pro | 默认 Pro，并弱化为参考，不替代律师 |
| 失物与日常决策 | `lost_found`、`daily_decision`、`timing_choice` | Flash | 低置信时先追问 |
| 风水家宅 | `yang_house`、`yin_house`、`moving_house` | Flash | 涉及大额购置/搬迁决策时 Pro |
| 孕产子嗣 | `conception`、`pregnancy_health`、`delivery_birth` | Pro | 默认 Pro，并必须附现实医疗提醒 |

---

## 八字模型策略

| 条件 | 推荐模型 | 原因 |
|------|----------|------|
| `analysis_mode=status` | Flash | 后端已给目标元素、原局状态和当前动态引动，LLM 主要做解释 |
| `analysis_mode=pattern` | Flash | 以先天结构容量为主，动态链路较短 |
| `analysis_mode=character` | Flash | 画像类输出应保持倾向表达，不做强断 |
| `analysis_mode=timing` | Pro | 候选年份筛选、应期排序、年龄/领域适配约束多 |
| `analysis_mode=profile_driven` | Pro | 多路径比较需要模型综合命盘、用神、岁运与生活场景 |
| `target_source=backend_shishen` 且目标 fallback 到 `subcategory/category` | Flash | 后端锚点清晰，模型负责叙述 |
| `target_source=yongshen` 且 route confidence 为 `high` | Flash | 用神锚点稳定，普通综合状态可用 Flash |
| `target_source=yongshen` 且 route confidence 非 `high` | Pro | 可判断但锚点不够稳，需要更强综合能力 |
| 后端目标只落到 `general` 或存在多目标竞争 | Pro | 目标元素不够细，需更强约束遵循和取舍能力 |
| 命局存在从格、化气、专旺、调候与扶抑冲突等复杂结构 | Pro | 推理链更长，误读成本更高 |
| `target_source=llm_derived` | Flash | Pro 不能把不可稳定判断的问题变成可强断问题，应低置信边界输出 |
| `analysis_mode=unsupported` | 不调用解读模型 | 追问或拒绝强断 |

---

## 低置信处理规则

### 不是所有低置信都走 Pro

低置信分成三类：

1. **信息不足**：用户问题过短、缺对象、缺时间、缺判断目标。  
   推荐：`clarify`，先追问，不调用 Pro。

2. **可判断但锚点不稳**：已有八字档案，问题可落入八字体系，但目标元素、用神或多路径锚点不够清晰。  
   推荐：Pro。

3. **体系边界问题**：如身份标签、性取向、确定事实等不能由八字稳定判断的问题。  
   推荐：Flash + `llm_derived` 低置信边界，不升级为 Pro 强断。

### Pro 的定位

Pro 用来处理“可判断但链路复杂/锚点不稳”的问题，不用来包装“不可判断”的问题。

| 类型 | 行为 |
|------|------|
| 信息不足 | 追问 |
| 可判断但复杂 | Pro |
| 不可稳定判断 | Flash 低置信边界或拒绝强断 |

---

## 推荐模型选择伪代码

```js
function selectQuestionModel({ route, baziRoute, risk, targetFallbackLevel, chartComplexity }) {
  if (route.branch === 'clarify') return 'none';

  if (route.confidence === 'low' && isMissingDecisionContext(route)) {
    return 'clarify';
  }

  if (route.branch === 'qimen' || route.branch === 'hybrid') {
    if (risk.isHealth || risk.isLegal || risk.isPregnancy || risk.isLargeMoney) {
      return 'pro';
    }
    return 'flash';
  }

  if (route.branch === 'bazi') {
    if (baziRoute.analysis_mode === 'timing') return 'pro';
    if (baziRoute.analysis_mode === 'profile_driven') return 'pro';

    if (
      baziRoute.target_source === 'yongshen' &&
      baziRoute.confidence !== 'high'
    ) {
      return 'pro';
    }

    if (targetFallbackLevel === 'general') return 'pro';
    if (chartComplexity.hasPatternConflict) return 'pro';

    if (baziRoute.target_source === 'llm_derived') return 'flash';

    return 'flash';
  }

  return 'flash';
}
```

---

## 建议配置项

后续实现建议将模型名从代码中移出，改为环境变量配置：

```env
ROUTER_MODEL=gemini-flash
QIMEN_DEFAULT_MODEL=gemini-flash
QIMEN_HIGH_RISK_MODEL=gemini-pro
BAZI_DEFAULT_MODEL=gemini-flash
BAZI_DEEP_MODEL=gemini-pro
```

建议同时记录实际调用模型到审计表：

- `model_name`
- `model_tier`
- `model_selection_reason`
- `route_confidence`
- `target_source`
- `target_fallback_level`
- `risk_flags`

这样可以后续回放评估：哪些低置信场景 Pro 确实提升了 JSON 稳定性、命理解释一致性与用户满意度。

---

## 产品结论

默认策略：

- 路由分类：Flash。
- 奇门普通事件：Flash。
- 奇门高风险主题：Pro。
- 八字 `status / pattern / character`：Flash。
- 八字 `timing / profile_driven`：Pro。
- 八字用神或目标锚点低置信但仍可判断：Pro。
- 八字 `llm_derived` 边界问题：Flash + 低置信说明。
- 信息不足：追问，不消耗深度模型。

一句话原则：**Flash 做主力体验，Pro 处理可判断但复杂、锚点不稳或高风险的问题；不可判断的问题不靠 Pro 硬断。**
