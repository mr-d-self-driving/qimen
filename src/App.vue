<template>
  <div id="drawer-host" class="drawer-host"></div>

  <div class="app-container" :class="{ 'drawer-open': globalState.isDrawerOpen }">
    <div class="main-viewport">
      <canvas ref="cosmosCanvas" id="cosmosCanvas"></canvas>
      <div class="bg-radial"></div>

      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
      
      <!-- Padding block to ensure content is not hidden behind the fixed bottom nav -->
      <div v-if="isBottomNavVisible" class="nav-padding"></div>
    </div>

    <nav v-if="isBottomNavVisible" id="globalBottomNav">
      <router-link to="/" class="nav-item" active-class="active">
        <div class="nav-icon">
          <!-- 问事：八射线占卜轮（指向八方，问事起卦）-->
          <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v5M14 19v5M4 14h5M19 14h5M18 10l3-3M10 10l-3-3M18 18l3 3M10 18l-3 3M9 14a5 5 0 1 0 10 0a5 5 0 1 0-10 0"/></svg>
        </div>
        <div class="nav-label">问事</div>
      </router-link>
      <router-link to="/bazi" class="nav-item" active-class="active">
        <div class="nav-icon">
          <!-- 八字：2×4连通网格（四柱×天干地支）-->
          <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h22v14H3zM8.5 7v14M14 7v14M19.5 7v14M3 14h22"/></svg>
        </div>
        <div class="nav-label">八字</div>
      </router-link>
      <router-link to="/reports" class="nav-item" active-class="active">
        <div class="nav-icon">
          <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 23V5h9l3 3v15H8Z"/><path d="M17 5v4h4M11 14h7M11 18h5"/></svg>
        </div>
        <div class="nav-label">报告</div>
      </router-link>
      <router-link to="/fortune" class="nav-item" active-class="active">
        <div class="nav-icon">
          <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M7 7h14v15H7zM10 4v5M18 4v5M7 12h14"/><path d="M10 16h2M16 16h2M10 20h2"/></svg>
        </div>
        <div class="nav-label">运势</div>
      </router-link>
    </nav>

    
    <div class="viewport-overlay" :class="{ open: globalState.isDrawerOpen }" @click="globalState.isDrawerOpen = false"></div>
  </div>

  <InstallPrompt />

  <Teleport to="body">
    <transition name="update-notice">
      <div v-if="showUpdateNotice" class="update-notice-overlay" role="dialog" aria-modal="true" aria-labelledby="updateNoticeTitle">
        <section class="update-notice-panel">
          <button class="update-notice-close" type="button" aria-label="关闭更新说明" @click="dismissUpdateNotice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <div class="update-panel-demo" aria-label="八字 Panel 更新示例">
            <BaziStaticPanel
              :matrix="UPDATE_PANEL_MATRIX"
              :state-report="UPDATE_PANEL_REPORT"
              :target-spec="UPDATE_PANEL_TARGET"
              shishen-theory="Panel 会把目标十神、宫位、形象与岁运触发拆开展示，先看结构，再看应期。"
              gongwei-theory="日支为关系承载位，宫位是否受冲合刑害会直接影响判断稳定性。"
            />
          </div>

          <div class="update-notice-copy">
            <p class="update-notice-version">v{{ APP_RELEASE_VERSION }}</p>
            <h2 id="updateNoticeTitle">八字 Panel 全新升级</h2>
            <p>本期把原局、格局、喜忌与岁运触发拆成更清晰的 Panel。排盘结果会更容易扫读，也会结合新版从化判断重新生成关键结构。</p>
          </div>

          <div class="update-notice-actions">
            <button class="update-notice-primary" type="button" @click="dismissUpdateNotice">知道了，去看看</button>
          </div>
        </section>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from './lib/supabase.mjs'
import { globalState, setCurrentUser } from './store.js'
import { initTheme } from './composables/useTheme.js'
import InstallPrompt from './components/InstallPrompt.vue'
import BaziStaticPanel from './components/BaziStaticPanel.vue'

