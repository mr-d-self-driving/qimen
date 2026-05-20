const {
  DIVINATION_CATEGORIES,
  normalizeDivinationRoute
} = require('./divinationCategories');

const API_URL = 'https://yinli.one/v1/chat/completions';

const BRANCH_RULES = {
  bazi: [
    ['一生', '长期', '未来五年', '未来几年', '这十年', '大运', '流年', '命局', '格局', '喜用神', '适合什么行业', '职业方向', '创业还是打工', '体质', '五脏六腑', '婚姻整体', '财运整体'],
    ['适合', '整体', '长期', '趋势', '命运', '人生', '先天']
  ],
  qimen: [
    ['能不能成', '要不要', '该不该', '选哪个', '什么时候', '多久', '明天', '下周', '这个月', 'offer', '表白', '合同', '收款', '面试', '方位', '去不去', '接不接'],
    ['这件事', '这个项目', '这个人', '这笔', '今天', '近期']
  ]
};

const CATEGORY_RULES = [
  {
    category: 'career_business',
    words: ['事业', '工作', '职业', 'offer', '跳槽', '求职', '面试', '创业', '行业', '项目', '客户', '领导', '晋升', '职称'],
    subcategories: [
      { subcategory: 'entrepreneurship_vs_job', words: ['创业还是打工', '自己做还是上班'] },
      { subcategory: 'career_direction', words: ['职业方向', '适合什么行业', '行业适配', '适合行业'] },
      { subcategory: 'job_search', words: ['求职', '面试', 'offer', '应聘', '录用'] },
      { subcategory: 'current_job_change', words: ['跳槽', '辞职', '调动', '革职', '要不要接', '接不接'] },
      { subcategory: 'promotion_title', words: ['晋升', '升迁', '职称', '领导评价'] },
      { subcategory: 'project_business', words: ['项目', '客户', '谈判', '合作落地'] }
    ]
  },
  {
    category: 'finance_wealth',
    words: ['财运', '赚钱', '投资', '回本', '收款', '欠款', '还款', '理财', '基金', '利润', '生意', '房产', '买卖'],
    subcategories: [
      { subcategory: 'debt_repayment', words: ['欠款', '还款', '收款', '催收', '讨债'] },
      { subcategory: 'investment_business', words: ['投资', '开店', '办厂', '项目投入'] },
      { subcategory: 'real_estate_trade', words: ['房产', '地皮', '买房', '卖房'] },
      { subcategory: 'trade_buy_sell', words: ['买卖', '交易', '商品'] },
      { subcategory: 'general_wealth', words: ['财运', '求财'] },
      { subcategory: 'wealth_capacity', words: ['财富容量', '赚钱能力', '收入模式'] }
    ]
  },
  {
    category: 'relationship',
    words: ['感情', '恋爱', '婚姻', '桃花', '对象', '伴侣', '表白', '复合', '相亲', '网恋'],
    subcategories: [
      { subcategory: 'marriage_pattern', words: ['婚姻整体', '婚姻结构', '长期关系'] },
      { subcategory: 'single_romance', words: ['桃花', '何时有对象', '单身'] },
      { subcategory: 'pursuit_dating', words: ['表白', '相亲', '追求'] },
      { subcategory: 'love_conflict', words: ['第三者', '多角', '纠葛'] },
      { subcategory: 'marriage_existing', words: ['已婚', '婚姻危机', '离婚'] },
      { subcategory: 'online_romance', words: ['网恋', '线上'] }
    ]
  },
  {
    category: 'health_action',
    words: ['身体健康', '疾病', '病情', '手术', '治疗', '医生', '药', '体质', '脏腑', '运动比赛'],
    subcategories: [
      { subcategory: 'constitution', words: ['体质', '脏腑', '五脏六腑'] },
      { subcategory: 'medical_diagnosis', words: ['病情', '疾病', '诊断'] },
      { subcategory: 'treatment_effect', words: ['治疗', '医生', '药'] },
      { subcategory: 'surgery_risk', words: ['手术', '急症'] },
      { subcategory: 'sports_competition', words: ['运动比赛', '搏击', '散打'] }
    ]
  },
  {
    category: 'item_transaction',
    words: ['失物', '找回', '被盗', '丢失', '寻人', '车辆丢失'],
    subcategories: [
      { subcategory: 'vehicle_lost', words: ['车', '车辆'] },
      { subcategory: 'stolen_item', words: ['被盗', '偷'] },
      { subcategory: 'lost_found', words: ['失物', '丢失', '找回'] }
    ]
  },
  {
    category: 'exam_study',
    words: ['考试', '升学', '录取', '考研', '高考', '公务员', '成绩', '复试'],
    subcategories: [
      { subcategory: 'admission_exam', words: ['录取', '升学'] },
      { subcategory: 'interview_review', words: ['复试', '面试', '评审'] },
      { subcategory: 'exam_performance', words: ['考试', '成绩'] }
    ]
  },
  {
    category: 'lawsuit_legal',
    words: ['官司', '诉讼', '刑事', '民事', '证据', '律师', '调解'],
    subcategories: [
      { subcategory: 'criminal_case', words: ['刑事'] },
      { subcategory: 'settlement_evidence', words: ['调解', '证据', '律师'] },
      { subcategory: 'civil_lawsuit', words: ['民事', '诉讼', '官司'] }
    ]
  },
  {
    category: 'fengshui_house',
    words: ['风水', '阳宅', '阴宅', '祖坟', '搬家', '搬迁'],
    subcategories: [
      { subcategory: 'yang_house', words: ['阳宅', '家宅'] },
      { subcategory: 'yin_house', words: ['阴宅', '祖坟'] },
      { subcategory: 'moving_house', words: ['搬家', '搬迁'] }
    ]
  },
  {
    category: 'pregnancy_birth',
    words: ['怀孕', '受孕', '胎儿', '生产', '分娩', '母子'],
    subcategories: [
      { subcategory: 'conception', words: ['受孕'] },
      { subcategory: 'pregnancy_health', words: ['怀孕', '胎儿', '母子'] },
      { subcategory: 'delivery_birth', words: ['生产', '分娩'] }
    ]
  }
];

