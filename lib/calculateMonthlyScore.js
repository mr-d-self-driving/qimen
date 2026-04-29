/**
 * calculateMonthlyScore.js
 * ─────────────────────────────────────────────────────────────────────────────
 * 纯 Node.js 实现的八字月运算分引擎。
 * 不依赖任何大模型，所有分值由确定性逻辑推导。
 */

'use strict';

const { Solar } = require('lunar-javascript');
const {
  calculateDailyScore: _defaultCalcDaily,
  getShiShen: _defaultGetShiShen,
} = require('./calculateDailyScore');

const GAN_LIST = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI_LIST = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

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

const GAN_WUHE = {
  甲: { partner: '己', huaWuxing: '土' },
  己: { partner: '甲', huaWuxing: '土' },
  乙: { partner: '庚', huaWuxing: '金' },
  庚: { partner: '乙', huaWuxing: '金' },
  丙: { partner: '辛', huaWuxing: '水' },
  辛: { partner: '丙', huaWuxing: '水' },
  丁: { partner: '壬', huaWuxing: '木' },
  壬: { partner: '丁', huaWuxing: '木' },
  戊: { partner: '癸', huaWuxing: '火' },
  癸: { partner: '戊', huaWuxing: '火' },
};

const YUEDE_MAP = {
  寅: '丙', 午: '丙', 戌: '丙',
  申: '壬', 子: '壬', 辰: '壬',
  巳: '庚', 酉: '庚', 丑: '庚',
  亥: '甲', 卯: '甲', 未: '甲',
};

const TIANYI_MAP = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  壬: ['卯', '巳'], 癸: ['卯', '巳'],
  辛: ['午', '寅'],
};

const LU_MAP = {
  甲: '寅', 乙: '卯',
  丙: '巳', 戊: '巳',
  丁: '午', 己: '午',
  庚: '申', 辛: '酉',
  壬: '亥', 癸: '子',
};

const WENCHANG_MAP = {
  甲: '巳', 乙: '午',
  丙: '申', 戊: '申',
  丁: '酉', 己: '酉',
  庚: '亥', 辛: '子',
  壬: '寅', 癸: '卯',
};

const YIMA_MAP = {
  申: '寅', 子: '寅', 辰: '寅',
  寅: '申', 午: '申', 戌: '申',
  巳: '亥', 酉: '亥', 丑: '亥',
  亥: '巳', 卯: '巳', 未: '巳',
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

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value).split(/[、,，\s]+/).map(s => s.trim()).filter(Boolean);
}

function listIncludesShiShen(list, shiShen) {
  return list.some(item => item === shiShen || (SHISHEN_ALIASES[item] || []).includes(shiShen));
}

