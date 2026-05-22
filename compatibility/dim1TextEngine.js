/**
 * DIM1 同频指数 · 文本生成引擎
 * 输入：两人日干、L3共鸣扫描结果、DIM1最终分数
 * 输出：扫描短断语 / Badge / 结论断语
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// 常量
// ─────────────────────────────────────────────────────────────────────────────

const GAN_HE_PAIRS = {
  甲: '己', 乙: '庚', 丙: '辛', 丁: '壬', 戊: '癸',
  己: '甲', 庚: '乙', 辛: '丙', 壬: '丁', 癸: '戊',
};

// ─────────────────────────────────────────────────────────────────────────────
// Module B · Badge
// ─────────────────────────────────────────────────────────────────────────────

const BADGE_TIERS = [
  {
    min: 80,
    badge: '命定知己 ✦',
    subtext: '这种命盘配对，找一万个人也碰不上几对',
  },
  {
    min: 50,
    badge: '同频搭子 ✦',
    subtext: '相处充电，聊什么都大差不差',
  },
  {
    min: 20,
    badge: '能聊，有限',
    subtext: '有交集，但同频感没扎进命盘里',
  },
  {
    min: -19,
    badge: '频道不太对',
    subtext: '投缘是有，但不是那种「懂」的感觉',
  },
  {
    min: -Infinity,
    badge: '频道对不上',
    subtext: '在一起的时候想回家，不在一起也没想着找对方',
  },
];

/**
 * @param {number} score  DIM1 最终分数 [-100, +100]
 * @returns {{ badge: string, subtext: string }}
 */
function getBadge(score) {
  return BADGE_TIERS.find(t => score >= t.min);
}

// ─────────────────────────────────────────────────────────────────────────────
// Module A · 扫描短断语
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 分析 L3 共鸣字的主导类型和方向性
 * @param {Array<{shen:string}>} resonanceA  A视角看B命中的比/食/伤列表
 * @param {Array<{shen:string}>} resonanceB  B视角看A命中的比/食/伤列表
 * @returns {{ dominant: string, direction: string }}
 */
function classifyResonance(resonanceA, resonanceB) {
  const totalA = resonanceA.length;
  const totalB = resonanceB.length;
  const total = totalA + totalB;

  // 命中极少
  if (total <= 2) return { dominant: 'rare', direction: 'none' };

  // 方向性
  const diff = totalA - totalB;
  const direction =
    Math.abs(diff) <= 1 ? 'symmetric' :
    diff > 0 ? 'A_to_B' : 'B_to_A';

  // 各十神计数
  const count = { bi: 0, shi: 0, shang: 0 };
  [...resonanceA, ...resonanceB].forEach(({ shen }) => {
    if (shen === '比肩') count.bi++;
    else if (shen === '食神') count.shi++;
    else if (shen === '伤官') count.shang++;
  });

  const typeCount = [count.bi > 0, count.shi > 0, count.shang > 0].filter(Boolean).length;
  const max = Math.max(count.bi, count.shi, count.shang);

  let dominant;
  if (typeCount >= 2 && max < total * 0.6) {
    dominant = total >= 5 ? 'mixed_high' : 'mixed';
  } else if (count.bi === max) {
    dominant = 'bi';
  } else if (count.shi === max) {
    dominant = 'shi';
  } else {
    dominant = 'shang';
  }

  return { dominant, direction };
}

