const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MONTHLY_INTERPRETATION_PROMPT_VERSION,
  normalizeDimension,
  buildMonthlyInterpretationPrompt,
  buildMonthlyInterpretationPeriodKey,
  parseModelJson,
  pickMonthlyInterpretationFields,
  mergeMonthlyInterpretation,
  hasReadyMonthlyInterpretation,
} = require('./fortuneMonthlyInterpretationCore');

const profile = {
  gender: 'M',
  ri_zhu: '甲午',
  favorable_elements: ['印星', '比劫'],
  unfavorable_elements: ['食伤'],
};

const monthlyData = {
  period_key: '2026-05',
  monthly_score: 83,
  layer1_score: 18,
  layer2_score: -3,
  layer3_score: 10,
  transit_support_score: 2,
  month_gz: '壬辰',
  dayun_gz: '己未',
  liunian_gz: '丙午',
  month_gan_shishen: '偏印',
  month_relations: '流月地支[辰]与命主日支[戌]六冲（冲忌仇，冲罚减半）',
  month_wuxing: '土',
  month_wuxing_relation: '闲',
  shishen_signals: {
    tianyi_active: false,
    wenchang_active: true,
    lu_active: false,
    yima_active: false,
    yima_favorable: false,
  },
  yuede_active: true,
  is_kongwang: false,
  has_sanxing: false,
  avg_daily_score: 62.4,
  high_score_days: 2,
  high_score_dates: ['2026-05-08', '2026-05-16'],
  low_score_days: 1,
  low_score_dates: ['2026-05-22'],
  best_date: '2026-05-16',
  best_score: 88,
  worst_date: '2026-05-22',
  worst_score: 52,
  trough_period: '',
  jieqi_list: ['立夏[5月5日]', '小满[5月21日]'],
};

test('normalizeDimension accepts only monthly interpretation dimensions', () => {
  assert.equal(normalizeDimension('career'), 'career');
  assert.equal(normalizeDimension(''), 'overall');
  assert.throws(() => normalizeDimension('health'), /不支持/);
});

test('buildMonthlyInterpretationPrompt uses current layer ranges and selected dimension only', () => {
  const prompt = buildMonthlyInterpretationPrompt(profile, monthlyData, 'career');

  assert.match(prompt, /-30~\+30，占60%/);
  assert.match(prompt, /-5~\+5，占10%/);
  assert.match(prompt, /-15~\+15，占30%/);
  assert.match(prompt, /岁运承接分：2/);
  assert.match(prompt, /当前大运：己未/);
  assert.match(prompt, /当前流年：丙午/);
  assert.match(prompt, /## 当前解读维度：career/);
  assert.match(prompt, /事业维度白话/);
  assert.doesNotMatch(prompt, /桃花触发/);
  assert.doesNotMatch(prompt, /财运维度白话[\s\S]*爱情维度白话/);
});

test('buildMonthlyInterpretationPeriodKey is dimension and prompt-version specific', () => {
  assert.equal(
    buildMonthlyInterpretationPeriodKey('2026-05', 'profile-1', 'wealth'),
    `2026-05::${MONTHLY_INTERPRETATION_PROMPT_VERSION}::wealth::profile-1`
  );
});

test('parse and pick monthly interpretation fields', () => {
  const parsed = parseModelJson('```json\n{"dimension":"love","title":"标题","highlight":"重点","details":"正文","tags":["A","B","C","D"],"advice":[{"action":"约会","description":"5月8日前后安排轻松见面。"}]}\n```');
  const picked = pickMonthlyInterpretationFields(parsed);

  assert.equal(picked.dimension, 'love');
  assert.equal(picked.tags.length, 3);
  assert.equal(picked.advice.length, 1);
  assert.equal(picked.interpretation_status, 'ready');
  assert.equal(hasReadyMonthlyInterpretation(picked), true);
});

test('mergeMonthlyInterpretation preserves engine score authority', () => {
  const merged = mergeMonthlyInterpretation(monthlyData, {
    monthly_score: 1,
    layer1_score: -99,
    title: '事业标题',
    highlight: '事业重点',
    details: '事业正文',
    tags: ['事业'],
    advice: [{ action: '汇报', description: '5月16日前后安排汇报。' }],
  }, 'career');

  assert.equal(merged.dimension, 'career');
  assert.equal(merged.monthly_score, 83);
  assert.equal(merged.layer1_score, 18);
  assert.equal(merged.title, '事业标题');
});