function listIntersectsShiShen(list, shiShenList) {
  return shiShenList.some(shiShen => listIncludesShiShen(list, shiShen));
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

function calcMonthlyHeHuaScore(shiShenList, favorable, unfavorable) {
  if (listIntersectsShiShen(favorable, shiShenList)) return 8;
  if (listIntersectsShiShen(unfavorable, shiShenList)) return -8;
  return 1;
}

function isKongWang(liuZhi, kongWang) {
  if (!kongWang || kongWang.length < 2) return false;
  return kongWang.includes(liuZhi);
}

function hasSanXing(liuZhi, yuanZhis) {
  const allZhis = new Set([liuZhi, ...yuanZhis.filter(Boolean)]);

  for (const group of SAN_XING_GROUPS) {
    if ([...group].every(zhi => allZhis.has(zhi))) return true;
  }

  return allZhis.has('子') && allZhis.has('卯');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scaleLayerScore(value, multiplier, min, max) {
  return clamp(Math.round(value * multiplier), min, max);
}

function toIsoDate(year, month, day) {
  return [
    year,
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-');
}

function formatMonthDay(isoDate) {
  return `${parseInt(isoDate.slice(5, 7), 10)}月${parseInt(isoDate.slice(8, 10), 10)}日`;
}

function relationType(shiShenList, favorable, unfavorable) {
  if (listIntersectsShiShen(favorable, shiShenList)) return '喜用';
  if (listIntersectsShiShen(unfavorable, shiShenList)) return '忌仇';
  return '闲';
}

function getZhiUseType(zhi, riGan, favorable, unfavorable) {
  return relationType(wuxingToShiShenList(ZHI_WUXING[zhi], riGan), favorable, unfavorable);
}

function getChongEffect({ monthZhi, targetZhi, basePenalty, riGan, favorable, unfavorable }) {
  const targetUseType = getZhiUseType(targetZhi, riGan, favorable, unfavorable);
  const monthWuxing = ZHI_WUXING[monthZhi];
  const targetWuxing = ZHI_WUXING[targetZhi];
  const controlsTarget = WUXING_KE[monthWuxing] === targetWuxing;
  const halfPenalty = Math.ceil(basePenalty * 0.5);

  if (targetUseType === '喜用') {
    return {
      delta: Math.floor(basePenalty * 1.25),
      note: '冲喜用，加重',
    };
  }

  if (targetUseType === '忌仇') {
    return {
      delta: controlsTarget ? Math.ceil(Math.abs(basePenalty) * 0.5) : halfPenalty,
      note: controlsTarget ? '制忌，转为小吉' : '冲忌仇，冲罚减半',
    };
  }

  return {
    delta: halfPenalty,
    note: '冲闲神，冲罚减半',
  };
}

function getHaiEffect({ targetZhi, basePenalty, riGan, favorable, unfavorable }) {
  const targetUseType = getZhiUseType(targetZhi, riGan, favorable, unfavorable);

  if (targetUseType === '喜用') {
    return {
      delta: basePenalty,
      note: '害喜用',
    };
  }

  if (targetUseType === '忌仇') {
    return {
      delta: 0,
      note: '害忌仇，扣分免除',
    };
  }

  return {
    delta: Math.ceil(basePenalty * 0.5),
    note: '害闲神，扣分减半',
  };
}

function getSanXingRaw({ monthZhi, relationTargets, riGan, favorable, unfavorable }) {
  const involvedTargets = relationTargets.filter(target => target.zhi && (
    SAN_XING_GROUPS.some(group => group.has(monthZhi) && group.has(target.zhi))
    || (['子', '卯'].includes(monthZhi) && ['子', '卯'].includes(target.zhi))
  ));
  const involvedTypes = involvedTargets.map(target => getZhiUseType(target.zhi, riGan, favorable, unfavorable));
  const onlyMovesUnfavorable = involvedTypes.length > 0
    && involvedTypes.every(type => type === '忌仇');
  const hasDynamicTarget = involvedTargets.some(target => target.source === 'liunian' || target.source === 'dayun');

  return {
    raw: onlyMovesUnfavorable ? (hasDynamicTarget ? -8 : -12) : (hasDynamicTarget ? -16 : -20),
    note: onlyMovesUnfavorable ? '牵动忌神，熔断减轻' : (hasDynamicTarget ? '岁运参与，引动三刑' : '已熔断'),
  };
}

function getZhiLabel(zhi, yuanDayZhi, yuanMonZhi, yuanYearZhi) {
  if (zhi === yuanDayZhi) return '日';
  if (zhi === yuanMonZhi) return '月';
  if (zhi === yuanYearZhi) return '年';
  return '原局';
}

function getTrough(scoredDays) {
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
          trough_period: `${formatMonthDay(scoredDays[runStart].date)}–${formatMonthDay(scoredDays[runEnd].date)}`,
        };
      }
    } else {
      runStart = -1;
    }
  }

  return { has_trough: false, trough_period: '' };
}

