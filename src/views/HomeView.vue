<template>
  <div class="home-view">
    <header id="siteHeader">
      <button class="hamburger" :class="{ open: globalState.isDrawerOpen }" @click="toggleDrawer" aria-label="历史记录">
        <span></span><span></span><span></span>
      </button>
      <div class="site-logo" @click="resetToInput" style="cursor: pointer;" title="返回首页">奇门遁甲</div>
      <div class="header-actions">
        <OpenSourceLinks />
        <div class="avatar-wrap">
          <div class="avatar-btn" @click="toggleAvatarMenu" title="账号">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="6" r="3" stroke="rgba(212,175,55,0.75)" stroke-width="1.2"/>
              <path d="M2 15c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke="rgba(212,175,55,0.75)" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="avatar-menu" :class="{ open: isAvatarMenuOpen }">
            <div class="avatar-email">{{ currentUser ? currentUser.email : '未登录' }}</div>
            <router-link v-if="currentUser" class="avatar-menu-link" to="/reset-password" @click="isAvatarMenuOpen = false">修改密码</router-link>
            <button class="avatar-logout" @click="handleSignOut">退出登录</button>
          </div>
        </div>
      </div>
    </header>

    <!-- 历史记录抽屉 - Teleport 到 App.vue 的 #drawer-host 中 -->
    <Teleport to="#drawer-host">
      <div id="historyDrawer" :class="{ open: globalState.isDrawerOpen }">
        <div class="drawer-head">
          <div class="drawer-label">HISTORY</div>
          <div class="drawer-title-txt">推演回溯</div>
        </div>
        <div class="drawer-filter">
          <div class="filter-label">分类查阅</div>
          <div class="filter-caps">
          <div v-for="cat in categories" :key="cat.value" 
               class="f-cap" :class="{ active: activeCategory === cat.value }" 
               @click="setCategory(cat.value)">
            {{ cat.label }}
          </div>
        </div>
        </div>
        <div class="drawer-body" id="drawerBody">
          <div v-if="filteredHistory.length === 0" class="drawer-empty">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" opacity="0.3">
              <circle cx="32" cy="32" r="28" stroke="rgba(212,175,55,0.5)" stroke-width="1"/>
              <circle cx="32" cy="32" r="18" stroke="rgba(212,175,55,0.3)" stroke-width="1" stroke-dasharray="3 3"/>
              <circle cx="32" cy="32" r="3" fill="rgba(212,175,55,0.5)"/>
            </svg>
            <p>尚无推演记录<br>缘起于此，万象皆空</p>
          </div>
          <div v-else class="d-hist-item" v-for="item in filteredHistory" :key="item.id" @click="loadRecord(item)">
            <span class="d-hist-dot" :class="getVerdictCls(item.score)"></span>
            <div class="d-hist-info">
              <div class="d-hist-q">{{ item.question }}</div>
              <div class="d-hist-meta">
                <span>{{ item.dateStr }}</span><span>·</span>
                <span>{{ item.catLabel }}</span><span>·</span>
                <span>{{ item.score }}分</span>
              </div>
            </div>
            <span class="d-hist-badge" :class="'verdict-' + getVerdictInfo(item.score).cls">{{ getVerdictInfo(item.score).label }}</span>
          </div>
        </div>
      </div>
    </Teleport>

    <div class="page-wrap">
      <div class="container">

        <div v-if="!canUseApp" class="glass-card auth-card">
          <div class="field-label">{{ isLoginMode ? '身份认证 (登录)' : '创建账号 (注册)' }}</div>
          <input type="email" v-model="authForm.email" placeholder="请输入邮箱地址"/>
          <input type="password" v-model="authForm.password" placeholder="请输入密码 (至少6位)"/>
          <button class="auth-submit" :disabled="authLoading" @click="handleAuth">
            <span>{{ authLoading ? '验证中...' : (isLoginMode ? '登 录' : '注 册') }}</span>
          </button>
          <div class="auth-divider"><span>或</span></div>
          <button class="google-submit" :disabled="googleAuthLoading || authLoading" @click="handleGoogleAuth">
            <span class="google-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.37c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.37 12 5.37z"/>
              </svg>
            </span>
            <span>{{ googleAuthLoading ? '正在跳转...' : '使用 Google 登录' }}</span>
          </button>
          <button class="guest-submit" @click="handleGuestEntry">访客体验</button>
          <div class="guest-note">访客可提问 1 次、添加 1 个本地八字档案、查看今日日运分数</div>
          <button class="forgot-password-link" :disabled="resetEmailLoading" @click="handleResetPasswordEmail">
            {{ resetEmailLoading ? '正在发送重设邮件...' : '忘记密码？发送重设邮件' }}
          </button>
          <div v-if="resetEmailNotice" class="auth-notice">{{ resetEmailNotice }}</div>
          <div class="auth-switch" @click="isLoginMode = !isLoginMode">
            {{ isLoginMode ? '没有账号？ ' : '已有账号？ ' }}<span>{{ isLoginMode ? '点击注册' : '点击登录' }}</span>
          </div>
        </div>

        <div v-else class="app-section">
          <transition name="fade" mode="out-in">
            <div v-show="viewState === 'input'" class="input-wrapper">
              <div class="tagline">
                <div class="tagline-main">天时 · 地利 · 人和</div>
                <div class="tagline-sub">洞察天机，决胜千里</div>
              </div>

              <div class="glass-card input-card">
                <div class="input-label">叩问天机</div>
                <textarea v-model="questionInput" placeholder="在心中默念所求之事，写下您的羁绊与心中所惑……"></textarea>
                <div class="time-row">
                  <div class="time-display">
                    <span class="time-dot"></span>
                    <span>{{ clockText }}</span>
                  </div>
                  <div class="time-note">以当下时辰起局</div>
                </div>
              </div>

              <div class="input-box" style="padding:16px">
                <label class="bazi-toggle">
                  <div class="bazi-toggle-text">
                    <span>🧬</span> 注入命主八字分析
                    <span class="info-icon" @click.stop="showBaziModal = true">?</span>
                  </div>
                  <div class="switch">
                    <input type="checkbox" v-model="baziEnabled" @change="handleBaziToggle">
                    <span class="slider"></span>
                  </div>
                </label>

                <div v-show="baziEnabled" class="bazi-workspace">
                  <div class="profile-selector">
                    <select v-model="selectedProfileId" class="profile-select" @change="handleProfileSelect">
                      <option value="">{{ baziProfiles.length ? '-- 请选择命主档案 --' : '加载档案中...' }}</option>
                      <option v-for="p in baziProfiles" :key="p.id" :value="p.id">
                        {{ p.name }} ({{ p.gender === 'M' ? '男' : '女' }})
                      </option>
                    </select>
                  </div>

                  <div v-show="baziState === 'ready'" style="margin-top:16px;padding:16px;background:rgba(255,255,255,0.025);border-radius:12px;border:1px solid var(--gold-border);">
                    <div v-if="activeBaziProfile?.bazi_detail?.matrix?.pillars" class="bazi-table-wrap" style="margin-bottom: 14px;">
                      <table class="bazi-table">
                        <thead>
                          <tr>
                            <th>柱位</th>
                            <th v-for="col in activeBaziProfile.bazi_detail.matrix.pillars" :key="col.name">{{ col.name }}柱</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td class="bz-label">主星</td>
                            <td v-for="(col, i) in activeBaziProfile.bazi_detail.matrix.pillars" :key="'star'+i" class="bz-sub">{{ col.star || '-' }}</td>
                          </tr>
                          <tr>
                            <td class="bz-label">天干</td>
                            <td v-for="(col, i) in activeBaziProfile.bazi_detail.matrix.pillars" :key="'gan'+i" class="bz-char" :class="WX_MAP[col.gan]">{{ col.gan || '-' }}</td>
                          </tr>
                          <tr>
                            <td class="bz-label">地支</td>
                            <td v-for="(col, i) in activeBaziProfile.bazi_detail.matrix.pillars" :key="'zhi'+i" class="bz-char" :class="WX_MAP[col.zhi]">{{ col.zhi || '-' }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <details class="bazi-details" open>
                      <summary>✨ 命理基底已锁定</summary>
                      <div class="bazi-summary-text">{{ currentBaziSummary }}</div>
                    </details>
                  </div>

                  <div v-show="baziState === 'warning'" style="margin-top:16px;padding:16px;background:rgba(255,94,87,0.05);border-radius:12px;border:1px solid rgba(255,94,87,0.2);">
                    <div style="font-size:12px;color:#FF5E57;line-height:1.6;">
                      ⚠️ 该档案暂无云端排盘数据。<br>请先前往底部 <b>「八字」</b> 模块点击推演，生成命理基底后再行注入。
                    </div>
                  </div>
                </div>
              </div>

              <div class="cta-wrap">
                <button class="cta-btn" :disabled="isSubmitting" @click="startDivination">
                  <div class="cta-inner">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="opacity:.75;flex-shrink:0">
                      <circle cx="10" cy="10" r="8.5" stroke="#1a1000" stroke-width="1"/>
                      <path d="M10 1.5a8.5 8.5 0 0 1 0 17A4.25 4.25 0 0 1 10 10a4.25 4.25 0 0 0 0-8.5z" fill="#1a1000" opacity=".5"/>
                      <circle cx="10" cy="5.75" r="1.5" fill="#1a1000"/>
                      <circle cx="10" cy="14.25" r="1.5" fill="#1a1000" opacity=".4"/>
                    </svg>
                    <span class="cta-text">洞察天机</span>
                  </div>
                </button>
                <div class="cta-hint">奇门遁甲 · AI 深度推演</div>
              </div>
            </div>
          </transition>

          <transition name="fade">
            <div v-show="viewState === 'loading'" id="loader">
              <div class="bagua-ring-wrap">
                <svg class="bagua-svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="60" cy="60" r="56" stroke="rgba(212,175,55,0.15)" stroke-width="1" fill="none"/>
                  <circle cx="60" cy="60" r="50" stroke="rgba(212,175,55,0.08)" stroke-width=".5" fill="none"/>
                  <g stroke="rgba(212,175,55,0.6)" stroke-width="1.5" stroke-linecap="round">
                    <line x1="52" y1="8" x2="68" y2="8"/> <line x1="52" y1="11" x2="68" y2="11"/> <line x1="52" y1="14" x2="68" y2="14"/>
                    <line x1="52" y1="106" x2="59" y2="106"/><line x1="61" y1="106" x2="68" y2="106"/>
                    <line x1="52" y1="109" x2="59" y2="109"/><line x1="61" y1="109" x2="68" y2="109"/>
                    <line x1="52" y1="112" x2="59" y2="112"/><line x1="61" y1="112" x2="68" y2="112"/>
                    <line x1="6" y1="52" x2="14" y2="52"/> <line x1="6" y1="55" x2="14" y2="55"/> <line x1="6" y1="58" x2="14" y2="58"/>
                    <line x1="106" y1="52" x2="114" y2="52"/>
                    <line x1="106" y1="55" x2="110" y2="55"/><line x1="112" y1="55" x2="114" y2="55"/>
                    <line x1="106" y1="58" x2="114" y2="58"/>
                  </g>
                  <g class="bagua-inner-g">
                    <circle cx="60" cy="60" r="28" stroke="rgba(107,140,255,0.2)" stroke-width="1" fill="rgba(107,140,255,0.02)"/>
                    <circle cx="60" cy="60" r="18" stroke="rgba(212,175,55,0.25)" stroke-width="1" fill="none"/>
                    <circle cx="60" cy="60" r="36" stroke="rgba(212,175,55,0.35)" stroke-width="1.5" fill="none" stroke-dasharray="8 6" stroke-linecap="round"/>
                  </g>
                  <circle cx="60" cy="60" r="4" fill="rgba(212,175,55,0.6)"/>
                  <circle cx="60" cy="60" r="2" fill="rgba(212,175,55,0.9)"/>
                </svg>
              </div>
              <div class="loader-text-block">
                <div class="loader-main-text">{{ currentLoaderMessage }}</div>
                <div class="loader-dots"><span></span><span></span><span></span></div>
              </div>
            </div>
          </transition>

          <transition name="fade">
            <div v-show="viewState === 'result'" class="result-wrapper">
              <div v-html="resultHtml" class="html-container"></div>
              <button class="reset-btn" @click="resetToInput">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7a5 5 0 1 0 1.4-3.5L2 2v3h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                再起一局
              </button>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <div class="bazi-info-overlay" :class="{ show: showBaziModal }" @click="showBaziModal = false">
      <div class="bazi-info-card" @click.stop>
        <div class="bazi-info-title"><span>何时需要注入八字？</span><span class="bazi-info-close" @click="showBaziModal = false">&times;</span></div>
        <div class="bazi-info-text">
          <div class="info-block">
            <div class="info-block-title">标准解卦 <span>(无需八字)</span></div>
            <p>单纯预测<span class="highlight">具体事件走向</span>（如今日出行、近期合同、求财结果等），奇门局本身能量已足够推演。</p>
          </div>
          
          <div class="info-block">
            <div class="info-block-title">深度解卦 <span>(需要八字)</span></div>
            <ul class="info-list">
              <li><span class="list-label">判断个人旺衰</span>涉及健康、婚姻前途、命运走向，需用日干印证。</li>
              <li><span class="list-label">流年大运配合</span>结合八字大运判断具体年份变化。</li>
              <li><span class="list-label">六亲宫位对应</span>判断婚姻、子嗣等，用八字强弱印证局盘信息。</li>
              <li><span class="list-label">精准应期定位</span>两套体系交接点吻合，应验概率更高。</li>
            </ul>
          </div>
          
          <div class="bazi-summary-box">
            <div class="summary-box-label">✧ 一句话总结</div>
            <div class="summary-box-content">凡涉及<span class="highlight">"这个人能不能成事"</span>，引入八字让两套体系互为印证，准确率大幅提升！</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { enterGuestMode, globalState, leaveGuestMode, setCurrentUser } from '../store.js'
import { getGuestState, recordGuestQuestion, trackGuestEvent } from '../guestMode.mjs'
import { warmFortuneCacheFromSupabase } from '../fortuneWarmup.mjs'
import OpenSourceLinks from '../components/OpenSourceLinks.vue'
import { buildGoogleOAuthSignInArgs } from '../auth/googleOAuth.mjs'
import { buildPasswordResetEmailArgs } from '../auth/passwordReset.mjs'

const SUPABASE_URL = 'https://xkbqiiwwgfzkyfhxuoev.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_qr9YBIA6n32r-mcqKbkpgA_0XVTUSI7'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const API_URL = "/api/qimen"

const WX_MAP = {
    '甲':'wx-mu', '乙':'wx-mu', '丙':'wx-huo', '丁':'wx-huo', '戊':'wx-tu', '己':'wx-tu',
    '庚':'wx-jin', '辛':'wx-jin', '壬':'wx-shui', '癸':'wx-shui',
    '寅':'wx-mu', '卯':'wx-mu', '巳':'wx-huo', '午':'wx-huo', '申':'wx-jin', '酉':'wx-jin',
    '亥':'wx-shui', '子':'wx-shui', '辰':'wx-tu', '戌':'wx-tu', '丑':'wx-tu', '未':'wx-tu'
}

const currentUser = ref(null)
const isLoginMode = ref(true)
const authLoading = ref(false)
const googleAuthLoading = ref(false)
const resetEmailLoading = ref(false)
const resetEmailNotice = ref('')
const authForm = reactive({ email: '', password: '' })

const viewState = ref('input') 
const questionInput = ref('')
const isSubmitting = ref(false)
const clockText = ref('载入时辰中…')
const isAvatarMenuOpen = ref(false)
const showBaziModal = ref(false)

const baziEnabled = ref(false)
const baziState = ref('idle')
const baziProfiles = ref([])
const selectedProfileId = ref('')
const currentBaziSummary = ref('')
const currentBaziString = ref('')
const activeBaziProfile = computed(() => baziProfiles.value.find(p => p.id === selectedProfileId.value))
const isGuest = computed(() => globalState.isGuest)
const canUseApp = computed(() => Boolean(currentUser.value || isGuest.value))

const historyRecords = ref([])
const activeCategory = ref('all')
const categories = [
  { label: '全部', value: 'all' },
  { label: '💼 事业', value: 'career_business' },
  { label: '💰 求财', value: 'finance_wealth' },
  { label: '❤️ 感情', value: 'relationship' },
  { label: '🏥 健康', value: 'health_action' },
  { label: '📦 交易', value: 'item_transaction' },
  { label: '📋 杂事', value: 'general' }
]

const resultHtml = ref('')
const currentScore = ref(0) 
let scoreTimer = null

const LOADER_MESSAGES = ['正在接通云端超算矩阵...','推演时空坐标与节气数据...','计算奇门九宫落盘...','分析值符、值使与神助...','生成决策指引与应期推演...']
const currentLoaderMessage = ref(LOADER_MESSAGES[0])
let loaderInterval = null

let clockInterval = null
const getFortuneStorage = () => (typeof window === 'undefined' ? null : window.localStorage)

onMounted(() => {
  updateClock()
  clockInterval = setInterval(updateClock, 30000)
  document.addEventListener('click', closeMenus)

  supabase.auth.getSession().then(({ data: { session } }) => {
    handleSessionUpdate(session)
  })
  supabase.auth.onAuthStateChange((_event, session) => {
    handleSessionUpdate(session)
  })
})

onUnmounted(() => {
  clearInterval(clockInterval)
  clearInterval(loaderInterval)
  clearInterval(scoreTimer)
  document.removeEventListener('click', closeMenus)
})

const closeMenus = () => {
  isAvatarMenuOpen.value = false
}

const toggleDrawer = () => {
  globalState.isDrawerOpen = !globalState.isDrawerOpen
}

const toggleAvatarMenu = (e) => {
  e.stopPropagation()
  isAvatarMenuOpen.value = !isAvatarMenuOpen.value
}

const handleSessionUpdate = (session) => {
  setCurrentUser(session?.user || null)
  if (session) {
    currentUser.value = session.user
    loadHistory()
    warmFortuneCacheFromSupabase({
      supabase,
      storage: getFortuneStorage(),
      userId: session.user.id
    })
  } else {
    currentUser.value = null
    if (!isGuest.value) {
      historyRecords.value = []
      resetToInput()
    }
  }
}

const handleAuth = async () => {
  if (!authForm.email || !authForm.password) return alert("请填写完整的邮箱和密码")
  authLoading.value = true
  try {
    if (isLoginMode.value) {
      const { error } = await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password })
      if (error) throw error
    } else {
      const { error } = await supabase.auth.signUp({ email: authForm.email, password: authForm.password })
      if (error) throw error
      alert("注册成功！请去邮箱点击验证链接后登录。")
    }
  } catch (error) {
    alert("认证失败: " + error.message)
  } finally {
    authLoading.value = false
  }
}

