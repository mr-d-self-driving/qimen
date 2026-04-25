begin;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bazi_profiles'
      and column_name = 'yuanju_core'
  ) then
    execute 'alter table public.bazi_profiles rename column yuanju_core to display_yuanju_core';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bazi_profiles'
      and column_name = 'current_dayun'
  ) then
    execute 'alter table public.bazi_profiles rename column current_dayun to display_current_dayun';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bazi_profiles'
      and column_name = 'current_liunian'
  ) then
    execute 'alter table public.bazi_profiles rename column current_liunian to display_current_liunian';
  end if;
end $$;

alter table public.bazi_profiles
  add column if not exists llm_yuanju_core text,
  add column if not exists llm_current_dayun text,
  add column if not exists llm_current_liunian text,
  add column if not exists engine_yuanju_core text,
  add column if not exists engine_current_dayun text,
  add column if not exists engine_current_liunian text;

update public.bazi_profiles
set
  llm_yuanju_core = coalesce(
    llm_yuanju_core,
    bazi_detail->>'llm_yuanju_core'
  ),
  llm_current_dayun = coalesce(
    llm_current_dayun,
    bazi_detail->>'llm_current_dayun'
  ),
  llm_current_liunian = coalesce(
    llm_current_liunian,
    bazi_detail->>'llm_current_liunian'
  ),
  engine_yuanju_core = coalesce(
    engine_yuanju_core,
    bazi_detail->>'engine_yuanju_core',
    bazi_detail->>'engine_yuanju',
    display_yuanju_core,
    bazi_detail->>'yuanju_core'
  ),
  engine_current_dayun = coalesce(
    engine_current_dayun,
    bazi_detail->>'engine_current_dayun',
    bazi_detail->>'engine_dayun',
    display_current_dayun,
    bazi_detail->>'current_dayun'
  ),
  engine_current_liunian = coalesce(
    engine_current_liunian,
    bazi_detail->>'engine_current_liunian',
    bazi_detail->>'engine_liunian',
    display_current_liunian,
    bazi_detail->>'current_liunian'
  ),
  bazi_detail = coalesce(bazi_detail, '{}'::jsonb)
    || jsonb_build_object(
      'llm_yuanju_core', coalesce(llm_yuanju_core, bazi_detail->>'llm_yuanju_core'),
      'llm_current_dayun', coalesce(llm_current_dayun, bazi_detail->>'llm_current_dayun'),
      'llm_current_liunian', coalesce(llm_current_liunian, bazi_detail->>'llm_current_liunian'),
      'engine_yuanju_core', coalesce(engine_yuanju_core, bazi_detail->>'engine_yuanju_core', bazi_detail->>'engine_yuanju', display_yuanju_core, bazi_detail->>'yuanju_core'),
      'engine_current_dayun', coalesce(engine_current_dayun, bazi_detail->>'engine_current_dayun', bazi_detail->>'engine_dayun', display_current_dayun, bazi_detail->>'current_dayun'),
      'engine_current_liunian', coalesce(engine_current_liunian, bazi_detail->>'engine_current_liunian', bazi_detail->>'engine_liunian', display_current_liunian, bazi_detail->>'current_liunian')
    );

commit;
