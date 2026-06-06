# Bazi Image And Transformation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a structured `image_analysis` layer for follow-force, dominant, transformation, and two-qi images; use it to explain and optionally override ordinary Bazi pattern and favorable-element decisions.

**Architecture:** Create a focused `lib/baziImageAssessor.js` module that enumerates and scores image candidates without mutating other engine results. Feed its structured output into a centralized pattern override resolver, the existing favorable-element engine, the question-analysis pipeline, a small dynamic luck-effect evaluator, and the existing Bazi pattern card. Keep the current month-command pattern as `base_pattern`; only candidates with `match_score >= 80` and an override-enabled category may replace `final_pattern` and switch favorable-element strategy.

**Tech Stack:** CommonJS Node.js, Node built-in test runner, Vue 3 single-file components, Vite.

---

## File Map

| File | Responsibility |
|---|---|
| `lib/baziImageAssessor.js` | New isolated image scoring module, candidate selection, thresholds, reason codes, and pattern override resolution. |
| `lib/baziImageAssessor.test.js` | New unit tests for scoring, thresholds, transformation caps, and two-qi non-override behavior. |
| `lib/BaziRuleEngine.js` | Consume structured image analysis when resolving favorable and unfavorable gods; remove string-based special-pattern inference from the main path. |
| `lib/BaziRuleEngine.test.js` | Verify `60-79` remains ordinary and `80+` activates the `L0` override. |
| `lib/baziCore.js` | Compute `image_analysis`, preserve `base_pattern`, pass override context into favorable scoring, return structured data to API consumers. |
| `lib/bazi-api.test.js` | Verify complete profile details expose `image_analysis` and final-pattern override metadata. |
| `lib/baziStateAssessor.js` | Accept upstream `imageAnalysis`, expose `image_context`, and include it in prompt text. |
| `lib/baziQuestionCore.js` | Carry `image_analysis` from the profile into static, status, timing, and legacy prompt contexts. |
| `lib/baziStateAssessor.test.js` | Verify static state output and prompt formatting include shape context. |
| `lib/baziQuestionCore.test.js` | Verify pipeline extraction preserves image context. |
| `lib/baziDynamicAssessor.js` | Add a first-phase `image_luck_effect` result without rewriting natal `match_score`. |
| `lib/baziDynamicAssessor.test.js` | Verify supportive and breaking luck effects keep the natal score immutable. |
| `src/views/BaziView.vue` | Merge shape score, base pattern, override explanation, dimensions, and penalties into the existing pattern card and insight drawer. |
| `src/views/BaziView.layout.test.mjs` | Verify the existing pattern UI contains image score and explanation bindings. |
| `fixtures/bazi-image-cases/README.md` | Define the manual case-fixture format for later calibration. |

## Scope Guardrails

- Treat all numeric weights as `image-score-v1` engineering defaults for later case calibration.
- Do not train weights or add opaque one-off exceptions.
- Do not let `TWO_QI_IMAGE` override favorable-element decisions in this phase.
- Do not rewrite natal `match_score` from luck-cycle inputs.
- Do not add a new homepage card; extend the current pattern card and drawer.

### Task 1: Add The Image Scoring Module

**Files:**
- Create: `lib/baziImageAssessor.js`
- Create: `lib/baziImageAssessor.test.js`

- [ ] **Step 1: Write failing threshold and follow-image tests**

Create `lib/baziImageAssessor.test.js` with:

```js
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  assessBaziImage,
  resolvePatternOverride,
} = require('./baziImageAssessor');

test('follow wealth image scores as formed and overrides ordinary pattern at 80+', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['丙', '戊', '甲', '己'],
    zhis: ['戌', '戌', '戌', '戌'],
    monthZhi: '戌',
  });

  assert.equal(result.primary_candidate.category, 'FOLLOW_IMAGE');
  assert.equal(result.primary_candidate.subtype, '从财格');
  assert.ok(result.primary_candidate.match_score >= 80);
  assert.equal(result.primary_candidate.override_normal_pattern, true);
  assert.ok(result.reason_codes.includes('DM_ROOTLESS'));
  assert.ok(result.reason_codes.includes('WEALTH_QI_DOMINANT'));

  assert.deepEqual(resolvePatternOverride({
    basePattern: '正财格',
    imageAnalysis: result,
  }), {
    basis: 'SPECIAL_IMAGE_OVERRIDE',
    base_pattern: '正财格',
    final_pattern: '从财格',
    overridden: true,
    yongshen_strategy: 'FOLLOW_FORCE',
  });
});

test('suspected image between 60 and 79 stays on ordinary pattern', () => {
  const override = resolvePatternOverride({
    basePattern: '正财格',
    imageAnalysis: {
      primary_candidate: {
        category: 'FOLLOW_IMAGE',
        subtype: '从财格',
        match_score: 72,
        yongshen_strategy: 'FOLLOW_FORCE',
      },
    },
  });

  assert.equal(override.final_pattern, '正财格');
  assert.equal(override.overridden, false);
});
```

- [ ] **Step 2: Run the new test file and verify failure**

Run:

```bash
node --test lib/baziImageAssessor.test.js
```

Expected: FAIL with `Cannot find module './baziImageAssessor'`.

- [ ] **Step 3: Implement shared constants, score labels, and follow-image scoring**

Create `lib/baziImageAssessor.js` with:

