import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildLocalBaziMatrix,
  getPromptDataFromProfile,
  resolveSolarFromProfile
} from './baziLocalMatrix.mjs'

test('resolveSolarFromProfile supports birth_date profiles', () => {
  const solar = resolveSolarFromProfile({
    gender: 'M',
    birth_date: '1998-10-24 08:30:00',
    bazi_str: '戊寅 壬戌 甲辰 戊辰'
  })

  assert.equal(solar.toYmdHms(), '1998-10-24 08:30:00')
})

test('getPromptDataFromProfile keeps exact birth and pillars', () => {
  const promptData = getPromptDataFromProfile({
    gender: 'F',
    birth_date: '1998-10-24 08:30:00',
    bazi_str: '戊寅 壬戌 甲辰 戊辰'
  })

  assert.equal(promptData.gender, '女')
  assert.equal(promptData.birthStr, '1998年10月24日 08:30')
  assert.equal(promptData.baziStr, '戊寅 壬戌 甲辰 戊辰')
})

test('buildLocalBaziMatrix derives four pillars immediately without cloud detail', () => {
  const matrix = buildLocalBaziMatrix({
    gender: 'F',
    birth_date: '1998-10-24 08:30:00',
    bazi_str: '戊寅 壬戌 甲辰 戊辰'
  }, new Date('2026-04-25T00:00:00+08:00'))

  assert.ok(matrix)
  assert.equal(matrix.pillars.length, 4)
  assert.deepEqual(
    matrix.pillars.map(col => `${col.name}:${col.gan}${col.zhi}:${col.star}`),
    ['年:戊寅:偏财', '月:壬戌:偏印', '日:甲辰:日主', '时:戊辰:偏财']
  )
  assert.equal(matrix.current_dayun?.gan + matrix.current_dayun?.zhi, '己未')
  assert.equal(matrix.current_liunian?.gan + matrix.current_liunian?.zhi, '丙午')
})

test('buildLocalBaziMatrix can reverse-match profiles with only four pillars', () => {
  const matrix = buildLocalBaziMatrix({
    gender: 'M',
    bazi_str: '己卯 庚午 庚寅 辛巳'
  }, new Date('2026-04-25T00:00:00+08:00'))

  assert.ok(matrix)
  assert.equal(matrix.pillars[0].gan + matrix.pillars[0].zhi, '己卯')
  assert.equal(matrix.pillars[3].gan + matrix.pillars[3].zhi, '辛巳')
})
