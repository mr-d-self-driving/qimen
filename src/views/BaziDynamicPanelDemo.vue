<template>
  <div class="demo-view">
    <header class="demo-header">
      <router-link class="back" to="/">← 返回</router-link>
      <span class="demo-title">BaziDynamicPanel · 动态触发组件</span>
      <div class="mode-tabs">
        <button :class="{ active: tab === 'status' }" @click="tab = 'status'">status</button>
        <button :class="{ active: tab === 'timing' }" @click="tab = 'timing'">timing 单运</button>
        <button :class="{ active: tab === 'multi' }" @click="tab = 'multi'">timing 跨大运</button>
        <button :class="{ active: tab === 'career' }" @click="tab = 'career'">事业升迁</button>
      </div>
    </header>
    <main class="demo-main">
      <p class="demo-case">
        案例：{{ tab === 'career' ? '辛亥日 女命 / 问事业升迁' : '壬午日 男命 / 问婚恋感情' }}<br>
        {{ tab === 'status' ? '大运：甲子（2019–2029）· 流年：丙午（2026）'
        : tab === 'timing' ? '大运：甲子（2019–2029）· 扫描 2025–2029'
        : tab === 'multi' ? '跨大运：甲子（2019–2029）+ 甲戌（2029–2039）· 扫描 2025–2036'
        : '辛亥日 女命 / 问事业升迁 · 大运：甲午（2022–2032）· 扫描 2024–2029' }}
      </p>

      <!--
        targetMap：壬午日 婚恋 case
          时柱 → 才（偏财·天干）
          日柱 → 财（正财·地支主气）+ 日支（婚宫）
        注：月柱才星为藏干（hidden），权重低，不加入映射
      -->
      <BaziDynamicPanel
        v-if="tab === 'status'"
        mode="status"
        :dynamic-report="STATUS_REPORT"
        :target-map="DEMO_TARGET_MAP"
        conclusion-text=""
        avoid-window-text=""
      />

      <BaziDynamicPanel
        v-if="tab === 'timing'"
        mode="timing"
        :dynamic-report="STATUS_REPORT"
        :trigger-windows="TIMING_WINDOWS"
        :best-window-year="2027"
        :target-map="DEMO_TARGET_MAP"
        avoid-window-text="2026年（丙午伏吟，财星自叠动荡）"
      />

      <!-- 跨大运 demo：甲子（2025–2029）+ 甲戌（2030–2036） -->
      <BaziDynamicPanel
        v-if="tab === 'multi'"
        mode="timing"
        :dayun-groups="MULTI_DAYUN_GROUPS"
        :best-window-year="2027"
        :target-map="DEMO_TARGET_MAP"
        avoid-window-text="2026年（丙午伏吟）、2033年（癸丑财星入墓）"
        conclusion-text="近期最强窗口 2027 丁未（三合开墓），次选 2032 壬子（财星沐浴长生）。2033 癸丑须规避。"
      />

      <!-- 案例2：辛亥日 女命 / 事业升迁 timing，无宫位 -->
      <BaziDynamicPanel
        v-if="tab === 'career'"
        mode="timing"
        :trigger-windows="CAREER_WINDOWS"
        :best-window-year="2027"
        :target-map="CAREER_TARGET_MAP"
        avoid-window-text="2026年（丙午伤官透干，伤官见官）"
        conclusion-text="2027 丁未年正印透干护官，官星进气最旺，为升迁主窗口；2028 戊申次之（食神制杀转化为推动力）。"
      />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import BaziDynamicPanel from '../components/BaziDynamicPanel.vue'

const tab = ref('status')

// ── targetMap：静态面板目标 → 动态机制映射表 ─────────────────
// 从 DEMO_REPORT.shishen_assessments（排除 hidden）+ gongwei_assessments 构建
// 时柱：才（偏财·天干）；日柱：财（正财·地支主气）+ 日支（婚宫）
const DEMO_TARGET_MAP = {
  '时': [{ kind: 'shishen', name: '才' }],
  '日': [
    { kind: 'shishen', name: '财' },
    { kind: 'gongwei', name: '日支' },
  ],
}