```js
'use strict';

const C = require('./constants/core');

const IMAGE_CATEGORY = {
  NONE: 'NONE',
  SINGLE: 'SINGLE_IMAGE',
  TWO_QI: 'TWO_QI_IMAGE',
  FOLLOW: 'FOLLOW_IMAGE',
  TRANSFORMATION: 'TRANSFORMATION_IMAGE',
};

const CONFIG_VERSION = 'image-score-v1';
const OVERRIDE_MIN_SCORE = 80;
const PURE_MIN_SCORE = 95;
const WUXING_KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const WUXING_SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const WUXING_KE_BY = Object.fromEntries(Object.entries(WUXING_KE).map(([a, b]) => [b, a]));
const WUXING_SHENG_BY = Object.fromEntries(Object.entries(WUXING_SHENG).map(([a, b]) => [b, a]));

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getMatchMeta(score) {
  if (score >= PURE_MIN_SCORE) return { match_label: '高纯度成象', status: 'PURE' };
  if (score >= OVERRIDE_MIN_SCORE) return { match_label: '成象', status: 'FORMED' };
  if (score >= 60) return { match_label: '疑似成象', status: 'SUSPECTED' };
  return { match_label: '未成象', status: 'NOT_FORMED' };
}

function getWuxingScores(gans = [], zhis = []) {
  const scores = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
  gans.forEach(gan => {
    const wx = C.GAN5[gan];
    if (wx) scores[wx] += 1;
  });
  zhis.forEach(zhi => {
    const hides = C.ZHI5_LIST[zhi] || [];
    if (hides[0]) scores[C.GAN5[hides[0]]] += 0.8;
    if (hides[1]) scores[C.GAN5[hides[1]]] += 0.5;
    if (hides[2]) scores[C.GAN5[hides[2]]] += 0.3;
  });
  const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
  return {
    scores,
    ratios: Object.fromEntries(Object.entries(scores).map(([wx, score]) => [wx, total ? score / total : 0])),
  };
}

function getDmSupport(dayGan, gans = [], zhis = []) {
  const dmWx = C.GAN5[dayGan];
  const resourceWx = WUXING_SHENG_BY[dmWx];
  const supportStems = gans.filter((gan, index) => index !== 2 && [dmWx, resourceWx].includes(C.GAN5[gan]));
  const roots = [];
  zhis.forEach(zhi => {
    (C.ZHI5_LIST[zhi] || []).forEach((gan, index) => {
      if ([dmWx, resourceWx].includes(C.GAN5[gan])) roots.push({ zhi, gan, weight: [1, 0.6, 0.3][index] || 0 });
    });
  });
  return { supportStems, roots };
}

function finalizeCandidate(candidate) {
  const match_score = clamp(Math.round(candidate.raw_score));
  const meta = getMatchMeta(match_score);
  return {
    ...candidate,
    match_score,
    ...meta,
    override_normal_pattern: candidate.allow_override !== false && match_score >= OVERRIDE_MIN_SCORE,
  };
}

function scoreFollowCandidates({ dayGan, gans, zhis, monthZhi, wuxing }) {
  const dmWx = C.GAN5[dayGan];
  const support = getDmSupport(dayGan, gans, zhis);
  const rootScore = support.roots.length ? 0 : 20;
  const stemScore = support.supportStems.length ? 0 : 15;
  const monthWx = C.GAN5[(C.ZHI5_LIST[monthZhi] || [])[0]];
  const definitions = [
    { subtype: '从财格', target: WUXING_KE[dmWx], reason: 'WEALTH_QI_DOMINANT', yongshen_strategy: 'FOLLOW_FORCE' },
    { subtype: '从官杀格', target: WUXING_KE_BY[dmWx], reason: 'OFFICIAL_QI_DOMINANT', yongshen_strategy: 'FOLLOW_FORCE' },
    { subtype: '从儿格', target: WUXING_SHENG[dmWx], reason: 'OUTPUT_QI_DOMINANT', yongshen_strategy: 'FOLLOW_FORCE' },
  ];
  return definitions.map(definition => {
    const ratio = wuxing.ratios[definition.target] || 0;
    const dimensions = [
      { key: 'target_dominance', score: Math.round(Math.min(35, ratio * 50)), max: 35, text: `${definition.target}势集中` },
      { key: 'month_support', score: monthWx === definition.target ? 15 : 0, max: 15, text: monthWx === definition.target ? '月令支持目标阵营' : '月令未直接支持目标阵营' },
      { key: 'dm_root', score: rootScore, max: 20, text: rootScore ? '日主四支无根' : '日主仍有根气' },
      { key: 'stem_support', score: stemScore, max: 15, text: stemScore ? '天干无印比援助' : '天干仍见印比援助' },
    ];
    const reason_codes = [definition.reason];
    if (rootScore) reason_codes.push('DM_ROOTLESS');
    if (!stemScore) reason_codes.push('DM_HAS_VISIBLE_SUPPORT');
    return finalizeCandidate({
      category: IMAGE_CATEGORY.FOLLOW,
      subtype: definition.subtype,
      target_element: definition.target,
      yongshen_strategy: definition.yongshen_strategy,
      raw_score: dimensions.reduce((sum, item) => sum + item.score, 0),
      dimensions,
      penalties: [],
      reason_codes,
    });
  });
}

function assessBaziImage({ dayGan, gans = [], zhis = [], monthZhi = '' }) {
  const wuxing = getWuxingScores(gans, zhis);
  const candidates = scoreFollowCandidates({ dayGan, gans, zhis, monthZhi, wuxing })
    .sort((a, b) => b.match_score - a.match_score);
  const primary = candidates[0] || finalizeCandidate({
    category: IMAGE_CATEGORY.NONE,
    subtype: '',
    raw_score: 0,
    allow_override: false,
    dimensions: [],
    penalties: [],
    reason_codes: [],
  });
  return {
    primary_candidate: primary,
    alternatives: candidates.slice(1),
    dimensions: primary.dimensions,
    penalties: primary.penalties,
    reason_codes: primary.reason_codes,
    config_version: CONFIG_VERSION,
  };
}

function resolvePatternOverride({ basePattern, imageAnalysis }) {
  const candidate = imageAnalysis?.primary_candidate;
  const overridden = !!candidate?.override_normal_pattern;
  return {
    basis: overridden ? 'SPECIAL_IMAGE_OVERRIDE' : 'MONTH_PATTERN',
    base_pattern: basePattern,
    final_pattern: overridden ? candidate.subtype : basePattern,
    overridden,
    yongshen_strategy: overridden ? candidate.yongshen_strategy : 'NORMAL',
  };
}

module.exports = {
  IMAGE_CATEGORY,
  CONFIG_VERSION,
  assessBaziImage,
  resolvePatternOverride,
};
```

