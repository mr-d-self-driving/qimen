const test = require('node:test');
const assert = require('node:assert/strict');

const { BaziRuleEngine } = require('./BaziRuleEngine');

test('calculateStrength uses updated layered scoring and returns explanation copy', () => {
  const result = BaziRuleEngine.calculateStrength(
    '戊',
    ['丁', '辛', '戊', '庚'],
    ['丑', '亥', '午', '申']
  );

  assert.equal(result.strongWeak, '身弱');
  assert.equal(result.strengthDetail.band, '偏弱');
  assert.equal(result.strengthDetail.meter.value, 3.5);
  assert.equal(result.strengthDetail.season_detail.max_score, 4);
  assert.equal(result.strengthDetail.root_detail.max_score, 3);
  assert.equal(result.strengthDetail.support_detail.max_score, 2);
  assert.equal(result.dayMasterHasRoot, true);
  assert.equal(result.strengthDetail.summary, '日主身弱，综合强度3.5/10，内部细分为偏弱。');
  assert.equal(result.strengthDetail.sections.length, 5);
  assert.match(result.strengthDetail.sections[1].text, /年支丑藏己/);
  assert.match(result.strengthDetail.sections[2].text, /年干丁为正印/);
  assert.match(result.strengthDetail.sections[4].text, /不作真从或专旺覆盖/);
  assert.match(result.strengthBasis, /月令亥以壬为主气/);
  assert.match(result.strengthBasis, /日主有重根可依/);
  assert.match(result.strengthBasis, /年干丁为正印/);
});

test('calculateStrength returns a user-facing meter with four copy-only dimensions', () => {
  const result = BaziRuleEngine.calculateStrength(
    '甲',
    ['癸', '辛', '甲', '己'],
    ['酉', '酉', '申', '巳']
  );

  assert.equal(result.strongWeak, '身弱');
  assert.equal(result.strengthDetail.meter.min, 0);
  assert.equal(result.strengthDetail.meter.max, 10);
  assert.equal(result.strengthDetail.meter.label, '极弱');
  assert.ok(result.strengthDetail.meter.value >= 0);
  assert.ok(result.strengthDetail.meter.value <= 10);

  assert.equal(result.strengthDetail.user_sections.length, 4);
  assert.deepEqual(result.strengthDetail.user_sections.map(section => section.key), [
    'season',
    'root',
    'support',
    'structure',
  ]);
  for (const section of result.strengthDetail.user_sections) {
    assert.equal(typeof section.title, 'string');
    assert.equal(typeof section.text, 'string');
    assert.ok(section.text.length > 8);
    assert.equal(Object.hasOwn(section, 'score'), false);
    assert.equal(Object.hasOwn(section, 'scoreLabel'), false);
  }

  assert.equal(result.strengthDetail.season_detail.max_score, 4);
  assert.equal(result.strengthDetail.root_detail.max_score, 3);
  assert.equal(result.strengthDetail.support_detail.max_score, 2);
  assert.equal(result.strengthDetail.structure_exception.max_adjustment, 1);
});

test('calculateStrength keeps rootless dominant charts eligible for cong override only when no help exists', () => {
  const result = BaziRuleEngine.calculateStrength(
    '甲',
    ['丙', '丙', '甲', '丙'],
    ['辰', '巳', '巳', '巳']
  );

  assert.equal(result.dayMasterHasRoot, false);
  assert.equal(result.stemHasHelp, false);
  assert.ok(result.strongWeak.includes('疑似从格'));
  assert.match(result.strengthBasis, /四支无根/);
});

test('parseTiaohou preserves favorable and unfavorable priority markers', () => {
  const parsed = BaziRuleEngine._test.parseTiaohou('1丙2_癸3庚丁');

  assert.deepEqual(parsed.favorable, [
    { gan: '丙', priority: 1 },
    { gan: '庚', priority: 3 },
    { gan: '丁', priority: 3 },
  ]);
  assert.deepEqual(parsed.unfavorable, [
    { gan: '癸', priority: 2 },
  ]);
});

