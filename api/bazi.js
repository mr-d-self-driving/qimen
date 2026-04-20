const { Solar, Lunar } = require('lunar-javascript');
const { createClient } = require('@supabase/supabase-js');

// 内存缓存
const memoryCache = {};
// 初始化管理员权限的 supabase 客户端 (绕过前端 RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // 使用 Service Role Key
);

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
        // 🌟 第一步：完全依靠 lunar-javascript 在本地生成所有客观维度数据 (对齐专业排盘)
        // ============================================================================
        
        // ... (保留你原有的时间解析和 solarObj/baZi 实例化代码) ...
        const dayGan = baZi.getDayGan();

        // 1. 性别转换与起运对象 (1为男，0为女)
        const genderCode = (promptData.gender === '男' || promptData.gender === 'M' || promptData.gender === '乾造') ? 1 : 0;
        const yun = baZi.getYun(genderCode);

        // 2. 提取大运时间轴 (取前10步大运，约100年)
        const daYunList = yun.getDaYun().slice(0, 10).map(dy => ({
            start_age: dy.getStartAge(),
            start_year: dy.getStartYear(),
            ganzhi: dy.getGanZhi(),
        }));

        // 3. 提取流年 (以当前所处的大运为例，你可以按需遍历所有大运)
        // 获取当前自然年，定位大运
        const currentYear = new Date().getFullYear();
        let currentDaYunObj = yun.getDaYun().find(dy => currentYear >= dy.getStartYear() && currentYear <= dy.getEndYear());
        let liuNianList = [];
        if (currentDaYunObj) {
             liuNianList = currentDaYunObj.getLiuNian().map(ln => ({
                 year: ln.getYear(),
                 age: ln.getAge(),
                 ganzhi: ln.getGanZhi()
             }));
        }

        // 4. 组装专业排盘大字典 (完美对齐截图参数)
        const objectiveBaziData = {
            // 【顶部基础信息区】
            base_info: {
                // 起运：出生后X年X月X天起运
                qi_yun: `出生后${yun.getStartYear()}年${yun.getStartMonth()}个月${yun.getStartDay()}天起运`,
                // 交运：这里简化为每逢哪一年交运 (lunar也支持精确到交运的具体阳历日期)
                jiao_yun: `逢尾数 ${yun.getStartYear() % 10} 之年交大运`,
                // 日空亡 (截图中的 申酉空亡)
                day_kongwang: baZi.getDayXunKong(),
                // 司令 (月支的主气藏干)
                si_ling: baZi.getMonthHideGan().length > 0 ? baZi.getMonthHideGan()[0] : ""
            },

            // 【四柱排盘矩阵】
            pillars: {
                // 第一行：日期/天干/地支
                ganzhi: {
                    year: baZi.getYear(),
                    month: baZi.getMonth(),
                    day: baZi.getDay(),
                    time: baZi.getTime()
                },
                // 第二行：主星 (天干十神)
                main_stars: {
                    year: baZi.getYearShiShenGan(),
                    month: baZi.getMonthShiShenGan(),
                    day: "日主", // 截图中的“元男/元女”
                    time: baZi.getTimeShiShenGan()
                },
                // 第三行：藏干 (地支藏干数组)
                hidden_stems: {
                    year: baZi.getYearHideGan(),
                    month: baZi.getMonthHideGan(),
                    day: baZi.getDayHideGan(),
                    time: baZi.getTimeHideGan()
                },
                // 第四行：星运 (十二长生：日干对地支的状态)
                xing_yun: {
                    year: baZi.getYearDiShi(),
                    month: baZi.getMonthDiShi(),
                    day: baZi.getDayDiShi(),
                    time: baZi.getTimeDiShi()
                },
                // 第五行：空亡 (本柱地支是否空亡)
                kong_wang_flags: {
                    year: baZi.getDayXunKong().includes(baZi.getYearZhi()),
                    month: baZi.getDayXunKong().includes(baZi.getMonthZhi()),
                    day: false, // 日柱自身不标日空
                    time: baZi.getDayXunKong().includes(baZi.getTimeZhi())
                },
                // 第六行：纳音
                na_yin: {
                    year: baZi.getYearNaYin(),
                    month: baZi.getMonthNaYin(),
                    day: baZi.getDayNaYin(),
                    time: baZi.getTimeNaYin()
                }
            },

            // 【大运流年时间轴】
            timeline: {
                da_yun: daYunList,       // 包含起运年龄、年份、干支
                current_liu_nian: liuNianList // 当前大运下的 10 个流年
            }
        };

        // 将这个 objectiveBaziData 合并到最后返回给前端的 bazi_detail 中

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
        
        // 在返回前端之前，直接在后端落库！
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
            .eq('id', promptData.profileId); // 假设前端传来了档案的 ID

        if (dbError) {
            console.error("后端数据库写入失败:", dbError);
            // 可以选择抛出错误，或者依然返回结果但记录日志
}
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
