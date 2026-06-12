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

test('固定时间起局：worker 走 buildQimenChart + parsePanTime，并支持 engineOnly 短路', () => {
  // 起盘单一源（与 lib/qimenChart.test.js 同源）
  assert.match(source, /import \{ buildQimenChart \} from '\.\.\/\.\.\/lib\/qimenChart\.js'/)
  assert.match(source, /import \{ parsePanTime \} from '\.\.\/\.\.\/lib\/panTime\.js'/)
  assert.match(source, /const panTimeParts = parsePanTime\(body\.panTime\)/)
  assert.match(source, /const chart = buildQimenChart\(\{ year, month, day, hour, minute \}\)/)
  // 固定时刻不做时区二次偏移
  assert.match(source, /\(\{ year, month, day, hour, minute \} = panTimeParts\)/)
  // engineOnly：跳过 LLM，零 API 花费
  assert.match(source, /if \(body\.engineOnly === true\)/)
})

test('CP2 路由钳制：/api/divination-route 在含 panTime 时把 bazi 钳为 hybrid', () => {
  assert.match(source, /if \(body\.hasPanTime && route\.branch === 'bazi'\)/)
  assert.match(source, /route\.branch = 'hybrid'/)
  assert.match(source, /clampedByPanTime = true/)
})
