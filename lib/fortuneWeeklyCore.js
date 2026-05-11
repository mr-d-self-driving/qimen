const { Solar } = require('lunar-javascript');
const {
  calculateDailyScore: defaultCalculateDailyScore,
  getShiShen: defaultGetShiShen,
} = require('./calculateDailyScore');

const WEEKLY_SCORE_CACHE_VERSION = 'weekly-score-v1';

const SHISHEN_CLASSES = {
  印星: ['正印', '偏印'],
  比劫: ['比肩', '劫财'],
  食伤: ['食神', '伤官'],
  财星: ['正财', '偏财'],
  官杀: ['正官', '七杀'],
};

const SHISHEN_TO_CLASS = Object.entries(SHISHEN_CLASSES).reduce((acc, [className, shens]) => {
  shens.forEach(shen => { acc[shen] = className; });
  return acc;
}, {});

const ZHI_CHONG = {
  子: '午', 午: '子',
  丑: '未', 未: '丑',
  寅: '申', 申: '寅',
  卯: '酉', 酉: '卯',
  辰: '戌', 戌: '辰',
  巳: '亥', 亥: '巳',
};

const EVENT_FORECAST = {
  '喜用:财星': {
    career: '本周事业重现实成果和资源落袋，适合推进能看见回报的任务。',
    wealth: '本周财富信号偏正向，适合处理收款、预算和稳健型收益。',
    relationship: '本周关系更重稳定承诺，现实层面的照顾会比空话更有分量。',
  },
  '忌仇:财星': {
    career: '本周事业要防资源牵扯，合作、预算和职责边界宜先说清。',
    wealth: '本周财富要防支出和诱惑，避免被短期机会带着走。',
    relationship: '本周关系容易被现实压力牵动，钱、时间和责任分配要留余地。',
  },
  '喜用:官杀': {
    career: '本周事业适合在规则内推进，争取认可、汇报和定责都较有利。',
    wealth: '本周财富宜重合规稳定，制度内收入和长期安排更容易落地。',
    relationship: '本周关系重边界与承诺，把规则讲明反而能减少误会。',
  },
  '忌仇:官杀': {
    career: '本周事业要防压力和考核，遇到催促时先稳住节奏。',
    wealth: '本周财富要防罚款、合约压力或被规则卡住，文件细节需复核。',
    relationship: '本周关系要防控制感，强压式沟通容易激起反弹。',
  },
  '喜用:食伤': {
    career: '本周事业适合表达、创作和发布，靠内容与方案打开局面。',
    wealth: '本周财富可借口碑变现，适合把能力包装成明确服务。',
    relationship: '本周关系适合轻松互动，真诚表达比刻意经营更顺。',
  },
  '忌仇:食伤': {
    career: '本周事业要防顶撞和过度表达，锋芒太露容易影响协作。',
    wealth: '本周财富要防冲动消费，尤其不宜为情绪买单。',
    relationship: '本周关系要防话语伤人，临场反应太快反而容易失分。',
  },
  '喜用:印星': {
    career: '本周事业利学习、背书和贵人支持，适合补材料、拿资源。',
    wealth: '本周财富偏稳健，适合做保守安排和长期准备。',
    relationship: '本周关系偏被照顾，也适合用耐心和支持修复信任。',
  },
  '忌仇:印星': {
    career: '本周事业要防拖延和想太多，信息收集够用后就要推进。',
    wealth: '本周财富要防虚耗，别把钱花在看似安心但低效的地方。',
    relationship: '本周关系要防冷淡，沉默太久容易被理解成疏远。',
  },
  '喜用:比劫': {
    career: '本周事业利协作和主动推进，适合借团队力量把事顶上去。',
    wealth: '本周财富可借团队资源打开机会，但分账和边界要清楚。',
    relationship: '本周关系重并肩感，一起处理现实事务比单纯表态更有效。',
  },
  '忌仇:比劫': {
    career: '本周事业要防同伴牵扯，别人临时变化可能拖慢你的节奏。',
    wealth: '本周财富要防分流借贷，朋友、人情和合伙账目都宜谨慎。',
    relationship: '本周关系要防竞争干扰，外部意见不宜过度介入。',
  },
  '均衡:均衡': {
    career: '本周事业节奏中性，适合按优先级稳步推进，不必强行抢进。',
    wealth: '本周财富宜守住基本盘，重在清账、控预算和减少不必要波动。',
    relationship: '本周关系以稳定沟通为主，顺着现实节奏慢慢推进即可。',
  },
};

