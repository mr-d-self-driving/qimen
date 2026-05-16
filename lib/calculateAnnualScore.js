/**
 * calculateAnnualScore.js
 * ─────────────────────────────────────────────────────────────────────────────
 * 纯 Node.js 实现的八字年运算分引擎（v3）
 * 基础分 70，最终锁定 [45, 98]
 * annual_score = clamp(70 + layer1 + layer2 + layer3, 45, 98)
 *
 * v3 修正要点：
 *   1. Layer1/Layer2 平权，大运决定性主要通过 cap 体现
 *   2. 自刑改为自刑支同支相见才触发
 *   3. Layer1 新增月支冲合参与，但避免重复计分
 *   4. Layer2 六害区分喜忌，本命年喜用加分
 *   5. 岁德/岁德合分流，冲大运支时岁破降为附加惩罚
 */

'use strict';

// ── 复用项目已有常量 ─────────────────────────────────────────────────────────
const { GAN5, ZHI_WUHANGS, LU_SHEN } = require('./constants/core');
const { ZHI_CHONGS, ZHI_HAIS, GAN_HES } = require('./constants/relations');
const { G_SHENS, DAY_SHENS, EMPTIES } = require('./constants/shensha');
const { getShiShen } = require('./calculateDailyScore');
const {
  normalizeShenProfile,
  getShiShenTier,
  getShiShenListTier,
  tierToCompatLabel,
  TIER_LABELS,
} = require('./normalizeShenProfile');
const { calculateTiaohouRatio, tiaohouToHit } = require('./calculateTiaohouRatio');
const { calculateShenshaImpact } = require('./calculateShenshaImpact');

// ── 本地常量 ─────────────────────────────────────────────────────────────────

const ANNUAL_SCORE_HITS_VERSION = 'annual-score-hits-v3';

const WUXING_SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const WUXING_KE    = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

const ZHI_LIUHE = {
  子: { partner: '丑', hua: '土' }, 丑: { partner: '子', hua: '土' },
  寅: { partner: '亥', hua: '木' }, 亥: { partner: '寅', hua: '木' },
  卯: { partner: '戌', hua: '火' }, 戌: { partner: '卯', hua: '火' },
  辰: { partner: '酉', hua: '金' }, 酉: { partner: '辰', hua: '金' },
  巳: { partner: '申', hua: '水' }, 申: { partner: '巳', hua: '水' },
  午: { partner: '未', hua: '土' }, 未: { partner: '午', hua: '土' },
};

const ZHI_SANHE = {
  申: { group: ['申','子','辰'], hua: '水' }, 子: { group: ['申','子','辰'], hua: '水' },
  辰: { group: ['申','子','辰'], hua: '水' }, 亥: { group: ['亥','卯','未'], hua: '木' },
  卯: { group: ['亥','卯','未'], hua: '木' }, 未: { group: ['亥','卯','未'], hua: '木' },
  寅: { group: ['寅','午','戌'], hua: '火' }, 午: { group: ['寅','午','戌'], hua: '火' },
  戌: { group: ['寅','午','戌'], hua: '火' }, 巳: { group: ['巳','酉','丑'], hua: '金' },
  酉: { group: ['巳','酉','丑'], hua: '金' }, 丑: { group: ['巳','酉','丑'], hua: '金' },
};

// 三刑组
const SAN_XING = [new Set(['寅','巳','申']), new Set(['丑','戌','未'])];
// 自刑支
const ZI_XING_SET = new Set(['辰','午','酉','亥']);
// 岁德口诀：流年干 === 原局年干
// 驿马以年支查
const YIMA = DAY_SHENS['驿马'];

// ── 工具函数 ─────────────────────────────────────────────────────────────────

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

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

function hitTypeFromText(text) {
  if (/[+＋]\d/.test(text)) return 'positive';
  if (/-\d/.test(text)) return 'negative';
  return 'neutral';
}

function splitDetailToHits(detail, fallbackCode, fallbackDisplay) {
  const chunks = String(detail || '')
    .split('；')
    .map(item => item.trim())
    .filter(Boolean);
  const source = chunks.length ? chunks : [fallbackDisplay];
  return source.map((display, index) => createHit({
    code: index === 0 ? fallbackCode : `${fallbackCode}_${index + 1}`,
    type: hitTypeFromText(display),
    display,
    debug: display,
  }));
}

