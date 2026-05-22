/**
 * DIM5 钱财边界 · 文本生成引擎
 * 输入：劫财/财星方向、日支冲害关系、DIM5 最终分数
 * 输出：扫描短断语 / Badge / 结论断语
 *
 * 理论来源：
 *   - 劫财/财星占比（L3）= 两张命盘放在一起财气如何流动
 *   - 日支冲害（L2）= 两人资源风格是否根本对冲
 *   钱财边界 = 财气方向 × 资源风格冲突程度
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Module B · Badge
// ─────────────────────────────────────────────────────────────────────────────

const BADGE_TIERS = [
  {
    min: 61,
    badge: '财路相开 ✦',
    subtext: '俩人合伙搞副业从不为分账红脸，搞钱嗅觉还出奇一致。随便弄点啥都能踩准风口，纯纯的黄金吸金搭档。',
  },
  {
    min: 21,
    badge: '适合合作',
    subtext: '一起倒腾项目账永远算得清清楚楚，绝不互占便宜。遇到需要垫钱的局也贼痛快，主打一个靠谱不拖欠。',
  },
  {
    min: -10,
    badge: '各管各的',
    subtext: '平时吃饭你买单我请客毫无压力，但千万别掏大钱合伙。亲兄弟明算账，各赚各的钱就是最舒服的距离。',
  },
  {
    min: -35,
    badge: '有些风险',
    subtext: '只要涉及钱，这关系就能精细到令人发指。出去吃饭恨不得按夹菜的克数AA，想做朋友，千万别谈钱。',
  },
  {
    min: -Infinity,
    badge: '钱不共管',
    subtext: '听劝，千万别合伙！只要沾上共同财产，哪怕是一起买个西瓜，都能因为谁吃了最中间那一勺而当街互薅头发。敢把两人的钱混一块，底裤都能给你亏没。',
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
// Module A · 扫描短断语
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {'双向劫财'|'A劫B'|'B劫A'|'财星互补'|'中性'} moneyDirection  劫财/财星方向
 * @param {boolean} moneyDense  是否命中密度高（劫财/财星命中 ≥2）
 * @param {{ a: string, b: string }} names
 * @returns {string}
 */
function getScanCaption(moneyDirection, moneyDense, names) {
  const { a: A, b: B } = names;

  if (moneyDirection === '双向劫财' && moneyDense)
    return '两边命盘都扫到了对方的劫财位——不是说一定会抢，是气场层面容易在钱这件事上互相分走能量。合作做钱的事，边界要先说清楚。';
  if (moneyDirection === '双向劫财' && !moneyDense)
    return '有双向劫财信号，但密度不高。偶尔会有隐约的「钱的边界感」，只要不混资产，基本不会有大问题。';
  if (moneyDirection === 'A劫B')
    return `${A}的命盘里有对${B}财气方向有压制的结构——合作或共同花钱的场合，${B}要有意识地保护自己的财务边界。`;
  if (moneyDirection === 'B劫A')
    return `${B}的命盘里有对${A}财气消耗的方向——在一起做生意或共同投入的事情，${A}要格外留意钱的去向和边界感。`;
  if (moneyDirection === '财星互补' && moneyDense)
    return '命盘里有财星互补结构，而且密度不低——在一起反而更容易有财运，合伙或共同投资的命盘写好了是可以的。';
  if (moneyDirection === '财星互补' && !moneyDense)
    return '有财星互补的信号，方向是对的，但密度不算强。在一起偶尔会有「合作比自己做顺」的感觉，不是大贵人，是轻度助力。';
  if (moneyDirection === '中性')
    return '劫财和财星信号都弱，钱财层面基本互不干扰。各管各的没问题，要合作也不会有大冲突，比较安全。';
  return '命盘里没有强劫财也没有强财星互补，钱财层面基本中性。在一起花钱吃饭没问题，大额合作就先把账算清楚再说。';
}

// ─────────────────────────────────────────────────────────────────────────────
// Module C · 结论断语
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {'双向劫财'|'A劫B'|'B劫A'|'财星互补'|'中性'} moneyDirection
 * @param {boolean} moneyDense
 * @param {'无冲害'|'冲'|'害'} dayzhiRelation
 * @param {number} dim5Score
 * @param {{ a: string, b: string }} names
 * @returns {{ title: string, body: string[] }}
 */
