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
//
// ⚠️ 可达性说明：DIM3 两个来源（L3 劫煞 + L4 忌神激活）均为负向专项，
// 实际最高分 = 0（无消耗），正向区间在数学上不可达。
// Badge 档位设计为纯负向 5 档，范围 [−100, 0]。
// ─────────────────────────────────────────────────────────────────────────────

const BADGE_TIERS = [
  {
    min: -12,
    badge: '基本不耗',
    subtext: '俩人找个咖啡店面对面坐着，他刷他的短视频，你喝你的冰美式，坐一下午谁也不理谁，主打一个无痛陪伴。',
  },
  {
    min: -38,
    badge: '轻度消耗',
    subtext: '陪他溜达了一下午倒也没起啥冲突，但回家往沙发上一瘫，总觉得莫名心累，今晚高低得早睡半小时回回血。',
  },
  {
    min: -65,
    badge: '慢慢耗着',
    subtext: '本来周末开开心心出门约个饭，听他疯狂输出了俩小时负能量，饭没吃香，人也跟着双眼发直想原地出家。',
  },
  {
    min: -85,
    badge: '能量黑洞',
    subtext: '强撑着跟他社交了一下午，回家感觉三魂七魄都被吸干了，接下来的三天必须断网锁门拒绝一切局，才能勉强保命。',
  },
  {
    min: -Infinity,
    badge: '相互摧毁',
    subtext: '俩人只要同处一个空间超过一小时，哪怕啥也不干，你的精神状态都比连熬三个大夜班还憔悴，纯纯的命理克星，建议此生非必要不相见。',
  },
];

/**
 * @param {number} score  DIM3 最终分数 [-100, 0]（两个来源均负向专项，正向不可达；0=不消耗，负=消耗）
 * @returns {{ badge: string, subtext: string }}
 */
function getBadge(score) {
  return BADGE_TIERS.find(t => score >= t.min);
}

// ─────────────────────────────────────────────────────────────────────────────
// Module A · 扫描短断语
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {'双向消耗'|'A→B单向'|'B→A单向'|'基本中性'} drainDirection  劫煞方向
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
  return '劫煞极少，彼此气场不形成干扰——在一起跟各自待着消耗差不多，不会额外多耗。';
}

// ─────────────────────────────────────────────────────────────────────────────
// Module C · 结论断语
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {'双向消耗'|'A→B单向'|'B→A单向'|'基本中性'} drainDirection
 * @param {boolean} drainDense
 * @param {number} dim3Score  [−100, 0]
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
  // 基本不耗（0 ~ -12）
  if (dim3Score >= -12) {
    return {
      title: '劫煞极少，<br>在一起<span style="color:var(--drain)">不额外多耗</span>',
      body: [
        `命盘没有扫出明显的劫煞信号，忌神也几乎没有激活——在一起跟各自待着消耗差不多，不会被对方带走能量。`,
        '消耗指数的结论是：这段关系不构成能量负担。不是充电，是不扣血——已经是消耗维度里最轻的结果。',
      ],
    };
  }
  // 轻度消耗（-13 ~ -38）
  return {
    title: '有消耗，<br>但在可接受范围内',
    body: [
      '扫出来的劫煞信号不算强，忌神激活也没到叠满的程度。轻度消耗，不是什么大事，大多数关系都是这样。',
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
 *   drainDirection: '双向消耗'|'A→B单向'|'B→A单向'|'基本中性',
 *   drainDense:     boolean,   // 劫煞密度（两方各命中 ≥2 个）
 *   dim3Score:      number,    // DIM3 最终分数 [−100, 0]（0=无消耗，负=消耗）
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
