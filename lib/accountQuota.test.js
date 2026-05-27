const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DAILY_PROFILE_ACTION_LIMIT,
  DAILY_QIMEN_LIMIT,
  assertDailyProfileActionQuota,
  assertDailyQimenQuota,
  buildBeijingNaturalDayRange,
  isWhitelistedEmail,
} = require('./accountQuota');

test('buildBeijingNaturalDayRange returns the UTC window for a Beijing natural day', () => {
  const range = buildBeijingNaturalDayRange(new Date('2026-05-26T16:30:00.000Z'));

  assert.equal(range.dayKey, '2026-05-27');
  assert.equal(range.startIso, '2026-05-26T16:00:00.000Z');
  assert.equal(range.endIso, '2026-05-27T16:00:00.000Z');
});

test('isWhitelistedEmail normalizes configured whitelist addresses', () => {
  assert.equal(isWhitelistedEmail('VIP@example.com', ' admin@example.com, vip@example.com '), true);
  assert.equal(isWhitelistedEmail('user@example.com', ' admin@example.com, vip@example.com '), false);
});

test('assertDailyQimenQuota allows two daily divinations and rejects the third', async () => {
  const queries = [];
  const supabase = createQuotaSupabaseMock({ count: DAILY_QIMEN_LIMIT, queries });

  await assert.rejects(
    assertDailyQimenQuota({ supabase, userId: 'user-1', now: new Date('2026-05-26T08:00:00.000Z') }),
    /2 次/
  );

  assert.deepEqual({
    table: queries[0].table,
    userId: queries[0].userId,
    gte: queries[0].gte,
    lt: queries[0].lt,
  }, {
    table: 'qimen_records',
    userId: 'user-1',
    gte: '2026-05-25T16:00:00.000Z',
    lt: '2026-05-26T16:00:00.000Z',
  });
});

test('assertDailyProfileActionQuota uses a separate daily profile action counter', async () => {
  const qimenQueries = [];
  const profileQueries = [];

  await assertDailyQimenQuota({
    supabase: createQuotaSupabaseMock({ count: DAILY_QIMEN_LIMIT - 1, queries: qimenQueries }),
    userId: 'user-1',
    now: new Date('2026-05-26T08:00:00.000Z'),
  });

  await assert.rejects(
    assertDailyProfileActionQuota({
      supabase: createQuotaSupabaseMock({ count: DAILY_PROFILE_ACTION_LIMIT, queries: profileQueries }),
      userId: 'user-1',
      now: new Date('2026-05-26T08:00:00.000Z'),
    }),
    /1 个档案/
  );

  assert.equal(qimenQueries[0].table, 'qimen_records');
  assert.equal(profileQueries[0].table, 'bazi_profile_usage');
});

function createQuotaSupabaseMock({ count, queries }) {
  return {
    from(table) {
      const query = { table };
      queries.push(query);
      return {
        select(_columns, options) {
          query.selectOptions = options;
          return this;
        },
        eq(column, value) {
          if (column === 'user_id') query.userId = value;
          if (column === 'action_type') query.actionType = value;
          return this;
        },
        gte(column, value) {
          if (column === 'created_at') query.gte = value;
          return this;
        },
        lt(column, value) {
          if (column === 'created_at') query.lt = value;
          return Promise.resolve({ count, error: null });
        },
      };
    },
  };
}
