// 问事追问（多轮）核心：能力注册表 + 判断器输出归一化 + prompt 构建。
// 设计见 docs/superpowers/plans/2026-06-11-wenshi-followup-multiturn.md
// 纯函数模块（无 I/O / 无网络），便于单测；LLM 调用与 SSE 在 worker 侧编排。

'use strict';

// ── 可作增补锚点的 prose 段（与 worker 的 qimenSectionsAreBad / baziTextFields 对齐）──
// 段 key 仅用于"增补挂在哪一段下面"，不代表覆盖该段。
const PATCHABLE_SECTIONS = {
  qimen: [
    'conclusion', 'subject_reading', 'target_reading', 'environment_reading',
    'support_summary', 'constraint_summary', 'decision_reading',
  ],
  // 八字各 mode 段名不同，取并集兜底（Phase 2 可按 mode 细化）
  bazi: [
    'summary_conclusion', 'summary_basis', 'base_foundation', 'dayun_field',
    'liunian_trigger', 'structural_verdict', 'appearance_tendency',
    'personality_tendency', 'career_style', 'relationship_dynamic', 'action_guide',
  ],
};

const DEFAULT_SECTION = { qimen: 'conclusion', bazi: 'summary_conclusion' };

// ── 能力注册表（白名单）：capability → { tier, label, params }
//   tier='reread'   证据已在原盘 evidence 里，无需补算，直接交给增补 LLM。
//   tier='recompute' 原 pipeline 没算，需后端用 seed 复现原盘后跑对应计算函数。
// 判断器只能从这里点菜；不在表内的 capability 一律丢弃（越界兜底）。
const FOLLOWUP_CAPABILITIES = {
  qimen: {
    yingqi:  { tier: 'recompute', label: '应期推演', params: [] },        // qimenScoringEngine.timingCandidates
    fangwei: { tier: 'reread',    label: '方位吉凶', params: [] },        // 读原局九宫
    regong:  { tier: 'reread',    label: '换宫重读', params: ['palace'] },// 读原局指定宫
  },
  bazi: {
    liunian_scan: { tier: 'recompute', label: '流年扫描', params: ['years'] },  // baziDynamicAssessor + calculateAnnualScore
    liuyue_scan:  { tier: 'recompute', label: '流月扫描', params: ['year'] },   // fortuneMonthlyCore
    dayun_window: { tier: 'recompute', label: '大运逐步', params: [] },         // baziDynamicAssessor 大运 impact
    tiaohou:      { tier: 'recompute', label: '调候比例', params: ['flowGan'] },// calculateTiaohouRatio
    retarget:     { tier: 'recompute', label: '换靶重算', params: ['target'] }, // baziQuestionCore.runDynamicPipeline
  },
};

const SCOPES = new Set(['same_casting', 'new_matter']);
const NATURES = new Set(['deepen', 'revise']);

function uniq(arr) {
  return Array.from(new Set(arr));
}

// 把判断器（LLM）的原始输出收敛成可信、已按白名单过滤的结构。
// 容错：字段缺失/越界一律退到安全默认，绝不让未知 capability 或未知 section 流到下游。
function normalizeFollowupRoute(raw, { branch = 'qimen' } = {}) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const reason = typeof r.reason === 'string' ? r.reason : '';

  // 仅 'new_matter' 算新事；其余（含缺失/乱填）一律按同局深挖处理，
  // 真正越界由增补 LLM 的"越出本局则提示重新起局"硬约束兜底。
  const scope = r.scope === 'new_matter' ? 'new_matter' : 'same_casting';
  if (scope === 'new_matter') {
    return { scope, nature: 'deepen', target_sections: [], needs_data: [], reason };
  }

  const nature = NATURES.has(r.nature) ? r.nature : 'deepen';

  const patchable = PATCHABLE_SECTIONS[branch] || PATCHABLE_SECTIONS.qimen;
  const patchableSet = new Set(patchable);
  let target_sections = uniq(
    (Array.isArray(r.target_sections) ? r.target_sections : [])
      .filter((s) => patchableSet.has(s))
  );
  if (target_sections.length === 0) {
    target_sections = [DEFAULT_SECTION[branch] || 'conclusion'];
  }

  const registry = FOLLOWUP_CAPABILITIES[branch] || {};
  const needs_data = (Array.isArray(r.needs_data) ? r.needs_data : [])
    .map((item) => (item && typeof item === 'object' ? item : null))
    .filter(Boolean)
    .filter((item) => registry[item.capability] && registry[item.capability].tier === 'recompute')
    .map((item) => ({
      capability: item.capability,
      params: item.params && typeof item.params === 'object' ? item.params : {},
    }));

  return { scope, nature, target_sections, needs_data: dedupeNeeds(needs_data), reason };
}

function dedupeNeeds(needs) {
  const seen = new Set();
  const out = [];
  for (const n of needs) {
    if (seen.has(n.capability)) continue;
    seen.add(n.capability);
    out.push(n);
  }
  return out;
}

