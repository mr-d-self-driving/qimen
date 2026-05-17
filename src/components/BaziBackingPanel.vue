<template>
  <section class="bazi-backing-panel result-module bazi-mode-card reveal">
    <div class="backing-head">
      <div>
        <div class="backing-kicker">原局排盘</div>
        <h3>全息八字</h3>
      </div>
      <div class="backing-mode">{{ modeLabel }}</div>
    </div>

    <div v-if="displayColumns.length" class="bazi-table-wrap">
      <table class="bazi-table">
        <thead>
          <tr>
            <th class="bz-label">柱位</th>
            <th v-for="col in displayColumns" :key="col.name" class="bz-label">{{ col.name }}柱</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="bz-label">主星</td>
            <td v-for="col in displayColumns" :key="`star-${col.name}`" class="bz-star">{{ col.star || '-' }}</td>
          </tr>
          <tr>
            <td class="bz-label">天干</td>
            <td v-for="col in displayColumns" :key="`gan-${col.name}`" class="bz-char" :class="WX_MAP[col.gan] || 'wx-none'">{{ col.gan || '-' }}</td>
          </tr>
          <tr>
            <td class="bz-label">地支</td>
            <td v-for="col in displayColumns" :key="`zhi-${col.name}`" class="bz-char" :class="WX_MAP[col.zhi] || 'wx-none'">{{ col.zhi || '-' }}</td>
          </tr>
          <tr>
            <td class="bz-label">藏干</td>
            <td v-for="col in displayColumns" :key="`hidden-${col.name}`" class="bz-sub">
              <template v-for="stem in col.hidden_stems" :key="`${col.name}-${stem.gan || stem}`">
                <span :class="WX_MAP[stem.gan || stem] || 'wx-none'">{{ hiddenStemLabel(stem) }}</span><br>
              </template>
              <span v-if="!col.hidden_stems.length">-</span>
            </td>
          </tr>
          <tr>
            <td class="bz-label">星运</td>
            <td v-for="col in displayColumns" :key="`shi-${col.name}`" class="bz-sub">{{ col.shi || '-' }}</td>
          </tr>
          <tr>
            <td class="bz-label">自座</td>
            <td v-for="col in displayColumns" :key="`zizuo-${col.name}`" class="bz-sub">{{ col.zizuo || '-' }}</td>
          </tr>
          <tr>
            <td class="bz-label">空亡</td>
            <td v-for="col in displayColumns" :key="`kong-${col.name}`" class="bz-sub">
              <span v-if="col.is_kong" class="kong-text">空亡</span>
              <span v-else class="muted-dash">-</span>
            </td>
          </tr>
          <tr>
            <td class="bz-label">纳音</td>
            <td v-for="col in displayColumns" :key="`nayin-${col.name}`" class="bz-sub">{{ col.nayin || '-' }}</td>
          </tr>
          <tr>
            <td class="bz-label">神煞</td>
            <td v-for="col in displayColumns" :key="`shensha-${col.name}`" class="bz-shensha">
              <span v-for="name in sortedShensha(col.shensha)" :key="name" class="shensha-pill" :class="'ss-' + shenshaNature(name)">{{ name }}</span>
              <span v-if="!sortedShensha(col.shensha).length">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="fullDayunList.length" class="timeline-section">
      <div class="timeline-head">
        <div class="timeline-title">专业四柱大运流年流月流日联动</div>
      </div>

      <div class="linkage-row">
        <div class="row-label">大<br>运</div>
        <div class="row-content">
          <button
            v-for="dayun in fullDayunList"
            :key="dayunKey(dayun)"
            type="button"
            class="link-item dy-item"
            :class="{ active: isSelectedDayun(dayun), marked: dayunHasWindow(dayun), best: dayunHasBestWindow(dayun) }"
            @click="selectDayun(dayun)"
          >
            <div class="item-header">{{ dayun.start_year || '-' }}<br>{{ dayun.start_age || '?' }}~{{ endAge(dayun) }}岁</div>
            <div v-if="dayun.isXiaoyun" class="item-body xiaoyun-body">小运</div>
            <div v-else class="item-body stacked-ganzhi">
              <div class="char-wrap">
                <span class="char-gan" :class="WX_MAP[dayun.gan] || 'wx-none'">{{ dayun.gan || '-' }}</span>
                <span v-if="dayun.shi_shen" class="shi-shen" :class="getShenColor(dayun.shi_shen)">{{ dayun.shi_shen }}</span>
              </div>
              <div class="char-wrap">
                <span class="char-zhi" :class="WX_MAP[dayun.zhi] || 'wx-none'">{{ dayun.zhi || '-' }}</span>
                <span v-if="dayun.zhi_shi_shen" class="shi-shen" :class="getShenColor(dayun.zhi_shi_shen)">{{ dayun.zhi_shi_shen }}</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div v-if="linkedLiunianList.length" class="linkage-row">
        <div class="row-label">流<br>年</div>
        <div class="row-content">
          <button
            v-for="liunian in linkedLiunianList"
            :key="liunian.year"
            type="button"
            class="link-item ln-item"
            :class="{ active: selectedLiunianYear === liunian.year, marked: Boolean(liunian.window), best: liunian.window?.quality === 'strong' }"
            @click="selectYear(liunian.year)"
          >
            <div class="item-header">{{ liunian.year }}</div>
            <div class="item-body stacked-ganzhi">
              <div class="char-wrap">
                <span class="char-gan" :class="WX_MAP[liunian.gan] || 'wx-none'">{{ liunian.gan || '-' }}</span>
                <span v-if="liunian.shi_shen" class="shi-shen" :class="getShenColor(liunian.shi_shen)">{{ liunian.shi_shen }}</span>
              </div>
              <div class="char-wrap">
                <span class="char-zhi" :class="WX_MAP[liunian.zhi] || 'wx-none'">{{ liunian.zhi || '-' }}</span>
                <span v-if="liunian.zhi_shi_shen" class="shi-shen" :class="getShenColor(liunian.zhi_shi_shen)">{{ liunian.zhi_shi_shen }}</span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  profile: { type: Object, default: () => ({}) },
  resultData: { type: Object, default: () => ({}) },
  analysisMode: { type: String, default: '' },
  selectedYear: { type: Number, default: null }
})