// ── 共用大运层：甲子大运 ────────────────────────────────────
const DAYUN_IMPACT = {
  gan: '甲', zhi: '子',
  twelve_phase: '沐浴',
  trigger_vigor: 0.62,
  gaitou_jiejiao: 'neutral',
  gaitou_jiejiao_note: null,
  field_type: '引动场（透干显现）',
  mechanisms: [
    {
      type: '透干引动',
      target_pillar: '月',
      description: '甲透出月支寅中甲，财星月柱气场被激活',
      effective_strength: 0.58,
      vigor_check: { trigger_vigor: 0.62, target_vigor: 0.1, is_effective: true, direction: '有利' },
    },
    {
      type: '合动',
      target_pillar: '时',
      description: '子与申半合水局（缺辰，合力减半），拱托日主壬水',
      effective_strength: 0.28,
      vigor_check: { trigger_vigor: 0.62, target_vigor: 0.38, is_effective: false, direction: '中性' },
    },
  ],
  activates_target: true,
}

// ── status 模式 fixture：流年丙午（2026） ───────────────────
const STATUS_REPORT = {
  dayun_impact: DAYUN_IMPACT,
  liunian_impact: {
    gan: '丙', zhi: '午',
    twelve_phase: '胎',
    trigger_vigor: 0.55,
    gaitou_jiejiao: 'neutral',
    gaitou_jiejiao_note: null,
    mechanisms: [
      {
        type: '伏吟',
        target_pillar: '日',
        description: '丙午与日柱壬午地支完全相同，伏吟叠压，宫位动而不出',
        effective_strength: 0.52,
        vigor_check: { trigger_vigor: 0.55, target_vigor: 0.4, is_effective: true, direction: '不利' },
      },
      {
        type: '填实三合',
        target_pillar: '月',
        description: '午与寅、戌（未见）填实三合火局，财星月柱获能量补充',
        effective_strength: 0.31,
        vigor_check: { trigger_vigor: 0.55, target_vigor: 0.1, is_effective: false, direction: '有利' },
      },
    ],
    activates_target: true,
  },
  target_trigger: {
    base_state: '才月柱：死绝/空亡/被冲',
    state_change: '伏吟引动，宫位波动激烈但方向内耗',
    new_stability: 'dynamic',
    is_activated: true,
    event_type: '动荡',
    auspice_direction: '不利',
  },
  dynamic_verdict: `2026 丙午年：流年地支午与日柱午伏吟，婚宫自叠，情感议题被强制推上台面，但能量向内反噬而非向外推进。甲子大运透干激活月支寅中甲（才星），感情有扰动，然伏吟性质决定这一年更多是"被迫面对"而非"水到渠成"。`,
}

// ── timing 模式 fixture：扫描 2025–2030 ─────────────────────
function makeTW(year, gan, zhi, phase, vigor, mechs, trigger) {
  return {
    year,
    ganzhi: gan + zhi,
    dynamicReport: {
      dayun_impact: DAYUN_IMPACT,
      liunian_impact: { gan, zhi, twelve_phase: phase, trigger_vigor: vigor, gaitou_jiejiao: 'neutral', mechanisms: mechs, activates_target: trigger.is_activated },
      target_trigger: trigger,
      dynamic_verdict: '',
    },
    verdict: trigger.verdict_text ?? '',
  }
}

