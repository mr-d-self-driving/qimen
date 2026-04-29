const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildMonthlyFortunePayload,
  getBeijingMonthInfo,
} = require('./fortuneMonthlyCore');

test('buildMonthlyFortunePayload exposes monthly score for frontend month tab', () => {
  const profile = {
    id: 'profile-1',
    name: '测试命主',
    favorable_elements: ['正印', '偏印', '比肩', '劫财'],
    unfavorable_elements: ['正官', '七杀', '食神', '伤官'],
    day_zhi: '午',
    month_zhi: '子',
    year_zhi: '寅',
    ri_zhu: '甲午',
  };

  const payload = buildMonthlyFortunePayload(profile, 2025, 7);

  assert.equal(payload.profile_id, 'profile-1');
  assert.equal(payload.profile_name, '测试命主');
  assert.equal(payload.year, 2025);
  assert.equal(payload.month, 7);
  assert.equal(payload.period_key, '2025-07');
  assert.equal(typeof payload.monthly_score, 'number');
  assert.ok(payload.monthly_score >= 45);
  assert.ok(payload.monthly_score <= 98);
  assert.equal(payload.month_gz, '壬午');
  assert.ok(Array.isArray(payload.jieqi_list));
});

test('getBeijingMonthInfo parses target_month into cache period metadata', () => {
  const info = getBeijingMonthInfo('2025-07');

  assert.equal(info.year, 2025);
  assert.equal(info.month, 7);
  assert.equal(info.monthKey, '2025-07');
  assert.ok(info.expiresAt instanceof Date);
  assert.ok(info.secondsUntilMonthEnd > 0);
});
