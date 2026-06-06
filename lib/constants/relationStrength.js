'use strict';

/**
 * 干支关系强度体系
 *
 * 理论依据：
 * - 三会 > 三合 > 六冲 > 三刑 > 六合 > 六害 > 破 > 暗合 > 拱合
 * - 陆致极《动态分析教程》：冲有"旺者冲衰"之分，合有"化与不化"之分
 * - 《滴天髓》："旺者冲衰衰者拔，衰神冲旺旺神发"
 *
 * effective_strength = base_weight × vigor_modifier
 *
 * - 合类（六合/三合/天干五合）：vigor = avg(双方旺衰)，双方都弱则合力衰
 * - 冲/刑类：vigor = max(双方旺衰)，有一方旺则冲力仍在
 * - 合化成立时加成；合而不化时打折
 */

// ─────────────────────────────────────────────────────────────
// 1. 关系类型基础权重（0–100）
//    每种关系的"最大可能强度"——在双方都处于帝旺时的强度
// ─────────────────────────────────────────────────────────────

const RELATION_BASE_WEIGHT = {
  // 合类（结合性关系）
  三会:         100,  // 方局，三字全，最强，势不可当
  三合:          85,  // 三合全局
  半三合:        45,  // 三合只来两字，化力减半
  六合_化:       60,  // 六合且合化成立（五行改变）
  六合_不化:     30,  // 六合但合而不化（羁绊）
  天干五合_化:   55,  // 天干五合且化气成立
  天干五合_不化: 25,  // 天干五合但合而不化
  暗合:          15,  // 地支藏干之间的隐性合，力量微弱
  拱合:          10,  // 虚拱夹合，最弱，"不逢填实则有效"

  // 冲/克类（对抗性关系）
  六冲:          80,  // 直接对冲，破坏力强
  天干相克:      40,  // 天干之间的克制
  三刑_三字:     70,  // 三刑完整（寅巳申/丑戌未），结构破坏最重
  三刑_两字:     45,  // 子卯相刑，只有两字参与
  自刑:          30,  // 辰午酉亥自刑，内部消耗

  // 阻滞类
  六害:          35,  // "因合生害"，阻滞中等
  破:            20,  // 最弱的破坏关系
};

// ─────────────────────────────────────────────────────────────
// 2. 十二长生旺衰系数（0.0 – 1.0）
//    反映支/干的实际能量状态，用于修正基础权重
//
//    来源：陆致极六十甲子内涵表：
//      帝旺/临官 = 4分（最强），死/绝 = 1分（最弱）
//      此处归一化到 0–1 区间
// ─────────────────────────────────────────────────────────────

const PHASE_VIGOR = {
  帝旺: 1.00,
  临官: 0.90,
  长生: 0.75,
  冠带: 0.65,
  沐浴: 0.50,
  养:   0.45,
  胎:   0.40,
  衰:   0.35,
  病:   0.25,
  死:   0.15,
  墓:   0.10,
  绝:   0.05,
};

// ─────────────────────────────────────────────────────────────
// 3. 旺衰系数计算（空亡额外打折）
// ─────────────────────────────────────────────────────────────

/**
 * 计算单个干/支的旺衰系数
 * @param {string}  phase      - 十二长生阶段（从 getDiShi 获取）
 * @param {boolean} isKong     - 是否空亡
 * @param {string}  zhiElement - 所在地支的五行（用于空亡五行分化）
 * @returns {number} 0.0 – 1.0
 *
 * 空亡五行分化依据《三命通会》：
 *   金空则响、火空则明 → 空亡不减力（激发）
 *   水空则清            → 轻微折减（×0.7）
 *   木空则折、土空则崩 → 大折扣（×0.4）
 */
function getVigor(phase, isKong = false, zhiElement = null) {
  const base = PHASE_VIGOR[phase] ?? 0.5;
  if (!isKong) return base;

  if (zhiElement === '金' || zhiElement === '火') return base;   // 空亡不减
  if (zhiElement === '水') return base * 0.7;                   // 轻减
  return base * 0.4;                                            // 木、土：大折扣
}

