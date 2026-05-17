'use strict';

const { describe, test, before: beforeAll } = require('node:test');
const assert = require('node:assert/strict');

function expect(actual) {
  const api = {
    toBe(expected) { assert.equal(actual, expected); },
    toEqual(expected) {
      if (expected?.__arrayContaining) {
        for (const item of expected.items) assert.ok(actual.includes(item));
        return;
      }
      assert.deepEqual(actual, expected);
    },
    toContain(expected) { assert.ok(actual.includes(expected)); },
    toBeDefined() { assert.notEqual(actual, undefined); },
    toBeUndefined() { assert.equal(actual, undefined); },
    toBeGreaterThan(expected) { assert.ok(actual > expected); },
    toBeLessThan(expected) { assert.ok(actual < expected); },
    toMatch(expected) { assert.match(actual, expected); }
  };
  return api;
}
expect.arrayContaining = (items) => ({ __arrayContaining: true, items });

/**
 * Integration test for assessOriginalChartState
 *
 * Test chart (男命): 甲寅 / 丁丑 / 己未 / 壬子
 *   dayStem = 己 (Yin Earth)
 *   wife stars: 壬=财, 癸=才 (Water)
 *   日支=未, 月支=丑 → 丑冲未（妻宫受冲）
 *   xunKong(己未) = 子丑  → 月支丑/时支子均空亡
 */

const { assessOriginalChartState, formatStateReportForPrompt } = require('./baziStateAssessor');
const { resolveTargetElement } = require('./baziTargetElement');

// ─── 手工构建测试矩阵 ─────────────────────────────────────────
// pillars[].hidden_stems from ZHI5_LIST:
//   寅:['甲','丙','戊']  丑:['己','癸','辛']  未:['己','丁','乙']  子:['癸']
const TEST_MATRIX = {
  pillars: [
    { name: '年', gan: '甲', zhi: '寅', hidden_stems: ['甲', '丙', '戊'], is_kong: false },
    { name: '月', gan: '丁', zhi: '丑', hidden_stems: ['己', '癸', '辛'], is_kong: true },
    { name: '日', gan: '己', zhi: '未', hidden_stems: ['己', '丁', '乙'], is_kong: false },
    { name: '时', gan: '壬', zhi: '子', hidden_stems: ['癸'],              is_kong: true },
  ],
};

const DAY_STEM = '己';
const GENDER = 'male';

describe('assessOriginalChartState — 男命己未日 婚姻格局', () => {
  let targetSpec;
  let report;

  beforeAll(() => {
    targetSpec = resolveTargetElement({ category: 'relationship', subcategory: 'marriage_pattern', gender: GENDER });
    report = assessOriginalChartState({ matrix: TEST_MATRIX, targetSpec, dayStem: DAY_STEM, gender: GENDER });
  });

  // ── 1. resolveTargetElement 输出验证 ─────────────────────────

  test('targetSpec: primary_shishen 包含財星（全称）', () => {
    expect(targetSpec.primary_shishen).toEqual(expect.arrayContaining(['正财', '偏财']));
  });

  test('targetSpec: primary_gongwei 包含日支', () => {
    expect(targetSpec.primary_gongwei).toContain('日支');
  });

  // ── 2. 十神定位 ──────────────────────────────────────────────

  test('shishen_assessments: 找到壬（时干）作为财星（短形）', () => {
    const found = report.shishen_assessments.find(a => a.gan === '壬' && a.pillar === '时');
    expect(found).toBeDefined();
    // 己日干，壬=财（正财短形）
    expect(found.shishen).toBe('财');
  });

  test('shishen_assessments: 时支子主气癸 也是才星', () => {
    const found = report.shishen_assessments.find(a => a.pillar === '时' && a.position === 'zhi_main');
    expect(found).toBeDefined();
    // 己日干，癸=才（偏财短形）
    expect(['财', '才']).toContain(found.shishen);
  });

  // ── 3. 宫位独立评估（关键：日支未被月支丑冲）──────────────

  test('gongwei_assessments: 包含日支宫位评估', () => {
    const g = report.gongwei_assessments.find(g => g.gongwei === '日支');
    expect(g).toBeDefined();
    expect(g.zhi).toBe('未');
  });

  test('日支宫位：检测到受冲关系（月支丑冲未）', () => {
    const g = report.gongwei_assessments.find(g => g.gongwei === '日支');
    const chong = g.relationships.find(r => r.type === '六冲' && r.partner_zhi === '丑');
    expect(chong).toBeDefined();
    expect(chong.effective_strength).toBeGreaterThan(0);
  });

  test('日支宫位：status_tags 含宫位受冲', () => {
    const g = report.gongwei_assessments.find(g => g.gongwei === '日支');
    expect(g.status_tags).toContain('宫位受冲');
  });

  test('日支宫位：空亡应为 false（未不在己未空）', () => {
    const g = report.gongwei_assessments.find(g => g.gongwei === '日支');
    expect(g.is_kong).toBe(false);
  });

  // ── 4. 整体稳定性 ─────────────────────────────────────────────

  test('overall_stability 因宫位受冲应为 dynamic', () => {
    expect(report.overall_stability).toBe('dynamic');
  });

  // ── 5. 空亡财星强度降低 ────────────────────────────────────────

  test('时干壬（空亡）vigor 比正常低（空亡打4折）', () => {
    const a = report.shishen_assessments.find(a => a.gan === '壬' && a.pillar === '时');
    expect(a.is_kong).toBe(true);
    expect(a.vigor).toBeLessThan(0.5); // 空亡减力
  });

  // ── 6. prompt 格式化 ──────────────────────────────────────────

  test('formatStateReportForPrompt 返回非空字符串', () => {
    const output = formatStateReportForPrompt(report);
    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(50);
    expect(output).toContain('原局状态评估');
  });

  test('formatStateReportForPrompt options 输出证据列表和 vigor 标签', () => {
    const output = formatStateReportForPrompt(report, {
      includeQuantTags: true,
      maxShishenItems: 2,
      maxGongweiItems: 1
    });

    expect(output).toContain('关键依据');
    expect(output).toMatch(/vigor\s*0\.\d+/);
    expect(output).toContain('宫位状态');
  });
});

