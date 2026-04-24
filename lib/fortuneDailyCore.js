const { Solar } = require('lunar-javascript');
const { calculateDailyScore } = require('./calculateDailyScore');

function getBeijingDayInfo(targetDate) {
  let bjTime;

  if (typeof targetDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    bjTime = new Date(`${targetDate}T12:00:00+08:00`);
  } else {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    bjTime = new Date(utc + 3600000 * 8);
  }

  const todayKey = [
    bjTime.getFullYear(),
    String(bjTime.getMonth() + 1).padStart(2, '0'),
    String(bjTime.getDate()).padStart(2, '0'),
  ].join('-');

  const h = bjTime.getHours();
  const m = bjTime.getMinutes();
  const s = bjTime.getSeconds();
  const secondsUntilMidnight = Math.max(60, 86400 - (h * 3600 + m * 60 + s));

  const expiresAt = new Date(bjTime);
  expiresAt.setHours(23, 59, 59, 999);

  return { bjTime, todayKey, secondsUntilMidnight, expiresAt };
}

function getScoreLevel(finalScore) {
  if (finalScore >= 85) return '优';
  if (finalScore >= 70) return '良';
  if (finalScore >= 60) return '平';
  if (finalScore >= 50) return '注意';
  return '慎行';
}

function hasScoreFields(profile) {
  return profile.ri_zhu && profile.day_zhi && profile.year_zhi
    && Array.isArray(profile.favorable_elements)
    && Array.isArray(profile.unfavorable_elements);
}

function buildFortuneContext(profile, bjTime, todayKey) {
  const solar = Solar.fromDate(bjTime);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  const solar_date = todayKey;
  const year_gz = eightChar.getYear();
  const month_gz = eightChar.getMonth();
  const day_gz = eightChar.getDay();
  const day_gan = day_gz.charAt(0);
  const day_zhi = day_gz.charAt(1);
  const day_officer = lunar.getZhiXing();
  const day_void = lunar.getDayXunKong();
  const day_clash = lunar.getDayChongDesc();
  const day_nayin = lunar.getDayNaYin();

  const scoreResult = hasScoreFields(profile)
    ? calculateDailyScore(profile, lunar)
    : null;

  const finalScore = scoreResult ? scoreResult.final_score : 70;
  const score_level = getScoreLevel(finalScore);
  const is_kongwang = scoreResult ? !!scoreResult.is_kongwang : false;
  const has_sanxing = scoreResult ? !!scoreResult.has_sanxing : false;
  const lucky_element = (profile.favorable_elements && profile.favorable_elements.length > 0)
    ? profile.favorable_elements.join('、')
    : '无明显偏好';
  const day_zhi_palace = scoreResult?.day_zhi_palace || `${day_zhi}地支关联宫位`;
  const core_shen_today = scoreResult?.core_shen_today || '流日主导星曜';

  return {
    profile,
    solar_date,
    year_gz,
    month_gz,
    day_gz,
    day_gan,
    day_zhi,
    day_officer,
    day_void,
    day_clash,
    day_nayin,
    scoreResult,
    finalScore,
    score_level,
    is_kongwang,
    has_sanxing,
    lucky_element,
    day_zhi_palace,
    core_shen_today,
  };
}

function buildBaseFortunePayload(context) {
  const payload = {
    solar_date: context.solar_date,
    day_gz: context.day_gz,
    month_gz: context.month_gz,
    year_gz: context.year_gz,
    day_zhi_palace: context.day_zhi_palace,
    lucky_element: context.lucky_element,
    day_officer: context.day_officer,
    day_void: context.day_void,
    day_clash: context.day_clash,
    day_nayin: context.day_nayin,
    score_level: context.score_level,
    is_kongwang: context.is_kongwang,
    has_sanxing: context.has_sanxing,
    interpretation_status: 'pending',
  };

  if (context.scoreResult) {
    payload.day_score = context.scoreResult.final_score;
    payload.score_breakdown = {
      dim1_score: context.scoreResult.breakdown.dim1_score,
      dim2_score: context.scoreResult.breakdown.dim2_score,
      dim3_score: context.scoreResult.breakdown.dim3_score,
      kong_wang_triggered: context.scoreResult.is_kongwang,
      sanjing_triggered: context.scoreResult.has_sanxing,
    };
  } else {
    payload.day_score = context.finalScore;
    payload.score_breakdown = {
      dim1_score: 0,
      dim2_score: 0,
      dim3_score: 0,
      kong_wang_triggered: false,
      sanjing_triggered: false,
    };
  }

  return payload;
}

function pickInterpretationFields(data = {}) {
  data = data || {};
  return {
    day_insight: data.day_insight || '',
    day_warning: data.day_warning || '',
    day_guide: data.day_guide || '',
    lucky_color: data.lucky_color || '',
    lucky_color_hex: data.lucky_color_hex || '',
    interpretation_status: 'ready',
  };
}

function mergeInterpretation(baseData = {}, interpretationData = {}) {
  return {
    ...baseData,
    ...pickInterpretationFields(interpretationData),
    day_score: baseData.day_score,
    score_breakdown: baseData.score_breakdown,
    lucky_element: baseData.lucky_element,
  };
}

function hasReadyInterpretation(data = {}) {
  data = data || {};
  return Boolean(data.day_insight || data.day_guide || data.lucky_color);
}

