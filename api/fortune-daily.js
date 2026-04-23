const { Solar } = require('lunar-javascript');
const { createClient } = require('@supabase/supabase-js');
const { calculateDailyScore } = require('../lib/calculateDailyScore');

// ==========================================
// Supabase 服务端客户端（Service Key 绕过 RLS）
// ==========================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // ============================================================================
  // 🛡️ 防线 1：CORS 跨域限制 (防别人克隆前端盗用)
  // 配置环境变量 FRONTEND_URL 为你的正式域名 (如 https://xxx.vercel.app)
  // ============================================================================
  const ALLOWED_ORIGIN = process.env.FRONTEND_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ============================================================================
    // 🛡️ 防线 2：JWT 鉴权拦截 (防 Postman 脚本刷接口)
    // ============================================================================
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

    // 如果今天已经算过了，直接返回缓存 (不扣额度，也不消耗 Token)
    if (cached?.data_json) {
      console.log(`⚡️ 命中数据库缓存 [${userId}] ${todayKey}`);
      res.setHeader('Cache-Control', `s-maxage=${secondsUntilMidnight}, stale-while-revalidate`);
      return res.status(200).json(cached.data_json);
    }

        // ============================================================================
        // 🛡️ 防线 3：3 次免费额度限制 + 👑 白名单特权
        // ============================================================================
        // 1. 获取白名单列表并转为小写 (兼容未配置环境变量的情况)
        const whitelistStr = process.env.WHITELIST_EMAILS || "";
        const whitelist = whitelistStr.split(',').map(email => email.trim().toLowerCase());
        const currentUserEmail = user.email ? user.email.toLowerCase() : "";

        // 2. 判断当前用户是否在白名单中
        const isVIP = whitelist.includes(currentUserEmail);

        if (isVIP) {
            console.log(`👑 白名单特权账户 [${currentUserEmail}] 发起推演，免除额度限制`);
        } else {
            // 如果不是 VIP，才去数据库查他算过几次
            const { count, error: countError } = await supabase
                .from('fortune_cache') // 注意：如果是 bazi.js，这里表名是 bazi_profiles；fortune-daily.js 是 fortune_cache
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            if (!countError && count >= 3) {
                return res.status(403).json({ error: "您的 3 次免费天机推演额度已用尽" });
            }
        }


    console.log(`☁️ 缓存未命中，启动日运推演 [${userId}] ${todayKey}`);

    // ── 4. 读取用户八字档案 ──
    // 优先 is_default=true，无则取最新一条
    // 新增命理字段：favorable_elements / unfavorable_elements / day_zhi / year_zhi / month_zhi / ri_zhu
    // 这些字段由八字排盘时写入 bazi_profiles，供纯 JS 算分引擎使用
    const { data: profile, error: profileError } = await supabase
      .from('bazi_profiles')
      .select('name, gender, bazi_summary, bazi_str, birth_date, favorable_elements, unfavorable_elements, day_zhi, year_zhi, month_zhi, ri_zhu')
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

    // ── 5b. 纯 JS 算分（不依赖 LLM）──
    // 检查 profile 是否包含必要的命理字段
    const hasScoreFields = profile.ri_zhu && profile.day_zhi && profile.year_zhi
      && Array.isArray(profile.favorable_elements)
      && Array.isArray(profile.unfavorable_elements);

    let scoreResult = null;
    if (hasScoreFields) {
      scoreResult = calculateDailyScore(profile, lunar);
      console.log(`🧮 纯 JS 算分完成 [${userId}] 得分=${scoreResult.final_score}`);
    } else {
      console.warn(`⚠️ 命理字段不完整，算分降级为 LLM 模式 [${userId}]`);
    }

    // ── 6. 组装 Prompt ──
    // 📌 算分已由纯 JS 引擎完成（scoreResult），
    //    此处 LLM 仅负责生成文案（day_insight / day_guide / day_warning / lucky 等），
    //    不再要求模型计算分数，避免结果随机漂移。
    const scoreForPrompt = scoreResult
      ? `【已由系统算法确定，禁止修改】
今日综合得分：${scoreResult.final_score}
空亡触发：${scoreResult.is_kongwang ? '是' : '否'}
三刑触发：${scoreResult.has_sanxing ? '是' : '否'}
维度分解：天干十神(${scoreResult.breakdown.dim1_score}) + 地支刑冲合(${scoreResult.breakdown.dim2_score}) + 建除(${scoreResult.breakdown.dim3_score})`
      : `请自行根据命主档案计算（基础水位线70分，区间45-98）`;

    const prompt = `
你是一位精通《渊海子平》与紫微斗数的命理顾问。
请基于【命主档案】与【今日历法数据】，生成今日日运的文案解读。

⚠️ 铁律：
1. 历法数据完全信任，禁止自行推算干支。
2. 仅输出纯净 JSON，严禁包含 \`\`\`json 等 Markdown 标记。
3. 【算分结果】已由系统确定，你只需填入 day_score 字段，禁止修改该数值。

━━━━━━━━━━━━━━━━━━━━━━
【命主档案】
━━━━━━━━━━━━━━━━━━━━━━
${profile.bazi_summary}

━━━━━━━━━━━━━━━━━━━━━━
【今日历法数据】
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
【算分结果】
━━━━━━━━━━━━━━━━━━━━━━
${scoreForPrompt}

━━━━━━━━━━━━━━━━━━━━━━
【你的任务：仅生成以下文案字段】
━━━━━━━━━━━━━━━━━━━━━━

▌day_warning（若今日有三刑或空亡则输出警示语，否则输出空字符串）
▌day_zhi_palace（今日流日地支「${day_zhi}」叠入命盘哪个宫位及核心星曜，10字以内）

▌day_insight（≤30字）：
• 盲派断语风格，一针见血，带点江湖气
• ≥80分 → 正面星曜意象，点明今日核心机遇
• 60–79分 → 平稳意象，点出一个关键注意项
• <60分 → 凶星/化忌意象，明确今日最大风险

▌day_guide（格式：宜xx、xx；忌xx、xx）：
• 贴合现代打工人/创业者视角，具体可执行
• 必须命中以下维度之一：
  ① 事业决策（签约/谈判/汇报/推进）
  ② 财务投资（收款/支出/理财/合同）
  ③ 人际关系（社交/合作/表达/求人）
• 禁止"宜静思""忌冲动"等空洞词语

▌lucky_element（今日最需要的五行，如：水、木）
▌lucky_color（与 lucky_element 对应的幸运色名称）
▌lucky_color_hex（对应的十六进制颜色代码）

━━━━━━━━━━━━━━━━━━━━━━
【输出格式】仅输出纯 JSON，无任何其他文字
━━━━━━━━━━━━━━━━━━━━━━
{
  "solar_date": "${solar_date}",
  "day_gz": "${day_gz}",
  "month_gz": "${month_gz}",
  "year_gz": "${year_gz}",
  "day_score": ${scoreResult ? scoreResult.final_score : 70},
  "score_breakdown": {
    "dim1_score": ${scoreResult ? scoreResult.breakdown.dim1_score : 0},
    "dim2_score": ${scoreResult ? scoreResult.breakdown.dim2_score : 0},
    "dim3_score": ${scoreResult ? scoreResult.breakdown.dim3_score : 0},
    "kong_wang_triggered": ${scoreResult ? scoreResult.is_kongwang : false},
    "sanjing_triggered": ${scoreResult ? scoreResult.has_sanxing : false}
  },
  "day_warning": "",
  "day_zhi_palace": "宫位与星曜",
  "day_insight": "盲派断语不超过30字",
  "day_guide": "宜[xx]、[xx]；忌[xx]、[xx]",
  "lucky_element": "五行",
  "lucky_color": "幸运色名称",
  "lucky_color_hex": "#1A237E"
}
`;

    // ── 7. 调用大模型 (完全保留原版调用参数) ──
    const llmResponse = await fetch('https://yinli.one/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LLM_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gemini-3.1-pro-preview',
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

    // ── 7b. 用纯 JS 引擎结果强制覆盖 LLM 的 day_score ──
    // ⚠️ 防止 LLM 无视 prompt 中的铁律，擅自修改分值。
    //    JS 引擎结果是唯一权威，LLM 负责文案，不负责算分。
    if (scoreResult) {
      finalJson.day_score = scoreResult.final_score;
      finalJson.score_breakdown = {
        ...(finalJson.score_breakdown || {}),    // 保留 LLM 生成的其他字段（如 profile_extract）
        dim1_score:          scoreResult.breakdown.dim1_score,
        dim2_score:          scoreResult.breakdown.dim2_score,
        dim3_score:          scoreResult.breakdown.dim3_score,
        kong_wang_triggered: scoreResult.is_kongwang,
        sanjing_triggered:   scoreResult.has_sanxing,
      };
    }

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
    // 如果是因为没有额度而抛出的错误，返回 403，否则返回 500
    return res.status(error.message.includes("额度") ? 403 : 500).json({ error: '云端日运推演失败', details: error.message });
  }
}
