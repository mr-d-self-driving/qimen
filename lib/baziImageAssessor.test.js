const test = require('node:test');
const assert = require('node:assert/strict');

const {
  IMAGE_CATEGORY,
  CONFIG_VERSION,
  OVERRIDE_MIN_SCORE,
  PURE_MIN_SCORE,
  assessBaziImage,
  finalizeCandidate,
  getDmSupport,
  getMatchMeta,
  getWuxingScores,
  resolvePatternOverride,
} = require('./baziImageAssessor');

test('assesses rootless Jia day with dominant wealth qi as follow-wealth image', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['丙', '戊', '甲', '己'],
    zhis: ['戌', '戌', '戌', '戌'],
    monthZhi: '戌',
  });

  assert.equal(result.config_version, CONFIG_VERSION);
  assert.equal(result.primary_candidate.category, IMAGE_CATEGORY.FOLLOW_IMAGE);
  assert.equal(result.primary_candidate.subtype, '从财格');
  assert.ok(result.primary_candidate.match_score >= OVERRIDE_MIN_SCORE);
  assert.equal(result.primary_candidate.override_normal_pattern, true);
  assert.ok(result.primary_candidate.reason_codes.includes('DM_ROOTLESS'));
  assert.ok(result.primary_candidate.reason_codes.includes('WEALTH_QI_DOMINANT'));

  assert.deepEqual(
    resolvePatternOverride({ basePattern: '正财格', imageAnalysis: result }),
    {
      basis: 'SPECIAL_IMAGE_OVERRIDE',
      base_pattern: '正财格',
      final_pattern: '从财格',
      overridden: true,
      yongshen_strategy: 'FOLLOW_FORCE',
    },
  );
});

test('keeps normal pattern when follow-image candidate score is below override threshold', () => {
  const imageAnalysis = {
    primary_candidate: finalizeCandidate({
      category: IMAGE_CATEGORY.FOLLOW_IMAGE,
      subtype: '从财格',
      match_score: 72,
      yongshen_strategy: 'FOLLOW_FORCE',
    }),
  };

  assert.deepEqual(
    resolvePatternOverride({ basePattern: '正财格', imageAnalysis }),
    {
      basis: 'NORMAL_PATTERN',
      base_pattern: '正财格',
      final_pattern: '正财格',
      overridden: false,
      yongshen_strategy: null,
    },
  );
});

test('exposes score thresholds and match metadata', () => {
  assert.deepEqual(IMAGE_CATEGORY, {
    NONE: 'NONE',
    SINGLE_IMAGE: 'SINGLE_IMAGE',
    TWO_QI_IMAGE: 'TWO_QI_IMAGE',
    FOLLOW_IMAGE: 'FOLLOW_IMAGE',
    TRANSFORMATION_IMAGE: 'TRANSFORMATION_IMAGE',
  });
  assert.equal(CONFIG_VERSION, 'image-score-v1');
  assert.equal(OVERRIDE_MIN_SCORE, 80);
  assert.equal(PURE_MIN_SCORE, 95);
  assert.deepEqual(getMatchMeta(95), { label: '高纯度成象', level: 'PURE' });
  assert.deepEqual(getMatchMeta(80), { label: '成象', level: 'FORMED' });
  assert.deepEqual(getMatchMeta(60), { label: '疑似成象', level: 'SUSPECTED' });
  assert.deepEqual(getMatchMeta(59), { label: '未成象', level: 'NOT_FORMED' });
});

test('scores hidden stems by branch order and recognizes seal through sheng-by mapping', () => {
  assert.deepEqual(
    getWuxingScores({ gans: [], zhis: ['戌'] }),
    { 木: 0, 火: 0.3, 土: 0.8, 金: 0.5, 水: 0 },
  );

  assert.deepEqual(
    getDmSupport({
      dayGan: '甲',
      gans: ['壬', '庚', '甲', '乙'],
      zhis: ['亥', '申', '寅', '辰'],
    }),
    {
      dm_element: '木',
      seal_element: '水',
      exposed_same: 1,
      exposed_seal: 1,
      branch_same_roots: 3,
      branch_seal_roots: 3,
      is_rootless: false,
    },
  );
});