function buildInterpretationPrompt(context) {
  const {
    profile,
    solar_date,
    year_gz,
    month_gz,
    day_gz,
    day_gan,
    day_zhi,
    day_officer,
    day_void,
    day_clash,
    day_nayin,
    score_level,
    is_kongwang,
    has_sanxing,
    lucky_element,
    day_zhi_palace,
    core_shen_today,
  } = context;

  return `
你是一位精通《渊海子平》盲派断语风格的命理文案师。
上游系统已完成全部算分与命理推导，你的唯一职责是：
将结构化的命理数据转化为有温度、有画面感、可执行的白话文案。

⚠️ 铁律（违反即视为输出无效）：
1. 禁止输出任何评分数字、维度分值、算分说明。
2. 禁止自行推算或修改任何干支、评分、宫位数据。
3. 仅输出纯净 JSON，严禁包含 \`\`\`json 等任何 Markdown 标记。
4. 所有文案字段均基于下方【命理解读上下文】生成，不得凭空发挥。

━━━━━━━━━━━━━━━━━━━━━━
【命主档案】
━━━━━━━━━━━━━━━━━━━━━━
${profile.bazi_summary}

━━━━━━━━━━━━━━━━━━━━━━
【命理解读上下文】（由系统预算完成，直接信任）
━━━━━━━━━━━━━━━━━━━━━━
公历日期：${solar_date}
流年干支：${year_gz}
流月干支：${month_gz}
流日干支：${day_gz}（天干：${day_gan}，地支：${day_zhi}）

建除十二神：${day_officer}
旬空亡地支：${day_void}
今日地支宫位：${day_zhi_palace}  ← 系统已计算，直接引用，禁止改动
今日冲煞状态：${day_clash}
纳音五行：${day_nayin}

今日运势等级：${score_level}       ← 由系统判定（优/良/平/注意/慎行），禁止改动
是否触发空亡：${is_kongwang}
是否触发三刑：${has_sanxing}
今日喜用五行：${lucky_element}     ← 由上游 getFavorableUnfavorable 结果推导，直接引用
今日核心用神十神：${core_shen_today}

━━━━━━━━━━━━━━━━━━━━━━
【文案生成任务】
━━━━━━━━━━━━━━━━━━━━━━

▌ day_warning（字符串）
  • 触发条件：is_kongwang 为 true 或 has_sanxing 为 true
  • 若两者均为 false → 输出空字符串 ""
  • 若触发 → 15字以内，点明风险性质（空亡/三刑），
    不得出现"小心""注意"等空泛词，需说明具体影响方向
  • 示例（空亡）："今日旬空，谋事不实，签约宜缓"
  • 示例（三刑）："三刑拱照，人事暗动，慎防口舌引发连锁"

▌ day_insight（≤30字）
  • 盲派断语风格：一针见血，带江湖气，有画面感
  • 必须呼应 core_shen_today（今日核心十神）与 day_officer（建除神）
  • 按 score_level 档位区分基调：
    ── 优（≥85分档）：正面星曜意象，点明今日核心机遇，可用进取语气
    ── 良（70–84分档）：稳中有进，点出一个值得把握的方向
    ── 平（60–69分档）：平稳为主，点出一个需要留意的变量
    ── 注意（50–59分档）：偏守势，明确今日最大风险点
    ── 慎行（<50分档）：凶星/化忌意象，语气克制但信息量足
  • 禁止出现分数数字、维度名称、"喜用神""忌神"等技术术语

▌ day_guide（格式严格：宜[动词+名词]、[动词+名词]；忌[动词+名词]、[动词+名词]）
  • 贴合现代打工人/创业者视角，每项必须可执行、有具体场景
  • 宜/忌各写 2 项，必须命中以下维度之一：
    ① 事业决策：签约 / 谈判 / 汇报 / 项目推进 / 公开表达
    ② 财务投资：收款 / 支出 / 理财操作 / 合同确认
    ③ 人际关系：社交拓展 / 合作推进 / 求人办事 / 化解矛盾
  • 宜与忌必须呼应 lucky_element 与 day_clash 信息
  • 禁止输出以下空洞词语：
    "宜静思"、"忌冲动"、"宜休息"、"忌争执"、"宜谨慎"

▌ lucky_color（字符串）
  • 根据 lucky_element 输出对应的中文色名
  • 要求有具体画面感，禁止输出"红色""蓝色"等基础色名
  • 示例映射（可在此基础上细化）：
    火 → "绛红"或"珊瑚橙"
    水 → "靛青"或"霁蓝"
    木 → "松绿"或"竹青"
    金 → "月白"或"香槟金"
    土 → "赭石"或"琥珀棕"

▌ lucky_color_hex（字符串）
  • 与 lucky_color 严格对应的十六进制颜色码
  • 须为视觉上可用于 UI 展示的非极端色（非纯黑/纯白）

━━━━━━━━━━━━━━━━━━━━━━
【输出格式】仅输出以下纯 JSON，无任何其他文字
━━━━━━━━━━━━━━━━━━━━━━
{
  "solar_date": "${solar_date}",
  "day_gz": "${day_gz}",
  "month_gz": "${month_gz}",
  "year_gz": "${year_gz}",
  "day_warning": "",
  "day_zhi_palace": "${day_zhi_palace}",
  "day_insight": "盲派断语不超过30字",
  "day_guide": "宜[xx]、[xx]；忌[xx]、[xx]",
  "lucky_element": "${lucky_element}",
  "lucky_color": "幸运色名称",
  "lucky_color_hex": "#000000"
}
`;
}

function parseModelJson(content) {
  const raw = String(content || '').replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(raw);
}

module.exports = {
  getBeijingDayInfo,
  buildFortuneContext,
  buildBaseFortunePayload,
  buildInterpretationPrompt,
  parseModelJson,
  pickInterpretationFields,
  mergeInterpretation,
  hasReadyInterpretation,
};
