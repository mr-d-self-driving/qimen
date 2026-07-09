# Phase 0 执行计划：Langfuse Cloud 接入（可观测性 + trace 记录）

> 前置文档：[langfuse-prompt-inventory.md](langfuse-prompt-inventory.md)（函数清单）、[langfuse-migration-plan.md](langfuse-migration-plan.md)（分阶段方案，本文档细化其中的 Phase 0）
> 部署方式：**Langfuse Cloud 免费层**（已决定，不自托管），US 区域（`us.cloud.langfuse.com`）。
> 状态：**代码已实现完毕**（`worker/src/index.js`），剩下的是你这边设置密钥 + 本地验证。

## 技术路线（已定稿）

用官方 `langfuse` Claude Code skill（已装到 `.agents/skills/langfuse/`，`.claude/skills/langfuse` 符号链接）查证后确认：

- Langfuse 官方 JS SDK（`@langfuse/tracing` + `@langfuse/otel`）依赖 `@opentelemetry/sdk-node`，**官方要求 Node.js ≥ 20**，在 Cloudflare Workers 上不可靠——真实案例见 [langfuse/langfuse#11984](https://github.com/langfuse/langfuse/issues/11984)：用户报告 SDK 的 `flushAsync()` 在 Workers 上"成功返回但数据没落地"，Langfuse 官方 bot 的建议是**直接调 ingestion API**，不要用 SDK。
- 官方文档本身也建议新项目优先用 OTel endpoint（`/api/public/otel`），但那条路径需要手工构造标准 OTLP JSON（trace_id/span_id 的十六进制编码等细节没有百分百把握），而 legacy `/api/public/ingestion` 接口的 `trace-create`/`generation-create` 事件结构已经通过**三个独立来源交叉验证**：官方 API reference 示例、issue #11984 里用户在 Cloudflare Workers 上真实跑通的例子、另一个 GitHub Discussion 里的工作示例——三者字段完全一致。
- 最终选择：**手写 `fetch` 调用 `/api/public/ingestion`**，不引入任何新增 npm 依赖，和仓库现有 5 个 LLM wrapper（`requestLLM` 等）的风格一致。

## 已完成的代码改动

1. `worker/wrangler.toml`：`[vars]`/`[env.preview.vars]` 加了 `LANGFUSE_BASE_URL`；`[secrets]`/`[env.preview.secrets]` 的 `required` 列表加了 `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY`。
2. `worker/src/index.js`：
   - `fetch(request, env, ctx)` 入口 + `routeRequest(request, env, ctx)` 透传 `ctx`，一路传到需要打点的 9 个 `handle*` 函数。
   - 新增 `redactForTrace`（长文本截断）和 `reportToLangfuse`（核心上报函数，fail-open 设计：`env.LANGFUSE_PUBLIC_KEY`/`SECRET_KEY` 未配置时静默跳过；请求失败只 `console.warn`，绝不 throw；用 `ctx.waitUntil()` 异步发送不阻塞响应）。
   - 5 个 LLM wrapper（`classifyByGeminiFlashWithEnv`/`requestLLM`/`requestLLMText`/`requestLLMSimpleStream`/`requestLLMStreamSections`）都加了 `ctx`、`traceMeta` 参数，在各自成功路径末尾调用 `reportToLangfuse`。两个流式 generator 内部累积 `fullOutput`，在流结束时才上报（不是边 yield 边报）。
   - 9 个调用方（`handleDivinationRoute`/`handleBaziQuestion`/`handleBaziCalibrate`/`handleFortuneDailyInterpretation`/`handleFortuneMonthlyInterpretation`/`handleQimenFollowup`/`handleBaziFollowup`/`handleQimen`/`handleBazi`）都补上了 `ctx` 参数，并在调用点标注了描述性的 `traceMeta.name`（比如 `qimen-answer`、`bazi-followup-decide`）和场景 tag，方便在 Langfuse UI 里筛选。
   - `handleBaziCalibrate`：**没有**把前端拼好的原始 prompt 当 trace input 上报（里面含用户填写的人生大事自由描述，隐私度最高），改传 `{profileId, promptLength}` 的脱敏摘要（`_calibrateTraceInput`），通过新增的 `traceMeta.traceInputOverride` 机制覆盖默认行为。
3. `.gitignore`：加了 `.agents/skills/langfuse/`（跟现有 `karpathy-guidelines` 一样，第三方 skill 不入库）。
4. `node --check worker/src/index.js` 已验证语法无误。

**已知简化（Phase 0 范围内可接受）**：`generation-create` 的字段（`model`/`usage` 等）是尽力而为，没有拿到逐字段官方确认；如果字段名有误，Langfuse 只会在响应的 `errors` 数组里报告那一条事件的错误（`trace-create` 依然成功，不影响能不能看到 prompt/output），代码里已经加了 `console.warn` 在有 `errors` 时打印，方便 Step 3 本地验证时发现并修正。

---

## 剩下要做的事（你来做）

### Step 1：设置密钥

**本地开发**（`wrangler dev` 读取 `worker/.dev.vars`，不是远程 secret store）：

```bash
cd worker
cat > .dev.vars <<'EOF'
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
EOF
```

`.dev.vars` 已经在 `.gitignore` 里（第 22 行），不会被提交。`GEMINI_API_KEY`/`SUPABASE_SERVICE_KEY` 如果你本地开发也需要，一并加进这个文件（如果之前没有这个文件的话，去 Cloudflare 后台或问我要现有配置）。

**部署环境**（生产 + preview，各自独立）：

```bash
cd worker
npx wrangler secret put LANGFUSE_PUBLIC_KEY
npx wrangler secret put LANGFUSE_SECRET_KEY
npx wrangler secret put LANGFUSE_PUBLIC_KEY --env preview
npx wrangler secret put LANGFUSE_SECRET_KEY --env preview
```

会交互式提示输入，值不会进 git / 不会出现在聊天记录里。

### Step 2：确认区域

`wrangler.toml` 里我先填了 `LANGFUSE_BASE_URL = "https://us.cloud.langfuse.com"`（US 区域）。如果你注册时选的是 EU 或 JP，告诉我一声，我改这两行（`[vars]` 和 `[env.preview.vars]` 各一处）。

### Step 3：本地验证

```bash
cd worker
npx wrangler dev
```

发一个真实的奇门或八字问事请求（前端跑起来点一下，或者直接 curl 打 `/api/qimen`），然后：

1. 看 `wrangler dev` 的终端输出，确认没有 `[langfuse] report failed` 或 `[langfuse] ingestion partial errors` 之类的警告（如果有 `partial errors`，把内容发我，我按报错调整 `generation-create` 的字段）。
2. 去 Langfuse Cloud 的 Traces 页面，确认能看到这次请求对应的 trace，展开能看到完整的 prompt 文本和模型输出。
3. （可选但建议）故意把 `.dev.vars` 里的 `LANGFUSE_SECRET_KEY` 改错测一次，确认主流程依然正常返回结果——验证 fail-open 生效。

### Step 4：部署

```bash
cd worker
npx wrangler deploy --env preview   # 先验证 preview
npx wrangler deploy --env=""        # 确认无误后上生产
```

---

## 验收标准

- [ ] 一次真实奇门问事请求，能在 Langfuse UI 看到完整 trace：prompt 全文、模型返回、耗时、场景 tag。
- [ ] 一次真实八字追问请求，同上。
- [ ] 一次定盘纠偏请求，trace 里 `input` 是脱敏后的摘要（`{profileId, promptLength}`），不含原始人生大事描述。
- [ ] 故意把 Langfuse key 配置错误，主链路请求依然正常返回给用户（fail-open 验证）。
- [ ] preview 和生产环境都完成部署且验证通过。

做完这些，Phase 0 即完成，可以按 [langfuse-migration-plan.md](langfuse-migration-plan.md) 的 Phase 1 清单开始把高频静态 prompt（`wenshiFollowup.js` 全部、两个路由 prompt 等）逐个注册为 Langfuse Prompt 对象做版本管理。