// 文案库（{A}/{B} 在渲染时替换为真实姓名）
const SCAN_COPY = {
  bi: {
    symmetric:
      '发呆发到一半，突然说出同一句话，然后互相看一眼——就是这种人。这辈子能遇到几个？',
    A_to_B:
      '{A} 觉得在 {B} 那里找到了同类。{B} 倒不一定这么想——对 {B} 来说，{A} 大概只是挺好聊的人之一。',
    B_to_A:
      '{B} 觉得 {A} 是同类，{A} 其实没怎么感受到。这种单方向的「懂你」有点尴尬，{B} 自己慢慢会发现的。',
  },
  shi: {
    symmetric:
      '两个人在一起都在输出，还都接得住对方——这种双向流动挺少见的，聊着聊着时间就没了。',
    A_to_B:
      '{A} 说话的节奏，刚好是 {B} 最顺的那种。{B} 不用做什么，{A} 就已经在输出了。',
    B_to_A:
      '{B} 说什么 {A} 都觉得有意思。不是因为 {B} 有多厉害，是 {B} 的频率刚好是 {A} 最顺的那种。',
  },
  shang: {
    symmetric:
      '两个都敢说，在一起容易聊到忘了时间。偶尔说了不该说的——隔天道一次歉，下次大概率还是一样。',
    A_to_B:
      '{A} 在 {B} 面前嘴上没滤镜。{B} 接得住，但偶尔会被 {A} 噎一下，心里嘀咕「这人说话也太直了」。',
    B_to_A:
      '{B} 在 {A} 面前说话不留情面。{A} 居然不反感——因为 {B} 说的刚好是 {A} 心里有但没说出口的那些。',
  },
  mixed_high: {
    symmetric:
      '比肩、食神、伤官全扫到了，还是双向的。什么都能聊，聊完不累，这种命盘真的不多。',
    A_to_B:
      '比肩、食神、伤官全扫到了，{A} 那边更密一些——{A} 在 {B} 这里是真的顺，{B} 那边稍微淡一点。',
    B_to_A:
      '比肩、食神、伤官全扫到了，{B} 那边更密一些——{B} 在 {A} 这里是真的顺，{A} 那边稍微淡一点。',
  },
  mixed: {
    symmetric:
      '同频字不少，但没特别突出的主导——什么都沾一点。在一起顺，但说不上哪里特别对。',
    A_to_B:
      '同频字不少，但主要集中在 {A} 这边——{A} 在 {B} 那里比较自在，{B} 未必有同等感受。',
    B_to_A:
      '同频字不少，但主要集中在 {B} 这边——{B} 在 {A} 那里比较自在，{A} 未必有同等感受。',
  },
  rare: {
    none: '命盘扫下来，同频信号几乎是零。能聊到一起，靠的不是命盘，是后天各自努力。',
  },
};

/**
 * @param {Array<{shen:string}>} resonanceA
 * @param {Array<{shen:string}>} resonanceB
 * @param {{ a: string, b: string }} names
 * @returns {string}
 */
function getScanCaption(resonanceA, resonanceB, names) {
  const { dominant, direction } = classifyResonance(resonanceA, resonanceB);
  const template = SCAN_COPY[dominant]?.[direction] ?? SCAN_COPY.rare.none;
  return fillNames(template, names);
}

// ─────────────────────────────────────────────────────────────────────────────
// Module C · 结论断语
// ─────────────────────────────────────────────────────────────────────────────

/** 判断 L1 关系类型 */
function classifyL1(shenAtoB, shenBtoA) {
  if (shenAtoB === '比肩' && shenBtoA === '比肩') return 'bi_bi';
  if (shenAtoB === '劫财' && shenBtoA === '劫财') return 'jie_jie';

  const AtoB_shi =
    (shenAtoB === '食神' && shenBtoA === '偏印') ||
    (shenAtoB === '伤官' && shenBtoA === '正印');
  const BtoA_shi =
    (shenAtoB === '偏印' && shenBtoA === '食神') ||
    (shenAtoB === '正印' && shenBtoA === '伤官');

  if (AtoB_shi) return 'shi_xiao_AtoB';
  if (BtoA_shi) return 'shi_xiao_BtoA';

  const isShangYin =
    (['伤官', '食神'].includes(shenAtoB) && ['正印', '偏印'].includes(shenBtoA)) ||
    (['正印', '偏印'].includes(shenAtoB) && ['伤官', '食神'].includes(shenBtoA));
  if (isShangYin) return 'shang_yin';

  const NEGATIVE = ['偏财', '正财', '七杀', '正官'];
  if (NEGATIVE.includes(shenAtoB) || NEGATIVE.includes(shenBtoA)) return 'negative';

  return 'other';
}

/** 总分段 */
function getScoreTier(score) {
  if (score >= 80) return 'zhiji';
  if (score >= 50) return 'dazi';
  if (score >= 20) return 'limited';
  return 'mismatch';
}

