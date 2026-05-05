<template>
  <div class="fortune-view">
    <header class="page-header">
      <div class="header-title">天机日运</div>
      <OpenSourceLinks class="header-source-links" />
    </header>

    <div class="page-wrap">
      <div class="container">
        <div v-if="showProfileSwitcher" class="glass-card profile-switch-card">
          <div class="profile-switcher" :class="{ open: isProfileMenuOpen }">
            <button class="profile-switch-trigger" @click="toggleProfileMenu">
              <span class="profile-switch-name">{{ activeProfileName }}</span>
              <span class="profile-switch-symbol" aria-hidden="true">⇄</span>
            </button>
            <div v-if="isProfileMenuOpen" class="profile-flyout">
              <button
                v-for="profile in baziProfiles"
                :key="profile.id"
                class="profile-flyout-item"
                :class="{ active: profile.id === selectedProfileId }"
                @click="selectProfile(profile.id)"
              >
                <span class="profile-item-main">{{ profile.name }}</span>
                <span class="profile-item-date">{{ formatSolarDate(profile.birth_date) }}</span>
                <span class="profile-item-meta">{{ profileMetaText(profile) }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="dimension-tabs glass-card">
          <button
            v-for="tab in tabs" :key="tab.value"
            :class="['tab-btn', { active: currentTab === tab.value }]"
            @click="currentTab = tab.value"
          >{{ tab.label }}</button>
        </div>

        <div v-if="currentTab === 'day'" class="tab-content">

          <div class="date-scroll-container day-scroll-container">
            <div
              v-for="day in availableDays" :key="day.fullDate"
              :class="['date-item', { active: selectedDate === day.fullDate }]"
              @click="selectDate(day.fullDate)"
            >
              <span class="day-of-week">{{ day.weekDay }}</span>
              <span class="date-num">{{ day.dateNum }}</span>
            </div>
          </div>

          <transition name="fade" mode="out-in">
            <div v-if="isLoading" class="glass-card loading-state">
              <div class="bagua-ring-wrap">
                <svg class="bagua-svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="60" cy="60" r="56" stroke="rgba(212,175,55,0.15)" stroke-width="1" fill="none"/>
                  <circle cx="60" cy="60" r="36" stroke="rgba(212,175,55,0.35)" stroke-width="1.5" fill="none" stroke-dasharray="8 6"/>
                </svg>
              </div>
              <div class="loader-text-block">天机推演中...</div>
            </div>

            <div v-else-if="fortuneData" class="fortune-display">

              <!-- ═══ 1. Score Dashboard ═══ -->
              <div class="glass-card score-dashboard">
                <div class="score-main">
                  <div class="score-ring" :style="scoreRingStyle">
                    <div class="score-inner">
                      <span class="score-value">{{ fortuneData.day_score || 0 }}</span>
                      <span class="score-unit">分</span>
                    </div>
                  </div>
                  <div class="score-side">
                    <div class="score-ganzhi">{{ fortuneGanzhiText }}</div>
                    <template v-if="!hasInterpretationContent && isInterpretationLoading">
                      <div class="daily-score-skeleton" aria-live="polite">
                        <div class="skeleton-line skeleton-highlight"></div>
                        <div class="skeleton-line skeleton-highlight short"></div>
                      </div>
                    </template>
                    <p v-else :class="['score-insight', { muted: isInterpretationLoading && !hasInterpretationContent }]">
                      {{ hasInterpretationContent ? (fortuneData.day_insight || '平稳度日，顺势而为') : interpretationPlaceholder }}
                    </p>
                    <div v-if="fortuneData.day_warning" class="warning-tag inline-warning">⚠️ {{ fortuneData.day_warning }}</div>
                    <div v-else-if="interpretationError" class="hint-text error inline-hint">{{ interpretationError }}</div>
                  </div>
                </div>
              </div>

              <div v-if="isGuest" class="glass-card guest-score-note">
                访客模式仅展示今日日运得分。登录后可查看完整断语、开运指南与多日趋势。
              </div>

              <template v-if="!isGuest">
              <!-- ═══ 2. Four Fortune Grid ═══ -->
              <div class="fortune-grid">
                <div v-for="item in fortuneGridItems" :key="item.key" class="fortune-grid-card">
                  <div class="grid-card-header">
                    <span class="grid-card-icon">{{ item.icon }}</span>
                    <span class="grid-card-label">{{ item.label }}</span>
                  </div>
                  <template v-if="!hasInterpretationContent && isInterpretationLoading">
                    <div class="daily-grid-skeleton">
                      <div class="skeleton-line skeleton-highlight"></div>
                      <div class="skeleton-line skeleton-highlight short"></div>
                    </div>
                  </template>
                  <p v-else :class="['grid-card-text', { muted: !hasInterpretationContent }]">
                    {{ hasInterpretationContent ? (fortuneData[item.key] || '暂无') : '生成中...' }}
                  </p>
                </div>
              </div>

              <!-- ═══ 3. Guide + Timeline ═══ -->
              <div class="glass-card info-card">
                <h3 class="card-title"><span>🧭</span> 行事指南</h3>
                <template v-if="!hasInterpretationContent && isInterpretationLoading">
                  <div class="daily-info-skeleton">
                    <div class="daily-guide-skeleton-row">
                      <div class="daily-guide-skeleton-label skeleton-pill"></div>
                      <div class="daily-guide-skeleton-content">
                        <div class="skeleton-line skeleton-highlight"></div>
                        <div class="skeleton-line skeleton-highlight short"></div>
                      </div>
                    </div>
                    <div class="daily-guide-skeleton-row mt-2">
                      <div class="daily-guide-skeleton-label skeleton-pill"></div>
                      <div class="daily-guide-skeleton-content">
                        <div class="skeleton-line skeleton-highlight"></div>
                        <div class="skeleton-line skeleton-highlight short"></div>
                      </div>
                    </div>
                    <hr class="guide-divider" />
                    <div class="timeline-title">⏰ 今日吉时</div>
                    <div class="daily-timeline-skeleton">
                      <div class="daily-timeline-skeleton-item">
                        <div class="timeline-dot"></div>
                        <div class="daily-timeline-skeleton-copy">
                          <div class="skeleton-line skeleton-highlight short"></div>
                          <div class="skeleton-line skeleton-highlight"></div>
                        </div>
                      </div>
                      <div class="daily-timeline-skeleton-item">
                        <div class="timeline-dot"></div>
                        <div class="daily-timeline-skeleton-copy">
                          <div class="skeleton-line skeleton-highlight short"></div>
                          <div class="skeleton-line skeleton-highlight"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div class="guide-row">
                    <span class="guide-label good">宜</span>
                    <span :class="['guide-content', { muted: !hasInterpretationContent }]">
                      {{ hasInterpretationContent ? formatGuide(fortuneData.day_guide, '宜') : '断语生成中...' }}
                    </span>
                  </div>
                  <div class="guide-row mt-2">
                    <span class="guide-label bad">忌</span>
                    <span :class="['guide-content', { muted: !hasInterpretationContent }]">
                      {{ hasInterpretationContent ? formatGuide(fortuneData.day_guide, '忌') : '稍后呈现' }}
                    </span>
                  </div>

                  <hr class="guide-divider" />
                  <div class="timeline-title">⏰ 今日吉时</div>
                  <div class="timeline" v-if="luckyHours.length">
                    <div v-for="(h, i) in luckyHours" :key="i" class="timeline-item">
                      <div class="timeline-dot"></div>
                      <div class="timeline-hour">{{ h.hour }}</div>
                      <div class="timeline-tip">{{ h.tip }}</div>
                    </div>
                  </div>
                  <div v-else class="timeline-tip" style="padding-left:4px;">吉时信息生成中...</div>
                </template>
              </div>

              <!-- ═══ 4. Lucky Grid ═══ -->
              <div class="glass-card info-card">
                <h3 class="card-title"><span>💡</span> 开运密码</h3>
                <template v-if="!hasInterpretationContent && isInterpretationLoading">
                  <div class="lucky-grid daily-lucky-skeleton">
                    <div v-for="cell in 4" :key="cell" class="lucky-cell">
                      <div class="skeleton-line skeleton-highlight short"></div>
                      <div class="skeleton-line skeleton-highlight"></div>
                    </div>
                  </div>
                </template>
                <div v-else class="lucky-grid">
                  <div class="lucky-cell">
                    <span class="lucky-cell-label">幸运数字</span>
                    <span class="lucky-cell-value">{{ luckyNumberText }}</span>
                  </div>
                  <div class="lucky-cell">
                    <span class="lucky-cell-label">五行喜用</span>
                    <span class="lucky-cell-value">{{ fortuneData.lucky_element || '-' }}</span>
                  </div>
                  <div class="lucky-cell">
                    <span class="lucky-cell-label">幸运色彩</span>
                    <div :class="['color-display', { muted: !hasInterpretationContent }]">
                      <span class="color-dot" :style="{ backgroundColor: fortuneData.lucky_color_hex || '#CCC' }"></span>
                      {{ hasInterpretationContent ? (fortuneData.lucky_color || '-') : '生成中' }}
                    </div>
                  </div>
                  <div class="lucky-cell">
                    <span class="lucky-cell-label">贵人方位</span>
                    <span class="lucky-cell-value">{{ luckyDirectionShort }}</span>
                  </div>
                </div>
              </div>

              <!-- ═══ 5. Resolve Tip ═══ -->
              <div v-if="hasInterpretationContent && fortuneData.resolve_tip" class="glass-card resolve-card">
                <div class="resolve-title"><span class="resolve-icon">🌿</span> 旺运秘诀</div>
                <p class="resolve-text">{{ fortuneData.resolve_tip }}</p>
              </div>

              <!-- ═══ 6. Hook Teaser ═══ -->
              <div v-if="hasInterpretationContent && fortuneData.hook_teaser" class="glass-card hook-card">
                <div class="hook-title"><span class="hook-icon">🔮</span> 明日预告</div>
                <p class="hook-text">{{ fortuneData.hook_teaser }}</p>
              </div>
              </template>

            </div>
          </transition>
        </div>

        <div v-else-if="currentTab === 'month'" class="tab-content">
          <div ref="monthScrollerRef" class="date-scroll-container month-scroll-container">
            <div
              v-for="monthItem in availableMonths"
              :key="monthItem.key"
              :class="['date-item', 'month-item', { active: selectedMonthKey === monthItem.key }]"
              :title="monthItem.rangeText || monthItem.label"
              @click="selectMonth(monthItem.key)"
            >
              <span class="day-of-week">{{ monthItem.label }}</span>
              <span class="date-num">{{ monthItem.monthText }}</span>
            </div>
          </div>

          <transition name="fade" mode="out-in">
            <div v-if="isMonthLoading" class="glass-card loading-state">
              <div class="bagua-ring-wrap">
                <svg class="bagua-svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="60" cy="60" r="56" stroke="rgba(212,175,55,0.15)" stroke-width="1" fill="none"/>
                  <circle cx="60" cy="60" r="36" stroke="rgba(212,175,55,0.35)" stroke-width="1.5" fill="none" stroke-dasharray="8 6"/>
                </svg>
              </div>
              <div class="loader-text-block">流月推演中...</div>
            </div>

            <div v-else-if="visibleMonthlyData" class="fortune-display">
              <div class="glass-card score-dashboard">
                <div class="score-main">
                  <div class="score-ring" :style="monthlyScoreRingStyle">
                    <div class="score-inner">
                      <span class="score-value">{{ visibleMonthlyData.monthly_score || 0 }}</span>
                      <span class="score-unit">分</span>
                    </div>
                  </div>
                  <div class="score-side">
                    <div class="score-ganzhi">{{ monthlyGanzhiText }}</div>
                    <p class="score-insight">{{ visibleMonthlyData.month_zhi_relations || '无明显刑冲合害' }}</p>
                    <div v-if="visibleMonthlyData.is_kongwang" class="warning-tag inline-warning">空亡封顶</div>
                    <div v-else-if="visibleMonthlyData.has_sanxing" class="warning-tag inline-warning">三刑触发</div>
                  </div>
                </div>
              </div>

              <div class="glass-card monthly-chart-card">
                <div class="module-title-bar">
                  <h3 class="card-title compact-title"><span>✦</span> 月度曲线</h3>
                </div>
                <svg class="monthly-chart" viewBox="0 0 320 140" role="img" aria-label="月度每日分数变化曲线">
                  <line x1="12" y1="24" x2="308" y2="24" class="monthly-chart-grid" />
                  <line x1="12" y1="70" x2="308" y2="70" class="monthly-chart-grid" />
                  <line x1="12" y1="116" x2="308" y2="116" class="monthly-chart-grid" />
                  <line
                    v-if="monthlyChartAvgLineY"
                    x1="12"
                    :y1="monthlyChartAvgLineY"
                    x2="308"
                    :y2="monthlyChartAvgLineY"
                    class="monthly-chart-average"
                  />
                  <polyline
                    v-if="monthlyChartPolyline"
                    :points="monthlyChartPolyline"
                    class="monthly-chart-line"
                  />
                  <circle
                    v-for="point in monthlyChartMarkers"
                    :key="point.date"
                    :cx="point.x"
                    :cy="point.y"
                    r="3"
                    :class="['monthly-chart-dot', point.kind]"
                  />
                </svg>
                <div class="monthly-chart-meta">
                  <span>高分日 {{ visibleMonthlyData.high_score_days }}</span>
                  <span>低分日 {{ visibleMonthlyData.low_score_days }}</span>
                  <span>最佳 {{ formatMonthDay(visibleMonthlyData.best_date) }}</span>
                </div>
              </div>

              <div class="glass-card info-card">
                <div class="module-title-bar">
                  <h3 class="card-title compact-title"><span>✦</span> 流月节律</h3>
                </div>
                <div class="monthly-detail-row">
                  <span class="monthly-detail-label">月令五行</span>
                  <span class="monthly-detail-value">{{ visibleMonthlyData.month_wuxing || '-' }} · {{ visibleMonthlyData.month_wuxing_relation || '闲' }}</span>
                </div>
                <div class="monthly-detail-row">
                  <span class="monthly-detail-label">节气</span>
                  <span class="monthly-detail-value">{{ formatList(visibleMonthlyData.jieqi_list) }}</span>
                </div>
                <div class="monthly-detail-row">
                  <span class="monthly-detail-label">低谷期</span>
                  <span class="monthly-detail-value">{{ visibleMonthlyData.has_trough ? visibleMonthlyData.trough_period : '无连续低谷' }}</span>
                </div>
                <div class="monthly-detail-row">
                  <span class="monthly-detail-label">最高/最低</span>
                  <span class="monthly-detail-value">
                    {{ formatMonthDay(visibleMonthlyData.best_date) }} {{ visibleMonthlyData.best_score }}分 /
                    {{ formatMonthDay(visibleMonthlyData.worst_date) }} {{ visibleMonthlyData.worst_score }}分
                  </span>
                </div>
              </div>

              <div class="glass-card monthly-interpretation-card">
                <div class="module-title-bar monthly-interpretation-head">
                  <h3 class="card-title compact-title">
                    <span>✦</span>
                    月度详批
                    <button type="button" class="monthly-info-btn" @click="showMonthlyFactorsGuide = true">?</button>
                  </h3>
                  <div class="monthly-head-side">
                    <span v-if="monthlyRefreshMessage" class="monthly-refresh-chip">{{ monthlyRefreshMessage }}</span>
                    <span v-if="activeMonthlyInterpretation?.interpretation_status === 'ready'" class="interpretation-ready">已生成</span>
                  </div>
                </div>
                <div class="monthly-dimension-tabs" role="tablist" aria-label="月运解读维度">
                  <button
                    v-for="item in monthlyInterpretationTabs"
                    :key="item.value"
                    type="button"
                    :class="['monthly-dimension-btn', { active: selectedMonthlyDimension === item.value }]"
                    @click="selectMonthlyDimension(item.value)"
                  >
                    {{ item.label }}
                  </button>
                </div>

                <div v-if="isMonthlyInterpretationLoading && !activeMonthlyInterpretation" class="monthly-skeleton" aria-live="polite">
                  <div class="skeleton-line skeleton-title"></div>
                  <div class="skeleton-line skeleton-highlight"></div>
                  <div class="skeleton-line skeleton-highlight short"></div>
                  <div class="skeleton-block"></div>
                  <div class="skeleton-advice">
                    <div class="skeleton-pill"></div>
                    <div class="skeleton-pill wide"></div>
                  </div>
                  <div class="skeleton-advice">
                    <div class="skeleton-pill"></div>
                    <div class="skeleton-pill wide"></div>
                  </div>
                </div>

                <div v-else-if="activeMonthlyInterpretation" class="monthly-interpretation-body">
                  <div class="monthly-interpretation-title">{{ activeMonthlyInterpretation.title }}</div>
                  <p class="monthly-interpretation-highlight">{{ activeMonthlyInterpretation.highlight }}</p>
                  <div class="monthly-interpretation-details">
                    <p v-for="(paragraph, index) in activeMonthlyDetailsParagraphs" :key="index">{{ paragraph }}</p>
                  </div>
                  <div v-if="activeMonthlyTags.length" class="monthly-tags">
                    <span v-for="tag in activeMonthlyTags" :key="tag">{{ tag }}</span>
                  </div>
                  <div v-if="activeMonthlyAdvice.length" class="monthly-advice-list">
                    <div v-for="item in activeMonthlyAdvice" :key="`${item.action}-${item.description}`" class="monthly-advice-item">
                      <span class="monthly-advice-action">{{ item.action }}</span>
                      <span class="monthly-advice-desc">{{ item.description }}</span>
                    </div>
                  </div>
                </div>

                <div v-else class="monthly-interpretation-empty">
                  {{ monthlyInterpretationError || '选择一个维度，生成本月白话断语' }}
                </div>
              </div>
            </div>

            <div v-else class="glass-card placeholder-content">
              <div class="placeholder-icon">⏳</div>
              <p>{{ monthError || '流月数据暂未生成' }}</p>
            </div>
          </transition>
        </div>

        </div>

        <div v-else-if="currentTab === 'year'" class="tab-content">
          <div ref="yearScrollerRef" class="date-scroll-container month-scroll-container">
            <div
              v-for="yearItem in availableYears"
              :key="yearItem.key"
              :class="['date-item', 'month-item', { active: selectedYear === yearItem.key }]"
              @click="selectYear(yearItem.key)"
            >
              <span class="day-of-week">{{ yearItem.label }}年</span>
              <span class="date-num">{{ visibleAnnualData && visibleAnnualData.year === yearItem.yearValue ? visibleAnnualData.liunian_gz : '' }}</span>
            </div>
          </div>

          <transition name="fade" mode="out-in">
            <div v-if="isAnnualLoading" class="glass-card loading-state">
              <div class="bagua-ring-wrap">
                <svg class="bagua-svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="60" cy="60" r="56" stroke="rgba(212,175,55,0.15)" stroke-width="1" fill="none"/>
                  <circle cx="60" cy="60" r="36" stroke="rgba(212,175,55,0.35)" stroke-width="1.5" fill="none" stroke-dasharray="8 6"/>
                </svg>
              </div>
              <div class="loader-text-block">流年推演中...</div>
            </div>

            <div v-else-if="visibleAnnualData" class="fortune-display">
              <div class="glass-card score-dashboard">
                <div class="score-main">
                  <div class="score-ring" :style="{ background: `conic-gradient(var(--gold) ${Math.min(100, Math.max(0, visibleAnnualData.annual_score || 0))}%, rgba(255,255,255,0.05) 0deg)` }">
                    <div class="score-inner">
                      <span class="score-value">{{ visibleAnnualData.annual_score || 0 }}</span>
                      <span class="score-unit">分</span>
                    </div>
                  </div>
                  <div class="score-side">
                    <div class="score-ganzhi">{{ visibleAnnualData.liunian_gz }}年</div>
                    <p class="score-insight">{{ visibleAnnualData.suiyun_relations || '平稳度日' }}</p>
                    <div v-if="visibleAnnualData.is_kongwang" class="warning-tag inline-warning">空亡封顶</div>
                    <div v-else-if="visibleAnnualData.is_benmingnian" class="warning-tag inline-warning">本命年</div>
                    <div v-else-if="visibleAnnualData.is_zixing" class="warning-tag inline-warning">自刑</div>
                    <div v-else-if="visibleAnnualData.liunian_sanxing" class="warning-tag inline-warning">流年三刑</div>
                  </div>
                </div>
              </div>
              
              <div class="glass-card info-card">
                <div class="module-title-bar">
                  <h3 class="card-title compact-title"><span>✦</span> 岁运简批</h3>
                </div>
                <div class="monthly-detail-row">
                  <span class="monthly-detail-label">流年十神</span>
                  <span class="monthly-detail-value">{{ visibleAnnualData.liunian_gan_shishen }}</span>
                </div>
                <div class="monthly-detail-row">
                  <span class="monthly-detail-label">大运背景</span>
                  <span class="monthly-detail-value">{{ visibleAnnualData.dayun_gz }}运 · {{ visibleAnnualData.dayun_qi_status }}</span>
                </div>
                <div class="monthly-detail-row">
                  <span class="monthly-detail-label">流年与原局</span>
                  <span class="monthly-detail-value">{{ visibleAnnualData.year_relations || '无特殊互动' }}</span>
                </div>
              </div>
              
            </div>

            <div v-else class="glass-card placeholder-content">
              <div class="placeholder-icon">⏳</div>
              <p>{{ annualError || '流年数据暂未生成' }}</p>
            </div>
          </transition>
        </div>

        <div v-else class="glass-card placeholder-content">
          <div class="placeholder-icon">⏳</div>
          <p>【{{ getTabLabel(currentTab) }}运】推演引擎升级中<br>敬请期待</p>
        </div>

        <Teleport to="body">
          <div v-if="showMonthlyFactorsGuide" class="fortune-modal-overlay" @click="showMonthlyFactorsGuide = false">
            <div class="fortune-guide-modal" @click.stop>
              <div class="fortune-guide-head">
                <span>这段月运文案怎么看出来的？</span>
                <button type="button" class="fortune-guide-close" @click="showMonthlyFactorsGuide = false">×</button>
              </div>
              <div class="fortune-guide-body">
                <div v-for="item in monthlyInterpretationFactors" :key="item.title" class="fortune-guide-item">
                  <div class="fortune-guide-item-title">{{ item.title }}</div>
                  <div class="fortune-guide-item-copy">
                    {{ item.copy }}
                    <button
                      v-if="item.title === '你的现实背景'"
                      type="button"
                      class="fortune-guide-link"
                      @click="openMonthlyContextNotes"
                    >
                      去填写基调
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Teleport>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createClient } from '@supabase/supabase-js'
import { globalState } from '../store.js'
import { getGuestState, recordGuestFortuneViewed, trackGuestEvent } from '../guestMode.mjs'
import {
  clearMonthlyInterpretationRefresh,
  clearPendingInterpretation,
  getPendingInterpretation,
  loadCachedFortune as loadSharedCachedFortune,
  peekMonthlyInterpretationRefresh,
  rememberFortuneCache as rememberSharedFortuneCache,
  rememberPendingInterpretation
} from '../fortuneCache.mjs'
import { getFlowMonthInfo as getClientFlowMonthInfo, listFlowMonths as listClientFlowMonths } from '../utils/flowMonth.js'
import guestFortuneData from '../../mock/fortune-daily.json'
import OpenSourceLinks from '../components/OpenSourceLinks.vue'