const handleGoogleAuth = async () => {
  googleAuthLoading.value = true
  try {
    const href = typeof window === 'undefined' ? 'https://xkbqiiwwgfzkyfhxuoev.supabase.co' : window.location.href
    const { error } = await supabase.auth.signInWithOAuth(buildGoogleOAuthSignInArgs(href))
    if (error) throw error
  } catch (error) {
    alert("Google 登录失败: " + error.message)
    googleAuthLoading.value = false
  }
}

const handleResetPasswordEmail = async () => {
  if (!authForm.email) return alert('请先输入邮箱地址')
  resetEmailLoading.value = true
  resetEmailNotice.value = ''
  try {
    const href = typeof window === 'undefined' ? 'https://xkbqiiwwgfzkyfhxuoev.supabase.co' : window.location.href
    const { error } = await supabase.auth.resetPasswordForEmail(authForm.email, buildPasswordResetEmailArgs(href))
    if (error) throw error
    resetEmailNotice.value = '重设密码邮件已发送，请前往邮箱查收。'
  } catch (error) {
    alert('重设邮件发送失败: ' + error.message)
  } finally {
    resetEmailLoading.value = false
  }
}

const handleSignOut = async () => {
  if (isGuest.value && !currentUser.value) {
    leaveGuestMode()
    historyRecords.value = []
    resetToInput()
  } else {
    await supabase.auth.signOut()
  }
  isAvatarMenuOpen.value = false
}

