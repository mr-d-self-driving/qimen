const BAZI_LLM_SECTION_KEYS = ['yuanju_core', 'current_dayun', 'current_liunian'];
const SECTION_KEY_SET = new Set(BAZI_LLM_SECTION_KEYS);
const MAX_SECTION_LENGTH = 3000;

const START_RE = /<<<SECTION:([a-z_]+)>>>/g;
const ANY_SENTINEL_RE = /<<<(?:END_)?SECTION:[a-z_]+>>>/;

function assertKnownSection(section) {
  if (!SECTION_KEY_SET.has(section)) {
    throw new Error(`Unknown bazi LLM section: ${section}`);
  }
}

function normalizeSectionText(value = '') {
  return String(value).trim();
}

function appendSection(sections, section, text) {
  assertKnownSection(section);
  const next = normalizeSectionText(text);
  if (next.length > MAX_SECTION_LENGTH) {
    throw new Error(`Bazi LLM section too long: ${section}`);
  }
  sections[section] = next;
}

function getMarkerPrefixTailLength(text, marker) {
  const max = Math.min(text.length, marker.length - 1);
  for (let len = max; len > 0; len--) {
    if (marker.startsWith(text.slice(-len))) return len;
  }
  return 0;
}

function parseSentinelSections(text) {
  const input = String(text || '');
  const sections = {};
  START_RE.lastIndex = 0;
  let startMatch = START_RE.exec(input);
  if (!startMatch) return null;

  while (startMatch) {
    const section = startMatch[1];
    assertKnownSection(section);
    const contentStart = START_RE.lastIndex;
    const endToken = `<<<END_SECTION:${section}>>>`;
    const endIndex = input.indexOf(endToken, contentStart);
    if (endIndex === -1) {
      throw new Error(`Missing end marker for bazi LLM section: ${section}`);
    }
    appendSection(sections, section, input.slice(contentStart, endIndex));
    START_RE.lastIndex = endIndex + endToken.length;
    startMatch = START_RE.exec(input);
  }

  return { sections, source: 'sentinel' };
}

function parseLegacyLabels(text) {
  const input = String(text || '');
  const patterns = {
    yuanju_core: /原局核心[:：]\s*([\s\S]*?)(?=\n\s*当前大运[:：]|\n\s*当前流年[:：]|$)/,
    current_dayun: /当前大运[:：]\s*([\s\S]*?)(?=\n\s*当前流年[:：]|$)/,
    current_liunian: /当前流年[:：]\s*([\s\S]*?)$/,
  };
  const sections = {};
  for (const key of BAZI_LLM_SECTION_KEYS) {
    appendSection(sections, key, input.match(patterns[key])?.[1] || '');
  }
  if (!BAZI_LLM_SECTION_KEYS.some(key => sections[key])) {
    throw new Error('Unable to parse bazi LLM sections');
  }
  return { sections, source: 'legacy_labels' };
}

function parseBaziSectionText(text) {
  if (ANY_SENTINEL_RE.test(String(text || ''))) {
    return parseSentinelSections(text);
  }
  return parseLegacyLabels(text);
}

function createBaziSectionStreamParser(handlers = {}) {
  let raw = '';
  let buffer = '';
  let currentSection = null;
  const streamedSections = {};
  const doneSections = new Set();

  function emitDelta(section, text) {
    if (!text) return;
    streamedSections[section] = (streamedSections[section] || '') + text;
    handlers.onDelta?.(section, text);
  }

  function processBuffer() {
    while (buffer) {
      if (!currentSection) {
        const match = buffer.match(/<<<SECTION:([a-z_]+)>>>/);
        if (!match) {
          const markerStart = buffer.lastIndexOf('<<<SECTION:');
          buffer = markerStart === -1 ? '' : buffer.slice(markerStart);
          return;
        }
        const section = match[1];
        assertKnownSection(section);
        currentSection = section;
        handlers.onSectionStart?.(section);
        buffer = buffer.slice(match.index + match[0].length);
      }

      const endToken = `<<<END_SECTION:${currentSection}>>>`;
      const endIndex = buffer.indexOf(endToken);
      if (endIndex !== -1) {
        emitDelta(currentSection, buffer.slice(0, endIndex));
        if (!doneSections.has(currentSection)) {
          doneSections.add(currentSection);
          handlers.onSectionDone?.(currentSection, streamedSections[currentSection] || '');
        }
        buffer = buffer.slice(endIndex + endToken.length);
        currentSection = null;
        continue;
      }

      const keepLength = getMarkerPrefixTailLength(buffer, endToken);
      const safeLength = Math.max(0, buffer.length - keepLength);
      if (safeLength > 0) {
        emitDelta(currentSection, buffer.slice(0, safeLength));
        buffer = buffer.slice(safeLength);
      }
      return;
    }
  }

  return {
    push(chunk = '') {
      const value = String(chunk);
      raw += value;
      buffer += value;
      processBuffer();
    },
    finish() {
      if (currentSection && buffer) {
        emitDelta(currentSection, buffer);
        buffer = '';
      }
      const result = parseBaziSectionText(raw);
      return result;
    },
  };
}

function buildBaziProfileSectionPrompt(ctx = {}) {
  const favorable = Array.isArray(ctx.favorableGods) ? ctx.favorableGods.join('、') : String(ctx.favorableGods || '');
  const unfavorable = Array.isArray(ctx.unfavorableGods) ? ctx.unfavorableGods.join('、') : String(ctx.unfavorableGods || '');

  return `你是专业子平八字命理分析师。你会收到后端规则引擎已经确定的命盘结构、格局、强弱、喜忌神、当前大运和当前流年。

命主信息：${ctx.gender || ''}，出生于${ctx.birthStr || ''}。
四柱八字：${ctx.baziStr || ''}
后端格局：${ctx.geJu || ''}
日主强弱：${ctx.strongWeak || ''}
喜用神：${favorable}
忌仇神：${unfavorable}
当前大运：${ctx.currentDaYunText || ''}
当前流年：${ctx.currentLiuNianText || ''}

你必须只输出以下三个 section，顺序不可改变。不要输出 JSON，不要输出 Markdown 标题，不要输出 section 以外的解释。

<<<SECTION:yuanju_core>>>
用 120-220 字解释原局核心。必须引用后端给出的格局、强弱、喜忌神。不得重算四柱，不得推翻后端结论。
<<<END_SECTION:yuanju_core>>>

<<<SECTION:current_dayun>>>
用 100-180 字解释当前大运。必须结合当前大运干支、十神、与原局喜忌的关系。
<<<END_SECTION:current_dayun>>>

<<<SECTION:current_liunian>>>
用 100-180 字解释当前流年。必须结合当前流年干支、当前大运与原局喜忌，给出一到两个可执行提醒。
<<<END_SECTION:current_liunian>>>`;
}

function buildBaziSummaryFromSections({ geJu = '', sections = {} } = {}) {
  return `【命造格局】：${geJu}\n\n原局核心：\n${sections.yuanju_core || ''}\n\n当前大运：\n${sections.current_dayun || ''}\n\n当前流年：\n${sections.current_liunian || ''}`;
}

module.exports = {
  BAZI_LLM_SECTION_KEYS,
  buildBaziProfileSectionPrompt,
  buildBaziSummaryFromSections,
  createBaziSectionStreamParser,
  parseBaziSectionText,
};
