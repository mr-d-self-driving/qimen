/**
 * DIM5 缘分指数 · 文本生成引擎
 * 输入：月支社交宫关系、神煞互见情况、DIM5 最终分数
 * 输出：扫描短断语 / Badge / 结论断语
 *
 * 理论来源：
 *   - 月支社交宫对位（L5-A）= 两人的社交节奏是否天然对频
 *   - 神煞互见（L5-B）= 桃花/天乙贵人/文昌等吉神在对方命位落点
 *   缘分指数 = 月令对位 × 社交神煞加持
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Module B · Badge
// ─────────────────────────────────────────────────────────────────────────────

const BADGE_TIERS = [
  {
    min: 71,
    badge: '命定缘分 ✦',
    subtext: '不是努力凑在一起，是命盘写好了「你们就会在同一个场出现」——不认识也会认识。',
  },
  {
    min: 41,
    badge: '同圈层搭子 ✦',
    subtext: '出现在同一个圈子里不是巧合——月令和神煞都在往一块儿推你们。',
  },
  {
    min: 11,
    badge: '偶有交集',
    subtext: '不是天然同圈层，但偶尔会在意想不到的场合碰到——神煞有些命中，没全中。',
  },
  {
    min: -10,
    badge: '各走各的',
    subtext: '社交宫没有共振，两人的圈子更多是平行的，交集要靠后天维持。',
  },
  {
    min: -40,
    badge: '圈层不搭',
    subtext: '月令方向有些别劲，在公开场合各自为政——强行放在一个场里反而尴尬。',
  },
  {
    min: -Infinity,
    badge: '场合里的陌生人',
    subtext: '哪怕认识了，在人多的地方还是觉得对方来自另一个世界——月令冲，没办法。',
  },
];

/**
 * @param {number} score  DIM5 最终分数 [-100, +100]
 * @returns {{ badge: string, subtext: string }}
 */
function getBadge(score) {
  return BADGE_TIERS.find(t => score >= t.min);
}

// ─────────────────────────────────────────────────────────────────────────────
// Module A · 月支扫描短断语
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {'六合'|'同支'|'三合'|'相生'|'无明显'|'相克'|'害'|'冲'} monthRelation  月支关系
 * @param {{ a: string, b: string }} names
 * @returns {string}
 */
