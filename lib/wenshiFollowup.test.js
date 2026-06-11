const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PATCHABLE_SECTIONS,
  FOLLOWUP_CAPABILITIES,
  normalizeFollowupRoute,
  listRecomputeCapabilities,
  buildFollowupClassifierPrompt,
  buildFollowupPatchPrompt,
  buildQimenEvidenceNarrative,
} = require('./wenshiFollowup');

const SAMPLE_EVIDENCE = {
  qimen_data: {
    pillars: { year: '丙午', month: '甲午', day: '丙辰', hour: '丙申' },
    timestamp: { solar: '2026年6月11日 16:11', lunar: '四月廿六' },
    ju_info: { name: '陽遁3局', jieqi: '芒種', yuan: '中元', xun_shou: '甲午', zhi_fu: '天心', zhi_fu_palace: '落坎1宫', zhi_shi: '開門', zhi_shi_palace: '落艮8宫' },
    auxiliary: { kong_wang: { day: '子丑', hour: '辰巳' }, ma_xing: { day: '寅', hour: '寅' } },
    palaces: [
      { name: '艮8宫', star: '天蓬', god: '滕蛇', door: '開門', sky: '丙', earth: '癸', kong_wang: { is_kong: true }, ma_xing: { has_ma: true } },
      { name: '中5宫', is_center: true, earth: '庚' },
    ],
  },
  m2_basis: {
    yongshen_cards: [{ key: 'self', label: '本人状态', symbol: '日干 丙', tone: 'mixed', verdict: '空亡待动', evidence: '日干丙落艮8宫' }],
    chart_summary: { formation_tags: [{ name: '六仪击刑', type: 'xiong', effect: '-15' }] },
  },
  m3_inference: { subject_state: { reading: '不该出现在证据里的原解读' } },
};

// ── normalizeFollowupRoute ──────────────────────────────────────────────

test('new_matter 短路：清空 target/needs，不带 nature 噪声', () => {
  const out = normalizeFollowupRoute({ scope: 'new_matter', nature: 'revise', target_sections: ['conclusion'], needs_data: [{ capability: 'yingqi' }], reason: 'x' }, { branch: 'qimen' });
  assert.equal(out.scope, 'new_matter');
  assert.equal(out.nature, 'deepen');
  assert.deepEqual(out.target_sections, []);
  assert.deepEqual(out.needs_data, []);
  assert.equal(out.reason, 'x');
});

test('未知/缺失 scope 一律退到 same_casting', () => {
  assert.equal(normalizeFollowupRoute({}, { branch: 'qimen' }).scope, 'same_casting');
  assert.equal(normalizeFollowupRoute({ scope: '乱填' }, { branch: 'qimen' }).scope, 'same_casting');
  assert.equal(normalizeFollowupRoute(null, { branch: 'qimen' }).scope, 'same_casting');
});

test('target_sections 过滤到白名单并去重；空则给默认段', () => {
  const out = normalizeFollowupRoute({
    scope: 'same_casting',
    target_sections: ['conclusion', 'conclusion', 'not_a_section', 'decision_reading'],
  }, { branch: 'qimen' });
  assert.deepEqual(out.target_sections, ['conclusion', 'decision_reading']);

  const empty = normalizeFollowupRoute({ scope: 'same_casting', target_sections: ['xxx'] }, { branch: 'qimen' });
  assert.deepEqual(empty.target_sections, ['conclusion']);

  const baziEmpty = normalizeFollowupRoute({ scope: 'same_casting' }, { branch: 'bazi' });
  assert.deepEqual(baziEmpty.target_sections, ['summary_conclusion']);
});

test('needs_data 仅保留白名单内的 recompute 能力，丢弃越界/reread', () => {
  const out = normalizeFollowupRoute({
    scope: 'same_casting',
    needs_data: [
      { capability: 'yingqi', params: { x: 1 } },   // 保留：recompute
      { capability: 'fangwei' },                      // 丢弃：reread（证据已在盘里）
      { capability: 'liunian_scan' },                 // 丢弃：八字能力，不在 qimen 注册表
      { capability: '不存在' },                        // 丢弃：越界
      'garbage',                                       // 丢弃：非对象
    ],
  }, { branch: 'qimen' });
  assert.deepEqual(out.needs_data, [{ capability: 'yingqi', params: { x: 1 } }]);
});

test('needs_data 按 capability 去重（保留首个）', () => {
  const out = normalizeFollowupRoute({
    scope: 'same_casting',
    needs_data: [
      { capability: 'liunian_scan', params: { years: [2026] } },
      { capability: 'liunian_scan', params: { years: [2030] } },
    ],
  }, { branch: 'bazi' });
  assert.equal(out.needs_data.length, 1);
  assert.deepEqual(out.needs_data[0].params, { years: [2026] });
});