const TIMING_WINDOWS = [
  makeTW(2025, '乙', '巳', '长生', 0.48,
    [
      { type: '合化', target_pillar: '年', description: '乙庚合化金，与年柱庚辰天干合化，偏财星被合绊，动力减弱', effective_strength: 0.44, vigor_check: { trigger_vigor: 0.48, target_vigor: 0.35, is_effective: true, direction: '不利' } },
    ],
    { base_state: '才/财·中性底盘', state_change: '偏财合化被绊，感情受外部羁绊影响', new_stability: 'buried', is_activated: false, event_type: '静止', auspice_direction: '中性', verdict_text: '乙庚合化牵制偏财，2025年感情多波折，主动出击效果有限，宜蓄力。' }),

  makeTW(2026, '丙', '午', '胎', 0.55,
    [
      { type: '伏吟', target_pillar: '日', description: '午与日柱午伏吟，婚宫自叠，内耗激烈', effective_strength: 0.52, vigor_check: { trigger_vigor: 0.55, target_vigor: 0.4, is_effective: true, direction: '不利' } },
    ],
    { base_state: '才/财·中性底盘', state_change: '伏吟自叠，情感被迫浮出，方向内耗', new_stability: 'dynamic', is_activated: true, event_type: '动荡', auspice_direction: '不利', verdict_text: '伏吟年，感情议题被强推上台面但难以落地，适合反思而非推进。' }),

  makeTW(2027, '丁', '未', '养', 0.78,
    [
      { type: '开墓库', target_pillar: '年', description: '未冲辰（年柱），辰为财星墓库，丁未年开库，潜藏感情能量爆发', effective_strength: 0.71, vigor_check: { trigger_vigor: 0.78, target_vigor: 0.55, is_effective: true, direction: '有利' } },
      { type: '填实三合', target_pillar: '月', description: '未与午（日）、寅（月）填实三合火局，财星全面激活', effective_strength: 0.65, vigor_check: { trigger_vigor: 0.78, target_vigor: 0.1, is_effective: true, direction: '有利' } },
    ],
    { base_state: '才/财·中性底盘', state_change: '三合成局+开墓，财星全面引动，婚缘最强窗口', new_stability: 'strong', is_activated: true, event_type: '婚姻落定', auspice_direction: '有利', verdict_text: '丁未年三合成局并开库，财星从死绝状态被全面激活，是近年内结婚概率最高的一年。' }),

  makeTW(2028, '戊', '申', '绝', 0.42,
    [
      { type: '冲动', target_pillar: '月', description: '申与寅六冲，月柱才星再次被冲，空亡叠加冲力，情感不稳', effective_strength: 0.60, vigor_check: { trigger_vigor: 0.42, target_vigor: 0.1, is_effective: true, direction: '不利' } },
    ],
    { base_state: '才/财·中性底盘', state_change: '才星被冲，关系动荡，需防感情波折', new_stability: 'damaged', is_activated: true, event_type: '动荡', auspice_direction: '不利', verdict_text: '戊申再冲月支寅，2028年感情受压，若2027年未落定，此年面临变数。' }),

  makeTW(2029, '己', '酉', '死', 0.35,
    [
      { type: '合而不化', target_pillar: '时', description: '酉与时支申合金，合而不化，羁绊偏财星行动力', effective_strength: 0.33, vigor_check: { trigger_vigor: 0.35, target_vigor: 0.38, is_effective: false, direction: '不利' } },
    ],
    { base_state: '才/财·中性底盘', state_change: '偏财被合羁绊，感情机会窗口关闭', new_stability: 'buried', is_activated: false, event_type: '静止', auspice_direction: '中性', verdict_text: '己酉合羁偏财，感情缘分收束，不宜期待重大进展。' }),
]

// ── 跨大运 fixture：甲子（2025–2029）+ 甲戌（2030–2036） ────
const DAYUN_2_IMPACT = {
  gan: '甲', zhi: '戌',
  twelve_phase: '养',
  trigger_vigor: 0.51,
  gaitou_jiejiao: 'neutral',
  gaitou_jiejiao_note: null,
  field_type: '开墓场（封藏透出）',
  mechanisms: [
    {
      type: '开墓库',
      target_pillar: '日',
      description: '戌为火土墓库，大运甲戌为财星墓库建场，潜藏机缘随流年开启',
      effective_strength: 0.49,
      vigor_check: { trigger_vigor: 0.51, target_vigor: 0.4, is_effective: true, direction: '有利' },
    },
  ],
  activates_target: true,
}

