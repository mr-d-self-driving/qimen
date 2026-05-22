/**
 * DIM3 消耗指数 · 文本生成引擎
 * 输入：劫煞方向、劫煞密度、DIM3 最终分数
 * 输出：扫描短断语 / Badge / 结论断语
 *
 * 理论来源：
 *   - 劫煞占比（L3 劫财+七杀+比肩 = 能量消耗信号）
 *   - 忌神激活（L4 五神互补的负向结果：一方旺的五行恰为对方忌神）
 *   消耗指数 = 劫煞密度 × 忌神激活率（双向取平均）
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Module B · Badge
// ─────────────────────────────────────────────────────────────────────────────

const BADGE_TIERS = [
  {
    min: 60,
    badge: '天然充电宝 ✦',
    subtext: '见一面顶得上睡了个好觉，对方就是你的能量插座，没道理，插上就有电。',
  },
  {
    min: 20,
    badge: '轻度充电',
    subtext: '在一起之后比一个人略微精神，不是突飞猛进，是那种微妙的好状态。',
  },
  {
    min: -10,
    badge: '基本不耗',
    subtext: '能量层面互不干扰，在一起跟自己待着差不多，各做各的不会觉得亏电。',
  },
  {
    min: -35,
    badge: '轻度消耗',
    subtext: '不是明显的累，是那种回家之后需要比平时多睡半小时。',
  },
  {
    min: -70,
    badge: '慢慢耗着',
    subtext: '单独出去玩回来元气满满，然后在一起两小时发现手机没电、人也没电。',
  },
  {
    min: -Infinity,
    badge: '能量黑洞',
    subtext: '见一次面需要三天独处来补回来，还不一定补得满。',
  },
];

/**
 * @param {number} score  DIM3 最终分数 [-100, +100]（正=充电，负=消耗）
 * @returns {{ badge: string, subtext: string }}
 */
function getBadge(score) {
  return BADGE_TIERS.find(t => score >= t.min);
}

// ─────────────────────────────────────────────────────────────────────────────
// Module A · 扫描短断语
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {'双向消耗'|'A→B单向'|'B→A单向'|'基本中性'|'双向充电'} drainDirection  劫煞方向
 * @param {boolean} drainDense  劫煞密度（true = 双方各有 ≥2 个劫煞命中）
 * @param {{ a: string, b: string }} names
 * @returns {string}
 */
function getScanCaption(drainDirection, drainDense, names) {
  const { a: A, b: B } = names;

  if (drainDirection === '双向消耗' && drainDense)
    return '两边命盘都在对方那里留了劫煞信号——在一起的时候，能量会先被悄悄扯走，然后才到别的事情上。';
  if (drainDirection === '双向消耗' && !drainDense)
    return '劫煞点不算密，但方向是双向的。在一起不会猛烈消耗，是那种慢慢渗透的感觉。';
  if (drainDirection === 'A→B单向' && drainDense)
    return `${A}的命盘对${B}有明显的劫煞压制——${B}跟${A}在一起，能量容易被带跑，做事前先得缓一缓。`;
  if (drainDirection === 'A→B单向' && !drainDense)
    return `劫煞信号偏向${A}→${B}，但密度不高，消耗是轻度的。${B}注意不要让${A}做所有决定就好。`;
  if (drainDirection === 'B→A单向' && drainDense)
    return `${B}的气场对${A}有明显的劫煞压制——${A}跟${B}在一起，总觉得精力少了一块，回家需要先独处恢复。`;
  if (drainDirection === 'B→A单向' && !drainDense)
    return `劫煞偏向${B}→${A}，密度轻。${A}在${B}身边注意边界感，别什么事都带对方参与。`;
  return '劫煞极少，彼此气场不形成干扰。在一起不会多花力气，甚至可能轻松一些。';
}

