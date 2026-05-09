import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getMonthlyScoreSummary,
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
