/**
 * baziShensha.mjs
 * Browser-compatible ESM module for shensha (神煞) computation.
 * Keeps shensha data in sync with lib/baziCore.js Rules + lib/constants/shensha.js.
 */

// ── 日干起神煞 ──────────────────────────────────────────────
const TIAN_YI   = { 甲:'丑未', 乙:'子申', 丙:'亥酉', 丁:'亥酉', 戊:'丑未', 己:'子申', 庚:'丑未', 辛:'寅午', 壬:'卯巳', 癸:'卯巳' }
const WEN_CHANG = { 甲:'巳', 乙:'午', 丙:'申', 丁:'酉', 戊:'申', 己:'酉', 庚:'亥', 辛:'子', 壬:'寅', 癸:'卯' }
const YANG_REN  = { 甲:'卯', 乙:'辰', 丙:'午', 丁:'未', 戊:'午', 己:'未', 庚:'酉', 辛:'戌', 壬:'子', 癸:'丑' }
const FEI_REN   = { 甲:'酉', 乙:'戌', 丙:'子', 丁:'丑', 戊:'子', 己:'丑', 庚:'卯', 辛:'辰', 壬:'午', 癸:'未' }
const LU_SHEN   = { 甲:'寅', 乙:'卯', 丙:'巳', 丁:'午', 戊:'巳', 己:'午', 庚:'申', 辛:'酉', 壬:'亥', 癸:'子' }
const HONG_YAN  = { 甲:'午', 乙:'午', 丙:'寅', 丁:'未', 戊:'辰', 己:'辰', 庚:'戌', 辛:'酉', 壬:'子', 癸:'申' }
const TIAN_CHU  = { 甲:'午', 乙:'巳', 丙:'子', 丁:'亥', 戊:'巳', 己:'午', 庚:'寅', 辛:'卯', 壬:'申', 癸:'未' }
const XUE_TANG  = { 甲:'亥', 乙:'午', 丙:'寅', 丁:'酉', 戊:'申', 己:'卯', 庚:'巳', 辛:'子', 壬:'申', 癸:'卯' }
// 太极贵人（四柱任一天干）
const TAI_JI    = { 甲:'子午', 乙:'子午', 丙:'卯酉', 丁:'卯酉', 戊:'丑未辰戌', 己:'丑未辰戌', 庚:'丑未辰戌', 辛:'丑未辰戌', 壬:'卯酉', 癸:'卯酉' }
// 国印贵人 = 养位（日干起）
const GUO_YIN   = { 甲:'戌', 乙:'未', 丙:'丑', 丁:'戌', 戊:'丑', 己:'戌', 庚:'辰', 辛:'丑', 壬:'未', 癸:'辰' }
// 福星贵人
const FU_XING   = { 甲:'寅', 乙:'丑', 丙:'子', 丁:'亥', 戊:'戌', 己:'酉', 庚:'申', 辛:'未', 壬:'午', 癸:'巳' }
// 流霞
const LIU_XIA   = { 甲:'酉', 乙:'戌', 丙:'未', 丁:'申', 戊:'巳', 己:'辰', 庚:'寅', 辛:'亥', 壬:'卯', 癸:'巳' }

// ── 年支起神煞 ──────────────────────────────────────────────
const YI_MA     = { 申:'寅', 子:'寅', 辰:'寅', 寅:'申', 午:'申', 戌:'申', 亥:'巳', 卯:'巳', 未:'巳', 巳:'亥', 酉:'亥', 丑:'亥' }
const TAO_HUA   = { 申:'酉', 子:'酉', 辰:'酉', 寅:'卯', 午:'卯', 戌:'卯', 亥:'子', 卯:'子', 未:'子', 巳:'午', 酉:'午', 丑:'午' }
const HUA_GAI   = { 申:'辰', 子:'辰', 辰:'辰', 寅:'戌', 午:'戌', 戌:'戌', 亥:'未', 卯:'未', 未:'未', 巳:'丑', 酉:'丑', 丑:'丑' }
const JIANG_XING= { 申:'子', 子:'子', 辰:'子', 寅:'午', 午:'午', 戌:'午', 亥:'卯', 卯:'卯', 未:'卯', 巳:'酉', 酉:'酉', 丑:'酉' }
const ZAI_SHA   = { 申:'巳', 子:'卯', 辰:'丑', 寅:'亥', 午:'酉', 戌:'未', 亥:'申', 卯:'午', 未:'辰', 巳:'寅', 酉:'子', 丑:'戌' }
const TIAN_XI   = { 子:'酉', 丑:'申', 寅:'未', 卯:'午', 辰:'巳', 巳:'辰', 午:'卯', 未:'寅', 申:'丑', 酉:'子', 戌:'亥', 亥:'戌' }
const XUE_REN   = { 子:'卯', 丑:'子', 寅:'酉', 卯:'午', 辰:'卯', 巳:'子', 午:'酉', 未:'午', 申:'卯', 酉:'子', 戌:'酉', 亥:'午' }