const handleGuestEntry = async () => {
  enterGuestMode()
  currentUser.value = null
  historyRecords.value = []
  await trackGuestEvent(supabase, 'guest_started', 'auth')
}

const updateClock = () => {
  const TIAN_GAN = "甲乙丙丁戊己庚辛壬癸".split("")
  const DI_ZHI = "子丑寅卯辰巳午未申酉戌亥".split("")
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const shichenIdx = Math.floor((now.getHours() + 1) / 2) % 12
  const stemIdx = Math.floor(now.getTime() / 86400000) % 10
  clockText.value = `${h}:${m}\u2002${TIAN_GAN[stemIdx]}日 ${DI_ZHI[shichenIdx]}时`
}

const handleBaziToggle = async () => {
  if (baziEnabled.value && baziProfiles.value.length === 0) {
    await fetchBaziProfiles()
  }
  if (!baziEnabled.value) {
    selectedProfileId.value = ""
    baziState.value = 'idle'
    currentBaziString.value = ""
  }
}

const fetchBaziProfiles = async () => {
  if (isGuest.value && !currentUser.value) {
    const profile = getGuestState().baziProfile
    baziProfiles.value = profile ? [profile] : []
    return
  }
  if (!currentUser.value) return
  const { data, error } = await supabase.from('bazi_profiles').select('*').order('created_at', { ascending: false })
  if (!error && data) baziProfiles.value = data
}

const handleProfileSelect = () => {
  if (!selectedProfileId.value) {
    baziState.value = 'idle'
    currentBaziString.value = ''
    return
  }
  const profile = baziProfiles.value.find(p => p.id === selectedProfileId.value)
  if (profile?.bazi_summary) {
    baziState.value = 'ready'
    currentBaziSummary.value = profile.bazi_summary
    const baziStr = profile.bazi_str || "未知"
    currentBaziString.value = `命主：${profile.name}\n性别：${profile.gender === 'M' ? '男' : '女'}\n八字结构：${baziStr}\n断语：${profile.bazi_summary}`
  } else {
    baziState.value = 'warning'
  }
}

const startLoaderCycle = () => {
  let idx = 0
  loaderInterval = setInterval(() => {
    idx = (idx + 1) % LOADER_MESSAGES.length
    currentLoaderMessage.value = LOADER_MESSAGES[idx]
  }, 3000)
}

const stopLoaderCycle = () => { clearInterval(loaderInterval) }

const resetToInput = () => {
  viewState.value = 'input'
  questionInput.value = ''
  baziEnabled.value = false
  selectedProfileId.value = ''
  baziState.value = 'idle'
}

const startDivination = async () => {
  const input = questionInput.value.trim()
  if (baziEnabled.value && baziState.value !== 'ready') return alert("✋ 请先选择命主档案！")
  if (!input) return alert("问题不能为空！")

  const { data: { session } } = await supabase.auth.getSession()
  const guestState = getGuestState()
  if (!session && !isGuest.value) return alert("请先登录")
  if (!session && isGuest.value && !guestState.canAskQuestion) return alert("访客模式仅可提问 1 次，请登录后继续推演")

  isSubmitting.value = true
  viewState.value = 'loading'
  startLoaderCycle()

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: session
        ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }
        : { 'Content-Type': 'application/json', 'X-Guest-Id': guestState.guestId },
      body: JSON.stringify({ question: input, baziInfo: baziEnabled.value ? currentBaziString.value : null })
    })
    const data = await response.json()
    if (!response.ok || data.error) throw new Error(data.details || data.error || '推演失败')
    await saveRecordToDatabase(input, data)
    if (!session && isGuest.value) {
      recordGuestQuestion()
      await trackGuestEvent(supabase, 'guest_qimen_asked', 'qimen', { limit_reached: true })
    }
    resultHtml.value = buildCardHTML(data)
    viewState.value = 'result'
    nextTick(() => {
      animateScore(data.summary?.score || 0)
      setTimeout(() => document.querySelectorAll('.reveal').forEach((el, i) => setTimeout(() => el.classList.add('visible'), i * 80)), 450)
    })
  } catch (err) {
    alert("推演失败")
    viewState.value = 'input'
  } finally {
    stopLoaderCycle()
    isSubmitting.value = false
  }
}

