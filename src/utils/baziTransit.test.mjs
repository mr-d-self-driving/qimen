import test from 'node:test'
import assert from 'node:assert/strict'

import { Solar } from 'lunar-javascript'

import {
  buildLiuRiList,
  buildLiuYueRange,
  findTransitSelectionByDate,
  formatSolarDateKey
} from './baziTransit.mjs'

const buildEngine = () => {
  const solar = Solar.fromYmdHms(1998, 10, 24, 8, 30, 0)
  const baZi = solar.getLunar().getEightChar()
  return {
    baZi,
    yun: baZi.getYun(0),
    dayGan: baZi.getDayGan()
  }
}

test('buildLiuYueRange returns concrete solar boundaries for a liuyue', () => {
  const engine = buildEngine()
  const dayun = engine.yun.getDaYun().find(item => 2026 >= item.getStartYear() && 2026 <= item.getEndYear())
  const liuNian = dayun.getLiuNian().find(item => item.getYear() === 2026)
  const range = buildLiuYueRange(liuNian, 2)

  assert.equal(formatSolarDateKey(range.startSolar), '2026-04-05')
  assert.equal(formatSolarDateKey(range.endSolar), '2026-05-05')
})

test('buildLiuRiList expands a liuyue into daily ganzhi entries', () => {
  const engine = buildEngine()
  const dayun = engine.yun.getDaYun().find(item => 2026 >= item.getStartYear() && 2026 <= item.getEndYear())
  const liuNian = dayun.getLiuNian().find(item => item.getYear() === 2026)
  const days = buildLiuRiList(liuNian, 2, engine.dayGan)

  assert.ok(days.length > 25)
  assert.equal(days[0].dateKey, '2026-04-05')
  assert.match(days[0].monthName, /月/)
  assert.equal(typeof days[0].gan, 'string')
  assert.equal(typeof days[0].zhi, 'string')
})

test('findTransitSelectionByDate locates today within dayun, liunian, liuyue and liuri', () => {
  const engine = buildEngine()
  const selection = findTransitSelectionByDate(engine, new Date('2026-04-25T12:00:00+08:00'))

  assert.equal(selection.dayunIndex >= 0, true)
  assert.equal(selection.liunianYear, 2026)
  assert.equal(selection.liuyueIndex, 2)
  assert.equal(selection.liuriDateKey, '2026-04-25')
})
