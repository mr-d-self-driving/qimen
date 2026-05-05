'use strict';

const { Solar } = require('lunar-javascript');

function pad2(value) {
  return String(value).padStart(2, '0');
}

function toIsoDate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function formatMonthDay(isoDate) {
  const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  return `${Number(match[2])}月${Number(match[3])}日`;
}

function parseTargetDate(targetDate) {
  const dateLike = String(targetDate || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dateLike) {
    return {
      year: Number(dateLike[1]),
      month: Number(dateLike[2]),
      day: Number(dateLike[3]),
    };
  }

  const monthLike = String(targetDate || '').match(/^(\d{4})-(\d{1,2})$/);
  if (monthLike) {
    return {
      year: Number(monthLike[1]),
      month: Number(monthLike[2]),
      day: 1,
    };
  }

  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const bjTime = new Date(utc + 8 * 3600000);
  return {
    year: bjTime.getUTCFullYear(),
    month: bjTime.getUTCMonth() + 1,
    day: bjTime.getUTCDate(),
  };
}

function addDays(isoDate, amount) {
  const [year, month, day] = String(isoDate).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + amount);
  return toIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function getFlowMonthInfo(targetDate) {
  const { year, month, day } = parseTargetDate(targetDate);
  const lunar = Solar.fromYmd(year, month, day).getLunar();
  const startJie = lunar.getPrevJie(true);
  const nextJie = lunar.getNextJie(true);

  if (!startJie || !nextJie) {
    throw new Error('无法定位当前流月的节气边界');
  }

  const startSolar = startJie.getSolar();
  const nextSolar = nextJie.getSolar();
  const start_date = startSolar.toYmd();
  const next_start_date = nextSolar.toYmd();
  const end_date = addDays(next_start_date, -1);

  // 节交当天按整天计入新流月，因此月柱取起始日次日的月柱。
  const monthGzDate = addDays(start_date, 1);
  const [gzYear, gzMonth, gzDay] = monthGzDate.split('-').map(Number);
  const month_gz = Solar.fromYmd(gzYear, gzMonth, gzDay).getLunar().getEightChar().getMonth();

  return {
    period_key: start_date,
    anchor_date: toIsoDate(year, month, day),
    start_date,
    end_date,
    next_start_date,
    start_jie: startJie.getName(),
    next_jie: nextJie.getName(),
    month_gz,
    context_month_key: start_date.slice(0, 7),
    range_label: `${formatMonthDay(start_date)} - ${formatMonthDay(end_date)}`,
    short_range_label: `${start_date.slice(5).replace('-', '/')} - ${end_date.slice(5).replace('-', '/')}`,
  };
}

function getPreviousFlowMonthStart(startDate) {
  const previousAnchor = addDays(startDate, -1);
  return getFlowMonthInfo(previousAnchor);
}

function getNextFlowMonthStart(startDate) {
  const nextAnchor = addDays(startDate, 1);
  const nextInfo = getFlowMonthInfo(nextAnchor);
  if (nextInfo.start_date === startDate) {
    return getFlowMonthInfo(nextInfo.next_start_date);
  }
  return nextInfo;
}

function listFlowMonths(anchorDate, options = {}) {
  const before = Math.max(0, Number(options.before ?? 6));
  const after = Math.max(0, Number(options.after ?? 24));
  const current = getFlowMonthInfo(anchorDate);
  const months = [current];

  let cursor = current;
  for (let index = 0; index < before; index += 1) {
    cursor = getPreviousFlowMonthStart(cursor.start_date);
    months.unshift(cursor);
  }

  cursor = current;
  for (let index = 0; index < after; index += 1) {
    cursor = getFlowMonthInfo(cursor.next_start_date);
    months.push(cursor);
  }

  return months;
}

function buildFlowMonthCacheMeta(targetDate) {
  const flowMonth = getFlowMonthInfo(targetDate);
  const [year, month, day] = flowMonth.end_date.split('-').map(Number);
  const expiresAt = new Date(Date.UTC(year, month - 1, day, 15, 59, 59, 999));
  const secondsUntilEnd = Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

  return {
    ...flowMonth,
    expiresAt,
    secondsUntilEnd,
  };
}

module.exports = {
  addDays,
  buildFlowMonthCacheMeta,
  formatMonthDay,
  getFlowMonthInfo,
  listFlowMonths,
  parseTargetDate,
};
