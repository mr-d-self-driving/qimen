# 八字 SSE 流式出参 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement方案 B: `/api/bazi` 先落库并展示规则引擎结果，再通过 SSE 按 section 流式输出 LLM 文案。

**Architecture:** Add a small section-stream parser/helper in `lib/`, keep `/api/bazi` pre-stream JSON errors, then switch generation to SSE once validation passes. Frontend `BaziView.vue` reads SSE events, refreshes on `engine_complete`, shows local streamed overrides for three LLM sections, and refreshes again on `llm_complete`.

**Tech Stack:** Cloudflare Worker style `ReadableStream`, OpenAI-compatible chat completions, Vue 3 Composition API, Node `node:test`.

---

### Task 1: Section Streaming Helper

**Files:**
- Create: `lib/baziLlmSections.js`
- Create: `lib/baziLlmSections.test.js`

- [ ] **Step 1: Write failing parser tests**

Add tests proving the helper can parse sentinel-delimited chunks, tolerate split markers, reject unknown sections, and fall back from legacy labels.

- [ ] **Step 2: Run parser tests and verify RED**

Run: `npm test -- lib/baziLlmSections.test.js`

Expected: tests fail because `lib/baziLlmSections.js` does not exist.

- [ ] **Step 3: Implement parser/helper**

Implement:

- `BAZI_LLM_SECTION_KEYS`
- `buildBaziProfileSectionPrompt(ctx)`
- `createBaziSectionStreamParser({ onSectionStart, onDelta, onSectionDone })`
- `parseBaziSectionText(text)`
- `buildBaziSummaryFromSections({ geJu, sections })`

- [ ] **Step 4: Run parser tests and verify GREEN**

Run: `npm test -- lib/baziLlmSections.test.js`

Expected: PASS.

### Task 2: Backend SSE Flow

**Files:**
- Modify: `worker/src/index.js`
- Add tests if practical through helper-level coverage; Worker integration is hard because current Worker is not module-exported.

- [ ] **Step 1: Add backend contract static tests**

Add or extend a source-level test to assert `worker/src/index.js` imports the helper, emits `engine_complete`, emits `llm_delta`, and uses the sentinel prompt helper instead of the old JSON-only Bazi profile prompt.

- [ ] **Step 2: Run Worker contract test and verify RED**

Run the targeted test file.

Expected: FAIL before backend implementation.

- [ ] **Step 3: Implement streaming LLM helper inside Worker**

Add `requestLLMStreamSections(prompt, env, handlers, options)` using `stream: true`. Parse OpenAI-compatible `data: ...` chunks and forward text deltas into the section parser. Keep a non-stream fallback only if response content is not event-stream.

- [ ] **Step 4: Convert `handleBazi()` generation path**

Keep cache hit and engine-refresh-with-existing-LLM behavior compatible. For full generation:

1. Start SSE after validation/quota.
2. Build `baziDetail`.
3. Write engine-first payload.
4. Emit `engine_complete`.
5. Stream LLM section events.
6. Write final LLM payload.
7. Emit `llm_complete` and `complete`.
8. On LLM failure after engine write, emit `llm_error` and partial `complete`.

- [ ] **Step 5: Run backend/static tests and verify GREEN**

Run targeted tests.

Expected: PASS.

### Task 3: Frontend SSE Reader And Streaming Sections

**Files:**
- Modify: `src/views/BaziView.vue`
- Modify: `src/views/BaziView.layout.test.mjs`

- [ ] **Step 1: Add failing frontend source tests**

Assert `BaziView.vue` contains:

- `llmStreamSections`
- `readBaziSSEStream`
- handlers for `engine_complete`, `llm_delta`, `llm_section_done`, `llm_error`
- local streamed text taking precedence over persisted interpretation

- [ ] **Step 2: Run frontend source test and verify RED**

Run: `npm test -- src/views/BaziView.layout.test.mjs`

Expected: FAIL before frontend implementation.

- [ ] **Step 3: Implement frontend stream state**

Add `llmStreamSections`, reset helpers, `readBaziSSEStream(response, profileId)`, and streamed override computed values.

- [ ] **Step 4: Update `requestAiSummary()`**

Replace `response.json()` with content-type-aware handling:

- JSON errors before stream remain supported.
- SSE events drive progress, refresh profiles on `engine_complete` and `llm_complete`.
- `llm_error` shows a non-blocking toast while preserving engine output.

- [ ] **Step 5: Add minimal skeleton/loading UI**

When a section status is `pending` or `streaming`, show stable skeleton/loading treatment in the existing report area without redesigning the full page.

- [ ] **Step 6: Run frontend source test and verify GREEN**

Run: `npm test -- src/views/BaziView.layout.test.mjs`

Expected: PASS.

### Task 4: Targeted Verification

**Files:** no planned file edits.

- [ ] **Step 1: Run focused backend tests**

Run: `npm test -- lib/baziLlmSections.test.js lib/bazi-api.test.js`

Expected: PASS.

- [ ] **Step 2: Run focused frontend tests**

Run: `npm test -- src/views/BaziView.layout.test.mjs src/utils/baziInterpretation.test.mjs`

Expected: PASS.

- [ ] **Step 3: Run full suite if focused tests pass**

Run: `npm test`

Expected: PASS, unless unrelated existing dirty-worktree tests fail. If failures occur, report exact failures and whether they are related.
