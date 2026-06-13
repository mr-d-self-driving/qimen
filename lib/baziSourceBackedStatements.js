'use strict';

const SOURCE_BACKED_PATTERN_STATEMENTS = {
  两气成象: {
    source_title: '《滴天髓》形象',
    source_ref: 'NotebookLM source 滴天髓 lines 937-968',
    source_excerpt: '两气合而成象，象不可破也。',
    covered_fields: ['pattern_name', 'xiji', 'dynamic_warning'],
    unsupported_fields: ['personality', 'career_wealth', 'relationship_health'],
    warning: ['象不可破；取运贵在澄清，忌中途混乱。'],
  },
  金白水清: {
    source_title: '《三命通会》金白水清',
    source_ref: 'NotebookLM source 三命通会.pdf lines 962-966',
    source_excerpt: '金清水白主荣贵，秀丽文章定出群。',
    covered_fields: ['pattern_name', 'career_wealth', 'xiji', 'warning'],
    unsupported_fields: ['personality', 'relationship_health'],
    career_wealth: ['秀丽文章定出群，声誉掀腾翰苑人。'],
    warning: ['更无火土来刑制。'],
  },
  火土成势: {
    source_title: '陆致极《八字命理动态分析教程》朱元璋命例',
    source_ref: 'NotebookLM source 八字命理动态分析教程_(陆致极).pdf lines 1088-1097',
    source_excerpt: '根据八字结构中的火土强势，顺势而为，继续走火土。',
    covered_fields: ['pattern_name', 'strength_semantic', 'yongshen', 'xiji'],
    unsupported_fields: ['personality', 'career_wealth', 'relationship_health', 'warning'],
  },
  强众敌寡: {
    source_title: '《滴天髓》众寡',
    source_ref: 'NotebookLM source 滴天髓 lines 2865-2868',
    source_excerpt: '强众而敌寡者，势在去其寡。',
    covered_fields: ['pattern_name', 'strength_semantic', 'yongshen', 'xiji', 'dynamic_warning'],
    unsupported_fields: ['personality', 'career_wealth', 'relationship_health'],
  },
  从财格: {
    source_title: '《三命通会》弃命从财 / 《滴天髓》从象',
    source_ref: 'NotebookLM sources 三命通会.pdf line 1030; 滴天髓 lines 4184-4212',
    source_excerpt: '日干无气满盘财，弃命相从是福胎。',
    covered_fields: ['pattern_name', 'strength_semantic', 'xiji', 'dynamic_warning'],
    unsupported_fields: ['personality', 'career_wealth', 'relationship_health'],
    warning: ['如逢根助反为灾。'],
  },
  从官杀格: {
    source_title: '《三命通会》弃命从煞',
    source_ref: 'NotebookLM source 三命通会.pdf line 814',
    source_excerpt: '弃命从煞，须要会煞从财。',
    covered_fields: ['pattern_name', 'strength_semantic', 'xiji', 'dynamic_warning'],
    unsupported_fields: ['personality', 'career_wealth', 'relationship_health'],
    warning: ['四柱无一点比肩印绶方论。'],
  },
  从儿格: {
    source_title: '《滴天髓》顺局',
    source_ref: 'NotebookLM source 滴天髓 lines 4461-4469',
    source_excerpt: '从儿不管身强弱，只要吾儿又得儿。',
    covered_fields: ['pattern_name', 'strength_semantic', 'xiji', 'dynamic_warning'],
    unsupported_fields: ['personality', 'career_wealth', 'relationship_health'],
    warning: ['从儿格忌印运。'],
  },
  从势格: {
    source_title: '《滴天髓》从象',
    source_ref: 'NotebookLM source 滴天髓 lines 4199-4201',
    source_excerpt: '从势者，日主无根，四柱财官食伤并旺。',
    covered_fields: ['pattern_name', 'strength_semantic', 'xiji', 'dynamic_warning'],
    unsupported_fields: ['personality', 'career_wealth', 'relationship_health', 'warning'],
  },
  专旺格: {
    source_title: '《滴天髓》从象 / 方局',
    source_ref: 'NotebookLM source 滴天髓 lines 1045-1048, 4193-4194',
    source_excerpt: '旺之极者，从其旺神也。',
    covered_fields: ['pattern_name', 'strength_semantic', 'xiji', 'dynamic_warning'],
    unsupported_fields: ['career_wealth'],
    warning: ['独象虽美，只怕运途破局。'],
  },
};

const PATTERN_ALIASES = {
  金白水清象: '金白水清',
  两气成象格: '两气成象',
  从食伤格: '从儿格',
  从食伤_从儿格: '从儿格',
};

function normalizeSourcePatternName(patternName = '') {
  return PATTERN_ALIASES[patternName] || patternName;
}

function getSourceBackedPatternStatement(patternName) {
  const key = normalizeSourcePatternName(patternName);
  const statement = SOURCE_BACKED_PATTERN_STATEMENTS[key];
  if (!statement) return null;
  return {
    ...statement,
    pattern_name: key,
    personality: statement.personality || [],
    career_wealth: statement.career_wealth || [],
    relationship_health: statement.relationship_health || [],
    warning: statement.warning || [],
    failure_warning: statement.warning || [],
    source_backed: true,
    source_limited: true,
    displayable: true,
    source_basis: `${statement.source_title}：${statement.source_excerpt}`,
    statement_source: statement.source_title,
  };
}

module.exports = {
  SOURCE_BACKED_PATTERN_STATEMENTS,
  getSourceBackedPatternStatement,
  normalizeSourcePatternName,
};
