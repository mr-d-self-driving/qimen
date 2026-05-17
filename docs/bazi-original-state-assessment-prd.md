# 八字动态分析工程化 Step 2：原局状态评估（Original Chart State Assessment）

> 上游：`lib/baziTargetElement.js` → `TargetSpec`
> 下游：Step 3 大运流年引动判断

---

## 一、目标

给定四柱原局矩阵 + 目标元素规格（TargetSpec），输出目标元素在原局中的**完整状态报告**，包括：

1. 目标十神的位置、强弱、所受关系
2. 目标宫位的稳定性与所受关系
3. 格局层面的静态特征检查（extra_static_checks）
4. 综合基准状态（base_state）——用于 Step 3 的"状态变化"判断起点

---

## 二、现有干支关系函数完整性审计

### ✅ 完整实现（可直接复用）

| 关系 | 文件 | 说明 |
|------|------|------|
| 六合 | `lib/constants/relations.js` `ZHI_6HES` | 全6对 + 化元素 |
| 三合（含半合） | `ZHI_3HES` + `BaziRuleEngine.js` | 全4组，已有 triplet 检测 |
| 三会（方局） | `ZHI_HUIS` | 全4方，需三字全齐 |
| 天干五合 | `GAN_HES` / `GAN_WUHE` | 全5对 + 化元素 |
| 六冲 | `ZHI_CHONGS` | 全6对，双向 |
| 天干相克 | `WUXING_KE` | 走五行克制循环 |
| 三刑（含自刑） | `XINGS` / `SAN_XING_GROUPS` | 全套，含自刑 |
| 六害 | `ZHI_HAIS` | 全6对 |
| 墓库映射 | `KU_ZHI`（core.js） | 全10天干 → 墓支 |
| 盖头截脚 | `dayunQiStatus()`（calculateAnnualScore.js） | 有实现，需提取为独立工具函数 |
| 十二长生 | `CHANG_SHENG_START` + `getDiShi()` | 全套，阴阳干方向正确 |
| 空亡 | `is_kong` 字段在 matrix pillars 中 | 已在矩阵中标记 |

### ⚠️ 有缺口，Step 2 前需修复

| 关系 | 当前状态 | 缺口 | 修复优先级 |
|------|---------|------|-----------|
| **破** | 只有4对（子酉/午卯/辰丑/戌未）| 缺 `申巳`、`寅亥` | P1（数据补全即可）|
| **暗合** | `ZHI_ATTS` 只有~6个支有定义 | 需补全所有暗合对 | P2（影响精度但非阻断）|
| **合化条件验证** | 只存储化元素，不验证化神（月令/天干）是否满足 | 合化有时会误判 | P1（影响断语准确性）|
| **拱合** | Python 有，JS 缺失 | 需移植 | P2（高级用法，非核心）|

### ❌ Step 2 需新增

| 能力 | 说明 |
|------|------|
| **入墓检测** | 目标十神是否藏于其墓库支中（有别于"墓库映射"查表）|
| **目标元素定位** | 在4柱中找到 primary_shishen 对应的干支位置 |
| **宫位关系扫描** | 对 primary_gongwei 扫描所有涉及该支的关系 |
| **状态标签系统** | 将关系结果翻译为 `status_tags`（有根/被合/被冲/入墓等）|
| **综合断语生成** | 基于 status_tags 生成结构化中文断语 |

---

## 三、需补全的数据与规则

### 3.1 破：补全6对

```javascript
// 完整六破
const ZHI_POS_FULL = {
  子: '酉', 酉: '子',  // 子酉破
  午: '卯', 卯: '午',  // 午卯破
  申: '巳', 巳: '申',  // 申巳破（现缺）
  寅: '亥', 亥: '寅',  // 寅亥破（现缺）
  辰: '丑', 丑: '辰',  // 辰丑破
  戌: '未', 未: '戌',  // 戌未破
};
```

### 3.2 暗合：补全完整集合

暗合 = 地支藏干之间的五合关系。理论依据：地支藏主气/中气/余气互相形成天干五合。

