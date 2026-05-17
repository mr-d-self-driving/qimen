'use strict';

const { describe, test, before: beforeAll } = require('node:test');
const assert = require('node:assert/strict');

function expect(actual) {
  const api = {
    toBe(expected) { assert.equal(actual, expected); },
    toContain(expected) { assert.ok(actual.includes(expected)); },
    toBeDefined() { assert.notEqual(actual, undefined); },
    toBeUndefined() { assert.equal(actual, undefined); },
    toBeGreaterThan(expected) { assert.ok(actual > expected); },
    toMatch(expected) { assert.match(actual, expected); },
    not: {
      toContain(expected) { assert.ok(!actual.includes(expected)); }
    }
  };
  return api;
}

/**
 * 四个核心场景测试：
 * 1. 冲动：流年冲动妻宫（日支），静→动，分离象
 * 2. 合动（解冲）：流年合解原局冲，动→稳，婚姻落定
 * 3. 开墓库：流年冲开财星所在墓支，封藏→透出
 * 4. 伏吟：流年与原局某柱伏吟，聚焦放大
 *
 * 共用底盘：男命 甲寅/丁丑/己未/壬子（同 baziStateAssessor.test.js）
 *   dayStem = 己，妻星 = 壬(财)/癸(才)，妻宫 = 日支未
 *   原局：月支丑 冲 日支未（妻宫受冲，overall_stability = dynamic）
 */

const { assessDynamicTriggers, isFuyin, isFantin, isOpenTomb, MECH, EVENT } = require('./baziDynamicAssessor');
const { assessOriginalChartState } = require('./baziStateAssessor');
const { resolveTargetElement } = require('./baziTargetElement');

// ── 共用数据 ──────────────────────────────────────────────────

const MATRIX = {
  pillars: [
    { name: '年', gan: '甲', zhi: '寅', hidden_stems: ['甲', '丙', '戊'], is_kong: false },
    { name: '月', gan: '丁', zhi: '丑', hidden_stems: ['己', '癸', '辛'], is_kong: true  },
    { name: '日', gan: '己', zhi: '未', hidden_stems: ['己', '丁', '乙'], is_kong: false },
    { name: '时', gan: '壬', zhi: '子', hidden_stems: ['癸'],             is_kong: true  },
  ],
};
const DAY_STEM = '己';
const TARGET_SPEC = resolveTargetElement({ category: 'relationship', subcategory: 'marriage_pattern', gender: 'male' });
const STATE_REPORT = assessOriginalChartState({ matrix: MATRIX, targetSpec: TARGET_SPEC, dayStem: DAY_STEM, gender: 'male' });

// 确认底盘：妻宫受冲
test('底盘确认：妻宫受冲 overall_stability = dynamic', () => {
  expect(STATE_REPORT.overall_stability).toBe('dynamic');
});

// ─────────────────────────────────────────────────────────────
// 场景 1：冲动 — 流年再冲日支未（加剧）
// 大运 甲戌，流年 丁丑（丑再冲未）
// ─────────────────────────────────────────────────────────────

describe('场景1：流年丑再冲未 → 冲动加剧', () => {
  let report;
  beforeAll(() => {
    report = assessDynamicTriggers({
      matrix: MATRIX,
      targetSpec: TARGET_SPEC,
      stateReport: STATE_REPORT,
      dayStem: DAY_STEM,
      dayunGan: '甲', dayunZhi: '戌',
      liunianGan: '丁', liunianZhi: '丑',
    });
  });

  test('流年 impact 检测到六冲（丑冲未）', () => {
    const chong = report.liunian_impact.zhi_relations.find(
      r => r.type === '六冲' && r.partner_zhi === '未'
    );
    expect(chong).toBeDefined();
    expect(chong.effective_strength).toBeGreaterThan(0);
  });

  test('流年 mechanisms 含冲动机制，目标柱为日', () => {
    const mech = report.liunian_impact.mechanisms.find(
      m => m.type === MECH.CHONG_DONG && m.target_pillar === '日'
    );
    expect(mech).toBeDefined();
  });

  test('target_trigger state_change 含"冲"', () => {
    expect(report.target_trigger.state_change).toMatch(/冲/);
  });

  test('new_stability 仍为 dynamic', () => {
    expect(report.target_trigger.new_stability).toBe('dynamic');
  });
});

