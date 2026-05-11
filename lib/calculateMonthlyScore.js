/**
 * calculateMonthlyScore.js
 * ─────────────────────────────────────────────────────────────────────────────
 * 纯 Node.js 实现的八字月运算分引擎。
 * 不依赖任何大模型，所有分值由确定性逻辑推导。
 */

'use strict';

const { Solar } = require('lunar-javascript');
const { addDays, getFlowMonthInfo } = require('./flowMonth');
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
const ZI_XING_SET = new Set(['辰', '午', '酉', '亥']);

const SHISHEN_ALIASES = {
  印星: ['正印', '偏印'],
  比劫: ['比肩', '劫财'],
  官杀: ['正官', '七杀'],
  食伤: ['食神', '伤官'],
  财星: ['正财', '偏财'],
};

const SCORE_HITS_VERSION = 'monthly-score-hits-v1';

const SHISHEN_PLAIN_COPY = {
  正官: '官星清正，主规则、名分与稳定推进',
  七杀: '杀星有制则成权，主压力、竞争与快速应对',
  正印: '印绶护身，主贵人、学习与背书',
  偏印: '枭印偏深，主独立思考、深耕与灵感',
  食神: '食神吐秀，主表达、口碑与自然生发',
  伤官: '伤官外露，主锋芒、改革与表达欲',
  正财: '财星有根，主稳定回报与现实成果',
  偏财: '偏财流动，主人脉资源与额外机会',
  比肩: '比肩并立，主同伴、竞争与自我坚持',
  劫财: '劫财分夺，主资源分流与同伴牵扯',
};

function createHit({ code, type = 'neutral', deltaRaw = null, display, debug, meta = {} }) {
  return {
    code,
    type,
    delta_raw: deltaRaw,
    display,
    debug,
    meta,
  };
}

function hitTypeFromDelta(delta) {
  if (delta > 0) return 'positive';
  if (delta < 0) return 'negative';
  return 'neutral';
}

function getShiShenPlain(shiShen) {
  return SHISHEN_PLAIN_COPY[shiShen] || '本月外部主题';
}

function buildScoreHits({ finalScore, rawTotal, isKongWang, layer1, layer2, layer3 }) {
  const layers = [
    {
      layer: 'layer1',
      label: '干支格局层',
      score: layer1.layer1_score,
      hits: layer1.hits,
    },
    {
      layer: 'layer2',
      label: '日运聚合层',
      score: layer2.layer2_score,
      hits: layer2.hits,
    },
    {
      layer: 'layer3',
      label: '月令神煞层',
      score: layer3.layer3_score,
      hits: layer3.hits,
    },
  ];
  const leadLayer = layers
    .slice()
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))[0];
  const tone = finalScore >= 85
    ? '本月气势较足，宜乘势推进'
    : finalScore >= 76
      ? '本月整体偏顺，可主动经营'
      : finalScore >= 60
        ? '本月吉凶参半，宜稳中求进'
        : '本月阻力偏重，宜守成避险';
  const capCopy = isKongWang ? '；但逢空亡，气有虚耗，忌过度扩张' : '';

  return {
    version: SCORE_HITS_VERSION,
    summary: {
      final_score: finalScore,
      display: `${tone}。主因落在${leadLayer.label}，需合看三层命中${capCopy}。`,
      debug: `base=70, rawTotal=${rawTotal}, layer1=${layer1.layer1_score}, layer2=${layer2.layer2_score}, layer3=${layer3.layer3_score}, kongwang_cap=${isKongWang}, final=${finalScore}`,
    },
    layers,
  };
}

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