```javascript
// 完整暗合对（基于藏干互合）
// 规则：A支的藏干 与 B支的藏干 存在天干五合关系
const ZHI_ANHE = {
  子: ['丑'],   // 子(藏癸) ↔ 丑(藏癸己辛)，癸无合，但丑藏己合甲，子藏癸合戊
                // 实际：子(癸) ↔ 戊 → 戊在辰/丑/未中 → 子与丑暗合
  寅: ['午'],   // 寅(甲丙戊) 甲己合 → 午(丁己) 己在午中
  卯: ['申'],   // 卯(乙) 乙庚合 → 申(庚壬戊) 庚在申中
  午: ['寅', '亥'],  // 午(丁己) 丁壬合→亥(壬甲) / 己合甲→寅(甲)
  亥: ['午'],   // 亥(壬甲) 壬合丁→午(丁)
  申: ['卯'],   // 申(庚) 庚合乙→卯(乙)
  // 注：暗合主要用于动态分析（岁运引动），原局暗合权重低于明合
};
```

> **重要**：暗合在原局状态判断中作为"弱化关系"存在（权重低于六合/三合），主要用于：
> - 说明某十神处于隐性被牵绊状态
> - 为 Step 3 的"暗合引动"准备数据

### 3.3 合化条件验证

合化不是无条件的，需要同时满足：

```javascript
/**
 * 验证两地支六合是否真正化出新五行
 * 条件：① 月令（出生月）属于化出五行的旺令
 *       ② 或天干透出化出五行（引化之神）
 *       ③ 且合化两支未被其他支冲破
 */
function canHuaZhiLiuhe(zhiA, zhiB, monthZhi, ganArray) {
  const pair = ZHI_6HES[zhiA];
  if (!pair || pair.partner !== zhiB) return false;
  const huaWxing = pair.huaWuxing;
  // ① 月令得气
  if (ZHI_SEASON_WUXING[monthZhi] === huaWxing) return true;
  // ② 天干透出化神
  if (ganArray.some(g => GAN5[g] === huaWxing)) return true;
  return false;  // 合而不化
}

/**
 * 天干五合化条件（《三命通会》）
 * 需生于对应月令（如甲己化土需生于辰戌丑未月）
 */
function canHuaGanWuhe(ganA, ganB, monthZhi) {
  const pair = GAN_WUHE[ganA];
  if (!pair || pair.partner !== ganB) return false;
  const huaWxing = pair.huaWuxing;
  return GAN_WUHE_YUEZHIS[huaWxing]?.includes(monthZhi) ?? false;
}
```

---

## 四、核心函数设计：`assessOriginalChartState`

### 4.1 函数签名

```javascript
/**
 * 评估原局中目标元素的状态
 *
 * @param {object} params
 * @param {object} params.matrix        - baziLocalMatrix 输出，含 pillars[4]
 * @param {object} params.targetSpec    - resolveTargetElement 输出
 * @param {string} params.dayStem       - 日干（日主）
 * @param {string} params.gender        - 'male' | 'female'
 * @returns {OriginalStateReport}
 */
function assessOriginalChartState({ matrix, targetSpec, dayStem, gender }) {}
```

### 4.2 输出结构：`OriginalStateReport`

