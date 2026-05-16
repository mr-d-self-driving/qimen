const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateMonthlyScore } = require('./calculateMonthlyScore');

const neutralDailyScore = () => ({ final_score: 70 });
const neutralShiShen = () => '闲神';
const flowMonth = monthGz => ({
  period_key: `test-${monthGz}`,
  context_month_key: `test-${monthGz}`,
  month_gz: monthGz,
  start_date: '2026-01-01',
  end_date: '2026-01-03',
  range_label: 'test',
  short_range_label: 'test',
});

const baseProfile = {
  ri_zhu: '甲午',
  day_zhi: '午',
  month_zhi: '子',
  year_zhi: '寅',
  favorable_elements: ['印星', '比劫'],
  unfavorable_elements: ['官杀', '食伤'],
};

test('monthly_score is always normalized to [45, 98]', () => {
  const result = calculateMonthlyScore(baseProfile, 2025, 7, neutralDailyScore, neutralShiShen);

  assert.ok(result.monthly_score >= 45, 'score below 45');
  assert.ok(result.monthly_score <= 98, 'score above 98');
});

test('Kong Wang cap keeps monthly_score at or below 85 when triggered', () => {
  const result = calculateMonthlyScore(
    {
      ...baseProfile,
      day_zhi: '辰',
      month_zhi: '子',
      year_zhi: '寅',
      favorable_elements: ['印星', '比劫', '食伤', '财星'],
      unfavorable_elements: [],
    },
    '2024-09-07',
    () => ({ final_score: 98 }),
    () => '正印'
  );

  assert.equal(result.is_kongwang, true);
  assert.ok(result.monthly_score <= 85, 'kongwang cap not applied');
});

test('monthly tiaohou bonus does not lift score above Kong Wang cap', () => {
  const result = calculateMonthlyScore(
    {
      ...baseProfile,
      ri_zhu: '甲午',
      month_zhi: '子',
      day_zhi: '辰',
      year_zhi: '寅',
      favorable_elements: ['印星', '比劫', '食伤', '财星'],
      unfavorable_elements: [],
    },
    {
      ...flowMonth('丁酉'),
      start_date: '2026-01-01',
      end_date: '2026-01-03',
    },
    () => ({ final_score: 98 }),
    () => '正印'
  );

  assert.equal(result.is_kongwang, true);
  const tiaohouLayer = result.score_hits.layers.find(layer => layer.layer === 'tiaohou');
  assert.ok(tiaohouLayer);
  assert.ok(tiaohouLayer.score > 0);
  assert.match(tiaohouLayer.hits[0].display, /流月天干/);
  assert.ok(result.monthly_score <= 85, 'tiaohou should be applied before Kong Wang cap');
  assert.match(result.score_hits.summary.debug, /tiaohouRatio=1\.08/);
  assert.match(result.score_hits.summary.debug, /tiaohouImpact=/);
});

test('San Xing penalty is graded and no longer overwrites layer1 to the floor', () => {
  const result = calculateMonthlyScore(
    {
      ...baseProfile,
      day_zhi: '寅',
      year_zhi: '巳',
      month_zhi: '午',
      favorable_elements: [],
      unfavorable_elements: [],
    },
    2025,
    9,
    neutralDailyScore,
    neutralShiShen
  );

  assert.equal(result.has_sanxing, true);
  assert.ok(result.layer1_score > -30);
  assert.match(result.month_relations, /三刑（刑动闲神/);
  assert.doesNotMatch(result.month_relations, /熔断/);
  assert.ok(result.score_hits.layers[0].hits.some(hit => (
    hit.code === 'sanxing_active'
    && hit.delta_raw === -12
    && /layer1 raw delta=-12/.test(hit.debug)
  )));
});

test('monthly score exposes display and debug hits for each scoring layer', () => {
  const result = calculateMonthlyScore(
    {
      ...baseProfile,
      day_zhi: '辰',
      month_zhi: '戌',
      year_zhi: '寅',
      dayun_gz: '己未',
      liunian_gz: '丙午',
      favorable_elements: ['食伤'],
      unfavorable_elements: [],
    },
    2026,
    1,
    () => ({ final_score: 98 }),
    () => '偏印'
  );

  assert.equal(result.score_hits.version, 'monthly-score-hits-v2');
  assert.equal(result.score_hits.summary.final_score, result.monthly_score);
  assert.match(result.score_hits.summary.display, /本月/);
  assert.match(result.score_hits.summary.debug, /layer1=/);

  const layer1 = result.score_hits.layers.find(layer => layer.layer === 'layer1');
  const layer2 = result.score_hits.layers.find(layer => layer.layer === 'layer2');
  const layer3 = result.score_hits.layers.find(layer => layer.layer === 'layer3');

  assert.ok(layer1);
  assert.ok(layer2);
  assert.ok(layer3);
  assert.equal(layer1.score, result.layer1_score);
  assert.equal(layer2.score, result.layer2_score);
  assert.equal(layer3.score, result.layer3_score);

  const allHits = result.score_hits.layers.flatMap(layer => layer.hits);
  assert.ok(allHits.some(hit => hit.code === 'zhi_liuhai' && hit.display && hit.debug));
  assert.ok(allHits.some(hit => hit.code === 'high_score_days_positive' && hit.display && hit.debug));

  const supported = calculateMonthlyScore(
    {
      ...baseProfile,
      ri_zhu: '甲午',
      day_zhi: '午',
      month_zhi: '子',
      year_zhi: '寅',
      dayun_gz: '己午',
      liunian_gz: '庚午',
      favorable_elements: ['食伤'],
      unfavorable_elements: [],
    },
    '2025-06-05',
    neutralDailyScore,
    neutralShiShen
  );
  const supportedHits = supported.score_hits.layers.flatMap(layer => layer.hits);
  assert.ok(supportedHits.some(hit => hit.code === 'transit_support_positive' && hit.display && hit.debug));
});