- [ ] **Step 4: Run the new test file**

Run:

```bash
node --test lib/baziImageAssessor.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit the base scorer**

```bash
git add lib/baziImageAssessor.js lib/baziImageAssessor.test.js
git commit -m "feat(bazi): add image analysis scorer"
```

### Task 2: Add Dedicated Dominant, Transformation, Two-Qi, And Mixed-Follow Candidates

**Files:**
- Modify: `lib/baziImageAssessor.js`
- Modify: `lib/baziImageAssessor.test.js`

- [ ] **Step 1: Add failing classifier tests**

Append:

```js
test('dominant wood image does not require the day master to be rootless', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['甲', '乙', '甲', '癸'],
    zhis: ['寅', '卯', '亥', '寅'],
    monthZhi: '卯',
  });
  assert.equal(result.primary_candidate.category, 'SINGLE_IMAGE');
  assert.equal(result.primary_candidate.subtype, '曲直格');
  assert.ok(result.primary_candidate.match_score >= 80);
});

test('transformation image recognizes adjacent day-stem combine', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['戊', '己', '甲', '丙'],
    zhis: ['戌', '丑', '辰', '未'],
    monthZhi: '丑',
  });
  assert.equal(result.primary_candidate.category, 'TRANSFORMATION_IMAGE');
  assert.equal(result.primary_candidate.subtype, '甲己化土');
  assert.ok(result.reason_codes.includes('ADJACENT_STEM_COMBINE'));
});

test('serious jealous combine caps transformation image below override threshold', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['己', '己', '甲', '戊'],
    zhis: ['戌', '丑', '辰', '未'],
    monthZhi: '丑',
  });
  const transform = [result.primary_candidate, ...result.alternatives]
    .find(candidate => candidate.category === 'TRANSFORMATION_IMAGE');
  assert.ok(transform.match_score <= 79);
  assert.equal(transform.override_normal_pattern, false);
  assert.ok(transform.reason_codes.includes('JEALOUS_COMBINE'));
});

test('two qi image remains descriptive even above 80', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['甲', '丙', '甲', '丁'],
    zhis: ['寅', '午', '卯', '巳'],
    monthZhi: '午',
  });
  const twoQi = [result.primary_candidate, ...result.alternatives]
    .find(candidate => candidate.category === 'TWO_QI_IMAGE');
  assert.ok(twoQi.match_score >= 80);
  assert.equal(twoQi.override_normal_pattern, false);
});
```

- [ ] **Step 2: Run tests and verify the new cases fail**

Run:

```bash
node --test lib/baziImageAssessor.test.js
```

Expected: FAIL because only follow-image candidates exist.

- [ ] **Step 3: Implement the remaining candidate scorers**

Add these helpers in `lib/baziImageAssessor.js`, keeping each scorer independent:

```js
const STEM_COMBINES = {
  甲己: '土', 己甲: '土',
  乙庚: '金', 庚乙: '金',
  丙辛: '水', 辛丙: '水',
  丁壬: '木', 壬丁: '木',
  戊癸: '火', 癸戊: '火',
};
const SINGLE_IMAGE_NAMES = { 木: '曲直格', 火: '炎上格', 土: '稼穑格', 金: '从革格', 水: '润下格' };

function scoreSingleImage({ dayGan, monthZhi, wuxing }) {
  const dmWx = C.GAN5[dayGan];
  const ratio = wuxing.ratios[dmWx] || 0;
  const monthWx = C.GAN5[(C.ZHI5_LIST[monthZhi] || [])[0]];
  const dimensions = [
    { key: 'same_camp_dominance', score: Math.round(Math.min(40, ratio * 55)), max: 40, text: `${dmWx}势集中` },
    { key: 'month_support', score: monthWx === dmWx ? 20 : 0, max: 20, text: monthWx === dmWx ? '月令支持旺神' : '月令未直接支持旺神' },
    { key: 'purity', score: ratio >= 0.7 ? 20 : Math.round(ratio * 20), max: 20, text: '同党成势纯度' },
  ];
  return finalizeCandidate({
    category: IMAGE_CATEGORY.SINGLE,
    subtype: SINGLE_IMAGE_NAMES[dmWx],
    target_element: dmWx,
    yongshen_strategy: 'FOLLOW_FORCE',
    raw_score: dimensions.reduce((sum, item) => sum + item.score, 0),
    dimensions,
    penalties: [],
    reason_codes: ['TARGET_QI_DOMINANT'],
  });
}

