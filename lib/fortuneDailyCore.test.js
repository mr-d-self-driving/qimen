const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildBaseFortunePayload,
  pickInterpretationFields,
  mergeInterpretation,
} = require('./fortuneDailyCore');

test('buildBaseFortunePayload returns deterministic fortune data without LLM copy', () => {
  const payload = buildBaseFortunePayload({
    solar_date: '2026-04-24',
    year_gz: '丙午',
    month_gz: '壬辰',
    day_gz: '戊辰',
    day_gan: '戊',
    day_zhi: '辰',
    day_officer: '成',
    day_void: '戌亥',
    day_clash: '冲狗',
    day_nayin: '大林木',
    day_zhi_palace: '辰地支关联宫位',
    core_shen_today: '偏财',
    lucky_element: '木、火',
    lucky_hour_zhis: ['寅', '卯', '巳'],
    lucky_direction: '东南',
    wealth_officer_state: '偏财临日，财务议题显性；运势等级良；冲煞见冲狗',
    score_level: '良',
    is_kongwang: false,
    has_sanxing: true,
    scoreResult: {
      final_score: 78,
      breakdown: {
        dim1_score: 4,
        dim2_score: -2,
        dim3_score: 6,
      },
      is_kongwang: false,
      has_sanxing: true,
    },
  });

  assert.equal(payload.day_score, 78);
  assert.deepEqual(payload.score_breakdown, {
    dim1_score: 4,
    dim2_score: -2,
    dim3_score: 6,
    kong_wang_triggered: false,
    sanjing_triggered: true,
  });
  assert.equal(payload.lucky_element, '木、火');
  assert.deepEqual(payload.lucky_hour_zhis, ['寅', '卯', '巳']);
  assert.equal(payload.lucky_direction, '东南');
  assert.equal(payload.core_shen_today, '偏财');
  assert.equal(payload.wealth_officer_state, '偏财临日，财务议题显性；运势等级良；冲煞见冲狗');
  assert.equal(payload.interpretation_status, 'pending');
  assert.equal(Object.hasOwn(payload, 'day_insight'), false);
  assert.equal(Object.hasOwn(payload, 'day_guide'), false);
  assert.equal(Object.hasOwn(payload, 'lucky_color'), false);
});

test('pickInterpretationFields only returns LLM-owned fields', () => {
  const picked = pickInterpretationFields({
    day_score: 91,
    solar_date: '2026-04-24',
    day_gz: '戊辰',
    month_gz: '壬辰',
    year_gz: '丙午',
    day_zhi_palace: '巽宫',
    score_level: '良',
    day_insight: '财星照门，宜取实利',
    day_warning: '',
    career_insight: '汇报时机已到',
    wealth_insight: '正财稳进，收款顺畅',
    love_insight: '主动聆听优于讲理',
    health_insight: '脾胃易犯，少食生冷',
    day_guide: '宜推进项目、确认收款；忌仓促签约、扩大支出',
    lucky_hours: [{ hour: '卯时（5–7点）', tip: '晨会签约' }],
    lucky_direction: '东南——面谈时背朝东南，气场更稳',
    lucky_number: [3, 8],
    resolve_tip: '晨间近绿植静坐10分钟',
    hook_teaser: '近期贵人已在身边，但你可能还没认出他 →',
    lucky_element: '木',
    lucky_color: '竹青',
    lucky_color_hex: '#5B8C5A',
  });

  assert.deepEqual(picked, {
    solar_date: '2026-04-24',
    day_gz: '戊辰',
    month_gz: '壬辰',
    year_gz: '丙午',
    day_zhi_palace: '巽宫',
    score_level: '良',
    day_insight: '财星照门，宜取实利',
    day_warning: '',
    career_insight: '汇报时机已到',
    wealth_insight: '正财稳进，收款顺畅',
    love_insight: '主动聆听优于讲理',
    health_insight: '脾胃易犯，少食生冷',
    day_guide: '宜推进项目、确认收款；忌仓促签约、扩大支出',
    lucky_hours: [{ hour: '卯时（5–7点）', tip: '晨会签约' }],
    lucky_direction: '东南——面谈时背朝东南，气场更稳',
    lucky_number: [3, 8],
    resolve_tip: '晨间近绿植静坐10分钟',
    hook_teaser: '近期贵人已在身边，但你可能还没认出他 →',
    lucky_element: '木',
    lucky_color: '竹青',
    lucky_color_hex: '#5B8C5A',
    interpretation_status: 'ready',
  });
});

test('mergeInterpretation preserves backend score authority', () => {
  const merged = mergeInterpretation(
    {
      solar_date: '2026-04-24',
      day_gz: '戊辰',
      month_gz: '壬辰',
      year_gz: '丙午',
      day_zhi_palace: '巽宫',
      score_level: '平',
      day_score: 64,
      score_breakdown: { dim1_score: -6 },
      lucky_element: '水',
    },
    {
      day_score: 99,
      day_insight: '印星照身，稳处见机',
      lucky_color: '霁蓝',
      lucky_color_hex: '#4F86C6',
    }
  );

  assert.equal(merged.day_score, 64);
  assert.deepEqual(merged.score_breakdown, { dim1_score: -6 });
  assert.equal(merged.solar_date, '2026-04-24');
  assert.equal(merged.score_level, '平');
  assert.equal(merged.day_insight, '印星照身，稳处见机');
  assert.equal(merged.lucky_color, '霁蓝');
  assert.equal(merged.lucky_element, '水');
  assert.equal(merged.interpretation_status, 'ready');
});
