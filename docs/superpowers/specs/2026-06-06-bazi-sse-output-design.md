# Bazi SSE Output Product Design

## Background

The current Bazi profile generation flow blocks the entire frontend result until `/api/bazi` finishes both deterministic backend calculation and LLM interpretation. This makes the first useful output dependent on LLM latency and stability, even though the backend already produces complete chart structure, pattern analysis, favorable/unfavorable gods, current dayun/liunian, and engine-owned qualitative copy before the LLM call.

The desired experience is progressive:

1. Show backend-generated Bazi artifacts as soon as they are available.
2. Keep the LLM interpretation areas visible as skeleton sections.
3. Stream LLM text into the relevant sections through SSE.
4. Persist final LLM sections only after they are complete enough to replace the engine fallback.

## Goals

- Reduce perceived wait time for Bazi profile generation and refresh.
- Decouple deterministic backend output from LLM availability.
- Preserve existing Bazi profile fields and rendering paths where possible.
- Make LLM output streamable by section, not by one late JSON blob.
- Keep failed or interrupted LLM generation from invalidating backend-produced chart data.

## Non-Goals

- Redesign the whole Bazi report UI.
- Change the database table shape as a hard dependency.
- Stream partial JSON to the browser.
- Rewrite `/api/bazi-question`; it can remain a reference implementation for SSE style.
- Introduce background queues in the first version.

## Options Considered

### Option A: SSE Stages, LLM JSON At End

The backend sends `engine_complete`, then waits for the current JSON LLM response and sends `llm_complete`.

Pros:
- Smallest backend change.
- Keeps existing JSON parsing and database fields.

Cons:
- Does not satisfy section-level skeleton streaming.
- Users still see blank LLM sections until the model completes.

### Option B: SSE Section Streaming With Sentinel Prompt

The backend changes the LLM prompt to output ordered text sections with explicit sentinels. The Worker parses the upstream stream and emits section deltas to the frontend.

Pros:
- Supports section skeletons and progressive text fill.
- Avoids fragile partial JSON parsing.
- Keeps final storage compatible with `llm_yuanju_core`, `llm_current_dayun`, and `llm_current_liunian`.
- Provides a clear contract between prompt, backend parser, and frontend.

Cons:
- Requires a streaming LLM request helper.
- Requires a small parser for section sentinels.
- Requires fallback behavior when the LLM violates the section contract.

### Option C: Separate LLM Calls Per Section

The backend calls the LLM three times: original chart, current dayun, current liunian. Each section can complete independently.

Pros:
- Very simple section ownership.
- Easy retry per section.

Cons:
- More model calls and higher cost.
- Harder to keep the three sections stylistically consistent.
- Slower total backend work under provider concurrency limits.

## Recommendation

Use Option B for the first implementation.

The product behavior should be: backend artifacts appear first, then three LLM skeleton sections start filling in order. If streaming fails, the page keeps the backend artifacts and engine fallback copy, and the user sees a non-blocking message that AI interpretation can be retried.

## User Experience

### Initial State

When the user adds or refreshes a Bazi profile, the current progress indicator remains visible, but the report surface should no longer wait for final LLM completion.

The UI should distinguish three states:

- `calculating_engine`: backend chart and rule engine are running.
- `streaming_llm`: backend result is visible; LLM sections are streaming.
- `complete`: backend and LLM have both finished, or backend has finished and LLM was gracefully skipped or failed.

### Backend Result Ready

After `engine_complete`, the frontend immediately refreshes the active profile and renders:

- Four pillars and matrix.
- Dayun/liunian timeline.
- Geju, strong/weak, image analysis, favorable/unfavorable gods.
- Engine fallback text for original chart, current dayun, and current liunian.

The LLM interpretation cards remain in place, but their content region shows skeleton treatment until deltas arrive.

### LLM Streaming

Each LLM section owns its own display state:

- `pending`: skeleton only.
- `streaming`: partial text is visible with subtle loading treatment.
- `done`: final streamed text is shown.
- `failed`: engine fallback remains visible with a small non-blocking AI failure label.

