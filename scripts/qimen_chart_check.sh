#!/bin/bash
# CP1 固定时间排盘校验工具：只走引擎排盘，跳过 LLM（engineOnly），零 API 花费。
# 依赖后端已部署带 engineOnly 短路的 worker（默认 qimen-preview）。
#
# 用法：
#   bash scripts/qimen_chart_check.sh 2027 7 1 9 0
#   bash scripts/qimen_chart_check.sh            # 跑内置时间矩阵
#
# 覆盖后端：QM_BASE=https://xxx.workers.dev bash scripts/qimen_chart_check.sh ...

BASE="${QM_BASE:-https://qimen-preview.oceanjustinlin.workers.dev}"

qm() {
  curl -s -N -X POST "$BASE/api/qimen" \
    -H "Content-Type: application/json" \
    -H "x-guest-id: guest_chart$(date +%s%N | cut -c1-13)" \
    -d "{\"question\":\"排盘校验\",\"engineOnly\":true,\"panTime\":{\"year\":$1,\"month\":$2,\"day\":$3,\"hour\":$4,\"minute\":$5}}" \
    --max-time 30 2>&1 | python3 -c "
import sys,json
d=sys.stdin.read()
for ev in d.split('data: '):
  ev=ev.strip()
  if not ev: continue
  try: o=json.loads(ev)
  except: continue
  if o.get('type')=='complete':
    q=o['result']['qimen_data']; ji=q['ju_info']
    print(f\"  四柱: {q['pillars']['year']}年 {q['pillars']['month']}月 {q['pillars']['day']}日 {q['pillars']['hour']}时   {q['timestamp']['solar']}\")
    print(f\"  局　: {ji['name']}  {ji['jieqi']}{ji['yuan']}  旬首{ji['xun_shou']}\")
    print(f\"  值符: {ji['zhi_fu']} {ji['zhi_fu_palace']}   值使: {ji['zhi_shi']} {ji['zhi_shi_palace']}\")
    print(f\"  空亡: 日{q['auxiliary']['kong_wang']['day']} 时{q['auxiliary']['kong_wang']['hour']}   马星: 日{q['auxiliary']['ma_xing']['day']} 时{q['auxiliary']['ma_xing']['hour']}\")
    print(f\"  应期窗口数: {o['result'].get('timing_window_count')}\")
  if o.get('type')=='error': print('  ERROR:', o.get('message'))
"
}

if [ "$#" -eq 5 ]; then
  echo "▶ $1-$2-$3 $4:$5"; qm "$1" "$2" "$3" "$4" "$5"
else
  echo "▶ 2027-07-01 09:00 (未来)"; qm 2027 7 1 9 0
  echo "▶ 2020-01-01 14:30 (过去)"; qm 2020 1 1 14 30
  echo "▶ 2026-06-12 23:30 (子时临界)"; qm 2026 6 12 23 30
fi
