const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getFlowMonthInfo,
  listFlowMonths,
  buildFlowMonthCacheMeta,
} = require('./flowMonth');

test('getFlowMonthInfo resolves jie-based month range from a jie day', () => {
  const info = getFlowMonthInfo('2026-05-05');

  assert.equal(info.period_key, '2026-05-05');
  assert.equal(info.start_date, '2026-05-05');
  assert.equal(info.end_date, '2026-06-04');
  assert.equal(info.start_jie, '立夏');
  assert.equal(info.next_jie, '芒种');
  assert.equal(info.month_gz, '癸巳');
  assert.equal(info.context_month_key, '2026-05');
  assert.match(info.range_label, /5月5日\s*-\s*6月4日/);
});

test('listFlowMonths builds a forward sequence of flow months around the anchor', () => {
  const months = listFlowMonths('2026-05-05', { before: 1, after: 1 });

  assert.equal(months.length, 3);
  assert.equal(months[0].period_key, '2026-04-05');
  assert.equal(months[1].period_key, '2026-05-05');
  assert.equal(months[2].period_key, '2026-06-05');
  assert.equal(months[1].month_gz, '癸巳');
});

test('buildFlowMonthCacheMeta expires at the end of the flow month', () => {
  const meta = buildFlowMonthCacheMeta('2026-05-05');

  assert.equal(meta.period_key, '2026-05-05');
  assert.equal(meta.start_date, '2026-05-05');
  assert.equal(meta.end_date, '2026-06-04');
  assert.ok(meta.expiresAt instanceof Date);
  assert.ok(meta.secondsUntilEnd > 0);
});
