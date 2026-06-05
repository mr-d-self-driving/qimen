<template>
  <div class="static-panel">

    <!-- ── 命盘标识行 ── -->
    <div v-if="profileInfo?.name || profileInfo?.gender || profileInfo?.birthDate" class="profile-identity">
      <span v-if="profileInfo.name" class="pid-name">{{ profileInfo.name }}</span>
      <span v-if="profileInfo.gender" class="pid-sep">·</span>
      <span v-if="profileInfo.gender" class="pid-gender">{{ profileInfo.gender === 'M' ? '男' : '女' }}</span>
      <span v-if="profileInfo.birthDate" class="pid-sep">·</span>
      <span v-if="profileInfo.birthDate" class="pid-date">{{ profileInfo.birthDate }}</span>
    </div>

    <!-- ── 四柱牌面 ── -->
    <div v-if="matrix?.pillars?.length" class="pillar-grid">
      <div
        v-for="col in matrix.pillars" :key="col.name"
        class="pillar-col"
        :class="{
          'pillar-riZhu': col.name === '日',
          'pillar-highlighted': highlightedPillar === col.name
        }"
      >
        <span class="pillar-name">{{ col.name }}柱<span v-if="col.name === '日'">（命主）</span></span>

        <!-- 天干十神占位（保持所有列等高对齐） -->
        <span
          class="pillar-shishen"
          :class="col.name !== '日' ? shenClass(ganShishen(col.gan)) : ''"
          :style="col.name === '日' || !ganShishen(col.gan) ? 'visibility:hidden' : ''"
        >{{ col.name !== '日' && ganShishen(col.gan) ? ganShishen(col.gan) : '比' }}</span>

        <span class="pillar-gan" :class="elemClass(GAN5[col.gan])">{{ col.gan }}</span>
        <span class="pillar-zhi" :class="elemClass(ZHI_WX[col.zhi])">{{ col.zhi }}</span>

        <span class="pillar-wx">
          <em :class="elemClass(GAN5[col.gan])">{{ GAN5[col.gan] }}</em><em :class="elemClass(ZHI_WX[col.zhi])">{{ ZHI_WX[col.zhi] }}</em>
        </span>

        <!-- 藏干十神 -->
        <span v-if="col.hidden_stems?.length" class="pillar-hidden">
          <em
            v-for="hs in col.hidden_stems" :key="hs"
            class="hs-item"
            :class="shenClass(getShishen(dayStem, hs))"
          >{{ getShishen(dayStem, hs) }}</em>
        </span>

        <span v-if="col.is_kong" class="pillar-kong">空亡</span>
      </div>
    </div>

    <!-- ── 顶栏 ── -->
    <div class="panel-header">
      <span class="panel-eyebrow">原局底盘</span>
    </div>

    <!-- ── 格局 / 形象 / 调候 结构行 ── -->
    <div class="meta-block">
      <!-- 格局 -->
      <div v-if="stateReport.geju" class="meta-row">
        <span class="meta-label">格局</span>
        <div class="meta-body">
          <span class="meta-value">{{ stateReport.geju }}</span>
          <div v-for="c in triggeredChecks" :key="c.check" class="meta-check">
            <span class="meta-check-bullet">▸</span>
            <span>{{ c.check }}</span>
          </div>
        </div>
      </div>
      <!-- 形象（从格/专旺/化气） -->
      <div v-if="stateReport.image_context" class="meta-row image-row">
        <span class="meta-label">形象</span>
        <div class="meta-body">
          <div class="image-main">
            <span class="image-subtype">{{ stateReport.image_context.subtype }}</span>
            <span class="image-score-chip" :class="imageLevelClass(stateReport.image_context.match_level)">
              {{ stateReport.image_context.match_label }}
              <em>{{ Math.round(stateReport.image_context.match_score) }}%</em>
            </span>
            <span v-if="stateReport.image_context.override_normal_pattern" class="image-override-chip">覆盖常规喜忌</span>
          </div>
          <!-- 次级候选（有 override 时显示原始候选） -->
          <div v-if="stateReport.image_display_context && stateReport.image_display_context.subtype !== stateReport.image_context.subtype" class="image-secondary">
            <span class="image-sec-label">原始候选</span>
            <span class="image-sec-text">{{ stateReport.image_display_context.subtype }}（{{ Math.round(stateReport.image_display_context.match_score) }}%）</span>
          </div>
        </div>
      </div>
      <!-- 调候 -->
      <div v-if="stateReport.tiaohou" class="meta-row">
        <span class="meta-label">调候</span>
        <span class="meta-value">{{ stateReport.tiaohou }}</span>
      </div>
    </div>

    <div class="panel-divider"></div>

    <!-- ── 目标十神 / 用神锚点 ── -->
    <section class="panel-section">
      <div class="section-label">{{ isYongshenAnchor ? '用神 / 忌神（综合运势锚点）' : '目标十神' }}</div>

      <!-- 理论说明行（结构：以XX为目标十神 / 以用神X为锚点） -->
      <p v-if="shishenTheory" class="theory-note">{{ shishenTheory }}</p>

      <!-- 取法依据（analysis_question） -->
      <p v-if="analysisRationale" class="theory-rationale">{{ analysisRationale }}</p>

      <!-- 与用神关系（yongshen 锚定时目标即用神，同义反复，隐藏） -->
      <p v-if="yongshenRelation && !isYongshenAnchor" class="yong-relation" :class="yongshenRelationClass">{{ yongshenRelation }}</p>

      <!-- 找到的十神 card -->
      <div
        v-for="(sa, i) in stateReport.shishen_assessments"
        :key="i"
        class="analysis-card"
        :class="{ 'card-weak': sa.vigor < 0.2, 'card-active': highlightedPillar === sa.pillar }"
        @click="highlightedPillar = highlightedPillar === sa.pillar ? null : sa.pillar"
        style="cursor:pointer"
      >
        <!-- 头行：十神名 + 干支 + 柱位 + 空亡 -->
        <div class="card-head">
          <span class="shishen-name" :class="elemClass(sa.element)">{{ sa.shishen }}</span>
          <!-- 天干位置：干支是一对（如庚申）；藏干/地支主气：只显示干，地支在chip里说明 -->
          <span class="card-ganzhi" :class="elemClass(sa.element)">
            {{ sa.position === 'gan' ? sa.gan + sa.zhi : sa.gan }}
          </span>
          <span class="card-chip">
            {{ sa.pillar }}柱 · {{ posLabel(sa.position) }}{{ sa.position !== 'gan' ? '（' + sa.zhi + '中）' : '' }}
          </span>
          <span v-if="sa.is_kong" class="kong-chip">空亡</span>
        </div>

        <!-- 机制分行 -->
        <div
          v-for="(line, li) in buildMechanismLines(sa)"
          :key="li"
          class="mline"
          :class="`mline-${line.severity}`"
        >
          <div class="mline-header">
            <span class="mline-category">{{ line.category }}</span>
            <template v-if="line.isVigor">
              <span class="mline-phase" :class="vigorFillClass(line.vigor)">{{ line.phase }}</span>
              <div class="mline-bar-track">
                <div class="mline-bar-fill" :class="vigorFillClass(line.vigor)" :style="{ width: Math.round(line.vigor * 100) + '%' }"></div>
              </div>
            </template>
          </div>
          <p class="mline-text">{{ line.text }}</p>
        </div>
      </div>

      <!-- 查找范围内未见于命局的十神 -->
      <div v-for="name in missingShishen" :key="name" class="absent-row">
        <span class="absent-name">{{ name }}</span>
        <span class="absent-msg">未见于命局（{{ shishenWuxing(name) }}不在任何柱）</span>
      </div>
    </section>

    <template v-if="stateReport.gongwei_assessments?.length">
    <div class="panel-divider"></div>

    <!-- ── 目标宫位 ── -->
    <section class="panel-section">
      <div class="section-label">目标宫位</div>

      <!-- 理论说明行 -->
      <p v-if="gongweiTheory" class="theory-note">{{ gongweiTheory }}</p>

      <div
        v-for="(ga, i) in stateReport.gongwei_assessments"
        :key="i"
        class="analysis-card"
        :class="{ 'card-active': highlightedPillar === ga.pillar_name }"
        @click="highlightedPillar = highlightedPillar === ga.pillar_name ? null : ga.pillar_name"
        style="cursor:pointer"
      >
        <!-- 头行：宫位 + 地支 + 坐十神 + 空亡/星宫得正 -->
        <div class="card-head">
          <span class="gongwei-label">{{ ga.gongwei }}</span>
          <span class="card-ganzhi" :class="elemClass(ga.element)">{{ ga.zhi }}</span>
          <span class="seat-info">坐 <em class="seat-shen" :class="shenClass(ga.seat_shishen)">{{ ga.seat_shishen || '—' }}</em></span>
          <span v-if="ga.is_kong" class="kong-chip">空亡</span>
          <span v-if="ga.is_correct_star" class="correct-star-chip">星宫得正</span>
        </div>

        <!-- 机制分行 -->
        <div
          v-for="(line, li) in buildGongweiLines(ga)"
          :key="li"
          class="mline"
          :class="`mline-${line.severity}`"
        >
          <div class="mline-header">
            <span class="mline-category">{{ line.category }}</span>
            <template v-if="line.isVigor">
              <span class="mline-phase" :class="vigorFillClass(line.vigor)">{{ line.phase }}</span>
              <div class="mline-bar-track">
                <div class="mline-bar-fill" :class="vigorFillClass(line.vigor)" :style="{ width: Math.round(line.vigor * 100) + '%' }"></div>
              </div>
            </template>
          </div>
          <p class="mline-text">{{ line.text }}</p>
        </div>
      </div>
    </section>
    </template>

    <!-- ── 整体稳定性结论 ── -->
    <div class="panel-divider"></div>
    <div class="stability-footer" :class="`stab-footer-${stateReport.overall_stability}`">
      <div class="stab-footer-head">
        <span class="stab-footer-dot"></span>
        <span class="stab-footer-label">{{ stateReport.stability_label }}</span>
        <span class="stab-footer-badge">整体稳定性</span>
      </div>
      <p class="stab-footer-text">{{ stabilityConclusion }}</p>
    </div>

  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const highlightedPillar = ref(null)

