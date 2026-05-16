/**
 * calculateDailyScore.js
 * ─────────────────────────────────────────────────────────────────────────────
 * 纯 Node.js 实现的八字日运算分引擎（依据《渊海子平》体系）
 * 不依赖任何大模型，所有分值由确定性逻辑推导。
 *
 * 外部依赖：lunar-javascript（已在项目中引入）
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const {
  normalizeShenProfile,
  getShiShenTier,
  getShiShenListTier,
  TIER_LABELS,
} = require('./normalizeShenProfile');

// ══════════════════════════════════════════════════════════════════════════════
// § 1  常量字典
// ══════════════════════════════════════════════════════════════════════════════

/** 天干顺序索引（0-9） */
const GAN_LIST = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

/** 地支顺序索引（0-11） */
const ZHI_LIST = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/**
 * 天干五行映射
 * 甲乙→木, 丙丁→火, 戊己→土, 庚辛→金, 壬癸→水
 */
const GAN_WUXING = {
  甲: '木', 乙: '木',
  丙: '火', 丁: '火',
  戊: '土', 己: '土',
  庚: '金', 辛: '金',
  壬: '水', 癸: '水',
};

/**
 * 地支五行映射（取主气）
 * 子→水, 丑→土, 寅→木, 卯→木, 辰→土, 巳→火,
 * 午→火, 未→土, 申→金, 酉→金, 戌→土, 亥→水
 */
const ZHI_WUXING = {
  子: '水', 丑: '土', 寅: '木', 卯: '木',
  辰: '土', 巳: '火', 午: '火', 未: '土',
  申: '金', 酉: '金', 戌: '土', 亥: '水',
};

/**
 * 十神映射表：key = `${流日天干}${命主日干}`, value = 十神名称
 *
 * 十神推算规则（以命主日干为参照）：
 *   同阴阳克我 = 正官；异阴阳克我 = 七杀
 *   同阴阳生我 = 正印；异阴阳生我 = 偏印（枭神）
 *   同阴阳我生 = 伤官；异阴阳我生 = 食神
 *   同阴阳我克 = 正财；异阴阳我克 = 偏财
 *   同阴阳比肩；异阴阳劫财
 *
 * 五行相生：木→火→土→金→水→木
 * 五行相克：木克土, 土克水, 水克火, 火克金, 金克木
 */
const WUXING_SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }; // A 生 B
const WUXING_KE    = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }; // A 克 B

/**
 * 地支六冲表（互为冲）
 * 子午冲, 丑未冲, 寅申冲, 卯酉冲, 辰戌冲, 巳亥冲
 */
const ZHI_CHONG = {
  子: '午', 午: '子',
  丑: '未', 未: '丑',
  寅: '申', 申: '寅',
  卯: '酉', 酉: '卯',
  辰: '戌', 戌: '辰',
  巳: '亥', 亥: '巳',
};

/**
 * 地支六合表（合化五行）
 * 格式：{ 地支A: { partner: 地支B, huaWuxing: '五行' } }
 */
const ZHI_LIUHE = {
  子: { partner: '丑', huaWuxing: '土' },
  丑: { partner: '子', huaWuxing: '土' },
  寅: { partner: '亥', huaWuxing: '木' },
  亥: { partner: '寅', huaWuxing: '木' },
  卯: { partner: '戌', huaWuxing: '火' },
  戌: { partner: '卯', huaWuxing: '火' },
  辰: { partner: '酉', huaWuxing: '金' },
  酉: { partner: '辰', huaWuxing: '金' },
  巳: { partner: '申', huaWuxing: '水' },
  申: { partner: '巳', huaWuxing: '水' },
  午: { partner: '未', huaWuxing: '土' },
  未: { partner: '午', huaWuxing: '土' },
};

/**
 * 地支三合表（合化五行）
 * 每一个地支对应其所在三合局及合化五行
 * 三合需三支齐全才算完整三合；此处记录关系供双支判断用
 */