function buildAnnualScoreHits({
  finalScore,
  rawBeforeCaps,
  rawBeforeTiaohou = rawBeforeCaps,
  rawAfterTiaohou = rawBeforeCaps,
  tiaohouRatio = 1,
  capLabels,
  layer1,
  layer2,
  layer3,
  isKongWang,
}) {
  const layer1Hits = splitDetailToHits(layer1.layer1_detail, 'dayun_background', '大运平稳，无明显刑冲合害');
  const layer2Hits = splitDetailToHits(layer2.layer2_detail, 'liunian_relation', '流年平顺');
  const layer3Hits = splitDetailToHits(layer3.suiyun_relations, 'suiyun_relation', '岁运无明显互动');

  if (layer1.dayun_sanxing) {
    layer1Hits.push(createHit({
      code: 'dayun_sanxing_cap',
      type: 'negative',
      display: '大运三刑触发，年运总分最高按 80 分处理。',
      debug: 'dayun_sanxing=true, cap=80',
      meta: { cap: 80 },
    }));
  }
  if (layer2.liunian_sanxing) {
    layer2Hits.push(createHit({
      code: 'liunian_sanxing_cap',
      type: 'negative',
      display: '流年三刑触发，年运总分最高按 82 分处理。',
      debug: 'liunian_sanxing=true, cap=82',
      meta: { cap: 82 },
    }));
  }
  if (layer2.is_zixing) {
    layer2Hits.push(createHit({
      code: 'liunian_zixing_cap',
      type: 'negative',
      display: '流年自刑触发，年内更需管理内耗与反复。',
      debug: 'is_zixing=true, cap=88',
      meta: { cap: 88 },
    }));
  }
  if (isKongWang) {
    layer3Hits.push(createHit({
      code: 'liunian_kongwang',
      type: 'negative',
      display: '流年支落空亡，机会与助力有虚耗感。',
      debug: 'is_kongwang=true',
    }));
  }

  const layers = [
    { layer: 'layer1', label: '大运底色层', score: layer1.layer1_score, hits: layer1Hits },
    { layer: 'layer2', label: '流年太岁层', score: layer2.layer2_score, hits: layer2Hits },
    { layer: 'layer3', label: '岁运神煞层', score: layer3.layer3_score, hits: layer3Hits },
  ];
  const tiaohouImpact = rawAfterTiaohou - rawBeforeTiaohou;
  const leadLayer = layers
    .slice()
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))[0];
  const tone = finalScore >= 85
    ? '今年气势较足，适合顺势推进关键计划'
    : finalScore >= 76
      ? '今年整体偏顺，可主动经营机会'
      : finalScore >= 60
        ? '今年吉凶参半，宜稳中求进'
        : '今年阻力偏重，宜守成避险';
  const capCopy = capLabels.length ? `；${capLabels.join('、')}带来分数封顶` : '';

  return {
    version: ANNUAL_SCORE_HITS_VERSION,
    summary: {
      final_score: finalScore,
      display: `${tone}。主因落在${leadLayer.label}，可点开三层命中细看${capCopy}。`,
      debug: `base=70, rawBeforeTiaohou=${rawBeforeTiaohou}, tiaohouRatio=${tiaohouRatio}, tiaohouImpact=${tiaohouImpact}, rawAfterTiaohou=${rawAfterTiaohou}, rawBeforeCaps=${rawBeforeCaps}, layer1=${layer1.layer1_score}, layer2=${layer2.layer2_score}, layer3=${layer3.layer3_score}, caps=${capLabels.join('|') || 'none'}, final=${finalScore}`,
    },
    layers,
  };
}

function normalizeList(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return String(val).split(/[、,，\s]+/).map(s => s.trim()).filter(Boolean);
}

const SHISHEN_ALIASES = {
  印星: ['正印','偏印'], 比劫: ['比肩','劫财'],
  官杀: ['正官','七杀'], 食伤: ['食神','伤官'], 财星: ['正财','偏财'],
};
function inList(list, ss) {
  return list.some(item => item === ss || (SHISHEN_ALIASES[item] || []).includes(ss));
}
function anyInList(list, ssList) { return ssList.some(ss => inList(list, ss)); }

function wuxingToSS(wuxing, riGan) {
  const rw = GAN5[riGan];
  if (wuxing === rw)                      return ['比肩','劫财'];
  if (WUXING_SHENG[wuxing] === rw)        return ['偏印','正印'];
  if (WUXING_SHENG[rw] === wuxing)        return ['食神','伤官'];
  if (WUXING_KE[wuxing] === rw)           return ['七杀','正官'];
  if (WUXING_KE[rw] === wuxing)           return ['偏财','正财'];
  return [];
}

/** 判断某地支五行对命主的喜忌类型 */
function zhiUseType(zhi, riGan, shen) {
  const ss = wuxingToSS(ZHI_WUHANGS[zhi], riGan);
  return tierToCompatLabel(getShiShenListTier(ss, shen));
}

/** 合化五行的喜忌类型 */
function huaUseType(huaWuxing, riGan, shen) {
  const ss = wuxingToSS(huaWuxing, riGan);
  return tierToCompatLabel(getShiShenListTier(ss, shen));
}

/** 检查 zhi 与目标集合是否触发三刑 */
function hasSanXing(zhi, targetSet) {
  const all = new Set([zhi, ...targetSet]);
  for (const g of SAN_XING) if ([...g].every(z => all.has(z))) return true;
  return all.has('子') && all.has('卯');
}

/** 六合/三合得分（合化后喜用 +score，忌仇 -score，闲 +1） */
function heScore(huaWuxing, riGan, shen, score) {
  const t = huaUseType(huaWuxing, riGan, shen);
  if (t === '喜用') return score;
  if (t === '忌仇') return -score;
  return 1;
}

/** 从日柱和年柱查空亡，返回落空地支 Set（union） */
function getKongwangSet(riZhu, nianZhu) {
  const s = new Set();
  const r = EMPTIES[riZhu] || [];
  const n = EMPTIES[nianZhu] || [];
  r.forEach(z => s.add(z));
  n.forEach(z => s.add(z));
  return s;
}