test('nature 仅 revise 被接受，其余归 deepen', () => {
  assert.equal(normalizeFollowupRoute({ scope: 'same_casting', nature: 'revise' }, {}).nature, 'revise');
  assert.equal(normalizeFollowupRoute({ scope: 'same_casting', nature: '乱' }, {}).nature, 'deepen');
});

// ── 注册表一致性 ────────────────────────────────────────────────────────

test('listRecomputeCapabilities 只列 recompute、不含 reread', () => {
  const caps = listRecomputeCapabilities('qimen').map((c) => c.capability);
  assert.ok(caps.includes('yingqi'));
  assert.ok(!caps.includes('fangwei'));
  assert.ok(!caps.includes('regong'));
});

test('注册表每项都有合法 tier', () => {
  for (const branch of Object.keys(FOLLOWUP_CAPABILITIES)) {
    for (const [, spec] of Object.entries(FOLLOWUP_CAPABILITIES[branch])) {
      assert.ok(['reread', 'recompute'].includes(spec.tier));
      assert.ok(Array.isArray(spec.params));
    }
  }
});

// ── prompt builders ─────────────────────────────────────────────────────

test('判断器 prompt 注入追问、白名单能力，且不泄漏 reread 能力', () => {
  const p = buildFollowupClassifierPrompt({
    branch: 'qimen', followup: '具体哪一年应验？', originQuestion: '能成吗', originConclusion: '近期向好',
  });
  assert.ok(p.includes('具体哪一年应验？'));
  assert.ok(p.includes('yingqi'));         // recompute 入白名单
  assert.ok(!p.includes('fangwei'));       // reread 不进白名单
  assert.ok(p.includes('"scope"'));        // 强制 JSON 模板
});

test('增补 prompt 含自然语言盘面、追问、目标段哨兵，且声明只增补不覆盖', () => {
  const p = buildFollowupPatchPrompt({
    branch: 'qimen',
    followup: '哪个方向有利？',
    evidence: SAMPLE_EVIDENCE,
    sections: { conclusion: '原结论文字', decision_reading: '原行事' },
    targetSections: ['conclusion'],
    nature: 'deepen',
  });
  assert.ok(p.includes('哪个方向有利？'));
  assert.ok(p.includes('陽遁3局'));          // 局名以自然语言出现
  assert.ok(p.includes('艮8宫：九星天蓬'));   // 九宫叙述化
  assert.ok(!p.includes('"qimen_data"'));     // 不再塞 JSON
  assert.ok(p.includes('<<<SEC:patch_meta>>>'));
  assert.ok(p.includes('<<<SEC:conclusion>>>'));
  assert.ok(p.includes('不要重写原段'));
});

test('增补 prompt：revise 走对照写法、extraEvidence（文本）被注入', () => {
  const p = buildFollowupPatchPrompt({
    branch: 'bazi',
    followup: '我已经辞职了',
    evidence: {},
    extraEvidence: '2026 流年丙午，比肩透出，利自立。',
    sections: { summary_conclusion: '原结论' },
    targetSections: ['summary_conclusion'],
    nature: 'revise',
  });
  assert.ok(p.includes('对照'));
  assert.ok(p.includes('2026'));
});

test('buildQimenEvidenceNarrative：自然语言、含盘面要素、不含 JSON/原 m3 解读', () => {
  const t = buildQimenEvidenceNarrative(SAMPLE_EVIDENCE);
  assert.ok(t.includes('陽遁3局'));
  assert.ok(t.includes('值符：天心（落坎1宫）'));
  assert.ok(t.includes('空亡：日空子丑 时空辰巳'));
  assert.ok(t.includes('艮8宫：九星天蓬，八神滕蛇，八门開門'));
  assert.ok(t.includes('空亡、马星'));               // 宫位标记
  assert.ok(t.includes('中5宫：地盘天干 庚'));
  assert.ok(t.includes('【格局】六仪击刑（凶 -15）'));
  assert.ok(t.includes('【用神选取】'));
  assert.ok(t.includes('本人状态（日干 丙）：空亡待动——日干丙落艮8宫'));
  assert.ok(!t.includes('{'));                        // 无 JSON
  assert.ok(!t.includes('不该出现在证据里的原解读'));   // m3 reading 不混入证据
});

test('buildQimenEvidenceNarrative：formation_tags 落在 m2_basis 顶层也能读到', () => {
  const ev = {
    qimen_data: { palaces: [] },
    m2_basis: { formation_tags: [{ name: '三奇得使', type: 'ji', effect: '+6' }] },  // 顶层，无 chart_summary
  };
  const t = buildQimenEvidenceNarrative(ev);
  assert.ok(t.includes('【格局】三奇得使（吉 +6）'));
});

test('增补 prompt：targetSections 为空时回退默认段', () => {
  const p = buildFollowupPatchPrompt({ branch: 'qimen', followup: 'x', evidence: {}, sections: {}, targetSections: [] });
  assert.ok(p.includes('<<<SEC:conclusion>>>'));
});
