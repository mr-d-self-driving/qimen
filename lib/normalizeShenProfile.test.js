const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeShenProfile,
  getShiShenTier,
} = require('./normalizeShenProfile');

test('normalizeShenProfile removes lower-tier conflicts using alias-aware priority', () => {
  const shen = normalizeShenProfile({
    yong_shen: ['印星'],
    xi_shen: ['正印', '比劫'],
    ji_shen: ['偏印', '官杀'],
    chou_shen: ['七杀', '财星'],
  });

  assert.deepEqual(shen.yong, ['印星']);
  assert.deepEqual(shen.xi, ['比劫']);
  assert.deepEqual(shen.ji, ['官杀']);
  assert.deepEqual(shen.chou, ['财星']);
  assert.equal(getShiShenTier('正印', shen), 'yong');
  assert.equal(getShiShenTier('七杀', shen), 'ji');
});
