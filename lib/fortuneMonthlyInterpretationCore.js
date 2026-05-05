const MONTHLY_INTERPRETATION_PROMPT_VERSION = 'monthly-interpretation-v1-single-dimension';

const ALLOWED_MONTHLY_DIMENSIONS = new Set(['overall', 'career', 'wealth', 'love']);

const GAN_WUXING = {
  甲: '木', 乙: '木',
  丙: '火', 丁: '火',
  戊: '土', 己: '土',
  庚: '金', 辛: '金',
  壬: '水', 癸: '水',
};

const DIMENSION_LABELS = {
  overall: '综合运势',
  career: '事业运',
  wealth: '财运',
  love: '爱情运',
};

const DIMENSION_SHISHEN_COPY = {
  overall: `
| 十神 | 综合白话 |
|------|----------|
| 正官 | 规则、秩序、被认可、稳定推进 |
| 七杀 | 压力、挑战、竞争、需要快速反应 |
| 正印 | 贵人、学习、背书、被保护 |
| 偏印 | 独立思考、深耕、灵感、略显孤立 |
| 食神 | 表达、享受、口碑、自然流动 |
| 伤官 | 锋芒、改革、表达欲、容易顶撞 |
| 正财 | 稳定回报、现实成果、细水长流 |
| 偏财 | 流动机会、人脉资源、额外收益 |
| 比肩 | 同伴、竞争、并肩推进、自我坚持 |
| 劫财 | 资源分流、消耗、同伴牵扯 |`,
  career: `
| 十神 | 事业维度白话 |
|------|------------|
| 正官 | 职场被认可、上级关注、规则内推进 |
| 七杀 | 高压挑战、竞争对手、KPI施压 |
| 正印 | 领导背书、学习机会、资质考证 |
| 偏印 | 独立钻研、适合深耕、不喜受控 |
| 食神 | 创意输出、口碑积累、受众喜爱 |
| 伤官 | 改革冲劲、易与权威摩擦 |
| 正财 | 勤劳有回报、绩效薪资 |
| 偏财 | 副业机会、人脉带来项目 |
| 比肩 | 团队协作或竞争、同事关系 |
| 劫财 | 被同伴拖累、容易做无用功 |`,
  wealth: `
| 十神 | 财运维度白话 |
|------|------------|
| 正官 | 合规收益、稳定制度内收入 |
| 七杀 | 意外支出、资金缺口、财务压力 |
| 正印 | 有人兜底、稳健支持 |
| 偏印 | 偏门收益、版税专利 |
| 食神 | 轻松进财、口碑变现 |
| 伤官 | 开源思维活跃，也易冲动消费 |
| 正财 | 细水长流、适合记账守财 |
| 偏财 | 意外收益、流动性收入 |
| 比肩 | 钱财分流、易被朋友借钱 |
| 劫财 | 冲动消费、钱不知去向 |`,
  love: `
| 十神 | 爱情维度白话 |
|------|------------|
| 正官 | 女命：靠谱追求者或关系进展；男命：感情更有规划 |
| 七杀 | 女命：强势或控制欲强的对象；男命：感情有摩擦 |
| 正印 | 感情中偏被动，贵人缘好 |
| 偏印 | 感情淡漠期，不易主动 |
| 食神 | 感情自然流露，适合轻松约会 |
| 伤官 | 言语容易伤感情，热烈但不稳定 |
| 正财 | 男命：稳定踏实的感情；女命：感情有物质保障 |
| 偏财 | 男命：新异性缘分；女命：非典型缘分 |
| 比肩 | 同性竞争桃花、感情有外部干扰 |
| 劫财 | 遇到消耗自己资源的对象 |`,
};

function normalizeDimension(value) {
  const dimension = String(value || 'overall').trim().toLowerCase();
  if (!ALLOWED_MONTHLY_DIMENSIONS.has(dimension)) {
    const error = new Error('不支持的月运解读维度');
    error.statusCode = 400;
    throw error;
  }
  return dimension;
}

function getDayMaster(profile = {}) {
  const gan = String(profile.ri_zhu || '').charAt(0);
  return gan ? `${gan}${GAN_WUXING[gan] || ''}` : '未知日主';
}

