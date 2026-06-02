'use strict';

/**
 * 测试：男命庚申日 财富自由 case
 * 命盘：甲子 / 壬寅 / 庚申 / 甲午
 * 问题：命主可以财富自由吗
 *
 * 庚申日 → 甲寅旬 → 空亡：子丑
 */

const { assessOriginalChartState } = require('../lib/baziStateAssessor');
const { resolveTargetElement }      = require('../lib/baziTargetElement');

const MATRIX = {
  pillars: [
    { name: '年', gan: '甲', zhi: '子', hidden_stems: ['癸'],           is_kong: true  }, // 子空亡
    { name: '月', gan: '壬', zhi: '寅', hidden_stems: ['甲', '丙', '戊'], is_kong: false },
    { name: '日', gan: '庚', zhi: '申', hidden_stems: ['庚', '壬', '戊'], is_kong: false },
    { name: '时', gan: '甲', zhi: '午', hidden_stems: ['丁', '己'],       is_kong: false },
  ],
};

const DAY_STEM = '庚';
const GENDER   = 'male';

// 财富自由 → finance_wealth / general_wealth
const targetSpec = resolveTargetElement({
  category:    'finance_wealth',
  subcategory: 'general_wealth',
  gender:      GENDER,
});

console.log('=== targetSpec ===');
console.log(JSON.stringify(targetSpec, null, 2));

// 庚日主，金旺于秋，生于寅月（木旺，金弱）
// 偏财甲木两透（年干/时干），寅中藏甲，财星极旺
// 日主庚弱（生寅月），需看身弱能否驾驭财
const FAVORABLE_WUXING   = new Set(['土', '金']);    // 身弱喜比印
const UNFAVORABLE_WUXING = new Set(['木', '火']);
const GEJU    = '偏财格（甲木两透天干，寅中又藏甲，财星极旺）';
const TIAOHOU = '寅月木旺，庚金日主极弱，调候需土金扶身';

const report = assessOriginalChartState({
  matrix: MATRIX,
  targetSpec,
  dayStem: DAY_STEM,
  gender:  GENDER,
  favorableWuxing:   FAVORABLE_WUXING,
  unfavorableWuxing: UNFAVORABLE_WUXING,
  geju:    GEJU,
  tiaohou: TIAOHOU,
});

console.log('\n=== assessOriginalChartState 输出 ===');
console.log(JSON.stringify(report, null, 2));