const animateScore = (targetScore) => {
  if(scoreTimer) clearInterval(scoreTimer)
  let current = 0
  scoreTimer = setInterval(() => {
    current = Math.min(current + (targetScore/60), targetScore)
    const el = document.getElementById('vueScoreValue')
    if (el) el.textContent = String(Math.round(current))
    if (current >= targetScore) clearInterval(scoreTimer)
  }, 16)
}

const loadHistory = async () => {
  const { data } = await supabase.from('qimen_records').select('*').order('created_at', { ascending: false })
  historyRecords.value = (data || []).map(r => ({
    ...r,
    dateStr: new Date(r.created_at).toLocaleDateString(),
    score: r.qimen_data?.summary?.score || 0,
    catLabel: categories.find(c => c.value === r.category)?.label || '杂事'
  }))
}

const saveRecordToDatabase = async (question, data) => {
  if (isGuest.value && !currentUser.value) {
    historyRecords.value = [{
      id: 'guest_qimen_record',
      question,
      qimen_data: data,
      category: data.category || 'general',
      dateStr: new Date().toLocaleDateString(),
      score: data.summary?.score || 0,
      catLabel: categories.find(c => c.value === data.category)?.label || '杂事'
    }]
    return
  }
  await supabase.from('qimen_records').insert([{ user_id: currentUser.value.id, question, qimen_data: data, category: data.category || 'general' }])
  await loadHistory()
}

const filteredHistory = computed(() => activeCategory.value === 'all' ? historyRecords.value : historyRecords.value.filter(r => r.category === activeCategory.value))

const setCategory = (val) => { activeCategory.value = val }

const loadRecord = (item) => {
  globalState.isDrawerOpen = false
  resultHtml.value = buildCardHTML(item.qimen_data)
  viewState.value = 'result'
  nextTick(() => {
    animateScore(item.qimen_data?.summary?.score || item.score || 0)
    setTimeout(() => document.querySelectorAll('.reveal').forEach((el, i) => setTimeout(() => el.classList.add('visible'), i * 80)), 200)
  })
}

const getVerdictInfo = (score) => {
  if (score >= 90) return { label: '大吉', cls: 'da-ji' }
  if (score >= 75) return { label: '小吉', cls: 'xiao-ji' }
  if (score >= 55) return { label: '平', cls: 'ping' }
  return { label: '凶', cls: 'da-xiong' }
}

const getVerdictCls = (score) => score >= 75 ? 'ji' : score >= 55 ? 'ping' : 'xiong'

const buildCardHTML = (data) => {
  const summary = data.summary || { title: '生成中...', conclusion: '暂无数据', score: 0 }
  const analysis = data.analysis || {}
  const advice = data.advice || { lucky_tips: {} }
  const question = data.question || ''
  const scoreBasis = data.summary?.score_basis || null
  const chartData = data.qimen_data || data
  const palaces = chartData.palaces || []
  const pillars = chartData.pillars || {}
  const ju = chartData.ju_info || {}
  const ts = chartData.timestamp || {}
  const hasChart = palaces.length > 0

  const score = summary.score || 0
  const vd = getVerdictInfo(score)
  const THEME = score < 55 ? '#FF5E57' : score < 75 ? '#F5C518' : '#00D26A'
  const THEME_DIM = score < 55 ? 'rgba(255,94,87,0.15)' : score < 75 ? 'rgba(245,197,24,0.15)' : 'rgba(0,210,106,0.15)'

  const strategyItems = advice.strategy || []
  const primaryStrategies = strategyItems.slice(0, 3)
  const detailInsights = [
    { label: '时空能量', value: analysis.tensor, cls: 'accent-indigo' },
    { label: '用神分析', value: analysis.yong_shen, cls: 'accent-gold' },
    { label: '特殊格局', value: analysis.pattern, cls: 'accent-violet' },
    { label: '神助指引', value: analysis.god_help, cls: 'accent-teal' },
    { label: '动态应期', value: analysis.dynamic_timing, cls: 'accent-amber' }
  ].filter(item => item.value?.trim())

  const actionHTML = primaryStrategies.length
    ? primaryStrategies.map((s, i) => `<div class="action-step reveal" style="transition-delay:${i * 70}ms"><div class="action-index">0${i + 1}</div><div class="action-copy">${s}</div></div>`).join('')
    : `<div class="action-step reveal"><div class="action-index">01</div><div class="action-copy">${summary.conclusion}</div></div>`

  // 风险预警
  let riskHTML = ''
  if (advice.risk?.trim()) riskHTML = `<div class="risk-alert reveal"><div class="risk-alert-content">${advice.risk}</div></div>`

  // 八字命理
  let baziHTML = ''
  if (analysis.bazi_insight?.trim() && !analysis.bazi_insight.includes('未提供八字信息')) baziHTML = `<div class="insight-strip accent-theme reveal"><div class="insight-strip-label">命理参考</div><div class="insight-strip-body">${analysis.bazi_insight}</div></div>`

  // 评分依据
  let scoreBasisHTML = ''
  if (scoreBasis) {
    const pos = (scoreBasis.positive_signals || []).length ? `<div class="sb-row"><div class="sb-row-title">吉象支撑</div><div class="sb-tags">${scoreBasis.positive_signals.map(s => `<span class="sb-tag positive">${s}</span>`).join('')}</div></div>` : ''
    const neg = (scoreBasis.negative_signals || []).length ? `<div class="sb-row"><div class="sb-row-title">风险信号</div><div class="sb-tags">${scoreBasis.negative_signals.map(s => `<span class="sb-tag negative">${s}</span>`).join('')}</div></div>` : ''
    const logic = scoreBasis.score_logic ? `<div class="sb-logic">${scoreBasis.score_logic}</div>` : ''
    if (pos || neg || logic) scoreBasisHTML = `<div class="insight-strip accent-neutral reveal"><div class="insight-strip-label">评分拆解</div><div class="score-basis-body">${pos}${neg}${logic}</div></div>`
  }

  // 九宫格排盘
  let chartHTML = ''
  if (hasChart) {
    const isZhiFu = s => s && ju.zhi_fu && s.includes(ju.zhi_fu)
    const isZhiShi = d => d && ju.zhi_shi && d.includes(ju.zhi_shi)
    const cells = palaces.map(p => {
      if (p.is_center) return `<div class="pan-cell"><div class="pan-center-earth">${p.earth || ''}</div></div>`
      const starCls = isZhiFu(p.star) ? 'highlight-text' : ''
      const doorCls = isZhiShi(p.door) ? 'highlight-text' : ''
      let marks = ''
      if (p.ma_xing?.has_ma) marks += `<span class="pan-mark mark-ma">马</span>`
      if (p.kong_wang?.is_kong) marks += `<span class="pan-mark mark-kong">空</span>`
      return `<div class="pan-cell"><div class="pan-god">${p.god || ''}</div><div class="pan-stem stem-sky">${p.sky || ''}</div>${p.ji_sky ? `<div class="pan-stem ji-sky">${p.ji_sky}</div>` : ''}<div class="pan-star ${starCls}">${p.star || ''}</div><div class="pan-door ${doorCls}">${p.door || ''}</div><div class="pan-stem stem-earth">${p.earth || ''}</div>${p.ji_earth ? `<div class="pan-stem ji-earth">${p.ji_earth}</div>` : ''}<div class="pan-marks">${marks}</div></div>`
    }).join('')
    chartHTML = `<section class="result-module reveal"><div class="ai-header-title">时局排盘</div><div class="pan-wrapper"><div class="pan-header"><div class="pan-pillars">${[pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean).join('　')}</div><div class="pan-info">${ts.solar || ''} | ${ju.name || ''} · ${ju.jieqi || ''}<br>值符：<b>${ju.zhi_fu || '-'}</b>&emsp;值使：<b>${ju.zhi_shi || '-'}</b></div></div><div class="pan-grid">${cells}</div></div></section>`
  }

  const detailInsightHTML = detailInsights.map(item => (
    `<div class="insight-strip ${item.cls} reveal"><div class="insight-strip-label">${item.label}</div><div class="insight-strip-body">${item.value}</div></div>`
  )).join('')

  return `<div class="result-stack" style="--theme-color:${THEME};--theme-color-dim:${THEME_DIM};">
    <section class="result-module summary-module reveal">
      <div class="summary-top">
        <div class="summary-main">
          <div class="summary-title">${summary.title || '本局断语'}</div>
          <div class="summary-judgement">
            <span class="verdict-badge verdict-${vd.cls}">${vd.label}</span>
            <span class="conclusion">${summary.conclusion}</span>
          </div>
        </div>
        <div class="summary-score-bubble"><span class="score" id="vueScoreValue">${score}</span><span class="score-unit">分</span></div>
      </div>
      ${summary.keyword ? `<div class="keyword-highlight"><span class="keyword-label">关键判断</span><span class="keyword-text">${summary.keyword}</span></div>` : ''}
      ${question ? `<div class="question-bubble"><div class="question-text">“${question}”</div></div>` : ''}
    </section>

    <section class="result-module reveal">
      <div class="ai-header-title">行动建议</div>
      <div class="action-grid">${actionHTML}</div>
    </section>

    ${chartHTML}

    <section class="result-module reveal">
      <div class="ai-header-title">局势拆解</div>
      <div class="insight-flow">
        ${baziHTML}
        ${scoreBasisHTML}
        ${detailInsightHTML}
      </div>
    </section>

    ${riskHTML ? `<section class="result-module reveal"><div class="ai-header-title">风险提醒</div>${riskHTML}</section>` : ''}

    <section class="result-module reveal">
      <div class="ai-header-title">时位助力</div>
      <div class="footer">
        <div class="f-item"><span class="f-label">方位</span><span class="f-text">${advice.lucky_tips.direction || '-'}</span></div>
        <div class="f-item"><span class="f-label">时机</span><span class="f-text">${advice.lucky_tips.time || '-'}</span></div>
        <div class="f-item"><span class="f-label">动作</span><span class="f-text">${advice.lucky_tips.action || '-'}</span></div>
      </div>
    </section>
  </div>`
}
</script>

