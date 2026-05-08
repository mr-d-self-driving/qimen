const { Solar } = require('lunar-javascript');
const { createClient } = require('@supabase/supabase-js'); // 引入 Supabase
const C = require('../lib/QimenConstants');
const U = require('../lib/QimenUtils');
const Calc = require('../lib/QimenCalculations');
const { setCorsHeaders } = require('./cors');

// ==========================================
// ⚡️ 云端内存缓存 (基于 时辰 + 问题)
// ==========================================
let memoryCache = {};

// ==========================================
// Supabase 服务端客户端（Service Key 绕过 RLS）
// ==========================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// 辅助函数：马星与空亡推导
function getMaXing(zhi) {
    if (["申", "子", "辰"].includes(zhi)) return "寅";
    if (["寅", "午", "戌"].includes(zhi)) return "申";
    if (["巳", "酉", "丑"].includes(zhi)) return "亥";
    if (["亥", "卯", "未"].includes(zhi)) return "巳";
    return "";
}

const maXingMap = { "寅": 6, "申": 2, "亥": 8, "巳": 0 }; 
const zhiToPalace = {
    "子": 7, "丑": 6, "寅": 6, "卯": 3, "辰": 0, "巳": 0,
    "午": 1, "未": 2, "申": 2, "酉": 5, "戌": 8, "亥": 8
};

function getKongIndices(kongStr) {
    let indices = [];
    for (let char of kongStr) {
        if (zhiToPalace[char] !== undefined) indices.push(zhiToPalace[char]);
    }
    return indices;
}