const SUPABASE_URL = 'https://xkbqiiwwgfzkyfhxuoev.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_qr9YBIA6n32r-mcqKbkpgA_0XVTUSI7'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const route = useRoute()
const router = useRouter()

const tabs = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
  { label: '年', value: 'year' }
]
const currentTab = ref('day')
const availableDays = ref([])
const availableMonths = ref([])
const availableYears = ref([])
const selectedDate = ref('')
const selectedMonth = ref('')
const selectedYear = ref('')
const fortuneData = ref(null)
const monthlyData = ref(null)
const annualDataList = ref([])
const monthlyDataKey = ref('')
const isLoading = ref(false)
const isMonthLoading = ref(false)
const isAnnualLoading = ref(false)
const isInterpretationLoading = ref(false)
const interpretationError = ref('')
const monthError = ref('')
const annualError = ref('')
const requestSerial = ref(0)
const monthRequestSerial = ref(0)
const annualRequestSerial = ref(0)
const baziProfiles = ref([])
const selectedProfileId = ref('')
const isProfileMenuOpen = ref(false)
const monthScrollerRef = ref(null)
const yearScrollerRef = ref(null)
const isGuest = computed(() => globalState.isGuest)

const fortuneGridItems = [
  { key: 'career_insight', icon: '💼', label: '事业运' },
  { key: 'wealth_insight', icon: '💰', label: '财富运' },
  { key: 'love_insight',   icon: '💕', label: '感情运' },
  { key: 'health_insight', icon: '🏃', label: '健康运' },
]

