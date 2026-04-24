import { Lunar, Solar } from 'lunar-javascript'

export const ENTRY_MODE = {
  SOLAR: 'solar',
  LUNAR: 'lunar',
  PILLARS: 'pillars'
}

export const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
export const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
export const JIA_ZI = (() => {
  const list = []
  for (let i = 0; i < 60; i += 1) {
    list.push(GAN[i % GAN.length] + ZHI[i % ZHI.length])
  }
  return list
})()

const MONTH_ZHI_ORDER = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']
const TIME_ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const WU_HU_DUN_START = {
  甲: '丙',
  己: '丙',
  乙: '戊',
  庚: '戊',
  丙: '庚',
  辛: '庚',
  丁: '壬',
  壬: '壬',
  戊: '甲',
  癸: '甲'
}
const WU_SHU_DUN_START = {
  甲: '甲',
  己: '甲',
  乙: '丙',
  庚: '丙',
  丙: '戊',
  辛: '戊',
  丁: '庚',
  壬: '庚',
  戊: '壬',
  癸: '壬'
}

const pad2 = (value) => String(value).padStart(2, '0')

export const formatBirthDate = (year, month, day, hour = 0, minute = 0) => (
  `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(minute)}:00`
)

export const getEightCharString = (year, month, day, hour = 0, minute = 0) => {
  const bazi = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar().getEightChar()
  return `${bazi.getYear()} ${bazi.getMonth()} ${bazi.getDay()} ${bazi.getTime()}`
}

export const parseCompactSolarInput = (value) => {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.length !== 8 && digits.length !== 10 && digits.length !== 12) return null
  const year = Number(digits.slice(0, 4))
  const month = Number(digits.slice(4, 6))
  const day = Number(digits.slice(6, 8))
  const hour = digits.length >= 10 ? Number(digits.slice(8, 10)) : 0
  const minute = digits.length >= 12 ? Number(digits.slice(10, 12)) : 0
  return { year, month, day, hour, minute }
}

export const getSolarLunarSnapshot = (year, month, day, hour = 0, minute = 0) => {
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0)
  const lunar = solar.getLunar()
  return {
    solar,
    lunar,
    solarText: solar.toYmdHms(),
    lunarText: `${lunar.getYearInGanZhi()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} ${lunar.getTimeZhi()}时`,
    baziStr: `${lunar.getEightChar().getYear()} ${lunar.getEightChar().getMonth()} ${lunar.getEightChar().getDay()} ${lunar.getEightChar().getTime()}`
  }
}

export const getMonthStemByYearStem = (yearStem, monthBranch) => {
  const startStem = WU_HU_DUN_START[yearStem]
  const branchIndex = MONTH_ZHI_ORDER.indexOf(monthBranch)
  if (!startStem || branchIndex < 0) return ''
  const startIndex = GAN.indexOf(startStem)
  return GAN[(startIndex + branchIndex) % GAN.length]
}

export const getTimeStemByDayStem = (dayStem, timeBranch) => {
  const startStem = WU_SHU_DUN_START[dayStem]
  const branchIndex = TIME_ZHI_ORDER.indexOf(timeBranch)
  if (!startStem || branchIndex < 0) return ''
  const startIndex = GAN.indexOf(startStem)
  return GAN[(startIndex + branchIndex) % GAN.length]
}

export const getAllowedMonthBranchesByStem = (monthStem) => {
  const set = new Set()
  GAN.forEach((yearStem) => {
    MONTH_ZHI_ORDER.forEach((branch) => {
      if (getMonthStemByYearStem(yearStem, branch) === monthStem) {
        set.add(branch)
      }
    })
  })
  return MONTH_ZHI_ORDER.filter((branch) => set.has(branch))
}

export const getAllowedTimeBranchesByStem = (timeStem) => {
  const set = new Set()
  GAN.forEach((dayStem) => {
    TIME_ZHI_ORDER.forEach((branch) => {
      if (getTimeStemByDayStem(dayStem, branch) === timeStem) {
        set.add(branch)
      }
    })
  })
  return TIME_ZHI_ORDER.filter((branch) => set.has(branch))
}