function pad2(value) {
  return String(value).padStart(2, '0');
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeDateKey(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

function addDays(dateKey, offset) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offset);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function getWeekRange(targetDate) {
  const dateKey = normalizeDateKey(targetDate);
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const week_start = addDays(dateKey, mondayOffset);
  const week_end = addDays(week_start, 6);
  return { week_start, week_end };
}

function buildFortunePeriodKey(weekStart, profileId) {
  return profileId
    ? `${weekStart}::${WEEKLY_SCORE_CACHE_VERSION}::${profileId}`
    : `${weekStart}::${WEEKLY_SCORE_CACHE_VERSION}`;
}

function getWeeklyExpiry(weekEnd) {
  return new Date(`${weekEnd}T23:59:59.999+08:00`);
}

function getSecondsUntilWeeklyExpiry(weekEnd, now = new Date()) {
  return Math.max(60, Math.ceil((getWeeklyExpiry(weekEnd).getTime() - now.getTime()) / 1000));
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value).split(/[、,，\s]+/).map(item => item.trim()).filter(Boolean);
}

function expandShishenList(value) {
  const expanded = [];
  normalizeList(value).forEach(item => {
    if (SHISHEN_CLASSES[item]) {
      expanded.push(...SHISHEN_CLASSES[item]);
    } else {
      expanded.push(item);
    }
  });
  return [...new Set(expanded)];
}

function includesShishen(list, shishen) {
  return normalizeList(list).some(item => item === shishen || (SHISHEN_CLASSES[item] || []).includes(shishen));
}

function hasScoreFields(profile = {}) {
  return Boolean(
    profile.ri_zhu
    && profile.day_zhi
    && profile.year_zhi
    && profile.month_zhi
    && normalizeList(profile.favorable_elements).length > 0
    && normalizeList(profile.unfavorable_elements).length > 0
  );
}

function classifyScoreLevel(avgScore) {
  if (avgScore >= 75) return '高水';
  if (avgScore >= 60) return '中水';
  return '低水';
}

function classifyVolatility(extremeDiff) {
  if (extremeDiff < 15) return '平稳';
  if (extremeDiff < 25) return '常态';
  return '动荡';
}

function hasTrough(scores) {
  for (let i = 0; i <= scores.length - 3; i++) {
    if (scores[i] <= 60 && scores[i + 1] <= 60 && scores[i + 2] <= 60) return true;
  }
  return false;
}

function getTopKey(weightMap, allowedClasses) {
  const entries = Object.entries(weightMap)
    .filter(([key, value]) => value > 0 && (!allowedClasses || allowedClasses.includes(key)))
    .sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] || '';
}

function calculateDominantEnergy(dailyRows, profile) {
  const favorable = expandShishenList(profile.favorable_elements);
  const unfavorable = expandShishenList(profile.unfavorable_elements);
  let favWeightedScore = 0;
  let unfavWeightedScore = 0;
  const favClassWeights = {};
  const unfavClassWeights = {};
  const favShishenWeights = {};
  const unfavShishenWeights = {};

  dailyRows.forEach(row => {
    const className = row.dominant_class;
    if (!className) return;
    if (favorable.includes(row.dominant_shishen)) {
      favWeightedScore += row.score;
      favClassWeights[className] = (favClassWeights[className] || 0) + row.score;
      favShishenWeights[row.dominant_shishen] = (favShishenWeights[row.dominant_shishen] || 0) + row.score;
    } else if (unfavorable.includes(row.dominant_shishen)) {
      unfavWeightedScore += row.score;
      unfavClassWeights[className] = (unfavClassWeights[className] || 0) + row.score;
      unfavShishenWeights[row.dominant_shishen] = (unfavShishenWeights[row.dominant_shishen] || 0) + row.score;
    }
  });

  if (favWeightedScore > unfavWeightedScore * 1.2) {
    const className = getTopKey(favClassWeights) || '均衡';
    return {
      alignment: '喜用',
      class: className,
      top_shishen: getTopKey(favShishenWeights, SHISHEN_CLASSES[className]) || '',
      fav_weighted_score: Math.round(favWeightedScore),
      unfav_weighted_score: Math.round(unfavWeightedScore),
    };
  }

  if (unfavWeightedScore > favWeightedScore * 1.2) {
    const className = getTopKey(unfavClassWeights) || '均衡';
    return {
      alignment: '忌仇',
      class: className,
      top_shishen: getTopKey(unfavShishenWeights, SHISHEN_CLASSES[className]) || '',
      fav_weighted_score: Math.round(favWeightedScore),
      unfav_weighted_score: Math.round(unfavWeightedScore),
    };
  }

  return {
    alignment: '均衡',
    class: '均衡',
    top_shishen: '',
    fav_weighted_score: Math.round(favWeightedScore),
    unfav_weighted_score: Math.round(unfavWeightedScore),
  };
}

