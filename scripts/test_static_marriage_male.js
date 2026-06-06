'use strict';

/**
 * 测试脚本：男命壬午日 婚恋感情静态分析
 * 命盘：庚辰 / 甲寅 / 壬午 / 丙申
 * 问题：今年感情运势如何，何时能结婚
 *
 * 壬水日主，妻星为丙（偏财）、丁（正财）
 * 壬午日 → 甲辰旬 → 空亡：寅卯 → 月支寅空亡
 */

const { assessOriginalChartState } = require('../lib/baziStateAssessor');
const { resolveTargetElement }     = require('../lib/baziTargetElement');

const MATRIX = {
  pillars: [
    { name: '年', gan: '庚', zhi: '辰', hidden_stems: ['戊','乙','癸'], is_kong: false },
    { name: '月', gan: '甲', zhi: '寅', hidden_stems: ['甲','丙','戊'], is_kong: true  }, // 寅空亡
    { name: '日', gan: '壬', zhi: '午', hidden_stems: ['丁','己'],      is_kong: false },
    { name: '时', gan: '丙', zhi: '申', hidden_stems: ['庚','壬','戊'], is_kong: false },
  ],
};

const DAY_STEM = '壬';
const GENDER   = 'male';

const FAVORABLE_WUXING   = new Set(['木', '火']);
const UNFAVORABLE_WUXING = new Set(['金', '土']);
const GEJU    = '食神格（月令寅木，甲木食神透干，寅中又藏甲）';
const TIAOHOU = '寅月初春，木旺水弱，调候需丙丁火温暖，忌金水过旺';

const targetSpec = resolveTargetElement({
  category:    'relationship',
  subcategory: 'marriage_timing',
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
