<template>
  <section class="bazi-backing-panel result-module reveal">
    <div class="backing-head">
      <div>
        <div class="backing-kicker">原局排盘</div>
        <h3>命盘背书</h3>
      </div>
      <div class="backing-mode">{{ modeLabel }}</div>
    </div>

    <div class="pillar-grid" aria-label="原局四柱">
      <div
        v-for="pillar in normalizedPillars"
        :key="pillar.name"
        class="pillar-card"
        :class="{
          'is-target': targetPillars.has(pillar.name),
          'is-impacted': impactedPillars.has(pillar.name),
          'is-kong': pillar.is_kong
        }"
      >
        <div class="pillar-name">{{ pillar.name }}柱</div>
        <div class="pillar-ganzhi">
          <span :class="{ 'is-target-star': targetPositions.has(`${pillar.name}:gan`) }">{{ pillar.gan || '-' }}</span>
          <span :class="{ 'is-target-star': targetPositions.has(`${pillar.name}:zhi`) }">{{ pillar.zhi || '-' }}</span>
        </div>
        <div class="pillar-star">{{ pillar.star || pillar.shi_shen || '十神未载' }}</div>
        <div v-if="pillar.hidden_stems?.length" class="hidden-stems">
          藏 {{ pillar.hidden_stems.map(item => item.gan || item).join(' ') }}
        </div>
        <div v-if="pillar.is_kong" class="kong-mark">空</div>
      </div>
    </div>

    <div v-if="showTransitAxes" class="transit-grid">
      <div class="axis-block">
        <div class="axis-title">大运</div>
        <div class="dayun-row">
          <button
            v-for="dayun in dayunList"
            :key="`${dayun.gan || ''}${dayun.zhi || ''}${dayun.start_age || ''}`"
            type="button"
            class="dayun-chip"
            :class="{ active: isSelectedDayun(dayun), marked: dayunHasWindow(dayun), best: dayunHasBestWindow(dayun) }"
            @click="selectDayun(dayun)"
          >
            <span>{{ dayun.gan || '' }}{{ dayun.zhi || '' }}</span>
            <small>{{ dayun.start_age || '?' }}岁起</small>
          </button>
        </div>
      </div>

      <div class="axis-block">
        <div class="axis-title">流年</div>
        <div class="liunian-row">
          <button
            v-for="year in visibleYears"
            :key="year.year"
            type="button"
            class="liunian-chip"
            :class="[
              year.window ? `quality-${year.window.quality || 'weak'}` : '',
              { active: year.year === localSelectedYear, major: year.window?.is_major_window }
            ]"
            @click="selectYear(year.year)"
          >
            <span>{{ year.year }}</span>
            <strong>{{ year.gan || '' }}{{ year.zhi || '' }}</strong>
            <small>{{ year.window?.quality ? qualityLabel(year.window.quality) : year.shi_shen || '' }}</small>
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

const localSelectedYear = ref(props.selectedYear)

watch(() => props.selectedYear, (year) => {
  localSelectedYear.value = year
})

const matrix = computed(() => props.profile?.bazi_detail?.matrix || {})
const normalizedPillars = computed(() => {
  const source = matrix.value.pillars || []
  const names = ['年', '月', '日', '时']
  return source.map((pillar, index) => ({
    name: pillar.name || names[index] || '',
    ...pillar
  }))
})
const dayunList = computed(() => matrix.value.dayun_list || [])
const liunianList = computed(() => matrix.value.liunian_list || [])
const windows = computed(() => props.resultData?.mode_analysis?.trigger_windows || [])
const windowByYear = computed(() => new Map(windows.value.map((item) => [Number(item.year), item])))
const bestWindow = computed(() => windows.value.find((item) => item.quality === 'strong') || windows.value[0] || null)
const MODE_LABELS = {
  status: '当前状态',
  timing: '应期扫描',
  pattern: '先天结构',
  character: '人物画像'
}
const modeLabel = computed(() => MODE_LABELS[props.analysisMode] || '八字分析')

const GONGWEI_TO_PILLAR = {
  年柱: '年',
  月柱: '月',
  日柱: '日',
  时柱: '时',
  日支: '日',
  月支: '月',
  时支: '时'
}

function parseEvidenceLabel(label = '') {
  const match = String(label).match(/(年|月|日|时)(干|支)/)
  if (!match) return null
  return { pillar: match[1], position: match[2] === '干' ? 'gan' : 'zhi' }
}

const targetPillars = computed(() => {
  const result = new Set()
  const gongwei = props.resultData?.meta?.target?.gongwei || []
  gongwei.forEach((item) => {
    const pillar = GONGWEI_TO_PILLAR[item]
    if (pillar) result.add(pillar)
  })
  return result
})

const targetPositions = computed(() => {
  const result = new Set()
  const evidence = props.resultData?.chart_foundation?.evidence || []
  evidence.forEach((item) => {
    const parsed = parseEvidenceLabel(item.label || item.detail || item)
    if (parsed) result.add(`${parsed.pillar}:${parsed.position}`)
  })
  return result
})

const impactedPillars = computed(() => {
  const result = new Set()
  const evidence = props.resultData?.chart_foundation?.evidence || []
  evidence.forEach((item) => {
    const text = `${item.label || ''}${item.detail || ''}`
    const parsed = parseEvidenceLabel(text)
    if (parsed && /冲|害|刑/.test(text)) result.add(parsed.pillar)
  })
  return result
})