test('getFavorableUnfavorable scores tiaohou by exact stem priority instead of whole element', () => {
  const result = BaziRuleEngine.getFavorableUnfavorable(
    '甲',
    '子',
    '正印格',
    { strongWeak: '身中', totalStrengthScore: 5 },
    ['辰', '子', '辰', '丑'],
    ['戊', '壬', '甲', '己']
  );

  assert.equal(result.dimension_breakdown['伤官'].tiaohou, 50);
  assert.equal(result.dimension_breakdown['食神'].tiaohou, 35);
  assert.equal(result.dimension_breakdown['七杀'].tiaohou, 35);
  assert.equal(result.dimension_breakdown['正官'].tiaohou, 0);
});

test('getFavorableUnfavorable applies tiaohou unfavorable gradient and restraint downgrade', () => {
  const baseStrength = { strongWeak: '身强', totalStrengthScore: 7 };
  const light = BaziRuleEngine.getFavorableUnfavorable(
    '甲', '寅', '建禄格', baseStrength,
    ['子', '寅', '子', '寅'],
    ['甲', '丙', '甲', '庚']
  );
  const medium = BaziRuleEngine.getFavorableUnfavorable(
    '甲', '寅', '建禄格', baseStrength,
    ['子', '寅', '子', '子'],
    ['甲', '丙', '甲', '庚']
  );
  const heavy = BaziRuleEngine.getFavorableUnfavorable(
    '甲', '寅', '建禄格', baseStrength,
    ['子', '寅', '子', '子'],
    ['壬', '丙', '甲', '庚']
  );
  const restrainedHeavy = BaziRuleEngine.getFavorableUnfavorable(
    '甲', '寅', '建禄格', baseStrength,
    ['子', '寅', '子', '子'],
    ['壬', '丙', '甲', '戊']
  );

  assert.equal(light.dimension_breakdown['正印'].tiaohou, -20);
  assert.equal(medium.dimension_breakdown['正印'].tiaohou, -35);
  assert.equal(heavy.dimension_breakdown['正印'].tiaohou, -50);
  assert.equal(restrainedHeavy.dimension_breakdown['正印'].tiaohou, -35);
});

test('getFavorableUnfavorable returns user-facing tiaohou diagnosis', () => {
  const result = BaziRuleEngine.getFavorableUnfavorable(
    '甲',
    '子',
    '正印格',
    { strongWeak: '身中', totalStrengthScore: 5 },
    ['辰', '子', '辰', '丑'],
    ['戊', '壬', '甲', '己']
  );

  assert.equal(result.tiaohou_detail.key, '甲子');
  assert.equal(result.tiaohou_detail.climate_state, '寒湿偏重');
  assert.equal(result.tiaohou_detail.urgency, '偏急');
  assert.deepEqual(result.tiaohou_detail.primary_gods, [
    { gan: '丁', shen: '伤官', wuxing: '火', priority: 1, role: '第一调候' },
  ]);
  assert.deepEqual(result.tiaohou_detail.secondary_gods, [
    { gan: '丙', shen: '食神', wuxing: '火', priority: 2, role: '辅助调候' },
    { gan: '庚', shen: '七杀', wuxing: '金', priority: 2, role: '辅助调候' },
  ]);
  assert.match(result.tiaohou_detail.explanation, /寒湿偏重/);
  assert.match(result.tiaohou_detail.explanation, /丁火/);
});

test('getFavorableUnfavorable adds light and heavy bingyao tiers', () => {
  const light = BaziRuleEngine.getFavorableUnfavorable(
    '甲', '辰', '正财格',
    { strongWeak: '身强', totalStrengthScore: 7 },
    ['子', '丑', '丑', '辰'],
    ['戊', '甲', '甲', '庚']
  );
  const heavy = BaziRuleEngine.getFavorableUnfavorable(
    '甲', '辰', '正财格',
    { strongWeak: '身强', totalStrengthScore: 7 },
    ['辰', '辰', '丑', '丑'],
    ['戊', '戊', '甲', '己']
  );

  assert.equal(light.dimension_breakdown['正财'].bingyao, -20);
  assert.equal(light.dimension_breakdown['比肩'].bingyao, 20);
  assert.equal(light.dimension_breakdown['正官'].bingyao, 10);
  assert.equal(heavy.dimension_breakdown['正财'].bingyao, -40);
  assert.equal(heavy.dimension_breakdown['比肩'].bingyao, 40);
  assert.equal(heavy.dimension_breakdown['正官'].bingyao, 20);
});

