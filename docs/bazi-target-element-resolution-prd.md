# 八字动态分析工程化 Step 1：目标元素解析层（Target Element Resolution）

> 理论依据：`docs/bazi-dynamic-analysis-theory.md`
> 当前架构：`lib/divinationCategories.js`、`lib/baziQuestionCore.js`

---

## 一、问题定义

### 当前状态

`baziQuestionCore.js` 的 prompt 中有一段注释性映射（lines 144–150），用自然语言描述：
- "感情/婚姻 → 男看财星/女看官星，兼看桃花神煞"

这段话直接扔给 LLM，存在以下问题：
1. **粗粒度**：同属 `relationship`，"婚姻结构"和"感情应期"关注的元素完全不同
2. **无性别路由**：男女命目标十神不同，但映射是一条固定字符串
3. **无分析模式区分**：静态结构分析 vs 动态应期推断，使用的机制截然不同
4. **LLM 自由发挥**：每次分析焦点不一致，无法保证理论一致性

### 目标状态

在 category routing 之后、prompt 构建之前，插入一个**结构化的目标元素解析层**，输出：

```javascript
TargetSpec {
  primary_shishen: string[]       // 主要关注的十神，如 ['正财', '偏财']
  primary_gongwei: string[]       // 主要关注的宫位，如 ['日支']
  secondary_shishen: string[]     // 辅助十神（神煞/支援元素）
  analysis_mode: 'static' | 'dynamic' | 'both'
  dynamic_focus: DynamicFocus | null
  analysis_question: string       // 直接注入 prompt 的分析提问
}

DynamicFocus {
  mechanisms: string[]            // 关注哪类刑冲合害：['合动', '冲动', '开墓']
  state_change: string            // 期望的状态变化方向
  timing_priority: 'dayun' | 'liunian' | 'both'
  target_state_now: string        // 原局目标元素当前状态（由命盘计算后注入）
}
```

---

## 二、核心设计洞察："爱情"不等于一定映射妻星/夫星

这是方案的关键判断。映射关系由三个维度共同决定：

```
目标元素 = f(subcategory, gender, analysis_mode)
```

以 `relationship` 为例，走 bazi 分支的只有3个子类：

| subcategory | 核心问题 | 目标元素 | 分析模式 |
|------------|---------|---------|---------|
| `marriage_pattern` | 婚姻会不会幸福/会不会离婚/几次婚姻 | **妻宫**（日支）稳定性 + **妻星**完整性 + 婚姻格局特征 | **静态结构** |
| `partner_profile` | 另一半是什么样的人 | **妻星/夫星的五行性质** → 外貌/性格/职业 | **静态解读** |
| `relationship_timing` | 什么时候能结婚/有对象 | **妻宫**（日支）被引动时机 + **妻星**透出时机 | **动态应期** |

`single_romance`/`pursuit_dating`/`love_conflict`/`marriage_existing` → branches 只有 qimen/hybrid，不进 bazi 流程，此处无需处理。

**更深的洞察**：即使都是"感情"，静态和动态关注点不同：
- `marriage_pattern`：看**妻宫双现**（日支与月/时支重复）？**妻星入墓**？**正偏财杂见**？格局破坏婚姻的方式？→ 描述命局结构
- `relationship_timing`：看大运流年**合动/冲动/开墓**妻宫的时间节点？→ 输出具体年份区间

---

## 三、全 Category × Subcategory 目标元素映射表

### 3.1 relationship（婚恋感情）

**性别修正**：
- 男命：妻星 = `['正财', '偏财']`，夫宫 = `'日支'`
- 女命：夫星 = `['正官', '七杀']`，夫宫 = `'日支'`

| subcategory | primary_shishen（男/女） | primary_gongwei | secondary | mode | dynamic_focus |
|------------|------------------------|----------------|-----------|------|---------------|
| `marriage_pattern` | 正财/偏财 \| 正官/七杀 | 日支 | 桃花、天喜、红鸾 | `static` | null |
| `partner_profile` | 正财/偏财 \| 正官/七杀 | 日支 | 妻星十二运 | `static` | null |
| `relationship_timing` | 正财/偏财 \| 正官/七杀 | 日支 | 桃花时机 | `dynamic` | mechanisms: ['合动', '冲动', '开墓库'], timing_priority: 'both' |

**`marriage_pattern` 的额外静态检查项**（非十神，而是命局特征）：
- 妻宫双现：日支与月支/时支相同
- 妻星入墓：财/官星是否藏于丑/戌/未/辰
- 正偏财杂见（男）：多婚象
- 官杀混杂（女）：多婚象
- 伤官重（女）：妨夫
- 比劫多（男）：劫财伤妻

---

