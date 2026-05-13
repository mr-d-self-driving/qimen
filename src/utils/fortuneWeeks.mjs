const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export const normalizeDateString = (value) => {
  const match = String(value || '').match(DATE_PATTERN)
  return match ? match[0] : ''
}

export const toDateKey = (date) => {
  const target = date instanceof Date ? date : new Date(date)
  return [
    target.getFullYear(),
    String(target.getMonth() + 1).padStart(2, '0'),
    String(target.getDate()).padStart(2, '0'),
  ].join('-')
}

export const addLocalDays = (dateStr, offset) => {
  const target = new Date(`${dateStr}T12:00:00`)
  target.setDate(target.getDate() + offset)
  return toDateKey(target)
}

export const addLocalMonths = (dateStr, offset) => {
  const target = new Date(`${dateStr}T12:00:00`)
  target.setMonth(target.getMonth() + offset)
  return toDateKey(target)
}

export const addLocalYears = (dateStr, offset) => {
  const target = new Date(`${dateStr}T12:00:00`)
  target.setFullYear(target.getFullYear() + offset)
  return toDateKey(target)
}

export const getWeekStart = (dateStr = toDateKey(new Date())) => {
  const target = new Date(`${dateStr}T12:00:00`)
  const day = target.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  target.setDate(target.getDate() + mondayOffset)
  return toDateKey(target)
}

export const formatCompactWeekRange = (startDate, endDate) => {
  const start = String(startDate || '').match(DATE_PATTERN)
  const end = String(endDate || '').match(DATE_PATTERN)
  if (!start || !end) return ''
  return `${start[2]}/${start[3]}-${end[2]}/${end[3]}`
}

export const buildWeekItem = (startDate, currentWeekStart) => {
  const endDate = addLocalDays(startDate, 6)
  const isCurrent = startDate === currentWeekStart
  return {
    startDate,
    endDate,
    isCurrent,
    subLabel: '',
    displayText: isCurrent ? '本周' : formatCompactWeekRange(startDate, endDate),
    rangeText: `${startDate}-${endDate}`,
  }
}

export const listFortuneWeeks = (todayKey = toDateKey(new Date()), preferredDate = '') => {
  const currentWeekStart = getWeekStart(todayKey)
  const normalizedPreferred = normalizeDateString(preferredDate)
  const baseWeekStart = getWeekStart(normalizedPreferred || todayKey)
  const firstWeekStart = getWeekStart(addLocalMonths(todayKey, -3))
  const lastWeekStart = getWeekStart(addLocalYears(todayKey, 1))
  const weekStarts = new Set()

  for (let weekStart = firstWeekStart; weekStart <= lastWeekStart; weekStart = addLocalDays(weekStart, 7)) {
    weekStarts.add(weekStart)
  }

  weekStarts.add(baseWeekStart)

  return {
    weeks: [...weekStarts]
      .sort((a, b) => a.localeCompare(b))
      .map(weekStart => buildWeekItem(weekStart, currentWeekStart)),
    selectedWeekStart: baseWeekStart,
  }
}