function buildRelationTargets({
  yuanDayZhi,
  yuanMonZhi,
  yuanYearZhi,
  liunianZhi,
  dayunZhi,
}) {
  return [
    { source: 'day', zhi: yuanDayZhi, label: '命主日支', chongBase: -8, haiBase: -4, weight: 1 },
    { source: 'month', zhi: yuanMonZhi, label: '命主月支', chongBase: -6, haiBase: -3, weight: 0.75 },
    { source: 'liunian', zhi: liunianZhi, label: '流年支', chongBase: -6, haiBase: -3, weight: 0.7 },
    { source: 'dayun', zhi: dayunZhi, label: '大运支', chongBase: -5, haiBase: -3, weight: 0.65 },
    { source: 'year', zhi: yuanYearZhi, label: '命主年支', chongBase: -4, haiBase: -2, weight: 0.5 },
  ].filter(target => target.zhi);
}

function getHeHuaWuxing(zhiA, zhiB) {
  const liuhe = ZHI_LIUHE[zhiA];
  if (liuhe?.partner === zhiB) return liuhe.huaWuxing;

  const sanhe = ZHI_SANHE_MAP[zhiA];
  if (sanhe?.group.includes(zhiB)) return sanhe.huaWuxing;

  return '';
}

function calculateTransitSupport({
  riGan,
  monthZhi,
  monthWuxingRelation,
  favorable,
  unfavorable,
  dayunZhi,
  liunianZhi,
  shishenSignals,
}) {
  let support = 0;
  const transitZhis = [dayunZhi, liunianZhi].filter(Boolean);
  const monthWuxing = ZHI_WUXING[monthZhi];

  for (const transitZhi of transitZhis) {
    const transitWuxing = ZHI_WUXING[transitZhi];
    const heWuxing = getHeHuaWuxing(monthZhi, transitZhi);

    if (monthWuxingRelation === '喜用') {
      if (transitWuxing === monthWuxing || WUXING_SHENG[transitWuxing] === monthWuxing) support += 1;
      if (heWuxing && relationType(wuxingToShiShenList(heWuxing, riGan), favorable, unfavorable) === '喜用') support += 2;
    } else if (monthWuxingRelation === '忌仇') {
      if (transitWuxing === monthWuxing || WUXING_SHENG[transitWuxing] === monthWuxing) support -= 1;
      if (heWuxing && relationType(wuxingToShiShenList(heWuxing, riGan), favorable, unfavorable) === '忌仇') support -= 2;
    } else if (heWuxing) {
      const heType = relationType(wuxingToShiShenList(heWuxing, riGan), favorable, unfavorable);
      if (heType === '喜用') support += 1;
      else if (heType === '忌仇') support -= 1;
    }

    const breaksMonthZhi = ZHI_CHONG[transitZhi] === monthZhi || ZHI_LIUHAI[transitZhi] === monthZhi;
    const supportsMonthZhi = heWuxing && relationType(wuxingToShiShenList(heWuxing, riGan), favorable, unfavorable) === '喜用';
    const hasGoodShensha = shishenSignals.tianyi_active || shishenSignals.wenchang_active || shishenSignals.lu_active;

    if (hasGoodShensha && supportsMonthZhi) support += 1;
    if (hasGoodShensha && breaksMonthZhi) support -= 1;

    if (shishenSignals.yima_active) {
      if (breaksMonthZhi) support -= shishenSignals.yima_favorable ? 1 : 2;
      else if (shishenSignals.yima_favorable && supportsMonthZhi) support += 2;
    }
  }

  return clamp(support, -4, 4);
}

