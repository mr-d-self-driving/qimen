import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../worker/src/index.js', import.meta.url), 'utf8')

test('/api/bazi worker uses section streaming helpers for profile LLM output', () => {
  assert.match(source, /buildBaziProfileSectionPrompt/)
  assert.match(source, /buildBaziSummaryFromSections/)
  assert.match(source, /createBaziSectionStreamParser/)
  assert.match(source, /requestLLMStreamSections/)
  assert.doesNotMatch(source, /请返回如下结构的JSON/)
})

test('/api/bazi emits engine-first and section-level SSE events', () => {
  assert.match(source, /type:\s*'engine_complete'/)
  assert.match(source, /type:\s*'llm_section_start'/)
  assert.match(source, /type:\s*'llm_delta'/)
  assert.match(source, /type:\s*'llm_section_done'/)
  assert.match(source, /type:\s*'llm_complete'/)
  assert.match(source, /type:\s*'llm_error'/)
})

test('/api/bazi writes engine fallback before final llm fields', () => {
  assert.match(source, /status:\s*'engine_ready'/)
  assert.match(source, /display_source:\s*'engine'/)
  assert.match(source, /llm_yuanju_core:\s*null/)
  assert.match(source, /status:\s*'llm_complete'/)
  assert.match(source, /display_source:\s*'llm'/)
})
