<template>
  <div class="bazi-view">

    <header id="siteHeader">
        <div class="site-logo">全息八字</div>
    </header>

    <div class="page-wrap">
        <div class="container">
            <div class="glass-card profile-card">
                <div class="profile-card-head">
                    <div>
                        <div class="section-kicker">命主档案</div>
                        <div class="section-title">选择或维护排盘资料</div>
                    </div>
                    <span v-if="activeProfile?.is_default" class="default-chip">默认</span>
                </div>

                <div class="profile-selector">
                    <select v-model="selectedProfileId" class="profile-select" @change="handleProfileSelect">
                        <option value="">{{ baziProfiles.length ? '请选择命主档案' : '正在加载档案或暂无档案' }}</option>
                        <option v-for="p in baziProfiles" :key="p.id" :value="p.id">
                            {{ formatProfileOption(p) }}
                        </option>
                    </select>
                    <button class="icon-btn" title="新增档案" @click="openAddProfile">+</button>
                </div>

                <div v-if="isGuest" class="guest-limit-note">访客模式仅保存 1 个本地命主档案，登录后可维护多个云端档案。</div>

                <div class="profile-actions" v-if="activeProfile && !isGuest">
                    <button class="mini-action" :disabled="activeProfile.is_default" @click="setDefaultProfile">
                        {{ activeProfile.is_default ? '已设为默认' : '设为默认' }}
                    </button>
                    <button class="mini-action" @click="openRenameProfile">修改昵称</button>
                    <button class="mini-action danger" @click="deleteProfile">删除档案</button>
                </div>

                <div v-show="showRename" class="profile-form rename-form">
                    <div class="form-row">
                        <input type="text" v-model="renameName" placeholder="新的昵称">
                    </div>
                    <div class="form-actions">
                        <button class="btn-ghost" style="border:none;color:var(--text-muted)" @click="showRename = false">取消</button>
                        <button class="btn-ghost" @click="renameProfile">保存昵称</button>
                    </div>
                </div>

                <Teleport to="body">
                    <div v-if="showAdd" class="modal-overlay picker-overlay" @click="showAdd = false">
                        <div class="profile-picker-modal" @click.stop>
                            <div class="picker-topbar">
                                <div class="picker-topcopy">
                                    <div class="section-kicker">命主档案</div>
                                    <div class="picker-heading">新增排盘资料</div>
                                </div>
                                <div class="picker-mode-tabs">
                                    <button
                                        class="picker-mode-tab"
                                        :class="{ active: entryMode === ENTRY_MODE.SOLAR }"
                                        @click="entryMode = ENTRY_MODE.SOLAR"
                                    >公历</button>
                                    <button
                                        class="picker-mode-tab"
                                        :class="{ active: entryMode === ENTRY_MODE.PILLARS }"
                                        @click="entryMode = ENTRY_MODE.PILLARS"
                                    >四柱</button>
                                </div>
                                <button class="close-button picker-close dark" title="关闭" @click="showAdd = false">×</button>
                            </div>

                            <div class="picker-form-row">
                                <input type="text" v-model.trim="form.name" placeholder="命主姓名">
                                <select v-model="form.gender">
                                    <option value="M">男 (乾造)</option>
                                    <option value="F">女 (坤造)</option>
                                </select>
                            </div>

                            <div v-if="entryMode === ENTRY_MODE.SOLAR" class="picker-panel">
                                <div class="date-input-panel">
                                    <div class="date-input-card">
                                        <label class="date-input-label">出生时间</label>
                                        <input
                                            type="text"
                                            inputmode="numeric"
                                            pattern="[0-9]*"
                                            maxlength="16"
                                            autocomplete="off"
                                            enterkeyhint="done"
                                            :value="solarInputMasked"
                                            @input="handleSolarInput"
                                            placeholder="输入 199303270255"
                                        >
                                        <div class="date-input-hint">仅支持数字输入，格式为 YYYYMMDDHHmm，也可只输入到日期或小时。</div>
                                    </div>
                                    <div class="date-segment-row">
                                        <div class="date-segment"><span>年</span><strong>{{ solarInputDigits.slice(0, 4) || '----' }}</strong></div>
                                        <div class="date-segment"><span>月</span><strong>{{ solarInputDigits.slice(4, 6) || '--' }}</strong></div>
                                        <div class="date-segment"><span>日</span><strong>{{ solarInputDigits.slice(6, 8) || '--' }}</strong></div>
                                        <div class="date-segment"><span>时</span><strong>{{ solarInputDigits.slice(8, 10) || '--' }}</strong></div>
                                        <div class="date-segment"><span>分</span><strong>{{ solarInputDigits.slice(10, 12) || '--' }}</strong></div>
                                    </div>
                                </div>
                                <div v-if="solarPreview" class="picker-preview-card">
                                    <div>阳历：{{ solarPreview.solarText }}</div>
                                    <div>农历：{{ solarPreview.lunarText }}</div>
                                    <div>四柱：{{ solarPreview.baziStr }}</div>
                                </div>
                                <div v-else class="picker-preview-card muted">
                                    <div>{{ solarInputError }}</div>
                                </div>
                            </div>

                            <div v-else class="picker-panel">
                                <div class="pillar-slot-grid">
                                    <button
                                        class="pillar-slot"
                                        :class="{ active: activePillarSlot === 'yearGan' }"
                                        @click="setActivePillarSlot('yearGan')"
                                    >
                                        <span class="slot-label">年干</span>
                                        <strong class="slot-value">{{ pillarInput.yearPillar.charAt(0) || '年干' }}</strong>
                                    </button>
                                    <button
                                        class="pillar-slot derived"
                                        :class="{ active: activePillarSlot === 'monthGan' }"
                                        @click="setActivePillarSlot('monthGan')"
                                    >
                                        <span class="slot-label">月干</span>
                                        <strong class="slot-value">{{ pillarInput.monthPillar.charAt(0) || '月干' }}</strong>
                                    </button>
                                    <button
                                        class="pillar-slot"
                                        :class="{ active: activePillarSlot === 'dayGan' }"
                                        @click="setActivePillarSlot('dayGan')"
                                    >
                                        <span class="slot-label">日干</span>
                                        <strong class="slot-value">{{ pillarInput.dayPillar.charAt(0) || '日干' }}</strong>
                                    </button>
                                    <button
                                        class="pillar-slot derived"
                                        :class="{ active: activePillarSlot === 'timeGan' }"
                                        @click="setActivePillarSlot('timeGan')"
                                    >
                                        <span class="slot-label">时干</span>
                                        <strong class="slot-value">{{ pillarInput.timePillar.charAt(0) || '时干' }}</strong>
                                    </button>
                                    <button
                                        class="pillar-slot"
                                        :class="{ active: activePillarSlot === 'yearZhi' }"
                                        @click="setActivePillarSlot('yearZhi')"
                                    >
                                        <span class="slot-label">年支</span>
                                        <strong class="slot-value">{{ pillarInput.yearPillar.charAt(1) || '年支' }}</strong>
                                    </button>
                                    <button
                                        class="pillar-slot"
                                        :class="{ active: activePillarSlot === 'monthZhi' }"
                                        @click="setActivePillarSlot('monthZhi')"
                                    >
                                        <span class="slot-label">月支</span>
                                        <strong class="slot-value">{{ pillarInput.monthPillar.charAt(1) || '月支' }}</strong>
                                    </button>
                                    <button
                                        class="pillar-slot"
                                        :class="{ active: activePillarSlot === 'dayZhi' }"
                                        @click="setActivePillarSlot('dayZhi')"
                                    >
                                        <span class="slot-label">日支</span>
                                        <strong class="slot-value">{{ pillarInput.dayPillar.charAt(1) || '日支' }}</strong>
                                    </button>
                                    <button
                                        class="pillar-slot"
                                        :class="{ active: activePillarSlot === 'timeZhi' }"
                                        @click="setActivePillarSlot('timeZhi')"
                                    >
                                        <span class="slot-label">时支</span>
                                        <strong class="slot-value">{{ pillarInput.timePillar.charAt(1) || '时支' }}</strong>
                                    </button>
                                </div>
                                <div class="pillar-choice-panel">
                                    <div class="pillar-choice-head">
                                        <div class="picker-column-label">当前选择：{{ activeSlotLabel }}</div>
                                        <div class="pillar-orb-current">{{ activeSlotValue || activeSlotLabel }}</div>
                                    </div>
                                    <div v-if="activeSlotHint" class="pillar-rule-tip">
                                        {{ activeSlotHint }}
                                    </div>
                                    <div class="orb-section">
                                        <div class="orb-title">{{ activeSlotType === 'gan' ? '天干' : '地支' }}</div>
                                        <div class="choice-chip-grid" :class="{ 'choice-chip-grid-gz': activeSlotType === 'gan', 'choice-chip-grid-zhi': activeSlotType === 'zhi' }">
                                            <button
                                                v-for="item in activeCandidateOptions"
                                                :key="'candidate'+item"
                                                class="choice-chip"
                                                :class="{ active: activeSlotValue === item, [WX_MAP[item] || 'wx-none']: true }"
                                                @click="updateActivePillar(item)"
                                            >{{ item }}</button>
                                        </div>
                                    </div>
                                </div>
                                <div v-if="pillarPreview" class="picker-preview-card">
                                    <div>匹配结果：{{ pillarPreview.solarText }}</div>
                                    <div>农历：{{ pillarPreview.lunarText }}</div>
                                    <div>候选数量：{{ pillarMatches.length }} 个，默认采用最近日期</div>
                                </div>
                                <div v-else class="picker-preview-card muted">
                                    <div>{{ pillarPreviewError }}</div>
                                </div>
                            </div>

                            <button class="picker-save-btn" @click="saveProfile">确定</button>
                        </div>
                    </div>
                </Teleport>
            </div>

            <div v-if="activeProfile" class="glass-card dashboard-panel">
                
                <div class="bazi-header">
                    <div>
                        <div class="name-row">
                            <span class="bazi-name">{{ activeProfile.name }}</span>
                            <span v-if="activeProfile.geju" class="badge badge-gold">{{ activeProfile.geju }}</span>
                            <span
                                v-if="activeProfile.strong_weak"
                                class="badge badge-blue badge-action"
                                role="button"
                                tabindex="0"
                                title="查看身强身弱依据"
                                @click="openStrengthPanel"
                                @keydown.enter.prevent="openStrengthPanel"
                                @keydown.space.prevent="openStrengthPanel"
                            >{{ activeProfile.strong_weak }}</span>
                        </div>
                        <div class="bazi-meta">农历：{{ lunarDateStr }}</div>
                        <div class="bazi-meta">阳历：{{ solarDateStr }}</div>
                        <div v-if="specialPatterns.length > 0" style="margin-top:6px;">
                            <span v-for="(sp, idx) in specialPatterns" :key="idx" class="pattern-tag">
                                {{ sp.split('】')[0] + '】' }}
                            </span>
                        </div>
                    </div>
                    <button class="btn-primary" :disabled="isAnalyzing || isGuest" @click="requestAiSummary">
                        {{ isGuest ? '访客本地档案' : (isAnalyzing ? '正在推演' : (needsUpgrade ? '生成排盘' : '重新推演')) }}
                    </button>
                </div>

                <div v-if="isAnalyzing || analysisNotice" class="analysis-status" :class="{ done: analysisNotice && !isAnalyzing }">
                    <div class="loader-orbit" v-if="isAnalyzing">
                        <span></span><span></span><span></span>
                    </div>
                    <div class="analysis-copy">
                        <div class="analysis-title">{{ isAnalyzing ? analysisSteps[analysisStageIndex] : analysisNotice }}</div>
                        <div class="analysis-subtitle">{{ isAnalyzing ? '排盘、格局、岁运与喜忌正在同步校验' : '最新结果已写入当前档案' }}</div>
                    </div>
                    <div v-if="isAnalyzing" class="analysis-progress">
                        <i :style="{ width: analysisProgress + '%' }"></i>
                    </div>
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
                                <td class="bz-label">神煞<br><span style="font-size:8px;color:#666">(点击查看)</span></td>
                                <td v-for="(col, i) in displayColumns" :key="'shen'+i" class="bz-shensha">
                                    <div v-for="s in col.shensha" :key="s" class="clickable-shensha" @click="showShensha(s)">{{ s }}</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div v-show="currentTab === 'pro' && !needsUpgrade" class="timeline-section">
                    <div class="timeline-title">专业四柱大运流年流月联动</div>
                    
                    <!-- 1. 大运 -->
                    <div class="linkage-row">
                        <div class="row-label">大<br>运</div>
                        <div class="row-content">
                            <div v-for="d in fullDayunList" :key="'dy'+d.id" 
                                 class="link-item dy-item"
                                 :class="{ active: selectedDayunIdx === d.id }"
                                 @click="selectDayun(d.id)">
                                 <div class="item-header">{{ d.start_year }}<br>{{ d.start_age }}~{{ d.start_age + 9 }}岁</div>
                                 <div v-if="d.isXiaoyun" class="item-body xiaoyun-body">小运</div>
                                 <div v-else class="item-body">
                                     <div class="char-wrap">
                                         <span class="char-gan" :class="WX_MAP[d.gan]">{{ d.gan }}</span>
                                         <span class="shi-shen" :class="getShenColor(d.shi_shen)">{{ d.shi_shen }}</span>
                                     </div>
                                     <div class="char-wrap">
                                         <span class="char-zhi" :class="WX_MAP[d.zhi]">{{ d.zhi }}</span>
                                         <span v-if="d.zhi_shi_shen" class="shi-shen" :class="getShenColor(d.zhi_shi_shen)">{{ d.zhi_shi_shen }}</span>
                                     </div>
                                 </div>
                            </div>
                        </div>
                    </div>

                    <!-- 2. 流年 -->
                    <div class="linkage-row">
                        <div class="row-label">流<br>年</div>
                        <div class="row-content">
                            <div v-for="ln in linkedLiunianList" :key="'ln'+ln.year" 
                                 class="link-item ln-item"
                                 :class="{ active: selectedLiunianYear === ln.year }"
                                 @click="selectedLiunianYear = ln.year">
                                 <div class="item-header">{{ ln.year }}</div>
                                 <div class="item-body">
                                     <div class="char-wrap">
                                         <span class="char-gan" :class="WX_MAP[ln.gan]">{{ ln.gan }}</span>
                                         <span class="shi-shen" :class="getShenColor(ln.shi_shen)">{{ ln.shi_shen }}</span>
                                     </div>
                                     <div class="char-wrap">
                                         <span class="char-zhi" :class="WX_MAP[ln.zhi]">{{ ln.zhi }}</span>
                                         <span class="shi-shen" :class="getShenColor(ln.zhi_shi_shen)">{{ ln.zhi_shi_shen }}</span>
                                     </div>
                                 </div>
                            </div>
                        </div>
                    </div>

                    <!-- 3. 流月 -->
                    <div class="linkage-row">
                        <div class="row-label">流<br>月</div>
                        <div class="row-content">
                            <div v-for="(ly, i) in linkedLiuyueList" :key="'ly'+i" 
                                 class="link-item ly-item">
                                 <div class="item-header">{{ ly.monthName }}</div>
                                 <div class="item-body">
                                     <div class="char-wrap">
                                         <span class="char-gan" :class="WX_MAP[ly.gan]">{{ ly.gan }}</span>
                                         <span class="shi-shen" :class="getShenColor(ly.shi_shen)">{{ ly.shi_shen }}</span>
                                     </div>
                                     <div class="char-wrap">
                                         <span class="char-zhi" :class="WX_MAP[ly.zhi]">{{ ly.zhi }}</span>
                                         <span class="shi-shen" :class="getShenColor(ly.zhi_shi_shen)">{{ ly.zhi_shi_shen }}</span>
                                     </div>
                                 </div>
                            </div>
                        </div>
                    </div>

                    <!-- 4. 生克合化关系 -->
                    <div v-if="interactions" class="ai-section" style="margin-top:20px;">
                        <div class="timeline-title">生克合化注意</div>
                        
                        <div class="insight-card" v-if="intGroups.ganYuanju">
                            <h4 style="color:var(--gold)">天干本命</h4>
                            <p>{{ intGroups.ganYuanju }}</p>
                        </div>
                        <div class="insight-card" v-if="intGroups.zhiYuanju">
                            <h4 style="color:var(--gold)">地支本命</h4>
                            <p>{{ intGroups.zhiYuanju }}</p>
                        </div>
                        <div class="insight-card" v-if="intGroups.ganYun">
                            <h4 style="color:#FF5E57">天干运势</h4>
                            <p>{{ intGroups.ganYun }}</p>
                        </div>
                        <div class="insight-card" v-if="intGroups.zhiYun">
                            <h4 style="color:#FF5E57">地支运势</h4>
                            <p>{{ intGroups.zhiYun }}</p>
                        </div>
                        
                        <div v-if="!intGroups.ganYuanju && !intGroups.zhiYuanju && !intGroups.ganYun && !intGroups.zhiYun" style="text-align:center;color:#666;font-size:12px;">暂无明显的合冲破害关系</div>
                    </div>
                </div>

                <!-- 神煞解释弹窗 -->
                <Teleport to="body">
                    <div v-if="selectedShensha" class="modal-overlay" @click="selectedShensha = null">
                        <div class="shensha-modal" @click.stop>
                            <h4>{{ selectedShensha }}</h4>
                            <p>{{ getShenshaDesc(selectedShensha) }}</p>
                            <button class="btn-primary" style="width:100%; margin-top:14px;" @click="selectedShensha = null">明白</button>
                        </div>
                    </div>
                </Teleport>

                <Teleport to="body">
                    <div v-if="activeInfoPanel === 'strength' && strengthPanelContent" class="modal-overlay" @click="activeInfoPanel = null">
                        <div class="detail-drawer strength-drawer" @click.stop>
                            <div class="drawer-head">
                                <div>
                                    <div class="section-kicker">强弱依据</div>
                                    <h4>日主{{ activeProfile?.strong_weak || '强弱' }}判定</h4>
                                </div>
                                <button class="close-button" title="关闭" @click="activeInfoPanel = null">×</button>
                            </div>
                            <div class="strength-summary-card">
                                <div class="strength-summary-top">
                                    <span class="strength-pill">{{ activeProfile?.strong_weak || '未判定' }}</span>
                                    <span v-if="strengthPanelContent.summary" class="strength-summary-text">{{ strengthPanelContent.summary }}</span>
                                </div>
                                <p v-if="strengthPanelContent.rawBasis" class="strength-summary-basis">{{ strengthPanelContent.rawBasis }}</p>
                            </div>
                            <div v-if="strengthPanelContent.sections.length" class="strength-section-list">
                                <div v-for="section in strengthPanelContent.sections" :key="section.key" class="strength-section-card">
                                    <div class="strength-section-head">
                                        <h5>{{ section.title }}</h5>
                                        <span v-if="section.scoreLabel" class="strength-score-chip">{{ section.scoreLabel }}</span>
                                    </div>
                                    <p>{{ section.text }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Teleport>

                <Teleport to="body">
                    <div v-if="activeInfoPanel === 'scoring' && activeProfile.bazi_detail?.scoring_details" class="modal-overlay" @click="activeInfoPanel = null">
                        <div class="detail-drawer" @click.stop>
                            <div class="drawer-head">
                                <div>
                                    <div class="section-kicker">用神依据</div>
                                    <h4>核心用神四维剖析</h4>
                                </div>
                                <button class="close-button" title="关闭" @click="activeInfoPanel = null">×</button>
                            </div>
                            <div class="scoring-list">
                                <div v-for="shen in activeProfile.favorable_elements" :key="'fav'+shen" class="scoring-item fav-item">
                                    <div class="scoring-item-header">
                                        <span class="shen-badge favorable">{{ shen }}</span>
                                        <span class="total-score">{{ formatScore(activeProfile.bazi_detail.scoring_details[shen]) }}</span>
                                    </div>
                                    <div class="scoring-bars" v-if="activeProfile.bazi_detail.dimension_breakdown[shen]">
                                        <div class="s-bar-row" title="气候冷暖平衡">
                                            <span class="s-label">调候</span>
                                            <span class="s-val" :class="getScoreColor(activeProfile.bazi_detail.dimension_breakdown[shen].tiaohou)">{{ formatScore(activeProfile.bazi_detail.dimension_breakdown[shen].tiaohou) }}</span>
                                        </div>
                                        <div class="s-bar-row" title="五行偏枯制衡">
                                            <span class="s-label">病药</span>
                                            <span class="s-val" :class="getScoreColor(activeProfile.bazi_detail.dimension_breakdown[shen].bingyao)">{{ formatScore(activeProfile.bazi_detail.dimension_breakdown[shen].bingyao) }}</span>
                                        </div>
                                        <div class="s-bar-row" title="两行克战化解">
                                            <span class="s-label">通关</span>
                                            <span class="s-val" :class="getScoreColor(activeProfile.bazi_detail.dimension_breakdown[shen].tongguan)">{{ formatScore(activeProfile.bazi_detail.dimension_breakdown[shen].tongguan) }}</span>
                                        </div>
                                        <div class="s-bar-row" title="日主强弱生克">
                                            <span class="s-label">扶抑</span>
                                            <span class="s-val" :class="getScoreColor(activeProfile.bazi_detail.dimension_breakdown[shen].fuyi)">{{ formatScore(activeProfile.bazi_detail.dimension_breakdown[shen].fuyi) }}</span>
                                        </div>
                                    </div>
                                </div>
                                <div v-for="shen in activeProfile.unfavorable_elements" :key="'unfav'+shen" class="scoring-item unfav-item">
                                    <div class="scoring-item-header">
                                        <span class="shen-badge unfavorable">{{ shen }}</span>
                                        <span class="total-score">{{ formatScore(activeProfile.bazi_detail.scoring_details[shen]) }}</span>
                                    </div>
                                    <div class="scoring-bars" v-if="activeProfile.bazi_detail.dimension_breakdown[shen]">
                                        <div class="s-bar-row"><span class="s-label">调候</span><span class="s-val" :class="getScoreColor(activeProfile.bazi_detail.dimension_breakdown[shen].tiaohou)">{{ formatScore(activeProfile.bazi_detail.dimension_breakdown[shen].tiaohou) }}</span></div>
                                        <div class="s-bar-row"><span class="s-label">病药</span><span class="s-val" :class="getScoreColor(activeProfile.bazi_detail.dimension_breakdown[shen].bingyao)">{{ formatScore(activeProfile.bazi_detail.dimension_breakdown[shen].bingyao) }}</span></div>
                                        <div class="s-bar-row"><span class="s-label">通关</span><span class="s-val" :class="getScoreColor(activeProfile.bazi_detail.dimension_breakdown[shen].tongguan)">{{ formatScore(activeProfile.bazi_detail.dimension_breakdown[shen].tongguan) }}</span></div>
                                        <div class="s-bar-row"><span class="s-label">扶抑</span><span class="s-val" :class="getScoreColor(activeProfile.bazi_detail.dimension_breakdown[shen].fuyi)">{{ formatScore(activeProfile.bazi_detail.dimension_breakdown[shen].fuyi) }}</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Teleport>

                <!-- 命局天机分析版块 -->
                <div v-if="activeProfile.bazi_detail && activeProfile.bazi_detail.scoring_details" class="ai-section insight-summary">
                    <div class="ai-header-title">命局天机</div>
                    
                    <!-- 1. 格局特性卡片 -->
                    <div class="insight-card geju-card">
                        <div class="tag-row">
                            <span
                                class="tag-gold tag-action"
                                role="button"
                                tabindex="0"
                                title="查看身强身弱依据"
                                @click="openStrengthPanel"
                                @keydown.enter.prevent="openStrengthPanel"
                                @keydown.space.prevent="openStrengthPanel"
                            >{{ activeProfile.strong_weak }}</span>
                            <span class="tag-gold">{{ activeProfile.geju }}</span>
                        </div>
                        <p>
                            {{ getGejuDesc(activeProfile.geju) }}
                        </p>
                        <div class="verdict-line">
                            <span>断语</span>
                            <p>{{ activeProfile.bazi_detail.favorable_verdict }}</p>
                        </div>
                    </div>

                    <!-- 2. 五行能量占比条 -->
                    <div class="insight-card wuxing-pool-card" v-if="activeProfile.bazi_detail.wuxing_ratio">
                        <h4 class="card-heading">
                            <span>五行能量池</span>
                            <span v-if="Object.values(activeProfile.bazi_detail.wuxing_ratio).some(r => r > 45)" class="overload-tag">能量偏盛</span>
                        </h4>
                        <div class="wuxing-bar-container">
                            <div v-for="(ratio, wx) in activeProfile.bazi_detail.wuxing_ratio" :key="wx" 
                                 class="wuxing-bar-segment" 
                                 :class="'bg-' + getWuxingClass(wx)"
                                 :style="{ width: ratio + '%' }"
                                 :title="wx + ' ' + Math.round(ratio) + '%'">
                                <span v-if="ratio > 10" class="wuxing-bar-label">{{ wx }} {{ Math.round(ratio) }}%</span>
                            </div>
                        </div>
                    </div>

                </div>

                <div v-if="activeProfile.yuanju_core" class="ai-section" style="display: block;">
                    <div class="ai-header-row">
                        <div class="ai-header-title">天机锦囊</div>
                        <button class="info-button" title="查看核心用神四维剖析" @click="activeInfoPanel = 'scoring'">i</button>
                    </div>
                    <div class="xiji-box">
                        <div class="xiji-item">
                            <div class="xiji-label">喜用神</div>
                            <div class="xiji-val favorable">{{ formatXiJi(activeProfile.favorable_elements) }}</div>
                        </div>
                        <div class="xiji-item">
                            <div class="xiji-label">忌仇神</div>
                            <div class="xiji-val unfavorable">{{ formatXiJi(activeProfile.unfavorable_elements) }}</div>
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

                <div v-if="classicVerdictText" class="ai-section classic-verdict-section">
                    <div class="classic-header">
                        <div>
                            <div class="ai-header-title classic-main-title">古籍断语</div>
                            <div class="classic-subtitle">{{ classicVerdict.source || '三命通会' }}</div>
                        </div>
                        <span class="classic-key">{{ classicVerdict.key }}</span>
                    </div>
                    <div class="classic-body">
                        <p
                            v-for="(line, idx) in classicVerdictLines"
                            :key="'classic'+idx"
                            :class="{ note: line.startsWith('#') }"
                        >
                            {{ line }}
                        </p>
                    </div>
                </div>

            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { Solar } from 'lunar-javascript'
import { globalState } from '../store.js'
import { getGuestState, saveGuestBaziProfile, trackGuestEvent } from '../guestMode.mjs'
import {
    buildPillarsProfilePayload,
    buildSolarProfilePayload,
    ENTRY_MODE,
    GAN,
    findDatesByBazi,
    getAllowedMonthBranchesByStem,
    getAllowedTimeBranchesByStem,
    getSolarLunarSnapshot,
    parseCompactSolarInput,
    ZHI
} from '../utils/baziProfileInput.mjs'

const SUPABASE_URL = 'https://xkbqiiwwgfzkyfhxuoev.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_qr9YBIA6n32r-mcqKbkpgA_0XVTUSI7'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 核心字典
const WX_MAP = {'甲':'wx-mu','乙':'wx-mu','寅':'wx-mu','卯':'wx-mu','丙':'wx-huo','丁':'wx-huo','巳':'wx-huo','午':'wx-huo','戊':'wx-tu','己':'wx-tu','辰':'wx-tu','戌':'wx-tu','丑':'wx-tu','未':'wx-tu','庚':'wx-jin','辛':'wx-jin','申':'wx-jin','酉':'wx-jin','壬':'wx-shui','癸':'wx-shui','亥':'wx-shui','子':'wx-shui'}
const GAN_WUXING = { '甲':'甲木', '乙':'乙木', '丙':'丙火', '丁':'丁火', '戊':'戊土', '己':'己土', '庚':'庚金', '辛':'辛金', '壬':'壬水', '癸':'癸水' }

const GEJU_DESCRIPTIONS = {
    '正财格': '为人踏实守信，重现实轻虚浮，最利于实业与财务运作，宜稳扎稳打。',
    '偏财格': '性格慷慨豪爽，有敏锐的商业嗅觉和投资眼光，一生多有机遇，适合经商理财。',
    '正官格': '光明磊落，重信守诺，具备良好的管理能力与责任心，利于公职或大企业发展。',
    '七杀格': '果断坚毅，具备开创性与领导力，面对困难敢于迎难而上，宜在动荡或竞争中求胜。',
    '正印格': '仁慈宽厚，注重内涵与学识，一生多得长辈贵人相助，适宜从事文教、科研等行业。',
    '偏印格': '领悟力极强，心思细腻，对偏门学问（如宗教、玄学、艺术）有独特见解，性格较为内向孤高。',
    '食神格': '温文尔雅，懂得享受生活，有艺术才华与语言表达能力，一生衣禄丰厚。',
    '伤官格': '才华横溢，思维敏捷，好胜心强，不喜受约束，适合从事技术、演艺、创意类工作。',
    '建禄格': '独立自主，有骨气，早年多依靠自己打拼，为人讲义气。',
    '羊刃格': '个性刚强，不轻易妥协，爆发力极强，若有官杀制衡可成大业。',
    '月刃格': '同羊刃格，性格刚烈，执行力强。'
};

const getGejuDesc = (geju) => {
    return GEJU_DESCRIPTIONS[geju] || '此格局具有独特的五行气势，需结合大运流年综合分析。';
};

const getScoreColor = (score) => {
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
};

const formatScore = (score) => {
    if (score > 0) return '+' + score + ' 分';
    return score + ' 分';
};

const formatStrengthPanelScore = (score) => {
    if (score === null || score === undefined || Number.isNaN(Number(score))) return ''
    const num = Number(score)
    return Number.isInteger(num) ? `${num} 分` : `${num.toFixed(1).replace(/\.0$/, '')} 分`
}

const getWuxingClass = (wx) => {
    const map = { '金': 'gold', '木': 'wood', '水': 'water', '火': 'fire', '土': 'earth' };
    return map[wx] || 'gold';
};

// 状态定义
const currentUser = ref(null)
const baziProfiles = ref([])
const selectedProfileId = ref('')
const currentTab = ref('basic')
const showAdd = ref(false)
const showRename = ref(false)
const isAnalyzing = ref(false)
const activeInfoPanel = ref(null)
const renameName = ref('')
const analysisNotice = ref('')
const analysisStageIndex = ref(0)
const analysisProgress = ref(8)
const analysisSteps = [
    '校准出生时空',
    '排布四柱格局',
    '核对喜忌用神',
    '联动大运流年',
    '整理天机断语'
]
let analysisTimer = null

const form = reactive({
    name: '',
    gender: 'M'
})

const entryMode = ref(ENTRY_MODE.SOLAR)
const solarInput = reactive({
    text: '199001010000'
})
const pillarInput = reactive({
    yearPillar: '庚午',
    monthPillar: '戊寅',
    dayPillar: '乙丑',
    timePillar: '丙子'
})
const activePillarSlot = ref('yearGan')
const PILLAR_SLOT_FLOW = ['yearGan', 'yearZhi', 'monthGan', 'monthZhi', 'dayGan', 'dayZhi', 'timeGan', 'timeZhi']

const ganOptions = GAN
const zhiOptions = ZHI
const activeSlotType = computed(() => activePillarSlot.value.endsWith('Gan') ? 'gan' : 'zhi')
const activeSlotLabel = computed(() => ({
    yearGan: '年干',
    monthGan: '月干',
    dayGan: '日干',
    timeGan: '时干',
    yearZhi: '年支',
    monthZhi: '月支',
    dayZhi: '日支',
    timeZhi: '时支'
}[activePillarSlot.value] || '年干'))
const monthBranchOptions = computed(() => getAllowedMonthBranchesByStem(pillarInput.monthPillar.charAt(0)))
const timeBranchOptions = computed(() => getAllowedTimeBranchesByStem(pillarInput.timePillar.charAt(0)))
const activeCandidateOptions = computed(() => {
    if (activeSlotType.value === 'gan') return ganOptions
    if (activePillarSlot.value === 'monthZhi') return monthBranchOptions.value
    if (activePillarSlot.value === 'timeZhi') return timeBranchOptions.value
    return zhiOptions
})
const activeSlotValue = computed(() => {
    switch (activePillarSlot.value) {
        case 'yearGan': return pillarInput.yearPillar.charAt(0)
        case 'monthGan': return pillarInput.monthPillar.charAt(0)
        case 'dayGan': return pillarInput.dayPillar.charAt(0)
        case 'timeGan': return pillarInput.timePillar.charAt(0)
        case 'yearZhi': return pillarInput.yearPillar.charAt(1)
        case 'monthZhi': return pillarInput.monthPillar.charAt(1)
        case 'dayZhi': return pillarInput.dayPillar.charAt(1)
        case 'timeZhi': return pillarInput.timePillar.charAt(1)
        default: return ''
    }
})
const activeSlotHint = computed(() => {
    if (activePillarSlot.value === 'monthZhi') {
        return `已按月干 ${pillarInput.monthPillar.charAt(0)} 限定月支，可选六支：${monthBranchOptions.value.join('、')}`
    }
    if (activePillarSlot.value === 'timeZhi') {
        return `已按时干 ${pillarInput.timePillar.charAt(0)} 限定时支，可选六支：${timeBranchOptions.value.join('、')}`
    }
    if (activePillarSlot.value === 'monthGan') return '先定月干，再进入月支选择。'
    if (activePillarSlot.value === 'timeGan') return '先定时干，再进入时支选择。'
    return ''
})
const pillarPreviewError = computed(() => {
    if (pillarMatches.value.length) return ''
    return '当前四柱暂无匹配日期，请调整后再试。'
})

// 计算属性 (Vue 魔法：数据变化自动更新 UI)
const activeProfile = computed(() => {
    return baziProfiles.value.find(p => p.id === selectedProfileId.value) || null
})
const isGuest = computed(() => globalState.isGuest && !currentUser.value)

const formatSolarDate = (value) => {
    if (!value) return '未录入阳历'
    const p = String(value).match(/\d+/g)
    if (!p || p.length < 3) return '阳历待确认'
    const time = p.length >= 5 ? ` ${p[3].padStart(2, '0')}:${p[4].padStart(2, '0')}` : ''
    return `${p[0]}.${p[1].padStart(2, '0')}.${p[2].padStart(2, '0')}${time}`
}

const formatProfileOption = (profile) => {
    return `${profile.name}（${formatSolarDate(profile.birth_date)}）`
}

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

const ZHI_MAIN_GAN = {
    '子': '癸', '丑': '己', '寅': '甲', '卯': '乙', '辰': '戊', '巳': '丙',
    '午': '丁', '未': '己', '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬'
};

const PILLAR_NAMES = { 'year': '年柱', 'month': '月柱', 'day': '日柱', 'time': '时柱', 'dayun': '大运', 'liunian': '流年' };

const interactions = computed(() => {
    return activeProfile.value?.bazi_detail?.interactions || null;
});

const intGroups = computed(() => {
    if (!interactions.value) return {};
    const isYuanju = (item) => item.pillars.every(p => ['year', 'month', 'day', 'time'].includes(p));
    const isYun = (item) => !isYuanju(item);

    return {
        ganYuanju: interactions.value.gans.filter(isYuanju).map(i => i.name).join('；'),
        zhiYuanju: interactions.value.zhis.filter(isYuanju).map(i => i.name).join('；'),
        ganYun: interactions.value.gans.filter(isYun).map(i => i.name).join('；'),
        zhiYun: interactions.value.zhis.filter(isYun).map(i => i.name).join('；')
    }
});

// 联动计算逻辑
const baziEngine = computed(() => {
    if (!activeProfile.value) return null;
    const pd = promptDataObj.value;
    if (!pd || !pd.birthStr) return null;
    const p = pd.birthStr.match(/\d+/g);
    if (!p || p.length < 3) return null;
    const s = Solar.fromYmdHms(parseInt(p[0]), parseInt(p[1]), parseInt(p[2]), parseInt(p[3]||12), parseInt(p[4]||0), 0);
    const baZi = s.getLunar().getEightChar();
    const gender = activeProfile.value.gender === 'M' ? 1 : 0;
    const yun = baZi.getYun(gender);
    return { baZi, yun, dayGan: baZi.getDayGan() };
});

const selectedDayunIdx = ref(0);
const selectedLiunianYear = ref(new Date().getFullYear());

watch(baziEngine, (newVal) => {
    if (newVal) {
        const currentYear = new Date().getFullYear();
        const dys = newVal.yun.getDaYun();
        let foundIdx = dys.findIndex(dy => currentYear >= dy.getStartYear() && currentYear <= dy.getEndYear());
        if (foundIdx === -1) foundIdx = 0;
        selectedDayunIdx.value = foundIdx;
        selectedLiunianYear.value = currentYear;
    }
}, { immediate: true });

watch(
    () => pillarInput.monthPillar.charAt(0),
    () => {
        const allowed = monthBranchOptions.value
        if (!allowed.includes(pillarInput.monthPillar.charAt(1))) {
            pillarInput.monthPillar = `${pillarInput.monthPillar.charAt(0)}${allowed[0]}`
        }
    },
    { immediate: true }
)

watch(
    () => pillarInput.timePillar.charAt(0),
    () => {
        const allowed = timeBranchOptions.value
        if (!allowed.includes(pillarInput.timePillar.charAt(1))) {
            pillarInput.timePillar = `${pillarInput.timePillar.charAt(0)}${allowed[0]}`
        }
    },
    { immediate: true }
)

const selectDayun = (idx) => {
    selectedDayunIdx.value = idx;
    const dy = fullDayunList.value[idx]?.originalDy;
    if (dy) {
        // 默认选中该大运的第一年
        selectedLiunianYear.value = dy.getStartYear();
    }
};

const fullDayunList = computed(() => {
    if (!baziEngine.value) return [];
    const { yun, dayGan } = baziEngine.value;
    const list = [];
    yun.getDaYun().forEach((dy, idx) => {
        const ganZhi = dy.getGanZhi();
        const gan = ganZhi ? ganZhi.charAt(0) : '';
        const zhi = ganZhi ? ganZhi.charAt(1) : '';
        list.push({
            id: idx,
            start_year: dy.getStartYear(),
            start_age: dy.getStartAge(),
            gan: gan,
            zhi: zhi,
            shi_shen: gan ? getShiShen(dayGan, gan) : '小运',
            zhi_shi_shen: zhi ? getShiShen(dayGan, ZHI_MAIN_GAN[zhi]) : '',
            isXiaoyun: idx === 0 && !gan,
            originalDy: dy
        });
    });
    return list;
});

const linkedLiunianList = computed(() => {
    if (!baziEngine.value || fullDayunList.value.length === 0) return [];
    const idx = selectedDayunIdx.value;
    const targetDy = fullDayunList.value[idx]?.originalDy;
    if (!targetDy) return [];
    
    return targetDy.getLiuNian().map(ln => {
        const ganZhi = ln.getGanZhi();
        const gan = ganZhi.charAt(0);
        return {
            year: ln.getYear(),
            age: ln.getAge(),
            gan: gan,
            zhi: ganZhi.charAt(1),
            shi_shen: getShiShen(baziEngine.value.dayGan, gan),
            zhi_shi_shen: getShiShen(baziEngine.value.dayGan, ZHI_MAIN_GAN[ganZhi.charAt(1)]),
            originalLn: ln
        };
    });
});

const linkedLiuyueList = computed(() => {
    if (!baziEngine.value || linkedLiunianList.value.length === 0) return [];
    const lnYear = selectedLiunianYear.value;
    const targetLn = linkedLiunianList.value.find(ln => ln.year === lnYear)?.originalLn;
    if (!targetLn) return [];
    
    return targetLn.getLiuYue().map(ly => {
        const ganZhi = ly.getGanZhi();
        const gan = ganZhi.charAt(0);
        return {
            monthName: ly.getMonthInChinese() + '月',
            gan: gan,
            zhi: ganZhi.charAt(1),
            shi_shen: getShiShen(baziEngine.value.dayGan, gan),
            zhi_shi_shen: getShiShen(baziEngine.value.dayGan, ZHI_MAIN_GAN[ganZhi.charAt(1)])
        };
    });
});

const specialPatterns = computed(() => {
    if (!activeProfile.value || !activeProfile.value.bazi_detail?.base_info?.special_patterns) return []
    return activeProfile.value.bazi_detail.base_info.special_patterns
})

const classicVerdict = computed(() => {
    return activeProfile.value?.bazi_detail?.classic_verdict || {}
})

const classicVerdictText = computed(() => {
    return classicVerdict.value?.text || ''
})

const classicVerdictLines = computed(() => {
    return classicVerdictText.value.split('\n').map(line => line.trim()).filter(Boolean)
})

const strengthPanelContent = computed(() => {
    if (!activeProfile.value) return null
    const detail = activeProfile.value.strength_detail || activeProfile.value.bazi_detail?.strength_detail || null
    const rawBasis = activeProfile.value.strength_basis || activeProfile.value.bazi_detail?.strength_basis || ''

    if (detail?.sections?.length) {
        return {
            summary: detail.summary || '',
            rawBasis,
            sections: detail.sections.map(section => ({
                key: section.key,
                title: section.title,
                text: section.text,
                scoreLabel: formatStrengthPanelScore(section.score),
            })),
        }
    }

    if (!rawBasis) return null

    return {
        summary: activeProfile.value.strong_weak ? `日主${activeProfile.value.strong_weak}` : '',
        rawBasis,
        sections: rawBasis
            .split(/(?<=[。；])/)
            .map(part => part.trim())
            .filter(Boolean)
            .map((text, index) => ({
                key: `fallback-${index}`,
                title: `依据 ${index + 1}`,
                text,
                scoreLabel: '',
            })),
    }
})

const openStrengthPanel = () => {
    if (!strengthPanelContent.value) return
    activeInfoPanel.value = 'strength'
}

// 时间解析逻辑
const promptDataObj = computed(() => {
    if (!activeProfile.value) return null
    return generateLunarPromptData(activeProfile.value)
})

const solarParsedInput = computed(() => parseCompactSolarInput(solarInput.text))
const solarInputDigits = computed(() => String(solarInput.text || '').replace(/\D/g, '').slice(0, 12))
const solarInputError = computed(() => {
    const digits = solarInputDigits.value
    if (!digits.length) return '请输入出生年月日时分'
    if (![8, 10, 12].includes(digits.length)) return '请输入 8 位、10 位或 12 位数字，例如 199303270255'
    const parsed = solarParsedInput.value
    if (!parsed) return '日期格式不正确'
    if (parsed.month < 1 || parsed.month > 12 || parsed.day < 1 || parsed.day > 31 || parsed.hour > 23 || parsed.minute > 59) {
        return '日期格式不正确，请检查月份、日期、小时和分钟'
    }
    return ''
})
const solarPreview = computed(() => {
    if (solarInputError.value || !solarParsedInput.value) return null
    const { year, month, day, hour, minute } = solarParsedInput.value
    return getSolarLunarSnapshot(year, month, day, hour, minute)
})
const solarInputMasked = computed(() => {
    const digits = solarInputDigits.value
    const y = digits.slice(0, 4)
    const m = digits.slice(4, 6)
    const d = digits.slice(6, 8)
    const h = digits.slice(8, 10)
    const min = digits.slice(10, 12)
    return [y, m, d, h, min].filter(Boolean).join(' ')
})

const pillarMatches = computed(() => findDatesByBazi(
    pillarInput.yearPillar,
    pillarInput.monthPillar,
    pillarInput.dayPillar,
    pillarInput.timePillar
))

const pillarPreview = computed(() => {
    if (!pillarMatches.value.length) return null
    const latest = pillarMatches.value[pillarMatches.value.length - 1]
    return getSolarLunarSnapshot(
        latest.getYear(),
        latest.getMonth(),
        latest.getDay(),
        latest.getHour(),
        latest.getMinute()
    )
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
    if (!session && globalState.isGuest) {
        loadGuestProfile()
        await trackGuestEvent(supabase, 'guest_bazi_viewed', 'bazi')
        return
    }
    if (!session) return // 可以在此触发全局路由跳转回登录页
    currentUser.value = session.user
    await fetchProfiles()
})

onUnmounted(() => {
    stopAnalysisMotion()
})

// 业务方法
const fetchProfiles = async () => {
    if (isGuest.value) {
        loadGuestProfile()
        return
    }
    const { data } = await supabase.from('bazi_profiles').select('*').order('created_at', {ascending: false})
    baziProfiles.value = data || []
    if (baziProfiles.value.length > 0 && !selectedProfileId.value) {
        const defaultProfile = baziProfiles.value.find(p => p.is_default) || baziProfiles.value[0]
        selectedProfileId.value = defaultProfile.id
    }
}

const handleProfileSelect = () => {
    currentTab.value = 'basic'
    showRename.value = false
    analysisNotice.value = ''
}

const openAddProfile = () => {
    if (isGuest.value && baziProfiles.value.length >= 1) {
        alert('访客模式仅可添加 1 个本地八字档案')
        return
    }
    resetProfileEntry()
    showAdd.value = true
    showRename.value = false
}

const openRenameProfile = () => {
    if (!activeProfile.value) return
    renameName.value = activeProfile.value.name
    showRename.value = true
    showAdd.value = false
}

const resetProfileEntry = () => {
    form.name = ''
    form.gender = 'M'
    entryMode.value = ENTRY_MODE.SOLAR
    solarInput.text = '199001010000'
    pillarInput.yearPillar = '庚午'
    pillarInput.monthPillar = '戊寅'
    pillarInput.dayPillar = '乙丑'
    pillarInput.timePillar = '丙子'
    activePillarSlot.value = 'yearGan'
}

const handleSolarInput = (event) => {
    const digits = String(event?.target?.value || '').replace(/\D/g, '').slice(0, 12)
    solarInput.text = digits
}

const setActivePillarSlot = (slot) => {
    activePillarSlot.value = slot
}

const moveToNextPillarSlot = () => {
    const currentIndex = PILLAR_SLOT_FLOW.indexOf(activePillarSlot.value)
    if (currentIndex === -1 || currentIndex >= PILLAR_SLOT_FLOW.length - 1) return
    activePillarSlot.value = PILLAR_SLOT_FLOW[currentIndex + 1]
}

const updateActivePillar = (value) => {
    if (activePillarSlot.value === 'monthZhi' && !monthBranchOptions.value.includes(value)) {
        return
    }
    if (activePillarSlot.value === 'timeZhi' && !timeBranchOptions.value.includes(value)) {
        return
    }
    switch (activePillarSlot.value) {
        case 'yearGan':
            pillarInput.yearPillar = `${value}${pillarInput.yearPillar.charAt(1) || '子'}`
            break
        case 'yearZhi':
            pillarInput.yearPillar = `${pillarInput.yearPillar.charAt(0) || '甲'}${value}`
            break
        case 'monthGan':
            pillarInput.monthPillar = `${value}${pillarInput.monthPillar.charAt(1) || getAllowedMonthBranchesByStem(value)[0]}`
            break
        case 'monthZhi':
            pillarInput.monthPillar = `${pillarInput.monthPillar.charAt(0) || '甲'}${value}`
            break
        case 'dayGan':
            pillarInput.dayPillar = `${value}${pillarInput.dayPillar.charAt(1) || '子'}`
            break
        case 'dayZhi':
            pillarInput.dayPillar = `${pillarInput.dayPillar.charAt(0) || '甲'}${value}`
            break
        case 'timeGan':
            pillarInput.timePillar = `${value}${pillarInput.timePillar.charAt(1) || getAllowedTimeBranchesByStem(value)[0]}`
            break
        case 'timeZhi':
            pillarInput.timePillar = `${pillarInput.timePillar.charAt(0) || '甲'}${value}`
            break
        default:
            break
    }
    moveToNextPillarSlot()
}

const buildProfilePayloadFromEntry = () => {
    const name = form.name.trim()
    if (!name) {
        throw new Error('请先填写命主姓名')
    }

    if (entryMode.value === ENTRY_MODE.SOLAR) {
        if (solarInputError.value || !solarParsedInput.value) {
            throw new Error(solarInputError.value || '请输入正确的出生年月日时分')
        }
        return buildSolarProfilePayload({
            name,
            gender: form.gender,
            year: solarParsedInput.value.year,
            month: solarParsedInput.value.month,
            day: solarParsedInput.value.day,
            hour: solarParsedInput.value.hour,
            minute: solarParsedInput.value.minute
        })
    }

    return buildPillarsProfilePayload({
        name,
        gender: form.gender,
        yearPillar: pillarInput.yearPillar,
        monthPillar: pillarInput.monthPillar,
        dayPillar: pillarInput.dayPillar,
        timePillar: pillarInput.timePillar
    })
}

const saveProfile = async () => {
    let payload
    try {
        payload = buildProfilePayloadFromEntry()
    } catch (error) {
        alert(error.message)
        return
    }
    if (isGuest.value) {
        const profile = buildGuestProfile(payload)
        saveGuestBaziProfile(undefined, profile)
        baziProfiles.value = [profile]
        selectedProfileId.value = profile.id
        showAdd.value = false
        resetProfileEntry()
        await trackGuestEvent(supabase, 'guest_bazi_profile_added', 'bazi', { limit_reached: true })
        return
    }
    const { data, error } = await supabase.from('bazi_profiles').insert([{ 
        user_id: currentUser.value.id, 
        name: payload.name,
        gender: payload.gender,
        birth_date: payload.birth_date,
        bazi_str: payload.bazi_str
    }]).select('id').single()
    if (error) alert(error.message) 
    else { 
        showAdd.value = false
        resetProfileEntry()
        if (data?.id) selectedProfileId.value = data.id
        await fetchProfiles() 
    }
}

const loadGuestProfile = () => {
    const profile = getGuestState().baziProfile
    baziProfiles.value = profile ? [profile] : []
    selectedProfileId.value = profile?.id || ''
}

const buildGuestProfile = (payload) => {
    return {
        id: 'guest_bazi_profile',
        name: payload.name,
        gender: payload.gender,
        birth_date: payload.birth_date,
        bazi_str: payload.bazi_str,
        bazi_summary: '访客本地档案已保存。登录后可生成完整云端命理解读与日运联动。',
        is_default: true
    }
}

const renameProfile = async () => {
    if (!activeProfile.value) return
    const nextName = renameName.value.trim()
    if (!nextName) return alert('昵称不能为空')
    const { error } = await supabase.from('bazi_profiles').update({ name: nextName }).eq('id', activeProfile.value.id)
    if (error) alert(error.message)
    else {
        showRename.value = false
        await fetchProfiles()
    }
}

const setDefaultProfile = async () => {
    if (!activeProfile.value || activeProfile.value.is_default) return
    const profileId = activeProfile.value.id
    const { error: clearError } = await supabase.from('bazi_profiles').update({ is_default: false }).eq('user_id', currentUser.value.id)
    if (clearError) return alert(clearError.message)
    const { error } = await supabase.from('bazi_profiles').update({ is_default: true }).eq('id', profileId)
    if (error) alert(error.message)
    else {
        selectedProfileId.value = profileId
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

const startAnalysisMotion = () => {
    analysisNotice.value = ''
    analysisStageIndex.value = 0
    analysisProgress.value = 8
    stopAnalysisMotion()
    analysisTimer = window.setInterval(() => {
        analysisProgress.value = Math.min(92, analysisProgress.value + 7)
        analysisStageIndex.value = Math.min(analysisSteps.length - 1, Math.floor((analysisProgress.value / 100) * analysisSteps.length))
    }, 900)
}

const stopAnalysisMotion = () => {
    if (analysisTimer) {
        window.clearInterval(analysisTimer)
        analysisTimer = null
    }
}

const requestAiSummary = async () => {
    if (!activeProfile.value) return
    isAnalyzing.value = true
    startAnalysisMotion()
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
        analysisProgress.value = 100
        await fetchProfiles() // 刷新拿到最新数据
        analysisNotice.value = '推演完成'
    } catch (err) {
        alert("推演失败: " + err.message)
    } finally {
        stopAnalysisMotion()
        isAnalyzing.value = false
    }
}

// 辅助方法
const formatShen = (shenArr) => {
    return shenArr && shenArr.length > 0 ? shenArr.join('<br>') : '-'
}

const formatXiJi = (val) => {
    if (!val) return '-';
    if (Array.isArray(val)) return val.length ? val.join('、') : '-';
    return val;
}

const selectedShensha = ref(null);
const showShensha = (shensha) => {
    selectedShensha.value = shensha;
};

const SHENSHA_DESC = {
    '天乙贵人': '至尊之神，逢凶化吉，主一生多有贵人相助，遇难呈祥。',
    '太极贵人': '主聪明好学，喜神秘文化，有逢凶化吉之功。',
    '文昌贵人': '主聪明过人，利读书升学、文艺才华。',
    '天德贵人': '福佑之神，主一生安泰，心地善良。',
    '月德贵人': '福祥之神，解灾化煞，女命尤佳。',
    '将星': '主权威、组织领导能力，有掌权之机，临官煞尤显。',
    '华盖': '主孤高、聪明、艺术才华，多喜宗教玄学。',
    '驿马': '主变动、奔波、走动、出国或异地发展。',
    '桃花': '主风流、异性缘佳、艺术才情，易有感情纠葛。',
    '红艳': '主多情多欲，浪漫不羁，异性缘极强。',
    '孤辰': '男命忌，主孤独、不利婚姻、刑克六亲。',
    '寡宿': '女命忌，主孤寡、婚姻不顺。',
    '劫煞': '主是非、破财、突发灾祸，宜防之。',
    '亡神': '主心机、城府、失脱、官司纠纷。',
    '魁罡': '主性格刚烈，果断，有领导力，但不喜受制于人。',
    '禄神': '代表福气、财富、安稳，是日主的根基。',
    '羊刃': '刚强险恶之神，主性急刚暴，是极强的帮身力量，利武职。'
};

const getShenshaDesc = (shensha) => {
    return SHENSHA_DESC[shensha] || '传统经典神煞，具体吉凶需结合全局五行生克综合判断。';
};

const SHI_SHEN = {
    "甲": { "甲": "比", "乙": "劫", "丙": "食", "丁": "伤", "戊": "才", "己": "财", "庚": "杀", "辛": "官", "壬": "枭", "癸": "印" },
    "乙": { "甲": "劫", "乙": "比", "丙": "伤", "丁": "食", "戊": "财", "己": "才", "庚": "官", "辛": "杀", "壬": "印", "癸": "枭" },
    "丙": { "甲": "枭", "乙": "印", "丙": "比", "丁": "劫", "戊": "食", "己": "伤", "庚": "才", "辛": "财", "壬": "杀", "癸": "官" },
    "丁": { "甲": "印", "乙": "枭", "丙": "劫", "丁": "比", "戊": "伤", "己": "食", "庚": "财", "辛": "才", "壬": "官", "癸": "杀" },
    "戊": { "甲": "杀", "乙": "官", "丙": "枭", "丁": "印", "戊": "比", "己": "劫", "庚": "食", "辛": "伤", "壬": "才", "癸": "财" },
    "己": { "甲": "官", "乙": "杀", "丙": "印", "丁": "枭", "戊": "劫", "己": "比", "庚": "伤", "辛": "食", "壬": "财", "癸": "才" },
    "庚": { "甲": "才", "乙": "财", "丙": "杀", "丁": "官", "戊": "枭", "己": "印", "庚": "比", "辛": "劫", "壬": "食", "癸": "伤" },
    "辛": { "甲": "财", "乙": "才", "丙": "官", "丁": "杀", "戊": "印", "己": "枭", "庚": "劫", "辛": "比", "壬": "伤", "癸": "食" },
    "壬": { "甲": "食", "乙": "伤", "丙": "才", "丁": "财", "戊": "杀", "己": "官", "庚": "枭", "辛": "印", "壬": "比", "癸": "劫" },
    "癸": { "甲": "伤", "乙": "食", "丙": "财", "丁": "才", "戊": "官", "己": "杀", "庚": "印", "辛": "枭", "壬": "劫", "癸": "比" }
};

const getShiShen = (dayGan, targetGan) => {
    if(!dayGan || !targetGan || !SHI_SHEN[dayGan]) return "";
    return SHI_SHEN[dayGan][targetGan] || "";
}

const getShenColor = (shen) => {
    if (['杀', '枭', '伤', '劫'].includes(shen)) return 'shen-red'; 
    if (['官', '印', '食', '财', '才', '比'].includes(shen)) return 'shen-green'; 
    return 'shen-gray';
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

.glass-card { background: rgba(14,14,24,0.72); border: 1px solid rgba(232,204,128,0.12); border-radius: 16px; padding: 18px 14px; margin-bottom: 16px; backdrop-filter: blur(20px) saturate(1.2); box-shadow: 0 4px 32px rgba(0,0,0,0.35); animation: riseIn 0.5s ease both; }
@keyframes riseIn { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }

.profile-card { padding: 16px; }
.profile-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.section-kicker { color: rgba(232,204,128,0.72); font-size: 10px; letter-spacing: 2px; margin-bottom: 4px; }
.section-title { color: var(--text-primary); font-size: 14px; font-weight: 600; }
.default-chip { color: #101018; background: linear-gradient(135deg, var(--gold-light), var(--gold)); border-radius: 999px; padding: 4px 9px; font-size: 11px; font-weight: 700; }

.profile-selector { display: flex; gap: 8px; margin-bottom: 10px; }
.profile-select { flex: 1; min-width: 0; background: rgba(0,0,0,0.34); border: 1px solid rgba(232,204,128,0.32); color: #F4EBDD; padding: 11px 12px; border-radius: 10px; outline: none; font-size: 13px; }
.icon-btn { width: 42px; height: 42px; border-radius: 10px; border: 1px solid rgba(232,204,128,0.32); background: rgba(212,175,55,0.1); color: var(--gold-light); font-size: 22px; line-height: 1; cursor: pointer; }
.guest-limit-note { color: var(--text-muted); font-size: 11px; line-height: 1.6; margin-bottom: 12px; padding: 9px 11px; border-radius: 10px; border: 1px solid rgba(232,204,128,0.12); background: rgba(212,175,55,0.05); }
.profile-actions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.mini-action { min-height: 34px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.035); color: #D8D2BF; font-size: 12px; cursor: pointer; }
.mini-action:disabled { cursor: default; color: var(--gold-light); border-color: rgba(232,204,128,0.25); background: rgba(232,204,128,0.08); }
.mini-action.danger { color: #FF8F88; }
.btn-ghost { min-height: 36px; background: rgba(212,175,55,0.12); color: var(--gold-light); border: 1px solid rgba(232,204,128,0.35); padding: 0 14px; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all .2s; white-space: nowrap; }
.btn-ghost:hover { background: var(--gold); color: #000; }
.btn-danger { background: rgba(255,94,87,0.1); color: #FF5E57; border: 1px solid rgba(255,94,87,0.3); border-radius: 8px; padding: 0 10px; cursor: pointer; }
.btn-primary { background: linear-gradient(135deg, var(--gold-light), var(--gold)); color: #08080E; border: none; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-weight: 700; font-family: var(--font-body); box-shadow: 0 2px 10px rgba(212,175,55,0.26); transition: transform 0.2s; white-space: nowrap; }
.btn-primary:active { transform: scale(0.95); }
.btn-primary:disabled { opacity: .7; cursor: wait; }

.profile-form { background: rgba(255,255,255,0.025); padding: 14px; border-radius: 12px; border: 1px dashed rgba(232,204,128,0.16); margin-top: 10px; }
.rename-form { margin-bottom: 2px; }
.form-row { display: flex; gap: 12px; margin-bottom: 12px; }
.form-row input, .form-row select { flex: 1; padding: 10px; border-radius: 8px; background: rgba(0,0,0,0.4); border: 1px solid var(--glass-border); color: white; outline: none; font-family: var(--font-body); }
.form-actions { display:flex; justify-content:flex-end; gap:8px; }

.picker-overlay { padding: 14px; align-items: flex-end; }
.profile-picker-modal {
    width: min(100%, 620px);
    max-height: min(92vh, 760px);
    overflow: auto;
    border-radius: 24px;
    border: 1px solid rgba(232,204,128,0.16);
    background:
        radial-gradient(circle at top left, rgba(232,204,128,0.06), transparent 28%),
        linear-gradient(180deg, rgba(18,18,30,0.98), rgba(10,10,18,0.98));
    box-shadow: 0 24px 72px rgba(0,0,0,0.45);
    padding: 18px;
    color: var(--text-primary);
}
.picker-topbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.picker-topcopy { min-width: 0; }
.picker-heading { color: #F4EBDD; font-size: 16px; font-weight: 700; }
.picker-mode-tabs {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
    padding: 4px;
    border-radius: 999px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(232,204,128,0.16);
}
.picker-mode-tab {
    min-height: 40px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: #AFA79A;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
}
.picker-mode-tab.active {
    background: linear-gradient(135deg, rgba(232,204,128,0.94), rgba(212,175,55,0.94));
    color: #111114;
    box-shadow: 0 6px 18px rgba(212,175,55,0.18);
}
.picker-close.dark {
    flex-shrink: 0;
    background: rgba(255,255,255,0.04);
    color: #B8AF9B;
    border-color: rgba(232,204,128,0.16);
}
.picker-form-row {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 10px;
    margin-bottom: 14px;
}
.picker-form-row input,
.picker-form-row select {
    width: 100%;
    min-height: 44px;
    border-radius: 14px;
    border: 1px solid rgba(232,204,128,0.12);
    background: rgba(255,255,255,0.05);
    color: #F4EBDD;
    padding: 0 14px;
    font-size: 14px;
    outline: none;
}
.picker-panel {
    border-top: 1px solid rgba(232,204,128,0.1);
    padding-top: 14px;
}
.picker-column { display: flex; flex-direction: column; gap: 8px; }
.picker-column-label {
    text-align: left;
    color: #E5D5AF;
    font-size: 14px;
    font-weight: 700;
}
.picker-preview-card {
    border-radius: 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(232,204,128,0.1);
    padding: 12px 14px;
    color: #D8D2BF;
    line-height: 1.7;
    font-size: 13px;
}
.picker-preview-card.muted { color: #8D9098; }
.date-input-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 14px;
}
.date-input-card {
    border-radius: 18px;
    border: 1px solid rgba(232,204,128,0.14);
    background:
        linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02)),
        rgba(0,0,0,0.16);
    padding: 14px;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
}
.date-input-label {
    display: block;
    margin-bottom: 10px;
    color: #F4EBDD;
    font-size: 15px;
    font-weight: 700;
}
.date-input-card input {
    width: 100%;
    min-height: 54px;
    border-radius: 16px;
    border: 1px solid rgba(232,204,128,0.18);
    background: rgba(6,6,14,0.72);
    color: #F7F0E2;
    padding: 0 16px;
    font-size: 21px;
    letter-spacing: 0.14em;
    outline: none;
    box-shadow: inset 0 0 18px rgba(0,0,0,0.24);
}
.date-input-card input::placeholder {
    color: rgba(212,204,190,0.34);
    letter-spacing: normal;
    font-size: 15px;
}
.date-input-card input:focus {
    border-color: rgba(232,204,128,0.38);
    box-shadow: 0 0 0 1px rgba(232,204,128,0.16), inset 0 0 18px rgba(0,0,0,0.24);
}
.date-input-hint {
    margin-top: 10px;
    color: #9E988B;
    font-size: 12px;
    line-height: 1.6;
}
.date-segment-row {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
}
.date-segment {
    min-width: 0;
    border-radius: 16px;
    border: 1px solid rgba(232,204,128,0.1);
    background: rgba(255,255,255,0.03);
    padding: 12px 6px;
    text-align: center;
}
.date-segment span {
    display: block;
    margin-bottom: 6px;
    color: #928A7C;
    font-size: 11px;
    letter-spacing: 1px;
}
.date-segment strong {
    display: block;
    color: #F4EBDD;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.06em;
}
.pillar-slot-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 14px;
}
.pillar-slot {
    min-height: 104px;
    border: 1px solid rgba(232,204,128,0.14);
    border-radius: 24px;
    background:
        linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01)),
        rgba(7,7,16,0.72);
    color: #D8D2BF;
    padding: 12px 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
}
.pillar-slot.derived {
    background: rgba(255,255,255,0.018);
}
.pillar-slot.active {
    border-color: rgba(232,204,128,0.46);
    background:
        linear-gradient(180deg, rgba(232,204,128,0.12), rgba(232,204,128,0.04)),
        rgba(18,12,6,0.64);
    box-shadow: inset 0 0 18px rgba(212,175,55,0.08);
}
.slot-label {
    font-size: 14px;
    color: #AFA79A;
    font-weight: 700;
}
.slot-value {
    font-size: 26px;
    color: #F4EBDD;
    font-family: var(--font-serif);
    font-weight: 600;
}
.pillar-choice-panel {
    border-radius: 24px;
    border: 1px solid rgba(232,204,128,0.12);
    background:
        radial-gradient(circle at top right, rgba(232,204,128,0.05), transparent 28%),
        rgba(5,5,14,0.68);
    padding: 14px;
    margin-bottom: 14px;
}
.pillar-choice-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
}
.pillar-orb-current {
    color: var(--gold-light);
    font-size: 20px;
    font-family: var(--font-serif);
    letter-spacing: 2px;
}
.pillar-rule-tip {
    margin-bottom: 12px;
    color: #AFA79A;
    font-size: 12px;
    line-height: 1.6;
}
.orb-title {
    color: #BBAF94;
    font-size: 12px;
    letter-spacing: 1px;
    margin-bottom: 10px;
}
.choice-chip-grid {
    display: grid;
    gap: 12px;
}
.choice-chip-grid-gz { grid-template-columns: repeat(5, 1fr); }
.choice-chip-grid-zhi { grid-template-columns: repeat(6, 1fr); }
.choice-chip {
    min-height: 58px;
    border-radius: 18px;
    border: 1px solid rgba(232,204,128,0.14);
    background:
        linear-gradient(180deg, rgba(255,255,255,0.028), rgba(255,255,255,0.012)),
        rgba(10,10,20,0.78);
    font-size: 24px;
    font-weight: 700;
    font-family: var(--font-serif);
    cursor: pointer;
}
.choice-chip.active {
    border-color: rgba(232,204,128,0.46);
    background: rgba(212,175,55,0.12);
    box-shadow: inset 0 0 16px rgba(212,175,55,0.08);
}
.choice-chip.disabled {
    opacity: .36;
}
.picker-save-btn {
    width: 100%;
    min-height: 64px;
    margin-top: 18px;
    border: none;
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(232,204,128,0.95), rgba(212,175,55,0.95));
    color: #111114;
    font-size: 18px;
    font-weight: 800;
    cursor: pointer;
}

.bazi-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; border-bottom: 1px solid rgba(232,204,128,0.12); padding-bottom: 14px; margin-bottom: 14px; }
.name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.bazi-name { font-family: var(--font-serif); font-size: 20px; color: var(--gold-light); letter-spacing: 2px; font-weight: bold; }
.bazi-meta { font-size: 11px; color: var(--text-muted); line-height: 1.6; margin-top: 2px; }

.badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-family: var(--font-body); letter-spacing: 1px; font-weight: 500; }
.badge-gold { background: rgba(212,175,55,0.15); color: var(--gold-light); border: 1px solid rgba(212,175,55,0.3); }
.badge-blue { background: rgba(78, 205, 196, 0.15); color: #4ECDC4; border: 1px solid rgba(78, 205, 196, 0.3); }
.badge-action { cursor: pointer; transition: transform .2s ease, box-shadow .2s ease, background .2s ease; }
.badge-action:hover, .badge-action:focus-visible { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(78,205,196,0.12); outline: none; }
.pattern-tag { font-size: 10px; color: #E8CC80; background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.2); padding: 2px 6px; border-radius: 4px; display: inline-block; margin-right: 4px; margin-top: 4px; }

.analysis-status { position: relative; display: flex; align-items: center; gap: 12px; overflow: hidden; margin: -2px 0 14px; padding: 12px; border: 1px solid rgba(232,204,128,0.16); border-radius: 12px; background: rgba(232,204,128,0.055); }
.analysis-status.done { border-color: rgba(129,199,132,0.22); background: rgba(129,199,132,0.07); }
.loader-orbit { position: relative; width: 30px; height: 30px; flex: 0 0 30px; border: 1px solid rgba(232,204,128,0.25); border-radius: 50%; animation: spin 1.6s linear infinite; }
.loader-orbit span { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: var(--gold-light); box-shadow: 0 0 10px rgba(232,204,128,.65); }
.loader-orbit span:nth-child(1) { top: -3px; left: 12px; }
.loader-orbit span:nth-child(2) { right: 0; bottom: 4px; opacity: .7; }
.loader-orbit span:nth-child(3) { left: 1px; bottom: 5px; opacity: .45; }
.analysis-copy { min-width: 0; flex: 1; }
.analysis-title { color: #F5E9CE; font-size: 13px; font-weight: 700; margin-bottom: 3px; }
.analysis-subtitle { color: var(--text-muted); font-size: 11px; }
.analysis-progress { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: rgba(255,255,255,0.06); }
.analysis-progress i { display: block; height: 100%; background: linear-gradient(90deg, var(--gold), var(--teal)); transition: width .55s ease; }
@keyframes spin { to { transform: rotate(360deg); } }

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
.timeline-title { font-size: 14px; color: var(--gold); margin-bottom: 12px; font-family: var(--font-serif); text-align: center; font-weight: 500; }

.linkage-row { display: flex; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; background: rgba(0,0,0,0.25); overflow: hidden; }
.row-label { width: 36px; display: flex; align-items: center; justify-content: center; background: rgba(212,175,55,0.06); color: var(--gold-light); font-size: 12px; text-align: center; font-weight: 500; border-right: 1px solid rgba(255,255,255,0.05); flex-shrink: 0; line-height: 1.3; }
.row-content { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; padding: 6px; flex: 1; }
.row-content::-webkit-scrollbar { display: none; }

.link-item { display: flex; flex-direction: column; align-items: center; min-width: 52px; padding: 8px 4px; border-radius: 6px; cursor: pointer; transition: all 0.2s; flex-shrink: 0; border: 1px solid transparent; }
.link-item.active { background: rgba(255,255,255,0.05); border-color: rgba(212,175,55,0.4); box-shadow: inset 0 0 15px rgba(212,175,55,0.08); }

.item-header { font-size: 10px; color: #aaa; margin-bottom: 6px; text-align: center; line-height: 1.4; }
.item-body { display: flex; flex-direction: column; gap: 2px; align-items: center; }
.xiaoyun-body { font-size: 14px; color: #777; margin-top: 8px; }

.char-wrap { position: relative; display: flex; align-items: center; justify-content: center; width: 100%; height: 20px;}
.char-gan, .char-zhi { font-size: 16px; font-family: 'Noto Serif SC', serif; font-weight: 600; line-height: 1;}

.shi-shen { position: absolute; right: -16px; top: 0px; font-size: 9px; padding: 1px 3px; border-radius: 3px; font-weight: 500; }
.shen-red { color: #FF5E57; background: rgba(255,94,87,0.15); }
.shen-green { color: #81C784; background: rgba(129,199,132,0.15); }
.shen-gold { color: #E8CC80; background: rgba(232,204,128,0.15); }

/* 神煞与弹窗 */
.clickable-shensha { display: inline-block; cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: background 0.2s; margin: 1px 0; }
.clickable-shensha:hover { background: rgba(212,175,55,0.2); color: var(--gold-light); }
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.shensha-modal { background: var(--bg-card); border: 1px solid var(--gold); border-radius: 12px; padding: 20px; width: 80%; max-width: 320px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); animation: riseIn 0.3s ease; }
.shensha-modal h4 { color: var(--gold-light); font-size: 16px; margin-bottom: 10px; font-family: var(--font-serif); border-bottom: 1px dashed rgba(212,175,55,0.3); padding-bottom: 8px;}
.shensha-modal p { font-size: 13px; color: #D0D0D8; line-height: 1.6; }

/* 关系可视化面板已经移除旧版CSS */

.ai-section { margin-top: 16px; animation: riseIn 0.5s ease both; }
.insight-summary { margin-bottom: 16px; }
.ai-header-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.ai-header-title { font-family: var(--font-serif); color: var(--gold); font-size: 15px; display: flex; align-items: center; gap: 6px; }
.ai-section > .ai-header-title { margin-bottom: 12px; }
.ai-header-title::before { content: '✧'; font-size: 12px; }
.info-button, .close-button { display: inline-flex; align-items: center; justify-content: center; border: 1px solid rgba(232,204,128,0.28); background: rgba(232,204,128,0.08); color: var(--gold-light); cursor: pointer; }
.info-button { width: 26px; height: 26px; border-radius: 50%; font-family: Georgia, serif; font-style: italic; font-weight: 700; }
.close-button { width: 32px; height: 32px; border-radius: 8px; font-size: 22px; line-height: 1; }

.xiji-box { display: flex; gap: 8px; margin-bottom: 14px; }
.xiji-item { flex: 1; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 10px; padding: 10px; text-align: center; }
.xiji-label { font-size: 10px; color: var(--text-muted); margin-bottom: 4px; }
.xiji-val { font-weight: 500; font-size: 13px; }
.xiji-val.favorable { color: #81C784; }
.xiji-val.unfavorable { color: #E57373; }

.insight-card { background: linear-gradient(180deg, rgba(232,204,128,0.06) 0%, rgba(255,255,255,0.015) 100%); border: 1px solid rgba(232,204,128,0.12); border-radius: 12px; padding: 14px; margin-bottom: 12px; }
.insight-card h4 { color: var(--gold-light); font-size: 12px; margin-bottom: 8px; font-family: var(--font-body); border-bottom: 1px dashed rgba(212,175,55,0.2); padding-bottom: 6px; }
.insight-card p { line-height: 1.65; font-size: 13px; color: #D8D2BF; }
.tag-row { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.verdict-line { margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(232,204,128,0.14); }
.verdict-line span { display: block; color: rgba(232,204,128,0.72); font-size: 11px; margin-bottom: 6px; }
.verdict-line p { color: #F3EBDD; font-size: 14px; font-weight: 600; margin: 0; }
.card-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.overload-tag { color: #FF8F88; font-size: 12px; animation: pulse 1.5s infinite; }

.legacy-summary { background: rgba(212,175,55,0.05); border: 1px solid var(--gold-border); border-radius: 12px; padding: 14px; font-size: 12px; color: #D0D0D8; line-height: 1.8; white-space: pre-wrap; margin-top: 16px; }

.classic-verdict-section {
    border: 1px solid rgba(212,175,55,0.24);
    border-radius: 12px;
    padding: 14px;
    background:
        linear-gradient(180deg, rgba(232,204,128,0.08), rgba(0,0,0,0.08)),
        rgba(255,255,255,0.02);
}
.classic-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding-bottom: 10px;
    margin-bottom: 12px;
    border-bottom: 1px dashed rgba(212,175,55,0.24);
}
.classic-main-title {
    margin-bottom: 6px;
}
.classic-subtitle {
    color: var(--gold-light);
    font-size: 13px;
    font-family: 'Noto Serif SC', var(--font-serif);
    font-weight: 400;
    letter-spacing: 1px;
    opacity: .86;
}
.classic-key {
    flex-shrink: 0;
    color: #0B0B12;
    background: linear-gradient(135deg, var(--gold-light), var(--gold));
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 12px;
    font-weight: 600;
}
.classic-body {
    display: flex;
    flex-direction: column;
    gap: 9px;
}
.classic-body p {
    margin: 0;
    color: #D8D2BF;
    font-size: 13px;
    line-height: 1.75;
    font-family: var(--font-body);
}
.classic-body p.note {
    color: var(--text-muted);
    font-size: 12px;
    font-family: var(--font-body);
    padding-left: 10px;
    border-left: 2px solid rgba(212,175,55,0.2);
}

/* 命局天机 UI */
.tag-gold {
    background: rgba(212, 175, 55, 0.15);
    color: #d4af37;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    border: 1px solid rgba(212, 175, 55, 0.3);
}
.tag-action {
    cursor: pointer;
    transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
}
.tag-action:hover, .tag-action:focus-visible {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(212,175,55,0.12);
    outline: none;
}

.wuxing-bar-container {
    display: flex;
    height: 28px;
    border-radius: 6px;
    overflow: hidden;
    background: #2a2a2a;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
}
.wuxing-bar-segment {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: width 0.5s ease;
}
.wuxing-bar-label {
    font-size: 10px;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
    white-space: nowrap;
    overflow: hidden;
}

.bg-gold { background: linear-gradient(135deg, #FFDF73, #D4AF37); }
.bg-wood { background: linear-gradient(135deg, #81C784, #388E3C); }
.bg-water { background: linear-gradient(135deg, #4FC3F7, #0288D1); }
.bg-fire { background: linear-gradient(135deg, #E57373, #D32F2F); }
.bg-earth { background: linear-gradient(135deg, #DCE775, #AFB42B); }

.scoring-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.scoring-item {
    background: rgba(0,0,0,0.2);
    border-radius: 8px;
    padding: 12px;
    border-left: 3px solid transparent;
}
.scoring-item.fav-item { border-left-color: #81C784; }
.scoring-item.unfav-item { border-left-color: #E57373; }

.scoring-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
}
.shen-badge {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
}
.shen-badge.favorable { background: rgba(129,199,132,0.1); color: #81C784; }
.shen-badge.unfavorable { background: rgba(229,115,115,0.1); color: #E57373; }
.total-score { font-size: 14px; font-weight: bold; color: #fff; }

.scoring-bars {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 16px;
}
.s-bar-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #aaa;
}
.s-val.positive { color: #81C784; }
.s-val.negative { color: #E57373; }
.s-val.neutral { color: #888; }

.detail-drawer {
    width: min(92vw, 460px);
    max-height: 78vh;
    overflow-y: auto;
    background: rgba(13,13,22,0.96);
    border: 1px solid rgba(232,204,128,0.24);
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 18px 60px rgba(0,0,0,0.58);
    animation: riseIn 0.25s ease;
}
.strength-drawer {
    width: min(92vw, 520px);
}
.drawer-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 12px;
    margin-bottom: 12px;
    border-bottom: 1px dashed rgba(232,204,128,0.18);
}
.drawer-head h4 {
    color: var(--gold-light);
    font-size: 17px;
    font-family: var(--font-serif);
    font-weight: 500;
}
.strength-summary-card {
    margin-bottom: 14px;
    padding: 14px;
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(232,204,128,0.08), rgba(255,255,255,0.02));
    border: 1px solid rgba(232,204,128,0.14);
}
.strength-summary-top {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 10px;
}
.strength-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 30px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(78,205,196,0.12);
    border: 1px solid rgba(78,205,196,0.28);
    color: #7FE2DB;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: .08em;
}
.strength-summary-text {
    color: #F4EBDD;
    font-size: 14px;
    font-weight: 600;
}
.strength-summary-basis {
    color: #BFB8AA;
    font-size: 12px;
    line-height: 1.7;
}
.strength-section-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.strength-section-card {
    padding: 13px 14px;
    border-radius: 12px;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(232,204,128,0.1);
}
.strength-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
}
.strength-section-head h5 {
    color: var(--gold-light);
    font-size: 13px;
    font-weight: 700;
}
.strength-score-chip {
    flex-shrink: 0;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(232,204,128,0.08);
    border: 1px solid rgba(232,204,128,0.16);
    color: #EBD08E;
    font-size: 11px;
    font-weight: 600;
}
.strength-section-card p {
    color: #D8D2BF;
    font-size: 13px;
    line-height: 1.7;
}

@media (max-width: 420px) {
    .profile-actions { grid-template-columns: 1fr 1fr; }
    .mini-action.danger { grid-column: span 2; }
    .form-row { flex-direction: column; gap: 10px; }
    .bazi-header { flex-direction: column; }
    .btn-primary { width: 100%; }
    .scoring-bars { grid-template-columns: 1fr; }
    .picker-topbar { gap: 8px; }
    .picker-form-row { grid-template-columns: 1fr 1fr; }
    .picker-save-btn { min-height: 56px; }
    .picker-topbar { flex-direction: column; align-items: stretch; }
    .date-segment-row { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
    .date-input-card input { min-height: 50px; font-size: 18px; padding: 0 14px; }
    .date-segment { padding: 10px 4px; border-radius: 14px; }
    .date-segment strong { font-size: 14px; }
    .pillar-slot-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
    .pillar-slot { min-height: 88px; border-radius: 18px; padding: 10px 4px; }
    .slot-label { font-size: 12px; }
    .slot-value { font-size: 20px; }
    .choice-chip-grid-gz { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
    .choice-chip-grid-zhi { grid-template-columns: repeat(4, 1fr); }
    .choice-chip { min-height: 52px; border-radius: 16px; font-size: 21px; }
    .pillar-choice-panel { padding: 12px; border-radius: 20px; }
    .pillar-choice-head { align-items: flex-start; }
    .pillar-orb-current { font-size: 18px; }
}

@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
}
</style>