<style scoped>
/* 此处的样式为原 `index.html` 中的样式，
  因为使用了 scoped 属性，它们仅在当前组件生效。
  注意：全局样式（如 body, html 的重置，以及宇宙 Canvas 星空背景）
  建议放置于 src/styles/global.css 内。 
*/
.home-view {
  width: 100%;
}

/* 顶部导航 */
#siteHeader {
  position: fixed; top: 0; left: 0; right: 0; z-index: 300;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px;
  backdrop-filter: blur(24px) saturate(1.5);
  -webkit-backdrop-filter: blur(24px) saturate(1.5);
  background: rgba(5, 5, 10, 0.65);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.hamburger { width: 38px; height: 38px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; cursor: pointer; border-radius: 10px; transition: background .2s; border: none; background: transparent; flex-shrink: 0; }
.hamburger span { display: block; width: 18px; height: 1.5px; background: var(--text-primary); border-radius: 2px; transition: all .35s var(--spring); transform-origin: center; }
.hamburger.open span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
.hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
.hamburger.open span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }

.site-logo { font-family: 'Noto Serif SC', serif; font-size: 17px; letter-spacing: .15em; font-weight: 500; background: linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 50%, var(--gold) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 12px rgba(212,175,55,0.45)); position: relative; }

.header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.avatar-wrap { position: relative; flex-shrink: 0; }
.avatar-btn { width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--gold-border); background: rgba(212,175,55,0.08); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .3s; }
.avatar-menu { position: absolute; top: calc(100% + 10px); right: 0; min-width: 180px; padding: 8px 0; background: rgba(14,14,31,0.95); border: 1px solid var(--gold-border); border-radius: 14px; backdrop-filter: blur(24px); box-shadow: 0 12px 40px rgba(0,0,0,0.6); opacity: 0; pointer-events: none; transform: translateY(-6px); transition: all .25s var(--ease); z-index: 400; }
.avatar-menu.open { opacity: 1; pointer-events: all; transform: translateY(0); }
.avatar-email { padding: 10px 16px; font-size: 11px; color: var(--text-muted); border-bottom: 1px solid var(--glass-border); word-break: break-all; }
.avatar-menu-link { display: block; width: 100%; padding: 10px 16px; font-size: 13px; color: rgba(240,237,230,0.88); background: none; border: none; cursor: pointer; text-align: left; text-decoration: none; }
.avatar-menu-link:hover { color: var(--gold-light); background: rgba(212,175,55,0.06); }
.avatar-logout { display: block; width: 100%; padding: 10px 16px; font-size: 13px; color: var(--gold-light); background: none; border: none; cursor: pointer; text-align: left; }

/* 抽屉 */
#historyDrawer { position: absolute; inset: 0; width: 100%; z-index: 1; display: flex; flex-direction: column; background: rgba(14,14,31,0.88); border-right: 1px solid var(--gold-border); }
.drawer-head { padding: 64px 22px 18px; border-bottom: 1px solid var(--glass-border); }
.drawer-label { font-size: 10px; color: var(--text-muted); letter-spacing: .25em; margin-bottom: 4px; font-family: var(--font-serif); }
.drawer-title-txt { font-size: 20px; font-weight: 300; letter-spacing: .05em; }
.drawer-filter { padding: 12px 16px 10px; border-bottom: 1px solid var(--glass-border); }
.filter-label { font-size: 10px; color: var(--text-muted); letter-spacing: .2em; margin-bottom: 8px; }
.filter-caps { display: flex; flex-wrap: wrap; gap: 6px; }
.f-cap { font-size: 11px; padding: 4px 11px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: var(--text-muted); cursor: pointer; transition: all .2s; }
.f-cap.active { background: rgba(212,175,55,0.12); border-color: rgba(212,175,55,0.5); color: var(--gold-light); }
.drawer-body { flex: 1; overflow-y: auto; padding: 8px 0; }
.drawer-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; gap: 14px; text-align: center; color: var(--text-muted); font-size: 12px; }
.d-hist-item { padding: 13px 20px; display: flex; align-items: center; gap: 10px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.03); transition: background .2s; }
.d-hist-item:hover { background: rgba(255,255,255,0.04); }
.d-hist-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.d-hist-dot.ji { background: var(--teal); box-shadow: 0 0 6px var(--teal); }
.d-hist-dot.xiong { background: var(--crimson); box-shadow: 0 0 6px var(--crimson); }
.d-hist-dot.ping { background: var(--gold); box-shadow: 0 0 6px var(--gold-dim); }
.d-hist-info { flex: 1; overflow: hidden; }
.d-hist-q { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
.d-hist-meta { font-size: 10px; color: var(--text-muted); display: flex; gap: 8px; align-items: center; }
.d-hist-badge { font-size: 10px; padding: 2px 7px; border-radius: 20px; flex-shrink: 0; border: 1px solid; }

/* 页面 */
.page-wrap { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; padding: 76px 18px 60px; }
.container { width: 100%; max-width: 520px; }
.tagline { text-align: center; padding: 20px 0 12px; }
.tagline-main { font-family: var(--font-serif); font-size: 13px; font-weight: 300; letter-spacing: .3em; color: var(--text-muted); margin-bottom: 6px; }
.tagline-sub { font-size: 11px; letter-spacing: .18em; color: rgba(255,255,255,0.18); }

.glass-card, .input-box {
  background: var(--bg-card); border: 1px solid var(--glass-border);
  border-radius: var(--radius-card);
  backdrop-filter: blur(20px) saturate(1.2);
  box-shadow: 0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04);
  position: relative; overflow: hidden;
}
.input-box { display: flex; flex-direction: column; gap: 14px; margin-bottom: 16px; animation: riseIn 1s .15s cubic-bezier(.22,1,.36,1) both; }
.input-card { padding: 22px; margin-bottom: 16px; }
.input-label { font-family: var(--font-serif); font-size: 11px; letter-spacing: .2em; color: var(--text-muted); margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
.input-label::before, .input-label::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(212,175,55,0.2), transparent); }
textarea { width: 100%; min-height: 130px; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: var(--radius-item); padding: 16px; color: var(--text-primary); font-family: 'Noto Serif SC', serif; font-size: 15px; line-height: 1.8; resize: none; outline: none; transition: all .4s; }
textarea:focus { border-color: var(--gold-border); box-shadow: 0 0 0 1px rgba(212,175,55,0.12), 0 0 24px rgba(212,175,55,0.07); }
.time-row { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; }
.time-display { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 7px; }
.time-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--teal); box-shadow: 0 0 6px var(--teal); animation: pulse-dot 2s infinite; }
.time-note { font-size: 11px; color: rgba(255,255,255,0.18); font-family: 'Noto Serif SC', serif; }

