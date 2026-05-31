const { GAN5, ZHI5_LIST } = require('./constants/core');

const IMAGE_CATEGORY = Object.freeze({
  NONE: 'NONE',
  SINGLE_IMAGE: 'SINGLE_IMAGE',
  TWO_QI_IMAGE: 'TWO_QI_IMAGE',
  FOLLOW_IMAGE: 'FOLLOW_IMAGE',
  TRANSFORMATION_IMAGE: 'TRANSFORMATION_IMAGE',
});

const CONFIG_VERSION = 'image-score-v1';
const OVERRIDE_MIN_SCORE = 80;
const PURE_MIN_SCORE = 95;
const DOMINANT_MIN_RATIO = 0.4;

const WUXING = ['木', '火', '土', '金', '水'];
const GAN_WUXING = GAN5;
const ZHI_CANGGAN = ZHI5_LIST;

const CANGGAN_WEIGHTS = [0.8, 0.5, 0.3];

const WUXING_KE = Object.freeze({
  木: '土',
  火: '金',
  土: '水',
  金: '木',
  水: '火',
});

const WUXING_SHENG = Object.freeze({
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
});

const WUXING_KE_BY = invertMap(WUXING_KE);
const WUXING_SHENG_BY = invertMap(WUXING_SHENG);

function invertMap(mapping) {
  return Object.freeze(
    Object.fromEntries(Object.entries(mapping).map(([from, to]) => [to, from])),
  );
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function round(value, precision = 2) {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

function getMatchMeta(score) {
  if (score >= PURE_MIN_SCORE) return { label: '高纯度成象', level: 'PURE' };
  if (score >= OVERRIDE_MIN_SCORE) return { label: '成象', level: 'FORMED' };
  if (score >= 60) return { label: '疑似成象', level: 'SUSPECTED' };
  return { label: '未成象', level: 'NOT_FORMED' };
}

function isValidChartInput(input) {
  const { dayGan, gans, zhis, monthZhi } = input || {};

  return Boolean(
    Object.hasOwn(GAN_WUXING, dayGan)
    && Array.isArray(gans)
    && gans.length === 4
    && gans.every((gan) => Object.hasOwn(GAN_WUXING, gan))
    && Array.isArray(zhis)
    && zhis.length === 4
    && zhis.every((zhi) => Object.hasOwn(ZHI_CANGGAN, zhi))
    && Object.hasOwn(ZHI_CANGGAN, monthZhi)
    && dayGan === gans[2]
    && monthZhi === zhis[1],
  );
}

function getGanElement(gan) {
  return Object.hasOwn(GAN_WUXING, gan) ? GAN_WUXING[gan] : undefined;
}

function getHiddenStems(zhi) {
  return Object.hasOwn(ZHI_CANGGAN, zhi) ? ZHI_CANGGAN[zhi] : [];
}

function getWuxingScores({ gans = [], zhis = [] }) {
  const scores = Object.fromEntries(WUXING.map((element) => [element, 0]));

  for (const gan of gans) {
    const element = getGanElement(gan);
    if (element) scores[element] += 1;
  }

  for (const zhi of zhis) {
    for (const [index, gan] of getHiddenStems(zhi).entries()) {
      scores[getGanElement(gan)] += CANGGAN_WEIGHTS[index];
    }
  }

  return Object.fromEntries(
    Object.entries(scores).map(([element, score]) => [element, round(score)]),
  );
}

function getDmSupport({ dayGan, gans = [], zhis = [], dayGanIndex = 2 }) {
  const dmElement = getGanElement(dayGan);
  if (!dmElement) throw new Error(`Unknown day gan: ${dayGan}`);

  const sealElement = WUXING_SHENG_BY[dmElement];
  const exposedGans = gans.filter((_, index) => index !== dayGanIndex);
  const branchElements = zhis.map((zhi) =>
    getHiddenStems(zhi).map((gan) => getGanElement(gan)),
  );

  const exposedSame = exposedGans.filter((gan) => getGanElement(gan) === dmElement).length;
  const exposedSeal = exposedGans.filter((gan) => getGanElement(gan) === sealElement).length;
  const branchSameRoots = branchElements.filter((elements) => elements.includes(dmElement)).length;
  const branchSealRoots = branchElements.filter((elements) => elements.includes(sealElement)).length;

  return {
    dm_element: dmElement,
    seal_element: sealElement,
    exposed_same: exposedSame,
    exposed_seal: exposedSeal,
    branch_same_roots: branchSameRoots,
    branch_seal_roots: branchSealRoots,
    is_rootless: branchSameRoots === 0 && branchSealRoots === 0,
  };
}

function finalizeCandidate(candidate) {
  const matchScore = round(clamp(candidate.match_score || 0));
  const matchMeta = getMatchMeta(matchScore);

  return {
    ...candidate,
    match_score: matchScore,
    match_label: matchMeta.label,
    match_level: matchMeta.level,
    override_normal_pattern:
      matchScore >= OVERRIDE_MIN_SCORE && candidate.allow_override !== false,
    dimensions: candidate.dimensions || {},
    penalties: candidate.penalties || [],
    reason_codes: candidate.reason_codes || [],
  };
}

function scoreFollowCandidates(input) {
  const { dayGan, gans = [], zhis = [], monthZhi } = input || {};

  const dmSupport = getDmSupport({ dayGan, gans, zhis });
  const wuxingScores = getWuxingScores({ gans, zhis });
  const totalScore = Object.values(wuxingScores).reduce((sum, score) => sum + score, 0);
  const monthElement = getGanElement(getHiddenStems(monthZhi)[0]);
  const relations = [
    { subtype: '从财格', target: WUXING_KE[dmSupport.dm_element], reason: 'WEALTH_QI_DOMINANT' },
    { subtype: '从官杀格', target: WUXING_KE_BY[dmSupport.dm_element], reason: 'OFFICER_KILL_QI_DOMINANT' },
    { subtype: '从儿格', target: WUXING_SHENG[dmSupport.dm_element], reason: 'OUTPUT_QI_DOMINANT' },
  ];

  return relations.map(({ subtype, target, reason }) => {
    const targetScore = wuxingScores[target];
    const targetRatio = totalScore ? targetScore / totalScore : 0;
    const exposedTarget = gans.filter((gan, index) =>
      index !== 2 && getGanElement(gan) === target,
    ).length;
    const dominancePoints = Math.min(45, targetRatio * 90);
    const rootlessnessPoints = dmSupport.is_rootless ? 25 : 0;
    const monthCommandPoints = monthElement === target ? 15 : 0;
    const exposedTargetPoints = Math.min(15, exposedTarget * 7.5);
    const penalties = [];
    const reasonCodes = [];
    const hasVisibleSupport = dmSupport.exposed_same > 0 || dmSupport.exposed_seal > 0;
    const visibleSupportPenalty = Math.min(
      30,
      (dmSupport.exposed_same + dmSupport.exposed_seal) * 20,
    );
    const isGlobalDominant = targetScore === Math.max(...Object.values(wuxingScores));
    const meetsDominantRatio = targetRatio >= DOMINANT_MIN_RATIO;
    const allowOverride =
      dmSupport.is_rootless
      && !hasVisibleSupport
      && isGlobalDominant
      && meetsDominantRatio;

    if (dmSupport.is_rootless) reasonCodes.push('DM_ROOTLESS');
    if (meetsDominantRatio && isGlobalDominant) {
      reasonCodes.push(reason);
    }
    if (hasVisibleSupport) reasonCodes.push('DM_HAS_VISIBLE_SUPPORT');
    if (!dmSupport.is_rootless) penalties.push('DM_HAS_SUPPORT');

    return finalizeCandidate({
      category: IMAGE_CATEGORY.FOLLOW_IMAGE,
      subtype,
      target_element: target,
      match_score:
        dominancePoints
        + rootlessnessPoints
        + monthCommandPoints
        + exposedTargetPoints
        - visibleSupportPenalty,
      dimensions: {
        target_qi_score: targetScore,
        target_qi_ratio: round(targetRatio),
        dominance_points: round(dominancePoints),
        rootlessness_points: rootlessnessPoints,
        month_command_points: monthCommandPoints,
        exposed_target_points: exposedTargetPoints,
        visible_support_penalty: visibleSupportPenalty,
        has_visible_support: hasVisibleSupport,
        is_global_dominant: isGlobalDominant,
        meets_dominant_ratio: meetsDominantRatio,
      },
      penalties,
      reason_codes: reasonCodes,
      yongshen_strategy: 'FOLLOW_FORCE',
      allow_override: allowOverride,
    });
  });
}

function createInvalidCandidate() {
  return finalizeCandidate({
    category: IMAGE_CATEGORY.NONE,
    subtype: null,
    target_element: null,
    match_score: 0,
    allow_override: false,
    dimensions: {},
    penalties: [],
    reason_codes: ['INVALID_CHART_INPUT'],
    yongshen_strategy: null,
  });
}

function assessBaziImage(input) {
  const candidates = (isValidChartInput(input)
    ? scoreFollowCandidates(input)
    : [createInvalidCandidate()]).sort(
    (left, right) => right.match_score - left.match_score,
  );
  const primaryCandidate = candidates[0] || null;

  return {
    primary_candidate: primaryCandidate,
    alternatives: candidates.slice(1),
    dimensions: primaryCandidate ? primaryCandidate.dimensions : {},
    penalties: primaryCandidate ? primaryCandidate.penalties : [],
    reason_codes: primaryCandidate ? primaryCandidate.reason_codes : [],
    config_version: CONFIG_VERSION,
  };
}

function resolvePatternOverride({ basePattern, imageAnalysis }) {
  const candidate = imageAnalysis && imageAnalysis.primary_candidate;
  const overridden = candidate?.override_normal_pattern === true;

  return {
    basis: overridden ? 'SPECIAL_IMAGE_OVERRIDE' : 'NORMAL_PATTERN',
    base_pattern: basePattern,
    final_pattern: overridden ? candidate.subtype : basePattern,
    overridden,
    yongshen_strategy: overridden ? candidate.yongshen_strategy : null,
  };
}

module.exports = {
  IMAGE_CATEGORY,
  CONFIG_VERSION,
  OVERRIDE_MIN_SCORE,
  PURE_MIN_SCORE,
  DOMINANT_MIN_RATIO,
  GAN_WUXING,
  ZHI_CANGGAN,
  WUXING_KE,
  WUXING_SHENG,
  WUXING_KE_BY,
  WUXING_SHENG_BY,
  getMatchMeta,
  getWuxingScores,
  getDmSupport,
  finalizeCandidate,
  scoreFollowCandidates,
  assessBaziImage,
  resolvePatternOverride,
};