// ── 月支起神煞 ──────────────────────────────────────────────
const TIAN_MED  = { 子:'亥', 丑:'子', 寅:'丑', 卯:'寅', 辰:'卯', 巳:'辰', 午:'巳', 未:'午', 申:'未', 酉:'申', 戌:'酉', 亥:'戌' }
const YUE_DE    = { 寅:'丙', 午:'丙', 戌:'丙', 申:'壬', 子:'壬', 辰:'壬', 亥:'甲', 卯:'甲', 未:'甲', 巳:'庚', 酉:'庚', 丑:'庚' }
const YUE_DE_HE = { 子:'丁', 丑:'乙', 寅:'辛', 卯:'己', 辰:'丁', 巳:'乙', 午:'辛', 未:'己', 申:'丁', 酉:'乙', 戌:'辛', 亥:'己' }
const TIAN_DE   = { 寅:'丁', 卯:'申', 辰:'壬', 巳:'辛', 午:'亥', 未:'甲', 申:'癸', 酉:'寅', 戌:'丙', 亥:'乙', 子:'巳', 丑:'庚' }
const TIAN_DE_HE= { 子:'申', 丑:'乙', 寅:'壬', 卯:'巳', 辰:'丁', 巳:'丙', 午:'寅', 未:'己', 申:'戊', 酉:'亥', 戌:'辛', 亥:'庚' }

// ── 年干起神煞 ──────────────────────────────────────────────
const TIAN_GUAN = { 甲:'丑', 乙:'子', 丙:'亥', 丁:'酉', 戊:'午', 己:'未', 庚:'辰', 辛:'巳', 壬:'卯', 癸:'寅' }

// ── 各柱自干起 ──────────────────────────────────────────────
const JIN_YU    = { 甲:'丑', 乙:'辰', 丙:'辰', 丁:'未', 戊:'辰', 己:'未', 庚:'未', 辛:'戌', 壬:'戌', 癸:'丑' }
const DESHU_MAP = { 寅:['丙','丁','戊','癸'],午:['丙','丁','戊','癸'],戌:['丙','丁','戊','癸'],申:['甲','丙','戊','己','辛','壬','癸'],子:['甲','丙','戊','己','辛','壬','癸'],辰:['甲','丙','戊','己','辛','壬','癸'],巳:['乙','庚','辛'],酉:['乙','庚','辛'],丑:['乙','庚','辛'],亥:['甲','乙','丁','壬'],卯:['甲','乙','丁','壬'],未:['甲','乙','丁','壬'] }

// ── 元辰（年支 + 阴阳男女） ───────────────────────────────────
const YUAN_CHEN = {
  yang: { 子:'未',丑:'申',寅:'酉',卯:'戌',辰:'亥',巳:'子',午:'丑',未:'寅',申:'卯',酉:'辰',戌:'巳',亥:'午' },
  yin:  { 子:'巳',丑:'午',寅:'未',卯:'申',辰:'酉',巳:'戌',午:'亥',未:'子',申:'丑',酉:'寅',戌:'卯',亥:'辰' }
}

/**
 * Compute shensha array for a single pillar branch.
 * @param {string} targetZhi  - the pillar's branch
 * @param {string} dayGan     - day-stem
 * @param {string} yearZhi    - year-branch
 * @param {string} dayZhi     - day-branch
 * @param {object} opts       - { monthZhi, pillarGan, yearGan, isMale, allGans }
 */
