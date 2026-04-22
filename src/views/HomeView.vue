<template>
  <div class="home-view">
    <header id="siteHeader">
      <button class="hamburger" :class="{ open: globalState.isDrawerOpen }" @click="toggleDrawer" aria-label="历史记录">
        <span></span><span></span><span></span>
      </button>
      <div class="site-logo" @click="resetToInput" style="cursor: pointer;" title="返回首页">奇门遁甲</div>
      <div class="avatar-wrap">
        <div class="avatar-btn" @click="toggleAvatarMenu" title="账号">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="6" r="3" stroke="rgba(212,175,55,0.75)" stroke-width="1.2"/>
            <path d="M2 15c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke="rgba(212,175,55,0.75)" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="avatar-menu" :class="{ open: isAvatarMenuOpen }">
          <div class="avatar-email">{{ currentUser ? currentUser.email : '未登录' }}</div>
          <button class="avatar-logout" @click="handleSignOut">退出登录</button>
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
            <p v-html="activeCategory === 'all' ? '尚无推演记录<br>缘起于此，万象皆空' : '此类型暂无记录'"></p>
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

        <div v-if="!currentUser" class="glass-card auth-card">
          <div class="field-label">{{ isLoginMode ? '身份认证 (登录)' : '创建账号 (注册)' }}</div>
          <input type="email" v-model="authForm.email" placeholder="请输入邮箱地址"/>
          <input type="password" v-model="authForm.password" placeholder="请输入密码 (至少6位)"/>
          <button class="auth-submit" :disabled="authLoading" @click="handleAuth">
            <span>{{ authLoading ? '验证中...' : (isLoginMode ? '登 录' : '注 册') }}</span>
          </button>
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
          <h4>一、标准解卦：无需八字 ❌</h4>
          <p>单纯预测<strong>具体事件走向</strong>（如今日出行、近期合同、求财结果等），奇门局本身已足够。</p>
          <h4>二、深度解卦：需要八字 ✅</h4>
          <ul>
            <li><strong>判断个人旺衰：</strong>涉及健康、婚姻前途、命运走向，需用日干印证。</li>
            <li><strong>流年大运配合：</strong>结合八字大运判断具体年份变化。</li>
            <li><strong>六亲宫位对应：</strong>判断婚姻、子嗣等，用八字强弱印证局盘信息。</li>
            <li><strong>精准应期定位：</strong>两套体系交接点吻合，应验概率更高。</li>
          </ul>
          <div class="bazi-summary-box">💡 <strong>一句话总结：</strong><br>凡涉及<strong>"这个人能不能成事"</strong>，引入八字让两套体系互为印证，准确率大幅提升！</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { globalState } from '../store.js'

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
  if (session) {
    currentUser.value = session.user
    loadHistory()
  } else {
    currentUser.value = null
    historyRecords.value = []
    resetToInput()
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

const handleSignOut = async () => {
  await supabase.auth.signOut()
  isAvatarMenuOpen.value = false
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
  if (!session) return alert("请先登录")

  isSubmitting.value = true
  viewState.value = 'loading'
  startLoaderCycle()

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ question: input, baziInfo: baziEnabled.value ? currentBaziString.value : null })
    })
    const data = await response.json()
    await saveRecordToDatabase(input, data)
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
    if (el) el.textContent = Math.round(current) + ' 分'
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
  await supabase.from('qimen_records').insert([{ user_id: currentUser.value.id, question, qimen_data: data, category: data.category || 'general' }])
  await loadHistory()
}

const filteredHistory = computed(() => activeCategory.value === 'all' ? historyRecords.value : historyRecords.value.filter(r => r.category === activeCategory.value))

const loadRecord = (item) => {
  globalState.isDrawerOpen = false
  resultHtml.value = buildCardHTML(item.qimen_data)
  viewState.value = 'result'
}

const getVerdictInfo = (score) => {
  if (score >= 90) return { label: '大吉', cls: 'da-ji' }
  if (score >= 75) return { label: '小吉', cls: 'xiao-ji' }
  if (score >= 55) return { label: '平', cls: 'ping' }
  return { label: '凶', cls: 'da-xiong' }
}

const getVerdictCls = (score) => score >= 75 ? 'ji' : score >= 55 ? 'ping' : 'xiong'

