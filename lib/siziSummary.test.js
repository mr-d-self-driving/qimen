const assert = require('node:assert/strict');

const { getSiziSummary, buildSiziSummaryKey } = require('./siziSummary');

const key = buildSiziSummaryKey('甲', '甲子');

assert.equal(key, '甲日甲子');

const summary = getSiziSummary(key);

assert.ok(summary);
assert.ok(summary.includes('六甲日生甲子时'));
assert.ok(summary.includes('甲子日甲子时'));

console.log('siziSummary tests passed');