function normalizeQuestion(question) {
  return String(question || '').trim().replace(/\s+/g, '').toLowerCase();
}

function containsAny(text, words = []) {
  return words.some((word) => text.includes(String(word).toLowerCase()));
}

function scoreWordGroups(text, groups) {
  return groups.reduce((score, words, index) => {
    return score + words.reduce((sum, word) => sum + (text.includes(String(word).toLowerCase()) ? (index === 0 ? 3 : 1) : 0), 0);
  }, 0);
}

function classifyCategory(text) {
  const scored = CATEGORY_RULES.map((rule) => ({
    category: rule.category,
    score: rule.words.reduce((sum, word) => sum + (text.includes(String(word).toLowerCase()) ? 2 : 0), 0),
    rule
  })).sort((a, b) => b.score - a.score);

  const winner = scored[0];
  if (!winner || winner.score === 0) return { category: 'general', subcategory: '', score: 0 };

  const subcategory = winner.rule.subcategories.find((item) => containsAny(text, item.words))?.subcategory || '';
  return { category: winner.category, subcategory, score: winner.score };
}

function getBranchScores(text) {
  const bazi = scoreWordGroups(text, BRANCH_RULES.bazi);
  const qimen = scoreWordGroups(text, BRANCH_RULES.qimen);
  let hybrid = 0;

  if (bazi >= 3 && qimen >= 3) hybrid = bazi + qimen + 2;
  if ((text.includes('今年') || text.includes('大运') || text.includes('流年')) && containsAny(text, ['offer', '这个项目', '这件事', '要不要', '该不该'])) {
    hybrid += 6;
  }

  return { bazi, qimen, hybrid };
}

function confidenceFromScores(primary, secondary = 0) {
  if (primary >= 8 && primary - secondary >= 3) return 'high';
  if (primary >= 5 && primary - secondary >= 2) return 'medium';
  return 'low';
}

