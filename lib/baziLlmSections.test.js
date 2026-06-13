const test = require('node:test');
const assert = require('node:assert/strict');

const {
  BAZI_LLM_SECTION_KEYS,
  buildBaziProfileSectionPrompt,
  buildBaziSummaryFromSections,
  createBaziSectionStreamParser,
  parseBaziSectionText,
} = require('./baziLlmSections');

test('bazi section parser streams split sentinel chunks into named section deltas', () => {
  const events = [];
  const parser = createBaziSectionStreamParser({
    onSectionStart: (section) => events.push(['start', section]),
    onDelta: (section, text) => events.push(['delta', section, text]),
    onSectionDone: (section, text) => events.push(['done', section, text]),
  });

  parser.push('ignored prefix<<<SECTION:yuanju_');
  parser.push('core>>>原局甲木');
  parser.push('见印<<<END_SECTION:yuanju_core>>><<<SECTION:current_dayun>>>');
  parser.push('大运走丁卯<<<END_SECTION:current_dayun>>><<<SECTION:current_liunian>>>流年丙午');
  parser.push('宜稳<<<END_SECTION:current_liunian>>>');
  const result = parser.finish();

  assert.deepEqual(result.sections, {
    yuanju_core: '原局甲木见印',
    current_dayun: '大运走丁卯',
    current_liunian: '流年丙午宜稳',
  });
  assert.deepEqual(events.filter(event => event[0] !== 'delta'), [
    ['start', 'yuanju_core'],
    ['done', 'yuanju_core', '原局甲木见印'],
    ['start', 'current_dayun'],
    ['done', 'current_dayun', '大运走丁卯'],
    ['start', 'current_liunian'],
    ['done', 'current_liunian', '流年丙午宜稳'],
  ]);
  assert.deepEqual(BAZI_LLM_SECTION_KEYS, ['yuanju_core', 'current_dayun', 'current_liunian']);
});

test('bazi section parser emits deltas before the section end marker arrives', () => {
  const deltas = [];
  const parser = createBaziSectionStreamParser({
    onDelta: (section, text) => deltas.push([section, text]),
  });

  parser.push('<<<SECTION:yuanju_core>>>原局');
  parser.push('继续生成');

  assert.deepEqual(deltas, [
    ['yuanju_core', '原局'],
    ['yuanju_core', '继续生成'],
  ]);
});

test('parseBaziSectionText rejects unknown section names', () => {
  assert.throws(
    () => parseBaziSectionText('<<<SECTION:unknown>>>x<<<END_SECTION:unknown>>>'),
    /Unknown bazi LLM section/
  );
});

test('parseBaziSectionText falls back to legacy labels when sentinels are absent', () => {
  const result = parseBaziSectionText('原局核心：身弱喜印。\n当前大运：丁卯扶身。\n当前流年：丙午宜守。');

  assert.deepEqual(result.sections, {
    yuanju_core: '身弱喜印。',
    current_dayun: '丁卯扶身。',
    current_liunian: '丙午宜守。',
  });
  assert.equal(result.source, 'legacy_labels');
});

test('buildBaziProfileSectionPrompt requires ordered sentinel sections and backend conclusions', () => {
  const prompt = buildBaziProfileSectionPrompt({
    gender: '女',
    birthStr: '1998年10月24日 08:30',
    baziStr: '戊寅 壬戌 甲辰 戊辰',
    geJu: '正财格',
    strongWeak: '身弱',
    favorableGods: ['正印', '比肩'],
    unfavorableGods: ['正财'],
    currentDaYunText: '丁卯',
    currentLiuNianText: '丙午',
  });

  assert.match(prompt, /<<<SECTION:yuanju_core>>>/);
  assert.match(prompt, /<<<END_SECTION:current_liunian>>>/);
  assert.match(prompt, /不得重算四柱/);
  assert.match(prompt, /正财格/);
  assert.match(prompt, /身弱/);
  assert.match(prompt, /丁卯/);
});

test('buildBaziProfileSectionPrompt carries source-backed special pattern boundaries', () => {
  const prompt = buildBaziProfileSectionPrompt({
    gender: '男',
    birthStr: '1328年10月21日 未时',
    baziStr: '戊辰 壬戌 丁丑 丁未',
    geJu: '伤官格',
    strongWeak: '身弱',
    favorableGods: ['伤官', '食神'],
    unfavorableGods: ['正官'],
    currentDaYunText: '丁卯',
    currentLiuNianText: '壬戌',
    patternAnalysis: {
      extraction: {
        final_pattern: { name: '伤官格', base_pattern: '伤官格' }
      },
      traits: {
        source_backed: true,
        source_title: '陆致极《八字命理动态分析教程》朱元璋命例',
        source_excerpt: '根据八字结构中的火土强势，顺势而为，继续走火土。',
        covered_fields: ['pattern_name', 'strength_semantic', 'yongshen', 'xiji'],
        unsupported_fields: ['personality', 'career_wealth', 'relationship_health', 'warning']
      }
    },
    imageAnalysis: {
      override_candidate: {
        subtype: '火土成势',
        override_scope: 'xiji_yongshen',
        treatment: 'FOLLOW_CLEAR_BODY',
        affected_dimensions: ['yongshen', 'xiji']
      }
    }
  });

  assert.match(prompt, /特殊形象：火土成势/);
  assert.match(prompt, /材料来源：陆致极《八字命理动态分析教程》朱元璋命例/);
  assert.match(prompt, /材料支持字段：pattern_name、strength_semantic、yongshen、xiji/);
  assert.match(prompt, /材料不足字段：personality、career_wealth、relationship_health、warning/);
  assert.match(prompt, /不得自行补充现代性格、职业、关系、身心或注意事项/);
  assert.match(prompt, /不得把基础格局的普通断语套到特殊形象上/);
});

test('buildBaziSummaryFromSections preserves the existing summary labels', () => {
  const summary = buildBaziSummaryFromSections({
    geJu: '正财格',
    sections: {
      yuanju_core: '原局文本',
      current_dayun: '大运文本',
      current_liunian: '流年文本',
    },
  });

  assert.equal(summary, '【命造格局】：正财格\n\n原局核心：\n原局文本\n\n当前大运：\n大运文本\n\n当前流年：\n流年文本');
});
