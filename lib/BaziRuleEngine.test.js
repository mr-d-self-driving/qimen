const test = require('node:test');
const assert = require('node:assert/strict');

const { BaziRuleEngine } = require('./BaziRuleEngine');

test('calculateStrength uses updated layered scoring and returns explanation copy', () => {
  const result = BaziRuleEngine.calculateStrength(
    '戊',
    ['丁', '辛', '戊', '庚'],
    ['丑', '亥', '午', '申']
  );

  assert.equal(result.strongWeak, '身中');
  assert.equal(result.totalStrengthScore, 4);
  assert.equal(result.moonScore, 0);
  assert.equal(result.groundScore, 3);
  assert.equal(result.stemHelpScore, 1);
  assert.equal(result.dayMasterHasRoot, true);
  assert.equal(result.strengthDetail.summary, '日主身中，综合得分4分。');
  assert.equal(result.strengthDetail.sections.length, 5);
  assert.equal(result.strengthDetail.sections[1].text, '以年/日/时三支计分：日支午为帝旺，计3分；合计3分。');
  assert.equal(result.strengthDetail.sections[2].text, '年干丁为印，透干无根，计1分；合计1分。');
  assert.equal(result.strengthDetail.sections[4].text, '日主有根，天干有帮身，金占比约27%，不触发从格/专旺覆盖。');
  assert.match(result.strengthBasis, /属失令/);
  assert.match(result.strengthBasis, /日支午为帝旺/);
  assert.match(result.strengthBasis, /年干丁为印/);
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
  assert.match(result.strengthBasis, /真无根/);
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

test('getFavorableUnfavorable lets suspected cong pattern override ordinary dimensions', () => {
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

  assert.equal(result.special_pattern.type, '从食伤');
  assert.deepEqual(result.core_shens.favorable, ['食神', '伤官', '正财', '偏财']);
  assert.deepEqual(result.core_shens.unfavorable, ['正印', '偏印', '比肩', '劫财', '正官', '七杀']);
  assert.equal(result.dimension_breakdown['食神'].tiaohou, 0);
  assert.equal(result.dimension_breakdown['食神'].cong, 80);
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
