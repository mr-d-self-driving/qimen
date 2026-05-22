/**
 * DIM2 义气指数 · 文本生成引擎
 * 输入：五神互补方向、印星密度、DIM2 最终分数
 * 输出：扫描短断语 / Badge / 结论断语
 *
 * 理论来源：
 *   - 印星（正印+偏印）= 「想帮」的本能信号
 *   - 五神互补（L4）= 「帮了有没有用」的结构信号
 *   义气 = 印星本能 × 互补效力
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Module B · Badge
// ─────────────────────────────────────────────────────────────────────────────

const BADGE_TIERS = [
  {
    min: 80,
    badge: '命中真贵人 ✦',
    subtext: '想帮你、帮得上、帮了真有用——三件事同时成立，这种命配找不着第二个',
  },
  {
    min: 50,
    badge: '真义气 ✦',
    subtext: '听说你遇到急事，接电话先骂一句"真能惹事"，然后立马请假踩着人字拖赶过来替你撑场子。',
  },
  {
    min: 20,
    badge: '义气打折',
    subtext: '帮得上，但得你先开口；主动出现这件事，别太指望',
  },
  {
    min: -19,
    badge: '帮不上什么忙',
    subtext: '听你哭诉倒霉事，连麦一小时，最后一句"你自己坚强点"。',
  },
  {
    min: -Infinity,
    badge: '别找这个人',
    subtext: '听说你出洋相翻车了，他第一时间赶到现场不为救你，只为了拍个高清视频发群里当笑料素材。',
  },
];

/**
 * @param {number} score  DIM2 最终分数 [-100, +100]
 * @returns {{ badge: string, subtext: string }}
 */
function getBadge(score) {
  return BADGE_TIERS.find(t => score >= t.min);
}

// ─────────────────────────────────────────────────────────────────────────────
// Module A · 扫描短断语
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {'双向补给'|'A→B单向'|'B→A单向'|'双向消耗'|'无明显'} l4Direction  五神互补方向
 * @param {boolean} yinStarDense  印星密度（true = 扫描命中 ≥2 个印/枭）
 * @param {{ a: string, b: string }} names
 * @returns {string}
 */
function getScanCaption(l4Direction, yinStarDense, names) {
  const { a: A, b: B } = names;

  if (l4Direction === '双向补给' && yinStarDense)
    return '想帮的本能有，帮了还真管用——两个条件同时成立，扫下来是双向贵人的配置。';
  if (l4Direction === '双向补给' && !yinStarDense)
    return '五行上是互补的，找对方办事会顺一些。印星少，主动性不强，但帮起来不含糊。';
  if (l4Direction === 'A→B单向' && yinStarDense)
    return `${A}命里对${B}的印星密——见${B}就想搭把手，是本能，不是客气。五行上也是${A}给${B}补，${B}那边没这么强。`;
  if (l4Direction === 'A→B单向' && !yinStarDense)
    return `五行上${A}在给${B}补资源，${B}找${A}帮忙会顺一点。印星少，${A}不会主动出现，但开口了一般能搞定。`;
  if (l4Direction === 'B→A单向' && yinStarDense)
    return `${B}命里对${A}的印星厚——有「帮这个人」的本能，五行上也是${B}给${A}补。${A}找${B}是对的，${B}找${A}就别太指望了。`;
  if (l4Direction === 'B→A单向' && !yinStarDense)
    return `五行上${B}在补${A}，${A}在${B}身边做事会顺一点。${B}不是主动帮忙的类型，但${A}碰到事可以开口。`;
  if (l4Direction === '双向消耗' && yinStarDense)
    return '两边印星都有，想帮对方的心是真的——但五行上互相激活忌神。在一起做事，帮了等于拖。';
  if (l4Direction === '双向消耗' && !yinStarDense)
    return '印星少，五行还互相消耗。想帮的意愿不强，帮了也容易越帮越乱。';
  if (yinStarDense)
    return '印星扫出来不少，主动性是有的。五行上没互补——出了力，不一定有效果。';
  return '印星和互补都薄。能义气靠的是自己的意愿，命盘这层没给这段关系开多少口。';
}

// ─────────────────────────────────────────────────────────────────────────────
// Module C · 结论断语
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {'双向补给'|'A→B单向'|'B→A单向'|'双向消耗'|'无明显'} l4Direction
 * @param {boolean} yinStarDense
 * @param {number} dim2Score
 * @param {{ a: string, b: string }} names
 * @returns {{ title: string, body: string[] }}
 */
