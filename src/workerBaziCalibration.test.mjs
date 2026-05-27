import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const workerSource = readFileSync(new URL('../worker/src/index.js', import.meta.url), 'utf8')
const migrationSource = readFileSync(new URL('../docs/sql/bazi-calibration-migration.sql', import.meta.url), 'utf8')

test('bazi calibration migration includes the version column used by the worker', () => {
  assert.match(migrationSource, /calibrated_version text/)
  assert.match(workerSource, /calibrated_version/)
})

test('bazi calibration does not report profile fetch errors as authorization failures', () => {
  assert.match(workerSource, /profileError/)
  assert.match(workerSource, /bazi-calibrate profile fetch failed/)
  assert.match(workerSource, /读取档案失败/)
  assert.match(workerSource, /无权操作该档案/)
})