function calculateLayer1({
  riGan,
  monthGan,
  monthZhi,
  favorable,
  unfavorable,
  yuanDayZhi,
  yuanMonZhi,
  yuanYearZhi,
  yuanZhisArr,
  dayunZhi,
  liunianZhi,
  getShiShenFn,
}) {
  let raw1 = 0;
  let has_sanxing = false;
  let yuede_active = false;
  const relationParts = [];
  const relationTargets = buildRelationTargets({
    yuanDayZhi,
    yuanMonZhi,
    yuanYearZhi,
    dayunZhi,
    liunianZhi,
  });

  const monthGanShiShen = getShiShenFn(monthGan, riGan);
  if (listIncludesShiShen(favorable, monthGanShiShen)) raw1 += 10;
  else if (listIncludesShiShen(unfavorable, monthGanShiShen)) raw1 -= 10;

  const wuheInfo = GAN_WUHE[monthGan];
  if (wuheInfo && wuheInfo.partner === riGan) {
    const huaShiShenList = wuxingToShiShenList(wuheInfo.huaWuxing, riGan);
    if (listIntersectsShiShen(favorable, huaShiShenList)) raw1 += 12;
    else if (listIntersectsShiShen(unfavorable, huaShiShenList)) raw1 -= 6;
    relationParts.push(`流月天干[${monthGan}]与命主日干[${riGan}]天干五合化${wuheInfo.huaWuxing}`);
  }

  const liuHeInfo = ZHI_LIUHE[monthZhi];
  const liuHeTarget = liuHeInfo
    ? relationTargets.find(target => target.zhi === liuHeInfo.partner)
    : null;
  const hasHe6 = !!liuHeTarget;
  const sanHeInfo = ZHI_SANHE_MAP[monthZhi];
  const sanHePartners = sanHeInfo
    ? relationTargets.filter(target => target.zhi !== monthZhi && sanHeInfo.group.includes(target.zhi))
    : [];
  const hasHe3 = sanHePartners.length > 0;
  const hasAnyHe = hasHe6 || hasHe3;

  if (hasHe6) {
    const heShiShenList = wuxingToShiShenList(liuHeInfo.huaWuxing, riGan);
    const type = relationType(heShiShenList, favorable, unfavorable);
    raw1 += Math.round(calcMonthlyHeHuaScore(heShiShenList, favorable, unfavorable) * liuHeTarget.weight);
    relationParts.push(`流月地支[${monthZhi}]与${liuHeTarget.label}[${liuHeInfo.partner}]六合化${liuHeInfo.huaWuxing}（${type}）`);
  }

  if (hasHe3) {
    const sanHeShiShenList = wuxingToShiShenList(sanHeInfo.huaWuxing, riGan);
    const type = relationType(sanHeShiShenList, favorable, unfavorable);
    const sanHeWeight = Math.max(...sanHePartners.map(target => target.weight));
    raw1 += Math.round(calcMonthlyHeHuaScore(sanHeShiShenList, favorable, unfavorable) * sanHeWeight);
    relationParts.push(`流月地支[${monthZhi}]会同${sanHePartners.map(target => `${target.label}[${target.zhi}]`).join('、')}构成${sanHeInfo.group.join('')}三合${sanHeInfo.huaWuxing}局（${type}）`);
  }

  const chongEffects = relationTargets
    .filter(target => ZHI_CHONG[monthZhi] === target.zhi)
    .map(target => {
      const effect = getChongEffect({ monthZhi, targetZhi: target.zhi, basePenalty: target.chongBase, riGan, favorable, unfavorable });
      const delta = hasAnyHe && effect.delta < 0 ? Math.ceil(effect.delta * 0.5) : effect.delta;
      return { ...target, ...effect, delta };
    });

  for (const effect of chongEffects) {
    raw1 += effect.delta;
    relationParts.push(`流月地支[${monthZhi}]与${effect.label}[${effect.zhi}]六冲（${effect.note}${hasAnyHe && effect.delta < 0 ? '；已贪合忘冲，冲罚再减半' : ''}）`);
  }

  const haiEffects = relationTargets
    .filter(target => ZHI_LIUHAI[monthZhi] === target.zhi)
    .map(target => {
      const effect = getHaiEffect({ targetZhi: target.zhi, basePenalty: target.haiBase, riGan, favorable, unfavorable });
      const delta = hasAnyHe && effect.delta < 0 ? Math.ceil(effect.delta * 0.5) : effect.delta;
      return { ...target, ...effect, delta };
    });

  for (const effect of haiEffects) {
    raw1 += effect.delta;
    relationParts.push(`流月地支[${monthZhi}]与${effect.label}[${effect.zhi}]六害（${effect.note}${hasAnyHe && effect.delta < 0 ? '；有合减半' : ''}）`);
  }

  const yuedeStem = YUEDE_MAP[monthZhi];
  if (yuedeStem && yuedeStem === monthGan) {
    raw1 += 10;
    yuede_active = true;

    const chongParts = [
      ...chongEffects.map(effect => ({ key: effect.source, val: effect.delta })),
    ].filter(part => part.val < 0);

    if (chongParts.length > 0) {
      chongParts.sort((a, b) => Math.abs(a.val) - Math.abs(b.val));
      raw1 -= chongParts[0].val;
      relationParts.push(`月德贵人得令（${monthGan}），已抵消最轻一项冲罚`);
    } else {
      relationParts.push(`月德贵人得令（${monthGan}）`);
    }
  }

  if (hasSanXing(monthZhi, relationTargets.map(target => target.zhi))) {
    const sanXing = getSanXingRaw({ monthZhi, relationTargets, riGan, favorable, unfavorable });
    raw1 = sanXing.raw;
    has_sanxing = true;
    relationParts.unshift(`流月地支[${monthZhi}]与命主原局构成三刑（${sanXing.note}）`);
  }

  const month_relations = relationParts.length > 0 ? relationParts.join('；') : '无明显刑冲合害';

  return {
    layer1_score: scaleLayerScore(raw1, 1.5, -30, 30),
    has_sanxing,
    yuede_active,
    month_gan_shishen: monthGanShiShen,
    month_relations,
  };
}