.cta-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 16px; }
.cta-btn { width: 100%; height: 60px; border: none; outline: none; cursor: pointer; border-radius: 18px; position: relative; overflow: hidden; background: linear-gradient(135deg, #8B6914 0%, #D4AF37 35%, #E8CC80 55%, #D4AF37 75%, #8B6914 100%); background-size: 200% 100%; animation: shimmer 3s ease-in-out infinite; box-shadow: 0 4px 20px rgba(212,175,55,0.3); transition: transform .2s; }
.cta-btn:active { transform: scale(0.98); }
.cta-btn:disabled { opacity: 0.5; animation: none; cursor: not-allowed; }
.cta-inner { display: flex; align-items: center; justify-content: center; gap: 10px; height: 100%; }
.cta-text { font-family: 'Noto Serif SC', serif; font-size: 17px; font-weight: 500; color: #1a1000; letter-spacing: .15em; }
.cta-hint { font-size: 11px; color: rgba(255,255,255,0.2); }

.auth-card { display: flex; flex-direction: column; gap: 14px; padding: 22px; margin-bottom: 16px; animation: riseIn 1s cubic-bezier(.22,1,.36,1) both; }
.field-label { font-size: 10px; color: var(--text-muted); letter-spacing: 2px; }
input[type="email"], input[type="password"] { width: 100%; background: rgba(0,0,0,0.25); border: 1px solid var(--glass-border); border-radius: var(--radius-item); padding: 13px 16px; color: var(--text-primary); font-size: 15px; outline: none; }
.auth-submit { width: 100%; padding: 15px; border: none; border-radius: var(--radius-item); background: linear-gradient(135deg, #E8CC80 0%, #B38B36 45%, #C9A052 100%); color: #0a0800; font-size: 15px; font-family: var(--font-serif); font-weight: 600; cursor: pointer; }
.auth-divider { display: flex; align-items: center; gap: 12px; color: rgba(255,255,255,0.22); font-size: 11px; }
.auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.08); }
.google-submit { width: 100%; min-height: 48px; padding: 12px 15px; border: 1px solid rgba(212,175,55,0.26); border-radius: var(--radius-item); background: linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.028)); color: rgba(240,237,230,0.92); font-size: 14px; font-family: var(--font-body); font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 11px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), 0 10px 24px rgba(0,0,0,0.18); transition: transform .2s, border-color .2s, background .2s, box-shadow .2s, opacity .2s; }
.google-submit:hover { border-color: rgba(232,204,128,0.46); background: linear-gradient(180deg, rgba(255,255,255,0.105), rgba(212,175,55,0.055)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.09), 0 12px 28px rgba(0,0,0,0.22), 0 0 22px rgba(212,175,55,0.07); }
.google-submit:active { transform: scale(0.985); }
.google-submit:disabled { opacity: 0.58; cursor: not-allowed; box-shadow: none; }
.google-mark { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; flex: 0 0 24px; border-radius: 7px; background: rgba(255,255,255,0.96); box-shadow: 0 1px 0 rgba(255,255,255,0.35), 0 6px 14px rgba(0,0,0,0.2); }
.google-mark svg { width: 16px; height: 16px; display: block; }
.guest-submit { width: 100%; padding: 13px; border: 1px solid var(--gold-border); border-radius: var(--radius-item); background: rgba(212,175,55,0.08); color: var(--gold-light); font-size: 14px; font-family: var(--font-serif); cursor: pointer; }
.guest-note { color: var(--text-muted); font-size: 11px; line-height: 1.6; text-align: center; }
.forgot-password-link { border: none; background: transparent; color: rgba(232,204,128,0.86); font-size: 12px; cursor: pointer; text-align: center; }
.forgot-password-link:disabled { opacity: 0.6; cursor: not-allowed; }
.auth-notice { padding: 10px 12px; border-radius: 10px; background: rgba(78,205,196,0.08); border: 1px solid rgba(78,205,196,0.18); color: rgba(240,237,230,0.86); font-size: 12px; line-height: 1.6; text-align: center; }
.auth-switch { text-align: center; font-size: 12px; color: var(--text-muted); cursor: pointer; }
.auth-switch span { color: var(--gold); text-decoration: underline; }