/** 天干五合：检查 ganA 与 ganB 是否五合，返回化气五行或 '' */
function ganHeHua(ganA, ganB) {
  const key1 = ganA + ganB, key2 = ganB + ganA;
  return GAN_HES[key1] || GAN_HES[key2] || '';
}

/** 判断大运干支是否同气（干支同五行）或异气（盖头截脚） */
function dayunQiStatus(dayunGan, dayunZhi) {
  const gw = GAN5[dayunGan];
  const zw = ZHI_WUHANGS[dayunZhi];
  if (gw === zw) return 'same';
  // 盖头：干克支；截脚：支克干
  if (WUXING_KE[gw] === zw || WUXING_KE[zw] === gw) return 'diff';
  return 'neutral'; // 既不同气也不异气（生扶关系）
}

// ── Layer 1：大运底色层 [-15, +15] ───────────────────────────────────────────

function calculateLayer1({ riGan, dayunGan, dayunZhi, yuanDayZhi, yuanMonZhi, yuanYearZhi, shen }) {
  let raw1 = 0;
  let dayun_sanxing = false;
  const parts = [];

  // 1-A 大运天干十神（四维体系）：用神+8 / 喜神+5 / 闲神0 / 仇神-4 / 忌神-7
  const dayunGanSS = getShiShen(dayunGan, riGan);
  const dayunGanTier = getShiShenTier(dayunGanSS, shen);
  const GAN_SCORES = { yong: 8, xi: 5, xian: 0, chou: -4, ji: -7 };
  const ganDelta = GAN_SCORES[dayunGanTier] ?? 0;
  raw1 += ganDelta;
  if (ganDelta !== 0) parts.push(`大运天干[${dayunGan}]${dayunGanSS}为${TIER_LABELS[dayunGanTier]}${ganDelta > 0 ? '+' : ''}${ganDelta}`);

  // 1-B 大运地支与原局关系
  const yuanZhiSet = new Set([yuanDayZhi, yuanYearZhi].filter(Boolean));
  const isUniqueMonthZhi = Boolean(yuanMonZhi && yuanMonZhi !== yuanDayZhi && yuanMonZhi !== yuanYearZhi);

  // 三刑熔断（覆写 raw1，不累加）
  if (hasSanXing(dayunZhi, yuanZhiSet)) {
    raw1 = -15;
    dayun_sanxing = true;
    parts.unshift(`大运地支[${dayunZhi}]与原局构成三刑，raw1强制覆写-15`);
    // 直接跳过后续 1-B 分项
  } else {
    // 检查六合/三合（先判断，用于贪合忘冲）
    const liuheInfo = ZHI_LIUHE[dayunZhi];
    const hasDayunHe6 = liuheInfo && yuanZhiSet.has(liuheInfo.partner);
    const sanheInfo = ZHI_SANHE[dayunZhi];
    const hasDayunHe3 = sanheInfo && sanheInfo.group.some(z => z !== dayunZhi && yuanZhiSet.has(z));
    const hasMonthHe6 = Boolean(isUniqueMonthZhi && liuheInfo && liuheInfo.partner === yuanMonZhi);
    const hasMonthHe3 = Boolean(isUniqueMonthZhi && sanheInfo && sanheInfo.group.includes(yuanMonZhi) && yuanMonZhi !== dayunZhi);
    const hasAnyHe = hasDayunHe6 || hasDayunHe3 || hasMonthHe6 || hasMonthHe3;

    if (hasDayunHe6) {
      const s = heScore(liuheInfo.hua, riGan, shen, 6);
      raw1 += s;
      parts.push(`大运支[${dayunZhi}]与原局[${liuheInfo.partner}]六合化${liuheInfo.hua}${s>0?'+':''}${s}`);
    }
    if (hasDayunHe3) {
      const s = heScore(sanheInfo.hua, riGan, shen, 6);
      raw1 += s;
      parts.push(`大运支[${dayunZhi}]参与三合${sanheInfo.hua}局${s>0?'+':''}${s}`);
    }
    if (hasMonthHe6) {
      const s = heScore(liuheInfo.hua, riGan, shen, 5);
      raw1 += s;
      parts.push(`大运支[${dayunZhi}]与月支[${yuanMonZhi}]六合化${liuheInfo.hua}${s>0?'+':''}${s}`);
    }
    if (hasMonthHe3) {
      const s = heScore(sanheInfo.hua, riGan, shen, 4);
      raw1 += s;
      parts.push(`大运支[${dayunZhi}]参与三合含月支[${yuanMonZhi}]化${sanheInfo.hua}${s>0?'+':''}${s}`);
    }

    // 冲日支 -8
    if (ZHI_CHONGS[dayunZhi] === yuanDayZhi) {
      const pen = hasAnyHe ? Math.ceil(-8 * 0.5) : -8;
      raw1 += pen;
      parts.push(`大运支[${dayunZhi}]冲日支[${yuanDayZhi}]${pen}${hasAnyHe?'（贪合忘冲减半）':''}`);
    }
    // 冲月支 -5
    if (isUniqueMonthZhi && ZHI_CHONGS[dayunZhi] === yuanMonZhi) {
      const pen = hasAnyHe ? Math.ceil(-5 * 0.5) : -5;
      raw1 += pen;
      parts.push(`大运支[${dayunZhi}]冲月支[${yuanMonZhi}]${pen}${hasAnyHe?'（贪合忘冲减半）':''}`);
    }
    // 冲年支 -4
    if (yuanYearZhi && yuanYearZhi !== yuanDayZhi && yuanYearZhi !== yuanMonZhi && ZHI_CHONGS[dayunZhi] === yuanYearZhi) {
      const pen = hasAnyHe ? Math.ceil(-4 * 0.5) : -4;
      raw1 += pen;
      parts.push(`大运支[${dayunZhi}]冲年支[${yuanYearZhi}]${pen}${hasAnyHe?'（贪合忘冲减半）':''}`);
    }

    // 六害日支（区分喜忌）
    if (ZHI_HAIS[dayunZhi] === yuanDayZhi) {
      const t = zhiUseType(yuanDayZhi, riGan, shen);
      if (t === '喜用')      { raw1 -= 4; parts.push(`大运支[${dayunZhi}]害日支喜用[${yuanDayZhi}]-4`); }
      else if (t === '忌仇') { parts.push(`大运支[${dayunZhi}]害日支忌仇[${yuanDayZhi}]，扣分免除`); }
      else                   { raw1 -= 2; parts.push(`大运支[${dayunZhi}]害日支闲神[${yuanDayZhi}]-2`); }
    }
  }

  // 1-C 干支同气/异气
  const qiStatus = dayunQiStatus(dayunGan, dayunZhi);
  const dayunGanType = tierToCompatLabel(dayunGanTier);

  if (!dayun_sanxing) {
    if (qiStatus === 'same') {
      if (dayunGanType === '喜用')      { raw1 += 3; parts.push(`大运干支同气（喜用）额外+3`); }
      else if (dayunGanType === '忌仇') { raw1 -= 3; parts.push(`大运干支同气（忌仇）额外-3`); }
    } else if (qiStatus === 'diff') {
      raw1 = Math.round(raw1 * 0.7);
      parts.push(`大运干支异气（盖头截脚），本层总分×0.7`);
    }
  }

  return {
    layer1_score: clamp(raw1, -15, 15),
    dayun_sanxing,
    dayun_gz: dayunGan + dayunZhi,
    dayun_gan_shishen: dayunGanSS,
    dayun_qi_status: qiStatus === 'same' ? 'same' : qiStatus === 'diff' ? 'diff' : 'neutral',
    layer1_detail: parts.join('；') || '大运平稳，无明显刑冲合害',
  };
}