function formatArray(value) {
  return Array.isArray(value) ? value.join('、') : String(value || '');
}

function getDimensionRules(dimension) {
  if (dimension === 'career') {
    return `
career 事业运：
- 月干信号若指向规则、上级、考核，且为喜用：写成职场被看见、被认可、适合争取资源。
- 若指向规则、上级、考核，且为忌仇：写成上级施压、流程卡顿或职场内耗。
- 若指向竞争、高压，且为喜用：写成竞争中可出头，适合攻坚。
- 若指向竞争、高压，且为忌仇：写成压力大、防小人、少硬碰硬。
- 文昌贵人触发：特别适合考试、写作、提案、演讲。
- 禄神触发：本职工作有回报，守住本位比冒进更有效。
- transit_support_score > 0：说明事业信号有承接，可以写成“更容易被接住、被看见”。
- transit_support_score < 0：说明好信号被冲破，需写成“有想法但落地需更谨慎”。`;
  }
  if (dimension === 'wealth') {
    return `
wealth 财运：
- month_wuxing_relation 为喜用 且 layer1_score > 0：主动财较旺，适合谈判、争取收入。
- month_wuxing_relation 为忌仇 且 layer1_score < 0：偏守财，不宜重仓冒险。
- 月干信号指向副业、人脉、流动收益，且 yima_active 为 true：副业或流动性收益有机会，但需结合 baseScore 控制语气。
- 月干信号指向同伴竞争、钱财分流，且在忌仇列表中：提示借钱、人情消费、冲动消费风险。
- avg_daily_score < 65：整体财运偏弱，不适合大额投资或赌博性决策。
- is_kongwang 为 true：财来财去，不宜做大额长线投入。
- transit_support_score < 0：即使有赚钱信号，也要写成“进账不稳、容易被支出抵消”。`;
  }
  if (dimension === 'love') {
    return `
love 爱情运：
- 男命：稳定伴侣信号为喜用，现有感情稳定推进，适合认真表态；新缘分/社交吸引信号为忌仇，容易遇到消耗型关系。
- 女命：稳定关系信号为喜用，感情有正向进展；强烈吸引/张力信号为忌仇，感情压力大，易争吵或遭遇控制型对象。
- 表达欲旺的月份：言语容易伤感情，约会前少说多听。
- 温和输出的月份：感情自然流露，适合轻松约会。
- has_sanxing 为 true：有缘分也容易节外生枝，需格外注意相处边界。
- tianyi_active 为 true：社交场合更容易遇到愿意帮你、理解你的人。
- transit_support_score < 0：感情好信号要打折，不要写成稳定确定。`;
  }
  return `
overall 综合运势：
- 综合 layer1_score、layer2_score、layer3_score 描述本月整体节奏。
- layer1_score 高时，强调结构上有助力；layer1_score 低时，强调刑冲合害带来的现实压力。
- layer2_score 只作为日内节奏参考，不得把它写成本月主因。
- layer3_score 高时，强调月令、神煞或岁运承接有力；低时，强调有虚耗或好信号难落地。
- 必须点出高分日窗口。
- trough_period 非空时必须提示低谷期。`;
}

