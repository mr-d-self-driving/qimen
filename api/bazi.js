const { Solar, Lunar } = require('lunar-javascript');
const { createClient } = require('@supabase/supabase-js');

const memoryCache = {};
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================================================
// 🌟 东方玄学 OS - 全能后端排盘引擎 (接管所有前端计算逻辑)
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
    // 前端迁移过来的数据常量
    NAYIN: {"甲子":"海中金","乙丑":"海中金","丙寅":"炉中火","丁卯":"炉中火","戊辰":"大林木","己巳":"大林木","庚午":"路旁土","辛未":"路旁土","壬申":"剑锋金","癸酉":"剑锋金","甲戌":"山头火","乙亥":"山头火","丙子":"涧下水","丁丑":"涧下水","戊寅":"城头土","己卯":"城头土","庚辰":"白蜡金","辛巳":"白蜡金","壬午":"杨柳木","癸未":"杨柳木","甲申":"泉中水","乙酉":"泉中水","丙戌":"屋上土","丁亥":"屋上土","戊子":"霹雳火","己丑":"霹雳火","庚寅":"松柏木","辛卯":"松柏木","壬辰":"长流水","癸巳":"长流水","甲午":"沙中金","乙未":"沙中金","丙申":"山下火","丁酉":"山下火","戊戌":"平地木","己亥":"平地木","庚子":"壁上土","辛丑":"壁上土","壬寅":"金箔金","癸卯":"金箔金","甲辰":"覆灯火","乙巳":"覆灯火","丙午":"天河水","丁未":"天河水","戊申":"大驿土","己酉":"大驿土","庚戌":"钗钏金","辛亥":"钗钏金","壬子":"桑柘木","癸丑":"桑柘木","甲寅":"大溪水","乙卯":"大溪水","丙辰":"沙中土","丁巳":"沙中土","戊午":"天上火","己未":"天上火","庚申":"石榴木","辛酉":"石榴木","壬戌":"大海水","癸亥":"大海水"},
    ZHI_HIDE: {"子":["癸"],"丑":["己","癸","辛"],"寅":["甲","丙","戊"],"卯":["乙"],"辰":["戊","乙","癸"],"巳":["丙","庚","戊"],"午":["丁","己"],"未":["己","丁","乙"],"申":["庚","壬","戊"],"酉":["辛"],"戌":["戊","辛","丁"],"亥":["壬","甲"]},
    SHI_ER: ["长生","沐浴","冠带","临官","帝旺","衰","病","死","墓","绝","胎","养"],
    CHANG_SHENG_START: { "甲":11, "丙":2, "戊":2, "庚":5, "壬":8, "乙":6, "丁":9, "己":9, "辛":0, "癸":3 },
    ZHI_INDEX: {"子":0,"丑":1,"寅":2,"卯":3,"辰":4,"巳":5,"午":6,"未":7,"申":8,"酉":9,"戌":10,"亥":11},

    // 独立神煞数组获取（供前端直接遍历渲染）
    getShenShaArray: function(targetZhi, dayGan, yearZhi, dayZhi) {
        if(!targetZhi) return [];
        let res = [];
        if (this.Rules.tianYi[dayGan]?.includes(targetZhi)) res.push("天乙");
        if (this.Rules.wenChang[dayGan] === targetZhi) res.push("文昌");
        if (this.Rules.yangRen[dayGan] === targetZhi) res.push("羊刃");
        if (this.Rules.luShen[dayGan] === targetZhi) res.push("禄神");
        if (this.Rules.yiMa[yearZhi] === targetZhi || this.Rules.yiMa[dayZhi] === targetZhi) res.push("驿马");
        if (this.Rules.taoHua[yearZhi] === targetZhi || this.Rules.taoHua[dayZhi] === targetZhi) res.push("桃花");
        if (this.Rules.huaGai[yearZhi] === targetZhi || this.Rules.huaGai[dayZhi] === targetZhi) res.push("华盖");
        if (this.Rules.jiangXing[yearZhi] === targetZhi || this.Rules.jiangXing[dayZhi] === targetZhi) res.push("将星");
        return res;
    },
    // 十二长生计算
    getDiShi: function(gan, zhi) {
        if(!gan || !zhi || this.CHANG_SHENG_START[gan] === undefined || this.ZHI_INDEX[zhi] === undefined) return '-';
        let start = this.CHANG_SHENG_START[gan], zIndex = this.ZHI_INDEX[zhi], isYang = ["甲","丙","戊","庚","壬"].includes(gan);
        return this.SHI_ER[isYang ? (zIndex - start + 12) % 12 : (start - zIndex + 12) % 12];
    },
    calculateShenSha: function(bazi) {
        // 保留给 LLM 的字符串格式
        const { year, month, day, time } = bazi;
        const result = { year: [], month: [], day: [], time: [] };
        const dayGan = day[0], monthZhi = month[1], yearZhi = year[1], dayZhi = day[1];

        const pushShen = (key, zhi, gan) => {
            result[key] = this.getShenShaArray(zhi, dayGan, yearZhi, dayZhi);
            if (this.Rules.yueDe[monthZhi] === gan) result[key].push("月德贵人");
            if (this.Rules.tianDe[monthZhi] === gan || this.Rules.tianDe[monthZhi] === zhi) result[key].push("天德贵人");
        };
        pushShen('year', yearZhi, year[0]); pushShen('month', monthZhi, month[0]);
        pushShen('day', dayZhi, dayGan); pushShen('time', time[1], time[0]);

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
    const ALLOWED_ORIGIN = process.env.FRONTEND_URL || '*';
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); 
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: "Unauthorized" });
        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

        const { promptData } = req.body;
        if (!promptData || !promptData.profileId) return res.status(400).json({ error: "缺少档案 ID" });

        const whitelist = (process.env.WHITELIST_EMAILS || "").split(',').map(e => e.trim().toLowerCase());
        const isVIP = whitelist.includes(user.email?.toLowerCase() || "");

        if (!isVIP) {
            const { count } = await supabase.from('bazi_profiles').select('*', { count: 'exact', head: true }).eq('user_id', user.id).not('bazi_summary', 'is', null);
            if (count >= 3) {
                const { data: existingProfile } = await supabase.from('bazi_profiles').select('bazi_summary').eq('id', promptData.profileId).single();
                if (!existingProfile || !existingProfile.bazi_summary) return res.status(403).json({ error: "免费额度已用尽" });
            }
        }

        const cacheKey = `${promptData.baziStr}_${promptData.gender}_${promptData.daYunStr}`;
        if (memoryCache[cacheKey]) return res.status(200).json(memoryCache[cacheKey]);

        // ==================== 1. 核心排盘计算 ====================
        const dateParts = promptData.birthStr ? promptData.birthStr.match(/\d+/g) : null;
        if (!dateParts || dateParts.length < 3) return res.status(400).json({ error: "缺少确切的出生时间" });
        
        const y = parseInt(dateParts[0]), m = parseInt(dateParts[1]), d = parseInt(dateParts[2]);
        const h = dateParts[3] ? parseInt(dateParts[3]) : 12, min = dateParts[4] ? parseInt(dateParts[4]) : 0;
        
        const solarObj = Solar.fromYmdHms(y, m, d, h, min, 0);
        const baZi = solarObj.getLunar().getEightChar();
        const isMale = (promptData.gender === '男' || promptData.gender === 'M' || promptData.gender === '乾造');
        const yun = baZi.getYun(isMale ? 1 : 0);

        const baziObj = {
            year: baZi.getYear().split(''), month: baZi.getMonth().split(''),
            day: baZi.getDay().split(''), time: baZi.getTime().split('')
        };
        
        const shenshaResult = BaziEngine.calculateShenSha(baziObj);
        const geJu = BaziEngine.getGeJu(baziObj);
        const specialPatterns = BaziEngine.extractSpecialPatterns(baziObj);

        // ==================== 2. 为前端构建 JSON 渲染矩阵 (Matrix) ====================
        const dayGan = baZi.getDayGan(), yearZhi = baZi.getYearZhi(), dayZhi = baZi.getDayZhi();
        const xunKong = baZi.getDayXunKong() || "";

        // 辅助函数：构建单柱结构体
        const buildPillar = (name, gan, zhi, star) => ({
            name, gan, zhi, star,
            hidden_stems: BaziEngine.ZHI_HIDE[zhi] || [],
            shi: BaziEngine.getDiShi(dayGan, zhi), // 查日干得星运
            zizuo: BaziEngine.getDiShi(gan, zhi),  // 查本柱得自座
            nayin: BaziEngine.NAYIN[gan+zhi] || '-',
            is_kong: xunKong.includes(zhi),
            shensha: BaziEngine.getShenShaArray(zhi, dayGan, yearZhi, dayZhi)
        });

        const pillarsData = [
            buildPillar('年', baZi.getYearGan(), baZi.getYearZhi(), baZi.getYearShiShenGan()),
            buildPillar('月', baZi.getMonthGan(), baZi.getMonthZhi(), baZi.getMonthShiShenGan()),
            buildPillar('日', baZi.getDayGan(), baZi.getDayZhi(), isMale ? '元男' : '元女'),
            buildPillar('时', baZi.getTimeGan(), baZi.getTimeZhi(), baZi.getTimeShiShenGan())
        ];

        // 大运流年时间线
        const daYunList = yun.getDaYun().slice(0, 10).map(dy => ({
            start_year: dy.getStartYear(),
            start_age: dy.getStartAge(),
            gan: dy.getGanZhi().charAt(0),
            zhi: dy.getGanZhi().charAt(1)
        }));

        const currentYear = new Date().getFullYear();
        const currentDaYunObj = yun.getDaYun().find(dy => currentYear >= dy.getStartYear() && currentYear <= dy.getEndYear());
        let currentDaYunData = null;
        let currentLiuNianGan = "未知", currentLiuNianZhi = "未知";

        if (currentDaYunObj) {
            currentDaYunData = buildPillar('大运', currentDaYunObj.getGanZhi().charAt(0), currentDaYunObj.getGanZhi().charAt(1), '大运');
            currentDaYunObj.getLiuNian().forEach(ln => {
                if (ln.getYear() === currentYear) { currentLiuNianGan = ln.getGanZhi().charAt(0); currentLiuNianZhi = ln.getGanZhi().charAt(1); }
            });
        }

        const lnLunar = Solar.fromYmd(currentYear, 6, 1).getLunar();
        const currentLiuNianData = buildPillar('流年', lnLunar.getYearGan(), lnLunar.getYearZhi(), '流年');

        const objectiveBaziData = {
            base_info: { qi_yun: `出生后${yun.getStartYear()}年起运`, ge_ju: geJu, special_patterns: specialPatterns },
            matrix: {
                pillars: pillarsData,
                dayun_list: daYunList,
                current_dayun: currentDaYunData,
                current_liunian: currentLiuNianData
            },
            pillars: {
                ganzhi: { year: baZi.getYear(), month: baZi.getMonth(), day: baZi.getDay(), time: baZi.getTime() },
                main_stars: { year: baZi.getYearShiShenGan(), month: baZi.getMonthShiShenGan(), day: "日主", time: baZi.getTimeShiShenGan() },
                shensha: shenshaResult
            }
        };

