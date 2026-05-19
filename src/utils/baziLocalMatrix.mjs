import { Solar } from 'lunar-javascript'

import { findDatesByBazi } from './baziProfileInput.mjs'

const ZHI_MAIN_GAN = {
  子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙',
  午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬'
}

const ZHI_HIDE = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
  辰: ['戊', '乙', '癸'], 巳: ['丙', '庚', '戊'], 午: ['丁', '己'], 未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲']
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

const FULL_SHEN = {
  比: '比肩', 劫: '劫财', 食: '食神', 伤: '伤官',
  财: '正财', 才: '偏财', 官: '正官', 杀: '七杀',
  印: '正印', 枭: '偏印'
}

const NAYIN = {
  甲子: '海中金', 乙丑: '海中金', 丙寅: '炉中火', 丁卯: '炉中火', 戊辰: '大林木', 己巳: '大林木',
  庚午: '路旁土', 辛未: '路旁土', 壬申: '剑锋金', 癸酉: '剑锋金', 甲戌: '山头火', 乙亥: '山头火',
  丙子: '涧下水', 丁丑: '涧下水', 戊寅: '城头土', 己卯: '城头土', 庚辰: '白蜡金', 辛巳: '白蜡金',
  壬午: '杨柳木', 癸未: '杨柳木', 甲申: '泉中水', 乙酉: '泉中水', 丙戌: '屋上土', 丁亥: '屋上土',
  戊子: '霹雳火', 己丑: '霹雳火', 庚寅: '松柏木', 辛卯: '松柏木', 壬辰: '长流水', 癸巳: '长流水',
  甲午: '沙中金', 乙未: '沙中金', 丙申: '山下火', 丁酉: '山下火', 戊戌: '平地木', 己亥: '平地木',
  庚子: '壁上土', 辛丑: '壁上土', 壬寅: '金箔金', 癸卯: '金箔金', 甲辰: '覆灯火', 乙巳: '覆灯火',
  丙午: '天河水', 丁未: '天河水', 戊申: '大驿土', 己酉: '大驿土', 庚戌: '钗钏金', 辛亥: '钗钏金',
  壬子: '桑柘木', 癸丑: '桑柘木', 甲寅: '大溪水', 乙卯: '大溪水', 丙辰: '沙中土', 丁巳: '沙中土',
  戊午: '天上火', 己未: '天上火', 庚申: '石榴木', 辛酉: '石榴木', 壬戌: '大海水', 癸亥: '大海水'
}

const _GAN_ORDER = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const _ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const _CS_START = { 甲: 11, 乙: 6, 丙: 2, 丁: 9, 戊: 2, 己: 9, 庚: 5, 辛: 0, 壬: 8, 癸: 3 }
const _SHI_ER = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养']
const _ZHI_IDX = { 子: 0, 丑: 1, 寅: 2, 卯: 3, 辰: 4, 巳: 5, 午: 6, 未: 7, 申: 8, 酉: 9, 戌: 10, 亥: 11 }
const _YANG_GANS = new Set(['甲', '丙', '戊', '庚', '壬'])

const getDiShi = (gan, zhi) => {
  const start = _CS_START[gan]
  const zIdx = _ZHI_IDX[zhi]
  if (start === undefined || zIdx === undefined) return '-'
  const offset = _YANG_GANS.has(gan) ? (zIdx - start + 12) % 12 : (start - zIdx + 12) % 12
  return _SHI_ER[offset]
}

const computeXunKong = (gan, zhi) => {
  const ganIdx = _GAN_ORDER.indexOf(gan)
  const zhiIdx = _ZHI_IDX[zhi]
  if (ganIdx === -1 || zhiIdx === undefined) return '-'
  const headZhiIdx = (zhiIdx - ganIdx + 12) % 12
  return _ZHI_ORDER[(headZhiIdx + 10) % 12] + _ZHI_ORDER[(headZhiIdx + 11) % 12]
}

const toFullShen = (s) => FULL_SHEN[s] || s

const pad2 = (value) => String(value).padStart(2, '0')

const toArray = (value) => {
  if (Array.isArray(value)) return value
  if (!value) return []
  return String(value).split(',').map(item => item.trim()).filter(Boolean)
}