function buildMonthlyInterpretationPrompt(profile = {}, monthlyData = {}, dimensionInput = 'overall') {
  const dimension = normalizeDimension(dimensionInput);
  const signals = monthlyData.shishen_signals || {};

  return `
你是一位精通《渊海子平》体系的现代命理解读师，擅长将传统命理术语转化为年轻人能理解的现实语言。你的任务是：根据下方提供的命理数据，为命主撰写本月【${dimension}】维度的运势解读文案。

---

## 命主基础信息
- 日主：${getDayMaster(profile)}
- 性别：${profile.gender === 'M' ? '男' : '女'}
- 喜用神：${formatArray(profile.favorable_elements)}
- 忌仇神：${formatArray(profile.unfavorable_elements)}

---

## 流月干支与算分层信号
- 流月干支：${monthlyData.month_gz || ''}
- 当前大运：${monthlyData.dayun_gz || ''}
- 当前流年：${monthlyData.liunian_gz || ''}
- 本月综合评分：${monthlyData.monthly_score || 70}/100
- 干支格局层得分：${monthlyData.layer1_score || 0}（-30~+30，占60%，反映流月与原局/大运/流年的合冲刑害、合化、制忌与冲喜用）
- 日运聚合层得分：${monthlyData.layer2_score || 0}（-5~+5，占10%，只反映本月每日分布趋势）
- 神煞月令层得分：${monthlyData.layer3_score || 0}（-15~+15，占30%，反映月令、神煞、节气与岁运承接）
- 岁运承接分：${monthlyData.transit_support_score || 0}（-4~+4，表示流月喜用/月令/神煞是否被大运流年扶起或冲破）

---

## 流月与原局/岁运的关键生克关系
- 月干十神：${monthlyData.month_gan_shishen || ''}
- 干支互动摘要：${monthlyData.month_relations || monthlyData.month_zhi_relations || '无明显刑冲合害'}
- 月令五行：${monthlyData.month_wuxing || ''}
- 月令与命主关系：${monthlyData.month_wuxing_relation || '闲'}

解释口径：
- “制忌，转为小吉”表示流月克制命主忌神，可视为压力被化解。
- “冲喜用，加重”表示流月冲动命主有利力量，需谨慎表达为阻力或损耗。
- “冲忌仇，冲罚减半”表示冲到不利力量，但未形成有效克制，不能写成大吉。
- 岁运承接分为正，表示流月喜用或神煞被大运/流年扶起；为负，表示被冲破或忌神被扶。

---

## 流月神煞状态
- 天乙贵人：${!!signals.tianyi_active}
- 文昌贵人：${!!signals.wenchang_active}
- 禄神：${!!signals.lu_active}
- 驿马：${!!signals.yima_active}（是否朝喜用方向：${!!signals.yima_favorable}）
- 月德贵人：${!!monthlyData.yuede_active}
- 本月空亡：${!!monthlyData.is_kongwang}
- 本月三刑：${!!monthlyData.has_sanxing}

---

## 本月日运分布
- 月内日均分：${monthlyData.avg_daily_score || 70}
- 高分日（≥80分）：${monthlyData.high_score_days || 0}天，具体日期：${JSON.stringify(monthlyData.high_score_dates || [])}
- 低分日（≤55分）：${monthlyData.low_score_days || 0}天，具体日期：${JSON.stringify(monthlyData.low_score_dates || [])}
- 本月最佳日：${monthlyData.best_date || ''}（${monthlyData.best_score || 0}分）
- 本月最差日：${monthlyData.worst_date || ''}（${monthlyData.worst_score || 0}分）
- 连续低谷期：${monthlyData.trough_period || ''}
- 本月节气：${JSON.stringify(monthlyData.jieqi_list || [])}

---

## 当前解读维度：${dimension}（${DIMENSION_LABELS[dimension]}）

---

## 强制推演规则

### 一、文案基调必须锚定 baseScore
- baseScore < 60：谨慎蛰伏，以守为主。禁止出现“大机会”“突破”“大吉”“顺风”等强乐观词；如提及高分日，只能表达为“相对可操作窗口”。
- baseScore 60–75：平稳蓄力，攻守各半。不得全程正向，必须有一处注意事项。
- baseScore 76–85：积极进取，有所作为。需点出至少一处注意事项。
- baseScore > 85：高光时刻，乘势而为。禁止“百分百”“一定成功”等绝对化表达。

特殊兜底规则，优先级最高：
- is_kongwang 为 true：details 中必须包含一句“本月能量略有虚耗，行事宜稳扎稳打，避免过度扩张。”
- has_sanxing 为 true：details 中必须包含一句“本月人际关系较为敏感，合作与沟通需格外审慎。”

### 二、分层信号解释规则
- layer1_score >= 15：格局上有明显加持，流月结构较有力。
- layer1_score <= -15：格局上有明显阻力，需要应对刑冲压力。
- layer2_score >= 3：月内日运节奏较顺，可持续推进。
- layer2_score <= -3：月内低谷或波动较明显，需要节奏管理。
- layer3_score >= 8：月令、神煞或岁运承接有力。
- layer3_score <= -8：月令神煞承接不足，容易虚耗或分心。
- transit_support_score > 0：本月喜用/月令/神煞被大运流年扶起，行动更容易落地。
- transit_support_score < 0：本月喜用/月令/神煞被岁运冲破，吉象需要打折表达。

### 三、十神白话化翻译
允许你内部依据 month_gan_shishen 推理，但输出正文 details、highlight、advice 中禁止直接出现“正官、七杀、正印、偏印、食神、伤官、正财、偏财、比肩、劫财”等原始十神术语，必须转译成人话。
${DIMENSION_SHISHEN_COPY[dimension]}

### 四、当前维度核心推演逻辑
${getDimensionRules(dimension)}

### 五、日期信息落地规则
- high_score_dates 非空：必须在 details 或 advice 中至少提及一次，格式为“X月X日前后……”。
- trough_period 非空：必须在 details 中点出，格式为“X日至X日……”。
- jieqi_list 非空：可作为运势转折点提示，格式为“X节气前后……”。
- 不得凭空捏造日期，所有日期引用必须来自上游数据字段。

---

## 输出格式
只输出合法 JSON，禁止任何 markdown 包裹。
{
  "dimension": "${dimension}",
  "title": "15字以内，有代入感的维度标题",
  "highlight": "20字以内核心金句，点出本月该维度最重要的一件事",
  "details": "200字以上正文。禁止 Markdown 语法。段落间用 \\n\\n 分隔。结构：①本月该维度整体定调 ②关键信号白话解读 ③高分日或低谷期具体提示 ④收尾行动号召",
  "tags": ["不超过3个关键词标签"],
  "advice": [
    {
      "action": "5字以内行动短语",
      "description": "30-50字执行细节，必须包含具体时间或场景"
    }
  ]
}
advice 固定返回 2-3 条。score 字段不需要你生成，由算分引擎提供。`;
}

