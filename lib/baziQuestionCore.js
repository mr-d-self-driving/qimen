function normalizeGender(gender) {
  if (gender === 'M' || gender === '男' || gender === '乾造') return '男';
  if (gender === 'F' || gender === '女' || gender === '坤造') return '女';
  return String(gender || '未知');
}

function asText(value, fallback = '未提供') {
  if (Array.isArray(value)) return value.length ? value.join('、') : fallback;
  if (value && typeof value === 'object') return JSON.stringify(value);
  const text = String(value || '').trim();
  return text || fallback;
}

function compactJson(value, fallback = '未提供') {
  if (!value) return fallback;
  try {
    return JSON.stringify(value);
  } catch (_) {
    return fallback;
  }
}

function splitBaziStr(baziStr = '') {
  const parts = String(baziStr || '').split(/\s+/).filter(Boolean);
  return {
    year_gz: parts[0] || '未知',
    month_gz: parts[1] || '未知',
    day_gz: parts[2] || '未知',
    hour_gz: parts[3] || '未知'
  };
}

function getCurrentMonthData(matrix = {}) {
  const list = matrix.liuyue_list || [];
  if (!list.length) return {};
  const monthIndex = Math.max(0, Math.min(new Date().getMonth(), list.length - 1));
  return list[monthIndex] || list[0] || {};
}

function extractBaziQuestionContext(profile = {}) {
  const detail = profile.bazi_detail || {};
  const matrix = detail.matrix || {};
  const pillars = splitBaziStr(profile.bazi_str || detail?.pillars?.ganzhi ? [
    detail?.pillars?.ganzhi?.year,
    detail?.pillars?.ganzhi?.month,
    detail?.pillars?.ganzhi?.day,
    detail?.pillars?.ganzhi?.time
  ].filter(Boolean).join(' ') : '');
  const baziParts = splitBaziStr(profile.bazi_str || `${pillars.year_gz} ${pillars.month_gz} ${pillars.day_gz} ${pillars.hour_gz}`);
  const dayStem = baziParts.day_gz?.charAt(0) || profile.ri_zhu?.charAt(0) || '未知';
  const currentDayun = matrix.current_dayun || {};
  const currentLiunian = matrix.current_liunian || {};
  const currentLiuyue = getCurrentMonthData(matrix);
  const dayunGanZhi = `${currentDayun.gan || ''}${currentDayun.zhi || ''}` || '未提供';
  const liunianGanZhi = `${currentLiunian.gan || ''}${currentLiunian.zhi || ''}` || '未提供';
  const liuyueGanZhi = `${currentLiuyue.gan || ''}${currentLiuyue.zhi || ''}` || '未提供';
  const matchedDayun = (matrix.dayun_list || []).find((item) => item.gan === currentDayun.gan && item.zhi === currentDayun.zhi) || {};

  return {
    name: profile.name || '命主',
    gender: normalizeGender(profile.gender),
    ...baziParts,
    day_stem: dayStem,
    strong_weak: profile.strong_weak || detail.strong_weak || detail.strength_detail?.strongWeak || '未提供',
    geju: profile.geju || detail.base_info?.ge_ju || detail.geju || '未提供',
    favorable_elements: asText(profile.favorable_elements || detail.favorable_gods),
    unfavorable_elements: asText(profile.unfavorable_elements || detail.unfavorable_gods),
    shensha: asText(profile.shensha || detail.pillars?.shensha),
    current_dayun: dayunGanZhi,
    dayun_start_age: matchedDayun.start_age || currentDayun.start_age || '未提供',
    dayun_stem_shen: currentDayun.shi_shen || matchedDayun.shi_shen || '未提供',
    current_year_gz: liunianGanZhi,
    current_year_shishen: currentLiunian.shi_shen || '未提供',
    current_month_gz: liuyueGanZhi,
    current_month_shishen: currentLiuyue.shi_shen || '未提供',
    sizhu_matrix: compactJson({
      pillars: matrix.pillars || [],
      current_dayun: currentDayun,
      current_liunian: currentLiunian,
      current_liuyue: currentLiuyue,
      dayun_list: matrix.dayun_list || [],
      liunian_list: matrix.liunian_list || [],
      interactions: detail.interactions || {},
      strength_detail: detail.strength_detail || {},
      chengge_detail: detail.chengge_detail || {},
      classic_verdict: detail.classic_verdict || {}
    })
  };
}

