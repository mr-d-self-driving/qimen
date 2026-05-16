'use strict';

/**
 * normalizeShenProfile.js
 * ──────────────────────────────────────────────────────────────────────────────
 * 用神四维体系共享工具模块
 *
 * 理论依据：《滴天髓》、陆致极《命运的求索》
 *   用神（药）→ 直接克病，权重最高
 *   喜神（援军）→ 生扶用神，次级
 *   忌神（病）→ 克用或耗日主，致凶根源
 *   仇神（援敌）→ 生助忌神，间接放大
 *   闲神 → 与喜忌无明显关联
 *
 * 向后兼容：若 profile 只有旧格式字段（favorable_elements / unfavorable_elements），
 * 则 favorable_elements → yong_shen，unfavorable_elements → ji_shen，xi/chou 为空。
 * ──────────────────────────────────────────────────────────────────────────────
 */

const SHISHEN_ALIASES = {
  印星: ['正印', '偏印'],
  比劫: ['比肩', '劫财'],
  官杀: ['正官', '七杀'],
  食伤: ['食神', '伤官'],
  财星: ['正财', '偏财'],
};

function normalizeList(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return String(val).split(/[、,，\s]+/).map(s => s.trim()).filter(Boolean);
}

/** 别名感知的单项查找 */
function listIncludesShiShen(list, shiShen) {
  return list.some(item => item === shiShen || (SHISHEN_ALIASES[item] || []).includes(shiShen));
}

/** 别名感知的集合交叉判断 */
function listIntersectsShiShen(list, shiShenList) {
  return shiShenList.some(ss => listIncludesShiShen(list, ss));
}

/**
 * 将 profile 规范化为四维用神结构 { yong, xi, ji, chou }。
 * 每个字段均为字符串数组，支持别名（如 "印星"）。
 */
function normalizeShenProfile(profile) {
  const hasNew = Boolean(profile.yong_shen || profile.xi_shen || profile.ji_shen || profile.chou_shen);
  if (hasNew) {
    return {
      yong: normalizeList(profile.yong_shen),
      xi:   normalizeList(profile.xi_shen),
      ji:   normalizeList(profile.ji_shen),
      chou: normalizeList(profile.chou_shen),
    };
  }
  // 旧格式降级
  return {
    yong: normalizeList(profile.favorable_elements),
    xi:   [],
    ji:   normalizeList(profile.unfavorable_elements),
    chou: [],
  };
}

/**
 * 获取单个十神的四维层级。
 * @returns {'yong'|'xi'|'ji'|'chou'|'xian'}
 */
function getShiShenTier(shiShen, shen) {
  if (listIncludesShiShen(shen.yong,  shiShen)) return 'yong';
  if (listIncludesShiShen(shen.xi,    shiShen)) return 'xi';
  if (listIncludesShiShen(shen.ji,    shiShen)) return 'ji';
  if (listIncludesShiShen(shen.chou,  shiShen)) return 'chou';
  return 'xian';
}

/**
 * 对一组十神列表取最高优先级层级。
 * 优先级：yong > xi > ji > chou > xian
 */
function getShiShenListTier(shiShenList, shen) {
  const ORDER = ['yong', 'xi', 'ji', 'chou'];
  const tiers = new Set(shiShenList.map(ss => getShiShenTier(ss, shen)));
  for (const t of ORDER) {
    if (tiers.has(t)) return t;
  }
  return 'xian';
}

/** 四维中文标签（用于断语 display） */
const TIER_LABELS = {
  yong: '用神',
  xi:   '喜神',
  ji:   '忌神',
  chou: '仇神',
  xian: '闲神',
};

/**
 * 四维层级 → 旧格式兼容标签。
 * 用于需要 '喜用' / '忌仇' / '闲' 三分的逻辑分支。
 */
function tierToCompatLabel(tier) {
  if (tier === 'yong' || tier === 'xi')   return '喜用';
  if (tier === 'ji'   || tier === 'chou') return '忌仇';
  return '闲';
}

module.exports = {
  normalizeShenProfile,
  getShiShenTier,
  getShiShenListTier,
  listIncludesShiShen,
  listIntersectsShiShen,
  normalizeList,
  SHISHEN_ALIASES,
  TIER_LABELS,
  tierToCompatLabel,
};
