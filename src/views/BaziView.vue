<template>
  <div class="bazi-view">

    <header id="siteHeader">
        <div class="site-logo">全息八字</div>
    </header>

    <div class="page-wrap">
        <div class="container">
            <div class="glass-card">
                <div class="profile-selector">
                    <select v-model="selectedProfileId" class="profile-select" @change="handleProfileSelect">
                        <option value="">{{ baziProfiles.length ? '-- 请选择命主档案 --' : '正在加载档案或暂无档案...' }}</option>
                        <option v-for="p in baziProfiles" :key="p.id" :value="p.id">
                            {{ p.name }}
                        </option>
                    </select>
                    <button class="btn-ghost" @click="showAdd = true">+ 新增</button>
                    <button class="btn-danger" @click="deleteProfile">删除</button>
                </div>

                <div v-show="showAdd" class="profile-form" style="display: block;">
                    <div class="form-row">
                        <input type="text" v-model="form.name" placeholder="命主姓名">
                        <select v-model="form.gender">
                            <option value="M">男 (乾造)</option>
                            <option value="F">女 (坤造)</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <input type="datetime-local" v-model="form.birth" style="color-scheme:dark;">
                    </div>
                    <div style="display:flex;justify-content:flex-end;gap:8px;">
                        <button class="btn-ghost" style="border:none;color:var(--text-muted)" @click="showAdd = false">取消</button>
                        <button class="btn-ghost" @click="saveProfile">保存档案</button>
                    </div>
                </div>
            </div>

            <div v-if="activeProfile" class="glass-card dashboard-panel">
                
                <div class="bazi-header">
                    <div>
                        <div class="name-row">
                            <span class="bazi-name">{{ activeProfile.name }}</span>
                            <span v-if="activeProfile.geju" class="badge badge-gold">{{ activeProfile.geju }}</span>
                            <span v-if="activeProfile.strong_weak" class="badge badge-blue">{{ activeProfile.strong_weak }}</span>
                        </div>
                        <div class="bazi-meta">农历：{{ lunarDateStr }}</div>
                        <div class="bazi-meta">阳历：{{ solarDateStr }}</div>
                        <div v-if="specialPatterns.length > 0" style="margin-top:6px;">
                            <span v-for="(sp, idx) in specialPatterns" :key="idx" class="pattern-tag">
                                {{ sp.split('】')[0] + '】' }}
                            </span>
                        </div>
                    </div>
                    <button class="btn-primary" :disabled="isAnalyzing" @click="requestAiSummary">
                        {{ isAnalyzing ? '推演中...' : '推演天机' }}
                    </button>
                </div>

                <div class="tabs">
                    <div class="tab" :class="{ active: currentTab === 'basic' }" @click="currentTab = 'basic'">基础排盘</div>
                    <div class="tab" :class="{ active: currentTab === 'pro' }" @click="currentTab = 'pro'">专业细盘</div>
                </div>

                <div v-if="needsUpgrade" style="text-align:center; padding: 30px 10px; color: var(--gold-light); font-size: 13px; line-height: 1.8;">
                    🚀 架构已升级，数据已迁移至云端引擎计算。<br>请点击右上角 <strong style="color:var(--gold);">「推演天机」</strong> 升级该档案排盘数据。
                </div>

                <div v-else class="bazi-table-wrap">
                    <table class="bazi-table">
                        <thead>
                            <tr>
                                <th class="bz-label">柱位</th>
                                <th v-for="col in displayColumns" :key="col.name" class="bz-label">
                                    {{ col.name }}{{ currentTab === 'basic' ? '柱' : '' }}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="bz-label">主星</td>
                                <td v-for="(col, i) in displayColumns" :key="'star'+i" class="bz-star">{{ col.star }}</td>
                            </tr>
                            <tr>
                                <td class="bz-label">天干</td>
                                <td v-for="(col, i) in displayColumns" :key="'gan'+i" class="bz-char" :class="WX_MAP[col.gan] || 'wx-none'">{{ col.gan }}</td>
                            </tr>
                            <tr>
                                <td class="bz-label">地支</td>
                                <td v-for="(col, i) in displayColumns" :key="'zhi'+i" class="bz-char" :class="WX_MAP[col.zhi] || 'wx-none'">{{ col.zhi }}</td>
                            </tr>
                            <tr>
                                <td class="bz-label">藏干</td>
                                <td v-for="(col, i) in displayColumns" :key="'cg'+i" class="bz-sub">
                                    <template v-for="g in col.hidden_stems" :key="g">
                                        <span :class="WX_MAP[g]">{{ GAN_WUXING[g] }}</span><br>
                                    </template>
                                </td>
                            </tr>
                            <tr>
                                <td class="bz-label">星运</td>
                                <td v-for="(col, i) in displayColumns" :key="'shi'+i" class="bz-sub">{{ col.shi }}</td>
                            </tr>
                            <tr>
                                <td class="bz-label">自座</td>
                                <td v-for="(col, i) in displayColumns" :key="'zizuo'+i" class="bz-sub">{{ col.zizuo }}</td>
                            </tr>
                            <tr>
                                <td class="bz-label">空亡</td>
                                <td v-for="(col, i) in displayColumns" :key="'kong'+i" class="bz-sub">
                                    <span v-if="col.is_kong" style="color:var(--crimson)">空亡</span>
                                    <span v-else style="color:#555">-</span>
                                </td>
                            </tr>
                            <tr>
                                <td class="bz-label">纳音</td>
                                <td v-for="(col, i) in displayColumns" :key="'nayin'+i" class="bz-sub">{{ col.nayin }}</td>
                            </tr>
                            <tr>
                                <td class="bz-label">神煞</td>
                                <td v-for="(col, i) in displayColumns" :key="'shen'+i" class="bz-shensha" v-html="formatShen(col.shensha)"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div v-show="currentTab === 'pro' && !needsUpgrade" class="timeline-section">
                    <div class="timeline-title">大运排盘</div>
                    <div class="dayun-grid">
                        <div v-for="(d, idx) in dayunList" :key="idx" 
                             class="dayun-item" 
                             :class="{ active: currentDayun && d.gan === currentDayun.gan && d.zhi === currentDayun.zhi }">
                            <div class="dy-age">{{ d.start_year }}年<br>{{ d.start_age }}岁</div>
                            <div class="dy-char" :class="WX_MAP[d.gan] || ''">{{ d.gan }}</div>
                            <div class="dy-char" :class="WX_MAP[d.zhi] || ''">{{ d.zhi }}</div>
                        </div>
                    </div>
                </div>

                <div v-if="activeProfile.yuanju_core" class="ai-section" style="display: block;">
                    <div class="ai-header-title">天机锦囊</div>
                    <div class="xiji-box">
                        <div class="xiji-item">
                            <div class="xiji-label">喜用神</div>
                            <div class="xiji-val favorable">{{ activeProfile.favorable_elements || '-' }}</div>
                        </div>
                        <div class="xiji-item">
                            <div class="xiji-label">忌仇神</div>
                            <div class="xiji-val unfavorable">{{ activeProfile.unfavorable_elements || '-' }}</div>
                        </div>
                    </div>
                    <div class="insight-card">
                        <h4>原局核心</h4>
                        <p>{{ activeProfile.yuanju_core }}</p>
                    </div>
                    <div class="insight-card">
                        <h4>岁运推演</h4>
                        <p style="margin-bottom: 8px;">
                            <strong style="color:var(--gold)">【大运】</strong> {{ activeProfile.current_dayun }}
                        </p>
                        <p>
                            <strong style="color:var(--gold)">【流年】</strong> {{ activeProfile.current_liunian }}
                        </p>
                    </div>
                </div>

                <div v-else-if="activeProfile.bazi_summary" class="legacy-summary" style="display: block;">
                    {{ activeProfile.bazi_summary }}
                </div>

            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { Solar } from 'lunar-javascript' // 使用你 package.json 中安装的库