const getShiShen = (dayGan, targetGan) => {
  if (!dayGan || !targetGan || !SHI_SHEN[dayGan]) return ''
  return SHI_SHEN[dayGan][targetGan] || ''
}

const parseBirthDate = (birthDate) => {
  if (!birthDate) return null
  const parts = String(birthDate).match(/\d+/g)
  if (!parts || parts.length < 3) return null
  return {
    year: Number(parts[0]),
    month: Number(parts[1]),
    day: Number(parts[2]),
    hour: Number(parts[3] || 12),
    minute: Number(parts[4] || 0)
  }
}

export const resolveSolarFromProfile = (profile) => {
  if (!profile) return null

  const parsed = parseBirthDate(profile.adjusted_birth_date || profile.birth_date)
  if (parsed) {
    return Solar.fromYmdHms(parsed.year, parsed.month, parsed.day, parsed.hour, parsed.minute, 0)
  }

  const pillars = String(profile.bazi_str || '').split(' ').filter(Boolean)
  if (pillars.length !== 4) return null

  const matches = findDatesByBazi(pillars[0], pillars[1], pillars[2], pillars[3])
  return matches.length ? matches[matches.length - 1] : null
}

export const getPromptDataFromProfile = (profile) => {
  const solar = resolveSolarFromProfile(profile)
  const result = {
    gender: profile?.gender === 'M' ? '男' : '女',
    birthStr: '',
    baziStr: String(profile?.bazi_str || '').trim(),
    daYunStr: '当前大运'
  }

  if (!solar) return result

  const lunar = solar.getLunar()
  const eightChar = lunar.getEightChar()

  result.birthStr = `${solar.getYear()}年${solar.getMonth()}月${solar.getDay()}日 ${pad2(solar.getHour())}:${pad2(solar.getMinute())}`
  if (!result.baziStr) {
    result.baziStr = `${eightChar.getYear()} ${eightChar.getMonth()} ${eightChar.getDay()} ${eightChar.getTime()}`
  }

  return result
}

const buildPillarColumn = ({ name, pillar, star, hiddenStems, dayGan, diShi, zhiShiShen, xunKong, nayin }) => {
  const gan = String(pillar || '').charAt(0)
  const zhi = String(pillar || '').charAt(1)
  const zhiTenGods = toArray(zhiShiShen)
  const rawStems = toArray(hiddenStems)

  return {
    name,
    star: star || '',
    gan,
    zhi,
    hidden_stems: rawStems.map(s => {
      const stemGan = typeof s === 'string' ? s : (s?.gan || '')
      return { gan: stemGan, shi_shen: dayGan ? toFullShen(getShiShen(dayGan, stemGan)) : '' }
    }),
    shi: diShi || '',
    zizuo: zhiTenGods[0] || '',
    kong: gan && zhi ? computeXunKong(gan, zhi) : '-',
    nayin: nayin || '',
    shensha: []
  }
}

export const buildTransitColumn = (name, ganZhi, dayGan) => {
  if (!ganZhi) return null
  const gan = ganZhi.charAt(0)
  const zhi = ganZhi.charAt(1)

  return {
    name,
    star: toFullShen(getShiShen(dayGan, gan)),
    gan,
    zhi,
    hidden_stems: (ZHI_HIDE[zhi] || []).map(stemGan => ({
      gan: stemGan,
      shi_shen: toFullShen(getShiShen(dayGan, stemGan))
    })),
    shi: getDiShi(dayGan, zhi),
    zizuo: getDiShi(gan, zhi),
    kong: computeXunKong(gan, zhi),
    nayin: NAYIN[gan + zhi] || '-',
    shensha: []
  }
}

