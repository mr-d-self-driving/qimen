create table if not exists public.bazi_question_audit (
  id uuid primary key default gen_random_uuid(),
  request_id text,
  user_id uuid references auth.users(id) on delete set null,
  question text not null,
  rule_route_hint jsonb,
  semantic_route_raw jsonb,
  semantic_route_normalized jsonb,
  time_scope_resolved jsonb,
  analysis_params_snapshot jsonb,
  target_spec jsonb,
  state_report jsonb,
  dynamic_report jsonb,
  timing_candidates jsonb,
  prompt_blocks jsonb,
  llm_output_raw jsonb,
  llm_output_normalized jsonb,
  fallbacks jsonb,
  model_name text,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists bazi_question_audit_user_created_idx
  on public.bazi_question_audit (user_id, created_at desc);

create index if not exists bazi_question_audit_request_idx
  on public.bazi_question_audit (request_id);

create index if not exists bazi_question_audit_mode_idx
  on public.bazi_question_audit ((semantic_route_normalized->>'analysis_mode'), created_at desc);

alter table public.bazi_question_audit enable row level security;

drop policy if exists "service role can manage bazi question audit" on public.bazi_question_audit;
create policy "service role can manage bazi question audit"
  on public.bazi_question_audit
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
