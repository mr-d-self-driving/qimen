const { Solar } = require('lunar-javascript');
const C = require('../lib/QimenConstants');
const U = require('../lib/QimenUtils');
const Calc = require('../lib/QimenCalculations');

// ==========================================
// ⚡️ 云端内存缓存 (基于 时辰 + 问题)
// ==========================================
let memoryCache = {};

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

module.exports = async function handler(req, res) {
    // 1. 处理 CORS 跨域请求
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
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
        
        // 缓存 Key 生成 (例如：2026-4-17-甲戌时-问题文本)
        const cacheKey = `${year}-${month}-${day}-${ganzhiHour}-${userQuestion}`;
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

        const finalPrompt = `你是一位精通“时家奇门拆补转盘法”的奇门遁甲预测大师。
起局时间：${timestamp_solar}(${timestamp_lunar})。
干支四柱：${lunar.getYearInGanZhi()} ${lunar.getMonthInGanZhi()} ${ganzhiDay} ${ganzhiHour}。${qimen_structure}。${juResult.jieQiName} ${juResult.yuanName} ；
旬首:${xunHead}。值符:${zhiFuStar}。值使:${zhiShiDoor}。空亡：日空${dayKongObj} 时空${hourKongObj}。驿马星：日马${dayMa} 时马${hourMa}。
${palacesText}

求测人命理信息(可选，若为空表示未提供)
null

**【核心推演逻辑】**
1. **定用神（含动态八字判断）**：
   - 根据问题锁定关键宫位（如求财看生门/戊，事情进展看时干/值使，照片/合同看景门等）。
   - **关键分支**：如果上文提供了“求测人八字/命理信息”，请务必提取其出生年的天干作为“年命”落宫，结合日干落宫综合判断；若未提供，直接以“日干”代表求测人。

2. **断吉凶（注重静态盘面）**：
   - 分析五行生克、吉凶格、空亡（能量减半/待填实）、马星（变动/加速），对比日干与时干的生克关系。
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
}
    "keyword": "关键信号 (如: 财气通门户，马星催动)"
  },
  "analysis": {
    "tensor": "时空能量 (如: 阳遁三局，金水相生)",
    "yong_shen": "用神分析 (如: 生门落巽宫属木，受生旺相)",
    "bazi_insight": "年命/八字参考 (如提供了八字，请简述年命落宫吉凶及其对大局的影响；若未提供八字，返回空即可",
    "pattern": "特殊格局 (如: 癸+己华盖地户，需防文书错漏)",
    "god_help": "神助 (如: 临九地，宜长线发展)",
    "dynamic_timing": "动态应期推演 (极其重要！详细说明当天的哪个时辰/未来的哪个日子能冲破阻碍或填实空亡，促成事情发展)"
  },
  "advice": {
    "strategy": [
      "策略1 (如: 必须主动出击，不可坐等)",
      "策略2 (如: 重点攻克对方的技术负责人)"
    ],
    "risk": "避坑指南 (如: 防备口头承诺，必须落实纸面)",
    "lucky_tips": {
      "direction": "有利方位 (如: 西北方)",
      "time": "有利时间 (如: 未时 13-15点)",
      "action": "助运行为 (如: 穿着黑色衣物，携带金属配饰)"
    }
  }

务必做到有根据、有理论支持，分析的详细还要体会我问问题的心理潜在因素，照顾我的心理感受。你先分析，我下面要问你问题了。
问题：${userQuestion}`;

// 6. 调用大模型 (使用标准的 Completions 接口)
        // ⚠️ 请在 Vercel 后台配置环境变量 API_KEY (名字你可以自定)
        const API_KEY = process.env.GEMINI_API_KEY; 
        
        // ⚠️ 请替换为你实际使用的中转接口地址
        const API_URL = 'https://yinli.one/v1/chat/completions'; 
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}` 
            },
            body: JSON.stringify({
                model: 'gemini-3.1-pro-preview', // 确保填写你的中转商支持的模型名称，如 'gpt-4o' 或 'gemini-1.5-pro'
                messages: [
                    { role: 'user', content: finalPrompt }
                ],
                // 大部分主流中转商支持强制 JSON 输出，如果不兼容可将此行注释掉
                response_format: { type: "json_object" },
                temperature: 0.7
            })
        });

        const apiData = await response.json();
        
        // 错误处理兼容
        if (apiData.error) {
             const errMsg = typeof apiData.error === 'string' ? apiData.error : (apiData.error.message || JSON.stringify(apiData.error));
             throw new Error(errMsg);
        }

        // 解析标准的 Completions 格式返回
        let textResult = apiData.choices[0].message.content;
        textResult = textResult.replace(/```json/g, "").replace(/```/g, "").trim();
        const aiJsonData = JSON.parse(textResult);

        // 7. 组装最终供前端 UI 渲染的超级 JSON
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
            qimen_data: {
                status: "success",
                pillars: { hour: ganzhiHour, month: lunar.getMonthInGanZhi(), day: ganzhiDay, year: lunar.getYearInGanZhi() },
                timestamp: { solar: timestamp_solar, lunar: timestamp_lunar },
                ju_info: { zhi_fu: zhiFuStar, zhi_fu_palace: `落${palaceNames[nineStars.indexOf(zhiFuStar)]}${palaceNumbers[nineStars.indexOf(zhiFuStar)]}宫`, zhi_shi_palace: `落${palaceNames[eightDoors.indexOf(zhiShiDoor)]}${palaceNumbers[eightDoors.indexOf(zhiShiDoor)]}宫`, jieqi: juResult.jieQiName, yuan: juResult.yuanName, zhi_shi: zhiShiDoor, name: qimen_structure, xun_shou: xunHead },
                auxiliary: { ma_xing: { day: dayMa, hour: hourMa }, kong_wang: { day: dayKongObj, hour: hourKongObj } },
                palaces: qimenPalaces
            }
        };

        // 写入缓存并返回
        memoryCache[cacheKey] = finalOutput;
        return res.status(200).json(finalOutput);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "奇门引擎推演失败", details: error.message });
    }
}