const monthlyInterpretationTabs = [
  { label: '综合', value: 'overall' },
  { label: '事业', value: 'career' },
  { label: '财运', value: 'wealth' },
  { label: '感情', value: 'love' },
]

const monthlyInterpretationFactors = [
  {
    title: '流月本身',
    copy: '看这个月的干支五行，对你是助力还是压力。',
  },
  {
    title: '和原局、岁运的关系',
    copy: '看它和你的原局、大运、流年之间，是顺势承接，还是有冲撞波动。',
  },
  {
    title: '月内节奏',
    copy: '看这个月高分日、低谷期、节气前后，哪些时间更适合推进，哪些时间更适合放缓。',
  },
  {
    title: '神煞与结构信号',
    copy: '会参考贵人、文昌、驿马、月德等辅助信号，但不会只靠单一神煞下结论。',
  },
  {
    title: '你的现实背景',
    copy: '如果你填写了长期基调和本月现状，系统会把命理信号落到更贴近你当下的处境里，比如工作、感情、财务或生活状态。',
  },
]
const monthlyRefreshMessage = computed(() => {
  if (monthlyRefreshState.value === 'refreshing') return '检测到基调有较大更新，正在刷新本月详批…'
  if (monthlyRefreshState.value === 'updated') return '本月详批已按最新基调刷新'
  if (monthlyRefreshState.value === 'pending') return '基调有明显更新，进入月运时会自动刷新详批'
  return ''
})