// ==========================================
// 🧠 新增：轻量级意图识别路由器 (Router)
// 目的：使用极速模型 (Flash) 秒级判断问题类型，并返回该领域的专属取用神规则
// ==========================================
async function detectIntentAndGetRules(question) {
    const API_KEY = process.env.GEMINI_API_KEY; 
    const API_URL = 'https://yinli.one/v1/chat/completions'; // 使用你的中转接口

    const routerPrompt = `你是一个奇门遁甲意图分类路由器。请分析用户提问，将其归入最匹配的单一分类。
重点提取核心诉求，忽略客套话。

可选分类：
1. "career_business" (事业职场、求职跳槽、项目推进、大客户谈判、创业开展)
2. "finance_wealth" (求财投资、收款催债、生意利润、财务预测、理财基金)
3. "relationship" (感情桃花、婚姻关系、合伙人纠纷、人际交往)
4. "health_action" (身体健康、疾病预测、高强度运动/比赛表现评估、寻医问药、手术吉凶)
5. "item_transaction" (找回失物、寻人、买卖二手物品、房屋租赁/交易、合同文书真伪判定)
6. "general" (日常出行、今日运势、时机选择、或者极其模糊无法归入以上分类的杂事)

用户提问："${question}"

严格要求：只返回 JSON 格式，不要包含任何 markdown 标记或其他解释文本。返回格式必须为：{"category": "分类英文名"}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}` 
            },
            body: JSON.stringify({
                model: 'gemini-3-flash-preview', 
                messages: [{ role: 'user', content: routerPrompt }],
                response_format: { type: "json_object" },
                temperature: 0.1 // 极低温度，保证分类稳定性
            })
        });

        if (!response.ok) throw new Error("Router API request failed");
        
        const apiData = await response.json();
        let resultText = apiData.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(resultText);
        const category = parsed.category || "general";


    // 根据分类挂载专属奇门规则
        let domainRules = "";
        switch (category) {
            case "career_business": // 事业职场、谈判创业
                domainRules = `
   - 【必看用神】：『值使门』(执行过程)、『日干』(我方)、『开门』(事业竞争)、『时干』(所问之事)、『天辅星/六合』(贵人合作)。
   - 【吉凶判定】：
     ① 值使门旺相=顺畅，休囚=迟滞需找破局时辰。
     ② 开门生助日干=谋事得力，克制日干=竞争大受制于人。
     ③ 杜门逢空亡=此路不通，旺相=有关卡但可破。休门在此主"保守等待"，若日干喜水反为吉。
     ④ 重点看贵人(天辅/六合)与日干关系。
   - 【融合输出】：请将竞争者压力、贵人方位等洞察，自然融入 JSON 的 \`analysis.yong_shen\` 与 \`advice.strategy\` 字段中。`;
                break;

            case "finance_wealth": // 求财、投资、生意
                domainRules = `
   - 【必看用神】：『生门』(财路入口)、『戊』(资本/主财)、『日干』(对财的把握)、『景门』(合同文书)。
   - 【吉凶判定】：
     ① 生门旺相+生助日干=财来找人(最吉)；戊落空亡=财气虚浮有变数。
     ② 若问投资：时干克日干=当心对方设局；死门临生门宫=财源有断裂风险。
     ③ 景门临玄武/腾蛇/空亡=合同有猫腻，文书存隐患。
     ④ 驿马星若冲动生门或戊，为资金加速/到账信号。
   - 【融合输出】：请将财源方位、破财风险、资金到账应期，自然融入 JSON 的 \`analysis.pattern\` 与 \`advice\` 字段中。`;
                break;

            case "relationship": // 感情、婚姻、人际
                domainRules = `
   - 【必看用神】：『日干』(我方)、『应宫』(对方状态，即日干对冲宫或所指之人)、『六合』(感情黏性)、『庚/丙』(阻力/桃花)。
   - 【吉凶判定】：
     ① 六合旺且生日干=对方有意；逢空亡/击刑=虚情假意或内有暗流。
     ② 应宫克日干=对方主导我方被动；日干克应宫=我方给对方压力大。
     ③ 庚若克六合或日干=有第三方介入或阻力；死门/玄武临应宫=对方有隐瞒。
   - 【融合输出】：感情问题需有同理心，请将对方真实心意、主要阻力，融入 JSON 的 \`analysis.yong_shen\`，并在 \`advice.strategy\` 中给出破冰建议。`;
                break;

            case "health_action": // 疾病、竞技、高强度运动
                domainRules = `
   - 【必看用神】：『天芮星』(疾病/隐患)、『伤门/白虎』(消耗/爆发力)、『日干』(生命力)。
   - 【核心辩证】(先判断是测病还是竞技)：
     ① [测病/手术]：天芮旺相或临死门为大凶，空亡防误诊；生门/开门生日干向好。
     ② [竞技/高强度训练]：逻辑反转！伤门旺相+白虎=极致爆发力，属大吉！天英星临日干=斗志旺盛。唯需警惕天芮临日干且空亡(带伤且虚耗)。
   - 【融合输出】：请明确判断场景极性，将风险部位(五行)与最佳行动时机，写入 JSON 的 \`analysis.dynamic_timing\` 中。`;
                break;

            case "item_transaction": // 买卖、合同、找失物
                domainRules = `
   - 【必看用神】：『日干』(买方/我方)、『时干』(卖方/物品)、『景门』(真实性)、『生门/死门』(盈亏)。
   - 【吉凶判定】：
     ① 日时生克定买卖主导权。
     ② 景门验证真伪(最核心)：逢空亡/玄武/腾蛇=信息虚浮、有隐瞒、货不对板。
     ③ 找失物：看时干落宫方位，逢空亡难找回，临马星则在移动中。
   - 【融合输出】：请将买卖主导权、物品真伪风险、盈亏评判，清晰地融入 JSON 的 \`analysis.tensor\` 与 \`advice.risk\` 中。`;
                break;

            default: // 日常出行与杂事
                domainRules = `
   - 【必看用神】：『值使门』(执行过程)、『日干』(自身状态)、『时干』(事情走向)、『驿马星』(加速信号)。
   - 【吉凶判定】：
     ① 值使旺相=行事顺利，休囚=宜守。日时相生为顺。
     ② 驿马被时辰冲动=出行/变动最佳窗口。
   - 【融合输出】：无需过度解读格局，请直接给出当天可执行的行动建议和时间窗口。`;
        }
        
        console.log(`[Router] 识别类别: ${category}`);
        return { domainRules, category };

    } catch (e) {
        console.warn("[Router] 意图识别失败，降级使用通用规则:", e.message);
        return { domainRules: ` 
   - 【必看用神】：以日干为求测人，时干为所问之事，值使门为执行过程。
   - 【吉凶判定】：对比日时生克综合判断。`, category: "general" };

    }
}