const props = defineProps({
  stateReport:   { type: Object, required: true },
  targetSpec:    { type: Object, required: true },
  matrix:        { type: Object, default: null },
  shishenTheory: { type: String, default: '' },
  gongweiTheory: { type: String, default: '' },
  anchorKind:    { type: String, default: '' },    // 'yongshen' ⇒ 目标即命主用神/忌神
  profileInfo:   { type: Object, default: null },  // { name, gender, birthDate }
  fiveShens:     { type: Object, default: null },  // bazi_detail.five_shens
})

const isYongshenAnchor = computed(() => props.anchorKind === 'yongshen')

const GAN5   = { 甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水' }
const ZHI_WX = { 子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水' }

const GAN_YANG = new Set(['甲','丙','戊','庚','壬'])
const WX_SHENG = { 木:'火', 火:'土', 土:'金', 金:'水', 水:'木' }
const WX_KE    = { 木:'土', 火:'金', 土:'水', 金:'木', 水:'火' }

function getShishen(day, gan) {
  if (!day || !gan) return ''
  const dw = GAN5[day], gw = GAN5[gan]
  const same = GAN_YANG.has(day) === GAN_YANG.has(gan)
  if (gw === dw)             return same ? '比' : '劫'
  if (WX_SHENG[dw] === gw)  return same ? '食' : '伤'
  if (WX_SHENG[gw] === dw)  return same ? '枭' : '印'
  if (WX_KE[dw]    === gw)  return same ? '才' : '财'
  if (WX_KE[gw]    === dw)  return same ? '杀' : '官'
  return ''
}

const dayStem = computed(() =>
  props.matrix?.pillars?.find(p => p.name === '日')?.gan ?? ''
)

function ganShishen(gan) { return getShishen(dayStem.value, gan) }

// 全称 → 短形映射（与 baziStateAssessor normalizeShishens 一致）
const FULL_TO_SHORT = {
  正官:'官', 七杀:'杀', 正财:'财', 偏财:'才',
  正印:'印', 偏印:'枭', 食神:'食', 伤官:'伤',
  比肩:'比', 劫财:'劫',
}
// 十神全称 → 五行（用于"未见于命局"说明）
const SHISHEN_TO_WX = {
  正官:'木', 七杀:'木', 正财:'水', 偏财:'水',
  正印:'火', 偏印:'火', 食神:'金', 伤官:'金',
  比肩:'土', 劫财:'土',
}

// 目标十神取法说明（来自 targetSpec.analysis_question）
const analysisRationale = computed(() => props.targetSpec?.analysis_question || '')

const yongshenRelationClass = computed(() => {
  const fs = props.fiveShens
  if (!fs?.yong) return ''
  const primary = props.targetSpec?.primary_shishen || []
  const favorable = new Set([fs.yong, ...(fs.xi || [])])
  const unfavorable = new Set([...(fs.ji || []), ...(fs.chou || [])])
  const isFav  = primary.some(s => favorable.has(s))
  const isUnfav = primary.some(s => unfavorable.has(s))
  if (isFav && !isUnfav)  return 'yong-rel-good'
  if (isUnfav && !isFav)  return 'yong-rel-bad'
  return 'yong-rel-neutral'
})

// 目标十神与命局用神的关系
const yongshenRelation = computed(() => {
  const fs = props.fiveShens
  if (!fs?.yong) return ''
  const primary = props.targetSpec?.primary_shishen || []
  if (!primary.length) return ''

  const favorable = new Set([fs.yong, ...(fs.xi || [])])
  const unfavorable = new Set([...(fs.ji || []), ...(fs.chou || [])])
  const isFav  = primary.some(s => favorable.has(s))
  const isUnfav = primary.some(s => unfavorable.has(s))
  const lowConf = fs.yong_confidence === 'LOW'

  if (isFav && !isUnfav) {
    return lowConf
      ? `目标十神与命局用神方向接近（用神参考），原局有一定支撑`
      : `目标十神与命局用神同向，原局具备内在支撑力`
  }
  if (isUnfav && !isFav) {
    return `目标十神为命局忌神，原局有内在阻力，需大运引动化解`
  }
  if (isFav && isUnfav) {
    return `目标十神中有喜有忌，命局格局复杂，须结合宫位气势细判`
  }
  return `目标十神为命局闲神，中性力量，吉凶随大运流年引动而变`
})

// 命局中未见的目标十神（全称）
const missingShishen = computed(() => {
  const found = new Set((props.stateReport.shishen_assessments || []).map(a => a.shishen))
  return (props.targetSpec.primary_shishen || []).filter(full => {
    const short = FULL_TO_SHORT[full] || full
    return !found.has(short)
  })
})

function shishenWuxing(fullName) {
  return SHISHEN_TO_WX[fullName] || ''
}

const triggeredChecks = computed(() =>
  (props.stateReport.extra_checks || []).filter(c => c.found)
)

function imageLevelClass(level) {
  return {
    'img-level-pure':      level === 'PURE',
    'img-level-formed':    level === 'FORMED',
    'img-level-suspected': level === 'SUSPECTED',
  }
}

const stabilityConclusion = computed(() => {
  const s = props.stateReport
  const maxVigor = (s.shishen_assessments || []).reduce((m, a) => Math.max(m, a.vigor), 0)
  const hasGongwei = (s.gongwei_assessments || []).length > 0
  const hasCorrectStar = (s.gongwei_assessments || []).some(g => g.is_correct_star)

  switch (s.overall_stability) {
    case 'strong':
      return hasCorrectStar
        ? '目标十神旺盛且星宫得正，先天结构极佳，命局对此事有较强承载力'
        : '目标十神旺盛，宫位稳固，先天结构有力，命局底盘扎实'

    case 'stable':
      return hasGongwei && hasCorrectStar
        ? '目标宫位星宫得正，整体平稳，先天基础尚可，发展依赖大运流年进一步引动'
        : '先天结构平稳，无重大冲刑，目标十神处于可用状态，需大运流年配合触发'

    case 'dynamic':
      return '命局存在有效冲刑结构，先天带动荡属性，相关领域易有变动，变化机会与不稳定性并存'

    case 'buried':
      return maxVigor < 0.15
        ? '目标十神几乎不现于命局，先天缺位，须靠大运流年引入外部能量方可激活'
        : '目标十神封藏较深，难以自然显现，须大运流年冲动开库或合引出干方可调用'

    case 'damaged':
      return '目标十神核心结构受损或变质，先天承载力不足，此领域先天短板明显'

    default: return ''
  }
})

// ── 机制分行 builder（十神） ─────────────────────────────────────
function buildMechanismLines(sa) {
  const lines = []
  const v = sa.vigor

  // 1. 旺衰底盘（永远显示）
  const vigorSev = v >= 0.75 ? 'ok' : v >= 0.4 ? 'neutral' : v >= 0.15 ? 'warn' : 'bad'
  const vigorTxt = v >= 0.75 ? `${sa.shishen}处${sa.twelve_phase}，气势充盈`
    : v >= 0.4  ? `${sa.shishen}处${sa.twelve_phase}，气势尚可`
    : v >= 0.15 ? `${sa.shishen}处${sa.twelve_phase}，气势偏弱`
    : `${sa.shishen}处${sa.twelve_phase}，力量极弱`
  lines.push({ category: '旺衰底盘', severity: vigorSev, text: vigorTxt, vigor: v, phase: sa.twelve_phase, isVigor: true })

  // 2. 空亡折扣
  if (sa.is_kong) {
    const zhiEl = ZHI_WX[sa.zhi] || ''
    const isLight = zhiEl === '金' || zhiEl === '火'
    lines.push({
      category: '空亡折扣',
      severity: isLight ? 'warn' : 'bad',
      text: isLight
        ? `${sa.zhi}逢空（${zhiEl}空则响），气力激发，折损较轻`
        : `${sa.zhi}逢空亡（${zhiEl}空则折），力量大减`,
    })
  }

  // 3. 盖头截脚
  if (sa.gaitou_jiejiao === 'jiejiao') {
    lines.push({ category: '截脚', severity: 'bad', text: `地支${sa.zhi}克天干${sa.gan}，天干无根，效力几乎归零` })
  } else if (sa.gaitou_jiejiao === 'gaitou') {
    lines.push({ category: '盖头', severity: 'warn', text: `天干${sa.gan}克地支${sa.zhi}，吉凶减半` })
  }

  // 4. 入墓封藏
  if (sa.is_in_tomb) {
    lines.push({ category: '入墓封藏', severity: 'buried', text: `${sa.shishen}入${sa.zhi}墓，藏而不显，须冲开方可用` })
  }

  // 5. 刑冲干扰
  const sig = (sa.relationships || []).filter(r => r.effective_strength >= 25)
  const clashes = sig.filter(r => r.type === '六冲' || r.type.includes('刑'))
  if (clashes.length) {
    lines.push({
      category: clashes.some(r => r.type === '六冲') ? '六冲干扰' : '刑局干扰',
      severity: 'warn',
      text: clashes.map(r => r.note).join('；'),
    })
  }

  // 6. 合化变质
  const huaRels = sig.filter(r => r.type.includes('合_化'))
  if (huaRels.length) {
    lines.push({ category: '合化变质', severity: 'buried', text: huaRels.map(r => r.note).join('；') })
  }

  // 7. 合而不化（羁绊）
  const noHua = sig.filter(r => r.type.includes('合_不化') || r.type === '天干五合_不化')
  if (noHua.length) {
    lines.push({ category: '合而不化', severity: 'warn', text: noHua.map(r => r.note).join('；') })
  }

  return lines
}

// ── 机制分行 builder（宫位） ─────────────────────────────────────
function buildGongweiLines(ga) {
  const lines = []
  const v = ga.vigor
  const vigorSev = v >= 0.75 ? 'ok' : v >= 0.4 ? 'neutral' : 'warn'
  const phaseTxt = `日干临${ga.zhi}处${ga.twelve_phase_for_dayStem}`
  const vigorTxt = v >= 0.75 ? `${phaseTxt}，宫位气势极旺`
    : v >= 0.4  ? `${phaseTxt}，宫位气势平稳`
    : `${phaseTxt}，宫位气势偏弱`
  lines.push({ category: '宫位气势', severity: vigorSev, text: vigorTxt, vigor: v, phase: ga.twelve_phase_for_dayStem, isVigor: true })

  // 星宫得正 / 鸠占鹊巢
  if (ga.is_correct_star) {
    lines.push({ category: '星宫得正', severity: 'ok', text: `${ga.gongwei}坐${ga.seat_shishen}，目标十神居本位，力量加倍` })
  } else if (ga.is_hostile_occupied) {
    lines.push({ category: '鸠占鹊巢', severity: 'bad', text: `${ga.gongwei}坐${ga.seat_shishen}（比劫），占据目标宫位，对目标六亲不利` })
  }

  // 宫位入墓
  if (ga.is_tomb_for_target) {
    lines.push({ category: '宫位入墓', severity: 'buried', text: `${ga.zhi}是目标五行墓库，宫位封藏` })
  }

  // 空亡
  if (ga.is_kong) {
    lines.push({ category: '空亡折扣', severity: 'bad', text: '宫位逢空亡，承载力大减' })
  }

  // 刑冲 / 六害
  const sig = (ga.relationships || []).filter(r => r.effective_strength >= 25)
  const clashes = sig.filter(r => r.type === '六冲' || r.type.includes('刑'))
  const harms   = sig.filter(r => r.type === '六害')
  if (clashes.length) {
    lines.push({ category: '宫位受冲', severity: 'warn', text: clashes.map(r => r.note).join('；') })
  }
  if (harms.length) {
    lines.push({ category: '六害阻滞', severity: 'warn', text: harms.map(r => r.note).join('；') })
  }

  return lines
}

const ELEM_CLASS = { 木:'el-mu', 火:'el-huo', 土:'el-tu', 金:'el-jin', 水:'el-shui' }
function elemClass(el) { return ELEM_CLASS[el] || '' }

function shenClass(shen = '') {
  if (!shen) return ''
  if (/杀|官|印/.test(shen)) return 'shen-green'
  if (/财|食|伤/.test(shen)) return 'shen-gold'
  return 'shen-red'
}

function posLabel(pos) {
  if (pos === 'gan')      return '天干'
  if (pos === 'zhi')      return '地支'
  if (pos === 'zhi_main') return '地支主气'
  if (pos === 'zhi_mid')  return '中气'
  if (pos === 'hidden')   return '余气'
  return pos || ''
}

function vigorFillClass(vigor) {
  if (vigor < 0.2) return 'vf-weak'
  if (vigor < 0.5) return 'vf-mid'
  return 'vf-strong'
}

function vigorLabel(vigor) {
  if (vigor >= 0.75) return '力旺'
  if (vigor >= 0.5)  return '力中'
  if (vigor >= 0.35) return '力弱'
  if (vigor >= 0.2)  return '偏弱'
  return '极弱'
}

const TAG_AUSPICIOUS = new Set(['帝旺','长生','有根','星宫得正','宫位稳固','宫位入局','合局'])
const TAG_BAD        = new Set(['死绝','无根','空亡','入墓','被合化','鸠占鹊巢','宫位入墓'])
const TAG_DYNAMIC    = new Set(['被冲','被刑','合而不化','宫位受冲','宫位受刑','宫位受害'])

function tagClass(tag) {
  if (TAG_AUSPICIOUS.has(tag)) return 'tag-ji'
  if (TAG_BAD.has(tag))        return 'tag-xiong'
  if (TAG_DYNAMIC.has(tag))    return 'tag-dong'
  return 'tag-neutral'
}
</script>

<style scoped>
/* ── 容器 ─────────────────────────────────────────────────── */
.static-panel {
  background: var(--bg-card);
  border: 1px solid rgba(181,141,59,0.22);
  border-radius: var(--radius-card);
  padding: 0;
  overflow: hidden;
  font-family: var(--font-serif);
  box-shadow: 0 4px 20px rgba(0,0,0,0.10);
}

/* ── 命盘标识行 ─────────────────────────────────────────────── */
.profile-identity {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 16px 6px;
  border-bottom: 1px solid rgba(181,141,59,0.1);
  background: rgba(181,141,59,0.04);
}

.pid-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink, #0b0b0b);
  letter-spacing: .04em;
}

.pid-sep {
  font-size: 11px;
  color: var(--ink-dim, #aaa);
}

.pid-gender, .pid-date {
  font-size: 12px;
  color: var(--ink-muted, #55595d);
  letter-spacing: .02em;
}

[data-theme="dark"] .profile-identity {
  background: rgba(212,175,55,0.07);
  border-bottom-color: rgba(212,175,55,0.15);
}

[data-theme="dark"] .static-panel {
  /* background overridden at end of file with explicit #18182e */
  border-color: rgba(212,175,55,0.35);
  box-shadow: 0 6px 28px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,175,55,0.12);
}

/* ── 四柱牌面 ─────────────────────────────────────────────── */
.pillar-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-bottom: 1px solid rgba(181,141,59,0.15);
  background: rgba(181,141,59,0.03);
}

[data-theme="dark"] .pillar-grid {
  background: rgba(212,175,55,0.07);
  border-bottom-color: rgba(212,175,55,0.2);
}

.pillar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 4px 8px;
  gap: 2px;
  border-right: 1px solid rgba(181,141,59,0.1);
  transition: background 0.2s;
}

