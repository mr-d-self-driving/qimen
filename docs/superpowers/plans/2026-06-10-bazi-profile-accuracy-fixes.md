# Bazi Profile Accuracy Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve bazi profile geju/yong/xiji accuracy on the golden test set by fixing high-impact general engine gaps before touching sparse classical patterns.

**Architecture:** Keep the current month-command pattern engine intact. Add a narrowly scoped image-pattern rule layer for high-confidence special images, then refine yongshen ranking and five-shen aggregation so existing intermediate signals are used in the right order. Treat `三命通会` sparse named patterns as `classical_pattern` metadata rather than forcing them into the ordinary `geju` enum.

**Tech Stack:** Node.js `node:test`; core engine files under `lib/`; golden eval under `eval/baziprofile-accuracy/`.

---

## P15 Strength Calibration Audit

P14 后 200 例 goldset 的强弱准确率停在 69.23%，明显低于格局 93.49%、用神 top1 90.22%。当前 gap 不是单一阈值偏差，而是几类决定性条件没有进入结构层：

- `gold 身强 -> engine 身弱/身中` 共 15 条，是最大错向。典型为日支/时支禄刃、坐长生、多重有效根、印比透出，但因失令或食伤/财官月令被线性计分压低。
- `gold 身弱 -> engine 身中/身强` 共 7 条，集中在辰丑湿土、寒土、土被金水过泄的命局。当前本气土根被直接算作强根，未校验寒湿与泄耗。
- `gold 身中 -> engine 身弱/身强` 共 2 条，多属于边界口径，不应先动全局阈值。

### Root Cause

1. **阈值不是主因。** 直接调整 `getStrengthBand()` 会同时修复一边并破坏另一边，因此 P15 不改 `身弱/身中/身强` 总分阈值。
2. **有效根网/禄刃根缺少结构跳变。** 当前 `root_detail` 是线性加分；日时禄刃、双根、三根虽有加分，但没有形成“有根不按弱论”的结构修正。
3. **辰丑湿寒土根缺少有效性折损。** 戊己生辰丑、金水重、火印不足时，土根为湿寒承载，不等于实旺。
4. **季节压力未进入结构层。** 春木官杀压土、火虚木嫩等 case 需要月令气势对根与印的有效性进行校验。

### Minimal Change Strategy

P15 只在 `BaziRuleEngine.calculateStrength()` 的 `structureAdjustment` 附近添加窄口径结构修正，不改基础 season/root/support 公式，不改 scorer，不改用神喜忌策略。

1. **P15-a effective root network / 禄刃根上调。**
   - 触发：日支/时支临官帝旺，或两处以上有效根；有印比透干或日时强根重复；当前总分在弱/中边界。
   - 排除：春木克土、寒湿土过泄、财官杀压倒性成势。
   - 目标：张敬尧、寒木向阳、谢阁老、史春芳、汪学士，以及 holdout 中同类 `身强 -> 身弱` case。
2. **P15-b cold wet earth overleak / 寒湿土过泄下调。**
   - 触发：戊己日、辰丑月或辰丑重复、金水重、火印不足。
   - 目标：董中堂、冬土过泄用丙、己丑金重类。
3. **P15-c seasonal pressure / 春木官杀压土与火虚木嫩。**
   - 触发：戊己寅卯月木旺官杀压身，或丙丁春初金水并见而火根不实。
   - 该类牵动官杀格、印格、调候，放在 P15-a/P15-b 稳定后再做。

### Overfit And Downstream Risk

- `strongWeak` 会影响 L3 扶抑、`getChengGe()` 的 dayStrength 分支、五神排序、yong/xiji direction，因此每个子策略必须单独 TDD、单独 eval diff。
- P15-a 风险中等：根网条件过宽会误伤有根仍弱的官杀/财旺盘，需要保留薛相公、知县等反例守护。
- P15-b 风险低到中：只要限定戊己、辰丑、金水重、火不足，误伤面较小。
- P15-c 风险最高：最接近古籍 case 口径，容易过拟合，不应与 P15-a 合并。

### Priority

1. P15-a：先修有效根网/禄刃根，预期同时改善主集与 holdout。
2. P15-b：再修寒湿土/湿土过泄。
3. P15-c：最后修季节压力。
4. 若仍有边界误差，再考虑 gold acceptable 或 display-only 口径，不先动 scorer。

### P15-a Execution Result