### 3.2 finance_wealth（求财投资）

bazi 分支主要处理：`wealth_capacity`、`income_model`（其余 subcategory 走 qimen/hybrid）

| subcategory | primary_shishen | primary_gongwei | secondary | mode | dynamic_focus |
|------------|----------------|----------------|-----------|------|---------------|
| `general_wealth` | 正财/偏财 | 年支（家财）/ 月支（职业财）| 食神/伤官 | `both` | mechanisms: ['财星透出', '食伤引动财'], timing_priority: 'liunian' |
| `wealth_capacity` | 正财/偏财 | 全局 | 食神/伤官、日主强弱 | `static` | null |
| `income_model` | 正财/偏财 + 食神/伤官 | 月柱（职业财源）| 格局类型 | `static` | null |

**关键规则**：
- 身强财弱 → 行财运发福（dynamic_focus 找财星被引动时机）
- 财旺身弱 → 行比劫/印运发福（dynamic_focus 找日主被帮扶时机）
- 用神被引动 ≠ 财星被引动（前者是全面跃升，后者是具体钱财进出）

---

### 3.3 career_business（事业职场）

bazi 分支主要处理：`career_direction`、`industry_fit`、`entrepreneurship_vs_job`

| subcategory | primary_shishen | primary_gongwei | secondary | mode | 分析重点 |
|------------|----------------|----------------|-----------|------|---------|
| `career_direction` | 正官/七杀（权位型）或 食神/伤官（才华型）| 月柱（职业宫）| 格局类型 | `static` | 格局定职业方向 |
| `industry_fit` | 格局对应五行 | 月柱 | 印星（资源/行业背景）| `static` | 最旺五行对应行业 |
| `entrepreneurship_vs_job` | 食神/伤官（创业气质）vs 正官（打工格）| 月柱 | 偏财（商业机会）| `static` | 伤官/偏财重 → 创业；正官/印重 → 体制 |

**格局→职业映射**（辅助说明）：
- 正官佩印 → 政府/管理
- 七杀有制 → 军警/法律/外科
- 食神/伤官（金水）→ 技术/文艺/学术
- 偏印劫财重 → 偏门/咨询/艺术
- 从财格 → 商人/实业

---

### 3.4 health_action（健康疾病）

bazi 分支主要处理：`constitution`、`organ_risk`

| subcategory | primary_shishen | primary_gongwei | secondary | mode | dynamic_focus |
|------------|----------------|----------------|-----------|------|---------------|
| `constitution` | 日主五行对应脏腑 | 日柱 | 忌神方向 | `static` | null |
| `organ_risk` | 最旺/最弱五行 → 对应脏腑 | 全局 | 干支扭曲指标 | `both` | mechanisms: ['干支扭曲', '根被拔', '反吟'], timing_priority: 'both' |

**五行→脏腑映射**：
- 木 → 肝/胆
- 火 → 心/小肠
- 土 → 脾/胃
- 金 → 肺/大肠
- 水 → 肾/膀胱

---

### 3.5 exam_study（考试学习）

| subcategory | primary_shishen | primary_gongwei | mode |
|------------|----------------|----------------|------|
| `admission_exam` | 印星（正印/偏印）| 月柱（学业宫）| `both` |
| `exam_performance` | 印星 | 月柱 | `dynamic` |
| `interview_review` | 正官（评审认可）+ 印星 | 月柱 | `dynamic` |

---

### 3.6 pregnancy_birth（孕产子嗣）

| subcategory | primary_shishen | 性别修正 | mode |
|------------|----------------|---------|------|
| `conception` | 男：食神/伤官（子女星）; 女：官杀（子女星）| 时柱（子女宫）| `both` |
| `pregnancy_health` | 同上 + 日主（母体）| 日柱 + 时柱 | `both` |
| `delivery_birth` | 同上 | 时柱 | `dynamic` |

---

## 四、工程实现方案

### 4.1 新增模块：`lib/baziTargetElement.js`

```javascript
/**
 * 根据 {category, subcategory, gender} 解析目标元素
 * 在 buildBaziQuestionPrompt 之前调用
 */
function resolveTargetElement({ category, subcategory, gender }) {
  const spec = TARGET_ELEMENT_MAP[category]?.[subcategory];
  if (!spec) return DEFAULT_SPEC;
  
  // 性别修正：关系类和子嗣类需要性别路由
  return applyGenderAdjustment(spec, gender);
}

function applyGenderAdjustment(spec, gender) {
  if (!spec.gender_variant) return spec;
  return gender === 'female' ? spec.gender_variant.female : spec.gender_variant.male;
}
```

### 4.2 TargetSpec 数据结构