const ZHI_SANHE_MAP = {
  // 申子辰 → 水局
  申: { group: ['申', '子', '辰'], huaWuxing: '水' },
  子: { group: ['申', '子', '辰'], huaWuxing: '水' },
  辰: { group: ['申', '子', '辰'], huaWuxing: '水' },
  // 亥卯未 → 木局
  亥: { group: ['亥', '卯', '未'], huaWuxing: '木' },
  卯: { group: ['亥', '卯', '未'], huaWuxing: '木' },
  未: { group: ['亥', '卯', '未'], huaWuxing: '木' },
  // 寅午戌 → 火局
  寅: { group: ['寅', '午', '戌'], huaWuxing: '火' },
  午: { group: ['寅', '午', '戌'], huaWuxing: '火' },
  戌: { group: ['寅', '午', '戌'], huaWuxing: '火' },
  // 巳酉丑 → 金局
  巳: { group: ['巳', '酉', '丑'], huaWuxing: '金' },
  酉: { group: ['巳', '酉', '丑'], huaWuxing: '金' },
  丑: { group: ['巳', '酉', '丑'], huaWuxing: '金' },
};

/**
 * 地支六害表
 * 子未害, 丑午害, 寅巳害, 卯辰害, 申亥害, 酉戌害
 */
const ZHI_LIUHAI = {
  子: '未', 未: '子',
  丑: '午', 午: '丑',
  寅: '巳', 巳: '寅',
  卯: '辰', 辰: '卯',
  申: '亥', 亥: '申',
  酉: '戌', 戌: '酉',
};

/**
 * 三刑组合（无恩之刑 + 恃势之刑 + 自刑）
 * 规则：流日地支与原局任意地支组成三刑
 *   寅巳申（无恩之刑）
 *   丑戌未（恃势之刑）
 *   子卯（无礼之刑，两支即成刑）
 *   辰午酉亥（自刑，单支即刑，本引擎仅在成组时触发）
 */
const SAN_XING_GROUPS = [
  new Set(['寅', '巳', '申']),
  new Set(['丑', '戌', '未']),
];
// 子卯是两支即成刑（特殊处理）
const ER_XING_PAIRS = [['子', '卯'], ['卯', '子']];

/**
 * 建除十二神评分表
 */
const ZHIXING_SCORE = {
  成: 10, 开: 10,
  定: 4,  执: 4, 除: 4, 满: 4,
  平: 0,  危: 0, 收: 0,
  建: -10, 破: -10, 闭: -10,
};

// ══════════════════════════════════════════════════════════════════════════════
// § 2  辅助函数
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 判断天干阴阳
 * 甲丙戊庚壬 → 阳；乙丁己辛癸 → 阴
 * @param {string} gan 天干
 * @returns {'阳'|'阴'}
 */
function ganYinYang(gan) {
  return GAN_LIST.indexOf(gan) % 2 === 0 ? '阳' : '阴';
}

/**
 * 获取十神
 * 以命主日干为参照，推算流日天干的十神名称
 *
 * @param {string} liuGan  流日天干（被推算方）
 * @param {string} riGan   命主日干（参照方）
 * @returns {string}       十神名称
 */
function getShiShen(liuGan, riGan) {
  const liuWuxing = GAN_WUXING[liuGan];
  const riWuxing  = GAN_WUXING[riGan];
  const liuYY     = ganYinYang(liuGan);
  const riYY      = ganYinYang(riGan);
  const sameYY    = liuYY === riYY; // 同阴阳

  // 比肩/劫财：同五行
  if (liuWuxing === riWuxing) {
    return sameYY ? '比肩' : '劫财';
  }

  // 生我（印）：liuWuxing 生 riWuxing
  if (WUXING_SHENG[liuWuxing] === riWuxing) {
    return sameYY ? '偏印' : '正印';
  }

  // 我生（食/伤）：riWuxing 生 liuWuxing
  if (WUXING_SHENG[riWuxing] === liuWuxing) {
    return sameYY ? '食神' : '伤官';
  }

  // 克我（官/杀）：liuWuxing 克 riWuxing
  if (WUXING_KE[liuWuxing] === riWuxing) {
    return sameYY ? '七杀' : '正官';
  }

  // 我克（财）：riWuxing 克 liuWuxing
  if (WUXING_KE[riWuxing] === liuWuxing) {
    return sameYY ? '偏财' : '正财';
  }

  // 理论上不应走到这里，防御性返回
  return '未知';
}