const selectedMonthlyDimension = ref('overall')
const monthlyInterpretations = ref({})
const isMonthlyInterpretationLoading = ref(false)
const monthlyInterpretationError = ref('')
const monthlyInterpretationSerial = ref(0)
const monthlyRefreshSignal = ref(null)
const monthlyRefreshState = ref('idle')
const showMonthlyFactorsGuide = ref(false)

const hasInterpretationFields = (data) => {
  return Boolean(
    data?.day_insight && data?.career_insight && data?.wealth_insight
    && data?.love_insight && data?.health_insight && data?.hook_teaser
  )
}

const hasInterpretationContent = computed(() => hasInterpretationFields(fortuneData.value))
const showProfileSwitcher = computed(() => baziProfiles.value.length > 0)
const activeProfile = computed(() => baziProfiles.value.find(profile => profile.id === selectedProfileId.value) || null)
const activeProfileName = computed(() => activeProfile.value?.name || '命主未设')
const currentProfileCacheKey = computed(() => selectedProfileId.value || '')
const fortuneGanzhiText = computed(() => {
  if (!fortuneData.value) return '-'
  const month = fortuneData.value.month_gz ? `${fortuneData.value.month_gz}月` : ''
  const day = fortuneData.value.day_gz ? `${fortuneData.value.day_gz}日` : ''
  return `${month} ${day}`.trim() || '-'
})

