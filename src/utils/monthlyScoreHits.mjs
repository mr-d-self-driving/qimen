const DEFAULT_LAYER_LABELS = {
  layer1: '干支格局层',
  layer2: '日运聚合层',
  layer3: '月令神煞层',
  tiaohou: '调候修正层',
}

const normalizeHit = (hit = {}) => ({
  code: String(hit.code || ''),
  type: String(hit.type || 'neutral'),
  display: String(hit.display || '').trim(),
  debug: String(hit.debug || '').trim(),
  delta_raw: hit.delta_raw ?? null,
})

export const normalizeScoreHitLayers = (data = {}, options = {}) => {
  const defaultLayerLabels = options.defaultLayerLabels || DEFAULT_LAYER_LABELS
  const legacyCopy = String(options.legacyCopy || '').trim()
  const layers = data?.score_hits?.layers
  if (Array.isArray(layers) && layers.length) {
    return layers
      .map(layer => {
        const layerKey = String(layer?.layer || '')
        const hits = Array.isArray(layer?.hits)
          ? layer.hits.map(normalizeHit).filter(hit => hit.display)
          : []
        return {
          layer: layerKey,
          title: String(layer?.label || defaultLayerLabels[layerKey] || '命中层'),
          score: Number(layer?.score || 0),
          hits,
        }
      })
      .filter(layer => layer.hits.length > 0)
  }

  const legacy = legacyCopy
  if (!legacy) return []
  return [{
    layer: 'legacy',
    title: options.legacyTitle || '干支摘要',
    score: Number(data?.layer1_score || 0),
    hits: [{
      code: options.legacyCode || 'legacy_relation',
      type: 'neutral',
      display: legacy,
      debug: legacy,
      delta_raw: null,
    }],
  }]
}

export const normalizeMonthlyScoreLayers = (monthlyData = {}) => normalizeScoreHitLayers(monthlyData, {
  legacyCopy: monthlyData?.month_zhi_relations || monthlyData?.month_relations || '',
  legacyTitle: '干支摘要',
  legacyCode: 'legacy_month_relation',
})

export const normalizeAnnualScoreLayers = (annualData = {}) => normalizeScoreHitLayers(annualData, {
  defaultLayerLabels: {
    layer1: '大运底色层',
    layer2: '流年太岁层',
    layer3: '岁运神煞层',
  },
  legacyCopy: annualData?.suiyun_relations || annualData?.year_relations || '',
  legacyTitle: '岁运摘要',
  legacyCode: 'legacy_annual_relation',
})

export const getMonthlyScoreSummary = (monthlyData = {}) => (
  String(monthlyData?.score_hits?.summary?.display || '本月命中已归入详情，点开查看评分架构。').trim()
)

export const getAnnualScoreSummary = (annualData = {}) => (
  String(annualData?.score_hits?.summary?.display || annualData?.suiyun_relations || '今年命中已归入详情，点开查看三层判断。').trim()
)