// ── Layer 2：流年太岁层 [-28, +28] ───────────────────────────────────────────

function calculateLayer2({
  riGan, riZhu, liunianGan, liunianZhi,
  yuanDayZhi, yuanMonZhi, yuanYearZhi, yuanYearGan,
  shen,
}) {
  let raw2 = 0;
  let liunian_sanxing = false;
  let is_benmingnian = false;
  let is_zixing = false;
  const parts = [];

  // 2-A 流年天干十神（四维体系）：用神+14 / 喜神+9 / 闲神0 / 仇神-7 / 忌神-12
  const liunianGanSS = getShiShen(liunianGan, riGan);
  const liunianGanTier = getShiShenTier(liunianGanSS, shen);
  const LN_GAN_SCORES = { yong: 14, xi: 9, xian: 0, chou: -7, ji: -12 };
  const lnGanDelta = LN_GAN_SCORES[liunianGanTier] ?? 0;
  raw2 += lnGanDelta;
  if (lnGanDelta !== 0) parts.push(`流年天干[${liunianGan}]${liunianGanSS}${TIER_LABELS[liunianGanTier]}${lnGanDelta > 0 ? '+' : ''}${lnGanDelta}`);

  // 2-B 流年地支与原局关系
  const yuanZhiSet = new Set([yuanDayZhi, yuanMonZhi, yuanYearZhi].filter(Boolean));

  // 三刑熔断
  if (hasSanXing(liunianZhi, yuanZhiSet)) {
    raw2 = raw2 >= 0 ? -12 : raw2 - 12; // 保留天干得分，地支部分强制 -12
    liunian_sanxing = true;
    parts.push(`流年支[${liunianZhi}]与原局触发三刑，地支部分强制-12`);
  } else {
    // 六合/三合（先判断用于贪合忘冲）
    const liuheInfo = ZHI_LIUHE[liunianZhi];
    const hasHe6 = liuheInfo && yuanZhiSet.has(liuheInfo.partner);
    const sanheInfo = ZHI_SANHE[liunianZhi];
    const hasHe3 = sanheInfo && sanheInfo.group.some(z => z !== liunianZhi && yuanZhiSet.has(z));
    const hasAnyHe = hasHe6 || hasHe3;

    if (hasHe6) {
      const s = heScore(liuheInfo.hua, riGan, shen, 6);
      raw2 += s;
      parts.push(`流年支[${liunianZhi}]与原局[${liuheInfo.partner}]六合化${liuheInfo.hua}${s>0?'+':''}${s}`);
    }
    if (hasHe3) {
      const s = heScore(sanheInfo.hua, riGan, shen, 6);
      raw2 += s;
      parts.push(`流年支[${liunianZhi}]参与三合${sanheInfo.hua}局${s>0?'+':''}${s}`);
    }

    // 冲日支 -7
    if (ZHI_CHONGS[liunianZhi] === yuanDayZhi) {
      const pen = hasAnyHe ? Math.ceil(-7 * 0.5) : -7;
      raw2 += pen; parts.push(`流年支冲日支${pen}${hasAnyHe?'（贪合忘冲）':''}`);
    }
    // 冲月支 -5
    if (yuanMonZhi && ZHI_CHONGS[liunianZhi] === yuanMonZhi) {
      const pen = hasAnyHe ? Math.ceil(-5 * 0.5) : -5;
      raw2 += pen; parts.push(`流年支冲月支${pen}${hasAnyHe?'（贪合忘冲）':''}`);
    }
    // 冲年支 -3
    if (yuanYearZhi && ZHI_CHONGS[liunianZhi] === yuanYearZhi) {
      const pen = hasAnyHe ? Math.ceil(-3 * 0.5) : -3;
      raw2 += pen; parts.push(`流年支冲年支${pen}${hasAnyHe?'（贪合忘冲）':''}`);
    }
    // 六害：区分喜忌
    const haiTarget = ZHI_HAIS[liunianZhi];
    if (haiTarget && yuanZhiSet.has(haiTarget)) {
      const t = zhiUseType(haiTarget, riGan, shen);
      if (t === '喜用')      { raw2 -= 3; parts.push(`流年支[${liunianZhi}]六害喜用[${haiTarget}]-3`); }
      else if (t === '忌仇') { parts.push(`流年支[${liunianZhi}]六害忌仇[${haiTarget}]，扣分免除`); }
      else                   { raw2 -= 2; parts.push(`流年支[${liunianZhi}]六害闲神[${haiTarget}]-2`); }
    }
  }

  // 2-C 太岁特殊规则
  // 本命年
  if (yuanYearZhi && liunianZhi === yuanYearZhi) {
    is_benmingnian = true;
    const t = zhiUseType(liunianZhi, riGan, shen);
    if (t === '忌仇') { raw2 -= 5; parts.push(`本命年太岁压命（忌仇）-5`); }
    else if (t === '喜用') { raw2 += 3; parts.push(`本命年太岁归位（喜用），可乘势推进+3`); }
    else              { parts.push(`本命年（闲神），中性`); }
  }

  // 自刑：自刑支同支相见才触发
  const selfPunishmentSource = [
    ['日支', yuanDayZhi],
    ['月支', yuanMonZhi],
    ['年支', yuanYearZhi],
  ].find(([, zhi]) => zhi && zhi === liunianZhi);
  if (ZI_XING_SET.has(liunianZhi) && selfPunishmentSource) {
    is_zixing = true;
    raw2 -= 8; parts.push(`流年支[${liunianZhi}]与原局${selfPunishmentSource[0]}[${selfPunishmentSource[1]}]自刑（同支相见）-8`);
  }

  // 伏吟
  if (liunianZhi === yuanDayZhi) {
    raw2 -= 4; parts.push(`流年支伏吟日支-4`);
  }

  // 天干五合（流年干合日干）
  const dayGan = riZhu.charAt(0);
  const lnGanHeHua = ganHeHua(liunianGan, dayGan);
  if (lnGanHeHua) {
    const t = huaUseType(lnGanHeHua, riGan, shen);
    if (t === '喜用')      { raw2 += 10; parts.push(`流年干[${liunianGan}]合日干化${lnGanHeHua}（喜用）+10`); }
    else if (t === '忌仇') { raw2 -= 6;  parts.push(`流年干[${liunianGan}]合日干化${lnGanHeHua}（忌仇）-6`); }
  }

  return {
    layer2_score: clamp(raw2, -28, 28),
    liunian_sanxing,
    is_benmingnian,
    is_zixing,
    liunian_gz: liunianGan + liunianZhi,
    liunian_gan_shishen: liunianGanSS,
    layer2_detail: parts.join('；') || '流年平顺',
  };
}

