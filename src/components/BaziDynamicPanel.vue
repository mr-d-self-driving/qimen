<template>
  <div class="dynamic-panel">

    <!-- ── 顶栏 ── -->
    <div class="panel-header">
      <span class="panel-eyebrow">动态触发</span>
    </div>

    <!-- ── 单大运：大运层（status 或 timing 单大运） ── -->
    <section v-if="mode === 'status' || !isMultiDayun" class="panel-section">
      <div class="section-label">大运建场</div>
      <div class="gz-card" :class="{ 'card-impaired': isImpaired(dayunImpact.gaitou_jiejiao) }">
        <div class="gz-card-head">
          <span class="gz-char" :class="elemClass(GAN5[dayunImpact.gan])">{{ dayunImpact.gan }}</span>
          <span class="gz-char" :class="elemClass(ZHI_WX[dayunImpact.zhi])">{{ dayunImpact.zhi }}</span>
          <span class="phase-chip">{{ dayunImpact.twelve_phase }}</span>
          <span v-if="dayunImpact.gaitou_jiejiao && dayunImpact.gaitou_jiejiao !== 'neutral' && dayunImpact.gaitou_jiejiao !== 'same'"
                class="gtj-chip" :class="gtjChipClass(dayunImpact.gaitou_jiejiao)">
            {{ gtjLabel(dayunImpact.gaitou_jiejiao) }}
          </span>
          <span v-if="dayunImpact.field_type" class="field-chip">{{ dayunImpact.field_type }}</span>
        </div>

        <p v-if="dayunImpact.gaitou_jiejiao_note" class="gz-note">{{ dayunImpact.gaitou_jiejiao_note }}</p>

        <div
          v-for="(mech, i) in visibleMechanisms(dayunImpact)"
          :key="i"
          class="mech-row"
          :class="mechRowClass(mech)"
        >
          <span class="mech-type">{{ mech.type }}</span>
          <span class="mech-desc">{{ mech.description }}</span>
          <span class="mech-eff" :class="mech.vigor_check.is_effective ? 'eff-yes' : 'eff-no'">
            {{ mech.vigor_check.is_effective ? '有效' : '潜伏' }}
          </span>
          <span
            v-for="t in mechTargets(mech)" :key="t.name"
            class="target-chip"
            :class="t.kind === 'gongwei' ? 'target-gongwei' : 'target-shishen'"
          >{{ t.name }}</span>
        </div>

        <div v-if="visibleMechanisms(dayunImpact).length === 0" class="mech-empty">大运未直接引动目标元素</div>

        <div class="vigor-track">
          <div class="vigor-fill" :class="vigorFillClass(dayunImpact.trigger_vigor)"
               :style="{ width: Math.round((dayunImpact.trigger_vigor ?? 0) * 100) + '%' }"></div>
        </div>
      </div>
    </section>

    <div v-if="mode === 'status' || !isMultiDayun" class="panel-divider"></div>

    <!-- ── 流年层: status 模式（当年单行） ── -->
    <section v-if="mode === 'status'" class="panel-section">
      <div class="section-label">流年触发</div>
      <div class="gz-card" :class="{ 'card-impaired': isImpaired(liunianImpact.gaitou_jiejiao) }">
        <div class="gz-card-head">
          <span class="gz-char" :class="elemClass(GAN5[liunianImpact.gan])">{{ liunianImpact.gan }}</span>
          <span class="gz-char" :class="elemClass(ZHI_WX[liunianImpact.zhi])">{{ liunianImpact.zhi }}</span>
          <span class="phase-chip">{{ liunianImpact.twelve_phase }}</span>
          <span v-if="liunianImpact.gaitou_jiejiao && liunianImpact.gaitou_jiejiao !== 'neutral' && liunianImpact.gaitou_jiejiao !== 'same'"
                class="gtj-chip" :class="gtjChipClass(liunianImpact.gaitou_jiejiao)">
            {{ gtjLabel(liunianImpact.gaitou_jiejiao) }}
          </span>
          <span v-if="dynamicReport.target_trigger?.is_activated" class="activated-chip">已引动</span>
        </div>

        <p v-if="liunianImpact.gaitou_jiejiao_note" class="gz-note">{{ liunianImpact.gaitou_jiejiao_note }}</p>

        <div
          v-for="(mech, i) in visibleMechanisms(liunianImpact)"
          :key="i"
          class="mech-row"
          :class="mechRowClass(mech)"
        >
          <span class="mech-type">{{ mech.type }}</span>
          <span class="mech-desc">{{ mech.description }}</span>
          <span class="mech-eff" :class="mech.vigor_check.is_effective ? 'eff-yes' : 'eff-no'">
            {{ mech.vigor_check.is_effective ? '有效' : '潜伏' }}
          </span>
          <span
            v-for="t in mechTargets(mech)" :key="t.name"
            class="target-chip"
            :class="t.kind === 'gongwei' ? 'target-gongwei' : 'target-shishen'"
          >{{ t.name }}</span>
        </div>

        <div v-if="visibleMechanisms(liunianImpact).length === 0" class="mech-empty">流年未直接引动目标元素</div>

        <div class="vigor-track">
          <div class="vigor-fill" :class="vigorFillClass(liunianImpact.trigger_vigor)"
               :style="{ width: Math.round((liunianImpact.trigger_vigor ?? 0) * 100) + '%' }"></div>
        </div>
      </div>
    </section>

    <!-- ── 流年层: timing 单大运（不轮播） ── -->
    <section v-if="mode === 'timing' && !isMultiDayun" class="panel-section">
      <div class="section-label">候选年运</div>
      <div class="year-list">
        <div
          v-for="tw in activeGroups[0].windows"
          :key="tw.year"
          class="year-entry"
          :class="{ 'year-best': tw.year === bestWindowYear }"
        >
          <div class="year-head" @click="toggleYear(tw.year)">
            <span class="year-num">{{ tw.year }}</span>
            <span class="gz-char gz-sm" :class="elemClass(GAN5[tw.dynamicReport.liunian_impact.gan])">
              {{ tw.dynamicReport.liunian_impact.gan }}
            </span>
            <span class="gz-char gz-sm" :class="elemClass(ZHI_WX[tw.dynamicReport.liunian_impact.zhi])">
              {{ tw.dynamicReport.liunian_impact.zhi }}
            </span>
            <span class="year-vigor" :class="vigorFillClass(topMechVigor(tw.dynamicReport))">
              {{ vigorLabelText(topMechVigor(tw.dynamicReport)) }}
            </span>
            <span v-if="tw.dynamicReport.target_trigger?.is_activated" class="activated-chip activated-sm">已引动</span>
            <span v-if="tw.year === bestWindowYear" class="best-badge">最强窗口</span>
            <span class="expand-icon">{{ expandedYears.has(tw.year) ? '▾' : '▸' }}</span>
          </div>
          <template v-if="expandedYears.has(tw.year)">
            <div
              v-for="(mech, i) in visibleMechanisms(tw.dynamicReport.liunian_impact)"
              :key="i"
              class="mech-row mech-row-indented"
              :class="mechRowClass(mech)"
            >
              <span class="mech-type">{{ mech.type }}</span>
              <span class="mech-desc">{{ mech.description }}</span>
              <span class="mech-eff" :class="mech.vigor_check.is_effective ? 'eff-yes' : 'eff-no'">
                {{ mech.vigor_check.is_effective ? '有效' : '潜伏' }}
              </span>
              <span
                v-for="t in mechTargets(mech)" :key="t.name"
                class="target-chip"
                :class="t.kind === 'gongwei' ? 'target-gongwei' : 'target-shishen'"
              >{{ t.name }}</span>
            </div>
            <p v-if="tw.verdict" class="year-verdict">{{ tw.verdict }}</p>
          </template>
        </div>
      </div>
    </section>

    <!-- ── 流年层: timing 多大运（水平轮播） ── -->
    <template v-if="mode === 'timing' && isMultiDayun">
      <div class="dayun-carousel" ref="carouselRef" @scroll.passive="onCarouselScroll">
        <div
          v-for="(group, gi) in activeGroups"
          :key="gi"
          class="carousel-slide"
        >
          <!-- 每页：大运建场卡 -->
          <div class="panel-section">
            <div class="section-label">
              大运建场
              <span v-if="group.label" class="dayun-label-badge">{{ group.label }}</span>
            </div>
            <div class="gz-card" :class="{ 'card-impaired': isImpaired(group.dayunImpact.gaitou_jiejiao) }">
              <div class="gz-card-head">
                <span class="gz-char" :class="elemClass(GAN5[group.dayunImpact.gan])">{{ group.dayunImpact.gan }}</span>
                <span class="gz-char" :class="elemClass(ZHI_WX[group.dayunImpact.zhi])">{{ group.dayunImpact.zhi }}</span>
                <span class="phase-chip">{{ group.dayunImpact.twelve_phase }}</span>
                <span v-if="group.dayunImpact.field_type" class="field-chip">{{ group.dayunImpact.field_type }}</span>
              </div>
              <div
                v-for="(mech, i) in visibleMechanisms(group.dayunImpact)"
                :key="i"
                class="mech-row"
                :class="mechRowClass(mech)"
              >
                <span class="mech-type">{{ mech.type }}</span>
                <span class="mech-desc">{{ mech.description }}</span>
                <span class="mech-eff" :class="mech.vigor_check.is_effective ? 'eff-yes' : 'eff-no'">
                  {{ mech.vigor_check.is_effective ? '有效' : '潜伏' }}
                </span>
                <span
                  v-for="t in mechTargets(mech)" :key="t.name"
                  class="target-chip"
                  :class="t.kind === 'gongwei' ? 'target-gongwei' : 'target-shishen'"
                >{{ t.name }}</span>
              </div>
              <div class="vigor-track">
                <div class="vigor-fill" :class="vigorFillClass(group.dayunImpact.trigger_vigor)"
                     :style="{ width: Math.round((group.dayunImpact.trigger_vigor ?? 0) * 100) + '%' }"></div>
              </div>
            </div>
          </div>

          <div class="panel-divider"></div>

          <!-- 每页：该大运内候选年 -->
          <div class="panel-section">
            <div class="section-label">候选年运</div>
            <div class="year-list">
              <div
                v-for="tw in group.windows"
                :key="tw.year"
                class="year-entry"
                :class="{ 'year-best': tw.year === bestWindowYear }"
              >
                <div class="year-head" @click="toggleYear(tw.year)">
                  <span class="year-num">{{ tw.year }}</span>
                  <span class="gz-char gz-sm" :class="elemClass(GAN5[tw.dynamicReport.liunian_impact.gan])">
                    {{ tw.dynamicReport.liunian_impact.gan }}
                  </span>
                  <span class="gz-char gz-sm" :class="elemClass(ZHI_WX[tw.dynamicReport.liunian_impact.zhi])">
                    {{ tw.dynamicReport.liunian_impact.zhi }}
                  </span>
                  <span class="year-vigor" :class="vigorFillClass(topMechVigor(tw.dynamicReport))">
                    {{ vigorLabelText(topMechVigor(tw.dynamicReport)) }}
                  </span>
                  <span v-if="tw.dynamicReport.target_trigger?.is_activated" class="activated-chip activated-sm">已引动</span>
                  <span v-if="tw.year === bestWindowYear" class="best-badge">最强窗口</span>
                  <span class="expand-icon">{{ expandedYears.has(tw.year) ? '▾' : '▸' }}</span>
                </div>
                <template v-if="expandedYears.has(tw.year)">
                  <div
                    v-for="(mech, i) in visibleMechanisms(tw.dynamicReport.liunian_impact)"
                    :key="i"
                    class="mech-row mech-row-indented"
                    :class="mechRowClass(mech)"
                  >
                    <span class="mech-type">{{ mech.type }}</span>
                    <span class="mech-desc">{{ mech.description }}</span>
                    <span class="mech-eff" :class="mech.vigor_check.is_effective ? 'eff-yes' : 'eff-no'">
                      {{ mech.vigor_check.is_effective ? '有效' : '潜伏' }}
                    </span>
                    <span
                      v-for="t in mechTargets(mech)" :key="t.name"
                      class="target-chip"
                      :class="t.kind === 'gongwei' ? 'target-gongwei' : 'target-shishen'"
                    >{{ t.name }}</span>
                  </div>
                  <p v-if="tw.verdict" class="year-verdict">{{ tw.verdict }}</p>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 点点导航 -->
      <div class="carousel-dots">
        <span
          v-for="(group, gi) in activeGroups"
          :key="gi"
          class="carousel-dot"
          :class="{ 'dot-active': currentSlide === gi }"
          @click="scrollToSlide(gi)"
        ></span>
      </div>
    </template>

    <div class="panel-divider"></div>

    <!-- ── 目标状态变化 ── -->
    <div class="target-trigger-row" :class="`tt-${targetTrigger.new_stability}`">
      <div class="tt-state-flow">
        <span class="tt-base">{{ targetTrigger.base_state }}</span>
        <span class="tt-arrow">→</span>
        <span class="tt-new">{{ targetTrigger.state_change }}</span>
      </div>
      <span v-if="targetTrigger.auspice_direction" class="auspice-badge" :class="auspiceClass(targetTrigger.auspice_direction)">
        {{ targetTrigger.auspice_direction }}
      </span>
    </div>

    <div v-if="avoidWindowText" class="avoid-note avoid-note-standalone">
      <span class="avoid-label">规避</span>
      <span class="avoid-text">{{ avoidWindowText }}</span>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  mode:            { type: String, required: true },  // 'status' | 'timing'
  dynamicReport:   { type: Object, default: null },   // status 模式的完整 report
  triggerWindows:  { type: Array,  default: () => [] }, // timing 单大运：[{year, dynamicReport, verdict?}]
  bestWindowYear:  { type: Number, default: null },
  avoidWindowText: { type: String, default: '' },
  // 目标映射表，父组件预计算传入，用于 mech 行显示命中的十神/宫位名称
  // 格式：{ [柱名]: Array<{ kind: 'shishen' | 'gongwei', name: string }> }
  targetMap: { type: Object, default: () => ({}) },
  // 跨大运 timing 模式：[{ dayunImpact, label?, windows: [{year, dynamicReport, verdict?}] }]
  // 提供时自动启用水平轮播（多大运）；未提供时降级为 triggerWindows 单大运模式
  dayunGroups: { type: Array, default: () => [] },
})

