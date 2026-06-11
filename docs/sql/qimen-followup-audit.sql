-- 问事追问 audit：记录每次追问的判断器 prompt/分流、补算、增补 prompt/输出。
-- service-role 写入、admin 读，RLS 与 qimen_question_audit 对齐。
-- 已通过 Supabase MCP apply_migration 应用（migration: qimen_followup_audit_table）。

create table if not exists public.qimen_followup_audit (
  id uuid primary key default gen_random_uuid(),
  request_id text,
  record_id uuid references public.qimen_records(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  branch text,

  origin_question text,
  followup text not null,

  -- 判断器 Step A
  classifier_model text,
  classifier_prompt text,
  route_raw jsonb,
  route_normalized jsonb,   -- scope/nature/target_sections/needs_data/reason
  scope text,               -- 冗余，便于按分流统计

  -- 按需补算 Step A2
  needs_data jsonb,
  extra_evidence jsonb,

  -- 增补 Step B
  patch_model text,
  patch_prompt text,
  patch_output_raw text,    -- 模型原始输出（含哨兵标记）
  supplements jsonb,        -- 解析后的各段增补
  nature text,
  target_sections jsonb,

  -- 上下文快照
  evidence_snapshot jsonb,  -- 回传的 origin.evidence（盘锚）
  origin_sections jsonb,    -- 原各段

  fallbacks jsonb,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists qimen_followup_audit_user_created_idx
  on public.qimen_followup_audit (user_id, created_at desc);
create index if not exists qimen_followup_audit_record_idx
  on public.qimen_followup_audit (record_id);
create index if not exists qimen_followup_audit_scope_idx
  on public.qimen_followup_audit (scope, created_at desc);

alter table public.qimen_followup_audit enable row level security;

create policy "admin read all qimen followup audit" on public.qimen_followup_audit
  for select
  using ((((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin'));

create policy "service role can manage qimen followup audit" on public.qimen_followup_audit
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