```javascript
// 示例：relationship / relationship_timing / 男命
{
  primary_shishen: ['正财', '偏财'],
  primary_gongwei: ['日支'],
  secondary_shishen: ['桃花', '天喜', '红鸾'],
  analysis_mode: 'dynamic',
  dynamic_focus: {
    mechanisms: ['合动', '冲动', '开墓库'],
    state_change_description: '妻宫由动荡变稳定（合动）= 结婚，由安静变冲动 = 感情变动',
    timing_priority: 'both',
    key_questions: [
      '大运是否引动妻宫？建立了吉场还是凶场？',
      '流年地支是否合动妻宫（解冲）？',
      '流年是否冲开妻星墓库？',
      '最近3年内有无合动/开墓的时间窗口？'
    ]
  },
  analysis_question: '男命感情应期：大运流年何时通过合动/冲动/开墓引动妻宫（日支）和妻星（财星），给出最近可能的结婚/恋爱时间窗口'
}
```

### 4.3 集成到 buildBaziQuestionPrompt

在现有 prompt 构建中，将 category 字符串替换为结构化的 TargetSpec 注入：

```javascript
// 现在（baziQuestionCore.js line ~144）
`感情/婚姻 → 男看财星/女看官星，兼看桃花神煞`

// 改为
const targetSpec = resolveTargetElement({ category, subcategory, gender });
`
【本题目标元素】
主要十神：${targetSpec.primary_shishen.join('、')}
主要宫位：${targetSpec.primary_gongwei.join('、')}
辅助神煞：${targetSpec.secondary_shishen.join('、')}
分析模式：${targetSpec.analysis_mode}
${targetSpec.dynamic_focus ? `
动态分析重点：
- 关注机制：${targetSpec.dynamic_focus.mechanisms.join('、')}
- 时间轴优先：${targetSpec.dynamic_focus.timing_priority}
- 核心问题：${targetSpec.dynamic_focus.key_questions.join('\n  ')}
` : ''}
分析提问：${targetSpec.analysis_question}
`
```

### 4.4 原局状态预计算（后续可扩展）

未来可在 `resolveTargetElement` 中增加第二步：结合命盘矩阵，实时计算目标元素的当前状态：

```javascript
function resolveTargetState(targetSpec, baziMatrix) {
  // 1. 找到 primary_shishen 在命盘哪个柱
  // 2. 判断其十二运（旺/相/休/囚/死）
  // 3. 判断是否入墓、是否被冲、是否有根
  // 4. 将 base_state 注入 dynamic_focus.target_state_now
  return { ...targetSpec, dynamic_focus: { ...targetSpec.dynamic_focus, target_state_now } };
}
```

---

## 五、实现优先级与边界

### Must Have（Step 1 范围）

- [ ] `lib/baziTargetElement.js`：静态映射表 + 性别修正函数
- [ ] 覆盖 bazi 分支的所有 subcategory（relationship × 3, finance × 2, career × 3, health × 2, exam × 3, pregnancy × 3）
- [ ] 集成到 `buildBaziQuestionPrompt`：将 TargetSpec 注入 prompt

### Should Have（Step 2）

- [ ] 原局状态预计算：自动判断妻星/财星当前在原局的状态（旺/入墓/被冲/安静）
- [ ] 大运状态预计算：判断大运是否已引动目标元素（建场状态）
- [ ] 将预计算结果注入 dynamic_focus.target_state_now

### Nice to Have（Step 3）

- [ ] 婚姻静态特征检查器：自动检测妻宫双现、妻星入墓、正偏财杂见等固定模式
- [ ] 旺衰冲克方向计算器：判断冲击力旺衰，给出引爆概率
- [ ] 扭曲检测器：流年与日柱是否构成一/二级干支扭曲

---

## 六、测试用例设计

| 输入 | 期望 primary_shishen | 期望 mode | 期望 analysis_question 关键词 |
|------|---------------------|-----------|---------------------------|
| relationship / marriage_pattern / male | 正财, 偏财 | static | 婚姻结构, 妻宫稳定性 |
| relationship / marriage_pattern / female | 正官, 七杀 | static | 婚姻结构, 夫宫稳定性 |
| relationship / relationship_timing / male | 正财, 偏财 | dynamic | 应期, 合动, 冲动, 开墓 |
| relationship / partner_profile / female | 正官, 七杀 | static | 伴侣画像, 夫星性质 |
| finance_wealth / wealth_capacity / male | 正财, 偏财 | static | 财富容量, 身强财弱 |
| career_business / career_direction / male | 正官, 七杀, 食神, 伤官 | static | 职业方向, 格局 |
| health_action / organ_risk / female | 最旺/最弱五行 | both | 脏腑风险, 扭曲 |
