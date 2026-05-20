const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateQimenScore,
  moveScoreTowardNeutral
} = require('./qimenScoringEngine');

const baseIntent = { category: 'career_business', subcategory: 'job_search' };

function palace(overrides = {}) {
  return {
    index: 8,
    name: '乾6宫',
    element: '金',
    door: '开门',
    star: '天心',
    god: '值符',
    sky: '壬',
    earth: '戊',
    isKong: false,
    hasMa: false,
    isZhiShi: false,
    isDayStem: false,
    isHourStem: false,
    ...overrides
  };
}

test('moveScoreTowardNeutral pulls both good and bad scores toward the 60-point center line', () => {
  assert.equal(moveScoreTowardNeutral(90, 0.5), 75);
  assert.equal(moveScoreTowardNeutral(20, 0.5), 40);
  assert.equal(moveScoreTowardNeutral(60, 0.5), 60);
});

test('calculateQimenScore keeps a neutral chart at 60 and returns auditable v3 structure', () => {
  const result = calculateQimenScore({
    intent: baseIntent,
    palaces: [
      palace({ door: '景门', star: '天英', god: '九地', sky: '丁', earth: '己' }),
      palace({ index: 0, name: '巽4宫', element: '木', door: '杜门', star: '天英', god: '九地', sky: '壬', earth: '己' })
    ],
    yongshenRule: {
      outputRequirements: { scoreAuditMustIncludeAtLeastOneOf: [] }
    }
  });

  assert.equal(result.version, 'qimen-score-v3');
  assert.equal(result.base_score, 60);
  assert.equal(result.final_score, 60);
  assert.equal(result.summary.score, 60);
  assert.ok(Array.isArray(result.adjustments));
  assert.equal(result.deltas.macro, 0);
});

test('calculateQimenScore clamps extreme charts into the 0-100 scope', () => {
  const strong = calculateQimenScore({
    intent: baseIntent,
    palaces: [
      palace({ isDayStem: true, isZhiShi: true }),
      palace({ index: 6, name: '艮8宫', element: '土', isHourStem: true, door: '生门', star: '天任', god: '六合', sky: '乙', earth: '丙' })
    ],
    yongshenRule: { outputRequirements: { scoreAuditMustIncludeAtLeastOneOf: ['日干', '时干', '开门'] } },
    polarityOverrides: [
      { signal: '开门', domain_polarity: 'mixed_or_positive', score_effect_hint: '+8', palace: '乾6宫' }
    ]
  });

  const weak = calculateQimenScore({
    intent: { category: 'relationship', subcategory: 'online_romance' },
    palaces: [
      palace({ isDayStem: true, door: '死门', star: '天芮', god: '玄武', sky: '庚', earth: '辛' }),
      palace({ index: 1, name: '离9宫', element: '火', isHourStem: true, door: '伤门', star: '天蓬', god: '白虎', sky: '辛', earth: '庚' })
    ],
    yongshenRule: { outputRequirements: { scoreAuditMustIncludeAtLeastOneOf: ['日干', '时干'] } }
  });

  assert.ok(strong.final_score <= 100);
  assert.ok(strong.final_score >= 0);
  assert.ok(weak.final_score <= 100);
  assert.ok(weak.final_score >= 0);
});

test('core desired yongshen in void discounts a favorable score toward 60 instead of hard subtracting', () => {
  const result = calculateQimenScore({
    intent: baseIntent,
    palaces: [
      palace({ isDayStem: true, isZhiShi: true }),
      palace({ index: 6, name: '艮8宫', element: '土', isHourStem: true, door: '生门', star: '天任', god: '六合', sky: '乙', earth: '丙', isKong: true })
    ],
    yongshenRule: { outputRequirements: { scoreAuditMustIncludeAtLeastOneOf: ['日干', '时干', '开门'] } }
  });

  assert.ok(result.raw_score_before_modifiers > result.final_score);
  assert.ok(result.final_score > 60);
  assert.ok(result.state_tags.includes('needs_fill_void'));
  assert.equal(result.deltas.void_modifier_applied, true);
});

test('horse star creates timing tags without direct score delta', () => {
  const noHorse = calculateQimenScore({
    intent: baseIntent,
    palaces: [palace({ isDayStem: true }), palace({ index: 0, name: '巽4宫', element: '木', isHourStem: true })],
    yongshenRule: { outputRequirements: { scoreAuditMustIncludeAtLeastOneOf: ['日干', '时干'] } }
  });
  const withHorse = calculateQimenScore({
    intent: baseIntent,
    palaces: [palace({ isDayStem: true }), palace({ index: 0, name: '巽4宫', element: '木', isHourStem: true, hasMa: true })],
    yongshenRule: { outputRequirements: { scoreAuditMustIncludeAtLeastOneOf: ['日干', '时干'] } }
  });

  assert.equal(withHorse.final_score, noHorse.final_score);
  assert.ok(withHorse.timing.tags.includes('moving'));
});
