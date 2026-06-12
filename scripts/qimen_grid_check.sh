#!/bin/bash
# 出完整九宫盘（3×3）供逐宫核对。engineOnly 模式，零 LLM 花费。
# 用法: bash scripts/qimen_grid_check.sh 2027 7 1 9 0
BASE="${QM_BASE:-https://qimen-preview.oceanjustinlin.workers.dev}"
curl -s -N -X POST "$BASE/api/qimen" \
  -H "Content-Type: application/json" \
  -H "x-guest-id: guest_grid$(date +%s%N | cut -c1-13)" \
  -d "{\"question\":\"排盘校验\",\"engineOnly\":true,\"panTime\":{\"year\":$1,\"month\":$2,\"day\":$3,\"hour\":$4,\"minute\":$5}}" \
  --max-time 30 2>&1 | python3 -c "
import sys,json
d=sys.stdin.read()
res=None
for ev in d.split('data: '):
  ev=ev.strip()
  if not ev: continue
  try: o=json.loads(ev)
  except: continue
  if o.get('type')=='complete': res=o['result']
  if o.get('type')=='error': print('ERROR:',o.get('message')); sys.exit()
if not res: print('无结果'); sys.exit()
q=res['qimen_data']; ji=q['ju_info']; P={p['index']:p for p in q['palaces']}
print(f\"  {q['timestamp']['solar']}   {ji['name']}  {ji['jieqi']}{ji['yuan']}  旬首{ji['xun_shou']}\")
print(f\"  四柱 {q['pillars']['year']} {q['pillars']['month']} {q['pillars']['day']} {q['pillars']['hour']}   值符{ji['zhi_fu']}{ji['zhi_fu_palace']} 值使{ji['zhi_shi']}{ji['zhi_shi_palace']}\")
print(f\"  空亡 日{q['auxiliary']['kong_wang']['day']}/时{q['auxiliary']['kong_wang']['hour']}   马星 日{q['auxiliary']['ma_xing']['day']}/时{q['auxiliary']['ma_xing']['hour']}\")
def cell(i):
  p=P.get(i,{})
  if p.get('is_center'): return [' 中5宫 ',f\"地{p.get('earth','')}\",'  寄  ','       ']
  mk=''
  if p.get('ma_xing',{}).get('has_ma'): mk+='马'
  if p.get('kong_wang',{}).get('is_kong'): mk+='空'
  l1=f\"{p.get('god','')} {p.get('name','')}\".strip()
  l2=f\"神{p.get('god','')} 星{p.get('star','')}{('/寄'+p['ji_sky']) if p.get('ji_sky') else ''}\"
  l3=f\"门{p.get('door','')}  天盘{p.get('sky','')}\"
  l4=f\"地盘{p.get('earth','')}{('/寄'+p['ji_earth']) if p.get('ji_earth') else ''}  {mk}\"
  return [l1,l2,l3,l4]
# 南上布局：巽4 离9 坤2 / 震3 中5 兑7 / 艮8 坎1 乾6  → 索引 0..8
rows=[[0,1,2],[3,4,5],[6,7,8]]
W=22
for r in rows:
  cells=[cell(i) for i in r]
  for ln in range(4):
    print('  '+''.join((cells[c][ln]).ljust(W) for c in range(3)))
  print('  '+'-'*(W*3))
"