test('getFavorableUnfavorable gives neutral-strength charts half-weight fuyi output', () => {
  const weakMiddle = BaziRuleEngine.getFavorableUnfavorable(
    '癸', '寅', '建禄格',
    { strongWeak: '身中', totalStrengthScore: 4 },
    ['未', '寅', '戌', '丑'],
    ['戊', '甲', '癸', '己']
  );
  const strongMiddle = BaziRuleEngine.getFavorableUnfavorable(
    '癸', '寅', '建禄格',
    { strongWeak: '身中', totalStrengthScore: 6 },
    ['未', '寅', '戌', '丑'],
    ['戊', '甲', '癸', '己']
  );

  assert.equal(weakMiddle.dimension_breakdown['正印'].fuyi, 10);
  assert.equal(weakMiddle.dimension_breakdown['正财'].fuyi, -10);
  assert.ok(weakMiddle.core_shens.favorable.length > 0);
  assert.equal(strongMiddle.dimension_breakdown['正财'].fuyi, 10);
  assert.equal(strongMiddle.dimension_breakdown['正印'].fuyi, -10);
  assert.ok(strongMiddle.core_shens.favorable.length > 0);
});

test('getFavorableUnfavorable does not let strength text override ordinary dimensions', () => {
  const strength = BaziRuleEngine.calculateStrength(
    '甲',
    ['丙', '丙', '甲', '丙'],
    ['辰', '巳', '巳', '巳']
  );
  const result = BaziRuleEngine.getFavorableUnfavorable(
    '甲',
    '巳',
    '食神格',
    strength,
    ['辰', '巳', '巳', '巳'],
    ['丙', '丙', '甲', '丙']
  );

  assert.equal(result.special_pattern, null);
  assert.notEqual(result.decision_chain[0].layer, 'L0 特殊气势');
});

test('getFavorableUnfavorable keeps suspected image candidates in ordinary dimensions', () => {
  const result = BaziRuleEngine.getFavorableUnfavorable(
    '甲',
    '巳',
    '食神格',
    { strongWeak: '疑似从格（从火）', totalStrengthScore: 1 },
    ['辰', '巳', '巳', '巳'],
    ['丙', '丙', '甲', '丙'],
    null,
    {
      primary_candidate: {
        category: 'FOLLOW_IMAGE',
        subtype: '从儿格',
        target_element: '火',
        match_score: 72,
        override_normal_pattern: false,
        yongshen_strategy: 'FOLLOW_FORCE'
      }
    }
  );

  assert.equal(result.special_pattern, null);
  assert.notEqual(result.decision_chain[0].layer, 'L0 特殊气势');
});

test('getFavorableUnfavorable uses formed image candidates for the L0 special-force override', () => {
  const result = BaziRuleEngine.getFavorableUnfavorable(
    '甲',
    '丑',
    '正财格',
    { strongWeak: '身弱', totalStrengthScore: 1 },
    ['丑', '丑', '未', '辰'],
    ['戊', '己', '甲', '戊'],
    null,
    {
      primary_candidate: {
        category: 'FOLLOW_IMAGE',
        subtype: '从财格',
        target_element: '土',
        match_score: 86,
        override_normal_pattern: true,
        yongshen_strategy: 'FOLLOW_FORCE'
      }
    }
  );

  assert.equal(result.special_pattern.type, '从财');
  assert.equal(result.decision_chain[0].layer, 'L0 特殊气势');
  assert.equal(result.tiaohou_detail.key, '甲丑');
  assert.equal(result.tiaohou_detail.special_pattern_warning, '已识别特殊格局，喜忌先顺其成势；调候仍作为气候风险提示，不直接覆盖从格取用。');
  assert.deepEqual(result.core_shens.favorable, ['正财', '偏财', '正官', '七杀']);
  assert.deepEqual(result.core_shens.unfavorable, ['正印', '偏印', '比肩', '劫财']);
  assert.equal(result.dimension_breakdown['正财'].tiaohou, 0);
  assert.equal(result.dimension_breakdown['正财'].cong, 80);
});