/**
 * 将五行名称转化为对应的十神名称（相对命主日干）
 * 用于合化后的十神判断
 *
 * @param {string} wuxing  合化五行
 * @param {string} riGan   命主日干
 * @returns {string[]}     可能的十神列表（同/异阴阳分别对应不同十神）
 */
function wuxingToShiShenList(wuxing, riGan) {
  const riWuxing = GAN_WUXING[riGan];

  if (wuxing === riWuxing)                       return ['比肩', '劫财'];
  if (WUXING_SHENG[wuxing] === riWuxing)         return ['偏印', '正印'];
  if (WUXING_SHENG[riWuxing] === wuxing)         return ['食神', '伤官'];
  if (WUXING_KE[wuxing] === riWuxing)            return ['七杀', '正官'];
  if (WUXING_KE[riWuxing] === wuxing)            return ['偏财', '正财'];

  return [];
}

/**
 * 合化得分（四维体系）
 * 用神合 → +6；喜神合 → +4；忌神合 → -5；仇神合 → -4；闲神合 → +1
 *
 * @param {string[]} shiShenList 十神名称列表（合化后的十神）
 * @param {Object}   shen        四维用神对象 { yong, xi, ji, chou }
 * @returns {number}
 */
function calcHeHuaScore(shiShenList, shen) {
  const tier = getShiShenListTier(shiShenList, shen);
  const SCORES = { yong: 6, xi: 4, xian: 1, chou: -4, ji: -5 };
  return SCORES[tier] ?? 1;
}

/**
 * 判断流日地支是否落入旬空亡字符串
 * lunarDay.getDayXunKong() 返回如 "戌亥" 这样的两字字符串
 *
 * @param {string} liuZhi   流日地支
 * @param {string} kongWang 旬空亡字符串（如 "戌亥"）
 * @returns {boolean}
 */
function isKongWang(liuZhi, kongWang) {
  if (!kongWang || kongWang.length < 2) return false;
  return kongWang.includes(liuZhi);
}

/**
 * 判断是否触发三刑（含子卯两支即成刑）
 *
 * @param {string}   liuZhi    流日地支
 * @param {string[]} yuanZhis  命主原局地支数组（日支、月支、年支）
 * @returns {boolean}
 */
function hasSanXing(liuZhi, yuanZhis) {
  const allZhis = new Set([liuZhi, ...yuanZhis.filter(Boolean)]);

  // 检查三支完整三刑组合
  for (const group of SAN_XING_GROUPS) {
    if ([...group].every(z => allZhis.has(z))) return true;
  }

  // 子卯两支即成刑（无礼之刑）
  if (allZhis.has('子') && allZhis.has('卯')) return true;

  return false;
}

// ══════════════════════════════════════════════════════════════════════════════
// § 3  核心算分函数
// ══════════════════════════════════════════════════════════════════════════════