// { title, body: string[] }  body 里用 {A}/{B} 占位
const VERDICT_COPY = {
  shi_xiao_AtoB: {
    zhiji: {
      title: '{A} 往 {B} 这边流，{B} 接得住，而且有来有往',
      body: [
        '{A} 说话的节奏是 {B} 最顺的那种，命盘扫下来这个方向也是双向加持的——{A} 输出，{B} 接，但 {B} 不是被动的，有自己的东西在反哺，只是形式不一样。',
        '这种关系难得的是：流动是真实的，不是一边在撑。',
        '可以做很久的朋友，而且不用刻意维持。',
      ],
    },
    dazi: {
      title: '聊起来不累，但容易单方向',
      body: [
        '{A} 天然想照顾 {B}，{B} 在 TA 身边有莫名的轻松感。这不是表面投缘，是命盘写好的反应。',
        '聊天、旅行、互相吐槽，基本顺畅。',
        '但同频不等于对等——{A} 一直输出，{B} 一直接收，时间长了会出现「为什么只有我在付出」的裂缝。',
      ],
    },
    limited: {
      title: '方向是对的，但力道不够',
      body: [
        '{A} 天然往 {B} 这边靠，这个底层信号是真实的。但命盘全局扫下来，其他地方的摩擦把这股劲抵消了一部分。',
        '不是没有同频感，是深不下去——聊得来，但到某个深度就停了。',
        '有缘，适合维持在浅一点的位置。不用强行加深。',
      ],
    },
    mismatch: {
      title: '{A} 往 {B} 这边走，{B} 根本没感觉',
      body: [
        '{A} 在 {B} 这里有一种「想输出」的本能，命盘里也有几个同频字——但架不住整体频道不对。',
        '就是那种 {A} 精心准备了话题，{B} 点点头然后开始看手机的感觉。',
        '这不是谁的问题，是命盘没给这段关系留足空间。别费心了。',
      ],
    },
  },

  shi_xiao_BtoA: {
    zhiji: {
      title: '{B} 往 {A} 这边流，{A} 接得住，而且有来有往',
      body: [
        '{B} 在 {A} 这里有一种天然的「想照顾」的本能，而 {A} 接得住——不是被动接受，是有东西在反哺，只是形式不一样。',
        '这种双向流动很少见，大多数「同频」停留在「感觉顺」，到这一步的没多少。',
        '不用担心关系会断，这种连接自己会维持。',
      ],
    },
    dazi: {
      title: '{B} 往 {A} 这边流，{A} 收着，但不一定感受得到',
      body: [
        '{B} 在 {A} 这里有一种「想照顾」的本能，但 {A} 可能只觉得 {B} 挺好相处，没往深里想。',
        '命盘扫下来，单向信号比较明显——{B} 那边的同频字更多。',
        '这不是问题，只是两个人的感受可能不对等。{B} 要留意别黏过去。',
      ],
    },
    limited: {
      title: '{B} 靠过来了，{A} 没太注意',
      body: [
        '{B} 命盘里有几个同频字往 {A} 这边走，但 {A} 这边基本没有回应——不是 {A} 不好，是频道本来就对得不太准。',
        '在一起不难受，但也不会特别记住。',
        '就是那种从联系人列表里删掉，对方也不一定发现的朋友。',
      ],
    },
    mismatch: {
      title: '{B} 单方向在付出，{A} 根本没感觉',
      body: [
        '{B} 命盘里往 {A} 这边流的同频字有几个，但整体频道根本对不上。',
        '结果就是 {B} 以为有交情，{A} 脑子里可能已经把 {B} 归到「认识」那一格了。',
        '这种错位挺常见的，但挺伤 {B} 的。早点看清楚比较好。',
      ],
    },
  },

  bi_bi: {
    zhiji: {
      title: '见一次就知道，这个人不一样',
      body: [
        '两个人在对方面前都不用演。不是因为关系好，是五行根本就是同一类——不用解释，不用迁就，连沉默都舒服。',
        '扫一遍命盘，两边都是满满的同频字。这种双向的东西，一百段朋友关系里见不到几个。',
        '这种频道不是练出来的，是命盘写好的。不用珍惜，因为本来就丢不掉。',
      ],
    },
    dazi: {
      title: '同类，但命盘里还有别的东西在扯',
      body: [
        '底层是同频的，这一点没有问题。但命盘扫下来，其他地方有些噪音——一些竞争感，一些方向上的偏差。',
        '在一起是顺的，但偶尔会有一种「差一点点」的感觉，说不清哪里。',
        '大概是同类，但不是那种什么都懂的同类。',
      ],
    },
    limited: {
      title: '底层像同类，但表层对不上',
      body: [
        '日主层面是同频的，放到一起应该有共鸣——但命盘全局扫下来，同频字少得可怜。',
        '就是那种感觉上有点像，但每次聊完都觉得差了一口气的关系。',
        '同类不代表合拍，这两件事没有必然联系。',
      ],
    },
    mismatch: {
      title: '以为是同类，其实不是',
      body: [
        '日主同类，但命盘扫下来同频信号基本没有——说明「同类」这件事停留在最底层，没有往上走。',
        '在一起可能会有一瞬间的「哦，你也这样」，然后就没了。',
        '别被第一印象骗了。',
      ],
    },
  },

  jie_jie: {
    zhiji: {
      title: '在一起很上头，也很累',
      body: [
        '同频字密度很高，而且是双向的——但这两个人底层都是劫财关系，那根较劲的弦从来没松过。',
        '在一起充电，也在一起漏电。聊得越深，竞争感越明显，但又停不下来。',
        '这是命盘里少见的「上头型同频」——爽，但有代价。',
      ],
    },
    dazi: {
      title: '在一起上头，但始终有根弦没松',
      body: [
        '有默契，聊起来顺，但两个人之间有一根弦一直没有松——谁都不说，心里都知道在比。',
        '命盘里同频字不少，但劫财型的同频自带暗劲：越熟越能感受到那股较劲，不是会消失的那种。',
        '不是坏事。只是要清楚这是同频，不是心安。',
      ],
    },
    limited: {
      title: '有点默契，但暗劲太重',
      body: [
        '偶尔有那种「你懂我」的感觉，但劲使出来方向不对——底层在比，表面在聊。',
        '同频字不多，竞争感却不小。这种关系聊得越深，越容易变成互相消耗。',
        '见面喝咖啡可以，别做密友。',
      ],
    },
    mismatch: {
      title: '说是朋友，内心各自打分',
      body: [
        '同频信号基本没有，但那股暗劲倒是双向的——两个人坐在一起，互相都在评估对方。',
        '这不叫同频，叫较劲。区别在于较劲让人累，同频让人充电。',
        '这段关系属于前者。保持距离是最好的相处方式。',
      ],
    },
  },

  shang_yin: {
    zhiji: {
      title: '互相说的话都刚好能接住',
      body: [
        '两个人在一起都敢说，而且都接得住对方——这种东西很难找，基本靠命盘。',
        '食神、伤官双向都有，不是 {A} 单方向在输出，{B} 也有自己的东西在反哺。',
        '这种朋友可以聊很久，因为双方都不用憋着。',
      ],
    },
    dazi: {
      title: '{B} 说话 {A} 会认真听，{A} 自己都不知道为什么',
      body: [
        '{B} 说什么 {A} 都想认真听。不是因为说得多有道理，是说出来的刚好是 {A} 脑子里没成形的那些。',
        '命盘扫下来，食神、伤官都有，频道是真的对。',
        '但这种人遇到了要小心——说话太顺耳，容易单方向黏过去，而对方未必有同等感受。',
      ],
    },
    limited: {
      title: '聊得有点意思，但停在表面',
      body: [
        '{B} 说话 {A} 偶尔会觉得有意思，但命盘扫下来，同频信号不强——有共鸣，但不稳定。',
        '这种关系适合偶尔见，不适合日常粘着。',
        '保持一点距离，反而能留住那点「有意思」的感觉。',
      ],
    },
    mismatch: {
      title: '以为有共鸣，其实只是对方说得好听',
      body: [
        '偶尔感觉聊到点子上了，但命盘扫下来，同频字少得可怜——大概率是 {B} 本身就能说，不是对 {A} 特别。',
        '别把「对方表达好」误认成「我们有同频」。',
        '这两件事有本质区别。',
      ],
    },
  },

  negative: {
    zhiji: {
      title: '底层有碰撞，全局同频字反而多得吓人',
      body: [
        '日主层面有一点对冲感，按理说应该有摩擦——但命盘全局的同频字密度高得把底层摩擦盖住了。',
        '这种组合很少见：底层有张力，表层反而流动顺畅。聊起来可能会有一种「奇怪，为什么这么对得上」的感觉。',
        '这不是错觉，是命盘里的其他部分在撑着这段关系。',
      ],
    },
    dazi: {
      title: '表面没问题，但深不下去',
      body: [
        '聊天没什么问题，但聊完总有一种「好，那就这样」的感觉——深不下去，也不知道卡在哪里。',
        '命盘里同频信号本来就不多，日主层面还有一点碰撞感，不是剑拔弩张，就是方向上有点拧。',
        '现在这样挺好了。有些人适合停在「认识」的位置，不用强行往深走。',
      ],
    },
    limited: {
      title: '貌合神离',
      body: [
        '表面没有冲突，但命盘扫下来，同频字很少，底层还有一点对冲感。',
        '就是那种在一个群里相处挺好、但私下没什么好说的关系。',
        '不讨厌，就是不深。维持现状是最好的结果了。',
      ],
    },
    mismatch: {
      title: '说不上为什么，就是感觉哪里不对',
      body: [
        '没有大矛盾，但在一起有一种说不清楚的不顺——可能是某句话听起来怪，可能是对方的处事方式让你皱眉，但又找不到明确的原因。',
        '命盘给出了答案：日主底层就是有对冲，同频信号接近于零。',
        '这种感觉不会随着时间消失，只会越来越清晰。趁早留距离。',
      ],
    },
  },

  // 天干五合特殊（知己段才触发）
  gan_he: {
    zhiji: {
      title: '有些缘分是写进天干里的',
      body: [
        '两人日干构成天干五合——这在命盘配对里相当少见，底层有一种说不清楚的「被对方拉住」的感觉，不完全是理性上的喜欢。',
        '加上命盘里双向的同频字，这种关系有一种很难描述的「对」。',
        '不是说不会吵架，是吵完之后还是会回来。',
      ],
    },
  },

  other: {
    zhiji: {
      title: '命盘碰到一起，刚好对上了',
      body: [
        '日主的关系不是最典型的同频组合，但命盘全局扫下来，同频字的密度相当高。',
        '有时候缘分就是这样——底层不是最「标准」的搭配，但就是顺。',
        '这种顺不是错觉，命盘数据在这里。',
      ],
    },
    dazi: {
      title: '聊得来，说不清哪里对',
      body: [
        '说不清楚是哪种同频，但在一起确实顺——不尴尬，话题接得上，节奏也差不多。',
        '命盘扫下来有一定量的同频字，虽然没有特别突出的方向。',
        '这种朋友处起来轻松，但深交需要别的维度来支撑。',
      ],
    },
    limited: {
      title: '能聊，但找不到那个点',
      body: [
        '在一起没有特别明显的不适，但也找不到那种「对，就是这个感觉」的共鸣点。',
        '同频信号不多，日主关系也不算典型。',
        '普通朋友，普通维持就好。',
      ],
    },
    mismatch: {
      title: '凑到一起聊了，但其实不太行',
      body: [
        '没有大的摩擦，但同频信号基本没有，日主层面也没有天然的共鸣。',
        '就是那种微信里有，但想不起来找对方的那种关系。',
        '合理。',
      ],
    },
  },
};