const emit = defineEmits(['update:selectedYear'])

const WX_MAP = {
  甲: 'wx-mu', 乙: 'wx-mu', 寅: 'wx-mu', 卯: 'wx-mu',
  丙: 'wx-huo', 丁: 'wx-huo', 巳: 'wx-huo', 午: 'wx-huo',
  戊: 'wx-tu', 己: 'wx-tu', 辰: 'wx-tu', 戌: 'wx-tu', 丑: 'wx-tu', 未: 'wx-tu',
  庚: 'wx-jin', 辛: 'wx-jin', 申: 'wx-jin', 酉: 'wx-jin',
  壬: 'wx-shui', 癸: 'wx-shui', 亥: 'wx-shui', 子: 'wx-shui'
}
const GAN_WUXING = { 甲: '甲木', 乙: '乙木', 丙: '丙火', 丁: '丁火', 戊: '戊土', 己: '己土', 庚: '庚金', 辛: '辛金', 壬: '壬水', 癸: '癸水' }
const MODE_LABELS = {
  status: '当前状态',
  timing: '应期扫描',
  pattern: '先天结构',
  character: '人物画像'
}

const localSelectedYear = ref(props.selectedYear)

watch(() => props.selectedYear, (year) => {
  localSelectedYear.value = year
})

const matrix = computed(() => props.profile?.bazi_detail?.matrix || {})
const displayColumns = computed(() => {
  const names = ['年', '月', '日', '时']
  return (matrix.value.pillars || []).map((pillar, index) => ({
    name: pillar.name || names[index] || '',
    ...pillar,
    hidden_stems: normalizeHiddenStems(pillar.hidden_stems)
  }))
})
const fullDayunList = computed(() => matrix.value.dayun_list || [])
const liunianList = computed(() => matrix.value.liunian_list || [])
const windows = computed(() => props.resultData?.mode_analysis?.trigger_windows || [])
const windowByYear = computed(() => new Map(windows.value.map(item => [Number(item.year), item])))
const bestWindow = computed(() => windows.value.find(item => item.quality === 'strong') || windows.value[0] || null)
const selectedLiunianYear = computed(() => Number(localSelectedYear.value || matrix.value.current_liunian?.year))
const selectedDayun = computed(() => fullDayunList.value.find(dayun => isSelectedDayun(dayun)) || null)
const modeLabel = computed(() => MODE_LABELS[props.analysisMode] || '八字分析')

