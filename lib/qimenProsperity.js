/**
 * 奇门旺衰（旺相休囚死）计算
 *
 * 口径：以「天盘九星的五行」为主体，结合月令（节气月支）所属季节的当令五行，
 * 判其旺相休囚死。这是奇门遁甲最标准的「旺衰」概念，作为评分引擎里 evaluatePalace
 * 的能量底板（ground）。与 scoreStar 的吉凶维度互补——同一颗星既论吉凶，又论能量旺衰。
 *
 * 旺相休囚死定义（设当令五行为 S，待判五行为 X）：
 *   X === S          → 旺（同令，最旺）
 *   S 生 X           → 相（令神生我，次旺）
 *   X 生 S           → 休（我生令神，泄气退休）
 *   X 克 S           → 囚（我克令神，受抑被囚）
 *   S 克 X           → 死（令神克我，最衰）
 *
 * 注意：evaluatePalace 的 ground 档位只对 旺/相/囚/死 加减分，「休」视为中性（0），
 * 但本函数仍如实返回「休」字符串，供 prompt 显示真实状态。
 */

// 天盘九星五行（键用规范化后的简体星名，不含「星」后缀）
const NINE_STAR_ELEMENT = {
  天蓬: '水',
  天任: '土',
  天冲: '木',
  天辅: '木',
  天英: '火',
  天芮: '土',
  天柱: '金',
  天心: '金',
  天禽: '土'
};

// 月支 → 当令季节五行（按节气定月令；辰戌丑未为四季土月）
const MONTH_BRANCH_ELEMENT = {
  寅: '木', 卯: '木',
  巳: '火', 午: '火',
  申: '金', 酉: '金',
  亥: '水', 子: '水',
  辰: '土', 戌: '土', 丑: '土', 未: '土'
};

// 五行相生：木→火→土→金→水→木
const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
// 五行相克：木→土→水→火→金→木
const CONTROLS = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };

/** 规范化星名：去掉「星」后缀、统一繁简（輔→辅、沖→冲） */
function normalizeStarName(value) {
  return String(value == null ? '' : value)
    .trim()
    .replace(/輔/g, '辅')
    .replace(/沖/g, '冲')
    .replace(/星$/, '');
}

/** 取九星五行 */
function getStarElement(starName) {
  return NINE_STAR_ELEMENT[normalizeStarName(starName)] || '';
}

/** 取月支当令五行；入参可为单字月支或完整月柱（如「戊午」取「午」） */
function getSeasonElement(monthBranchOrPillar) {
  const raw = String(monthBranchOrPillar == null ? '' : monthBranchOrPillar).trim();
  if (!raw) return '';
  // 完整月柱取地支（末字）；单字直接用
  const branch = raw.length >= 2 ? raw.slice(-1) : raw;
  return MONTH_BRANCH_ELEMENT[branch] || '';
}

/** 由「待判五行」与「当令五行」推旺相休囚死 */
function prosperityOf(targetElement, seasonElement) {
  if (!targetElement || !seasonElement) return '';
  if (targetElement === seasonElement) return '旺';
  if (GENERATES[seasonElement] === targetElement) return '相'; // 令神生我
  if (GENERATES[targetElement] === seasonElement) return '休'; // 我生令神
  if (CONTROLS[targetElement] === seasonElement) return '囚'; // 我克令神
  if (CONTROLS[seasonElement] === targetElement) return '死'; // 令神克我
  return '';
}

/**
 * 取某宫九星在指定月令下的旺衰档位。
 * @param {string} starName 九星名（繁/简、含「星」后缀皆可）
 * @param {string} monthBranchOrPillar 月支或月柱
 * @returns {''|'旺'|'相'|'休'|'囚'|'死'}
 */
function getNineStarProsperity(starName, monthBranchOrPillar) {
  return prosperityOf(getStarElement(starName), getSeasonElement(monthBranchOrPillar));
}

/**
 * 为宫位数组按月令补 prosperity 字段（已有 prosperity 的宫保持不变）。
 * 这是生产路径（worker 构建 timingPalaces）调用的入口。
 * @param {Array<object>} palaces 含 star 字段的宫位数组
 * @param {string} monthBranchOrPillar 月支或月柱
 * @returns {Array<object>} 新数组，每宫补上 prosperity
 */
function annotateProsperity(palaces, monthBranchOrPillar) {
  if (!Array.isArray(palaces)) return palaces;
  const season = getSeasonElement(monthBranchOrPillar);
  return palaces.map((palace) => {
    if (palace && palace.prosperity) return palace; // 已有则尊重
    const prosperity = prosperityOf(getStarElement(palace && palace.star), season);
    return prosperity ? { ...palace, prosperity } : palace;
  });
}

module.exports = {
  NINE_STAR_ELEMENT,
  MONTH_BRANCH_ELEMENT,
  normalizeStarName,
  getStarElement,
  getSeasonElement,
  prosperityOf,
  getNineStarProsperity,
  annotateProsperity
};