function getScanCaption(monthRelation, names) {
  const { a: A, b: B } = names;

  if (monthRelation === '六合')
    return `月令六合——${A}和${B}的社交节奏天然咬合。不是刻意安排，就是会出现在同一个场合，然后自然认识对方的朋友，自然进入同一个圈子。`;
  if (monthRelation === '同支')
    return `月令相同：两人在同一节奏里长大，处理社交场合的方式几乎一样。在一起参加活动，不用解释，不用磨合。`;
  if (monthRelation === '三合')
    return `月令三合：有共同的社交圈或行业场域，见面多了不奇怪——互相认识对方的朋友，也很自然。`;
  if (monthRelation === '相生')
    return `月令相生：社交场合里，两人的气场会自然助力——出现在一起，整体能量比各自单独强。`;
  if (monthRelation === '冲')
    return `月令相冲：社交风格正面碰撞。两人在公开场合容易出现摩擦，各说各的，强行凑在一个场反而尴尬。`;
  if (monthRelation === '害')
    return `月令相害：在社交场合里容易无意间踩到对方的节奏——说不清哪里不对，但就是有点别扭。`;
  if (monthRelation === '相克')
    return `月令相克：处事风格有根本差异，在公开场合各自为政，融合需要额外努力。`;
  return `月令没有明显关系：各有各的社交圈，交集不多。不是关系不好，是两个不同世界的人，需要后天维系。`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module C · 结论断语
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {'六合'|'同支'|'三合'|'相生'|'无明显'|'相克'|'害'|'冲'} monthRelation
 * @param {number} dim5Score
 * @param {{ a: string, b: string }} names
 * @param {string[]} socialStars  命中的社交神煞名称列表
 * @param {'双向'|'A→B'|'B→A'|'无'} starDirection  神煞命中方向
 * @returns {{ title: string, body: string[] }}
 */
function getVerdict(monthRelation, dim5Score, names, socialStars = [], starDirection = '无') {
  const { a: A, b: B } = names;
  const stars = socialStars.join('、') || '贵人信号';

  if (monthRelation === '六合' && dim5Score >= 41) {
    return {
      title: `不用刻意，<br>就会出现在<span style="color:var(--social)">同一个场合</span>`,
      body: [
        `月令六合——两人的社交宫天然咬合，不需要提前约好，就是会在同一个饭局、同一个展览、同一个朋友群里遇到。<span style="color:var(--ca)">${A}</span>的社交频率和<span style="color:var(--cb)">${B}</span>的正好是彼此顺的那种。`,
        starDirection === '双向'
          ? `${stars}双向互见是额外加持：在人群里，两人的能量都能被对方自然接收，不用解释、不用表演——TA 就是懂。`
          : `${stars}有命中，在对方面前能量自然能被感知到。`,
        `这种缘分不是努力换来的，是命盘里写好的默契。<strong>跟TA在人多的地方，你会比平时更像自己</strong>。`,
      ],
    };
  }
  if (monthRelation === '同支' && dim5Score >= 41) {
    return {
      title: `同一个节奏，<br>同一种<span style="color:var(--social)">社交风格</span>`,
      body: [
        `月令相同：两人处理社交场合的方式几乎一致，在一起不需要解释，不需要磨合。${A}和${B}出现在同一个场合，是那种「怎么你也在？」然后完全不尴尬的类型。`,
        `神煞加持让这份默契更稳——在公开场合里，两人的气场自然合拍，彼此都能发挥出更好的状态。`,
        `不是刻意维持的关系，是<strong>出现在哪里都能接住对方</strong>的那种人。`,
      ],
    };
  }
  if ((monthRelation === '三合' || monthRelation === '相生') && dim5Score >= 11) {
    return {
      title: `社交圈里，<br>你们是<span style="color:var(--social)">彼此的常客</span>`,
      body: [
        `月令${monthRelation}：有共同的社交场域或行业圈，见面多了不奇怪，认识对方的朋友也很自然——${A}和${B}本来就属于同一个「生态圈」。`,
        socialStars.length > 0
          ? `${stars}有命中，在对方的圈子里，会自然成为彼此的助力。`
          : `社交场合里两人的气场能自然配合，不需要刻意融合。`,
      ],
    };
  }
  if (dim5Score <= -11) {
    return {
      title: `社交圈里，<br>两个<span style="color:var(--ca)">不同世界</span>的人`,
      body: [
        `月令没有形成共振，两人的社交风格和圈子方向基本是平行的——强行往一个圈里放，容易各自为政，比较尴尬。`,
        `不是关系不好，是「场合不对」。私下一对一可以，公开场合混在一起需要更多努力。`,
        `神煞层面也没有特别强的缘分信号——这段关系需要后天维持，不靠命盘自然推进。`,
      ],
    };
  }
  // 中性
  return {
    title: `社交层面，<br>有些<span style="color:var(--social)">偶然的交集</span>`,
    body: [
      `月令无明显关系，各有各的社交圈——但偶尔会在意想不到的场合碰到，不奇怪，也不算稀罕。`,
      socialStars.length > 0
        ? `${stars}有些命中，在对方的圈子里不会特别格格不入，但也不会自然成为焦点。`
        : `神煞层面也没有特别强的信号——缘分靠后天推进。`,
      `这段缘分靠后天维系，不靠命盘自然推进——<strong>要走近，得主动一些</strong>。`,
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 主入口
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 生成 DIM5 缘分指数所有文本
 *
 * @param {{
 *   monthRelation:  '六合'|'同支'|'三合'|'相生'|'无明显'|'相克'|'害'|'冲',
 *   dim5Score:      number,    // DIM5 最终分数 [-100, +100]
 *   names:          { a: string, b: string },
 *   socialStars:    string[]   // 命中的社交神煞名称，如 ['天乙贵人', '桃花']
 *   starDirection:  '双向'|'A→B'|'B→A'|'无'
 * }} params
 *
 * @returns {{
 *   scanCaption: string,
 *   badge:       { badge: string, subtext: string },
 *   verdict:     { title: string, body: string[] }
 * }}
 */
function getDIM5Texts({ monthRelation, dim5Score, names, socialStars = [], starDirection = '无' }) {
  return {
    scanCaption: getScanCaption(monthRelation, names),
    badge:       getBadge(dim5Score),
    verdict:     getVerdict(monthRelation, dim5Score, names, socialStars, starDirection),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

if (typeof module !== 'undefined') {
  module.exports = { getDIM5Texts, getBadge, getScanCaption, getVerdict };
}
