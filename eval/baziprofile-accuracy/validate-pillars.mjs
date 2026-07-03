// 校验四柱能否反查到公历（held-out 候选命例必须通过，否则按 gold-cases 策略丢弃）。
// 用法: node eval/baziprofile-accuracy/validate-pillars.mjs "丙戌 庚子 丁卯 丙午" "壬辰 丁未 辛丑 甲午" ...
import pkg from 'lunar-javascript';
const { Solar } = pkg;

const ZHI_HOURS = { 子: 0, 丑: 2, 寅: 4, 卯: 6, 辰: 8, 巳: 10, 午: 12, 未: 14, 申: 16, 酉: 18, 戌: 20, 亥: 22 };

function findSolar(pillars, startYear = 1500, span = 800) {
  const [yearPillar, monthPillar, dayPillar, timePillar] = pillars;
  const targetHour = ZHI_HOURS[timePillar.charAt(1)] ?? 12;
  for (let year = startYear; year <= startYear + span; year += 1) {
    const midYear = Solar.fromYmd(year, 7, 1);
    if (midYear.getLunar().getYearInGanZhi() !== yearPillar) continue;
    let current = Solar.fromYmd(year - 1, 11, 1);
    const end = Solar.fromYmd(year + 1, 3, 1);
    while (current.toYmd() <= end.toYmd()) {
      const test = Solar.fromYmdHms(current.getYear(), current.getMonth(), current.getDay(), targetHour, 30, 0);
      const ec = test.getLunar().getEightChar();
      if (ec.getYear() === yearPillar && ec.getMonth() === monthPillar && ec.getDay() === dayPillar && ec.getTime() === timePillar) {
        return { year: current.getYear(), month: current.getMonth(), day: current.getDay(), hour: targetHour };
      }
      current = current.next(1);
    }
  }
  return null;
}

for (const arg of process.argv.slice(2)) {
  const pillars = arg.trim().split(/\s+/);
  if (pillars.length !== 4) { console.log(`SKIP  ${arg} (需4柱)`); continue; }
  const solar = findSolar(pillars);
  console.log(`${solar ? 'OK  ' : 'FAIL'}  ${pillars.join(' ')}` + (solar ? `  -> ${solar.year}-${solar.month}-${solar.day} ${solar.hour}:30` : '  (反查不到公历, 丢弃)'));
}
