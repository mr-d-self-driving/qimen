const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateAnnualScore } = require('./calculateAnnualScore');
const { buildAnnualFortunePayload, ANNUAL_SCORE_CACHE_VERSION } = require('./fortuneAnnualCore');

const baseProfile = {
  id: 'profile-1',
  name: '测试命主',
  gender: 'M',
  birth_date: '1990-05-15 12:00:00',
  bazi_str: '庚午 辛巳 甲午 庚午',
  ri_zhu: '甲午',
  day_zhi: '午',
  month_zhi: '巳',
  year_zhi: '午',
  favorable_elements: ['印星', '比劫'],
  unfavorable_elements: ['官杀', '食伤'],
  dayun_gz: '壬申',
  liunian_gz: '丙午',
};

test('annual score exposes score_hits with the same shape as monthly score hits', () => {
  const result = calculateAnnualScore(baseProfile);

  assert.equal(result.score_hits.version, 'annual-score-hits-v3');
  assert.equal(result.score_hits.summary.final_score, result.annual_score);
  assert.match(result.score_hits.summary.display, /今年/);
  assert.match(result.score_hits.summary.debug, /layer1=/);

  const layer1 = result.score_hits.layers.find(layer => layer.layer === 'layer1');
  const layer2 = result.score_hits.layers.find(layer => layer.layer === 'layer2');
  const layer3 = result.score_hits.layers.find(layer => layer.layer === 'layer3');

  assert.ok(layer1);
  assert.ok(layer2);
  assert.ok(layer3);
  assert.equal(layer1.label, '大运底色层');
  assert.equal(layer2.label, '流年太岁层');
  assert.equal(layer3.label, '岁运神煞层');
  assert.equal(layer1.score, result.layer1_score);
  assert.equal(layer2.score, result.layer2_score);
  assert.equal(layer3.score, result.layer3_score);

  const allHits = result.score_hits.layers.flatMap(layer => layer.hits);
  assert.ok(allHits.length > 0);
  assert.ok(allHits.every(hit => Object.hasOwn(hit, 'code')));
  assert.ok(allHits.every(hit => Object.hasOwn(hit, 'type')));
  assert.ok(allHits.every(hit => Object.hasOwn(hit, 'display')));
  assert.ok(allHits.every(hit => Object.hasOwn(hit, 'debug')));
  assert.ok(allHits.every(hit => Object.hasOwn(hit, 'delta_raw')));
});

test('annual fallback score also exposes score_hits for frontend reuse', () => {
  const result = buildAnnualFortunePayload({
    id: 'profile-missing',
    name: '缺字段命主',
    gender: 'F',
    birth_date: '1992-08-10 09:00:00',
  }, 2026);

  assert.equal(result.annual_score, 70);
  assert.equal(result.score_hits.version, 'annual-score-hits-v3');
  assert.equal(result.score_hits.summary.final_score, 70);
  assert.match(result.score_hits.summary.display, /命理字段不完整/);
  assert.equal(result.score_hits.layers.length, 3);
  assert.ok(result.score_hits.layers[0].hits.some(hit => hit.code === 'fallback_missing_profile_fields'));
});

test('annual cache version is bumped for shensha ratio correction', () => {
  assert.equal(ANNUAL_SCORE_CACHE_VERSION, 'annual-score-v3-shensha-ratio');
});

test('annual score caps still apply when score_hits are generated', () => {
  const result = calculateAnnualScore({
    ...baseProfile,
    day_zhi: '寅',
    year_zhi: '巳',
    month_zhi: '午',
    dayun_gz: '甲申',
    liunian_gz: '甲子',
    favorable_elements: ['比劫'],
    unfavorable_elements: [],
  });

  assert.equal(result.dayun_sanxing, true);
  assert.ok(result.annual_score <= 80);
  assert.equal(result.score_hits.summary.final_score, result.annual_score);
  assert.ok(result.score_hits.layers[0].hits.some(hit => hit.code === 'dayun_sanxing_cap'));
});

test('zixing only triggers when annual zhi repeats a natal self-punishment branch', () => {
  const withoutRepeat = calculateAnnualScore({
    ...baseProfile,
    day_zhi: '午',
    month_zhi: '子',
    year_zhi: '寅',
    dayun_gz: '庚申',
    liunian_gz: '戊辰',
  });

  assert.equal(withoutRepeat.is_zixing, false);
  assert.doesNotMatch(withoutRepeat.layer2_detail, /自刑/);

  const withRepeat = calculateAnnualScore({
    ...baseProfile,
    day_zhi: '午',
    month_zhi: '辰',
    year_zhi: '寅',
    dayun_gz: '庚申',
    liunian_gz: '戊辰',
  });

  assert.equal(withRepeat.is_zixing, true);
  assert.match(withRepeat.layer2_detail, /流年支\[辰\]与原局月支\[辰\]自刑（同支相见）-8/);
  assert.ok(withRepeat.annual_score <= 88);
});

