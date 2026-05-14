import test from 'node:test'
import assert from 'node:assert/strict'

import {
  globalState,
  resolveSelectedBaziProfileId,
  setSelectedBaziProfileId
} from '../store.js'

test('setSelectedBaziProfileId updates the shared selected profile', () => {
  setSelectedBaziProfileId('profile-a')
  assert.equal(globalState.selectedBaziProfileId, 'profile-a')

  setSelectedBaziProfileId('')
  assert.equal(globalState.selectedBaziProfileId, '')
})

test('resolveSelectedBaziProfileId prefers route, then shared selection, then existing local selection, then default', () => {
  const profiles = [
    { id: 'profile-a', is_default: false },
    { id: 'profile-b', is_default: true },
    { id: 'profile-c', is_default: false }
  ]

  assert.equal(resolveSelectedBaziProfileId(profiles, {
    requestedProfileId: 'profile-c',
    sharedProfileId: 'profile-a',
    currentProfileId: 'profile-b'
  }), 'profile-c')

  assert.equal(resolveSelectedBaziProfileId(profiles, {
    requestedProfileId: 'missing',
    sharedProfileId: 'profile-a',
    currentProfileId: 'profile-b'
  }), 'profile-a')

  assert.equal(resolveSelectedBaziProfileId(profiles, {
    requestedProfileId: '',
    sharedProfileId: 'missing',
    currentProfileId: 'profile-c'
  }), 'profile-c')

  assert.equal(resolveSelectedBaziProfileId(profiles, {
    requestedProfileId: '',
    sharedProfileId: '',
    currentProfileId: ''
  }), 'profile-b')
})
