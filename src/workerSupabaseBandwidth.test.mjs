import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../worker/src/index.js', import.meta.url), 'utf8')

test('worker avoids select star for bazi profile API fetches', () => {
  assert.match(source, /const BAZI_PROFILE_QUESTION_SELECT = /)
  assert.match(source, /const BAZI_PROFILE_PANEL_SELECT = /)
  assert.match(source, /const BAZI_PROFILE_GENERATE_SELECT = /)
  assert.doesNotMatch(source, /from\('bazi_profiles'\)\.select\('\*'\)/)
  assert.doesNotMatch(source, /\.from\('bazi_profiles'\)[\s\S]{0,120}\.select\('\*'\)/)
})
