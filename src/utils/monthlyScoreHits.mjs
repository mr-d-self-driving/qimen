const DEFAULT_LAYER_LABELS = {
  layer1: '干支格局层',
  layer2: '日运聚合层',
  layer3: '月令神煞层',
}

const normalizeHit = (hit = {}) => ({
  code: String(hit.code || ''),
  type: String(hit.type || 'neutral'),
  display: String(hit.display || '').trim(),
  debug: String(hit.debug || '').trim(),
  delta_raw: hit.delta_raw ?? null,
})

export const normalizeMonthlyScoreLayers = (monthlyData = {}) => {
  const layers = monthlyData?.score_hits?.layers
  if (Array.isArray(layers) && layers.length) {
    return layers
      .map(layer => {
        const layerKey = String(layer?.layer || '')
        const hits = Array.isArray(layer?.hits)
          ? layer.hits.map(normalizeHit).filter(hit => hit.display)
          : []
        return {
          layer: layerKey,
          title: String(layer?.label || DEFAULT_LAYER_LABELS[layerKey] || '命中层'),
          score: Number(layer?.score || 0),
          hits,
        }
      })
      .filter(layer => layer.hits.length > 0)
  }

  const legacy = String(monthlyData?.month_zhi_relations || monthlyData?.month_relations || '').trim()
  if (!legacy) return []
  return [{
    layer: 'legacy',
    title: '干支摘要',
    score: Number(monthlyData?.layer1_score || 0),
    hits: [{
      code: 'legacy_month_relation',
      type: 'neutral',
      display: legacy,
      debug: legacy,
      delta_raw: null,
    }],
  }]
}

export const getMonthlyScoreSummary = (monthlyData = {}) => (
  String(monthlyData?.score_hits?.summary?.display || monthlyData?.month_zhi_relations || monthlyData?.month_relations || '无明显刑冲合害').trim()
)