// ── Layer 3：岁运承接与神煞层 [-12, +12] ─────────────────────────────────────

function calculateLayer3({
  riGan, yuanYearGan,
  dayunGan, dayunZhi,
  liunianGan, liunianZhi,
  yuanDayZhi, yuanMonZhi, yuanYearZhi,
  shen,
  isKongWang = false,
}) {
  let raw3 = 0;
  const parts = [];
  const shensha_signals = {
    tianyi_active: false, wenchang_active: false,
    lu_active: false, yima_active: false,
    suide_active: false, suide_he_active: false, suipo_active: false,
    shensha_ratio: 1.0,
    tianyi_delta: 0, wenchang_delta: 0,
    lu_delta: 0, yima_delta: 0,
    suide_delta: 0, suide_he_delta: 0,
  };

  // 流年支喜忌系数（xiJiRatio）
  const lnZhiType = zhiUseType(liunianZhi, riGan, shen);
  const xiJiRatio = lnZhiType === '喜用' ? 1.0 : lnZhiType === '闲' ? 0.7 : 0.4;
  shensha_signals.shensha_ratio = xiJiRatio;

  // ── 3-A 大运与流年干支互动（岁运交战） ────────────────────────────────────

  // 天干五合
  const suiyunGanHua = ganHeHua(dayunGan, liunianGan);
  if (suiyunGanHua) {
    const t = huaUseType(suiyunGanHua, riGan, shen);
    if (t === '喜用')      { raw3 += 8; parts.push(`岁运天干五合化${suiyunGanHua}（喜用）+8`); }
    else if (t === '忌仇') { raw3 -= 6; parts.push(`岁运天干五合化${suiyunGanHua}（忌仇）-6`); }
  }

  // 地支六合/三合
  const szLiuhe = ZHI_LIUHE[dayunZhi];
  if (szLiuhe && szLiuhe.partner === liunianZhi) {
    const s = heScore(szLiuhe.hua, riGan, shen, 8);
    raw3 += s; parts.push(`岁运支六合化${szLiuhe.hua}${s>0?'+':''}${s}`);
  }
  const szSanhe = ZHI_SANHE[dayunZhi];
  if (szSanhe && szSanhe.group.includes(liunianZhi) && liunianZhi !== dayunZhi) {
    const s = heScore(szSanhe.hua, riGan, shen, 8);
    raw3 += s; parts.push(`岁运支三合${szSanhe.hua}局${s>0?'+':''}${s}`);
  }

  // 地支六冲
  if (ZHI_CHONGS[liunianZhi] === dayunZhi) {
    const lnType = lnZhiType;
    const dyType = zhiUseType(dayunZhi, riGan, shen);
    if (lnType === '喜用' && dyType === '喜用') {
      raw3 -= 8; parts.push(`岁运支喜用互冲（两败俱伤）-8`);
    } else if (dyType === '忌仇') {
      raw3 += 6; parts.push(`流年冲大运忌仇（制忌为吉）+6`);
    } else if (dyType === '喜用') {
      raw3 -= 10; parts.push(`流年冲大运喜用（破坏底色）-10`);
    } else {
      raw3 -= 4; parts.push(`岁运支相冲（闲神互冲）-4`);
    }
    // 岁破判定：流年支冲大运支
    shensha_signals.suipo_active = true;
    raw3 -= 4; parts.push(`岁破（流年支冲大运支）-4`);
  }

  // 岁破：流年支冲原局年支（若未与大运冲重复）
  if (!shensha_signals.suipo_active && yuanYearZhi && ZHI_CHONGS[liunianZhi] === yuanYearZhi) {
    shensha_signals.suipo_active = true;
    raw3 -= 6; parts.push(`岁破（流年支冲原局年支）-6`);
  }

  // 地支三刑（岁运）
  if (hasSanXing(liunianZhi, new Set([dayunZhi]))) {
    raw3 -= 10; parts.push(`岁运支三刑-10`);
  }

  // ── 3-B 神煞触发 ────────────────────────────────────────

  let shenshaRaw = 0;

  // 天乙贵人（以日干查，流年支命中）
  const tianyiStr = (G_SHENS['天乙'] || {})[riGan] || '';
  if (tianyiStr.includes(liunianZhi)) {
    shensha_signals.tianyi_active = true;
    const impact = calculateShenshaImpact({
      name: '天乙贵人',
      baseDelta: 5,
      zhi: liunianZhi,
      riGan,
      shen,
      referenceMonthZhi: yuanMonZhi,
      isVoid: isKongWang,
    });
    const pts = impact.finalDelta;
    shensha_signals.tianyi_delta = pts;
    shenshaRaw += pts;
    parts.push(`天乙贵人+${pts}（base=${impact.baseDelta}，qi=${impact.qiState}/${impact.qiRatio}，tier=${impact.tierLabel}/${impact.tierRatio}，void=${impact.voidRatio}）`);
  }

  // 文昌贵人
  const wenchangZhi = (G_SHENS['文昌'] || {})[riGan] || '';
  if (wenchangZhi === liunianZhi) {
    shensha_signals.wenchang_active = true;
    const impact = calculateShenshaImpact({
      name: '文昌贵人',
      baseDelta: 3,
      zhi: liunianZhi,
      riGan,
      shen,
      referenceMonthZhi: yuanMonZhi,
      isVoid: isKongWang,
    });
    const pts = impact.finalDelta;
    shensha_signals.wenchang_delta = pts;
    shenshaRaw += pts;
    parts.push(`文昌贵人+${pts}（base=${impact.baseDelta}，qi=${impact.qiState}/${impact.qiRatio}，tier=${impact.tierLabel}/${impact.tierRatio}，void=${impact.voidRatio}）`);
  }

  // 禄神（v2修正：以日干查禄位，判断流年支）
  const luZhi = LU_SHEN[riGan] || '';
  if (luZhi && luZhi === liunianZhi) {
    shensha_signals.lu_active = true;
    const impact = calculateShenshaImpact({
      name: '禄神',
      baseDelta: 3,
      zhi: liunianZhi,
      riGan,
      shen,
      referenceMonthZhi: yuanMonZhi,
      isVoid: isKongWang,
    });
    const pts = impact.finalDelta;
    shensha_signals.lu_delta = pts;
    shenshaRaw += pts; parts.push(`禄神（日干禄）+${pts}（×${xiJiRatio}）`);
  }

  // 驿马（以年支为主、日支为辅查驿马位，流年支命中即触发）
  // 传统以年支、日支均可起驿马，年支优先（《命理问真》"年、日支查余三支"）
  const yimaZhi = (yuanYearZhi && YIMA[yuanYearZhi]) || (yuanDayZhi && YIMA[yuanDayZhi]) || '';
  if (yimaZhi && yimaZhi === liunianZhi) {
    shensha_signals.yima_active = true;
    const yimaTier = getShiShenListTier(wuxingToSS(ZHI_WUHANGS[yimaZhi], riGan), shen);
    const impact = calculateShenshaImpact({
      name: '驿马',
      baseDelta: 3,
      zhi: liunianZhi,
      riGan,
      shen,
      referenceMonthZhi: yuanMonZhi,
      isVoid: isKongWang,
      nature: 'neutral',
    });
    if (yimaTier === 'yong' || yimaTier === 'xi') {
      shensha_signals.yima_delta = impact.finalDelta;
      shenshaRaw += impact.finalDelta; parts.push(`驿马（喜用方向）+${impact.finalDelta}`);
    } else if (yimaTier === 'ji' || yimaTier === 'chou') {
      const delta = -Math.max(1, Math.abs(impact.finalDelta));
      shensha_signals.yima_delta = delta;
      shenshaRaw += delta; parts.push(`驿马（忌仇方向）${delta}`);
    } else {
      shensha_signals.yima_delta = impact.finalDelta;
      shenshaRaw += impact.finalDelta; parts.push(`驿马（闲神）+${impact.finalDelta}`);
    }
  }

  // 岁德 / 岁德合
  if (yuanYearGan && liunianGan === yuanYearGan) {
    shensha_signals.suide_active = true;
    const impact = calculateShenshaImpact({
      name: '岁德',
      baseDelta: 5,
      zhi: liunianZhi,
      riGan,
      shen,
      referenceMonthZhi: yuanMonZhi,
      isVoid: isKongWang,
    });
    shensha_signals.suide_delta = impact.finalDelta;
    shenshaRaw += impact.finalDelta; parts.push(`岁德（流年干=年干）+${impact.finalDelta}（base=${impact.baseDelta}，qi=${impact.qiState}/${impact.qiRatio}，tier=${impact.tierLabel}/${impact.tierRatio}）`);
  } else {
    const suideHeHua = yuanYearGan ? ganHeHua(liunianGan, yuanYearGan) : '';
    if (suideHeHua) {
      shensha_signals.suide_he_active = true;
      const impact = calculateShenshaImpact({
        name: '岁德合',
        baseDelta: 4,
        zhi: liunianZhi,
        riGan,
        shen,
        referenceMonthZhi: yuanMonZhi,
        isVoid: isKongWang,
      });
      shensha_signals.suide_he_delta = impact.finalDelta;
      shenshaRaw += impact.finalDelta; parts.push(`岁德合（流年干合年干化${suideHeHua}）+${impact.finalDelta}（base=${impact.baseDelta}，qi=${impact.qiState}/${impact.qiRatio}，tier=${impact.tierLabel}/${impact.tierRatio}）`);
    }
  }

  const shenshaCapped = clamp(shenshaRaw, -4, 6);
  raw3 += shenshaCapped;
  if (shenshaCapped !== shenshaRaw) {
    parts.push(`神煞辅助层封顶${shenshaCapped - shenshaRaw > 0 ? '+' : ''}${shenshaCapped - shenshaRaw}（raw=${shenshaRaw}, cap=-4..6）`);
  }

  return {
    layer3_score: clamp(raw3, -12, 12),
    shensha_signals,
    suiyun_relations: parts.join('；') || '岁运无明显互动',
  };
}

