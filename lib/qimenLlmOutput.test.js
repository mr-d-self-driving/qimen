const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeQimenLlmOutput } = require('./qimenLlmOutput');

test('normalizeQimenLlmOutput unwraps single-object array responses', () => {
  const normalized = normalizeQimenLlmOutput([
    {
      summary: { title: '婚期判断', conclusion: '先观察现实进展', score: 53 },
      advice: { strategy: ['先确认双方现实条件'] }
    }
  ]);

  assert.equal(normalized.summary.title, '婚期判断');
  assert.equal(normalized.advice.strategy[0], '先确认双方现实条件');
  assert.equal(Object.hasOwn(normalized, '0'), false);
});

test('normalizeQimenLlmOutput preserves plain object responses', () => {
  const raw = {
    summary: { title: '工作判断', conclusion: '可观察', score: 61 },
    advice: { strategy: ['整理履历'] }
  };

  assert.equal(normalizeQimenLlmOutput(raw), raw);
});
