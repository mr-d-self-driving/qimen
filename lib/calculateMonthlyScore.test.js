const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateMonthlyScore } = require('./calculateMonthlyScore');

const neutralDailyScore = () => ({ final_score: 70 });
const neutralShiShen = () => '闲神';

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
    2024,
    6,
    () => ({ final_score: 98 }),
    () => '正印'
  );

  assert.equal(result.is_kongwang, true);
  assert.ok(result.monthly_score <= 85, 'kongwang cap not applied');
});

test('San Xing penalty forces layer1_score to the 60% layer floor', () => {
  const result = calculateMonthlyScore(
    {
      ...baseProfile,
      day_zhi: '寅',
      year_zhi: '巳',
      month_zhi: '午',
    },
    2025,
    9,
    neutralDailyScore,
    neutralShiShen
  );

  assert.equal(result.has_sanxing, true);
  assert.equal(result.layer1_score, -30);
  assert.equal(result.layer1_raw, -30);
  assert.match(result.month_relations, /三刑（已熔断）/);
});

test('monthly layer weights use 60/10/30 distribution', () => {
  const strongDaily = () => ({ final_score: 98 });
  const result = calculateMonthlyScore(baseProfile, 2025, 7, strongDaily, neutralShiShen);

  assert.ok(result.layer1_score >= -30 && result.layer1_score <= 30);
  assert.ok(result.layer2_score >= -5 && result.layer2_score <= 5);
  assert.ok(result.layer3_score >= -15 && result.layer3_score <= 15);
  assert.ok(result.layer2_score > 0);
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
