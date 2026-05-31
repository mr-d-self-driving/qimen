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

const WUXING = ['木', '火', '土', '金', '水'];

const GAN_WUXING = Object.freeze({
  甲: '木', 乙: '木',
  丙: '火', 丁: '火',
  戊: '土', 己: '土',
  庚: '金', 辛: '金',
  壬: '水', 癸: '水',
});

const ZHI_CANGGAN = Object.freeze({
  子: ['癸'],
  丑: ['己', '癸', '辛'],
  寅: ['甲', '丙', '戊'],
  卯: ['乙'],
  辰: ['戊', '乙', '癸'],
  巳: ['丙', '戊', '庚'],
  午: ['丁', '己'],
  未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'],
  酉: ['辛'],
  戌: ['戊', '辛', '丁'],
  亥: ['壬', '甲'],
});

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

function getWuxingScores({ gans = [], zhis = [] }) {
  const scores = Object.fromEntries(WUXING.map((element) => [element, 0]));

  for (const gan of gans) {
    const element = GAN_WUXING[gan];
    if (element) scores[element] += 1;
  }

  for (const zhi of zhis) {
    for (const [index, gan] of (ZHI_CANGGAN[zhi] || []).entries()) {
      scores[GAN_WUXING[gan]] += CANGGAN_WEIGHTS[index];
    }
  }

  return Object.fromEntries(
    Object.entries(scores).map(([element, score]) => [element, round(score)]),
  );
}

function getDmSupport({ dayGan, gans = [], zhis = [], dayGanIndex = 2 }) {
  const dmElement = GAN_WUXING[dayGan];
  if (!dmElement) throw new Error(`Unknown day gan: ${dayGan}`);

  const sealElement = WUXING_SHENG_BY[dmElement];
  const exposedGans = gans.filter((_, index) => index !== dayGanIndex);
  const branchElements = zhis.map((zhi) =>
    (ZHI_CANGGAN[zhi] || []).map((gan) => GAN_WUXING[gan]),
  );

  const exposedSame = exposedGans.filter((gan) => GAN_WUXING[gan] === dmElement).length;
  const exposedSeal = exposedGans.filter((gan) => GAN_WUXING[gan] === sealElement).length;
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
    override_normal_pattern: matchScore >= OVERRIDE_MIN_SCORE,
    dimensions: candidate.dimensions || {},
    penalties: candidate.penalties || [],
    reason_codes: candidate.reason_codes || [],
  };
}

function scoreFollowCandidates({ dayGan, gans = [], zhis = [], monthZhi }) {
  const dmSupport = getDmSupport({ dayGan, gans, zhis });
  const wuxingScores = getWuxingScores({ gans, zhis });
  const totalScore = Object.values(wuxingScores).reduce((sum, score) => sum + score, 0);
  const monthElement = GAN_WUXING[(ZHI_CANGGAN[monthZhi] || [])[0]];
  const relations = [
    { subtype: '从财格', target: WUXING_KE[dmSupport.dm_element], reason: 'WEALTH_QI_DOMINANT' },
    { subtype: '从官杀格', target: WUXING_KE_BY[dmSupport.dm_element], reason: 'OFFICER_KILL_QI_DOMINANT' },
    { subtype: '从儿格', target: WUXING_SHENG[dmSupport.dm_element], reason: 'OUTPUT_QI_DOMINANT' },
  ];

  return relations.map(({ subtype, target, reason }) => {
    const targetScore = wuxingScores[target];
    const targetRatio = totalScore ? targetScore / totalScore : 0;
    const exposedTarget = gans.filter((gan, index) =>
      index !== 2 && GAN_WUXING[gan] === target,
    ).length;
    const dominancePoints = Math.min(45, targetRatio * 90);
    const rootlessnessPoints = dmSupport.is_rootless ? 25 : 0;
    const monthCommandPoints = monthElement === target ? 15 : 0;
    const exposedTargetPoints = Math.min(15, exposedTarget * 7.5);
    const penalties = [];
    const reasonCodes = [];

    if (dmSupport.is_rootless) reasonCodes.push('DM_ROOTLESS');
    if (targetRatio >= 0.4 && targetScore === Math.max(...Object.values(wuxingScores))) {
      reasonCodes.push(reason);
    }
    if (!dmSupport.is_rootless) penalties.push('DM_HAS_SUPPORT');

    return finalizeCandidate({
      category: IMAGE_CATEGORY.FOLLOW_IMAGE,
      subtype,
      target_element: target,
      match_score: dominancePoints + rootlessnessPoints + monthCommandPoints + exposedTargetPoints,
      dimensions: {
        target_qi_score: targetScore,
        target_qi_ratio: round(targetRatio),
        dominance_points: round(dominancePoints),
        rootlessness_points: rootlessnessPoints,
        month_command_points: monthCommandPoints,
        exposed_target_points: exposedTargetPoints,
      },
      penalties,
      reason_codes: reasonCodes,
      yongshen_strategy: 'FOLLOW_FORCE',
    });
  });
}

function assessBaziImage(input) {
  const candidates = scoreFollowCandidates(input).sort(
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