function scoreTransformationImages({ dayGan, gans, zhis, monthZhi, wuxing }) {
  const dayIndex = 2;
  const partnerIndexes = [1, 3];
  return partnerIndexes.flatMap(index => {
    const partner = gans[index];
    const transformWx = STEM_COMBINES[`${dayGan}${partner}`];
    if (!transformWx) return [];
    const jealous = gans.filter((gan, ganIndex) => ganIndex !== dayIndex && gan === partner).length > 1;
    const monthWx = C.GAN5[(C.ZHI5_LIST[monthZhi] || [])[0]];
    const branchSupport = zhis.filter(zhi => (C.ZHI5_LIST[zhi] || []).some(gan => C.GAN5[gan] === transformWx)).length;
    const dimensions = [
      { key: 'adjacent_combine', score: 25, max: 25, text: `日干${dayGan}与${partner}紧贴五合` },
      { key: 'month_support', score: monthWx === transformWx ? 20 : 0, max: 20, text: monthWx === transformWx ? '化神得月令支持' : '化神未得月令直接支持' },
      { key: 'branch_support', score: Math.min(20, branchSupport * 5), max: 20, text: '地支支持化神' },
      { key: 'no_jealous_combine', score: jealous ? 0 : 10, max: 10, text: jealous ? '存在争合' : '无争合' },
      { key: 'transform_qi_intact', score: 10, max: 10, text: '化神未见强力克破' },
    ];
    return [finalizeCandidate({
      category: IMAGE_CATEGORY.TRANSFORMATION,
      subtype: `${dayGan}${partner}化${transformWx}`,
      target_element: transformWx,
      yongshen_strategy: 'TRANSFORM_FORCE',
      raw_score: jealous ? Math.min(79, dimensions.reduce((sum, item) => sum + item.score, 0)) : dimensions.reduce((sum, item) => sum + item.score, 0),
      dimensions,
      penalties: jealous ? [{ key: 'jealous_combine', score: -20, text: '争合封顶为疑似成象' }] : [],
      reason_codes: jealous ? ['ADJACENT_STEM_COMBINE', 'JEALOUS_COMBINE'] : ['ADJACENT_STEM_COMBINE'],
    })];
  });
}

function scoreTwoQiImage({ wuxing }) {
  const top = Object.entries(wuxing.ratios).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const combined = top[0][1] + top[1][1];
  const diff = Math.abs(top[0][1] - top[1][1]);
  const dimensions = [
    { key: 'two_qi_total', score: Math.round(Math.min(45, combined * 50)), max: 45, text: '两种主导五行集中' },
    { key: 'two_qi_balance', score: Math.round(Math.max(0, 25 - diff * 100)), max: 25, text: '两气力量接近' },
    { key: 'mixed_qi_low', score: Math.round(Math.max(0, 20 - (1 - combined) * 30)), max: 20, text: '其余杂气较少' },
  ];
  return finalizeCandidate({
    category: IMAGE_CATEGORY.TWO_QI,
    subtype: `${top[0][0]}${top[1][0]}成象`,
    target_elements: top.map(([wx]) => wx),
    yongshen_strategy: 'DESCRIPTIVE_ONLY',
    allow_override: false,
    raw_score: dimensions.reduce((sum, item) => sum + item.score, 0),
    dimensions,
    penalties: [],
    reason_codes: ['TWO_QI_BALANCED'],
  });
}

function scoreMixedFollowImage({ dayGan, gans, zhis, wuxing }) {
  const dmWx = C.GAN5[dayGan];
  const support = getDmSupport(dayGan, gans, zhis);
  const camps = [
    WUXING_SHENG[dmWx],
    WUXING_KE[dmWx],
    WUXING_KE_BY[dmWx],
  ].map(wx => ({ wx, ratio: wuxing.ratios[wx] || 0 }))
    .filter(item => item.ratio >= 0.18);
  if (support.roots.length || support.supportStems.length || camps.length < 2) return null;
  if (Math.max(...camps.map(item => item.ratio)) >= 0.5) return null;
  const combined = camps.reduce((sum, item) => sum + item.ratio, 0);
  const mixedScore = Math.round(Math.min(35, combined * 40));
  return finalizeCandidate({
    category: IMAGE_CATEGORY.FOLLOW,
    subtype: '从势格',
    target_elements: camps.map(item => item.wx),
    yongshen_strategy: 'FOLLOW_FORCE',
    raw_score: 35 + mixedScore + 20 + 15,
    dimensions: [
      { key: 'mixed_force', score: 35, max: 35, text: '食伤、财、官杀至少两类混合成势' },
      { key: 'mixed_force_total', score: mixedScore, max: 35, text: '克泄耗阵营占据主导' },
      { key: 'dm_root', score: 20, max: 20, text: '日主四支无根' },
      { key: 'stem_support', score: 15, max: 15, text: '天干无印比援助' },
    ],
    penalties: [],
    reason_codes: ['TARGET_QI_MIXED', 'DM_ROOTLESS'],
  });
}
```

Replace `assessBaziImage()` with:

```js
function assessBaziImage({ dayGan, gans = [], zhis = [], monthZhi = '' }) {
  const wuxing = getWuxingScores(gans, zhis);
  const mixedFollow = scoreMixedFollowImage({ dayGan, gans, zhis, wuxing });
  const candidates = [
    ...scoreFollowCandidates({ dayGan, gans, zhis, monthZhi, wuxing }),
    scoreSingleImage({ dayGan, monthZhi, wuxing }),
    ...scoreTransformationImages({ dayGan, gans, zhis, monthZhi, wuxing }),
    scoreTwoQiImage({ wuxing }),
    ...(mixedFollow ? [mixedFollow] : []),
  ].sort((a, b) => b.match_score - a.match_score);
  const primary = candidates[0] || finalizeCandidate({
    category: IMAGE_CATEGORY.NONE,
    subtype: '',
    raw_score: 0,
    allow_override: false,
    dimensions: [],
    penalties: [],
    reason_codes: [],
  });
  return {
    primary_candidate: primary,
    alternatives: candidates.slice(1),
    dimensions: primary.dimensions,
    penalties: primary.penalties,
    reason_codes: primary.reason_codes,
    config_version: CONFIG_VERSION,
  };
}
```

- [ ] **Step 4: Run scorer tests**

Run:

```bash
node --test lib/baziImageAssessor.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit candidate coverage**

```bash
git add lib/baziImageAssessor.js lib/baziImageAssessor.test.js
git commit -m "feat(bazi): score dominant and transformation images"
```

### Task 3: Wire Image Analysis Into The Main Engine

**Files:**
- Modify: `lib/BaziRuleEngine.js`
- Modify: `lib/BaziRuleEngine.test.js`
- Modify: `lib/baziCore.js`
- Modify: `lib/bazi-api.test.js`

