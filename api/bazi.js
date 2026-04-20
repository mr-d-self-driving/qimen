const { Solar, Lunar } = require('lunar-javascript');
const { createClient } = require('@supabase/supabase-js');

// 内存缓存
const memoryCache = {};
// 初始化管理员权限的 supabase 客户端 (绕过前端 RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // 务必使用具有最高权限的 Service Role Key
);

module.exports = async function handler(req, res) {
    // ============================================================================
    // 🛡️ 防线 1：CORS 跨域限制 (防浏览器盗站调用)
    // 强烈建议在 Vercel 环境变量中配置 FRONTEND_URL，例如：https://my-qimen.vercel.app
    // 未配置时默认 '*' 保证调试不断，配置后瞬间锁死域名
    // ============================================================================
    const ALLOWED_ORIGIN = process.env.FRONTEND_URL || '*';
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    // ⚠️ 必须允许 Authorization 请求头通过预检
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); 
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // ============================================================================
        // 🛡️ 防线 2：JWT 鉴权拦截 (防 Postman 和 Python 脚本刷接口)
        // ============================================================================
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: "Unauthorized: 缺少身份令牌，拒绝访问" });
        }
        const token = authHeader.split(' ')[1];
        
        // 验证前端传来的 supabase Token 的合法性
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ error: "Unauthorized: 令牌无效或已过期，请重新登录" });
        }

        const { promptData } = req.body;
        if (!promptData || !promptData.profileId) {
            return res.status(400).json({ error: "缺少八字数据或档案 ID" });
        }

        // ============================================================================
        // 🛡️ 防线 3：3 次免费额度限制 (精准计费管控)
        // ============================================================================
        // 查询该用户已成功推演过（有断语结果）的八字档案数量
        const { count, error: countError } = await supabase
            .from('bazi_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .not('bazi_summary', 'is', null);

        if (countError) throw new Error("无法验证用户额度状态");

        // 如果用户已有的推演次数 >= 3
        if (count >= 3) {
            // 查一下当前请求的档案是否以前算过。如果是针对已有结果的档案点击"重新推演"，则放行；
            // 如果是针对新档案首次推演，则拦截！
            const { data: existingProfile } = await supabase
                .from('bazi_profiles')
                .select('bazi_summary')
                .eq('id', promptData.profileId)
                .single();
            
            if (!existingProfile || !existingProfile.bazi_summary) {
                return res.status(403).json({ error: "您的 3 次免费天机推演额度已用尽" });
            }
        }

        // --- 缓存判断 ---
        const cacheKey = `${promptData.baziStr}_${promptData.gender}_${promptData.daYunStr}`;
        if (memoryCache[cacheKey]) {
            console.log("⚡️ 命中混合架构缓存！直接返回。");
            return res.status(200).json(memoryCache[cacheKey]);
        }

        // ============================================================================
        // 🌟 第一步：完全依靠 lunar-javascript 在本地生成所有客观维度数据
        // ============================================================================
        
        // 假设 promptData 传入了精确的出生阳历字符串，这里需重新实例化获取 baZi
        const dateMatch = promptData.birthStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        const timeMatch = promptData.birthStr.match(/(\d{1,2}):(\d{1,2})/);
        if (!dateMatch) throw new Error("出生日期格式解析失败");
        
        const y = parseInt(dateMatch[1]), m = parseInt(dateMatch[2]), d = parseInt(dateMatch[3]);
        const h = timeMatch ? parseInt(timeMatch[1]) : 12;
        const min = timeMatch ? parseInt(timeMatch[2]) : 0;
        
        const solarObj = Solar.fromYmdHms(y, m, d, h, min, 0);
        const baZi = solarObj.getLunar().getEightChar();
        const dayGan = baZi.getDayGan();

        // 性别转换与起运对象
        const genderCode = (promptData.gender === '男' || promptData.gender === 'M' || promptData.gender === '乾造') ? 1 : 0;
        const yun = baZi.getYun(genderCode);

        // 提取大运时间轴
        const daYunList = yun.getDaYun().slice(0, 10).map(dy => ({
            start_age: dy.getStartAge(),
            start_year: dy.getStartYear(),
            ganzhi: dy.getGanZhi(),
        }));

        // 提取流年
        const currentYear = new Date().getFullYear();
        let currentDaYunObj = yun.getDaYun().find(dy => currentYear >= dy.getStartYear() && currentYear <= dy.getEndYear());
        let liuNianList = [];
        let currentLiuNianGan = "未知", currentLiuNianZhi = "未知";
        
        if (currentDaYunObj) {
             liuNianList = currentDaYunObj.getLiuNian().map(ln => {
                 // 顺便拿到当年的干支给大模型用
                 if (ln.getYear() === currentYear) {
                     currentLiuNianGan = ln.getGanZhi().charAt(0);
                     currentLiuNianZhi = ln.getGanZhi().charAt(1);
                 }
                 return { year: ln.getYear(), age: ln.getAge(), ganzhi: ln.getGanZhi() };
             });
        }

        // 组装专业排盘大字典
        const objectiveBaziData = {
            base_info: {
                qi_yun: `出生后${yun.getStartYear()}年${yun.getStartMonth()}个月${yun.getStartDay()}天起运`,
                jiao_yun: `逢尾数 ${yun.getStartYear() % 10} 之年交大运`,
                day_kongwang: baZi.getDayXunKong(),
                si_ling: baZi.getMonthHideGan().length > 0 ? baZi.getMonthHideGan()[0] : ""
            },
            pillars: {
                ganzhi: { year: baZi.getYear(), month: baZi.getMonth(), day: baZi.getDay(), time: baZi.getTime() },
                main_stars: { year: baZi.getYearShiShenGan(), month: baZi.getMonthShiShenGan(), day: "日主", time: baZi.getTimeShiShenGan() },
                hidden_stems: { year: baZi.getYearHideGan(), month: baZi.getMonthHideGan(), day: baZi.getDayHideGan(), time: baZi.getTimeHideGan() },
                xing_yun: { year: baZi.getYearDiShi(), month: baZi.getMonthDiShi(), day: baZi.getDayDiShi(), time: baZi.getTimeDiShi() },
                kong_wang_flags: { year: baZi.getDayXunKong().includes(baZi.getYearZhi()), month: baZi.getDayXunKong().includes(baZi.getMonthZhi()), day: false, time: baZi.getDayXunKong().includes(baZi.getTimeZhi()) },
                na_yin: { year: baZi.getYearNaYin(), month: baZi.getMonthNaYin(), day: baZi.getDayNaYin(), time: baZi.getTimeNaYin() }
            },
            timeline: { da_yun: daYunList, current_liu_nian: liuNianList }
        };

        // ============================================================================
        // 🌟 第二步：定性分析交由 Gemini
        // ============================================================================
        
        const llmPrompt = `你是一位精通子平八字的命理大师。
下面是命主的客观基础数据：
• 性别：${promptData.gender}
• 八字原局：${objectiveBaziData.pillars.ganzhi.year} ${objectiveBaziData.pillars.ganzhi.month} ${objectiveBaziData.pillars.ganzhi.day} ${objectiveBaziData.pillars.ganzhi.time}
• 原局天干十神：年[${objectiveBaziData.pillars.main_stars.year}] 月[${objectiveBaziData.pillars.main_stars.month}] 时[${objectiveBaziData.pillars.main_stars.time}]
• 当前大运：${promptData.daYunStr}
• 当前流年：${currentLiuNianGan}${currentLiuNianZhi}年
• 辅助信息：日空亡[${objectiveBaziData.base_info.day_kongwang}]

请基于以上八字，执行以下分析：
1. 【身强/身弱定性】：判断日主强弱。
2. 【提取十神喜忌】：提取喜用神与忌仇神。
3. 【神煞与刑冲合害】：综合大运流年，总结核心的合克关系。
4. 【八字断语】：分别撰写原局核心、当前大运和当前流年简评。

【输出格式要求】
必须且仅输出纯 JSON 字符串（不要 Markdown 标记），结构严格如下：
{
  "strong_weak": "身强 或 身弱 或 中和偏弱等",
  "favorable_gods": ["印星", "比劫"],
  "unfavorable_gods": ["官杀", "财星"],
  "relations_analysis": "核心神煞与刑冲合害描述...",
  "yuanju_core": "原局核心分析",
  "current_dayun": "当前大运分析",
  "current_liunian": "当前流年简评"
}`;

        const API_KEY = process.env.GEMINI_API_KEY; 
        const API_URL = 'https://yinli.one/v1/chat/completions'; 
        
        const llmResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}` 
            },
            body: JSON.stringify({
                model: 'gemini-3.1-pro-preview', 
                messages: [{ role: 'user', content: llmPrompt }],
                temperature: 0.2, 
                response_format: { type: "json_object" }
            })
        });

        const apiData = await llmResponse.json();
        if (apiData.error) throw new Error(apiData.error.message || "请求大模型失败");

        let rawResult = apiData.choices[0].message.content;
        rawResult = rawResult.replace(/```json/g, "").replace(/```/g, "").trim();
        const llmQualitativeData = JSON.parse(rawResult);

        // ============================================================================
        // 🌟 第三步：合并数据、后端写库并返回
        // ============================================================================
        const finalBaziDetail = {
            ...objectiveBaziData, 
            strong_weak: llmQualitativeData.strong_weak,                
            favorable_gods: llmQualitativeData.favorable_gods,          
            unfavorable_gods: llmQualitativeData.unfavorable_gods,      
            relations_analysis: llmQualitativeData.relations_analysis,  
            yuanju_core: llmQualitativeData.yuanju_core,                
            current_dayun: llmQualitativeData.current_dayun,            
            current_liunian: llmQualitativeData.current_liunian         
        };

        const combinedResultText = `原局核心：\n${llmQualitativeData.yuanju_core}\n\n当前大运：\n${llmQualitativeData.current_dayun}\n\n当前流年：\n${llmQualitativeData.current_liunian}`;
        
        // 极其安全的后端写库操作
        const { error: dbError } = await supabase
            .from('bazi_profiles')
            .update({
                bazi_summary: combinedResultText,
                strong_weak: finalBaziDetail.strong_weak,
                favorable_elements: finalBaziDetail.favorable_gods.join(", "),
                unfavorable_elements: finalBaziDetail.unfavorable_gods.join(", "),
                yuanju_core: finalBaziDetail.yuanju_core,
                current_dayun: finalBaziDetail.current_dayun,
                current_liunian: finalBaziDetail.current_liunian,
                bazi_detail: finalBaziDetail
            })
            .eq('id', promptData.profileId);

        if (dbError) {
            console.error("后端数据库写入失败:", dbError);
        }

        const outputPayload = { 
            result: combinedResultText,
            bazi_detail: finalBaziDetail
        };

        memoryCache[cacheKey] = outputPayload;
        return res.status(200).json(outputPayload);

    } catch (error) {
        console.error(error);
        return res.status(error.message.includes("额度") ? 403 : 500).json({ error: error.message });
    }
}
