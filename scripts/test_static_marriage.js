'use strict';

/**
 * 测试脚本：女命戊午日 婚姻格局静态分析
 * 命盘：丁丑 / 辛亥 / 戊午 / 庚申
 * 来源：截图中的婚恋结婚时机 case
 */

const { assessOriginalChartState, formatStateReportForPrompt } = require('../lib/baziStateAssessor');
const { resolveTargetElement } = require('../lib/baziTargetElement');

// ─── 矩阵构建 ─────────────────────────────────────────────────
// 戊午日 → 甲寅旬 → 空亡：子丑
// hidden_stems from ZHI5_LIST
const MATRIX = {
  pillars: [
    { name: '年', gan: '丁', zhi: '丑', hidden_stems: ['己', '癸', '辛'], is_kong: true  }, // 丑空亡
    { name: '月', gan: '辛', zhi: '亥', hidden_stems: ['壬', '甲'],        is_kong: false },
    { name: '日', gan: '戊', zhi: '午', hidden_stems: ['丁', '己'],        is_kong: false },
    { name: '时', gan: '庚', zhi: '申', hidden_stems: ['庚', '壬', '戊'],  is_kong: false },
  ],
};

const DAY_STEM = '戊';
const GENDER   = 'female';

// ─── 上游透传字段（模拟 profile.bazi_detail 提供的数据） ───────
// 戊土生亥月（冬），水旺，火土为调候喜用；伤官格（月干辛金）
const FAVORABLE_WUXING   = new Set(['火', '土']);
const UNFAVORABLE_WUXING = new Set(['水', '木']);
const GEJU    = '伤官格（月令亥水，辛金伤官透干）';
const TIAOHOU = '亥月寒湿，调候首重丙丁火，次取戊土燥土暖局';

// ─── 执行 ──────────────────────────────────────────────────────
const targetSpec = resolveTargetElement({
  category:    'relationship',
  subcategory: 'marriage_pattern',
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

console.log('\n=== formatStateReportForPrompt ===');
console.log(formatStateReportForPrompt(report));
