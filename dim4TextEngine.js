/**
 * DIM4 成长指数 · 文本生成引擎
 * 输入：调候互补方向、贵人神煞命中、DIM4 最终分数
 * 输出：扫描短断语 / Badge / 结论断语
 *
 * 理论来源：
 *   - 调候互补（L4 五神互补正向）= 对方旺的五行是我的用神/喜神
 *   - 贵人神煞（L5 神煞）= 天乙贵人、文昌、天喜等吉神互见
 *   成长指数 = 调候补给强度 × 贵人神煞加持
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Module B · Badge
// ─────────────────────────────────────────────────────────────────────────────

const BADGE_TIERS = [
  {
    min: 71,
    badge: '命定贵人 ✦',
    subtext: '见一次面，带走的不只是开心，是真实的一点点变好——命盘就是这么写的，没道理，就是顺。',
  },
  {
    min: 41,
    badge: '彼此成就',
    subtext: '在TA身边，会发现自己比平时想得更清楚，话也说得更顺——不是因为表现，是频率对了。',
  },
  {
    min: 11,
    badge: '有些助益',
    subtext: '偶尔在一起，会有种「今天效率好高」的微妙感觉——可能就是命盘在悄悄帮忙。',
  },
  {
    min: -10,
    badge: '基本中性',
    subtext: '成长层面基本不干扰，在一起不会特别推你，也不会拖你，各有各的节奏。',
  },
  {
    min: -Infinity,
    badge: '带点阻力',
    subtext: '在TA身边做事容易卡一卡——不是对方故意，是五行频率有点别劲，注意场合。',
  },
];

/**
 * @param {number} score  DIM4 最终分数 [-100, +100]
 * @returns {{ badge: string, subtext: string }}
 */
function getBadge(score) {
  return BADGE_TIERS.find(t => score >= t.min);
}

// ─────────────────────────────────────────────────────────────────────────────
// Module A · 扫描短断语
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {'双向滋养'|'A→B单向'|'B→A单向'|'无明显'} growDirection  调候互补方向
 * @param {{ a: string, b: string }} names
 * @returns {string}
 */
function getScanCaption(growDirection, names) {
  const { a: A, b: B } = names;

  if (growDirection === '双向滋养')
    return `两边命盘互相补到对方喜用的频率——${A}最需要的，${B}一身就是；${B}需要的，${A}的命盘刚好满足。不是靠感情撑出来的好状态，是五行结构里写好的互相助力。`;
  if (growDirection === 'A→B单向')
    return `${A}的气场是${B}命盘里最缺的频率——在${A}身边，${B}做事会比自己单干顺很多；反方向没有这么强，但单向贵人也够用了。`;
  if (growDirection === 'B→A单向')
    return `${B}的气场对${A}形成了明显的调候补给——在${B}身边，${A}能发挥出比平时好一截的状态；${B}从${A}这里得到的相对有限。`;
  return `调候信号弱——两人的主导五行方向各走各的，在一起做事不会特别顺也不会特别堵。成长靠自己，对方带不动太多。`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module C · 结论断语
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {'双向滋养'|'A→B单向'|'B→A单向'|'无明显'} growDirection
 * @param {number} dim4Score
 * @param {{ a: string, b: string }} names
 * @param {string[]} starHits  命中的贵人神煞列表，如 ['天乙贵人', '文昌']
 * @returns {{ title: string, body: string[] }}
 */
function getVerdict(growDirection, dim4Score, names, starHits = []) {
  const { a: A, b: B } = names;
  const stars = starHits.join('、') || '贵人信号';

  if (growDirection === '双向滋养' && dim4Score >= 71) {
    return {
      title: `你们是彼此的<br><span style="color:var(--boost)">命定天乙贵人</span>`,
      body: [
        `命盘扫出来是双向补给——<span style="color:var(--ca)">${A}</span>的气场里有<span style="color:var(--cb)">${B}</span>最需要的频率，<span style="color:var(--cb)">${B}</span>那边对<span style="color:var(--ca)">${A}</span>也一样。不是靠感情撑出来的好状态，是五行层面的结构性助力。`,
        `天乙贵人互见是实锤：两人的天乙位刚好落在对方日支，在一起本来的能力就能被看见——不需要额外解释，不需要表演。`,
        `这种配置意味着长期在一起会有明显的「越来越好」感——不是靠努力撑，是命盘写好的事。<strong>顺着走就行了</strong>。`,
      ],
    };
  }
  if (growDirection === '双向滋养') {
    return {
      title: `在一起，<br>两个人都在<span style="color:var(--boost)">变好</span>`,
      body: [
        `调候互补是双向的——两人的气场互相给到对方需要的频率。在一起做事，效率比各自单干高；聊完之后，状态比聊之前好。`,
        `贵人神煞加持：${stars}有命中，在对方面前能量自然能被看见，不用刻意。`,
      ],
    };
  }
  if (dim4Score >= 41) {
    return {
      title: `有贵人气，<br>但是<span style="color:var(--boost)">单向的</span>`,
      body: [
        `调候补给偏向一侧——一方从对方那里得到的多，另一边相对有限。这不是问题，单向贵人也是贵人。`,
        `享受补给的那一方，在TA身边做事、思考都会比平时顺一点。有意识地借TA的场，效果会更明显。`,
      ],
    };
  }
  if (dim4Score <= -11) {
    return {
      title: `在一起，<br>有点<span style="color:var(--ca)">推不动</span>`,
      body: [
        `调候方向没有形成补给，反而有轻微的频率干扰。在一起做需要集中力的事情时，可能比各自做效率低。`,
        `适合轻松社交，不适合把对方当工作搭档或成长伙伴——分开做事，往往效率更高。`,
      ],
    };
  }
  // 中性
  return {
    title: `成长层面，<br>各走各的就好`,
    body: [
      `调候基本中性，没有明显的补给也没有明显的干扰。在一起不会特别推你，也不会拖你。`,
      `成长这件事还是靠自己，对方是朋友，不是你的成长催化剂——这也没什么不好。`,
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 主入口
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 生成 DIM4 成长指数所有文本
 *
 * @param {{
 *   growDirection: '双向滋养'|'A→B单向'|'B→A单向'|'无明显',
 *   dim4Score:     number,    // DIM4 最终分数 [-100, +100]
 *   names:         { a: string, b: string },
 *   starHits:      string[]   // 命中的贵人神煞名称列表
 * }} params
 *
 * @returns {{
 *   scanCaption: string,
 *   badge:       { badge: string, subtext: string },
 *   verdict:     { title: string, body: string[] }
 * }}
 */
function getDIM4Texts({ growDirection, dim4Score, names, starHits = [] }) {
  return {
    scanCaption: getScanCaption(growDirection, names),
    badge:       getBadge(dim4Score),
    verdict:     getVerdict(growDirection, dim4Score, names, starHits),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

if (typeof module !== 'undefined') {
  module.exports = { getDIM4Texts, getBadge, getScanCaption, getVerdict };
}