- [ ] **Step 1: Add failing rule-engine override tests**

Append to `lib/BaziRuleEngine.test.js`:

```js
test('getFavorableUnfavorable keeps ordinary dimensions for suspected image below 80', () => {
  const result = BaziRuleEngine.getFavorableUnfavorable(
    '甲', '丑', '正财格',
    { strongWeak: '身弱', totalStrengthScore: 2 },
    ['戌', '丑', '未', '戌'],
    ['丙', '戊', '甲', '己'],
    null,
    {
      primary_candidate: {
        category: 'FOLLOW_IMAGE',
        subtype: '从财格',
        match_score: 72,
        override_normal_pattern: false,
      },
    }
  );
  assert.equal(result.special_pattern, null);
  assert.notEqual(result.decision_chain[0].layer, 'L0 特殊气势');
});

test('getFavorableUnfavorable consumes structured image override at 80+', () => {
  const result = BaziRuleEngine.getFavorableUnfavorable(
    '甲', '丑', '正财格',
    { strongWeak: '身弱', totalStrengthScore: 2 },
    ['戌', '丑', '未', '戌'],
    ['丙', '戊', '甲', '己'],
    null,
    {
      primary_candidate: {
        category: 'FOLLOW_IMAGE',
        subtype: '从财格',
        match_score: 86,
        override_normal_pattern: true,
        yongshen_strategy: 'FOLLOW_FORCE',
      },
    }
  );
  assert.equal(result.special_pattern.type, '从财');
  assert.equal(result.decision_chain[0].layer, 'L0 特殊气势');
});
```

- [ ] **Step 2: Add a failing API exposure assertion**

In `lib/bazi-api.test.js`, extend the complete-detail test:

```js
assert.ok(result.image_analysis);
assert.ok(result.image_analysis.primary_candidate);
assert.equal(result.pattern_analysis.extraction.base_pattern, result.geju);
```

- [ ] **Step 3: Run focused tests and verify failure**

Run:

```bash
node --test lib/BaziRuleEngine.test.js lib/bazi-api.test.js
```

Expected: FAIL because the favorable scorer does not accept `imageAnalysis` and complete details do not expose `image_analysis`.

- [ ] **Step 4: Update the favorable scorer to consume structured image overrides**

In `lib/BaziRuleEngine.js`:

```js
getFavorableUnfavorable(dayGan, monthZhi, geJu, strengthResult, zhis, gans, geJuInfoRecord = null, imageAnalysis = null) {
```

Replace the old `getSpecialPattern()` inference with a mapper that reads `imageAnalysis.primary_candidate` only when `override_normal_pattern === true`. Map:

```js
const IMAGE_SPECIAL_PATTERN = {
  '从财格': {
    type: '从财',
    favorable: ['正财', '偏财', '正官', '七杀'],
    unfavorable: ['正印', '偏印', '比肩', '劫财'],
  },
  '从官杀格': {
    type: '从官杀',
    favorable: ['正官', '七杀', '正财', '偏财'],
    unfavorable: ['正印', '偏印', '比肩', '劫财', '食神', '伤官'],
  },
  '从儿格': {
    type: '从食伤',
    favorable: ['食神', '伤官', '正财', '偏财'],
    unfavorable: ['正印', '偏印', '比肩', '劫财', '正官', '七杀'],
  },
  '从势格': {
    type: '从势',
    favorable: [],
    unfavorable: ['比肩', '劫财', '正印', '偏印'],
  },
};
```

Replace `getSpecialPattern()` with:

```js
const getSpecialPattern = () => {
  const candidate = imageAnalysis?.primary_candidate;
  if (!candidate?.override_normal_pattern) return null;
  if (candidate.category === 'TWO_QI_IMAGE') return null;
  if (candidate.category === 'SINGLE_IMAGE') {
    return {
      type: '专旺',
      favorable: ['比肩', '劫财', '食神', '伤官'],
      unfavorable: ['正官', '七杀', '正财', '偏财', '正印', '偏印'],
    };
  }
  if (candidate.category === 'TRANSFORMATION_IMAGE') {
    const favorable = getShensByWuxing(candidate.target_element);
    const unfavorable = getShensByWuxing(RESTRAINING_CYCLE[candidate.target_element]);
    return { type: candidate.subtype, favorable, unfavorable };
  }
  return IMAGE_SPECIAL_PATTERN[candidate.subtype] || null;
};
```

- [ ] **Step 5: Compute image analysis before favorable scoring**

In `lib/baziCore.js`:

```js
const { assessBaziImage, resolvePatternOverride } = require('./baziImageAssessor');
```

After `calculateStrength()` and before `getFavorableUnfavorable()`:

```js
const imageAnalysis = assessBaziImage({
  dayGan,
  gans: gansArr,
  zhis: zhisArr,
  monthZhi,
  strengthDetail: strengthResult.strengthDetail,
  interactions: null,
});
const patternOverride = resolvePatternOverride({
  basePattern: geJu,
  imageAnalysis,
});
```

Pass `imageAnalysis` into `getFavorableUnfavorable()`. Update the `buildPatternAnalysis()` signature and replace its existing pattern-name setup with:

```js
function buildPatternAnalysis({
  geJuInfo = {},
  geJu = '',
  geJuInfoRecord = null,
  chengGeDetail = {},
  strengthResult = {},
  favorableResult = {},
  imageAnalysis = null,
  patternOverride = null,
  monthHiddenGans = [],
  monthZhi = '',
  dayGan = ''
} = {}) {
  const specialPattern = favorableResult.special_pattern || null;
  const basePatternName = geJu || geJuInfo.geju || chengGeDetail.chengGe || '未定格';
  const finalPatternName = patternOverride?.final_pattern || basePatternName;
  const finalPatternCategory = patternOverride?.overridden ? 'SPECIAL_FORCE' : _getPatternCategory(finalPatternName);
  const extractionBasis = patternOverride?.overridden ? 'SPECIAL_IMAGE_OVERRIDE' : _buildExtractionBasis(geJuInfo);
```