export const buildLocalBaziMatrix = (profile, referenceDate = new Date()) => {
  const solar = resolveSolarFromProfile(profile)
  if (!solar) return null

  const lunar = solar.getLunar()
  const eightChar = lunar.getEightChar()
  const dayGan = eightChar.getDay().charAt(0)

  const pillars = [
    buildPillarColumn({
      name: '年',
      pillar: eightChar.getYear(),
      star: eightChar.getYearShiShenGan(),
      hiddenStems: eightChar.getYearHideGan(),
      dayGan,
      diShi: eightChar.getYearDiShi(),
      zhiShiShen: eightChar.getYearShiShenZhi(),
      xunKong: eightChar.getYearXunKong(),
      nayin: eightChar.getYearNaYin()
    }),
    buildPillarColumn({
      name: '月',
      pillar: eightChar.getMonth(),
      star: eightChar.getMonthShiShenGan(),
      hiddenStems: eightChar.getMonthHideGan(),
      dayGan,
      diShi: eightChar.getMonthDiShi(),
      zhiShiShen: eightChar.getMonthShiShenZhi(),
      xunKong: eightChar.getMonthXunKong(),
      nayin: eightChar.getMonthNaYin()
    }),
    buildPillarColumn({
      name: '日',
      pillar: eightChar.getDay(),
      star: eightChar.getDayShiShenGan(),
      hiddenStems: eightChar.getDayHideGan(),
      dayGan,
      diShi: eightChar.getDayDiShi(),
      zhiShiShen: eightChar.getDayShiShenZhi(),
      xunKong: eightChar.getDayXunKong(),
      nayin: eightChar.getDayNaYin()
    }),
    buildPillarColumn({
      name: '时',
      pillar: eightChar.getTime(),
      star: eightChar.getTimeShiShenGan(),
      hiddenStems: eightChar.getTimeHideGan(),
      dayGan,
      diShi: eightChar.getTimeDiShi(),
      zhiShiShen: eightChar.getTimeShiShenZhi(),
      xunKong: eightChar.getTimeXunKong(),
      nayin: eightChar.getTimeNaYin()
    })
  ]

  const currentYear = referenceDate.getFullYear()
  const yun = eightChar.getYun(profile?.gender === 'M' ? 1 : 0)
  const dayunList = yun.getDaYun()
  let currentDayun = dayunList.find(item => currentYear >= item.getStartYear() && currentYear <= item.getEndYear())

  if (!currentDayun && dayunList.length) {
    currentDayun = dayunList.find(item => currentYear <= item.getStartYear()) || dayunList[0]
  }

  const currentLiunian = currentDayun?.getLiuNian().find(item => item.getYear() === currentYear) || currentDayun?.getLiuNian()[0] || null

  return {
    pillars,
    current_dayun: currentDayun?.getGanZhi() ? buildTransitColumn('大运', currentDayun.getGanZhi(), dayGan) : null,
    current_liunian: currentLiunian?.getGanZhi() ? buildTransitColumn('流年', currentLiunian.getGanZhi(), dayGan) : null,
    dayun_list: dayunList.map(item => {
      const gz = item.getGanZhi?.() || ''
      const gan = gz.charAt(0)
      const zhi = gz.charAt(1)
      return {
        gan,
        zhi,
        start_year: item.getStartYear?.() ?? null,
        end_year: item.getEndYear?.() ?? null,
        start_age: item.getStartAge?.() ?? null,
        end_age: item.getEndAge?.() ?? null,
        shi_shen: getShiShen(dayGan, gan),
        zhi_shi_shen: getShiShen(dayGan, ZHI_MAIN_GAN[zhi] || ''),
        liunian_list: (item.getLiuNian?.() || []).map(ln => {
          const lnGz = ln.getGanZhi?.() || ''
          const lnGan = lnGz.charAt(0)
          const lnZhi = lnGz.charAt(1)
          return {
            year: ln.getYear?.() ?? null,
            gan: lnGan,
            zhi: lnZhi,
            shi_shen: getShiShen(dayGan, lnGan),
            zhi_shi_shen: getShiShen(dayGan, ZHI_MAIN_GAN[lnZhi] || '')
          }
        })
      }
    })
  }
}

/**
 * 根据年份查找命主当时所在的大运干支
 * @param {Object} profile - bazi_profiles 记录
 * @param {number} year    - 查询年份
 * @returns {string}       - 如 "庚戌"；找不到时返回 ""
 */
export const getDayunByYear = (profile, year) => {
  const solar = resolveSolarFromProfile(profile)
  if (!solar) return ''
  const eightChar = solar.getLunar().getEightChar()
  const yun = eightChar.getYun(profile?.gender === 'M' ? 1 : 0)
  const dayun = yun.getDaYun().find(
    dy => year >= dy.getStartYear() && year <= dy.getEndYear()
  )
  return dayun?.getGanZhi() || ''
}