module.exports = async function handler(req, res) {
    // ============================================================================
    // 🛡️ 防线 1：CORS 跨域限制 (防别人克隆前端盗用)
    // ============================================================================
    if (setCorsHeaders(req, res, 'Content-Type, Authorization, X-Guest-Id')) return res.status(200).end();

    try {
        // ============================================================================
        // 🛡️ 防线 2：JWT 鉴权拦截 (防 Postman 脚本刷接口)
        // ============================================================================
        const authHeader = req.headers.authorization;
        const guestId = req.headers['x-guest-id'];
        let user = null;
        let userId = null;
        const isGuestRequest = !authHeader && typeof guestId === 'string' && guestId.startsWith('guest_');

        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user: authedUser }, error: authError } = await supabase.auth.getUser(token);
            if (authError || !authedUser) return res.status(401).json({ error: '登录状态已过期，请重新登录' });
            user = authedUser;
            userId = authedUser.id;
        } else if (!isGuestRequest) {
            return res.status(401).json({ error: '未登录，请先登录' });
        }
        
        // ============================================================================
        // 🛡️ 防线 3：3 次免费额度限制 + 👑 白名单特权
        // ============================================================================
        // 1. 获取白名单列表并转为小写 (兼容未配置环境变量的情况)
        const whitelistStr = process.env.WHITELIST_EMAILS || "";
        const whitelist = whitelistStr.split(',').map(email => email.trim().toLowerCase());
        const currentUserEmail = user?.email ? user.email.toLowerCase() : "";

        // 2. 判断当前用户是否在白名单中
        const isVIP = whitelist.includes(currentUserEmail);

        if (isGuestRequest) {
            console.log(`👤 访客账户 [${guestId}] 发起一次推演`);
        } else if (isVIP) {
            console.log(`👑 白名单特权账户 [${currentUserEmail}] 发起推演，免除额度限制`);
        } else {
            // 如果不是 VIP，才去数据库查他算过几次
            const { count, error: countError } = await supabase
                .from('qimen_records') // 注意：如果是 bazi.js，这里表名是 bazi_profiles；fortune-daily.js 是 fortune_cache
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            if (!countError && count >= 3) {
                return res.status(403).json({ error: "您的 3 次免费天机推演额度已用尽" });
            }
        }


        // 2. 获取用户提问
        const userQuestion = req.body.question || "当前局势吉凶如何？";

        // 3. 时间校准 (强制转换为东八区北京时间)
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const bjTime = new Date(utc + (3600000 * 8));

        const year = bjTime.getFullYear();
        const month = bjTime.getMonth() + 1; 
        const day = bjTime.getDate();
        const hour = bjTime.getHours();
        const minute = bjTime.getMinutes();

        // 4. 起局推演
        const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
        const lunar = solar.getLunar();
        const ganzhiHour = lunar.getTimeInGanZhi();
        const ganzhiDay = lunar.getDayInGanZhi();
        
        // 获取前端传来的八字信息
        const baziInfo = req.body.baziInfo || "未提供八字信息";

        // 缓存校验
        const baziHash = baziInfo === "未提供八字信息" ? "NoBazi" : baziInfo.substring(0, 15);
        const cacheKey = `${year}-${month}-${day}-${ganzhiHour}-${userQuestion}-${baziHash}`;
        if (memoryCache[cacheKey]) {
            console.log("⚡️ 命中云端时辰缓存！直接返回。");
            return res.status(200).json(memoryCache[cacheKey]);
        }

        const juResult = Calc.calculateJuByChaiBu(solar, C.JIEQI_JUSHU, C.YUAN_NAMES);
        const xunHead = U.getXunHead(ganzhiHour);
        const fuShou = U.getFuShou(xunHead);
        const flyStep = U.calculateFlyStep(xunHead, ganzhiHour);
        const rawTianGan = U.extractTianGan(ganzhiHour);
        const tianGan = U.resolveJiaHiding(rawTianGan, fuShou);

        const diPan = Calc.getDiPan(juResult.isYang, juResult.gameNumber);
        const zhiFuStar = Calc.getZhiFuStar(fuShou, diPan);
        const nineStars = Calc.calculateNineStars(zhiFuStar, tianGan, diPan);
        const zhiShiDoor = Calc.getZhiShiDoor(fuShou, diPan);
        const eightDoors = Calc.calculateEightDoors(juResult.isYang, zhiShiDoor, flyStep, fuShou, diPan);
        const eightGods = Calc.calculateEightGods(juResult.isYang, tianGan, diPan);
        const tianPanGan = Calc.calculateTianPan(juResult.isYang, tianGan, fuShou, diPan);

        const dayZhi = U.extractDiZhi(ganzhiDay);
        const hourZhi = U.extractDiZhi(ganzhiHour);
        const dayMa = getMaXing(dayZhi);
        const hourMa = getMaXing(hourZhi);
        const dayKongObj = lunar.getDayXunKong(); 
        const hourKongObj = lunar.getTimeXunKong();
        const dayKongIndices = getKongIndices(dayKongObj);
        const hourKongIndices = getKongIndices(hourKongObj);
        const tianRuiIndex = nineStars.indexOf("天芮");
        const centerEarthStem = diPan[4]; 

        // 5. 拼装 Prompt 九宫文本
        const palaceNames = ["巽", "离", "坤", "震", "中", "兑", "艮", "坎", "乾"];
        const palaceNumbers = [4, 9, 2, 3, 5, 7, 8, 1, 6];
        let palacesText = "";

        for (let i = 0; i < 9; i++) {
            let pName = `${palaceNames[i]}${palaceNumbers[i]}宫`;
            if (i === 4) {
                palacesText += `${pName}信息开始：地盘天干：${diPan[i]}，${pName}信息结束。\n`;
                continue;
            }
            let extra = "";
            if (dayKongIndices.includes(i) || hourKongIndices.includes(i)) extra += "本宫占空亡；";
            if (i === maXingMap[dayMa] || i === maXingMap[hourMa]) extra += "本宫有马星；";
            
            let jiText = "";
            if (i === 2) jiText = `；地盘寄干：${centerEarthStem}`;
            if (i === tianRuiIndex) jiText += `；天盘寄干：${centerEarthStem}`;

            palacesText += `${pName}信息开始：九星：${nineStars[i]}；八神：${eightGods[i]}；八门：${eightDoors[i]}；天盘天干：${tianPanGan[i]}；地盘天干：${diPan[i]}${jiText}；${extra}${pName}信息结束。\n`;
        }

        const timestamp_solar = `${year}年${month}月${day}日 ${hour}:${minute}`;
        const timestamp_lunar = `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
        const qimen_structure = `${juResult.yinYang}遁${juResult.gameNumber}局`;

        // ==========================================
        // 🚀 核心改动点：在这里调用 Router，获取动态规则
        // ==========================================
        const { domainRules: dynamicDomainRules, category: detectedCategory } = await detectIntentAndGetRules(userQuestion);

        const finalPrompt = `你是一位精通“时家奇门拆补转盘法”的奇门遁甲预测大师。