function parseModelJson(content) {
  const raw = String(content || '').replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(raw);
}

function pickMonthlyInterpretationFields(data = {}) {
  return {
    dimension: normalizeDimension(data.dimension || 'overall'),
    title: String(data.title || ''),
    highlight: String(data.highlight || ''),
    details: String(data.details || ''),
    tags: Array.isArray(data.tags) ? data.tags.slice(0, 3) : [],
    advice: Array.isArray(data.advice) ? data.advice.slice(0, 3) : [],
    interpretation_status: 'ready',
  };
}

function mergeMonthlyInterpretation(baseData = {}, interpretationData = {}, dimensionInput = 'overall') {
  const dimension = normalizeDimension(dimensionInput);
  return {
    ...baseData,
    ...pickMonthlyInterpretationFields({ ...interpretationData, dimension }),
    monthly_score: baseData.monthly_score,
    layer1_score: baseData.layer1_score,
    layer2_score: baseData.layer2_score,
    layer3_score: baseData.layer3_score,
    transit_support_score: baseData.transit_support_score,
    month_gz: baseData.month_gz,
    dayun_gz: baseData.dayun_gz,
    liunian_gz: baseData.liunian_gz,
    period_key: baseData.period_key,
  };
}

function hasReadyMonthlyInterpretation(data = {}) {
  return Boolean(data?.title && data?.highlight && data?.details && Array.isArray(data?.advice));
}

function buildMonthlyInterpretationPeriodKey(monthKey, profileId, dimensionInput) {
  const dimension = normalizeDimension(dimensionInput);
  return profileId
    ? `${monthKey}::${MONTHLY_INTERPRETATION_PROMPT_VERSION}::${dimension}::${profileId}`
    : `${monthKey}::${MONTHLY_INTERPRETATION_PROMPT_VERSION}::${dimension}`;
}

module.exports = {
  MONTHLY_INTERPRETATION_PROMPT_VERSION,
  normalizeDimension,
  buildMonthlyInterpretationPrompt,
  buildMonthlyInterpretationPeriodKey,
  parseModelJson,
  pickMonthlyInterpretationFields,
  mergeMonthlyInterpretation,
  hasReadyMonthlyInterpretation,
};
