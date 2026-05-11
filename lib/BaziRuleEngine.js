'use strict';
const C = require('./BaziConstants');

// ─── 辅助函数 ────────────────────────────────────────────────────────────────
/** 获取日干对某支/干的十神 */
function getShen(dayGan, target) {
  if (C.SHISHEN[dayGan] && C.SHISHEN[dayGan][target] !== undefined) return C.SHISHEN[dayGan][target];
  // zhi → 主气十神
  const mainGan = C.ZHI5_LIST[target]?.[0];
  return mainGan ? C.SHISHEN[dayGan][mainGan] : '?';
}
/** 十二长生 */
function getDiShi(dayGan, zhi) {
  const start = C.CHANG_SHENG_START[dayGan];
  if (start === undefined) return '-';
  const idx = C.ZHI_INDEX[zhi];
  const isYang = ['甲', '丙', '戊', '庚', '壬'].includes(dayGan);
  return C.SHI_ER[isYang ? (idx - start + 12) % 12 : (start - idx + 12) % 12];
}
/** 反查：给定日干，找十神对应的天干 */
function getStemByShen(dayGan, shenName) {
  return Object.keys(C.SHISHEN[dayGan]).find(g => C.SHISHEN[dayGan][g] === shenName);
}
/** 空亡检测 */
function isKong(dayPillar, zhi) {
  return (C.EMPTIES[dayPillar] || []).includes(zhi);
}
/** 解析调候字符串 → {favorable:[...], unfavorable:[...]} */
function parseTiaohou(str) {
  if (!str) return { favorable: [], unfavorable: [] };
  const favorable = [];
  const unfavorable = [];
  const seenFav = new Set();
  const seenUnfav = new Set();
  let priority = 1;
  let markUnfav = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (/\d/.test(c)) {
      priority = Number(c);
      markUnfav = false;
      continue;
    }
    if (c === '_') { markUnfav = true; continue; }
    if (markUnfav) {
      if (!seenUnfav.has(c)) {
        unfavorable.push({ gan: c, priority });
        seenUnfav.add(c);
      }
    } else if (!seenFav.has(c)) {
      favorable.push({ gan: c, priority });
      seenFav.add(c);
    }
    markUnfav = false;
  }
  return { favorable, unfavorable };
}

const STRONG_ROOT_PHASES = new Set(['帝旺', '临官']);
const WEAK_ROOT_PHASES = new Set(['长生', '冠带']);
const TRACE_ROOT_PHASES = new Set(['沐浴', '墓']);
const ROOTED_PHASES = new Set([...STRONG_ROOT_PHASES, ...WEAK_ROOT_PHASES, ...TRACE_ROOT_PHASES]);

function getMoonScoreByPhase(phase) {
  if (STRONG_ROOT_PHASES.has(phase)) return { score: 5, strength: '旺', deLing: true };
  if (WEAK_ROOT_PHASES.has(phase)) return { score: 3, strength: '相', deLing: true };
  return { score: 0, strength: '失令', deLing: false };
}

function getGroundScoreByPhase(phase) {
  if (phase === '帝旺') return 3;
  if (phase === '临官') return 2;
  if (phase === '长生' || phase === '冠带') return 1;
  if (phase === '沐浴' || phase === '墓') return 0.5;
  return 0;
}

function formatScore(num) {
  return Number.isInteger(num) ? String(num) : num.toFixed(1).replace(/\.0$/, '');
}

const SHORT_TO_FULL_SHEN = {
  "比": "比肩", "劫": "劫财",
  "食": "食神", "伤": "伤官",
  "财": "正财", "才": "偏财",
  "官": "正官", "杀": "七杀",
  "印": "正印", "枭": "偏印"
};
const FULL_TO_SHORT_SHEN = Object.fromEntries(Object.entries(SHORT_TO_FULL_SHEN).map(([k, v]) => [v, k]));
const SHEN_PAIRS = [
  ['正印', '偏印'],
  ['正官', '七杀'],
  ['食神', '伤官'],
  ['正财', '偏财'],
  ['比肩', '劫财'],
];
const SHENG_CYCLE = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
const KE_TARGET_CYCLE = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
const RESTRAINING_CYCLE = { '木': '金', '土': '木', '水': '土', '火': '水', '金': '火' };

function getFullShenByStem(dayGan, stem) {
  return SHORT_TO_FULL_SHEN[C.SHISHEN[dayGan]?.[stem]];
}

function getWuxingByShenFull(dayGan, fullShen) {
  const shortShen = FULL_TO_SHORT_SHEN[fullShen];
  const stem = getStemByShen(dayGan, shortShen);
  return C.GAN5[stem];
}

function getTiaohouWeight(priority) {
  if (priority === 1) return 50;
  if (priority === 2) return 35;
  return 20;
}

function getTiaohouUnfavorablePenalty(ratio, hasRestrainingGan) {
  if (ratio > 30) return hasRestrainingGan ? -35 : -50;
  if (ratio > 20) return -35;
  if (ratio >= 10) return -20;
  return 0;
}

function pruneDivergentPairs(list, scores) {
  const pruned = [...list];
  for (const [a, b] of SHEN_PAIRS) {
    if (!pruned.includes(a) || !pruned.includes(b)) continue;
    const diff = Math.abs(scores[a] - scores[b]);
    if (diff <= 15) continue;
    const loser = scores[a] >= scores[b] ? b : a;
    const idx = pruned.indexOf(loser);
    if (idx >= 0) pruned.splice(idx, 1);
  }
  return pruned;
}