const TIMING_WINDOWS_2 = [
  makeTW(2030, '庚', '戌', '胎', 0.44,
    [{ type: '合动', target_pillar: '时', description: '庚与时干丙合，才星受合动制约，感情机缘受外力阻拦', effective_strength: 0.40, vigor_check: { trigger_vigor: 0.44, target_vigor: 0.38, is_effective: true, direction: '不利' } }],
    { base_state: '才/财·开墓底盘', state_change: '才星受合动，感情机缘受阻', new_stability: 'buried', is_activated: false, event_type: '静止', auspice_direction: '中性', verdict_text: '庚戌年才星被合，进入甲戌大运初期能量尚未充分激活。' }),
  makeTW(2031, '辛', '亥', '长生', 0.53,
    [{ type: '透干引动', target_pillar: '日', description: '亥中壬水透干，与日主壬水比肩，财星（午）得日主能量支援', effective_strength: 0.50, vigor_check: { trigger_vigor: 0.53, target_vigor: 0.4, is_effective: true, direction: '有利' } }],
    { base_state: '才/财·开墓底盘', state_change: '财星获日主透干支援，感情能量回升', new_stability: 'stable', is_activated: true, event_type: '进财', auspice_direction: '有利', verdict_text: '辛亥年透干激活日主壬水，财星获能量补充，感情回暖，关系有进展。' }),
  makeTW(2032, '壬', '子', '沐浴', 0.72,
    [
      { type: '冲动', target_pillar: '日', description: '子午冲，财星（午·日支）被流年子冲动，婚宫激烈振荡', effective_strength: 0.68, vigor_check: { trigger_vigor: 0.72, target_vigor: 0.4, is_effective: true, direction: '有利' } },
      { type: '合动', target_pillar: '时', description: '壬与时干丙合，才星时柱被合绊', effective_strength: 0.30, vigor_check: { trigger_vigor: 0.72, target_vigor: 0.38, is_effective: false, direction: '不利' } },
    ],
    { base_state: '才/财·开墓底盘', state_change: '财星宫位被强冲，婚宫动荡，事件落地', new_stability: 'dynamic', is_activated: true, event_type: '婚姻落定', auspice_direction: '有利', verdict_text: '壬子年子午强冲，婚宫振荡最为激烈，结合甲戌大运开墓场，为第二大婚缘窗口。' }),
  makeTW(2033, '癸', '丑', '墓', 0.38,
    [{ type: '开墓库', target_pillar: '年', description: '丑为水木墓，癸丑年财星入墓，感情机缘收束封藏', effective_strength: 0.35, vigor_check: { trigger_vigor: 0.38, target_vigor: 0.35, is_effective: false, direction: '不利' } }],
    { base_state: '才/财·开墓底盘', state_change: '财星入墓，感情窗口封藏', new_stability: 'buried', is_activated: false, event_type: '静止', auspice_direction: '不利', verdict_text: '癸丑年财星入墓，2033须规避重大感情决策。' }),
]

const MULTI_DAYUN_GROUPS = [
  {
    dayunImpact: DAYUN_IMPACT,
    label: '甲子 2019–2029',
    windows: TIMING_WINDOWS,
  },
  {
    dayunImpact: DAYUN_2_IMPACT,
    label: '甲戌 2030–2039',
    windows: TIMING_WINDOWS_2,
  },
]

// ══════════════════════════════════════════════════════════════
// 案例 2：辛亥日 女命 / 问事业升迁
// 四柱：戊午 / 癸卯 / 辛亥 / 甲午
// 日主：辛金  官星：丙火（正官）  杀星：丁火（七杀）
// 大运：甲午（2022–2032）
// 目标十神：正官（丙，年干·戊午年天干位置无丙→丙在流年引动）
//           七杀（丁，月柱藏干·癸卯月→排除 hidden）
// 实际可见十神位置：年柱戊干（正印）、月柱癸干（食神）→ 官星藏于流年
// 简化处理：官星出现在「年柱流年干位」，targetMap 用年柱
// ══════════════════════════════════════════════════════════════