function buildWeeklyTag({ scoreLevel, volatilityType, dominantEnergy, hasTrough: trough, hasJieqi }) {
  const { alignment, class: className, top_shishen: topShishen } = dominantEnergy;
  let tag = '';

  if (scoreLevel === '高水' && volatilityType === '平稳' && alignment === '喜用' && ['财星', '官杀'].includes(className)) {
    tag = className === '财星' ? '稳健生财周' : '事业推进周';
  } else if (scoreLevel === '高水' && volatilityType === '动荡' && alignment === '喜用' && ['食伤', '比劫'].includes(className)) {
    tag = className === '食伤' ? '动中求变周' : '破旧立新周';
  } else if (scoreLevel === '高水' && alignment === '均衡') {
    tag = '顺势而为周';
  } else if (scoreLevel === '中水' && volatilityType === '常态' && alignment === '均衡') {
    tag = '蓄力平稳周';
  } else if (scoreLevel === '中水' && volatilityType === '动荡' && alignment === '忌仇') {
    tag = '谨慎应变周';
  } else if (scoreLevel === '低水' && volatilityType === '平稳' && alignment === '忌仇' && (
    className === '比劫' || ['正印', '偏印'].includes(topShishen)
  )) {
    tag = '蛰伏观望周';
  } else if (scoreLevel === '低水' && volatilityType === '动荡' && alignment === '忌仇' && ['七杀', '偏印'].includes(topShishen)) {
    tag = '承压排雷周';
  } else if (scoreLevel === '高水') {
    tag = '顺势而为周';
  } else if (scoreLevel === '中水' && alignment === '喜用') {
    tag = '稳中推进周';
  } else if (scoreLevel === '中水' && alignment === '忌仇') {
    tag = '谨慎蓄力周';
  } else if (scoreLevel === '低水' && volatilityType === '动荡') {
    tag = '承压排雷周';
  } else {
    tag = '蛰伏观望周';
  }

  if (hasJieqi) tag = `转折·${tag}`;
  if (trough) tag = `${tag}· 防低谷`;
  return tag;
}

function buildEventForecast(dominantEnergy, metrics) {
  const key = dominantEnergy.alignment === '均衡'
    ? '均衡:均衡'
    : `${dominantEnergy.alignment}:${dominantEnergy.class}`;
  const base = EVENT_FORECAST[key] || EVENT_FORECAST['均衡:均衡'];
  const suffixes = [];
  if (metrics.has_sanxing) suffixes.push('本周有三刑引动，计划推进需预留缓冲');
  if (metrics.has_kongwang) suffixes.push('吉象有虚耗感，忌把话说满');
  const append = (text) => suffixes.length ? `${text}${suffixes.join('')}` : text;
  return {
    career: append(base.career),
    wealth: append(base.wealth),
    relationship: append(base.relationship),
  };
}

function getTriggers(row, profile) {
  const triggers = [];
  if (row.has_sanxing) triggers.push('sanxing');
  if (row.is_kongwang) triggers.push('kongwang');
  if (profile.day_zhi && ZHI_CHONG[row.day_zhi] === profile.day_zhi) triggers.push('chong_rizhi');
  if (row.score >= 75 && includesShishen(profile.favorable_elements, row.dominant_shishen)) triggers.push('high_shishen');
  return triggers;
}

function toKeyDate(row, profile) {
  return {
    date: row.date,
    score: row.score,
    triggers: getTriggers(row, profile),
    dominant_shishen: row.dominant_shishen,
  };
}

function selectBestDay(dailyRows, profile) {
  const safeRows = dailyRows.filter(row => !row.has_sanxing && !row.is_kongwang);
  const candidates = safeRows.length ? safeRows : dailyRows;
  const row = [...candidates].sort((a, b) => b.score - a.score)[0];
  return toKeyDate(row, profile);
}

function selectWorstDay(dailyRows, profile) {
  const row = [...dailyRows].sort((a, b) => {
    if (a.has_sanxing !== b.has_sanxing) return a.has_sanxing ? -1 : 1;
    if (a.is_kongwang !== b.is_kongwang) return a.is_kongwang ? -1 : 1;
    return a.score - b.score;
  })[0];
  return toKeyDate(row, profile);
}

function calculateWeeklyScore(avgScore, dominantEnergy, metrics) {
  const totalWeighted = dominantEnergy.fav_weighted_score + dominantEnergy.unfav_weighted_score;
  const netCorrection = totalWeighted > 0
    ? clamp(((dominantEnergy.fav_weighted_score - dominantEnergy.unfav_weighted_score) / totalWeighted) * 30, -15, 15)
    : 0;
  let raw = avgScore * 0.7 + (70 + netCorrection) * 0.3;
  if (metrics.has_sanxing) raw = Math.min(raw, 82);
  if (metrics.has_kongwang) raw = Math.min(raw, 85);
  return clamp(Math.round(raw), 45, 98);
}

