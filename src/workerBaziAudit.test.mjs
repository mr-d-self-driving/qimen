import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../worker/src/index.js', import.meta.url), 'utf8')

test('bazi question worker builds and optionally inserts audit snapshot', () => {
  assert.match(source, /buildBaziSemanticRoutePrompt/)
  assert.match(source, /classifyBaziSemanticRouteWithEnv/)
  assert.match(source, /normalizeBaziSemanticRoute/)
  assert.match(source, /ruleRouteHint/)
  assert.match(source, /buildBaziAuditSnapshot/)
  assert.match(source, /bazi_question_audit/)
  assert.match(source, /insert\(auditSnapshot\)/)
  assert.match(source, /console\.warn\('\[qimen-api\] bazi audit insert failed:/)
})