function calculateLayer2(profile, year, month, calcDaily) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const jieqiDates = [];
  const jieqi_list = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const lunar = Solar.fromYmd(year, month, day).getLunar();
    const jieqi = lunar.getJieQi();
    if (jieqi) {
      jieqiDates.push(day);
      jieqi_list.push(`${jieqi}[${month}月${day}日]`);
    }
  }

  const dailyPoints = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const lunar = Solar.fromYmd(year, month, day).getLunar();
    const result = calcDaily(profile, lunar) || {};
    let score = Number(result.final_score) || 0;
    if (jieqiDates.some(jieqiDay => Math.abs(day - jieqiDay) <= 3)) {
      score = Math.floor(score * 0.8);
    }
    dailyPoints.push({ date: toIsoDate(year, month, day), score });
  }

  const scores = dailyPoints.map(point => point.score);
  const meanScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const highItems = dailyPoints.filter(point => point.score >= 80);
  const lowItems = dailyPoints.filter(point => point.score <= 55);
  const bestItem = dailyPoints.reduce((best, item) => item.score > best.score ? item : best);
  const worstItem = dailyPoints.reduce((worst, item) => item.score < worst.score ? item : worst);
  const trough = getTrough(dailyPoints);
  const highRatio = highItems.length / daysInMonth;
  const raw2 = (meanScore - 70) * 0.4
    + (highRatio > 0.6 ? 8 : highRatio > 0.4 ? 4 : 0)
    - (lowItems.length >= 5 ? 6 : 0)
    - (trough.has_trough ? 5 : 0);

  return {
    layer2_score: scaleLayerScore(raw2, 0.25, -5, 5),
    avg_daily_score: Math.round(meanScore * 100) / 100,
    high_score_days: highItems.length,
    high_score_dates: highItems.map(item => item.date),
    low_score_days: lowItems.length,
    low_score_dates: lowItems.map(item => item.date),
    best_date: bestItem.date,
    best_score: bestItem.score,
    worst_date: worstItem.date,
    worst_score: worstItem.score,
    has_trough: trough.has_trough,
    trough_period: trough.trough_period,
    daily_score_points: dailyPoints,
    jieqiDates,
    jieqi_list,
  };
}