function aggregateShens(shenNames, scores, conflictShens = []) {
  const sortedShens = [...shenNames].sort((a, b) => scores[b] - scores[a]);
  const positiveShens = sortedShens.filter(s => scores[s] > 0);
  const topScore = positiveShens.length ? scores[positiveShens[0]] : 0;
  let favorable = positiveShens.filter(s => scores[s] >= topScore - 5);
  favorable = pruneDivergentPairs(favorable, scores).slice(0, 2);
  if (favorable.length === 0 && positiveShens.length) favorable.push(positiveShens[0]);

  for (const shen of conflictShens) {
    if (scores[shen] >= 0 && !favorable.includes(shen)) {
      if (favorable.length >= 2) favorable[favorable.length - 1] = shen;
      else favorable.push(shen);
      break;
    }
  }

  const negativeShens = [...shenNames].filter(s => scores[s] < 0).sort((a, b) => scores[a] - scores[b]);
  const bottomScore = negativeShens.length ? scores[negativeShens[0]] : 0;
  let unfavorable = negativeShens.filter(s => scores[s] <= bottomScore + 5);
  unfavorable = pruneDivergentPairs(unfavorable, scores).slice(0, 2);
  if (unfavorable.length === 0 && negativeShens.length) unfavorable.push(negativeShens[0]);
  if (conflictShens.length) unfavorable = unfavorable.filter(shen => !conflictShens.includes(shen));

  return { favorable, unfavorable };
}

