import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeQimenCardData } from './qimenCardFallbacks.mjs'

test('normalizes qimen audit-shaped output without rendering undefined copy', () => {
  const data = normalizeQimenCardData({
    branch: 'qimen',
    question: '最近的要办的人生大事（离婚）是否能顺利完成？大概什么时间',
    summary: {
      score: 68,
      score_basis: {
        score_logic: '综合用神状态、主客关系、空亡与应期后，本局落在中等可观察区间。',
        positive_signals: ['日干/时干主客生克', '空亡冲填'],
        negative_signals: ['五不遇时', '奇格']
      }
    },
    backend_score_audit: {
      adjustments: [
        { signal: '日干/时干主客生克', reason: '本人能主动制事，但需要投入行动成本。' },
        { signal: '空亡冲填', reason: '应期扫描已出现填实或冲空窗口。' }
      ]
    },
    timing_analysis: {
      p1_candidates: [
        { trigger: '填实空亡或冲空', branches: ['辰', '巳', '午', '未'] }
      ]
    },
    qimen_data: { palaces: [] }
  })

  assert.equal(data.summary.conclusion.includes('undefined'), false)
  assert.equal(data.advice.strategy.some(item => item.includes('undefined')), false)
  assert.equal(data.advice.lucky_tips.time.includes('undefined'), false)
  assert.equal(data.summary.conclusion, '整体有推进空间，但仍需把关键阻力处理扎实。')
  assert.equal(data.advice.strategy.length, 3)
  assert.equal(data.display_blocks.situation, '综合用神状态、主客关系、空亡与应期后，本局落在中等可观察区间。')
  assert.match(data.advice.lucky_tips.time, /辰、巳、午、未/)
})