function getVerdict(l4Direction, yinStarDense, dim2Score, names) {
  const { a: A, b: B } = names;

  if (l4Direction === '双向补给' && yinStarDense && dim2Score >= 50) {
    return {
      title: `想帮你，帮了还管用——<br>这两件事同时成立不容易`,
      body: [
        `<span style="color:var(--ca)">${A}</span>缺的，<span style="color:var(--cb)">${B}</span>命里多；<span style="color:var(--cb)">${B}</span>缺的，<span style="color:var(--ca)">${A}</span>命里多。不是两个人有多互相了解，是五行刚好这么配——找对方出面，事情就是比自己搞更顺。`,
        `印星又密，主动帮的本能两边都有，不等你开口就想到了。`,
        `这种朋友大事小事都能用，不用担心找错人，也不用担心欠人情——<strong>互相的</strong>。`,
      ],
    };
  }
  if (l4Direction === '双向补给' && !yinStarDense && dim2Score >= 50) {
    return {
      title: '帮得上，但不是那种<br>会主动出现的',
      body: [
        '五行互补是真的——找对方搭把手，事情比自己磨要顺，这是命盘能验证的。',
        '印星少，主动性不强。这种朋友开口了能帮，但不是会先察觉到你需要帮助然后出现的类型。',
        '有用，但用法是「你主动找」，不是「等对方来」。',
      ],
    };
  }
  if (l4Direction === '双向消耗' && yinStarDense) {
    return {
      title: '想帮，但帮了反而更乱',
      body: [
        '印星是真的——两边见了对方都有「我来搞定」的本能，这个心没问题。',
        `但五行方向拧了，互相激活忌神——<span style="color:var(--ca)">${A}</span>帮<span style="color:var(--cb)">${B}</span>的事，出面之后反而推不动；<span style="color:var(--cb)">${B}</span>帮<span style="color:var(--ca)">${A}</span>也一样。越帮越乱不是比喻，是命盘的实际结果。`,
        '义气在，但帮忙这件事，各找别人更合适。',
      ],
    };
  }
  if (l4Direction === '双向消耗' && !yinStarDense) {
    return {
      title: '帮不上，帮了还添乱',
      body: [
        '印星少，没有主动帮的本能；五行还互相消耗，真帮了对方，事情大概率更拧。',
        '不是不义气，是这段关系在「办事」这件事上就是个雷区——两个人在一起，各自的事都推不动。',
        '平时喝酒聊天好说，真遇到事，各找各的人比较好。',
      ],
    };
  }
  if (l4Direction === 'A→B单向' || (yinStarDense && dim2Score >= 20)) {
    return {
      title: `<span style="color:var(--ca)">${A}</span> 遇到事，该找的人是 <span style="color:var(--cb)">${B}</span>`,
      body: [
        `<span style="color:var(--ca)">${A}</span>找<span style="color:var(--cb)">${B}</span>帮忙，<span style="color:var(--cb)">${B}</span>出面，事情就是比自己搞更顺。不是<span style="color:var(--cb)">${B}</span>有多大能量，是<span style="color:var(--cb)">${B}</span>的五行刚好是<span style="color:var(--ca)">${A}</span>最缺的。`,
        `<span style="color:var(--cb)">${B}</span>命里对<span style="color:var(--ca)">${A}</span>的印星厚，主动帮的本能也是真的，不用<span style="color:var(--ca)">${A}</span>一直开口。`,
      ],
    };
  }
  if (l4Direction === 'B→A单向' || (!yinStarDense && dim2Score >= 20)) {
    return {
      title: `<span style="color:var(--cb)">${B}</span> 遇到事，该找的人是 <span style="color:var(--ca)">${A}</span>`,
      body: [
        `<span style="color:var(--cb)">${B}</span>找<span style="color:var(--ca)">${A}</span>帮忙，事情比自己搞更顺。<span style="color:var(--ca)">${A}</span>的五行刚好是<span style="color:var(--cb)">${B}</span>最缺的那类。`,
        `<span style="color:var(--ca)">${A}</span>命里对<span style="color:var(--cb)">${B}</span>的印星厚，主动帮的本能真实存在，<span style="color:var(--cb)">${B}</span>开口就够了。`,
      ],
    };
  }
  // 中性/低分
  return {
    title: '帮忙这件事，<br>靠感情不靠命盘',
    body: [
      `印星薄，五行也没形成互补——命盘层面没给这段关系多少「义气结构」。`,
      '不是不能帮，是帮了不一定有用，主动性也不会特别强。',
      `<strong>这段关系的价值不在「能不能搭把手」，在别的地方。</strong>`,
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 主入口
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 生成 DIM2 义气指数所有文本
 *
 * @param {{
 *   l4Direction:   '双向补给'|'A→B单向'|'B→A单向'|'双向消耗'|'无明显',
 *   yinStarDense:  boolean,   // 印星扫描命中 ≥2
 *   dim2Score:     number,    // DIM2 最终分数 [-100, +100]
 *   names:         { a: string, b: string }
 * }} params
 *
 * @returns {{
 *   scanCaption: string,
 *   badge:       { badge: string, subtext: string },
 *   verdict:     { title: string, body: string[] }
 * }}
 */
function getDIM2Texts({ l4Direction, yinStarDense, dim2Score, names }) {
  return {
    scanCaption: getScanCaption(l4Direction, yinStarDense, names),
    badge:       getBadge(dim2Score),
    verdict:     getVerdict(l4Direction, yinStarDense, dim2Score, names),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

if (typeof module !== 'undefined') {
  module.exports = { getDIM2Texts, getBadge, getScanCaption, getVerdict };
}