起局时间：${timestamp_solar}(${timestamp_lunar})。
干支四柱：${lunar.getYearInGanZhi()} ${lunar.getMonthInGanZhi()} ${ganzhiDay} ${ganzhiHour}。${qimen_structure}。${juResult.jieQiName} ${juResult.yuanName} ；
旬首:${xunHead}。值符:${zhiFuStar}。值使:${zhiShiDoor}。空亡：日空${dayKongObj} 时空${hourKongObj}。驿马星：日马${dayMa} 时马${hourMa}。
${palacesText}

求测人命理信息(可选，若为空表示未提供)
${baziInfo}

**【核心推演逻辑】**
1. **精准定用神（基于系统路由判定）**：${dynamicDomainRules}
   - **补充限制**：如果上文提供了“求测人八字/命理信息”，请务必提取其出生年的天干作为“年命”落宫，结合日干落宫综合判断；若未提供，直接以“日干”代表求测人。

2. **断吉凶（注重静态盘面）**：
   - 分析五行生克、吉凶格、空亡（能量减半/待填实）、马星（变动/加速），对比核心用神宫位的生克关系。
   - ① 先列出所有"凶象/警示信号"（空亡、伏吟、死门、凶星、击刑等），如实呈现，不得美化。
   - ② 再分析吉象与支撑力。
   - ③ **禁止：**不得因求测者问题为正向就盲目倾向高分。

3. **抓应期与动态破局（核心！必须执行）**：
   - **绝不能死守静态凶象！** 如果盘面出现“杜门(堵塞)”、“九地(慢)”、“空亡”等阻碍，必须向后推演当天的**十二时辰**。
   - 寻找破局点：是否有某个时辰的五行**克制了忌神**（如金克木劈开杜门）？是否有**驿马星**被特定时辰引动（冲动/传送）？是否空亡宫位到了某个时辰被**填实或冲动**？
   - 如果时辰动态能冲破静态阻碍，说明事情“先难后易”或“即将发生”，必须在综合评分和结论中体现这一转机。

4. **给建议（心理关怀的边界）**：
   - 在 advice 中给予有温度的行动建议。真实的关怀 = 提前预警风险 + 给出应对方案（包含如何利用破局时辰），而非回避风险。

**【Output Format (JSON Schema)】**
请严格按照以下 JSON 结构返回数据：
{
  "summary": {
    "title": "短标题 (如: 大客户谈判预测)",
    "conclusion": "核心结论 (如: ✅ 极大概率成功)",
    "score": 85,
    "score_basis": {
      "positive_signals": ["列举支撑高分的吉象，每条需对应具体宫位"],
      "negative_signals": ["列举压低分数的凶象，每条需对应具体宫位"],
      "score_logic": "简述吉凶权重如何得出此分数"
    },
    "keyword": "关键信号 (如: 财气通门户，马星催动)"
  },
  "analysis": {
    "tensor": "时空能量 (如: 阳遁三局，金水相生)",
    "yong_shen": "用神分析 (详细说明你提取了哪些用神及其生克状态)",
    "bazi_insight": "年命/八字参考 (如提供了八字，请简述年命落宫吉凶及其对大局的影响；若未提供八字，返回空即可)",
    "pattern": "特殊格局 (如: 癸+己华盖地户，需防文书错漏)",
    "god_help": "神助 (如: 临九地，宜长线发展)",
    "dynamic_timing": "动态应期推演 (极其重要！详细说明当天的哪个时辰/未来的哪个日子能冲破阻碍或填实空亡，促成事情发展)"
  },
  "advice": {
    "strategy": [
      "策略1", "策略2"
    ],
    "risk": "避坑指南",
    "lucky_tips": {
      "direction": "有利方位",
      "time": "有利时间",
      "action": "助运行行为"
    }
  }
}