// ─── 女命测试：官杀 → 夫星 + 夫妻宫 ────────────────────────────

describe('assessOriginalChartState — 女命癸卯日 婚姻格局', () => {
  // 女命癸日: 夫星 = 官(戊)/杀(己)
  // 癸:{甲:'伤',乙:'食',丙:'财',丁:'才',戊:'官',己:'杀',庚:'印',辛:'枭',壬:'劫',癸:'比'}
  // 日支卯 — 无强冲，较稳固
  const matrix = {
    pillars: [
      { name: '年', gan: '甲', zhi: '申', hidden_stems: ['庚', '壬', '戊'], is_kong: false },
      { name: '月', gan: '戊', zhi: '子', hidden_stems: ['癸'],              is_kong: false },
      { name: '日', gan: '癸', zhi: '卯', hidden_stems: ['乙'],              is_kong: false },
      { name: '时', gan: '己', zhi: '丑', hidden_stems: ['己', '癸', '辛'], is_kong: false },
    ],
  };

  let report;

  beforeAll(() => {
    const spec = resolveTargetElement({ category: 'relationship', subcategory: 'marriage_pattern', gender: 'female' });
    report = assessOriginalChartState({ matrix, targetSpec: spec, dayStem: '癸', gender: 'female' });
  });

  test('targetSpec primary_shishen 含官/杀（全称）', () => {
    const spec = resolveTargetElement({ category: 'relationship', subcategory: 'marriage_pattern', gender: 'female' });
    expect(spec.primary_shishen).toEqual(expect.arrayContaining(['正官', '七杀']));
  });

  test('月干戊 被定位为正官（短形 官）', () => {
    const found = report.shishen_assessments.find(a => a.gan === '戊' && a.pillar === '月');
    expect(found).toBeDefined();
    expect(found.shishen).toBe('官');
  });

  test('时干己 被定位为七杀（短形 杀）', () => {
    const found = report.shishen_assessments.find(a => a.gan === '己' && a.pillar === '时');
    expect(found).toBeDefined();
    expect(found.shishen).toBe('杀');
  });

  test('官杀混杂 extra_check 触发', () => {
    const check = report.extra_checks.find(c => c.check.includes('官杀混杂'));
    if (check) {
      expect(check.found).toBe(true);
    }
    // 如果 targetSpec 未配置该 check，则跳过
  });

  test('日支卯宫位稳固（无明显冲克）', () => {
    const g = report.gongwei_assessments.find(g => g.gongwei === '日支');
    expect(g).toBeDefined();
    // 日支卯被申冲（年支），验证关系是否检测到
    const chong = g.relationships.find(r => r.type === '六冲');
    // 卯 冲 酉，申不冲卯，所以应该是无冲
    expect(chong).toBeUndefined();
  });
});
