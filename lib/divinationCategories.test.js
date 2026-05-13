const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DIVINATION_CATEGORIES,
  normalizeDivinationRoute,
  isValidCategory,
  isValidSubcategory
} = require('./divinationCategories');

test('divination categories keep qimen yongshen category keys as canonical domains', () => {
  assert.ok(isValidCategory('career_business'));
  assert.ok(isValidCategory('finance_wealth'));
  assert.ok(isValidCategory('relationship'));
  assert.ok(isValidCategory('health_action'));
  assert.ok(isValidCategory('general'));

  assert.equal(DIVINATION_CATEGORIES.career_business.label, '事业职场');
});

test('subcategory definitions can be shared by branch adapters without breaking qimen keys', () => {
  assert.equal(isValidSubcategory('career_business', 'job_search'), true);
  assert.equal(isValidSubcategory('career_business', 'career_direction'), true);
  assert.equal(isValidSubcategory('finance_wealth', 'debt_repayment'), true);
  assert.equal(isValidSubcategory('relationship', 'marriage_pattern'), true);
  assert.equal(isValidSubcategory('career_business', 'not_real'), false);
});

test('normalizeDivinationRoute validates branch category and subcategory defensively', () => {
  assert.deepEqual(
    normalizeDivinationRoute({
      branch: 'qimen',
      category: 'career_business',
      subcategory: 'job_search',
      confidence: 'high',
      source: 'llm',
      reason: '求职问题'
    }),
    {
      branch: 'qimen',
      category: 'career_business',
      subcategory: 'job_search',
      confidence: 'high',
      source: 'llm',
      reason: '求职问题',
      followupQuestion: ''
    }
  );

  assert.deepEqual(
    normalizeDivinationRoute({
      branch: 'unknown',
      category: 'not_a_category',
      subcategory: 'not_real',
      confidence: 'certain',
      source: 'other'
    }),
    {
      branch: 'clarify',
      category: 'general',
      subcategory: '',
      confidence: 'low',
      source: 'rules',
      reason: '',
      followupQuestion: ''
    }
  );
});
