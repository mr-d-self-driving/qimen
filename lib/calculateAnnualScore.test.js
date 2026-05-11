const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateAnnualScore } = require('./calculateAnnualScore');
const { buildAnnualFortunePayload } = require('./fortuneAnnualCore');

const baseProfile = {
  id: 'profile-1',
  name: '测试命主',
  gender: 'M',
  birth_date: '1990-05-15 12:00:00',
  bazi_str: '庚午 辛巳 甲午 庚午',
  ri_zhu: '甲午',
  day_zhi: '午',
  month_zhi: '巳',
  year_zhi: '午',
  favorable_elements: ['印星', '比劫'],
  unfavorable_elements: ['官杀', '食伤'],
  dayun_gz: '壬申',
  liunian_gz: '丙午',
};

test('annual score exposes score_hits with the same shape as monthly score hits', () => {
  const result = calculateAnnualScore(baseProfile);

  assert.equal(result.score_hits.version, 'annual-score-hits-v1');
  assert.equal(result.score_hits.summary.final_score, result.annual_score);
  assert.match(result.score_hits.summary.display, /今年/);
  assert.match(result.score_hits.summary.debug, /layer1=/);

  const layer1 = result.score_hits.layers.find(layer => layer.layer === 'layer1');
  const layer2 = result.score_hits.layers.find(layer => layer.layer === 'layer2');
  const layer3 = result.score_hits.layers.find(layer => layer.layer === 'layer3');

  assert.ok(layer1);
  assert.ok(layer2);
  assert.ok(layer3);
  assert.equal(layer1.label, '大运底色层');
  assert.equal(layer2.label, '流年太岁层');
  assert.equal(layer3.label, '岁运神煞层');
  assert.equal(layer1.score, result.layer1_score);
  assert.equal(layer2.score, result.layer2_score);
  assert.equal(layer3.score, result.layer3_score);

  const allHits = result.score_hits.layers.flatMap(layer => layer.hits);
  assert.ok(allHits.length > 0);
  assert.ok(allHits.every(hit => Object.hasOwn(hit, 'code')));
  assert.ok(allHits.every(hit => Object.hasOwn(hit, 'type')));
  assert.ok(allHits.every(hit => Object.hasOwn(hit, 'display')));
  assert.ok(allHits.every(hit => Object.hasOwn(hit, 'debug')));
  assert.ok(allHits.every(hit => Object.hasOwn(hit, 'delta_raw')));
});

test('annual fallback score also exposes score_hits for frontend reuse', () => {
  const result = buildAnnualFortunePayload({
    id: 'profile-missing',
    name: '缺字段命主',
    gender: 'F',
    birth_date: '1992-08-10 09:00:00',
  }, 2026);

  assert.equal(result.annual_score, 70);
  assert.equal(result.score_hits.version, 'annual-score-hits-v1');
  assert.equal(result.score_hits.summary.final_score, 70);
  assert.match(result.score_hits.summary.display, /命理字段不完整/);
  assert.equal(result.score_hits.layers.length, 3);
  assert.ok(result.score_hits.layers[0].hits.some(hit => hit.code === 'fallback_missing_profile_fields'));
});

test('annual score caps still apply when score_hits are generated', () => {
  const result = calculateAnnualScore({
    ...baseProfile,
    day_zhi: '寅',
    year_zhi: '巳',
    month_zhi: '午',
    dayun_gz: '甲申',
    liunian_gz: '甲子',
    favorable_elements: ['比劫'],
    unfavorable_elements: [],
  });

  assert.equal(result.dayun_sanxing, true);
  assert.ok(result.annual_score <= 80);
  assert.equal(result.score_hits.summary.final_score, result.annual_score);
  assert.ok(result.score_hits.layers[0].hits.some(hit => hit.code === 'dayun_sanxing_cap'));
});