```typescript
interface OriginalStateReport {
  // 目标十神评估（primary_shishen 中每个在命盘中找到的十神）
  shishen_assessments: ShishenAssessment[];

  // 目标宫位评估（primary_gongwei，如"日支"）
  gongwei_assessments: GongweiAssessment[];

  // 格局层静态特征检查（来自 targetSpec.extra_static_checks）
  extra_checks: ExtraCheckResult[];

  // 综合基准状态（供 Step 3 使用）
  base_state: string;   // e.g. '妻宫受冲，妻星入库'
  overall_stability: 'stable' | 'dynamic' | 'buried' | 'damaged' | 'strong';
  summary_verdict: string;  // 一段中文断语，描述目标元素当前原局状态
}

interface ShishenAssessment {
  shishen: string;               // '正财' | '偏财' | ...
  pillar: '年' | '月' | '日' | '时';
  position: 'gan' | 'zhi' | 'hidden';  // 天干/地支/藏干
  element: string;               // 五行
  twelve_phase: string;          // 十二长生阶段
  phase_score: number;           // 1-4分（帝旺=4，绝=1）
  is_kong: boolean;              // 空亡
  is_in_tomb: boolean;           // 是否坐在自己的墓库支中
  relationships: Relationship[]; // 与其他柱的关系
  gaitou_jiejiao: 'gaitou' | 'jiejiao' | 'neutral' | 'same';  // 盖头截脚
  status_tags: StatusTag[];      // 状态标签
  verdict: string;               // 该十神的中文状态描述
}

interface GongweiAssessment {
  gongwei: string;               // '日支' | '月柱' | '时柱'
  zhi: string;                   // 实际地支
  element: string;               // 五行
  twelve_phase_for_dayStem: string;  // 对日主的长生阶段
  is_kong: boolean;
  is_tomb_for_shishen: boolean;  // 该宫位是否是目标十神的墓库
  relationships: Relationship[]; // 与其他柱的关系
  status_tags: StatusTag[];
  verdict: string;
}

interface Relationship {
  type: RelationType;            // 见下方枚举
  strength: 'strong' | 'weak';  // 关系强弱（旺支 vs 衰支）
  partner_pillar: '年' | '月' | '时' | '大运' | '流年';
  partner_zhi?: string;
  partner_gan?: string;
  is_transformed: boolean;       // 合化是否成立
  transformed_element?: string;  // 化出五行
  note: string;                  // 关系说明
}

type RelationType =
  | '六合' | '三合' | '三会' | '半三合'
  | '天干五合' | '暗合'
  | '六冲' | '天干相克'
  | '三刑' | '自刑'
  | '六害' | '破'
  | '拱合'
  | '入墓' | '开墓';

type StatusTag =
  // 力量类
  | '有根' | '无根' | '帝旺' | '长生' | '入墓' | '死绝' | '空亡'
  // 关系类（被动）
  | '被合' | '被合化' | '被冲' | '被刑' | '被害' | '被克' | '被破'
  // 关系类（主动）
  | '合住他神' | '冲他支'
  // 结合状态
  | '合而不化' | '羁绊'
  // 宫位类（专用于 GongweiAssessment）
  | '宫位稳固' | '宫位受冲' | '宫位入墓' | '宫位被合'
  // 特殊
  | '截脚' | '盖头' | '拱合'
```

---

## 五、关系扫描逻辑（核心算法）

### 5.1 扫描范围

对每个目标支/干，扫描与**其余3柱的干支**之间的所有关系：

```
扫描目标（target）× 扫描对象（other pillars × {gan, zhi, hidden_stems}）
→ 判断所有 RelationType
→ 输出 Relationship[]
```

**关系权重（影响 status_tags 优先级）**：
```
六冲 > 三刑 > 三会 > 三合 > 六合 > 六害 > 破 > 暗合 > 拱合
```

### 5.2 合化成立与否的判断

```
合 → 先判断化神条件（月令/天干）
  ├─ 化神成立 → is_transformed=true, status_tag='被合化'（五行改变）
  └─ 化神不成立 → is_transformed=false, status_tag='合而不化'+'羁绊'
```

### 5.3 入墓判断

```javascript
// 目标十神（如正财=木）在命盘中的干，其墓库支是什么？
// 如果该干恰好坐在自己的墓库支上，标记 is_in_tomb=true
function isInTomb(stem, branch) {
  return KU_ZHI[stem] === branch;
}

// 宫位（如日支）是否是目标十神的墓库
function isTombForShishen(gongweiBranch, targetElement) {
  const tombBranch = ELEMENT_TOMB[targetElement]; // 木→未, 火→戌, 金→丑, 水→辰, 土→辰
  return gongweiBranch === tombBranch;
}
```

### 5.4 盖头截脚（提取为独立函数）

```javascript
// 现在只在 calculateAnnualScore.js 中有，需提取到 utils
function getGaitouJiejiao(gan, zhi) {
  const ganWx = GAN5[gan];
  const zhiWx = ZHI_WUHANGS[zhi]; // 地支主气五行
  if (ganWx === zhiWx) return 'same';          // 同气，干支协调
  if (WUXING_KE[ganWx] === zhiWx) return 'gaitou';  // 天干克地支
  if (WUXING_KE[zhiWx] === ganWx) return 'jiejiao';  // 地支克天干（截脚）
  return 'neutral';  // 生扶或无关
}
```

