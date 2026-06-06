# 八字 SSE 流式出参产品方案

## 背景

当前八字档案生成流程需要等待 `/api/bazi` 同时完成后端确定性计算和 LLM 解读后，前端才刷新展示完整结果。这样会让首屏可用结果依赖 LLM 的响应速度和稳定性。实际上，在调用 LLM 之前，后端已经可以产出完整的命盘结构、格局分析、喜忌神、当前大运/流年，以及规则引擎自有的定性断语。

目标体验应改为渐进式：

1. 后端规则引擎产物一完成，前端立即展示。
2. LLM 解读区域先显示骨架屏。
3. LLM 文本通过 SSE 按区块流式填充到对应区域。
4. 只有当 LLM 区块完整产出后，才将最终文本写入持久化字段，用来替换引擎兜底文案。

## 目标

- 降低八字档案生成和刷新时的体感等待时间。
- 将确定性的后端产物与 LLM 可用性解耦。
- 尽量保留现有八字档案字段和前端渲染路径。
- 让 LLM 输出按区块流式出参，而不是最后一次性返回 JSON。
- LLM 失败或中断时，不影响后端已经生成的命盘和规则结果。

## 非目标

- 不整体重设计八字报告页面。
- 不把数据库表结构调整作为首版前置条件。
- 不向浏览器流式输出半截 JSON。
- 不重写 `/api/bazi-question`；它只作为现有 SSE 风格参考。
- 首版不引入后台队列或异步任务系统。

## 方案对比

### 方案 A：SSE 阶段事件 + LLM 最后返回 JSON

后端先发送 `engine_complete`，然后等待当前 JSON 格式的 LLM 响应，最后发送 `llm_complete`。

优点：

- 后端改动最小。
- 保留现有 JSON 解析和数据库字段。

缺点：

- 不满足按区块骨架屏流式填充。
- 用户仍然要等模型完整返回后，才能看到 LLM 解读内容。

### 方案 B：SSE 区块流式输出 + Sentinel Prompt

后端将 LLM prompt 改为按固定顺序输出文本区块，并用显式 sentinel 标记区块起止。Worker 解析上游流式响应，再向前端发对应区块的 delta。

优点：

- 支持 LLM 区块骨架屏和渐进式文本填充。
- 避免解析半截 JSON 的脆弱性。
- 最终落库仍兼容现有 `llm_yuanju_core`、`llm_current_dayun`、`llm_current_liunian` 字段。
- prompt、后端解析器、前端渲染之间有明确契约。

缺点：

- 需要新增流式 LLM 请求 helper。
- 需要新增轻量 section sentinel 解析器。
- 需要处理 LLM 不遵守 section 协议时的降级逻辑。

### 方案 C：每个区块单独调用一次 LLM

后端分别调用三次 LLM：原局核心、当前大运、当前流年。每个区块可以独立完成和重试。

优点：

- 区块归属非常清楚。
- 单区块重试简单。

缺点：

- 模型调用次数更多，成本更高。
- 三个区块的语气和判断一致性更难保证。
- 如果上游有并发限制，总体后端耗时可能更长。

## 推荐方案

首版采用方案 B。

产品行为为：后端规则产物先展示，然后三个 LLM 解读区块以骨架屏状态出现，并按顺序流式填充。若流式生成失败，页面保留后端规则产物和引擎兜底文案，并以非阻塞方式提示用户 AI 深度断语可稍后重试。

## 用户体验

### 初始状态

用户新增或刷新八字档案时，现有进度提示仍保留，但报告主体不再等待 LLM 全部完成后才出现。

前端需要区分三个状态：

- `calculating_engine`：后端排盘和规则引擎计算中。
- `streaming_llm`：后端结果已展示，LLM 区块正在流式生成。
- `complete`：后端和 LLM 均完成，或后端已完成且 LLM 已被优雅跳过/失败降级。

### 后端结果就绪

收到 `engine_complete` 后，前端立即刷新当前档案并渲染：

- 四柱与命盘矩阵。
- 大运/流年时间轴。
- 格局、强弱、象局分析、喜神、忌神。
- 原局核心、当前大运、当前流年的规则引擎兜底文案。

LLM 解读卡片保持可见，但内容区域显示骨架屏，直到收到对应区块的 delta。

### LLM 流式生成

每个 LLM 区块都有独立展示状态：

- `pending`：仅展示骨架屏。
- `streaming`：展示部分文本，并保留轻量 loading 状态。
- `done`：展示完整流式文本。
- `failed`：继续展示引擎兜底文案，并显示小型非阻塞 AI 失败提示。

三个区块为：

- `yuanju_core`：原局核心与命盘底色。
- `current_dayun`：当前十年大运。
- `current_liunian`：当前流年。

### 完成状态

收到 `llm_complete` 后，前端再次刷新档案，确保页面文本与数据库持久化状态一致。随后可清理本地临时流式文本。

## 后端契约

### 接口

`POST /api/bazi` 应支持常规八字档案生成和刷新场景下的 SSE。