const GAN5   = { 甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水' }
const ZHI_WX = { 子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水' }

const ELEM_CLASS = { 木:'el-mu', 火:'el-huo', 土:'el-tu', 金:'el-jin', 水:'el-shui' }
function elemClass(wx) { return ELEM_CLASS[wx] ?? '' }

function vigorFillClass(v) {
  if (!v || v < 0.2) return 'vf-weak'
  if (v < 0.5)       return 'vf-mid'
  return 'vf-strong'
}

function vigorLabelText(v) {
  if (!v || v < 0.2) return '极弱'
  if (v < 0.35)      return '偏弱'
  if (v < 0.5)       return '力弱'
  if (v < 0.75)      return '力中'
  return '力旺'
}

function isImpaired(gtj) { return gtj === 'gaitou' || gtj === 'jiejiao' }

function gtjLabel(gtj) {
  if (gtj === 'gaitou')  return '盖头'
  if (gtj === 'jiejiao') return '截脚'
  return gtj ?? ''
}

function gtjChipClass(gtj) {
  return isImpaired(gtj) ? 'gtj-bad' : ''
}

function mechRowClass(mech) {
  if (!mech.vigor_check?.is_effective) return 'mech-latent'
  const type = mech.type ?? ''
  if (type === '冲动' || type === '反吟' || type === '填实三刑') return 'mech-bad'
  if (type === '合化' || type === '合动' || type === '填实三合') return 'mech-good'
  return ''
}

function visibleMechanisms(impact) {
  const seen = new Set()
  return (impact?.mechanisms ?? []).filter(mech => {
    const key = `${mech?.type ?? ''}|${mech?.description ?? ''}|${mech?.vigor_check?.is_effective ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// 返回该 mech 命中的目标列表（从 targetMap 查找）
// 结果：Array<{ kind: 'shishen'|'gongwei', name: string }>
function mechTargets(mech) {
  return props.targetMap[mech.target_pillar] ?? []
}

function auspiceClass(dir) {
  if (!dir) return ''
  if (dir.includes('利') || dir.includes('吉')) return 'auspice-ji'
  if (dir.includes('不利') || dir.includes('凶')) return 'auspice-xiong'
  return 'auspice-neutral'
}

function topMechVigor(dr) {
  const mechs = dr?.liunian_impact?.mechanisms ?? []
  if (!mechs.length) return 0
  return Math.max(...mechs.map(m => m.effective_strength ?? 0))
}

// ── 展开/折叠状态（timing 模式） ──
const expandedYears = ref(new Set(props.bestWindowYear != null ? [props.bestWindowYear] : []))

watch(() => props.bestWindowYear, (y) => {
  if (y != null) expandedYears.value = new Set([y])
})

function toggleYear(year) {
  const s = new Set(expandedYears.value)
  if (s.has(year)) s.delete(year)
  else s.add(year)
  expandedYears.value = s
}

// ── 多大运轮播 ──
// activeGroups：统一数据源，无论单大运还是多大运
const activeGroups = computed(() => {
  if (props.dayunGroups?.length) return props.dayunGroups
  // 降级：把 triggerWindows 包成单组
  return [{
    dayunImpact: props.triggerWindows[0]?.dynamicReport?.dayun_impact ?? {},
    label: null,
    windows: props.triggerWindows,
  }]
})

const isMultiDayun = computed(() => activeGroups.value.length > 1)

const carouselRef = ref(null)
const currentSlide = ref(0)

function onCarouselScroll(e) {
  const el = e.target
  if (!el.clientWidth) return
  currentSlide.value = Math.round(el.scrollLeft / el.clientWidth)
}

function scrollToSlide(i) {
  if (!carouselRef.value) return
  carouselRef.value.scrollTo({ left: i * carouselRef.value.clientWidth, behavior: 'smooth' })
}

// ── 数据衍生 ──
const dayunImpact = computed(() => {
  if (props.mode === 'status') return props.dynamicReport?.dayun_impact ?? {}
  // timing 单大运：从 activeGroups[0] 取
  return activeGroups.value[0]?.dayunImpact ?? {}
})

const liunianImpact = computed(() => props.dynamicReport?.liunian_impact ?? {})

// 所有候选年（跨多大运展平，用于查找 bestWindowYear）
const allWindows = computed(() =>
  activeGroups.value.flatMap(g => g.windows ?? [])
)

const targetTrigger = computed(() => {
  if (props.mode === 'timing' && props.bestWindowYear != null) {
    const best = allWindows.value.find(tw => tw.year === props.bestWindowYear)
    return best?.dynamicReport?.target_trigger || {}
  }
  return props.dynamicReport?.target_trigger || {}
})

</script>

<style scoped>
/* ── 容器 ─────────────────────────────────────────────────── */
.dynamic-panel {
  background: var(--bg-card);
  border: 1px solid rgba(181,141,59,0.22);
  border-radius: var(--radius-card);
  padding: 0;
  overflow: hidden;
  font-family: var(--font-serif);
  box-shadow: 0 2px 16px rgba(0,0,0,0.08);
}

[data-theme="dark"] .dynamic-panel {
  border-color: rgba(212,175,55,0.35);
  box-shadow: 0 4px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.12);
}

/* ── 顶栏 ─────────────────────────────────────────────────── */
.panel-header {
  padding: 12px 16px 10px;
  border-bottom: 1px solid rgba(181,141,59,0.12);
}

[data-theme="dark"] .panel-header {
  border-bottom-color: rgba(212,175,55,0.2);
}

.panel-eyebrow {
  font-size: 10px;
  letter-spacing: .22em;
  color: var(--text-muted);
  display: block;
}

/* ── Section ─────────────────────────────────────────────── */
.panel-section {
  padding: 12px 16px;
}

.section-label {
  font-size: 10px;
  letter-spacing: .18em;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.panel-divider {
  height: 1px;
  background: rgba(181,141,59,0.12);
  margin: 0;
}

[data-theme="dark"] .panel-divider {
  background: rgba(212,175,55,0.2);
}

/* ── gz-card（大运/流年卡片） ───────────────────────────── */
.gz-card {
  background: rgba(181,141,59,0.04);
  border: 1px solid rgba(181,141,59,0.15);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

[data-theme="dark"] .gz-card {
  background: rgba(212,175,55,0.06);
  border-color: rgba(212,175,55,0.22);
}

.gz-card.card-impaired {
  border-color: rgba(156,100,50,0.35);
  background: rgba(156,100,50,0.05);
}

[data-theme="dark"] .gz-card.card-impaired {
  border-color: rgba(200,130,60,0.4);
  background: rgba(200,130,60,0.07);
}

.gz-card-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.gz-char {
  font-family: var(--font-ganzhi);
  font-size: 26px;
  font-weight: 750;
  line-height: 1;
}

.gz-sm {
  font-size: 20px;
}

/* 五行颜色 */
.el-mu  { color: #22863a; }
.el-huo { color: #c0392b; }
.el-tu  { color: #8B6914; }
.el-jin { color: #6b7280; }
.el-shui{ color: #1d6fa4; }

[data-theme="dark"] .el-mu  { color: #6abe78; }
[data-theme="dark"] .el-huo { color: #f87171; }
[data-theme="dark"] .el-tu  { color: #d4a017; }
[data-theme="dark"] .el-jin { color: #b0b8c4; }
[data-theme="dark"] .el-shui{ color: #60a5fa; }

/* ── chips ────────────────────────────────────────────────── */
.phase-chip {
  font-size: 10.5px;
  color: var(--text-muted);
  background: var(--gold-dim, rgba(181,141,59,0.08));
  border: 1px solid var(--gold-border, rgba(181,141,59,0.2));
  border-radius: 5px;
  padding: 2px 7px;
  letter-spacing: .04em;
  white-space: nowrap;
}

.field-chip {
  font-size: 10px;
  color: var(--text-muted);
  background: rgba(120,80,200,0.08);
  border: 1px solid rgba(120,80,200,0.2);
  border-radius: 5px;
  padding: 2px 8px;
  letter-spacing: .04em;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

[data-theme="dark"] .field-chip {
  background: rgba(160,120,240,0.12);
  border-color: rgba(160,120,240,0.25);
  color: #c4b5fd;
}

.gtj-chip {
  font-size: 10px;
  border-radius: 5px;
  padding: 2px 7px;
  letter-spacing: .04em;
  white-space: nowrap;
}

.gtj-bad {
  background: rgba(180,60,60,0.08);
  border: 1px solid rgba(180,60,60,0.25);
  color: #b91c1c;
}

[data-theme="dark"] .gtj-bad {
  background: rgba(240,100,100,0.1);
  border-color: rgba(240,100,100,0.3);
  color: #fca5a5;
}

.activated-chip {
  font-size: 10px;
  background: rgba(34,197,94,0.1);
  border: 1px solid rgba(34,197,94,0.3);
  color: #15803d;
  border-radius: 5px;
  padding: 2px 7px;
  letter-spacing: .04em;
  white-space: nowrap;
}

[data-theme="dark"] .activated-chip {
  background: rgba(74,222,128,0.12);
  border-color: rgba(74,222,128,0.3);
  color: #4ade80;
}

.activated-sm { font-size: 9.5px; }

/* ── gz-note ──────────────────────────────────────────────── */
.gz-note {
  font-size: 11.5px;
  color: var(--ink-muted, var(--text-muted));
  margin: 0;
  padding: 4px 8px;
  background: rgba(181,141,59,0.05);
  border-left: 2px solid rgba(181,141,59,0.3);
  border-radius: 0 4px 4px 0;
  line-height: 1.5;
}

/* ── mech 行 ─────────────────────────────────────────────── */
.mech-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 11.5px;
  line-height: 1.45;
  padding: 3px 0;
  border-top: 1px solid rgba(181,141,59,0.08);
}

.mech-row-indented {
  padding-left: 8px;
}

.mech-type {
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 10.5px;
  letter-spacing: .04em;
}

.mech-desc {
  flex: 1;
  color: var(--ink-muted, var(--text-muted));
  min-width: 0;
}

.mech-eff {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .06em;
  white-space: nowrap;
  flex-shrink: 0;
}

.eff-yes { color: #15803d; }
.eff-no  { color: var(--text-muted); opacity: .7; }

[data-theme="dark"] .eff-yes { color: #4ade80; }

.mech-latent { opacity: .6; }

.mech-bad .mech-type { color: #b91c1c; }
[data-theme="dark"] .mech-bad .mech-type { color: #f87171; }

.mech-good .mech-type { color: #15803d; }
[data-theme="dark"] .mech-good .mech-type { color: #4ade80; }

/* ── 多大运水平轮播 ──────────────────────────────────────── */
.dayun-carousel {
  display: flex;
  overflow-x: scroll;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.dayun-carousel::-webkit-scrollbar { display: none; }

.carousel-slide {
  flex: 0 0 100%;
  scroll-snap-align: start;
  min-width: 0;
}

/* 点点导航 */
.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 10px 0 8px;
  border-top: 1px solid rgba(181,141,59,0.1);
}

[data-theme="dark"] .carousel-dots {
  border-top-color: rgba(212,175,55,0.15);
}

.carousel-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(181,141,59,0.25);
  cursor: pointer;
  transition: all .2s ease;
  flex-shrink: 0;
}

.carousel-dot:hover { background: rgba(181,141,59,0.5); }

.carousel-dot.dot-active {
  background: var(--gold, #b5893b);
  width: 18px;
  border-radius: 3px;
}

[data-theme="dark"] .carousel-dot { background: rgba(212,175,55,0.2); }
[data-theme="dark"] .carousel-dot.dot-active { background: #fbbf24; }

/* 大运轮播页内的 label */
.dayun-label-badge {
  font-size: 9.5px;
  letter-spacing: .08em;
  color: var(--text-muted);
  background: var(--gold-dim, rgba(181,141,59,0.08));
  border: 1px solid var(--gold-border, rgba(181,141,59,0.2));
  border-radius: 5px;
  padding: 1px 7px;
  margin-left: 8px;
  font-weight: 400;
}

/* 目标十神 / 宫位 映射标签（与 StaticPanel 卡片一一对应） */
.target-chip {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .04em;
  border-radius: 4px;
  padding: 1px 6px;
  white-space: nowrap;
  flex-shrink: 0;
}

.target-shishen {
  background: rgba(181,141,59,0.1);
  border: 1px solid rgba(181,141,59,0.28);
  color: var(--gold, #b5893b);
}

.target-gongwei {
  background: rgba(120,80,200,0.08);
  border: 1px solid rgba(120,80,200,0.25);
  color: #7c3aed;
}

[data-theme="dark"] .target-shishen {
  background: rgba(212,175,55,0.12);
  border-color: rgba(212,175,55,0.3);
  color: #fbbf24;
}

[data-theme="dark"] .target-gongwei {
  background: rgba(160,120,240,0.12);
  border-color: rgba(160,120,240,0.3);
  color: #a78bfa;
}

.mech-empty {
  font-size: 11px;
  color: var(--text-muted);
  opacity: .7;
  text-align: center;
  padding: 4px 0;
}

/* ── vigor 条 ────────────────────────────────────────────── */
.vigor-track {
  height: 3px;
  background: rgba(181,141,59,0.12);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 2px;
}

.vigor-fill {
  height: 100%;
  border-radius: 2px;
  transition: width .3s ease;
}

.vf-weak   { background: rgba(156,163,175,0.7); }
.vf-mid    { background: rgba(212,175,55,0.8); }
.vf-strong { background: rgba(181,141,59,1); }

[data-theme="dark"] .vf-weak   { background: rgba(156,163,175,0.5); }
[data-theme="dark"] .vf-mid    { background: rgba(212,175,55,0.7); }
[data-theme="dark"] .vf-strong { background: rgba(251,211,82,0.9); }

/* ── timing 年份列表 ─────────────────────────────────────── */
.year-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.year-entry {
  border: 1px solid rgba(181,141,59,0.15);
  border-radius: 7px;
  overflow: hidden;
}

[data-theme="dark"] .year-entry {
  border-color: rgba(212,175,55,0.2);
}

.year-entry.year-best {
  border-color: rgba(181,141,59,0.45);
  box-shadow: 0 0 0 1px rgba(181,141,59,0.15);
}

[data-theme="dark"] .year-entry.year-best {
  border-color: rgba(212,175,55,0.55);
}

.year-head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
  background: rgba(181,141,59,0.03);
  transition: background .15s;
}

.year-head:hover { background: rgba(181,141,59,0.07); }

[data-theme="dark"] .year-head { background: rgba(212,175,55,0.04); }
[data-theme="dark"] .year-head:hover { background: rgba(212,175,55,0.09); }

.year-num {
  font-size: 13px;
  font-weight: 700;
  color: var(--gold, #b5893b);
  min-width: 36px;
  letter-spacing: .02em;
}

.year-vigor {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .05em;
  margin-left: 2px;
}

.best-badge {
  font-size: 9.5px;
  background: rgba(181,141,59,0.15);
  border: 1px solid rgba(181,141,59,0.4);
  color: var(--gold, #b5893b);
  border-radius: 5px;
  padding: 1px 6px;
  letter-spacing: .04em;
  white-space: nowrap;
}

[data-theme="dark"] .best-badge {
  background: rgba(212,175,55,0.15);
  border-color: rgba(212,175,55,0.4);
  color: #fbbf24;
}

.expand-icon {
  font-size: 11px;
  color: var(--text-muted);
  margin-left: auto;
}

.year-verdict {
  font-size: 12px;
  color: var(--ink-muted, var(--text-muted));
  line-height: 1.6;
  margin: 0;
  padding: 8px 12px;
  border-top: 1px solid rgba(181,141,59,0.1);
  background: rgba(181,141,59,0.02);
}

/* ── 目标状态变化行 ──────────────────────────────────────── */
.target-trigger-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  padding: 10px 16px;
  background: rgba(181,141,59,0.03);
}

.tt-state-flow {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
  flex-wrap: wrap;
}

.tt-base {
  color: var(--text-muted);
  white-space: normal;
  overflow-wrap: anywhere;
  flex-shrink: 1;
}
.tt-arrow { color: var(--gold, #b5893b); font-size: 13px; flex-shrink: 0; }
.tt-new   { font-weight: 600; color: var(--ink-main, inherit); flex: 1; min-width: 0; }

/* 状态着色 */
.tt-strong  .tt-new { color: #15803d; }
.tt-stable  .tt-new { color: #1d6fa4; }
.tt-dynamic .tt-new { color: #d97706; }
.tt-buried  .tt-new { color: #6b7280; }
.tt-damaged .tt-new { color: #b91c1c; }

[data-theme="dark"] .tt-strong  .tt-new { color: #4ade80; }
[data-theme="dark"] .tt-stable  .tt-new { color: #60a5fa; }
[data-theme="dark"] .tt-dynamic .tt-new { color: #fbbf24; }
[data-theme="dark"] .tt-buried  .tt-new { color: #9ca3af; }
[data-theme="dark"] .tt-damaged .tt-new { color: #f87171; }

.auspice-badge {
  align-self: stretch;
  font-size: 10px;
  font-weight: 600;
  border-radius: 5px;
  padding: 2px 8px;
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.5;
  letter-spacing: .04em;
}

.auspice-ji {
  background: rgba(34,197,94,0.1);
  border: 1px solid rgba(34,197,94,0.3);
  color: #15803d;
}

.auspice-xiong {
  background: rgba(180,60,60,0.08);
  border: 1px solid rgba(180,60,60,0.25);
  color: #b91c1c;
}

.auspice-neutral {
  background: rgba(181,141,59,0.08);
  border: 1px solid rgba(181,141,59,0.2);
  color: var(--gold, #b5893b);
}

[data-theme="dark"] .auspice-ji    { background: rgba(74,222,128,0.1); border-color: rgba(74,222,128,0.25); color: #4ade80; }
[data-theme="dark"] .auspice-xiong { background: rgba(240,100,100,0.1); border-color: rgba(240,100,100,0.25); color: #f87171; }
[data-theme="dark"] .auspice-neutral { color: #fbbf24; }

.avoid-note {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 10px;
}

.avoid-note-standalone {
  margin: 0 16px 14px;
}

.avoid-label {
  font-size: 9.5px;
  letter-spacing: .12em;
  background: rgba(180,60,60,0.08);
  border: 1px solid rgba(180,60,60,0.2);
  color: #b91c1c;
  border-radius: 4px;
  padding: 1px 6px;
  flex-shrink: 0;
}

[data-theme="dark"] .avoid-label {
  background: rgba(240,100,100,0.1);
  border-color: rgba(240,100,100,0.25);
  color: #fca5a5;
}

.avoid-text {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}
</style>