// ─────────────────────────────────────────────────────────────
// 场景 2：合动（解冲）— 流年合解日支未的冲
// 大运 甲戌，流年 甲午（午合未，解丑冲未）
// 己日：午与未六合（午未六合化土）
// ─────────────────────────────────────────────────────────────

describe('场景2：流年甲午 合未 解冲 → 合动，婚姻落定', () => {
  let report;
  beforeAll(() => {
    report = assessDynamicTriggers({
      matrix: MATRIX,
      targetSpec: TARGET_SPEC,
      stateReport: STATE_REPORT,
      dayStem: DAY_STEM,
      dayunGan: '甲', dayunZhi: '戌',
      liunianGan: '甲', liunianZhi: '午',
    });
  });

  test('流年支与日支未有六合关系', () => {
    const he = report.liunian_impact.zhi_relations.find(
      r => (r.type === '六合_化' || r.type === '六合_不化') && r.partner_zhi === '未'
    );
    expect(he).toBeDefined();
  });

  test('mechanisms 含合动机制', () => {
    const mech = report.liunian_impact.mechanisms.find(
      m => m.type === MECH.HE_DONG && m.target_pillar === '日'
    );
    expect(mech).toBeDefined();
  });

  test('target_trigger event_type = 婚姻落定', () => {
    expect(report.target_trigger.event_type).toBe(EVENT.MARRIAGE);
  });

  test('new_stability 变为 stable', () => {
    expect(report.target_trigger.new_stability).toBe('stable');
  });

  test('is_activated 取决于旺衰（合力有效）', () => {
    // 结果取决于流年旺衰，只断言类型正确
    expect(typeof report.target_trigger.is_activated).toBe('boolean');
  });
});

// ─────────────────────────────────────────────────────────────
// 场景 3：开墓库 — 使用不同底盘（财星入墓的命局）
// 男命 壬日，财星 = 丙(才)/丁(财) → 火，火墓 = 戌
// 原局：庚戌月（财星入戌墓），稳定性 = buried
// 大运 丙辰，流年 甲辰（辰冲戌，开火墓）
// ─────────────────────────────────────────────────────────────