test('layer1 includes month branch chong and he without double-counting duplicate branches', () => {
  const monthChong = calculateAnnualScore({
    ...baseProfile,
    day_zhi: '巳',
    month_zhi: '午',
    year_zhi: '戌',
    dayun_gz: '庚子',
    liunian_gz: '戊戌',
    favorable_elements: [],
    unfavorable_elements: [],
  });

  assert.match(monthChong.layer1_detail, /大运支\[子\]冲月支\[午\]-5/);

  const duplicateDayAndMonth = calculateAnnualScore({
    ...baseProfile,
    day_zhi: '午',
    month_zhi: '午',
    year_zhi: '巳',
    dayun_gz: '庚子',
    liunian_gz: '戊戌',
    favorable_elements: [],
    unfavorable_elements: [],
  });

  assert.match(duplicateDayAndMonth.layer1_detail, /冲日支\[午\]-8/);
  assert.doesNotMatch(duplicateDayAndMonth.layer1_detail, /冲月支\[午\]/);

  const monthLiuhe = calculateAnnualScore({
    ...baseProfile,
    day_zhi: '寅',
    month_zhi: '丑',
    year_zhi: '巳',
    dayun_gz: '庚子',
    liunian_gz: '戊戌',
    favorable_elements: [],
    unfavorable_elements: [],
  });

  assert.match(monthLiuhe.layer1_detail, /大运支\[子\]与月支\[丑\]六合化土\+1/);
});

test('layer2 liuhai distinguishes favorable and unfavorable harmed branches', () => {
  const harmfulToFavorable = calculateAnnualScore({
    ...baseProfile,
    day_zhi: '申',
    month_zhi: '子',
    year_zhi: '寅',
    dayun_gz: '庚申',
    liunian_gz: '己未',
    favorable_elements: ['印星'],
    unfavorable_elements: [],
  });

  assert.match(harmfulToFavorable.layer2_detail, /流年支\[未\]六害喜用\[子\]-3/);

  const harmfulToUnfavorable = calculateAnnualScore({
    ...baseProfile,
    day_zhi: '申',
    month_zhi: '子',
    year_zhi: '寅',
    dayun_gz: '庚申',
    liunian_gz: '己未',
    favorable_elements: [],
    unfavorable_elements: ['印星'],
  });

  assert.match(harmfulToUnfavorable.layer2_detail, /流年支\[未\]六害忌仇\[子\]，扣分免除/);
});

test('benmingnian scores favorable zhi as +3 and unfavorable zhi as -5', () => {
  const favorableBenming = calculateAnnualScore({
    ...baseProfile,
    day_zhi: '申',
    month_zhi: '寅',
    year_zhi: '子',
    dayun_gz: '庚申',
    liunian_gz: '壬子',
    favorable_elements: ['印星'],
    unfavorable_elements: [],
  });

  assert.equal(favorableBenming.is_benmingnian, true);
  assert.match(favorableBenming.layer2_detail, /本命年太岁归位（喜用），可乘势推进\+3/);

  const unfavorableBenming = calculateAnnualScore({
    ...baseProfile,
    day_zhi: '申',
    month_zhi: '寅',
    year_zhi: '子',
    dayun_gz: '庚申',
    liunian_gz: '壬子',
    favorable_elements: [],
    unfavorable_elements: ['印星'],
  });

  assert.equal(unfavorableBenming.is_benmingnian, true);
  assert.match(unfavorableBenming.layer2_detail, /本命年太岁压命（忌仇）-5/);
});

test('layer3 supports suide and suide-he as separate mutually exclusive signals', () => {
  const suide = calculateAnnualScore({
    ...baseProfile,
    bazi_str: '甲午 辛巳 甲申 庚午',
    day_zhi: '申',
    month_zhi: '巳',
    year_zhi: '午',
    dayun_gz: '庚申',
    liunian_gz: '甲戌',
  });

  assert.equal(suide.shensha_signals.suide_active, true);
  assert.equal(suide.shensha_signals.suide_he_active, false);
  assert.match(suide.suiyun_relations, /岁德（流年干=年干）\+8/);

  const suideHe = calculateAnnualScore({
    ...baseProfile,
    bazi_str: '甲午 辛巳 甲申 庚午',
    day_zhi: '申',
    month_zhi: '巳',
    year_zhi: '午',
    dayun_gz: '庚申',
    liunian_gz: '己戌',
  });

  assert.equal(suideHe.shensha_signals.suide_active, false);
  assert.equal(suideHe.shensha_signals.suide_he_active, true);
  assert.match(suideHe.suiyun_relations, /岁德合（流年干合年干化土）\+6/);
});

