-- ============================================================
-- bazi_question_audit
-- 八字问事完整审计表
--
-- 设计原则：
-- 1. llm_prompt_text 保存喂给 LLM 的完整 Prompt 原文
-- 2. llm_limitations 保存 LLM 自报的局限（与系统 fallbacks 分离）
-- 3. fallbacks 只保存系统级真实回退（路由失败 / 数据缺失）
-- 4. 生成列用于常用查询维度快速过滤，无需 JSON 解析
-- ============================================================

create table if not exists public.bazi_question_audit (
  -- ── 主键与关联 ───────────────────────────────────────────────
  id                         uuid          primary key default gen_random_uuid(),
  request_id                 text,
  user_id                    uuid          references auth.users(id) on delete set null,
  created_at                 timestamptz   not null default now(),

  -- ── 用户输入 ─────────────────────────────────────────────────
  question                   text          not null,

  -- ── 路由层 ───────────────────────────────────────────────────
  rule_route_hint            jsonb,        -- 规则引擎给的廉价路由提示
  semantic_route_raw         jsonb,        -- LLM 返回的原始路由结果
  semantic_route_normalized  jsonb,        -- 归一化后的最终路由

  -- ── Pipeline 执行层 ──────────────────────────────────────────
  time_scope_resolved        jsonb,        -- 解析后的时间范围
  analysis_params_snapshot   jsonb,        -- 从 profile 提取的关键参数快照
  target_spec                jsonb,        -- Step 1：目标元素定位结果
  state_report               jsonb,        -- Step 2：原局状态评估结果
  dynamic_report             jsonb,        -- Step 3：大运流年动态评估结果（status/timing 模式）
  timing_candidates          jsonb,        -- timing 模式候选年份排序结果

  -- ── LLM 交互层（核心调试字段）────────────────────────────────
  prompt_blocks              jsonb,        -- Prompt 组成标签（analysis_mode / secondary_mode 等）
  llm_prompt_text            text,         -- 喂给 LLM 的完整 Prompt 原文
  llm_output_raw             jsonb,        -- LLM 返回的原始 JSON
  llm_output_normalized      jsonb,        -- 归一化后的最终输出

  -- ── 诊断与质量 ───────────────────────────────────────────────
  fallbacks                  jsonb,        -- 系统级真实回退（路由失败 / pipeline 数据缺失）
  llm_limitations            jsonb,        -- LLM 自报的局限（meta.limitations），与 fallbacks 分开存储
  model_name                 text,
  latency_ms                 integer,

  -- ── 生成列（从 JSON 提取，用于快速过滤）────────────────────────
  analysis_mode              text          generated always as (
                               semantic_route_normalized->>'analysis_mode'
                             ) stored,
  category                   text          generated always as (
                               semantic_route_normalized->>'category'
                             ) stored,
  subcategory                text          generated always as (
                               semantic_route_normalized->>'subcategory'
                             ) stored,
  llm_level                  text          generated always as (
                               llm_output_normalized->'summary'->>'level'
                             ) stored,
  llm_confidence             text          generated always as (
                               llm_output_normalized->'meta'->>'confidence'
                             ) stored,
  target_fallback_level      text          generated always as (
                               target_spec->>'fallback_level'
                             ) stored
);

-- ── 索引 ──────────────────────────────────────────────────────
create index if not exists bazi_qa_user_created_idx
  on public.bazi_question_audit (user_id, created_at desc);

create index if not exists bazi_qa_request_idx
  on public.bazi_question_audit (request_id);

-- 按模式 + 时间查询（最常用）
create index if not exists bazi_qa_mode_created_idx
  on public.bazi_question_audit (analysis_mode, created_at desc);

-- 按分类查询
create index if not exists bazi_qa_category_idx
  on public.bazi_question_audit (category, subcategory, created_at desc);

-- 按质量等级过滤
create index if not exists bazi_qa_level_idx
  on public.bazi_question_audit (llm_level, created_at desc);

-- 按 target 精度过滤（用于分析 fallback_level=category 的路由问题）
create index if not exists bazi_qa_target_fallback_idx
  on public.bazi_question_audit (target_fallback_level, created_at desc);

-- fallbacks 非空的记录（用于系统回退率监控）
create index if not exists bazi_qa_has_fallback_idx
  on public.bazi_question_audit (created_at desc)
  where fallbacks is not null and jsonb_array_length(fallbacks) > 0;

-- llm_limitations 非空的记录（用于 LLM 幻觉率监控）
create index if not exists bazi_qa_has_llm_limitations_idx
  on public.bazi_question_audit (created_at desc)
  where llm_limitations is not null and jsonb_array_length(llm_limitations) > 0;

-- ── RLS ───────────────────────────────────────────────────────
alter table public.bazi_question_audit enable row level security;

drop policy if exists "service role can manage bazi question audit" on public.bazi_question_audit;
create policy "service role can manage bazi question audit"
  on public.bazi_question_audit
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
