const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildScoreAuditPromptSection,
  buildSummaryPromptSection
} = require('./qimenPromptSections');

test('buildScoreAuditPromptSection requires auditable scoring and detailed adjustment reasons', () => {
  const section = buildScoreAuditPromptSection({
    version: 'qimen-score-v1',
    base_score: 60,
    final_score: 72,
    adjustments: [
      { signal: '开门旺相', effect: '+5', reason: '岗位机会有力' }
    ]
  });

  assert.match(section, /score_audit/);
  assert.match(section, /base_score/);
  assert.match(section, /adjustments/);
  assert.match(section, /final_score/);
  assert.match(section, /后端程序评分已经完成/);
  assert.match(section, /不得自行重算/);
  assert.match(section, /summary\.score 必须等于后端 score_audit\.final_score/);
  assert.match(section, /model_review/);
  assert.match(section, /correction_suggestions/);
  assert.match(section, /开门旺相/);
  assert.doesNotMatch(section, /base_score 固定从 50 起步/);
});

test('buildSummaryPromptSection constrains summary fields and repayment timing language', () => {
  const section = buildSummaryPromptSection();

  assert.match(section, /summary\.title/);
  assert.match(section, /summary\.conclusion/);
  assert.match(section, /summary\.keyword/);
  assert.match(section, /summary\.score_basis/);
  assert.match(section, /欠款还款/);
  assert.match(section, /不宜断为必然到账/);
  assert.match(section, /summary\.score 必须沿用 score_audit\.final_score/);
});