const buildCardHTML = (data) => {
  const summary = data.summary || {}, vd = getVerdictInfo(summary.score || 0)
  return `<div class="card">
    <div class="card-header"><div><div class="title">${summary.title}</div><div class="verdict-badge verdict-${vd.cls}">${vd.label}</div></div><div class="score" id="vueScoreValue">${summary.score} 分</div></div>
    <div class="conclusion">${summary.conclusion}</div>
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

.avatar-wrap { position: relative; flex-shrink: 0; }
.avatar-btn { width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--gold-border); background: rgba(212,175,55,0.08); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .3s; }
.avatar-menu { position: absolute; top: calc(100% + 10px); right: 0; min-width: 180px; padding: 8px 0; background: rgba(14,14,31,0.95); border: 1px solid var(--gold-border); border-radius: 14px; backdrop-filter: blur(24px); box-shadow: 0 12px 40px rgba(0,0,0,0.6); opacity: 0; pointer-events: none; transform: translateY(-6px); transition: all .25s var(--ease); z-index: 400; }
.avatar-menu.open { opacity: 1; pointer-events: all; transform: translateY(0); }
.avatar-email { padding: 10px 16px; font-size: 11px; color: var(--text-muted); border-bottom: 1px solid var(--glass-border); word-break: break-all; }
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
.bz-char { font-size: 16px; font-weight: 600; font-family: 'Noto Serif SC', serif; margin: 2px 0; }
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
.bazi-info-card { background: rgba(14,14,31,0.95); border: 1px solid var(--gold-border); border-radius: var(--radius-card); padding: 24px; max-width: 400px; width: 100%; box-shadow: 0 24px 60px rgba(0,0,0,0.8); }
.bazi-info-title { font-size: 15px; color: var(--gold-light); margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.4s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@keyframes riseIn { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
@keyframes rotateBagua { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes shimmer { 0% { background-position: 100% 50%; } 50% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }

/* 注入全局生成的 v-html 卡片样式 */
:deep(.card) { background: var(--bg-card); border-radius: var(--radius-card); border: 1px solid var(--glass-border); padding: 24px 20px; margin-bottom: 16px; box-shadow: 0 24px 60px rgba(0,0,0,0.65); backdrop-filter: blur(16px); }
:deep(.card-header) { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
:deep(.score-badge .score) { background: var(--theme-color-dim); color: var(--theme-color); padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 18px; border: 1px solid color-mix(in srgb, var(--theme-color) 30%, transparent); }
:deep(.conclusion) { font-family: var(--font-serif); font-size: 24px; color: var(--theme-color); margin-bottom: 8px; line-height: 1.35; }
:deep(.keyword) { display: inline-flex; font-size: 12px; color: var(--text-muted); background: rgba(255,255,255,0.04); padding: 4px 12px; border-radius: 20px; margin-bottom: 20px; }
:deep(.user-question) { font-size: 14px; padding: 13px 15px; border-left: 2px solid var(--theme-color); margin-bottom: 22px; font-style: italic; background: rgba(255,255,255,0.025); }
:deep(.pan-wrapper) { background: rgba(0,0,0,0.3); border: 1px solid var(--gold-border); border-radius: 16px; padding: 14px; text-align: center; }
:deep(.pan-grid) { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(255,255,255,0.04); border-radius: 8px; }
:deep(.pan-cell) { background: rgba(14,14,31,0.9); aspect-ratio: 1; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; }
:deep(.info-grid) { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
:deep(.grid-item) { background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); padding: 13px; border-radius: var(--radius-item); }
:deep(.label) { font-size: 9px; color: var(--text-muted); display: block; margin-bottom: 6px; }
:deep(.value) { font-size: 13px; color: #DDDDE5; }
:deep(.strategy-list li) { position: relative; padding: 11px 13px 11px 34px; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 10px; font-size: 13px; margin-bottom: 8px; }
:deep(.reveal) { opacity: 0; transform: translateY(14px); transition: opacity .6s ease, transform .6s ease; }
:deep(.reveal.visible) { opacity: 1; transform: none; }
:deep(.section-title) { display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 10px; margin: 24px 0 12px; }
:deep(.footer) { display: flex; gap: 8px; background: linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.04)); padding: 14px 10px; border-radius: 14px; margin-top: 24px; text-align: center; }
:deep(.f-item) { flex: 1; font-size: 11px; color: var(--theme-color); }

/* 五行颜色和八字简表样式 */
.wx-mu { color: #5BC28B !important; }
.wx-huo { color: #FF6B6B !important; }
.wx-tu { color: #D4AF37 !important; text-shadow: 0 0 8px rgba(212,175,55,0.4); }
.wx-jin { color: #A0B0C0 !important; }
.wx-shui { color: #4EAEE6 !important; }

/* 注入的八字简表样式复刻自 BaziView */
.bazi-table-wrap { width: 100%; overflow: hidden; }
.bazi-table { table-layout: fixed; width: 100%; border-collapse: collapse; text-align: center; }
.bazi-table th, .bazi-table td { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.03); vertical-align: middle; word-wrap: break-word; }
.bazi-table th { color: var(--gold-light); font-family: var(--font-serif); font-size: 12px; font-weight: normal; letter-spacing: 1px; }

.bz-label { color: var(--text-muted); font-weight: 500; font-size: 10px; }
.bz-char { font-size: 16px; font-weight: 600; font-family: 'Noto Serif SC', serif; margin: 2px 0; }
.bz-sub { font-size: 10px; color: #aaa; line-height: 1.4; }

.wx-jin { color: #E8CC80 !important; } .wx-mu { color: #81C784 !important; } .wx-shui { color: #64B5F6 !important; } .wx-huo { color: #E57373 !important; } .wx-tu { color: #DCE775 !important; }

.bazi-details { margin-top: 14px; }
.bazi-details summary { font-size: 13px; color: var(--gold); font-weight: 600; cursor: pointer; outline: none; list-style: none; display: flex; align-items: center; }
.bazi-details summary::-webkit-details-marker { display: none; }
.bazi-details summary::after { content: '▼'; font-size: 10px; margin-left: 6px; transition: transform .3s; }
.bazi-details[open] summary::after { transform: rotate(180deg); }
.bazi-summary-text { font-size: 12px; color: #D0D0D8; line-height: 1.8; white-space: pre-wrap; opacity: .85; margin-top: 8px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 10px; }

</style>

