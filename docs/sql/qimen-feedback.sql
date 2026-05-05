create table if not exists public.qimen_feedback (
  id uuid default gen_random_uuid() primary key,
  record_id uuid references public.qimen_records(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  accuracy_status text not null check (
    accuracy_status in (
      'fulfilled',
      'partially_fulfilled',
      'not_fulfilled',
      'pending'
    )
  ),
  actual_direction text not null check (
    actual_direction in (
      'better',
      'matched',
      'worse',
      'pending'
    )
  ),
  note text check (char_length(coalesce(note, '')) <= 200),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (record_id, user_id)
);

create index if not exists qimen_feedback_user_id_idx
  on public.qimen_feedback (user_id);

create index if not exists qimen_feedback_record_id_idx
  on public.qimen_feedback (record_id);

alter table public.qimen_feedback enable row level security;

create policy "Users can read own qimen feedback"
  on public.qimen_feedback
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own qimen feedback"
  on public.qimen_feedback
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.qimen_records
      where qimen_records.id = qimen_feedback.record_id
        and qimen_records.user_id = auth.uid()
    )
  );

create policy "Users can update own qimen feedback"
  on public.qimen_feedback
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.qimen_records
      where qimen_records.id = qimen_feedback.record_id
        and qimen_records.user_id = auth.uid()
    )
  );

create policy "Users can delete own qimen feedback"
  on public.qimen_feedback
  for delete
  using (auth.uid() = user_id);