function classifyByRules(question, options = {}) {
  const text = normalizeQuestion(question);
  const categoryResult = classifyCategory(text);
  const scores = getBranchScores(text);
  const vague = text.length <= 8 || ['帮我看看', '最近怎么样', '事业如何', '感情怎么样', '财运如何'].some((item) => text.includes(item));

  if (vague && !options.forceBranch) {
    return {
      branch: 'clarify',
      category: categoryResult.category,
      subcategory: categoryResult.subcategory || 'vague',
      confidence: 'low',
      source: 'rules',
      reason: '问题缺少时间范围或具体判断目标',
      followupQuestion: '你是想看长期趋势，还是判断眼前某一件具体事情？如果是具体事，请补充对象、时间和想判断的结果。',
      needsBaziProfile: false,
      canFallbackToQimenOnly: false
    };
  }

  const branchEntries = [
    ['hybrid', scores.hybrid],
    ['bazi', scores.bazi],
    ['qimen', scores.qimen]
  ].sort((a, b) => b[1] - a[1]);

  let branch = branchEntries[0][0];
  if (options.forceBranch) branch = options.forceBranch;
  if (branchEntries[0][1] === 0 && !options.forceBranch) branch = 'qimen';

  let subcategory = categoryResult.subcategory;
  if (branch === 'qimen' && categoryResult.category === 'career_business' && ['career_direction', 'industry_fit', 'entrepreneurship_vs_job'].includes(subcategory)) {
    subcategory = '';
  }
  if (branch === 'qimen' && categoryResult.category === 'career_business' && text.includes('offer')) {
    subcategory = 'job_search';
  }
  if (branch === 'hybrid' && categoryResult.category === 'career_business' && containsAny(text, ['offer', '跳槽', '要不要接', '接不接'])) {
    subcategory = 'current_job_change';
  }

  const topScore = branchEntries[0][1];
  const secondScore = branchEntries[1]?.[1] || 0;
  const confidence = options.forceBranch ? 'medium' : confidenceFromScores(topScore + categoryResult.score, secondScore);
  const needsBaziProfile = branch === 'bazi' || branch === 'hybrid';

  return {
    branch,
    category: categoryResult.category,
    subcategory,
    confidence,
    source: 'rules',
    reason: buildRuleReason(branch, categoryResult.category, subcategory),
    followupQuestion: '',
    needsBaziProfile,
    canFallbackToQimenOnly: branch === 'hybrid'
  };
}

function inferAnalysisModeHint(text, route = {}) {
  if (route.branch === 'clarify') return 'unsupported';
  if (/什么时候|哪年|几年|何时|应期|未来三年|未来五年|未来十年|未来几年/.test(text)) return 'timing';
  if (/画像|什么样|长相|性格|类型|伴侣|对象|老婆|老公|合伙人|领导/.test(text) && !/今年|现在|当前|这步大运|状态|怎么样/.test(text)) return 'character';
  if (/适合什么|适不适合|格局|先天|命里|有没有|容量|上限|创业还是打工|行业|方向/.test(text) && !/今年|现在|当前|这步大运|状态/.test(text)) return 'pattern';
  return 'status';
}

function inferSecondaryModeHint(text, analysisMode) {
  if (analysisMode === 'pattern' && /今年|现在|当前|这步大运|目前|当下/.test(text)) return 'status';
  if (analysisMode === 'character' && /今年|现在|当前|这步大运|目前|当下|状态|怎么样/.test(text)) return 'status';
  return null;
}

function inferTimeScopeHint(text, analysisMode) {
  if (analysisMode === 'timing') {
    if (/未来三年|未来几年|近几年|这几年/.test(text)) return { type: 'next_3_years' };
    if (/未来五年|五年内/.test(text)) return { type: 'next_5_years' };
    if (/未来十年|这十年|十年内|大运/.test(text)) return { type: 'next_10_years' };
    return { type: 'next_10_years' };
  }
  if (/今年|现在|当前|目前|当下|这步大运/.test(text)) return { type: 'current_year' };
  return { type: 'unknown' };
}