test('suipo penalty is reduced when it overlaps with liunian-dayun chong', () => {
  const result = calculateAnnualScore({
    ...baseProfile,
    day_zhi: '午',
    month_zhi: '巳',
    year_zhi: '子',
    dayun_gz: '庚申',
    liunian_gz: '甲寅',
    favorable_elements: ['官杀'],
    unfavorable_elements: [],
  });

  assert.match(result.suiyun_relations, /流年冲大运喜用（破坏底色）-10/);
  assert.match(result.suiyun_relations, /岁破（流年支冲大运支）-4/);
});

test('pure suipo against natal year branch keeps the full -6 penalty', () => {
  const result = calculateAnnualScore({
    ...baseProfile,
    day_zhi: '午',
    month_zhi: '巳',
    year_zhi: '申',
    dayun_gz: '庚子',
    liunian_gz: '甲寅',
    favorable_elements: [],
    unfavorable_elements: [],
  });

  assert.match(result.suiyun_relations, /岁破（流年支冲原局年支）-6/);
});

test('balanced layer1 and layer2 heavenly stem scores offset at plus and minus nine', () => {
  const result = calculateAnnualScore({
    ...baseProfile,
    day_zhi: '亥',
    month_zhi: '未',
    year_zhi: '寅',
    dayun_gz: '庚子',
    liunian_gz: '壬酉',
    favorable_elements: ['印星'],
    unfavorable_elements: ['官杀'],
  });

  assert.match(result.layer1_detail, /大运天干\[庚\]七杀为忌神-9/);
  assert.match(result.layer2_detail, /流年天干\[壬\]偏印用神\+11/);
  // 四维体系权重：忌神-9，用神+11，差值为 2
  assert.equal(result.layer1_score + result.layer2_score, 2);
});

test('annual yima uses year branch first and day branch fallback without profile scope errors', () => {
  const dayFallback = calculateAnnualScore({
    ...baseProfile,
    bazi_str: '庚子 辛巳 甲午 庚午',
    day_zhi: '午',
    month_zhi: '巳',
    year_zhi: '',
    dayun_gz: '庚子',
    liunian_gz: '甲申',
    favorable_elements: [],
    unfavorable_elements: [],
  });

  assert.equal(dayFallback.shensha_signals.yima_active, true);
  assert.match(dayFallback.suiyun_relations, /驿马/);

  const yearPriority = calculateAnnualScore({
    ...baseProfile,
    bazi_str: '庚子 辛巳 甲午 庚午',
    day_zhi: '午',
    month_zhi: '巳',
    year_zhi: '子',
    dayun_gz: '庚子',
    liunian_gz: '甲寅',
    favorable_elements: [],
    unfavorable_elements: [],
  });

  assert.equal(yearPriority.shensha_signals.yima_active, true);
  assert.match(yearPriority.suiyun_relations, /驿马/);
});

test('tianyi and wenchang keep fixed auspicious strength even on unfavorable annual branches', () => {
  const tianyiUnfavorable = calculateAnnualScore({
    ...baseProfile,
    day_zhi: '午',
    month_zhi: '巳',
    year_zhi: '寅',
    dayun_gz: '庚子',
    liunian_gz: '乙丑',
    favorable_elements: [],
    unfavorable_elements: ['财星'],
  });

  assert.equal(tianyiUnfavorable.shensha_signals.tianyi_active, true);
  assert.match(tianyiUnfavorable.suiyun_relations, /天乙贵人\+8（固定吉神，不随忌仇打折）/);
  assert.doesNotMatch(tianyiUnfavorable.suiyun_relations, /天乙贵人\+\d+（×/);

  const tianyiFavorable = calculateAnnualScore({
    ...baseProfile,
    day_zhi: '午',
    month_zhi: '巳',
    year_zhi: '寅',
    dayun_gz: '庚子',
    liunian_gz: '乙丑',
    favorable_elements: ['财星'],
    unfavorable_elements: [],
  });

  assert.match(tianyiFavorable.suiyun_relations, /天乙贵人\+10（固定吉神，喜用年额外\+2）/);

  const wenchangUnfavorable = calculateAnnualScore({
    ...baseProfile,
    day_zhi: '午',
    month_zhi: '子',
    year_zhi: '寅',
    dayun_gz: '庚子',
    liunian_gz: '丁巳',
    favorable_elements: [],
    unfavorable_elements: ['食伤'],
  });

  assert.equal(wenchangUnfavorable.shensha_signals.wenchang_active, true);
  assert.match(wenchangUnfavorable.suiyun_relations, /文昌贵人\+6（固定吉神，不随忌仇打折）/);
  assert.doesNotMatch(wenchangUnfavorable.suiyun_relations, /文昌贵人\+\d+（×/);

  const wenchangFavorable = calculateAnnualScore({
    ...baseProfile,
    day_zhi: '午',
    month_zhi: '子',
    year_zhi: '寅',
    dayun_gz: '庚子',
    liunian_gz: '丁巳',
    favorable_elements: ['食伤'],
    unfavorable_elements: [],
  });

  assert.match(wenchangFavorable.suiyun_relations, /文昌贵人\+8（固定吉神，喜用年额外\+2）/);
});