const SUPABASE_URL = 'https://xkbqiiwwgfzkyfhxuoev.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_qr9YBIA6n32r-mcqKbkpgA_0XVTUSI7'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 核心字典
const WX_MAP = {'甲':'wx-mu','乙':'wx-mu','寅':'wx-mu','卯':'wx-mu','丙':'wx-huo','丁':'wx-huo','巳':'wx-huo','午':'wx-huo','戊':'wx-tu','己':'wx-tu','辰':'wx-tu','戌':'wx-tu','丑':'wx-tu','未':'wx-tu','庚':'wx-jin','辛':'wx-jin','申':'wx-jin','酉':'wx-jin','壬':'wx-shui','癸':'wx-shui','亥':'wx-shui','子':'wx-shui'}
const GAN_WUXING = { '甲':'甲木', '乙':'乙木', '丙':'丙火', '丁':'丁火', '戊':'戊土', '己':'己土', '庚':'庚金', '辛':'辛金', '壬':'壬水', '癸':'癸水' }

// 状态定义
const currentUser = ref(null)
const baziProfiles = ref([])
const selectedProfileId = ref('')
const currentTab = ref('basic')
const showAdd = ref(false)
const isAnalyzing = ref(false)

const form = reactive({
    name: '',
    gender: 'M',
    birth: ''
})