/**
 * calculateDailyScore
 * ─────────────────────────────────────────────────────────────────────────────
 * 纯 JS 日运算分主函数
 *
 * @param {Object}  profile              用户八字档案
 * @param {string[]} profile.favorable_elements   喜用神十神列表（如 ["印星","比劫"]）
 * @param {string[]} profile.unfavorable_elements 忌仇神十神列表（如 ["官杀","食伤"]）
 * @param {string}  profile.day_zhi      命主原局日支（如 "丑"）
 * @param {string}  profile.year_zhi     命主原局年支（如 "寅"）
 * @param {string}  [profile.month_zhi]  命主原局月支（可选）
 * @param {string}  profile.ri_zhu       命主日柱干支（如 "甲子"）
 * @param {Object}  lunarDay             lunar-javascript 的 Lunar 对象（当日）
 *
 * @returns {{
 *   final_score: number,
 *   is_kongwang: boolean,
 *   has_sanxing: boolean,
 *   breakdown: {
 *     dim1_score: number,
 *     dim2_score: number,
 *     dim3_score: number
 *   }
 * }}
 */
function calculateDailyScore(profile, lunarDay) {

  // ── § 3.0  前置数据提取 ─────────────────────────────────────────────────────

  // 从日柱中截取第一个字符作为命主日干（⚠️ 函数内部唯一使用点）
  const riGan = profile.ri_zhu.charAt(0);

  // 四维用神体系（向后兼容旧格式 favorable_elements / unfavorable_elements）
  const shen = normalizeShenProfile(profile);

  // 命主原局地支（日、月、年）
  const yuanRiZhi   = profile.day_zhi   || '';
  const yuanYueZhi  = profile.month_zhi || '';   // 可选
  const yuanNianZhi = profile.year_zhi  || '';

  // 从 lunar-javascript 取今日八字数据
  const eightChar = lunarDay.getEightChar();
  const day_gz    = eightChar.getDay();          // 如 "甲子"
  const liuGan    = day_gz.charAt(0);            // 流日天干
  const liuZhi    = day_gz.charAt(1);            // 流日地支

  // 今日年月柱地支（用于空亡填实判断）
  const year_gz   = eightChar.getYear();
  const month_gz  = eightChar.getMonth();
  const nianZhi   = year_gz.charAt(1);
  const yueZhi    = month_gz.charAt(1);

  // ── § 3.1  维度 1：流日天干十神（四维体系）────────────────────────────────
  // 用神 +10 / 喜神 +6 / 闲神 0 / 仇神 -5 / 忌神 -8
  // 依据：《滴天髓》用神>喜神，仇神=忌神援敌（间接伤害权重低于忌神直接伤害）

  const shiShen = getShiShen(liuGan, riGan);
  const tier1   = getShiShenTier(shiShen, shen);
  const DIM1_SCORES = { yong: 10, xi: 6, xian: 0, chou: -5, ji: -8 };
  let dim1Score = DIM1_SCORES[tier1] ?? 0;

  // ── § 3.2  维度 2：地支刑冲合害（累加，三刑熔断）─────────────────────────

  let dim2Score    = 0;
  let hasSanXingFlag = false;

  // ── 优先检查三刑熔断 ──
  // 将命主所有原局地支汇总，与流日地支一起判断是否触发三刑
  const yuanZhisArr = [yuanRiZhi, yuanYueZhi, yuanNianZhi].filter(Boolean);
  if (hasSanXing(liuZhi, yuanZhisArr)) {
    // 三刑触发：熔断，维度 2 强制 -15，跳出后续逻辑
    dim2Score      = -15;
    hasSanXingFlag = true;
  } else {
    // ── 冲 ──
    // 冲命主日支 → -10
    if (ZHI_CHONG[liuZhi] === yuanRiZhi) {
      dim2Score += -10;
    }
    // 冲命主月支（动提纲）→ -8（月支存在时才判断）
    if (yuanYueZhi && ZHI_CHONG[liuZhi] === yuanYueZhi) {
      dim2Score += -8;
    }
    // 冲命主年支 → -4
    if (yuanNianZhi && ZHI_CHONG[liuZhi] === yuanNianZhi) {
      dim2Score += -4;
    }

    // ── 伏吟（流日地支 === 命主日支）→ -2 ──
    if (liuZhi === yuanRiZhi) {
      dim2Score += -2;
    }

    // ── 六害 ──
    // 害命主日支或年支 → -4
    if (ZHI_LIUHAI[liuZhi] === yuanRiZhi || ZHI_LIUHAI[liuZhi] === yuanNianZhi) {
      dim2Score += -4;
    }

    // ── 合化计算（六合 + 三合）──
    // 规则：若流日地支与 day_zhi 或 year_zhi 形成六合/三合，
    //       先取合化五行，再判断该五行对命主日干的十神属性，按喜忌加减分。

    // 六合判断
    const liuHeInfo = ZHI_LIUHE[liuZhi];
    if (liuHeInfo) {
      const { partner: hePartner, huaWuxing: heHuaWuxing } = liuHeInfo;
      if (hePartner === yuanRiZhi || hePartner === yuanNianZhi) {
        const heShiShenList = wuxingToShiShenList(heHuaWuxing, riGan);
        dim2Score += calcHeHuaScore(heShiShenList, shen);
      }
    }

    // 三合判断（流日地支与原局地支形成三合半/三合）
    const sanHeInfo = ZHI_SANHE_MAP[liuZhi];
    if (sanHeInfo) {
      const { group: sanHeGroup, huaWuxing: sanHeHuaWuxing } = sanHeInfo;
      const hasSanHePartner = sanHeGroup.some(z => z !== liuZhi && yuanZhisArr.includes(z));
      if (hasSanHePartner) {
        const sanHeShiShenList = wuxingToShiShenList(sanHeHuaWuxing, riGan);
        dim2Score += calcHeHuaScore(sanHeShiShenList, shen);
      }
    }
  }

  // ── § 3.3  维度 3：建除十二神（±10 分）──────────────────────────────────

  // 调用 lunar-javascript API 获取当日建除神
  const zhiXing   = lunarDay.getZhiXing();            // 如 "成"、"开"、"破" 等
  const dim3Score = ZHIXING_SCORE[zhiXing] ?? 0;      // 未命中则按 0 处理

  // ── § 3.4  空亡降维（最高优先级）────────────────────────────────────────

  const kongWangStr = lunarDay.getDayXunKong();        // 如 "戌亥"
  let isKongWangFlag = false;

  // 判断流日地支是否在旬空亡内
  if (isKongWang(liuZhi, kongWangStr)) {
    // 检查是否有填实（流日地支出现在当日年柱或月柱地支中）
    const isFilled = (liuZhi === nianZhi) || (liuZhi === yueZhi);

    if (!isFilled) {
      // 未填实 → 触发空亡降维
      isKongWangFlag = true;
    }
  }

  // ── § 3.5  汇总计分 ──────────────────────────────────────────────────────

  // 基础水位线 70 分，累加三个维度
  const BASE_SCORE = 70;
  let rawTotal = BASE_SCORE + dim1Score + dim2Score + dim3Score;

  // 空亡降维：将前三维度合计 × 0.7（向下取整），然后重新叠加基础分
  if (isKongWangFlag) {
    const dimTotal = dim1Score + dim2Score + dim3Score;
    const reducedDim = Math.floor(dimTotal * 0.7);
    rawTotal = BASE_SCORE + reducedDim;
  }

  // 区间校验：锁定在 45 ~ 98（空亡降维之后再做）
  const finalScore = Math.min(98, Math.max(45, rawTotal));

  // ── § 3.6  返回结果 ──────────────────────────────────────────────────────

  return {
    final_score:  finalScore,
    is_kongwang:  isKongWangFlag,
    has_sanxing:  hasSanXingFlag,
    breakdown: {
      dim1_score: dim1Score,
      dim2_score: dim2Score,
      dim3_score: dim3Score,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// § 4  导出
// ══════════════════════════════════════════════════════════════════════════════

module.exports = { calculateDailyScore, getShiShen };
