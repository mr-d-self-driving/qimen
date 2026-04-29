/**
 * calculateMonthlyScore.js
 * ─────────────────────────────────────────────────────────────────────────────
 * 纯 Node.js 实现的八字月运算分引擎。
 * 不依赖任何大模型，所有分值由确定性逻辑推导。
 */

'use strict';

const { Solar } = require('lunar-javascript');
const {
  calculateDailyScore: defaultCalculateDailyScore,
  getShiShen: defaultGetShiShen,
} = require('./calculateDailyScore');

const GAN_LIST = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

const GAN_WUXING = {
  甲: '木', 乙: '木',
  丙: '火', 丁: '火',
  戊: '土', 己: '土',
  庚: '金', 辛: '金',
  壬: '水', 癸: '水',
};

const ZHI_WUXING = {
  子: '水', 丑: '土', 寅: '木', 卯: '木',
  辰: '土', 巳: '火', 午: '火', 未: '土',
  申: '金', 酉: '金', 戌: '土', 亥: '水',
};

const WUXING_SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const WUXING_KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

const ZHI_CHONG = {
  子: '午', 午: '子',
  丑: '未', 未: '丑',
  寅: '申', 申: '寅',
  卯: '酉', 酉: '卯',
  辰: '戌', 戌: '辰',
  巳: '亥', 亥: '巳',
};

const ZHI_LIUHE = {
  子: { partner: '丑', huaWuxing: '土' },
  丑: { partner: '子', huaWuxing: '土' },
  寅: { partner: '亥', huaWuxing: '木' },
  亥: { partner: '寅', huaWuxing: '木' },
  卯: { partner: '戌', huaWuxing: '火' },
  戌: { partner: '卯', huaWuxing: '火' },
  辰: { partner: '酉', huaWuxing: '金' },
  酉: { partner: '辰', huaWuxing: '金' },
  巳: { partner: '申', huaWuxing: '水' },
  申: { partner: '巳', huaWuxing: '水' },
  午: { partner: '未', huaWuxing: '土' },
  未: { partner: '午', huaWuxing: '土' },
};

const ZHI_SANHE_MAP = {
  申: { group: ['申', '子', '辰'], huaWuxing: '水' },
  子: { group: ['申', '子', '辰'], huaWuxing: '水' },
  辰: { group: ['申', '子', '辰'], huaWuxing: '水' },
  亥: { group: ['亥', '卯', '未'], huaWuxing: '木' },
  卯: { group: ['亥', '卯', '未'], huaWuxing: '木' },
  未: { group: ['亥', '卯', '未'], huaWuxing: '木' },
  寅: { group: ['寅', '午', '戌'], huaWuxing: '火' },
  午: { group: ['寅', '午', '戌'], huaWuxing: '火' },
  戌: { group: ['寅', '午', '戌'], huaWuxing: '火' },
  巳: { group: ['巳', '酉', '丑'], huaWuxing: '金' },
  酉: { group: ['巳', '酉', '丑'], huaWuxing: '金' },
  丑: { group: ['巳', '酉', '丑'], huaWuxing: '金' },
};

const ZHI_LIUHAI = {
  子: '未', 未: '子',
  丑: '午', 午: '丑',
  寅: '巳', 巳: '寅',
  卯: '辰', 辰: '卯',
  申: '亥', 亥: '申',
  酉: '戌', 戌: '酉',
};

const SAN_XING_GROUPS = [
  new Set(['寅', '巳', '申']),
  new Set(['丑', '戌', '未']),
];

const SHISHEN_ALIASES = {
  印星: ['正印', '偏印'],
  比劫: ['比肩', '劫财'],
  官杀: ['正官', '七杀'],
  食伤: ['食神', '伤官'],
  财星: ['正财', '偏财'],
};

function ganYinYang(gan) {
  return GAN_LIST.indexOf(gan) % 2 === 0 ? '阳' : '阴';
}

function normalizeList(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return String(val).split(/[、,，\s]+/).map(s => s.trim()).filter(Boolean);
}

function listIncludesShiShen(list, shiShen) {
  return list.some(item => item === shiShen || (SHISHEN_ALIASES[item] || []).includes(shiShen));
}

