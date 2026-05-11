import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getAnnualScoreSummary,
  getMonthlyScoreSummary,
  normalizeAnnualScoreLayers,
  normalizeMonthlyScoreLayers,
} from './monthlyScoreHits.mjs'

test('normalizeMonthlyScoreLayers returns display hits grouped by layer', () => {
  const layers = normalizeMonthlyScoreLayers({
    score_hits: {
      layers: [
        {
          layer: 'layer1',
          label: '干支格局层',
          score: 8,
          hits: [
            { code: 'a', type: 'positive', display: '可展示', debug: 'raw +8' },
            { code: 'b', type: 'negative', display: '', debug: 'skip' },
          ],
        },
      ],
    },
  })

  assert.equal(layers.length, 1)
  assert.equal(layers[0].title, '干支格局层')
  assert.equal(layers[0].hits.length, 1)
  assert.equal(layers[0].hits[0].display, '可展示')
})

test('normalizeMonthlyScoreLayers falls back to legacy relation copy', () => {
  const layers = normalizeMonthlyScoreLayers({
    layer1_score: -4,
    month_zhi_relations: '无明显刑冲合害',
  })

  assert.equal(layers.length, 1)
  assert.equal(layers[0].layer, 'legacy')
  assert.equal(layers[0].hits[0].display, '无明显刑冲合害')
})

test('getMonthlyScoreSummary prefers score hit display', () => {
  assert.equal(
    getMonthlyScoreSummary({
      score_hits: { summary: { display: '本月宜稳中求进' } },
      month_zhi_relations: '旧摘要',
    }),
    '本月宜稳中求进'
  )
})

test('getMonthlyScoreSummary hides legacy technical relation copy', () => {
  assert.equal(
    getMonthlyScoreSummary({ month_zhi_relations: '流月地支[巳]与命主年支[寅]六害' }),
    '本月命中已归入详情，点开查看三层判断。'
  )
})

test('normalizeAnnualScoreLayers returns the same layer-hit shape with annual labels', () => {
  const layers = normalizeAnnualScoreLayers({
    score_hits: {
      layers: [
        {
          layer: 'layer2',
          label: '流年太岁层',
          score: -8,
          hits: [
            { code: 'zixing', type: 'negative', display: '流年自刑', debug: 'is_zixing=true' },
          ],
        },
      ],
    },
  })

  assert.equal(layers.length, 1)
  assert.equal(layers[0].title, '流年太岁层')
  assert.equal(layers[0].score, -8)
  assert.equal(layers[0].hits[0].code, 'zixing')
})

test('getAnnualScoreSummary prefers score hit display and falls back to legacy copy', () => {
  assert.equal(
    getAnnualScoreSummary({
      score_hits: { summary: { display: '今年宜稳中推进' } },
      suiyun_relations: '旧岁运摘要',
    }),
    '今年宜稳中推进'
  )

  assert.equal(
    getAnnualScoreSummary({ suiyun_relations: '岁运无明显互动' }),
    '岁运无明显互动'
  )
})