.pillar-highlighted {
  background: rgba(181,141,59,0.22) !important;
}

[data-theme="dark"] .pillar-highlighted {
  background: rgba(212,175,55,0.28) !important;
}

.pillar-col:last-child { border-right: none; }

.pillar-riZhu { background: transparent; }
[data-theme="dark"] .pillar-riZhu { background: transparent; }

.pillar-name {
  font-size: 9.5px;
  letter-spacing: .08em;
  color: var(--text-muted);
  margin-bottom: 2px;
  white-space: nowrap;
}

.pillar-riZhu .pillar-name { color: var(--gold); }

.pillar-gan,
.pillar-zhi {
  font-family: var(--font-ganzhi);
  font-size: 26px;
  font-weight: 750;
  line-height: 1.1;
}

.pillar-shishen {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .04em;
  line-height: 1;
  margin-bottom: 1px;
}

.pillar-wx {
  display: flex;
  gap: 1px;
  font-size: 10px;
  font-weight: 600;
  margin-top: 2px;
}

.pillar-wx em { font-style: normal; }

.pillar-hidden {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 2px;
}

.hs-item {
  font-size: 9.5px;
  font-weight: 700;
  font-style: normal;
  letter-spacing: 0;
  line-height: 1;
}

.pillar-kong {
  font-size: 9px;
  color: #7c3aed;
  letter-spacing: .05em;
  margin-top: 1px;
}