test('monthly layer weights use 60/10/30 distribution', () => {
  const strongDaily = () => ({ final_score: 98 });
  const result = calculateMonthlyScore(baseProfile, 2025, 7, strongDaily, neutralShiShen);

  assert.ok(result.layer1_score >= -30 && result.layer1_score <= 30);
  assert.ok(result.layer2_score >= -5 && result.layer2_score <= 5);
  assert.ok(result.layer3_score >= -15 && result.layer3_score <= 15);
  assert.ok(result.layer2_score > 0);
});

test('monthly zixing only triggers when month branch repeats a natal self-punishment branch', () => {
  const withoutRepeat = calculateMonthlyScore(
    {
      ...baseProfile,
      day_zhi: '午',
      month_zhi: '子',
      year_zhi: '寅',
      favorable_elements: [],
      unfavorable_elements: [],
    },
    flowMonth('戊辰'),
    neutralDailyScore,
    neutralShiShen
  );

  assert.doesNotMatch(withoutRepeat.month_relations, /自刑/);
  assert.ok(!withoutRepeat.score_hits.layers[0].hits.some(hit => hit.code === 'zixing_active'));

  const withRepeat = calculateMonthlyScore(
    {
      ...baseProfile,
      day_zhi: '午',
      month_zhi: '辰',
      year_zhi: '寅',
      favorable_elements: [],
      unfavorable_elements: [],
    },
    flowMonth('戊辰'),
    neutralDailyScore,
    neutralShiShen
  );

  assert.match(withRepeat.month_relations, /流月地支\[辰\]与命主月支\[辰\]自刑（同支相见）/);
  const zixingHit = withRepeat.score_hits.layers[0].hits.find(hit => hit.code === 'zixing_active');
  assert.ok(zixingHit);
  assert.equal(zixingHit.delta_raw, -5);
});

test('monthly lu uses day stem lu branch instead of month stem lu in natal branches', () => {
  const dayStemLu = calculateMonthlyScore(
    {
      ...baseProfile,
      ri_zhu: '甲午',
      day_zhi: '午',
      month_zhi: '子',
      year_zhi: '酉',
      favorable_elements: [],
      unfavorable_elements: [],
    },
    flowMonth('戊寅'),
    neutralDailyScore,
    neutralShiShen
  );

  assert.equal(dayStemLu.shishen_signals.lu_active, true);
  assert.ok(dayStemLu.score_hits.layers[2].hits.some(hit => (
    hit.code === 'lu_active'
    && /命主日干禄神临月/.test(hit.display)
    && hit.meta.lookup === 'day_stem_lu'
  )));

  const oldMonthStemLuOnly = calculateMonthlyScore(
    {
      ...baseProfile,
      ri_zhu: '甲午',
      day_zhi: '午',
      month_zhi: '巳',
      year_zhi: '酉',
      favorable_elements: [],
      unfavorable_elements: [],
    },
    flowMonth('戊子'),
    neutralDailyScore,
    neutralShiShen
  );

  assert.equal(oldMonthStemLuOnly.shishen_signals.lu_active, false);
});

test('chong that controls an unfavorable target adds instead of penalizing', () => {
  const result = calculateMonthlyScore(
    {
      ...baseProfile,
      day_zhi: '午',
      month_zhi: '酉',
      year_zhi: '巳',
      favorable_elements: ['印星', '比劫'],
      unfavorable_elements: ['食伤'],
    },
    2026,
    1,
    neutralDailyScore,
    neutralShiShen
  );

  assert.equal(result.month_gz, '戊子');
  assert.ok(result.layer1_score > 0);
  assert.match(result.month_relations, /制忌/);
});