// 大运甲午：甲木为辛金之正财，午为丁火（七杀）之地，午中丁藏干
const CAREER_DAYUN = {
  gan: '甲', zhi: '午',
  twelve_phase: '死',
  trigger_vigor: 0.55,
  gaitou_jiejiao: 'gaitou', // 甲盖头（天干克地支属性）
  gaitou_jiejiao_note: '甲木（财）盖头午火（官杀之地），财生官受甲木吸引，官星能量被财星截流，需流年直接引动',
  field_type: '引动场（透干显现）',
  mechanisms: [
    {
      type: '透干引动',
      target_pillar: '年',
      description: '甲透干与年柱天干同类，为官星（丙火）营造财生官的间接生发场',
      effective_strength: 0.48,
      vigor_check: { trigger_vigor: 0.55, target_vigor: 0.32, is_effective: true, direction: '有利' },
    },
  ],
  activates_target: false,
}

// targetMap：官星（丙·正官）在流年天干引动年柱，七杀（丁）藏于午中
// 简化：将年柱标记为官星目标，时柱标记为杀星位置
const CAREER_TARGET_MAP = {
  '年': [{ kind: 'shishen', name: '官' }],
  '时': [{ kind: 'shishen', name: '杀' }],
}

function makeCW(year, gan, zhi, phase, vigor, mechs, trigger) {
  return {
    year,
    ganzhi: gan + zhi,
    dynamicReport: {
      dayun_impact: CAREER_DAYUN,
      liunian_impact: { gan, zhi, twelve_phase: phase, trigger_vigor: vigor, gaitou_jiejiao: 'neutral', mechanisms: mechs, activates_target: trigger.is_activated },
      target_trigger: trigger,
      dynamic_verdict: '',
    },
    verdict: trigger.verdict_text ?? '',
  }
}