// 列出某 branch 可点的 recompute 能力（注入判断器 prompt，约束模型只能从白名单选）。
function listRecomputeCapabilities(branch) {
  const registry = FOLLOWUP_CAPABILITIES[branch] || {};
  return Object.entries(registry)
    .filter(([, v]) => v.tier === 'recompute')
    .map(([k, v]) => ({ capability: k, label: v.label, params: v.params }));
}

// ── Step A：判断器 prompt（cheap 模型，严格 JSON 输出）──
function buildFollowupClassifierPrompt({
  branch = 'qimen',
  followup = '',
  originQuestion = '',
  originConclusion = '',
  patchableSections,
} = {}) {
  const sections = patchableSections || PATCHABLE_SECTIONS[branch] || PATCHABLE_SECTIONS.qimen;
  const caps = listRecomputeCapabilities(branch);
  const capLines = caps.length
    ? caps.map((c) => `  - ${c.capability}（${c.label}）${c.params.length ? `，params: ${c.params.join(', ')}` : '，无 params'}`).join('\n')
    : '  （无可补算能力）';

  return `你是"问事追问"分流器，只做分类，不做任何命理/奇门解读。输出必须严格 JSON。

【原问题】${originQuestion}
【原结论摘要】${originConclusion}
【用户追问】${followup}

判断追问属于哪种：
1) same_casting —— 仍是同一件事的深挖/补充，可在原盘基础上回答。
2) new_matter   —— 已是另一件事/另一个领域，原盘无法回答，需要重新起局。

若 same_casting，还要判定：
- nature: "deepen"（纯深挖原结论）或 "revise"（追问带来改变前提的新信息，需修正）。默认 deepen。
- target_sections: 增补应挂在以下哪几段下（只能从此列表选，可多选）：
  ${sections.join(', ')}
- needs_data: 回答此追问是否需要原盘没算、需后端补算的数据。只能从下面白名单点；不需要则空数组；
  白名单之外的需求 → 说明原盘答不了 → 应判 new_matter：
${capLines}

只返回 JSON，不要 markdown、不要解释：
{"scope":"same_casting|new_matter","nature":"deepen|revise","target_sections":[],"needs_data":[{"capability":"","params":{}}],"reason":""}`;
}

// ── Step B：增补 patch prompt（与问事同档模型，哨兵分段流式）──
function buildFollowupPatchPrompt({
  branch = 'qimen',
  followup = '',
  evidence = {},
  extraEvidence = null,
  sections = {},
  targetSections = [],
  nature = 'deepen',
} = {}) {
  const targets = (targetSections && targetSections.length ? targetSections : [DEFAULT_SECTION[branch] || 'conclusion']);
  const sectionContext = Object.entries(sections || {})
    .map(([k, v]) => `【${k}】\n${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join('\n\n');

  const extraBlock = extraEvidence
    ? `\n【后端按需补算的新证据（确定性计算，可直接引用）】\n${JSON.stringify(extraEvidence)}\n`
    : '';

  const natureRule = nature === 'revise'
    ? '本次为 revise：追问带来了改变前提的新信息，须以"原结论 → （因新情况）调整为…"的对照写法呈现，不得假装原结论不存在。'
    : '本次为 deepen：是对原结论的深挖补充，不要推翻原结论。';

  const sentinelExample = targets
    .map((k) => `<<<SEC:${k}>>>（针对追问的增补解读）<<<END:${k}>>>`)
    .join('\n');

  return `你是资深${branch === 'bazi' ? '八字' : '奇门'}解盘师，正在回答用户对【同一局】的追问。这是"增补"，不是重新起局。

【本局结构化证据（唯一可依据的盘面，禁止引入其中没有的盘面元素）】
${JSON.stringify(evidence)}
${extraBlock}
【原解读各段（只读上下文，不要复述，不要改写）】
${sectionContext}

【用户追问】${followup}

硬约束：
- 只依据上面的"本局证据"和"补算新证据"回答；绝不杜撰新的盘面/格局/数字。
- 不重新打分、不改变原结论的吉凶定性（${natureRule}）。
- 不得输出任何分数数值或内部指标。
- 你输出的是"针对追问的增补解读"，挂在原段落之下；不要重写原段。
- 若发现本局其实回答不了这个追问，只在 reason 里说明、target 段写"此问需另起一局更准"，不要硬编。

输出格式（严格按哨兵分段，只输出下列指定段，段之间不写任何多余文字）：
<<<SEC:patch_meta>>>{"sections":${JSON.stringify(targets)},"nature":"${nature}"}<<<END:patch_meta>>>
${sentinelExample}`;
}

module.exports = {
  PATCHABLE_SECTIONS,
  DEFAULT_SECTION,
  FOLLOWUP_CAPABILITIES,
  normalizeFollowupRoute,
  listRecomputeCapabilities,
  buildFollowupClassifierPrompt,
  buildFollowupPatchPrompt,
};
