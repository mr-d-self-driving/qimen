const test = require('node:test');
const assert = require('node:assert/strict');

const {
  IMAGE_CATEGORY,
  CONFIG_VERSION,
  DOMINANT_MIN_RATIO,
  OVERRIDE_MIN_SCORE,
  PURE_MIN_SCORE,
  assessBaziImage,
  finalizeCandidate,
  getDmSupport,
  getMatchMeta,
  getWuxingScores,
  resolvePatternOverride,
} = require('./baziImageAssessor');

function getCandidates(result) {
  return [result.primary_candidate, ...result.alternatives];
}

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

test('selects the highest eligible override candidate without changing the display primary candidate', () => {
  const result = assessBaziImage({
    dayGan: '戊',
    gans: ['癸', '乙', '戊', '癸'],
    zhis: ['卯', '卯', '子', '亥'],
    monthZhi: '卯',
  });

  assert.equal(result.primary_candidate.subtype, '从官杀格');
  assert.equal(result.primary_candidate.match_score, 83.73);
  assert.equal(result.primary_candidate.override_normal_pattern, false);
  assert.equal(result.override_candidate.subtype, '从财格');
  assert.equal(result.override_candidate.match_score, 82.08);
  assert.equal(result.override_candidate.override_normal_pattern, true);
  assert.deepEqual(
    resolvePatternOverride({ basePattern: '正官格', imageAnalysis: result }),
    {
      basis: 'SPECIAL_IMAGE_OVERRIDE',
      base_pattern: '正官格',
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
      basis: 'MONTH_PATTERN',
      base_pattern: '正财格',
      final_pattern: '正财格',
      overridden: false,
      yongshen_strategy: 'NORMAL',
    },
  );
});

test('keeps legacy month-pattern fallback when image analysis is absent', () => {
  assert.deepEqual(
    resolvePatternOverride({ basePattern: '正财格', imageAnalysis: null }),
    {
      basis: 'MONTH_PATTERN',
      base_pattern: '正财格',
      final_pattern: '正财格',
      overridden: false,
      yongshen_strategy: 'NORMAL',
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
        basis: 'MONTH_PATTERN',
        base_pattern: '正财格',
        final_pattern: '正财格',
        overridden: false,
        yongshen_strategy: 'NORMAL',
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
    const unsupportedFollow = getCandidates(unsupportedResult)
      .find((candidate) => candidate.subtype === '从财格');
    const follow = getCandidates(result)
      .find((candidate) => candidate.subtype === '从财格');

    assert.ok(follow.match_score < unsupportedFollow.match_score);
    assert.equal(follow.override_normal_pattern, false);
    assert.ok(follow.reason_codes.includes('DM_HAS_VISIBLE_SUPPORT'));
  }
});

test('follow-wealth candidate cannot override when wealth qi is not globally dominant', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['戊', '己', '甲', '庚'],
    zhis: ['酉', '戌', '酉', '酉'],
    monthZhi: '戌',
  });
  const wealthCandidate = getCandidates(result)
    .find((candidate) => candidate.subtype === '从财格');

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

test('dominant wood image does not require the day master to be rootless', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['甲', '乙', '甲', '癸'],
    zhis: ['寅', '卯', '亥', '寅'],
    monthZhi: '卯',
  });

  assert.equal(result.primary_candidate.category, IMAGE_CATEGORY.SINGLE_IMAGE);
  assert.equal(result.primary_candidate.subtype, '曲直格');
  assert.equal(result.primary_candidate.target_element, '木');
  assert.equal(result.primary_candidate.yongshen_strategy, 'FOLLOW_FORCE');
  assert.ok(result.primary_candidate.match_score >= OVERRIDE_MIN_SCORE);
  assert.equal(result.primary_candidate.override_normal_pattern, true);
});

