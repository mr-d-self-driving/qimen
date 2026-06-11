const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PATCHABLE_SECTIONS,
  FOLLOWUP_CAPABILITIES,
  normalizeFollowupRoute,
  listRecomputeCapabilities,
  buildFollowupClassifierPrompt,
  buildFollowupPatchPrompt,
} = require('./wenshiFollowup');

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

test('增补 prompt 含证据、追问、目标段哨兵，且声明只增补不覆盖', () => {
  const p = buildFollowupPatchPrompt({
    branch: 'qimen',
    followup: '哪个方向有利？',
    evidence: { ju: '阳遁三局' },
    sections: { conclusion: '原结论文字', decision_reading: '原行事' },
    targetSections: ['conclusion'],
    nature: 'deepen',
  });
  assert.ok(p.includes('哪个方向有利？'));
  assert.ok(p.includes('阳遁三局'));
  assert.ok(p.includes('<<<SEC:patch_meta>>>'));
  assert.ok(p.includes('<<<SEC:conclusion>>>'));
  assert.ok(p.includes('不要重写原段'));
});

test('增补 prompt：revise 走对照写法、extraEvidence 被注入', () => {
  const p = buildFollowupPatchPrompt({
    branch: 'bazi',
    followup: '我已经辞职了',
    evidence: {},
    extraEvidence: { liunian: [{ year: 2026, score: 80 }] },
    sections: { summary_conclusion: '原结论' },
    targetSections: ['summary_conclusion'],
    nature: 'revise',
  });
  assert.ok(p.includes('对照'));
  assert.ok(p.includes('2026'));
});

test('增补 prompt：targetSections 为空时回退默认段', () => {
  const p = buildFollowupPatchPrompt({ branch: 'qimen', followup: 'x', evidence: {}, sections: {}, targetSections: [] });
  assert.ok(p.includes('<<<SEC:conclusion>>>'));
});
