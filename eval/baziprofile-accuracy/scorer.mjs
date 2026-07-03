const DIMENSION_WEIGHTS = {
  yong: 35,
  xiji: 25,
  strength: 15,
  geju: 15,
  image: 15,
  method: 10,
};

const SHEN_ALIASES = {
  比: '比肩',
  劫: '劫财',
  食: '食神',
  伤: '伤官',
  财: '正财',
  才: '偏财',
  官: '正官',
  杀: '七杀',
  印: '正印',
  枭: '偏印',
  印绶: '正印',
  官星: '正官',
  杀星: '七杀',
  财星: '正财',
  食伤: '食伤',
  比劫: '比劫',
};

const SHEN_GROUPS = {
  正印: '印',
  偏印: '印',
  印绶: '印',
  正官: '官杀',
  七杀: '官杀',
  食神: '食伤',
  伤官: '食伤',
  正财: '财',
  偏财: '财',
  比肩: '比劫',
  劫财: '比劫',
  财星: '财',
  官星: '官杀',
  食伤: '食伤',
  比劫: '比劫',
};

const toList = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
};

const includesText = (haystack, needle) => {
  if (!needle) return false;
  return String(haystack || '').includes(String(needle));
};

export function normalizeShen(shen) {
  const value = String(shen || '').trim();
  return SHEN_ALIASES[value] || value;
}

function normalizeItem(item) {
  if (!item) return {};
  if (typeof item === 'string') return { text: item, shen: normalizeShen(item), wuxing: null, stem: null };
  return {
    ...item,
    shen: item.shen ? normalizeShen(item.shen) : null,
    wuxing: item.wuxing || null,
    stem: item.stem || null,
    text: item.text || item.ganZhi || '',
  };
}

function sameShenOrGroup(a, b) {
  const left = normalizeShen(a);
  const right = normalizeShen(b);
  if (!left || !right) return false;
  if (left === right) return true;
  return SHEN_GROUPS[left] && SHEN_GROUPS[left] === SHEN_GROUPS[right];
}

function itemMatchesActual(goldItem, actual) {
  const gold = normalizeItem(goldItem);
  if (gold.wuxing && actual.yong_wuxing === gold.wuxing) {
    if (!gold.shen || sameShenOrGroup(gold.shen, actual.yong)) return { level: 'exact', ratio: gold.shen ? 1 : 0.7 };
    return { level: 'element', ratio: 0.7 };
  }
  if (gold.shen && sameShenOrGroup(gold.shen, actual.yong)) return { level: 'group', ratio: 0.7 };
  if (gold.stem && includesText(actual.yong_stem, gold.stem)) return { level: 'stem', ratio: 0.7 };
  return { level: 'none', ratio: 0 };
}

function goldItemInActualList(goldItem, actualItems = [], actualWuxing = []) {
  const gold = normalizeItem(goldItem);
  const shenHit = gold.shen && actualItems.some(item => sameShenOrGroup(item, gold.shen));
  const wxHit = gold.wuxing && actualWuxing.includes(gold.wuxing);
  const textHit = gold.text && actualItems.some(item => includesText(item, gold.text));
  return Boolean(shenHit || wxHit || textHit);
}

function goldItemExactInActualList(goldItem, actualItems = [], actualWuxing = []) {
  const gold = normalizeItem(goldItem);
  const shenHit = gold.shen && actualItems.some(item => normalizeShen(item) === gold.shen);
  const textHit = gold.text && actualItems.some(item => includesText(item, gold.text));
  if (gold.shen) return Boolean(shenHit || textHit);
  const wxHit = gold.wuxing && actualWuxing.includes(gold.wuxing);
  return Boolean(shenHit || wxHit || textHit);
}

export function scoreYongTop1(gold, actual) {
  const goldYong = toList(gold.yong).map(normalizeItem);
  if (goldYong.length === 0) return { ratio: null, critical: false, notes: ['gold has no yong label'] };

  const goldJi = toList(gold.ji).map(normalizeItem);
  const actualYong = normalizeShen(actual.yong);
  const actualNorm = { ...actual, yong: actualYong };

  let best = { ratio: 0, level: 'none' };
  for (const item of goldYong) {
    const matched = itemMatchesActual(item, actualNorm);
    if (matched.ratio > best.ratio) best = matched;
  }

  // 用神精确命中 gold 用神（同十神）时，即便与某忌神同五行（如正官 vs 七杀皆金），也不算落忌。
  const exactYongHit = goldYong.some(item => item.shen && normalizeShen(item.shen) === actualYong);
  if (!exactYongHit) {
    const critical = goldJi.some(item => itemMatchesActual(item, actualNorm).ratio > 0);
    if (critical) {
      return { ratio: 0, critical: true, notes: [`actual yong ${actualYong || actual.yong_wuxing || ''} falls into gold ji`] };
    }
  }

  if (best.ratio === 0) {
    const inFav = goldYong.some(item => goldItemInActualList(item, actual.favorable_shens, actual.favorable_wuxing));
    if (inFav) best = { ratio: 0.4, level: 'favorable_not_top1' };
  }

  return { ratio: best.ratio, critical: false, notes: best.level === 'none' ? ['actual yong missed gold yong'] : [`match level: ${best.level}`] };
}