Pass `imageAnalysis` and `patternOverride` into `buildPatternAnalysis()`, and add this property to the returned detail object:

```js
image_analysis: imageAnalysis,
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
node --test lib/BaziRuleEngine.test.js lib/bazi-api.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit engine wiring**

```bash
git add lib/BaziRuleEngine.js lib/BaziRuleEngine.test.js lib/baziCore.js lib/bazi-api.test.js
git commit -m "feat(bazi): wire image overrides into pattern engine"
```

### Task 4: Pass Image Context Into Static And Question Pipelines

**Files:**
- Modify: `lib/baziStateAssessor.js`
- Modify: `lib/baziStateAssessor.test.js`
- Modify: `lib/baziQuestionCore.js`
- Modify: `lib/baziQuestionCore.test.js`

- [ ] **Step 1: Add failing state assessor tests**

Append to `lib/baziStateAssessor.test.js`:

```js
test('assessOriginalChartState exposes upstream image context without recalculating it', () => {
  const imageAnalysis = {
    primary_candidate: {
      category: 'FOLLOW_IMAGE',
      subtype: '从财格',
      match_score: 86,
      match_label: '成象',
      override_normal_pattern: true,
      yongshen_strategy: 'FOLLOW_FORCE',
    },
  };
  const output = assessOriginalChartState({
    matrix: TEST_MATRIX,
    targetSpec,
    dayStem: DAY_STEM,
    gender: GENDER,
    imageAnalysis,
  });
  assert.deepEqual(output.image_context, imageAnalysis.primary_candidate);
  assert.match(formatStateReportForPrompt(output), /形象判断：从财格，匹配度86%/);
});
```

- [ ] **Step 2: Add failing extraction test**

Extend `extractBaziAnalysisParams maps profile matrix into pipeline params including birth year` in `lib/baziQuestionCore.test.js`:

```js
image_analysis: {
  primary_candidate: {
    category: 'FOLLOW_IMAGE',
    subtype: '从财格',
    match_score: 86,
    override_normal_pattern: true,
  },
},
```

Assert:

```js
assert.equal(result.params.imageAnalysis.primary_candidate.subtype, '从财格');
```

- [ ] **Step 3: Run focused tests and verify failure**

Run:

```bash
node --test lib/baziStateAssessor.test.js lib/baziQuestionCore.test.js
```

Expected: FAIL because `imageAnalysis` is not forwarded or formatted.

- [ ] **Step 4: Add image context to static reports**

In `lib/baziStateAssessor.js`, update the signature:

```js
function assessOriginalChartState({ matrix, targetSpec, dayStem, gender, imageAnalysis = null }) {
```

Return:

```js
image_context: imageAnalysis?.primary_candidate || null,
```

In `formatStateReportForPrompt()`, insert after the stability line:

```js
if (report.image_context?.subtype) {
  lines.push(`形象判断：${report.image_context.subtype}，匹配度${report.image_context.match_score}%（${report.image_context.match_label || '待判'}）${report.image_context.override_normal_pattern ? '，已覆盖常规喜忌。' : '，暂不覆盖常规喜忌。'}`);
}
```

- [ ] **Step 5: Carry upstream analysis through every question pipeline**

In `lib/baziQuestionCore.js`, add to extracted params:

```js
imageAnalysis: detail.image_analysis || null,
```

Pass `imageAnalysis: params.imageAnalysis` into all three `assessOriginalChartState()` calls in `runStatusPipeline()`, `runStaticPipeline()`, and `runTimingPipeline()`.

Also add `image_analysis: detail.image_analysis || {}` to the compact `sizhu_matrix` legacy prompt context.

- [ ] **Step 6: Run focused tests**

Run:

```bash
node --test lib/baziStateAssessor.test.js lib/baziQuestionCore.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit question-pipeline wiring**

```bash
git add lib/baziStateAssessor.js lib/baziStateAssessor.test.js lib/baziQuestionCore.js lib/baziQuestionCore.test.js
git commit -m "feat(bazi): expose image context to question analysis"
```

### Task 5: Add First-Phase Dynamic Image Luck Effects

**Files:**
- Modify: `lib/baziDynamicAssessor.js`
- Modify: `lib/baziDynamicAssessor.test.js`

- [ ] **Step 1: Add failing dynamic-effect tests**

Append:

```js
test('dynamic assessment reports breaking luck for formed follow image without mutating natal score', () => {
  const state = assessOriginalChartState({
    matrix: MATRIX,
    targetSpec: TARGET_SPEC,
    dayStem: DAY_STEM,
    gender: 'male',
    imageAnalysis: {
      primary_candidate: {
        category: 'FOLLOW_IMAGE',
        subtype: '从财格',
        target_element: '水',
        match_score: 88,
        override_normal_pattern: true,
        yongshen_strategy: 'FOLLOW_FORCE',
      },
    },
  });
  const report = assessDynamicTriggers({
    matrix: MATRIX,
    targetSpec: TARGET_SPEC,
    stateReport: state,
    dayStem: DAY_STEM,
    dayunGan: '丁',
    dayunZhi: '巳',
    liunianGan: '丙',
    liunianZhi: '午',
  });
  assert.equal(report.image_luck_effect.natal_match_score, 88);
  assert.equal(state.image_context.match_score, 88);
  assert.ok(['WEAKENED_BY_LUCK', 'BROKEN_BY_LUCK'].includes(report.image_luck_effect.status));
});

test('dynamic assessment reports supportive luck when incoming force matches the image target', () => {
  const state = assessOriginalChartState({
    matrix: MATRIX,
    targetSpec: TARGET_SPEC,
    dayStem: DAY_STEM,
    gender: 'male',
    imageAnalysis: {
      primary_candidate: {
        category: 'FOLLOW_IMAGE',
        subtype: '从财格',
        target_element: '水',
        match_score: 88,
        override_normal_pattern: true,
        yongshen_strategy: 'FOLLOW_FORCE',
      },
    },
  });
  const report = assessDynamicTriggers({
    matrix: MATRIX,
    targetSpec: TARGET_SPEC,
    stateReport: state,
    dayStem: DAY_STEM,
    dayunGan: '壬',
    dayunZhi: '亥',
    liunianGan: '癸',
    liunianZhi: '子',
  });
  assert.equal(report.image_luck_effect.status, 'SUPPORTED_BY_LUCK');
  assert.ok(report.image_luck_effect.score_delta > 0);
  assert.equal(state.image_context.match_score, 88);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
node --test lib/baziDynamicAssessor.test.js
```

Expected: FAIL because `image_luck_effect` does not exist.

- [ ] **Step 3: Add a small pure evaluator**

In `lib/baziDynamicAssessor.js`, add:

```js
function assessImageLuckEffect({ imageContext, dayStem, dayunGan, dayunZhi, liunianGan, liunianZhi }) {
  if (!imageContext?.category || !imageContext?.match_score) {
    return { status: 'NEUTRAL', score_delta: 0, reason_codes: [], natal_match_score: imageContext?.match_score || 0, text: '原局未形成需要单独追踪的特殊形象。' };
  }
  const sheng = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const ke = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  const shengBy = Object.fromEntries(Object.entries(sheng).map(([a, b]) => [b, a]));
  const keBy = Object.fromEntries(Object.entries(ke).map(([a, b]) => [b, a]));
  const dmWx = C.GAN5[dayStem];
  const incoming = [dayunGan, liunianGan, (C.ZHI5_LIST[dayunZhi] || [])[0], (C.ZHI5_LIST[liunianZhi] || [])[0]]
    .map(gan => C.GAN5[gan])
    .filter(Boolean);
  const count = wx => incoming.filter(item => item === wx).length;
  const targetElements = imageContext.target_elements || [imageContext.target_element].filter(Boolean);
  const targetHits = targetElements.reduce((sum, wx) => sum + count(wx), 0);
  let scoreDelta = 0;
  const reasonCodes = [];

  if (imageContext.category === 'FOLLOW_IMAGE') {
    const dmSupportHits = count(dmWx) + count(shengBy[dmWx]);
    if (targetHits) {
      scoreDelta += targetHits * 8;
      reasonCodes.push('LUCK_SUPPORTS_IMAGE_FORCE');
    }
    if (dmSupportHits) {
      scoreDelta -= dmSupportHits * 12;
      reasonCodes.push('RESOURCE_LUCK_SUPPORTS_DM');
    }
  }
  if (imageContext.category === 'SINGLE_IMAGE') {
    if (targetHits) {
      scoreDelta += targetHits * 8;
      reasonCodes.push('LUCK_SUPPORTS_IMAGE_FORCE');
    }
    const breakerHits = count(keBy[imageContext.target_element]);
    if (breakerHits) {
      scoreDelta -= breakerHits * 12;
      reasonCodes.push('OFFICIAL_LUCK_BREAKS_SINGLE_IMAGE');
    }
  }
  if (imageContext.category === 'TRANSFORMATION_IMAGE') {
    const transformSupportHits = targetHits + count(shengBy[imageContext.target_element]);
    if (transformSupportHits) {
      scoreDelta += transformSupportHits * 8;
      reasonCodes.push('LUCK_SUPPORTS_IMAGE_FORCE');
    }
    const breakerHits = count(keBy[imageContext.target_element]);
    if (breakerHits) {
      scoreDelta -= breakerHits * 12;
      reasonCodes.push('LUCK_DAMAGES_TRANSFORM_QI');
    }
  }

  let status = 'NEUTRAL';
  if (scoreDelta <= -20) status = 'BROKEN_BY_LUCK';
  else if (scoreDelta < 0) status = 'WEAKENED_BY_LUCK';
  else if (imageContext.match_score < 80 && imageContext.match_score + scoreDelta >= 80) status = 'FAKE_TO_TRUE';
  else if (scoreDelta > 0) status = 'SUPPORTED_BY_LUCK';
  return {
    status,
    score_delta: scoreDelta,
    reason_codes: reasonCodes,
    natal_match_score: imageContext.match_score,
    text: scoreDelta > 0 ? '岁运顺应原局形象。' : (scoreDelta < 0 ? '岁运与原局形象发生交战。' : '岁运未明显改变当前形象状态。'),
  };
}
```

Use explicit reason codes:

```text
LUCK_SUPPORTS_IMAGE_FORCE
RESOURCE_LUCK_SUPPORTS_DM
OFFICIAL_LUCK_BREAKS_SINGLE_IMAGE
LUCK_DAMAGES_TRANSFORM_QI
```

Return one of:

```text
NEUTRAL
SUPPORTED_BY_LUCK
FAKE_TO_TRUE
WEAKENED_BY_LUCK
BROKEN_BY_LUCK
```

Call the evaluator near the end of `assessDynamicTriggers()` and add:

```js
image_luck_effect: assessImageLuckEffect({
  imageContext: stateReport.image_context,
  dayStem,
  dayunGan,
  dayunZhi,
  liunianGan,
  liunianZhi,
}),
```

- [ ] **Step 4: Run dynamic tests**

Run:

```bash
node --test lib/baziDynamicAssessor.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit dynamic effects**

```bash
git add lib/baziDynamicAssessor.js lib/baziDynamicAssessor.test.js
git commit -m "feat(bazi): add image luck effect diagnostics"
```

### Task 6: Merge Image Analysis Into The Existing Pattern Card

**Files:**
- Modify: `src/views/BaziView.vue`
- Modify: `src/views/BaziView.layout.test.mjs`

- [ ] **Step 1: Add failing layout assertions**

Append:

```js
test('格局卡并入形象匹配度、基础格局和专业弹窗诊断', () => {
  assert.match(source, /image_analysis/)
  assert.match(source, /形象匹配度/)
  assert.match(source, /基础格局/)
  assert.match(source, /形象校验/)
  assert.match(source, /imageCandidate\.dimensions/)
  assert.match(source, /imageCandidate\.penalties/)
})
```

- [ ] **Step 2: Run layout tests and verify failure**

Run:

```bash
node --test src/views/BaziView.layout.test.mjs
```

Expected: FAIL because the bindings do not exist.

- [ ] **Step 3: Add computed image content**

Inside `gejuPanelContent`, read:

```js
const imageAnalysis = detail.image_analysis || null
const imageCandidate = imageAnalysis?.primary_candidate || null
const showImageCandidate = !!imageCandidate && imageCandidate.match_score >= 60
```

Return:

```js
imageCandidate: showImageCandidate ? imageCandidate : null,
basePattern: extraction?.base_pattern || profile.geju || gejuDetail.geju || '未定格',
imageHeadline: showImageCandidate
  ? `${imageCandidate.override_normal_pattern ? '形象匹配度' : `${imageCandidate.subtype}倾向`} ${imageCandidate.match_score}%`
  : '',
```

- [ ] **Step 4: Extend the existing card and drawer**

In the `旺衰格局` title row, add:

```vue
<span v-if="gejuPanelContent?.imageHeadline" class="image-match-badge">
  {{ gejuPanelContent.imageHeadline }}
</span>
```

Below the pattern description, add:

```vue
<p v-if="gejuPanelContent?.imageCandidate" class="rpt-prose">
  <strong class="rpt-lead-w">基础格局　</strong>{{ gejuPanelContent.basePattern }}
</p>
```

In the geju insight drawer, insert a section before `顺逆与成败`:

```vue
<div v-if="gejuPanelContent.imageCandidate" class="insight-prose-item">
  <div class="insight-prose-head"><span class="insight-prose-label">形象校验</span></div>
  <p class="insight-prose-main">{{ gejuPanelContent.imageCandidate.subtype }} · {{ gejuPanelContent.imageCandidate.match_score }}%</p>
  <div v-for="item in gejuPanelContent.imageCandidate.dimensions" :key="item.key" class="insight-inline-row">
    <span>{{ item.text }}</span><strong>+{{ item.score }}/{{ item.max }}</strong>
  </div>
  <div v-for="item in gejuPanelContent.imageCandidate.penalties" :key="item.key" class="insight-inline-row is-warn">
    <span>{{ item.text }}</span><strong>{{ item.score }}</strong>
  </div>
</div>
```

Add:

```css
.image-match-badge {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  padding: 2px 6px;
  border: 1px solid rgba(212, 175, 55, 0.28);
  color: #e8cc80;
  font-size: 11px;
  line-height: 1.4;
}
```

- [ ] **Step 5: Run layout tests**

Run:

```bash
node --test src/views/BaziView.layout.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit frontend display**

```bash
git add src/views/BaziView.vue src/views/BaziView.layout.test.mjs
git commit -m "feat(bazi): show image match score in pattern card"
```

### Task 7: Add Calibration Fixture Contract And Run Full Verification

**Files:**
- Create: `fixtures/bazi-image-cases/README.md`
- Modify: `lib/baziImageAssessor.test.js`

- [ ] **Step 1: Add the fixture contract**

Create `fixtures/bazi-image-cases/README.md`:

````md
# Bazi Image Case Fixtures

Each reviewed case is a JSON file with:

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

Calibration rules:

1. Validate classification before tuning numeric weights.
2. Keep `image-score-v1` weights explicit and explainable.
3. Do not add opaque one-case exceptions.
4. Review false positives and false negatives separately.
````

- [ ] **Step 2: Add backward-compatibility tests**

Append to `lib/baziImageAssessor.test.js`:

```js
test('missing image analysis preserves ordinary pattern', () => {
  assert.deepEqual(resolvePatternOverride({
    basePattern: '正财格',
    imageAnalysis: null,
  }), {
    basis: 'MONTH_PATTERN',
    base_pattern: '正财格',
    final_pattern: '正财格',
    overridden: false,
    yongshen_strategy: 'NORMAL',
  });
});
```

- [ ] **Step 3: Run all Node tests**

Run:

```bash
npm test
```

Expected: PASS with no failing tests.

- [ ] **Step 4: Build the Vite application**

Run:

```bash
npm run build
```

Expected: exit code `0` and a successful production build.

- [ ] **Step 5: Run diff validation**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only intended files are modified.

- [ ] **Step 6: Commit fixture contract and any verification fixes**

```bash
git add fixtures/bazi-image-cases/README.md lib/baziImageAssessor.test.js
git commit -m "test(bazi): document image case calibration contract"
```

## Final Review Checklist

- [ ] `image_analysis` is separate from `pattern_analysis`.
- [ ] `base_pattern` remains visible after override.
- [ ] `60-79` displays a candidate but keeps ordinary favorable-element logic.
- [ ] `80+` overrides only for allowed categories.
- [ ] `TWO_QI_IMAGE` stays descriptive-only.
- [ ] 专旺 scoring no longer requires the day master to be rootless.
- [ ] 化气 scoring requires adjacent day-stem combination and caps serious jealous combinations.
- [ ] Question pipelines reuse upstream image analysis instead of recalculating it.
- [ ] Dynamic output does not mutate natal `match_score`.
- [ ] Existing profiles without `image_analysis` continue to render and analyze normally.
- [ ] `npm test` passes.
- [ ] `npm run build` succeeds.