function wuxingToShiShenList(wuxing, riGan) {
  const riWuxing = GAN_WUXING[riGan];

  if (wuxing === riWuxing) return ['比肩', '劫财'];
  if (WUXING_SHENG[wuxing] === riWuxing) return ['偏印', '正印'];
  if (WUXING_SHENG[riWuxing] === wuxing) return ['食神', '伤官'];
  if (WUXING_KE[wuxing] === riWuxing) return ['七杀', '正官'];
  if (WUXING_KE[riWuxing] === wuxing) return ['偏财', '正财'];

  return [];
}

function calcHeHuaScore(shiShenList, favorable, unfavorable) {
  const hasFav = shiShenList.some(s => listIncludesShiShen(favorable, s));
  const hasUnfav = shiShenList.some(s => listIncludesShiShen(unfavorable, s));

  if (hasFav) return 5;
  if (hasUnfav) return -5;
  return 1;
}

function isKongWang(liuZhi, kongWang) {
  if (!kongWang || kongWang.length < 2) return false;
  return kongWang.includes(liuZhi);
}

function hasSanXing(liuZhi, yuanZhis) {
  const allZhis = new Set([liuZhi, ...yuanZhis.filter(Boolean)]);

  for (const group of SAN_XING_GROUPS) {
    if ([...group].every(z => allZhis.has(z))) return true;
  }

  if (allZhis.has('子') && allZhis.has('卯')) return true;

  return false;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toIsoDate(year, month, day) {
  return [
    year,
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-');
}

function getRelationType(shiShenList, favorable, unfavorable) {
  if (shiShenList.some(s => listIncludesShiShen(favorable, s))) return '喜用';
  if (shiShenList.some(s => listIncludesShiShen(unfavorable, s))) return '忌仇';
  return '闲';
}

function getWuxingRelation(monthWuxing, riGan, favorable, unfavorable) {
  return getRelationType(wuxingToShiShenList(monthWuxing, riGan), favorable, unfavorable);
}

function getTroughPeriod(scoredDays, month) {
  let runStart = -1;

  for (let i = 0; i < scoredDays.length; i++) {
    if (scoredDays[i].score <= 60) {
      if (runStart === -1) runStart = i;
      if (i - runStart + 1 >= 3) {
        let runEnd = i;
        while (runEnd + 1 < scoredDays.length && scoredDays[runEnd + 1].score <= 60) {
          runEnd++;
        }
        return {
          has_trough: true,
          trough_period: `${month}月${scoredDays[runStart].day}日–${month}月${scoredDays[runEnd].day}日`,
        };
      }
    } else {
      runStart = -1;
    }
  }

  return { has_trough: false, trough_period: '' };
}

function buildLayer1(profile, monthGan, monthZhi, getShiShen) {
  const riGan = profile.ri_zhu.charAt(0);
  const favorable = normalizeList(profile.favorable_elements);
  const unfavorable = normalizeList(profile.unfavorable_elements);
  const yuanRiZhi = profile.day_zhi || '';
  const yuanYueZhi = profile.month_zhi || '';
  const yuanNianZhi = profile.year_zhi || '';
  const yuanZhis = [yuanRiZhi, yuanYueZhi, yuanNianZhi].filter(Boolean);
  const relationParts = [];

  if (hasSanXing(monthZhi, yuanZhis)) {
    return {
      layer1_raw: clamp(-15, 0, 40),
      has_sanxing: true,
      month_gan_shishen: getShiShen(monthGan, riGan),
      month_zhi_relations: `流月地支[${monthZhi}]与命主原局构成三刑`,
    };
  }

  const deltas = [];
  const monthGanShiShen = getShiShen(monthGan, riGan);
  if (listIncludesShiShen(favorable, monthGanShiShen)) {
    deltas.push({ type: 'gan', delta: 10 });
  } else if (listIncludesShiShen(unfavorable, monthGanShiShen)) {
    deltas.push({ type: 'gan', delta: -10 });
  }

  const chongTargets = [
    { zhi: yuanRiZhi, label: '日支', delta: -8 },
    { zhi: yuanYueZhi, label: '月支', delta: -6 },
    { zhi: yuanNianZhi, label: '年支', delta: -4 },
  ];

  for (const target of chongTargets) {
    if (target.zhi && ZHI_CHONG[monthZhi] === target.zhi) {
      deltas.push({ type: 'chong', delta: target.delta, target });
      relationParts.push(`与命主${target.label}[${target.zhi}]六冲`);
    }
  }

  let hasHe = false;
  const liuHeInfo = ZHI_LIUHE[monthZhi];
  if (liuHeInfo && yuanZhis.includes(liuHeInfo.partner)) {
    hasHe = true;
    const shiShenList = wuxingToShiShenList(liuHeInfo.huaWuxing, riGan);
    const relation = getRelationType(shiShenList, favorable, unfavorable);
    deltas.push({ type: 'he', delta: calcHeHuaScore(shiShenList, favorable, unfavorable) });
    relationParts.push(`与命主地支[${liuHeInfo.partner}]六合化${liuHeInfo.huaWuxing}（${relation}）`);
  }

  const sanHeInfo = ZHI_SANHE_MAP[monthZhi];
  if (sanHeInfo) {
    const partners = sanHeInfo.group.filter(z => z !== monthZhi && yuanZhis.includes(z));
    if (partners.length > 0) {
      hasHe = true;
      const shiShenList = wuxingToShiShenList(sanHeInfo.huaWuxing, riGan);
      const relation = getRelationType(shiShenList, favorable, unfavorable);
      deltas.push({ type: 'he', delta: calcHeHuaScore(shiShenList, favorable, unfavorable) });
      relationParts.push(`与命主地支[${partners.join('、')}]构成${sanHeInfo.group.join('')}三合${sanHeInfo.huaWuxing}局（${relation}）`);
    }
  }

  if (ZHI_LIUHAI[monthZhi] === yuanRiZhi) {
    deltas.push({ type: 'liuhai', delta: -4 });
    relationParts.push(`与命主日支[${yuanRiZhi}]六害`);
  }

  if (yuanNianZhi && ZHI_LIUHAI[monthZhi] === yuanNianZhi) {
    deltas.push({ type: 'liuhai', delta: -4 });
    relationParts.push(`与命主年支[${yuanNianZhi}]六害`);
  }

  const hasChong = deltas.some(item => item.type === 'chong');
  if (hasHe && hasChong) {
    for (const item of deltas) {
      if (item.type === 'chong') item.delta = Math.round(item.delta * 0.5);
    }
    for (let i = 0; i < relationParts.length; i++) {
      if (relationParts[i].includes('六冲')) {
        relationParts[i] += '（贪合忘冲已抵消50%）';
      }
    }
  }

  const raw = 20 + deltas.reduce((sum, item) => sum + item.delta, 0);

  return {
    layer1_raw: clamp(raw, 0, 40),
    has_sanxing: false,
    month_gan_shishen: monthGanShiShen,
    month_zhi_relations: relationParts.length > 0
      ? relationParts.map((part, index) => index === 0 ? `流月地支[${monthZhi}]${part}` : part).join('；')
      : '无明显刑冲合害',
  };
}

function calculateMonthlyScore(
  profile,
  year,
  month,
  calculateDailyScore = defaultCalculateDailyScore,
  getShiShen = defaultGetShiShen
) {
  const firstLunarDay = Solar.fromYmd(year, month, 1).getLunar();
  const firstEightChar = firstLunarDay.getEightChar();
  const monthGz = firstEightChar.getMonth();
  const monthGan = monthGz.charAt(0);
  const monthZhi = monthGz.charAt(1);
  const riGan = profile.ri_zhu.charAt(0);
  const favorable = normalizeList(profile.favorable_elements);
  const unfavorable = normalizeList(profile.unfavorable_elements);

  const daysInMonth = new Date(year, month, 0).getDate();
  const dayRows = [];
  const jieqiDays = [];
  const jieqi_list = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const lunar = Solar.fromYmd(year, month, day).getLunar();
    const jieqi = lunar.getJieQi();
    if (jieqi) {
      jieqiDays.push(day);
      jieqi_list.push(`${jieqi}[${month}月${day}日]`);
    }
    dayRows.push({ day, lunar });
  }

  const scoredDays = dayRows.map(({ day, lunar }) => {
    const dailyResult = calculateDailyScore(profile, lunar) || {};
    const baseScore = Number(dailyResult.final_score) || 0;
    const nearJieqi = jieqiDays.some(jieqiDay => Math.abs(day - jieqiDay) <= 3);
    const score = nearJieqi ? Math.floor(baseScore * 0.8) : baseScore;

    return {
      day,
      date: toIsoDate(year, month, day),
      score,
    };
  });

  const scoreSum = scoredDays.reduce((sum, item) => sum + item.score, 0);
  const avgDailyScore = scoreSum / scoredDays.length;
  const highScoreDates = scoredDays.filter(item => item.score >= 80).map(item => item.date);
  const lowScoreDates = scoredDays.filter(item => item.score <= 55).map(item => item.date);
  const bestDay = scoredDays.reduce((best, item) => item.score > best.score ? item : best, scoredDays[0]);
  const worstDay = scoredDays.reduce((worst, item) => item.score < worst.score ? item : worst, scoredDays[0]);
  const trough = getTroughPeriod(scoredDays, month);
  const highRatio = highScoreDates.length / scoredDays.length;
  const lowCount = lowScoreDates.length;
  const raw2 = (avgDailyScore - 70)
    + (highRatio > 0.6 ? 10 : highRatio > 0.4 ? 5 : 0)
    - (lowCount >= 5 ? 8 : 0)
    - (trough.has_trough ? 5 : 0);
  const layer2Raw = clamp(20 + raw2, 0, 40);

  const layer1 = buildLayer1(profile, monthGan, monthZhi, getShiShen);

  const monthWuxing = ZHI_WUXING[monthZhi] || '';
  const monthWuxingRelation = getWuxingRelation(monthWuxing, riGan, favorable, unfavorable);
  let raw3 = 10;
  if (monthWuxingRelation === '喜用') raw3 += 8;
  if (monthWuxingRelation === '忌仇') raw3 -= 8;
  if (jieqiDays.length === 0) raw3 += 5;
  if (jieqiDays.length === 2) raw3 -= 3;
  const layer3Raw = clamp(raw3, 0, 20);

  const yearGz = firstEightChar.getYear();
  const nianZhi = yearGz.charAt(1);
  const yueZhi = monthGz.charAt(1);
  const kongWangStr = firstLunarDay.getDayXunKong();
  const kongWangZhi = profile.month_zhi || monthZhi;
  const isKongWangFlag = isKongWang(kongWangZhi, kongWangStr)
    && kongWangZhi !== nianZhi
    && kongWangZhi !== yueZhi;

  const weightedSum = layer1.layer1_raw + layer2Raw + layer3Raw;
  let rawTotal = 70 + (weightedSum - 70);

  if (isKongWangFlag) rawTotal = Math.min(rawTotal, 85);

  return {
    monthly_score: clamp(Math.round(rawTotal), 45, 98),
    layer1_raw: layer1.layer1_raw,
    layer2_raw: layer2Raw,
    layer3_raw: layer3Raw,
    is_kongwang: isKongWangFlag,
    has_sanxing: layer1.has_sanxing,
    avg_daily_score: Math.round(avgDailyScore * 100) / 100,
    high_score_days: highScoreDates.length,
    high_score_dates: highScoreDates,
    low_score_days: lowScoreDates.length,
    low_score_dates: lowScoreDates,
    best_date: bestDay.date,
    best_score: bestDay.score,
    worst_date: worstDay.date,
    worst_score: worstDay.score,
    has_trough: trough.has_trough,
    trough_period: trough.trough_period,
    month_gz: monthGz,
    month_gan_shishen: layer1.month_gan_shishen,
    month_zhi_relations: layer1.month_zhi_relations,
    month_wuxing: monthWuxing,
    month_wuxing_relation: monthWuxingRelation,
    jieqi_list,
  };
}

module.exports = { calculateMonthlyScore };