export function scoreXijiDirection(gold, actual) {
  const goldYong = toList(gold.yong).map(normalizeItem);
  const goldXi = toList(gold.xi).map(normalizeItem);
  const goldJi = toList(gold.ji).map(normalizeItem);
  if (goldYong.length + goldXi.length + goldJi.length === 0) return { ratio: null, critical: false, notes: ['gold has no xiji label'] };

  const actualFavShens = [actual.yong, ...(actual.xi || []), ...(actual.favorable_shens || [])].map(normalizeShen).filter(Boolean);
  const actualFavWx = [actual.yong_wuxing, ...(actual.favorable_wuxing || [])].filter(Boolean);
  const actualBadShens = [...(actual.ji || []), ...(actual.chou || []), ...(actual.unfavorable_shens || [])].map(normalizeShen).filter(Boolean);
  const actualBadWx = [...(actual.unfavorable_wuxing || [])].filter(Boolean);

  let checks = 0;
  let hits = 0;
  const notes = [];
  let critical = false;

  for (const item of [...goldYong, ...goldXi]) {
    checks += 1;
    const inFav = goldItemInActualList(item, actualFavShens, actualFavWx);
    const inBad = goldItemInActualList(item, actualBadShens, actualBadWx);
    const exactBad = goldItemExactInActualList(item, actualBadShens, actualBadWx);
    if (inFav) hits += 1;
    // critical 只在“真·方向反转”时触发：该神被列入忌方，且其五行在喜方完全不存在。
    // 同五行异性十神拆分（如正财喜、偏财忌；正官喜、七杀忌）方向其实一致，不算 critical。
    if (inBad && exactBad && !inFav) {
      critical = true;
      notes.push(`gold favorable ${item.shen || item.wuxing || item.text} appears in actual unfavorable`);
    }
  }
  for (const item of goldJi) {
    checks += 1;
    const inBad = goldItemInActualList(item, actualBadShens, actualBadWx);
    const inFav = goldItemInActualList(item, actualFavShens, actualFavWx);
    const exactFav = goldItemExactInActualList(item, actualFavShens, actualFavWx);
    if (inBad) hits += 1;
    if (inFav && exactFav && !inBad) {
      critical = true;
      notes.push(`gold ji ${item.shen || item.wuxing || item.text} appears in actual favorable`);
    }
  }

  return { ratio: checks ? hits / checks : null, critical, notes };
}

function scoreStrength(gold, actual) {
  if (!gold.strength?.class) return { ratio: null, notes: ['gold has no strength label'] };
  const actualSw = String(actual.strong_weak || '');
  const acceptable = [gold.strength.class, ...(gold.strength.acceptable || [])].filter(Boolean);
  const hit = acceptable.some(item => actualSw.includes(item) || item.includes(actualSw));
  return { ratio: hit ? 1 : 0, notes: hit ? [] : [`expected ${acceptable.join('/')} got ${actualSw}`] };
}

// 格名同义归一：
// - 羊刃格 = 阳刃格（同一概念，仅称谓不同）；
// - 专旺一族：曲直/炎上/稼穑/从革/润下/从强 均为一行独旺顺用，归一到「专旺格」便于比对
//   （gold 用通名「专旺格/从强格」，引擎 image_subtype 给具体名「曲直格/从革格」）。
const normalizeGeju = (s) => String(s || '')
  .replace(/阳刃/g, '羊刃')
  .replace(/曲直格|炎上格|稼穑格|从革格|润下格|从强格/g, '专旺格');

// 古籍稀疏格/描述性命名（三命通会/神峰通考特殊格、气势描述）——非子平真诠正格体系，
// 引擎按正格口径不可比，按 plan §七.4 仅作 displayOnly，不计入主线 geju 准确率。
const SPARSE_DISPLAY_GEJU = ['官印双全', '相刑遇贵', '金木间隔', '日德', '魁罡', '天干顺食', '地支夹拱', '两干不杂', '一气生成', '印绶天德', '夫健怕妻', '纯粹中和'];

function scoreGeju(gold, actual) {
  if (!gold.geju?.primary) return { ratio: null, notes: ['gold has no geju label'] };
  if (SPARSE_DISPLAY_GEJU.some(n => gold.geju.primary.includes(n))) {
    return { ratio: null, notes: ['sparse/display-only geju, excluded from main-line scoring'] };
  }
  const candidates = [gold.geju.primary, ...(gold.geju.aliases || [])].filter(Boolean).map(normalizeGeju);
  const actualText = normalizeGeju([
    actual.geju,
    actual.chengge,
    actual.pattern_final,
    actual.image_subtype,
    actual.image_category,
  ].filter(Boolean).join(' '));
  const actualGejuNorm = normalizeGeju(actual.geju);
  const hit = candidates.some(item => includesText(actualText, item) || includesText(item, actualGejuNorm));
  return { ratio: hit ? 1 : 0, notes: hit ? [] : [`expected ${candidates.join('/')} got ${actualText || '(empty)'}`] };
}

