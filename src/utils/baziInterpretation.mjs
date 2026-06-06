const SECTION_PATTERNS = {
  yuanju_core: /原局核心[:：]\s*([\s\S]*?)(?=\n\s*当前大运[:：]|\n\s*当前流年[:：]|$)/,
  current_dayun: /当前大运[:：]\s*([\s\S]*?)(?=\n\s*当前流年[:：]|$)/,
  current_liunian: /当前流年[:：]\s*([\s\S]*?)$/
}

const cleanSection = (value = '') => value == null ? '' : String(value).trim()

export function parseLegacyBaziSummary(summary) {
  const text = cleanSection(summary)
  if (!text) {
    return {
      yuanju_core: '',
      current_dayun: '',
      current_liunian: ''
    }
  }

  return {
    yuanju_core: cleanSection(text.match(SECTION_PATTERNS.yuanju_core)?.[1]),
    current_dayun: cleanSection(text.match(SECTION_PATTERNS.current_dayun)?.[1]),
    current_liunian: cleanSection(text.match(SECTION_PATTERNS.current_liunian)?.[1])
  }
}

const firstText = (...values) => {
  for (const value of values) {
    const normalized = cleanSection(value)
    if (normalized) return normalized
  }
  return ''
}

export function resolveBaziInterpretation(profile = {}) {
  const detail = profile.bazi_detail || {}
  const legacy = parseLegacyBaziSummary(profile.bazi_summary)

  return {
    yuanju_core: firstText(
      profile.llm_yuanju_core,
      detail.llm_yuanju_core,
      profile.engine_yuanju_core,
      detail.engine_yuanju_core,
      profile.display_yuanju_core,
      profile.yuanju_core,
      legacy.yuanju_core
    ),
    current_dayun: firstText(
      profile.llm_current_dayun,
      detail.llm_current_dayun,
      profile.engine_current_dayun,
      detail.engine_current_dayun,
      profile.display_current_dayun,
      profile.current_dayun,
      legacy.current_dayun
    ),
    current_liunian: firstText(
      profile.llm_current_liunian,
      detail.llm_current_liunian,
      profile.engine_current_liunian,
      detail.engine_current_liunian,
      profile.display_current_liunian,
      profile.current_liunian,
      legacy.current_liunian
    )
  }
}