---

## 六、静态特征检查（extra_static_checks）

由 `targetSpec.extra_static_checks` 驱动，每条检查是一个规则函数：

```javascript
const STATIC_CHECK_RULES = {
  // relationship / marriage_pattern（男）
  '妻宫双现': ({ pillars }) => {
    const riZhi = pillars[2].zhi;
    return pillars.some((p, i) => i !== 2 && p.zhi === riZhi);
  },

  '妻星入墓': ({ pillars, targetSpec, dayStem }) => {
    // 找到所有妻星（财星）出现的位置，看是否在墓库支中
    const tombBranch = ELEMENT_TOMB['金']; // 若日主是木，财星是金，金墓在丑
    // 实际需根据日主五行计算财星五行，再找其墓支
    return pillars.some(p => ZHI_ATTS[p.zhi]?.includes(tombBranch));
  },

  '正偏财杂见': ({ pillars, dayStem }) => {
    const hasZhengCai = pillars.some(p => getShiShen(dayStem, p.gan) === '正财');
    const hasPianCai = pillars.some(p => getShiShen(dayStem, p.gan) === '偏财');
    return hasZhengCai && hasPianCai;
  },

  '官杀混杂': ({ pillars, dayStem }) => {
    const hasGuan = pillars.some(p => getShiShen(dayStem, p.gan) === '正官');
    const hasSha = pillars.some(p => getShiShen(dayStem, p.gan) === '七杀');
    return hasGuan && hasSha;
  },

  '伤官太重': ({ pillars, dayStem }) => {
    const shangCount = pillars.filter(p => getShiShen(dayStem, p.gan) === '伤官').length;
    return shangCount >= 2;
  },

  // exam_study
  '贪财坏印': ({ pillars, dayStem }) => {
    // 财星重且命局印星受克
    // 简化：财星数量 > 印星数量 且 有财克印的关系
  },
};
```

---

## 七、综合状态与断语生成

### 7.1 整体稳定性评级规则

```
overall_stability 判断优先级：

1. 目标宫位被六冲 → 'dynamic'（宫位不稳）
2. 目标十神入墓 + 无刑冲开墓 → 'buried'（藏而不显）
3. 目标十神被合化（五行改变）→ 'damaged'（失去本性）
4. 目标十神死绝 + 空亡 → 'damaged'（虚弱）
5. 目标宫位被三刑 → 'dynamic'
6. 目标十神帝旺/临官 + 无冲克 → 'strong'
7. 其余 → 'stable'
```

### 7.2 断语模板（基于状态标签组合）

按 subcategory 生成不同方向的断语：

```javascript
const VERDICT_TEMPLATES = {
  // relationship / marriage_pattern
  marriage_pattern: {
    '宫位受冲': '妻宫（日支）受{partner}冲，婚宫不稳，感情易生波折',
    '入墓': '妻星入墓（{tombBranch}），如藏于匣中，需流年冲开方能显现，主晚婚或难觅',
    '被合化': '妻星（{shishen}）被合化为{element}，失去财星本性，感情关系易变质或伴侣难以把握',
    '合而不化': '妻星被{partner}合住（合而不化），主感情有牵绊，难以明确或推进',
    '宫位稳固+有根': '妻宫稳固，妻星有根有力，婚姻基础牢固',
    '妻宫双现': '妻宫双现（日支与{otherPillar}支相同），有两次婚姻之象',
    '正偏财杂见': '正偏财杂见，感情不专一，有多婚或外遇之象',
  },

  // relationship / relationship_timing
  relationship_timing: {
    // 基准状态描述（供 Step 3 知道从什么状态出发）
    '宫位受冲': '妻宫当前处于被冲的动态，需流年"合解"才能稳定=结婚',
    '宫位被合': '妻宫当前被合住，处于羁绊状态，需冲开或合满才能有动作',
    '入墓': '妻星入墓，处于封藏状态，流年逢冲开墓即为恋爱/结婚窗口',
    '宫位稳固': '妻宫当前安静稳固，流年逢合动或妻星透干时即为结婚应期',
  },

  // finance_wealth / wealth_capacity
  wealth_capacity: {
    '有根+帝旺': '财星旺相有根，命局财气充足，先天财富容量大',
    '死绝': '财星死绝，先天财气不足，需食伤生助方能聚财',
    '被合化': '财星被合化，钱财易转化为他物（如感情、名誉），难以直接积累',
    '入墓': '财星入库，财富多为暗聚型，不显山露水，需开库方能动用',
  },
};
```

