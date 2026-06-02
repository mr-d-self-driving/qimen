'use strict';

/**
 * 测试脚本：男命甲寅日 事业运势静态分析
 * 命盘：癸丑 / 丙午 / 甲寅 / 庚申
 * 问题：今年事业运势如何
 *
 * 甲木日主，官杀为庚辛金，食伤为丙丁火
 * 空亡（甲寅旬）：子丑 → 年支丑空亡
 */

const { assessOriginalChartState } = require('../lib/baziStateAssessor');
const { resolveTargetElement }     = require('../lib/baziTargetElement');

const MATRIX = {
  pillars: [
    { name: '年', gan: '癸', zhi: '丑', hidden_stems: ['己', '癸', '辛'], is_kong: true  }, // 丑空亡
    { name: '月', gan: '丙', zhi: '午', hidden_stems: ['丁', '己'],       is_kong: false },
    { name: '日', gan: '甲', zhi: '寅', hidden_stems: ['甲', '丙', '戊'], is_kong: false },
    { name: '时', gan: '庚', zhi: '申', hidden_stems: ['庚', '壬', '戊'], is_kong: false },
  ],
};

const DAY_STEM = '甲';
const GENDER   = 'male';

const FAVORABLE_WUXING   = new Set(['火', '土']);
const UNFAVORABLE_WUXING = new Set(['金', '水']);
const GEJU    = '食神格（月干丙火透出，月令午火旺）';
const TIAOHOU = '午月火旺，调候次需庚辛泄身，须防过燥';

const targetSpec = resolveTargetElement({
  category:    'career_business',
  subcategory: 'career_direction',
  gender:      GENDER,
});

console.log('=== targetSpec ===');
console.log(JSON.stringify(targetSpec, null, 2));

const report = assessOriginalChartState({
  matrix:           MATRIX,
  targetSpec,
  dayStem:          DAY_STEM,
  gender:           GENDER,
  favorableWuxing:  FAVORABLE_WUXING,
  unfavorableWuxing: UNFAVORABLE_WUXING,
  geju:             GEJU,
  tiaohou:          TIAOHOU,
});

console.log('\n=== assessOriginalChartState 输出 ===');
console.log(JSON.stringify(report, null, 2));
