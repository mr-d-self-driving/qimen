// 解析用户指定的固定起局时刻。视为北京民用时，不做时区偏移变换。
// 接受 { year, month, day, hour, minute } 对象，或 "202707010900" 形式的数字串。
// 任何非法/缺省输入返回 null，由调用方回退到当前时刻。
function parsePanTime(input) {
  if (!input) return null;
  let y, mo, d, h, mi;
  if (typeof input === 'object') {
    y = +input.year; mo = +input.month; d = +input.day;
    h = +input.hour; mi = +(input.minute ?? 0);
  } else if (typeof input === 'string') {
    const digits = input.replace(/\D/g, '');
    if (digits.length < 8) return null;
    y = +digits.slice(0, 4); mo = +digits.slice(4, 6); d = +digits.slice(6, 8);
    h = +(digits.slice(8, 10) || 0); mi = +(digits.slice(10, 12) || 0);
  } else {
    return null;
  }
  if (![y, mo, d, h, mi].every(Number.isFinite)) return null;
  if (y < 1900 || y > 2200) return null;
  if (mo < 1 || mo > 12) return null;
  if (d < 1 || d > new Date(y, mo, 0).getDate()) return null;
  if (h < 0 || h > 23) return null;
  if (mi < 0 || mi > 59) return null;
  return { year: y, month: mo, day: d, hour: h, minute: mi };
}

module.exports = { parsePanTime };
