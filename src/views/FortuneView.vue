<template>
  <div class="fortune-view">
    <header class="page-header">
      <div class="header-title">天机日运</div>
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

          <div class="date-scroll-container">
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
                    <p :class="['score-insight', { muted: isInterpretationLoading && !hasInterpretationContent }]">
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
                  <p :class="['grid-card-text', { muted: !hasInterpretationContent }]">
                    {{ hasInterpretationContent ? (fortuneData[item.key] || '暂无') : '生成中...' }}
                  </p>
                </div>
              </div>

              <!-- ═══ 3. Guide + Timeline ═══ -->
              <div class="glass-card info-card">
                <h3 class="card-title"><span>🧭</span> 行事指南</h3>
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
              </div>

              <!-- ═══ 4. Lucky Grid ═══ -->
              <div class="glass-card info-card">
                <h3 class="card-title"><span>💡</span> 开运密码</h3>
                <div class="lucky-grid">
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

        <div v-else class="glass-card placeholder-content">
          <div class="placeholder-icon">⏳</div>
          <p>【{{ getTabLabel(currentTab) }}运】推演引擎升级中<br>敬请期待</p>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { createClient } from '@supabase/supabase-js'
import { globalState } from '../store.js'
import { getGuestState, recordGuestFortuneViewed, trackGuestEvent } from '../guestMode.mjs'
import {
  clearPendingInterpretation,
  getPendingInterpretation,
  loadCachedFortune as loadSharedCachedFortune,
  rememberFortuneCache as rememberSharedFortuneCache,
  rememberPendingInterpretation
} from '../fortuneCache.mjs'
import guestFortuneData from '../../mock/fortune-daily.json'

const SUPABASE_URL = 'https://xkbqiiwwgfzkyfhxuoev.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_qr9YBIA6n32r-mcqKbkpgA_0XVTUSI7'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const route = useRoute()

const tabs = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
  { label: '年', value: 'year' }
]
const currentTab = ref('day')
const availableDays = ref([])
const selectedDate = ref('')
const fortuneData = ref(null)
const isLoading = ref(false)
const isInterpretationLoading = ref(false)
const interpretationError = ref('')
const requestSerial = ref(0)
const baziProfiles = ref([])
const selectedProfileId = ref('')
const isProfileMenuOpen = ref(false)
const isGuest = computed(() => globalState.isGuest)

const fortuneGridItems = [
  { key: 'career_insight', icon: '💼', label: '事业运' },
  { key: 'wealth_insight', icon: '💰', label: '财富运' },
  { key: 'love_insight',   icon: '💕', label: '感情运' },
  { key: 'health_insight', icon: '🏃', label: '健康运' },
]

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

const getFortuneStorage = () => (typeof window === 'undefined' ? null : window.localStorage)

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
  fetchFortuneData(selectedDate.value)
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
  fetchFortuneData(dateStr)
}

onMounted(async () => {
  document.addEventListener('click', handleDocumentClick)
  await fetchProfiles()
  generateDays(String(route.query.date || ''))
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
      fetchFortuneData(normalizedDate)
    }

    const profileId = String(nextProfileId || '')
    if (profileId && profileId !== selectedProfileId.value && baziProfiles.value.some(profile => profile.id === profileId)) {
      selectedProfileId.value = profileId
      fetchFortuneData(selectedDate.value || normalizedDate)
    }
  }
)
</script>

<style scoped>
@import '../styles/fortune-view.css';
</style>
