const { Solar, Lunar } = require('lunar-javascript');
const { createClient } = require('@supabase/supabase-js');

// 内存缓存
const memoryCache = {};

// 初始化管理员权限的 supabase 客户端 (绕过前端 RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // 务必使用具有最高权限的 Service Role Key
);

// ============================================================================
// 🌟 东方玄学 OS - 八字核心推算引擎 (本地精准计算，防大模型幻觉)
// ============================================================================
const BaziEngine = {
    Rules: {
        tianYi:   { 甲:'丑未', 乙:'子申', 丙:'亥酉', 丁:'亥酉', 戊:'丑未', 己:'子申', 庚:'寅午', 辛:'寅午', 壬:'卯巳', 癸:'卯巳' },
        wenChang: { 甲:'巳', 乙:'午', 丙:'申', 丁:'酉', 戊:'申', 己:'酉', 庚:'亥', 辛:'子', 壬:'寅', 癸:'卯' },
        yangRen:  { 甲:'卯', 丙:'午', 戊:'午', 庚:'酉', 壬:'子' },
        luShen:   { 甲:'寅', 乙:'卯', 丙:'巳', 丁:'午', 戊:'巳', 己:'午', 庚:'申', 辛:'酉', 壬:'亥', 癸:'子' },
        yiMa:     { 申:'寅', 子:'寅', 辰:'寅', 寅:'申', 午:'申', 戌:'申', 亥:'巳', 卯:'巳', 未:'巳', 巳:'亥', 酉:'亥', 丑:'亥' },
        taoHua:   { 申:'酉', 子:'酉', 辰:'酉', 寅:'卯', 午:'卯', 戌:'卯', 亥:'子', 卯:'子', 未:'子', 巳:'午', 酉:'午', 丑:'午' },
        huaGai:   { 申:'辰', 子:'辰', 辰:'辰', 寅:'戌', 午:'戌', 戌:'戌', 亥:'未', 卯:'未', 未:'未', 巳:'丑', 酉:'丑', 丑:'丑' },
        jiangXing:{ 申:'子', 子:'子', 辰:'子', 寅:'午', 午:'午', 戌:'午', 亥:'卯', 卯:'卯', 未:'卯', 巳:'酉', 酉:'酉', 丑:'酉' },
        guChen:   { 寅:'巳', 卯:'巳', 辰:'巳', 巳:'申', 午:'申', 未:'申', 申:'亥', 酉:'亥', 戌:'亥', 亥:'寅', 子:'寅', 丑:'寅' },
        guaSu:    { 寅:'丑', 卯:'丑', 辰:'丑', 巳:'辰', 午:'辰', 未:'辰', 申:'未', 酉:'未', 戌:'未', 亥:'戌', 子:'戌', 丑:'戌' },
        yueDe:    { 寅:'丙', 午:'丙', 戌:'丙', 申:'壬', 子:'壬', 辰:'壬', 亥:'甲', 卯:'甲', 未:'甲', 巳:'庚', 酉:'庚', 丑:'庚' },
        tianDe:   { 寅:'丁', 卯:'申', 辰:'壬', 巳:'辛', 午:'亥', 未:'甲', 申:'癸', 酉:'寅', 戌:'丙', 亥:'乙', 子:'巳', 丑:'庚' }
    },
    calculateShenSha: function(bazi) {
        const { year, month, day, time } = bazi;
        const pillars = { year, month, day, time };
        const result = { year: [], month: [], day: [], time: [] };
        const dayGan = day[0], monthZhi = month[1], yearZhi = year[1], dayZhi = day[1];

        for (const [key, pillar] of Object.entries(pillars)) {
            const zhi = pillar[1], gan = pillar[0];
            if (this.Rules.tianYi[dayGan]?.includes(zhi)) result[key].push("天乙贵人");
            if (this.Rules.wenChang[dayGan] === zhi) result[key].push("文昌贵人");
            if (this.Rules.yangRen[dayGan] === zhi) result[key].push("羊刃");
            if (this.Rules.luShen[dayGan] === zhi) result[key].push("禄神");

            const zhiRules = ['yiMa', 'taoHua', 'huaGai', 'jiangXing', 'guChen', 'guaSu'];
            const zhiNames = ['驿马', '桃花', '华盖', '将星', '孤辰', '寡宿'];
            for (let i = 0; i < zhiRules.length; i++) {
                if (this.Rules[zhiRules[i]][yearZhi] === zhi || this.Rules[zhiRules[i]][dayZhi] === zhi) {
                    if (!result[key].includes(zhiNames[i])) result[key].push(zhiNames[i]);
                }
            }
            if (this.Rules.yueDe[monthZhi] === gan) result[key].push("月德贵人");
            if (this.Rules.tianDe[monthZhi] === gan || this.Rules.tianDe[monthZhi] === zhi) result[key].push("天德贵人");
        }
        return {
            year: result.year.length > 0 ? result.year.join(" ") : "-",
            month: result.month.length > 0 ? result.month.join(" ") : "-",
            day: result.day.length > 0 ? result.day.join(" ") : "-",
            time: result.time.length > 0 ? result.time.join(" ") : "-"
        };
    },
    extractSpecialPatterns: function(bazi) {
        const patterns = [];
        const dayPillar = bazi.day.join('');
        const timePillar = bazi.time.join('');
        const allZhis = [bazi.year[1], bazi.month[1], bazi.day[1], bazi.time[1]];

        if (['庚辰', '庚戌', '壬辰', '戊戌'].includes(dayPillar)) patterns.push("【魁罡】重叠逢之主大贵。");
        if (['乙丑', '己巳', '癸酉'].includes(timePillar)) patterns.push("【金神】威猛刚烈，逢火乡发富贵。");
        
        if (allZhis.includes('辰') && allZhis.includes('巳')) patterns.push("【地网】宜遵纪守法。");
        if (allZhis.includes('戌') && allZhis.includes('亥')) patterns.push("【天罗】易怀才不遇。");

        const sheng = allZhis.filter(z => ['寅','申','巳','亥'].includes(z));
        const bai = allZhis.filter(z => ['子','午','卯','酉'].includes(z));
        const ku = allZhis.filter(z => ['辰','戌','丑','未'].includes(z));
        if (sheng.length >= 3) patterns.push("【四生局】寅申巳亥多，奔波变动大。");
        if (bai.length >= 3) patterns.push("【四败局】子午卯酉多，异性缘极佳。");
        if (ku.length >= 3) patterns.push("【四库局】辰戌丑未多，稳重藏锋芒。");
        return patterns;
    },
    ShiShen: {
        '甲': { '甲':'比', '乙':'劫', '丙':'食', '丁':'伤', '戊':'才', '己':'财', '庚':'杀', '辛':'官', '壬':'枭', '癸':'印' },
        '乙': { '甲':'劫', '乙':'比', '丙':'伤', '丁':'食', '戊':'财', '己':'才', '庚':'官', '辛':'杀', '壬':'印', '癸':'枭' },
        '丙': { '甲':'枭', '乙':'印', '丙':'比', '丁':'劫', '戊':'食', '己':'伤', '庚':'才', '辛':'财', '壬':'杀', '癸':'官' },
        '丁': { '甲':'印', '乙':'枭', '丙':'劫', '丁':'比', '戊':'伤', '己':'食', '庚':'财', '辛':'才', '壬':'官', '癸':'杀' },
        '戊': { '甲':'杀', '乙':'官', '丙':'枭', '丁':'印', '戊':'比', '己':'劫', '庚':'食', '辛':'伤', '壬':'才', '癸':'财' },
        '己': { '甲':'官', '乙':'杀', '丙':'印', '丁':'枭', '戊':'劫', '己':'比', '庚':'伤', '辛':'食', '壬':'财', '癸':'才' },
        '庚': { '甲':'才', '乙':'财', '丙':'杀', '丁':'官', '戊':'枭', '己':'印', '庚':'比', '辛':'劫', '壬':'食', '癸':'伤' },
        '辛': { '甲':'财', '乙':'才', '丙':'官', '丁':'杀', '戊':'印', '己':'枭', '庚':'劫', '辛':'比', '壬':'伤', '癸':'食' },
        '壬': { '甲':'食', '乙':'伤', '丙':'才', '丁':'财', '戊':'杀', '己':'官', '庚':'枭', '辛':'印', '壬':'比', '癸':'劫' },
        '癸': { '甲':'伤', '乙':'食', '丙':'财', '丁':'才', '戊':'官', '己':'杀', '庚':'印', '辛':'枭', '壬':'劫', '癸':'比' }
    },
    ZhiMainGan: { '子':'癸', '丑':'己', '寅':'甲', '卯':'乙', '辰':'戊', '巳':'丙', '午':'丁', '未':'己', '申':'庚', '酉':'辛', '戌':'戊', '亥':'壬' },
    getGeJu: function(bazi) {
        const dayGan = bazi.day[0], monthZhi = bazi.month[1];
        const jianLuMap = { '甲':'寅', '乙':'卯', '丙':'巳', '丁':'午', '戊':'巳', '己':'午', '庚':'申', '辛':'酉', '壬':'亥', '癸':'子' };
        const yueRenMap = { '甲':'卯', '庚':'酉', '壬':'子' }; 
        if (jianLuMap[dayGan] === monthZhi) return "建禄格";
        if (yueRenMap[dayGan] === monthZhi) return "月刃格";
        const mainGan = this.ZhiMainGan[monthZhi];
        const gejuName = this.ShiShen[dayGan][mainGan];
        const formatMap = { '官':'正官格', '杀':'七杀格', '财':'正财格', '才':'偏财格', '食':'食神格', '伤':'伤官格', '印':'正印格', '枭':'偏印格', '比':'比肩格', '劫':'劫财格' };
        return formatMap[gejuName] || (gejuName + "格");
    }
};

