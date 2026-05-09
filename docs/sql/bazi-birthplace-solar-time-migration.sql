alter table public.bazi_profiles
  add column if not exists birth_location text,
  add column if not exists birth_latitude double precision,
  add column if not exists birth_longitude double precision,
  add column if not exists solar_time_mode text default 'clock',
  add column if not exists solar_time_adjustment_minutes integer default 0,
  add column if not exists adjusted_birth_date timestamp;
