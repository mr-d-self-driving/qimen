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
  scoreFollowCandidates,
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

test('keeps normal pattern when override flag is truthy but not boolean true', () => {
  for (const overrideFlag of ['false', 1]) {
    const imageAnalysis = {
      primary_candidate: {
        subtype: '从财格',
        override_normal_pattern: overrideFlag,
        yongshen_strategy: 'FOLLOW_FORCE',
      },
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
  }
});

test('visible peer or seal support prevents follow-wealth override', () => {
  const unsupportedResult = assessBaziImage({
    dayGan: '甲',
    gans: ['丙', '戊', '甲', '己'],
    zhis: ['戌', '戌', '戌', '戌'],
    monthZhi: '戌',
  });

  for (const visibleSupportGan of ['乙', '壬']) {
    const result = assessBaziImage({
      dayGan: '甲',
      gans: [visibleSupportGan, '戊', '甲', '己'],
      zhis: ['戌', '戌', '戌', '戌'],
      monthZhi: '戌',
    });

    assert.equal(result.primary_candidate.subtype, '从财格');
    assert.ok(result.primary_candidate.match_score < unsupportedResult.primary_candidate.match_score);
    assert.equal(result.primary_candidate.override_normal_pattern, false);
    assert.ok(result.primary_candidate.reason_codes.includes('DM_HAS_VISIBLE_SUPPORT'));
  }
});

test('follow-wealth candidate cannot override when wealth qi is not globally dominant', () => {
  const wealthCandidate = scoreFollowCandidates({
    dayGan: '甲',
    gans: ['戊', '己', '甲', '庚'],
    zhis: ['酉', '酉', '戌', '酉'],
    monthZhi: '戌',
  }).find((candidate) => candidate.subtype === '从财格');

  assert.ok(wealthCandidate.match_score >= OVERRIDE_MIN_SCORE);
  assert.ok(wealthCandidate.dimensions.target_qi_ratio >= 0.35);
  assert.equal(wealthCandidate.dimensions.is_global_dominant, false);
  assert.equal(wealthCandidate.allow_override, false);
  assert.equal(wealthCandidate.override_normal_pattern, false);
});

test('finalizeCandidate respects explicit display-only override prohibition', () => {
  const candidate = finalizeCandidate({
    category: IMAGE_CATEGORY.TWO_QI_IMAGE,
    subtype: '木火通明',
    match_score: 90,
    allow_override: false,
  });

  assert.equal(candidate.match_score, 90);
  assert.equal(candidate.override_normal_pattern, false);
});

test('invalid chart input degrades to NONE candidate without overriding', () => {
  const validChart = {
    dayGan: '甲',
    gans: ['丙', '戊', '甲', '己'],
    zhis: ['戌', '戌', '戌', '戌'],
    monthZhi: '戌',
  };
  const invalidCharts = [
    { ...validChart, dayGan: 'A' },
    { ...validChart, gans: ['丙', '戊', '甲', 'A'] },
    { ...validChart, zhis: ['戌'] },
    { ...validChart, zhis: ['戌', '戌', '戌', 'A'] },
    { ...validChart, dayGan: '乙' },
    { ...validChart, monthZhi: '辰' },
    { ...validChart, zhis: ['戌', '戌', '戌', 'toString'] },
    { ...validChart, monthZhi: 'A' },
  ];

  for (const chart of invalidCharts) {
    const result = assessBaziImage(chart);

    assert.equal(result.primary_candidate.category, IMAGE_CATEGORY.NONE);
    assert.equal(result.primary_candidate.match_score, 0);
    assert.equal(result.primary_candidate.override_normal_pattern, false);
    assert.deepEqual(result.reason_codes, ['INVALID_CHART_INPUT']);
  }
});

test('missing chart input degrades to NONE candidate without throwing', () => {
  for (const input of [undefined, null]) {
    const result = assessBaziImage(input);

    assert.equal(result.primary_candidate.category, IMAGE_CATEGORY.NONE);
    assert.equal(result.primary_candidate.override_normal_pattern, false);
    assert.deepEqual(result.reason_codes, ['INVALID_CHART_INPUT']);
  }
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
