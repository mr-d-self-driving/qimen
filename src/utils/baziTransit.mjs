import { Solar } from 'lunar-javascript'

const ZHI_MAIN_GAN = {
  子: '癸',
  丑: '己',
  寅: '甲',
  卯: '乙',
  辰: '戊',
  巳: '丙',
  午: '丁',
  未: '己',
  申: '庚',
  酉: '辛',
  戌: '戊',
  亥: '壬'
}

const SHI_SHEN = {
  甲: { 甲: '比', 乙: '劫', 丙: '食', 丁: '伤', 戊: '才', 己: '财', 庚: '杀', 辛: '官', 壬: '枭', 癸: '印' },
  乙: { 甲: '劫', 乙: '比', 丙: '伤', 丁: '食', 戊: '财', 己: '才', 庚: '官', 辛: '杀', 壬: '印', 癸: '枭' },
  丙: { 甲: '枭', 乙: '印', 丙: '比', 丁: '劫', 戊: '食', 己: '伤', 庚: '才', 辛: '财', 壬: '杀', 癸: '官' },
  丁: { 甲: '印', 乙: '枭', 丙: '劫', 丁: '比', 戊: '伤', 己: '食', 庚: '财', 辛: '才', 壬: '官', 癸: '杀' },
  戊: { 甲: '杀', 乙: '官', 丙: '枭', 丁: '印', 戊: '比', 己: '劫', 庚: '食', 辛: '伤', 壬: '才', 癸: '财' },
  己: { 甲: '官', 乙: '杀', 丙: '印', 丁: '枭', 戊: '劫', 己: '比', 庚: '伤', 辛: '食', 壬: '财', 癸: '才' },
  庚: { 甲: '才', 乙: '财', 丙: '杀', 丁: '官', 戊: '枭', 己: '印', 庚: '比', 辛: '劫', 壬: '食', 癸: '伤' },
  辛: { 甲: '财', 乙: '才', 丙: '官', 丁: '杀', 戊: '印', 己: '枭', 庚: '劫', 辛: '比', 壬: '伤', 癸: '食' },
  壬: { 甲: '食', 乙: '伤', 丙: '才', 丁: '财', 戊: '杀', 己: '官', 庚: '枭', 辛: '印', 壬: '比', 癸: '劫' },
  癸: { 甲: '伤', 乙: '食', 丙: '财', 丁: '才', 戊: '官', 己: '杀', 庚: '印', 辛: '枭', 壬: '劫', 癸: '比' }
}

const LIU_YUE_JIE_QI = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒']

const pad2 = (value) => String(value).padStart(2, '0')

export const formatSolarDateKey = (value) => {
  if (typeof value === 'string') return value.slice(0, 10)
  const year = value.getYear()
  const month = pad2(value.getMonth())
  const day = pad2(value.getDay())
  return `${year}-${month}-${day}`
}

export const getShiShen = (dayGan, targetGan) => {
  if (!dayGan || !targetGan || !SHI_SHEN[dayGan]) return ''
  return SHI_SHEN[dayGan][targetGan] || ''
}

export const buildLiuYueRange = (liuNian, liuyueIndex) => {
  const jieQiTable = Solar.fromYmd(liuNian.getYear(), 7, 1).getLunar().getJieQiTable()
  const currentKey = LIU_YUE_JIE_QI[liuyueIndex]
  const nextKey = LIU_YUE_JIE_QI[(liuyueIndex + 1) % LIU_YUE_JIE_QI.length]

  const startSolar = jieQiTable[currentKey]
  let endSolar = jieQiTable[nextKey]
  if (liuyueIndex === LIU_YUE_JIE_QI.length - 1) {
    endSolar = Solar.fromYmd(endSolar.getYear() + 1, endSolar.getMonth(), endSolar.getDay())
  }

  return {
    startSolar,
    endSolar,
    monthName: `${liuNian.getLiuYue()[liuyueIndex]?.getMonthInChinese() || ''}月`
  }
}

export const buildLiuRiList = (liuNian, liuyueIndex, dayGan) => {
  const range = buildLiuYueRange(liuNian, liuyueIndex)
  const days = []
  let current = Solar.fromYmd(range.startSolar.getYear(), range.startSolar.getMonth(), range.startSolar.getDay())
  const endKey = formatSolarDateKey(range.endSolar)

  while (formatSolarDateKey(current) < endKey) {
    const lunar = current.getLunar()
    const gz = lunar.getDayInGanZhiExact()
    const gan = gz.charAt(0)
    const zhi = gz.charAt(1)
    const mainGan = ZHI_MAIN_GAN[zhi]

    days.push({
      dateKey: formatSolarDateKey(current),
      dateLabel: `${pad2(current.getMonth())}/${pad2(current.getDay())}`,
      weekLabel: `周${'日一二三四五六'[current.getWeek()]}`,
      monthName: range.monthName,
      gan,
      zhi,
      shi_shen: getShiShen(dayGan, gan),
      zhi_shi_shen: getShiShen(dayGan, mainGan)
    })

    current = current.next(1)
  }

  return days
}

export const findTransitSelectionByDate = (baziEngine, targetDate = new Date()) => {
  if (!baziEngine?.yun) return null

  const dateKey = formatSolarDateKey(
    Solar.fromYmd(targetDate.getFullYear(), targetDate.getMonth() + 1, targetDate.getDate())
  )
  const targetYear = Number(dateKey.slice(0, 4))
  const dayunList = baziEngine.yun.getDaYun()
  let dayunIndex = dayunList.findIndex(item => targetYear >= item.getStartYear() && targetYear <= item.getEndYear())
  if (dayunIndex < 0) dayunIndex = 0

  const liuNian = dayunList[dayunIndex]?.getLiuNian().find(item => item.getYear() === targetYear)
  if (!liuNian) {
    return {
      dayunIndex,
      liunianYear: dayunList[dayunIndex]?.getStartYear() || targetYear,
      liuyueIndex: 0,
      liuriDateKey: dateKey
    }
  }

  let liuyueIndex = 0
  for (let index = 0; index < 12; index += 1) {
    const { startSolar, endSolar } = buildLiuYueRange(liuNian, index)
    if (dateKey >= formatSolarDateKey(startSolar) && dateKey < formatSolarDateKey(endSolar)) {
      liuyueIndex = index
      break
    }
  }

  return {
    dayunIndex,
    liunianYear: liuNian.getYear(),
    liuyueIndex,
    liuriDateKey: dateKey
  }
}
