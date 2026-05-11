const test = require('node:test');
const assert = require('node:assert/strict');

const {
  WEEKLY_SCORE_CACHE_VERSION,
  buildFortunePeriodKey,
  buildWeeklyFortunePayload,
  classifyScoreLevel,
  classifyVolatility,
} = require('./fortuneWeeklyCore');

const BASE_PROFILE = {
  id: 'profile-weekly',
  name: '周运测试',
  favorable_elements: ['正财', '偏财', '正官', '七杀'],
  unfavorable_elements: ['正印', '偏印', '比肩', '劫财', '食神', '伤官'],
  day_zhi: '午',
  month_zhi: '子',
  year_zhi: '寅',
  ri_zhu: '甲午',
};

function buildStubCalculator(rows) {
  return (_, lunarDay) => {
    const date = lunarDay.getSolar().toYmd();
    const row = rows[date] || {};
    return {
      final_score: row.score ?? 70,
      is_kongwang: !!row.is_kongwang,
      has_sanxing: !!row.has_sanxing,
      breakdown: { dim1_score: 0, dim2_score: 0, dim3_score: 0 },
    };
  };
}

const FAVORABLE_WEALTH_THREE_SHISHEN = (dayGan) => ({
  乙: '正财',
  丙: '正财',
  丁: '正财',
  戊: '偏印',
  己: '偏印',
  庚: '偏印',
  辛: '偏印',
}[dayGan] || '偏印');

const FAVORABLE_WEALTH_FOUR_SHISHEN = (dayGan) => ({
  乙: '正财',
  丙: '正财',
  丁: '正财',
  戊: '正财',
  己: '偏印',
  庚: '偏印',
  辛: '偏印',
}[dayGan] || '偏印');

const FAVORABLE_WEALTH_ALL_SHISHEN = () => '正财';

test('weekly payload normalizes any target date to Monday through Sunday', () => {
  const payload = buildWeeklyFortunePayload(BASE_PROFILE, '2026-05-13', {
    calculateDailyScore: buildStubCalculator({}),
  });

  assert.equal(payload.week_start, '2026-05-11');
  assert.equal(payload.week_end, '2026-05-17');
  assert.equal(payload.daily_score_points.length, 7);
  assert.equal(payload.daily_score_points[0].date, '2026-05-11');
  assert.equal(payload.daily_score_points[6].date, '2026-05-17');
});

test('score level thresholds classify 75, 74.99, 60, and 59.99 correctly', () => {
  assert.equal(classifyScoreLevel(75), '高水');
  assert.equal(classifyScoreLevel(74.99), '中水');
  assert.equal(classifyScoreLevel(60), '中水');
  assert.equal(classifyScoreLevel(59.99), '低水');
});

test('volatility thresholds classify 14, 15, 24, and 25 correctly', () => {
  assert.equal(classifyVolatility(14), '平稳');
  assert.equal(classifyVolatility(15), '常态');
  assert.equal(classifyVolatility(24), '常态');
  assert.equal(classifyVolatility(25), '动荡');
});

test('trough triggers only when three consecutive days score 60 or below', () => {
  const withTrough = buildWeeklyFortunePayload(BASE_PROFILE, '2026-05-11', {
    calculateDailyScore: buildStubCalculator({
      '2026-05-11': { score: 62 },
      '2026-05-12': { score: 60 },
      '2026-05-13': { score: 59 },
      '2026-05-14': { score: 60 },
      '2026-05-15': { score: 72 },
    }),
  });
  const withoutTrough = buildWeeklyFortunePayload(BASE_PROFILE, '2026-05-11', {
    calculateDailyScore: buildStubCalculator({
      '2026-05-11': { score: 60 },
      '2026-05-12': { score: 72 },
      '2026-05-13': { score: 59 },
      '2026-05-14': { score: 74 },
      '2026-05-15': { score: 60 },
    }),
  });

  assert.equal(withTrough.metrics.has_trough, true);
  assert.equal(withTrough.weekly_tag.endsWith('· 防低谷'), true);
  assert.equal(withoutTrough.metrics.has_trough, false);
});

test('dominant energy uses weighted favorable/unfavorable buffer before deciding alignment', () => {
  const favorableDominant = buildWeeklyFortunePayload(BASE_PROFILE, '2026-05-11', {
    calculateDailyScore: buildStubCalculator({
      '2026-05-11': { score: 90 },
      '2026-05-12': { score: 90 },
      '2026-05-13': { score: 90 },
      '2026-05-14': { score: 60 },
      '2026-05-15': { score: 60 },
    }),
    getShiShen: FAVORABLE_WEALTH_FOUR_SHISHEN,
  });
  const balanced = buildWeeklyFortunePayload(BASE_PROFILE, '2026-05-11', {
    calculateDailyScore: buildStubCalculator({
      '2026-05-11': { score: 60 },
      '2026-05-12': { score: 60 },
      '2026-05-13': { score: 60 },
      '2026-05-14': { score: 60 },
      '2026-05-15': { score: 70 },
      '2026-05-16': { score: 70 },
      '2026-05-17': { score: 70 },
    }),
    getShiShen: FAVORABLE_WEALTH_FOUR_SHISHEN,
  });

  assert.equal(favorableDominant.dominant_energy.alignment, '喜用');
  assert.equal(favorableDominant.dominant_energy.class, '财星');
  assert.equal(favorableDominant.dominant_energy.top_shishen, '正财');
  assert.equal(balanced.dominant_energy.alignment, '均衡');
  assert.equal(balanced.dominant_energy.class, '均衡');
});