function ruleRouteHint(question, options = {}) {
  const ruleResult = classifyByRules(question, options);
  const text = normalizeQuestion(question);
  const analysisModeHint = inferAnalysisModeHint(text, ruleResult);
  const secondaryModeHint = inferSecondaryModeHint(text, analysisModeHint);
  const timeScopeHint = inferTimeScopeHint(text, analysisModeHint);

  return {
    ...ruleResult,
    branch_hint: ruleResult.branch,
    category_hint: ruleResult.category,
    subcategory_hint: ruleResult.subcategory,
    analysis_mode_hint: analysisModeHint,
    secondary_mode_hint: secondaryModeHint,
    needs_time_scan_hint: analysisModeHint === 'timing',
    time_scope_hint: timeScopeHint,
    rule_reason: ruleResult.reason
  };
}

function buildRuleReason(branch, category, subcategory) {
  const categoryLabel = DIVINATION_CATEGORIES[category]?.label || '杂事';
  const subcategoryLabel = subcategory ? DIVINATION_CATEGORIES[category]?.subcategories?.[subcategory]?.label : '';
  const branchLabel = { bazi: '八字宏观判断', qimen: '奇门具体事件判断', hybrid: '八字背景结合奇门事件判断', clarify: '需要追问' }[branch] || branch;
  return `${categoryLabel}${subcategoryLabel ? `/${subcategoryLabel}` : ''}，归入${branchLabel}`;
}

function buildGeminiRoutePrompt(question, ruleResult = {}) {
  const categoryLines = Object.entries(DIVINATION_CATEGORIES).map(([category, config]) => {
    const subs = Object.keys(config.subcategories || {}).join(', ');
    return `- ${category}: ${config.description}; subcategory: ${subs || '空字符串'}`;
  }).join('\n');

  return `你是术数问句分类器，只做分类，不做命理或奇门解读。你可以参考 gemini-3-flash-preview 的快速分类能力，但输出必须严格 JSON。

任务：
1. 判断 branch，只能是 bazi、qimen、hybrid、clarify。
2. 判断 category 和 subcategory，只能从下方枚举中选择。
3. 判断 role（主客站位），只能是 client 或 master。
4. 如果问题缺少时间范围、对象或判断目标，branch 返回 clarify。
5. 不要给建议，不要解读，不要输出 markdown。

branch 定义：
- bazi：长期、宏观、命局、大运流年、行业适配、体质结构。
- qimen：具体事件、短期决策、成败、应期、方位、A/B选择。
- hybrid：同时包含宏观命局背景和眼前具体事件。
- clarify：信息不足，需要追问。

role 定义（奇门主客理论）：
- client（客/主动方）：问卦者是主动发起、追求、进攻的一方。绝大多数情况默认为 client。
- master（主/守待方）：问卦者是被动守候、等待对方行动的一方。

判断为 master（守待方）的信号：
  - 诉讼：问卦者明确是被告、被起诉方。
  - 感情：问卦者在等对方表白、等对方主动联系/回复，或自述被人追求。
  - 财务：问卦者是债权人，在等对方主动还款/付款（催收方等来钱）。
  - 招聘：问卦者是招聘方/面试官，等候选人来。
  - 其他任何"我在等对方主动有所行动"的语义。

以上信号不明确时，统一返回 client。

few-shots：
1. 用户问："我未来五年适合创业还是打工？"
返回：{"branch":"bazi","category":"career_business","subcategory":"entrepreneurship_vs_job","role":"client","confidence":"high","reason":"询问长期职业路径，问卦者主动规划，属八字宏观命局判断","followupQuestion":""}

2. 用户问："A公司和B公司的offer我该选哪个？"
返回：{"branch":"qimen","category":"career_business","subcategory":"job_search","role":"client","confidence":"high","reason":"主动做选择决策，属奇门短期事件","followupQuestion":""}

3. 用户问："我今年事业运不好，这个offer要不要接？"
返回：{"branch":"hybrid","category":"career_business","subcategory":"current_job_change","role":"client","confidence":"high","reason":"主动考虑是否接offer，同时涉及宏观今年事业运","followupQuestion":""}

4. 用户问："明天去表白能成功吗？"
返回：{"branch":"qimen","category":"relationship","subcategory":"pursuit_dating","role":"client","confidence":"high","reason":"主动表白，问卦者是进攻方","followupQuestion":""}

5. 用户问："他会主动来找我吗？"
返回：{"branch":"qimen","category":"relationship","subcategory":"love_conflict","role":"master","confidence":"high","reason":"问卦者在等对方主动行动，属于守待方","followupQuestion":""}

6. 用户问："对方起诉我，这个官司我能赢吗？"
返回：{"branch":"qimen","category":"lawsuit_legal","subcategory":"civil_lawsuit","role":"master","confidence":"high","reason":"问卦者是被告方，被动守待，属守待方（主）","followupQuestion":""}

7. 用户问："我借出去的钱，对方这个月能还我吗？"
返回：{"branch":"qimen","category":"finance_wealth","subcategory":"debt_repayment","role":"master","confidence":"high","reason":"问卦者是债权人，等对方主动还款，属守待方","followupQuestion":""}

8. 用户问："帮我看看最近怎么样"
返回：{"branch":"clarify","category":"general","subcategory":"vague","role":"client","confidence":"low","reason":"缺少具体领域、时间范围和判断目标","followupQuestion":"你是想看长期趋势，还是判断眼前某一件具体事情？如果是具体事，请补充对象、时间和想判断的结果。"}

枚举：
${categoryLines}

规则分类初判：${JSON.stringify(ruleResult)}

用户提问："${question}"

只返回 JSON：
{"branch":"bazi|qimen|hybrid|clarify","category":"枚举category","subcategory":"枚举subcategory或空字符串","role":"client|master","confidence":"low|medium|high","reason":"一句话说明","followupQuestion":"clarify时的追问，否则空字符串"}`;
}