function calculateLayer3({
  riGan,
  monthGan,
  monthZhi,
  favorable,
  unfavorable,
  yuanDayZhi,
  yuanYearZhi,
  yuanZhisArr,
  jieqiCount,
  dayunZhi,
  liunianZhi,
}) {
  let raw3 = 0;
  const shishen_signals = {
    tianyi_active: false,
    wenchang_active: false,
    lu_active: false,
    yima_active: false,
    yima_favorable: false,
  };

  const monthWuxing = ZHI_WUXING[monthZhi] || '';
  const riWuxing = GAN_WUXING[riGan] || '';
  const monthWuxingShiShenList = wuxingToShiShenList(monthWuxing, riGan);
  const monthWuxingIsFav = listIntersectsShiShen(favorable, monthWuxingShiShenList);
  const monthWuxingIsUnfav = listIntersectsShiShen(unfavorable, monthWuxingShiShenList);

  if (WUXING_SHENG[monthWuxing] === riWuxing) raw3 += monthWuxingIsFav ? 7 : monthWuxingIsUnfav ? -3 : 0;
  else if (monthWuxing === riWuxing) raw3 += monthWuxingIsFav ? 5 : monthWuxingIsUnfav ? -3 : 0;
  else if (WUXING_SHENG[riWuxing] === monthWuxing) raw3 += monthWuxingIsFav ? 3 : monthWuxingIsUnfav ? -5 : 0;
  else if (WUXING_KE[monthWuxing] === riWuxing) raw3 += monthWuxingIsFav ? 5 : monthWuxingIsUnfav ? -7 : 0;
  else if (WUXING_KE[riWuxing] === monthWuxing) raw3 += monthWuxingIsFav ? 3 : monthWuxingIsUnfav ? -5 : 0;

  const tianyiZhis = TIANYI_MAP[riGan] || [];
  if (tianyiZhis.includes(monthZhi)) {
    raw3 += 10;
    shishen_signals.tianyi_active = true;
  }

  if (WENCHANG_MAP[riGan] === monthZhi) {
    raw3 += 8;
    shishen_signals.wenchang_active = true;
  }

  const luZhi = LU_MAP[monthGan];
  if (luZhi && yuanZhisArr.includes(luZhi)) {
    raw3 += 6;
    shishen_signals.lu_active = true;
  }

  const yimaZhi = YIMA_MAP[yuanYearZhi] || YIMA_MAP[yuanDayZhi];
  if (yimaZhi && monthZhi === yimaZhi) {
    shishen_signals.yima_active = true;
    const yimaShiShenList = wuxingToShiShenList(ZHI_WUXING[yimaZhi], riGan);
    if (listIntersectsShiShen(favorable, yimaShiShenList)) {
      raw3 += 5;
      shishen_signals.yima_favorable = true;
    } else if (listIntersectsShiShen(unfavorable, yimaShiShenList)) {
      raw3 -= 2;
    } else {
      raw3 += 2;
      shishen_signals.yima_favorable = true;
    }
  }

  if (jieqiCount === 0) raw3 += 3;
  else if (jieqiCount >= 2) raw3 -= 2;

  const month_wuxing_relation = monthWuxingIsFav ? '喜用' : monthWuxingIsUnfav ? '忌仇' : '闲';
  const transit_support_score = calculateTransitSupport({
    riGan,
    monthZhi,
    monthWuxingRelation: month_wuxing_relation,
    favorable,
    unfavorable,
    dayunZhi,
    liunianZhi,
    shishenSignals: shishen_signals,
  });
  raw3 += transit_support_score;

  return {
    layer3_score: scaleLayerScore(raw3, 1.5, -15, 15),
    month_wuxing: monthWuxing,
    month_wuxing_relation,
    transit_support_score,
    shishen_signals,
  };
}