const linkedLiunianList = computed(() => {
  const source = liunianList.value
    .map(item => ({ ...item, year: Number(item.year), window: windowByYear.value.get(Number(item.year)) }))
    .filter(item => Number.isFinite(item.year))

  const range = dayunYearRange(selectedDayun.value)
  if (range) {
    return source.filter(item => item.year >= range.start && item.year <= range.end)
  }

  const selected = selectedLiunianYear.value
  if (!Number.isFinite(selected)) return source.slice(0, 12)
  return source.filter(item => item.year >= selected - 3 && item.year <= selected + 8).slice(0, 12)
})

watch([bestWindow, () => props.analysisMode], ([best]) => {
  if (props.selectedYear) return
  const year = props.analysisMode === 'timing'
    ? Number(best?.year)
    : Number(matrix.value.current_liunian?.year)
  if (Number.isFinite(year)) selectYear(year)
}, { immediate: true })

function normalizeHiddenStems(stems = []) {
  if (!Array.isArray(stems)) return []
  return stems.map(item => typeof item === 'string' ? { gan: item } : item).filter(item => item?.gan || item)
}

function hiddenStemLabel(stem) {
  const gan = stem.gan || stem
  return stem.shi_shen ? `${gan}${stem.shi_shen}` : (GAN_WUXING[gan] || gan)
}

function sortedShensha(list = []) {
  if (!Array.isArray(list)) return []
  return [...list].filter(Boolean).slice(0, 8)
}

function shenshaNature(name) {
  if (/红艳|劫煞|灾煞|血刃|亡神|孤辰|寡宿|空亡/.test(name)) return '凶'
  if (/贵人|天乙|太极|国印|天德|月德|天喜|禄神|福星|将星/.test(name)) return '吉'
  return '中性'
}

function getShenColor(name = '') {
  if (/杀|官|印/.test(name)) return 'shen-green'
  if (/财|食|伤/.test(name)) return 'shen-gold'
  return 'shen-red'
}

function selectYear(year) {
  localSelectedYear.value = Number(year)
  emit('update:selectedYear', localSelectedYear.value)
}

function selectDayun(dayun) {
  const start = Number(dayun.start_year) || (Number(props.profile?.birth_year) && Number(dayun.start_age) ? Number(props.profile.birth_year) + Number(dayun.start_age) : null)
  if (Number.isFinite(start)) selectYear(start)
}

function dayunKey(dayun) {
  return `${dayun.id || ''}-${dayun.start_year || ''}-${dayun.gan || ''}${dayun.zhi || ''}`
}

function endAge(dayun) {
  const startAge = Number(dayun.start_age)
  return Number.isFinite(startAge) ? startAge + 9 : '?'
}

function isSelectedDayun(dayun) {
  const selected = Number(localSelectedYear.value)
  const range = dayunYearRange(dayun)
  return Boolean(range) && Number.isFinite(selected) && selected >= range.start && selected <= range.end
}

function dayunHasWindow(dayun) {
  const range = dayunYearRange(dayun)
  return Boolean(range) && windows.value.some(item => {
    const year = Number(item.year)
    return Number.isFinite(year) && year >= range.start && year <= range.end
  })
}

function dayunHasBestWindow(dayun) {
  if (!bestWindow.value) return false
  const range = dayunYearRange(dayun)
  if (!range) return false
  const year = Number(bestWindow.value.year)
  return Number.isFinite(year) && year >= range.start && year <= range.end
}

function dayunYearRange(dayun) {
  if (!dayun) return null
  const start = Number(dayun.start_year)
  const end = Number(dayun.end_year) || (Number.isFinite(start) ? start + 9 : null)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return { start, end }
}
</script>

