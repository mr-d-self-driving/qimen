<template>
  <div class="home-view">
    <header id="siteHeader">
      <button class="hamburger" :class="{ open: isDrawerOpen }" @click="toggleDrawer" aria-label="历史记录">
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

    <div class="drawer-overlay" :class="{ open: isDrawerOpen }" @click="toggleDrawer"></div>
    <div id="historyDrawer" :class="{ open: isDrawerOpen }">
      <div class="drawer-head">
        <div class="drawer-label">推演轨迹</div>
        <div class="drawer-title-txt">历史问卜</div>
      </div>
      <div class="drawer-filter">
        <div class="filter-label">问题类型</div>
        <div class="filter-caps">
          <div v-for="cat in categories" :key="cat.value" 
               class="f-cap" :class="{ active: activeCategory === cat.value }" 
               @click="setCategory(cat.value)">
            {{ cat.label }}
          </div>
        </div>
      </div>
      <div class="drawer-body">
        <div v-if="filteredHistory.length === 0" class="drawer-empty">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" opacity="0.3"><circle cx="32" cy="32" r="28" stroke="rgba(212,175,55,0.5)" stroke-width="1"/><circle cx="32" cy="32" r="18" stroke="rgba(212,175,55,0.3)" stroke-width="1" stroke-dasharray="3 3"/><circle cx="32" cy="32" r="3" fill="rgba(212,175,55,0.5)"/></svg>
          <p>{{ activeCategory === 'all' ? '尚无推演记录<br>缘起于此，万象皆空' : '此类型暂无记录' }}</p>
        </div>
        <div v-else>
          <div v-for="record in filteredHistory" :key="record.id" class="d-hist-item" @click="loadRecord(record)">
            <span class="d-hist-dot" :class="getVerdictCls(record.score)"></span>
            <div class="d-hist-info">
              <div class="d-hist-q">{{ record.question }}</div>
              <div class="d-hist-meta">
                <span>{{ record.dateStr }}</span><span>·</span>
                <span>{{ record.catLabel }}</span><span>·</span>
                <span>{{ record.score }}分</span>
              </div>
            </div>
            <span class="d-hist-badge" :class="'verdict-' + getVerdictInfo(record.score).cls">{{ getVerdictInfo(record.score).label }}</span>
          </div>
        </div>
      </div>
    </div>

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
                    <div style="font-size:13px;color:var(--gold);font-weight:600;margin-bottom:8px;">✨ 命理基底已锁定</div>
                    <div style="font-size:12px;color:#D0D0D8;line-height:1.8;white-space:pre-wrap;opacity:.85;">
                      {{ currentBaziSummary }}
                    </div>
                  </div>

                  <div v-show="baziState === 'warning'" style="margin-top:16px;padding:16px;background:rgba(255,94,87,0.05);border-radius:12px;border:1px solid rgba(255,94,87,0.2);">
                    <div style="font-size:12px;color:#FF5E57;line-height:1.6;">
                      ⚠️ 该档案暂无云端排盘数据。<br>请先前往底部 <b>「八字」</b> 模块点击推演，生成命理基底后再行注入。
                    </div>
                  </div>
                </div>
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

// ============== 配置项 ==============
// ⚠️ 注意：在 Vue Vite 中，环境变量应以 VITE_ 前缀配置在 .env 文件中
// 这里保留你的直写方式便于平滑迁移
const SUPABASE_URL = 'https://xkbqiiwwgfzkyfhxuoev.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_qr9YBIA6n32r-mcqKbkpgA_0XVTUSI7'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const API_URL = "/api/qimen"

// ============== 响应式状态 ==============
const currentUser = ref(null)
const isLoginMode = ref(true)
const authLoading = ref(false)
const authForm = reactive({ email: '', password: '' })

const viewState = ref('input') // 'input' | 'loading' | 'result'
const questionInput = ref('')
const isSubmitting = ref(false)
const clockText = ref('载入时辰中…')

