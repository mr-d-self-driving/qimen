const memoryCache = {}; // 内存缓存，省 Token 利器

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { promptData } = req.body;
        if (!promptData) return res.status(400).json({ error: "缺少八字数据" });

        // 生成唯一的缓存 Key（基于八字字符串和性别）
        const cacheKey = `${promptData.baziStr}_${promptData.gender}`;
        if (memoryCache[cacheKey]) {
            console.log("⚡️ 命中八字云端缓存！直接返回。");
            return res.status(200).json({ result: memoryCache[cacheKey] });
        }

        // 构建专属八字 Prompt
        const finalPrompt = `你是一位精通子平八字的命理大师。请根据以下命主信息，生成一段简明扼要的八字断语（不需要解释奇门遁甲，仅专注于八字原局和大运的分析）。

命主信息：
性别：${promptData.gender}
出生日期：${promptData.birthStr}
八字原局：${promptData.baziStr}
当前大运：${promptData.daYunStr}

请严格参考以下排版格式输出（保持纯文本，勿使用 markdown 代码块包裹）：
• 性别：${promptData.gender}
• 出生日期：${promptData.birthStr}
• 八字原局：${promptData.baziStr}
• 原局核心：[一两句话概括日主得令得势情况，整体格局身旺/身弱，喜用神和忌神]
• 当前大运：[讲清楚当前大运干支,喜忌关系即可]

参考：
• 性别：女
• 出生日期：1988年5月24日 亥时 21:17:00
• 八字原局 (坤造)：戊辰 (年) 丁巳 (月) 己卯 (日) 乙亥 (时)
• 原局核心：己土日主生于巳月，偏印当令，初夏火旺土相。月干透出丁火偏印贴身相生，年柱戊辰干支一气劫财帮身，日主得令得势。日支坐卯木七杀，时柱乙亥财杀相生，用以克制旺土。整体属于“身旺”格局。喜水木金（财、官杀、食伤），忌火土（印星、比劫）。
• 当前大运：癸丑大运 (37岁-46岁，2024年起运)，天干癸水为偏财，透干润局并生扶原局七杀，地支丑土为比肩帮身。大运天干见财为喜，但地支比肩有劫财之象，属于吉凶参杂的运势。

`;

        const API_KEY = process.env.GEMINI_API_KEY; 
        const API_URL = 'https://yinli.one/v1/chat/completions'; 
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}` 
            },
            body: JSON.stringify({
                model: 'gemini-3.1-pro-preview', // 填你的模型
                messages: [{ role: 'user', content: finalPrompt }],
                temperature: 0.7
            })
        });

        const apiData = await response.json();
        if (apiData.error) throw new Error(apiData.error.message || "请求大模型失败");

        let textResult = apiData.choices[0].message.content;
        textResult = textResult.replace(/```json/g, "").replace(/```/g, "").trim();

        // 写入缓存并返回
        memoryCache[cacheKey] = textResult;
        return res.status(200).json({ result: textResult });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}