// ─── 核心模块 ────────────────────────────────────────────────────────────────
const BaziRuleEngine = {

  /**
   * 计算日主强弱
   * @param {string} dayGan 日干
   * @param {string[]} gans [年干,月干,日干,时干]
   * @param {string[]} zhis [年支,月支,日支,时支]
   * @returns {{ strongWeak, strongScore, scores, ganScores, weak, meStatus }}
   */
  calculateStrength(dayGan, gans, zhis) {
    const scores = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
    const ganScores = {};
    C.GAN.forEach(g => { ganScores[g] = 0; });

    // 天干每个 +5
    for (const g of gans) {
      scores[C.GAN5[g]] += 5;
      ganScores[g] += 5;
    }
    // 地支藏干（月支双倍）
    const zhisWithDouble = [...zhis, zhis[1]];
    for (const z of zhisWithDouble) {
      for (const [g, w] of Object.entries(C.ZHI5[z] || {})) {
        scores[C.GAN5[g]] += w;
        ganScores[g] = (ganScores[g] || 0) + w;
      }
    }

    // 日主十二长生状态
    const meStatus = zhis.map(z => getDiShi(dayGan, z));
    const [yearPhase, monthPhase, dayPhase, hourPhase] = meStatus;

    // 天干十神
    const allShens = [];
    for (const g of gans) {
      if (g !== dayGan) allShens.push(C.SHISHEN[dayGan][g]);
    }
    for (const z of zhis) {
      const mg = C.ZHI5_LIST[z]?.[0];
      if (mg) allShens.push(C.SHISHEN[dayGan][mg]);
    }

    // 数值强度（比+劫+印+枭的干分合计）
    const biStem = getStemByShen(dayGan, '比');
    const jieStem = getStemByShen(dayGan, '劫');
    const yinStem = getStemByShen(dayGan, '印');
    const xiaoStem = getStemByShen(dayGan, '枭');
    const strongScore = (ganScores[biStem] || 0) + (ganScores[jieStem] || 0)
      + (ganScores[yinStem] || 0) + (ganScores[xiaoStem] || 0);

    // 第一层：月令得令
    const moonRule = getMoonScoreByPhase(monthPhase);
    const moonScore = moonRule.score;

    // 第二层：通根得地（不重复计算月支）
    const branchScores = [
      { pillar: '年支', zhi: zhis[0], phase: yearPhase, score: getGroundScoreByPhase(yearPhase) },
      { pillar: '日支', zhi: zhis[2], phase: dayPhase, score: getGroundScoreByPhase(dayPhase) },
      { pillar: '时支', zhi: zhis[3], phase: hourPhase, score: getGroundScoreByPhase(hourPhase) },
    ];
    const groundScore = branchScores.reduce((sum, item) => sum + item.score, 0);

    // 第三层：天干帮扶
    const stemHelpShens = new Set(['比', '劫', '印', '枭']);
    const stemDetails = [
      { pillar: '年干', gan: gans[0], zhi: zhis[0], phase: yearPhase },
      { pillar: '月干', gan: gans[1], zhi: zhis[1], phase: monthPhase },
      { pillar: '时干', gan: gans[3], zhi: zhis[3], phase: hourPhase },
    ];
    let stemHelpScore = 0;
    const stemHelpBreakdown = [];
    for (const item of stemDetails) {
      const shen = C.SHISHEN[dayGan][item.gan];
      if (!stemHelpShens.has(shen)) continue;
      const hasRoot = STRONG_ROOT_PHASES.has(item.phase) || WEAK_ROOT_PHASES.has(item.phase);
      const score = hasRoot ? 2 : 1;
      stemHelpScore += score;
      stemHelpBreakdown.push({ ...item, shen, score, hasRoot });
    }

    // 第四层：综合强弱
    const totalStrengthScore = moonScore + groundScore + stemHelpScore;
    let strongWeak = '身弱';
    if (totalStrengthScore >= 7) strongWeak = '身强';
    else if (totalStrengthScore >= 4) strongWeak = '身中';

    // 第五层：从格/专旺格覆盖
    const dayMasterHasRoot = meStatus.some(phase => ROOTED_PHASES.has(phase));
    const stemHasHelp = stemDetails.some(item => stemHelpShens.has(C.SHISHEN[dayGan][item.gan]));
    const totalWuxingScore = Object.values(scores).reduce((sum, value) => sum + value, 0);
    const [dominantElement, dominantScore] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    const dominantRatio = totalWuxingScore > 0 ? dominantScore / totalWuxingScore : 0;
    const isDominant = dominantRatio > 0.55;
    const dayMasterElement = C.GAN5[dayGan];
    let weak = strongWeak === '身弱';
    if (!dayMasterHasRoot && !stemHasHelp && isDominant) {
      strongWeak = dominantElement !== dayMasterElement ? `疑似从格（从${dominantElement}）` : '专旺格';
      weak = false;
    }

    const moonText = moonRule.deLing
      ? `月令以${monthPhase}论，属${moonRule.strength}，月令得令计${moonScore}分。`
      : `月令以${monthPhase}论，属失令，月令得令分为0。`;
    const groundedBranches = branchScores.filter(item => item.score > 0);
    const groundText = groundedBranches.length
      ? `以年/日/时三支计分：${groundedBranches.map(item => `${item.pillar}${item.zhi}为${item.phase}，计${formatScore(item.score)}分`).join('；')}；合计${formatScore(groundScore)}分。`
      : '年支、日支、时支皆无显著根气，通根得地合计0分。';
    const stemText = stemHelpBreakdown.length
      ? `${stemHelpBreakdown.map(item => `${item.pillar}${item.gan}为${item.shen}，${item.hasRoot ? '透干有根' : '透干无根'}，计${item.score}分`).join('；')}；合计${stemHelpScore}分。`
      : '年干、月干、时干无比劫印枭透出，天干帮扶计0分。';
    const finalText = `总分${formatScore(totalStrengthScore)}分，基础判为${strongWeak === '专旺格' || strongWeak.includes('从格') ? '常规格局之外' : strongWeak}。`;
    const basisLines = [moonText, groundText, stemText, finalText];
    let congCheckText = '';
    if (!dayMasterHasRoot && !stemHasHelp && isDominant) {
      congCheckText = `四支真无根，天干亦无帮身，而${dominantElement}占比约${Math.round(dominantRatio * 100)}%，故覆盖为${strongWeak}。`;
    } else {
      congCheckText = `${dayMasterHasRoot ? '日主有根' : '日主真无根'}，${stemHasHelp ? '天干有帮身' : '天干无帮身'}，${dominantElement}占比约${Math.round(dominantRatio * 100)}%，不触发从格/专旺覆盖。`;
    }
    basisLines.push(congCheckText);

    const strengthDetail = {
      verdict: strongWeak,
      total_score: totalStrengthScore,
      summary: `日主${strongWeak}，综合得分${formatScore(totalStrengthScore)}分。`,
      sections: [
        { key: 'moon', title: '月令', score: moonScore, text: moonText },
        { key: 'ground', title: '通根得地', score: groundScore, text: groundText },
        { key: 'stems', title: '天干帮扶', score: stemHelpScore, text: stemText },
        { key: 'final', title: '综合结论', score: totalStrengthScore, text: finalText },
        { key: 'cong', title: '从格校验', score: null, text: congCheckText },
      ],
      metrics: {
        moon_score: moonScore,
        ground_score: groundScore,
        stem_help_score: stemHelpScore,
        dominant_element: dominantElement,
        dominant_ratio: dominantRatio,
        day_master_has_root: dayMasterHasRoot,
        stem_has_help: stemHasHelp,
      },
    };

    return {
      strongWeak,
      strongScore,
      scores,
      ganScores,
      weak,
      meStatus,
      allShens,
      moonScore,
      moonPhase: monthPhase,
      moonPhaseStrength: moonRule.strength,
      groundScore,
      branchScores,
      stemHelpScore,
      stemHelpBreakdown,
      totalStrengthScore,
      dayMasterHasRoot,
      stemHasHelp,
      dominantElement,
      dominantRatio,
      strengthBasis: basisLines.join(' '),
      strengthDetail,
    };
  },

  /**
   * 推断喜忌神 (4-Dimension Scoring System)
   * 维度 1: 调候 (Tiaohou)
   * 维度 2: 病药 (Bingyao)
   * 维度 3: 通关 (Tongguan)
   * 维度 4: 扶抑 (Fuyi)
   */
  getFavorableUnfavorable(dayGan, monthZhi, geJu, strengthResult, zhis, gans) {
    const SHISHEN_NAMES = [
      "比肩", "劫财",   // 比劫类
      "食神", "伤官",   // 食伤类
      "正财", "偏财",   // 财类
      "正官", "七杀",   // 官杀类
      "正印", "偏印"    // 印枭类
    ];

    const GE_JU_PROTECTED_MAP = {
      "正印格": ["正印"], "偏印格": ["偏印"],
      "食神格": ["食神"], "伤官格": ["伤官"],
      "正财格": ["正财"], "偏财格": ["偏财"],
      "正官格": ["正官"], "七杀格": ["七杀", "食神"],
      "建禄格": [], "月刃格": ["七杀"], "羊刃格": ["七杀"]
    };
    const geJuProtectedShens = GE_JU_PROTECTED_MAP[geJu] || [];

    // Pre-processing A: WuXing Power
    const wuxingScores = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
    gans.forEach(g => { wuxingScores[C.GAN5[g]] += 1.0; });
    zhis.forEach(z => {
      const hides = C.ZHI5_LIST[z] || [];
      if (hides[0]) wuxingScores[C.GAN5[hides[0]]] += 0.8 * (gans.includes(hides[0]) ? 1.5 : 1);
      if (hides[1]) wuxingScores[C.GAN5[hides[1]]] += 0.5 * (gans.includes(hides[1]) ? 1.5 : 1);
      if (hides[2]) wuxingScores[C.GAN5[hides[2]]] += 0.3 * (gans.includes(hides[2]) ? 1.5 : 1);
    });
    
    let totalScore = 0;
    Object.values(wuxingScores).forEach(s => totalScore += s);
    const wuxingRatio = {};
    Object.keys(wuxingScores).forEach(wx => {
      wuxingRatio[wx] = totalScore > 0 ? (wuxingScores[wx] / totalScore) * 100 : 0;
    });

    const scores = {};
    const breakdown = {};
    SHISHEN_NAMES.forEach(shen => {
      scores[shen] = 0;
      breakdown[shen] = { tiaohou: 0, bingyao: 0, tongguan: 0, fuyi: 0, cong: 0, conflict: 0 };
    });
    const favorableConflicts = [];

    const getShenWuxing = shen => getWuxingByShenFull(dayGan, shen);
    const getShensByWuxing = wx => SHISHEN_NAMES.filter(shen => getShenWuxing(shen) === wx);
    const makeWuxingResult = (favShens, unfavShens) => ({
      favorable: [...new Set(favShens.map(getShenWuxing))],
      unfavorable: [...new Set(unfavShens.map(getShenWuxing))]
    });

    const getSpecialPattern = () => {
      const strongWeak = strengthResult.strongWeak || '';
      if (!strongWeak.includes('从格') && !strongWeak.includes('专旺')) return null;

      const dayMasterElement = C.GAN5[dayGan];
      const dominantElement = strengthResult.dominantElement
        || Object.entries(wuxingRatio).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (strongWeak.includes('专旺') || dominantElement === dayMasterElement) {
        return {
          type: '专旺',
          favorable: ['比肩', '劫财', '食神', '伤官'],
          unfavorable: ['正官', '七杀', '正财', '偏财', '正印', '偏印']
        };
      }
      if (dominantElement === KE_TARGET_CYCLE[dayMasterElement]) {
        return {
          type: '从财',
          favorable: ['正财', '偏财', '正官', '七杀'],
          unfavorable: ['正印', '偏印', '比肩', '劫财']
        };
      }
      if (dominantElement === RESTRAINING_CYCLE[dayMasterElement]) {
        return {
          type: '从官杀',
          favorable: ['正官', '七杀', '正财', '偏财'],
          unfavorable: ['正印', '偏印', '比肩', '劫财', '食神', '伤官']
        };
      }
      if (dominantElement === SHENG_CYCLE[dayMasterElement]) {
        return {
          type: '从食伤',
          favorable: ['食神', '伤官', '正财', '偏财'],
          unfavorable: ['正印', '偏印', '比肩', '劫财', '正官', '七杀']
        };
      }
      return {
        type: '从势',
        favorable: getShensByWuxing(dominantElement),
        unfavorable: ['比肩', '劫财', '正印', '偏印']
      };
    };

    const specialPattern = getSpecialPattern();
    if (specialPattern) {
      for (const shen of specialPattern.favorable) {
        scores[shen] = 80;
        breakdown[shen].cong = 80;
      }
      for (const shen of specialPattern.unfavorable) {
        scores[shen] = -80;
        breakdown[shen].cong = -80;
      }
      const wuxing = makeWuxingResult(specialPattern.favorable, specialPattern.unfavorable);
      return {
        wuxing,
        core_shens: { favorable: specialPattern.favorable, unfavorable: specialPattern.unfavorable },
        scoring_details: scores,
        dimension_breakdown: breakdown,
        wuxing_ratio: wuxingRatio,
        special_pattern: specialPattern,
        favorable_conflicts: favorableConflicts,
        verdict: `此局识别为${specialPattern.type}，先顺其成势，喜${specialPattern.favorable.join('、')}，忌${specialPattern.unfavorable.join('、')}。 此局从势，顺其气势为佳。`
      };
    }

    // Dimension 1: Tiaohou
    const tiaohouStr = C.TIAOHOUS[dayGan + monthZhi] || '';
    const parsedTiaohou = parseTiaohou(tiaohouStr);
    const tiaohouNeededWuxing = [...new Set(parsedTiaohou.favorable.map(item => C.GAN5[item.gan]))];
    const tiaohouHarmfulWuxing = [...new Set(parsedTiaohou.unfavorable.map(item => C.GAN5[item.gan]))];

    let vetoTriggered = false;
    const scoreTiaohou = () => {
      for (const item of parsedTiaohou.favorable) {
        const shen = getFullShenByStem(dayGan, item.gan);
        if (!shen) continue;
        const score = getTiaohouWeight(item.priority);
        scores[shen] += score;
        breakdown[shen].tiaohou += score;
      }
      for (const item of parsedTiaohou.unfavorable) {
        const wx = C.GAN5[item.gan];
        const shen = getFullShenByStem(dayGan, item.gan);
        if (!shen) continue;
        const restrainingWx = RESTRAINING_CYCLE[wx];
        const hasRestrainingGan = gans.some(g => C.GAN5[g] === restrainingWx);
        const penalty = getTiaohouUnfavorablePenalty(wuxingRatio[wx] || 0, hasRestrainingGan);
        if (penalty) {
          scores[shen] += penalty;
          breakdown[shen].tiaohou += penalty;
          if (penalty <= -35) vetoTriggered = true;
        }
      }
    };
    scoreTiaohou();

    // Dimension 2: Bingyao
    let hasBing = false;
    const bingElements = [];
    const scoreBingyao = () => {
      for (let wx of Object.keys(wuxingRatio)) {
        const ratio = wuxingRatio[wx];
        if (ratio > 35) {
          hasBing = true;
          const heavy = ratio > 45;
          const bingWx = wx;
          const zhengYaoWx = RESTRAINING_CYCLE[bingWx];
          const fuYaoWx = SHENG_CYCLE[bingWx];
          const bingScore = heavy ? -40 : -20;
          const zhengYaoScore = heavy ? 40 : 20;
          const fuYaoScore = heavy ? 20 : 10;
          bingElements.push({ element: bingWx, heavy, ratio });
          
          for (let shen of SHISHEN_NAMES) {
            const sWx = getShenWuxing(shen);
            if (sWx === bingWx) { scores[shen] += bingScore; breakdown[shen].bingyao += bingScore; }
            if (sWx === zhengYaoWx) { scores[shen] += zhengYaoScore; breakdown[shen].bingyao += zhengYaoScore; }
            if (sWx === fuYaoWx) { scores[shen] += fuYaoScore; breakdown[shen].bingyao += fuYaoScore; }
          }
        }
      }
    };
    scoreBingyao();

    // Dimension 3: Tongguan
    const scoreTongguan = () => {
      const tongguanMap = [
        { c1: '金', c2: '木', bridge: '水' },
        { c1: '水', c2: '火', bridge: '木' },
        { c1: '火', c2: '金', bridge: '土' },
        { c1: '木', c2: '土', bridge: '火' },
        { c1: '土', c2: '水', bridge: '金' }
      ];
      for (let rule of tongguanMap) {
        if (wuxingRatio[rule.c1] > 25 && wuxingRatio[rule.c2] > 25) {
          if (wuxingRatio[rule.bridge] < 15) {
            for (let shen of SHISHEN_NAMES) {
              const sWx = getWuxingByShenFull(dayGan, shen);
              if (sWx === rule.bridge) {
                scores[shen] += 30;
                breakdown[shen].tongguan = 30;
              }
            }
          }
        }
      }
    };
    scoreTongguan();

    // Dimension 4: Fuyi
    const scoreFuyi = () => {
      const isWeak = strengthResult.strongWeak === "身弱";
      const isStrong = strengthResult.strongWeak === "身强";
      const isMiddle = strengthResult.strongWeak === "身中";
      const middleLeansWeak = Number(strengthResult.totalStrengthScore || 0) < 5.5;

      for (let shen of SHISHEN_NAMES) {
        let fuyiScore = 0;
        const isShengFu = ['正印', '偏印', '比肩', '劫财'].includes(shen);
        const isKeXieHao = ['正官', '七杀', '食神', '伤官', '正财', '偏财'].includes(shen);

        if (isWeak) {
          if (isShengFu) fuyiScore = 20;
          if (isKeXieHao) fuyiScore = -20;
        } else if (isStrong) {
          if (isKeXieHao) fuyiScore = 20;
          if (isShengFu) fuyiScore = -20;
        } else if (isMiddle) {
          if (middleLeansWeak) {
            if (isShengFu) fuyiScore = 10;
            if (isKeXieHao) fuyiScore = -10;
          } else {
            if (isKeXieHao) fuyiScore = 10;
            if (isShengFu) fuyiScore = -10;
          }
        }

        if (fuyiScore < 0 && geJuProtectedShens.includes(shen)) {
          fuyiScore = 0;
        }

        scores[shen] += fuyiScore;
        breakdown[shen].fuyi = fuyiScore;
      }
    };
    scoreFuyi();

    const resolveWeakResourceConflict = () => {
      if (strengthResult.strongWeak !== '身弱') return;
      const resourceShens = ['正印', '偏印'];
      const resourceElement = getShenWuxing('正印');
      const resourceBing = bingElements.find(item => item.element === resourceElement);
      if (!resourceBing) return;

      const damagedResources = resourceShens.filter(shen => breakdown[shen].bingyao < 0);
      if (!damagedResources.length) return;

      const bestResource = damagedResources.sort((a, b) => scores[b] - scores[a])[0];
      if (scores[bestResource] <= 0) {
        const adjustment = 5 - scores[bestResource];
        scores[bestResource] += adjustment;
        breakdown[bestResource].conflict += adjustment;
      }
      for (const shen of resourceShens) {
        if (shen !== bestResource && scores[shen] < 0) {
          const adjustment = -scores[shen];
          scores[shen] = 0;
          breakdown[shen].conflict += adjustment;
        }
      }
      favorableConflicts.push({
        type: 'weak_daymaster_excess_resource',
        element: resourceElement,
        shens: damagedResources,
        message: `${resourceElement}为印星，能生扶身弱日主，但原局${resourceElement}过旺成病；印仍保留弱喜，需火/土等药神平衡。`
      });
    };
    resolveWeakResourceConflict();

    // Aggregation
    const conflictShens = favorableConflicts.flatMap(item => item.shens);
    const aggregated = aggregateShens(SHISHEN_NAMES, scores, conflictShens);
    const favShens = aggregated.favorable;
    const unfavShens = aggregated.unfavorable;

    const { favorable: favorableWuxing, unfavorable: unfavorableWuxing } = makeWuxingResult(favShens, unfavShens);

    // Verdict
    let mainVerdict = "";
    if (vetoTriggered) {
      mainVerdict = `此局生于${monthZhi}月，调候为急。原局${tiaohouHarmfulWuxing.join('、')}过旺，首取${tiaohouNeededWuxing.length ? tiaohouNeededWuxing.join('、') : '相应五行'}暖局或除寒为真用神。`;
    } else if (hasBing) {
      const bingWx = Object.keys(wuxingRatio).sort((a,b) => wuxingRatio[b]-wuxingRatio[a])[0];
      mainVerdict = `原局五行偏枯，${bingWx}势偏旺为病（占比${Math.round(wuxingRatio[bingWx])}%），急需克制或顺泄。`;
    } else {
      mainVerdict = `此局格局为${geJu}，首取格局核心用神。`;
    }
    const fuyiStr = strengthResult.strongWeak === '身弱'
      ? '日主身弱，需印比生扶，但须注意五行平衡。'
      : (strengthResult.strongWeak === '身强'
        ? '日主身强，喜食伤生财或官杀克制。'
        : (strengthResult.strongWeak === '身中'
          ? '日主介于中和之间，宜结合格局、调候与岁运再细分偏强偏弱。'
          : '此局从势，顺其气势为佳。'));
    
    return {
      wuxing: { favorable: favorableWuxing, unfavorable: unfavorableWuxing },
      core_shens: { favorable: favShens, unfavorable: unfavShens },
      scoring_details: scores,
      dimension_breakdown: breakdown,
      wuxing_ratio: wuxingRatio,
      special_pattern: null,
      favorable_conflicts: favorableConflicts,
      verdict: mainVerdict + " " + fuyiStr
    };
  },

  /**
   * 地支四柱及天干生克合化检测（全局，不限相邻，支持大运流年）
   */
  calculateInteractions(zhis, gans, keys = ['year', 'month', 'day', 'time', 'dayun', 'liunian']) {
    const ganKeCycle = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
    const zArr = Array.isArray(zhis) ? zhis : Object.values(zhis);
    const gArr = Array.isArray(gans) ? gans : Object.values(gans);

    const ganPairs = [];
    // 天干合、克
    for (let i = 0; i < gArr.length; i++) {
      for (let j = i + 1; j < gArr.length; j++) {
        const a = gArr[i], b = gArr[j];
        if (!a || !b) continue;
        const key1 = a + b, key2 = b + a;
        if (C.GAN_HES[key1]) {
          ganPairs.push({ type: '合', name: `${key1}合化${C.GAN_HES[key1]}`, elements: [a, b], pillars: [keys[i], keys[j]] });
        } else if (C.GAN_HES[key2]) {
          ganPairs.push({ type: '合', name: `${key2}合化${C.GAN_HES[key2]}`, elements: [a, b], pillars: [keys[i], keys[j]] });
        } else if (ganKeCycle[C.GAN5[a]] === C.GAN5[b] || ganKeCycle[C.GAN5[b]] === C.GAN5[a]) {
          ganPairs.push({ type: '克', name: `${a}${b}相克`, elements: [a, b], pillars: [keys[i], keys[j]] });
        }
      }
    }

    const zhiPairs = [];
    // 地支冲、合、刑、害、破、暗合
    for (let i = 0; i < zArr.length; i++) {
      for (let j = i + 1; j < zArr.length; j++) {
        const a = zArr[i], b = zArr[j];
        if (!a || !b) continue;
        if (C.ZHI_CHONGS[a] === b) zhiPairs.push({ type: '冲', name: `${a}${b}相冲`, elements: [a, b], pillars: [keys[i], keys[j]] });
        if (C.ZHI_ATTS[a]?.['六'] === b || C.ZHI_ATTS[b]?.['六'] === a) {
          const hx = C.ZHI_6HES[a + b] || C.ZHI_6HES[b + a] || '';
          zhiPairs.push({ type: '合', name: `${a}${b}合化${hx}`, elements: [a, b], pillars: [keys[i], keys[j]] });
        }
        if (C.XINGS[a] === b || C.XINGS[b] === a) zhiPairs.push({ type: '刑', name: `${a}${b}相刑`, elements: [a, b], pillars: [keys[i], keys[j]] });
        if (a === b && C.ZI_XINGS.includes(a)) zhiPairs.push({ type: '自刑', name: `${a}${a}自刑`, elements: [a, b], pillars: [keys[i], keys[j]] });
        if (C.ZHI_HAIS[a] === b) zhiPairs.push({ type: '害', name: `${a}${b}相害`, elements: [a, b], pillars: [keys[i], keys[j]] });
        if (C.ZHI_POS[a] === b) zhiPairs.push({ type: '破', name: `${a}${b}相破`, elements: [a, b], pillars: [keys[i], keys[j]] });
        if (C.ZHI_ATTS[a]?.['暗'] === b) zhiPairs.push({ type: '暗合', name: `${a}${b}暗合`, elements: [a, b], pillars: [keys[i], keys[j]] });
        if (C.ZHI_ATTS[b]?.['暗'] === a) zhiPairs.push({ type: '暗合', name: `${b}${a}暗合`, elements: [a, b], pillars: [keys[i], keys[j]] });
      }
    }

    // 三合、三会寻找函数
    const findTriplets = (arr, set) => {
      const results = [];
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          for (let k = j + 1; k < arr.length; k++) {
            const triplet = [arr[i], arr[j], arr[k]];
            if (set.every(z => triplet.includes(z))) {
              results.push([i, j, k]);
            }
          }
        }
      }
      return results;
    };

    // 三合
    for (const [combo, wuxing] of Object.entries(C.ZHI_3HES)) {
      const triplets = findTriplets(zArr, combo.split(''));
      triplets.forEach(indices => {
        zhiPairs.push({ type: '三合', name: `${combo}三合${wuxing}局`, elements: [zArr[indices[0]], zArr[indices[1]], zArr[indices[2]]], pillars: indices.map(i => keys[i]) });
      });
    }
    // 三会
    for (const [combo, wuxing] of Object.entries(C.ZHI_HUIS)) {
      const triplets = findTriplets(zArr, combo.split(''));
      triplets.forEach(indices => {
        zhiPairs.push({ type: '三会', name: `${combo}三会${wuxing}局`, elements: [zArr[indices[0]], zArr[indices[1]], zArr[indices[2]]], pillars: indices.map(i => keys[i]) });
      });
    }

    return { gans: ganPairs, zhis: zhiPairs };
  },

  /**
   * 高频命理格局断语触发器
   * @returns {string[]} 触发的断语数组
   */
  extractAdvancedPatterns(dayGan, gans, zhis, allShens, geJu, strengthResult) {
    const patterns = [];
    const zArr = Array.isArray(zhis) ? zhis : [zhis.year, zhis.month, zhis.day, zhis.time];
    const gArr = Array.isArray(gans) ? gans : [gans.year, gans.month, gans.day, gans.time];
    const dayZhi = zArr[2], monthZhi = zArr[1], timeZhi = zArr[3];
    const dayPillar = gArr[2] + zArr[2];
    const timePillar = gArr[3] + timeZhi;
    const isYang = ['甲', '丙', '戊', '庚', '壬'].includes(dayGan);
    const meStatus = zArr.map(z => getDiShi(dayGan, z));
    const luZhi = C.LU_SHEN[dayGan];
    const kuZhi = C.KU_ZHI[dayGan];
    const jueZhi = C.JUE_ZHI[dayGan];

    // ── 魁罡格
    if (['庚辰', '庚戌', '壬辰', '戊戌'].includes(dayPillar))
      patterns.push('【魁罡格】日主庚辰/庚戌/壬辰/戊戌，身强无刑冲者主大贵，重叠尤佳；忌财官显露。');

    // ── 金神格
    if (['乙丑', '己巳', '癸酉'].includes(timePillar))
      patterns.push('【金神格】时柱乙丑/己巳/癸酉，甲日为主，通金火局者佳命。');

    // ── 天罗地网
    if (zArr.includes('辰') && zArr.includes('巳')) patterns.push('【地网】辰巳同现，宜遵纪守法。');
    if (zArr.includes('戌') && zArr.includes('亥')) patterns.push('【天罗】戌亥同现，易怀才不遇。');

    // ── 建禄格
    if (getShen(dayGan, monthZhi) === '比' || monthZhi === luZhi) {
      patterns.push('【建禄格】月支为日主禄位，最喜天干有财官，忌见比劫过多；一生自立，难聚祖财。');
      if (allShens.filter(s => s === '官' || s === '才' || s === '财').length >= 2)
        patterns.push('\t建禄财官双透，格局佳。');
      if (allShens.filter(s => s === '比' || s === '劫').length > 2)
        patterns.push('\t建禄比劫过多，克妻争财，一生多波折。');
    }

    // ── 阳刃格
    if (isYang && zArr[1] === C.YANG_REN[dayGan]) {
      patterns.push('【阳刃格】月支阳刃，喜七杀驾刃或正官制刃。甲庚壬逢冲多祸，忌财星透出。');
    }

    // ── 偏印格
    if (['枭'].filter(s => allShens.includes(s)).length && getShen(dayGan, monthZhi) === '枭') {
      patterns.push('【偏印格】月令偏印，喜偏财相配，忌食神见之（倒食）；性格孤高，艺术宗教倾向。');
    }

    // ── 自坐劫库 + 时杀/官
    if (dayZhi === kuZhi) {
      const timeShen = getShen(dayGan, gArr[3]);
      if (timeShen === '杀') patterns.push('【自坐劫库·时杀格】贵！有权威。');
      if (timeShen === '官') patterns.push('【自坐劫库·时官格】孤贵！');
    }

    // ── 胎绝过多
    const jueCount = zArr.filter(z => z === jueZhi || z === C.TAI_ZHI[dayGan]).length;
    if (jueCount > 2) patterns.push('胎绝超过三个，身体偏弱，早年多磨难。');

    // ── 缺四生/四正/四库
    const sheng = zArr.filter(z => ['寅', '申', '巳', '亥'].includes(z));
    const zheng = zArr.filter(z => ['子', '午', '卯', '酉'].includes(z));
    const ku = zArr.filter(z => ['辰', '戌', '丑', '未'].includes(z));
    if (sheng.length === 0) patterns.push('地支缺四生（寅申巳亥），一生不敢大作为。');
    if (zheng.length === 0) patterns.push('地支缺四正（子午卯酉），一生避是非。');
    if (ku.length === 0) patterns.push('地支缺四库（辰戌丑未），潜伏性凶灾少。');

    // ── 十神过多过少
    const biCount = allShens.filter(s => s === '比').length;
    const jiCount = allShens.filter(s => s === '劫').length;
    const shaCount = allShens.filter(s => s === '杀').length;
    const shangCount = allShens.filter(s => s === '伤').length;
    const xiaoCount = allShens.filter(s => s === '枭').length;

    if (biCount > 2) patterns.push('比肩过多：自我意识强，兄弟竞争激烈，男有双妻倾向，女轻视夫。宜有官杀制。');
    if (jiCount > 2) patterns.push('劫财过多：合伙多散，婚姻不稳，精明反被精明误。');
    if (shaCount > 2) patterns.push('七杀过多无制：性格刚强偏激，是非多；宜食神制杀或印化杀。');
    if (shangCount > 2) patterns.push('伤官过多：才华横溢但叛逆，女命婚姻不顺，男命口舌是非多。');
    if (xiaoCount > 2) patterns.push('偏印过多：性格孤僻，做事有始无终，女命子息不旺。');

    // ── 四柱全阳/全阴
    const yinyangArr = [...gArr, ...zArr].map(x => {
      const gi = C.GAN.indexOf(x); const zi = C.ZHI.indexOf(x === undefined ? '' : x);
      if (gi >= 0) return gi % 2 === 0 ? '+' : '-';
      if (zi >= 0) return zi % 2 === 0 ? '+' : '-';
      return null;
    }).filter(Boolean);
    if (yinyangArr.every(y => y === '+')) patterns.push('四柱全阳：行事果断，阳刚进取，但缺柔和变通。');
    if (yinyangArr.every(y => y === '-')) patterns.push('四柱全阴：性格内敛，心思细腻，女命声誉需注意。');

    return patterns;
  },

  /**
   * 扩展神煞计算（结合 Python year/month/day/g_shens）
   */
  calculateShenShaFull(baziObj) {
    const { year, month, day, time } = baziObj;
    const yearGan = year[0], yearZhi = year[1];
    const monthGan = month[0], monthZhi = month[1];
    const dayGan = day[0], dayZhi = day[1];
    const timeGan = time[0], timeZhi = time[1];
    const result = { year: [], month: [], day: [], time: [] };
    const pillars = { year: [yearGan, yearZhi], month: [monthGan, monthZhi], day: [dayGan, dayZhi], time: [timeGan, timeZhi] };

    for (const [key, [gan, zhi]] of Object.entries(pillars)) {
      // 年支起神煞（不包含年柱自身）
      for (const [shen, map] of Object.entries(C.YEAR_SHENS)) {
        const target = map[yearZhi] || '';
        if (target.includes(zhi) && key !== 'year') result[key].push(shen);
      }
      // 月支起神煞
      for (const [shen, map] of Object.entries(C.MONTH_SHENS)) {
        const target = map[monthZhi];
        if (target === gan || target === zhi) result[key].push(shen);
      }
      // 日支起神煞（不含日柱）
      for (const [shen, map] of Object.entries(C.DAY_SHENS)) {
        if (map[dayZhi] === zhi && key !== 'day') result[key].push(shen);
      }
      // 日干起神煞
      for (const [shen, map] of Object.entries(C.G_SHENS)) {
        const targets = map[dayGan] || '';
        if (targets.includes(zhi)) result[key].push(shen);
      }
    }
    const fmt = arr => arr.length ? arr.join(' ') : '-';
    return { year: fmt(result.year), month: fmt(result.month), day: fmt(result.day), time: fmt(result.time) };
  },

  // ── 文案组装 ──────────────────────────────────────────────────────────────

  /**
   * 组装原局核心断语
   */
  buildYuanjuCore(dayGan, monthZhi, gans, zhis, geJu, strengthResult, favorableResult, patterns) {
    const { strongWeak, strongScore, scores, totalStrengthScore, strengthBasis } = strengthResult;
    const { wuxing, core_shens, verdict } = favorableResult;
    const dayPillar = (Array.isArray(gans) ? gans[2] : gans.day) + (Array.isArray(zhis) ? zhis[2] : zhis.day);
    const nayin = C.NAYINS[dayPillar] || '';

    const wuxingStr = Object.entries(scores).map(([k, v]) => `${k}${v}`).join(' ');
    const lines = [
      `【格局】${geJu}`,
      `【强弱】${strongWeak}（综合分${formatScore(totalStrengthScore)}，助身力${strongScore}，五行：${wuxingStr}）`,
      `【依据】${strengthBasis}`,
      `【喜忌】喜 ${wuxing.favorable.join('、') || '无'} (${core_shens.favorable.join('、') || '无'}) | 忌 ${wuxing.unfavorable.join('、') || '无'} (${core_shens.unfavorable.join('、') || '无'})`,
      `【天机】${verdict}`,
      nayin ? `【日柱】${dayPillar}·${nayin}` : '',
      '',
      patterns.length ? '【命局特征】\n' + patterns.join('\n') : '',
      '',
      `${C.JINS[dayGan] ? '【注意】' + C.JINS[dayGan] : ''}`
    ];
    return lines.filter(Boolean).join('\n').trim();
  },

  /**
   * 组装当前大运断语
   */
  buildCurrentDayun(dayunGan, dayunZhi, dayGan, zhis, gans) {
    if (!dayunGan || !dayunZhi) return '暂无大运数据。';
    const zArr = Array.isArray(zhis) ? zhis : [zhis.year, zhis.month, zhis.day, zhis.time];
    const dayunShen = C.SHISHEN[dayGan][dayunGan] || '';
    const dayunZhiShen = getShen(dayGan, dayunZhi);
    const dayunPhase = getDiShi(dayGan, dayunZhi);

    const rels = [];
    const chong = C.ZHI_CHONGS[dayunZhi];
    if (chong && zArr.includes(chong)) rels.push(`与原局${chong}相冲`);
    const liuhe = C.ZHI_ATTS[dayunZhi]?.['六'];
    if (liuhe && zArr.includes(liuhe)) rels.push(`与原局${liuhe}六合`);
    const xing = C.XINGS[dayunZhi];
    if (xing && zArr.includes(xing) && xing !== dayunZhi) rels.push(`与原局${xing}相刑`);
    const hai = C.ZHI_HAIS[dayunZhi];
    if (hai && zArr.includes(hai)) rels.push(`与原局${hai}相害`);

    const favorableSigns = ['印', '枭', '比', '劫'];
    const isGood = favorableSigns.includes(dayunShen) || favorableSigns.includes(dayunZhiShen);
    const verdict = isGood ? '整体偏吉，宜稳健进取' : '压力较大，宜守成待时';

    const lines = [
      `当前大运：${dayunGan}${dayunZhi}（天干${dayunShen}，地支${dayunZhiShen}·${dayunPhase}）`,
      rels.length ? `大运与原局：${rels.join('；')}` : '大运与原局无明显刑冲合害',
      verdict + '。',
      C.JINS[dayGan] ? `金不换提示：${C.JINS[dayGan]}` : ''
    ];
    return lines.filter(Boolean).join('\n');
  },

  /**
   * 组装当前流年简评
   */
  buildCurrentLiunian(lnGan, lnZhi, dayunGan, dayunZhi, dayGan, zhis) {
    if (!lnGan || !lnZhi) return '暂无流年数据。';
    const zArr = Array.isArray(zhis) ? zhis : [zhis.year, zhis.month, zhis.day, zhis.time];
    const lnShen = C.SHISHEN[dayGan][lnGan] || '';
    const lnZhiShen = getShen(dayGan, lnZhi);

    const rels = [];
    const chong = C.ZHI_CHONGS[lnZhi];
    if (chong && zArr.includes(chong)) rels.push(`冲原局${chong}`);
    if (chong === dayunZhi) rels.push(`冲大运地支${dayunZhi}`);
    const liuhe = C.ZHI_ATTS[lnZhi]?.['六'];
    if (liuhe && zArr.includes(liuhe)) rels.push(`合原局${liuhe}`);
    const xing = C.XINGS[lnZhi];
    if (xing && xing !== lnZhi && zArr.includes(xing)) rels.push(`刑原局${xing}`);

    const goodShens = ['印', '枭', '比', '劫'];
    const lnGood = goodShens.includes(lnShen);
    const verdict = lnGood ? '流年助力，宜主动出击' : '流年压身，宜谨慎稳健';

    const lines = [
      `流年${lnGan}${lnZhi}（天干${lnShen}，地支${lnZhiShen}）`,
      rels.length ? `流年动态：${rels.join('；')}` : '流年与原局无明显刑冲',
      verdict + '。'
    ];
    return lines.filter(Boolean).join('\n');
  }
};

BaziRuleEngine._test = { parseTiaohou, aggregateShens, getTiaohouUnfavorablePenalty };

module.exports = { BaziRuleEngine, getDiShi, getShen, isKong };