.bazi-toggle { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: var(--radius-item); border: 1px solid var(--glass-border); cursor: pointer; background: rgba(0,0,0,0.15); }
.bazi-toggle-text { font-size: 14px; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
.switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background: rgba(255,255,255,0.08); border-radius: 24px; transition: .4s; }
.slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background: var(--text-muted); border-radius: 50%; transition: .4s; }
input:checked + .slider { background: var(--gold); }
input:checked + .slider:before { transform: translateX(20px); background: #fff; }
.profile-selector { display: flex; gap: 10px; }
.profile-select { flex: 1; background: rgba(0,0,0,0.35); border: 1px solid var(--gold); color: #fff; padding: 10px; border-radius: 8px; outline: none; font-size: 14px; }
.info-icon { display: inline-flex; justify-content: center; align-items: center; width: 16px; height: 16px; border-radius: 50%; border: 1px solid var(--text-muted); color: var(--text-muted); font-size: 11px; margin-left: 8px; }

/* 注入的八字简表样式复刻自 BaziView */
.bazi-table-wrap { width: 100%; overflow: hidden; }
.bazi-table { table-layout: fixed; width: 100%; border-collapse: collapse; text-align: center; }
.bazi-table th, .bazi-table td { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.03); vertical-align: middle; word-wrap: break-word; }
.bazi-table th { color: var(--gold-light); font-family: var(--font-serif); font-size: 12px; font-weight: normal; letter-spacing: 1px; }

.bz-label { color: var(--text-muted); font-weight: 500; font-size: 10px; }
.bz-char { font-size: 16px; font-weight: 600; font-family: var(--font-ganzhi); margin: 2px 0; }
.bz-sub { font-size: 10px; color: #aaa; line-height: 1.4; }

.wx-jin { color: #E8CC80 !important; } .wx-mu { color: #81C784 !important; } .wx-shui { color: #64B5F6 !important; } .wx-huo { color: #E57373 !important; } .wx-tu { color: #DCE775 !important; }

.bazi-details { margin-top: 14px; }
.bazi-details summary { font-size: 13px; color: var(--gold); font-weight: 600; cursor: pointer; outline: none; list-style: none; display: flex; align-items: center; }
.bazi-details summary::-webkit-details-marker { display: none; }
.bazi-details summary::after { content: '▼'; font-size: 10px; margin-left: 6px; transition: transform .3s; }
.bazi-details[open] summary::after { transform: rotate(180deg); }
.bazi-summary-text { font-size: 12px; color: #D0D0D8; line-height: 1.8; white-space: pre-wrap; opacity: .85; margin-top: 8px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 10px; }

/* 动画和结果页 */
#loader { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 32px 0; }
.bagua-ring-wrap { position: relative; width: 120px; height: 120px; }
.bagua-svg { width: 100%; height: 100%; animation: rotateBagua 8s linear infinite; }
.loader-main-text { font-family: var(--font-serif); font-size: 13px; color: var(--gold); text-align: center; }

.reset-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 50px; background: transparent; border: 1px solid var(--glass-border); border-radius: 14px; color: var(--text-muted); font-size: 13px; cursor: pointer; margin-top: 16px; }

.bazi-info-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.72); backdrop-filter: blur(6px); z-index: 9999; display: none; align-items: center; justify-content: center; padding: 20px; opacity: 0; transition: opacity .3s; }
.bazi-info-overlay.show { display: flex; opacity: 1; }
.bazi-info-card { background: rgba(14,14,31,0.95); border: 1px solid var(--gold-border); border-radius: var(--radius-card); padding: 26px 24px; max-width: 400px; width: 100%; box-shadow: 0 24px 60px rgba(0,0,0,0.8); }
.bazi-info-title { font-family: var(--font-serif); font-size: 16px; font-weight: 500; color: var(--gold-light); margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(212,175,55,0.15); padding-bottom: 14px; }
.bazi-info-close { cursor: pointer; color: var(--text-muted); font-size: 22px; font-weight: 300; transition: color .2s; line-height: 1; display: flex; align-items: center; }
.bazi-info-close:hover { color: var(--gold); }
.bazi-info-text { display: flex; flex-direction: column; gap: 16px; }
.info-block { background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px; }
.info-block-title { font-size: 14px; color: var(--gold); margin-bottom: 10px; font-family: var(--font-serif); display: flex; align-items: center; gap: 6px; }
.info-block-title span { font-size: 11px; color: var(--text-muted); font-family: sans-serif; font-weight: normal; }
.info-block p { font-size: 13px; color: #D0D0D8; line-height: 1.65; margin: 0; }
.highlight { color: var(--gold-light); font-weight: 500; }
.info-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.info-list li { position: relative; padding-left: 14px; font-size: 13px; color: #D0D0D8; line-height: 1.6; }
.info-list li::before { content: "•"; position: absolute; left: 0; top: 0; color: var(--gold); font-size: 14px; line-height: 1.6; }
.list-label { color: #FFF; font-weight: 500; margin-right: 6px; }
.bazi-summary-box { margin-top: 4px; padding: 14px 16px; background: linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.02)); border: 1px solid rgba(212,175,55,0.2); border-radius: 12px; border-left: 3px solid var(--gold); }
.summary-box-label { font-size: 11px; color: var(--gold); letter-spacing: 1px; margin-bottom: 6px; font-weight: 500; }
.summary-box-content { font-size: 13px; color: #F1E6C4; line-height: 1.6; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.4s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@keyframes riseIn { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
@keyframes rotateBagua { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes shimmer { 0% { background-position: 100% 50%; } 50% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }

/* ══ v-html 结果区样式 — 独立模块、手机端优先 ══ */
:deep(.result-stack) { display:flex; flex-direction:column; gap:14px; margin-bottom:16px; }
:deep(.result-module) {
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.28);
  backdrop-filter: blur(18px) saturate(1.15);
  -webkit-backdrop-filter: blur(18px) saturate(1.15);
}
:deep(.summary-module) { display:flex; flex-direction:column; gap:12px; }
:deep(.summary-top) { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:14px; align-items:start; }
:deep(.summary-main) { min-width:0; display:flex; flex-direction:column; gap:10px; }
:deep(.summary-title) { font-size:12px; color:var(--text-muted); letter-spacing:2px; }
:deep(.summary-score-bubble) {
  min-width:84px;
  display:flex; align-items:flex-end; justify-content:center; gap:3px;
  padding:12px 12px 10px; line-height:1;
  background:linear-gradient(180deg,var(--theme-color-dim,rgba(179,139,54,0.15)),rgba(255,255,255,0.03));
  border:1px solid color-mix(in srgb,var(--theme-color,#B38B36) 24%,transparent);
  border-radius:18px;
  box-shadow:0 0 24px var(--theme-color-dim,rgba(179,139,54,0.15));
}
:deep(.score) {
  color:var(--theme-color,#B38B36); font-family:var(--font-serif); font-weight:700; font-size:42px; letter-spacing:0;
  text-shadow:0 0 18px var(--theme-color-dim,rgba(179,139,54,0.15));
}
:deep(.score-unit) { color:var(--gold-light); font-family:var(--font-serif); font-size:18px; line-height:1.2; }
:deep(.summary-judgement) { display:flex; flex-direction:column; align-items:flex-start; gap:10px; min-width:0; }
:deep(.verdict-badge) { display:inline-flex; font-family:var(--font-serif); font-size:14px; padding:4px 13px; border-radius:999px; letter-spacing:.08em; border:1px solid; }
:deep(.verdict-da-ji) { color:#00D26A; background:rgba(0,210,106,0.06); border-color:rgba(0,210,106,0.2); text-shadow:0 0 14px rgba(0,210,106,0.35); }
:deep(.verdict-xiao-ji) { color:var(--teal); background:rgba(78,205,196,0.06); border-color:rgba(78,205,196,0.2); }
:deep(.verdict-ping) { color:var(--gold-light); background:rgba(212,175,55,0.06); border-color:rgba(212,175,55,0.2); }
:deep(.verdict-da-xiong) { color:var(--crimson); background:rgba(255,94,87,0.06); border-color:rgba(255,94,87,0.2); }
:deep(.conclusion) { font-family:var(--font-serif); font-size:23px; color:var(--theme-color,#E8CC80); line-height:1.5; letter-spacing:0; text-shadow:0 0 24px color-mix(in srgb,var(--theme-color,#B38B36) 26%,transparent); }
:deep(.keyword-highlight) {
  display:flex;
  align-items:center;
  gap:10px;
  width:fit-content;
  max-width:100%;
  padding:8px 12px;
  border-radius:12px;
  background:linear-gradient(90deg,var(--theme-color-dim,rgba(179,139,54,0.15)),rgba(255,255,255,0.02));
  border:1px solid color-mix(in srgb,var(--theme-color,#B38B36) 18%,rgba(255,255,255,0.06));
  box-shadow:0 0 18px var(--theme-color-dim,rgba(179,139,54,0.12));
  line-height:1.55;
}
:deep(.keyword-label) {
  flex-shrink:0;
  font-size:10px;
  color:var(--gold-light);
  letter-spacing:1.4px;
}
:deep(.keyword-text) {
  font-size:13px;
  color:#F1E6C4;
  overflow-wrap:anywhere;
}
:deep(.question-bubble) {
  width:100%;
  padding:12px 14px;
  background:rgba(255,255,255,0.025);
  border:1px solid rgba(255,255,255,0.06);
  border-radius:14px;
  box-sizing:border-box;
}
:deep(.question-text) { font-size:14px; color:rgba(240,237,230,0.76); font-style:normal; line-height:1.7; overflow-wrap:anywhere; }
:deep(.ai-header-title) {
  font-family: var(--font-serif);
  color: var(--gold);
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}
:deep(.ai-header-title)::before { content: '✧'; font-size: 12px; }
:deep(.action-grid) { display:flex; flex-direction:column; gap:10px; margin-bottom:16px; }
:deep(.action-step) { min-width:0; padding:13px 13px 14px; border-radius:14px; background:linear-gradient(180deg,rgba(232,204,128,0.055),rgba(255,255,255,0.018)); border:1px solid rgba(232,204,128,0.12); }
:deep(.action-index) { font-family:var(--font-serif); font-size:20px; color:var(--theme-color,#B38B36); margin-bottom:8px; }
:deep(.action-copy) { font-size:13px; color:#D7D1C4; line-height:1.65; overflow-wrap:anywhere; }
/* 九宫格 */
:deep(.pan-wrapper) { background:rgba(0,0,0,0.25); border:1px solid var(--gold-border); border-radius:16px; padding:14px; position:relative; overflow:hidden; }
:deep(.pan-wrapper)::before { content:''; position:absolute; inset:0; background:radial-gradient(circle at 50% 50%,rgba(212,175,55,0.03) 0%,transparent 70%); pointer-events:none; }
:deep(.pan-header) { text-align:center; margin-bottom:12px; }
:deep(.pan-pillars) { font-family:var(--font-serif); font-size:16px; color:#FFF; letter-spacing:3px; margin-bottom:5px; }
:deep(.pan-info) { font-size:11px; color:#777; line-height:1.75; }
:deep(.pan-info b) { color:var(--theme-color,#B38B36); font-weight:600; }
:deep(.pan-grid) { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:rgba(255,255,255,0.04); border-radius:8px; overflow:hidden; border:1px solid rgba(255,255,255,0.04); }
:deep(.pan-cell) { background:rgba(10,10,22,0.92); aspect-ratio:1; position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; transition:background .2s; }
:deep(.pan-cell:hover) { background:rgba(255,255,255,0.03); }
:deep(.pan-center-earth) { font-size:30px; font-weight:900; color:var(--text-dim); font-family:'Noto Serif SC',serif; }
:deep(.pan-god) { position:absolute; top:5px; font-size:8px; color:#555; font-family:'Noto Serif SC',serif; }
:deep(.pan-star) { font-size:11px; color:#CCC; margin-bottom:1px; z-index:2; font-family:'Noto Serif SC',serif; }
:deep(.pan-door) { font-size:14px; font-weight:700; color:#FFF; z-index:2; font-family:'Noto Serif SC',serif; }
:deep(.pan-stem) { position:absolute; font-size:10px; font-weight:600; font-family:'Noto Serif SC',serif; }
:deep(.stem-sky) { top:5px; left:6px; color:#DDDDE8; }
:deep(.stem-earth) { bottom:5px; right:6px; color:#666; }
:deep(.ji-sky) { top:18px; left:6px; font-size:8px; color:#444; }
:deep(.ji-earth) { bottom:18px; right:6px; font-size:8px; color:#444; }
:deep(.pan-marks) { position:absolute; bottom:4px; left:4px; display:flex; gap:2px; z-index:3; }
:deep(.pan-mark) { font-size:8px; padding:1px 3px; border-radius:3px; font-weight:700; }
:deep(.mark-ma) { background:var(--theme-color,#B38B36); color:#000; }
:deep(.mark-kong) { border:1px solid #444; color:#666; background:rgba(0,0,0,0.4); }
:deep(.highlight-text) { color:var(--theme-color,#E8CC80) !important; text-shadow:0 0 12px color-mix(in srgb,var(--theme-color,#B38B36) 50%,transparent); }
/* 单列洞察条 */
:deep(.insight-flow) { display:flex; flex-direction:column; gap:10px; }
:deep(.insight-strip) { position:relative; padding:14px 16px 14px 18px; background:rgba(0,0,0,0.18); border:1px solid rgba(255,255,255,0.05); border-radius:12px; border-left:3px solid rgba(255,255,255,0.1); transition:border-color .3s, transform .25s, box-shadow .25s; }
:deep(.insight-strip:hover) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(0,0,0,0.25); }
:deep(.insight-strip-label) { font-size:10px; color:var(--text-muted); letter-spacing:1.5px; text-transform:uppercase; margin-bottom:8px; font-weight:500; }
:deep(.insight-strip-body) { font-size:13px; color:#D0D0D8; line-height:1.75; }
:deep(.accent-theme) { border-left-color:var(--theme-color,#B38B36); background:linear-gradient(135deg,color-mix(in srgb,var(--theme-color,#B38B36) 5%,transparent),transparent); }
:deep(.accent-theme .insight-strip-label) { color:var(--theme-color,#B38B36); }
:deep(.accent-amber) { border-left-color:#F5C518; background:linear-gradient(135deg,rgba(245,197,24,0.03),transparent); }
:deep(.accent-amber .insight-strip-label) { color:#F5C518; }
:deep(.accent-indigo) { border-left-color:#7B8CFF; background:linear-gradient(135deg,rgba(107,140,255,0.03),transparent); }
:deep(.accent-indigo .insight-strip-label) { color:#8B9AFF; }
:deep(.accent-gold) { border-left-color:var(--gold); background:linear-gradient(135deg,rgba(212,175,55,0.03),transparent); }
:deep(.accent-gold .insight-strip-label) { color:var(--gold-light); }
:deep(.accent-violet) { border-left-color:#B39DDB; background:linear-gradient(135deg,rgba(179,157,219,0.03),transparent); }
:deep(.accent-violet .insight-strip-label) { color:#B39DDB; }
:deep(.accent-teal) { border-left-color:var(--teal); background:linear-gradient(135deg,rgba(78,205,196,0.03),transparent); }
:deep(.accent-teal .insight-strip-label) { color:var(--teal); }
:deep(.accent-neutral) { border-left-color:rgba(255,255,255,0.15); }
/* 评分依据 */
:deep(.score-basis-body) { display:flex; flex-direction:column; gap:10px; margin-top:4px; }
:deep(.sb-row) { display:flex; flex-direction:column; gap:6px; }
:deep(.sb-row-title) { font-size:9px; color:var(--text-muted); font-weight:600; letter-spacing:1.5px; }
:deep(.sb-tags) { display:flex; flex-wrap:wrap; gap:6px; }
:deep(.sb-tag) { font-size:11px; padding:3px 10px; border-radius:20px; font-weight:500; transition:transform .2s; }
:deep(.sb-tag:hover) { transform:scale(1.05); }
:deep(.sb-tag.positive) { background:rgba(0,210,106,0.08); color:#00D26A; border:1px solid rgba(0,210,106,0.18); }
:deep(.sb-tag.negative) { background:rgba(255,94,87,0.08); color:#FF5E57; border:1px solid rgba(255,94,87,0.18); }
:deep(.sb-logic) { font-size:12px; color:#8888A0; line-height:1.7; padding:10px 12px; background:rgba(255,255,255,0.015); border-radius:8px; border-left:2px solid var(--theme-color,#B38B36); }
/* 策略与风险 */
:deep(.strategy-list) { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px; }
:deep(.strategy-list li) { position:relative; padding:12px 14px 12px 36px; background:rgba(0,0,0,0.15); border:1px solid rgba(255,255,255,0.05); border-radius:10px; color:#C8C8D4; font-size:13px; line-height:1.7; transition:border-color .25s,background .25s; }
:deep(.strategy-list li:hover) { border-color:rgba(212,175,55,0.18); background:rgba(212,175,55,0.02); }
:deep(.strategy-list li)::before { content:"\2726"; position:absolute; left:14px; top:13px; color:var(--theme-color,#B38B36); font-size:10px; }
:deep(.risk-alert) { background:rgba(255,94,87,0.04); border:1px solid rgba(255,94,87,0.12); border-left:3px solid #FF5E57; border-radius:10px; padding:14px 16px; }
:deep(.risk-alert-content) { color:#D0D0D8; font-size:13px; line-height:1.7; }
/* 底部吉运 */
:deep(.footer) { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
:deep(.f-item) { min-width:0; display:flex; flex-direction:column; gap:6px; padding:12px; border-radius:12px; background:rgba(255,255,255,0.02); border:1px solid rgba(212,175,55,0.08); }
:deep(.f-label) { font-size:10px; color:var(--text-muted); letter-spacing:1px; }
:deep(.f-text) { font-size:12px; font-weight:600; color:var(--theme-color,#E8CC80); line-height:1.5; overflow-wrap:anywhere; }
/* 渐显 */
:deep(.reveal) { opacity:0; transform:translateY(14px); transition:opacity .6s ease,transform .6s ease; }
:deep(.reveal.visible) { opacity:1; transform:none; }
@keyframes glowPulse { 0%,100% { box-shadow:0 0 16px var(--theme-color-dim,rgba(179,139,54,0.12)); } 50% { box-shadow:0 0 28px var(--theme-color-dim,rgba(179,139,54,0.25)); } }
@keyframes floatIcon { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-3px); } }
@media(max-width:400px) { 
  :deep(.summary-top) { grid-template-columns:1fr; }
  :deep(.summary-score-bubble) { min-width:96px; justify-self:start; }
  :deep(.conclusion) { font-size:21px; } 
  :deep(.footer) { grid-template-columns:1fr; }
  :deep(.score) { font-size:38px; }
}


</style>
