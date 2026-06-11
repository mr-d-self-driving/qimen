const SCORE_CONCLUSIONS = [
  { min: 75, text: '整体顺势较足，可以主动推进。' },
  { min: 55, text: '整体有推进空间，但仍需把关键阻力处理扎实。' },
  { min: 0, text: '当前阻力偏重，宜先稳住节奏再推进。' }
]

const compactText = (value) => {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim()
}

const asArray = (value) => Array.isArray(value) ? value.filter(Boolean) : []

const firstText = (...values) => values.map(compactText).find(Boolean) || ''

const conclusionForScore = (score) => {
  const numericScore = Number.isFinite(Number(score)) ? Number(score) : 0
  return SCORE_CONCLUSIONS.find(item => numericScore >= item.min)?.text || SCORE_CONCLUSIONS.at(-1).text
}

const signalSentence = (signals, fallback) => {
  const cleanSignals = asArray(signals).map(compactText).filter(Boolean)
  return cleanSignals.length ? cleanSignals.slice(0, 4).join('、') : fallback
}

const timingText = (timingAnalysis = {}) => {
  const candidates = asArray(timingAnalysis.p1_candidates)
  const firstCandidate = candidates.find(item => asArray(item.branches).length || item.trigger)
  if (!firstCandidate) return ''

  const trigger = compactText(firstCandidate.trigger)
  const branches = asArray(firstCandidate.branches).map(compactText).filter(Boolean).join('、')
  if (trigger && branches) return `${trigger}：重点观察 ${branches}。`
  return trigger || (branches ? `重点观察 ${branches}。` : '')
}

const adjustmentReasons = (backendScoreAudit = {}) => {
  return asArray(backendScoreAudit.adjustments)
    .map(item => firstText(item.reason, item.signal))
    .filter(Boolean)
}

export const normalizeQimenCardData = (data = {}) => {
  const summary = data.summary || {}
  const scoreBasis = summary.score_basis || data.backend_score_audit?.summary?.score_basis || {}
  const score = summary.score ?? data.backend_score_audit?.final_score ?? 0
  const positiveSignals = asArray(scoreBasis.positive_signals)
  const negativeSignals = asArray(scoreBasis.negative_signals)
  const reasons = adjustmentReasons(data.backend_score_audit)
  const timing = timingText(data.timing_analysis)

  const conclusion = firstText(
    summary.conclusion,
    summary.verdict,
    conclusionForScore(score)
  )
  const keyword = firstText(summary.keyword)

  const advice = data.advice || {}
  const existingStrategy = asArray(advice.strategy).map(compactText).filter(Boolean)
  const fallbackStrategy = [
    reasons[0],
    negativeSignals.length ? `先处理：${signalSentence(negativeSignals, '阻力点')}` : '',
    timing || scoreBasis.score_logic
  ].map(compactText).filter(Boolean)

  const displayBlocks = data.display_blocks || {
    situation: compactText(scoreBasis.score_logic),
    yongshen: positiveSignals.length ? `有利信号：${signalSentence(positiveSignals, '暂无')}` : '',
    risk: negativeSignals.length ? `谨慎因素：${signalSentence(negativeSignals, '暂无')}` : '',
    timing
  }

  return {
    ...data,
    summary: {
      ...summary,
      title: firstText(summary.title, '本局断语'),
      conclusion,
      keyword,
      score,
      score_basis: {
        positive_signals: positiveSignals,
        negative_signals: negativeSignals,
        score_logic: compactText(scoreBasis.score_logic)
      }
    },
    advice: {
      ...advice,
      strategy: existingStrategy.length ? existingStrategy : fallbackStrategy.slice(0, 3),
      lucky_tips: {
        ...(advice.lucky_tips || {}),
        direction: firstText(advice.lucky_tips?.direction, '以当下可控事项为主'),
        time: firstText(advice.lucky_tips?.time, timing, '等待关键条件落定'),
        action: firstText(advice.lucky_tips?.action, reasons[0], conclusion)
      }
    },
    display_blocks: displayBlocks
  }
}
