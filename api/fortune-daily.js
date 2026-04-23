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

    // ── 6. 组装 Prompt 与字段适配 ──
    
    // 根据算分引擎判定等级档位
    const finalScore = scoreResult ? scoreResult.final_score : 70;
    let score_level = "平";
    if (finalScore >= 85) score_level = "优";
    else if (finalScore >= 70) score_level = "良";
    else if (finalScore >= 60) score_level = "平";
    else if (finalScore >= 50) score_level = "注意";
    else score_level = "慎行";

    // 适配布尔值状态
    const is_kongwang = scoreResult ? !!scoreResult.is_kongwang : false;
    const has_sanxing = scoreResult ? !!scoreResult.has_sanxing : false;

    // 适配喜用五行：优先从 profile.favorable_elements 读取
    const lucky_element = (profile.favorable_elements && profile.favorable_elements.length > 0)
        ? profile.favorable_elements.join('、')
        : "无明显偏好";

    // 适配宫位与十神：如果上游未提供这俩字段，则使用合理的占位保底
    const day_zhi_palace = scoreResult?.day_zhi_palace || `${day_zhi}地支关联宫位`;
    const core_shen_today = scoreResult?.core_shen_today || "流日主导星曜";

    const prompt = `
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

    // ── 7b. 用纯 JS 引擎结果强制写入 JSON 以供前端读取 ──
    // ⚠️ 我们在 prompt 中去掉了强制要求输出 day_score 的部分，
    //    因此在这里，直接将上游算分的权威数据挂载进 finalJson，从而返回给前端图表使用。
    if (scoreResult) {
      finalJson.day_score = scoreResult.final_score;
      finalJson.score_breakdown = {
        ...(finalJson.score_breakdown || {}),
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