function calculateMonthlyScore(
  profile,
  year,
  month,
  calcDaily = _defaultCalcDaily,
  getShiShenFn = _defaultGetShiShen
) {
  const riGan = profile.ri_zhu.charAt(0);
  const favorable = normalizeList(profile.favorable_elements);
  const unfavorable = normalizeList(profile.unfavorable_elements);
  const yuanDayZhi = profile.day_zhi || '';
  const yuanMonZhi = profile.month_zhi || '';
  const yuanYearZhi = profile.year_zhi || '';
  const dayun_gz = profile.dayun_gz || profile.current_dayun_gz || '';
  const liunian_gz = profile.liunian_gz || profile.current_liunian_gz || '';
  const dayunZhi = dayun_gz.charAt(1);
  const liunianZhi = liunian_gz.charAt(1);
  const yuanZhisArr = [yuanDayZhi, yuanMonZhi, yuanYearZhi].filter(Boolean);

  const lunar1 = Solar.fromYmd(year, month, 1).getLunar();
  const ec1 = lunar1.getEightChar();
  const month_gz = ec1.getMonth();
  const monthGan = month_gz.charAt(0);
  const monthZhi = month_gz.charAt(1);

  const layer1 = calculateLayer1({
    riGan,
    monthGan,
    monthZhi,
    favorable,
    unfavorable,
    yuanDayZhi,
    yuanMonZhi,
    yuanYearZhi,
    yuanZhisArr,
    dayunZhi,
    liunianZhi,
    getShiShenFn,
  });

  const layer2 = calculateLayer2(profile, year, month, calcDaily);
  const layer3 = calculateLayer3({
    riGan,
    monthGan,
    monthZhi,
    favorable,
    unfavorable,
    yuanDayZhi,
    yuanYearZhi,
    yuanZhisArr,
    jieqiCount: layer2.jieqiDates.length,
    dayunZhi,
    liunianZhi,
  });

  const kongWangStr = lunar1.getDayXunKong();
  const nianZhi1 = ec1.getYear().charAt(1);
  const is_kongwang = isKongWang(monthZhi, kongWangStr) && monthZhi !== nianZhi1;

  let rawTotal = 70 + layer1.layer1_score + layer2.layer2_score + layer3.layer3_score;
  if (is_kongwang) rawTotal = Math.min(rawTotal, 85);
  const monthly_score = clamp(Math.round(rawTotal), 45, 98);

  return {
    monthly_score,
    layer1_score: layer1.layer1_score,
    layer2_score: layer2.layer2_score,
    layer3_score: layer3.layer3_score,
    layer1_raw: layer1.layer1_score,
    layer2_raw: layer2.layer2_score,
    layer3_raw: layer3.layer3_score,
    is_kongwang,
    has_sanxing: layer1.has_sanxing,
    yuede_active: layer1.yuede_active,
    avg_daily_score: layer2.avg_daily_score,
    high_score_days: layer2.high_score_days,
    high_score_dates: layer2.high_score_dates,
    low_score_days: layer2.low_score_days,
    low_score_dates: layer2.low_score_dates,
    best_date: layer2.best_date,
    best_score: layer2.best_score,
    worst_date: layer2.worst_date,
    worst_score: layer2.worst_score,
    has_trough: layer2.has_trough,
    trough_period: layer2.trough_period,
    daily_score_points: layer2.daily_score_points,
    dayun_gz,
    liunian_gz,
    month_gz,
    month_gan_shishen: layer1.month_gan_shishen,
    month_relations: layer1.month_relations,
    month_zhi_relations: layer1.month_relations,
    month_wuxing: layer3.month_wuxing,
    month_wuxing_relation: layer3.month_wuxing_relation,
    transit_support_score: layer3.transit_support_score,
    shishen_signals: layer3.shishen_signals,
    jieqi_list: layer2.jieqi_list,
  };
}

module.exports = { calculateMonthlyScore };