const interpretationPlaceholder = computed(() => (
  isInterpretationLoading.value ? '断语生成中，分数已先行呈现' : '断语稍后呈现'
))

const scoreRingStyle = computed(() => {
  const score = fortuneData.value?.day_score || 0
  const pct = Math.min(100, Math.max(0, score))
  return { background: `conic-gradient(var(--gold) ${pct}%, rgba(255,255,255,0.05) 0deg)` }
})

const selectedMonthKey = computed(() => {
  if (selectedMonth.value) return selectedMonth.value
  return getClientFlowMonthInfo().key
})

const visibleMonthlyData = computed(() => (
  monthlyData.value && monthlyDataKey.value === selectedMonthKey.value ? monthlyData.value : null
))

const visibleAnnualData = computed(() => {
  if (!annualDataList.value || !annualDataList.value.length) return null
  return annualDataList.value.find(y => String(y.year) === selectedYear.value) || null
})

const activeMonthlyInterpretation = computed(() => (
  monthlyInterpretations.value[selectedMonthlyDimension.value] || null
))

const activeMonthlyDetailsParagraphs = computed(() => {
  const details = activeMonthlyInterpretation.value?.details || ''
  return details.split(/\n{2,}/).map(item => item.trim()).filter(Boolean)
})

const activeMonthlyTags = computed(() => {
  const tags = activeMonthlyInterpretation.value?.tags
  return Array.isArray(tags) ? tags.slice(0, 3) : []
})

const activeMonthlyAdvice = computed(() => {
  const advice = activeMonthlyInterpretation.value?.advice
  return Array.isArray(advice) ? advice.slice(0, 3) : []
})

const monthlyScoreRingStyle = computed(() => {
  const score = visibleMonthlyData.value?.monthly_score || 0
  const pct = Math.min(100, Math.max(0, score))
  return { background: `conic-gradient(var(--gold) ${pct}%, rgba(255,255,255,0.05) 0deg)` }
})

const monthlyGanzhiText = computed(() => {
  if (!visibleMonthlyData.value) return '-'
  const gz = visibleMonthlyData.value.flow_month_label || (visibleMonthlyData.value.month_gz ? `${visibleMonthlyData.value.month_gz}月` : '')
  const range = visibleMonthlyData.value.flow_month_range_label || ''
  return [gz, range].filter(Boolean).join(' · ') || '-'
})

const mapMonthlyChartPoint = (item, index, total) => {
  const x = total <= 1 ? 160 : 12 + (index / (total - 1)) * 296
  const score = Math.min(98, Math.max(45, Number(item.score) || 45))
  const y = 116 - ((score - 45) / 53) * 92
  return {
    date: item.date,
    score,
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
  }
}

const monthlyChartPoints = computed(() => {
  const points = visibleMonthlyData.value?.daily_score_points
  if (!Array.isArray(points) || points.length === 0) return []
  return points.map((item, index) => mapMonthlyChartPoint(item, index, points.length))
})

const monthlyChartPolyline = computed(() => monthlyChartPoints.value.map(point => `${point.x},${point.y}`).join(' '))

const monthlyChartAvgLineY = computed(() => {
  const avg = visibleMonthlyData.value?.avg_daily_score
  if (!Number.isFinite(avg)) return 0
  return Math.round((116 - ((Math.min(98, Math.max(45, avg)) - 45) / 53) * 92) * 10) / 10
})

const monthlyChartMarkers = computed(() => {
  const points = monthlyChartPoints.value
  if (points.length === 0) return []
  const bestDate = visibleMonthlyData.value?.best_date
  const worstDate = visibleMonthlyData.value?.worst_date
  const stride = Math.max(1, Math.ceil(points.length / 8))
  return points
    .filter((point, index) => index % stride === 0 || point.date === bestDate || point.date === worstDate || index === points.length - 1)
    .map(point => ({
      ...point,
      kind: point.date === bestDate ? 'best' : point.date === worstDate ? 'worst' : 'normal',
    }))
})

const luckyHours = computed(() => {
  const hours = fortuneData.value?.lucky_hours
  return Array.isArray(hours) ? hours : []
})

const luckyNumberText = computed(() => {
  const nums = fortuneData.value?.lucky_number
  return Array.isArray(nums) && nums.length ? nums.join('、') : '-'
})

const luckyDirectionShort = computed(() => {
  const dir = fortuneData.value?.lucky_direction || ''
  return dir.split('——')[0] || '-'
})

const normalizeDateString = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? match[0] : ''
}

const buildDayItem = (dateStr, label = '所选') => {
  const target = new Date(`${dateStr}T12:00:00`)
  const weekMap = ['日', '一', '二', '三', '四', '五', '六']
  return {
    fullDate: dateStr,
    dateNum: String(target.getDate()).padStart(2, '0'),
    weekDay: label || `周${weekMap[target.getDay()]}`
  }
}

