# Bazi P3-e Strength, Hidden Use, and Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve strength accuracy and reduce bad cases by adding conservative hidden-resource support, then narrowly admitting hidden useful gods and strong-chart output release.

**Architecture:** Keep the existing three-layer strength model and `getChengGe()` resolver. P3-e1 adds an explainable, capped hidden-resource supplement to `getSupportDetail()` without double-counting peer roots already owned by `getRootDetail()`; P3-e2 adds structure-gated hidden-use and output-release decisions only after P3-e1 passes both evaluation sets.

**Tech Stack:** Node.js, CommonJS, `node:test`, deterministic Bazi rule engine, local 129-case golden evaluation, frozen 11-case holdout evaluation.

---

### Task 1: Record immutable baselines

**Files:**
- Read: `eval/baziprofile-accuracy/results/latest.json`
- Read: `eval/baziprofile-accuracy/results/holdout.json`
- Modify: `eval/baziprofile-accuracy/ZIPING-ZHENGE-GAP-PLAN.md`

- [ ] **Step 1: Run the 129-case baseline**

Run: `node eval/baziprofile-accuracy/run.mjs`

Expected: 129 scored cases and no pillar failures.

- [ ] **Step 2: Run the frozen holdout baseline**

Run: `CASES_FILE=holdout-cases.js RESULTS_FILE=holdout.json node eval/baziprofile-accuracy/run.mjs`

Expected: 11 scored cases and no pillar failures.

- [ ] **Step 3: Save baseline result copies outside the evaluator output path**

Run: `cp eval/baziprofile-accuracy/results/latest.json /tmp/p3e-baseline-latest.json` and `cp eval/baziprofile-accuracy/results/holdout.json /tmp/p3e-baseline-holdout.json`.

Expected: later scripts can compare every row against a fixed pre-change result.

### Task 2: P3-e1 hidden resource support

**Files:**
- Modify: `lib/BaziRuleEngine.test.js`
- Modify: `lib/BaziRuleEngine.js`

- [ ] **Step 1: Write four failing tests**

Add focused `calculateStrength()` tests proving:

```js
test('calculateStrength adds capped hidden seal support without double-counting peer roots', () => {
  const hiddenSeal = BaziRuleEngine.calculateStrength('甲', ['庚', '戊', '甲', '辛'], ['辰', '子', '寅', '丑']);
  assert.ok(hiddenSeal.strengthDetail.support_detail.hidden_support_score > 0);
  assert.ok(hiddenSeal.strengthDetail.support_detail.hidden_supports.every(item => ['正印', '偏印'].includes(item.relation)));
});

test('calculateStrength does not count hidden peer stems again as support', () => {
  const peerRoot = BaziRuleEngine.calculateStrength('甲', ['庚', '戊', '甲', '辛'], ['卯', '午', '寅', '戌']);
  assert.equal(peerRoot.strengthDetail.support_detail.hidden_support_score, 0);
});

test('calculateStrength ignores trace hidden seals in the first P3-e support pass', () => {
  const traceSeal = BaziRuleEngine.calculateStrength('甲', ['庚', '戊', '甲', '辛'], ['辰', '午', '寅', '戌']);
  assert.equal(traceSeal.strengthDetail.support_detail.hidden_support_score, 0);
});

test('calculateStrength caps hidden support inside the existing support maximum', () => {
  const manySeals = BaziRuleEngine.calculateStrength('甲', ['壬', '癸', '甲', '壬'], ['子', '亥', '寅', '子']);
  assert.ok(manySeals.strengthDetail.support_detail.hidden_support_score <= 0.45);
  assert.ok(manySeals.strengthDetail.support_detail.score <= manySeals.strengthDetail.support_detail.max_score);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test lib/BaziRuleEngine.test.js`

Expected: failures because `hidden_support_score` and `hidden_supports` do not exist.

- [ ] **Step 3: Add the minimal capped calculation**

Change `getSupportDetail()` so branch hidden stems with relation `印`/`枭` and hidden index 0 or 1 contribute:

```js
const HIDDEN_SUPPORT_FACTOR = 0.15;
const HIDDEN_SUPPORT_CAP = 0.45;
const hiddenSupports = [];
let hiddenSupportScore = 0;

zhis.forEach((zhi, pillarIndex) => {
  (C.ZHI5_LIST[zhi] || []).forEach((stem, hiddenIndex) => {
    if (hiddenIndex > 1) return;
    const shen = C.SHISHEN[dayGan][stem];
    if (shen !== '印' && shen !== '枭') return;
    const raw = getHiddenStemWeight(hiddenIndex) * getPillarRootWeight(pillarIndex) * HIDDEN_SUPPORT_FACTOR;
    hiddenSupportScore += raw;
    hiddenSupports.push({
      pillar: ['年支', '月支', '日支', '时支'][pillarIndex],
      branch: zhi,
      hidden_stem: stem,
      hidden_type: getHiddenStemType(hiddenIndex),
      relation: SHORT_TO_FULL_SHEN[shen] || shen,
      raw_score: Number(raw.toFixed(2)),
    });
  });
});
hiddenSupportScore = Math.min(hiddenSupportScore, HIDDEN_SUPPORT_CAP);
score = clamp(score + hiddenSupportScore, 0, 2);
```