// 计算属性 (Vue 魔法：数据变化自动更新 UI)
const activeProfile = computed(() => {
    return baziProfiles.value.find(p => p.id === selectedProfileId.value) || null
})

const needsUpgrade = computed(() => {
    if (!activeProfile.value) return false
    const detail = activeProfile.value.bazi_detail
    return !detail || !detail.matrix
})

const displayColumns = computed(() => {
    if (needsUpgrade.value || !activeProfile.value) return []
    const matrix = activeProfile.value.bazi_detail.matrix
    let cols = []
    if (currentTab.value === 'basic') {
        cols = matrix.pillars
    } else {
        if (matrix.current_liunian) cols.push(matrix.current_liunian)
        if (matrix.current_dayun) cols.push(matrix.current_dayun)
        cols.push(...matrix.pillars)
    }
    return cols
})

const dayunList = computed(() => {
    if (needsUpgrade.value || !activeProfile.value) return []
    return activeProfile.value.bazi_detail.matrix.dayun_list || []
})

const currentDayun = computed(() => {
    if (needsUpgrade.value || !activeProfile.value) return null
    return activeProfile.value.bazi_detail.matrix.current_dayun || null
})

const specialPatterns = computed(() => {
    if (!activeProfile.value || !activeProfile.value.bazi_detail?.base_info?.special_patterns) return []
    return activeProfile.value.bazi_detail.base_info.special_patterns
})

// 时间解析逻辑
const promptDataObj = computed(() => {
    if (!activeProfile.value) return null
    return generateLunarPromptData(activeProfile.value)
})

const solarDateStr = computed(() => {
    const data = promptDataObj.value
    if (!data || !data.birthStr) return '阳历加载中...'
    const p = data.birthStr.match(/\d+/g)
    if (!p || p.length < 3) return ''
    const s = Solar.fromYmdHms(parseInt(p[0]), parseInt(p[1]), parseInt(p[2]), parseInt(p[3]||12), parseInt(p[4]||0), 0)
    return s.toYmdHms()
})

const lunarDateStr = computed(() => {
    const data = promptDataObj.value
    if (!data || !data.birthStr) return '农历加载中...'
    const p = data.birthStr.match(/\d+/g)
    if (!p || p.length < 3) return ''
    const s = Solar.fromYmdHms(parseInt(p[0]), parseInt(p[1]), parseInt(p[2]), parseInt(p[3]||12), parseInt(p[4]||0), 0)
    const l = s.getLunar()
    return `${l.getYearInGanZhi()}年${l.getMonthInChinese()}月${l.getDayInChinese()} ${l.getTimeZhi()}时 ${activeProfile.value.gender==='M'?'乾造':'坤造'}`
})

// 生命周期
onMounted(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return // 可以在此触发全局路由跳转回登录页
    currentUser.value = session.user
    await fetchProfiles()
})

