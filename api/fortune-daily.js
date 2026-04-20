const { Solar } = require('lunar-javascript');
const { createClient } = require('@supabase/supabase-js');

// ==========================================
// Supabase 服务端客户端（Service Key 绕过 RLS）
// ==========================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── 1. 获取当前登录用户 ──
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: '未登录，请先登录' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: '登录状态已过期，请重新登录' });

    const userId = user.id;

    // ── 2. 时间校准：东八区北京时间 ──
    const now    = new Date();
    const utc    = now.getTime() + now.getTimezoneOffset() * 60000;
    const bjTime = new Date(utc + 3600000 * 8);

    const todayKey = `${bjTime.getFullYear()}-${String(bjTime.getMonth() + 1).padStart(2, '0')}-${String(bjTime.getDate()).padStart(2, '0')}`;
    const h = bjTime.getHours(), m = bjTime.getMinutes(), s = bjTime.getSeconds();
    const secondsUntilMidnight = 86400 - (h * 3600 + m * 60 + s);

    // ── 3. 查询数据库缓存 ──
    const { data: cached } = await supabase
      .from('fortune_cache')
      .select('data_json')
      .eq('user_id', userId)
      .eq('dimension', 'day')
      .eq('period_key', todayKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached?.data_json) {
      console.log(`⚡️ 命中数据库缓存 [${userId}] ${todayKey}`);
      res.setHeader('Cache-Control', `s-maxage=${secondsUntilMidnight}, stale-while-revalidate`);
      return res.status(200).json(cached.data_json);
    }

    console.log(`☁️ 缓存未命中，启动日运推演 [${userId}] ${todayKey}`);

    // ── 4. 读取用户八字档案 ──
    // 优先 is_default=true，无则取最新一条
    const { data: profile, error: profileError } = await supabase
      .from('bazi_profiles')
      .select('name, gender, bazi_summary, bazi_str, birth_date')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at',  { ascending: false })
      .limit(1)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: '未找到八字档案，请先创建命主档案' });
    }
    if (!profile.bazi_summary) {
      return res.status(400).json({ error: '八字断语尚未生成，请先完成八字排盘' });
    }

    // ── 5. 历法推演 ──
    const solar     = Solar.fromDate(bjTime);
    const lunar     = solar.getLunar();
    const eightChar = lunar.getEightChar();

    const solar_date  = todayKey;
    const year_gz     = eightChar.getYear();
    const month_gz    = eightChar.getMonth();
    const day_gz      = eightChar.getDay();
    const day_gan     = day_gz.charAt(0);
    const day_zhi     = day_gz.charAt(1);
    const day_officer = lunar.getZhiXing();
    const day_void    = lunar.getDayXunKong();
    const day_clash   = lunar.getDayChongDesc();
    const day_nayin   = lunar.getDayNaYin();

    // ── 6. 组装 Prompt ──
    const prompt = `
你是一位精通《渊海子平》与紫微斗数的命理顾问，同时熟悉现代命理App的日运算法架构。
请基于【命主档案】与【今日精准历法数据】，严格执行下方推演逻辑，输出今日日运。

⚠️ 铁律：
1. 历法数据完全信任，禁止自行推算干支。
2. 喜忌判断必须严格从命主档案中提取，禁止套用通用模板。
3. 仅输出纯净 JSON，严禁包含 \`\`\`json 等 Markdown 标记。
4. 评分必须逐维度显式列出得分，不得跳过计算过程。

━━━━━━━━━━━━━━━━━━━━━━
【命主档案】
━━━━━━━━━━━━━━━━━━━━━━
以下是由专业排盘系统生成的命主完整命理基底，请完全信任并作为推演核心依据：

${profile.bazi_summary}

请从上述档案中自行提取以下关键信息：
① 日主天干（用于推算十神）
② 当前大运干支及其对喜忌的影响
③ 原局十神喜忌体系（印星/比劫/财星/食伤/官杀各自的吉凶定性）
④ 紫微命盘核心宫位（命宫/财帛/官禄/迁移的星曜组合，用于模块二）

━━━━━━━━━━━━━━━━━━━━━━
【今日精准历法数据】
━━━━━━━━━━━━━━━━━━━━━━
公历日期：${solar_date}
流年干支：${year_gz}
流月干支：${month_gz}
流日干支：${day_gz}（天干：${day_gan}，地支：${day_zhi}）
建除十二神：${day_officer}
旬空亡：${day_void}
冲煞提示：${day_clash}
纳音五行：${day_nayin}

━━━━━━━━━━━━━━━━━━━━━━
【模块一：日运综合计分】
基础水位线：70分 | 输出区间：45–98
━━━━━━━━━━━━━━━━━━━━━━

▌前置步骤：从命主档案提取喜忌体系（必须先完成，后续计分依赖此结果）
请仔细阅读【命主档案】，提取以下信息并输出至 score_breakdown.profile_extract：
- 日主天干：___
- 身强 / 身弱定性：___
- 喜用神十神列表：___（示例：印星、比劫）
- 忌仇神十神列表：___（示例：官杀、食伤）
- 闲神十神列表及当前大运对其影响：___（示例：财星，壬戌大运水制土，当前偏可用）
- 命主日支：___（用于维度2冲克判断）
- 命主年支：___（用于维度2冲克判断）

⚠️ 此步骤提取的结果是后续所有计分的唯一依据，禁止使用通用模板替代。

▌维度1：流日天干十神（±15分）
依据流日天干「${day_gan}」对命主日主的十神属性，结合前置步骤提取的喜忌体系打分：
- 属喜用神 → +8 至 +10
  - 印星（生扶日主）→ +8；若当前大运同为印星则力量叠加可给 +10
  - 比劫（助身）→ +5 至 +8，身弱命局取高值
- 属闲神 → -3 至 +3
  - 视大运对该十神的压制或助力判断正负，并在 reason 中说明
- 属忌仇神 → -6 至 -10
  - 官杀（克日主）→ -8 至 -10，七杀取高值
  - 食伤（泄气生忌）→ -6

▌维度2：地支刑冲合（±15分）
依据流日地支「${day_zhi}」，结合命主日支「前置步骤提取」与年支「前置步骤提取」判断：
- 地支五行属喜用神之地（如身弱喜水木，逢亥/子/寅/卯）→ +5 至 +8
- 地支与命主喜用五行形成三合/六合喜用局 → +4 至 +6
- 地支伏吟命主日支（流日地支 = 命主日支）→ -2
- 地支冲命主日支 → -10（冲根最忌）
- 地支冲命主年支 → -6
- 地支五行属忌神之地 → -3 至 -6（视忌神轻重判断）
- 地支引动三刑（见熔断规则）→ 特殊处理

【三刑熔断】最高优先级——
判断流日地支「${day_zhi}」是否能与命主原局地支、流月地支共同构成三刑组合：
- 若三刑齐发 → 维度2强制 -15，day_warning 输出：
  "⚠️ 三刑警示：三刑引动，谨防冲突、争执与意外损失"
- 若仅两支相刑，三刑未齐全 → 额外 -5，轻度预警

▌维度3：神煞建除（±10分）
依据建除「${day_officer}」（此维度与命主八字无关，所有人规则相同）：
- 成 / 开 / 满         → +10
- 平 / 定 / 除 / 执    → +4
- 建 / 破 / 危 / 收 / 闭 → -10

【空亡降维】最高优先级——
判断流日地支「${day_zhi}」是否落在旬空亡「${day_void}」内：
- 若是 → 前三维度所有加减分 × 0.5，总分强制压制在 60–65 之间
  day_warning 补充："今日逢空亡，能量虚耗，努力折半，重要决策宜延后"

▌校验
- 最终得分 > 98 → 强制输出 98
- 最终得分 < 45 → 强制输出 45
━━━━━━━━━━━━━━━━━━━━━━
【模块二：紫微意象赋能】
仅用于生成 day_insight 与 day_guide，不参与算分
━━━━━━━━━━━━━━━━━━━━━━

▌流日地支叠宫法
取流日地支「${day_zhi}」，对照命主紫微命盘，找到对应宫位与星曜：
• 戌 → 命宫（天同化禄 + 火星庙旺）
• 午 → 财帛宫（天梁庙旺 + 擎羊陷落）
• 寅 → 官禄宫（天机化忌 + 太阴化权）
• 辰 → 迁移宫（巨门陷落）
• 其余地支 → 对照命盘其他宫位取象，若宫位无主星则取对宫借星

▌断语生成规则
结合叠加宫位星曜意象 + 今日八字十神：

day_insight（≤30字）：
• 盲派断语风格，一针见血，带点江湖气
• ≥80分 → 正面星曜意象，点明今日核心机遇
• 60–79分 → 平稳意象，点出一个关键注意项
• <60分 → 凶星/化忌意象，明确今日最大风险

day_guide（格式：宜xx、xx；忌xx、xx）：
• 贴合现代打工人/创业者视角，具体可执行
• 必须命中以下维度之一：
  ① 事业决策（签约/谈判/汇报/推进）
  ② 财务投资（收款/支出/理财/合同）
  ③ 人际关系（社交/合作/表达/求人）
• 禁止"宜静思""忌冲动"等空洞词语

━━━━━━━━━━━━━━━━━━━━━━
【输出格式】仅输出纯 JSON，无任何其他文字
━━━━━━━━━━━━━━━━━━━━━━
{
  "solar_date": "${solar_date}",
  "day_gz": "${day_gz}",
  "month_gz": "${month_gz}",
  "year_gz": "${year_gz}",
  "day_score": 85,
  "score_breakdown": {
    "profile_extract": {
    "ri_zhu": "日主天干",
    "shen_qiang_ruo": "身强/身弱",
    "xi_yong_shen": ["印星", "比劫"],
    "ji_chou_shen": ["官杀", "食伤"],
    "xian_shen": "财星，壬戌大运水制土当前偏可用(+3)",
    "ri_zhi": "命主日支",
    "nian_zhi": "命主年支"
    },
    "dim1_shishen": {
      "shishen": "十神名称",
      "score": 8,
      "reason": "一句话理由"
    },
    "dim2_zhi": {
      "relation": "地支关系描述",
      "score": 5,
      "reason": "一句话理由"
    },
    "dim3_officer": {
      "officer": "${day_officer}",
      "score": 4,
      "reason": "一句话理由"
    },
    "kong_wang_triggered": false,
    "sanjing_triggered": false,
    "final_score_logic": "70 + 8 + 5 + 4 = 87，未触发熔断，校验后输出85"
  },
  "day_warning": "",
  "day_zhi_palace": "今日流日地支叠入的宫位与核心星曜",
  "day_insight": "盲派断语不超过30字",
  "day_guide": "宜[xx]、[xx]；忌[xx]、[xx]",
  "lucky_element": "今日最需要的五行",
  "lucky_color": "幸运色名称",
  "lucky_color_hex": "#1A237E"
}
`;

    // ── 7. 调用大模型 ──
    const llmResponse = await fetch('https://yinli.one/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LLM_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gemini-2.5-pro-preview-06-05',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        response_format: { type: 'json_object' }
      })
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      console.error('⚠️ 大模型 API 异常:', llmResponse.status, errText.substring(0, 200));
      return res.status(502).json({ error: '上游大模型接口故障', details: `HTTP ${llmResponse.status}` });
    }

    const llmData = await llmResponse.json();
    if (llmData.error) return res.status(500).json({ error: '模型接口返回错误', details: llmData.error });

    let raw = llmData.choices[0].message.content;
    raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const finalJson = JSON.parse(raw);

    // ── 8. 写入数据库缓存 ──
    const expiresAt = new Date(bjTime);
    expiresAt.setHours(23, 59, 59, 999);

    const { error: cacheError } = await supabase
      .from('fortune_cache')
      .upsert({
        user_id:      userId,
        dimension:    'day',
        period_key:   todayKey,
        data_json:    finalJson,
        generated_at: new Date().toISOString(),
        expires_at:   expiresAt.toISOString()
      }, {
        onConflict: 'user_id, dimension, period_key'
      });

    if (cacheError) {
      console.warn('⚠️ 缓存写入失败:', cacheError.message);
    } else {
      console.log(`✅ 缓存写入成功 [${userId}] ${todayKey}`);
    }

    res.setHeader('Cache-Control', `s-maxage=${secondsUntilMidnight}, stale-while-revalidate`);
    return res.status(200).json(finalJson);

  } catch (error) {
    console.error('日运推演异常:', error);
    return res.status(500).json({ error: '云端日运推演失败', details: error.message });
  }
}
