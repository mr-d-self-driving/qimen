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

test('rememberFortuneCache restores cached payload for the same user/date across instances', async () => {
  const storage = createMemoryStorage()
  const cache = await import('./fortuneCache.mjs')

  cache.__resetFortuneCacheForTests()
  cache.rememberFortuneCache(storage, 'user-1', '2026-04-24', { day_score: 88 })
  cache.__resetFortuneCacheForTests()

  assert.deepEqual(
    cache.loadCachedFortune(storage, 'user-1', '2026-04-24', new Date('2026-04-24T10:00:00+08:00')),
    { day_score: 88 }
  )
})

test('loadCachedFortune ignores expired Beijing-day cache entries', async () => {
  const storage = createMemoryStorage()
  const cache = await import('./fortuneCache.mjs')

  cache.__resetFortuneCacheForTests()
  cache.rememberFortuneCache(storage, 'user-1', '2026-04-24', { day_score: 66 })
  cache.__resetFortuneCacheForTests()

  assert.equal(
    cache.loadCachedFortune(storage, 'user-1', '2026-04-24', new Date('2026-04-25T00:00:01+08:00')),
    null
  )
})