test('maps dominant single images for every element', () => {
  const charts = [
    ['甲', ['甲', '乙', '甲', '癸'], ['寅', '卯', '亥', '寅'], '卯', '曲直格', '木'],
    ['丙', ['丙', '丁', '丙', '甲'], ['巳', '午', '寅', '巳'], '午', '炎上格', '火'],
    ['戊', ['戊', '己', '戊', '丙'], ['辰', '戌', '未', '丑'], '戌', '稼穑格', '土'],
    ['庚', ['庚', '辛', '庚', '戊'], ['申', '酉', '丑', '申'], '酉', '从革格', '金'],
    ['壬', ['壬', '癸', '壬', '庚'], ['亥', '子', '申', '亥'], '子', '润下格', '水'],
  ];

  for (const [dayGan, gans, zhis, monthZhi, subtype, targetElement] of charts) {
    const result = assessBaziImage({ dayGan, gans, zhis, monthZhi });
    const candidate = getCandidates(result)
      .find((item) => item.category === IMAGE_CATEGORY.SINGLE_IMAGE);

    assert.equal(candidate.subtype, subtype);
    assert.equal(candidate.target_element, targetElement);
  }
});

test('transformation image recognizes adjacent day-stem combine and becomes primary', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['戊', '己', '甲', '丙'],
    zhis: ['戌', '丑', '辰', '未'],
    monthZhi: '丑',
  });

  assert.equal(result.primary_candidate.category, IMAGE_CATEGORY.TRANSFORMATION_IMAGE);
  assert.equal(result.primary_candidate.subtype, '甲己化土');
  assert.equal(result.primary_candidate.target_element, '土');
  assert.equal(result.primary_candidate.yongshen_strategy, 'TRANSFORM_FORCE');
  assert.ok(result.primary_candidate.match_score >= OVERRIDE_MIN_SCORE);
  assert.equal(result.primary_candidate.override_normal_pattern, true);
  assert.ok(result.primary_candidate.reason_codes.includes('ADJACENT_STEM_COMBINE'));
});

test('transformation image recognizes adjacent hour-stem combine', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['戊', '丙', '甲', '己'],
    zhis: ['戌', '丑', '辰', '未'],
    monthZhi: '丑',
  });
  const transform = getCandidates(result)
    .find((candidate) => candidate.category === IMAGE_CATEGORY.TRANSFORMATION_IMAGE);

  assert.equal(transform.subtype, '甲己化土');
  assert.ok(transform.reason_codes.includes('ADJACENT_STEM_COMBINE'));
});

test('supports bidirectional five-combine transformation mappings', () => {
  const combinations = [
    ['甲', '己', '土', ['戌', '丑', '辰', '未']],
    ['己', '甲', '土', ['戌', '丑', '辰', '未']],
    ['乙', '庚', '金', ['申', '酉', '丑', '申']],
    ['庚', '乙', '金', ['申', '酉', '丑', '申']],
    ['丙', '辛', '水', ['亥', '子', '申', '亥']],
    ['辛', '丙', '水', ['亥', '子', '申', '亥']],
    ['丁', '壬', '木', ['寅', '卯', '亥', '寅']],
    ['壬', '丁', '木', ['寅', '卯', '亥', '寅']],
    ['戊', '癸', '火', ['巳', '午', '寅', '巳']],
    ['癸', '戊', '火', ['巳', '午', '寅', '巳']],
  ];

  for (const [dayGan, partner, targetElement, zhis] of combinations) {
    const result = assessBaziImage({
      dayGan,
      gans: [dayGan, partner, dayGan, dayGan],
      zhis,
      monthZhi: zhis[1],
    });
    const candidate = getCandidates(result)
      .find((item) => item.category === IMAGE_CATEGORY.TRANSFORMATION_IMAGE);

    assert.equal(candidate.subtype, `${dayGan}${partner}化${targetElement}`);
    assert.equal(candidate.target_element, targetElement);
  }
});

test('does not create transformation image for a non-adjacent five-combine stem', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['己', '戊', '甲', '丙'],
    zhis: ['戌', '丑', '辰', '未'],
    monthZhi: '丑',
  });

  assert.equal(
    getCandidates(result)
      .find((candidate) => candidate.category === IMAGE_CATEGORY.TRANSFORMATION_IMAGE),
    undefined,
  );
});

