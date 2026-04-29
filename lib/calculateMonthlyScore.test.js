const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateMonthlyScore } = require('./calculateMonthlyScore');
const { getShiShen } = require('./calculateDailyScore');

const neutralDailyScore = () => ({ final_score: 70 });

test('monthly_score is always normalized to [45, 98]', () => {
  const profile = {
    favorable_elements: ['正印', '偏印', '比肩', '劫财'],
    unfavorable_elements: ['正官', '七杀', '食神', '伤官'],
    day_zhi: '午',
    month_zhi: '子',
    year_zhi: '寅',
    ri_zhu: '甲午',
  };

  const result = calculateMonthlyScore(profile, 2025, 7, neutralDailyScore, getShiShen);

  assert.ok(result.monthly_score >= 45);
  assert.ok(result.monthly_score <= 98);
});

test('Kong Wang cap keeps monthly_score at or below 85 when triggered', () => {
  const profile = {
    favorable_elements: ['正印', '偏印', '比肩', '劫财'],
    unfavorable_elements: [],
    day_zhi: '辰',
    month_zhi: '戌',
    year_zhi: '戌',
    ri_zhu: '甲辰',
  };

  const result = calculateMonthlyScore(profile, 2025, 7, neutralDailyScore, getShiShen);

  assert.equal(result.is_kongwang, true);
  assert.ok(result.monthly_score <= 85);
});

test('San Xing penalty drives layer1_raw below neutral', () => {
  const profile = {
    favorable_elements: [],
    unfavorable_elements: [],
    day_zhi: '戌',
    month_zhi: '未',
    year_zhi: '亥',
    ri_zhu: '甲戌',
  };

  const result = calculateMonthlyScore(profile, 2025, 2, neutralDailyScore, getShiShen);

  assert.equal(result.has_sanxing, true);
  assert.ok(result.layer1_raw < 20);
});
