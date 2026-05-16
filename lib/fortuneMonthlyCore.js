const { calculateMonthlyScore } = require('./calculateMonthlyScore');
const { calculateDailyScore, getShiShen } = require('./calculateDailyScore');
const { Solar } = require('lunar-javascript');
const { buildFlowMonthCacheMeta, getFlowMonthInfo } = require('./flowMonth');

const MONTHLY_SCORE_CACHE_VERSION = 'monthly-score-v7-p1-sanxing';

function pad2(value) {
  return String(value).padStart(2, '0');
}

function resolveFlowMonthInput(targetMonth) {
  return buildFlowMonthCacheMeta(targetMonth);
}

function buildFortunePeriodKey(monthKey, profileId) {
  return profileId
    ? `${monthKey}::${MONTHLY_SCORE_CACHE_VERSION}::${profileId}`
    : `${monthKey}::${MONTHLY_SCORE_CACHE_VERSION}`;
}

function normalizeGanZhi(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const match = value.match(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/);
    return match?.[0] || '';
  }
  const gan = value.gan || value.Gan || '';
  const zhi = value.zhi || value.Zhi || '';
  return gan && zhi ? `${gan}${zhi}` : '';
}

function parseBirthDate(birthDate) {
  const parts = String(birthDate || '').match(/\d+/g);
  if (!parts || parts.length < 3) return null;

  return {
    year: Number(parts[0]),
    month: Number(parts[1]),
    day: Number(parts[2]),
    hour: Number(parts[3] || 12),
    minute: Number(parts[4] || 0),
  };
}

function deriveTransitsFromBirthDate(profile, year) {
  const parsed = parseBirthDate(profile?.birth_date);
  if (!parsed) return {};

  try {
    const solar = Solar.fromYmdHms(parsed.year, parsed.month, parsed.day, parsed.hour, parsed.minute, 0);
    const eightChar = solar.getLunar().getEightChar();
    const yun = eightChar.getYun(profile?.gender === 'M' ? 1 : 0);
    const dayun = yun.getDaYun().find(item => year >= item.getStartYear() && year <= item.getEndYear())
      || yun.getDaYun().find(item => year <= item.getStartYear())
      || yun.getDaYun()[0];
    const liunian = dayun?.getLiuNian().find(item => item.getYear() === year);

    return {
      dayun_gz: dayun?.getGanZhi() || '',
      liunian_gz: liunian?.getGanZhi() || Solar.fromYmd(year, 2, 4).getLunar().getEightChar().getYear(),
    };
  } catch (error) {
    return {};
  }
}

function resolveMonthlyTransitContext(profile, year) {
  const matrix = profile?.bazi_detail?.matrix || {};
  const fromBirth = deriveTransitsFromBirthDate(profile, year);

  return {
    dayun_gz: fromBirth.dayun_gz
      || normalizeGanZhi(profile?.dayun_gz)
      || normalizeGanZhi(profile?.current_dayun_gz)
      || normalizeGanZhi(matrix.current_dayun),
    liunian_gz: fromBirth.liunian_gz
      || normalizeGanZhi(profile?.liunian_gz)
      || normalizeGanZhi(profile?.current_liunian_gz)
      || normalizeGanZhi(matrix.current_liunian),
  };
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

function buildFallbackMonthlyResult(flowMonth) {
  const daily_score_points = [];
  let cursor = flowMonth.start_date;
  while (cursor <= flowMonth.end_date) {
    daily_score_points.push({ date: cursor, score: 70 });
    const [year, month, day] = cursor.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, day));
    next.setUTCDate(next.getUTCDate() + 1);
    cursor = `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
  }

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
    best_date: flowMonth.start_date,
    best_score: 70,
    worst_date: flowMonth.start_date,
    worst_score: 70,
    has_trough: false,
    trough_period: '',
    daily_score_points,
    month_gz: flowMonth.month_gz,
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
    score_hits: {
      version: 'monthly-score-hits-v1',
      summary: {
        final_score: 70,
        display: '命理字段不完整，本月只按保底中线分展示，暂不作细分层判断。',
        debug: 'fallback monthly score because required profile score fields are missing',
      },
      layers: [
        {
          layer: 'layer1',
          label: '干支格局层',
          score: 0,
          hits: [{
            code: 'fallback_missing_profile_fields',
            type: 'warning',
            delta_raw: null,
            display: '命理字段不完整，干支格局层暂不细断。',
            debug: 'missing one of ri_zhu/day_zhi/year_zhi/month_zhi/favorable_elements/unfavorable_elements',
            meta: {},
          }],
        },
        { layer: 'layer2', label: '日运聚合层', score: 0, hits: [] },
        { layer: 'layer3', label: '月令神煞层', score: 0, hits: [] },
      ],
    },
  };
}

function buildMonthlyFortunePayload(profile, targetMonth) {
  const flowMonth = typeof targetMonth === 'object' && targetMonth?.start_date
    ? targetMonth
    : getFlowMonthInfo(targetMonth);
  const transitContext = resolveMonthlyTransitContext(profile, Number(flowMonth.start_date.slice(0, 4)));
  const scoreProfile = {
    ...profile,
    ...transitContext,
  };
  const scoreResult = hasScoreFields(profile)
    ? calculateMonthlyScore(scoreProfile, flowMonth, calculateDailyScore, getShiShen)
    : buildFallbackMonthlyResult(flowMonth);

  return {
    profile_id: profile?.id || '',
    profile_name: profile?.name || '',
    year: Number(flowMonth.start_date.slice(0, 4)),
    month: Number(flowMonth.start_date.slice(5, 7)),
    period_key: flowMonth.period_key,
    context_month_key: flowMonth.context_month_key,
    flow_month_label: `${flowMonth.month_gz}月`,
    flow_month_range_label: flowMonth.range_label,
    flow_month_short_range_label: flowMonth.short_range_label,
    flow_month_start_date: flowMonth.start_date,
    flow_month_end_date: flowMonth.end_date,
    flow_month_start_jie: flowMonth.start_jie,
    flow_month_next_jie: flowMonth.next_jie,
    ...transitContext,
    ...scoreResult,
  };
}

module.exports = {
  buildFortunePeriodKey,
  buildMonthlyFortunePayload,
  getFlowMonthInfo: resolveFlowMonthInput,
  hasScoreFields,
  resolveMonthlyTransitContext,
  deriveTransitsFromBirthDate,
  MONTHLY_SCORE_CACHE_VERSION,
};