// ─────────────────────────────────────────────────────────────────────────────
// Module C · 结论断语
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {'双向消耗'|'A→B单向'|'B→A单向'|'基本中性'|'双向充电'} drainDirection
 * @param {boolean} drainDense
 * @param {number} dim3Score
 * @param {{ a: string, b: string }} names
 * @returns {{ title: string, body: string[] }}
 */
function getVerdict(drainDirection, drainDense, dim3Score, names) {
  const { a: A, b: B } = names;

  if (drainDirection === '双向消耗' && drainDense && dim3Score <= -35) {
    return {
      title: `在一起的代价，是比别人<br><span style="color:var(--drain)">多花一倍力气</span>`,
      body: [
        `命盘扫出来是双向劫煞——<span style="color:var(--ca)">${A}</span>的气场里有让<span style="color:var(--cb)">${B}</span>漏电的频率，<span style="color:var(--cb)">${B}</span>那边对<span style="color:var(--ca)">${A}</span>也一样。这不是坏感情，是五行层面的结构性问题。`,
        `忌神激活是实锤：两人的主导元素刚好踩对方弱点，在一起做事会比自己搞更费劲，分开做了往往又顺了。`,
        `不是不能处，是要把「在一起会多耗一些」当成既定条件接受，有意识地给彼此留独处空间。<strong>不说破，会越来越累</strong>。`,
      ],
    };
  }
  if (drainDirection === '双向消耗' && !drainDense) {
    return {
      title: '能量方向对冲，<br>但程度还好',
      body: [
        '命盘方向是双向消耗的，但劫煞密度低——不是那种猛烈的互相拖垮，是缓慢渗透型。',
        '长时间高频相处会慢慢察觉，但偶尔见面不会有明显感受。边界感到位的话，这个问题可以绕开。',
      ],
    };
  }
  if (dim3Score <= -70) {
    return {
      title: '这个组合，<br>见一次面要还三天',
      body: [
        '劫煞密集加忌神激活叠满——理论上的最差能量配置。不是感情不好，是在一起的物理成本太高。',
        '如果硬要在一起：固定独处时间不能砍，事情最好别混着做，分开工作比一起工作效率高很多倍。',
        '长期下来容易怪对方，但问题出在命盘不出在人。先看清楚再决定。',
      ],
    };
  }
  if (dim3Score > 0) {
    return {
      title: `在一起，<br>反而比一个人<span style="color:var(--green)">更有电</span>`,
      body: [
        `命盘方向偏正向——两人的气场没有形成消耗结构，${B}跟${A}在一起，状态往往比一个人的时候还好一点。`,
        '这不是靠感情撑出来的好状态，是五行结构里写好的能量相容。',
      ],
    };
  }
  // 中性 / 轻度消耗
  return {
    title: '有消耗，<br>但在可接受范围内',
    body: [
      '扫出来的劫煞信号不算强，忌神激活也没到叠满的程度。中等消耗，不是什么大事，大多数关系都是这样。',
      '在一起注意不要全天候粘着——给彼此留一些独处和各自社交的空间，消耗感会小很多。',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 主入口
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 生成 DIM3 消耗指数所有文本
 *
 * @param {{
 *   drainDirection: '双向消耗'|'A→B单向'|'B→A单向'|'基本中性'|'双向充电',
 *   drainDense:     boolean,   // 劫煞密度（两方各命中 ≥2 个）
 *   dim3Score:      number,    // DIM3 最终分数 [-100, +100]（正=充电，负=消耗）
 *   names:          { a: string, b: string }
 * }} params
 *
 * @returns {{
 *   scanCaption: string,
 *   badge:       { badge: string, subtext: string },
 *   verdict:     { title: string, body: string[] }
 * }}
 */
function getDIM3Texts({ drainDirection, drainDense, dim3Score, names }) {
  return {
    scanCaption: getScanCaption(drainDirection, drainDense, names),
    badge:       getBadge(dim3Score),
    verdict:     getVerdict(drainDirection, drainDense, dim3Score, names),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

if (typeof module !== 'undefined') {
  module.exports = { getDIM3Texts, getBadge, getScanCaption, getVerdict };
}
