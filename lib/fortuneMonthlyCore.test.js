const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildFortunePeriodKey,
  buildMonthlyFortunePayload,
  getFlowMonthInfo,
  resolveMonthlyTransitContext,
  MONTHLY_SCORE_CACHE_VERSION,
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

  const payload = buildMonthlyFortunePayload(profile, '2025-07-07');

  assert.equal(payload.profile_id, 'profile-1');
  assert.equal(payload.profile_name, '测试命主');
  assert.equal(payload.period_key, '2025-07-07');
  assert.equal(payload.flow_month_start_date, '2025-07-07');
  assert.equal(payload.flow_month_end_date, '2025-08-06');
  assert.equal(payload.context_month_key, '2025-07');
  assert.equal(typeof payload.monthly_score, 'number');
  assert.ok(payload.monthly_score >= 45);
  assert.ok(payload.monthly_score <= 98);
  assert.equal(payload.month_gz, '癸未');
  assert.ok(Array.isArray(payload.jieqi_list));
  assert.ok(Array.isArray(payload.daily_score_points));
  assert.equal(payload.daily_score_points.length, 31);
  assert.equal(payload.score_hits.version, 'monthly-score-hits-v1');
  assert.ok(Array.isArray(payload.score_hits.layers));
  assert.ok(payload.score_hits.layers.some(layer => layer.layer === 'layer1' && Array.isArray(layer.hits)));
});

test('getFlowMonthInfo parses a jie-month key into cache period metadata', () => {
  const info = getFlowMonthInfo('2025-07-07');

  assert.equal(info.period_key, '2025-07-07');
  assert.equal(info.start_date, '2025-07-07');
  assert.equal(info.end_date, '2025-08-06');
  assert.equal(info.month_gz, '癸未');
});

test('buildFortunePeriodKey includes monthly score cache version', () => {
  assert.equal(
    buildFortunePeriodKey('2025-07', 'profile-1'),
    `2025-07::${MONTHLY_SCORE_CACHE_VERSION}::profile-1`
  );
  assert.equal(
    buildFortunePeriodKey('2025-07', ''),
    `2025-07::${MONTHLY_SCORE_CACHE_VERSION}`
  );
});

test('resolveMonthlyTransitContext derives target-year dayun and liunian from birth_date', () => {
  const transits = resolveMonthlyTransitContext({
    gender: 'F',
    birth_date: '1998-10-24 08:30:00',
    bazi_str: '戊寅 壬戌 甲辰 戊辰',
  }, 2026);

  assert.equal(transits.dayun_gz, '己未');
  assert.equal(transits.liunian_gz, '丙午');
});

test('buildMonthlyFortunePayload exposes transits for dynamic monthly relations', () => {
  const payload = buildMonthlyFortunePayload({
    id: 'profile-transit',
    name: '动态岁运测试',
    gender: 'F',
    birth_date: '1998-10-24 08:30:00',
    bazi_str: '戊寅 壬戌 甲辰 戊辰',
    favorable_elements: ['食伤'],
    unfavorable_elements: [],
    day_zhi: '辰',
    month_zhi: '戌',
    year_zhi: '寅',
    ri_zhu: '甲辰',
  }, '2026-01-05');

  assert.equal(payload.dayun_gz, '己未');
  assert.equal(payload.liunian_gz, '丙午');
  assert.match(payload.month_relations, /流年支\[午\]六害/);
});