const isDrawerOpen = ref(false)
const isAvatarMenuOpen = ref(false)
const showBaziModal = ref(false)

// 八字注入状态
const baziEnabled = ref(false)
const baziProfiles = ref([])
const selectedProfileId = ref('')
const baziState = ref('idle') // 'idle' | 'ready' | 'warning'
const currentBaziSummary = ref('')
const currentBaziString = ref('')

// 历史记录状态
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

// 结果状态
const resultHtml = ref('')
const currentScore = ref(0) // 用于动画
let scoreTimer = null

// 动画文本
const LOADER_MESSAGES = ['正在接通云端超算矩阵...','推演时空坐标与节气数据...','计算奇门九宫落盘...','分析值符、值使与神助...','生成决策指引与应期推演...']
const currentLoaderMessage = ref(LOADER_MESSAGES[0])
let loaderInterval = null

// ============== 生命周期 ==============
let clockInterval = null

onMounted(() => {
  updateClock()
  clockInterval = setInterval(updateClock, 30000)

  // 监听点击外部关闭菜单
  document.addEventListener('click', closeMenus)

  // Supabase Auth 监听
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

// ============== 核心方法 ==============

const closeMenus = () => {
  isAvatarMenuOpen.value = false
}

const toggleDrawer = () => {
  isDrawerOpen.value = !isDrawerOpen.value
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

// ============== 八字注入逻辑 ==============

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
  if (error || !data || data.length === 0) {
    baziProfiles.value = []
  } else {
    baziProfiles.value = data
  }
}

const handleProfileSelect = () => {
  if (!selectedProfileId.value) {
    baziState.value = 'idle'
    currentBaziString.value = ''
    return
  }
  const profile = baziProfiles.value.find(p => p.id === selectedProfileId.value)
  if (!profile) return

  if (profile.bazi_summary) {
    baziState.value = 'ready'
    currentBaziSummary.value = profile.bazi_summary
    const baziStr = profile.bazi_str || (profile.bazi_detail?.pillars?.ganzhi ? `${profile.bazi_detail.pillars.ganzhi.year} ${profile.bazi_detail.pillars.ganzhi.month} ${profile.bazi_detail.pillars.ganzhi.day} ${profile.bazi_detail.pillars.ganzhi.time}` : "未知")
    currentBaziString.value = `命主：${profile.name}\n性别：${profile.gender === 'M' ? '男' : '女'}\n八字结构：${baziStr}\n八字断语：\n${profile.bazi_summary}`
  } else {
    baziState.value = 'warning'
    currentBaziString.value = ''
  }
}

// ============== 奇门推演核心 ==============

const startLoaderCycle = () => {
  let idx = 0
  currentLoaderMessage.value = LOADER_MESSAGES[0]
  loaderInterval = setInterval(() => {
    idx = (idx + 1) % LOADER_MESSAGES.length
    currentLoaderMessage.value = LOADER_MESSAGES[idx]
  }, 3000)
}

const stopLoaderCycle = () => {
  if (loaderInterval) {
    clearInterval(loaderInterval)
    loaderInterval = null
  }
}

const resetToInput = () => {
  viewState.value = 'input'
  questionInput.value = ''
  if (baziEnabled.value) {
    selectedProfileId.value = ''
    baziState.value = 'idle'
    currentBaziString.value = ''
  }
}

const startDivination = async () => {
  const input = questionInput.value.trim()

  if (baziEnabled.value) {
    if (baziState.value !== 'ready') return alert("✋ 请先在上方选择拥有断语的命主档案！")
    if (!currentBaziString.value) return alert("❌ 八字数据缺失，请重新选择！")
  }
  if (!input) return alert("问题不能为空哦！")

  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) return alert("身份验证失效，请重新登录")

  isSubmitting.value = true
  viewState.value = 'loading'
  startLoaderCycle()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 90000)

  try {
    const requestBody = { question: input }
    if (baziEnabled.value && currentBaziString.value) {
      requestBody.baziInfo = currentBaziString.value
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      let errorText = await response.text()
      try {
        let errObj = JSON.parse(errorText)
        throw new Error(errObj.details || errObj.error)
      } catch (e) {
        throw new Error(`服务器异常 (${response.status}): ` + errorText.substring(0, 50))
      }
    }
    
    const data = await response.json()
    if (data.error) throw new Error(data.details || data.error)

    await saveRecordToDatabase(input, data)
    
    // 渲染结果
    resultHtml.value = buildCardHTML(data)
    viewState.value = 'result'
    
    // 启动数字滚动动画与渐现动画
    nextTick(() => {
      const targetScore = data.summary?.score || 0
      animateScore(targetScore)
      setTimeout(() => {
        const reveals = document.querySelectorAll('.reveal')
        reveals.forEach((el, i) => setTimeout(() => el.classList.add('visible'), i * 80))
      }, 450)
    })

  } catch (err) {
    clearTimeout(timeoutId)
    console.error(err)
    if (err.name === 'AbortError') alert("⏳ 云端超算推演超时 (超过90秒无响应)。\n请稍等后重试。")
    else alert("云端推演失败：\n" + err.message)
    viewState.value = 'input'
  } finally {
    stopLoaderCycle()
    isSubmitting.value = false
  }
}

