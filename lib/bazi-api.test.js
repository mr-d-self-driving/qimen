const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'test-key';

const baziModule = require('../api/bazi');

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