onUnmounted(() => {
})

// 业务方法
const fetchProfiles = async () => {
    const { data } = await supabase.from('bazi_profiles').select('*').order('created_at', {ascending: false})
    baziProfiles.value = data || []
    if (baziProfiles.value.length > 0 && !selectedProfileId.value) {
        // 可选：默认选中第一个
        // selectedProfileId.value = baziProfiles.value[0].id
    }
}

const handleProfileSelect = () => {
    currentTab.value = 'basic'
}

const saveProfile = async () => {
    if(!form.name || !form.birth) return alert("信息不全")
    const { error } = await supabase.from('bazi_profiles').insert([{ 
        user_id: currentUser.value.id, 
        name: form.name, 
        gender: form.gender, 
        birth_date: form.birth.replace('T',' ')+':00' 
    }])
    if (error) alert(error.message) 
    else { 
        showAdd.value = false
        form.name = ''
        form.birth = ''
        await fetchProfiles() 
    }
}

const deleteProfile = async () => {
    if (selectedProfileId.value && confirm("确认删除该档案？")) { 
        await supabase.from('bazi_profiles').delete().eq('id', selectedProfileId.value)
        selectedProfileId.value = ''
        await fetchProfiles() 
    }
}

const requestAiSummary = async () => {
    if (!activeProfile.value) return
    isAnalyzing.value = true
    try {
        const pd = promptDataObj.value
        const { data: { session } } = await supabase.auth.getSession()

        const response = await fetch('/api/bazi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ 
                promptData: { profileId: activeProfile.value.id, gender: pd.gender, birthStr: pd.birthStr, baziStr: pd.baziStr, daYunStr: "当前大运" }
            })
        })

        const data = await response.json()
        if (data.error) throw new Error(data.error)
        await fetchProfiles() // 刷新拿到最新数据
        alert("天机推演完成！")
    } catch (err) {
        alert("推演失败: " + err.message)
    } finally {
        isAnalyzing.value = false
    }
}

// 辅助方法
const formatShen = (shenArr) => {
    return shenArr && shenArr.length > 0 ? shenArr.join('<br>') : '-'
}

const findDatesByBazi = (yGZ, mGZ, dGZ, hGZ) => {
    const results = []
    const today = Solar.fromDate(new Date())
    const zhiHours = {"子":0,"丑":2,"寅":4,"卯":6,"辰":8,"巳":10,"午":12,"未":14,"申":16,"酉":18,"戌":20,"亥":22}
    for (let y = 1900; y <= today.getYear(); y++) {
        const s = Solar.fromYmd(y, 7, 1)
        if (s.getLunar().getYearInGanZhi() === yGZ) {
            let cur = Solar.fromYmd(y - 1, 11, 1), end = Solar.fromYmd(y + 1, 3, 1)
            while (cur.toYmd() <= end.toYmd()) {
                const bazi = cur.getLunar().getEightChar()
                if (bazi.getYear() === yGZ && bazi.getMonth() === mGZ && bazi.getDay() === dGZ) {
                    let h = zhiHours[hGZ.charAt(1)] || 12
                    const test = Solar.fromYmdHms(cur.getYear(), cur.getMonth(), cur.getDay(), h, 30, 0)
                    if (test.getLunar().getEightChar().getTime() === hGZ) results.push(test)
                }
                cur = cur.next(1)
            }
        }
    }
    return results
}

const generateLunarPromptData = (profile) => {
    let res = { gender: profile.gender === 'M' ? '男' : '女', birthStr: "", baziStr: "", daYunStr: "当前大运" }
    if (profile.birth_date) {
        const p = profile.birth_date.match(/\d+/g)
        if (p && p.length >= 3) {
            const hour = p[3] || '12', minute = p[4] || '00'
            res.birthStr = `${p[0]}年${p[1]}月${p[2]}日 ${hour}:${minute}`
            const b = Solar.fromYmdHms(parseInt(p[0]), parseInt(p[1]), parseInt(p[2]), parseInt(hour), parseInt(minute), 0).getLunar().getEightChar()
            res.baziStr = `${b.getYear()} ${b.getMonth()} ${b.getDay()} ${b.getTime()}`
        }
    } else if (profile.bazi_str) {
        res.baziStr = profile.bazi_str
        const bz = profile.bazi_str.split(' ')
        if (bz.length === 4) {
            const matches = findDatesByBazi(bz[0], bz[1], bz[2], bz[3])
            if (matches.length > 0) {
                const s = matches[matches.length - 1]
                res.birthStr = `${s.getYear()}年${s.getMonth()}月${s.getDay()}日 ${s.getHour()}:00`
            } else res.birthStr = "1990年01月01日 12:00"
        }
    }
    return res
}
</script>

