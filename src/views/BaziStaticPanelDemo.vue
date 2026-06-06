<template>
  <div class="demo-view">
    <header class="demo-header">
      <router-link class="back" to="/">← 返回</router-link>
      <span class="demo-title">BaziStaticPanel · 原局底盘组件</span>
    </header>
    <main class="demo-main">
      <BaziStaticPanel
        :matrix="DEMO_MATRIX"
        :state-report="DEMO_REPORT"
        :target-spec="DEMO_TARGET"
        shishen-theory="男命看正财、偏财为妻星，正财为原配，偏财为情缘与流动感情"
        gongwei-theory="日支为妻宫，宫位状态反映婚姻关系的稳定性与承载力"
      />
    </main>
  </div>
</template>

<script setup>
import BaziStaticPanel from '../components/BaziStaticPanel.vue'

// ── 男命壬午日 婚恋感情 case ─────────────────────────────────
// 问：今年感情运势如何，何时能结婚
// 庚辰 / 甲寅 / 壬午 / 丙申  （甲辰旬，空亡：寅卯 → 月支寅空亡）
const DEMO_MATRIX = {
  pillars: [
    { name: '年', gan: '庚', zhi: '辰', hidden_stems: ['戊','乙','癸'], is_kong: false },
    { name: '月', gan: '甲', zhi: '寅', hidden_stems: ['甲','丙','戊'], is_kong: true  },
    { name: '日', gan: '壬', zhi: '午', hidden_stems: ['丁','己'],      is_kong: false },
    { name: '时', gan: '丙', zhi: '申', hidden_stems: ['庚','壬','戊'], is_kong: false },
  ],
}

const DEMO_TARGET = {
  primary_shishen: ['正财', '偏财'],
  primary_gongwei: ['日支'],
  analysis_mode: 'both',
}

const DEMO_REPORT = {
  shishen_assessments: [
    {
      shishen: '才', pillar: '月', position: 'hidden',
      gan: '丙', zhi: '寅', element: '火',
      twelve_phase: '病', phase_score: 1, vigor: 0.1,
      is_kong: true, is_in_tomb: false, gaitou_jiejiao: 'neutral',
      relationships: [
        { type: '六冲',      effective_strength: 60, strength_tier: 'strong', clash_direction: 'loses', note: '寅与申六冲（时柱）。目标衰，被对方冲拔' },
        { type: '三刑_三字', effective_strength: 52.5, strength_tier: 'strong', clash_direction: 'loses', note: '寅刑申（时柱）' },
      ],
      status_tags: ['死绝', '空亡', '无根', '被冲', '被刑'],
      verdict: '才处病，力量极弱；且逢空亡，力量大减；寅与申六冲，被对方冲拔',
    },
    {
      shishen: '财', pillar: '日', position: 'zhi_main',
      gan: '丁', zhi: '午', element: '火',
      twelve_phase: '胎', phase_score: 2, vigor: 0.4,
      is_kong: false, is_in_tomb: false, gaitou_jiejiao: 'same',
      relationships: [],
      status_tags: [],
      verdict: '财处胎',
    },
    {
      shishen: '才', pillar: '时', position: 'gan',
      gan: '丙', zhi: '申', element: '火',
      twelve_phase: '长生', phase_score: 3, vigor: 0.38,
      is_kong: false, is_in_tomb: false, gaitou_jiejiao: 'gaitou',
      relationships: [
        { type: '六冲',     effective_strength: 60, strength_tier: 'strong',   clash_direction: 'wins',  note: '申与寅六冲（月柱）。目标旺，冲动对方' },
        { type: '天干相克', effective_strength: 30, strength_tier: 'moderate', clash_direction: 'loses', note: '壬（水）克丙（火）（日柱）' },
      ],
      status_tags: ['长生', '盖头', '冲他支'],
      verdict: '才处长生，气势充盈；盖头（吉凶减半）；申与寅六冲，冲动对方',
    },
  ],
  gongwei_assessments: [{
    gongwei: '日支', pillar_name: '日', zhi: '午', element: '火',
    twelve_phase_for_dayStem: '胎', vigor: 0.4,
    is_kong: false, seat_shishen: '财', seat_element: '火',
    is_correct_star: true, is_hostile_occupied: false, is_tomb_for_target: false,
    relationships: [
      { type: '半三合', effective_strength: 11, strength_tier: 'weak', note: '午寅半合火（缺戌，合力减半）' },
    ],
    status_tags: ['星宫得正', '宫位稳固'],
    verdict: '日支（午）星宫得正，目标十神居于本位，力量加倍；宫位安静稳固',
  }],
  extra_checks: [],
  overall_stability: 'dynamic',
  stability_label: '动荡不稳',
  base_state: '才（月柱）：死绝/空亡/被冲。才（时柱）：长生/盖头。日支：星宫得正',
  favorable_wuxing: ['木', '火'],
  unfavorable_wuxing: ['金', '土'],
  geju: '食神格（月令寅木，甲木食神透干，寅中又藏甲）',
  tiaohou: '寅月初春，木旺水弱，调候需丙丁火温暖，忌金水过旺',
}
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
}

.back {
  font-size: 13px;
  color: var(--gold);
  text-decoration: none;
  font-family: var(--font-serif);
  flex-shrink: 0;
}

.demo-title {
  font-size: 13px;
  color: var(--text-muted);
  font-family: var(--font-serif);
  letter-spacing: .04em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demo-main {
  flex: 1;
  padding: 20px 16px 40px;
  max-width: 480px;
  margin: 0 auto;
  width: 100%;
}
</style>
