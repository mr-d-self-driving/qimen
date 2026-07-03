import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreCase,
  scoreYongTop1,
  scoreXijiDirection,
  normalizeShen,
} from './scorer.mjs';

test('normalizeShen maps short and classical aliases to canonical ten-god names', () => {
  assert.equal(normalizeShen('印'), '正印');
  assert.equal(normalizeShen('枭'), '偏印');
  assert.equal(normalizeShen('印绶'), '正印');
  assert.equal(normalizeShen('官星'), '正官');
});

test('scoreYongTop1 gives full credit when ten-god and element match', () => {
  const result = scoreYongTop1(
    { yong: [{ shen: '食神', wuxing: '火', stem: '丁' }], ji: [] },
    { yong: '食神', yong_wuxing: '火', favorable_shens: ['食神'] }
  );

  assert.equal(result.ratio, 1);
  assert.equal(result.critical, false);
});

test('scoreYongTop1 marks critical failure when actual yong falls into gold ji', () => {
  const result = scoreYongTop1(
    { yong: [{ shen: '食神', wuxing: '火' }], ji: [{ shen: '偏印', wuxing: '水' }] },
    { yong: '偏印', yong_wuxing: '水', favorable_shens: ['偏印'] }
  );

  assert.equal(result.ratio, 0);
  assert.equal(result.critical, true);
});

test('scoreXijiDirection penalizes favoring a gold忌 element', () => {
  const result = scoreXijiDirection(
    { yong: [], xi: [{ wuxing: '火' }], ji: [{ wuxing: '水' }] },
    { yong: '正官', yong_wuxing: '水', favorable_wuxing: ['水'], unfavorable_wuxing: [] }
  );

  assert.equal(result.critical, true);
  assert.ok(result.ratio < 0.5);
});

test('scoreXijiDirection does not mark sibling ten-god conflict as critical when exact shen is favorable', () => {
  const result = scoreXijiDirection(
    { yong: [], xi: [{ shen: '正官', wuxing: '木' }], ji: [] },
    {
      yong: '正印',
      yong_wuxing: '火',
      favorable_shens: ['正官'],
      favorable_wuxing: ['火', '木'],
      unfavorable_shens: ['七杀'],
      unfavorable_wuxing: [],
    }
  );

  assert.equal(result.critical, false);
  assert.equal(result.ratio, 1);
});

test('scoreXijiDirection still marks exact favorable-in-unfavorable conflict as critical', () => {
  const result = scoreXijiDirection(
    { yong: [], xi: [{ shen: '正官', wuxing: '木' }], ji: [] },
    {
      favorable_shens: [],
      favorable_wuxing: [],
      unfavorable_shens: ['正官'],
      unfavorable_wuxing: ['木'],
    }
  );

  assert.equal(result.critical, true);
});

test('scoreCase normalizes weights to scoringScope', () => {
  const row = scoreCase({
    caseDef: {
      id: 'scope_only_geju',
      label: 'scope only geju',
      gold: { geju: { primary: '七杀格', aliases: [] }, methodTags: ['七杀格'] },
      scoringScope: ['geju', 'method'],
    },
    actual: {
      geju: '七杀格',
      strong_weak: '身弱',
      decision_chain: ['L2 格局：七杀格。'],
    },
  });

  assert.equal(row.score, 100);
  assert.deepEqual(Object.keys(row.dimension_scores).sort(), ['geju', 'method']);
  assert.equal(row.case_class, 'general');
});

test('scoreCase preserves classical_pattern case class', () => {
  const row = scoreCase({
    caseDef: {
      id: 'classical_case',
      label: 'classical case',
      caseClass: 'classical_pattern',
      gold: { geju: { primary: '魁罡格', aliases: [] } },
      scoringScope: ['geju'],
    },
    actual: {
      geju: '偏财格',
    },
  });

  assert.equal(row.case_class, 'classical_pattern');
});