const generateDays = (preferredDate = '') => {
  const days = []
  const weekMap = ['日', '一', '二', '三', '四', '五', '六']
  const today = new Date()
  const dayCount = isGuest.value ? 1 : 7
  for (let i = 0; i < dayCount; i++) {
    const target = new Date(today)
    target.setDate(today.getDate() + i)
    const year = target.getFullYear()
    const month = String(target.getMonth() + 1).padStart(2, '0')
    const date = String(target.getDate()).padStart(2, '0')
    days.push({
      fullDate: `${year}-${month}-${date}`,
      dateNum: date,
      weekDay: i === 0 ? '今日' : `周${weekMap[target.getDay()]}`
    })
  }
  const normalizedPreferred = normalizeDateString(preferredDate)
  if (normalizedPreferred && !days.some(day => day.fullDate === normalizedPreferred)) {
    days.unshift(buildDayItem(normalizedPreferred))
  }
  availableDays.value = days
  selectedDate.value = normalizedPreferred || days[0].fullDate
}

const generateMonths = () => {
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const months = listClientFlowMonths(todayKey, 6, 24)
    .map((monthItem, index) => ({
      key: monthItem.key,
      label: index === 6 ? '本月' : monthItem.shortRangeLabel,
      monthText: monthItem.label,
      rangeText: monthItem.rangeLabel,
      contextMonthKey: monthItem.contextMonthKey,
    }))
  availableMonths.value = months
  selectedMonth.value = getClientFlowMonthInfo().key
  scrollSelectedMonthIntoView()
}

const generateYears = () => {
  const currentY = new Date().getFullYear()
  const years = []
  for (let y = currentY - 10; y <= currentY + 10; y++) {
    years.push({ key: String(y), label: String(y), yearValue: y })
  }
  availableYears.value = years
  selectedYear.value = String(currentY)
  scrollSelectedYearIntoView()
}

const scrollSelectedYearIntoView = () => {
  nextTick(() => {
    if (!yearScrollerRef.value) return
    const activeEl = yearScrollerRef.value.querySelector('.date-item.active')
    if (activeEl) {
      const containerWidth = yearScrollerRef.value.clientWidth
      const elLeft = activeEl.offsetLeft
      const elWidth = activeEl.clientWidth
      yearScrollerRef.value.scrollTo({ left: elLeft - containerWidth / 2 + elWidth / 2, behavior: 'smooth' })
    }
  })
}

const selectYear = (key) => {
  if (selectedYear.value === key) return
  selectedYear.value = key
  scrollSelectedYearIntoView()
}

const getTabLabel = (val) => tabs.find(t => t.value === val)?.label

const formatSolarDate = (value) => {
  if (!value) return '阳历待确认'
  const p = String(value).match(/\d+/g)
  if (!p || p.length < 3) return '阳历待确认'
  return `${p[0]}.${p[1].padStart(2, '0')}.${p[2].padStart(2, '0')}`
}

const profileMetaText = (profile) => {
  const parts = [profile.gender === 'M' ? '乾造' : '坤造']
  if (profile.is_default) parts.push('默认')
  return parts.join(' · ')
}

const formatGuide = (guideStr, type) => {
  if (!guideStr) return '无特殊忌讳'
  const parts = guideStr.split('；')
  if (type === '宜' && parts[0]) return parts[0].replace('宜', '').trim()
  if (type === '忌' && parts[1]) return parts[1].replace('忌', '').trim()
  return guideStr
}

const formatList = (items) => Array.isArray(items) && items.length ? items.join('、') : '-'

const formatMonthDay = (dateStr) => {
  const match = String(dateStr || '').match(/^\d{4}-(\d{2})-(\d{2})$/)
  if (!match) return '-'
  return `${Number(match[1])}月${Number(match[2])}日`
}

const getFortuneStorage = () => (typeof window === 'undefined' ? null : window.localStorage)
const syncMonthlyRefreshSignal = (profileId = currentProfileCacheKey.value, monthKey = selectedMonthKey.value) => {
  monthlyRefreshSignal.value = peekMonthlyInterpretationRefresh(getFortuneStorage(), profileId, monthKey)
  monthlyRefreshState.value = monthlyRefreshSignal.value ? 'pending' : 'idle'
}

const rememberFortuneCache = (userId, dateStr, data, profileId = '') => {
  rememberSharedFortuneCache(getFortuneStorage(), userId, dateStr, data, new Date(), profileId)
}

const loadCachedFortune = (userId, dateStr, profileId = '') => loadSharedCachedFortune(getFortuneStorage(), userId, dateStr, new Date(), profileId)

const buildGuestFortuneData = (dateStr) => ({
  ...guestFortuneData,
  solar_date: dateStr,
  profile_name: activeProfileName.value,
})

const loadGuestProfile = () => {
  const profile = getGuestState().baziProfile
  baziProfiles.value = profile ? [profile] : []
  selectedProfileId.value = profile?.id || ''
}

const fetchProfiles = async () => {
  if (isGuest.value) {
    loadGuestProfile()
    return
  }

  const { data } = await supabase.from('bazi_profiles').select('*').order('created_at', { ascending: false })
  baziProfiles.value = data || []
  const requestedProfileId = String(route.query.profileId || '')
  const matchedRequestedProfile = requestedProfileId && baziProfiles.value.find(profile => profile.id === requestedProfileId)
  if (matchedRequestedProfile) {
    selectedProfileId.value = matchedRequestedProfile.id
  } else if (!selectedProfileId.value && baziProfiles.value.length > 0) {
    const defaultProfile = baziProfiles.value.find(profile => profile.is_default) || baziProfiles.value[0]
    selectedProfileId.value = defaultProfile.id
  }
}

const toggleProfileMenu = () => {
  if (!showProfileSwitcher.value) return
  isProfileMenuOpen.value = !isProfileMenuOpen.value
}

const selectProfile = (profileId) => {
  if (!profileId || profileId === selectedProfileId.value) {
    isProfileMenuOpen.value = false
    return
  }
  selectedProfileId.value = profileId
  isProfileMenuOpen.value = false
  if (currentTab.value === 'month') {
    fetchMonthlyFortuneData()
  } else {
    fetchFortuneData(selectedDate.value)
  }
}

const handleDocumentClick = (event) => {
  const target = event.target
  if (!(target instanceof Element)) return
  if (!target.closest('.profile-switcher')) isProfileMenuOpen.value = false
}

const fetchFortuneBaseFromApi = async (dateStr, accessToken, profileId) => {
  const response = await fetch('/api/fortune-daily', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ target_date: dateStr, profile_id: profileId || undefined })
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || '推演失败')
  }
  return response.json()
}