const route = useRoute()
const cosmosCanvas = ref(null)
const APP_RELEASE_VERSION = '1.1.2'
const UPDATE_NOTICE_KEY = `qimen:update-notice:${APP_RELEASE_VERSION}`
const showUpdateNotice = ref(false)
const UPDATE_PANEL_MATRIX = {
    pillars: [
        { name: '年', gan: '庚', zhi: '辰', hidden_stems: ['戊', '乙', '癸'], is_kong: false },
        { name: '月', gan: '甲', zhi: '寅', hidden_stems: ['甲', '丙', '戊'], is_kong: true },
        { name: '日', gan: '壬', zhi: '午', hidden_stems: ['丁', '己'], is_kong: false },
        { name: '时', gan: '丙', zhi: '申', hidden_stems: ['庚', '壬', '戊'], is_kong: false },
    ],
}
const UPDATE_PANEL_TARGET = {
    primary_shishen: ['正财', '偏财'],
    primary_gongwei: ['日支'],
    analysis_mode: 'both',
}
const UPDATE_PANEL_REPORT = {
    shishen_assessments: [
        {
            shishen: '才', pillar: '月', position: 'hidden',
            gan: '丙', zhi: '寅', element: '火',
            twelve_phase: '病', phase_score: 1, vigor: 0.1,
            is_kong: true, is_in_tomb: false, gaitou_jiejiao: 'neutral',
            relationships: [
                { type: '六冲', effective_strength: 60, strength_tier: 'strong', clash_direction: 'loses', note: '寅与申六冲，目标被冲拔' },
            ],
            status_tags: ['死绝', '空亡', '被冲'],
            verdict: '才处病，逢空亡且被冲，力量大减。',
        },
        {
            shishen: '财', pillar: '日', position: 'zhi_main',
            gan: '丁', zhi: '午', element: '火',
            twelve_phase: '胎', phase_score: 2, vigor: 0.4,
            is_kong: false, is_in_tomb: false, gaitou_jiejiao: 'same',
            relationships: [],
            status_tags: ['星宫得正'],
            verdict: '财坐日支，星宫得正。',
        },
        {
            shishen: '才', pillar: '时', position: 'gan',
            gan: '丙', zhi: '申', element: '火',
            twelve_phase: '长生', phase_score: 3, vigor: 0.38,
            is_kong: false, is_in_tomb: false, gaitou_jiejiao: 'gaitou',
            relationships: [
                { type: '六冲', effective_strength: 60, strength_tier: 'strong', clash_direction: 'wins', note: '申与寅六冲，冲动对方' },
            ],
            status_tags: ['长生', '盖头', '冲他支'],
            verdict: '才透时干，处长生，有明显触发点。',
        },
    ],
    gongwei_assessments: [{
        gongwei: '日支', pillar_name: '日', zhi: '午', element: '火',
        twelve_phase_for_dayStem: '胎', vigor: 0.4,
        is_kong: false, seat_shishen: '财', seat_element: '火',
        is_correct_star: true, is_hostile_occupied: false, is_tomb_for_target: false,
        relationships: [
            { type: '半三合', effective_strength: 11, strength_tier: 'weak', note: '午寅半合火，合力未全' },
        ],
        status_tags: ['星宫得正', '宫位稳固'],
        verdict: '日支午火为财星本位，关系承载力较明确。',
    }],
    extra_checks: [{ check: '从化/形象校验已纳入 Panel 结构' }],
    overall_stability: 'dynamic',
    stability_label: '动中见机',
    base_state: '时干才星透出，日支财星得位；月令空亡受冲，需看岁运何时引动。',
    favorable_wuxing: ['木', '火'],
    unfavorable_wuxing: ['金', '土'],
    geju: '食神格（月令寅木，甲木食神透干）',
    tiaohou: '寅月初春，调候需丙丁火温暖。',
    image_context: {
        subtype: '化气候选',
        match_label: '重点复核',
        match_level: 'medium',
        match_score: 72,
        override_normal_pattern: false,
    },
}
const secondaryRoutes = new Set(['reset-password', 'feedback'])
const isBottomNavVisible = computed(() => !secondaryRoutes.has(route.name) && globalState.authReady && (globalState.currentUser || globalState.isGuest))
let animationId = null
let authSubscription = null

const initVisuals = () => {
    if(!cosmosCanvas.value) return
    const canvas = cosmosCanvas.value
    const ctx = canvas.getContext('2d')
    let W, H, stars = []
    
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    const draw = () => {
        ctx.clearRect(0,0,W,H)
        stars.forEach(s => {
            s.a += s.speed*0.008; s.x += s.drift; 
            if(s.x < 0) s.x = W; if(s.x > W) s.x = 0;
            ctx.save(); ctx.globalAlpha = ((Math.sin(s.a)+1)/2)*0.3+0.03
            ctx.fillStyle = 'rgba(181,141,59,0.6)'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill(); ctx.restore()
        })

        // Connect nearby stars with lines
        for(let i=0; i<stars.length; i++){
            for(let j=i+1; j<stars.length; j++){
                const dx = stars[i].x - stars[j].x, dy = stars[i].y - stars[j].y, dist = Math.sqrt(dx*dx+dy*dy)
                if(dist < 90){
                    ctx.save(); ctx.globalAlpha = (1-dist/90)*0.015; ctx.strokeStyle = 'rgba(181,141,59,0.4)'; ctx.lineWidth = .5;
                    ctx.beginPath(); ctx.moveTo(stars[i].x, stars[i].y); ctx.lineTo(stars[j].x, stars[j].y); ctx.stroke(); ctx.restore()
                }
            }
        }
        animationId = requestAnimationFrame(draw)
    }
    resize()
    stars = Array.from({length: 100}, () => ({x:Math.random()*W, y:Math.random()*H, r:Math.random()*0.9+0.2, a:Math.random(), speed:(Math.random()*0.3+0.05)*(Math.random()>.5?1:-1), drift:(Math.random()-.5)*0.1}))
    draw()
    window.addEventListener('resize', resize)
}

const dismissUpdateNotice = () => {
    showUpdateNotice.value = false
    window.localStorage.setItem(UPDATE_NOTICE_KEY, 'seen')
}

