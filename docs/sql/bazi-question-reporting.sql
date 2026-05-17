-- 八字问答审计报表 SQL
--
-- 前置依赖：
-- 1. 先执行 docs/sql/bazi-question-audit.sql 创建 public.bazi_question_audit。
-- 2. 该表应只由服务端 service_role 写入，不建议暴露给 anon/authenticated。
-- 3. Supabase 新项目 public schema 表/视图可能不会自动暴露到 Data API；本 SQL 默认 revoke
--    anon/authenticated，若后续要做内部 dashboard，再按需显式 grant 并继续依赖 RLS/权限控制。
-- 4. 为了兼容 Supabase SQL Editor / Postgres 版本差异，本文件避免使用表达式索引和
--    create view ... with (security_invoker = true)。如果你的项目确认是 Postgres 15+，
--    可以另行给视图加 security_invoker。

-- 便于按时间聚合的索引。
create index if not exists bazi_question_audit_created_idx
  on public.bazi_question_audit (created_at desc);

-- 明细宽视图：只抽取报表字段，不展开 question / prompt / raw profile。
create or replace view public.bazi_question_audit_flat
as
select
  id,
  request_id,
  user_id,
  created_at,
  date_trunc('day', created_at)::date as created_date,
  date_trunc('hour', created_at) as created_hour,
  coalesce(
    semantic_route_normalized->>'branch',
    llm_output_normalized->>'branch',
    llm_output_normalized#>>'{meta,branch}',
    'bazi'
  ) as branch,
  coalesce(
    semantic_route_normalized->>'category',
    llm_output_normalized->>'category',
    llm_output_normalized#>>'{meta,category}',
    'general'
  ) as category,
  coalesce(
    semantic_route_normalized->>'subcategory',
    llm_output_normalized->>'subcategory',
    llm_output_normalized#>>'{meta,subcategory}',
    ''
  ) as subcategory,
  coalesce(
    semantic_route_normalized->>'analysis_mode',
    llm_output_normalized#>>'{meta,analysis_mode}',
    'legacy'
  ) as analysis_mode,
  nullif(coalesce(
    semantic_route_normalized->>'secondary_mode',
    llm_output_normalized#>>'{meta,secondary_mode}',
    ''
  ), '') as secondary_mode,
  coalesce(
    semantic_route_normalized->>'target_resolution',
    llm_output_normalized#>>'{meta,target,target_resolution}',
    case
      when target_spec->>'fallback_level' is not null then 'backend_mapped'
      else null
    end,
    'unknown'
  ) as target_resolution,
  coalesce(
    target_spec->>'fallback_level',
    llm_output_normalized#>>'{meta,target,fallback_level}',
    'unknown'
  ) as target_fallback_level,
  coalesce(
    semantic_route_normalized->>'confidence',
    llm_output_normalized#>>'{meta,confidence}',
    'unknown'
  ) as confidence,
  coalesce(
    llm_output_normalized#>>'{summary,assessment_type}',
    ''
  ) as assessment_type,
  coalesce(
    llm_output_normalized#>>'{summary,level}',
    ''
  ) as summary_level,
  case
    when llm_output_normalized#>>'{summary,score}' ~ '^-?\d+(\.\d+)?$'
      then (llm_output_normalized#>>'{summary,score}')::numeric
    else null
  end as summary_score,
  jsonb_array_length(coalesce(llm_output_normalized#>'{meta,limitations}', '[]'::jsonb)) as limitation_count,
  coalesce(jsonb_array_length(coalesce(timing_candidates, '[]'::jsonb)), 0) as timing_candidate_count,
  latency_ms,
  model_name
from public.bazi_question_audit;

-- 日报：看调用量、模式分布、耗时、fallback/limitations 比例。
create or replace view public.bazi_question_audit_daily_report
as
select
  created_date,
  count(*) as total_questions,
  count(distinct user_id) as unique_users,
  count(*) filter (where analysis_mode = 'status') as status_count,
  count(*) filter (where analysis_mode = 'timing') as timing_count,
  count(*) filter (where analysis_mode = 'pattern') as pattern_count,
  count(*) filter (where analysis_mode = 'character') as character_count,
  count(*) filter (where target_resolution = 'llm_derived') as llm_derived_count,
  count(*) filter (where target_fallback_level in ('category', 'general', 'llm_derived', 'none', 'unknown')) as fallback_count,
  count(*) filter (where limitation_count > 0) as limited_count,
  round(avg(latency_ms))::integer as avg_latency_ms,
  percentile_cont(0.5) within group (order by latency_ms) as p50_latency_ms,
  percentile_cont(0.95) within group (order by latency_ms) as p95_latency_ms
from public.bazi_question_audit_flat
group by created_date;

-- 语义路由质量分布：判断哪类问题最容易 fallback 或低置信。
create or replace view public.bazi_question_audit_route_report
as
select
  created_date,
  branch,
  category,
  subcategory,
  analysis_mode,
  secondary_mode,
  target_resolution,
  target_fallback_level,
  confidence,
  count(*) as total_questions,
  count(*) filter (where limitation_count > 0) as limited_count,
  round(avg(latency_ms))::integer as avg_latency_ms
from public.bazi_question_audit_flat
group by
  created_date,
  branch,
  category,
  subcategory,
  analysis_mode,
  secondary_mode,
  target_resolution,
  target_fallback_level,
  confidence;

-- timing 专项：观察遍历是否真的产出候选年份。
create or replace view public.bazi_question_audit_timing_report
as
select
  created_date,
  category,
  subcategory,
  count(*) as timing_questions,
  count(*) filter (where timing_candidate_count = 0) as empty_candidate_count,
  avg(timing_candidate_count)::numeric(10, 2) as avg_candidate_count,
  count(*) filter (where target_fallback_level <> 'subcategory') as non_exact_target_count
from public.bazi_question_audit_flat
where analysis_mode = 'timing'
group by created_date, category, subcategory;

-- 权限：默认不向客户端角色开放报表视图。
revoke all on public.bazi_question_audit_flat from anon, authenticated;
revoke all on public.bazi_question_audit_daily_report from anon, authenticated;
revoke all on public.bazi_question_audit_route_report from anon, authenticated;
revoke all on public.bazi_question_audit_timing_report from anon, authenticated;

grant select on public.bazi_question_audit_flat to service_role;
grant select on public.bazi_question_audit_daily_report to service_role;
grant select on public.bazi_question_audit_route_report to service_role;
grant select on public.bazi_question_audit_timing_report to service_role;