function getVerdict(moneyDirection, moneyDense, dayzhiRelation, dim5Score, names) {
  const { a: A, b: B } = names;

  // D5-C-1: 财星互补 + 无冲害 + 高分
  if (moneyDirection === '财星互补' && dayzhiRelation === '无冲害' && dim5Score >= 61) {
    return {
      title: '这两张命盘，<br>合在一起比<span style="color:var(--money)">单干更有财运</span>',
      body: [
        `命盘里有财星互补结构——<span style="color:var(--ca)">${A}</span>的五行方向是<span style="color:var(--cb)">${B}</span>的财星来源，<span style="color:var(--cb)">${B}</span>那边对<span style="color:var(--ca)">${A}</span>也有类似的助益。在一起做事，不是把对方的钱分走，是把彼此的机会放大。`,
        '日支没有冲害，资源风格不对冲，合作起来不容易在方向上产生根本分歧。',
        `这种配置适合合伙、联合投资、共同项目——但命盘写好了可以试，不代表不需要讲清楚账。<strong>把账算明白，财运才能顺着走</strong>。`,
      ],
    };
  }
  // D5-C-2: A劫B + 中性分数区间
  if (moneyDirection === 'A劫B' && dim5Score >= -10) {
    return {
      title: `<span style="color:var(--ca)">${A}</span> 在 <span style="color:var(--cb)">${B}</span> 的财气方向，<br><span style="color:var(--cb)">${B}</span> 留意边界`,
      body: [
        `<span style="color:var(--ca)">${A}</span>的命盘里有对<span style="color:var(--cb)">${B}</span>财气方向有压制的结构——不是<span style="color:var(--ca)">${A}</span>有意要拿走什么，是气场层面的五行方向指向了<span style="color:var(--cb)">${B}</span>的财星位置。`,
        `日支没有冲，平时相处不会有大摩擦，但在涉及钱的合作或共同消费时，<span style="color:var(--cb)">${B}</span>容易不知不觉多付出一些。`,
        `<span style="color:var(--cb)">${B}</span>要养成「钱的事先说清楚」的习惯，不是不信任<span style="color:var(--ca)">${A}</span>，是保护自己的财务边界。<strong>AA制、合同先签，关系反而更长久</strong>。`,
      ],
    };
  }
  // D5-C-3: B劫A + 中性分数区间
  if (moneyDirection === 'B劫A' && dim5Score >= -10) {
    return {
      title: `<span style="color:var(--cb)">${B}</span> 在 <span style="color:var(--ca)">${A}</span> 的财气方向，<br><span style="color:var(--ca)">${A}</span> 留意边界`,
      body: [
        `<span style="color:var(--cb)">${B}</span>的命盘对<span style="color:var(--ca)">${A}</span>的财气有消耗方向——合作或共同投入的场合，<span style="color:var(--ca)">${A}</span>的钱容易在不知不觉中多流向<span style="color:var(--cb)">${B}</span>那边。`,
        `不是说<span style="color:var(--cb)">${B}</span>会故意占便宜，是五行频率写在那里。<span style="color:var(--ca)">${A}</span>要有意识地在涉及钱的事情上先把账算清楚，保护自己的财务边界。`,
      ],
    };
  }
  // D5-C-4: 双向劫财 + 冲/害 + 低分
  if (moneyDirection === '双向劫财' && (dayzhiRelation === '冲' || dayzhiRelation === '害') && dim5Score <= -35) {
    return {
      title: '钱这件事，<br>建议<span style="color:var(--drain)">各管各的</span>',
      body: [
        `命盘扫出来是双向劫财结构——两人的气场在钱财方向上互相消耗。日支还有${dayzhiRelation}，资源风格在根本上也不一致。`,
        '这两层叠在一起，合伙做生意或共同管钱是最高风险的选项——不是感情不好会出问题，是命盘写好了混钱容易产生摩擦。',
        '<strong>强烈建议：财务完全独立，各自决策，偶尔请客没问题，但不要有大额共同账户或合伙协议。感情归感情，钱归钱。</strong>',
      ],
    };
  }
  // D5-C-5: 中性 + 无冲害
  if (moneyDirection === '中性' && dayzhiRelation === '无冲害') {
    return {
      title: '钱财层面，<br>各管各的<span style="color:var(--cb)">最省力</span>',
      body: [
        `命盘里没有强劫财，也没有强财星互补，日支没有冲害——钱财方向基本中性，在一起不会互相拖财，合作也不会有天然的财运加持。`,
        `最省力的方式就是各走各的：吃饭AA，合作项目先把账算明白，大额资金不共管。不是不信任对方，是这张命盘说两人财路各有各的走法。`,
      ],
    };
  }
  // D5-C-6: 财星互补 + 中分
  if (moneyDirection === '财星互补' && dim5Score >= 21) {
    return {
      title: '在一起，<br>财路会比<span style="color:var(--money)">自己走更顺一点</span>',
      body: [
        '有财星互补结构，但不是双向的——一方从另一方那里得到的财气助益更多。整体分数正向，在一起偶尔合作会有「今天怎么这么顺」的感觉，可能就是命盘在帮忙。',
        '不需要专门做什么，顺带着合作就好；大额合伙还是先把账算清楚，<strong>财运加持不代表不需要讲清楚边界</strong>。',
      ],
    };
  }
  // 兜底
  return {
    title: '钱的事，<br>先把边界说清楚',
    body: [
      '命盘这层没有特别强的信号——不是明显的财路互开，也不是明显的劫财消耗。',
      '这段关系涉及钱的时候，靠感情不靠命盘。提前说好规则，比出了问题再扯更省力。',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 主入口
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 生成 DIM5 钱财边界所有文本
 *
 * @param {{
 *   moneyDirection:  '双向劫财'|'A劫B'|'B劫A'|'财星互补'|'中性',
 *   moneyDense:      boolean,   // 劫财/财星命中密度高（≥2）
 *   dayzhiRelation:  '无冲害'|'冲'|'害',
 *   dim5Score:       number,    // DIM5 最终分数 [-100, +100]
 *   names:           { a: string, b: string }
 * }} params
 *
 * @returns {{
 *   scanCaption: string,
 *   badge:       { badge: string, subtext: string },
 *   verdict:     { title: string, body: string[] }
 * }}
 */
function getDIM5Texts({ moneyDirection, moneyDense, dayzhiRelation, dim5Score, names }) {
  return {
    scanCaption: getScanCaption(moneyDirection, moneyDense, names),
    badge:       getBadge(dim5Score),
    verdict:     getVerdict(moneyDirection, moneyDense, dayzhiRelation, dim5Score, names),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

if (typeof module !== 'undefined') {
  module.exports = { getDIM5Texts, getBadge, getScanCaption, getVerdict };
}
