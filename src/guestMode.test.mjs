import assert from 'node:assert/strict'
import {
  createMemoryStorage,
  getGuestState,
  recordGuestQuestion,
  saveGuestBaziProfile,
  buildGuestEventPayload
} from './guestMode.mjs'

const storage = createMemoryStorage()

assert.equal(getGuestState(storage).questionCount, 0)
assert.equal(getGuestState(storage).baziProfile, null)

recordGuestQuestion(storage)
assert.equal(getGuestState(storage).questionCount, 1)
assert.equal(getGuestState(storage).canAskQuestion, false)

saveGuestBaziProfile(storage, { name: '访客', gender: 'M', birth_date: '1990-01-01 12:00:00' })
assert.equal(getGuestState(storage).baziProfile.name, '访客')
assert.equal(getGuestState(storage).canAddBaziProfile, false)

const payload = buildGuestEventPayload(storage, 'guest_bazi_profile_added', 'bazi', { limit_reached: true })
assert.equal(payload.event_name, 'guest_bazi_profile_added')
assert.equal(payload.feature, 'bazi')
assert.equal(payload.metadata.limit_reached, true)
assert.match(payload.guest_id, /^guest_/)
assert.equal(payload.metadata.name, undefined)
