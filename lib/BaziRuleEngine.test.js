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
