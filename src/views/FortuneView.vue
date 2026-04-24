<template>
  <div class="fortune-view">
    <header class="page-header">
      <div class="header-title">天机日运</div>
      <div class="header-subtitle">观星象 · 知进退</div>
    </header>

    <div class="page-wrap">
      <div class="container">
        
        <div class="dimension-tabs glass-card">
          <button 
            v-for="tab in tabs" 
            :key="tab.value"
            :class="['tab-btn', { active: currentTab === tab.value }]"
            @click="currentTab = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>

        <div v-if="currentTab === 'day'" class="tab-content">
          
          <div class="date-scroll-container">
            <div 
              v-for="day in availableDays" 
              :key="day.fullDate"
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
              
              <div class="glass-card score-dashboard">
                <div class="score-ring">
                  <div class="score-inner">
                    <span class="score-value">{{ fortuneData.day_score || 0 }}</span>
                    <span class="score-level">分</span>
                  </div>
                </div>
                <div class="score-breakdown">
                  <div class="breakdown-item">
                    <span class="label">干支十神</span>
                    <span class="value">{{ fortuneData.score_breakdown?.dim1_score || 0 }}</span>
                  </div>
                  <div class="breakdown-item">
                    <span class="label">建除十二神</span>
                    <span class="value">{{ fortuneData.score_breakdown?.dim3_score || 0 }}</span>
                  </div>
                </div>
              </div>

              <div class="glass-card info-card">
                <h3 class="card-title"><span>✨</span> 今日断语</h3>
                <p :class="['insight-text', { muted: isInterpretationLoading && !hasInterpretationContent }]">
                  {{ hasInterpretationContent ? (fortuneData.day_insight || '平稳度日，顺势而为') : interpretationPlaceholder }}
                </p>
                <div v-if="fortuneData.day_warning" class="warning-tag">
                  ⚠️ {{ fortuneData.day_warning }}
                </div>
                <div v-else-if="interpretationError" class="hint-text error">{{ interpretationError }}</div>
              </div>

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
              </div>

              <div class="glass-card info-card">
                <h3 class="card-title"><span>💡</span> 开运锦囊</h3>
                <div class="lucky-item">
                  <span class="label">五行喜用</span>
                  <span class="value">{{ fortuneData.lucky_element || '-' }}</span>
                </div>
                <div class="lucky-item mt-2">
                  <span class="label">幸运色彩</span>
                  <div :class="['color-display', { muted: !hasInterpretationContent }]">
                    <span class="color-dot" :style="{ backgroundColor: fortuneData.lucky_color_hex || '#CCC' }"></span>
                    {{ hasInterpretationContent ? (fortuneData.lucky_color || '-') : '生成中' }}
                  </div>
                </div>
              </div>

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
import { ref, computed, onMounted } from 'vue'
import { createClient } from '@supabase/supabase-js'

// 使用你现有的 Supabase 配置
const SUPABASE_URL = 'https://xkbqiiwwgfzkyfhxuoev.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_qr9YBIA6n32r-mcqKbkpgA_0XVTUSI7'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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

const hasInterpretationFields = (data) => {
  return Boolean(data?.day_insight || data?.day_guide || data?.lucky_color || data?.interpretation_status === 'ready')
}

const hasInterpretationContent = computed(() => hasInterpretationFields(fortuneData.value))

const interpretationPlaceholder = computed(() => (
  isInterpretationLoading.value ? '断语生成中，分数已先行呈现' : '断语稍后呈现'
))