test('chong against a favorable target remains a strong penalty', () => {
  const result = calculateMonthlyScore(
    {
      ...baseProfile,
      day_zhi: '午',
      month_zhi: '酉',
      year_zhi: '巳',
      favorable_elements: ['食伤'],
      unfavorable_elements: [],
    },
    2026,
    1,
    neutralDailyScore,
    neutralShiShen
  );

  assert.equal(result.month_gz, '戊子');
  assert.ok(result.layer1_score <= -15);
  assert.match(result.month_relations, /冲用神/);
});

test('liunian and dayun zhi participate as dynamic relation targets', () => {
  const result = calculateMonthlyScore(
    {
      ...baseProfile,
      day_zhi: '辰',
      month_zhi: '戌',
      year_zhi: '寅',
      dayun_gz: '己未',
      liunian_gz: '丙午',
      favorable_elements: ['食伤'],
      unfavorable_elements: [],
    },
    2026,
    1,
    neutralDailyScore,
    neutralShiShen
  );

  assert.equal(result.month_gz, '戊子');
  assert.match(result.month_relations, /流年支\[午\]六冲/);
  assert.match(result.month_relations, /大运支\[未\]六害/);
});

test('layer3 rewards liuyue shensha supported by liunian or dayun', () => {
  const withoutSupport = calculateMonthlyScore(
    {
      ...baseProfile,
      ri_zhu: '甲午',
      day_zhi: '午',
      month_zhi: '子',
      year_zhi: '寅',
      favorable_elements: ['食伤'],
      unfavorable_elements: [],
    },
    '2025-06-05',
    neutralDailyScore,
    neutralShiShen
  );
  const withSupport = calculateMonthlyScore(
    {
      ...baseProfile,
      ri_zhu: '甲午',
      day_zhi: '午',
      month_zhi: '子',
      year_zhi: '寅',
      dayun_gz: '己午',
      liunian_gz: '庚午',
      favorable_elements: ['食伤'],
      unfavorable_elements: [],
    },
    '2025-06-05',
    neutralDailyScore,
    neutralShiShen
  );

  assert.equal(withSupport.month_gz, '壬午');
  assert.ok(withSupport.transit_support_score > 0);
  assert.ok(withSupport.layer3_score > withoutSupport.layer3_score);
});

test('layer3 penalizes yima when the liuyue shensha point is broken by transits', () => {
  const withoutBreak = calculateMonthlyScore(
    {
      ...baseProfile,
      ri_zhu: '甲午',
      day_zhi: '午',
      month_zhi: '子',
      year_zhi: '寅',
      favorable_elements: ['印星', '比劫'],
      unfavorable_elements: [],
    },
    2025,
    9,
    neutralDailyScore,
    neutralShiShen
  );
  const withBreak = calculateMonthlyScore(
    {
      ...baseProfile,
      ri_zhu: '甲午',
      day_zhi: '午',
      month_zhi: '子',
      year_zhi: '寅',
      dayun_gz: '己寅',
      liunian_gz: '庚寅',
      favorable_elements: ['印星', '比劫'],
      unfavorable_elements: [],
    },
    2025,
    9,
    neutralDailyScore,
    neutralShiShen
  );

  assert.equal(withBreak.month_gz, '甲申');
  assert.equal(withBreak.shishen_signals.yima_active, true);
  assert.ok(withBreak.transit_support_score < 0);
  assert.ok(withBreak.layer3_score < withoutBreak.layer3_score);
});

test('Yuede cancels the lightest chong penalty and lifts layer1_score', () => {
  const profile = {
    ...baseProfile,
    day_zhi: '申',
    month_zhi: '子',
    year_zhi: '子',
    favorable_elements: [],
    unfavorable_elements: [],
  };

  const withYuede = calculateMonthlyScore(profile, 2024, 3, neutralDailyScore, neutralShiShen);
  const withoutYuede = calculateMonthlyScore(profile, 2025, 3, neutralDailyScore, neutralShiShen);

  assert.equal(withYuede.yuede_active, true);
  assert.equal(withoutYuede.yuede_active, false);
  assert.ok(withYuede.layer1_score > withoutYuede.layer1_score);
  assert.match(withYuede.month_relations, /月德贵人得令/);
  assert.match(withYuede.month_relations, /已抵消最轻一项冲罚/);
});

test('favorable aliases such as 印星 match concrete shishen names', () => {
  const result = calculateMonthlyScore(
    {
      ...baseProfile,
      favorable_elements: ['印星'],
      unfavorable_elements: [],
    },
    2025,
    7,
    neutralDailyScore,
    () => '偏印'
  );

  assert.ok(result.layer1_score > 0);
});

test('monthly scores do not collapse to the lower bound across a full year', () => {
  const scores = Array.from({ length: 12 }, (_, index) => (
    calculateMonthlyScore(baseProfile, 2025, index + 1).monthly_score
  ));

  assert.ok(scores.some(score => score > 45));
});
