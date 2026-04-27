const { BaziRuleEngine } = require('./lib/BaziRuleEngine');

const testResult = BaziRuleEngine.getFavorableUnfavorable(
  "甲",           // dayGan
  "子",           // monthZhi
  "正印格",       // geJu
  { strongWeak: "身弱", score: 35 },
  ["子", "丑", "亥", "卯"],  // zhis
  ["甲", "壬", "癸", "乙"]   // gans
);

console.log(JSON.stringify(testResult, null, 2));
