const { BaziRuleEngine } = require('./lib/BaziRuleEngine');
const C = require('./lib/BaziConstants');

const dayGan = '甲';
const monthZhi = '未';
const gans = ['戊', '己', '甲', '癸'];
const zhis = ['寅', '未', '戌', '酉'];

// 1. 计算身强身弱
const strengthResult = BaziRuleEngine.calculateStrength(dayGan, gans, zhis);

// 2. 判定格局
const geJu = "正财格";

// 3. 计算喜忌
const testResult = BaziRuleEngine.getFavorableUnfavorable(
  dayGan,
  monthZhi,
  geJu,
  strengthResult,
  zhis,
  gans
);

// We need to re-calculate ratios manually here to see what the engine saw
const wuxingScores = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
gans.forEach(g => { wuxingScores[C.GAN5[g]] += 1.0; });
zhis.forEach(z => {
  const hides = C.ZHI5_LIST[z] || [];
  if (hides[0]) wuxingScores[C.GAN5[hides[0]]] += 0.8 * (gans.includes(hides[0]) ? 1.5 : 1);
  if (hides[1]) wuxingScores[C.GAN5[hides[1]]] += 0.5 * (gans.includes(hides[1]) ? 1.5 : 1);
  if (hides[2]) wuxingScores[C.GAN5[hides[2]]] += 0.3 * (gans.includes(hides[2]) ? 1.5 : 1);
});
let totalScore = 0;
Object.values(wuxingScores).forEach(s => totalScore += s);
const wuxingRatio = {};
Object.keys(wuxingScores).forEach(wx => {
  wuxingRatio[wx] = totalScore > 0 ? (wuxingScores[wx] / totalScore) * 100 : 0;
});

console.log("Ratios:", JSON.stringify(wuxingRatio, null, 2));
console.log("Result:", JSON.stringify(testResult, null, 2));