---

## 八、与现有系统的集成点

### 8.1 数据来源

```
baziLocalMatrix.buildLocalBaziMatrix(profile, date)
  → matrix.pillars[4]  {name, gan, zhi, hidden_stems, shi, is_kong, shensha, ...}
  → matrix.current_dayun（Step 3 用）
  → matrix.current_liunian（Step 3 用）
```

### 8.2 调用链

```javascript
// api/bazi.js 或 baziQuestionCore.js 中

// Step 1（已实现）
const targetSpec = resolveTargetElement({ category, subcategory, gender });

// Step 2（本 PRD）
const stateReport = assessOriginalChartState({
  matrix: profile.bazi_detail.matrix,
  targetSpec,
  dayStem: profile.bazi_detail.dayStem,
  gender: profile.gender,
});

// Step 3（待设计）
const dynamicReport = assessDynamicTriggers({
  matrix,
  targetSpec,
  stateReport,           // ← base_state 作为起点
  dayunGanzhi: matrix.current_dayun,
  liunianGanzhi: matrix.current_liunian,
});

// 注入 prompt
const prompt = buildBaziQuestionPrompt({
  profile,
  question,
  route,
  targetSpec,
  stateReport,           // ← 提供原局基准状态
  dynamicReport,         // ← 提供大运流年触发分析
});
```

---

## 九、实现优先级

### Phase 1：修复数据缺口（1-2天）

- [ ] 补全 `ZHI_POS` 六破为完整6对
- [ ] 补全 `ZHI_ANHE` 暗合对
- [ ] 提取 `getGaitouJiejiao()` 为独立工具函数（从 calculateAnnualScore.js 抽离）
- [ ] 新增 `ELEMENT_TOMB` 映射（五行 → 墓库支：木→未, 火→戌, 金→丑, 水→辰）
- [ ] 新增合化条件验证函数 `canHuaZhiLiuhe()` 和 `canHuaGanWuhe()`

### Phase 2：核心函数实现（3-4天）

- [ ] `lib/baziRelationScanner.js`：对指定干/支扫描全柱关系，返回 `Relationship[]`
- [ ] `lib/baziStateAssessor.js`：实现 `assessOriginalChartState()`，含 status_tags 和断语
- [ ] 静态检查规则引擎（`STATIC_CHECK_RULES`）实现婚姻/财富/学业的固定检查项

### Phase 3：断语模板（1-2天）

- [ ] 实现 `VERDICT_TEMPLATES` 针对主要 subcategory
- [ ] `formatOriginalStateForPrompt(stateReport)` 将输出格式化为可注入 prompt 的文本
- [ ] 单元测试：覆盖妻星入墓/妻宫受冲/合化/拱合等典型案例

### Phase 4：拱合（P2，后续）

- [ ] 将 bazi.py 中的拱合逻辑移植到 JS
- [ ] 集成到 RelationScanner

---

## 十、关键边界与设计原则

1. **关系权重 > 喜忌判断**：Step 2 只输出"目标元素受到什么关系"，不判断吉凶——吉凶由喜忌决定，喜忌由 Step 1 的分析模式和格局决定，在 prompt 层融合

2. **合化必须验证条件**：不能因为两个字"能合"就直接标记为"合化"，需验证月令或天干引化，否则只标记"合而不化/羁绊"

3. **宫位与十神分开评估**：`marriage_pattern` 要同时看妻宫（日支）稳定性 + 妻星完整性，两者缺一不可，但它们是独立的评估对象

4. **base_state 是 Step 3 的起点**：`overall_stability` 和 `base_state` 描述的是原局中目标元素"当前处于什么静态"，Step 3 的全部意义在于：岁运如何改变这个状态

5. **空亡降权但不消除**：空亡的支/干仍然参与关系计算，但在状态评估中降低其力量权重（陆致极："空亡只是减力，不代表完全无用"）
