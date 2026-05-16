'use strict';

const {
  getShiShenListTier,
  TIER_LABELS,
} = require('./normalizeShenProfile');

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

const QI_RATIOS = {
  wang: 1.0,
  xiang: 0.85,
  xiu: 0.65,
  qiu: 0.55,
  si: 0.45,
  neutral: 0.7,
};

const AUSPICIOUS_TIER_RATIOS = {
  yong: 1.0,
  xi: 0.85,
  xian: 0.45,
  chou: 0.2,
  ji: 0.0,
};

const INAUSPICIOUS_TIER_RATIOS = {
  yong: 0.15,
  xi: 0.3,
  xian: 0.55,
  chou: 0.85,
  ji: 1.0,
};

function wuxingToShiShenList(wuxing, riGan) {
  const riWuxing = GAN_WUXING[riGan];

  if (wuxing === riWuxing) return ['比肩', '劫财'];
  if (WUXING_SHENG[wuxing] === riWuxing) return ['偏印', '正印'];
  if (WUXING_SHENG[riWuxing] === wuxing) return ['食神', '伤官'];
  if (WUXING_KE[wuxing] === riWuxing) return ['七杀', '正官'];
  if (WUXING_KE[riWuxing] === wuxing) return ['偏财', '正财'];

  return [];
}

function getQiState(shenshaWuxing, referenceWuxing) {
  if (!shenshaWuxing || !referenceWuxing) return 'neutral';
  if (shenshaWuxing === referenceWuxing) return 'wang';
  if (WUXING_SHENG[referenceWuxing] === shenshaWuxing) return 'xiang';
  if (WUXING_SHENG[shenshaWuxing] === referenceWuxing) return 'xiu';
  if (WUXING_KE[shenshaWuxing] === referenceWuxing) return 'qiu';
  if (WUXING_KE[referenceWuxing] === shenshaWuxing) return 'si';
  return 'neutral';
}

function getVoidRatio({ nature, isVoid }) {
  if (!isVoid) return 1.0;
  if (nature === 'inauspicious') return 0.6;
  if (nature === 'neutral') return 0.5;
  return 0.2;
}

function calculateShenshaImpact({
  name,
  baseDelta,
  zhi,
  riGan,
  shen,
  referenceMonthZhi,
  isVoid = false,
  supportRatio = 1.0,
  nature = 'auspicious',
}) {
  const shenshaWuxing = ZHI_WUXING[zhi] || '';
  const referenceWuxing = ZHI_WUXING[referenceMonthZhi] || '';
  const shishenList = wuxingToShiShenList(shenshaWuxing, riGan);
  const tier = getShiShenListTier(shishenList, shen);
  const tierRatio = (nature === 'inauspicious' ? INAUSPICIOUS_TIER_RATIOS : AUSPICIOUS_TIER_RATIOS)[tier] ?? 0.45;
  const qiState = getQiState(shenshaWuxing, referenceWuxing);
  const qiRatio = QI_RATIOS[qiState] ?? QI_RATIOS.neutral;
  const voidRatio = getVoidRatio({ nature, isVoid });
  const finalDelta = Math.round(baseDelta * qiRatio * tierRatio * voidRatio * supportRatio);

  return {
    name,
    zhi,
    baseDelta,
    finalDelta,
    tier,
    tierLabel: TIER_LABELS[tier],
    shishenList,
    shenshaWuxing,
    referenceMonthZhi,
    referenceWuxing,
    qiState,
    qiRatio,
    tierRatio,
    voidRatio,
    supportRatio,
    isVoid,
    nature,
    debug: `base=${baseDelta}, zhi=${zhi}, shenshaWuxing=${shenshaWuxing}, referenceMonthZhi=${referenceMonthZhi}, referenceWuxing=${referenceWuxing}, qiState=${qiState}, qiRatio=${qiRatio}, tier=${tier}, tierLabel=${TIER_LABELS[tier]}, tierRatio=${tierRatio}, voidRatio=${voidRatio}, supportRatio=${supportRatio}, final=${finalDelta}`,
  };
}

module.exports = {
  calculateShenshaImpact,
  wuxingToShiShenList,
};
