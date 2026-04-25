alter table public.bazi_profiles
  add column if not exists life_events jsonb default '[]'::jsonb,
  add column if not exists calibrated_yuanju_core text,
  add column if not exists calibrated_current_dayun text,
  add column if not exists calibrated_current_liunian text,
  add column if not exists calibrated_at timestamptz;
