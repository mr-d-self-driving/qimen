const test = require('node:test');
const assert = require('node:assert/strict');
const { buildScoreAuditPromptSection } = require('./qimenPromptSections');

test('buildScoreAuditPromptSection requires auditable scoring and detailed adjustment reasons', () => {
  const section = buildScoreAuditPromptSection();

  assert.match(section, /score_audit/);
  assert.match(section, /base_score/);
  assert.match(section, /adjustments/);
  assert.match(section, /final_score/);
  assert.match(section, /summary\.score 必须等于 score_audit\.final_score/);
  assert.match(section, /盘面依据/);
  assert.match(section, /现实映射/);
  assert.match(section, /推导边界/);
  assert.match(section, /值使生门落坤2宫，且坤2宫同时带日马\/时马/);
  assert.match(section, /不能直接推导为已经落实、马上成功或稳成/);
});
