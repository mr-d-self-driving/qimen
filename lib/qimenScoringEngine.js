const { detectPolarityOverrides } = require('./qimenPolarityRules');

const SCORE_VERSION = 'qimen-score-v3';
const NEUTRAL_SCORE = 60;

const PALACE_ELEMENTS_BY_INDEX = ['木', '火', '土', '木', '土', '金', '土', '水', '金'];
const GOOD_DOORS = new Set(['休门', '生门', '开门']);
const MIXED_DOORS = new Set(['杜门', '景门']);
const WARNING_DOORS = new Set(['伤门', '死门', '惊门']);
// 大吉星（天时主导，教材：天时占综合力量50%以上）
const GREAT_STARS = new Set(['天辅', '天心']);
// 小吉星
const GOOD_STARS = new Set(['天任', '天禽']);
// 大凶星
const GREAT_WARNING_STARS = new Set(['天芮', '天蓬']);
// 小凶星
const WARNING_STARS = new Set(['天柱']);
const GOOD_GODS = new Set(['值符', '太阴', '六合', '九天', '九地']);
const WARNING_GODS = new Set(['白虎', '玄武', '腾蛇', '滕蛇', '朱雀', '勾陈']);

const GENERATES = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木'
};

const CONTROLS = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木'
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function signed(value) {
  return value > 0 ? `+${value}` : String(value);
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeDoor(value) {
  return normalizeText(value).replace(/門/g, '门');
}

function normalizeStar(value) {
  return normalizeText(value).replace(/輔/g, '辅').replace(/沖/g, '冲').replace(/蓬/g, '蓬');
}

function normalizeGod(value) {
  return normalizeText(value).replace(/騰/g, '腾');
}

function getPalaceElement(palace = {}) {
  return palace.element || PALACE_ELEMENTS_BY_INDEX[palace.index] || '';
}

function moveScoreTowardNeutral(score, factor = 0.5) {
  return Math.round(NEUTRAL_SCORE + (score - NEUTRAL_SCORE) * factor);
}

function relationBetween(fromElement, toElement) {
  if (!fromElement || !toElement) return 'unknown';
  if (fromElement === toElement) return 'same';
  if (GENERATES[fromElement] === toElement) return 'generate';
  if (CONTROLS[fromElement] === toElement) return 'control';
  if (GENERATES[toElement] === fromElement) return 'leak';
  if (CONTROLS[toElement] === fromElement) return 'controlled_by';
  return 'unknown';
}

function scoreDoor(doorInput, intent = {}, polarityByPalace = new Map(), palaceName = '') {
  const door = normalizeDoor(doorInput);
  const override = polarityByPalace.get(`${palaceName}:${door}`) || polarityByPalace.get(door);
  if (override) {
    if (override.domain_polarity === 'positive_with_risk') return { delta: 3, label: '语境转义为可用但有风险' };
    if (override.domain_polarity === 'mixed_or_positive') return { delta: 2, label: '语境转义为偏可用' };
    if (override.domain_polarity === 'warning') return { delta: -4, label: '语境下仍为警示' };
  }

  if (GOOD_DOORS.has(door)) return { delta: 4, label: '吉门得用' };
  if (MIXED_DOORS.has(door)) return { delta: intent.category === 'career_business' && door === '杜门' ? -2 : 0, label: '中性门需看语境' };
  if (WARNING_DOORS.has(door)) return { delta: -4, label: '凶门警示' };
  return { delta: 0, label: '门象中性' };
}

function scoreStar(starInput) {
  const star = normalizeStar(starInput);
  if (GREAT_STARS.has(star)) return { delta: 5, label: '大吉星天时有力' };
  if (GOOD_STARS.has(star)) return { delta: 3, label: '吉星扶助' };
  if (GREAT_WARNING_STARS.has(star)) return { delta: -5, label: '大凶星天时阻力重' };
  if (WARNING_STARS.has(star)) return { delta: -3, label: '星象带阻力' };
  return { delta: 0, label: '星象中性' };
}

function scoreGod(godInput) {
  const god = normalizeGod(godInput);
  if (GOOD_GODS.has(god)) return { delta: 2, label: '吉神扶助' };
  if (WARNING_GODS.has(god)) return { delta: -2, label: '神煞警示' };
  return { delta: 0, label: '八神中性' };
}

// 六仪击刑: sky stem falling in the punishment palace index
const LIU_YI_XING_MAP = new Map([
  ['戊', 3], // 震三宫
  ['己', 2], // 坤二宫
  ['庚', 6], // 艮八宫
  ['辛', 1], // 离九宫
  ['壬', 0], // 巽四宫
  ['癸', 0]  // 巽四宫
]);

const NAMED_FORMATIONS = [
  // 吉格 — 天地盘干组合
  { name: '飞鸟跌穴', sky: '丙', earth: '戊', domainDeltas: { default: 12, health_action: -10 } },
  { name: '青龙返首', sky: '戊', earth: '丙', domainDeltas: { default: 10, health_action: -8 } },
  { name: '日月并行', sky: '丙', earth: '乙', domainDeltas: { default: 5, relationship: 6 } },
  { name: '奇仪相佐', sky: '乙', earth: '丁', domainDeltas: { default: 4, exam_study: 6 } },
  { name: '青龙转光', sky: '丁', earth: '戊', domainDeltas: { default: 4 } },
  { name: '青龙耀明', sky: '戊', earth: '丁', domainDeltas: { default: 3 } },
  { name: '星奇入太阴', sky: '丁', earth: '丁', domainDeltas: { default: 6 } },
  { name: '奇仪相合·乙庚', sky: '乙', earth: '庚', domainDeltas: { default: 4, relationship: 5 } },
  { name: '奇仪相合·丙辛', sky: '丙', earth: '辛', domainDeltas: { default: 4, relationship: 5 } },
  { name: '奇仪相合·丁壬', sky: '丁', earth: '壬', domainDeltas: { default: 4, relationship: 5 } },
  { name: '奇仪相合·戊癸', sky: '戊', earth: '癸', domainDeltas: { default: 3 } },
  // 凶格 — 天地盘干组合
  { name: '青龙逃走', sky: '乙', earth: '辛', domainDeltas: { default: -12, health_action: 5 } },
  { name: '白虎猖狂', sky: '辛', earth: '乙', domainDeltas: { default: -12 } },
  { name: '朱雀投江', sky: '丁', earth: '癸', domainDeltas: { default: -10, health_action: -14 } },
  { name: '螣蛇夭矫', sky: '癸', earth: '丁', domainDeltas: { default: -10, relationship: -6 } },
  { name: '太白入荧', sky: '庚', earth: '丙', domainDeltas: { default: -6, health_action: -8, lawsuit_legal: -8 } },
  { name: '荧入太白', sky: '丙', earth: '庚', domainDeltas: { default: -6, health_action: 6, lawsuit_legal: 5 } },
  { name: '大格', sky: '庚', earth: '癸', domainDeltas: { default: -10, relationship: -12 } },
  { name: '小格', sky: '庚', earth: '壬', domainDeltas: { default: -5 } },
  { name: '伏宫格', sky: '庚', earth: '戊', domainDeltas: { default: -8 } },
  { name: '飞宫格', sky: '戊', earth: '庚', domainDeltas: { default: -8 } },
  { name: '刑格', sky: '庚', earth: '己', domainDeltas: { default: -8, lawsuit_legal: -10 } },
  { name: '天网四张', sky: '癸', earth: '癸', domainDeltas: { default: -8 } },
  { name: '地网遮蔽', sky: '壬', earth: '壬', domainDeltas: { default: -6 } },
  // 凶格 — 结构格（宫位+天干组合）
  { name: '六仪击刑', type: 'liu_yi_ji_xing', domainDeltas: { default: -15 } },
  { name: '三奇入墓·乙', type: 'san_qi_ru_mu', qi: '乙', palaceIndices: [8, 2], domainDeltas: { default: -10, finance_wealth: -8, relationship: -6 } },
  { name: '三奇入墓·丙', type: 'san_qi_ru_mu', qi: '丙', palaceIndices: [8], domainDeltas: { default: -10, finance_wealth: -8, relationship: -6 } },
  { name: '三奇入墓·丁', type: 'san_qi_ru_mu', qi: '丁', palaceIndices: [6], domainDeltas: { default: -10, finance_wealth: -8, relationship: -6 } }
];

function detectNamedFormation(formation, palaces) {
  const type = formation.type || 'sky_earth_pair';
  if (type === 'sky_earth_pair') {
    return palaces.some((p) => normalizeText(p.sky) === formation.sky && normalizeText(p.earth) === formation.earth);
  }
  if (type === 'liu_yi_ji_xing') {
    // 六仪 (戊己庚辛壬癸) are on the earth board (地盘)
    return palaces.some((p) => {
      const xingIndex = LIU_YI_XING_MAP.get(normalizeText(p.earth));
      return xingIndex !== undefined && p.index === xingIndex;
    });
  }
  if (type === 'san_qi_ru_mu') {
    // 三奇 (乙丙丁) are on the sky board (天盘)
    return palaces.some((p) => normalizeText(p.sky) === formation.qi && formation.palaceIndices.includes(p.index));
  }
  return false;
}

function evaluateNamedFormation(palaces, intent = {}) {
  const category = intent.category || 'general';
  const hits = [];
  let total = 0;
  const firedSignals = new Set();

  for (const formation of NAMED_FORMATIONS) {
    if (!detectNamedFormation(formation, palaces)) continue;
    const delta = Object.prototype.hasOwnProperty.call(formation.domainDeltas, category)
      ? formation.domainDeltas[category]
      : formation.domainDeltas.default;
    total += delta;
    if (formation.sky && formation.earth) firedSignals.add(`${formation.sky}+${formation.earth}`);
    hits.push({
      layer: 'named_formation',
      signal: formation.name,
      effect: signed(delta),
      reason: `命中有名格「${formation.name}」，领域「${category}」下评分 ${signed(delta)}。`
    });
  }

  return { namedFormationDelta: clamp(total, -20, 20), hits, firedSignals };
}

function buildPolarityMaps(overrides = []) {
  const map = new Map();
  for (const override of overrides) {
    if (override.door) {
      map.set(`${override.palace || ''}:${normalizeDoor(override.door)}`, override);
      map.set(normalizeDoor(override.door), override);
    }
    if (override.signal) map.set(override.signal, override);
  }
  return map;
}

function getCoreSymbols(yongshenRule = {}) {
  return new Set((yongshenRule.outputRequirements?.scoreAuditMustIncludeAtLeastOneOf || []).map(normalizeText));
}

function isSymbolPalace(palace = {}, symbol = '') {
  const normalized = normalizeText(symbol);
  if (!normalized) return false;
  if (normalized === '日干') return Boolean(palace.isDayStem);
  if (normalized === '时干') return Boolean(palace.isHourStem);
  if (normalized === '值使门') return Boolean(palace.isZhiShi);
  if (normalized === '值符') return normalizeGod(palace.god) === '值符';
  if (normalized.endsWith('门')) return normalizeDoor(palace.door) === normalized;
  if (normalized.endsWith('星')) return normalizeStar(palace.star) === normalized.replace(/星$/, '');
  return [palace.sky, palace.earth, palace.door, palace.star, palace.god].map(normalizeText).includes(normalized);
}

function isScoredCorePalace(palace = {}, coreSymbols = new Set()) {
  for (const symbol of coreSymbols) {
    if (isSymbolPalace(palace, symbol)) return true;
  }
  return false;
}

function evaluatePalace(palace = {}, intent = {}, polarityByPalace = new Map()) {
  const door = scoreDoor(palace.door, intent, polarityByPalace, palace.name);
  const star = scoreStar(palace.star);
  const god = scoreGod(palace.god);
  // 旺衰是能量底板，教材明确：能量决定成败，有一票否决权
  let ground = 0;
  if (palace.prosperity === '旺') ground = 8;
  else if (palace.prosperity === '相') ground = 5;
  else if (palace.prosperity === '囚') ground = -5;
  else if (palace.prosperity === '死') ground = -7;
  // 入墓/受刑：封闭状态比死更严重
  if (palace.isTomb || palace.isPunishment) ground -= 5;

  let doorDelta = door.delta;
  if (palace.isDoorPressured) {
    doorDelta = doorDelta > 0 ? Math.round(doorDelta / 2) : Math.round(doorDelta * 1.5);
  }

  const raw = ground + doorDelta + star.delta + god.delta;
  const delta = clamp(raw, -15, 15);

  return {
    palace: palace.name || '',
    palace_index: palace.index,
    delta,
    energy_score: clamp(NEUTRAL_SCORE + delta * 2.5, 0, 100),
    components: {
      ground,
      door: doorDelta,
      star: star.delta,
      god: god.delta
    },
    reasons: [door.label, star.label, god.label].filter(Boolean),
    isKong: Boolean(palace.isKong),
    hasHorse: Boolean(palace.hasMa || palace.hasHorse)
  };
}

function evaluateMacro(palaces = []) {
  let macro = 0;
  const hits = [];
  const zhifu = palaces.find((palace) => normalizeGod(palace.god) === '值符');
  const zhishi = palaces.find((palace) => palace.isZhiShi);

  if (zhifu && !zhifu.isKong) {
    macro += 4;
    hits.push({ layer: 'macro', signal: `${zhifu.name}临值符`, effect: '+4', reason: '教材以值符提纲看大局，值符不空表示大方向仍有主导资源。' });
  } else if (zhifu?.isKong) {
    macro -= 4;
    hits.push({ layer: 'macro', signal: `${zhifu.name}值符空亡`, effect: '-4', reason: '值符提纲落空，表示大方向资源或关键权力端不实。' });
  }

  if (zhishi) {
    const door = normalizeDoor(zhishi.door);
    const delta = GOOD_DOORS.has(door) ? 4 : WARNING_DOORS.has(door) ? -4 : 0;
    macro += delta;
    if (delta) {
      hits.push({ layer: 'macro', signal: `${zhishi.name}值使${door}`, effect: signed(delta), reason: '教材以值使门看具体执行，值使门吉凶影响流程顺滞。' });
    }
  }

  return { macroDelta: clamp(macro, -8, 8), hits };
}

function evaluateRelation(subject, object) {
  if (!subject || !object) return { relationDelta: 0, relations: [] };

  const subjectElement = getPalaceElement(subject);
  const objectElement = getPalaceElement(object);
  const relation = relationBetween(objectElement, subjectElement);
  let effect = 0;
  let reason = '日干与时干五行关系中性。';

  if (relation === 'generate') {
    effect = 14;
    reason = '客体/事项所在宫生日干，表示事情来生我、外部条件对本人有承接。';
  } else if (relation === 'same') {
    effect = 8;
    reason = '主客比和，表示人事同气，推进阻力相对较小。';
  } else if (relation === 'control') {
    effect = -14;
    reason = '客体/事项所在宫克日干，表示事情压我、外部条件构成压力。';
  } else if (relation === 'controlled_by') {
    effect = 8;
    reason = '日干克客体，表示本人能主动制事，但需要投入行动成本。';
  } else if (relation === 'leak') {
    effect = -5;
    reason = '日干生客体，表示本人耗力求事，成事需付出资源。';
  }

  const subjectEnergy = evaluatePalace(subject).energy_score;
  const objectEnergy = evaluatePalace(object).energy_score;
  let adjustedByPower = false;
  if (effect < 0 && objectEnergy < 38 && subjectEnergy > 70) {
    effect = Math.max(Math.round(effect * 0.35), -5);
    adjustedByPower = true;
    reason += ' 但客体能量弱而主体能量强，按“衰不克旺”减轻扣分。';
  }
  if (effect > 0 && objectEnergy < 38) {
    effect = Math.round(effect * 0.5);
    adjustedByPower = true;
    reason += ' 但生扶方自身能量偏弱，正向力度折半。';
  }

  return {
    relationDelta: clamp(effect, -20, 20),
    relations: [{
      from: 'object',
      to: 'subject',
      relation,
      effect,
      adjustedByPower,
      reason
    }]
  };
}

function parseEffectHint(hint = '') {
  const match = String(hint).match(/([+-])\s*(\d+)/);
  if (!match) return 0;
  const value = Number(match[2]);
  return match[1] === '-' ? -value : value;
}

function evaluateContext(overrides = []) {
  let delta = 0;
  const hits = [];
  for (const override of overrides) {
    let effect = parseEffectHint(override.score_effect_hint);
    if (!effect) {
      if (override.domain_polarity === 'positive_with_risk') effect = 3;
      else if (override.domain_polarity === 'mixed_or_positive') effect = 2;
      else if (override.domain_polarity === 'warning') effect = -3;
    }
    if (override.domain_polarity === 'positive_with_risk') effect = Math.max(2, Math.round(effect * 0.6));
    effect = clamp(effect, -6, 6);
    delta += effect;
    hits.push({
      layer: 'context',
      signal: override.signal,
      effect: signed(effect),
      reason: override.reason || '命中问题域极性翻转规则，按当前语境调整吉凶。'
    });
  }
  return { contextDelta: clamp(delta, -8, 8), hits };
}

function applyVoidModifier(score, coreEvaluations = []) {
  const voidCore = coreEvaluations.filter((item) => item.isKong);
  if (!voidCore.length) return { score, applied: false, factor: 1, tags: [] };
  const factor = voidCore.length >= 2 ? 0.55 : 0.7;
  return {
    score: moveScoreTowardNeutral(score, factor),
    applied: true,
    factor,
    tags: ['needs_fill_void']
  };
}

function buildLevel(score) {
  if (score >= 85) return 'strong';
  if (score >= 70) return 'good';
  if (score >= 55) return 'medium';
  if (score >= 40) return 'cautious';
  return 'low';
}

function calculateQimenScore({
  intent = {},
  palaces = [],
  yongshenRule = {},
  polarityOverrides
} = {}) {
  const normalizedPalaces = palaces
    .filter((palace) => palace && !palace.is_center)
    .map((palace) => ({ ...palace, element: getPalaceElement(palace) }));
  const overrides = polarityOverrides || detectPolarityOverrides({ intent, palaces: normalizedPalaces });
  const namedFormation = evaluateNamedFormation(normalizedPalaces, intent);
  // Suppress polarity override entries whose signal is already covered by a named formation
  const filteredOverrides = overrides.filter((o) => !namedFormation.firedSignals.has(o.signal));
  const polarityByPalace = buildPolarityMaps(filteredOverrides);
  const coreSymbols = getCoreSymbols(yongshenRule);
  const subject = normalizedPalaces.find((palace) => palace.isDayStem);
  const object = normalizedPalaces.find((palace) => palace.isHourStem);
  const scoredCorePalaces = normalizedPalaces
    .filter((palace) => isScoredCorePalace(palace, coreSymbols))
    .filter((palace, index, all) => all.findIndex((item) => item.index === palace.index) === index);
  const coreEvaluations = scoredCorePalaces.map((palace) => evaluatePalace(palace, intent, polarityByPalace));
  const stateCorePalaces = [subject, object, ...scoredCorePalaces]
    .filter(Boolean)
    .filter((palace, index, all) => all.findIndex((item) => item.index === palace.index) === index);
  const stateCoreEvaluations = stateCorePalaces.map((palace) => evaluatePalace(palace, intent, polarityByPalace));

  const macro = evaluateMacro(normalizedPalaces);
  const palaceDelta = clamp(coreEvaluations.reduce((sum, item) => sum + item.delta, 0), -20, 20);
  const relation = evaluateRelation(subject, object);
  const context = evaluateContext(filteredOverrides);
  const riskDelta = intent.category === 'health_action' || intent.category === 'lawsuit_legal' ? -2 : 0;
  const raw = clamp(NEUTRAL_SCORE + macro.macroDelta + palaceDelta + namedFormation.namedFormationDelta + relation.relationDelta + context.contextDelta + riskDelta, 0, 100);
  const voidResult = applyVoidModifier(raw, stateCoreEvaluations);
  const finalScore = clamp(voidResult.score, 0, 100);
  const horseTags = normalizedPalaces.some((palace) => (palace.hasMa || palace.hasHorse) && (palace.isDayStem || palace.isHourStem || isScoredCorePalace(palace, coreSymbols)))
    ? ['moving']
    : [];

  const adjustments = [
    ...macro.hits,
    ...namedFormation.hits,
    ...coreEvaluations.map((item) => ({
      layer: 'palace',
      signal: `${item.palace}单宫能量`,
      effect: signed(item.delta),
      reason: `按教材天时、地利、人和、神助、格局五维评估：${item.reasons.join('；')}。`
    })),
    ...relation.relations.map((item) => ({
      layer: 'relation',
      signal: '日干/时干主客生克',
      effect: signed(item.effect),
      reason: item.reason
    })),
    ...context.hits
  ];

  if (riskDelta) {
    adjustments.push({
      layer: 'risk',
      signal: '高风险问题保守校准',
      effect: signed(riskDelta),
      reason: '健康、法律等高风险问题按产品安全要求轻度保守，不改变教材主线判断。'
    });
  }
  if (voidResult.applied) {
    adjustments.push({
      layer: 'modifier',
      signal: '核心用神空亡',
      effect: 'toward-60',
      reason: `空亡按教材视为虚、不实、待填实，不做机械扣分，而是将原分按系数 ${voidResult.factor} 向60中线回归。`
    });
  }

  return {
    version: SCORE_VERSION,
    base_score: NEUTRAL_SCORE,
    raw_score_before_modifiers: raw,
    final_score: finalScore,
    level: buildLevel(finalScore),
    confidence: adjustments.length >= 4 ? 'medium' : 'low',
    deltas: {
      macro: macro.macroDelta,
      palace: palaceDelta,
      named_formation: namedFormation.namedFormationDelta,
      relation: relation.relationDelta,
      context: context.contextDelta,
      risk: riskDelta,
      void_modifier_applied: voidResult.applied
    },
    adjustments,
    yongshen_nodes: coreEvaluations,
    relations: relation.relations,
    polarity_overrides: overrides,
    state_tags: [...voidResult.tags, ...horseTags],
    timing: {
      tags: horseTags,
      status: voidResult.applied ? 'pending_fill_void' : horseTags.length ? 'moving' : 'normal'
    },
    summary: {
      score: finalScore,
      score_basis: {
        positive_signals: adjustments.filter((item) => String(item.effect).startsWith('+')).map((item) => item.signal),
        negative_signals: adjustments.filter((item) => String(item.effect).startsWith('-')).map((item) => item.signal),
        score_logic: `后端按教材七步法从60分中线起算，程序合成后得到${finalScore}分。`
      }
    }
  };
}

module.exports = {
  SCORE_VERSION,
  NEUTRAL_SCORE,
  calculateQimenScore,
  evaluateNamedFormation,
  moveScoreTowardNeutral
};