Implemented effective root network / 禄刃根 calibration as a structure-layer adjustment only:

- Promotes repeated effective roots, day/hour 禄刃 roots, and triple-root networks from weak/middle boundary into strong when there is enough root/support evidence.
- Excludes 杀印相生 without 食制, summer wood requiring seal, spring earth pressure, cold/wet earth overleak, and winter earth pressure.
- Protects root-network 比劫 from being pushed into the unfavorable bucket when the root is serving as the bearing structure, without letting it overtake the formed yongshen.

Validation snapshot:

- 200-case weighted accuracy: 86.15% -> 86.525%.
- Strength accuracy: 69.23% -> 75.64%.
- Critical count: 0 -> 0.
- Holdout weighted accuracy: 79.6% -> 80.8%.
- Holdout strength accuracy: 60% -> 70%; critical count remains 1.

### P15-b/c Execution Result

Implemented the remaining strength calibration slices as narrow structure-layer down-adjustments:

- P15-b `cold_wet_earth_overleak_adjustment`: 戊己 in 辰/丑 wet-earth contexts, with metal-water leakage or double exposed output and insufficient fire. The adjustment caps only overestimated charts into the weak band instead of changing season/root/support formulas.
- P15-c `spring_earth_killing_pressure_adjustment`: 戊己 in 寅/卯 month under repeated wood or exposed officer-killing pressure, limited to middle-boundary charts where fire/earth support has not clearly turned the structure strong.
- P15-c `early_spring_fire_void_adjustment`: 丙丁 in 寅 month with metal-water pressure, weak fire ratio, shallow roots, and limited seal support.
- Engine version `1.8.24 -> 1.8.25`; frontend cache version updated.

Validation snapshot:

- 200-case weighted accuracy: 86.525% -> 87.30%.
- Strength accuracy: 75.64% -> 83.33%.
- Critical count: 0 -> 0.
- Pass/minor/major/critical: 131/58/11/0 -> 134/58/8/0.
- Holdout weighted accuracy remains 80.8%; holdout strength accuracy remains 70%; critical count remains 1.

Positive diffs:

- `xuanxue_dts_001_dongzhongtang_wuhuo`: 75 minor -> 93 pass; strength 身强 -> 身弱.
- `nb_dts_batch_011_winter_ji_overleaked_bing`: 38 major -> 100 pass; strength 身强 -> 身弱.
- `xuanxue_dts_002_jitu_binghuo`: 65 minor -> 82 minor; strength 身中 -> 身弱.
- `zp_006_fan_taifu_guan_yong_yin`: 54 major -> 69 minor; strength 身中 -> 身弱.
- `nb_dts_extra_001_shazhong_yongyin_wuhuo`: 67 minor -> 90 pass; strength 身中 -> 身弱.
- `nb_dts_batch_027_zhu_zhongtang_yongmu`: 58 major -> 78 minor; strength 身中 -> 身弱.

No scored negative diff was observed in the 200-case eval. One method-only case changed display strength from 身中 to 身弱 while remaining 100/pass because strength is outside that case's scoring scope.

### P16-a Execution Result

Implemented the first special-image residual pass:

- Complete 亥卯未 wood frames no longer lose image coverage solely because earth wealth is present as noisy branch/stem qi. This lets the 段祺瑞曲直仁寿 case cross the reviewed single-image override threshold.
- A narrow weak-earth follow-killing exception recognizes cases where a small earth root/seal trace is overwhelmed by a dominant wood killing frame and a finance-killing flow. This lets the 伍廷芳 case form `FOLLOW_IMAGE/从杀格` without disturbing rootless follow-wealth/follow-killing competition.
- Special-pattern yong priority now keeps complete wood frames on wood/seal before output, and keeps `从杀格` officer-killing before wealth.
- Engine version `1.8.25 -> 1.8.26`; frontend cache version updated.

Validation snapshot:

- 200-case weighted accuracy: 87.30% -> 87.875%.
- Yong top-1 accuracy: 90.95% -> 92.19%.
- Strength accuracy remains 83.33%; geju accuracy remains 93.49%.
- Critical count: 0 -> 0.
- Pass/minor/major/critical: 134/58/8/0 -> 136/58/6/0.
- Holdout weighted accuracy remains 80.8%; holdout strength accuracy remains 70%; critical count remains 1.

Positive diffs:

- `zp_pdf_004_wutingfang_congsha`: 38 major -> 100 pass; image `木土成象` -> `从杀格`, yong 偏财 -> 七杀.
- `zp_pdf_005_duanqirui_quzhi`: 33 major -> 86 pass; image `木土成象` -> `曲直格`, yong 伤官 -> 比肩.

No scored negative diff was observed. A few already-passing or non-yong-scoped cases changed displayed yong after the more precise `从杀格` / complete-wood-frame priority, but their scores remained unchanged.

---

## File Map

- Modify: `lib/baziImageAssessor.js`  
  Add named two-qi image detection for `金白水清`, `火土成势`, and `强众敌寡`; expose override intent only for named, reviewed subtypes.
- Modify: `lib/baziImageAssessor.test.js`  
  Add focused image tests for 冰心、朱元璋、张謇.
- Modify: `lib/BaziRuleEngine.js`  
  Add special image yong/xiji strategies, refine single-image 专旺 yong priority, improve five-shen aggregation and wuxing folding.
- Modify: `lib/BaziRuleEngine.test.js`  
  Add rule-engine regression tests for 王阳明、戚继光、刘墉、苏轼.
- Modify: `eval/baziprofile-accuracy/scorer.mjs`  
  Optionally separate `classical_pattern` cases from general engine accuracy.
- Modify: `eval/baziprofile-accuracy/gold-cases.js`  
  Mark sparse `三命通会` cases with `caseClass: 'classical_pattern'` or a similar field.
- Modify: `eval/baziprofile-accuracy/report.mjs`  
  Report general vs classical-pattern buckets separately.

---

### Task 1: Named Two-Qi Image Rules

**Files:**
- Modify: `lib/baziImageAssessor.js`
- Modify: `lib/baziImageAssessor.test.js`

- [ ] **Step 1: Write failing tests for named two-qi cases and reviewed override threshold**

Append tests to `lib/baziImageAssessor.test.js`:

```js
test('recognizes 金白水清 as named two-qi image without generic xiji inversion', () => {
  const result = assessBaziImage({
    dayGan: '辛',
    gans: ['庚', '乙', '辛', '壬'],
    zhis: ['子', '酉', '酉', '辰'],
    monthZhi: '酉',
  });

  const twoQi = [result.primary_candidate, ...result.alternatives]
    .find(candidate => candidate.category === IMAGE_CATEGORY.TWO_QI_IMAGE);

  assert.equal(twoQi.subtype, '金白水清');
  assert.equal(twoQi.yongshen_strategy, 'TWO_QI_CLEAR_FLOW');
  assert.ok(twoQi.match_score < OVERRIDE_MIN_SCORE);
  assert.equal(twoQi.override_normal_pattern, true);
  assert.deepEqual(twoQi.target_elements, ['金', '水']);
});

test('recognizes 火土成势 as named two-qi force image', () => {
  const result = assessBaziImage({
    dayGan: '丁',
    gans: ['戊', '戊', '丁', '丁'],
    zhis: ['辰', '午', '丑', '未'],
    monthZhi: '戌',
  });

  const twoQi = [result.primary_candidate, ...result.alternatives]
    .find(candidate => candidate.category === IMAGE_CATEGORY.TWO_QI_IMAGE);

  assert.equal(twoQi.subtype, '火土成势');
  assert.equal(twoQi.yongshen_strategy, 'TWO_QI_FOLLOW_FORCE');
  assert.ok(twoQi.match_score < OVERRIDE_MIN_SCORE);
  assert.equal(twoQi.override_normal_pattern, true);
});
```

- [ ] **Step 2: Run image tests and verify they fail**

Run:

```bash
node --test lib/baziImageAssessor.test.js
```

Expected: FAIL because subtype is currently generic `金水成象` / `土火成象`, `yongshen_strategy` is `DESCRIPTIVE_ONLY`, and override is false. The tests must also fail if implementation only sets `allow_override: true` without changing the override threshold, because reviewed cases score around 60-74 and the global `OVERRIDE_MIN_SCORE` is 80.

- [ ] **Step 3: Add reviewed override support to `finalizeCandidate`**

In `lib/baziImageAssessor.js`, change `finalizeCandidate()` so internal reviewed-pattern fields can lower the override gate without lying about `match_score`:

```js
function finalizeCandidate(candidate) {
  const {
    reviewed_override_min_score: reviewedOverrideMinScore,
    force_override: forceOverride,
    ...publicCandidate
  } = candidate;
  const matchScore = round(clamp(candidate.match_score || 0));
  const matchMeta = getMatchMeta(matchScore);
  const overrideMinScore = reviewedOverrideMinScore ?? OVERRIDE_MIN_SCORE;

  return {
    ...publicCandidate,
    match_score: matchScore,
    match_label: matchMeta.label,
    match_level: matchMeta.level,
    override_normal_pattern:
      candidate.allow_override !== false
      && (forceOverride === true || matchScore >= overrideMinScore),
    dimensions: candidate.dimensions || {},
    penalties: candidate.penalties || [],
    reason_codes: candidate.reason_codes || [],
  };
}
```

Do not expose `reviewed_override_min_score` or `force_override` in serialized candidates; they are internal control fields.

- [ ] **Step 4: Implement named two-qi resolver**

In `lib/baziImageAssessor.js`, add a helper near `scoreTwoQiImage`:

```js
function resolveNamedTwoQiImage({ dayGan, gans, zhis, monthZhi, topElements, combinedRatio, ratioDifference }) {
  const elements = topElements.map(item => item.element).join('');
  const elementSet = new Set(topElements.map(item => item.element));
  const ganSet = new Set(gans);
  const zhiSet = new Set(zhis);

  if (elementSet.has('金') && elementSet.has('水') && ['申', '酉'].includes(monthZhi) && combinedRatio >= 0.68) {
    return {
      subtype: '金白水清',
      yongshen_strategy: 'TWO_QI_CLEAR_FLOW',
      allow_override: true,
      reviewed_override_min_score: 60,
      reason_codes: ['TWO_QI_NAMED_JINBAI_SHUIQING'],
    };
  }

  if (elementSet.has('火') && elementSet.has('土') && combinedRatio >= 0.62) {
    return {
      subtype: '火土成势',
      yongshen_strategy: 'TWO_QI_FOLLOW_FORCE',
      allow_override: true,
      reviewed_override_min_score: 60,
      reason_codes: ['TWO_QI_NAMED_FIRE_EARTH_FORCE'],
    };
  }

  if (dayGan && elementSet.has(GAN_WUXING[dayGan]) && combinedRatio >= 0.62) {
    const weakEnemy = topElements.every(item => item.ratio >= 0.25)
      && Object.entries(getWuxingScores({ dayGan, gans, zhis, monthZhi }).wuxingScores || {})
        .some(([element, score]) => !elementSet.has(element) && score > 0);
    if (weakEnemy) {
      return {
        subtype: '强众敌寡',
        yongshen_strategy: 'TWO_QI_HUNT_WEAK_ENEMY',
        allow_override: true,
        reviewed_override_min_score: 60,
        reason_codes: ['TWO_QI_NAMED_STRONG_MANY_WEAK_ENEMY'],
      };
    }
  }

  return {
    subtype: `${elements}成象`,
    yongshen_strategy: 'DESCRIPTIVE_ONLY',
    allow_override: false,
    reason_codes: ratioDifference <= TWO_QI_BALANCE_MAX_DIFF ? ['TWO_QI_BALANCED'] : ['TARGET_QI_MIXED'],
  };
}
```

Adjust this helper to use the existing `getWuxingScores()` return shape before committing; do not change the wire contract.

- [ ] **Step 5: Wire helper into `scoreTwoQiImage`**

Replace the current generic subtype/reason/strategy assignment with the helper result:

```js
const named = resolveNamedTwoQiImage({
  dayGan,
  gans,
  zhis,
  monthZhi,
  topElements,
  combinedRatio,
  ratioDifference,
});

return finalizeCandidate({
  category: IMAGE_CATEGORY.TWO_QI_IMAGE,
  subtype: named.subtype,
  target_elements: topElements.map((item) => item.element),
  match_score: combinedPoints + balancePoints + lowMixedQiPoints,
  dimensions: {
    two_qi_combined_ratio: round(combinedRatio),
    two_qi_combined_points: round(combinedPoints),
    two_qi_ratio_difference: round(ratioDifference),
    two_qi_balance_points: round(balancePoints),
    low_mixed_qi_points: round(lowMixedQiPoints),
  },
  reason_codes: named.reason_codes,
  yongshen_strategy: named.yongshen_strategy,
  allow_override: named.allow_override,
  reviewed_override_min_score: named.reviewed_override_min_score,
});
```