Return `hidden_supports` and rounded `hidden_support_score` from `support_detail`. Do not count hidden `比`/`劫`, because the same-element root is already scored by `getRootDetail()`.

- [ ] **Step 4: Run focused and full tests and verify GREEN**

Run: `node --test lib/BaziRuleEngine.test.js` then `npm test`.

Expected: all tests pass; the full suite remains 538 plus the new tests.

- [ ] **Step 5: Run both evaluations and compare every row**

Run the Task 1 evaluation commands, then compare result rows against `/tmp/p3e-baseline-*.json` by case id.

Accept only if training strength stays at or above 71.1%, overall fixed cases outnumber broken cases, no previously correct row loses more than 3 points, and holdout strength does not regress. Otherwise revert Task 2 production/test changes and record the negative result in the gap plan.

- [ ] **Step 6: Commit a positive P3-e1 result**

Run: `git add lib/BaziRuleEngine.js lib/BaziRuleEngine.test.js && git commit -m "feat(bazi): calibrate hidden resource support"`.

### Task 3: P3-e2 structure-gated hidden useful gods

**Files:**
- Modify: `lib/bazi-api.test.js`
- Modify: `lib/baziCore.js`
- Modify: `lib/BaziRuleEngine.js` only if existing pattern effects cannot represent the selected hidden god

- [ ] **Step 1: Write paired RED tests**

Add one positive test where a recognized pattern requires a seal/output god, no equivalent stem is exposed, and a primary/secondary hidden stem supplies it. Add negative tests for the known competing structures `羊刃驾杀` and `食神制杀`; these must retain their existing useful god.

- [ ] **Step 2: Verify RED**

Run: `node --test lib/bazi-api.test.js lib/BaziRuleEngine.test.js`.

Expected: the positive hidden-use test fails on `yongShenTenGod`; competing-structure tests remain green.

- [ ] **Step 3: Implement one narrow resolver helper**

Add a helper in `baziCore.js` that returns a hidden candidate only when all conditions hold:

```js
function pickHiddenPatternUse(states, requiredShens, blockedPatterns) {
  if (blockedPatterns.some(Boolean)) return null;
  return requiredShens
    .map(key => states[key])
    .find(state => !state.touGan && (state.rootStats.strong > 0 || state.rootStats.weak > 0)) || null;
}
```

Call it only inside a specific already-recognized pattern branch, after higher-priority competing branches. Record the selected stem and pattern reason through existing `setResult()` fields; do not add a chart-wide “hidden seal means seal use” fallback.

- [ ] **Step 4: Verify focused/full tests and both evaluations**

Use the same commands and acceptance rules as Task 2. Revert and document if yong/xiji are not net positive or any protected regression case drops.

- [ ] **Step 5: Commit a positive hidden-use result**

Run: `git add lib/baziCore.js lib/bazi-api.test.js lib/BaziRuleEngine.js && git commit -m "feat(bazi): gate hidden pattern use"`.

### Task 4: P3-e2 strong-chart output release

**Files:**
- Modify: `lib/BaziRuleEngine.test.js`
- Modify: `lib/baziCore.js`
- Modify: `lib/BaziRuleEngine.js`

- [ ] **Step 1: Write paired RED tests**

Add a positive test for a strong/peer-resource-heavy chart with exposed or primary/secondary-rooted 食伤, expecting 食伤 as the structural useful god. Add a negative test where the same output exists but the chart is weak, plus a negative test for an already formed `印旺用官/杀` or `伤官佩印` structure.

- [ ] **Step 2: Verify RED**

Run: `node --test lib/BaziRuleEngine.test.js lib/bazi-api.test.js`.

Expected: only the new strong-chart output expectation fails.

- [ ] **Step 3: Implement the narrow output gate**

Reuse calculated strength and ten-god root state. Admit output release only when strength is `身强` or the image layer has a formed single-image override, output is exposed or has a primary/secondary root, and no higher-priority contrary pattern is formed. Use existing `promotedShens` for 食/伤 and `assistantShens` for peer/resource qi so supporting qi stays favorable but cannot retake top1.

- [ ] **Step 4: Verify focused/full tests and both evaluations**

Apply the same red lines. In addition, the existing 王阳明、左宗棠、袁树珊、谭延闿 and image regression tests must remain green.

- [ ] **Step 5: Commit a positive output-release result**

Run: `git add lib/BaziRuleEngine.js lib/BaziRuleEngine.test.js lib/baziCore.js lib/bazi-api.test.js && git commit -m "feat(bazi): gate strong chart output release"`.

### Task 5: Document outcomes and final verification

**Files:**
- Modify: `eval/baziprofile-accuracy/ZIPING-ZHENGE-GAP-PLAN.md`

- [ ] **Step 1: Record each retained or reverted experiment**

Append exact before/after training and holdout metrics, fixed/broken case counts, representative cases, test totals, and whether the knife was retained or reverted.

- [ ] **Step 2: Run final verification from a clean result state**

Run: `npm test`, the 129-case evaluator, and the frozen holdout evaluator.

Expected: all tests pass; training strength remains at least 67% and at least the accepted P3-e1 baseline; bad-case/critical count and weighted/yong/xiji metrics satisfy the document red lines.

- [ ] **Step 3: Review the branch diff**

Run: `git diff main...HEAD --check` and `git diff --stat main...HEAD`.

Expected: no whitespace errors and only the planned Bazi engine/test files are tracked.
