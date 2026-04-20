const { Solar, Lunar } = require('lunar-javascript');

// 内存缓存
const memoryCache = {};

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { promptData } = req.body;
        if (!promptData) return res.status(400).json({ error: "缺少八字数据" });

        const cacheKey = `${promptData.baziStr}_${promptData.gender}_${promptData.daYunStr}`;
        if (memoryCache[cacheKey]) {
            console.log("⚡️ 命中混合架构缓存！直接返回。");
            return res.status(200).json(memoryCache[cacheKey]);
        }

        // ============================================================================
        // 🌟 第一步：完全依靠 lunar-javascript 在本地生成所有客观维度数据
        // ============================================================================
        // 1. 解析出生时间，构建八字对象
        let solarObj, lunarObj, baZi;
        const dateMatch = promptData.birthStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        const timeMatch = promptData.birthStr.match(/(\d{1,2}):(\d{1,2})/);
        if (dateMatch) {
            const y = parseInt(dateMatch[1]), m = parseInt(dateMatch[2]), d = parseInt(dateMatch[3]);
            const h = timeMatch ? parseInt(timeMatch[1]) : 12;
            const min = timeMatch ? parseInt(timeMatch[2]) : 0;
            solarObj = Solar.fromYmdHms(y, m, d, h, min, 0);
            lunarObj = solarObj.getLunar();
            baZi = lunarObj.getEightChar();
        } else {
            throw new Error("出生日期格式解析失败");
        }

        // 2. 当前流年与大运提取
        const nowLunar = Solar.fromDate(new Date()).getLunar();
        const currentLiuNianGan = nowLunar.getYearGan();
        const currentLiuNianZhi = nowLunar.getYearZhi();
        
        let currentDaYunGan = "未知", currentDaYunZhi = "未知";
        const dyMatch = promptData.daYunStr.match(/^([甲乙丙丁戊己庚辛壬癸])([子丑寅卯辰巳午未申酉戌亥])/);
        if(dyMatch) {
            currentDaYunGan = dyMatch[1];
            currentDaYunZhi = dyMatch[2];
        }

        // 提取日主天干，用于计算大运流年十神
        const dayGan = baZi.getDayGan();
        const getShiShen = (gan) => {
            // lunar-javascript 内部十神映射逻辑 (简化版引用)
            // 这里为了确保独立运算，可以直接调用 lunar-javascript 获取，但对于大运流年，我们可以借助原局日干
            // 简单起见，利用 lunar 自身能力或预设逻辑：
            const bzTemp = solarObj.getLunar().getEightChar();
            return bzTemp.getShiShenGan() || "未知"; 
        };

        // 3. 组装客观数据大字典 (剔除不存在的函数，使用绝对安全的原生方法)
        const objectiveBaziData = {
            // [1-4] 四柱
            year_pillar: baZi.getYear(),
            month_pillar: baZi.getMonth(),
            day_pillar: baZi.getDay(),
            time_pillar: baZi.getTime(),
            
            // [6-9] 四柱藏干 (lunar原生返回数组)
            hidden_stems: {
                year: baZi.getYearHideGan(), 
                month: baZi.getMonthHideGan(),
                day: baZi.getDayHideGan(),
                time: baZi.getTimeHideGan()
            },

            // [10-13] 四柱十神 (lunar原生返回天干字符串与地支数组)
            ten_gods: {
                year: { gan: baZi.getYearShiShenGan(), zhi: baZi.getYearShiShenZhi() },
                month: { gan: baZi.getMonthShiShenGan(), zhi: baZi.getMonthShiShenZhi() },
                day: { gan: "日主", zhi: baZi.getDayShiShenZhi() },
                time: { gan: baZi.getTimeShiShenGan(), zhi: baZi.getTimeShiShenZhi() }
            },

            // [17-22] 当前大运与流年
            current_yun_nian: {
                dayun_gan: currentDaYunGan,
                dayun_zhi: currentDaYunZhi,
                liunian_gan: currentLiuNianGan,
                liunian_zhi: currentLiuNianZhi
            },

            // 补充：绝对安全的黄历维度空亡与冲煞
            auxiliary: {
                day_kongwang: lunarObj.getDayXunKong(),
                time_kongwang: lunarObj.getTimeXunKong(),
                day_chong: lunarObj.getDayChongDesc()
            }
        };


        // ============================================================================
        // 🌟 第二步：只把需要“定性分析”的任务交给大模型 (引入 Few-Shot 与三字段拆分)
        // ============================================================================
        
        const llmPrompt = `你是一位精通子平八字的命理大师。
下面是命主的客观基础数据：
• 性别：${promptData.gender}
• 八字原局：${objectiveBaziData.year_pillar} ${objectiveBaziData.month_pillar} ${objectiveBaziData.day_pillar} ${objectiveBaziData.time_pillar}
• 原局地支十神：年[${objectiveBaziData.ten_gods.year.zhi}] 月[${objectiveBaziData.ten_gods.month.zhi}] 日[${objectiveBaziData.ten_gods.day.zhi}] 时[${objectiveBaziData.ten_gods.time.zhi}]
• 当前大运：${promptData.daYunStr}
• 当前流年：${currentLiuNianGan}${currentLiuNianZhi}年
• 辅助信息：日空亡[${objectiveBaziData.auxiliary.day_kongwang}]

请基于以上八字，执行以下分析：
1. 【身强/身弱定性】：判断日主强弱。标准：得令、得地、得势，满足两项及以上为身强，否则身弱。
2. 【提取十神喜忌】：结合原局结构，提取喜用神与忌仇神。
3. 【神煞与刑冲合害】：依据原局四柱推导核心神煞(如桃花/驿马/羊刃等)，并综合大运流年，总结核心的合克关系。
4. 【八字断语】：分别撰写原局核心、当前大运和当前流年简评。

【断语文案风格参考 (Few-Shot)】
请严格模仿以下示例的专业术语和推演逻辑，分别撰写 \`yuanju_core\`、\`current_dayun\` 和 \`current_liunian\`，不要使用废话：

原局核心：甲木日主生于未月，季夏土旺，日主失令。天干戊己土正偏财并透，全局财星极旺；虽有时干癸水正印贴身相生，且命带驿马桃花，但总体耗泄过重。整体属于“财多身弱”格局。喜水木生扶帮身以担财，忌火土加重耗泄。地支子未相害，需防暗耗。
当前大运：壬戌大运，天干壬水偏印生扶弱身为喜；但地支戌土不仅加重原局财星旺势，还引发“未戌相刑”激旺土气。此运喜印生身，忌财耗身，属于财重压身、求财辛苦的运势。
当前流年：结合流年干支与原局大运的生克制化，...（此处补充流年简评）

【输出格式要求】
必须且仅输出纯 JSON 字符串（不要 Markdown 标记），结构严格如下：
{
  "strong_weak": "身强 或 身弱 或 中和偏弱等",
  "favorable_gods": ["印星", "比劫"],
  "unfavorable_gods": ["官杀", "财星"],
  "relations_analysis": "核心神煞与刑冲合害描述，例如：命带桃花，原局寅申相冲...",
  "yuanju_core": "此处填写模仿 Few-Shot 风格生成的原局核心分析",
  "current_dayun": "此处填写模仿 Few-Shot 风格生成的当前大运分析",
  "current_liunian": "此处填写模仿 Few-Shot 风格生成的当前流年简评"
}`;

        const API_KEY = process.env.GEMINI_API_KEY; 
        const API_URL = 'https://yinli.one/v1/chat/completions'; 
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}` 
            },
            body: JSON.stringify({
                model: 'gemini-3.1-pro-preview', 
                messages: [{ role: 'user', content: llmPrompt }],
                temperature: 0.2, // 低温，确保定性稳定
                response_format: { type: "json_object" }
            })
        });

        const apiData = await response.json();
        if (apiData.error) throw new Error(apiData.error.message || "请求大模型失败");

        let rawResult = apiData.choices[0].message.content;
        rawResult = rawResult.replace(/```json/g, "").replace(/```/g, "").trim();
        const llmQualitativeData = JSON.parse(rawResult);

        // ============================================================================
        // 🌟 第三步：Node.js 合并两套数据并返回
        // ============================================================================
        
        // 组合最终完整的 bazi_detail
        const finalBaziDetail = {
            ...objectiveBaziData, // 包含原生精确计算结果
            strong_weak: llmQualitativeData.strong_weak,                
            favorable_gods: llmQualitativeData.favorable_gods,          
            unfavorable_gods: llmQualitativeData.unfavorable_gods,      
            relations_analysis: llmQualitativeData.relations_analysis,  
            yuanju_core: llmQualitativeData.yuanju_core,                
            current_dayun: llmQualitativeData.current_dayun,            
            current_liunian: llmQualitativeData.current_liunian         
        };

        // 💡 兼容性魔法：
        // 你的前端 index.html 里原来是通过 data.result 取完整字符串渲染的。
        // 这里我们在后端自动把三个字段拼接成带换行的长文本赋值给 result。
        // 这样你的前端代码一行都不用改，照样能渲染！而数据库落表时可以直接取 bazi_detail 里的独立字段。
        const combinedResultText = `原局核心：\n${llmQualitativeData.yuanju_core}\n\n当前大运：\n${llmQualitativeData.current_dayun}\n\n当前流年：\n${llmQualitativeData.current_liunian}`;

        const outputPayload = { 
            result: combinedResultText,  // 兼容旧前端 UI
            bazi_detail: finalBaziDetail // 供存入数据库结构化使用
        };

        memoryCache[cacheKey] = outputPayload;
        
        return res.status(200).json(outputPayload);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}
