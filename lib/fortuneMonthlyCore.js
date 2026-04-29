const { calculateMonthlyScore } = require('./calculateMonthlyScore');
const { calculateDailyScore, getShiShen } = require('./calculateDailyScore');

const MONTHLY_SCORE_CACHE_VERSION = 'monthly-score-v2-60-10-30';

function pad2(value) {
  return String(value).padStart(2, '0');
}

function parseTargetMonth(targetMonth) {
  const direct = String(targetMonth || '').match(/^(\d{4})-(\d{1,2})$/);
  if (direct) {
    const year = Number(direct[1]);
    const month = Number(direct[2]);
    if (month >= 1 && month <= 12) return { year, month };
  }

  const dateLike = String(targetMonth || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dateLike) {
    const year = Number(dateLike[1]);
    const month = Number(dateLike[2]);
    if (month >= 1 && month <= 12) return { year, month };
  }

  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const bjTime = new Date(utc + 3600000 * 8);
  return { year: bjTime.getFullYear(), month: bjTime.getMonth() + 1 };
}

function getBeijingMonthInfo(targetMonth) {
  const { year, month } = parseTargetMonth(targetMonth);
  const monthKey = `${year}-${pad2(month)}`;
  const expiresAt = new Date(Date.UTC(year, month, 0, 15, 59, 59, 999));
  const secondsUntilMonthEnd = Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

  return {
    year,
    month,
    monthKey,
    expiresAt,
    secondsUntilMonthEnd,
  };
}

function buildFortunePeriodKey(monthKey, profileId) {
  return profileId
    ? `${monthKey}::${MONTHLY_SCORE_CACHE_VERSION}::${profileId}`
    : `${monthKey}::${MONTHLY_SCORE_CACHE_VERSION}`;
}

function hasScoreFields(profile = {}) {
  return Boolean(
    profile.ri_zhu
    && profile.day_zhi
    && profile.year_zhi
    && profile.month_zhi
    && Array.isArray(profile.favorable_elements)
    && Array.isArray(profile.unfavorable_elements)
  );
}

function buildFallbackMonthlyResult(year, month) {
  return {
    monthly_score: 70,
    layer1_score: 0,
    layer2_score: 0,
    layer3_score: 0,
    layer1_raw: 0,
    layer2_raw: 0,
    layer3_raw: 0,
    is_kongwang: false,
    has_sanxing: false,
    yuede_active: false,
    avg_daily_score: 70,
    high_score_days: 0,
    high_score_dates: [],
    low_score_days: 0,
    low_score_dates: [],
    best_date: `${year}-${pad2(month)}-01`,
    best_score: 70,
    worst_date: `${year}-${pad2(month)}-01`,
    worst_score: 70,
    has_trough: false,
    trough_period: '',
    daily_score_points: Array.from({ length: new Date(year, month, 0).getDate() }, (_, index) => ({
      date: `${year}-${pad2(month)}-${pad2(index + 1)}`,
      score: 70,
    })),
    month_gz: '',
    month_gan_shishen: '',
    month_relations: '命理字段不完整，使用保底月运分',
    month_zhi_relations: '命理字段不完整，使用保底月运分',
    month_wuxing: '',
    month_wuxing_relation: '闲',
    shishen_signals: {
      tianyi_active: false,
      wenchang_active: false,
      lu_active: false,
      yima_active: false,
      yima_favorable: false,
    },
    jieqi_list: [],
  };
}

function buildMonthlyFortunePayload(profile, year, month) {
  const monthKey = `${year}-${pad2(month)}`;
  const scoreResult = hasScoreFields(profile)
    ? calculateMonthlyScore(profile, year, month, calculateDailyScore, getShiShen)
    : buildFallbackMonthlyResult(year, month);

  return {
    profile_id: profile?.id || '',
    profile_name: profile?.name || '',
    year,
    month,
    period_key: monthKey,
    ...scoreResult,
  };
}

module.exports = {
  buildFortunePeriodKey,
  buildMonthlyFortunePayload,
  getBeijingMonthInfo,
  hasScoreFields,
  MONTHLY_SCORE_CACHE_VERSION,
};