function normalizeFlowMonthInput(yearOrFlowMonth, month) {
  if (yearOrFlowMonth && typeof yearOrFlowMonth === 'object' && yearOrFlowMonth.start_date) {
    return yearOrFlowMonth;
  }
  if (typeof yearOrFlowMonth === 'string') {
    return getFlowMonthInfo(yearOrFlowMonth);
  }
  return getFlowMonthInfo(toIsoDate(yearOrFlowMonth, month, 1));
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
  const hits = [];
  const relationTargets = buildRelationTargets({
    yuanDayZhi,
    yuanMonZhi,
    yuanYearZhi,
    dayunZhi,
    liunianZhi,
  });

  const monthGanShiShen = getShiShenFn(monthGan, riGan);
  if (listIncludesShiShen(favorable, monthGanShiShen)) {
    raw1 += 10;
    hits.push(createHit({
      code: 'month_gan_shishen_favorable',
      type: 'positive',
      deltaRaw: 10,
      display: `月干透出之象合命主所喜，${getShiShenPlain(monthGanShiShen)}，本月做事更易得势。`,
      debug: `monthGan=${monthGan}, riGan=${riGan}, month_gan_shishen=${monthGanShiShen}, favorable matched, raw +10`,
      meta: { monthGan, riGan, monthGanShiShen },
    }));
  } else if (listIncludesShiShen(unfavorable, monthGanShiShen)) {
    raw1 -= 10;
    hits.push(createHit({
      code: 'month_gan_shishen_unfavorable',
      type: 'negative',
      deltaRaw: -10,
      display: `月干透出之象触及命主所忌，${getShiShenPlain(monthGanShiShen)}，本月宜少冒进、多留余地。`,
      debug: `monthGan=${monthGan}, riGan=${riGan}, month_gan_shishen=${monthGanShiShen}, unfavorable matched, raw -10`,
      meta: { monthGan, riGan, monthGanShiShen },
    }));
  } else {
    hits.push(createHit({
      code: 'month_gan_shishen_neutral',
      display: `月干主题不偏喜忌，${getShiShenPlain(monthGanShiShen)}，对本月只作背景参考。`,
      debug: `monthGan=${monthGan}, riGan=${riGan}, month_gan_shishen=${monthGanShiShen}, no favorable/unfavorable match`,
      meta: { monthGan, riGan, monthGanShiShen },
    }));
  }

  const wuheInfo = GAN_WUHE[monthGan];
  if (wuheInfo && wuheInfo.partner === riGan) {
    const huaShiShenList = wuxingToShiShenList(wuheInfo.huaWuxing, riGan);
    let delta = 0;
    if (listIntersectsShiShen(favorable, huaShiShenList)) delta = 12;
    else if (listIntersectsShiShen(unfavorable, huaShiShenList)) delta = -6;
    raw1 += delta;
    relationParts.push(`流月天干[${monthGan}]与命主日干[${riGan}]天干五合化${wuheInfo.huaWuxing}`);
    hits.push(createHit({
      code: 'gan_wuhe',
      type: hitTypeFromDelta(delta),
      deltaRaw: delta,
      display: `流月天干与日主相合，古法以合看牵引，化出${wuheInfo.huaWuxing}气，事情容易因人事关系而被带动。`,
      debug: `monthGan=${monthGan}, riGan=${riGan}, wuhe hua=${wuheInfo.huaWuxing}, delta=${delta}`,
      meta: { monthGan, riGan, huaWuxing: wuheInfo.huaWuxing },
    }));
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
    const delta = Math.round(calcMonthlyHeHuaScore(heShiShenList, favorable, unfavorable) * liuHeTarget.weight);
    raw1 += delta;
    relationParts.push(`流月地支[${monthZhi}]与${liuHeTarget.label}[${liuHeInfo.partner}]六合化${liuHeInfo.huaWuxing}（${type}）`);
    hits.push(createHit({
      code: 'zhi_liuhe',
      type: hitTypeFromDelta(delta),
      deltaRaw: delta,
      display: `流月地支与${liuHeTarget.label}成六合，合则有情，主关系牵连、资源配合，吉凶取决于化气是否为命主所喜。`,
      debug: `monthZhi=${monthZhi}, target=${liuHeTarget.label}[${liuHeInfo.partner}], hua=${liuHeInfo.huaWuxing}, type=${type}, weight=${liuHeTarget.weight}, delta=${delta}`,
      meta: { monthZhi, target: liuHeTarget, huaWuxing: liuHeInfo.huaWuxing, relationType: type },
    }));
  }

  if (hasHe3) {
    const sanHeShiShenList = wuxingToShiShenList(sanHeInfo.huaWuxing, riGan);
    const type = relationType(sanHeShiShenList, favorable, unfavorable);
    const sanHeWeight = Math.max(...sanHePartners.map(target => target.weight));
    const delta = Math.round(calcMonthlyHeHuaScore(sanHeShiShenList, favorable, unfavorable) * sanHeWeight);
    raw1 += delta;
    relationParts.push(`流月地支[${monthZhi}]会同${sanHePartners.map(target => `${target.label}[${target.zhi}]`).join('、')}构成${sanHeInfo.group.join('')}三合${sanHeInfo.huaWuxing}局（${type}）`);
    hits.push(createHit({
      code: 'zhi_sanhe',
      type: hitTypeFromDelta(delta),
      deltaRaw: delta,
      display: `流月会成三合之局，局成则气聚，本月某类主题会被放大，宜顺其所喜、避其所忌。`,
      debug: `monthZhi=${monthZhi}, partners=${sanHePartners.map(target => `${target.label}[${target.zhi}]`).join(',')}, group=${sanHeInfo.group.join('')}, hua=${sanHeInfo.huaWuxing}, type=${type}, delta=${delta}`,
      meta: { monthZhi, partners: sanHePartners, group: sanHeInfo.group, huaWuxing: sanHeInfo.huaWuxing, relationType: type },
    }));
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
    hits.push(createHit({
      code: 'zhi_chong',
      type: hitTypeFromDelta(effect.delta),
      deltaRaw: effect.delta,
      display: effect.delta > 0
        ? `流月地支冲动${effect.label}，冲去所忌则反有疏通之象，压力有机会被打散。`
        : `流月地支冲动${effect.label}，冲主变动，本月计划、沟通或环境节奏更易反复。`,
      debug: `monthZhi=${monthZhi}, target=${effect.label}[${effect.zhi}], relation=六冲, note=${effect.note}, delta=${effect.delta}`,
      meta: { monthZhi, target: effect, note: effect.note },
    }));
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
    hits.push(createHit({
      code: 'zhi_liuhai',
      type: hitTypeFromDelta(effect.delta),
      deltaRaw: effect.delta,
      display: `流月地支与${effect.label}成六害，害多主暗耗与细节不和，本月人事沟通、合作边界要更细。`,
      debug: `monthZhi=${monthZhi}, target=${effect.label}[${effect.zhi}], relation=六害, note=${effect.note}, delta=${effect.delta}`,
      meta: { monthZhi, target: effect, note: effect.note },
    }));
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
      hits.push(createHit({
        code: 'yuede_active',
        type: 'positive',
        deltaRaw: 10 - chongParts[0].val,
        display: `月德贵人得令，古法主解厄扶善，本月遇阻时较有缓和与转圜之机。`,
        debug: `yuede monthGan=${monthGan}, base +10, canceled lightest chong penalty=${chongParts[0].val}`,
        meta: { monthGan, canceledPenalty: chongParts[0].val },
      }));
    } else {
      relationParts.push(`月德贵人得令（${monthGan}）`);
      hits.push(createHit({
        code: 'yuede_active',
        type: 'positive',
        deltaRaw: 10,
        display: `月德贵人得令，古法主解厄扶善，本月遇阻时较有缓和与转圜之机。`,
        debug: `yuede monthGan=${monthGan}, raw +10`,
        meta: { monthGan },
      }));
    }
  }

  if (hasSanXing(monthZhi, relationTargets.map(target => target.zhi))) {
    const sanXing = getSanXingRaw({ monthZhi, relationTargets, riGan, favorable, unfavorable });
    raw1 = sanXing.raw;
    has_sanxing = true;
    relationParts.unshift(`流月地支[${monthZhi}]与命主原局构成三刑（${sanXing.note}）`);
    hits.unshift(createHit({
      code: 'sanxing_active',
      type: 'warning',
      deltaRaw: sanXing.raw,
      display: `流月构成三刑，刑主牵扯与内耗，本月人际、合作和情绪反应都宜收敛。`,
      debug: `monthZhi=${monthZhi}, sanxing note=${sanXing.note}, layer1 raw overwritten=${sanXing.raw}`,
      meta: { monthZhi, note: sanXing.note },
    }));
  }

  if (!has_sanxing && ZI_XING_SET.has(monthZhi)) {
    const selfPunishmentTarget = [
      { label: '日支', zhi: yuanDayZhi },
      { label: '月支', zhi: yuanMonZhi },
      { label: '年支', zhi: yuanYearZhi },
    ].find(target => target.zhi === monthZhi);

    if (selfPunishmentTarget) {
      raw1 -= 5;
      relationParts.push(`流月地支[${monthZhi}]与命主${selfPunishmentTarget.label}[${monthZhi}]自刑（同支相见）`);
      hits.push(createHit({
        code: 'zixing_active',
        type: 'negative',
        deltaRaw: -5,
        display: `流月地支与命局同支相见，自刑触发，本月情绪内耗与计划反复更明显。`,
        debug: `monthZhi=${monthZhi}, target=${selfPunishmentTarget.label}[${monthZhi}], raw -5`,
        meta: { monthZhi, target: selfPunishmentTarget },
      }));
    }
  }

  const month_relations = relationParts.length > 0 ? relationParts.join('；') : '无明显刑冲合害';
  if (relationParts.length === 0) {
    hits.push(createHit({
      code: 'no_obvious_relation',
      display: `本月地支未见明显刑冲合害，格局层不以突发冲动为主，宜按常规节奏推进。`,
      debug: `monthZhi=${monthZhi}, relationTargets=${relationTargets.map(target => `${target.label}[${target.zhi}]`).join(',')}, no relationParts`,
    }));
  }

  return {
    layer1_score: scaleLayerScore(raw1, 1.5, -30, 30),
    has_sanxing,
    yuede_active,
    month_gan_shishen: monthGanShiShen,
    month_relations,
    hits,
  };
}