function buildBaziQuestionPrompt({ profile, question, route = {} }) {
  const ctx = extractBaziQuestionContext(profile);
  const userQuestion = String(question || '').trim();

  return `你是一位精通子平八字推演的命理大师，擅长将客观命局数据转化为有温度、有落地价值的人生指引。

重要限制：
- 你不是排盘器，不得重新排盘。
- 格局、喜忌、旺衰、神煞、大运流年、四柱矩阵必须以系统提供字段为准。
- 如果字段缺失，直接说明资料不足，不要自行编造。
- 系统分类：${route.category || 'general'}${route.subcategory ? ` / ${route.subcategory}` : ''}

【命主信息】
姓名：${ctx.name}，性别：${ctx.gender}
八字：${ctx.year_gz} ${ctx.month_gz} ${ctx.day_gz} ${ctx.hour_gz}
日主：${ctx.day_stem}（${ctx.strong_weak}）
格局：${ctx.geju}
喜用神：${ctx.favorable_elements}
忌仇神：${ctx.unfavorable_elements}
神煞：${ctx.shensha}

【当前时间轴】
当前大运：${ctx.current_dayun}（${ctx.dayun_start_age}岁起，${ctx.dayun_stem_shen}）
当前流年：${ctx.current_year_gz}（${ctx.current_year_shishen}）
当前流月：${ctx.current_month_gz}（${ctx.current_month_shishen}）

【四柱完整矩阵（供生克分析用）】
${ctx.sizhu_matrix}

【用户问题】
${userQuestion}

---

**【核心推演逻辑】**

1. **定格局，确认命局容量**
   - 基于日主强弱、格局类型，判断命局在此问题领域（财/官/印/食伤）的先天「容量上限」。
   - 若格局本身对问题领域有天然支撑（如财格问财），明确说明；若相悖（如印格弱财问发财），如实说明局限。
   - 禁止：不得因用户问题积极就美化命局。

2. **看大运流年，判断当前时间窗口**
   - 当前大运是否走喜用神？流年天干是否与命局形成生扶还是刑冲？
   - 大运流年如同「宏观气候」，先定基调：顺运/逆运/平运。
   - 流月是短期催化剂，判断近1-3个月是否有具体触发点。

3. **就问题本身深入解读**
   - 根据问题类型，锁定对应的核心「十神」：
     - 财运/钱财 → 财星（正财/偏财）
     - 事业/升职 → 官星（正官/七杀）
     - 感情/婚姻 → 男看财星/女看官星，兼看桃花神煞
     - 健康 → 对应五行脏腑，忌神克制方向
     - 学业/考试 → 印星状态
   - 分析该十神在命局中的强弱、在当前大运流年中的受益/受克状态。
   - 先列凶象（克泄耗、刑冲破害、空亡、忌神透干），再列吉象，不得只报喜不报忧。

4. **给出应期判断**
   - 如果当前时间窗口不利，向后推演：大运何时转向？流年何时走喜用神？
   - 给出具体的「时间窗口」建议，而非模糊的「近期不利」。

5. **建议要有温度，有可操作性**
   - 真实关怀 = 预警风险 + 给出应对方案，不是回避风险。

---

**【Output Format (JSON Schema)】**
严格返回如下 JSON 结构：

{
  "summary": {
    "title": "本次解读主题（如：2025年事业运势分析）",
    "conclusion": "核心结论（如：✅ 当前大运走财，问题领域有支撑）",
    "score": 72,
    "score_basis": {
      "positive_signals": ["命局财星有根，大运走食伤生财", "流年与日主相合"],
      "negative_signals": ["七杀透干无制，压力较大", "财星空亡，到手有阻"],
      "score_logic": "命局底子中等偏上，当前时间轴顺运，但流年有冲，综合给72分"
    },
    "keyword": "关键信号（如：财星有根，时间窗口已开）"
  },
  "ming_ju_analysis": {
    "ge_ju": "格局定性（如：食神生财格，偏财格）",
    "capacity": "命局在此问题域的先天容量（如：财格问财，上限较高；印格弱财，先天不足）",
    "day_master": "日主状态简述（如：甲木生于子月，水多木浮，需火土引化）",
    "core_shishen": "本次问题核心十神及其在命局中的状态（如：偏财坐长生，有力但无透干）",
    "shensha_note": "本次相关神煞说明（如：天乙贵人在亥，流年入亥有贵人）"
  },
  "dayun_liunian": {
    "current_climate": "顺运|逆运|平运",
    "dayun_verdict": "当前大运对此问题的影响（如：庚运克甲日主，事业压力大）",
    "liunian_verdict": "流年对此问题的触发（如：乙亥流年，财星透天干，有进财机会）",
    "liuyue_trigger": "流月近期催化点（如：本月壬子，印星入局，利学习签约）",
    "turning_point": "若当前不利，预判何时转机（如：2027年丁运起，喜用神入位）"
  },
  "question_analysis": {
    "domain": "finance|career|relationship|health|study|other",
    "axes": [
      {
        "key": "self",
        "label": "命主状态",
        "verdict": "判断结论",
        "evidence": "命局依据（具体到干支、十神、大运流年）",
        "tone": "positive|mixed|warning"
      },
      {
        "key": "target",
        "label": "目标事物状态（财/官/感情对象）",
        "verdict": "判断结论",
        "evidence": "命局依据",
        "tone": "positive|mixed|warning"
      },
      {
        "key": "process",
        "label": "过程阻力",
        "verdict": "过程中的主要阻力或助力",
        "evidence": "命局依据",
        "tone": "positive|mixed|warning"
      }
    ],
    "timing": {
      "current_window": "当前时间窗口评估（有利/一般/不利）",
      "best_period": "最佳行动时间窗口",
      "avoid_period": "应回避的时间段"
    }
  },
  "advice": {
    "strategy": ["策略1", "策略2"],
    "risk": "核心风险提示与避坑建议",
    "leverage": "如何借力喜用神方向（五行/方位/行业/颜色等）",
    "lucky_tips": {
      "direction": "有利方位（如：南方、东南）",
      "industry": "契合行业或职业方向",
      "timing": "最近一个有利时间节点"
    }
  }
}`;
}