const generateDays = () => {
  const days = []
  const weekMap = ['日', '一', '二', '三', '四', '五', '六']
  const today = new Date()
  
  for (let i = 0; i < 7; i++) {
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
  availableDays.value = days
  selectedDate.value = days[0].fullDate
}

const getTabLabel = (val) => tabs.find(t => t.value === val)?.label

const formatGuide = (guideStr, type) => {
  if (!guideStr) return '无特殊忌讳'
  const parts = guideStr.split('；')
  if (type === '宜' && parts[0]) return parts[0].replace('宜', '').trim()
  if (type === '忌' && parts[1]) return parts[1].replace('忌', '').trim()
  return guideStr
}

const fetchFortuneData = async (dateStr) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    alert('请先前往首页登录')
    return
  }

  const currentRequest = requestSerial.value + 1
  requestSerial.value = currentRequest
  isLoading.value = true
  isInterpretationLoading.value = false
  interpretationError.value = ''
  fortuneData.value = null
  
  try {
    const response = await fetch('/api/fortune-daily', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ target_date: dateStr }) 
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || '推演失败')
    }

    const baseData = await response.json()
    if (currentRequest !== requestSerial.value) return

    fortuneData.value = baseData
    isLoading.value = false
    if (hasInterpretationFields(baseData)) return

    fetchFortuneInterpretation(dateStr, session.access_token, currentRequest)
  } catch (error) {
    if (currentRequest !== requestSerial.value) return
    console.error(error)
    alert(error.message)
  } finally {
    if (currentRequest === requestSerial.value) isLoading.value = false
  }
}

const fetchFortuneInterpretation = async (dateStr, accessToken, requestId) => {
  isInterpretationLoading.value = true
  interpretationError.value = ''

  try {
    const response = await fetch('/api/fortune-daily-interpretation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ target_date: dateStr })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || '断语生成失败')
    }

    const interpretationData = await response.json()
    if (requestId !== requestSerial.value || !fortuneData.value) return

    fortuneData.value = {
      ...fortuneData.value,
      ...interpretationData
    }
  } catch (error) {
    if (requestId !== requestSerial.value) return
    console.error(error)
    interpretationError.value = '断语暂未生成，请稍后重试'
  } finally {
    if (requestId === requestSerial.value) {
      isInterpretationLoading.value = false
    }
  }
}

const selectDate = (dateStr) => {
  if (selectedDate.value === dateStr) return
  selectedDate.value = dateStr
  fetchFortuneData(dateStr)
}

onMounted(() => {
  generateDays()
  fetchFortuneData(selectedDate.value)
})
</script>

<style scoped>
.fortune-view { width: 100%; min-height: 100vh; padding-bottom: 80px; }