export function getShenShaArray(targetZhi, dayGan, yearZhi, dayZhi, opts = {}) {
  if (!targetZhi) return []
  const { monthZhi, pillarGan, yearGan, isMale } = opts
  const allGans = opts.allGans || [dayGan]
  const res = []

  // ── 日干起（基础） ─────────────────────────────────────────
  if (TIAN_YI[dayGan]?.includes(targetZhi))          res.push('天乙')
  if (WEN_CHANG[dayGan] === targetZhi)               res.push('文昌')
  if (YANG_REN[dayGan] === targetZhi)                res.push('羊刃')
  if (FEI_REN[dayGan] === targetZhi)                 res.push('飞刃')
  if (LU_SHEN[dayGan] === targetZhi)                 res.push('禄神')
  if (HONG_YAN[dayGan] === targetZhi)                res.push('红艳')
  if (TIAN_CHU[dayGan] === targetZhi)                res.push('天厨')
  // 太极贵人：四柱任一天干命中即得
  if (allGans.some(g => (TAI_JI[g] || '').includes(targetZhi))) res.push('太极贵人')
  if (XUE_TANG[dayGan] === targetZhi)                res.push('学堂')
  if (GUO_YIN[dayGan] === targetZhi)                 res.push('国印贵人')
  if (FU_XING[dayGan] === targetZhi)                 res.push('福星贵人')
  if (LIU_XIA[dayGan] === targetZhi)                 res.push('流霞')

  // ── 年支起 ────────────────────────────────────────────────
  if (YI_MA[yearZhi] === targetZhi || YI_MA[dayZhi] === targetZhi)           res.push('驿马')
  if (TAO_HUA[yearZhi] === targetZhi || TAO_HUA[dayZhi] === targetZhi)       res.push('桃花')
  if (HUA_GAI[yearZhi] === targetZhi || HUA_GAI[dayZhi] === targetZhi)       res.push('华盖')
  if (JIANG_XING[yearZhi] === targetZhi || JIANG_XING[dayZhi] === targetZhi) res.push('将星')
  if (ZAI_SHA[yearZhi] === targetZhi || ZAI_SHA[dayZhi] === targetZhi)       res.push('灾煞')
  if (TIAN_XI[yearZhi] === targetZhi)                res.push('天喜')
  if (XUE_REN[yearZhi] === targetZhi)                res.push('血刃')

  // ── 月支起 ────────────────────────────────────────────────
  if (monthZhi && TIAN_MED[monthZhi] === targetZhi)  res.push('天医')

  // ── 各柱自干起 ────────────────────────────────────────────
  if (pillarGan && JIN_YU[pillarGan] === targetZhi)  res.push('金舆')
  if (pillarGan && monthZhi && (DESHU_MAP[monthZhi] || []).includes(pillarGan)) res.push('德秀贵人')

  // ── 元辰 ──────────────────────────────────────────────────
  if (yearZhi && yearGan !== undefined && isMale !== undefined) {
    const yangStem = '甲丙戊庚壬'.includes(yearGan)
    const useYang = (isMale && yangStem) || (!isMale && !yangStem)
    const ymap = useYang ? YUAN_CHEN.yang : YUAN_CHEN.yin
    if (ymap[yearZhi] === targetZhi) res.push('元辰')
  }

  // ── 月支起（天德/月德 系列，需柱干）──────────────────────────
  if (monthZhi && pillarGan) {
    if (YUE_DE[monthZhi] === pillarGan)                                          res.push('月德')
    if (YUE_DE_HE[monthZhi] === pillarGan)                                       res.push('月德合')
    if (TIAN_DE[monthZhi] === pillarGan || TIAN_DE[monthZhi] === targetZhi)      res.push('天德')
    if (TIAN_DE_HE[monthZhi] === pillarGan || TIAN_DE_HE[monthZhi] === targetZhi) res.push('天德合')
  }

  // ── 年干起 ────────────────────────────────────────────────
  if (yearGan && TIAN_GUAN[yearGan] === targetZhi)   res.push('天官贵人')

  return res
}