test('getFavorableUnfavorable maps structured image override categories to special-force shens', () => {
  const baseArgs = [
    '甲',
    '寅',
    '建禄格',
    { strongWeak: '身中', totalStrengthScore: 5 },
    ['寅', '寅', '寅', '寅'],
    ['甲', '甲', '甲', '甲'],
    null
  ];
  const cases = [
    {
      candidate: { category: 'FOLLOW_IMAGE', subtype: '从官杀格', target_element: '金' },
      type: '从官杀',
      favorable: ['正官', '七杀', '正财', '偏财'],
      unfavorable: ['正印', '偏印', '比肩', '劫财', '食神', '伤官']
    },
    {
      candidate: { category: 'FOLLOW_IMAGE', subtype: '从儿格', target_element: '火' },
      type: '从食伤',
      favorable: ['食神', '伤官', '正财', '偏财'],
      unfavorable: ['正印', '偏印', '比肩', '劫财', '正官', '七杀']
    },
    {
      candidate: { category: 'FOLLOW_IMAGE', subtype: '从势格', target_elements: ['火', '土', '火'] },
      type: '从势',
      favorable: ['食神', '伤官', '正财', '偏财'],
      unfavorable: ['比肩', '劫财', '正印', '偏印']
    },
    {
      candidate: { category: 'SINGLE_IMAGE', subtype: '曲直格', target_element: '木' },
      type: '专旺',
      favorable: ['比肩', '劫财', '食神', '伤官'],
      unfavorable: ['正官', '七杀', '正财', '偏财', '正印', '偏印']
    },
    {
      candidate: { category: 'TRANSFORMATION_IMAGE', subtype: '甲己化土', target_element: '土' },
      type: '甲己化土',
      favorable: ['正财', '偏财'],
      unfavorable: ['比肩', '劫财']
    }
  ];

  for (const { candidate, type, favorable, unfavorable } of cases) {
    const result = BaziRuleEngine.getFavorableUnfavorable(...baseArgs, {
      primary_candidate: {
        ...candidate,
        match_score: 86,
        override_normal_pattern: true
      }
    });
    assert.equal(result.special_pattern.type, type);
    assert.deepEqual(result.core_shens.favorable, favorable);
    assert.deepEqual(result.core_shens.unfavorable, unfavorable);
    assert.equal(result.decision_chain[0].layer, 'L0 特殊气势');
  }
});

test('getFavorableUnfavorable never promotes two-qi image candidates to L0', () => {
  const result = BaziRuleEngine.getFavorableUnfavorable(
    '甲',
    '寅',
    '建禄格',
    { strongWeak: '身中', totalStrengthScore: 5 },
    ['寅', '寅', '寅', '寅'],
    ['甲', '甲', '甲', '甲'],
    null,
    {
      primary_candidate: {
        category: 'TWO_QI_IMAGE',
        subtype: '木火成象',
        target_elements: ['木', '火'],
        match_score: 96,
        override_normal_pattern: true,
        yongshen_strategy: 'DESCRIPTIVE_ONLY'
      }
    }
  );

  assert.equal(result.special_pattern, null);
  assert.notEqual(result.decision_chain[0].layer, 'L0 特殊气势');
});

test('getFavorableUnfavorable keeps weak excess resource from becoming plain unfavorable', () => {
  const result = BaziRuleEngine.getFavorableUnfavorable(
    '甲',
    '辰',
    '正印格',
    { strongWeak: '身弱', totalStrengthScore: 2 },
    ['子', '亥', '子', '丑'],
    ['壬', '癸', '甲', '壬']
  );

  assert.ok(result.favorable_conflicts.some(item => item.type === 'weak_daymaster_excess_resource'));
  assert.ok(result.core_shens.favorable.includes('正印') || result.core_shens.favorable.includes('偏印'));
  assert.ok(!result.core_shens.unfavorable.includes('正印'));
  assert.ok(!result.core_shens.unfavorable.includes('偏印'));
});

test('getFavorableUnfavorable narrows aggregation threshold and prunes divergent paired shens', () => {
  const shens = ['正官', '七杀', '食神', '伤官'];
  const threshold = BaziRuleEngine._test.aggregateShens(shens, {
    '正官': 50,
    '七杀': 44,
    '食神': 10,
    '伤官': 0,
  });
  const pair = BaziRuleEngine._test.aggregateShens(shens, {
    '正官': 0,
    '七杀': 0,
    '食神': 34,
    '伤官': 50,
  });

  assert.deepEqual(threshold.favorable, ['正官']);
  assert.deepEqual(pair.favorable, ['伤官']);
});