function maybeShowUpdateNotice(user) {
    if (!user) {
        showUpdateNotice.value = false
        return
    }
    showUpdateNotice.value = !window.localStorage.getItem(UPDATE_NOTICE_KEY)
}

onMounted(() => {
    initTheme()
    initVisuals()
    supabase.auth.getSession().then(({ data: { session } }) => {
        setCurrentUser(session?.user || null)
        maybeShowUpdateNotice(session?.user || null)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setCurrentUser(session?.user || null)
        maybeShowUpdateNotice(session?.user || null)
    })
    authSubscription = data?.subscription
})

onUnmounted(() => {
    if (animationId) cancelAnimationFrame(animationId)
    authSubscription?.unsubscribe()
})
</script>

<style scoped>
.drawer-host {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: min(82vw, 310px);
  z-index: 1;
}

.app-container {
  position: fixed;
  inset: 0;
  z-index: 10;
  background: var(--paper, #f7f4ee);
  transform: translateX(0);
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), border-radius 0.5s ease, box-shadow 0.5s ease;
  overflow: hidden; /* Hide anything outside the translated bounds */
}

.app-container.drawer-open {
  transform: translateX(min(82vw, 310px));
  border-radius: 24px;
  box-shadow: -10px 0 40px rgba(0,0,0,0.6);
}

.main-viewport {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.nav-padding {
  height: calc(85px + env(safe-area-inset-bottom));
}

.viewport-overlay {
  position: absolute;
  inset: 0;
  z-index: 99999;
  background: rgba(0,0,0,0.3);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.5s ease;
}
.viewport-overlay.open {
  opacity: 1;
  pointer-events: all;
  cursor: pointer;
}

/* 这里放底部导航的 CSS */
#globalBottomNav {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
    height: calc(65px + env(safe-area-inset-bottom));
    background: var(--chrome, #efefef);
    border-top: 1px solid var(--line);
    display: flex; justify-content: space-around; align-items: center;
    padding-bottom: env(safe-area-inset-bottom);
}
.nav-item {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
    color: var(--chrome-muted, #9a9a9a); text-decoration: none; transition: color 0.3s;
}
.nav-item.active { color: var(--ink, #0b0b0b); }
.nav-icon { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; }
.nav-icon svg { width: 26px; height: 26px; stroke-width: 1.6; }
.nav-label { font-size: 10px; font-weight: 600; letter-spacing: 1px; }

/* 丝滑的页面切换动画 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.update-notice-overlay {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px;
  background: rgba(11, 10, 8, 0.48);
  backdrop-filter: blur(10px);
}

.update-notice-panel {
  position: relative;
  width: min(94vw, 560px);
  max-height: min(88dvh, 760px);
  box-sizing: border-box;
  padding: 18px;
  overflow-y: auto;
  border: 1px solid rgba(181, 141, 59, 0.28);
  border-radius: 8px;
  background: linear-gradient(180deg, #fffaf0 0%, #f4ecdc 100%);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
  color: #1b1710;
}

.update-notice-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: rgba(27, 23, 16, 0.08);
  color: #1b1710;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.update-notice-close svg {
  width: 18px;
  height: 18px;
}

.update-notice-copy {
  padding: 16px 34px 0 2px;
}

.update-notice-version {
  margin: 0 0 8px;
  color: #8f6b2b;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
}

.update-notice-copy h2 {
  margin: 0;
  font-size: 24px;
  line-height: 1.18;
  letter-spacing: 0;
}

.update-notice-copy p:last-child {
  margin: 12px 0 0;
  color: rgba(27, 23, 16, 0.72);
  font-size: 14px;
  line-height: 1.7;
}

.update-panel-demo {
  max-height: 430px;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  border: 1px solid rgba(27, 23, 16, 0.1);
  border-radius: 8px;
  background: #fffdf8;
}

.update-panel-demo :deep(.static-panel) {
  padding: 14px;
  background: #fffdf8;
}

.update-panel-demo :deep(.pillar-grid) {
  gap: 6px;
}

.update-panel-demo :deep(.pillar-col) {
  min-width: 0;
  padding: 9px 4px;
}

.update-panel-demo :deep(.panel-section),
.update-panel-demo :deep(.meta-block) {
  margin-top: 12px;
}

.update-panel-demo :deep(.analysis-card:nth-of-type(n+3)),
.update-panel-demo :deep(.hidden-stem-toggle) {
  display: none;
}

.update-notice-actions {
  display: flex;
  margin-top: 18px;
}

.update-notice-primary {
  width: 100%;
  min-height: 44px;
  border: 0;
  border-radius: 8px;
  background: #1b1710;
  color: #fffaf0;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.update-notice-enter-active,
.update-notice-leave-active {
  transition: opacity 0.2s ease;
}

.update-notice-enter-from,
.update-notice-leave-to {
  opacity: 0;
}

@media (max-width: 420px) {
  .update-notice-overlay {
    align-items: flex-end;
    padding: 14px;
  }

  .update-notice-panel {
    width: 100%;
    max-height: 86dvh;
    padding: 14px;
  }

  .update-panel-demo {
    max-height: 390px;
  }
}
</style>