function calculateLayer2(profile, flowMonth, calcDaily) {
  const jieqiDates = [];
  const jieqi_list = [];
  const dayKeys = [];
  const hits = [];

  for (let cursor = flowMonth.start_date; cursor <= flowMonth.end_date; cursor = addDays(cursor, 1)) {
    dayKeys.push(cursor);
    const [year, month, day] = cursor.split('-').map(Number);
    const lunar = Solar.fromYmd(year, month, day).getLunar();
    const jieqi = lunar.getJieQi();
    if (jieqi) {
      jieqiDates.push(cursor);
      jieqi_list.push(`${jieqi}[${month}月${day}日]`);
    }
  }

  const dailyPoints = [];
  let jieqiDiscountedDays = 0;
  for (const cursor of dayKeys) {
    const [year, month, day] = cursor.split('-').map(Number);
    const lunar = Solar.fromYmd(year, month, day).getLunar();
    const result = calcDaily(profile, lunar) || {};
    let score = Number(result.final_score) || 0;
    if (jieqiDates.some(jieqiDay => {
      const [jy, jm, jd] = jieqiDay.split('-').map(Number);
      const jieDate = new Date(Date.UTC(jy, jm - 1, jd));
      const curDate = new Date(Date.UTC(year, month - 1, day));
      return Math.abs((curDate - jieDate) / 86400000) <= 3;
    })) {
      score = Math.floor(score * 0.8);
      jieqiDiscountedDays++;
    }
    dailyPoints.push({ date: cursor, score });
  }

  const scores = dailyPoints.map(point => point.score);
  const meanScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const highItems = dailyPoints.filter(point => point.score >= 80);
  const lowItems = dailyPoints.filter(point => point.score <= 55);
  const bestItem = dailyPoints.reduce((best, item) => item.score > best.score ? item : best);
  const worstItem = dailyPoints.reduce((worst, item) => item.score < worst.score ? item : worst);
  const trough = getTrough(dailyPoints);
  const highRatio = highItems.length / dailyPoints.length;
  const raw2 = (meanScore - 70) * 0.4
    + (highRatio > 0.6 ? 8 : highRatio > 0.4 ? 4 : 0)
    - (lowItems.length >= 5 ? 6 : 0)
    - (trough.has_trough ? 5 : 0);

  if (meanScore >= 72) {
    hits.push(createHit({
      code: 'avg_daily_score_positive',
      type: 'positive',
      deltaRaw: Math.round((meanScore - 70) * 0.4 * 100) / 100,
      display: `月内日运均分高于中线，日课承接不弱，本月多数日子能托住基本节奏。`,
      debug: `avg_daily_score=${Math.round(meanScore * 100) / 100}, mean contribution=${(meanScore - 70) * 0.4}`,
    }));
  } else if (meanScore <= 68) {
    hits.push(createHit({
      code: 'avg_daily_score_negative',
      type: 'negative',
      deltaRaw: Math.round((meanScore - 70) * 0.4 * 100) / 100,
      display: `月内日运均分低于中线，日课承接偏弱，本月更需要节奏管理。`,
      debug: `avg_daily_score=${Math.round(meanScore * 100) / 100}, mean contribution=${(meanScore - 70) * 0.4}`,
    }));
  } else {
    hits.push(createHit({
      code: 'avg_daily_score_neutral',
      display: `月内日运均分贴近中线，日课不作大吉大凶论，重点仍看格局与月令。`,
      debug: `avg_daily_score=${Math.round(meanScore * 100) / 100}, mean contribution=${(meanScore - 70) * 0.4}`,
    }));
  }

  if (highRatio > 0.4) {
    const delta = highRatio > 0.6 ? 8 : 4;
    hits.push(createHit({
      code: 'high_score_days_positive',
      type: 'positive',
      deltaRaw: delta,
      display: `本月高分日成势，吉日可用，重要事项宜择状态较旺的窗口集中推进。`,
      debug: `high_score_days=${highItems.length}, total_days=${dailyPoints.length}, highRatio=${highRatio}, raw +${delta}`,
      meta: { high_score_dates: highItems.map(item => item.date) },
    }));
  }

  if (lowItems.length >= 5) {
    hits.push(createHit({
      code: 'low_score_days_negative',
      type: 'negative',
      deltaRaw: -6,
      display: `本月低分日偏多，凶日夹杂，重要决定不宜连续压在低位时段。`,
      debug: `low_score_days=${lowItems.length}, raw -6`,
      meta: { low_score_dates: lowItems.map(item => item.date) },
    }));
  }

  if (trough.has_trough) {
    hits.push(createHit({
      code: 'trough_period_negative',
      type: 'negative',
      deltaRaw: -5,
      display: `本月出现连续低谷，气势有伏藏之象，宜把关键事项避开这段时间。`,
      debug: `trough_period=${trough.trough_period}, raw -5`,
      meta: { trough_period: trough.trough_period },
    }));
  }

  if (jieqiDiscountedDays > 0) {
    hits.push(createHit({
      code: 'jieqi_nearby_discount',
      type: 'warning',
      display: `节气交接前后气机转换，日分已作折减；这类窗口适合观察调整，不宜强行抢进。`,
      debug: `jieqi_dates=${jieqiDates.join(',')}, discounted_days=${jieqiDiscountedDays}, each matching day score *=0.8`,
      meta: { jieqi_list },
    }));
  }

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
    hits,
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
  const hits = [];
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
  const month_wuxing_relation = monthWuxingIsFav ? '喜用' : monthWuxingIsUnfav ? '忌仇' : '闲';

  let monthWuxingDelta = 0;
  let monthWuxingMode = '平';
  if (WUXING_SHENG[monthWuxing] === riWuxing) {
    monthWuxingMode = '月令生身';
    monthWuxingDelta = monthWuxingIsFav ? 7 : monthWuxingIsUnfav ? -3 : 0;
  } else if (monthWuxing === riWuxing) {
    monthWuxingMode = '月令同气';
    monthWuxingDelta = monthWuxingIsFav ? 5 : monthWuxingIsUnfav ? -3 : 0;
  } else if (WUXING_SHENG[riWuxing] === monthWuxing) {
    monthWuxingMode = '日主泄秀';
    monthWuxingDelta = monthWuxingIsFav ? 3 : monthWuxingIsUnfav ? -5 : 0;
  } else if (WUXING_KE[monthWuxing] === riWuxing) {
    monthWuxingMode = '月令克身';
    monthWuxingDelta = monthWuxingIsFav ? 5 : monthWuxingIsUnfav ? -7 : 0;
  } else if (WUXING_KE[riWuxing] === monthWuxing) {
    monthWuxingMode = '日主制财';
    monthWuxingDelta = monthWuxingIsFav ? 3 : monthWuxingIsUnfav ? -5 : 0;
  }
  raw3 += monthWuxingDelta;
  hits.push(createHit({
    code: `month_wuxing_relation_${month_wuxing_relation === '喜用' ? 'favorable' : month_wuxing_relation === '忌仇' ? 'unfavorable' : 'neutral'}`,
    type: hitTypeFromDelta(monthWuxingDelta),
    deltaRaw: monthWuxingDelta,
    display: `月令属${monthWuxing || '未知'}，${monthWuxingMode}，古法以月令为提纲；此气对命主属${month_wuxing_relation}，故作本层判断底色。`,
    debug: `monthZhi=${monthZhi}, month_wuxing=${monthWuxing}, riGan=${riGan}, ri_wuxing=${riWuxing}, mode=${monthWuxingMode}, relation=${month_wuxing_relation}, delta=${monthWuxingDelta}`,
    meta: { monthZhi, monthWuxing, monthWuxingMode, month_wuxing_relation },
  }));

  const tianyiZhis = TIANYI_MAP[riGan] || [];
  if (tianyiZhis.includes(monthZhi)) {
    raw3 += 10;
    shishen_signals.tianyi_active = true;
    hits.push(createHit({
      code: 'tianyi_active',
      type: 'positive',
      deltaRaw: 10,
      display: `天乙贵人临月，古法主逢凶得助，本月较易遇到能搭手、解围的人。`,
      debug: `riGan=${riGan}, monthZhi=${monthZhi}, tianyi matched, raw +10`,
      meta: { riGan, monthZhi },
    }));
  }

  if (WENCHANG_MAP[riGan] === monthZhi) {
    raw3 += 8;
    shishen_signals.wenchang_active = true;
    hits.push(createHit({
      code: 'wenchang_active',
      type: 'positive',
      deltaRaw: 8,
      display: `文昌临月，主文章、表达与名声之气，本月利学习、写作、提案与考试。`,
      debug: `riGan=${riGan}, monthZhi=${monthZhi}, wenchang matched, raw +8`,
      meta: { riGan, monthZhi },
    }));
  }

  const luZhi = LU_MAP[riGan];
  if (luZhi && monthZhi === luZhi) {
    raw3 += 6;
    shishen_signals.lu_active = true;
    hits.push(createHit({
      code: 'lu_active',
      type: 'positive',
      deltaRaw: 6,
      display: `命主日干禄神临月，本月守住本位、经营正事更有实质回报感。`,
      debug: `riGan=${riGan}, luZhi=${luZhi}, monthZhi=${monthZhi}, day-stem lu matched, raw +6`,
      meta: { riGan, monthZhi, luZhi, lookup: 'day_stem_lu' },
    }));
  }

  const yimaZhi = YIMA_MAP[yuanYearZhi] || YIMA_MAP[yuanDayZhi];
  if (yimaZhi && monthZhi === yimaZhi) {
    shishen_signals.yima_active = true;
    const yimaShiShenList = wuxingToShiShenList(ZHI_WUXING[yimaZhi], riGan);
    if (listIntersectsShiShen(favorable, yimaShiShenList)) {
      raw3 += 5;
      shishen_signals.yima_favorable = true;
      hits.push(createHit({
        code: 'yima_active_favorable',
        type: 'positive',
        deltaRaw: 5,
        display: `驿马临月且向喜用，马主动象，本月出行、变动、外部机会更容易带来助力。`,
        debug: `monthZhi=${monthZhi}, yimaZhi=${yimaZhi}, favorable matched, raw +5`,
        meta: { monthZhi, yimaZhi },
      }));
    } else if (listIntersectsShiShen(unfavorable, yimaShiShenList)) {
      raw3 -= 2;
      hits.push(createHit({
        code: 'yima_active_unfavorable',
        type: 'negative',
        deltaRaw: -2,
        display: `驿马临月但牵动所忌，动中有耗，本月变动、奔波或临时事项要防失控。`,
        debug: `monthZhi=${monthZhi}, yimaZhi=${yimaZhi}, unfavorable matched, raw -2`,
        meta: { monthZhi, yimaZhi },
      }));
    } else {
      raw3 += 2;
      shishen_signals.yima_favorable = true;
      hits.push(createHit({
        code: 'yima_active_neutral',
        type: 'positive',
        deltaRaw: 2,
        display: `驿马临月，马主动象，本月适合通过走动、沟通或环境切换打开局面。`,
        debug: `monthZhi=${monthZhi}, yimaZhi=${yimaZhi}, neutral raw +2`,
        meta: { monthZhi, yimaZhi },
      }));
    }
  }

  if (jieqiCount === 0) {
    raw3 += 3;
    hits.push(createHit({
      code: 'jieqi_count_stable',
      type: 'positive',
      deltaRaw: 3,
      display: `本轮流月节气扰动少，气机相对专一，月令之力更容易稳定发挥。`,
      debug: `jieqiCount=${jieqiCount}, raw +3`,
    }));
  } else if (jieqiCount >= 2) {
    raw3 -= 2;
    hits.push(createHit({
      code: 'jieqi_count_busy',
      type: 'negative',
      deltaRaw: -2,
      display: `本轮流月节气交错较多，气机转换频繁，行事宜多观察节奏变化。`,
      debug: `jieqiCount=${jieqiCount}, raw -2`,
    }));
  }

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
  hits.push(createHit({
    code: transit_support_score > 0
      ? 'transit_support_positive'
      : transit_support_score < 0
        ? 'transit_support_negative'
        : 'transit_support_neutral',
    type: hitTypeFromDelta(transit_support_score),
    deltaRaw: transit_support_score,
    display: transit_support_score > 0
      ? `大运流年能扶起本月喜用或贵神，岁运有承接，吉象较容易落到现实。`
      : transit_support_score < 0
        ? `大运流年冲破本月气机，岁运承接不足，吉象需打折，忌把话说满。`
        : `大运流年对本月气机不作明显扶抑，仍以流月本身结构为主。`,
    debug: `dayunZhi=${dayunZhi}, liunianZhi=${liunianZhi}, monthZhi=${monthZhi}, transit_support_score=${transit_support_score}`,
    meta: { dayunZhi, liunianZhi, monthZhi },
  }));

  return {
    layer3_score: scaleLayerScore(raw3, 1.5, -15, 15),
    month_wuxing: monthWuxing,
    month_wuxing_relation,
    transit_support_score,
    shishen_signals,
    hits,
  };
}

