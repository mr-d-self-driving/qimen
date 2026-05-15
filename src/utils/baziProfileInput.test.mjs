import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildLunarProfilePayload,
  buildBaziProfileInsertPayload,
  buildPillarsProfilePayload,
  buildSolarProfilePayload,
  canRetryLegacyBaziProfileInsert,
  getAllowedMonthBranchesByStem,
  getAllowedTimeBranchesByStem,
  getChinaDaylightSavingAdjustment,
  getSolarTimeAdjustment,
  isMissingBaziProfileSolarTimeColumnError,
  getMonthStemByYearStem,
  getTimeStemByDayStem,
  normalizeLongitude,
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

test('buildSolarProfilePayload can derive bazi from birthplace solar time', () => {
  const payload = buildSolarProfilePayload({
    name: '测试',
    gender: 'M',
    year: 1999,
    month: 6,
    day: 7,
    hour: 23,
    minute: 20,
    birthLocation: '成都',
    birthLatitude: 30.5728,
    birthLongitude: 104.0668,
    solarTimeMode: 'mean'
  })

  assert.equal(payload.birth_date, '1999-06-07 23:20:00')
  assert.equal(payload.adjusted_birth_date, '1999-06-07 22:16:00')
  assert.equal(payload.bazi_str, '己卯 庚午 庚寅 丁亥')
  assert.equal(payload.birth_location, '成都')
  assert.equal(payload.birth_latitude, 30.5728)
  assert.equal(payload.birth_longitude, 104.0668)
  assert.equal(payload.solar_time_adjustment_minutes, -64)
})

test('bazi profile insert payload can omit new solar-time columns for legacy schemas', () => {
  const payload = buildSolarProfilePayload({
    name: '测试',
    gender: 'M',
    year: 1998,
    month: 10,
    day: 8,
    hour: 15,
    minute: 30
  })

  assert.deepEqual(buildBaziProfileInsertPayload('user-1', payload, { includeSolarTimeColumns: false }), {
    user_id: 'user-1',
    name: '测试',
    gender: 'M',
    birth_date: '1998-10-08 15:30:00',
    bazi_str: '戊寅 辛酉 戊子 庚申'
  })
})

test('legacy profile retry is limited to profiles without solar-time correction', () => {
  const clockPayload = buildSolarProfilePayload({
    name: '测试',
    gender: 'M',
    year: 1998,
    month: 10,
    day: 8,
    hour: 15,
    minute: 30
  })
  const correctedPayload = buildSolarProfilePayload({
    name: '测试',
    gender: 'M',
    year: 1999,
    month: 6,
    day: 7,
    hour: 23,
    minute: 20,
    birthLocation: '成都',
    birthLatitude: 30.5728,
    birthLongitude: 104.0668,
    solarTimeMode: 'mean'
  })

  assert.equal(canRetryLegacyBaziProfileInsert(clockPayload), true)
  assert.equal(canRetryLegacyBaziProfileInsert(correctedPayload), false)
})

test('missing bazi profile solar-time column errors are detected from Supabase schema cache messages', () => {
  assert.equal(
    isMissingBaziProfileSolarTimeColumnError({
      message: "Could not find the 'birth_latitude' column of 'bazi_profiles' in the schema cache"
    }),
    true
  )
  assert.equal(isMissingBaziProfileSolarTimeColumnError({ message: 'permission denied' }), false)
})

test('solar time adjustment supports apparent time and longitude validation', () => {
  assert.equal(normalizeLongitude('104.0668'), 104.0668)
  assert.equal(normalizeLongitude('181'), null)

  const adjustment = getSolarTimeAdjustment({
    year: 1999,
    month: 6,
    day: 7,
    hour: 23,
    minute: 20,
    longitude: 104.0668,
    mode: 'apparent'
  })

  assert.equal(adjustment.totalMinutes, -62)
  assert.deepEqual(adjustment.adjusted, {
    year: 1999,
    month: 6,
    day: 7,
    hour: 22,
    minute: 18
  })
})

test('mainland China daylight saving time subtracts one hour before solar-time correction', () => {
  const daylightSaving = getChinaDaylightSavingAdjustment({
    year: 1990,
    month: 6,
    day: 1,
    hour: 6,
    minute: 30,
    country: '中国',
    admin1: '北京'
  })

  assert.equal(daylightSaving.minutes, -60)

  const adjustment = getSolarTimeAdjustment({
    year: 1990,
    month: 6,
    day: 1,
    hour: 6,
    minute: 30,
    longitude: 116.4074,
    mode: 'mean',
    country: '中国',
    admin1: '北京'
  })

  assert.equal(adjustment.daylightSavingMinutes, -60)
  assert.ok(Math.abs(adjustment.longitudeMinutes - -14.3704) < 0.0001)
  assert.equal(adjustment.totalMinutes, -74)
  assert.deepEqual(adjustment.adjusted, {
    year: 1990,
    month: 6,
    day: 1,
    hour: 5,
    minute: 16
  })
})

test('China daylight saving auto mode excludes Hong Kong, Macau, and Taiwan', () => {
  const base = { year: 1990, month: 6, day: 1, hour: 6, minute: 30, country: '中国' }

  assert.equal(getChinaDaylightSavingAdjustment({ ...base, admin1: '香港' }).minutes, 0)
  assert.equal(getChinaDaylightSavingAdjustment({ ...base, admin1: '澳门' }).minutes, 0)
  assert.equal(getChinaDaylightSavingAdjustment({ ...base, admin1: '台湾' }).minutes, 0)
})

test('China daylight saving respects transition-day clock boundaries', () => {
  const base = { year: 1990, country: '中国', admin1: '北京' }

  assert.equal(getChinaDaylightSavingAdjustment({ ...base, month: 4, day: 15, hour: 1, minute: 30 }).minutes, 0)
  assert.equal(getChinaDaylightSavingAdjustment({ ...base, month: 4, day: 15, hour: 3, minute: 0 }).minutes, -60)
  assert.equal(getChinaDaylightSavingAdjustment({ ...base, month: 9, day: 16, hour: 1, minute: 30 }).minutes, -60)
  assert.equal(getChinaDaylightSavingAdjustment({ ...base, month: 9, day: 16, hour: 2, minute: 0 }).minutes, 0)
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