- [ ] **Step 6: Run tests**

Run:

```bash
node --test lib/baziImageAssessor.test.js
node --test lib/BaziRuleEngine.test.js
```

Expected: PASS after adjusting thresholds to only match reviewed cases.

---

### Task 2: Special Image Yong/Xiji Strategies

**Files:**
- Modify: `lib/BaziRuleEngine.js`
- Modify: `lib/BaziRuleEngine.test.js`

- [ ] **Step 1: Write failing tests for 冰心 and 朱元璋 using the real image pipeline**

Append tests to `lib/BaziRuleEngine.test.js`:

```js
const { assessBaziImage } = require('./baziImageAssessor');

test('金白水清 keeps 金水 favorable and rejects 火土破象（冰心）', () => {
  const imageAnalysis = assessBaziImage({
    dayGan: '辛',
    gans: ['庚', '乙', '辛', '壬'],
    zhis: ['子', '酉', '酉', '辰'],
    monthZhi: '酉',
  });

  assert.equal(imageAnalysis.primary_candidate.override_normal_pattern, true);
  assert.equal(imageAnalysis.primary_candidate.subtype, '金白水清');

  const r = BaziRuleEngine.getFavorableUnfavorable(
    '辛', '酉', '建禄格',
    { strongWeak: '身强', totalStrengthScore: 8.1 },
    ['子', '酉', '酉', '辰'],
    ['庚', '乙', '辛', '壬'],
    imageAnalysis
  );

  assert.equal(r.five_shens.yong, '伤官');
  assert.ok(r.wuxing.favorable.includes('金'));
  assert.ok(r.wuxing.favorable.includes('水'));
  assert.ok(r.wuxing.unfavorable.includes('火'));
  assert.ok(r.wuxing.unfavorable.includes('土'));
});

test('火土成势 follows 火土 force and does not fall back to weak-day 印（朱元璋）', () => {
  const imageAnalysis = assessBaziImage({
    dayGan: '丁',
    gans: ['戊', '戊', '丁', '丁'],
    zhis: ['辰', '戌', '丑', '未'],
    monthZhi: '戌',
  });

  assert.equal(imageAnalysis.primary_candidate.override_normal_pattern, true);
  assert.equal(imageAnalysis.primary_candidate.subtype, '火土成势');

  const r = BaziRuleEngine.getFavorableUnfavorable(
    '丁', '戌', '伤官格',
    { strongWeak: '身弱', totalStrengthScore: 2.9 },
    ['辰', '戌', '丑', '未'],
    ['戊', '戊', '丁', '丁'],
    imageAnalysis
  );

  assert.ok(r.wuxing.favorable.includes('火'));
  assert.ok(r.wuxing.favorable.includes('土'));
  assert.notEqual(r.five_shens.yong, '正印');
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
node --test lib/BaziRuleEngine.test.js
```

Expected: FAIL because `TWO_QI_IMAGE` currently returns `null` from `getSpecialPattern()`.

- [ ] **Step 3: Add strategy mapping in `getSpecialPattern()`**

In `lib/BaziRuleEngine.js`, before `if (candidate.category !== 'FOLLOW_IMAGE') return null;`, add:

```js
if (candidate.category === 'TWO_QI_IMAGE') {
  const targets = candidate.target_elements || [];
  if (candidate.yongshen_strategy === 'TWO_QI_CLEAR_FLOW') {
    return {
      type: candidate.subtype,
      yongPriority: targets.flatMap(getShensByWuxing),
      favorable: targets.flatMap(getShensByWuxing),
      unfavorable: [...new Set(['火', '土'].flatMap(getShensByWuxing))],
      scoreMode: 'ranked',
    };
  }

  if (candidate.yongshen_strategy === 'TWO_QI_FOLLOW_FORCE') {
    return {
      type: candidate.subtype,
      yongPriority: targets.flatMap(getShensByWuxing),
      favorable: targets.flatMap(getShensByWuxing),
      unfavorable: WUXING.filter(wx => !targets.includes(wx)).flatMap(getShensByWuxing),
      scoreMode: 'ranked',
    };
  }

  if (candidate.yongshen_strategy === 'TWO_QI_HUNT_WEAK_ENEMY') {
    return {
      type: candidate.subtype,
      yongPriority: targets.flatMap(getShensByWuxing),
      favorable: targets.flatMap(getShensByWuxing),
      unfavorable: [],
      scoreMode: 'ranked',
    };
  }

  return null;
}
```