function normalizeBaziQuestionOutput(raw = {}, { question = '', route = {} } = {}) {
  const advice = raw.advice || {};
  const tips = advice.lucky_tips || {};
  return {
    ...raw,
    question,
    branch: 'bazi',
    category: route.category || 'general',
    subcategory: route.subcategory || '',
    route,
    analysis: {
      tensor: raw.dayun_liunian?.current_climate || '',
      yong_shen: raw.ming_ju_analysis?.core_shishen || '',
      bazi_insight: raw.ming_ju_analysis?.capacity || '',
      pattern: raw.ming_ju_analysis?.ge_ju || '',
      god_help: raw.ming_ju_analysis?.shensha_note || '',
      dynamic_timing: raw.dayun_liunian?.turning_point || raw.dayun_liunian?.liuyue_trigger || ''
    },
    advice: {
      ...advice,
      strategy: Array.isArray(advice.strategy) ? advice.strategy : [],
      risk: advice.risk || '',
      lucky_tips: {
        direction: tips.direction || '',
        industry: tips.industry || '',
        timing: tips.timing || '',
        time: tips.timing || '',
        action: advice.leverage || ''
      }
    }
  };
}

module.exports = {
  buildBaziQuestionPrompt,
  extractBaziQuestionContext,
  normalizeBaziQuestionOutput
};