以下前置校验错误仍返回普通 JSON：

- 未登录。
- 缺少档案 ID。
- 档案不存在。
- 无权访问档案。
- 缺少出生时间。
- 额度不足。

一旦 SSE 开始，后续错误均通过 SSE 事件发送。

### SSE 事件

接口应发送以下事件：

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

如果 LLM 在 `engine_complete` 后失败，发送：

```json
{"type":"llm_error","message":"AI 深度断语暂时不可用，已保留规则引擎结果"}
{"type":"complete","pct":100,"profileId":"...","partial":true}
```

### 引擎结果落库

`buildCompleteBaziDetail()` 成功后，应立即向 `bazi_profiles` 写入 engine-first payload。

写入内容包括：

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

`bazi_detail.qualitative` 表示当前兜底状态：

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

### LLM 结果落库

三个区块全部完成后，写入最终 LLM payload：

- `llm_yuanju_core`
- `llm_current_dayun`
- `llm_current_liunian`
- `display_yuanju_core`
- `display_current_dayun`
- `display_current_liunian`
- `bazi_summary`
- `bazi_detail.qualitative.status: "llm_complete"`
- `bazi_detail.qualitative.display_source: "llm"`

区块的部分文本只保存在前端内存中，直到区块完整结束。首版不把每个 token delta 写入 Supabase。

## Prompt Section 契约

当前要求 LLM 返回 JSON 的 prompt 应改为适合流式输出的 section 协议。

Prompt 应要求模型：

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

section 解析器应容忍：

- chunk 将 sentinel 标记切开。
- sentinel 前后存在额外空白。
- 最后没有换行。

section 解析器不应接受：

- 未知 section 名。
- 第一个 `<<<SECTION:...>>>` 标记之前的内容作为可展示内容。
- 超过防御性最大长度的 section。

如果模型违反协议，但仍返回类似 `原局核心：` 的可识别标签，后端可尝试一次 fallback 解析。若 fallback 解析仍失败，则发送 `llm_error` 并保留引擎结果。

## 前端契约

`BaziView.vue` 应将 `/api/bazi` 当前 `response.json()` 的读取方式替换为 SSE reader，可参考 `HomeView.vue` 和 `FortuneView.vue` 的现有实现。

本地状态建议为：

```js
const llmStreamSections = ref({
  yuanju_core: { status: 'pending', text: '' },
  current_dayun: { status: 'pending', text: '' },
  current_liunian: { status: 'pending', text: '' }
})
```

展示优先级调整为：

1. 如果某个 section 正在本地 streaming 或已 done，展示本地流式文本。
2. 否则如果已有持久化 LLM 文本，展示持久化 LLM 文本。
3. 否则展示规则引擎兜底文案。

这样可以保留现有 `resolveBaziInterpretation()` 的行为，同时在生成过程中加入临时流式覆盖层。

## 错误处理

- 如果引擎计算失败，接口返回或发送阻塞错误，不展示新的档案结果。
- 如果引擎结果落库失败，接口发送阻塞错误，因为前端无法可靠刷新结果。
- 如果 LLM 请求在引擎落库后失败，接口发送 `llm_error`，不写入 LLM 字段，并以 partial 状态完成。
- 如果连接在 `engine_complete` 后断开，用户刷新页面后仍能从 Supabase 看到后端规则产物。
- 如果连接在 LLM 流式过程中断开，除非最终 LLM 写入已经完成，否则持久化状态仍保持引擎兜底。

## 推进计划

1. 为 prompt section 解析和 SSE 事件解析补测试。
2. 新增支持 OpenAI-compatible chat completion chunks 的流式 LLM helper。
3. 将 `/api/bazi` 改为 SSE，同时保留 stream 开始前的 JSON 错误返回。
4. 在前端新增八字 LLM streaming state 和骨架屏渲染。
5. 验证缓存命中、仅刷新引擎、保留旧 LLM 文案等路径不会误触发 LLM。
6. 测试 LLM 失败、模型输出 section 格式错误、客户端断连等场景。

## 验收标准

- 首次生成八字档案时，LLM 完成前即可看到后端命盘数据。
- 引擎完成后，三个 LLM 解读区块显示骨架屏。
- LLM 文本按正确 section 渐进式出现。
- 最终 LLM 文本写入现有 `llm_*` 字段。
- LLM 失败时，引擎输出仍可见，请求不会清空后端结果。
- 现有缓存命中路径仍保持快速返回。
- 现有仅刷新引擎且保留旧 LLM 文案的路径仍可用。
- 不向 Supabase 写入半截 token delta。

## 实现约束

- 上游 `https://yinli.one/v1/chat/completions` 需要支持 `stream: true`。如果不支持，则保留相同前端骨架屏和 section 协议，但在非流式响应解析完成后再发送 section 事件。
- `bazi_detail.qualitative.status` 可直接写入 JSON 字段，不需要数据库 migration。
- 建议由专门的 `requestLLMStreamSections()` helper 负责上游 chunk 解析和 section 解析，避免 `handleBazi()` 继续膨胀。