function scoreImage(gold, actual) {
  if (!gold.image) return { ratio: null, notes: ['gold has no image label'] };
  const categoryHit = !gold.image.category || includesText(actual.image_category, gold.image.category);
  const subtypeHit = !gold.image.subtype || includesText(actual.image_subtype, gold.image.subtype) || includesText(actual.pattern_final, gold.image.subtype);
  return { ratio: categoryHit && subtypeHit ? 1 : 0, notes: categoryHit && subtypeHit ? [] : [`expected image ${gold.image.category || ''}/${gold.image.subtype || ''}`] };
}

function scoreMethod(gold, actual) {
  const tags = toList(gold.methodTags);
  if (tags.length === 0) return { ratio: null, notes: ['gold has no method tags'] };
  const haystack = [
    ...(actual.decision_chain || []),
    actual.favorable_verdict,
    actual.strength_basis,
    actual.geju,
    actual.chengge,
    actual.pattern_final,
    actual.image_subtype,
  ].filter(Boolean).join(' ');
  const hits = tags.filter(tag => includesText(haystack, tag) || includesText(actual.geju, tag));
  return { ratio: hits.length / tags.length, notes: hits.length === tags.length ? [] : [`method hits ${hits.length}/${tags.length}`] };
}

function severityFrom(score, critical) {
  if (critical) return 'critical';
  if (score < 60) return 'major';
  if (score < 85) return 'minor';
  return 'pass';
}

function inferRootCause(dimensionScores, critical) {
  if (critical) {
    if (dimensionScores.xiji?.critical) return 'xiji';
    if (dimensionScores.yong?.critical) return 'five_shen_classification';
    return 'critical';
  }
  const ordered = [
    ['strength', 'strength'],
    ['image', 'image_analysis'],
    ['geju', 'geju'],
    ['yong', 'five_shen_classification'],
    ['xiji', 'five_shen_classification'],
    ['method', 'geju_scoring'],
  ];
  for (const [key, layer] of ordered) {
    const item = dimensionScores[key];
    if (item && item.ratio !== null && item.ratio < 0.5) return layer;
  }
  return null;
}

export function scoreCase({ caseDef, actual }) {
  const gold = caseDef.gold || {};
  const scope = (caseDef.scoringScope || []).filter(key => DIMENSION_WEIGHTS[key]);
  const dimension_scores = {};
  const calculators = {
    yong: () => scoreYongTop1(gold, actual),
    xiji: () => scoreXijiDirection(gold, actual),
    strength: () => scoreStrength(gold, actual),
    geju: () => scoreGeju(gold, actual),
    image: () => scoreImage(gold, actual),
    method: () => scoreMethod(gold, actual),
  };

  let availableWeight = 0;
  let earned = 0;
  let critical = false;
  const notes = [];

  for (const key of scope) {
    const result = calculators[key]();
    if (result.ratio === null) continue;
    const weight = DIMENSION_WEIGHTS[key];
    availableWeight += weight;
    earned += result.ratio * weight;
    if (result.critical) critical = true;
    dimension_scores[key] = result;
    notes.push(...(result.notes || []).map(note => `${key}: ${note}`));
  }

  const score = availableWeight > 0 ? Math.round((earned / availableWeight) * 100) : 0;
  return {
    id: caseDef.id,
    label: caseDef.label,
    case_class: caseDef.caseClass || 'general',
    score,
    severity: severityFrom(score, critical),
    root_cause_layer: inferRootCause(dimension_scores, critical),
    critical,
    dimension_scores,
    notes,
    gold,
    actual,
    source: caseDef.source,
    scoringScope: scope,
  };
}

export function summarizeRows(rows) {
  const scoped = (scopeName) => rows.filter(row => row.dimension_scores[scopeName] != null && row.dimension_scores[scopeName].ratio != null);
  const avg = (items, pick) => items.length ? items.reduce((sum, item) => sum + pick(item), 0) / items.length : null;
  const ratioAvg = (scopeName) => avg(scoped(scopeName), row => row.dimension_scores[scopeName].ratio);
  const yongRows = scoped('yong');
  const xijiRows = scoped('xiji');
  const strengthRows = scoped('strength');
  const gejuRows = scoped('geju');

  return {
    total: rows.length,
    weighted_accuracy: avg(rows, row => row.score / 100),
    yong_top1_accuracy: ratioAvg('yong'),
    xiji_direction_accuracy: ratioAvg('xiji'),
    strength_accuracy: ratioAvg('strength'),
    geju_accuracy: ratioAvg('geju'),
    yong_case_count: yongRows.length,
    xiji_case_count: xijiRows.length,
    strength_case_count: strengthRows.length,
    geju_case_count: gejuRows.length,
    critical_fail_count: rows.filter(row => row.critical).length,
    pass_count: rows.filter(row => row.severity === 'pass').length,
    minor_count: rows.filter(row => row.severity === 'minor').length,
    major_count: rows.filter(row => row.severity === 'major').length,
    critical_count: rows.filter(row => row.severity === 'critical').length,
  };
}