function buildBaziSemanticRoutePrompt(question, routeHint = {}) {
  return `你是八字问答语义路由器，只做路由，不做命理解释。

任务：
1. 在已有 branch/category/subcategory hint 基础上，判断八字解读模式 analysis_mode。
2. 必须区分：
   - status：当前/今年/这步大运的状态、气候、能不能推进到什么程度。
   - timing：什么时候、哪年、未来几年/五年/十年的动态候选窗口，需要遍历时间段。
   - pattern：命里有没有、先天结构、容量、格局、适配度。
   - character：人物画像、对象/伴侣/合伙人/领导是什么样、某类关系表达倾向。
   - unsupported：八字不适合判断，或资料不足必须追问。
3. 如果主模式是 pattern/character，但问题同时问“现在/今年/当前状态”，secondary_mode 返回 status。
4. 如果后端目标元素理论不能稳定覆盖该问题，但仍属于 character 分支，target_resolution 返回 llm_derived，并给 llm_derived_target。不要返回 unsupported，除非问题明显不能做任何安全替代分析。
5. 对身份标签、性取向、政治/宗教等敏感或不可由八字可靠判断的问题：如果用户实际在问 character，不要强断身份；应返回 character + target_resolution=llm_derived，并把 llm_derived_target 限定为关系表达、互动边界、吸引模式等低置信观察框架。
6. 只返回 JSON，不要 markdown。

analysis_mode 取值：status|timing|pattern|character|unsupported
secondary_mode 取值：status|timing|null
time_scope.type 取值：unknown|current_year|next_3_years|next_5_years|next_10_years|specified_range|specified_dayun
target_resolution 取值：backend_mapped|llm_derived|unsupported

few-shots：
用户问：“我今年能不能结婚？”
返回：{"analysis_mode":"status","secondary_mode":null,"needs_time_scan":false,"time_scope":{"type":"current_year"},"target_resolution":"backend_mapped","confidence":"high","reason":"询问今年婚恋状态，不是长程应期遍历"}

用户问：“未来五年哪年财运最好？”
返回：{"analysis_mode":"timing","secondary_mode":null,"needs_time_scan":true,"time_scope":{"type":"next_5_years"},"target_resolution":"backend_mapped","confidence":"high","reason":"明确未来五年逐年比较"}

用户问：“我适合创业还是打工？”
返回：{"analysis_mode":"pattern","secondary_mode":null,"needs_time_scan":false,"time_scope":{"type":"unknown"},"target_resolution":"backend_mapped","confidence":"high","reason":"询问先天职业结构和路径适配"}

用户问：“我适合创业吗，现在能不能做？”
返回：{"analysis_mode":"pattern","secondary_mode":"status","needs_time_scan":false,"time_scope":{"type":"current_year"},"target_resolution":"backend_mapped","confidence":"high","reason":"主问先天适配，同时追问当前阶段"}

用户问：“我未来对象是什么样的人？”
返回：{"analysis_mode":"character","secondary_mode":null,"needs_time_scan":false,"time_scope":{"type":"unknown"},"target_resolution":"backend_mapped","confidence":"high","reason":"询问伴侣画像"}

用户问：“这个人是不是同性恋？”
返回：{"analysis_mode":"character","secondary_mode":null,"needs_time_scan":false,"time_scope":{"type":"unknown"},"target_resolution":"llm_derived","confidence":"low","reason":"性取向不能由八字可靠判定，但可低置信分析关系表达与互动边界","llm_derived_target":{"label":"亲密关系表达方式与关系边界","observation_scope":["亲密关系表达方式","吸引模式","关系边界"],"limitations":["八字无法可靠判定性取向身份","不得输出确定身份标签"]}}

规则 hint：
${JSON.stringify(routeHint)}

用户提问："${question}"

只返回 JSON：
{
  "branch": "bazi",
  "category": "${routeHint.category || routeHint.category_hint || 'general'}",
  "subcategory": "${routeHint.subcategory || routeHint.subcategory_hint || ''}",
  "analysis_mode": "status|timing|pattern|character|unsupported",
  "secondary_mode": null,
  "needs_time_scan": false,
  "time_scope": { "type": "unknown" },
  "target_resolution": "backend_mapped|llm_derived|unsupported",
  "llm_derived_target": null,
  "confidence": "low|medium|high",
  "reason": "一句话说明",
  "followupQuestion": ""
}`;
}