test('weekly tag applies jieqi prefix, trough suffix, and fallback labels', () => {
  const payload = buildWeeklyFortunePayload({
    ...BASE_PROFILE,
    favorable_elements: ['食神', '伤官'],
    unfavorable_elements: ['正财', '偏财', '正官', '七杀'],
  }, '2026-05-19', {
    calculateDailyScore: buildStubCalculator({
      '2026-05-18': { score: 58 },
      '2026-05-19': { score: 60 },
      '2026-05-20': { score: 60 },
      '2026-05-21': { score: 62 },
      '2026-05-22': { score: 58 },
      '2026-05-23': { score: 59 },
      '2026-05-24': { score: 55 },
    }),
  });

  assert.equal(payload.metrics.has_jieqi, true);
  assert.equal(payload.metrics.jieqi_name, '小满');
  assert.equal(payload.weekly_tag, '转折·蛰伏观望周· 防低谷');
});

test('weekly score applies net correction and sanxing/kongwang caps', () => {
  const noCap = buildWeeklyFortunePayload(BASE_PROFILE, '2026-05-11', {
    calculateDailyScore: buildStubCalculator({
      '2026-05-11': { score: 90 },
      '2026-05-12': { score: 90 },
      '2026-05-13': { score: 90 },
      '2026-05-14': { score: 90 },
      '2026-05-15': { score: 90 },
      '2026-05-16': { score: 90 },
      '2026-05-17': { score: 90 },
    }),
    getShiShen: FAVORABLE_WEALTH_ALL_SHISHEN,
  });
  const kongwangCap = buildWeeklyFortunePayload(BASE_PROFILE, '2026-05-11', {
    calculateDailyScore: buildStubCalculator({
      '2026-05-11': { score: 98, is_kongwang: true },
      '2026-05-12': { score: 98 },
      '2026-05-13': { score: 98 },
      '2026-05-14': { score: 98 },
      '2026-05-15': { score: 98 },
      '2026-05-16': { score: 98 },
      '2026-05-17': { score: 98 },
    }),
    getShiShen: FAVORABLE_WEALTH_ALL_SHISHEN,
  });
  const sanxingCap = buildWeeklyFortunePayload(BASE_PROFILE, '2026-05-11', {
    calculateDailyScore: buildStubCalculator({
      '2026-05-11': { score: 98, has_sanxing: true },
      '2026-05-12': { score: 98 },
      '2026-05-13': { score: 98 },
      '2026-05-14': { score: 98 },
      '2026-05-15': { score: 98 },
      '2026-05-16': { score: 98 },
      '2026-05-17': { score: 98 },
    }),
    getShiShen: FAVORABLE_WEALTH_ALL_SHISHEN,
  });
  const bothCaps = buildWeeklyFortunePayload(BASE_PROFILE, '2026-05-11', {
    calculateDailyScore: buildStubCalculator({
      '2026-05-11': { score: 98, has_sanxing: true, is_kongwang: true },
      '2026-05-12': { score: 98 },
      '2026-05-13': { score: 98 },
      '2026-05-14': { score: 98 },
      '2026-05-15': { score: 98 },
      '2026-05-16': { score: 98 },
      '2026-05-17': { score: 98 },
    }),
    getShiShen: FAVORABLE_WEALTH_ALL_SHISHEN,
  });

  assert.equal(noCap.weekly_score, 89);
  assert.equal(kongwangCap.weekly_score, 85);
  assert.equal(sanxingCap.weekly_score, 82);
  assert.equal(bothCaps.weekly_score, 82);
});

test('best day downgrades risky top score and worst day prioritizes sanxing then kongwang', () => {
  const payload = buildWeeklyFortunePayload(BASE_PROFILE, '2026-05-11', {
    calculateDailyScore: buildStubCalculator({
      '2026-05-11': { score: 90, is_kongwang: true },
      '2026-05-12': { score: 88 },
      '2026-05-13': { score: 45 },
      '2026-05-14': { score: 70, has_sanxing: true },
      '2026-05-15': { score: 46, is_kongwang: true },
    }),
  });

  assert.equal(payload.key_dates.best_day.date, '2026-05-12');
  assert.equal(payload.key_dates.best_day.score, 88);
  assert.equal(payload.key_dates.worst_day.date, '2026-05-14');
  assert.deepEqual(payload.key_dates.worst_day.triggers.includes('sanxing'), true);
});

test('buildFortunePeriodKey includes weekly cache version and profile id', () => {
  assert.equal(WEEKLY_SCORE_CACHE_VERSION, 'weekly-score-v1');
  assert.equal(
    buildFortunePeriodKey('2026-05-11', 'profile-weekly'),
    '2026-05-11::weekly-score-v1::profile-weekly'
  );
  assert.equal(buildFortunePeriodKey('2026-05-11', ''), '2026-05-11::weekly-score-v1');
});
