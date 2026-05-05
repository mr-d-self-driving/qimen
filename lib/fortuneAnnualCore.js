const { calculateAnnualScore } = require('./calculateAnnualScore');
const { Solar } = require('lunar-javascript');
const { deriveTransitsFromBirthDate, hasScoreFields } = require('./fortuneMonthlyCore');

const ANNUAL_SCORE_CACHE_VERSION = 'annual-score-v1';

function buildAnnualFortunePeriodKey(year, profileId) {
  return profileId
    ? `year-${year}::${ANNUAL_SCORE_CACHE_VERSION}::${profileId}`
    : `year-${year}::${ANNUAL_SCORE_CACHE_VERSION}`;
}

function resolveAnnualTransitContext(profile, year) {
  return deriveTransitsFromBirthDate(profile, year);
}

function buildFallbackAnnualResult() {
  return {
    annual_score: 70,
    layer1_score: 0,
    layer2_score: 0,
    layer3_score: 0,
    is_kongwang: false,
    kongwang_type: 'none',
    is_benmingnian: false,
    is_zixing: false,
    dayun_sanxing: false,
    liunian_sanxing: false,
    dayun_gz: '',
    liunian_gz: '',
    dayun_gan_shishen: '',
    liunian_gan_shishen: '',
    dayun_qi_status: 'neutral',
    year_relations: '命理字段不完整，使用保底年运分',
    suiyun_relations: '命理字段不完整，使用保底年运分',
    shensha_signals: {
      tianyi_active: false,
      wenchang_active: false,
      lu_active: false,
      yima_active: false,
      suide_active: false,
      suipo_active: false,
      shensha_ratio: 1.0
    },
    layer1_detail: '',
    layer2_detail: '',
    layer3_detail: ''
  };
}

function buildAnnualFortunePayload(profile, targetYear) {
  const transitContext = resolveAnnualTransitContext(profile, targetYear);
  const scoreProfile = {
    ...profile,
    ...transitContext,
  };
  
  const scoreResult = hasScoreFields(profile)
    ? calculateAnnualScore(scoreProfile)
    : buildFallbackAnnualResult();

  return {
    profile_id: profile?.id || '',
    profile_name: profile?.name || '',
    year: targetYear,
    period_key: `year-${targetYear}`,
    ...transitContext,
    ...scoreResult,
  };
}

function buildAnnualRangePayload(profile, baseYear, range = 10) {
  const years = [];
  const startYear = baseYear - range;
  const endYear = baseYear + range;
  
  for (let y = startYear; y <= endYear; y++) {
    years.push(buildAnnualFortunePayload(profile, y));
  }
  
  return years;
}

module.exports = {
  buildAnnualFortunePeriodKey,
  buildAnnualFortunePayload,
  buildAnnualRangePayload,
  resolveAnnualTransitContext,
  ANNUAL_SCORE_CACHE_VERSION,
};