async function classifyByGeminiFlash(question, ruleResult = {}) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) throw new Error('GEMINI_API_KEY is not configured');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'gemini-3-flash-preview',
      messages: [{ role: 'user', content: buildGeminiRoutePrompt(question, ruleResult) }],
      response_format: { type: 'json_object' },
      temperature: 0.1
    })
  });

  if (!response.ok) throw new Error('Divination router LLM request failed');
  const apiData = await response.json();
  const content = apiData.choices?.[0]?.message?.content || '{}';
  return JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());
}

async function classifyDivinationQuestion({
  question,
  forceBranch = '',
  llmFallback = true,
  llmClassifier = classifyByGeminiFlash
} = {}) {
  const rawRuleResult = classifyByRules(question, { forceBranch });
  const ruleResult = normalizeDivinationRoute(rawRuleResult);

  const enrichedRuleResult = {
    ...rawRuleResult,
    ...ruleResult
  };

  if (!llmFallback || enrichedRuleResult.confidence !== 'low') return enrichedRuleResult;

  try {
    const llmResult = await llmClassifier(question, enrichedRuleResult);
    return {
      ...enrichedRuleResult,
      ...normalizeDivinationRoute({ ...llmResult, source: 'llm' }),
      needsBaziProfile: ['bazi', 'hybrid'].includes(llmResult.branch),
      canFallbackToQimenOnly: llmResult.branch === 'hybrid'
    };
  } catch (error) {
    return {
      ...enrichedRuleResult,
      reason: enrichedRuleResult.reason || `分类兜底失败：${error.message}`
    };
  }
}

module.exports = {
  buildBaziSemanticRoutePrompt,
  buildGeminiRoutePrompt,
  classifyByGeminiFlash,
  classifyByRules,
  classifyDivinationQuestion,
  ruleRouteHint,
  normalizeQuestion
};