The three sections are:

- `yuanju_core`: original chart and natal structure.
- `current_dayun`: current ten-year fortune cycle.
- `current_liunian`: current annual fortune.

### Completion

When `llm_complete` arrives, the frontend refreshes the profile once more so the displayed text matches persisted database state. Local streaming text can then be cleared.

## Backend Contract

### Endpoint

`POST /api/bazi` should support SSE for normal profile generation and refresh.

Pre-stream validation errors still return JSON:

- unauthenticated
- missing profile id
- profile not found
- unauthorized profile access
- missing birth time
- quota exceeded

Once SSE starts, errors are emitted as SSE events.

### SSE Events

The endpoint should emit these events:

```json
{"type":"step","index":0,"pct":10,"label":"校验档案"}
{"type":"step","index":1,"pct":25,"label":"排盘计算"}
{"type":"engine_complete","pct":45,"profileId":"...","result":{"bazi_detail":{},"engine_summary":"..."}}
{"type":"step","index":2,"pct":50,"label":"AI 断语生成"}
{"type":"llm_section_start","section":"yuanju_core"}
{"type":"llm_delta","section":"yuanju_core","text":"..."}
{"type":"llm_section_done","section":"yuanju_core"}
{"type":"llm_section_start","section":"current_dayun"}
{"type":"llm_delta","section":"current_dayun","text":"..."}
{"type":"llm_section_done","section":"current_dayun"}
{"type":"llm_section_start","section":"current_liunian"}
{"type":"llm_delta","section":"current_liunian","text":"..."}
{"type":"llm_section_done","section":"current_liunian"}
{"type":"llm_complete","pct":100,"profileId":"...","result":{"sections":{"yuanju_core":"...","current_dayun":"...","current_liunian":"..."}}}
{"type":"complete","pct":100,"profileId":"..."}
```

If the LLM fails after `engine_complete`, emit:

```json
{"type":"llm_error","message":"AI 深度断语暂时不可用，已保留规则引擎结果"}
{"type":"complete","pct":100,"profileId":"...","partial":true}
```

### Engine Persistence

Immediately after `buildCompleteBaziDetail()` succeeds, write an engine-first payload to `bazi_profiles`.

The payload should include:

- `bazi_str`
- `bazi_detail`
- `bazi_summary`
- `strong_weak`
- `geju`
- `shensha`
- `display_yuanju_core`
- `display_current_dayun`
- `display_current_liunian`
- `llm_yuanju_core: null`
- `llm_current_dayun: null`
- `llm_current_liunian: null`
- `engine_yuanju_core`
- `engine_current_dayun`
- `engine_current_liunian`
- `favorable_elements`
- `unfavorable_elements`
- `day_zhi`
- `year_zhi`
- `month_zhi`
- `ri_zhu`

`bazi_detail.qualitative` should represent the fallback state:

```json
{
  "status": "engine_ready",
  "display_source": "engine",
  "display": {
    "yuanju_core": "...",
    "current_dayun": "...",
    "current_liunian": "..."
  },
  "llm": {
    "yuanju_core": null,
    "current_dayun": null,
    "current_liunian": null
  },
  "engine": {
    "yuanju_core": "...",
    "current_dayun": "...",
    "current_liunian": "..."
  }
}
```

### LLM Persistence

After all three sections complete, write the final LLM payload:

- `llm_yuanju_core`
- `llm_current_dayun`
- `llm_current_liunian`
- `display_yuanju_core`
- `display_current_dayun`
- `display_current_liunian`
- `bazi_summary`
- `bazi_detail.qualitative.status: "llm_complete"`
- `bazi_detail.qualitative.display_source: "llm"`

Partial section text should stay in frontend memory until a section is complete. The first implementation should not write every token delta to Supabase.

## Prompt Section Contract

The current JSON response prompt should be replaced with a stream-friendly section protocol.

The prompt should instruct the model:

```text
你是专业子平八字命理分析师。你会收到后端规则引擎已经确定的命盘结构、格局、强弱、喜忌神、当前大运和当前流年。

你必须只输出以下三个 section，顺序不可改变。不要输出 JSON，不要输出 Markdown 标题，不要输出 section 以外的解释。

<<<SECTION:yuanju_core>>>
用 120-220 字解释原局核心。必须引用后端给出的格局、强弱、喜忌神。不得重算四柱，不得推翻后端结论。
<<<END_SECTION:yuanju_core>>>

<<<SECTION:current_dayun>>>
用 100-180 字解释当前大运。必须结合当前大运干支、十神、与原局喜忌的关系。
<<<END_SECTION:current_dayun>>>

<<<SECTION:current_liunian>>>
用 100-180 字解释当前流年。必须结合当前流年干支、当前大运与原局喜忌，给出一到两个可执行提醒。
<<<END_SECTION:current_liunian>>>
```

The section parser should tolerate:

- chunks splitting sentinel tokens
- extra whitespace around sentinels
- missing final newline

The parser should not accept:

- unknown section names
- content before the first `<<<SECTION:...>>>` marker as displayable content
- a section that exceeds a defensive maximum length

If the model violates the protocol but still returns recognizable labels such as `原局核心：`, the backend may use a fallback parser once. If fallback parsing fails, emit `llm_error` and keep the engine result.

## Frontend Contract

`BaziView.vue` should replace the current `response.json()` path for `/api/bazi` with an SSE reader similar to the one used in `HomeView.vue` and `FortuneView.vue`.

Local state should include:

```js
const llmStreamSections = ref({
  yuanju_core: { status: 'pending', text: '' },
  current_dayun: { status: 'pending', text: '' },
  current_liunian: { status: 'pending', text: '' }
})
```

Display resolution should become:

1. If a section is streaming or done locally, show local streamed text.
2. Else if persisted LLM text exists, show persisted LLM text.
3. Else show engine fallback text.

This preserves existing `resolveBaziInterpretation()` behavior while adding temporary streamed overrides during generation.

## Error Handling

- If engine calculation fails, the endpoint emits or returns a blocking error and no profile update is shown.
- If engine persistence fails, the endpoint emits a blocking error because the frontend cannot reliably refresh the result.
- If LLM request fails after engine persistence, the endpoint emits `llm_error`, records no LLM fields, and completes as partial.
- If the stream disconnects after `engine_complete`, the user can reload and still see backend artifacts from Supabase.
- If the stream disconnects during LLM, the persisted state remains engine fallback unless the final LLM write already completed.

## Rollout Plan

1. Add tests for prompt section parsing and SSE event parsing.
2. Add a streaming LLM helper that supports OpenAI-compatible chat completion chunks.
3. Convert `/api/bazi` to SSE while preserving JSON errors before the stream starts.
4. Add frontend Bazi streaming state and skeleton rendering.
5. Verify cache hit and engine-refresh paths still work without unnecessary LLM calls.
6. Test LLM failure, malformed section output, and client disconnect behavior.

## Acceptance Criteria

- A first-time Bazi profile shows backend chart data before LLM completion.
- The three LLM sections show skeletons after engine completion.
- LLM text appears progressively in the correct section.
- Final LLM text persists to the existing `llm_*` fields.
- If LLM fails, engine output remains visible and the request does not erase backend results.
- Existing cache hit behavior remains fast.
- Existing engine-only refresh with old LLM text still preserves the old LLM text.
- No partial token deltas are written to Supabase.

## Implementation Constraints

- The upstream provider must support `stream: true` for `https://yinli.one/v1/chat/completions`. If it does not, keep the same frontend skeleton and section protocol, but emit section events after the non-streaming response is parsed.
- `bazi_detail.qualitative.status` can be introduced without a migration because `bazi_detail` is JSON.
- A dedicated `requestLLMStreamSections()` helper should own provider chunk parsing and section parsing so `handleBazi()` does not become harder to read.
