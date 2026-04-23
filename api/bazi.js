const { Solar, Lunar } = require('lunar-javascript');
const { createClient } = require('@supabase/supabase-js');
const { BaziRuleEngine, getDiShi, getShen } = require('../lib/BaziRuleEngine');

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
        tianYi: { 甲: '丑未', 乙: '子申', 丙: '亥酉', 丁: '亥酉', 戊: '丑未', 己: '子申', 庚: '寅午', 辛: '寅午', 壬: '卯巳', 癸: '卯巳' },
        wenChang: { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' },
        yangRen: { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' },
        luShen: { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' },
        yiMa: { 申: '寅', 子: '寅', 辰: '寅', 寅: '申', 午: '申', 戌: '申', 亥: '巳', 卯: '巳', 未: '巳', 巳: '亥', 酉: '亥', 丑: '亥' },
        taoHua: { 申: '酉', 子: '酉', 辰: '酉', 寅: '卯', 午: '卯', 戌: '卯', 亥: '子', 卯: '子', 未: '子', 巳: '午', 酉: '午', 丑: '午' },
        huaGai: { 申: '辰', 子: '辰', 辰: '辰', 寅: '戌', 午: '戌', 戌: '戌', 亥: '未', 卯: '未', 未: '未', 巳: '丑', 酉: '丑', 丑: '丑' },
        jiangXing: { 申: '子', 子: '子', 辰: '子', 寅: '午', 午: '午', 戌: '午', 亥: '卯', 卯: '卯', 未: '卯', 巳: '酉', 酉: '酉', 丑: '酉' },
        guChen: { 寅: '巳', 卯: '巳', 辰: '巳', 巳: '申', 午: '申', 未: '申', 申: '亥', 酉: '亥', 戌: '亥', 亥: '寅', 子: '寅', 丑: '寅' },
        guaSu: { 寅: '丑', 卯: '丑', 辰: '丑', 巳: '辰', 午: '辰', 未: '辰', 申: '未', 酉: '未', 戌: '未', 亥: '戌', 子: '戌', 丑: '戌' },
        yueDe: { 寅: '丙', 午: '丙', 戌: '丙', 申: '壬', 子: '壬', 辰: '壬', 亥: '甲', 卯: '甲', 未: '甲', 巳: '庚', 酉: '庚', 丑: '庚' },
        tianDe: { 寅: '丁', 卯: '申', 辰: '壬', 巳: '辛', 午: '亥', 未: '甲', 申: '癸', 酉: '寅', 戌: '丙', 亥: '乙', 子: '巳', 丑: '庚' }
    },
    // 前端迁移过来的数据常量
    NAYIN: { "甲子": "海中金", "乙丑": "海中金", "丙寅": "炉中火", "丁卯": "炉中火", "戊辰": "大林木", "己巳": "大林木", "庚午": "路旁土", "辛未": "路旁土", "壬申": "剑锋金", "癸酉": "剑锋金", "甲戌": "山头火", "乙亥": "山头火", "丙子": "涧下水", "丁丑": "涧下水", "戊寅": "城头土", "己卯": "城头土", "庚辰": "白蜡金", "辛巳": "白蜡金", "壬午": "杨柳木", "癸未": "杨柳木", "甲申": "泉中水", "乙酉": "泉中水", "丙戌": "屋上土", "丁亥": "屋上土", "戊子": "霹雳火", "己丑": "霹雳火", "庚寅": "松柏木", "辛卯": "松柏木", "壬辰": "长流水", "癸巳": "长流水", "甲午": "沙中金", "乙未": "沙中金", "丙申": "山下火", "丁酉": "山下火", "戊戌": "平地木", "己亥": "平地木", "庚子": "壁上土", "辛丑": "壁上土", "壬寅": "金箔金", "癸卯": "金箔金", "甲辰": "覆灯火", "乙巳": "覆灯火", "丙午": "天河水", "丁未": "天河水", "戊申": "大驿土", "己酉": "大驿土", "庚戌": "钗钏金", "辛亥": "钗钏金", "壬子": "桑柘木", "癸丑": "桑柘木", "甲寅": "大溪水", "乙卯": "大溪水", "丙辰": "沙中土", "丁巳": "沙中土", "戊午": "天上火", "己未": "天上火", "庚申": "石榴木", "辛酉": "石榴木", "壬戌": "大海水", "癸亥": "大海水" },
    ZHI_HIDE: { "子": ["癸"], "丑": ["己", "癸", "辛"], "寅": ["甲", "丙", "戊"], "卯": ["乙"], "辰": ["戊", "乙", "癸"], "巳": ["丙", "庚", "戊"], "午": ["丁", "己"], "未": ["己", "丁", "乙"], "申": ["庚", "壬", "戊"], "酉": ["辛"], "戌": ["戊", "辛", "丁"], "亥": ["壬", "甲"] },
    SHI_ER: ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"],
    CHANG_SHENG_START: { "甲": 11, "丙": 2, "戊": 2, "庚": 5, "壬": 8, "乙": 6, "丁": 9, "己": 9, "辛": 0, "癸": 3 },
    ZHI_INDEX: { "子": 0, "丑": 1, "寅": 2, "卯": 3, "辰": 4, "巳": 5, "午": 6, "未": 7, "申": 8, "酉": 9, "戌": 10, "亥": 11 },

    // 独立神煞数组获取（供前端直接遍历渲染）
    getShenShaArray: function (targetZhi, dayGan, yearZhi, dayZhi) {
        if (!targetZhi) return [];
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
    getDiShi: function (gan, zhi) {
        if (!gan || !zhi || this.CHANG_SHENG_START[gan] === undefined || this.ZHI_INDEX[zhi] === undefined) return '-';
        let start = this.CHANG_SHENG_START[gan], zIndex = this.ZHI_INDEX[zhi], isYang = ["甲", "丙", "戊", "庚", "壬"].includes(gan);
        return this.SHI_ER[isYang ? (zIndex - start + 12) % 12 : (start - zIndex + 12) % 12];
    },
    calculateShenSha: function (bazi) {
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
    extractSpecialPatterns: function (bazi) {
        const patterns = [];
        const dayPillar = bazi.day.join('');
        const timePillar = bazi.time.join('');
        const allZhis = [bazi.year[1], bazi.month[1], bazi.day[1], bazi.time[1]];
        if (['庚辰', '庚戌', '壬辰', '戊戌'].includes(dayPillar)) patterns.push("【魁罡】重叠逢之主大贵。");
        if (['乙丑', '己巳', '癸酉'].includes(timePillar)) patterns.push("【金神】威猛刚烈，逢火乡发富贵。");
        if (allZhis.includes('辰') && allZhis.includes('巳')) patterns.push("【地网】宜遵纪守法。");
        if (allZhis.includes('戌') && allZhis.includes('亥')) patterns.push("【天罗】易怀才不遇。");
        const sheng = allZhis.filter(z => ['寅', '申', '巳', '亥'].includes(z));
        const bai = allZhis.filter(z => ['子', '午', '卯', '酉'].includes(z));
        const ku = allZhis.filter(z => ['辰', '戌', '丑', '未'].includes(z));
        if (sheng.length >= 3) patterns.push("【四生局】寅申巳亥多，奔波变动大。");
        if (bai.length >= 3) patterns.push("【四败局】子午卯酉多，异性缘极佳。");
        if (ku.length >= 3) patterns.push("【四库局】辰戌丑未多，稳重藏锋芒。");
        return patterns;
    },
    ShiShen: {
        '甲': { '甲': '比', '乙': '劫', '丙': '食', '丁': '伤', '戊': '才', '己': '财', '庚': '杀', '辛': '官', '壬': '枭', '癸': '印' },
        '乙': { '甲': '劫', '乙': '比', '丙': '伤', '丁': '食', '戊': '财', '己': '才', '庚': '官', '辛': '杀', '壬': '印', '癸': '枭' },
        '丙': { '甲': '枭', '乙': '印', '丙': '比', '丁': '劫', '戊': '食', '己': '伤', '庚': '才', '辛': '财', '壬': '杀', '癸': '官' },
        '丁': { '甲': '印', '乙': '枭', '丙': '劫', '丁': '比', '戊': '伤', '己': '食', '庚': '财', '辛': '才', '壬': '官', '癸': '杀' },
        '戊': { '甲': '杀', '乙': '官', '丙': '枭', '丁': '印', '戊': '比', '己': '劫', '庚': '食', '辛': '伤', '壬': '才', '癸': '财' },
        '己': { '甲': '官', '乙': '杀', '丙': '印', '丁': '枭', '戊': '劫', '己': '比', '庚': '伤', '辛': '食', '壬': '财', '癸': '才' },
        '庚': { '甲': '才', '乙': '财', '丙': '杀', '丁': '官', '戊': '枭', '己': '印', '庚': '比', '辛': '劫', '壬': '食', '癸': '伤' },
        '辛': { '甲': '财', '乙': '才', '丙': '官', '丁': '杀', '戊': '印', '己': '枭', '庚': '劫', '辛': '比', '壬': '伤', '癸': '食' },
        '壬': { '甲': '食', '乙': '伤', '丙': '才', '丁': '财', '戊': '杀', '己': '官', '庚': '枭', '辛': '印', '壬': '比', '癸': '劫' },
        '癸': { '甲': '伤', '乙': '食', '丙': '财', '丁': '才', '戊': '官', '己': '杀', '庚': '印', '辛': '枭', '壬': '劫', '癸': '比' }
    },
    ZhiMainGan: { '子': '癸', '丑': '己', '寅': '甲', '卯': '乙', '辰': '戊', '巳': '丙', '午': '丁', '未': '己', '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬' },
    getGeJu: function (bazi) {
        const dayGan = bazi.day[0], monthZhi = bazi.month[1];
        const jianLuMap = { '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳', '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子' };
        const yueRenMap = { '甲': '卯', '庚': '酉', '壬': '子' };
        if (jianLuMap[dayGan] === monthZhi) return "建禄格";
        if (yueRenMap[dayGan] === monthZhi) return "月刃格";
        const mainGan = this.ZhiMainGan[monthZhi];
        const gejuName = this.ShiShen[dayGan][mainGan];
        const formatMap = { '官': '正官格', '杀': '七杀格', '财': '正财格', '才': '偏财格', '食': '食神格', '伤': '伤官格', '印': '正印格', '枭': '偏印格', '比': '比肩格', '劫': '劫财格' };
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
            nayin: BaziEngine.NAYIN[gan + zhi] || '-',
            is_kong: xunKong.includes(zhi),
            shensha: BaziEngine.getShenShaArray(zhi, dayGan, yearZhi, dayZhi)
        });

        const pillarsData = [
            buildPillar('年', baZi.getYearGan(), baZi.getYearZhi(), baZi.getYearShiShenGan()),
            buildPillar('月', baZi.getMonthGan(), baZi.getMonthZhi(), baZi.getMonthShiShenGan()),
            buildPillar('日', baZi.getDayGan(), baZi.getDayZhi(), isMale ? '元男' : '元女'),
            buildPillar('时', baZi.getTimeGan(), baZi.getTimeZhi(), baZi.getTimeShiShenGan())
        ];

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        // ── 1. 大运列表 (10柱) ──
        const daYunList = yun.getDaYun().slice(0, 10).map(dy => {
            const gan = dy.getGanZhi().charAt(0);
            const zhi = dy.getGanZhi().charAt(1);
            return {
                start_year: dy.getStartYear(),
                start_age: dy.getStartAge(),
                gan: gan,
                zhi: zhi,
                shi_shen: getShen(dayGan, gan)
            };
        });

        // ── 2. 流年列表 (取当前所在大运的 10 年) ──
        const currentDaYunObj = yun.getDaYun().find(dy => currentYear >= dy.getStartYear() && currentYear <= dy.getEndYear()) || yun.getDaYun()[0];
        const liuNianList = currentDaYunObj.getLiuNian().map(ln => {
            const gan = ln.getGanZhi().charAt(0);
            const zhi = ln.getGanZhi().charAt(1);
            return {
                year: ln.getYear(),
                gan: gan,
                zhi: zhi,
                shi_shen: getShen(dayGan, gan)
            };
        });

        // ── 3. 流月列表 (取当前年份的 12 个月) ──
        let currentLiuNianObj = currentDaYunObj.getLiuNian().find(ln => ln.getYear() === currentYear);
        if (!currentLiuNianObj) {
            // 如果不在当前大运，尝试从整个运势找流年
            const allDaYuns = yun.getDaYun();
            for (const dy of allDaYuns) {
                const ln = dy.getLiuNian().find(l => l.getYear() === currentYear);
                if (ln) { currentLiuNianObj = ln; break; }
            }
        }

        const liuYueList = currentLiuNianObj ? currentLiuNianObj.getLiuYue().map(ly => {
            const gan = ly.getGanZhi().charAt(0);
            const zhi = ly.getGanZhi().charAt(1);
            return {
                month_name: ly.getMonthInChinese() + '月',
                gan: gan,
                zhi: zhi,
                shi_shen: getShen(dayGan, gan)
            };
        }) : [];

        // ── 4. 当前状态柱 (供 UI 高亮) ──
        const currentLiuNianGan = currentLiuNianObj ? currentLiuNianObj.getGanZhi().charAt(0) : "未知";
        const currentLiuNianZhi = currentLiuNianObj ? currentLiuNianObj.getGanZhi().charAt(1) : "未知";

        const currentDaYunData = buildPillar('大运', currentDaYunObj.getGanZhi().charAt(0), currentDaYunObj.getGanZhi().charAt(1), '大运');
        const currentLiuNianData = buildPillar('流年', currentLiuNianGan, currentLiuNianZhi, '流年');

        const objectiveBaziData = {
            base_info: { qi_yun: `出生后${yun.getStartYear()}年${yun.getStartMonth()}月${yun.getStartDay()}天起运`, ge_ju: geJu, special_patterns: specialPatterns },
            matrix: {
                pillars: pillarsData,
                dayun_list: daYunList,
                liunian_list: liuNianList,
                liuyue_list: liuYueList,
                current_dayun: currentDaYunData,
                current_liunian: currentLiuNianData
            },
            pillars: {
                ganzhi: { year: baZi.getYear(), month: baZi.getMonth(), day: baZi.getDay(), time: baZi.getTime() },
                main_stars: { year: baZi.getYearShiShenGan(), month: baZi.getMonthShiShenGan(), day: "日主", time: baZi.getTimeShiShenGan() },
                shensha: shenshaResult
            }
        };

        // ==================== 3. 本地规则引擎推演（无 LLM）====================
        // ── 提取四柱数组（供规则引擎使用）──
        const gansArr = [baZi.getYearGan(), baZi.getMonthGan(), baZi.getDayGan(), baZi.getTimeGan()];
        const zhisArr = [baZi.getYearZhi(), baZi.getMonthZhi(), baZi.getDayZhi(), baZi.getTimeZhi()];
        const dayGanVal = gansArr[2], monthZhiVal2 = zhisArr[1];

        // ── 日主强弱 ──
        const strengthResult = BaziRuleEngine.calculateStrength(dayGanVal, gansArr, zhisArr);

        // ── 喜忌神 ──
        const favorableResult = BaziRuleEngine.getFavorableUnfavorable(
            dayGanVal, monthZhiVal2, geJu, strengthResult, zhisArr, gansArr
        );

        // ── 格局断语 ──
        const rulePatterns = BaziRuleEngine.extractAdvancedPatterns(
            dayGanVal, gansArr, zhisArr, strengthResult.allShens, geJu, strengthResult
        );

        // ── 扩展神煞（覆盖原有简版）──
        const shenshaFull = BaziRuleEngine.calculateShenShaFull(baziObj);

        // ── 大运流年文案 (规则引擎硬核版) ──
        const currentDayunGan = currentDaYunObj ? currentDaYunObj.getGanZhi().charAt(0) : '';
        const currentDayunZhi = currentDaYunObj ? currentDaYunObj.getGanZhi().charAt(1) : '';

        // ── 结构化合克关系 (用于 UI 连线图) ──
        const relationGans = [...gansArr, currentDayunGan, currentLiuNianGan];
        const relationZhis = [...zhisArr, currentDayunZhi, currentLiuNianZhi];
        const interactions = BaziRuleEngine.calculateInteractions(relationZhis, relationGans);
        const engineYuanjuCore = BaziRuleEngine.buildYuanjuCore(
            dayGanVal, monthZhiVal2, gansArr, zhisArr, geJu,
            strengthResult, favorableResult, rulePatterns
        );
        const engineCurrentDayun = BaziRuleEngine.buildCurrentDayun(
            currentDayunGan, currentDayunZhi, dayGanVal, zhisArr, gansArr
        );
        const engineCurrentLiunian = BaziRuleEngine.buildCurrentLiunian(
            currentLiuNianGan, currentLiuNianZhi, currentDayunGan, currentDayunZhi, dayGanVal, zhisArr
        );

        // ==================== 4. 请求 LLM 进行断语生成 (前端展示版) ====================
        const llmPrompt = `你是一位精通子平八字与传统命理学的现代高级命理大师。
请基于下方提供的精确命理数据，为用户进行详尽、专业、且符合现代人语境的八字推演。

【命理客观数据】
• 性别：${promptData.gender}
• 八字原局：${baZi.getYear()} ${baZi.getMonth()} ${baZi.getDay()} ${baZi.getTime()}
• 命主格局：${geJu}
• 核心神煞：年柱[${shenshaFull.year}] 月柱[${shenshaFull.month}] 日柱[${shenshaFull.day}] 时柱[${shenshaFull.time}]
• 命局特征（本地规则推演引擎结果，供参考）：${rulePatterns.length > 0 ? rulePatterns.join(' | ') : '无'}
• 当前大运：${currentDaYunObj ? currentDaYunObj.getGanZhi() : ''}
• 当前流年：${currentLiuNianGan}${currentLiuNianZhi}年

【推演任务】
1. 【原局深度评析】：结合格局、神煞、五行流通，评价命主的性格特质、事业财运潜力等。
2. 【当前大运解析】：分析当前十步大运对原局的影响，侧重点在何处（如：利求财、防破财等）。
3. 【当前流年简评】：结合流年干支给出今年的具体运势研判。

必须且仅输出纯 JSON 字符串对象，格式严格如下：
{
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

        let llmQualitativeData = { yuanju_core: engineYuanjuCore, current_dayun: engineCurrentDayun, current_liunian: engineCurrentLiunian };
        try {
            const rawText = await llmResponse.text();
            if (!llmResponse.ok) {
                console.error("LLM API Error Status:", llmResponse.status, rawText);
            } else {
                const apiData = JSON.parse(rawText);
                if (apiData.error) throw new Error(apiData.error.message);
                if (apiData.choices && apiData.choices[0] && apiData.choices[0].message) {
                    const rawResult = apiData.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
                    llmQualitativeData = JSON.parse(rawResult);
                }
            }
        } catch (e) {
            console.error("LLM API 解析失败，降级使用本地规则引擎结果:", e);
        }

        const combinedResultText = `【命造格局】：${geJu}\n\n原局核心：\n${llmQualitativeData.yuanju_core}\n\n当前大运：\n${llmQualitativeData.current_dayun}\n\n当前流年：\n${llmQualitativeData.current_liunian}`;

        const finalBaziDetail = {
            ...objectiveBaziData,
            strong_weak: strengthResult.strongWeak,
            favorable_gods: favorableResult.core_shens.favorable,
            unfavorable_gods: favorableResult.core_shens.unfavorable,
            // LLM 版放在第一层，供旧代码读取
            yuanju_core: llmQualitativeData.yuanju_core,
            current_dayun: llmQualitativeData.current_dayun,
            current_liunian: llmQualitativeData.current_liunian,
            interactions: interactions,
            // Rule Engine 版放在这里供后端使用
            engine_yuanju: engineYuanjuCore,
            engine_dayun: engineCurrentDayun,
            engine_liunian: engineCurrentLiunian
        };

        // ── 命理基底字段（供 calculateDailyScore 纯 JS 算分引擎使用）──
        const riZhu = baZi.getDay();         // 完整日柱，如 "甲子"
        const dayZhiVal = baZi.getDayZhi();      // 日支
        const yearZhiVal = baZi.getYearZhi();     // 年支
        const monthZhiVal = baZi.getMonthZhi();   // 月支

        const { error: dbError } = await supabase.from('bazi_profiles').update({
            bazi_summary: combinedResultText,
            strong_weak: finalBaziDetail.strong_weak,
            favorable_elements: finalBaziDetail.favorable_gods,
            unfavorable_elements: finalBaziDetail.unfavorable_gods,
            yuanju_core: finalBaziDetail.yuanju_core,
            current_dayun: finalBaziDetail.current_dayun,
            current_liunian: finalBaziDetail.current_liunian,
            bazi_detail: finalBaziDetail,
            shensha: JSON.stringify(shenshaFull),
            geju: geJu,
            ri_zhu: riZhu,
            day_zhi: dayZhiVal,
            year_zhi: yearZhiVal,
            month_zhi: monthZhiVal,
        }).eq('id', promptData.profileId);

        if (dbError) console.error("数据库写入失败:", dbError);

        const outputPayload = { result: combinedResultText, bazi_detail: finalBaziDetail };
        memoryCache[cacheKey] = outputPayload;
        return res.status(200).json(outputPayload);

    } catch (error) {
        return res.status(error.message.includes("额度") ? 403 : 500).json({ error: error.message });
    }
}
