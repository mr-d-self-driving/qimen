// 用神拾取评测脚本
// 给定目标四柱，反查一个能产生该四柱的阳历日期，构造真实 baZi + yun，
// 调用与 panel 完全相同的 buildCompleteBaziDetail，输出引擎拾取的用神/喜忌。
// 用神(five_shens) 只是四柱的确定性函数，与绝对年份/大运无关，故任一匹配日期即可。

import pkg from 'lunar-javascript'
const { Solar } = pkg
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const baziCore = require('../lib/baziCore.js')
const { buildCompleteBaziDetail } = baziCore

// ── 评测案例（四柱 + 性别 + 反查搜索起年）──
const CASES = [
  { id: 'C01', name: '左宗棠',   pillars: ['壬申','辛亥','丙午','庚寅'], male: true,  searchFrom: 1800 },
  { id: 'C02', name: '冼冠生',   pillars: ['戊子','癸亥','庚寅','戊寅'], male: true,  searchFrom: 1880 },
  { id: 'C03', name: '三毛',     pillars: ['癸未','乙卯','癸未','甲寅'], male: false, searchFrom: 1940 },
  { id: 'C04', name: '郁达夫',   pillars: ['丙申','庚子','甲午','甲子'], male: true,  searchFrom: 1890 },
  { id: 'C05', name: '董浩云',   pillars: ['壬子','己酉','丁未','甲辰'], male: true,  searchFrom: 1910 },
  { id: 'C06', name: '章士钊',   pillars: ['辛巳','辛卯','癸丑','乙卯'], male: true,  searchFrom: 1880 },
  { id: 'C07', name: '杜月笙',   pillars: ['戊子','庚申','乙丑','壬午'], male: true,  searchFrom: 1880 },
  { id: 'C08', name: '某高干子弟', pillars: ['甲午','丁丑','壬申','庚戌'], male: true,  searchFrom: 1950 },
  { id: 'C09', name: '某职业妇女', pillars: ['乙酉','戊子','甲寅','癸酉'], male: false, searchFrom: 1940 },
  { id: 'C10', name: '某农妇',   pillars: ['丙子','戊戌','丁丑','丁未'], male: false, searchFrom: 1930 },
]

// 在 [startY, startY+span] 内逐日逐时辰搜索匹配四柱的阳历时刻
function findSolar(pillars, startY, span = 62) {
  const [yP, mP, dP, hP] = pillars
  for (let y = startY; y <= startY + span; y++) {
    for (let mo = 1; mo <= 12; mo++) {
      const dim = new Date(y, mo, 0).getDate()
      for (let d = 1; d <= dim; d++) {
        // 先用正午粗筛 年/月/日 柱
        const probe = Solar.fromYmdHms(y, mo, d, 12, 0, 0).getLunar().getEightChar()
        if (probe.getYear() !== yP || probe.getMonth() !== mP || probe.getDay() !== dP) continue
        // 命中日柱，扫 12 时辰定位 时柱
        for (let h = 0; h < 24; h++) {
          const e = Solar.fromYmdHms(y, mo, d, h, 30, 0).getLunar().getEightChar()
          if (e.getYear() === yP && e.getMonth() === mP && e.getDay() === dP && e.getTime() === hP) {
            return { y, mo, d, h }
          }
        }
      }
    }
  }
  return null
}

const results = []
for (const c of CASES) {
  const hit = findSolar(c.pillars, c.searchFrom)
  if (!hit) { console.error(`✗ ${c.id} ${c.name}: 反查失败`); results.push({ ...c, error: '反查失败' }); continue }
  const solar = Solar.fromYmdHms(hit.y, hit.mo, hit.d, hit.h, 30, 0)
  const baZi = solar.getLunar().getEightChar()
  const yun = baZi.getYun(c.male ? 1 : 0)
  const detail = buildCompleteBaziDetail({ baZi, yun, isMale: c.male, currentYear: 2026 })
  const fs = detail.five_shens || {}
  const ub = detail.user_blocks || {}
  results.push({
    id: c.id, name: c.name, pillars: c.pillars.join(' '), male: c.male,
    solar: `${hit.y}-${hit.mo}-${hit.d} ${hit.h}:30`,
    dayGan: baZi.getDayGan(),
    strong_weak: detail.strong_weak,
    geju: detail.geju,
    chengge: detail.chengge_detail?.chengGe || '',
    special_pattern: fs.special_pattern || detail.special_pattern || '',
    yong: fs.yong,
    yong_confidence: fs.yong_confidence,
    xi: fs.xi, ji: fs.ji, chou: fs.chou, xian: fs.xian,
    favorable: detail.favorable_gods || fs.favorable,
    unfavorable: detail.unfavorable_gods || fs.unfavorable,
    user_blocks: {
      yong_shen_text: ub.yong_shen_text,
      xi_ji_text: ub.xi_ji_text,
      dayun_guide: ub.dayun_guide,
      avoid_text: ub.avoid_text,
      summary: ub.summary,
    },
    decision_chain: (detail.decision_chain || []).map(s => `${s.layer}: ${s.conclusion || s.text || ''}`),
  })
}

console.log(JSON.stringify(results, null, 2))
