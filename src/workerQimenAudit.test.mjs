import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../worker/src/index.js', import.meta.url), 'utf8')

test('qimen worker builds and optionally inserts question audit snapshot', () => {
  assert.match(source, /buildQimenAuditSnapshot/)
  assert.match(source, /qimen_question_audit/)
  assert.match(source, /timing_analysis_backend/)
  assert.match(source, /timing_prompt_section/)
  assert.match(source, /postprocess_audit/)
  assert.match(source, /insert\(qimenAuditSnapshot\)/)
  assert.match(source, /console\.warn\('\[qimen-api\] qimen audit insert failed:/)
})

test('qimen worker prompt uses narrative sections instead of a large JSON schema template', () => {
  assert.match(source, /buildFrontendCopyProtocolSection/)
  assert.match(source, /buildQimenInferenceRulesSection/)
  assert.match(source, /buildQimenOutputContractSection/)
  assert.match(source, /inferenceRulesSection/)
  assert.match(source, /frontendCopyProtocolSection/)
  assert.match(source, /outputContractSection/)
  assert.match(source, /aiJsonData\.score_review \|\| aiJsonData\.score_audit/)
  assert.match(source, /rawLlmTimingReview/)
  assert.doesNotMatch(source, /请严格按照以下 JSON 结构返回数据/)
  assert.doesNotMatch(source, /"summary": \{\n    "title": "短标题/)
  assert.doesNotMatch(source, /"domain_view": \{\n    "type": "career_business/)
})

test('qimen worker writes backend supplements back into qimen_report', () => {
  assert.match(source, /const enrichedQimenReport = \{/)
  assert.match(source, /m1_conclusion:[\s\S]{0,260}score:\s*finalScore/)
  assert.match(source, /m1_conclusion:[\s\S]{0,420}score_basis:/)
  assert.match(source, /m2_basis:[\s\S]{0,420}chart_summary:/)
  assert.match(source, /m2_basis:[\s\S]{0,520}formation_tags:/)
  assert.match(source, /m3_inference:[\s\S]{0,260}interaction_decision:/)
  assert.match(source, /relation:\s*backendScoreAudit\.relations\?\.\[0\] \|\| null/)
  assert.match(source, /qimen_report:\s*enrichedQimenReport/)
})