const showTransitAxes = computed(() => dayunList.value.length || liunianList.value.length)
const visibleYears = computed(() => {
  const selected = Number(localSelectedYear.value || matrix.value.current_liunian?.year)
  const source = liunianList.value.map((item) => ({
    ...item,
    year: Number(item.year),
    window: windowByYear.value.get(Number(item.year))
  })).filter((item) => Number.isFinite(item.year))

  if (props.analysisMode === 'timing' && windows.value.length) {
    const years = new Set(windows.value.map((item) => Number(item.year)).filter(Number.isFinite))
    return source.filter((item) => years.has(item.year)).slice(0, 10)
  }

  if (!Number.isFinite(selected)) return source.slice(0, 10)
  return source.filter((item) => item.year >= selected - 2 && item.year <= selected + 7).slice(0, 10)
})

watch([bestWindow, () => props.analysisMode], ([best]) => {
  if (props.selectedYear) return
  const year = props.analysisMode === 'timing'
    ? Number(best?.year)
    : Number(matrix.value.current_liunian?.year)
  if (Number.isFinite(year)) selectYear(year)
}, { immediate: true })

function qualityLabel(quality) {
  return ({ strong: '强', medium: '中', weak: '弱' }[quality] || '参')
}

function selectYear(year) {
  localSelectedYear.value = Number(year)
  emit('update:selectedYear', localSelectedYear.value)
}

function selectDayun(dayun) {
  const start = Number(dayun.start_year) || (Number(props.profile?.birth_year) && Number(dayun.start_age) ? Number(props.profile.birth_year) + Number(dayun.start_age) : null)
  if (Number.isFinite(start)) selectYear(start)
}

function isSelectedDayun(dayun) {
  const selected = Number(localSelectedYear.value)
  const start = Number(dayun.start_year)
  const end = Number(dayun.end_year) || (Number.isFinite(start) ? start + 9 : null)
  return Number.isFinite(selected) && Number.isFinite(start) && Number.isFinite(end) && selected >= start && selected <= end
}

function dayunHasWindow(dayun) {
  const start = Number(dayun.start_year)
  const end = Number(dayun.end_year) || (Number.isFinite(start) ? start + 9 : null)
  return windows.value.some((item) => Number(item.year) >= start && Number(item.year) <= end)
}

function dayunHasBestWindow(dayun) {
  if (!bestWindow.value) return false
  const start = Number(dayun.start_year)
  const end = Number(dayun.end_year) || (Number.isFinite(start) ? start + 9 : null)
  const year = Number(bestWindow.value.year)
  return Number.isFinite(year) && year >= start && year <= end
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
.pillar-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;
}
.pillar-card {
  position: relative;
  min-width: 0;
  padding: 12px 8px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  background: rgba(0,0,0,0.14);
  text-align: center;
}
.pillar-card.is-target {
  border-color: rgba(212,175,55,0.55);
  background: rgba(212,175,55,0.08);
}
.pillar-card.is-impacted {
  box-shadow: inset 0 0 0 1px rgba(255,154,86,0.35);
}
.pillar-card.is-kong {
  opacity: 0.72;
}
.pillar-name,
.pillar-star,
.hidden-stems {
  color: var(--text-muted);
  font-size: 11px;
}
.pillar-ganzhi {
  display: flex;
  justify-content: center;
  gap: 5px;
  margin: 8px 0 6px;
  color: #F0D98F;
  font-family: var(--font-serif);
  font-size: 26px;
  line-height: 1;
}
.pillar-ganzhi span {
  position: relative;
}
.pillar-ganzhi .is-target-star::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -5px;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: #FF9A56;
  transform: translateX(-50%);
}
.kong-mark {
  position: absolute;
  top: 7px;
  right: 7px;
  color: rgba(255,255,255,0.55);
  font-size: 10px;
}
.transit-grid {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}
.axis-title {
  margin-bottom: 8px;
  color: rgba(212,175,55,0.88);
  font-size: 13px;
}
.dayun-row,
.liunian-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
  gap: 7px;
}
.dayun-chip,
.liunian-chip {
  min-width: 0;
  min-height: 56px;
  padding: 8px 6px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  background: rgba(0,0,0,0.12);
  color: rgba(244,237,220,0.8);
  cursor: pointer;
}
.dayun-chip span,
.liunian-chip strong {
  display: block;
  color: #F0D98F;
  font-size: 15px;
}
.dayun-chip small,
.liunian-chip small,
.liunian-chip span {
  display: block;
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 10px;
}
.dayun-chip.active,
.liunian-chip.active {
  border-color: rgba(244,237,220,0.5);
  background: rgba(255,255,255,0.09);
}
.dayun-chip.marked,
.liunian-chip.quality-medium {
  border-color: rgba(212,175,55,0.32);
}
.dayun-chip.best,
.liunian-chip.quality-strong {
  border-color: rgba(78,205,196,0.42);
  background: rgba(78,205,196,0.06);
}
.liunian-chip.quality-weak {
  border-color: rgba(255,255,255,0.1);
}
.liunian-chip.major {
  box-shadow: inset 0 0 0 1px rgba(212,175,55,0.22);
}
@media (max-width: 640px) {
  .pillar-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