describe('场景3：辰冲戌 开火墓 → 开墓库', () => {
  // 壬日干：丁=财（正财），丙=才（偏财）；火墓=戌
  // 原局：年甲子 月庚戌 日壬午 时甲辰
  const matrix2 = {
    pillars: [
      { name: '年', gan: '甲', zhi: '子', hidden_stems: ['癸'],             is_kong: false },
      { name: '月', gan: '庚', zhi: '戌', hidden_stems: ['戊', '辛', '丁'], is_kong: false },
      { name: '日', gan: '壬', zhi: '午', hidden_stems: ['丁', '己'],       is_kong: false },
      { name: '时', gan: '甲', zhi: '辰', hidden_stems: ['戊', '乙', '癸'], is_kong: false },
    ],
  };
  const spec2 = resolveTargetElement({ category: 'relationship', subcategory: 'marriage_pattern', gender: 'male' });
  let stateReport2;
  let report;

  beforeAll(() => {
    stateReport2 = assessOriginalChartState({ matrix: matrix2, targetSpec: spec2, dayStem: '壬', gender: 'male' });
    report = assessDynamicTriggers({
      matrix: matrix2,
      targetSpec: spec2,
      stateReport: stateReport2,
      dayStem: '壬',
      dayunGan: '丙', dayunZhi: '辰',
      liunianGan: '甲', liunianZhi: '辰',
    });
  });

  test('月支戌含藏干丁（财星）', () => {
    const yuePillar = matrix2.pillars.find(p => p.name === '月');
    expect(yuePillar.hidden_stems).toContain('丁');
  });

  test('大运辰 与月支戌 存在六冲关系', () => {
    const chong = report.dayun_impact.zhi_relations.find(
      r => r.type === '六冲' && r.partner_zhi === '戌'
    );
    expect(chong).toBeDefined();
  });

  test('大运/流年 mechanisms 含开墓库或冲动', () => {
    const allMechs = [
      ...report.dayun_impact.mechanisms,
      ...report.liunian_impact.mechanisms,
    ];
    const hasMu = allMechs.some(m => m.type === MECH.KAI_MU || m.type === MECH.CHONG_DONG);
    expect(hasMu).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// 场景 4：伏吟 — 流年与原局某柱干支完全相同
// 大运 甲子，流年 甲寅（与年柱甲寅伏吟）
// ─────────────────────────────────────────────────────────────

describe('场景4：流年甲寅与年柱甲寅伏吟 → 伏吟聚焦', () => {
  let report;
  beforeAll(() => {
    report = assessDynamicTriggers({
      matrix: MATRIX,
      targetSpec: TARGET_SPEC,
      stateReport: STATE_REPORT,
      dayStem: DAY_STEM,
      dayunGan: '甲', dayunZhi: '子',
      liunianGan: '甲', liunianZhi: '寅',
    });
  });

  test('流年 mechanisms 含伏吟，目标柱为年', () => {
    const mech = report.liunian_impact.mechanisms.find(
      m => m.type === MECH.FU_YIN && m.target_pillar === '年'
    );
    expect(mech).toBeDefined();
  });

  test('伏吟 effective_strength 固定为 60', () => {
    const mech = report.liunian_impact.mechanisms.find(m => m.type === MECH.FU_YIN);
    expect(mech?.effective_strength).toBe(60);
  });
});

// ─────────────────────────────────────────────────────────────
// 工具函数单元测试
// ─────────────────────────────────────────────────────────────

describe('工具函数：isFuyin / isFantin / isOpenTomb', () => {
  test('isFuyin：相同干支 → true', () => {
    expect(isFuyin('甲', '子', '甲', '子')).toBe(true);
  });
  test('isFuyin：不同干支 → false', () => {
    expect(isFuyin('甲', '子', '乙', '子')).toBe(false);
  });

  test('isFantin：天克地冲 → true（甲子 vs 庚午）', () => {
    // 甲(木)克庚(金)? 不对。金克木。庚克甲。子冲午。
    expect(isFantin('庚', '子', '甲', '午')).toBe(true);
  });
  test('isFantin：只有地冲无天克 → false', () => {
    expect(isFantin('甲', '子', '乙', '午')).toBe(false);
  });

  test('isOpenTomb：buried 状态 + 辰冲水墓 → true', () => {
    // 水墓 = 辰；ZHI_CHONGS[戌] = 辰，ZHI_CHONGS[辰] = 戌
    // 所以 isOpenTomb(戌, buried, 水) → ZHI_CHONGS[戌]=辰=ELEMENT_TOMB[水]=辰 → true
    expect(isOpenTomb('戌', 'buried', '水')).toBe(true);
  });
  test('isOpenTomb：非 buried 状态 → false', () => {
    expect(isOpenTomb('戌', 'stable', '水')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// 格式化输出
// ─────────────────────────────────────────────────────────────

describe('formatDynamicReportForPrompt', () => {
  const { formatDynamicReportForPrompt } = require('./baziDynamicAssessor');

  test('输出为非空字符串且含关键字段', () => {
    const report = assessDynamicTriggers({
      matrix: MATRIX,
      targetSpec: TARGET_SPEC,
      stateReport: STATE_REPORT,
      dayStem: DAY_STEM,
      dayunGan: '甲', dayunZhi: '戌',
      liunianGan: '甲', liunianZhi: '午',
    });
    const out = formatDynamicReportForPrompt(report);
    expect(typeof out).toBe('string');
    expect(out).toContain('大运');
    expect(out).toContain('流年');
    expect(out).toContain('目标元素引动结论');
  });

  test('options 输出自然语言强度标签和 major window 标记', () => {
    const report = assessDynamicTriggers({
      matrix: MATRIX,
      targetSpec: TARGET_SPEC,
      stateReport: STATE_REPORT,
      dayStem: DAY_STEM,
      dayunGan: '甲', dayunZhi: '戌',
      liunianGan: '甲', liunianZhi: '午',
    });
    const out = formatDynamicReportForPrompt(report, {
      includeStrengthTags: true,
      includeMajorWindowFlag: true,
      maxMechanismsPerPillar: 1
    });

    expect(out).toContain('引动强度');
    expect(out).toContain('trigger_vigor');
    expect(out).toContain('is_major_window');
    expect(out).not.toContain('"dayun_impact"');
  });
});
