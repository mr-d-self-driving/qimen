const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'test-key';

const baziModule = require('../api/bazi');
const { buildCompleteBaziDetail } = require('./baziCore');
const { Solar } = require('lunar-javascript');

const tenGodMapJia = {
  '甲': '比',
  '乙': '劫',
  '丙': '食',
  '丁': '伤',
  '戊': '才',
  '己': '财',
  '庚': '杀',
  '辛': '官',
  '壬': '枭',
  '癸': '印'
};

test('getGeJu keeps yangren special case ahead of month merge', () => {
  const result = baziModule.getGeJu({
    year: ['丁', '亥'],
    month: ['乙', '卯'],
    day: ['甲', '子'],
    time: ['己', '未']
  });

  assert.equal(result.geju, '羊刃格');
  assert.equal(result.basis, '羊刃特判');
  assert.equal(result.tenGod, '劫');
  assert.equal(result.monthMergeInfo.mergeType, '三合');
});

test('getGeJu uses month merge result before main-qi lookup', () => {
  const result = baziModule.getGeJu({
    year: ['甲', '子'],
    month: ['庚', '申'],
    day: ['戊', '辰'],
    time: ['丙', '辰']
  });

  assert.equal(result.geju, '偏财格');
  assert.equal(result.basis, '月支合化');
  assert.equal(result.monthMainGan, '壬');
  assert.equal(result.tenGod, '才');
});

test('getChengGe rejects zhengguan charts with guansha mixed', () => {
  const result = baziModule.getChengGe({
    geju: '正官格',
    basis: '月令本气',
    dayGan: '甲',
    monthZhi: '酉',
    allStems: ['辛', '庚', '甲', '丁'],
    allBranches: ['酉', '申', '午', '戌'],
    monthHiddenGans: ['辛', null, null],
    tenGodMap: tenGodMapJia,
    dayStrength: '身强'
  });

  assert.equal(result.chengGeResult, '败格');
  assert.equal(result.chengGeReason, '官杀混杂');
});

test('getChengGe forms sha-yin-xiang-sheng when qi sha rooted and seal is strong', () => {
  const result = baziModule.getChengGe({
    geju: '七杀格',
    basis: '月令本气',
    dayGan: '甲',
    monthZhi: '申',
    allStems: ['庚', '丙', '甲', '癸'],
    allBranches: ['申', '酉', '亥', '子'],
    monthHiddenGans: ['庚', '壬', '戊'],
    tenGodMap: tenGodMapJia,
    dayStrength: '身强'
  });

  assert.equal(result.chengGe, '杀印相生格');
  assert.equal(result.chengGeResult, '成格');
  assert.equal(result.xianShen, '印');
});

test('GE_JU_INFO exposes the requested major structures', () => {
  assert.equal(Object.keys(baziModule.GE_JU_INFO).length, 10);
  assert.equal(baziModule.GE_JU_INFO['建禄格'].element, '比');
  assert.ok(baziModule.GE_JU_INFO['伤官格'].chengGeTypes.includes('伤官佩印格'));
});

test('buildQualitativeSections keeps llm fields empty when llm request fails', () => {
  const result = baziModule.buildQualitativeSections({
    llmSucceeded: false,
    llmQualitativeData: null,
    engineQualitativeData: {
      yuanju_core: 'engine-yuanju',
      current_dayun: 'engine-dayun',
      current_liunian: 'engine-liunian'
    }
  });

  assert.deepEqual(result, {
    display: {
      yuanju_core: 'engine-yuanju',
      current_dayun: 'engine-dayun',
      current_liunian: 'engine-liunian'
    },
    llm: {
      yuanju_core: null,
      current_dayun: null,
      current_liunian: null
    },
    engine: {
      yuanju_core: 'engine-yuanju',
      current_dayun: 'engine-dayun',
      current_liunian: 'engine-liunian'
    }
  });
});

test('buildQualitativeSections uses llm fields only when llm request succeeds', () => {
  const result = baziModule.buildQualitativeSections({
    llmSucceeded: true,
    llmQualitativeData: {
      yuanju_core: 'llm-yuanju',
      current_dayun: 'llm-dayun',
      current_liunian: 'llm-liunian'
    },
    engineQualitativeData: {
      yuanju_core: 'engine-yuanju',
      current_dayun: 'engine-dayun',
      current_liunian: 'engine-liunian'
    }
  });

  assert.deepEqual(result, {
    display: {
      yuanju_core: 'llm-yuanju',
      current_dayun: 'llm-dayun',
      current_liunian: 'llm-liunian'
    },
    llm: {
      yuanju_core: 'llm-yuanju',
      current_dayun: 'llm-dayun',
      current_liunian: 'llm-liunian'
    },
    engine: {
      yuanju_core: 'engine-yuanju',
      current_dayun: 'engine-dayun',
      current_liunian: 'engine-liunian'
    }
  });
});

