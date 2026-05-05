import { Solar } from 'lunar-javascript'

const pad2 = (value) => String(value).padStart(2, '0')

const toIsoDate = (year, month, day) => `${year}-${pad2(month)}-${pad2(day)}`

const addDays = (isoDate, amount) => {
  const [year, month, day] = String(isoDate).split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + amount)
  return toIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

const formatMonthDay = (isoDate) => {
  const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ''
  return `${Number(match[2])}月${Number(match[3])}日`
}

const parseAnchorDate = (input) => {
  const dateLike = String(input || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (dateLike) return { year: Number(dateLike[1]), month: Number(dateLike[2]), day: Number(dateLike[3]) }

  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  }
}

export const getFlowMonthInfo = (input) => {
  const { year, month, day } = parseAnchorDate(input)
  const lunar = Solar.fromYmd(year, month, day).getLunar()
  const startJie = lunar.getPrevJie(true)
  const nextJie = lunar.getNextJie(true)
  const startDate = startJie.getSolar().toYmd()
  const nextStartDate = nextJie.getSolar().toYmd()
  const endDate = addDays(nextStartDate, -1)
  const monthGzDate = addDays(startDate, 1)
  const [gzYear, gzMonth, gzDay] = monthGzDate.split('-').map(Number)
  const monthGz = Solar.fromYmd(gzYear, gzMonth, gzDay).getLunar().getEightChar().getMonth()

  return {
    key: startDate,
    monthGz,
    label: `${monthGz}月`,
    rangeLabel: `${formatMonthDay(startDate)} - ${formatMonthDay(endDate)}`,
    shortRangeLabel: `${startDate.slice(5).replace('-', '/')} - ${endDate.slice(5).replace('-', '/')}`,
    startDate,
    endDate,
    contextMonthKey: startDate.slice(0, 7),
    nextStartDate,
  }
}

export const listFlowMonths = (anchorInput, before = 6, after = 24) => {
  const current = getFlowMonthInfo(anchorInput)
  const months = [current]
  let cursor = current

  for (let index = 0; index < before; index += 1) {
    cursor = getFlowMonthInfo(addDays(cursor.startDate, -1))
    months.unshift(cursor)
  }

  cursor = current
  for (let index = 0; index < after; index += 1) {
    cursor = getFlowMonthInfo(cursor.nextStartDate)
    months.push(cursor)
  }

  return months
}
