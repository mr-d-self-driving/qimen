-- 问事追问落库：追问增补随 qimen_records.qimen_data(jsonb) 持久化。
-- qimen_records 原本只有 INSERT/SELECT 策略，缺 UPDATE，追问回写会被 RLS 静默挡掉。
-- 本迁移补一条 owner 专属的 UPDATE 策略。
-- 已通过 Supabase MCP apply_migration 应用（migration: qimen_records_owner_update_policy）。

create policy "用户只能更新自己的记录" on public.qimen_records
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