test('serious jealous combine caps transformation image below override threshold', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['己', '己', '甲', '戊'],
    zhis: ['戌', '丑', '辰', '未'],
    monthZhi: '丑',
  });
  const transform = getCandidates(result)
    .find((candidate) => candidate.category === IMAGE_CATEGORY.TRANSFORMATION_IMAGE);

  assert.ok(transform.match_score <= 79);
  assert.equal(transform.override_normal_pattern, false);
  assert.ok(transform.reason_codes.includes('JEALOUS_COMBINE'));
});

test('duplicate day stem competing for one combine stem caps transformation image', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['甲', '己', '甲', '丙'],
    zhis: ['戌', '丑', '辰', '未'],
    monthZhi: '丑',
  });
  const transform = getCandidates(result)
    .find((candidate) => candidate.category === IMAGE_CATEGORY.TRANSFORMATION_IMAGE);

  assert.ok(transform.match_score <= 79);
  assert.equal(transform.override_normal_pattern, false);
  assert.ok(transform.reason_codes.includes('JEALOUS_COMBINE'));
});

test('deduplicates identical transformation image from month and hour stems', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['戊', '己', '甲', '己'],
    zhis: ['戌', '丑', '辰', '未'],
    monthZhi: '丑',
  });
  const transforms = getCandidates(result)
    .filter((candidate) => candidate.category === IMAGE_CATEGORY.TRANSFORMATION_IMAGE);

  assert.equal(transforms.length, 1);
  assert.equal(transforms[0].subtype, '甲己化土');
});

test('strong day-master roots prevent transformation image override', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['戊', '己', '甲', '丙'],
    zhis: ['辰', '丑', '辰', '未'],
    monthZhi: '丑',
  });
  const transform = getCandidates(result)
    .find((candidate) => candidate.category === IMAGE_CATEGORY.TRANSFORMATION_IMAGE);

  assert.ok(transform.dimensions.original_qi_root_count > 0);
  assert.ok(transform.match_score <= 79);
  assert.equal(transform.override_normal_pattern, false);
  assert.ok(transform.reason_codes.includes('DM_HAS_STRONG_ROOT'));
  assert.ok(transform.penalties.includes('DM_HAS_STRONG_ROOT_CAP_79'));
});

test('single primary day-master root prevents transformation image override', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['丙', '己', '甲', '丙'],
    zhis: ['寅', '丑', '戌', '戌'],
    monthZhi: '丑',
  });
  const transform = getCandidates(result)
    .find((candidate) => candidate.category === IMAGE_CATEGORY.TRANSFORMATION_IMAGE);

  assert.equal(transform.dimensions.original_qi_primary_root_count, 1);
  assert.ok(transform.match_score <= 79);
  assert.equal(transform.override_normal_pattern, false);
  assert.ok(transform.reason_codes.includes('DM_HAS_STRONG_ROOT'));
  assert.ok(transform.penalties.includes('DM_HAS_STRONG_ROOT_CAP_79'));
});

test('damaged transformation qi records counter-force penalty', () => {
  const result = assessBaziImage({
    dayGan: '丁',
    gans: ['庚', '壬', '丁', '辛'],
    zhis: ['申', '酉', '丑', '申'],
    monthZhi: '酉',
  });
  const transform = getCandidates(result)
    .find((candidate) => candidate.category === IMAGE_CATEGORY.TRANSFORMATION_IMAGE);

  assert.equal(transform.subtype, '丁壬化木');
  assert.ok(transform.dimensions.transform_qi_counter_ratio >= DOMINANT_MIN_RATIO);
  assert.ok(transform.reason_codes.includes('TRANSFORM_QI_DAMAGED'));
  assert.ok(transform.penalties.includes('TRANSFORM_QI_DAMAGED'));
});

