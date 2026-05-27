create table if not exists public.bazi_profile_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_id uuid references public.bazi_profiles(id) on delete cascade not null,
  action_type text not null default 'profile_generate',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint bazi_profile_usage_action_type_check
    check (action_type in ('profile_generate'))
);

create index if not exists bazi_profile_usage_user_created_idx
  on public.bazi_profile_usage (user_id, created_at desc);

create index if not exists bazi_profile_usage_profile_created_idx
  on public.bazi_profile_usage (profile_id, created_at desc);

alter table public.bazi_profile_usage enable row level security;

drop policy if exists "service role can manage bazi profile usage" on public.bazi_profile_usage;
create policy "service role can manage bazi profile usage"
  on public.bazi_profile_usage
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "admin read all bazi profile usage" on public.bazi_profile_usage;
create policy "admin read all bazi profile usage"
  on public.bazi_profile_usage
  for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