- [ ] **Step 4: Support ranked special-pattern scores**

In the `if (specialPattern)` block, replace flat `80` assignment with:

```js
const ranked = specialPattern.scoreMode === 'ranked';
for (const shen of specialPattern.favorable) {
  const rankBonus = ranked && specialPattern.yongPriority?.includes(shen) ? 90 : 70;
  scores[shen] = rankBonus;
  breakdown[shen].cong = rankBonus;
}
for (const shen of specialPattern.unfavorable) {
  scores[shen] = -80;
  breakdown[shen].cong = -80;
}
```

- [ ] **Step 5: Run targeted tests**

Run:

```bash
node --test lib/BaziRuleEngine.test.js
```

Expected: PASS.

---

### Task 3: Single-Image 专旺 Main-Use Priority

**Files:**
- Modify: `lib/BaziRuleEngine.js`
- Modify: `lib/BaziRuleEngine.test.js`

- [ ] **Step 1: Write failing test for 王阳明**

Append:

```js
test('润下专旺 prefers 食伤泄秀 as top yong while keeping water favorable（王阳明）', () => {
  const imageAnalysis = {
    primary_candidate: {
      category: 'SINGLE_IMAGE',
      subtype: '润下格',
      target_element: '水',
      override_normal_pattern: true,
      yongshen_strategy: 'FOLLOW_FORCE',
    },
  };

  const r = BaziRuleEngine.getFavorableUnfavorable(
    '癸', '亥', '羊刃格',
    { strongWeak: '身强', totalStrengthScore: 9.6 },
    ['辰', '亥', '亥', '亥'],
    ['壬', '辛', '癸', '癸'],
    imageAnalysis
  );

  assert.equal(r.five_shens.yong, '伤官');
  assert.ok(r.wuxing.favorable.includes('水'));
  assert.ok(r.wuxing.favorable.includes('木'));
});
```

- [ ] **Step 2: Run and verify failure**

Run:

```bash
node --test lib/BaziRuleEngine.test.js
```

Expected: FAIL because current flat score makes `比肩` top1.

- [ ] **Step 3: Refine `SINGLE_IMAGE` mapping**

In `getSpecialPattern()`, change the `SINGLE_IMAGE` return from flat favorable list to ranked:

```js
if (candidate.category === 'SINGLE_IMAGE') {
  return {
    type: '专旺',
    yongPriority: ['食神', '伤官'],
    favorable: ['比肩', '劫财', '食神', '伤官'],
    unfavorable: ['正官', '七杀', '正财', '偏财', '正印', '偏印'],
    scoreMode: 'single_image_ranked',
  };
}
```

In the special-pattern score block, if `scoreMode === 'single_image_ranked'`, assign:

```js
const score = specialPattern.yongPriority.includes(shen) ? 90 : 75;
```

- [ ] **Step 4: Run tests**

Run:

```bash
node --test lib/BaziRuleEngine.test.js
```

Expected: PASS, with 王阳明 top1 moved to 食伤/木 while 水 remains favorable.

---

### Task 4: Main-Use vs Auxiliary-Use Weight Guard

**Files:**
- Modify: `lib/BaziRuleEngine.js`
- Modify: `lib/BaziRuleEngine.test.js`

- [ ] **Step 1: Write failing test for 戚继光**

Append:

```js
test('身弱寒湿己土 keeps 调候首取火印 above auxiliary 戊土（戚继光）', () => {
  const r = BaziRuleEngine.getFavorableUnfavorable(
    '己', '亥', '正财格',
    { strongWeak: '身弱', totalStrengthScore: 1.5 },
    ['子', '亥', '巳', '亥'],
    ['戊', '癸', '己', '乙']
  );

  assert.equal(r.five_shens.yong, '正印');
  assert.ok(r.five_shens.xi.includes('劫财') || r.favorable_shens?.includes('劫财'));
});
```

- [ ] **Step 2: Run and verify failure**

Run:

```bash
node --test lib/BaziRuleEngine.test.js
```

Expected: FAIL because 劫财 currently beats 正印 by 5.

- [ ] **Step 3: Add primary-use protection**

After all ordinary scoring dimensions but before `classifyFiveShens()`, add a small guard:

```js
function protectPrimaryTiaohouUse(scores, breakdown, parsedTiaohou, dayGan) {
  const primary = parsedTiaohou.favorable.find(item => item.priority === 1);
  if (!primary) return;
  const primaryShen = getFullShenByStem(dayGan, primary.gan);
  if (!primaryShen) return;
  const topScore = Math.max(...Object.values(scores));
  if (scores[primaryShen] > 0 && topScore - scores[primaryShen] <= 10) {
    const bonus = topScore - scores[primaryShen] + 1;
    scores[primaryShen] += bonus;
    breakdown[primaryShen].conflict += bonus;
  }
}
```

Call it before five-shen classification for ordinary scoring only:

```js
protectPrimaryTiaohouUse(scores, breakdown, parsedTiaohou, dayGan);
```

- [ ] **Step 4: Run tests and golden report**

Run:

```bash
node --test lib/BaziRuleEngine.test.js
node eval/baziprofile-accuracy/run.mjs
node eval/baziprofile-accuracy/report.mjs
```

Expected: 戚继光 top1 becomes 正印/火; no large regressions in 袁树珊 and 康熙 without explicit review.

---

### Task 5: Five-Shen and Wuxing Folding Fix

**Files:**
- Modify: `lib/BaziRuleEngine.js`
- Modify: `lib/BaziRuleEngine.test.js`

- [ ] **Step 1: Write failing test for 刘墉**

Append:

```js
test('正官格用印 keeps 正官木 favorable even when 七杀 is not useful（刘墉）', () => {
  const r = BaziRuleEngine.getFavorableUnfavorable(
    '己', '寅', '正官格',
    { strongWeak: '身弱', totalStrengthScore: 2.8 },
    ['子', '寅', '丑', '子'],
    ['甲', '丙', '己', '甲']
  );

  assert.equal(r.five_shens.yong, '正印');
  assert.ok(r.five_shens.xi.includes('正官') || r.wuxing.favorable.includes('木'));
  assert.ok(!r.wuxing.unfavorable.includes('木'));
});
```

- [ ] **Step 2: Run and verify failure**

Run:

```bash
node --test lib/BaziRuleEngine.test.js
```

Expected: FAIL because 木 is currently folded into unfavorable via 七杀.

- [ ] **Step 3: Add same-element favorable precedence**

Replace `makeWuxingResult()` with a conflict-aware fold:

```js
const makeWuxingResult = (favShens, unfavShens) => {
  const favorable = [...new Set(favShens.map(getShenWuxing))];
  const unfavorable = [...new Set(unfavShens.map(getShenWuxing))]
    .filter(wx => !favorable.includes(wx));
  return { favorable, unfavorable };
};
```

- [ ] **Step 4: Add structured xi retention for official+seal chain**

Before `classifyFiveShens()`, add a favorable conflict when current pattern is `正官格` and `正印` is positive:

```js
if (geju === '正官格' && scores['正印'] > 0 && scores['正官'] > 0) {
  favorableConflicts.push('正官');
}
```

Pass `favorableConflicts` into `classifyFiveShens()` if not already done in the ordinary path.

- [ ] **Step 5: Run tests**

Run:

```bash
node --test lib/BaziRuleEngine.test.js
```

Expected: PASS and 刘墉 keeps 火 as yong, 木 as favorable.

---

### Task 6: Strength Boundary Regression for 六亲 Cases

**Files:**
- Modify: `lib/BaziRuleEngine.js`
- Modify: `lib/BaziRuleEngine.test.js`

- [ ] **Step 1: Write failing test for 苏轼**

Append:

```js
test('winter water with 子亥 root network is classified as 身强 for relation analysis（苏轼）', () => {
  const strength = BaziRuleEngine.calculateStrength(
    '癸',
    ['丙', '辛', '癸', '乙'],
    ['子', '丑', '亥', '卯']
  );

  assert.equal(strength.strongWeak, '身强');
});
```

- [ ] **Step 2: Run and verify failure**

Run:

```bash
node --test lib/BaziRuleEngine.test.js
```

Expected: FAIL because current output is `身中`.

- [ ] **Step 3: Add winter-water network adjustment**

In `calculateStrength()`, after root/support calculation and before final band classification, add a narrow structure adjustment:

```js
const winterWaterRootNetwork =
  dayMasterElement === '水'
  && ['亥', '子', '丑'].includes(monthZhi)
  && zhis.filter(zhi => ['亥', '子', '丑'].includes(zhi)).length >= 3;

if (winterWaterRootNetwork && totalScore >= 4.7 && totalScore < 5.5) {
  totalScore += 0.7;
  structureAdjustment += 0.7;
}
```

Use the actual local variable names in `calculateStrength()`. Keep the guard narrow to avoid general strength drift.

- [ ] **Step 4: Run tests and golden report**

Run:

```bash
node --test lib/BaziRuleEngine.test.js
node eval/baziprofile-accuracy/run.mjs
node eval/baziprofile-accuracy/report.mjs
```

Expected: 苏轼 moves from `身中` to `身强`; inspect other strength cases for regressions.

---

### Task 7: Classical Pattern Isolation

**Files:**
- Modify: `eval/baziprofile-accuracy/gold-cases.js`
- Modify: `eval/baziprofile-accuracy/run.mjs`
- Modify: `eval/baziprofile-accuracy/report.mjs`
- Modify: `eval/baziprofile-accuracy/scorer.test.mjs`

- [ ] **Step 1: Mark sparse classical cases**

In `eval/baziprofile-accuracy/gold-cases.js`, add `caseClass: 'classical_pattern'` to:

```js
nb_sanming_001_lvjifu_guanyin
nb_sanming_002_liuyingjie_xinggui
nb_sanming_004_ridege
nb_sanming_005_zhangshi_kuigang
nb_sanming_006_mengzhong_zhengyin
```

- [ ] **Step 2: Preserve the field in run output**

In `eval/baziprofile-accuracy/run.mjs`, include:

```js
case_class: caseDef.caseClass || 'general',
```

on each row.

- [ ] **Step 3: Report general vs classical separately**

In `eval/baziprofile-accuracy/report.mjs`, add a class summary table:

```js
const classGroups = Object.groupBy(result.rows, row => row.case_class || 'general');
```

Render average score and count per class. Keep the existing total summary unchanged for comparability.

- [ ] **Step 4: Add scorer/report test**

In `eval/baziprofile-accuracy/scorer.test.mjs`, add a small assertion that `case_class` defaults to `general` when absent and preserves `classical_pattern` when present if helper functions are exposed. If not exposed, verify via `run.mjs` output after regeneration.

- [ ] **Step 5: Regenerate and review**

Run:

```bash
node eval/baziprofile-accuracy/run.mjs
node eval/baziprofile-accuracy/report.mjs
node --test eval/baziprofile-accuracy/scorer.test.mjs
```

Expected: General-engine accuracy can be read separately from sparse classical-pattern cases.

---

## Validation Gate

Run all tests:

```bash
npm test
node eval/baziprofile-accuracy/run.mjs
node eval/baziprofile-accuracy/report.mjs
node --test eval/baziprofile-accuracy/scorer.test.mjs
```

Expected:

- Unit tests pass.
- `RESULTS.md` shows improved scores for high-impact general cases.
- The following regressions must not occur:
  - 杜月笙、董浩云 remain pass.
  - 刘墉 keeps `丙火正印` as top1 and moves 木/正官 favorable.
  - 冰心 keeps 水 as yong and 金水 favorable.
  - 王阳明 keeps 润下格 and changes top1 from water比劫 to 木食伤.
  - 戚继光 changes top1 from 土劫财 to 火印.
  - Classical `三命通会` cases are reported separately rather than treated as the main general-engine failure signal.

## Rollout Order

1. Implement Task 7 first if you want cleaner metrics before changing engine behavior.
2. Implement Tasks 1 and 2 together; two-qi detection without scoring strategy is only half a fix.
3. Implement Tasks 3 to 5 next; these change yong/xiji ranking without adding new pattern classes.
4. Implement Task 6 last; strength boundary changes can have wider blast radius and need careful regression review.

## Self-Review

- Spec coverage: The plan covers all diagnosis buckets from `RESULTS.md`: two-qi non-override, special-image yong priority, 调候主辅错位, five-shen/wuxing folding, strength boundary, and classical-pattern isolation.
- Placeholder scan: No task depends on undefined future work; each task names files, tests, and expected failure/pass behavior.
- Type consistency: New fields reuse existing image candidate names: `category`, `subtype`, `target_elements`, `override_normal_pattern`, `yongshen_strategy`; scoring remains in `scores`, `breakdown`, `five_shens`, and `wuxing`.