function buildFallbackWeeklyPayload(profile, targetDate) {
  const { week_start, week_end } = getWeekRange(targetDate);
  const dailyRows = Array.from({ length: 7 }, (_, index) => ({
    date: addDays(week_start, index),
    score: 70,
    triggers: [],
    dominant_shishen: '',
  }));
  return {
    weekly_score: 70,
    weekly_tag: '蓄力平稳周',
    week_start,
    week_end,
    metrics: {
      score_level: '中水',
      volatility_type: '平稳',
      extreme_diff: 0,
      has_trough: false,
      has_sanxing: false,
      has_kongwang: false,
      has_jieqi: false,
      jieqi_name: null,
    },
    dominant_energy: {
      alignment: '均衡',
      class: '均衡',
      top_shishen: '',
      fav_weighted_score: 0,
      unfav_weighted_score: 0,
    },
    event_forecast: buildEventForecast({ alignment: '均衡', class: '均衡' }, { has_sanxing: false, has_kongwang: false }),
    key_dates: {
      best_day: dailyRows[0],
      worst_day: dailyRows[0],
    },
    daily_score_points: dailyRows.map(row => ({ date: row.date, score: row.score })),
    profile_id: profile?.id || '',
    profile_name: profile?.name || '',
  };
}

function buildWeeklyFortunePayload(profile = {}, targetDate, options = {}) {
  if (!hasScoreFields(profile)) return buildFallbackWeeklyPayload(profile, targetDate);

  const scoreCalculator = options.calculateDailyScore || defaultCalculateDailyScore;
  const getShiShen = options.getShiShen || defaultGetShiShen;
  const { week_start, week_end } = getWeekRange(targetDate);
  const riGan = profile.ri_zhu.charAt(0);
  const dailyRows = [];
  let firstJieqiName = null;

  for (let index = 0; index < 7; index++) {
    const date = addDays(week_start, index);
    const [year, month, day] = date.split('-').map(Number);
    const lunar = Solar.fromYmd(year, month, day).getLunar();
    const eightChar = lunar.getEightChar();
    const dayGz = eightChar.getDay();
    const dayGan = dayGz.charAt(0);
    const dayZhi = dayGz.charAt(1);
    const dominantShishen = getShiShen(dayGan, riGan);
    const jieqi = lunar.getJieQi();
    if (jieqi && !firstJieqiName) firstJieqiName = jieqi;
    const scoreResult = scoreCalculator(profile, lunar) || {};
    dailyRows.push({
      date,
      score: Number(scoreResult.final_score ?? 70),
      is_kongwang: !!scoreResult.is_kongwang,
      has_sanxing: !!scoreResult.has_sanxing,
      dominant_shishen: dominantShishen,
      dominant_class: SHISHEN_TO_CLASS[dominantShishen] || '',
      day_gz: dayGz,
      day_zhi: dayZhi,
      jieqi: jieqi || null,
    });
  }

  const scores = dailyRows.map(row => row.score);
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  const avgScore = totalScore / scores.length;
  const extremeDiff = Math.max(...scores) - Math.min(...scores);
  const scoreLevel = classifyScoreLevel(avgScore);
  const volatilityType = classifyVolatility(extremeDiff);
  const trough = hasTrough(scores);
  const dominantEnergy = calculateDominantEnergy(dailyRows, profile);
  const metrics = {
    score_level: scoreLevel,
    volatility_type: volatilityType,
    extreme_diff: Math.round(extremeDiff * 100) / 100,
    has_trough: trough,
    has_sanxing: dailyRows.some(row => row.has_sanxing),
    has_kongwang: dailyRows.some(row => row.is_kongwang),
    has_jieqi: !!firstJieqiName,
    jieqi_name: firstJieqiName,
  };

  return {
    weekly_score: calculateWeeklyScore(avgScore, dominantEnergy, metrics),
    weekly_tag: buildWeeklyTag({
      scoreLevel,
      volatilityType,
      dominantEnergy,
      hasTrough: trough,
      hasJieqi: metrics.has_jieqi,
    }),
    week_start,
    week_end,
    metrics,
    dominant_energy: dominantEnergy,
    event_forecast: buildEventForecast(dominantEnergy, metrics),
    key_dates: {
      best_day: selectBestDay(dailyRows, profile),
      worst_day: selectWorstDay(dailyRows, profile),
    },
    daily_score_points: dailyRows.map(row => ({
      date: row.date,
      score: row.score,
      dominant_shishen: row.dominant_shishen,
      triggers: getTriggers(row, profile),
    })),
    profile_id: profile?.id || '',
    profile_name: profile?.name || '',
  };
}

module.exports = {
  WEEKLY_SCORE_CACHE_VERSION,
  buildFortunePeriodKey,
  buildWeeklyFortunePayload,
  classifyScoreLevel,
  classifyVolatility,
  getWeekRange,
  getWeeklyExpiry,
  getSecondsUntilWeeklyExpiry,
  hasScoreFields,
};