<style scoped>
.bazi-backing-panel {
  border-color: rgba(177,158,109,0.22);
  background: rgba(255,255,255,0.032);
}
.backing-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.backing-kicker {
  color: rgba(212,175,55,0.9);
  font-size: 12px;
}
.backing-head h3 {
  margin: 3px 0 0;
  color: var(--text-primary);
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 500;
}
.backing-mode {
  flex: 0 0 auto;
  padding: 6px 9px;
  border: 1px solid rgba(212,175,55,0.24);
  border-radius: 8px;
  color: rgba(244,237,220,0.78);
  font-size: 12px;
}
.bazi-table-wrap { width: 100%; overflow: hidden; }
.bazi-table {
  --bz-cell-py: 8px;
  --bz-label-size: 10px;
  --bz-meta-size: 10px;
  --bz-char-size: 18px;
  table-layout: fixed;
  width: 100%;
  border-collapse: collapse;
  text-align: center;
}
.bazi-table th,
.bazi-table td {
  padding: var(--bz-cell-py) 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  vertical-align: middle;
  word-wrap: break-word;
}
.bazi-table th {
  color: var(--gold-light);
  font-family: var(--font-serif);
  font-size: 12px;
  font-weight: normal;
}
.bazi-table th:first-child,
.bazi-table td:first-child { width: 44px; }
.bz-label { color: var(--text-muted); font-weight: 500; font-size: var(--bz-label-size); }
.bz-star { font-size: var(--bz-meta-size); color: var(--text-primary); }
.bz-char { font-size: var(--bz-char-size); font-weight: 600; font-family: var(--font-ganzhi); }
.bz-sub { font-size: var(--bz-meta-size); color: #aaa; line-height: 1.4; }
.bz-shensha { font-size: 9px; color: #B39DDB; line-height: 1.4; }
.shensha-pill { display: block; margin: 1px 0; white-space: nowrap; }
.ss-吉 { color: #68D391; }
.ss-中性 { color: #B39DDB; }
.ss-凶 { color: #FC8181; }
.kong-text { color: var(--crimson); }
.muted-dash { color: #555; }
.wx-jin { color: #E8CC80; }
.wx-mu { color: #81C784; }
.wx-shui { color: #64B5F6; }
.wx-huo { color: #E57373; }
.wx-tu { color: #DCE775; }
.wx-none { color: #666; }
.timeline-section {
  margin-top: 16px;
  border-top: 1px dashed var(--glass-border);
  padding-top: 16px;
}
.timeline-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.timeline-title {
  font-size: 14px;
  color: var(--gold);
  font-family: var(--font-serif);
  font-weight: 500;
}
.linkage-row {
  display: flex;
  margin-bottom: 10px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  background: rgba(0,0,0,0.25);
  overflow: hidden;
}
.row-label {
  width: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(212,175,55,0.06);
  color: var(--gold-light);
  font-size: 12px;
  text-align: center;
  font-weight: 500;
  border-right: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
  line-height: 1.3;
}
.row-content {
  display: flex;
  gap: 2px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 4px;
  flex: 1;
  scroll-snap-type: x proximity;
}
.row-content::-webkit-scrollbar { display: none; }
.link-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 58px;
  padding: 6px 4px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  scroll-snap-align: center;
}
.link-item.active {
  background: rgba(255,255,255,0.05);
  border-color: rgba(212,175,55,0.4);
  box-shadow: inset 0 0 15px rgba(212,175,55,0.08);
}
.link-item.marked { border-color: rgba(78,205,196,0.28); }
.link-item.best { background: rgba(78,205,196,0.07); }
.item-header {
  min-height: 28px;
  margin-bottom: 5px;
  color: #aaa;
  font-size: 10px;
  line-height: 1.35;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}
.item-body {
  display: flex;
  flex-direction: row;
  gap: 4px;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  min-height: 22px;
}
.stacked-ganzhi {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.xiaoyun-body {
  font-size: 14px;
  color: #777;
  margin-top: 8px;
}
.char-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  height: 19px;
  padding-right: 10px;
}
.char-gan,
.char-zhi {
  font-size: 16px;
  font-family: var(--font-ganzhi);
  font-weight: 600;
  line-height: 1;
}
.shi-shen {
  position: absolute;
  right: -14px;
  top: -1px;
  font-size: 9px;
  padding: 1px 3px;
  border-radius: 3px;
  font-weight: 500;
}
.shen-red { color: #FF5E57; background: rgba(255,94,87,0.15); }
.shen-green { color: #81C784; background: rgba(129,199,132,0.15); }
.shen-gold { color: #E8CC80; background: rgba(232,204,128,0.15); }
@media (max-width: 640px) {
  .backing-head {
    align-items: flex-start;
  }
  .bazi-table {
    --bz-char-size: 16px;
  }
}
</style>