const fetchMonthlyFortuneFromApi = async (monthKey, accessToken, profileId) => {
  const response = await fetch('/api/fortune-monthly', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ target_month: monthKey, profile_id: profileId || undefined })
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || '月运推演失败')
  }
  return response.json()
}

const fetchAnnualFortuneFromApi = async (targetYear, accessToken, profileId) => {
  const response = await fetch('/api/fortune-annual', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ target_year: targetYear, profile_id: profileId || undefined })
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || '年运推演失败')
  }
  return response.json()
}

const tryParseMonthlyInterpretation = (text) => {
  try {
    return JSON.parse(String(text || '').replace(/```json/g, '').replace(/```/g, '').trim())
  } catch {
    return null
  }
}

const extractPartialDetails = (text) => {
  const match = String(text || '').match(/"details"\s*:\s*"((?:\\.|[^"\\])*)/)
  if (!match) return ''
  try {
    return JSON.parse(`"${match[1]}"`)
  } catch {
    return match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
  }
}

const applyMonthlyInterpretationPatch = (dimension, patch) => {
  monthlyInterpretations.value = {
    ...monthlyInterpretations.value,
    [dimension]: {
      ...(monthlyInterpretations.value[dimension] || { dimension }),
      ...patch,
    },
  }
}

const parseSsePayload = (chunk) => {
  return chunk
    .split('\n')
    .filter(line => line.startsWith('data:'))
    .map(line => line.replace(/^data:\s*/, '').trim())
    .filter(Boolean)
}

const requestMonthlyInterpretation = async (monthKey, accessToken, profileId, dimension, onDetailsChunk) => {
  const response = await fetch('/api/fortune-monthly-interpretation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({ target_month: monthKey, profile_id: profileId || undefined, dimension })
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || '月运断语生成失败')
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/event-stream')) return response.json()
  const reader = response.body?.getReader?.()
  if (!reader) return response.json()

  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''

    for (const eventText of parts) {
      for (const payload of parseSsePayload(eventText)) {
        if (payload === '[DONE]') continue
        const parsed = tryParseMonthlyInterpretation(payload)
        const delta = parsed?.choices?.[0]?.delta?.content || parsed?.delta || parsed?.content || payload
        fullText += delta
        const partialDetails = extractPartialDetails(fullText)
        if (partialDetails) onDetailsChunk(partialDetails)
      }
    }
  }

  const finalJson = tryParseMonthlyInterpretation(fullText)
  if (finalJson) return finalJson
  return {
    dimension,
    details: fullText,
    title: '月度详批生成中',
    highlight: '断语已流式返回',
    tags: [],
    advice: [],
  }
}

const requestFortuneInterpretation = async (userId, dateStr, accessToken, profileId) => {
  const existingPending = getPendingInterpretation(userId, dateStr, profileId)
  if (!existingPending) {
    const pendingRequest = fetch('/api/fortune-daily-interpretation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ target_date: dateStr, profile_id: profileId || undefined })
    })
      .then(async (response) => {
        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || '断语生成失败')
        }
        return response.json()
      })
      .finally(() => clearPendingInterpretation(userId, dateStr, profileId))

    rememberPendingInterpretation(userId, dateStr, pendingRequest, profileId)
  }

  return getPendingInterpretation(userId, dateStr, profileId)
}

const fetchFortuneData = async (dateStr) => {
  const currentRequest = requestSerial.value + 1
  requestSerial.value = currentRequest
  isLoading.value = true
  isInterpretationLoading.value = false
  interpretationError.value = ''

  const optimisticUserId = globalState.currentUser?.id
  const profileId = currentProfileCacheKey.value
  if (optimisticUserId) {
    const optimisticCached = loadCachedFortune(optimisticUserId, dateStr, profileId)
    if (optimisticCached) {
      fortuneData.value = optimisticCached
      isLoading.value = false
      if (hasInterpretationFields(optimisticCached)) return
    } else {
      fortuneData.value = null
    }
  } else {
    fortuneData.value = null
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session && isGuest.value) {
      isLoading.value = false
      isInterpretationLoading.value = false
      interpretationError.value = ''
      loadGuestProfile()
      fortuneData.value = buildGuestFortuneData(dateStr)
      recordGuestFortuneViewed(undefined, dateStr)
      await trackGuestEvent(supabase, 'guest_fortune_viewed', 'fortune', { date: dateStr })
      return
    }
    if (!session) { alert('请先前往首页登录'); return }

    let cachedData = loadCachedFortune(session.user.id, dateStr, profileId)
    if (currentRequest !== requestSerial.value) return

    if (cachedData) {
      fortuneData.value = cachedData
      isLoading.value = false
      if (hasInterpretationFields(cachedData)) return
      fetchFortuneInterpretation(session.user.id, dateStr, session.access_token, profileId, currentRequest)
      return
    }

    const baseData = await fetchFortuneBaseFromApi(dateStr, session.access_token, profileId)
    if (currentRequest !== requestSerial.value) return
    rememberFortuneCache(session.user.id, dateStr, baseData, profileId)
    fortuneData.value = baseData
    isLoading.value = false
    if (hasInterpretationFields(baseData)) return
    fetchFortuneInterpretation(session.user.id, dateStr, session.access_token, profileId, currentRequest)
  } catch (error) {
    if (currentRequest !== requestSerial.value) return
    console.error(error)
    alert(error.message)
  } finally {
    if (currentRequest === requestSerial.value) isLoading.value = false
  }
}

const fetchMonthlyFortuneData = async () => {
  const currentRequest = monthRequestSerial.value + 1
  monthRequestSerial.value = currentRequest
  monthError.value = ''
  monthlyData.value = null
  monthlyDataKey.value = ''
  monthlyInterpretations.value = {}
  monthlyInterpretationError.value = ''
  isMonthlyInterpretationLoading.value = false

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session && isGuest.value) {
      monthlyData.value = null
      monthError.value = '访客模式暂不展示月运'
      return
    }
    if (!session) { alert('请先前往首页登录'); return }

    isMonthLoading.value = true
    const profileId = currentProfileCacheKey.value
    syncMonthlyRefreshSignal(profileId, selectedMonthKey.value)
    if (monthlyRefreshSignal.value) monthlyRefreshState.value = 'refreshing'
    const data = await fetchMonthlyFortuneFromApi(selectedMonthKey.value, session.access_token, profileId)
    if (currentRequest !== monthRequestSerial.value) return
    monthlyData.value = data
    monthlyDataKey.value = selectedMonthKey.value
    fetchMonthlyInterpretation(selectedMonthlyDimension.value, { force: Boolean(monthlyRefreshSignal.value) })
  } catch (error) {
    if (currentRequest !== monthRequestSerial.value) return
    console.error(error)
    monthlyData.value = null
    monthError.value = error.message
  } finally {
    if (currentRequest === monthRequestSerial.value) isMonthLoading.value = false
  }
}