/**
 * @param {string}  dayGanA
 * @param {string}  dayGanB
 * @param {string}  shenAtoB   getShen(A.dayGan, B.dayGan)
 * @param {string}  shenBtoA   getShen(B.dayGan, A.dayGan)
 * @param {number}  score
 * @param {{ a: string, b: string }} names
 * @returns {{ title: string, body: string[] }}
 */
function getVerdict(dayGanA, dayGanB, shenAtoB, shenBtoA, score, names) {
  const tier = getScoreTier(score);
  const hasGanHe = GAN_HE_PAIRS[dayGanA] === dayGanB;

  // 天干五合 + 知己段 → 特殊文案
  if (hasGanHe && tier === 'zhiji') {
    return fillVerdict(VERDICT_COPY.gan_he.zhiji, names);
  }

  const l1Type = classifyL1(shenAtoB, shenBtoA);
  const typeCopy = VERDICT_COPY[l1Type] ?? VERDICT_COPY.other;
  const raw = typeCopy[tier] ?? typeCopy.limited ?? typeCopy.dazi;
  return fillVerdict(raw, names);
}

// ─────────────────────────────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────────────────────────────

function fillNames(str, { a, b }) {
  return str.replace(/\{A\}/g, a).replace(/\{B\}/g, b);
}