<style scoped>
/* 此处的 CSS 已滤除你全局在 App.vue / global.css 里的样式，完全对应 Bazi 的局部卡片样式 */
.bazi-view { width: 100%; min-height: 100vh; position: relative;}

#siteHeader { position: fixed; top: 0; left: 0; right: 0; z-index: 300; display: flex; align-items: center; justify-content: center; padding: 14px 20px; height: 60px; backdrop-filter: blur(24px) saturate(1.5); -webkit-backdrop-filter: blur(24px) saturate(1.5); background: rgba(5,5,10,0.65); border-bottom: 1px solid rgba(255,255,255,0.04); }
.site-logo { font-family: 'Noto Serif SC', serif; font-size: 17px; letter-spacing: .15em; font-weight: 500; background: linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 50%, var(--gold) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; filter: drop-shadow(0 0 12px rgba(212,175,55,0.45)); }

.page-wrap { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; padding: 76px 14px 60px; }
.container { width: 100%; max-width: 520px; }

.glass-card { background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: var(--radius-card); padding: 18px 14px; margin-bottom: 16px; backdrop-filter: blur(20px) saturate(1.2); box-shadow: 0 4px 32px rgba(0,0,0,0.35); animation: riseIn 0.5s ease both; }
@keyframes riseIn { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }

.profile-selector { display: flex; gap: 10px; margin-bottom: 16px; }
.profile-select { flex: 1; background: rgba(0,0,0,0.35); border: 1px solid var(--gold); color: #fff; padding: 10px; border-radius: 8px; outline: none; font-size: 14px; }
.btn-ghost { background: rgba(212,175,55,0.12); color: var(--gold-light); border: 1px solid var(--gold); padding: 0 14px; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all .2s; white-space: nowrap; }
.btn-ghost:hover { background: var(--gold); color: #000; }
.btn-danger { background: rgba(255,94,87,0.1); color: #FF5E57; border: 1px solid rgba(255,94,87,0.3); border-radius: 8px; padding: 0 10px; cursor: pointer; }
.btn-primary { background: linear-gradient(135deg, var(--gold-light), var(--gold)); color: #000; border: none; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-weight: 600; font-family: var(--font-serif); box-shadow: 0 2px 10px rgba(212,175,55,0.3); transition: transform 0.2s; white-space: nowrap; }
.btn-primary:active { transform: scale(0.95); }

.profile-form { background: rgba(255,255,255,0.02); padding: 16px; border-radius: 12px; border: 1px dashed var(--glass-border); margin-bottom: 16px; }
.form-row { display: flex; gap: 12px; margin-bottom: 12px; }
.form-row input, .form-row select { flex: 1; padding: 10px; border-radius: 8px; background: rgba(0,0,0,0.4); border: 1px solid var(--glass-border); color: white; outline: none; font-family: var(--font-body); }

.bazi-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--glass-border); padding-bottom: 14px; margin-bottom: 14px; }
.name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.bazi-name { font-family: var(--font-serif); font-size: 20px; color: var(--gold-light); letter-spacing: 2px; font-weight: bold; }
.bazi-meta { font-size: 11px; color: var(--text-muted); line-height: 1.6; margin-top: 2px; }

.badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-family: var(--font-body); letter-spacing: 1px; font-weight: 500; }
.badge-gold { background: rgba(212,175,55,0.15); color: var(--gold-light); border: 1px solid rgba(212,175,55,0.3); }
.badge-blue { background: rgba(78, 205, 196, 0.15); color: #4ECDC4; border: 1px solid rgba(78, 205, 196, 0.3); }
.pattern-tag { font-size: 10px; color: #E8CC80; background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.2); padding: 2px 6px; border-radius: 4px; display: inline-block; margin-right: 4px; margin-top: 4px; }

.tabs { display: flex; gap: 20px; margin-bottom: 12px; }
.tab { font-size: 13px; color: var(--text-muted); cursor: pointer; padding-bottom: 6px; border-bottom: 2px solid transparent; transition: all 0.3s; }
.tab.active { color: var(--gold); border-bottom-color: var(--gold); font-weight: 500; }

.bazi-table-wrap { width: 100%; overflow: hidden; }
.bazi-table { table-layout: fixed; width: 100%; border-collapse: collapse; text-align: center; }
.bazi-table th, .bazi-table td { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.03); vertical-align: middle; word-wrap: break-word; }
.bazi-table th { color: var(--gold-light); font-family: var(--font-serif); font-size: 12px; font-weight: normal; letter-spacing: 1px; }

.bz-label { color: var(--text-muted); font-weight: 500; font-size: 10px; }
.bz-star { font-size: 10px; color: var(--text-primary); }
.bz-char { font-size: 16px; font-weight: 600; font-family: 'Noto Serif SC', serif; margin: 2px 0; }
.bz-sub { font-size: 10px; color: #aaa; line-height: 1.4; }
.bz-shensha { font-size: 9px; color: #B39DDB; line-height: 1.4; }

.wx-jin { color: #E8CC80; } .wx-mu { color: #81C784; } .wx-shui { color: #64B5F6; } .wx-huo { color: #E57373; } .wx-tu { color: #DCE775; } .wx-none { color: #666; }

.timeline-section { margin-top: 16px; border-top: 1px dashed var(--glass-border); padding-top: 16px; }
.timeline-title { font-size: 12px; color: var(--gold); margin-bottom: 12px; font-family: var(--font-serif); }
.dayun-grid { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 10px; scrollbar-width: none; }
.dayun-item { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 8px; min-width: 54px; text-align: center; flex-shrink: 0; }
.dayun-item.active { border-color: var(--gold); background: rgba(212,175,55,0.1); }
.dy-age { font-size: 9px; color: var(--text-muted); margin-bottom: 4px; }
.dy-char { font-size: 14px; font-family: 'Noto Serif SC', serif; font-weight: 600; }

.ai-section { margin-top: 16px; animation: riseIn 0.5s ease both; }
.ai-header-title { font-family: var(--font-serif); color: var(--gold); font-size: 15px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
.ai-header-title::before { content: '✧'; font-size: 12px; }

.xiji-box { display: flex; gap: 8px; margin-bottom: 14px; }
.xiji-item { flex: 1; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 10px; padding: 10px; text-align: center; }
.xiji-label { font-size: 10px; color: var(--text-muted); margin-bottom: 4px; }
.xiji-val { font-weight: 500; font-size: 13px; }
.xiji-val.favorable { color: #81C784; }
.xiji-val.unfavorable { color: #E57373; }

.insight-card { background: linear-gradient(180deg, rgba(212,175,55,0.05) 0%, rgba(0,0,0,0) 100%); border: 1px solid var(--glass-border); border-radius: 12px; padding: 14px; margin-bottom: 12px; }
.insight-card h4 { color: var(--gold-light); font-size: 12px; margin-bottom: 8px; font-family: var(--font-serif); border-bottom: 1px dashed rgba(212,175,55,0.2); padding-bottom: 6px; }
.insight-card p { font-size: 12px; color: #D0D0D8; line-height: 1.8; white-space: pre-wrap; }

.legacy-summary { background: rgba(212,175,55,0.05); border: 1px solid var(--gold-border); border-radius: 12px; padding: 14px; font-size: 12px; color: #D0D0D8; line-height: 1.8; white-space: pre-wrap; margin-top: 16px; }
</style>