// ─────────────────────────────────────────────────────────────
// 4. 有效强度计算
//    合类：双方都强才合力足，取平均（双弱则合力衰）
//    冲/刑类：有一方旺则冲力存在，取较大方（决定"谁冲谁"）
//    阻滞类（害/破）：取发起方的旺衰
// ─────────────────────────────────────────────────────────────

/**
 * 计算有效强度（0–100）
 *
 * @param {string} relationType   - RELATION_BASE_WEIGHT 中的 key
 * @param {number} targetVigor    - 目标元素的旺衰系数 (0–1)
 * @param {number} partnerVigor   - 对方元素的旺衰系数 (0–1)
 * @returns {number} effective_strength，保留1位小数
 */
function calcEffectiveStrength(relationType, targetVigor, partnerVigor) {
  const base = RELATION_BASE_WEIGHT[relationType] ?? 20;

  let vigorMod;
  if (HE_TYPES.has(relationType)) {
    // 合类：双方均需有力，取平均
    vigorMod = (targetVigor + partnerVigor) / 2;
  } else if (CHONG_XING_TYPES.has(relationType)) {
    // 冲/刑类：取较大方（旺神主导冲方向）
    vigorMod = Math.max(targetVigor, partnerVigor);
  } else {
    // 害/破/暗合/拱合：发起方（目标方）主导
    vigorMod = targetVigor;
  }

  return Math.round(base * vigorMod * 10) / 10;
}

const HE_TYPES = new Set([
  '三会', '三合', '半三合',
  '六合_化', '六合_不化',
  '天干五合_化', '天干五合_不化',
  '暗合', '拱合',
]);

const CHONG_XING_TYPES = new Set([
  '六冲', '天干相克',
  '三刑_三字', '三刑_两字', '自刑',
]);

// ─────────────────────────────────────────────────────────────
// 5. 强度分级（用于 status_tags / prompt 中的文字描述）
// ─────────────────────────────────────────────────────────────

/**
 * 将数值强度转为定性级别
 * @param {number} score - effective_strength
 * @returns {'dominant'|'strong'|'moderate'|'weak'|'latent'}
 */
function strengthTier(score) {
  if (score >= 75) return 'dominant';  // 压倒性，主导命局走向
  if (score >= 50) return 'strong';    // 明显，肉眼可察觉的影响
  if (score >= 25) return 'moderate';  // 中等，有影响但可被其他关系抵消
  if (score >= 10) return 'weak';      // 弱，需要叠加才能显现
  return 'latent';                      // 潜伏，几乎不起作用
}

const STRENGTH_TIER_LABEL = {
  dominant: '强烈',
  strong:   '较强',
  moderate: '中等',
  weak:     '较弱',
  latent:   '潜伏',
};

// ─────────────────────────────────────────────────────────────
// 6. "谁冲谁"方向判断（仅用于冲/克关系）
//    旺者冲衰：targetVigor > partnerVigor → target 冲赢
//    衰者冲旺：targetVigor < partnerVigor → partner 反激
// ─────────────────────────────────────────────────────────────

/**
 * 判断冲克关系中目标元素是主动方还是被动方
 * @param {number} targetVigor
 * @param {number} partnerVigor
 * @returns {'wins'|'loses'|'equal'}
 */
function clashDirection(targetVigor, partnerVigor) {
  const diff = targetVigor - partnerVigor;
  if (diff > 0.15) return 'wins';   // 目标方旺，冲赢
  if (diff < -0.15) return 'loses'; // 目标方衰，被冲拔
  return 'equal';                    // 势均力敌，两败俱伤
}

module.exports = {
  RELATION_BASE_WEIGHT,
  PHASE_VIGOR,
  getVigor,
  calcEffectiveStrength,
  strengthTier,
  STRENGTH_TIER_LABEL,
  clashDirection,
  HE_TYPES,
  CHONG_XING_TYPES,
};