function fillVerdict(raw, names) {
  return {
    title: fillNames(raw.title, names),
    body: raw.body.map(p => fillNames(p, names)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 主入口
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 生成 DIM1 同频指数所有文本
 *
 * @param {{
 *   dayGanA:    string,           // A 日干，如 '甲'
 *   dayGanB:    string,           // B 日干，如 '壬'
 *   shenAtoB:   string,           // getShen(A.dayGan, B.dayGan)
 *   shenBtoA:   string,           // getShen(B.dayGan, A.dayGan)
 *   resonanceA: Array<{shen:string}>,  // A视角看B命中的比/食/伤
 *   resonanceB: Array<{shen:string}>,  // B视角看A命中的比/食/伤
 *   dim1Score:  number,           // DIM1 最终分数 [-100, +100]
 *   names:      { a: string, b: string }
 * }} params
 *
 * @returns {{
 *   scanCaption: string,
 *   badge:       { badge: string, subtext: string },
 *   verdict:     { title: string, body: string[] }
 * }}
 */
function getDIM1Texts({ dayGanA, dayGanB, shenAtoB, shenBtoA, resonanceA, resonanceB, dim1Score, names }) {
  return {
    scanCaption: getScanCaption(resonanceA, resonanceB, names),
    badge:       getBadge(dim1Score),
    verdict:     getVerdict(dayGanA, dayGanB, shenAtoB, shenBtoA, dim1Score, names),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

if (typeof module !== 'undefined') {
  module.exports = { getDIM1Texts, getBadge, getScanCaption, getVerdict };
}