test('buildCompleteBaziDetail exposes the full method chain for frontend and question prompts', () => {
  const baZi = Solar.fromYmdHms(1999, 6, 15, 10, 30, 0).getLunar().getEightChar();
  const yun = baZi.getYun(1);
  const result = buildCompleteBaziDetail({
    baZi,
    yun,
    isMale: true,
    currentYear: 2026
  });

  assert.ok(result.base_info);
  assert.ok(result.matrix);
  assert.equal(result.matrix.pillars.length, 4);
  assert.ok(result.matrix.xiaoyun_list.length > 0);
  assert.ok(result.matrix.xiaoyun_list.every(item => item.isXiaoyun));
  assert.ok(result.matrix.dayun_list.length >= 9);
  assert.ok(result.matrix.dayun_list.every(dayun => !dayun.isXiaoyun));
  assert.ok(result.matrix.dayun_list.every(dayun => Number.isFinite(dayun.start_year) && Number.isFinite(dayun.end_year)));
  assert.ok(result.matrix.dayun_list.some(dayun => Array.isArray(dayun.liunian_list) && dayun.liunian_list.length > 0));
  assert.ok(result.matrix.liunian_list.length > 80);
  assert.ok(result.matrix.liunian_list.some(item => item.dayun_ganzhi));
  assert.ok(result.matrix.liunian_list.every(item => item.zhi_shi_shen));
  assert.ok(result.matrix.current_dayun?.gan);
  assert.ok(result.matrix.current_liunian?.gan);
  assert.ok(result.strength_detail?.sections?.length >= 5);
  assert.ok(result.geju_detail?.geju);
  assert.ok(result.geju_info);
  assert.ok(result.chengge_detail?.chengGe);
  assert.ok(Array.isArray(result.favorable_gods));
  assert.ok(Array.isArray(result.unfavorable_gods));
  assert.ok(result.dimension_breakdown);
  assert.ok(result.wuxing_ratio);
  assert.ok(result.interactions?.gans);
  assert.ok(result.interactions?.zhis);
  assert.equal(result.classic_verdict.source, '三命通会');
});

test('buildCompleteBaziDetail exposes structured pattern analysis for product display', () => {
  const baZi = Solar.fromYmdHms(1990, 6, 15, 8, 30, 0).getLunar().getEightChar();
  const yun = baZi.getYun(1);
  const result = buildCompleteBaziDetail({
    baZi,
    yun,
    isMale: true,
    currentYear: 2026
  });

  assert.ok(result.pattern_analysis);
  assert.ok(result.image_analysis);
  assert.ok(result.image_analysis.primary_candidate);
  assert.equal(result.pattern_analysis.extraction.base_pattern, result.geju);
  assert.equal(result.pattern_analysis.extraction.final_pattern.name, result.geju);
  assert.ok(result.pattern_analysis.extraction.steps.length >= 3);
  assert.ok(result.pattern_analysis.extraction.steps.some(step => step.key === 'dominant_force'));
  assert.ok(result.pattern_analysis.evaluation.good_evil_flow.strategy);
  assert.ok(['FORMED', 'BROKEN', 'PARTIAL', 'PENDING', 'DRY_COLD_IMBALANCED'].includes(result.pattern_analysis.evaluation.overall_status));
  assert.ok(result.pattern_analysis.evaluation.climate_adjustment.status);
  assert.ok(result.pattern_analysis.traits.personality.length > 0);
});

