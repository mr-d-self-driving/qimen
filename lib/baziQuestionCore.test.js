const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildBaziQuestionPrompt,
  extractBaziQuestionContext,
  normalizeBaziQuestionOutput
} = require('./baziQuestionCore');

const profile = {
  id: 'profile-1',
  name: '命主',
  gender: 'M',
  bazi_str: '甲子 丙寅 戊辰 庚申',
  geju: '食神格',
  strong_weak: '身弱',
  favorable_elements: ['火', '土'],
  unfavorable_elements: ['水', '木'],
  shensha: '{"day":["天乙贵人"]}',
  bazi_detail: {
    matrix: {
      pillars: [
        { name: '年', gan: '甲', zhi: '子', star: '七杀' },
        { name: '月', gan: '丙', zhi: '寅', star: '偏印' },
        { name: '日', gan: '戊', zhi: '辰', star: '元男' },
        { name: '时', gan: '庚', zhi: '申', star: '食神' }
      ],
      current_dayun: { gan: '丁', zhi: '卯', shi_shen: '正印' },
      current_liunian: { gan: '丙', zhi: '午', shi_shen: '偏印' },
      liuyue_list: [{ month_name: '正月', gan: '庚', zhi: '寅', shi_shen: '食神' }],
      dayun_list: [{ gan: '丁', zhi: '卯', start_age: 32 }]
    },
    strength_detail: { summary: '日主偏弱，喜火土扶身。' },
    chengge_detail: { chengGe: '食神生财格', chengGeResult: '成格' },
    interactions: { stems: ['丙辛合'] },
    classic_verdict: { summary: '食神有气。' }
  }
};

test('extractBaziQuestionContext cites existing profile fields without recomputing pillars', () => {
  const context = extractBaziQuestionContext(profile);

  assert.equal(context.name, '命主');
  assert.equal(context.gender, '男');
  assert.equal(context.year_gz, '甲子');
  assert.equal(context.day_stem, '戊');
  assert.equal(context.strong_weak, '身弱');
  assert.equal(context.geju, '食神格');
  assert.equal(context.current_dayun, '丁卯');
  assert.equal(context.dayun_stem_shen, '正印');
  assert.equal(context.dayun_start_age, 32);
  assert.equal(context.current_year_gz, '丙午');
  assert.equal(context.current_month_gz, '庚寅');
});

test('buildBaziQuestionPrompt includes strict non-recalculation guard and requested schema', () => {
  const prompt = buildBaziQuestionPrompt({
    profile,
    question: '我未来五年适合创业还是打工？',
    route: { category: 'career_business', subcategory: 'entrepreneurship_vs_job' }
  });

  assert.match(prompt, /你是一位精通子平八字推演的命理大师/);
  assert.match(prompt, /不得重新排盘/);
  assert.match(prompt, /八字：甲子 丙寅 戊辰 庚申/);
  assert.match(prompt, /用户问题/);
  assert.match(prompt, /"ming_ju_analysis"/);
  assert.match(prompt, /"dayun_liunian"/);
  assert.match(prompt, /"question_analysis"/);
});

test('normalizeBaziQuestionOutput maps bazi schema to existing result card analysis fields', () => {
  const output = normalizeBaziQuestionOutput({
    summary: { title: '事业分析', conclusion: '平稳', score: 70, keyword: '官印相生' },
    ming_ju_analysis: {
      ge_ju: '食神格',
      core_shishen: '官星',
      shensha_note: '天乙可用'
    },
    dayun_liunian: {
      current_climate: '平运',
      turning_point: '2027年',
      liuyue_trigger: '午月'
    },
    question_analysis: {
      timing: { best_period: '午月', avoid_period: '子月' }
    },
    advice: {
      strategy: ['先稳后动'],
      risk: '忌冒进',
      leverage: '借火土',
      lucky_tips: { direction: '南方', industry: '教育', timing: '午月' }
    }
  }, {
    question: '事业如何',
    route: { branch: 'bazi', category: 'career_business', subcategory: 'career_direction' }
  });

  assert.equal(output.branch, 'bazi');
  assert.equal(output.category, 'career_business');
  assert.equal(output.analysis.pattern, '食神格');
  assert.equal(output.analysis.yong_shen, '官星');
  assert.equal(output.analysis.dynamic_timing, '2027年');
  assert.equal(output.advice.lucky_tips.time, '午月');
  assert.equal(output.advice.lucky_tips.action, '借火土');
});