// ── 主函数 ───────────────────────────────────────────────────────────────────

/**
 * calculateAnnualScore
 *
 * @param {Object} profile  八字档案
 *   profile.ri_zhu         日柱（如 "甲子"）
 *   profile.nian_zhu       年柱（如 "甲午"）
 *   profile.day_zhi        日支
 *   profile.month_zhi      月支
 *   profile.year_zhi       年支
 *   profile.year_gan       年干（可选，用于岁德）
 *   profile.favorable_elements   喜用神列表
 *   profile.unfavorable_elements 忌仇神列表
 *   profile.dayun_gz       当前大运干支（如 "甲子"）
 *   profile.liunian_gz     流年干支（如 "乙丑"）
 * @returns {Object} 年运算分结果
 */
function calculateAnnualScore(profile) {
  const riZhu     = profile.ri_zhu || '';
  const nianZhu   = profile.nian_zhu || profile.bazi_detail?.pillars?.ganzhi?.year || (profile.bazi_str ? profile.bazi_str.split(' ')[0] : '');
  const riGan     = riZhu.charAt(0);
  const shen      = normalizeShenProfile(profile);

  const yuanDayZhi  = profile.day_zhi   || '';
  const yuanMonZhi  = profile.month_zhi || '';
  const yuanYearZhi = profile.year_zhi  || '';
  const yuanYearGan = profile.year_gan  || (nianZhu ? nianZhu.charAt(0) : '');

  const dayun_gz   = profile.dayun_gz  || profile.current_dayun_gz  || '';
  const liunian_gz = profile.liunian_gz || profile.current_liunian_gz || '';
  const dayunGan   = dayun_gz.charAt(0);
  const dayunZhi   = dayun_gz.charAt(1);
  const liunianGan = liunian_gz.charAt(0);
  const liunianZhi = liunian_gz.charAt(1);
  const kongwangSet = getKongwangSet(riZhu, nianZhu);
  const is_kongwang = kongwangSet.has(liunianZhi);

  // ── 三层计算 ───────────────────────────────────────────────────────────────
  const l1 = calculateLayer1({ riGan, dayunGan, dayunZhi, yuanDayZhi, yuanMonZhi, yuanYearZhi, shen });
  const l2 = calculateLayer2({ riGan, riZhu, liunianGan, liunianZhi, yuanDayZhi, yuanMonZhi, yuanYearZhi, yuanYearGan, shen });
  const l3 = calculateLayer3({ riGan, yuanYearGan, dayunGan, dayunZhi, liunianGan, liunianZhi, yuanDayZhi, yuanMonZhi, yuanYearZhi, shen, isKongWang: is_kongwang });

  // ── 空亡（日柱 union 年柱旬空亡） ─────────────────────────────────────────
  const lnZhiType   = zhiUseType(liunianZhi, riGan, shen);
  const kongwang_type = is_kongwang ? (lnZhiType === '喜用' ? 'xiyong' : lnZhiType === '忌仇' ? 'jichou' : 'none') : 'none';

  // 喜用落空：layer3_score 衰减
  let layer3_final = l3.layer3_score;
  if (is_kongwang && kongwang_type === 'xiyong') {
    layer3_final = Math.round(layer3_final * 0.8);
  }

  // ── 合计 raw ──────────────────────────────────────────────────────────────
  let raw = 70 + l1.layer1_score + l2.layer2_score + layer3_final;
  const rawBeforeTiaohou = raw;

  // 调候拦截器：气候偏枯时整体打折（以流年天干查调候）
  const tiaohouRatio = calculateTiaohouRatio(profile, liunianGan);
  if (tiaohouRatio.ratio !== 1.0) raw = Math.round(raw * tiaohouRatio.ratio);
  const rawAfterTiaohou = raw;
  const rawBeforeCaps = raw;
  const capLabels = [];

  // ── 全局压顶（取最严格者） ──────────────────────────────────────────────
  // 大运三刑 → max 80
  if (l1.dayun_sanxing) {
    raw = Math.min(raw, 80);
    capLabels.push('大运三刑');
  }
  // 流年三刑 → max 82（流年力量弱于大运，上限略宽）
  if (l2.liunian_sanxing) {
    raw = Math.min(raw, 82);
    capLabels.push('流年三刑');
  }
  // 忌神本命年 OR 自刑 → max 88（双轨惩罚有意设计）
  if ((l2.is_benmingnian && lnZhiType === '忌仇') || l2.is_zixing) {
    raw = Math.min(raw, 88);
    capLabels.push(l2.is_zixing ? '自刑' : '忌神本命年');
  }
  // 喜用落空 → max 85
  if (is_kongwang && kongwang_type === 'xiyong') {
    raw = Math.min(raw, 85);
    capLabels.push('喜用空亡');
  }

  const annual_score = Math.min(98, Math.max(45, Math.round(raw)));

  // ── 岁运互动摘要（合并 layer2 + layer3 的 detail） ────────────────────────
  const year_relations   = l2.layer2_detail;
  const suiyun_relations = l3.suiyun_relations;
  const score_hits = buildAnnualScoreHits({
    finalScore: annual_score,
    rawBeforeCaps,
    rawBeforeTiaohou,
    rawAfterTiaohou,
    tiaohouRatio: tiaohouRatio.ratio,
    capLabels,
    layer1: l1,
    layer2: l2,
    layer3: { ...l3, layer3_score: layer3_final },
    isKongWang: is_kongwang,
  });
  const tiaohouHit = tiaohouToHit(tiaohouRatio);
  if (tiaohouHit) {
    score_hits.layers.push({
      layer: 'tiaohou',
      label: '调候修正层',
      score: rawAfterTiaohou - rawBeforeTiaohou,
      hits: [tiaohouHit],
    });
  }

  return {
    annual_score,
    layer1_score: l1.layer1_score,
    layer2_score: l2.layer2_score,
    layer3_score: layer3_final,

    // 核心状态
    is_kongwang,
    kongwang_type,
    is_benmingnian: l2.is_benmingnian,
    is_zixing:      l2.is_zixing,
    dayun_sanxing:  l1.dayun_sanxing,
    liunian_sanxing: l2.liunian_sanxing,

    // 供断语使用
    dayun_gz:            l1.dayun_gz,
    liunian_gz:          l2.liunian_gz,
    dayun_gan_shishen:   l1.dayun_gan_shishen,
    liunian_gan_shishen: l2.liunian_gan_shishen,
    dayun_qi_status:     l1.dayun_qi_status,
    year_relations,
    suiyun_relations,

    // 神煞
    shensha_signals: l3.shensha_signals,
    score_hits,

    // 分层明细（调试 & 断语）
    layer1_detail: l1.layer1_detail,
    layer2_detail: l2.layer2_detail,
    layer3_detail: l3.suiyun_relations,
  };
}

module.exports = { calculateAnnualScore };