test('pattern analysis promotes structured image overrides to the final pattern axis', () => {
  const imageAnalysis = {
    primary_candidate: {
      category: 'FOLLOW_IMAGE',
      subtype: '从财格',
      target_element: '土',
      match_score: 86,
      override_normal_pattern: true,
      yongshen_strategy: 'FOLLOW_FORCE'
    }
  };
  const fakeDetail = baziModule.buildPatternAnalysis({
    geJuInfo: { geju: '正财格', basis: '月支本气', tenGod: '财', monthMainGan: '己', note: '丑以己为月令主气取格。' },
    geJu: '正财格',
    geJuInfoRecord: baziModule.GE_JU_INFO['正财格'],
    chengGeDetail: { chengGe: '财旺生官格', chengGeResult: '成格', chengGeReason: '财星有力，官星得气。', yongShen: '己', yongShenTenGod: '财', xianShen: '官' },
    strengthResult: {
      strongWeak: '疑似从格（从土）',
      dominantElement: '土',
      strengthDetail: {
        structure_exception: {
          final_type: '疑似从格（从土）',
          text: '四支无根，天干亦无实助，而土占比约58%，触发疑似从格。'
        }
      }
    },
    favorableResult: {
      special_pattern: {
        type: '从财',
        favorable: ['正财', '偏财', '正官', '七杀'],
        unfavorable: ['正印', '偏印', '比肩', '劫财']
      },
      tiaohou_detail: { urgency: '普通', explanation: '调候普通。', primary_gods: [], secondary_gods: [], avoid_gods: [] }
    },
    imageAnalysis,
    patternOverride: {
      basis: 'SPECIAL_IMAGE_OVERRIDE',
      base_pattern: '正财格',
      final_pattern: '从财格',
      overridden: true,
      yongshen_strategy: 'FOLLOW_FORCE'
    },
    monthHiddenGans: ['己', '癸', '辛'],
    monthZhi: '丑',
    dayGan: '甲'
  });

  assert.equal(fakeDetail.extraction.final_pattern.name, '从财格');
  assert.equal(fakeDetail.extraction.final_pattern.category, 'SPECIAL_FORCE');
  assert.equal(fakeDetail.extraction.final_pattern.base_pattern, '正财格');
  assert.equal(fakeDetail.extraction.basis, 'SPECIAL_IMAGE_OVERRIDE');
  assert.equal(fakeDetail.extraction.steps[0].key, 'special_force');
  assert.equal(fakeDetail.evaluation.overall_status, 'FORMED');
  assert.equal(fakeDetail.evaluation.special_force.type, '从财');
  assert.equal(fakeDetail.traits.statement_source, 'NotebookLM 古籍断语整理');
  assert.match(fakeDetail.traits.personality, /现实|资源|顺势/);
});

test('pattern analysis keeps a legacy special-pattern fallback without losing the base pattern', () => {
  const fakeDetail = baziModule.buildPatternAnalysis({
    geJuInfo: { geju: '正财格', basis: '月支本气', tenGod: '财' },
    geJu: '正财格',
    favorableResult: {
      special_pattern: {
        type: '从财',
        favorable: ['正财', '偏财', '正官', '七杀'],
        unfavorable: ['正印', '偏印', '比肩', '劫财']
      }
    }
  });

  assert.equal(fakeDetail.extraction.base_pattern, '正财格');
  assert.equal(fakeDetail.extraction.final_pattern.name, '从财格');
  assert.equal(fakeDetail.extraction.final_pattern.base_pattern, '正财格');
});

test('pattern analysis uses statement library by pattern and formation status', () => {
  const formed = baziModule.buildPatternAnalysis({
    geJuInfo: { geju: '七杀格', basis: '月支本气', tenGod: '杀', monthMainGan: '庚', note: '申以庚为月令主气取格。' },
    geJu: '七杀格',
    geJuInfoRecord: baziModule.GE_JU_INFO['七杀格'],
    chengGeDetail: { chengGe: '杀印相生格', chengGeResult: '成格', chengGeReason: '七杀有根，印绶有力相化。' },
    favorableResult: { tiaohou_detail: { urgency: '普通' } }
  });
  const broken = baziModule.buildPatternAnalysis({
    geJuInfo: { geju: '正官格', basis: '月支本气', tenGod: '官', monthMainGan: '辛', note: '酉以辛为月令主气取格。' },
    geJu: '正官格',
    geJuInfoRecord: baziModule.GE_JU_INFO['正官格'],
    chengGeDetail: { chengGe: '正官格', chengGeResult: '败格', chengGeReason: '官杀混杂。' },
    favorableResult: { tiaohou_detail: { urgency: '普通' } }
  });

  assert.equal(formed.traits.statement_state, 'FORMED');
  assert.match(formed.traits.career_wealth, /竞争|管理|压力/);
  assert.equal(broken.traits.statement_state, 'BROKEN');
  assert.match(broken.traits.warning, /规则|压力|边界/);
});
