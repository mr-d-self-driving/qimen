const STORAGE_KEY = 'qimen:fortune-cache:v1'

const fortuneCacheByKey = new Map()
const pendingInterpretationByKey = new Map()

const normalizeProfileKey = (profileId) => profileId || 'default'

const buildCacheKey = (userId, dateStr, profileId) => `${userId}::${dateStr}::${normalizeProfileKey(profileId)}`

const getBeijingExpiry = (dateStr) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 0
  return new Date(`${dateStr}T23:59:59.999+08:00`).getTime()
}

const readStorageState = (storage) => {
  if (!storage) return {}
  try {
    const raw = storage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (error) {
    console.warn('日运本地缓存读取失败，忽略缓存:', error)
    return {}
  }
}

const writeStorageState = (storage, state) => {
  if (!storage) return
  try {
    if (Object.keys(state).length === 0) {
      storage.removeItem(STORAGE_KEY)
      return
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('日运本地缓存写入失败，忽略缓存:', error)
  }
}

const pruneExpiredEntries = (state, nowMs) => {
  const nextState = {}
  Object.entries(state).forEach(([key, entry]) => {
    if (entry?.expiresAt > nowMs && entry?.data) nextState[key] = entry
  })
  return nextState
}

export const loadCachedFortune = (storage, userId, dateStr, now = new Date(), profileId = '') => {
  if (!userId || !dateStr) return null

  const key = buildCacheKey(userId, dateStr, profileId)
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime()
  const memoryCached = fortuneCacheByKey.get(key)
  if (memoryCached) return memoryCached

  const storageState = pruneExpiredEntries(readStorageState(storage), nowMs)
  const entry = storageState[key]
  if (!entry) {
    writeStorageState(storage, storageState)
    return null
  }

  fortuneCacheByKey.set(key, entry.data)
  writeStorageState(storage, storageState)
  return entry.data
}

export const rememberFortuneCache = (storage, userId, dateStr, data, now = new Date(), profileId = '') => {
  if (!userId || !dateStr || !data) return

  const key = buildCacheKey(userId, dateStr, profileId)
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime()
  const expiresAt = getBeijingExpiry(dateStr)
  if (expiresAt <= nowMs) return

  fortuneCacheByKey.set(key, data)

  const storageState = pruneExpiredEntries(readStorageState(storage), nowMs)
  storageState[key] = { data, expiresAt }
  writeStorageState(storage, storageState)
}

export const getPendingInterpretation = (userId, dateStr, profileId = '') => {
  if (!userId || !dateStr) return null
  return pendingInterpretationByKey.get(buildCacheKey(userId, dateStr, profileId)) || null
}

export const rememberPendingInterpretation = (userId, dateStr, promise, profileId = '') => {
  if (!userId || !dateStr || !promise) return
  pendingInterpretationByKey.set(buildCacheKey(userId, dateStr, profileId), promise)
}

export const clearPendingInterpretation = (userId, dateStr, profileId = '') => {
  if (!userId || !dateStr) return
  pendingInterpretationByKey.delete(buildCacheKey(userId, dateStr, profileId))
}

export const __resetFortuneCacheForTests = () => {
  fortuneCacheByKey.clear()
  pendingInterpretationByKey.clear()
}