务必做到有根据、有理论支持，分析的详细还要体会我问问题的心理潜在因素，照顾我的心理感受。你先分析，我下面要问你问题了。
问题：${userQuestion}`;

        // 6. 调用主力大模型 
        const API_KEY = process.env.GEMINI_API_KEY; 
        const API_URL = 'https://yinli.one/v1/chat/completions'; 
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); 

        let apiData;
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${API_KEY}` 
                },
                body: JSON.stringify({
                    model: 'gemini-3.1-pro-preview', // 深度推演的主力模型
                    messages: [{ role: 'user', content: finalPrompt }],
                    response_format: { type: "json_object" },
                    temperature: 0.7
                }),
                signal: controller.signal 
            });

            clearTimeout(timeoutId); 

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`LLM接口返回错误 (${response.status}): ${errText.substring(0, 100)}`);
            }

            apiData = await response.json();
            if (apiData.error) throw new Error(apiData.error.message || JSON.stringify(apiData.error));

        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                throw new Error("大模型接口处理超时 (超60秒未响应)，请重试。");
            }
            throw fetchError;
        }

        // 解析返回数据
        let textResult = apiData.choices[0].message.content;
        textResult = textResult.replace(/```json/g, "").replace(/```/g, "").trim();
        const aiJsonData = JSON.parse(textResult);

        // 7. 组装前端超级 JSON
        let qimenPalaces = [];
        for (let i = 0; i < 9; i++) {
            if (i === 4) {
                qimenPalaces.push({ name: `${palaceNames[i]}${palaceNumbers[i]}宫`, is_center: true, earth: diPan[i], index: i });
            } else {
                qimenPalaces.push({
                    star: nineStars[i], sky: tianPanGan[i], ji_sky: (i === tianRuiIndex) ? centerEarthStem : "",
                    door: eightDoors[i], god: eightGods[i], earth: diPan[i], ji_earth: (i === 2) ? centerEarthStem : "",
                    kong_wang: { day: dayKongIndices.includes(i), is_kong: dayKongIndices.includes(i) || hourKongIndices.includes(i), hour: hourKongIndices.includes(i) },
                    ma_xing: { day: i === maXingMap[dayMa], has_ma: i === maXingMap[dayMa] || i === maXingMap[hourMa], hour: i === maXingMap[hourMa] },
                    name: `${palaceNames[i]}${palaceNumbers[i]}宫`, index: i
                });
            }
        }

        const finalOutput = {
            ...aiJsonData,
            question: userQuestion,
            category: detectedCategory,
            qimen_data: {
                status: "success",
                pillars: { hour: ganzhiHour, month: lunar.getMonthInGanZhi(), day: ganzhiDay, year: lunar.getYearInGanZhi() },
                timestamp: { solar: timestamp_solar, lunar: timestamp_lunar },
                ju_info: { zhi_fu: zhiFuStar, zhi_fu_palace: `落${palaceNames[nineStars.indexOf(zhiFuStar)]}${palaceNumbers[nineStars.indexOf(zhiFuStar)]}宫`, zhi_shi_palace: `落${palaceNames[eightDoors.indexOf(zhiShiDoor)]}${palaceNumbers[eightDoors.indexOf(zhiShiDoor)]}宫`, jieqi: juResult.jieQiName, yuan: juResult.yuanName, zhi_shi: zhiShiDoor, name: qimen_structure, xun_shou: xunHead },
                auxiliary: { ma_xing: { day: dayMa, hour: hourMa }, kong_wang: { day: dayKongObj, hour: hourKongObj } },
                palaces: qimenPalaces
            }
        };

        memoryCache[cacheKey] = finalOutput;
        return res.status(200).json(finalOutput);

    } catch (error) {
        console.error(error);
        return res.status(error.message && error.message.includes("额度") ? 403 : 500).json({ error: "奇门引擎推演失败", details: error.message });
    }
}