function calculateMonthlyScore(
  profile,
  yearOrFlowMonth,
  monthOrCalcDaily,
  calcDaily = _defaultCalcDaily,
  getShiShenFn = _defaultGetShiShen
) {
  let flowMonth = normalizeFlowMonthInput(yearOrFlowMonth, typeof monthOrCalcDaily === 'number' ? monthOrCalcDaily : undefined);
  if (typeof monthOrCalcDaily === 'function') {
    getShiShenFn = calcDaily || _defaultGetShiShen;
    calcDaily = monthOrCalcDaily;
  }
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

  const [startYear, startMonth, startDay] = flowMonth.start_date.split('-').map(Number);
  const lunar1 = Solar.fromYmd(startYear, startMonth, startDay).getLunar();
  const ec1 = lunar1.getEightChar();
  const month_gz = flowMonth.month_gz || ec1.getMonth();
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

  const layer2 = calculateLayer2(profile, flowMonth, calcDaily);
  const layer3 = calculateLayer3({
    riGan,
    monthGan,
    monthZhi,
    favorable,
    unfavorable,
    yuanDayZhi,
    yuanYearZhi,
    yuanZhisArr,
    jieqiCount: Math.max(0, layer2.jieqiDates.length - 1),
    dayunZhi,
    liunianZhi,
  });

  const kongWangStr = lunar1.getDayXunKong();
  const nianZhi1 = ec1.getYear().charAt(1);
  const is_kongwang = isKongWang(monthZhi, kongWangStr) && monthZhi !== nianZhi1;

  let rawTotal = 70 + layer1.layer1_score + layer2.layer2_score + layer3.layer3_score;
  if (is_kongwang) rawTotal = Math.min(rawTotal, 85);
  const monthly_score = clamp(Math.round(rawTotal), 45, 98);
  const score_hits = buildScoreHits({
    finalScore: monthly_score,
    rawTotal,
    isKongWang: is_kongwang,
    layer1,
    layer2,
    layer3,
  });

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
    score_hits,
  };
}

module.exports = { calculateMonthlyScore };
