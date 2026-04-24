import test from 'node:test'
import assert from 'node:assert/strict'

const createMemoryStorage = () => {
  const state = new Map()
  return {
    getItem(key) {
      return state.has(key) ? state.get(key) : null
    },
    setItem(key, value) {
      state.set(key, value)
    },
    removeItem(key) {
      state.delete(key)
    }
  }
}

test('warmFortuneCache primes shared cache for the next 7 days', async () => {
  const storage = createMemoryStorage()
  const fortuneCache = await import('./fortuneCache.mjs')
  const warmup = await import('./fortuneWarmup.mjs')

  fortuneCache.__resetFortuneCacheForTests()
  warmup.__resetFortuneWarmupForTests()

  const calls = []
  await warmup.warmFortuneCache({
    storage,
    userId: 'user-1',
    now: new Date('2026-04-24T09:00:00+08:00'),
    fetchFortunes: async ({ userId, dateKeys }) => {
      calls.push({ userId, dateKeys })
      return [
        { period_key: '2026-04-24', data_json: { day_score: 88 } },
        { period_key: '2026-04-26', data_json: { day_score: 72 } }
      ]
    }
  })

  assert.equal(calls.length, 1)
  assert.equal(calls[0].userId, 'user-1')
  assert.deepEqual(calls[0].dateKeys, [
    '2026-04-24',
    '2026-04-25',
    '2026-04-26',
    '2026-04-27',
    '2026-04-28',
    '2026-04-29',
    '2026-04-30'
  ])
  assert.deepEqual(
    fortuneCache.loadCachedFortune(storage, 'user-1', '2026-04-24', new Date('2026-04-24T10:00:00+08:00')),
    { day_score: 88 }
  )
  assert.deepEqual(
    fortuneCache.loadCachedFortune(storage, 'user-1', '2026-04-26', new Date('2026-04-24T10:00:00+08:00')),
    { day_score: 72 }
  )
})

test('warmFortuneCache deduplicates same-user warmup within the same Beijing day', async () => {
  const storage = createMemoryStorage()
  const fortuneCache = await import('./fortuneCache.mjs')
  const warmup = await import('./fortuneWarmup.mjs')

  fortuneCache.__resetFortuneCacheForTests()
  warmup.__resetFortuneWarmupForTests()

  let callCount = 0
  const fetchFortunes = async () => {
    callCount += 1
    return []
  }

  await warmup.warmFortuneCache({
    storage,
    userId: 'user-1',
    now: new Date('2026-04-24T09:00:00+08:00'),
    fetchFortunes
  })
  await warmup.warmFortuneCache({
    storage,
    userId: 'user-1',
    now: new Date('2026-04-24T20:00:00+08:00'),
    fetchFortunes
  })

  assert.equal(callCount, 1)
})