module.exports = async function handler(req, res) {
    // ============================================================================
    // 🛡️ 防线 1：CORS 跨域限制 (防浏览器盗站调用)
    // ============================================================================
    const ALLOWED_ORIGIN = process.env.FRONTEND_URL || '*';
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); 
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // ============================================================================
        // 🛡️ 防线 2：JWT 鉴权拦截 (防 Postman 和 Python 脚本刷接口)
        // ============================================================================
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: "Unauthorized: 缺少身份令牌" });
        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: "Unauthorized: 令牌无效或已过期" });

        const { promptData } = req.body;
        if (!promptData || !promptData.profileId) return res.status(400).json({ error: "缺少八字数据或档案 ID" });

        // ============================================================================
        // 🛡️ 防线 3：3 次免费额度限制 + 👑 VIP 白名单特权
        // ============================================================================
        const whitelistStr = process.env.WHITELIST_EMAILS || "";
        const whitelist = whitelistStr.split(',').map(email => email.trim().toLowerCase());
        const currentUserEmail = user.email ? user.email.toLowerCase() : "";
        const isVIP = whitelist.includes(currentUserEmail);

        if (!isVIP) {
            const { count, error: countError } = await supabase.from('bazi_profiles').select('*', { count: 'exact', head: true })
                .eq('user_id', user.id).not('bazi_summary', 'is', null);
            if (countError) throw new Error("无法验证用户额度状态");
            if (count >= 3) {
                const { data: existingProfile } = await supabase.from('bazi_profiles').select('bazi_summary').eq('id', promptData.profileId).single();
                if (!existingProfile || !existingProfile.bazi_summary) return res.status(403).json({ error: "您的 3 次免费天机推演额度已用尽" });
            }
        }

        const cacheKey = `${promptData.baziStr}_${promptData.gender}_${promptData.daYunStr}`;
        if (memoryCache[cacheKey]) return res.status(200).json(memoryCache[cacheKey]);

      // ============================================================================
        // 🌟 核心一：历法与 BaziEngine 本地计算 (神煞、格局直接算出，杜绝大模型幻觉)
        // ============================================================================
        
        // 🚀 修复：改用全局数字提取，完美兼容 YYYY-MM-DD 和 YYYY年MM月DD日 等一切格式
        const dateParts = promptData.birthStr ? promptData.birthStr.match(/\d+/g) : null;
        if (!dateParts || dateParts.length < 3) {
            // 返回 400 状态码告知前端数据问题，而不是 throw Error 让后端服务崩溃
            return res.status(400).json({ 
                error: "由于该档案为早期仅有八字干支的记录，缺少确切的出生时间，无法进行岁运推演。\n请新建一个带有具体出生时间的档案。" 
            });
        }
        
        const y = parseInt(dateParts[0]);
        const m = parseInt(dateParts[1]);
        const d = parseInt(dateParts[2]);
        const h = dateParts[3] ? parseInt(dateParts[3]) : 12; // 缺失小时默认中午 12 点
        const min = dateParts[4] ? parseInt(dateParts[4]) : 0; // 缺失分钟默认 0 分
        
        const solarObj = Solar.fromYmdHms(y, m, d, h, min, 0);
        const baZi = solarObj.getLunar().getEightChar();
        const genderCode = (promptData.gender === '男' || promptData.gender === 'M' || promptData.gender === '乾造') ? 1 : 0;
        const yun = baZi.getYun(genderCode);

        // 构建格式化八字供 BaziEngine 调用
        const baziObj = {
            year: baZi.getYear().split(''),
            month: baZi.getMonth().split(''),
            day: baZi.getDay().split(''),
            time: baZi.getTime().split('')
        };
        
        // 🚀 调用本地引擎算出客观玄学数据
        const shenshaResult = BaziEngine.calculateShenSha(baziObj);
        const geJu = BaziEngine.getGeJu(baziObj);
        const specialPatterns = BaziEngine.extractSpecialPatterns(baziObj);

        const currentYear = new Date().getFullYear();
        let currentDaYunObj = yun.getDaYun().find(dy => currentYear >= dy.getStartYear() && currentYear <= dy.getEndYear());
        let currentLiuNianGan = "未知", currentLiuNianZhi = "未知";
        if (currentDaYunObj) {
             currentDaYunObj.getLiuNian().forEach(ln => {
                 if (ln.getYear() === currentYear) {
                     currentLiuNianGan = ln.getGanZhi().charAt(0);
                     currentLiuNianZhi = ln.getGanZhi().charAt(1);
                 }
             });
        }

        const objectiveBaziData = {
            base_info: {
                qi_yun: `出生后${yun.getStartYear()}年起运`,
                ge_ju: geJu, // 写入格局
                special_patterns: specialPatterns // 写入特殊命局
            },
            pillars: {
                ganzhi: { year: baZi.getYear(), month: baZi.getMonth(), day: baZi.getDay(), time: baZi.getTime() },
                main_stars: { year: baZi.getYearShiShenGan(), month: baZi.getMonthShiShenGan(), day: "日主", time: baZi.getTimeShiShenGan() },
                shensha: shenshaResult // 完美结构化的神煞对象，供前端直接读取
            }
        };

        // ============================================================================
        // 🌟 核心二：LLM 仅负责定性分析与断语文案 (不负责算神煞)
        // ============================================================================
        const llmPrompt = `你是一位精通子平八字的命理大师。
下面是命主的客观基础数据（由专业排盘系统严谨推演，请直接使用，切勿自行更改或捏造神煞）：
• 性别：${promptData.gender}
• 八字原局：${objectiveBaziData.pillars.ganzhi.year} ${objectiveBaziData.pillars.ganzhi.month} ${objectiveBaziData.pillars.ganzhi.day} ${objectiveBaziData.pillars.ganzhi.time}
• 命主格局：${geJu}
• 核心神煞：年[${shenshaResult.year}] 月[${shenshaResult.month}] 日[${shenshaResult.day}] 时[${shenshaResult.time}]
• 特殊命局：${specialPatterns.length > 0 ? specialPatterns.join(' | ') : '无'}
• 当前大运：${promptData.daYunStr}
• 当前流年：${currentLiuNianGan}${currentLiuNianZhi}年

请基于以上八字，执行以下分析：
1. 【身强/身弱定性】：判断日主强弱。
2. 【提取十神喜忌】：提取喜用神与忌仇神。
3. 【八字断语】：结合给定的格局、神煞与大运流年生克，分别撰写原局核心、当前大运和当前流年简评。

【输出格式要求】
必须且仅输出纯 JSON 字符串（不要 Markdown 标记），模型中【不需要】再输出神煞数据，结构严格如下：
{
  "strong_weak": "身强 或 身弱",
  "favorable_gods": ["印星", "比劫"],
  "unfavorable_gods": ["官杀", "财星"],
  "yuanju_core": "原局核心分析文案...",
  "current_dayun": "当前大运分析文案...",
  "current_liunian": "当前流年简评文案..."
}`;

        const API_KEY = process.env.GEMINI_API_KEY; 
        const API_URL = 'https://yinli.one/v1/chat/completions'; 
        
        const llmResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
            body: JSON.stringify({
                model: 'gemini-3.1-pro-preview', 
                messages: [{ role: 'user', content: llmPrompt }],
                temperature: 0.2, 
                response_format: { type: "json_object" }
            })
        });

        const apiData = await llmResponse.json();
        if (apiData.error) throw new Error(apiData.error.message || "请求大模型失败");

        let rawResult = apiData.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
        const llmQualitativeData = JSON.parse(rawResult);

        // ============================================================================
        // 🌟 核心三：合并数据、后端安全写库并返回
        // ============================================================================
        const combinedResultText = `【命造格局】：${geJu}\n\n原局核心：\n${llmQualitativeData.yuanju_core}\n\n当前大运：\n${llmQualitativeData.current_dayun}\n\n当前流年：\n${llmQualitativeData.current_liunian}`;
        
        const finalBaziDetail = {
            ...objectiveBaziData, 
            strong_weak: llmQualitativeData.strong_weak,                
            favorable_gods: llmQualitativeData.favorable_gods,          
            unfavorable_gods: llmQualitativeData.unfavorable_gods,      
            yuanju_core: llmQualitativeData.yuanju_core,                
            current_dayun: llmQualitativeData.current_dayun,            
            current_liunian: llmQualitativeData.current_liunian         
        };

        // 极其安全的后端写库操作，直接将神煞以 JSON 格式独立写入字段
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
                bazi_detail: finalBaziDetail,
                shensha: shenshaResult, // ⚠️ 重要：将前端急需的神煞对象存入专属字段
                geju: geJu              // ⚠️ 重要：将格局存入专属字段
            })
            .eq('id', promptData.profileId);

        if (dbError) console.error("后端数据库写入失败:", dbError);

        const outputPayload = { 
            result: combinedResultText,
            bazi_detail: finalBaziDetail,
            shensha: shenshaResult,
            geju: geJu
        };

        memoryCache[cacheKey] = outputPayload;
        return res.status(200).json(outputPayload);

    } catch (error) {
        console.error(error);
        return res.status(error.message.includes("额度") ? 403 : 500).json({ error: error.message });
    }
}