export const normalizePillarsByDunRules = ({ yearPillar, monthPillar, dayPillar, timePillar }) => {
  const yearStem = String(yearPillar || '').charAt(0)
  const monthBranch = String(monthPillar || '').charAt(1)
  const dayStem = String(dayPillar || '').charAt(0)
  const timeBranch = String(timePillar || '').charAt(1)

  const monthStem = getMonthStemByYearStem(yearStem, monthBranch) || String(monthPillar || '').charAt(0)
  const timeStem = getTimeStemByDayStem(dayStem, timeBranch) || String(timePillar || '').charAt(0)

  return {
    yearPillar,
    monthPillar: `${monthStem}${monthBranch}`,
    dayPillar,
    timePillar: `${timeStem}${timeBranch}`
  }
}

export const buildSolarProfilePayload = ({ name, gender, year, month, day, hour = 0, minute = 0 }) => ({
  name,
  gender,
  birth_date: formatBirthDate(year, month, day, hour, minute),
  bazi_str: getEightCharString(year, month, day, hour, minute)
})

export const buildLunarProfilePayload = ({ name, gender, year, month, day, hour = 0, minute = 0 }) => {
  const lunar = Lunar.fromYmdHms(year, month, day, hour, minute, 0)
  const solar = lunar.getSolar()
  return {
    name,
    gender,
    birth_date: formatBirthDate(solar.getYear(), solar.getMonth(), solar.getDay(), solar.getHour(), solar.getMinute()),
    bazi_str: `${lunar.getEightChar().getYear()} ${lunar.getEightChar().getMonth()} ${lunar.getEightChar().getDay()} ${lunar.getEightChar().getTime()}`
  }
}

export const findDatesByBazi = (yearPillar, monthPillar, dayPillar, timePillar) => {
  const results = []
  const today = Solar.fromDate(new Date())
  const zhiHours = { 子: 0, 丑: 2, 寅: 4, 卯: 6, 辰: 8, 巳: 10, 午: 12, 未: 14, 申: 16, 酉: 18, 戌: 20, 亥: 22 }

  for (let year = 1900; year <= today.getYear(); year += 1) {
    const midYear = Solar.fromYmd(year, 7, 1)
    if (midYear.getLunar().getYearInGanZhi() !== yearPillar) continue

    let current = Solar.fromYmd(year - 1, 11, 1)
    const end = Solar.fromYmd(year + 1, 3, 1)
    while (current.toYmd() <= end.toYmd()) {
      const bazi = current.getLunar().getEightChar()
      if (bazi.getYear() === yearPillar && bazi.getMonth() === monthPillar && bazi.getDay() === dayPillar) {
        const hour = zhiHours[timePillar.charAt(1)] ?? 12
        const test = Solar.fromYmdHms(current.getYear(), current.getMonth(), current.getDay(), hour, 30, 0)
        if (test.getLunar().getEightChar().getTime() === timePillar) {
          results.push(test)
        }
      }
      current = current.next(1)
    }
  }

  return results
}

export const buildPillarsProfilePayload = ({
  name,
  gender,
  yearPillar,
  monthPillar,
  dayPillar,
  timePillar
}) => {
  const matches = findDatesByBazi(yearPillar, monthPillar, dayPillar, timePillar)
  if (!matches.length) {
    throw new Error('未找到匹配该四柱的公历日期，请调整四柱后重试。')
  }
  const selected = matches[matches.length - 1]
  return {
    name,
    gender,
    birth_date: formatBirthDate(
      selected.getYear(),
      selected.getMonth(),
      selected.getDay(),
      selected.getHour(),
      selected.getMinute()
    ),
    bazi_str: `${yearPillar} ${monthPillar} ${dayPillar} ${timePillar}`,
    matches
  }
}
