'use strict';

/**
 * calculateTiaohouRatio.js
 * ──────────────────────────────────────────────────────────────────────────────
 * 调候拦截器模块（依据《穷通宝鉴》）
 *
 * 理论依据：
 *   《穷通宝鉴》以调候用神为最高优先级，代表命主得以生存的基本气候环境条件。
 *   当流年/流月天干满足命局急需的调候用神时，给予加成；
 *   当流年/流月天干加剧命局的偏枯（寒/热/燥/湿失衡）时，给予折损。
 *   陆致极《八字命理学进阶教程》亦明确："调候为急，调候不足，格局再好亦打折。"
 *
 * TIAOHOUS 表格式："1丙2_癸"
 *   数字 = 优先级（1 为最重要）
 *   无前缀 = 调候需要的用神干
 *   _ 前缀 = 调候忌用干（加剧偏枯）
 * ──────────────────────────────────────────────────────────────────────────────
 */

const { TIAOHOUS } = require('./constants/tiaohou');

/**
 * 解析调候规格字符串。
 * 例："1丙2_癸3壬" → { p1: '丙', favorable: ['丙','壬'], unfavorable: ['癸'] }
 */
function parseTiaohouSpec(spec) {
  if (!spec) return { p1: '', favorable: [], unfavorable: [] };
  const tokens = spec.match(/\d_?[甲乙丙丁戊己庚辛壬癸]/g) || [];
  let p1 = '';
  const favorable = [];
  const unfavorable = [];
  for (const token of tokens) {
    const hasUnderscore = token.includes('_');
    const gan = token.slice(-1);
    if (hasUnderscore) {
      unfavorable.push(gan);
    } else {
      favorable.push(gan);
      if (!p1) p1 = gan; // 优先级最高的调候用神
    }
  }
  return { p1, favorable, unfavorable };
}

/**
 * 计算流年/流月天干对命局的调候影响系数。
 *
 * @param {Object} profile        命主档案
 * @param {string} profile.ri_zhu 日柱（如 "甲午"），取首字作日干
 * @param {string} profile.month_zhi 命主出生月支（如 "巳"），用于查调候表
 * @param {string} flowGan        流年/流月天干（单字，如 "丙"）
 *
 * @returns {{
 *   ratio: number,       乘数（1.0 = 无影响，>1.0 = 加成，<1.0 = 折损）
 *   tier: string,        'satisfied_p1'|'satisfied'|'worsened'|'neutral'
 *   display: string,     断语文本
 *   debug: string        调试信息
 * }}
 */
function calculateTiaohouRatio(profile, flowGan) {
  const riGan = (profile.ri_zhu || '').charAt(0);
  const monthZhi = profile.month_zhi || '';

  const fallback = { ratio: 1.0, tier: 'neutral', display: '', debug: 'no tiaohou spec found' };

  if (!riGan || !monthZhi || !flowGan) return fallback;

  const key = riGan + monthZhi;
  const spec = TIAOHOUS[key];
  if (!spec) return { ...fallback, debug: `no spec for key=${key}` };

  const { p1, favorable, unfavorable } = parseTiaohouSpec(spec);

  if (flowGan === p1) {
    return {
      ratio: 1.08,
      tier: 'satisfied_p1',
      display: `流年天干[${flowGan}]为命局第一调候用神，寒暖得宜，气候环境显著改善，运势有额外加成。`,
      debug: `tiaohou key=${key}, spec=${spec}, flowGan=${flowGan} === p1, ratio=1.08`,
    };
  }

  if (favorable.includes(flowGan)) {
    return {
      ratio: 1.04,
      tier: 'satisfied',
      display: `流年天干[${flowGan}]补足命局调候需求，寒暖燥湿趋于平衡，运势小幅加成。`,
      debug: `tiaohou key=${key}, spec=${spec}, flowGan=${flowGan} in favorable, ratio=1.04`,
    };
  }

  if (unfavorable.includes(flowGan)) {
    return {
      ratio: 0.93,
      tier: 'worsened',
      display: `流年天干[${flowGan}]加剧命局气候偏枯，调候失衡，无论格局如何，运势底色折损。`,
      debug: `tiaohou key=${key}, spec=${spec}, flowGan=${flowGan} in unfavorable, ratio=0.93`,
    };
  }

  return {
    ratio: 1.0,
    tier: 'neutral',
    display: '',
    debug: `tiaohou key=${key}, spec=${spec}, flowGan=${flowGan} not in favorable/unfavorable, ratio=1.0`,
  };
}

/**
 * 将调候结果转化为 score_hits 格式的 hit 条目（仅在 ratio ≠ 1.0 时返回）。
 */
function tiaohouToHit(tiaohouResult) {
  if (tiaohouResult.tier === 'neutral' || !tiaohouResult.display) return null;
  const isPositive = tiaohouResult.ratio > 1.0;
  return {
    code: `tiaohou_${tiaohouResult.tier}`,
    type: isPositive ? 'positive' : 'negative',
    delta_raw: `×${tiaohouResult.ratio.toFixed(2)}`,
    display: tiaohouResult.display,
    debug: tiaohouResult.debug,
    meta: { ratio: tiaohouResult.ratio, tier: tiaohouResult.tier },
  };
}

module.exports = { calculateTiaohouRatio, tiaohouToHit, parseTiaohouSpec };