// ==================== 3. 请求 LLM 进行断语生成 ====================
        const llmPrompt = `你是一位精通子平八字与传统命理学（《渊海子平》、《滴天髓》、《三命通会》）的现代高级命理大师。
请基于下方提供的精确命理数据，为用户进行详尽、专业、且符合现代人语境的八字推演。

【命理基础理论预设（请在分析时严格遵循）】
1. 论身强身弱：须综合考察日干在月令的得令状态、地支是否有强根、天干印比帮扶之多寡，以及是否有食伤泄气、财星耗力、官杀克身。必须给出明确结论（如身强、身弱、从格、极弱等）。
2. 取用神忌神法则：身强喜克泄耗（官杀、食伤、财星），忌生扶（印星、比劫）；身弱喜生扶（印星、比劫），忌克泄耗（官杀、食伤、财星）。特殊格局（如专旺、从格）需按特殊法则取用神。
3. 神煞与格局：神煞仅为锦上添花的参考，不可喧宾夺主，核心仍需以五行生克制化、格局喜忌为准。例如：天乙贵人主逢凶化吉，驿马主变动奔波，华盖主孤高艺术，桃花主异性缘与人缘。
4. 大运流年作用机制：大运重地支，流年重天干。流年干支与原局、大运发生刑冲合害（如子午冲、寅申巳亥三刑、辰戌丑未四库冲等）时，需重点分析其引发的具体吉凶事件倾向。

【命主客观基础数据】（由严谨的天文历法引擎推演生成，请直接作为事实使用，切勿自行捏造或篡改神煞数据）：
• 性别：${promptData.gender}
• 八字原局：${objectiveBaziData.pillars.ganzhi.year} ${objectiveBaziData.pillars.ganzhi.month} ${objectiveBaziData.pillars.ganzhi.day} ${objectiveBaziData.pillars.ganzhi.time}
• 命主格局：${geJu}
• 核心神煞：年柱[${shenshaResult.year}] 月柱[${shenshaResult.month}] 日柱[${shenshaResult.day}] 时柱[${shenshaResult.time}]
• 特殊命局：${specialPatterns.length > 0 ? specialPatterns.join(' | ') : '无'}
• 当前大运：${promptData.daYunStr}
• 当前流年：${currentLiuNianGan}${currentLiuNianZhi}年

【推演任务执行清单】
请结合上述详尽数据与经典命理法则，执行以下深度分析：
1. 【定性分析】：判断日主强弱，并简述核心判断依据。
2. 【喜忌提取】：明确提取喜用神与忌仇神（请输出为精简的数组格式）。
3. 【原局深度评析】：结合格局、神煞、五行流通，评价命主的性格特质、事业财运潜力、六亲关系倾向等核心特质。要求语言专业且有实际指导意义。
4. 【当前大运解析】：分析当前十步大运对原局的整体影响，是吉是凶，侧重点在何处（如：利求财、宜深造、防破财、注意健康等）。
5. 【当前流年简评】：结合流年干支与原局大运的生克冲合关系，给出今年的具体运势研判和切实可行的行动建议。

【输出格式要求】
必须且仅输出纯 JSON 字符串对象（绝对不要附带任何 Markdown 标记，如 \`\`\`json，也不要包含任何多余的解释说明文字），JSON 的结构必须严格如下：
{
  "strong_weak": "身强 或 身弱",
  "favorable_gods": ["印星", "比劫"],
  "unfavorable_gods": ["官杀", "财星"],
  "yuanju_core": "原局核心深度分析文案...",
  "current_dayun": "当前大运分析文案...",
  "current_liunian": "当前流年简评文案..."
}`;

        const API_URL = 'https://yinli.one/v1/chat/completions'; 
        const llmResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GEMINI_API_KEY}` },
            body: JSON.stringify({
                model: 'gemini-3.1-pro-preview', 
                messages: [{ role: 'user', content: llmPrompt }],
                temperature: 0.2, 
                response_format: { type: "json_object" }
            })
        });

        const apiData = await llmResponse.json();
        if (apiData.error) throw new Error(apiData.error.message || "请求大模型失败");

        const rawResult = apiData.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
        const llmQualitativeData = JSON.parse(rawResult);
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

        const { error: dbError } = await supabase.from('bazi_profiles').update({
            bazi_summary: combinedResultText,
            strong_weak: finalBaziDetail.strong_weak,
            favorable_elements: finalBaziDetail.favorable_gods.join(", "),
            unfavorable_elements: finalBaziDetail.unfavorable_gods.join(", "),
            yuanju_core: finalBaziDetail.yuanju_core,
            current_dayun: finalBaziDetail.current_dayun,
            current_liunian: finalBaziDetail.current_liunian,
            bazi_detail: finalBaziDetail,
            shensha: JSON.stringify(shenshaResult), 
            geju: geJu
        }).eq('id', promptData.profileId);

        if (dbError) console.error("数据库写入失败:", dbError);

        const outputPayload = { result: combinedResultText, bazi_detail: finalBaziDetail };
        memoryCache[cacheKey] = outputPayload;
        return res.status(200).json(outputPayload);

    } catch (error) {
        return res.status(error.message.includes("额度") ? 403 : 500).json({ error: error.message });
    }
}
