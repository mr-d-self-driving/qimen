-- 回填存量 bazi 问答记录的 subject_snapshot.pillars / profile_id
--
-- 背景：早期 qimen_records 的 qimen_data.subject_snapshot 只存了 name/birth_date/
-- gender/strong_weak/geju，没有命主四柱。前端四柱面板因此会 fallback 到「当前选中
-- profile」，导致 admin 跨账号查看时画成别人的盘。worker 已改为写入 pillars+profile_id，
-- 本脚本为存量记录补齐同样字段。
--
-- 匹配口径：同一 user_id 下，按 出生时间(timestamp) + 性别 (+ 姓名，若快照有名)
-- 唯一定位 profile。已验证 73/73 唯一命中、无歧义、目标 profile 均有 4 柱。
--
-- 幂等：只更新 subject_snapshot 存在且 pillars 仍为 null 的行；可重复执行。
-- 安全：单条 UPDATE 原子执行；不触碰 14 条连 subject_snapshot 都没有的更早期记录。

with snap as (
  select
    r.id as record_id,
    r.user_id,
    r.qimen_data->'subject_snapshot'->>'name' as sname,
    (r.qimen_data->'subject_snapshot'->>'birth_date')::timestamp as sbirth,
    r.qimen_data->'subject_snapshot'->>'gender' as sgender
  from qimen_records r
  where r.qimen_data->>'branch' = 'bazi'
    and r.qimen_data->'subject_snapshot' is not null
    and r.qimen_data->'subject_snapshot'->'pillars' is null
),
matched as (
  select
    snap.record_id,
    p.id as profile_id,
    p.bazi_detail->'matrix'->'pillars' as pillars
  from snap
  join lateral (
    select p.id, p.bazi_detail
    from bazi_profiles p
    where p.user_id = snap.user_id
      and p.birth_date::timestamp = snap.sbirth
      and (snap.sgender is null or p.gender = snap.sgender)
      and (snap.sname  is null or p.name   = snap.sname)
    limit 1
  ) p on true
  where jsonb_array_length(p.bazi_detail->'matrix'->'pillars') = 4
)
update qimen_records r
set qimen_data = jsonb_set(
      jsonb_set(r.qimen_data, '{subject_snapshot,pillars}', m.pillars, true),
      '{subject_snapshot,profile_id}', to_jsonb(m.profile_id::text), true
    )
from matched m
where r.id = m.record_id;