[data-theme="dark"] .pillar-kong { color: #a78bfa; }

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
  margin-bottom: 2px;
}

.panel-subtitle {
  font-size: 15px;
  color: var(--gold);
  font-weight: 600;
  letter-spacing: .04em;
  line-height: 1.3;
}

/* ── 格局/调候 结构行 ─────────────────────────────────────── */
.meta-block {
  padding: 10px 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.meta-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.meta-label {
  font-size: 10px;
  letter-spacing: .18em;
  color: var(--text-muted);
  background: var(--gold-dim);
  border: 1px solid var(--gold-border);
  border-radius: 6px;
  padding: 2px 7px;
  flex-shrink: 0;
  margin-top: 1px;
  white-space: nowrap;
}

.meta-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.meta-value {
  font-size: 12px;
  color: var(--ink-muted);
  line-height: 1.6;
}

.meta-check {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  font-size: 11.5px;
  color: var(--crimson);
  line-height: 1.5;
}

[data-theme="dark"] .meta-check { color: #FF5E57; }

.meta-check-bullet { font-size: 9px; margin-top: 3px; flex-shrink: 0; }

/* ── 形象行 ─────────────────────────────────────────────────── */
.image-main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.image-subtype {
  font-size: 14px;
  font-weight: 700;
  color: var(--gold, #b58d3b);
  letter-spacing: .04em;
}

.image-score-chip {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 20px;
  border: 1px solid currentColor;
  display: inline-flex;
  gap: 3px;
  align-items: center;
  letter-spacing: .02em;
}

.image-score-chip em { font-style: normal; font-weight: 600; }

.img-level-pure    { color: #2e7d32; }
.img-level-formed  { color: #b58d3b; }
.img-level-suspected { color: #7c5cbf; }

.image-override-chip {
  font-size: 10px;
  color: #c62828;
  background: rgba(220,38,38,.08);
  border: 1px solid rgba(220,38,38,.22);
  border-radius: 20px;
  padding: 1px 6px;
  letter-spacing: .02em;
}

.image-secondary {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
}

.image-sec-label {
  font-size: 9.5px;
  color: var(--ink-dim, #999);
  letter-spacing: .06em;
}

.image-sec-text {
  font-size: 11px;
  color: var(--ink-muted, #55595d);
}

[data-theme="dark"] .img-level-pure    { color: #81c784; }
[data-theme="dark"] .img-level-formed  { color: #ffd54f; }
[data-theme="dark"] .img-level-suspected { color: #b39ddb; }

/* ── 分割线 ─────────────────────────────────────────────────── */
.panel-divider {
  height: 1px;
  background: rgba(181,141,59,0.12);
}

[data-theme="dark"] .panel-divider {
  background: rgba(212,175,55,0.18);
}

/* ── Section ────────────────────────────────────────────────── */
.panel-section { padding: 12px 16px; }

.section-label {
  font-size: 10px;
  letter-spacing: .22em;
  color: var(--text-muted);
  font-weight: 700;
  margin-bottom: 8px;
}

/* ── 理论说明行 ─────────────────────────────────────────────── */
.theory-note {
  font-size: 12px;
  color: var(--gold);
  line-height: 1.6;
  margin: 0 0 10px;
  padding: 6px 10px;
  background: var(--gold-dim);
  border-left: 2px solid var(--gold-border);
  border-radius: 0 6px 6px 0;
}

/* ── 取法依据 & 用神关系 ──────────────────────────────────────── */
.theory-rationale {
  font-size: 12px;
  color: var(--text-muted, #888);
  line-height: 1.6;
  margin: 0 0 8px;
  padding: 0 2px;
}

.yong-relation {
  font-size: 12px;
  line-height: 1.5;
  margin: 0 0 10px;
  padding: 5px 10px;
  border-radius: 6px;
}
.yong-rel-good    { color: #4caf7d; background: rgba(76,175,125,.08); }
.yong-rel-bad     { color: #c0755a; background: rgba(192,117,90,.08); }
.yong-rel-neutral { color: var(--text-muted, #888); background: rgba(128,128,128,.06); }

/* ── 缺位状态 ─────────────────────────────────────────────────── */
.absent-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(220,38,38,.05);
  border: 1px dashed rgba(220,38,38,.2);
}

.absent-icon {
  font-size: 18px;
  color: rgba(220,38,38,.45);
  font-family: var(--font-ganzhi);
  line-height: 1;
  flex-shrink: 0;
}

.absent-text {
  font-size: 12px;
  color: var(--ink-muted);
  line-height: 1.55;
}

/* ── 分析 card（十神/宫位通用） ─────────────────────────────── */
.analysis-card {
  padding: 11px 13px;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  background: rgba(255,255,255,.025);
  margin-bottom: 8px;
}

.analysis-card:last-child { margin-bottom: 0; }

.analysis-card.card-weak {
  border-color: rgba(220,38,38,.18);
  background: rgba(220,38,38,.04);
}

.analysis-card.card-active {
  border-color: rgba(181,141,59,0.5);
  background: rgba(181,141,59,0.06);
  box-shadow: 0 0 0 1px rgba(181,141,59,0.3);
}

[data-theme="dark"] .analysis-card.card-active {
  border-color: rgba(212,175,55,0.55);
  background: rgba(212,175,55,0.1);
}

[data-theme="dark"] .analysis-card { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,0.14); }
[data-theme="dark"] .analysis-card.card-weak { background: rgba(255,94,87,.12); border-color: rgba(255,94,87,.30); }

/* ── card 头行 ──────────────────────────────────────────────── */
.card-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.shishen-name {
  font-size: 22px;
  font-family: var(--font-ganzhi);
  font-weight: 750;
  line-height: 1;
}

.gongwei-label {
  font-size: 11px;
  letter-spacing: .12em;
  color: var(--text-muted);
  font-weight: 700;
}

.card-ganzhi {
  font-size: 17px;
  font-family: var(--font-ganzhi);
  font-weight: 600;
  line-height: 1;
  opacity: .85;
}

.card-chip {
  font-size: 10.5px;
  color: var(--text-muted);
  background: var(--paper-soft);
  border-radius: 7px;
  padding: 2px 7px;
}

[data-theme="dark"] .card-chip { background: rgba(255,255,255,.06); }

.kong-chip {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .06em;
  color: #7c3aed;
  background: rgba(124,58,237,.1);
  border: 1px solid rgba(124,58,237,.25);
  border-radius: 7px;
  padding: 1px 6px;
}

[data-theme="dark"] .kong-chip { color: #a78bfa; }

.correct-star-chip {
  font-size: 10px;
  font-weight: 700;
  color: var(--teal);
  background: rgba(13,148,136,.1);
  border: 1px solid rgba(13,148,136,.25);
  border-radius: 7px;
  padding: 1px 6px;
}

[data-theme="dark"] .correct-star-chip { color: #4ECDC4; }

.seat-info {
  font-size: 12px;
  color: var(--ink-muted);
  display: flex;
  align-items: center;
  gap: 2px;
}

.seat-shen { font-style: normal; font-weight: 700; }

/* ── 旺衰文字行 ─────────────────────────────────────────────── */
.vigor-text-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.vigor-label-txt {
  font-size: 10px;
  letter-spacing: .1em;
  color: var(--text-muted);
  flex-shrink: 0;
}

.vigor-phase {
  font-size: 13px;
  font-family: var(--font-ganzhi);
  font-weight: 700;
  flex-shrink: 0;
}

.vigor-strength {
  font-size: 10.5px;
  font-weight: 700;
  flex-shrink: 0;
}

/* vigor 颜色仅打到 phase/strength 文字和 mini-fill 上 */
.vf-weak   .vigor-phase,
.vf-weak.vigor-phase   { color: var(--crimson); }
.vf-mid    .vigor-phase,
.vf-mid.vigor-phase    { color: #d97706; }
.vf-strong .vigor-phase,
.vf-strong.vigor-phase { color: var(--teal); }

.vf-weak.vigor-strength   { color: var(--crimson); }
.vf-mid.vigor-strength    { color: #d97706; }
.vf-strong.vigor-strength { color: var(--teal); }

[data-theme="dark"] .vf-weak.vigor-phase,
[data-theme="dark"] .vf-weak.vigor-strength   { color: #FF5E57; }
[data-theme="dark"] .vf-mid.vigor-phase,
[data-theme="dark"] .vf-mid.vigor-strength    { color: #fbbf24; }
[data-theme="dark"] .vf-strong.vigor-phase,
[data-theme="dark"] .vf-strong.vigor-strength { color: #4ECDC4; }

.vigor-mini-track {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: var(--paper-soft);
  overflow: hidden;
}

[data-theme="dark"] .vigor-mini-track { background: rgba(255,255,255,.07); }

.vigor-mini-fill {
  height: 100%;
  border-radius: 2px;
  transition: width .4s var(--ease);
}

.vigor-mini-fill.vf-weak   { background: var(--crimson); }
.vigor-mini-fill.vf-mid    { background: #d97706; }
.vigor-mini-fill.vf-strong { background: var(--teal); }

[data-theme="dark"] .vigor-mini-fill.vf-weak   { background: #FF5E57; }
[data-theme="dark"] .vigor-mini-fill.vf-mid    { background: #fbbf24; }
[data-theme="dark"] .vigor-mini-fill.vf-strong { background: #4ECDC4; }

/* ── 状态标签 ───────────────────────────────────────────────── */
.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 7px;
}

.stag {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: .04em;
  padding: 2px 7px;
  border-radius: 8px;
  border: 1px solid transparent;
}

.tag-ji      { color: var(--teal);    background: rgba(13,148,136,.1);  border-color: rgba(13,148,136,.22); }
.tag-xiong   { color: var(--crimson); background: rgba(220,38,38,.09);  border-color: rgba(220,38,38,.2); }
.tag-dong    { color: #d97706;        background: rgba(217,119,6,.1);   border-color: rgba(217,119,6,.22); }
.tag-neutral { color: var(--gold);    background: var(--gold-dim);      border-color: var(--gold-border); }

[data-theme="dark"] .tag-ji      { color: #4ECDC4; background: rgba(78,205,196,.1);  border-color: rgba(78,205,196,.22); }
[data-theme="dark"] .tag-xiong   { color: #FF5E57; background: rgba(255,94,87,.1);   border-color: rgba(255,94,87,.2); }
[data-theme="dark"] .tag-dong    { color: #fbbf24; background: rgba(251,191,36,.1);  border-color: rgba(251,191,36,.22); }

/* ── 断语文本 ───────────────────────────────────────────────── */
.verdict-text {
  font-size: 12px;
  color: var(--ink-muted);
  line-height: 1.7;
  margin: 0;
}

/* ── 未见于命局行 ────────────────────────────────────────────── */
.absent-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px dashed rgba(154,154,170,0.3);
  margin-top: 6px;
}

.absent-name {
  font-size: 13px;
  font-family: var(--font-ganzhi);
  font-weight: 700;
  color: var(--text-muted);
  flex-shrink: 0;
}

.absent-msg {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.5;
}

/* ── 底栏 ───────────────────────────────────────────────────── */
.panel-footer {
  padding: 10px 16px 14px;
}

.base-state-text {
  font-size: 12px;
  color: var(--ink-muted);
  line-height: 1.7;
  margin: 0;
}

/* ── 机制分行 ───────────────────────────────────────────────── */
.mline {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 5px 0 5px 10px;
  border-left: 2px solid;
  margin-bottom: 6px;
}
.mline:last-child { margin-bottom: 0; }

.mline-ok      { border-left-color: #0d9488; }
.mline-neutral { border-left-color: rgba(181,141,59,0.55); }
.mline-warn    { border-left-color: #d97706; }
.mline-bad     { border-left-color: #dc2626; }
.mline-buried  { border-left-color: #7c3aed; }

[data-theme="dark"] .mline-ok      { border-left-color: #4ECDC4; }
[data-theme="dark"] .mline-neutral { border-left-color: rgba(212,175,55,0.55); }
[data-theme="dark"] .mline-warn    { border-left-color: #fbbf24; }
[data-theme="dark"] .mline-bad     { border-left-color: #FF5E57; }
[data-theme="dark"] .mline-buried  { border-left-color: #a78bfa; }

.mline-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mline-category {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: .12em;
  color: var(--text-muted);
  flex-shrink: 0;
}
[data-theme="dark"] .mline-category { color: rgba(255,255,255,0.4); }

.mline-phase {
  font-size: 10.5px;
  font-weight: 700;
}

.mline-bar-track {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: rgba(0,0,0,0.08);
  overflow: hidden;
  max-width: 80px;
}
[data-theme="dark"] .mline-bar-track { background: rgba(255,255,255,0.1); }

.mline-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width .3s;
}
.mline-bar-fill.vf-weak   { background: #dc2626; }
.mline-bar-fill.vf-mid    { background: #d97706; }
.mline-bar-fill.vf-strong { background: #0d9488; }
[data-theme="dark"] .mline-bar-fill.vf-weak   { background: #FF5E57; }
[data-theme="dark"] .mline-bar-fill.vf-mid    { background: #fbbf24; }
[data-theme="dark"] .mline-bar-fill.vf-strong { background: #4ECDC4; }

.mline-text {
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--ink-muted);
  margin: 0;
}
[data-theme="dark"] .mline-text { color: rgba(255,255,255,0.72); }

/* ── 五行颜色 ───────────────────────────────────────────────── */
.el-mu   { color: #166534; }
.el-huo  { color: #991b1b; }
.el-tu   { color: #9a6b12; }
.el-jin  { color: #475569; }
.el-shui { color: #1d4ed8; }

.shen-green { color: #166534; }
.shen-gold  { color: #9a6b12; }
.shen-red   { color: #991b1b; }

[data-theme="dark"] .el-mu   { color: #4ade80; }
[data-theme="dark"] .el-huo  { color: #f87171; }
[data-theme="dark"] .el-tu   { color: #D4AF37; }
[data-theme="dark"] .el-jin  { color: #e2e8f0; }
[data-theme="dark"] .el-shui { color: #60a5fa; }

[data-theme="dark"] .shen-green { color: #4ade80; }
[data-theme="dark"] .shen-gold  { color: #D4AF37; }
[data-theme="dark"] .shen-red   { color: #f87171; }

/* ── 整体稳定性结论 ─────────────────────────────────────────── */
.stability-footer {
  padding: 12px 16px 14px;
}

.stab-footer-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 5px;
}

.stab-footer-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.stab-footer-label {
  font-size: 13px;
  font-weight: 700;
  font-family: var(--font-serif);
  letter-spacing: .04em;
}

.stab-footer-badge {
  font-size: 10px;
  letter-spacing: .14em;
  color: var(--text-muted);
  font-weight: 600;
}

.stab-footer-text {
  font-size: 12px;
  line-height: 1.75;
  color: var(--ink-muted);
  margin: 0;
}

/* 颜色：dot + label 用稳定性色 */
.stab-footer-strong  .stab-footer-dot   { background: var(--teal); }
.stab-footer-strong  .stab-footer-label { color: var(--teal); }
.stab-footer-stable  .stab-footer-dot   { background: var(--gold); }
.stab-footer-stable  .stab-footer-label { color: var(--gold); }
.stab-footer-dynamic .stab-footer-dot   { background: #d97706; }
.stab-footer-dynamic .stab-footer-label { color: #d97706; }
.stab-footer-buried  .stab-footer-dot   { background: #7c3aed; }
.stab-footer-buried  .stab-footer-label { color: #7c3aed; }
.stab-footer-damaged .stab-footer-dot   { background: var(--crimson); }
.stab-footer-damaged .stab-footer-label { color: var(--crimson); }

[data-theme="dark"] .stab-footer-strong  .stab-footer-dot   { background: #4ECDC4; }
[data-theme="dark"] .stab-footer-strong  .stab-footer-label { color: #4ECDC4; }
[data-theme="dark"] .stab-footer-dynamic .stab-footer-dot   { background: #fbbf24; }
[data-theme="dark"] .stab-footer-dynamic .stab-footer-label { color: #fbbf24; }
[data-theme="dark"] .stab-footer-buried  .stab-footer-dot   { background: #a78bfa; }
[data-theme="dark"] .stab-footer-buried  .stab-footer-label { color: #a78bfa; }
[data-theme="dark"] .stab-footer-damaged .stab-footer-dot   { background: #FF5E57; }
[data-theme="dark"] .stab-footer-damaged .stab-footer-label { color: #FF5E57; }
[data-theme="dark"] .stab-footer-text    { color: rgba(255,255,255,0.72); }

/* ── 深色模式：面板背景 + 文字显式增亮 ─────────────────────────
   不依赖 var() 的深色变量，直接写死值保证可见性
   ─────────────────────────────────────────────────────────── */
[data-theme="dark"] .static-panel {
  background: #18182e;
}

/* 次级标签：section title、pillar name、chip 等 */
[data-theme="dark"] .section-label,
[data-theme="dark"] .panel-eyebrow,
[data-theme="dark"] .card-chip,
[data-theme="dark"] .gongwei-label,
[data-theme="dark"] .pillar-name,
[data-theme="dark"] .phase-mini,
[data-theme="dark"] .absent-name,
[data-theme="dark"] .absent-msg,
[data-theme="dark"] .phase-name,
[data-theme="dark"] .footer-stab-label {
  color: rgba(255,255,255,0.5);
}

/* 正文断语、说明文字 */
[data-theme="dark"] .verdict-text,
[data-theme="dark"] .meta-value,
[data-theme="dark"] .tiaohou-text,
[data-theme="dark"] .check-text,
[data-theme="dark"] .seat-info,
[data-theme="dark"] .vigor-pct,
[data-theme="dark"] .base-state-text {
  color: rgba(255,255,255,0.75);
}

/* 金色元素 */
[data-theme="dark"] .theory-note {
  color: #E8CC80;
  background: rgba(212,175,55,0.12);
  border-left-color: rgba(212,175,55,0.4);
}
[data-theme="dark"] .meta-label {
  color: #D4AF37;
  background: rgba(212,175,55,0.1);
  border-color: rgba(212,175,55,0.3);
}
[data-theme="dark"] .tiaohou-label {
  color: #D4AF37;
  background: rgba(212,175,55,0.1);
  border-color: rgba(212,175,55,0.3);
}

/* 卡片 chip / 内部元素 */
[data-theme="dark"] .pillar-wx em { opacity: 1; }
</style>
