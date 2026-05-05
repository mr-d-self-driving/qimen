import assert from 'node:assert/strict'
import { buildGoogleOAuthSignInArgs } from './googleOAuth.mjs'

const args = buildGoogleOAuthSignInArgs('https://qimen.example.com/fortune?tab=daily')

assert.deepEqual(args, {
  provider: 'google',
  options: {
    redirectTo: 'https://qimen.example.com'
  }
})