.page-header {
  position: sticky; top: 0; z-index: 100;
  padding: 14px 20px; text-align: center;
  background: rgba(5, 5, 10, 0.65);
  backdrop-filter: blur(24px) saturate(1.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.header-title { font-family: 'Noto Serif SC', serif; font-size: 17px; font-weight: 500; color: var(--gold-light); letter-spacing: 2px; }
.header-subtitle { font-size: 10px; color: var(--text-muted); letter-spacing: 1px; margin-top: 4px; }

.page-wrap { display: flex; flex-direction: column; align-items: center; padding: 20px 18px; }
.container { width: 100%; max-width: 520px; }

/* 玻璃态卡片基础样式复用 */
.glass-card {
  background: var(--bg-card); border: 1px solid var(--glass-border);
  border-radius: var(--radius-card);
  backdrop-filter: blur(20px) saturate(1.2);
  box-shadow: 0 4px 32px rgba(0,0,0,0.35);
  margin-bottom: 16px; padding: 16px;
}

/* Tabs */
.dimension-tabs { display: flex; gap: 8px; padding: 6px; border-radius: 14px; }
.tab-btn {
  flex: 1; background: transparent; border: none; color: var(--text-muted);
  padding: 8px 0; border-radius: 8px; font-size: 14px; transition: all .3s;
}
.tab-btn.active { background: rgba(212,175,55,0.15); color: var(--gold-light); box-shadow: inset 0 0 0 1px rgba(212,175,55,0.3); }

/* 日期滚动 */
.date-scroll-container {
  display: flex; overflow-x: auto; gap: 12px; padding-bottom: 10px; margin-bottom: 16px;
}
.date-scroll-container::-webkit-scrollbar { display: none; }
.date-item {
  flex-shrink: 0; display: flex; flex-direction: column; align-items: center;
  padding: 10px 14px; border-radius: 12px; background: rgba(0,0,0,0.2);
  border: 1px solid var(--glass-border); cursor: pointer; transition: .3s;
}
.date-item.active { background: rgba(212,175,55,0.1); border-color: var(--gold); }
.day-of-week { font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
.date-num { font-size: 18px; font-weight: bold; color: #fff; }
.date-item.active .date-num { color: var(--gold-light); }

/* 加载动画 */
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; }
.bagua-ring-wrap { width: 80px; height: 80px; animation: rotateBagua 4s linear infinite; }
.loader-text-block { margin-top: 16px; color: var(--gold); font-size: 13px; font-family: var(--font-serif); }
@keyframes rotateBagua { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* 分数仪表盘 */
.score-dashboard { display: flex; align-items: center; justify-content: space-around; padding: 24px; }
.score-ring {
  width: 90px; height: 90px; border-radius: 50%;
  background: conic-gradient(var(--gold) 85%, rgba(255,255,255,0.05) 0deg);
  display: flex; align-items: center; justify-content: center; padding: 6px;
  box-shadow: 0 0 20px rgba(212,175,55,0.2);
}
.score-inner {
  width: 100%; height: 100%; background: #0c0c16; border-radius: 50%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.score-value { font-size: 28px; font-weight: bold; color: var(--gold-light); line-height: 1; }
.score-level { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
.score-breakdown { display: flex; flex-direction: column; gap: 12px; }
.breakdown-item { display: flex; justify-content: space-between; gap: 20px; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 4px; }
.breakdown-item .label { color: var(--text-muted); font-size: 12px; }
.breakdown-item .value { color: #fff; font-weight: bold; font-size: 14px; }

/* 卡片内容 */
.info-card { padding: 20px; }
.card-title { font-size: 14px; color: var(--text-muted); margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px; font-weight: normal; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;}
.insight-text { font-size: 15px; line-height: 1.6; color: #E8CC80; font-family: var(--font-serif); text-shadow: 0 0 10px rgba(232, 204, 128, 0.2); }
.insight-text.muted, .guide-content.muted, .color-display.muted { color: var(--text-muted); opacity: 0.78; text-shadow: none; }
.hint-text { margin-top: 10px; font-size: 12px; color: var(--text-muted); }
.hint-text.error { color: #FF8A80; }
.warning-tag { margin-top: 12px; padding: 8px 12px; background: rgba(255, 94, 87, 0.1); color: #FF5E57; border-radius: 8px; font-size: 12px; border: 1px solid rgba(255, 94, 87, 0.2); }

/* 宜忌 */
.guide-row { display: flex; align-items: flex-start; }
.mt-2 { margin-top: 12px; }
.guide-label { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; margin-right: 12px; flex-shrink: 0; }
.guide-label.good { background: rgba(0, 210, 106, 0.15); color: #00D26A; border: 1px solid rgba(0, 210, 106, 0.3); }
.guide-label.bad { background: rgba(255, 94, 87, 0.15); color: #FF5E57; border: 1px solid rgba(255, 94, 87, 0.3); }
.guide-content { flex: 1; color: #D0D0D8; line-height: 1.5; font-size: 14px; padding-top: 2px; }

/* 开运 */
.lucky-item { display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
.lucky-item .label { color: var(--text-muted); }
.lucky-item .value { color: #fff; font-weight: 500; }
.color-display { display: flex; align-items: center; gap: 8px; color: #fff; }
.color-dot { width: 14px; height: 14px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); }

/* 占位符 */
.placeholder-content { text-align: center; padding: 60px 0; color: var(--text-muted); font-size: 13px; line-height: 1.6; }
.placeholder-icon { font-size: 32px; margin-bottom: 12px; opacity: 0.5; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