const fetchAnnualFortuneData = async () => {
  if (!activeProfile.value) return
  const currentRequest = annualRequestSerial.value + 1
  annualRequestSerial.value = currentRequest
  annualError.value = ''
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session && isGuest.value) {
      annualDataList.value = []
      annualError.value = '访客模式暂不展示年运'
      return
    }
    if (!session) { alert('请先前往首页登录'); return }

    isAnnualLoading.value = true
    const profileId = currentProfileCacheKey.value
    const data = await fetchAnnualFortuneFromApi(new Date().getFullYear(), session.access_token, profileId)
    if (currentRequest !== annualRequestSerial.value) return
    annualDataList.value = data || []
  } catch (error) {
    if (currentRequest !== annualRequestSerial.value) return
    console.error(error)
    annualDataList.value = []
    annualError.value = error.message
  } finally {
    if (currentRequest === annualRequestSerial.value) isAnnualLoading.value = false
  }
}

const fetchMonthlyInterpretation = async (dimension = selectedMonthlyDimension.value, options = {}) => {
  const force = Boolean(options.force)
  if (!visibleMonthlyData.value || (!force && monthlyInterpretations.value[dimension])) return
  const currentRequest = monthlyInterpretationSerial.value + 1
  monthlyInterpretationSerial.value = currentRequest
  isMonthlyInterpretationLoading.value = true
  monthlyInterpretationError.value = ''

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const profileId = currentProfileCacheKey.value
    const result = await requestMonthlyInterpretation(
      selectedMonthKey.value,
      session.access_token,
      profileId,
      dimension,
      (details) => {
        if (currentRequest !== monthlyInterpretationSerial.value) return
        applyMonthlyInterpretationPatch(dimension, { details, interpretation_status: 'streaming' })
      }
    )
    if (currentRequest !== monthlyInterpretationSerial.value) return
    applyMonthlyInterpretationPatch(dimension, result)
    if (monthlyRefreshSignal.value) {
      clearMonthlyInterpretationRefresh(getFortuneStorage(), currentProfileCacheKey.value, selectedMonthKey.value)
      monthlyRefreshSignal.value = null
      monthlyRefreshState.value = 'updated'
    }
  } catch (error) {
    if (currentRequest !== monthlyInterpretationSerial.value) return
    console.error(error)
    monthlyInterpretationError.value = '月度断语暂未生成，请稍后重试'
  } finally {
    if (currentRequest === monthlyInterpretationSerial.value) isMonthlyInterpretationLoading.value = false
  }
}

const selectMonthlyDimension = (dimension) => {
  if (selectedMonthlyDimension.value === dimension) return
  selectedMonthlyDimension.value = dimension
  fetchMonthlyInterpretation(dimension, { force: Boolean(monthlyRefreshSignal.value) })
}

const openMonthlyContextNotes = () => {
  showMonthlyFactorsGuide.value = false
  router.push({
    name: 'bazi',
    query: {
      tab: 'events',
      profileId: selectedProfileId.value || undefined,
    }
  })
}

const fetchFortuneInterpretation = async (userId, dateStr, accessToken, profileId, requestId) => {
  isInterpretationLoading.value = true
  interpretationError.value = ''
  try {
    const interpretationData = await requestFortuneInterpretation(userId, dateStr, accessToken, profileId)
    if (requestId !== requestSerial.value || !fortuneData.value) return
    const mergedData = { ...fortuneData.value, ...interpretationData }
    rememberFortuneCache(userId, dateStr, mergedData, profileId)
    fortuneData.value = mergedData
  } catch (error) {
    if (requestId !== requestSerial.value) return
    console.error(error)
    interpretationError.value = '断语暂未生成，请稍后重试'
  } finally {
    if (requestId === requestSerial.value) isInterpretationLoading.value = false
  }
}

const selectDate = (dateStr) => {
  if (selectedDate.value === dateStr) return
  selectedDate.value = dateStr
  if (currentTab.value !== 'month') {
    fetchFortuneData(dateStr)
  }
}

const selectMonth = (monthKey) => {
  if (!monthKey || selectedMonth.value === monthKey) return
  selectedMonth.value = monthKey
  scrollSelectedMonthIntoView()
  syncMonthlyRefreshSignal(currentProfileCacheKey.value, monthKey)
  fetchMonthlyFortuneData()
}

const scrollSelectedMonthIntoView = () => {
  nextTick(() => {
    const activeItem = monthScrollerRef.value?.querySelector('.month-item.active')
    activeItem?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  })
}

onMounted(async () => {
  document.addEventListener('click', handleDocumentClick)
  await fetchProfiles()
  syncMonthlyRefreshSignal()
  generateDays(String(route.query.date || ''))
  generateMonths()
  generateYears()
  fetchFortuneData(selectedDate.value)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})

watch(
  () => [route.query.date, route.query.profileId],
  ([nextDate, nextProfileId]) => {
    const normalizedDate = normalizeDateString(nextDate)
    if (normalizedDate && normalizedDate !== selectedDate.value) {
      generateDays(normalizedDate)
      if (currentTab.value === 'month') {
        fetchMonthlyFortuneData()
      } else if (currentTab.value === 'year') {
        fetchAnnualFortuneData()
      } else {
        fetchFortuneData(normalizedDate)
      }
    }

    const profileId = String(nextProfileId || '')
    if (profileId && profileId !== selectedProfileId.value && baziProfiles.value.some(profile => profile.id === profileId)) {
      selectedProfileId.value = profileId
      syncMonthlyRefreshSignal(profileId, selectedMonthKey.value)
      if (currentTab.value === 'month') {
        fetchMonthlyFortuneData()
      } else if (currentTab.value === 'year') {
        fetchAnnualFortuneData()
      } else {
        fetchFortuneData(selectedDate.value || normalizedDate)
      }
    }
  }
)

watch(currentTab, (nextTab) => {
  if (nextTab === 'month' && !visibleMonthlyData.value && !isMonthLoading.value) {
    scrollSelectedMonthIntoView()
    syncMonthlyRefreshSignal()
    fetchMonthlyFortuneData()
  }
  if (nextTab === 'month') scrollSelectedMonthIntoView()

  if (nextTab === 'year' && !annualDataList.value.length && !isAnnualLoading.value) {
    scrollSelectedYearIntoView()
    fetchAnnualFortuneData()
  }
  if (nextTab === 'year') scrollSelectedYearIntoView()
})
</script>

<style scoped>
@import '../styles/fortune-view.css';
</style>
