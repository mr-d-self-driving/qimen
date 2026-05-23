-- compatibility_sessions: stores anonymous bazi compatibility sessions
-- No user_id required — supports unauthenticated users on the wrapped.html flow

create table if not exists compatibility_sessions (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  -- Person A
  name_a           text,
  gender_a         text,
  birth_date_a     date,
  birth_location_a text,
  birth_lat_a      double precision,
  birth_lng_a      double precision,
  hour_index_a     integer,   -- 0-11 (子丑…亥), -1 = unknown

  -- Person B
  name_b           text,
  gender_b         text,
  birth_date_b     date,
  birth_location_b text,
  birth_lat_b      double precision,
  birth_lng_b      double precision,
  hour_index_b     integer,

  -- Computed compact bazi data (JSON)
  bazi_compact_a   jsonb,
  bazi_compact_b   jsonb,

  -- Final scores (optional, stored after frontend computes)
  dim_scores       jsonb,
  total_score      integer
);

-- Public insert (no auth needed for anonymous sessions)
alter table compatibility_sessions enable row level security;
create policy "allow anon insert" on compatibility_sessions
  for insert to anon with check (true);
create policy "allow anon select own" on compatibility_sessions
  for select to anon using (true);