const animateScore = (targetScore) => {
  if(scoreTimer) clearInterval(scoreTimer)
  let current = 0
  const step = targetScore / (1000 / 16)
  scoreTimer = setInterval(() => {
    current = Math.min(current + step, targetScore)
    const el = document.getElementById('vueScoreValue') // 在生成的 HTML 中绑定此 ID
    if (el) el.textContent = Math.round(current) + ' 分'
    if (current >= targetScore) clearInterval(scoreTimer)
  }, 16)
}

// ============== 历史记录逻辑 ==============

const loadHistory = async () => {
  if (!currentUser.value) return
  const { data, error } = await supabase
    .from('qimen_records')
    .select('id,question,qimen_data,category,created_at')
    .order('created_at', { ascending: false })

  if (error) { console.error("加载历史失败:", error); return }
  
  historyRecords.value = (data || []).map(record => {
    const dateObj = new Date(record.created_at)
    const dateStr = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日 ${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2, '0')}`
    const score = record.qimen_data?.summary?.score || 0
    const catLabel = categories.find(c => c.value === record.category)?.label || '📋 杂事'
    return { ...record, dateStr, score, catLabel }
  })
}

const saveRecordToDatabase = async (question, jsonResult) => {
  if (!currentUser.value) return
  const category = jsonResult?.category || 'general'
  const { error } = await supabase.from('qimen_records').insert([{ user_id: currentUser.value.id, question, qimen_data: jsonResult, category }])
  if (error) console.error("保存历史记录失败:", error)
  else await loadHistory()
}

const filteredHistory = computed(() => {
  if (activeCategory.value === 'all') return historyRecords.value
  return historyRecords.value.filter(r => r.category === activeCategory.value)
})

const setCategory = (cat) => { activeCategory.value = cat }

const loadRecord = (record) => {
  isDrawerOpen.value = false
  resultHtml.value = buildCardHTML(record.qimen_data)
  viewState.value = 'result'
  nextTick(() => {
    animateScore(record.score)
    setTimeout(() => {
      const reveals = document.querySelectorAll('.reveal')
      reveals.forEach((el, i) => setTimeout(() => el.classList.add('visible'), i * 80))
    }, 450)
  })
}

// ============== HTML 渲染逻辑 (与原版完全一致) ==============

const getVerdictInfo = (score) => {
  if (score >= 90) return { label: '大吉', cls: 'da-ji' }
  if (score >= 75) return { label: '小吉', cls: 'xiao-ji' }
  if (score >= 55) return { label: '平', cls: 'ping' }
  if (score >= 40) return { label: '小凶', cls: 'xiao-xiong' }
  return { label: '大凶', cls: 'da-xiong' }
}

const getVerdictCls = (score) => {
  if (score >= 75) return 'ji'
  if (score >= 55) return 'ping'
  return 'xiong'
}

const buildCardHTML = (data) => {
  const summary = data.summary || { title: "生成中...", conclusion: "暂无数据", score: 0 }
  const analysis = data.analysis || {}
  const advice = data.advice || { lucky_tips: {} }
  const question = data.question || ""
  const scoreBasis = data.summary?.score_basis || null
  const chartData = data.qimen_data || data
  const palaces = chartData.palaces || []
  const pillars = chartData.pillars || {}
  const ju = chartData.ju_info || {}
  const ts = chartData.timestamp || {}
  const hasChart = palaces.length > 0

  const score = summary.score || 0
  const vd = getVerdictInfo(score)
  const THEME = score < 55 ? "#FF5E57" : score < 75 ? "#F5C518" : "#00D26A"
  const THEME_DIM = score < 55 ? "rgba(255,94,87,0.15)" : score < 75 ? "rgba(245,197,24,0.15)" : "rgba(0,210,106,0.15)"

  const strategies = (advice.strategy || []).map((s, i) => `<li class="reveal" style="transition-delay:${i * 60}ms">${s}</li>`).join('')
  let riskHTML = ''; if (advice.risk?.trim()) riskHTML = `<div class="risk-alert reveal"><div class="risk-alert-title"><span>⚠️</span>避坑指南</div><div class="risk-alert-content">${advice.risk}</div></div>`
  let baziHTML = ''; if (analysis.bazi_insight?.trim() && !analysis.bazi_insight.includes("未提供八字信息")) baziHTML = `<div class="grid-item bazi-insight reveal"><span class="label">🧬 命理 / 年命参考</span><span class="value">${analysis.bazi_insight}</span></div>`

  let scoreBasisHTML = '';
  if (scoreBasis) {
    const pos = (scoreBasis.positive_signals || []).length ? `<div class="sb-row"><div class="sb-row-title">✅ 吉象支撑</div><div class="sb-tags">${scoreBasis.positive_signals.map(s => `<span class="sb-tag positive">${s}</span>`).join('')}</div></div>` : '';
    const neg = (scoreBasis.negative_signals || []).length ? `<div class="sb-row"><div class="sb-row-title">⚠️ 风险信号</div><div class="sb-tags">${scoreBasis.negative_signals.map(s => `<span class="sb-tag negative">${s}</span>`).join('')}</div></div>` : '';
    const logic = scoreBasis.score_logic ? `<div class="sb-logic">${scoreBasis.score_logic}</div>` : '';
    if (pos || neg || logic) scoreBasisHTML = `<div class="grid-item score-basis reveal"><span class="label">⚖️ 评分依据</span><div class="score-basis-body">${pos}${neg}${logic}</div></div>`
  }

  let timingHTML = ''; if (analysis.dynamic_timing?.trim()) timingHTML = `<div class="grid-item dynamic-timing reveal"><span class="label">⏳ 动态应期（转机推演）</span><span class="value">${analysis.dynamic_timing}</span></div>`

  let chartHTML = '';
  if (hasChart) {
    const isZhiFu = s => s && ju.zhi_fu && s.includes(ju.zhi_fu)
    const isZhiShi = d => d && ju.zhi_shi && d.includes(ju.zhi_shi)
    const cells = palaces.map(p => {
      if (p.is_center) return `<div class="pan-cell"><div class="pan-center-earth">${p.earth || ''}</div></div>`
      const starCls = isZhiFu(p.star) ? 'highlight-text' : ''; const doorCls = isZhiShi(p.door) ? 'highlight-text' : '';
      let marks = ''; if (p.ma_xing?.has_ma) marks += `<span class="pan-mark mark-ma">马</span>`; if (p.kong_wang?.is_kong) marks += `<span class="pan-mark mark-kong">空</span>`;
      return `<div class="pan-cell"><div class="pan-god">${p.god || ''}</div><div class="pan-stem stem-sky">${p.sky || ''}</div>${p.ji_sky ? `<div class="pan-stem ji-sky">${p.ji_sky}</div>` : ''}<div class="pan-star ${starCls}">${p.star || ''}</div><div class="pan-door ${doorCls}">${p.door || ''}</div><div class="pan-stem stem-earth">${p.earth || ''}</div>${p.ji_earth ? `<div class="pan-stem ji-earth">${p.ji_earth}</div>` : ''}<div class="pan-marks">${marks}</div></div>`
    }).join('')
    chartHTML = `<div class="section-title reveal"><span class="icon">🧭</span>奇门排盘</div><div class="pan-wrapper reveal"><div class="pan-header"><div class="pan-pillars">${[pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean).join('　')}</div><div class="pan-info">${ts.solar || ''} | ${ju.name || ''} · ${ju.jieqi || ''}<br>值符：<b>${ju.zhi_fu || '-'}</b>&emsp;值使：<b>${ju.zhi_shi || '-'}</b></div></div><div class="pan-grid">${cells}</div></div>`
  }

  return `<div class="card" style="display:block;--theme-color:${THEME};--theme-color-dim:${THEME_DIM};">
      <div class="card-header reveal"><div><div class="title">${summary.title}</div><div class="verdict-badge verdict-${vd.cls}">${vd.label}</div></div><div class="score-badge"><div class="score" id="vueScoreValue">${score} 分</div><div class="score-label">吉凶评分</div></div></div>
      <div class="conclusion reveal">${summary.conclusion}</div>
      <div class="keyword reveal">🔑 ${summary.keyword}</div>
      ${question ? `<div class="user-question reveal">${question}</div>` : ''}
      <div class="ornament-divider reveal"><span>☰</span></div>
      ${chartHTML}
      <div class="section-title reveal"><span class="icon">🔍</span>深度局象</div>
      <div class="info-grid">${baziHTML}${scoreBasisHTML}${timingHTML}<div class="grid-item reveal"><span class="label">🌌 时空能量</span><span class="value">${analysis.tensor || '-'}</span></div><div class="grid-item reveal"><span class="label">👤 用神分析</span><span class="value">${analysis.yong_shen || '-'}</span></div><div class="grid-item reveal"><span class="label">🔮 特殊格局</span><span class="value">${analysis.pattern || '-'}</span></div><div class="grid-item reveal"><span class="label">🙏 神助指引</span><span class="value">${analysis.god_help || '-'}</span></div></div>
      <div class="section-title reveal"><span class="icon">💡</span>决策指引</div>
      <ul class="strategy-list">${strategies}</ul>${riskHTML}
      <div class="ornament-divider reveal"><span>☷</span></div>
      <div class="footer reveal"><div class="f-item"><span class="f-icon">🧭</span><span class="f-text">${advice.lucky_tips.direction || '-'}</span></div><div class="f-item"><span class="f-icon">⏰</span><span class="f-text">${advice.lucky_tips.time || '-'}</span></div><div class="f-item"><span class="f-icon">✨</span><span class="f-text">${advice.lucky_tips.action || '-'}</span></div></div>
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
.drawer-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0); pointer-events: none; transition: background .4s var(--ease); }
.drawer-overlay.open { background: rgba(0,0,0,0.65); pointer-events: all; }
#historyDrawer { position: fixed; top: 0; left: 0; bottom: 0; width: min(82vw, 310px); z-index: 201; transform: translateX(-100%); transition: transform .5s var(--spring); display: flex; flex-direction: column; backdrop-filter: blur(40px) saturate(1.6); background: rgba(14,14,31,0.88); border-right: 1px solid var(--gold-border); }
#historyDrawer.open { transform: translateX(0); }
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
</style>