test('two qi image remains descriptive even above override threshold', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['甲', '丙', '甲', '丁'],
    zhis: ['寅', '午', '卯', '巳'],
    monthZhi: '午',
  });
  const twoQi = getCandidates(result)
    .find((candidate) => candidate.category === IMAGE_CATEGORY.TWO_QI_IMAGE);

  assert.ok(twoQi.match_score >= OVERRIDE_MIN_SCORE);
  assert.deepEqual(twoQi.target_elements, ['火', '木']);
  assert.equal(twoQi.yongshen_strategy, 'DESCRIPTIVE_ONLY');
  assert.equal(twoQi.allow_override, false);
  assert.equal(twoQi.override_normal_pattern, false);
});

test('two qi image does not claim balance when one element is overwhelmingly dominant', () => {
  const result = assessBaziImage({
    dayGan: '壬',
    gans: ['壬', '癸', '壬', '癸'],
    zhis: ['子', '子', '子', '子'],
    monthZhi: '子',
  });
  const twoQi = getCandidates(result)
    .find((candidate) => candidate.category === IMAGE_CATEGORY.TWO_QI_IMAGE);

  assert.ok(twoQi.dimensions.two_qi_ratio_difference > 0.3);
  assert.equal(twoQi.reason_codes.includes('TWO_QI_BALANCED'), false);
});

test('creates mixed follow-force candidate only for rootless unsupported mixed force', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['丙', '戊', '甲', '庚'],
    zhis: ['巳', '午', '戌', '酉'],
    monthZhi: '午',
  });
  const mixedFollow = getCandidates(result)
    .find((candidate) => candidate.subtype === '从势格');

  assert.equal(mixedFollow.category, IMAGE_CATEGORY.FOLLOW_IMAGE);
  assert.deepEqual(mixedFollow.target_elements, ['火', '土', '金']);
  assert.equal(mixedFollow.yongshen_strategy, 'FOLLOW_FORCE');
  assert.ok(mixedFollow.reason_codes.includes('TARGET_QI_MIXED'));
  assert.ok(mixedFollow.reason_codes.includes('DM_ROOTLESS'));
});

test('does not create mixed follow-force candidate with roots, visible aid, or one dominant camp', () => {
  const charts = [
    {
      dayGan: '甲',
      gans: ['丙', '戊', '甲', '庚'],
      zhis: ['巳', '午', '寅', '酉'],
      monthZhi: '午',
    },
    {
      dayGan: '甲',
      gans: ['壬', '戊', '甲', '庚'],
      zhis: ['巳', '午', '戌', '酉'],
      monthZhi: '午',
    },
    {
      dayGan: '甲',
      gans: ['丙', '戊', '甲', '己'],
      zhis: ['戌', '戌', '戌', '戌'],
      monthZhi: '戌',
    },
  ];

  for (const chart of charts) {
    assert.equal(
      getCandidates(assessBaziImage(chart))
        .find((candidate) => candidate.subtype === '从势格'),
      undefined,
    );
  }
});

test('hidden seal root prevents mixed follow-force candidate', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['丙', '戊', '甲', '庚'],
    zhis: ['巳', '午', '子', '酉'],
    monthZhi: '午',
  });

  assert.equal(
    getCandidates(result).find((candidate) => candidate.subtype === '从势格'),
    undefined,
  );
});

test('mixed follow-force yields to a clear output-force candidate', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['丙', '丙', '甲', '丙'],
    zhis: ['巳', '戌', '戌', '戌'],
    monthZhi: '戌',
  });

  assert.equal(
    getCandidates(result).find((candidate) => candidate.subtype === '从势格'),
    undefined,
  );
  assert.equal(result.primary_candidate.subtype, '从儿格');
});

test('powerful officer-kill counter force prevents dominant single-image override', () => {
  const result = assessBaziImage({
    dayGan: '甲',
    gans: ['甲', '甲', '甲', '庚'],
    zhis: ['卯', '卯', '卯', '酉'],
    monthZhi: '卯',
  });
  const single = getCandidates(result)
    .find((candidate) => candidate.category === IMAGE_CATEGORY.SINGLE_IMAGE);

  assert.equal(single.subtype, '曲直格');
  assert.equal(single.override_normal_pattern, false);
  assert.ok(single.reason_codes.includes('SINGLE_IMAGE_COUNTERED'));
  assert.ok(single.penalties.includes('POWERFUL_COUNTER_QI'));
});
