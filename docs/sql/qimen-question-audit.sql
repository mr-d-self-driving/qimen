create table if not exists public.qimen_question_audit (
  id uuid primary key default gen_random_uuid(),
  request_id text,
  record_id uuid references public.qimen_records(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  question text not null,

  rule_route_hint jsonb,
  route_raw jsonb,
  route_normalized jsonb,
  role_audit jsonb,

  qimen_chart_snapshot jsonb,
  timing_target_symbols jsonb,
  timing_input_snapshot jsonb,
  timing_analysis_backend jsonb,
  timing_prompt_section text,
  timing_llm_output jsonb,
  timing_final jsonb,

  yongshen_rule_snapshot jsonb,
  polarity_overrides jsonb,

  backend_score_input jsonb,
  backend_score_audit jsonb,
  backend_score_intermediate jsonb,

  prompt_blocks jsonb,
  llm_input_snapshot jsonb,
  llm_prompt_text text,
  llm_output_raw jsonb,
  llm_output_normalized jsonb,

  postprocess_audit jsonb,
  final_output jsonb,

  fallbacks jsonb,
  model_name text,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists qimen_question_audit_user_created_idx
  on public.qimen_question_audit (user_id, created_at desc);

create index if not exists qimen_question_audit_request_idx
  on public.qimen_question_audit (request_id);

create index if not exists qimen_question_audit_record_idx
  on public.qimen_question_audit (record_id);

create index if not exists qimen_question_audit_category_idx
  on public.qimen_question_audit ((route_normalized->>'category'), created_at desc);

create index if not exists qimen_question_audit_role_idx
  on public.qimen_question_audit ((route_normalized->>'role'), created_at desc);

create index if not exists qimen_question_audit_timing_method_idx
  on public.qimen_question_audit ((timing_analysis_backend->>'method'), created_at desc);

create index if not exists qimen_question_audit_timing_event_mode_idx
  on public.qimen_question_audit ((timing_analysis_backend->>'event_mode'), created_at desc);

alter table public.qimen_question_audit enable row level security;

drop policy if exists "service role can manage qimen question audit" on public.qimen_question_audit;
create policy "service role can manage qimen question audit"
  on public.qimen_question_audit
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "admin read all qimen question audit" on public.qimen_question_audit;
create policy "admin read all qimen question audit"
  on public.qimen_question_audit
  for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