const CAREER_WINDOWS = [
  makeCW(2024, '甲', '辰', '养', 0.42,
    [
      { type: '合而不化', target_pillar: '年', description: '甲与年干戊合土（合而不化），官星通道被财星羁绊，升迁机缘受阻', effective_strength: 0.38, vigor_check: { trigger_vigor: 0.42, target_vigor: 0.32, is_effective: true, direction: '不利' } },
    ],
    { base_state: '官星：藏于流年，底盘偏弱', state_change: '官星通道被合绊，升迁受外部干扰', new_stability: 'buried', is_activated: false, event_type: '静止', auspice_direction: '不利', verdict_text: '甲辰年财官路被合绊，不宜主动推进晋升，适合打基础。' }),

  makeCW(2025, '乙', '巳', '胎', 0.51,
    [
      { type: '透干引动', target_pillar: '时', description: '巳中含丙火，透干引动时柱甲午（时干甲生巳中丙），七杀（丁）隐约获能', effective_strength: 0.47, vigor_check: { trigger_vigor: 0.51, target_vigor: 0.38, is_effective: true, direction: '有利' } },
    ],
    { base_state: '官星：藏于流年，底盘偏弱', state_change: '七杀隐性引动，职场竞争加剧，需主动出击', new_stability: 'dynamic', is_activated: true, event_type: '动荡', auspice_direction: '中性', verdict_text: '乙巳年七杀透出，职场竞争加剧，有望争取到晋升机会，但需付出较大努力。' }),

  makeCW(2026, '丙', '午', '帝旺', 0.45,
    [
      { type: '伏吟', target_pillar: '时', description: '午与时支午伏吟，七杀（丁）叠压自激，伤官见官迹象出现，升迁受阻', effective_strength: 0.43, vigor_check: { trigger_vigor: 0.45, target_vigor: 0.38, is_effective: true, direction: '不利' } },
    ],
    { base_state: '官星：藏于流年，底盘偏弱', state_change: '伏吟自叠，官杀内耗，职场关系紧张', new_stability: 'damaged', is_activated: true, event_type: '动荡', auspice_direction: '不利', verdict_text: '丙午年伏吟，职场能量内耗，不适合主动争取晋升，以防犯小人。' }),

  makeCW(2027, '丁', '未', '冠带', 0.82,
    [
      { type: '透干引动', target_pillar: '年', description: '丁透干，正官（丙）之兄弟星（七杀→正官方向），官星通道全面打开', effective_strength: 0.78, vigor_check: { trigger_vigor: 0.82, target_vigor: 0.32, is_effective: true, direction: '有利' } },
      { type: '合动', target_pillar: '时', description: '未与时支午半合火局，七杀（丁）力量聚集，官场能量爆发', effective_strength: 0.62, vigor_check: { trigger_vigor: 0.82, target_vigor: 0.38, is_effective: true, direction: '有利' } },
    ],
    { base_state: '官星：藏于流年，底盘偏弱', state_change: '官星透干+七杀合局，升迁能量最强', new_stability: 'strong', is_activated: true, event_type: '升迁', auspice_direction: '有利', verdict_text: '丁未年正印透干（月令癸印护官），官星通道全面激活，职场贵人助力，为近年升迁最强窗口。' }),

  makeCW(2028, '戊', '申', '长生', 0.66,
    [
      { type: '冲动', target_pillar: '年', description: '申与年支午六冲，官星根基受冲，能量释放且带有变动性质', effective_strength: 0.61, vigor_check: { trigger_vigor: 0.66, target_vigor: 0.32, is_effective: true, direction: '有利' } },
    ],
    { base_state: '官星：藏于流年，底盘偏弱', state_change: '官星被冲动，职场变动带来升迁契机（换岗/换公司）', new_stability: 'dynamic', is_activated: true, event_type: '升迁', auspice_direction: '有利', verdict_text: '戊申年申冲官星根基，升迁往往伴随岗位调动或公司变动，需主动把握机会。' }),

  makeCW(2029, '己', '酉', '沐浴', 0.38,
    [
      { type: '合而不化', target_pillar: '时', description: '酉与时支午合（合而不化），七杀被羁绊，官场竞争消退', effective_strength: 0.35, vigor_check: { trigger_vigor: 0.38, target_vigor: 0.38, is_effective: false, direction: '中性' } },
    ],
    { base_state: '官星：藏于流年，底盘偏弱', state_change: '七杀被合羁绊，升迁机缘收束', new_stability: 'buried', is_activated: false, event_type: '静止', auspice_direction: '中性', verdict_text: '己酉年七杀收束，职场平稳期，不宜期待重大晋升，适合巩固已有成果。' }),
]
</script>

<style scoped>
.demo-view {
  min-height: 100dvh;
  background: var(--paper);
  display: flex;
  flex-direction: column;
}

.demo-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(12px);
  flex-wrap: wrap;
}

.back {
  font-size: 13px;
  color: var(--text-muted);
  text-decoration: none;
  flex-shrink: 0;
}

.back:hover { color: var(--ink-main); }

.demo-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-main);
  flex: 1;
}

.mode-tabs {
  display: flex;
  gap: 6px;
}

.mode-tabs button {
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid rgba(181,141,59,0.25);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all .15s;
  font-family: var(--font-serif);
}

.mode-tabs button:hover { color: var(--ink-main); border-color: rgba(181,141,59,0.5); }
.mode-tabs button.active {
  background: rgba(181,141,59,0.12);
  border-color: rgba(181,141,59,0.45);
  color: var(--gold);
  font-weight: 600;
}

.demo-main {
  flex: 1;
  padding: 20px 16px 40px;
  max-width: 540px;
  margin: 0 auto;
  width: 100%;
}

.demo-case {
  font-size: 11.5px;
  color: var(--text-muted);
  margin: 0 0 16px;
  line-height: 1.7;
  padding: 8px 12px;
  background: rgba(181,141,59,0.05);
  border-radius: 7px;
  border: 1px solid rgba(181,141,59,0.12);
}
</style>
