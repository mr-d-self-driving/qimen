import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildLunarProfilePayload,
  buildPillarsProfilePayload,
  buildSolarProfilePayload,
  getAllowedMonthBranchesByStem,
  getAllowedTimeBranchesByStem,
  getMonthStemByYearStem,
  getTimeStemByDayStem,
  normalizePillarsByDunRules,
  parseCompactSolarInput
} from './baziProfileInput.mjs'

test('parseCompactSolarInput supports yyyyMMddHHmm format', () => {
  assert.deepEqual(parseCompactSolarInput('199303270255'), {
    year: 1993,
    month: 3,
    day: 27,
    hour: 2,
    minute: 55
  })
})

test('buildSolarProfilePayload derives birth_date and bazi_str from solar datetime', () => {
  const payload = buildSolarProfilePayload({
    name: '测试',
    gender: 'M',
    year: 1999,
    month: 6,
    day: 7,
    hour: 9,
    minute: 11
  })

  assert.equal(payload.birth_date, '1999-06-07 09:11:00')
  assert.equal(payload.bazi_str, '己卯 庚午 庚寅 辛巳')
})

test('buildLunarProfilePayload converts lunar birth into solar birth_date', () => {
  const payload = buildLunarProfilePayload({
    name: '测试',
    gender: 'F',
    year: 1989,
    month: 12,
    day: 5,
    hour: 0,
    minute: 0
  })

  assert.equal(payload.birth_date, '1990-01-01 00:00:00')
  assert.equal(payload.bazi_str, '己巳 丙子 丙寅 戊子')
})

test('五虎遁 derives month stem from year stem and month branch', () => {
  assert.equal(getMonthStemByYearStem('己', '寅'), '丙')
  assert.equal(getMonthStemByYearStem('己', '午'), '庚')
  assert.equal(getMonthStemByYearStem('庚', '午'), '壬')
})

test('五鼠遁 derives time stem from day stem and time branch', () => {
  assert.equal(getTimeStemByDayStem('甲', '子'), '甲')
  assert.equal(getTimeStemByDayStem('甲', '巳'), '己')
  assert.equal(getTimeStemByDayStem('庚', '巳'), '辛')
})

test('month stem and time stem each map to six legal branches', () => {
  assert.deepEqual(getAllowedMonthBranchesByStem('丁'), ['卯', '巳', '未', '酉', '亥', '丑'])
  assert.deepEqual(getAllowedTimeBranchesByStem('丙'), ['子', '寅', '辰', '午', '申', '戌'])
})

test('normalizePillarsByDunRules adjusts month and time pillars to valid stems', () => {
  assert.deepEqual(
    normalizePillarsByDunRules({
      yearPillar: '己卯',
      monthPillar: '甲午',
      dayPillar: '庚寅',
      timePillar: '甲巳'
    }),
    {
      yearPillar: '己卯',
      monthPillar: '庚午',
      dayPillar: '庚寅',
      timePillar: '辛巳'
    }
  )
})

test('buildPillarsProfilePayload reverse-matches four pillars to a solar date', () => {
  const payload = buildPillarsProfilePayload({
    name: '测试',
    gender: 'M',
    yearPillar: '己卯',
    monthPillar: '庚午',
    dayPillar: '庚寅',
    timePillar: '辛巳'
  })

  assert.equal(payload.birth_date, '1999-06-07 10:30:00')
  assert.equal(payload.bazi_str, '己卯 庚午 庚寅 辛巳')
  assert.ok(payload.matches.length >= 1)
})
