<template>
  <div class="home-view">
    <header id="siteHeader" :class="{ 'result-header': viewState === 'result' }">
      <button class="hamburger" :class="{ open: globalState.isDrawerOpen }" @click="toggleDrawer" aria-label="历史记录">
        <span></span><span></span><span></span>
      </button>
      <div v-if="viewState !== 'result'" class="site-logo" @click="resetToInput" style="cursor: pointer;" title="返回首页">奇门道</div>
      <div v-if="viewState !== 'result'" class="header-actions">
        <OpenSourceLinks />
        <AccountMenu />
      </div>
    </header>

    <!-- 历史记录抽屉 - Teleport 到 App.vue 的 #drawer-host 中 -->
    <Teleport to="#drawer-host">
      <div id="historyDrawer" :class="{ open: globalState.isDrawerOpen }">
        <div class="drawer-head">
          <div class="drawer-topbar">
            <div class="drawer-brand">奇门道</div>
            <button class="drawer-close" type="button" @click="globalState.isDrawerOpen = false" aria-label="关闭历史记录">×</button>
          </div>
          <button class="drawer-new-session" type="button" @click="startNewSession">
            <span>再起一局</span>
            <span aria-hidden="true">↗</span>
          </button>
          <div class="drawer-title-txt">推演回溯</div>
        </div>
        <div class="drawer-filter">
          <div class="filter-select-wrap">
            <select id="historyCategorySelect" v-model="activeCategory" class="filter-select" aria-label="分类查阅">
              <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                {{ cat.label }}
              </option>
            </select>
            <span class="filter-select-arrow" aria-hidden="true">⌄</span>
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
                <span>{{ item.catLabel }}</span><span v-if="!isBaziRecord(item)">·</span>
                <span v-if="!isBaziRecord(item)">{{ item.score }}分</span>
              </div>
            </div>
            <span v-if="!isBaziRecord(item)" class="d-hist-badge" :class="'verdict-' + getVerdictInfo(item.score).cls">{{ getVerdictInfo(item.score).label }}</span>
          </div>
        </div>
      </div>
    </Teleport>

    <div class="page-wrap" :class="{ 'result-page-wrap': viewState === 'result' }">
      <div class="container" :class="{ 'public-landing-container': !canUseApp && viewState === 'input' }">
        <section v-if="!canUseApp && viewState === 'input'" class="seo-landing" aria-labelledby="seoLandingTitle">
          <h1 id="seoLandingTitle">奇门遁甲在线排盘与 AI 解盘</h1>
          <p class="seo-lead">
            奇门道提供奇门遁甲在线排盘、八字四柱排盘和今日运势分析。输入时间、地点和所问之事，即可生成局盘、宫位、干支、评分与行动建议。
          </p>
          <div class="seo-proof">规则引擎先排盘，AI 负责解释。</div>
          <div class="seo-entry-grid" aria-label="核心功能入口">
            <div class="seo-entry">
              <span>奇门问事</span>
              <small>按当下时辰起局，分析感情、事业、财运与选择。</small>
            </div>
            <div class="seo-entry">
              <span>八字排盘</span>
              <small>四柱十神、喜用神、格局、大运流年一键生成。</small>
            </div>
            <div class="seo-entry">
              <span>今日运势</span>
              <small>每日、每周、月度节奏和可执行建议。</small>
            </div>
          </div>
        </section>

        <div v-if="!canUseApp" class="auth-landing-wrap mobile-auth-first">
          <template v-if="authView === 'landing'">
            <div class="auth-hero">
              <div class="hero-scatter" aria-hidden="true">
                <span class="hs e2">☷</span>
                <span class="hs e3">✦</span>
                <span class="hs e4">☲</span>
                <span class="hs e5">☵</span>
              </div>
              <div class="auth-taiji-wrap" aria-hidden="true">
                <svg class="auth-taiji-svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="60" cy="60" r="55" fill="none" stroke="rgba(181,141,59,0.15)" stroke-width="1"/>
                  <circle cx="60" cy="60" r="37" fill="none" stroke="rgba(181,141,59,0.14)" stroke-width="1" stroke-dasharray="5 5" stroke-linecap="round"/>
                  <circle cx="60" cy="60" r="24" fill="rgba(181,141,59,0.055)" stroke="rgba(181,141,59,0.16)" stroke-width="1"/>
                  <path d="M60,36 A12,12 0 0,1 60,60 A12,12 0 0,0 60,84 A24,24 0 0,1 60,36" fill="rgba(181,141,59,0.18)"/>
                  <path d="M60,36 Q73,48 60,60 Q47,72 60,84" fill="none" stroke="rgba(181,141,59,0.2)" stroke-width="1"/>
                  <circle cx="60" cy="48" r="3" fill="rgba(181,141,59,0.42)"/>
                  <circle cx="60" cy="72" r="3" fill="rgba(247,244,238,0.84)"/>
                  <circle cx="60" cy="60" r="4" fill="rgba(181,141,59,0.24)"/>
                </svg>
              </div>
              <div class="hero-brand">
                <div class="hero-label">QIMEN DAO</div>
                <h1 class="hero-name">奇门道</h1>
                <p class="hero-sub">洞察天机，<em>决胜千里</em></p>
              </div>
            </div>
            <div class="auth-btns">
              <button class="abtn abtn--solid" type="button" @click="authView = 'login'">登录</button>
              <button class="abtn abtn--border" type="button" :disabled="googleAuthLoading || authLoading" @click="handleGoogleAuth">
                <span class="google-mark" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.37c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.37 12 5.37z"/>
                  </svg>
                </span>
                {{ googleAuthLoading ? '正在跳转...' : 'Google 登录' }}
              </button>
              <div class="abtn-divider"><span>——或者——</span></div>
              <button class="abtn abtn--ghost" type="button" @click="handleGuestEntry">访客登录</button>
              <button class="abtn-text" type="button" @click="authView = 'register'">注册</button>
              <p class="auth-legal">
                继续即表示同意
                <router-link to="/terms">《用户协议》</router-link>与
                <router-link to="/privacy">《隐私政策》</router-link>
              </p>
            </div>
          </template>

          <template v-else-if="authView === 'login'">
            <div class="auth-form-pg">
              <button class="auth-back" type="button" @click="authView = 'landing'">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                返回
              </button>
              <h2 class="afm-title">登录</h2>
              <div class="afm-fields">
                <label class="afm-field">
                  <span>邮箱</span>
                  <input type="email" v-model="authForm.email" placeholder="name@example.com" autocomplete="email"/>
                </label>
                <label class="afm-field">
                  <span>密码</span>
                  <input type="password" v-model="authForm.password" placeholder="至少 6 位" autocomplete="current-password"/>
                </label>
              </div>
              <button class="abtn abtn--solid" type="button" :disabled="authLoading" @click="handleAuth">
                {{ authLoading ? '验证中...' : '登录' }}
              </button>
              <div class="afm-sub">
                <button class="forgot-password-link" type="button" :disabled="resetEmailLoading" @click="handleResetPasswordEmail">
                  {{ resetEmailLoading ? '正在发送...' : '忘记密码' }}
                </button>
              </div>
              <div v-if="resetEmailNotice" class="auth-notice">{{ resetEmailNotice }}</div>
            </div>
          </template>

          <template v-else-if="authView === 'register'">
            <div class="auth-form-pg">
              <button class="auth-back" type="button" @click="authView = 'landing'">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                返回
              </button>
              <h2 class="afm-title">注册</h2>
              <div class="afm-fields">
                <label class="afm-field">
                  <span>邮箱</span>
                  <input type="email" v-model="authForm.email" placeholder="name@example.com" autocomplete="email"/>
                </label>
                <label class="afm-field">
                  <span>密码</span>
                  <input type="password" v-model="authForm.password" placeholder="至少 6 位" autocomplete="new-password"/>
                </label>
              </div>
              <button class="abtn abtn--solid" type="button" :disabled="authLoading" @click="handleAuth">
                {{ authLoading ? '注册中...' : '注册' }}
              </button>
              <p class="auth-legal">
                继续即表示同意
                <router-link to="/terms">《用户协议》</router-link>与
                <router-link to="/privacy">《隐私政策》</router-link>
              </p>
            </div>
          </template>
        </div>

        <div v-else class="app-section">
          <transition name="fade" mode="out-in">
            <div v-show="viewState === 'input'" class="input-wrapper">
              <div class="tagline">
                <div class="tagline-main">天时 · 地利 · 人和</div>
                <div class="tagline-sub">洞察天机，决胜千里</div>
              </div>

              <div class="glass-card qimen-profile-panel">
                <div v-if="showProfileSwitcher" class="profile-switcher" :class="{ open: isProfileMenuOpen }">
                  <button class="profile-switch-trigger" type="button" @click="toggleProfileMenu">
                    <span class="profile-switch-name">{{ activeProfileName }}</span>
                    <span class="profile-switch-symbol" aria-hidden="true">⇄</span>
                  </button>
                  <div v-if="isProfileMenuOpen" class="profile-flyout">
                    <button
                      v-for="profile in baziProfiles"
                      :key="profile.id"
                      class="profile-flyout-item"
                      :class="{ active: profile.id === selectedProfileId }"
                      type="button"
                      @click="selectProfile(profile.id)"
                    >
                      <span class="profile-item-main">{{ profile.name }}</span>
                      <span class="profile-item-date">{{ formatSolarDate(profile.birth_date) }}</span>
                      <span class="profile-item-meta">{{ profileMetaText(profile) }}</span>
                    </button>
                  </div>
                </div>
                <button v-else class="add-bazi-profile-btn" type="button" @click="goToBaziProfiles">
                  添加八字档案
                </button>
              </div>

              <div class="glass-card input-card">
                <div class="input-label">
                  <span>叩问天机</span>
                  <button class="route-info-trigger" type="button" @click.stop="showRouteInfoModal = true" aria-label="查看八字与奇门分流说明">i</button>
                </div>
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
              <!-- Bagua wheel with correct 先天八卦 trigrams -->
              <div class="bagua-ring-wrap">
                <svg class="bagua-svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="60" cy="60" r="56" stroke="rgba(212,175,55,0.06)" stroke-width="1" fill="none"/>
                  <g class="bagua-wheel">
                    <path d="M41,9 L79,9 L111,41 L111,79 L79,111 L41,111 L9,79 L9,41 Z" fill="rgba(212,175,55,0.02)" stroke="rgba(212,175,55,0.26)" stroke-width="0.8"/>
                    <g stroke="rgba(212,175,55,0.08)" stroke-width="0.5">
                      <line x1="60" y1="60" x2="60" y2="9"/><line x1="60" y1="60" x2="111" y2="60"/>
                      <line x1="60" y1="60" x2="60" y2="111"/><line x1="60" y1="60" x2="9" y2="60"/>
                      <line x1="60" y1="60" x2="95" y2="25"/><line x1="60" y1="60" x2="95" y2="95"/>
                      <line x1="60" y1="60" x2="25" y2="95"/><line x1="60" y1="60" x2="25" y2="25"/>
                    </g>
                    <g stroke="rgba(212,175,55,0.7)" stroke-width="1.5" stroke-linecap="round">
                      <!-- 乾☰ top (rot 0) all yang -->
                      <g transform="rotate(0,60,60)"><line x1="52" y1="10" x2="68" y2="10"/><line x1="52" y1="13.5" x2="68" y2="13.5"/><line x1="52" y1="17" x2="68" y2="17"/></g>
                      <!-- 兑☱ top-right (rot 45) 爻3 yin -->
                      <g transform="rotate(45,60,60)"><line x1="52" y1="10" x2="68" y2="10"/><line x1="52" y1="13.5" x2="68" y2="13.5"/><line x1="52" y1="17" x2="57.5" y2="17"/><line x1="62.5" y1="17" x2="68" y2="17"/></g>
                      <!-- 离☲ right (rot 90) 爻2 yin -->
                      <g transform="rotate(90,60,60)"><line x1="52" y1="10" x2="68" y2="10"/><line x1="52" y1="13.5" x2="57.5" y2="13.5"/><line x1="62.5" y1="13.5" x2="68" y2="13.5"/><line x1="52" y1="17" x2="68" y2="17"/></g>
                      <!-- 震☳ bottom-right (rot 135) 爻2+爻3 yin -->
                      <g transform="rotate(135,60,60)"><line x1="52" y1="10" x2="68" y2="10"/><line x1="52" y1="13.5" x2="57.5" y2="13.5"/><line x1="62.5" y1="13.5" x2="68" y2="13.5"/><line x1="52" y1="17" x2="57.5" y2="17"/><line x1="62.5" y1="17" x2="68" y2="17"/></g>
                      <!-- 坤☷ bottom (rot 180) all yin -->
                      <g transform="rotate(180,60,60)"><line x1="52" y1="10" x2="57.5" y2="10"/><line x1="62.5" y1="10" x2="68" y2="10"/><line x1="52" y1="13.5" x2="57.5" y2="13.5"/><line x1="62.5" y1="13.5" x2="68" y2="13.5"/><line x1="52" y1="17" x2="57.5" y2="17"/><line x1="62.5" y1="17" x2="68" y2="17"/></g>
                      <!-- 艮☶ bottom-left (rot 225) 爻1+爻2 yin -->
                      <g transform="rotate(225,60,60)"><line x1="52" y1="10" x2="68" y2="10"/><line x1="52" y1="13.5" x2="57.5" y2="13.5"/><line x1="62.5" y1="13.5" x2="68" y2="13.5"/><line x1="52" y1="17" x2="57.5" y2="17"/><line x1="62.5" y1="17" x2="68" y2="17"/></g>
                      <!-- 坎☵ left (rot 270) 爻1+爻3 yin -->
                      <g transform="rotate(270,60,60)"><line x1="52" y1="10" x2="57.5" y2="10"/><line x1="62.5" y1="10" x2="68" y2="10"/><line x1="52" y1="13.5" x2="68" y2="13.5"/><line x1="52" y1="17" x2="57.5" y2="17"/><line x1="62.5" y1="17" x2="68" y2="17"/></g>
                      <!-- 巽☴ top-left (rot 315) 爻1 yin -->
                      <g transform="rotate(315,60,60)"><line x1="52" y1="10" x2="57.5" y2="10"/><line x1="62.5" y1="10" x2="68" y2="10"/><line x1="52" y1="13.5" x2="68" y2="13.5"/><line x1="52" y1="17" x2="68" y2="17"/></g>
                    </g>
                  </g>
                  <g class="bagua-inner-g">
                    <circle cx="60" cy="60" r="36" stroke="rgba(212,175,55,0.22)" stroke-width="1" fill="none" stroke-dasharray="5 4.5" stroke-linecap="round"/>
                    <circle cx="60" cy="60" r="28" stroke="rgba(107,140,255,0.15)" stroke-width="0.8" fill="rgba(107,140,255,0.015)"/>
                  </g>
                  <!-- Taiji center (subtle) -->
                  <circle cx="60" cy="60" r="13" fill="rgba(5,5,10,0.7)" stroke="rgba(212,175,55,0.18)" stroke-width="0.7"/>
                  <path d="M60,47 A6.5,6.5 0 0,1 60,60 A6.5,6.5 0 0,0 60,73 A13,13 0 0,1 60,47" fill="rgba(212,175,55,0.16)"/>
                  <path d="M60,47 Q67,53 60,60 Q53,67 60,73" fill="none" stroke="rgba(212,175,55,0.2)" stroke-width="0.7"/>
                  <circle cx="60" cy="53" r="2" fill="rgba(212,175,55,0.45)"/>
                  <circle cx="60" cy="67" r="2" fill="rgba(5,5,10,0.8)"/>
                  <circle cx="60" cy="60" r="3" fill="rgba(212,175,55,0.35)"/>
                  <circle cx="60" cy="60" r="1.5" fill="rgba(212,175,55,0.8)"/>
                </svg>
              </div>

              <!-- Branch badge -->
              <div class="loader-branch-badge" :class="{ visible: sseActiveIndex >= 1 }">
                {{ sseBranch === 'bazi' ? '八字命理' : '奇门遁甲' }}
              </div>

              <!-- Vertical SSE timeline -->
              <div class="sse-timeline">
                <div class="sse-spine">
                  <div class="sse-spine-fill" :style="{ height: sseSpinePct + '%' }"></div>
                </div>
                <div
                  v-for="(step, i) in sseCurrentSteps"
                  :key="i"
                  class="sse-step"
                  :class="i < sseActiveIndex ? 'done' : i === sseActiveIndex ? 'active' : 'pending'"
                >
                  <div class="sse-dot"></div>
                  <div class="sse-step-name">{{ step.name }}</div>
                  <div class="sse-step-tag">{{ i < sseActiveIndex ? '✓ ' + step.tag : step.tag }}</div>
                  <div v-if="step.detail && i === sseActiveIndex" class="sse-step-detail">
                    {{ step.detail }}<span class="sse-typing-dots"></span>
                  </div>
                  <div v-if="sseChips[i] && i < sseActiveIndex" class="sse-chip">
                    <span class="sse-chip-main">{{ sseChips[i].main }}</span>
                    <span class="sse-chip-sep"></span>
                    <span class="sse-chip-sub">{{ sseChips[i].sub }}</span>
                  </div>
                </div>
              </div>

              <!-- Progress bar -->
              <div class="sse-progress-row">
                <div class="sse-progress-track">
                  <div class="sse-progress-fill" :style="{ width: ssePct + '%' }"></div>
                </div>
                <div class="sse-progress-pct">{{ ssePct }}%</div>
              </div>
            </div>
          </transition>

          <transition name="fade">
            <div v-show="viewState === 'result'" class="result-wrapper">
              <div v-html="resultHtml" class="html-container"></div>
              <Teleport v-if="showBaziBackingAnchor" to="#bazi-backing-anchor">
                <BaziBackingPanel
                  :profile="snapshotProfile"
                  :result-data="activeBaziResultData"
                  :analysis-mode="activeBaziResultData.meta?.analysis_mode"
                  :selected-year="baziCardSelectedYear"
                  :collapsible="true"
                  @update:selected-year="baziCardSelectedYear = $event"
                >
                  <template #identity>
                    <div v-if="snapshotProfile && snapshotProfile.name" class="backing-identity">
                      <div class="backing-section-title">原局命盘</div>
                      <div class="backing-name-row">
                        <span class="backing-name">{{ snapshotProfile.name }}</span>
                        <span v-if="snapshotProfile.strong_weak" class="backing-badge badge-blue">{{ snapshotProfile.strong_weak }}</span>
                        <span v-if="snapshotPatternName" class="backing-badge badge-gold">{{ snapshotPatternName }}</span>
                      </div>
                      <div v-if="snapshotLunarStr" class="backing-meta">农历：{{ snapshotLunarStr }}</div>
                    </div>
                  </template>
                </BaziBackingPanel>
              </Teleport>
              <div class="result-actions">
                <button class="reset-btn" @click="resetToInput">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7a5 5 0 1 0 1.4-3.5L2 2v3h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  再起一局
                </button>
                <button
                  class="result-save-img-btn"
                  :class="{ saving: isSavingImage }"
                  @click="saveAsImage"
                  :disabled="isSavingImage"
                  title="保存为图片分享"
                >
                  <svg v-if="!isSavingImage" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1v8M4 6l3 3 3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M1 10v1.5A1.5 1.5 0 0 0 2.5 13h9A1.5 1.5 0 0 0 13 11.5V10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                  </svg>
                  <svg v-else class="spin-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3" stroke-dasharray="10 8" stroke-linecap="round"/>
                  </svg>
                  {{ isSavingImage ? '生成中' : '保存' }}
                </button>
                <button
                  v-if="activeResultRecord?.canFeedback"
                  class="result-feedback-btn"
                  :class="{ done: activeResultRecord.hasFeedback }"
                  @click="openFeedbackDrawer(activeResultRecord)"
                >
                  {{ activeResultRecord.hasFeedback ? '已反馈' : '反馈' }}
                </button>
              </div>
            </div>
          </transition>
        </div>

        <section v-if="!canUseApp && viewState === 'input'" class="seo-faq-section" aria-label="常见问题">
          <div class="seo-faq-head">
            <h2>常见问题</h2>
            <p>把搜索用户最关心的问题放在工具入口之后，先体验，再解释边界。</p>
          </div>
          <div class="seo-faq-list">
            <details>
              <summary>奇门道可以做什么？</summary>
              <p>可以在线生成奇门遁甲局盘、AI 解盘、八字四柱排盘和每日运势分析。</p>
            </details>
            <details>
              <summary>AI 解盘和传统排盘有什么区别？</summary>
              <p>奇门道先用规则引擎计算时间、干支、宫位和评分，再由 AI 把盘面转成可读解释。</p>
            </details>
            <details>
              <summary>奇门问事需要出生时间吗？</summary>
              <p>奇门问事可以按当前时间起局；八字排盘和长期运势分析需要出生日期、时间和出生地。</p>
            </details>
          </div>
        </section>
      </div>
    </div>

    <div class="feedback-overlay" :class="{ show: isFeedbackDrawerOpen }" @click="closeFeedbackDrawer">
      <aside class="feedback-drawer" @click.stop>
        <div class="feedback-head">
          <div>
            <div class="feedback-kicker">应验反馈</div>
            <h3>这一次推演后来怎么样？</h3>
          </div>
          <button class="feedback-close" @click="closeFeedbackDrawer" aria-label="关闭反馈抽屉">&times;</button>
        </div>

        <div v-if="feedbackTargetRecord" class="feedback-summary">
          <div class="feedback-question">“{{ feedbackTargetRecord.question }}”</div>
          <div class="feedback-meta">
            <span>{{ feedbackTargetRecord.dateStr }}</span>
            <span>{{ feedbackTargetRecord.catLabel }}</span>
            <span>{{ feedbackTargetRecord.score }}分</span>
          </div>
          <p v-if="feedbackConclusion" class="feedback-conclusion">{{ feedbackConclusion }}</p>
        </div>

        <div class="feedback-form">
          <div class="feedback-field">
            <div class="feedback-label">应验程度</div>
            <div class="feedback-options">
              <button
                v-for="option in feedbackAccuracyOptions"
                :key="option.value"
                class="feedback-option"
                :class="{ active: feedbackForm.accuracy_status === option.value }"
                @click="feedbackForm.accuracy_status = option.value"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="feedback-field">
            <div class="feedback-label">结果方向</div>
            <div class="feedback-options">
              <button
                v-for="option in feedbackDirectionOptions"
                :key="option.value"
                class="feedback-option"
                :class="{ active: feedbackForm.actual_direction === option.value }"
                @click="feedbackForm.actual_direction = option.value"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="feedback-field">
            <div class="feedback-label">补充说明 <span>{{ feedbackForm.note.length }}/200</span></div>
            <textarea
              v-model="feedbackForm.note"
              class="feedback-note"
              maxlength="200"
              placeholder="例如：实际第二天下午收到回复，但结果没有继续推进。"
            ></textarea>
          </div>
        </div>

        <div class="feedback-actions">
          <button class="feedback-secondary" @click="closeFeedbackDrawer">取消</button>
          <button class="feedback-primary" :disabled="feedbackSaving" @click="submitQimenFeedback">
            {{ feedbackSaving ? '保存中...' : (feedbackTargetRecord?.hasFeedback ? '更新反馈' : '提交反馈') }}
          </button>
        </div>
      </aside>
    </div>

    <div class="route-info-overlay" :class="{ show: showRouteInfoModal }" @click="showRouteInfoModal = false">
      <div class="route-info-card" @click.stop>
        <div class="route-info-title">
          <span>系统如何自动判断</span>
          <button class="route-info-close" type="button" @click="showRouteInfoModal = false" aria-label="关闭分流说明">&times;</button>
        </div>
        <div class="route-info-grid">
          <div class="route-info-row">
            <div class="route-tool">八字</div>
            <div>
              <div class="route-focus">长期格局</div>
              <p>看命局、大运流年、行业适配、财官婚健的长期趋势。</p>
            </div>
          </div>
          <div class="route-info-row">
            <div class="route-tool">奇门</div>
            <div>
              <div class="route-focus">具体事件</div>
              <p>看成败、应期、方位、A/B 选择和短期行动策略。</p>
            </div>
          </div>
          <div class="route-info-row">
            <div class="route-tool">综合</div>
            <div>
              <div class="route-focus">宏观定调，微观决策</div>
              <p>先看八字底色，再用奇门判断眼前这件事怎么动。</p>
            </div>
          </div>
        </div>
        <div class="route-info-note">你只需自然提问；系统会先识别问题类型，自动选择八字、奇门或综合路径，并注入对应规则。</div>
      </div>
    </div>

    <!-- 长图预览弹窗 -->
    <div class="share-img-overlay" :class="{ show: shareImgUrl }" @click="closeShareModal">
      <div class="share-img-modal" @click.stop>
        <div class="share-img-header">
          <span class="share-img-kicker">SHARE IMAGE</span>
          <span class="share-img-title">长按图片保存</span>
          <button class="share-img-close" @click="closeShareModal" aria-label="关闭">×</button>
        </div>
        <div class="share-img-body">
          <img
            v-if="shareImgUrl"
            :src="shareImgUrl"
            class="share-img-preview"
            alt="奇门推演结果图"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createClient } from '@supabase/supabase-js'
import { Solar } from 'lunar-javascript'
import {
  enterGuestMode,
  globalState,
  leaveGuestMode,
  resolveSelectedBaziProfileId,
  setCurrentUser,
  setSelectedBaziProfileId
} from '../store.js'
import { getGuestState, recordGuestQuestion, trackGuestEvent } from '../guestMode.mjs'
import { warmFortuneCacheFromSupabase } from '../fortuneWarmup.mjs'
import AccountMenu from '../components/AccountMenu.vue'
import BaziBackingPanel from '../components/BaziBackingPanel.vue'
import OpenSourceLinks from '../components/OpenSourceLinks.vue'
import { buildGoogleOAuthSignInArgs } from '../auth/googleOAuth.mjs'
import { buildPasswordResetEmailArgs } from '../auth/passwordReset.mjs'
import { normalizeQimenCardData } from '../utils/qimenCardFallbacks.mjs'
import {
  QIMEN_ACCURACY_OPTIONS,
  QIMEN_DIRECTION_OPTIONS,
  buildDefaultFeedbackForm,
  mergeQimenFeedbackIntoRecords,
  normalizeQimenFeedbackForm
} from '../qimenFeedback.mjs'
import { BAZI_PROFILE_QIMEN_SELECT } from '../baziProfileFields.mjs'

const SUPABASE_URL = 'https://xkbqiiwwgfzkyfhxuoev.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_qr9YBIA6n32r-mcqKbkpgA_0XVTUSI7'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const getApiBase = () => {
  const configuredBase = String(import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')
  if (configuredBase) return configuredBase
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.qimen-1ff.pages.dev')) {
    return 'https://qimen-preview.oceanjustinlin.workers.dev'
  }
  return ''
}
const API_BASE = getApiBase()
const apiPath = (path) => `${API_BASE}${path}`
const API_URL = apiPath("/api/qimen")
const ROUTE_API_URL = apiPath("/api/divination-route")
const BAZI_QUESTION_API_URL = apiPath("/api/bazi-question")
const router = useRouter()
const route = useRoute()

const currentUser = ref(null)
const authView = ref('landing')
const isLoginMode = computed(() => authView.value === 'login')
const authLoading = ref(false)
const googleAuthLoading = ref(false)
const resetEmailLoading = ref(false)
const resetEmailNotice = ref('')
const authForm = reactive({ email: '', password: '' })

const viewState = ref('input') 
const questionInput = ref('')
const isSubmitting = ref(false)
const clockText = ref('载入时辰中…')
const showRouteInfoModal = ref(false)

const baziProfiles = ref([])
const selectedProfileId = ref('')
const isProfileMenuOpen = ref(false)
const currentBaziString = ref('')
const activeBaziProfile = computed(() => baziProfiles.value.find(p => p.id === selectedProfileId.value))
const snapshotProfile = computed(() => {
  const snap = activeBaziResultData.value?.subject_snapshot
  if (snap?.birth_date && snap?.gender) return {
    name: snap.name || activeBaziProfile.value?.name || '',
    birth_date: snap.birth_date,
    gender: snap.gender,
    strong_weak: snap.strong_weak || activeBaziProfile.value?.strong_weak || '',
    geju: snap.geju || activeBaziProfile.value?.geju || ''
  }
  return activeBaziProfile.value
})
const snapshotPatternName = computed(() => {
  const profile = snapshotProfile.value
  return profile?.bazi_detail?.pattern_analysis?.extraction?.final_pattern?.name || profile?.geju || ''
})
const snapshotLunarStr = computed(() => {
  const profile = snapshotProfile.value
  const birthStr = String(profile?.birth_date || profile?.bazi_detail?.base_info?.solar_birth || '')
  const parts = birthStr.match(/\d+/g)
  if (!parts || parts.length < 3) return ''
  try {
    const solar = Solar.fromYmdHms(
      Number(parts[0]),
      Number(parts[1]),
      Number(parts[2]),
      Number(parts[3] || 12),
      Number(parts[4] || 0),
      0
    )
    const lunar = solar.getLunar()
    const ganzhi = `${lunar.getYearInGanZhi()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} ${lunar.getTimeZhi()}时`
    const zao = profile?.gender === 'M' ? '乾造' : '坤造'
    return `${ganzhi} ${zao}`
  } catch {
    return ''
  }
})
const showProfileSwitcher = computed(() => baziProfiles.value.length > 0)
const activeProfileName = computed(() => activeBaziProfile.value?.name || '命主未设')
const isGuest = computed(() => globalState.isGuest)
const isAuthLanding = computed(() => ['login', 'register'].includes(route.query.auth))
const canUseApp = computed(() => Boolean(currentUser.value || (isGuest.value && globalState.guestAccessUnlocked && !isAuthLanding.value)))

const historyRecords = ref([])
const activeCategory = ref('all')
const activeResultRecord = ref(null)
const categories = [
  { label: '全部', value: 'all' },
  { label: '事业', value: 'career_business' },
  { label: '求财', value: 'finance_wealth' },
  { label: '感情', value: 'relationship' },
  { label: '健康', value: 'health_action' },
  { label: '交易', value: 'item_transaction' },
  { label: '杂事', value: 'general' }
]
const feedbackAccuracyOptions = QIMEN_ACCURACY_OPTIONS
const feedbackDirectionOptions = QIMEN_DIRECTION_OPTIONS
const isFeedbackDrawerOpen = ref(false)
const feedbackTargetRecord = ref(null)
const feedbackSaving = ref(false)
const feedbackForm = reactive(buildDefaultFeedbackForm())
const feedbackConclusion = computed(() => feedbackTargetRecord.value?.qimen_data?.summary?.conclusion || '')

const resultHtml = ref('')
const currentScore = ref(0)
const activeBaziResultData = ref(null)
const baziCardSelectedYear = ref(null)
const showBaziBackingAnchor = ref(false)
let scoreTimer = null

// 保存长图
const isSavingImage = ref(false)
const shareImgUrl = ref('')

const closeShareModal = () => {
  shareImgUrl.value = ''
}

const loadHtml2Canvas = () => {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) { resolve(window.html2canvas); return }
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
    script.onload = () => resolve(window.html2canvas)
    script.onerror = () => reject(new Error('html2canvas 加载失败，请检查网络'))
    document.head.appendChild(script)
  })
}

const saveAsImage = async () => {
  if (isSavingImage.value) return
  isSavingImage.value = true
  try {
    const h2c = await loadHtml2Canvas()
    const captureEl = document.querySelector('.html-container')
    if (!captureEl) { alert('未找到推演结果，请重新推演'); return }

    // 截图前向真实 document 注入兼容补丁（覆盖 color-mix 属性）
    // Vite dev 模式用 adoptedStyleSheets，onclone 内替换无效，需在源 doc 提前覆盖
    const h2cPatch = document.createElement('style')
    h2cPatch.id = 'h2c-compat-patch'
    h2cPatch.textContent = `
      [data-h2c-target] .summary-score-bubble {
        background: linear-gradient(180deg, rgba(179,139,54,0.15), rgba(255,255,255,0.03)) !important;
        border: 1px solid rgba(179,139,54,0.24) !important;
        box-shadow: 0 0 24px rgba(179,139,54,0.15) !important;
      }
      [data-h2c-target] .keyword-highlight {
        background: linear-gradient(90deg, rgba(179,139,54,0.15), rgba(255,255,255,0.02)) !important;
        border: 1px solid rgba(179,139,54,0.18) !important;
        box-shadow: 0 0 18px rgba(179,139,54,0.12) !important;
      }
      [data-h2c-target] .accent-theme {
        background: linear-gradient(135deg, rgba(179,139,54,0.05), transparent) !important;
      }
      [data-h2c-target] .highlight-text {
        text-shadow: 0 0 12px rgba(179,139,54,0.5) !important;
      }
      [data-h2c-target] .conclusion {
        text-shadow: none !important;
      }
      [data-h2c-target] .score {
        text-shadow: 0 0 18px rgba(179,139,54,0.15) !important;
      }
    `
    captureEl.setAttribute('data-h2c-target', '1')
    document.head.appendChild(h2cPatch)

    let canvas
    try {
      canvas = await h2c(captureEl, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#f7f4ee',
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.scrollWidth,
        onclone: (clonedDoc) => {
          // 1. 确保所有 reveal 元素可见
          clonedDoc.querySelectorAll('.reveal').forEach(el => {
            el.style.opacity = '1'
            el.style.transform = 'none'
          })

          // 2. 遍历克隆文档所有 <style> 标签，替换 color-mix()
          clonedDoc.querySelectorAll('style').forEach(styleEl => {
            if (styleEl.textContent && styleEl.textContent.includes('color-mix')) {
              styleEl.textContent = styleEl.textContent
                .replace(/color-mix\([^)]+\)/g, 'transparent')
            }
          })

          // 3. 清除内联 style 属性中残留的 color-mix()
          clonedDoc.querySelectorAll('[style]').forEach(el => {
            const s = el.getAttribute('style') || ''
            if (s.includes('color-mix')) {
              el.setAttribute('style', s.replace(/color-mix\([^)]+\)/g, 'transparent'))
            }
          })
        }
      })
    } finally {
      // 无论成功失败，都清理临时补丁
      captureEl.removeAttribute('data-h2c-target')
      document.getElementById('h2c-compat-patch')?.remove()
    }

    // 叠加水印
    const finalCanvas = addWatermark(canvas)
    const imgData = finalCanvas.toDataURL('image/png')

    // PC 端自动下载
    const isPC = !('ontouchstart' in window || navigator.maxTouchPoints > 0)
    if (isPC) {
      const link = document.createElement('a')
      const now = new Date()
      const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`
      link.download = `奇门推演_${dateStr}.png`
      link.href = imgData
      link.click()
    }
    // 移动端弹窗长按保存
    shareImgUrl.value = imgData
  } catch (err) {
    console.error('生成图片失败:', err)
    alert('图片生成失败：' + (err.message || '未知错误'))
  } finally {
    isSavingImage.value = false
  }
}

const addWatermark = (sourceCanvas) => {
  const wCanvas = document.createElement('canvas')
  const padding = 48
  wCanvas.width = sourceCanvas.width
  wCanvas.height = sourceCanvas.height + padding
  const ctx = wCanvas.getContext('2d')

  // 背景
  ctx.fillStyle = '#05050A'
  ctx.fillRect(0, 0, wCanvas.width, wCanvas.height)

  // 原图
  ctx.drawImage(sourceCanvas, 0, 0)

  // 水印条
  const wmY = sourceCanvas.height
  const wmH = padding
  const grad = ctx.createLinearGradient(0, wmY, 0, wmY + wmH)
  grad.addColorStop(0, 'rgba(5,5,10,0.9)')
  grad.addColorStop(1, 'rgba(10,8,3,1)')
  ctx.fillStyle = grad
  ctx.fillRect(0, wmY, wCanvas.width, wmH)

  // 分割线
  ctx.strokeStyle = 'rgba(212,175,55,0.25)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(24, wmY + 1)
  ctx.lineTo(wCanvas.width - 24, wmY + 1)
  ctx.stroke()

  // 品牌字
  const scale = sourceCanvas.width / 375 // 基于 375px 基准
  const fontSize = Math.round(13 * scale)
  ctx.font = `500 ${fontSize}px 'Noto Serif SC', 'Songti SC', 'STSong', serif`
  ctx.fillStyle = 'rgba(212,175,55,0.85)'
  ctx.textBaseline = 'middle'
  ctx.fillText('奇门遁甲 AI 推演', 24, wmY + wmH / 2)

  // 域名
  const domainFontSize = Math.round(12 * scale)
  ctx.font = `400 ${domainFontSize}px 'SF Mono', 'Fira Code', monospace`
  ctx.fillStyle = 'rgba(255,255,255,0.32)'
  const domainText = 'qimendao.com'
  const domainWidth = ctx.measureText(domainText).width
  ctx.fillText(domainText, wCanvas.width - 24 - domainWidth, wmY + wmH / 2)

  return wCanvas
}

const LOADER_MESSAGES = ['正在接通云端超算矩阵...','推演时空坐标与节气数据...','计算奇门九宫落盘...','分析值符、值使与神助...','生成决策指引与应期推演...']
const currentLoaderMessage = ref(LOADER_MESSAGES[0])
let loaderInterval = null

// ── SSE progress state ──
const SSE_STEPS = {
  qimen: [
    { name: '解析问题意图', tag: '路由分类',   detail: '正在识别问题类型' },
    { name: '起盘计算',     tag: '天地盘落定', detail: '推算当前时辰九宫布局' },
    { name: '定位用神',     tag: '目标星门确认', detail: '锁定用神与辅神宫位' },
    { name: '推演应期',     tag: '扫描时间窗口', detail: '扫描未来 30 日应期节点' },
    { name: '后端评分',     tag: '卦象强弱初判', detail: '量化宫象强弱与五行生克' },
    { name: 'AI 推演解盘',  tag: '深度推演中',   detail: '综合推演，生成决策指引' },
    { name: '解盘完成',     tag: '结果就绪', detail: '' },
  ],
  bazi: [
    { name: '解析问题意图', tag: '路由分类',   detail: '正在识别问题类型' },
    { name: '调取命盘',     tag: '八字加载',   detail: '读取日主与大运流年' },
    { name: '语义路由',     tag: '分析模式确认', detail: '确认分析维度与时间范围' },
    { name: '构建推演框架', tag: '命局分析',   detail: '整合命局与五行格局' },
    { name: '五行喜忌',     tag: '格局评估',   detail: '评估喜用神与忌神强弱' },
    { name: 'AI 深度解盘',  tag: '深度推演中', detail: '综合命局，生成运势解读' },
    { name: '解盘完成',     tag: '结果就绪', detail: '' },
  ],
}
const CATEGORY_LABEL_MAP = {
  career_business: '事业运势', finance_wealth: '财运分析',
  relationship: '感情婚恋', health_action: '健康行动', general: '综合运势',
}
const sseBranch = ref('qimen')
const sseActiveIndex = ref(0)
const sseChips = ref({})
const ssePct = ref(0)
const sseCurrentSteps = computed(() => SSE_STEPS[sseBranch.value] || SSE_STEPS.qimen)
const sseSpinePct = computed(() => {
  const done = Math.max(0, sseActiveIndex.value - 1)
  const total = sseCurrentSteps.value.length - 1
  return total > 0 ? (done / total) * 100 : 0
})

function resetSseState() {
  sseBranch.value = 'qimen'
  sseActiveIndex.value = 0
  sseChips.value = {}
  ssePct.value = 0
}

async function readSSEStream(response) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) throw new Error('推演流意外关闭')
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''
    for (const part of parts) {
      const line = part.trim()
      if (!line.startsWith('data: ')) continue
      let event
      try { event = JSON.parse(line.slice(6)) } catch { continue }
      if (event.type === 'step') {
        sseActiveIndex.value = event.index + 1
        if (event.chip) sseChips.value = { ...sseChips.value, [event.index]: event.chip }
        ssePct.value = event.pct
      } else if (event.type === 'active') {
        sseActiveIndex.value = event.index
        ssePct.value = event.pct
      } else if (event.type === 'complete') {
        sseActiveIndex.value = sseCurrentSteps.value.length
        ssePct.value = 100
        return event.result
      } else if (event.type === 'error') {
        throw new Error(event.message || '推演失败')
      }
    }
  }
}

let clockInterval = null
const getFortuneStorage = () => (typeof window === 'undefined' ? null : window.localStorage)

const syncAuthModeFromRoute = () => {
  if (route.query.auth === 'register') authView.value = 'register'
  else if (route.query.auth === 'login') authView.value = 'login'
}

// ── 有名格断语字典 ──
const GE_DESCRIPTIONS = {
  // 吉格 — 天地盘干组合
  '飞鸟跌穴': '势如飞鸟入穴，谋事必成，利行动出击，诉讼有力。',
  '青龙返首': '龙首回顾，守成有余，防守有利，坐等天时主局自稳。',
  '日月并行': '日月同辉，诸事顺遂，感情婚姻尤佳，贵人常伴。',
  '奇仪相佐': '奇仪辅佐，利学业考试，文书有成，谋划可期。',
  '青龙转光': '青龙转光，事业财运渐旺，可图发展，贵人相助。',
  '青龙耀明': '龙光耀明，事业有进，贵人相助，名利双收。',
  '星奇入太阴': '奇星入阴，利学业谋划，暗中有助，运筹帷幄。',
  '奇仪相合·乙庚': '刚柔相济，合作顺利，诉讼可解，感情和谐。',
  '奇仪相合·丙辛': '光芒相合，婚恋顺遂，官司可和，诸事顺利。',
  '奇仪相合·丁壬': '阴阳和合，感情婚姻大利，合作有成，吉象频现。',
  '奇仪相合·戊癸': '土水合德，感情渐融，合作可期，润物无声。',
  // 凶格 — 天地盘干组合
  '青龙逃走': '青龙遁逃，奴仆背离，六畜受伤，主动出击大损，防小人背叛。',
  '白虎猖狂': '白虎横行，人亡家败，出行遇险，车船受损，尊长不利，诸事难成。',
  '朱雀投江': '朱雀沉溺，文书口舌俱消，音信全无，凡事沉滞难成，忌出行求事。',
  '螣蛇夭矫': '螣蛇作乱，是非口舌纷起，虚惊诈骗频现，感情生变，谨防欺骗。',
  '太白入荧': '兵刃相见，贼者来犯，主动出击得利，守方损财，慎防被侵夺。',
  '荧入太白': '火入金门，门户败落，守方转危为安，主动者反自陷被动困境。',
  '大格': '大格凶险，感情破裂，疾病官司皆凶，诸事难成，宜静待观变。',
  '小格': '小格碍事，事业受阻，进展迟缓，宜审慎图谋，勿急进。',
  '伏宫格': '伏宫压制，财运受困，官司不利，宜守不宜动，待时而发。',
  '飞宫格': '飞宫动荡，事业受损，官司难胜，谨防变故，稳扎稳打。',
  '刑格': '刑格逼迫，财运受损，官司缠身，刑罚之象，忌争讼。',
  '天网四张': '天网恢恢，无路可走，出行求事皆凶，万事休止，静待时机。',
  '地网遮蔽': '地网遮蔽，暗藏险机，事业受阻，谨防奸情暗算，不宜轻动。',
  // 凶格 — 结构格
  '六仪击刑': '六仪相刑，感情破损，官司疾病极凶，主动者首当其冲，大凶之局。',
  '三奇入墓·乙': '乙奇入墓，木气受困，生机停滞，诸事难成，宜静不宜动。',
  '三奇入墓·丙': '丙奇入墓，光华暗淡，事业财运受阻，百不宜为，守静待变。',
  '三奇入墓·丁': '丁奇入墓，奇星失力，谋事难成，文书受阻，宜静不宜动。',
  // 吉格 — 结构格
  '三奇得使': '三奇得使，奇门大吉，诸事顺遂，出行求事皆宜，贵人相助。',
  '三奇贵人升殿': '三奇贵人升殿，大吉之象，财运学业官事皆旺，百事大利。',
  '玉女守门': '玉女守门，感情和顺，事业顺遂，贵人暗助，柔化阻力。',
  '天显时格': '天时显现，把握机遇，事业可为，官司宜主动，顺势而为。',
  '真诈格': '三诈成局，借奇门之势，谋事有成，事业财运利，官司得胜。',
  '重诈格': '三诈成局，借奇门之势，谋事有成，事业财运利，官司得胜。',
  '休诈格': '三诈成局，借奇门之势，谋事有成，事业财运利，官司得胜。',
  '天假格': '天假借力，九天助势，谋事可成，事业财运有助，可乘势而为。',
  '地假格': '地假借力，九地庇护，谋事可成，事业财运有助，稳中求进。',
  '物假格': '物假借力，六合通融，谋事可成，事业财运有助，合作顺遂。',
  '鬼假格': '鬼假借力，化险为夷，谋事可成，事业财运有助，逢凶化吉。',
  '人假格': '人假借力，人缘得力，谋事可成，事业财运有助，贵人相携。',
  // 九遁吉格
  '天遁': '天遁大吉，感情婚姻官事皆利，贵人相助，可逢凶化吉，宜行动。',
  '地遁': '地遁吉祥，感情婚姻官事顺遂，稳中有进，可化解险厄。',
  '人遁': '人遁贵助，暗中有贵人相护，感情婚姻官事皆宜，阴助有力。',
  '神遁': '神遁天助，事业求财顺遂，官事可胜，上天暗护，大吉。',
  '云遁': '云遁潜行，感情顺遂，可化阻碍，柔化矛盾，静待成事。',
  '风遁': '风遁助力，事业求财有进，可乘势而为，时机把握得当。',
  '龙遁': '龙遁吉象，感情顺遂，助力可期，贵人暗护，顺势而行。',
  '虎遁': '虎遁化险，事业求财有利，可乘势出击，化被动为主动。',
  '鬼遁': '鬼遁暗助，事业求财有进，可谋阴利，化解暗中阻力。',
  // 凶格 — 时间结构格
  '五不遇时': '五不遇时，时干克日干，百事不宜，尤忌出行求财，健康堪忧，宜静不宜动。',
  '奇格': '庚压三奇，奇门受困，主动者大损，百事阻滞，慎防险厄，忌轻举妄动。',
  '岁格': '岁格压制，庚临年干，一年之内事业财运受阻，谨慎行事，待岁运转顺。',
  '月格': '月格制约，庚临月干，本月内事业财运受困，宜守待机，避锋芒。',
  '悖格': '悖格乱局，纲纪紊乱，倒行逆施之象，事业财运受阻，宜防内乱生变。',
  '伏干格': '伏干压制，日干受困，守方尤难脱身，事业财运极凶，慎之又慎。',
  '飞干格': '飞干冲动，日干飞越，事业财运极凶，大事不宜，宜静待时机。',
  '伏吟（凶）': '伏吟停滞，万事凝固不动，主动出行大凶，局势僵持，宜守不宜动。',
  '反吟（凶）': '反吟翻覆，局势颠倒，守方处境艰难，变化剧烈，宜化解矛盾。',
}

// ── 有名格 modal ──
let geModalEl = null
let geOverlayEl = null
let geActiveTag = null
let lastHandledSessionKey = null

const hideGeModal = () => {
  geOverlayEl?.classList.remove('visible')
  geModalEl?.classList.remove('visible')
  geActiveTag = null
}

const showGeModal = (tag, reasons) => {
  const name = tag.dataset.geName
  const entry = reasons.find(r => r.name === name)
  if (!entry) return
  geActiveTag = tag
  if (!geOverlayEl) {
    geOverlayEl = document.createElement('div')
    geOverlayEl.className = 'ge-overlay'
    geOverlayEl.addEventListener('click', hideGeModal)
    document.body.appendChild(geOverlayEl)
  }
  if (!geModalEl) {
    geModalEl = document.createElement('div')
    geModalEl.className = 'ge-modal'
    geModalEl.innerHTML = `<button class="ge-modal-close">✕</button><div class="ge-pop-kicker">格局说明</div><div class="ge-pop-name"></div><div class="ge-pop-divider"></div><div class="ge-pop-text"></div>`
    geModalEl.querySelector('.ge-modal-close').addEventListener('click', hideGeModal)
    document.body.appendChild(geModalEl)
  }
  geModalEl.querySelector('.ge-pop-name').textContent = entry.name
  geModalEl.querySelector('.ge-pop-name').className = `ge-pop-name ${entry.type}`
  geModalEl.querySelector('.ge-pop-kicker').textContent = entry.type === 'ji' ? '吉格提示' : '凶格提示'
  geModalEl.querySelector('.ge-pop-text').textContent = entry.text
  geOverlayEl.classList.add('visible')
  geModalEl.classList.add('visible')
}

const handleGeTagClick = (e) => {
  const tag = e.target.closest('.ge-tag')
  if (!tag) return
  const row = tag.closest('.formation-tag-row, .ge-tags-row')
  if (!row) return
  try {
    const reasons = JSON.parse(row.dataset.geReasons || '[]')
    if (geActiveTag === tag && geModalEl?.classList.contains('visible')) hideGeModal()
    else showGeModal(tag, reasons)
  } catch {}
}

onMounted(() => {
  syncAuthModeFromRoute()
  updateClock()
  clockInterval = setInterval(updateClock, 30000)
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('click', handleGeTagClick)

  supabase.auth.getSession().then(({ data: { session } }) => {
    handleSessionUpdate(session)
  })
  supabase.auth.onAuthStateChange((_event, session) => {
    handleSessionUpdate(session)
  })
})

watch(() => route.query.auth, syncAuthModeFromRoute)

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('click', handleGeTagClick)
  geModalEl?.remove()
  geOverlayEl?.remove()
  geModalEl = null
  geOverlayEl = null
  clearInterval(clockInterval)
  clearInterval(loaderInterval)
  clearInterval(scoreTimer)
})

const toggleDrawer = () => {
  globalState.isDrawerOpen = !globalState.isDrawerOpen
}

const handleSessionUpdate = (session) => {
  const sessionKey = session?.access_token || session?.user?.id || ''
  if (sessionKey && sessionKey === lastHandledSessionKey) return
  lastHandledSessionKey = sessionKey
  setCurrentUser(session?.user || null)
  if (session) {
    currentUser.value = session.user
    loadHistory()
    fetchBaziProfiles()
    warmFortuneCacheFromSupabase({
      supabase,
      storage: getFortuneStorage(),
      userId: session.user.id
    })
  } else {
    lastHandledSessionKey = ''
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
}

const handleGuestEntry = async () => {
  enterGuestMode()
  currentUser.value = null
  historyRecords.value = []
  await fetchBaziProfiles()
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

const formatSolarDate = (value) => {
  if (!value) return '阳历待确认'
  const p = String(value).match(/\d+/g)
  if (!p || p.length < 3) return '阳历待确认'
  const time = p.length >= 5 ? ` ${p[3].padStart(2, '0')}:${p[4].padStart(2, '0')}` : ''
  return `${p[0]}.${p[1].padStart(2, '0')}.${p[2].padStart(2, '0')}${time}`
}

const profileMetaText = (profile) => {
  const parts = [profile.gender === 'M' ? '乾造' : '坤造']
  if (profile.birth_location) parts.push(profile.birth_location)
  if (profile.is_default) parts.push('默认')
  return parts.join(' · ')
}

const fetchBaziProfiles = async () => {
  if (isGuest.value && !currentUser.value) {
    const profile = getGuestState().baziProfile
    baziProfiles.value = profile ? [profile] : []
    selectedProfileId.value = profile?.id || ''
    if (profile?.id) setSelectedBaziProfileId(profile.id)
    handleProfileSelect()
    return
  }
  if (!currentUser.value) return
  const { data, error } = await supabase.from('bazi_profiles').select(BAZI_PROFILE_QIMEN_SELECT).order('created_at', { ascending: false })
  if (!error && data) {
    baziProfiles.value = data
    const resolvedProfileId = resolveSelectedBaziProfileId(baziProfiles.value, {
      currentProfileId: selectedProfileId.value
    })
    selectedProfileId.value = resolvedProfileId
    setSelectedBaziProfileId(resolvedProfileId)
    handleProfileSelect()
  }
}

const handleProfileSelect = () => {
  if (!selectedProfileId.value) {
    currentBaziString.value = ''
    return
  }
  setSelectedBaziProfileId(selectedProfileId.value)
  const profile = baziProfiles.value.find(p => p.id === selectedProfileId.value)
  if (profile?.bazi_summary) {
    const baziStr = profile.bazi_str || "未知"
    currentBaziString.value = `命主：${profile.name}\n性别：${profile.gender === 'M' ? '男' : '女'}\n八字结构：${baziStr}\n断语：${profile.bazi_summary}`
  } else {
    currentBaziString.value = ''
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
  handleProfileSelect()
}

const handleDocumentClick = (event) => {
  const target = event.target
  if (!(target instanceof Element)) return
  if (!target.closest('.profile-switcher')) isProfileMenuOpen.value = false
}

const goToBaziProfiles = () => {
  router.push({ name: 'bazi' })
}

watch(
  () => globalState.selectedBaziProfileId,
  (profileId) => {
    if (!profileId || profileId === selectedProfileId.value) return
    if (!baziProfiles.value.some(profile => profile.id === profileId)) return
    selectedProfileId.value = profileId
    handleProfileSelect()
  }
)

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
  activeResultRecord.value = null
  activeBaziResultData.value = null
  baziCardSelectedYear.value = null
  showBaziBackingAnchor.value = false
}

const startNewSession = () => {
  resetToInput()
  globalState.isDrawerOpen = false
}

const syncBaziBackingAnchor = () => {
  nextTick(() => {
    showBaziBackingAnchor.value = Boolean(
      activeBaziResultData.value &&
      activeBaziProfile.value &&
      document.getElementById('bazi-backing-anchor')
    )
  })
}

const activateBaziResultPanel = (data) => {
  showBaziBackingAnchor.value = false
  if (!(data?.branch === 'bazi' && data.meta?.analysis_mode)) {
    activeBaziResultData.value = null
    baziCardSelectedYear.value = null
    return
  }
  activeBaziResultData.value = data
  if (data.meta.analysis_mode === 'timing') {
    const windows = data.mode_analysis?.trigger_windows || []
    const best = windows.find(window => window.quality === 'strong') || windows[0]
    baziCardSelectedYear.value = Number(best?.year) || activeBaziProfile.value?.bazi_detail?.matrix?.current_liunian?.year || null
  } else {
    baziCardSelectedYear.value = activeBaziProfile.value?.bazi_detail?.matrix?.current_liunian?.year || null
  }
  syncBaziBackingAnchor()
}

const startDivination = async () => {
  const input = questionInput.value.trim()
  if (!input) return alert("问题不能为空！")
  activeBaziResultData.value = null
  baziCardSelectedYear.value = null
  showBaziBackingAnchor.value = false

  const { data: { session } } = await supabase.auth.getSession()
  const guestState = getGuestState()
  if (!session && !isGuest.value) return alert("请先登录")
  if (!session && isGuest.value && !guestState.canAskQuestion) return alert("访客模式仅可提问 1 次，请登录后继续推演")

  const headers = session
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }
    : { 'Content-Type': 'application/json', 'X-Guest-Id': guestState.guestId }
  let routeData = null

  isSubmitting.value = true
  viewState.value = 'loading'
  resetSseState()

  try {
    const routeResponse = await fetch(ROUTE_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        question: input,
        hasBaziProfile: Boolean(selectedProfileId.value || baziProfiles.value.length)
      })
    })
    routeData = await routeResponse.json()
    if (!routeResponse.ok || routeData.error) throw new Error(routeData.details || routeData.error || '分类失败')

    if (routeData.branch === 'clarify') {
      alert(routeData.followupQuestion || '请补充你想看长期趋势，还是判断眼前某一件具体事情。')
      viewState.value = 'input'
      return
    }

    // Mark step 0 done with routing result
    sseBranch.value = routeData.branch === 'bazi' ? 'bazi' : 'qimen'
    sseChips.value = { 0: { main: CATEGORY_LABEL_MAP[routeData.category] || '综合运势', sub: routeData.branch === 'bazi' ? '八字命理' : routeData.branch === 'hybrid' ? '综合推演' : '奇门遁甲' } }
    sseActiveIndex.value = 1
    ssePct.value = 10

    if (routeData.branch === 'bazi') {
      if (!session) {
        alert('这个问题更适合走八字命盘分析，请先登录并建立八字档案。')
        router.push({ name: 'bazi', query: { question: input } })
        return
      }

      if (!baziProfiles.value.length) await fetchBaziProfiles()
      const profileId = selectedProfileId.value || baziProfiles.value.find(p => p.is_default)?.id || baziProfiles.value[0]?.id || ''
      if (!profileId) {
        alert('这个问题需要八字档案才能分析，请先进入八字页建立命主资料。')
        router.push({ name: 'bazi', query: { question: input } })
        return
      }
      selectedProfileId.value = profileId

      const response = await fetch(BAZI_QUESTION_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ question: input, profileId, route: routeData })
      })
      if (!response.ok) {
        const errData = await response.json()
        if (errData.code === 'BAZI_PROFILE_INCOMPLETE') {
          alert('该档案还没有完整排盘数据，请先进入八字页完成命盘推演。')
          router.push({ name: 'bazi', query: { profileId, question: input } })
          return
        }
        throw new Error(errData.details || errData.error || '八字问答失败')
      }
      const data = await readSSEStream(response)
      const savedRecord = await saveRecordToDatabase(input, data)
      activeResultRecord.value = savedRecord
      resultHtml.value = buildCardHTML(data)
      activateBaziResultPanel(data)
      viewState.value = 'result'
      nextTick(() => {
        if (!(data.branch === 'bazi' && data.meta?.analysis_mode)) animateScore(data.summary?.score || 0)
        setTimeout(() => document.querySelectorAll('.reveal').forEach((el, i) => setTimeout(() => el.classList.add('visible'), i * 80)), 450)
      })
      return
    }

    if (routeData.branch === 'hybrid' && !currentBaziString.value) {
      routeData = { ...routeData, branch: 'qimen', reason: `${routeData.reason || ''}；当前未选择完整八字档案，自动仅用奇门。` }
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        question: input,
        route: routeData,
        baziInfo: (routeData.branch === 'qimen') ? null : (currentBaziString.value || null)
      })
    })
    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.details || errData.error || '推演失败')
    }
    const data = await readSSEStream(response)
    const savedRecord = await saveRecordToDatabase(input, data)
    activeResultRecord.value = savedRecord
    activateBaziResultPanel(data)
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
  const records = (data || []).map(r => ({
    ...r,
    dateStr: new Date(r.created_at).toLocaleDateString(),
    score: r.qimen_data?.summary?.score || 0,
    catLabel: categories.find(c => c.value === r.category)?.label || '杂事'
  }))

  if (!currentUser.value) {
    historyRecords.value = mergeQimenFeedbackIntoRecords(records, [], currentUser.value)
    return
  }

  const { data: feedbackRows, error } = await supabase
    .from('qimen_feedback')
    .select('record_id, accuracy_status, actual_direction, note, updated_at')
    .eq('user_id', currentUser.value.id)

  if (error && error.code !== '42P01') {
    console.warn('加载奇门反馈失败:', error.message)
  }

  historyRecords.value = mergeQimenFeedbackIntoRecords(records, error ? [] : (feedbackRows || []), currentUser.value)
  if (activeResultRecord.value?.id) {
    activeResultRecord.value = historyRecords.value.find(record => record.id === activeResultRecord.value.id) || activeResultRecord.value
  }
}

const saveRecordToDatabase = async (question, data) => {
  if (isGuest.value && !currentUser.value) {
    const guestRecord = {
      id: 'guest_qimen_record',
      question,
      qimen_data: data,
      category: data.category || 'general',
      dateStr: new Date().toLocaleDateString(),
      score: data.summary?.score || 0,
      catLabel: categories.find(c => c.value === data.category)?.label || '杂事',
      canFeedback: false,
      hasFeedback: false,
      feedback: null
    }
    historyRecords.value = [guestRecord]
    return guestRecord
  }
  const { data: insertedRows, error } = await supabase
    .from('qimen_records')
    .insert([{ user_id: currentUser.value.id, question, qimen_data: data, category: data.category || 'general' }])
    .select('*')

  if (error) throw error
  await loadHistory()
  const insertedRecordId = insertedRows?.[0]?.id
  return historyRecords.value.find(record => record.id === insertedRecordId) || null
}

const filteredHistory = computed(() => activeCategory.value === 'all' ? historyRecords.value : historyRecords.value.filter(r => r.category === activeCategory.value))

const loadRecord = (item) => {
  globalState.isDrawerOpen = false
  activeResultRecord.value = item
  resultHtml.value = buildCardHTML(item.qimen_data)
  activateBaziResultPanel(item.qimen_data)
  viewState.value = 'result'
  nextTick(() => {
    animateScore(item.qimen_data?.summary?.score || item.score || 0)
    setTimeout(() => document.querySelectorAll('.reveal').forEach((el, i) => setTimeout(() => el.classList.add('visible'), i * 80)), 200)
  })
}

const applyFeedbackForm = (feedback) => {
  const source = feedback || buildDefaultFeedbackForm()
  feedbackForm.accuracy_status = source.accuracy_status || 'pending'
  feedbackForm.actual_direction = source.actual_direction || 'pending'
  feedbackForm.note = source.note || ''
}

const openFeedbackDrawer = (item) => {
  if (!item?.canFeedback) return
  feedbackTargetRecord.value = item
  applyFeedbackForm(item.feedback)
  isFeedbackDrawerOpen.value = true
}

const closeFeedbackDrawer = () => {
  isFeedbackDrawerOpen.value = false
}

const submitQimenFeedback = async () => {
  if (!feedbackTargetRecord.value || !currentUser.value || feedbackSaving.value) return

  feedbackSaving.value = true
  try {
    const normalized = normalizeQimenFeedbackForm(feedbackForm)
    const { error } = await supabase
      .from('qimen_feedback')
      .upsert({
        record_id: feedbackTargetRecord.value.id,
        user_id: currentUser.value.id,
        accuracy_status: normalized.accuracy_status,
        actual_direction: normalized.actual_direction,
        note: normalized.note || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'record_id,user_id'
      })

    if (error) throw error
    await loadHistory()
    closeFeedbackDrawer()
    alert('反馈已保存')
  } catch (error) {
    alert('反馈保存失败: ' + error.message)
  } finally {
    feedbackSaving.value = false
  }
}

const getVerdictInfo = (score) => {
  if (score >= 90) return { label: '大吉', cls: 'da-ji' }
  if (score >= 75) return { label: '小吉', cls: 'xiao-ji' }
  if (score >= 55) return { label: '平', cls: 'ping' }
  return { label: '凶', cls: 'da-xiong' }
}

const getVerdictCls = (score) => score >= 75 ? 'ji' : score >= 55 ? 'ping' : 'xiong'

const isBaziRecord = (item) => item?.qimen_data?.branch === 'bazi' || item?.branch === 'bazi'

const baziAssessmentLabel = (type) => ({
  current_climate: '当前阶段气候',
  timing_effectiveness: '候选时间窗',
  innate_capacity: '先天结构适配',
  portrait_confidence: '人物倾向画像',
  unsupported: '边界说明'
}[type] || '八字分析')

const baziLevelLabel = (level) => ({
  strong: '强',
  medium: '中',
  weak: '弱',
  mixed: '参半',
  unknown: '未知'
}[level] || level || '未知')

const baziAnalysisModeLabel = (mode) => ({
  status: '当前状态',
  timing: '应期扫描',
  pattern: '先天结构',
  character: '人物画像',
  unsupported: '边界说明'
}[mode] || '八字分析')

const baziFallbackLevelLabel = (level) => ({
  subcategory: '精确领域',
  category: '领域规则',
  general: '通用规则',
  llm_derived: '象义推断',
  none: '无规则'
}[level] || '')

const buildTextListHTML = (items = [], cls = '') => {
  if (!Array.isArray(items) || !items.length) return ''
  return `<div class="${cls}">${items.map(item => `<span>${typeof item === 'string' ? item : (item.label || item.detail || JSON.stringify(item))}</span>`).join('')}</div>`
}

const concreteTargetLabel = (data) => {
  const target = data?.meta?.target || {}
  const toList = (value) => Array.isArray(value) ? value.filter(Boolean) : []
  const labels = [
    ...toList(target.shishen),
    ...toList(data?.chart_foundation?.core_stars),
    ...toList(target.gongwei),
    ...toList(data?.chart_foundation?.core_palaces)
  ]
  return [...new Set(labels)].slice(0, 4).join('、') || '本问题核心象'
}

const sanitizeBaziDisplayText = (value, targetLabel = '本问题核心象') => {
  if (value === null || value === undefined) return ''
  let text = typeof value === 'string' ? value : (value.label || value.detail || JSON.stringify(value))
  ;[
    /大运定位为\s*estimated[，,、\s]*(置信度需下调)?/gi,
    /大运[^。；;]*estimated[^。；;]*(?:[。；;]|$)/gi,
    /置信度需下调/gi,
    /estimated/gi,
    /fallback_current|fallback_level/gi,
    /trigger_vigor|activation_strength|activates_target|is_major_window|vigor_check/gi
  ].forEach(pattern => { text = text.replace(pattern, '') })
  return text
    .replace(/目标十神/g, targetLabel)
    .replace(/目标元素/g, targetLabel)
    .replace(/置信边界/g, '参考说明')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[，,；;\s]+|[，,；;\s]+$/g, '')
    .trim()
}

const buildBaziTextListHTML = (items = [], cls = '', targetLabel = '本问题核心象') => {
  if (!Array.isArray(items) || !items.length) return ''
  const labels = items.map(item => sanitizeBaziDisplayText(item, targetLabel)).filter(Boolean)
  if (!labels.length) return ''
  return `<div class="${cls}">${labels.map(item => `<span>${item}</span>`).join('')}</div>`
}

const buildBaziFoundationGroupHTML = (label, items = [], cls = '', targetLabel = '本问题核心象') => {
  const listHTML = buildBaziTextListHTML(items, cls, targetLabel)
  if (!listHTML) return ''
  return `<div class="bazi-foundation-group">
    <div class="foundation-group-label">${label}</div>
    ${listHTML}
  </div>`
}

const buildBaziAdviceRowsHTML = (rows = [], targetLabel = '本问题核心象') => {
  const normalized = rows
    .map(row => ({
      label: row.label,
      value: Array.isArray(row.value)
        ? row.value.map(item => sanitizeBaziDisplayText(item, targetLabel)).filter(Boolean).join('；')
        : sanitizeBaziDisplayText(row.value || '', targetLabel),
      tone: row.tone || 'neutral'
    }))
    .filter(row => row.value)
  if (!normalized.length) return ''
  return `<div class="bazi-advice-rows">
    ${normalized.map(row => `<div class="bazi-advice-row tone-${row.tone}">
      <span class="advice-row-label">${row.label}</span>
      <span class="advice-row-text">${row.value}</span>
    </div>`).join('')}
  </div>`
}

const buildPortraitBlockHTML = (block, label, targetLabel = '本问题核心象') => {
  if (!block?.text) return ''
  const confidence = block.confidence || 'low'
  return `<div class="bazi-portrait-block confidence-${confidence}">
    <div class="portrait-label">${label}<span class="confidence-badge">${baziLevelLabel(confidence)}</span></div>
    <p>${sanitizeBaziDisplayText(block.text, targetLabel)}</p>
    ${buildBaziTextListHTML(block.evidence || [], 'bazi-evidence-list', targetLabel)}
  </div>`
}

const buildBaziAdviceExtrasHTML = (advice = {}, targetLabel = '本问题核心象') => {
  const rowsHTML = buildBaziAdviceRowsHTML([
    { label: '风险提醒', value: advice.risk, tone: 'warning' },
    { label: '需要避开', value: advice.avoid || [], tone: 'warning' },
    { label: '建议节奏', value: advice.timing || [], tone: 'neutral' },
    { label: '借势方法', value: advice.leverage, tone: 'positive' }
  ], targetLabel)
  return rowsHTML ? `<div class="bazi-advice-extra">${rowsHTML}</div>` : ''
}

const buildBaziQuestionCardHTML = (data) => {
  const summary = data.summary || { title: '八字分析', conclusion: '暂无数据', score: null, level: 'unknown' }
  const meta = data.meta || {}
  const foundation = data.chart_foundation || {}
  const mode = data.mode_analysis || {}
  const advice = data.advice || {}
  const question = data.question || ''
  const assessmentType = summary.assessment_type || 'current_climate'
  const hasScore = summary.score !== null && summary.score !== undefined
  const levelLabel = baziLevelLabel(summary.level)
  const targetLabel = concreteTargetLabel(data)

  // Derive tone / theme-color from score (if present) or level
  let heroTone, THEME, THEME_DIM
  if (hasScore) {
    const sc = summary.score
    heroTone = sc >= 75 ? 'auspicious' : sc >= 55 ? 'neutral' : 'caution'
    THEME    = sc >= 75 ? '#0D9488' : sc >= 55 ? '#B58D3B' : '#C84A45'
    THEME_DIM= sc >= 75 ? 'rgba(13,148,136,0.15)' : sc >= 55 ? 'rgba(181,141,59,0.17)' : 'rgba(200,74,69,0.16)'
  } else {
    const lvl = summary.level || 'unknown'
    heroTone = lvl === 'strong' ? 'auspicious' : lvl === 'medium' ? 'neutral' : 'caution'
    THEME    = heroTone === 'auspicious' ? '#0D9488' : heroTone === 'neutral' ? '#B58D3B' : '#C84A45'
    THEME_DIM= heroTone === 'auspicious' ? 'rgba(13,148,136,0.15)' : heroTone === 'neutral' ? 'rgba(181,141,59,0.17)' : 'rgba(200,74,69,0.16)'
  }
  const verdictCls = { strong: 'ji', medium: 'ping', weak: 'warn', mixed: 'ping', unknown: 'ping' }[summary.level || 'unknown'] || 'ping'

  const tabClick = (id) => `var tabs=this.closest('.mag-tabs').querySelectorAll('.mag-tab');tabs.forEach(function(t){t.classList.remove('mag-tab-active')});this.classList.add('mag-tab-active');document.getElementById('${id}').scrollIntoView({behavior:'smooth',block:'start'})`

  const heroScoreHTML = hasScore
    ? `<div class="mag-score-inline"><strong>${summary.score}</strong><span>分</span></div>`
    : ''

  // ── Section 1: 结论总判 ──
  const basisLogic = summary.basis?.logic || ''
  const m1HTML = `<section class="mag-section" id="bazi-m1">
      <div class="module-heading"><h2>结论总判</h2></div>
      ${question ? `<blockquote class="mag-question">"${question}"</blockquote>` : ''}
      ${summary.keyword ? `<div class="report-subtitle">关键判断</div><p class="bazi-card-copy">${sanitizeBaziDisplayText(summary.keyword, targetLabel)}</p>` : ''}
      ${basisLogic ? `<div class="report-subtitle">推断逻辑</div><p class="bazi-card-copy">${sanitizeBaziDisplayText(basisLogic, targetLabel)}</p>` : ''}
    </section>`

  // ── Section 2: 命局解读 ──
  const positive = summary.basis?.positive_signals || []
  const negative = summary.basis?.negative_signals || []
  const basisSignalsHTML = positive.length || negative.length
    ? `<div class="report-subtitle">判断依据</div>${buildBaziTextListHTML(positive, 'bazi-signal-list positive', targetLabel)}${buildBaziTextListHTML(negative, 'bazi-signal-list warning', targetLabel)}`
    : ''

  const foundationEvidence = foundation.evidence || []
  const foundationSupports = foundation.supports || []
  const foundationObstacles = foundation.obstacles || []
  const foundationHTML = foundation.base_state || foundationSupports.length || foundationObstacles.length || foundationEvidence.length
    ? `<div class="report-subtitle">原局底盘</div>
       ${foundation.base_state ? `<p class="bazi-card-copy">${sanitizeBaziDisplayText(foundation.base_state, targetLabel)}</p>` : ''}
       ${buildBaziFoundationGroupHTML('支撑', foundationSupports, 'bazi-signal-list positive', targetLabel)}
       ${buildBaziFoundationGroupHTML('阻力', foundationObstacles, 'bazi-signal-list warning', targetLabel)}
       ${buildBaziFoundationGroupHTML('依据', foundationEvidence, 'bazi-evidence-list', targetLabel)}`
    : ''

  const windows = Array.isArray(mode.trigger_windows) ? mode.trigger_windows : []
  const timingHTML = windows.length
    ? `<div class="report-subtitle">候选时间窗</div>
       ${meta.analysis_mode === 'timing' ? `<div class="bazi-timing-meta">
          ${mode.best_window ? `<div class="timing-best">最优窗口：${sanitizeBaziDisplayText(mode.best_window, targetLabel)}</div>` : ''}
          ${mode.avoid_window ? `<div class="timing-avoid">回避：${sanitizeBaziDisplayText(mode.avoid_window, targetLabel)}</div>` : ''}
          <div class="timing-disclaimer">候选强度代表应期信号强弱，不是事件必然发生概率。</div>
        </div>` : ''}
       <div class="bazi-timing-window-list">
          ${windows.map(item => `<div class="bazi-timing-window-card quality-${item.quality || 'weak'}">
            <div class="bazi-window-top">
              <strong>${item.ganzhi ? `${item.year} ${item.ganzhi}` : item.year || '-'}</strong>
              <span class="quality-badge quality-${item.quality}">${baziLevelLabel(item.quality)}</span>
              ${item.is_major_window ? '<span class="major-window-badge">双引动</span>' : ''}
            </div>
            <div class="bazi-window-meta"><span>大运 ${item.dayun_ganzhi || '-'}</span></div>
            ${item.verdict ? `<p class="bazi-card-copy">${sanitizeBaziDisplayText(item.verdict, targetLabel)}</p>` : ''}
            ${item.mechanisms_text ? `<div class="bazi-logic">${sanitizeBaziDisplayText(item.mechanisms_text, targetLabel)}</div>` : ''}
            ${buildBaziTextListHTML(item.supporting_evidence || [], 'bazi-signal-list positive', targetLabel)}
            ${buildBaziTextListHTML(item.blocking_evidence || [], 'bazi-signal-list warning', targetLabel)}
          </div>`).join('')}
        </div>`
    : ''

  const patternHTML = meta.analysis_mode === 'pattern' && (mode.capacity_level || mode.structural_supports?.length || mode.structural_risks?.length || mode.verdict || mode.current_status_note)
    ? `<div class="report-subtitle">先天结构适配</div>
       ${mode.capacity_level ? `<div class="bazi-capacity-row"><span class="capacity-label">容量</span><span class="capacity-level level-${mode.capacity_level}">${baziLevelLabel(mode.capacity_level)}</span></div>` : ''}
       ${mode.verdict ? `<p class="bazi-card-copy">${sanitizeBaziDisplayText(mode.verdict, targetLabel)}</p>` : ''}
       ${buildBaziTextListHTML(mode.structural_supports || [], 'bazi-signal-list positive', targetLabel)}
       ${buildBaziTextListHTML(mode.structural_risks || [], 'bazi-signal-list warning', targetLabel)}
       ${mode.current_status_note ? `<p class="bazi-logic">${sanitizeBaziDisplayText(mode.current_status_note, targetLabel)}</p>` : ''}`
    : ''

  const characterHTML = meta.analysis_mode === 'character' && (mode.character_portrait || mode.appearance_tendency?.text || mode.personality_tendency?.text || mode.career_style?.text || mode.relationship_dynamic || mode.do_not_overclaim)
    ? `<div class="report-subtitle">人物倾向画像</div>
       ${mode.character_portrait ? `<p class="bazi-card-copy">${sanitizeBaziDisplayText(mode.character_portrait, targetLabel)}</p>` : ''}
       ${buildPortraitBlockHTML(mode.appearance_tendency, '外貌气质', targetLabel)}
       ${buildPortraitBlockHTML(mode.personality_tendency, '性格倾向', targetLabel)}
       ${buildPortraitBlockHTML(mode.career_style, '行事风格', targetLabel)}
       ${mode.relationship_dynamic ? `<div class="bazi-logic">${sanitizeBaziDisplayText(mode.relationship_dynamic, targetLabel)}</div>` : ''}
       ${mode.do_not_overclaim ? `<div class="bazi-disclaimer">${sanitizeBaziDisplayText(mode.do_not_overclaim, targetLabel)}</div>` : ''}`
    : ''

  let dynamicHTML = ''
  if (meta.analysis_mode === 'status') {
    const dayunReading = mode.dayun_reading || ''
    const liunianReading = mode.liunian_reading || ''
    const targetReading = mode.target_state_reading || ''
    if (dayunReading || liunianReading || targetReading) {
      dynamicHTML = `<div class="report-subtitle">当前运势气候</div>
        ${dayunReading ? `<div class="bazi-reading-block"><div class="reading-label">大运影响</div><p>${sanitizeBaziDisplayText(dayunReading, targetLabel)}</p></div>` : ''}
        ${liunianReading ? `<div class="bazi-reading-block"><div class="reading-label">流年触发</div><p>${sanitizeBaziDisplayText(liunianReading, targetLabel)}</p></div>` : ''}
        ${targetReading ? `<div class="bazi-reading-block"><div class="reading-label">${targetLabel}状态</div><p>${sanitizeBaziDisplayText(targetReading, targetLabel)}</p></div>` : ''}`
    }
  }

  const m2Content = basisSignalsHTML + foundationHTML + patternHTML + characterHTML + dynamicHTML + timingHTML
  const m2HTML = `<section class="mag-section" id="bazi-m2">
      <div class="module-heading"><h2>命局解读</h2></div>
      <div id="bazi-backing-anchor" class="bazi-backing-anchor"></div>
      ${m2Content || '<p class="bazi-card-copy">暂无详细解读数据</p>'}
    </section>`

  // ── Section 3: 行动建议 ──
  const adviceExtrasHTML = buildBaziAdviceExtrasHTML(advice, targetLabel)
  const strategyItems = Array.isArray(advice.strategy) && advice.strategy.length ? advice.strategy.slice(0, 3) : []
  const magStrategyHTML = strategyItems.length
    ? `<div class="mag-action-list">${strategyItems.map((s, i) => `<div class="mag-action-item"><div class="mag-action-num">${i + 1}</div><div class="mag-action-body">${sanitizeBaziDisplayText(s, targetLabel)}</div></div>`).join('')}</div>`
    : ''

  const m3HTML = magStrategyHTML || adviceExtrasHTML
    ? `<section class="mag-section" id="bazi-m3">
        <div class="module-heading"><h2>行动建议</h2></div>
        ${magStrategyHTML}
        ${adviceExtrasHTML}
      </section>`
    : ''

  const tabs = [
    `<button class="mag-tab mag-tab-active" onclick="${tabClick('bazi-m1')}">结论总判</button>`,
    `<button class="mag-tab" onclick="${tabClick('bazi-m2')}">命局解读</button>`,
    m3HTML ? `<button class="mag-tab" onclick="${tabClick('bazi-m3')}">行动建议</button>` : ''
  ].filter(Boolean).join('')

  return `<div class="mag-result tone-${heroTone}" style="--theme-color:${THEME};--theme-color-dim:${THEME_DIM};">
    <section class="mag-hero" id="bazi-hero">
      <div class="mag-hero-panel">
        ${heroScoreHTML}
        <div class="mag-hero-tags">
          <span class="mag-verdict-badge mag-verdict-${verdictCls}">${levelLabel}</span>
          ${summary.keyword ? `<span>${sanitizeBaziDisplayText(summary.keyword, targetLabel)}</span>` : ''}
        </div>
        <h1>${summary.title || baziAssessmentLabel(assessmentType)}</h1>
        <p>${sanitizeBaziDisplayText(summary.conclusion || '', targetLabel)}</p>
      </div>
    </section>

    <nav class="mag-tabs">
      ${tabs}
    </nav>

    ${m1HTML}
    ${m2HTML}
    ${m3HTML}
  </div>`
}

const deriveScoreBasisFromM3 = (m3, formations) => {
  const pos = []
  const neg = []
  const textOf = (...values) => values.find(v => typeof v === 'string' && v.trim()) || ''
  const itemText = item => textOf(
    item?.impact && item?.name ? `${item.name}：${item.impact}` : '',
    item?.impact,
    item?.name,
    item?.text
  )
  const itemsOf = state => (Array.isArray(state?.items) && state.items.length)
    ? state.items
    : (Array.isArray(state?.factors) ? state.factors : [])
  const target = m3?.target_state || m3?.target_yongshen_state
  const subject = m3?.subject_state || m3?.subject_day_stem_state || m3?.self_state
  const support = m3?.support_factors || m3?.favorable_factors
  const constraint = m3?.constraint_factors || m3?.constraints
  const interaction = m3?.interaction_decision || m3?.interaction_verdict
  const targetReading = textOf(target?.reading, target?.summary, target?.verdict)
  const subjectReading = textOf(subject?.reading, subject?.summary, subject?.verdict)
  const supportSummary = textOf(support?.summary, support?.primary_support, support?.verdict)
  const constraintSummary = textOf(constraint?.summary, constraint?.primary_risk, constraint?.verdict)
  const interactionDecision = textOf(interaction?.reading, interaction?.decision, interaction?.verdict)
  const interactionReason = textOf(interaction?.reason, interaction?.evidence)

  if (supportSummary) pos.push(supportSummary)
  itemsOf(support).slice(0, 3).forEach(f => {
    const text = itemText(f)
    if (text) pos.push(text)
  })
  if (target?.tone === 'positive' && targetReading) pos.push(targetReading)
  if (interaction?.tone !== 'warning' && interactionDecision) pos.push(interactionDecision)
  if (interaction?.tone !== 'warning' && interactionReason) pos.push(interactionReason)
  if (subject?.tone === 'positive' && subjectReading) pos.push(subjectReading)

  if (constraintSummary) neg.unshift(constraintSummary)
  itemsOf(constraint).slice(0, 3).forEach(f => {
    const text = itemText(f)
    if (text) neg.push(text)
  })
  if (subject?.tone === 'warning' && subjectReading) neg.push(subjectReading)
  if (target?.tone === 'warning' && targetReading) neg.push(targetReading)
  return (pos.length || neg.length) ? {
    positive_signals: pos.slice(0, 3),
    negative_signals: neg.slice(0, 3),
    score_logic: interactionDecision || interactionReason || ''
  } : null
}

const buildCardHTML = (data) => {
  if (data.branch === 'bazi' && data.meta?.analysis_mode) return buildBaziQuestionCardHTML(data)

  data = normalizeQimenCardData(data)
  const report = data.qimen_report || {}
  const hasQimenReport = Boolean(report && Object.keys(report).length)
  const reportM1 = report.m1_conclusion || {}
  const reportM2 = report.m2_basis || {}
  const reportM3 = report.m3_inference || {}
  const reportM4 = report.m4_guidance || {}
  const summary = data.summary || { title: '生成中...', conclusion: '暂无数据', score: 0 }
  const analysis = data.analysis || {}
  const advice = data.advice || { lucky_tips: {} }
  const question = data.question || ''
  const displayBlocks = data.display_blocks || null
  const chartData = data.qimen_data || data
  const palaces = chartData.palaces || []
  const pillars = chartData.pillars || {}
  const ju = chartData.ju_info || {}
  const ts = chartData.timestamp || {}
  const hasChart = palaces.length > 0

  const score = reportM1.score ?? summary.score ?? 0
  const vd = getVerdictInfo(score)
  const heroTone = score < 55 ? 'caution' : score < 75 ? 'neutral' : 'auspicious'
  const THEME = score < 55 ? '#C84A45' : score < 75 ? '#B58D3B' : '#0D9488'
  const THEME_DIM = score < 55 ? 'rgba(200,74,69,0.16)' : score < 75 ? 'rgba(181,141,59,0.17)' : 'rgba(13,148,136,0.15)'

  const scoreBasis = hasQimenReport && Object.keys(reportM3).length
    ? deriveScoreBasisFromM3(reportM3, data.backend_score_audit?.adjustments)
    : (data.summary?.score_basis || null)
  const strategyItems = reportM1.actions?.length ? reportM1.actions : (advice.strategy || [])
  const primaryStrategies = strategyItems.slice(0, 3)
  const domainView = data.domain_view
  const luckyTips = advice.lucky_tips || {}
  const dayStem = String(pillars.day || '').charAt(0)
  const hourStem = String(pillars.hour || '').charAt(0)
  const toneBadge = { positive: '顺', mixed: '参', warning: '慎' }
  const normalizeTone = (tone) => ['positive', 'mixed', 'warning'].includes(tone) ? tone : 'mixed'
  const formatSymbol = (label, symbol) => [label, symbol].filter(Boolean).join(' ')
  const findPalaceForSymbol = (symbol) => {
    const raw = String(symbol || '').replace(/^(日干|时干)\s*/, '').trim()
    if (!raw) return ''
    const hit = palaces.find(p => [p.sky, p.earth, p.door, p.star, p.god].some(v => v && String(v).includes(raw)))
    return hit?.name || ''
  }
  const toStr = (v, fb = '') => {
    const safe = typeof fb === 'string' ? fb : ''
    if (!v) return safe
    if (typeof v === 'string') return v || safe
    if (Array.isArray(v)) return v.filter(Boolean).join('、') || safe
    if (typeof v === 'object') return v.text || v.content || v.main || safe
    return safe
  }
  const buildReportCard = (card, fallback = {}) => {
    const tone = normalizeTone(card?.tone || fallback.tone)
    const mainText = toStr(card?.reading, '')
      || toStr(card?.decision, '')
      || toStr(card?.summary, '')
      || toStr(card?.verdict, fallback.verdict || '')
    const reasonText = toStr(card?.reason, '')
      || toStr(card?.evidence, fallback.evidence || '')
    return {
      key: card?.key || fallback.key || 'custom',
      label: toStr(card?.label, fallback.label || '关键判断'),
      symbol: toStr(card?.symbol, fallback.symbol || ''),
      palace: toStr(card?.palace, fallback.palace || findPalaceForSymbol(card?.symbol || fallback.symbol)),
      tone,
      badge: card?.badge || toneBadge[tone],
      verdict: mainText,
      evidence: reasonText
    }
  }
  const getFactorItems = state => (Array.isArray(state?.items) && state.items.length)
    ? state.items
    : (Array.isArray(state?.factors) ? state.factors : [])
  const renderFactorList = (items, toneClass) => {
    const normalized = items
      .map(item => ({
        name: toStr(item?.name || item?.label, ''),
        impact: toStr(item?.impact || item?.text || item?.reason, '')
      }))
      .filter(item => item.name || item.impact)
      .slice(0, 3)
    if (!normalized.length) return ''
    return `<div class="inference-factor-list ${toneClass}">
      ${normalized.map(item => `<div class="inference-factor-item">
        ${item.name ? `<span>${item.name}</span>` : ''}
        ${item.impact ? `<p>${item.impact}</p>` : ''}
      </div>`).join('')}
    </div>`
  }

  // ── 九宫格内部 HTML（无外层卡片盒）
  let panInnerHTML = ''
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
    panInnerHTML = `<div class="pan-wrapper"><div class="pan-header"><div class="pan-pillars">${[pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean).join('　')}</div><div class="pan-info">${ts.solar || ''} | ${ju.name || ''} · ${ju.jieqi || ''}<br>值符：<b>${ju.zhi_fu || '-'}</b>&emsp;值使：<b>${ju.zhi_shi || '-'}</b></div></div><div class="pan-grid">${cells}</div></div>`
  }

  // ── 格局吉凶
  const namedFormationHits = reportM2.formation_tags?.length
    ? reportM2.formation_tags.map(h => ({ signal: h.name, effect: h.effect, reason: h.reason, text: h.text, type: h.type }))
    : (data.backend_score_audit?.adjustments || []).filter(h => h.layer === 'named_formation')
  const formationTagsHTML = namedFormationHits.length
    ? `<div class="formation-tag-row" data-ge-reasons='${JSON.stringify(namedFormationHits.map(h => ({ name: h.signal || h.name, type: h.type || (String(h.effect).startsWith('+') ? 'ji' : 'xiong'), text: h.text || GE_DESCRIPTIONS[h.signal || h.name] || h.reason || '' })))}'>
        ${namedFormationHits.map(h => {
          const name = h.signal || h.name
          const isJi = (h.type || '').includes('ji') || String(h.effect).startsWith('+')
          return `<span class="ge-tag ${isJi ? 'ji' : 'xiong'}" data-ge-name="${name}"><span class="ge-dot"></span>${name}</span>`
        }).join('')}
      </div>`
    : `<p class="report-muted">未见足以改写主线的有名格。</p>`

  const domainCards = Array.isArray(domainView?.axes)
    ? domainView.axes.map((axis, index) => buildReportCard(axis, {
        key: index === 0 ? 'target' : index === 1 ? 'environment' : 'custom',
        label: axis.label,
        symbol: axis.symbol,
        tone: axis.tone,
        verdict: axis.verdict,
        evidence: axis.evidence
      }))
    : []
  const fallbackYongshenCards = [
    buildReportCard({}, {
      key: 'subject',
      label: '问测人状态',
      symbol: formatSymbol('日干', dayStem || '-'),
      tone: 'mixed',
      verdict: displayBlocks?.situation || analysis.tensor || '以日干落宫观察求测人当前承接力与行动状态。',
      evidence: analysis.yong_shen || '结合日干落宫的门、星、神、空亡与马星判断自身状态。'
    }),
    buildReportCard({}, {
      key: 'target',
      label: '目标事态',
      symbol: formatSymbol('时干', hourStem || '-'),
      tone: 'mixed',
      verdict: displayBlocks?.support || analysis.yong_shen || '以时干或领域主用神观察目标事态。',
      evidence: displayBlocks?.situation || analysis.yong_shen || '结合目标用神落宫与日时互动判断事情能否落地。'
    }),
    buildReportCard({}, {
      key: 'environment',
      label: '关键环境因素',
      symbol: ju.zhi_shi ? `值使 ${ju.zhi_shi}` : (ju.zhi_fu ? `值符 ${ju.zhi_fu}` : '值使门'),
      tone: displayBlocks?.risk ? 'warning' : 'mixed',
      verdict: displayBlocks?.risk || analysis.god_help || '观察流程、环境和现实阻力。',
      evidence: advice.risk || analysis.pattern || '结合值符、值使、格局、空亡和风险信号判断外部环境。'
    })
  ]
  const yongshenCards = (Array.isArray(reportM2.yongshen_cards) && reportM2.yongshen_cards.length)
    ? reportM2.yongshen_cards.map(card => buildReportCard(card))
    : (domainCards.length ? domainCards : fallbackYongshenCards)
  const yongshenCardsHTML = `<div class="yongshen-card-grid">
    ${yongshenCards.map(card => `<article class="yongshen-card tone-${card.tone}">
      <div class="yongshen-card-head">
        <span>${card.label}</span>
        <strong>${card.symbol || '-'}</strong>
      </div>
      <h4>${card.verdict || '暂无明确断语'}</h4>
      <p>${card.evidence || '暂无依据说明'}</p>
    </article>`).join('')}
  </div>`

  const relation = data.backend_score_audit?.relations?.[0]
  // 翻译层：subject / target / environment（新字段名，保留旧名作 fallback）
  const subjectState = reportM3.subject_state || reportM3.subject_day_stem_state || reportM3.self_state
  const targetState = reportM3.target_state || reportM3.target_yongshen_state
  const environmentState = reportM3.environment_state || null
  // 提炼层
  const supportState = reportM3.support_factors || reportM3.favorable_factors || null
  const constraintState = reportM3.constraint_factors || reportM3.constraints
  // 拍板层
  const interactionDecision = reportM3.interaction_decision || reportM3.interaction_verdict
  const interactionMainText = toStr(interactionDecision?.reading, '')
    || toStr(interactionDecision?.verdict, '')
    || toStr(interactionDecision?.decision, '')
    || toStr(interactionDecision?.reason, '')
    || toStr(interactionDecision?.evidence, '')
  const normalizedInteractionDecision = interactionDecision
    ? { ...interactionDecision, reading: interactionMainText }
    : null

  // macro 层文案用于 environment_state fallback
  const macroAdjustments = (data.backend_score_audit?.adjustments || []).filter(h => h.layer === 'macro')
  const macroReason = macroAdjustments.map(h => h.reason).filter(Boolean).join('；')

  const inferenceCards = [
    buildReportCard(subjectState, {
      key: 'self',
      label: '自身状态',
      symbol: formatSymbol('日干', dayStem || '-'),
      tone: 'mixed',
      verdict: displayBlocks?.situation || analysis.tensor || '日干落宫，判断求测人当前承接力与行动状态。',
      evidence: analysis.yong_shen || '需结合日干落宫的门、星、神、旺衰、空亡与马星综合判断。'
    }),
    buildReportCard(targetState, {
      key: 'target',
      label: '目标事态',
      symbol: formatSymbol('时干', hourStem || '-'),
      tone: 'mixed',
      verdict: displayBlocks?.support || analysis.yong_shen || '目标用神落宫，判断事情本身能量与实现可能。',
      evidence: domainView?.process?.evidence || analysis.yong_shen || '以时干或领域主用神观察目标事态的旺衰与空亡。'
    }),
    buildReportCard(normalizedInteractionDecision, {
      key: 'interaction',
      label: '生克决断',
      symbol: interactionDecision?.subject_symbol && interactionDecision?.target_symbol
        ? `${interactionDecision.subject_symbol} ↔ ${interactionDecision.target_symbol}`
        : '日干 ↔ 时干',
      tone: interactionDecision?.tone || (relation?.effect > 0 ? 'positive' : relation?.effect < 0 ? 'warning' : 'mixed'),
      verdict: relation?.reason || displayBlocks?.situation || '综合自身、目标与环境，给出五行生克的方向性结论。',
      evidence: relation?.reason || '若后端未给出明确生克关系，则以整体局势和用神强弱综合判断。'
    })
  ]

  // 环境制约：翻译层第三段，fallback 来自 macro 层和值使门
  const envTone = normalizeTone(environmentState?.tone || 'warning')
  const envVerdict = toStr(environmentState?.reading, '')
    || toStr(environmentState?.verdict, '')
    || macroReason
    || displayBlocks?.situation
    || '值使门与值符状态决定当前流程管道是否通畅。'
  const environmentCardHTML = `<article class="inference-card tone-${envTone}">
    <div class="inference-body">
      <div class="inference-head"><span>环境制约</span><strong>${toStr(environmentState?.symbol, '值使门')}</strong></div>
      <h4>${envVerdict}</h4>
    </div>
  </article>`

  // 有利因素：正向 fallback 来自正向格局命中或 scoreBasis.positive_signals
  const positiveFormationHits = namedFormationHits.filter(h => String(h.effect).startsWith('+') || (h.type || '').includes('ji'))
  const supportTone = normalizeTone(supportState?.tone || 'positive')
  const supportPrimary = toStr(supportState?.summary, '')
    || toStr(supportState?.primary_support, '')
    || toStr(supportState?.verdict, '')
    || toStr(displayBlocks?.support, '')
    || (scoreBasis?.positive_signals?.[0] || '')
    || '局面存在一定正向支撑，需结合用神旺相与格局综合判断。'
  const supportItems = getFactorItems(supportState)
  const supportFactorsHTML = renderFactorList(supportItems, 'positive')
  const rawSupportFactors = supportItems.length
    ? supportItems.map(f => f.name || f.label || '').filter(Boolean)
    : positiveFormationHits.map(h => h.signal || h.name).filter(Boolean)
  const supportTagsHTML = !supportFactorsHTML && rawSupportFactors.length
    ? `<div class="support-factors">${rawSupportFactors.map(name => `<span class="support-factor-tag">${name}</span>`).join('')}</div>`
    : ''
  const supportCardHTML = `<article class="inference-card inference-support tone-${supportTone}">
    <div class="inference-body">
      <div class="inference-head"><span>有利因素</span></div>
      <h4>${supportPrimary}</h4>
      ${supportFactorsHTML || supportTagsHTML}
    </div>
  </article>`

  // 不利因素：提炼层，支持 factors[] 多要素列表
  const constraintTone = normalizeTone(constraintState?.tone || 'warning')
  const constraintPrimaryRisk = toStr(constraintState?.summary, '') || toStr(constraintState?.primary_risk, '')
  const constraintVerdict = constraintPrimaryRisk || constraintState?.verdict || displayBlocks?.risk || advice.risk || '主要限制来自流程、空亡、凶格或现实条件。'
  const constraintItems = getFactorItems(constraintState)
  const constraintFactorsHTML = renderFactorList(constraintItems, 'warning')
  const rawFactors = constraintItems.length
    ? constraintItems.map(f => f.name || f.label || '').filter(Boolean)
    : namedFormationHits.map(h => h.signal || h.name).filter(Boolean)
  const factorsTagsHTML = !constraintFactorsHTML && rawFactors.length
    ? `<div class="constraint-factors">${rawFactors.map(name => `<span class="constraint-factor-tag">${name}</span>`).join('')}</div>`
    : ''
  const constraintCardHTML = `<article class="inference-card inference-constraint tone-${constraintTone}">
    <div class="inference-body">
      <div class="inference-head"><span>不利因素</span></div>
      <h4>${constraintVerdict}</h4>
      ${constraintFactorsHTML || factorsTagsHTML}
    </div>
  </article>`

  const inferenceHTML = `<div class="inference-flow">
    ${inferenceCards.slice(0, 2).map(card => `<article class="inference-card tone-${card.tone}">
      <div class="inference-body">
        <div class="inference-head"><span>${card.label}</span><strong>${card.symbol || '-'}</strong></div>
        <h4>${card.verdict || '暂无明确断语'}</h4>
      </div>
    </article>`).join('')}
    ${environmentCardHTML}
    ${supportCardHTML}
    ${constraintCardHTML}
    ${inferenceCards.slice(2).map(card => `<article class="inference-card tone-${card.tone}">
      <div class="inference-body">
        <div class="inference-head"><span>${card.label}</span><strong>${card.symbol || '-'}</strong></div>
        <h4>${card.verdict || '暂无明确断语'}</h4>
      </div>
    </article>`).join('')}
  </div>`

  const envGuide = reportM4.environment_fengshui || {}
  const timingGuide = reportM4.timing_behavior || {}
  const envDirection = envGuide.suitable_direction || envGuide.direction || luckyTips.direction || '暂无明确方位'
  const envDo = envGuide.do || envGuide.environment_advice || '优先选择信息更透明、沟通更顺畅的场景，不在压力和杂讯过重时强推。'
  const envAvoid = envGuide.avoid || envGuide.avoid_direction || ''
  const envReason = envGuide.reason || '依据用神宫位、值符值使与风险信号综合给出。'
  const timingWindow = timingGuide.window || timingGuide.best_window || luckyTips.time || '暂无明确窗口'
  const timingDo = timingGuide.do || timingGuide.action || luckyTips.action || '先观察再行动'
  const timingAvoid = timingGuide.avoid || timingGuide.avoid_action || ''
  const timingReason = timingGuide.reason || displayBlocks?.timing || analysis.dynamic_timing || '应期只代表启动和观察窗口，不代表结果必然落地。'
  const guidanceHTML = `<div class="guidance-grid">
    <article class="guidance-card">
      <div class="guidance-kicker">环境风水</div>
      <h4>${envDirection}</h4>
      <div class="guidance-rows">
        <div class="guidance-row"><span>宜</span><p>${envDo}</p></div>
        ${envAvoid ? `<div class="guidance-row warning"><span>避</span><p>${envAvoid}</p></div>` : ''}
        <div class="guidance-row muted"><span>据</span><p>${envReason}</p></div>
      </div>
    </article>
    <article class="guidance-card">
      <div class="guidance-kicker">时空行为</div>
      <h4>${timingWindow}</h4>
      <div class="guidance-rows">
        ${timingGuide.wait_until ? `<div class="guidance-row"><span>等</span><p>${timingGuide.wait_until}</p></div>` : ''}
        <div class="guidance-row"><span>行</span><p>${timingDo}</p></div>
        ${timingAvoid ? `<div class="guidance-row warning"><span>避</span><p>${timingAvoid}</p></div>` : ''}
        <div class="guidance-row muted"><span>据</span><p>${timingReason}</p></div>
      </div>
    </article>
  </div>`

  const magActionListHTML = primaryStrategies.length
    ? primaryStrategies.map((s, i) => `<div class="mag-action-item reveal" style="transition-delay:${i * 70}ms"><div class="mag-action-num">0${i + 1}</div><div class="mag-action-body">${s}</div></div>`).join('')
    : `<div class="mag-action-item"><div class="mag-action-num">01</div><div class="mag-action-body">${reportM1.conclusion || summary.conclusion}</div></div>`

  const tabClick = (id) => `var tabs=this.closest('.mag-tabs').querySelectorAll('.mag-tab');tabs.forEach(function(t){t.classList.remove('mag-tab-active')});this.classList.add('mag-tab-active');document.getElementById('${id}').scrollIntoView({behavior:'smooth',block:'start'})`

  return `<div class="mag-result tone-${heroTone}" style="--theme-color:${THEME};--theme-color-dim:${THEME_DIM};">
    <section class="mag-hero" id="mag-hero">
      <div class="mag-hero-panel">
        <div class="mag-score-inline"><strong id="vueScoreValue">${score}</strong><span>分</span></div>
        <div class="mag-hero-tags">
          <span class="mag-verdict-badge mag-verdict-${vd.cls}">${vd.label}</span>
          <span>${reportM1.keyword || summary.keyword || '本局总判'}</span>
        </div>
        <h1>${reportM1.title || summary.title || '本局断语'}</h1>
        <p>${reportM1.conclusion || summary.conclusion}</p>
      </div>
    </section>

    <nav class="mag-tabs">
      <button class="mag-tab mag-tab-active" onclick="${tabClick('mag-m1')}">结论先行</button>
      <button class="mag-tab" onclick="${tabClick('mag-m2')}">奇门定基</button>
      <button class="mag-tab" onclick="${tabClick('mag-m3')}">局象推演</button>
      <button class="mag-tab" onclick="${tabClick('mag-m4')}">开运指南</button>
    </nav>

    <section class="mag-section" id="mag-m1">
      <div class="module-heading"><h2>结论先行</h2></div>
      ${question ? `<blockquote class="mag-question">"${question}"</blockquote>` : ''}
      <div class="report-subtitle">行动建议</div>
      <div class="mag-action-list">${magActionListHTML}</div>
    </section>

    <section class="mag-section" id="mag-m2">
      <div class="module-heading"><h2>奇门定基</h2></div>
      ${panInnerHTML ? `<div class="mag-pan-block">${panInnerHTML}</div>` : ''}
      <div class="report-subtitle">格局吉凶</div>
      ${formationTagsHTML}
      <div class="report-subtitle">用神选取</div>
      ${yongshenCardsHTML}
    </section>

    <section class="mag-section" id="mag-m3">
      <div class="module-heading"><h2>局象推演</h2></div>
      ${inferenceHTML}
    </section>

    <section class="mag-section" id="mag-m4">
      <div class="module-heading"><h2>开运指南</h2></div>
      ${guidanceHTML}
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
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  background: rgba(247, 244, 238, 0.96);
  border-bottom: 1px solid var(--line);
}
#siteHeader.result-header {
  position: absolute;
  justify-content: flex-start;
  padding: 18px 24px;
  background: transparent;
  border-bottom: 0;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.hamburger { width: 38px; height: 38px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; cursor: pointer; border-radius: 10px; transition: background .2s; border: none; background: transparent; flex-shrink: 0; }
#siteHeader.result-header .hamburger { width: 34px; height: 34px; }
.hamburger span { display: block; width: 18px; height: 1.5px; background: var(--ink); border-radius: 2px; transition: all .35s var(--spring); transform-origin: center; }
.hamburger.open span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
.hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
.hamburger.open span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }

.site-logo { font-family: 'Noto Serif SC', serif; font-size: 17px; letter-spacing: .15em; font-weight: 500; color: var(--gold); position: relative; }

.header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

/* 抽屉 */
#historyDrawer { position: absolute; inset: 0; width: 100%; z-index: 1; display: flex; flex-direction: column; background: var(--paper); border-right: 1px solid var(--line); }
.drawer-head { padding: 26px 20px 18px; }
.drawer-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}
.drawer-brand {
  font-family: 'Noto Serif SC', serif;
  font-size: 17px;
  letter-spacing: .15em;
  font-weight: 500;
  color: var(--gold);
}
.drawer-close {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 999px;
  background: rgba(255,255,255,0.68);
  color: var(--ink);
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}
.drawer-new-session {
  width: 100%;
  min-height: 48px;
  margin: 0 0 22px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(255,255,255,0.58);
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 16px;
  letter-spacing: .08em;
  cursor: pointer;
}
.drawer-new-session span:last-child {
  color: var(--gold);
  font-family: var(--font-body);
  letter-spacing: 0;
}
.drawer-label { font-size: 10px; color: var(--text-muted); letter-spacing: .25em; margin-bottom: 4px; font-family: var(--font-serif); }
.drawer-title-txt { font-size: 20px; font-weight: 300; letter-spacing: .05em; color: var(--ink); }
.drawer-filter { padding: 12px 16px 14px; }
.filter-select-label { display: none; }
.filter-select-wrap { position: relative; width: 100%; }
.filter-select {
  width: 100%;
  height: 38px;
  appearance: none;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: white;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 13px;
  line-height: 38px;
  padding: 0 38px 0 13px;
  outline: none;
  cursor: pointer;
  transition: border-color .2s, background .2s, box-shadow .2s;
}
.filter-select:focus {
  border-color: var(--gold-border);
  box-shadow: 0 0 0 3px var(--gold-dim);
}
.filter-select-arrow {
  position: absolute;
  right: 13px;
  top: 50%;
  transform: translateY(-53%);
  color: var(--gold-light);
  font-size: 16px;
  pointer-events: none;
}
.drawer-body { flex: 1; overflow-y: auto; padding: 8px 0; }
.drawer-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; gap: 14px; text-align: center; color: var(--text-muted); font-size: 12px; }
.d-hist-item { padding: 13px 20px; display: flex; align-items: center; gap: 10px; cursor: pointer; border-bottom: 1px solid var(--line); transition: background .2s; }
.d-hist-item:hover { background: var(--paper-soft); }
.d-hist-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.d-hist-dot.ji { background: var(--teal); box-shadow: 0 0 6px var(--teal); }
.d-hist-dot.xiong { background: var(--crimson); box-shadow: 0 0 6px var(--crimson); }
.d-hist-dot.ping { background: var(--gold); box-shadow: 0 0 6px var(--gold-dim); }
.d-hist-info { flex: 1; overflow: hidden; }
.d-hist-q { font-family: var(--font-serif); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
.d-hist-meta { font-family: var(--font-serif); font-size: 10px; color: var(--text-muted); display: flex; gap: 8px; align-items: center; }
.d-hist-badge { font-family: var(--font-serif); font-size: 10px; padding: 2px 7px; border-radius: 20px; flex-shrink: 0; border: 1px solid; }

/* 页面 */
.page-wrap { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; padding: 76px 24px 72px; overflow-x: visible !important; }
.result-page-wrap { padding-top: 0; padding-left: 0; padding-right: 0; }
.container { width: 100%; max-width: 520px; }
.public-landing-container {
  max-width: 1040px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 420px);
  gap: 28px 34px;
  align-items: start;
}
.seo-landing {
  min-height: 500px;
  padding: 50px 18px 42px 0;
  border-bottom: 1px solid var(--line);
}
.seo-landing h1 {
  margin: 0;
  color: var(--gold);
  font-family: var(--font-serif);
  font-size: 48px;
  font-weight: 600;
  line-height: 1.16;
  letter-spacing: 0;
  max-width: 9em;
}
.seo-lead {
  margin: 22px 0 0;
  color: var(--ink-muted);
  font-size: 16px;
  line-height: 1.8;
  max-width: 34em;
}
.seo-proof {
  margin-top: 18px;
  color: var(--gold);
  font-size: 14px;
  line-height: 1.6;
}
.seo-entry-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 34px;
}
.seo-entry {
  display: block;
  min-height: 118px;
  padding: 16px 15px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: white;
  text-decoration: none;
  transition: border-color .2s, background .2s, transform .2s;
}
.seo-entry:hover {
  border-color: var(--gold-border);
  background: var(--paper-soft);
  transform: translateY(-1px);
}
.seo-entry span {
  display: block;
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}
.seo-entry small {
  display: block;
  margin-top: 10px;
  color: var(--ink-muted);
  font-size: 12px;
  line-height: 1.6;
}
.public-landing-container .auth-landing-wrap {
  margin-top: 24px;
}
.seo-faq-section {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
  gap: 28px;
  margin-top: 10px;
  padding-top: 32px;
  border-top: 1px solid var(--line);
}
.seo-faq-head h2 {
  margin: 0;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0;
}
.seo-faq-head p {
  margin: 10px 0 0;
  color: var(--ink-muted);
  font-size: 13px;
  line-height: 1.7;
}
.seo-faq-list {
  display: grid;
  gap: 10px;
}
.seo-faq-section details {
  border: 1px solid var(--line);
  border-radius: 10px;
  background: white;
  padding: 14px 16px;
}
.seo-faq-section summary {
  color: var(--ink);
  cursor: pointer;
  font-size: 13px;
  line-height: 1.5;
  list-style-position: outside;
}
.seo-faq-section p {
  margin: 10px 0 0;
  color: var(--ink-muted);
  font-size: 12px;
  line-height: 1.7;
}
.tagline { text-align: center; padding: 20px 0 12px; }
.tagline-main { font-family: var(--font-serif); font-size: 13px; font-weight: 300; letter-spacing: .3em; color: var(--text-muted); margin-bottom: 6px; }
.tagline-sub { font-size: 11px; letter-spacing: .18em; color: var(--text-dim); }

@media(max-width:920px) {
  .page-wrap { padding: 76px 18px 60px; }
  .result-page-wrap { padding-top: 0; padding-left: 0; padding-right: 0; }
  .public-landing-container {
    max-width: 520px;
    display: flex;
    flex-direction: column;
  }
  .mobile-auth-first { order: 1; }
  .seo-landing { order: 2; }
  .seo-faq-section { order: 3; }
  .seo-landing {
    min-height: 0;
    margin-bottom: 18px;
    padding: 24px 22px;
    border: 1px solid var(--line);
    border-radius: 18px;
    background: white;
    box-shadow: 0 1px 6px rgba(0,0,0,.06);
  }
  .seo-landing h1 {
    max-width: none;
    font-size: 30px;
    line-height: 1.28;
  }
  .seo-lead {
    margin-top: 12px;
    font-size: 14px;
  }
  .seo-proof {
    margin-top: 12px;
    font-size: 13px;
  }
  .seo-entry-grid {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-top: 18px;
  }
  .seo-entry {
    min-height: 0;
    padding: 13px 14px;
    border-radius: 12px;
  }
  .seo-entry small {
    margin-top: 4px;
  }
  .public-landing-container .auth-landing-wrap {
    margin-top: 0;
  }
  .seo-faq-section {
    display: block;
    margin-top: 18px;
    padding-top: 22px;
  }
  .seo-faq-head h2 {
    font-size: 20px;
  }
  .seo-faq-list {
    margin-top: 14px;
  }
}

@media(max-width:760px) {
  .seo-landing,
  .seo-faq-section {
    display: none;
  }
  .auth-landing-wrap {
    min-height: calc(100svh - 136px);
  }
  .auth-btns {
    margin-top: auto;
    padding-bottom: max(20px, env(safe-area-inset-bottom));
  }
  .auth-taiji-wrap {
    display: block;
  }
}

.glass-card, .input-box {
  background: var(--bg-card); border: 1px solid var(--line);
  border-radius: var(--radius-card);
  box-shadow: 0 1px 6px rgba(0,0,0,0.06);
  position: relative; overflow: hidden;
}
.input-box { display: flex; flex-direction: column; gap: 14px; margin-bottom: 16px; animation: riseIn 1s .15s cubic-bezier(.22,1,.36,1) both; }
.input-card { padding: 22px; margin-bottom: 16px; }
.input-label { font-family: var(--font-serif); font-size: 11px; letter-spacing: .2em; color: var(--text-muted); margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
.input-label::before, .input-label::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(212,175,55,0.2), transparent); }
.route-info-trigger { width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; border: 1px solid rgba(232,204,128,0.42); background: rgba(232,204,128,0.08); color: var(--gold-light); font-size: 11px; font-family: var(--font-display); font-weight: 700; line-height: 1; cursor: pointer; transition: border-color .2s, background .2s, color .2s; flex-shrink: 0; letter-spacing: 0; }
.route-info-trigger:hover { border-color: rgba(232,204,128,0.8); background: rgba(232,204,128,0.16); color: #fff; }
textarea { width: 100%; min-height: 130px; background: var(--paper-soft); border: 1px solid var(--line); border-radius: var(--radius-item); padding: 16px; color: var(--ink); font-family: 'Noto Serif SC', serif; font-size: 15px; line-height: 1.8; resize: none; outline: none; transition: all .4s; }
textarea:focus { border-color: var(--gold-border); box-shadow: 0 0 0 2px var(--gold-dim); }
.time-row { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; }
.time-display { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 7px; }
.time-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--teal); box-shadow: 0 0 6px var(--teal); animation: pulse-dot 2s infinite; }
.time-note { font-size: 11px; color: var(--text-muted); font-family: 'Noto Serif SC', serif; }

.cta-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 16px; }
.cta-btn { width: 100%; height: 60px; border: none; outline: none; cursor: pointer; border-radius: 18px; position: relative; overflow: hidden; background: linear-gradient(135deg, #8B6914 0%, #D4AF37 35%, #E8CC80 55%, #D4AF37 75%, #8B6914 100%); background-size: 200% 100%; animation: shimmer 3s ease-in-out infinite; box-shadow: 0 4px 20px rgba(212,175,55,0.3); transition: transform .2s; }
.cta-btn:active { transform: scale(0.98); }
.cta-btn:disabled { opacity: 0.5; animation: none; cursor: not-allowed; }
.cta-inner { display: flex; align-items: center; justify-content: center; gap: 10px; height: 100%; }
.cta-text { font-family: 'Noto Serif SC', serif; font-size: 17px; font-weight: 500; color: #1a1000; letter-spacing: .15em; }
.cta-hint { font-size: 11px; color: rgba(255,255,255,0.2); }

.auth-landing-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
  animation: riseIn .7s cubic-bezier(.22,1,.36,1) both;
}
.auth-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 260px;
  padding-bottom: 36px;
  overflow: hidden;
}
.hero-scatter { position: absolute; inset: 0; pointer-events: none; user-select: none; }
.hs { position: absolute; font-family: var(--font-serif); line-height: 1; }
.hs.e1 { top: 14%; left: 10%; font-size: 32px; color: rgba(181,141,59,0.22); transform: rotate(-6deg); }
.hs.e2 { top: 6%; right: 14%; font-size: 20px; color: rgba(181,141,59,0.13); transform: rotate(10deg); }
.hs.e3 { top: 46%; right: 7%; font-size: 13px; color: rgba(181,141,59,0.28); letter-spacing: 0; }
.hs.e4 { top: 28%; left: 52%; font-size: 16px; color: rgba(181,141,59,0.10); transform: rotate(4deg); }
.hs.e5 { top: 60%; left: 5%; font-size: 11px; color: rgba(181,141,59,0.16); }
.auth-taiji-wrap {
  display: none;
  position: absolute;
  top: 16px;
  right: 8px;
  width: 128px;
  height: 128px;
  opacity: .46;
  pointer-events: none;
}
.auth-taiji-svg {
  width: 100%;
  height: 100%;
  animation: auth-taiji-spin 22s linear infinite;
}
@keyframes auth-taiji-spin {
  to { transform: rotate(360deg); }
}
.hero-brand { position: relative; }
.hero-label {
  margin-bottom: 10px;
  color: var(--ink-dim);
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 10px;
  letter-spacing: .32em;
}
.hero-name {
  margin: 0;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 54px;
  font-weight: 700;
  letter-spacing: .06em;
  line-height: 1.05;
}
.hero-sub {
  margin: 14px 0 0;
  color: var(--ink-muted);
  font-family: var(--font-serif);
  font-size: 16px;
  line-height: 1.5;
}
.hero-sub em { font-style: normal; color: var(--gold); }
.auth-btns {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
}
.abtn {
  width: 100%;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: none;
  border-radius: 4px;
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: .03em;
  cursor: pointer;
  transition: opacity .18s, transform .15s, background .18s, border-color .18s;
}
.abtn:active { transform: scale(.983); }
.abtn:disabled { opacity: .5; cursor: not-allowed; }
.abtn--solid {
  background: var(--ink);
  color: var(--paper);
  font-family: var(--font-serif);
  letter-spacing: .08em;
}
.abtn--solid:not(:disabled):hover { background: #000; }
.abtn--border {
  background: transparent;
  border: 1px solid var(--line);
  color: var(--ink);
}
.abtn--border:not(:disabled):hover { border-color: var(--gold-border); background: rgba(181,141,59,0.06); }
.abtn--ghost {
  background: transparent;
  border: 1px solid rgba(11,11,11,.08);
  color: var(--ink-muted);
}
.abtn--ghost:hover { border-color: var(--line); color: var(--ink); }
.abtn-divider {
  padding: 2px 0;
  color: var(--ink-dim);
  font-size: 12px;
  letter-spacing: .04em;
  text-align: center;
}
.abtn-text {
  padding: 4px;
  border: none;
  background: none;
  color: var(--ink-muted);
  font-family: var(--font-body);
  font-size: 14px;
  text-align: center;
  cursor: pointer;
  transition: color .18s;
}
.abtn-text:hover { color: var(--ink); }
.auth-legal {
  margin: 2px 0 0;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.6;
  text-align: center;
}
.auth-legal a { color: var(--gold); text-decoration: none; }
.auth-legal a:hover { color: var(--gold-light); }
.google-mark { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex: 0 0 22px; border-radius: 6px; background: rgba(255,255,255,.96); }
.google-mark svg { width: 15px; height: 15px; display: block; }
.auth-form-pg {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding-top: 4px;
  animation: riseIn .45s cubic-bezier(.22,1,.36,1) both;
}
.auth-back {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 5px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--ink-muted);
  font-family: var(--font-body);
  font-size: 13px;
  cursor: pointer;
  transition: color .18s;
}
.auth-back:hover { color: var(--ink); }
.afm-title {
  margin: 0;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 36px;
  font-weight: 600;
  letter-spacing: .04em;
}
.afm-fields { display: flex; flex-direction: column; gap: 0; }
.afm-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
  transition: border-color .2s;
}
.afm-field:focus-within { border-bottom-color: var(--gold-border); }
.afm-field span {
  color: var(--text-muted);
  font-size: 10px;
  letter-spacing: .18em;
}
input[type="email"], input[type="password"] {
  width: 100%;
  min-height: 48px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 13px 15px;
  color: var(--ink);
  font-size: 15px;
  outline: none;
  transition: border-color .2s, box-shadow .2s, background .2s;
}
input[type="email"]:focus, input[type="password"]:focus {
  border-color: var(--gold-border);
  box-shadow: 0 0 0 3px var(--gold-dim);
}
.afm-field input[type="email"],
.afm-field input[type="password"] {
  min-height: auto !important;
  padding: 4px 0 !important;
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: var(--ink) !important;
  font-size: 17px !important;
}
input::placeholder { color: var(--text-muted); }
.afm-sub { display: flex; justify-content: flex-start; }
.forgot-password-link {
  border: none;
  background: transparent;
  color: var(--gold);
  font-family: var(--font-body);
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
  padding: 0;
  text-align: left;
  text-decoration: none;
}
.forgot-password-link:disabled { opacity: 0.6; cursor: not-allowed; }
.forgot-password-link:hover { color: var(--gold-light); }
.auth-notice { padding: 10px 12px; border-radius: 12px; background: rgba(13,148,136,0.06); border: 1px solid rgba(13,148,136,0.2); color: var(--ink-muted); font-size: 12px; line-height: 1.6; text-align: center; }

.qimen-profile-panel { position: relative; z-index: 42; padding: 14px 16px; overflow: visible; margin-bottom: 16px; }
.profile-switcher { position: relative; z-index: 60; }
.profile-switch-trigger {
  width: 100%;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--paper-soft);
  color: var(--ink);
  cursor: pointer;
}
.profile-switch-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-serif); font-size: 24px; letter-spacing: 1px; line-height: 1; }
.profile-switch-symbol { color: var(--gold); font-size: 24px; line-height: 1; opacity: .92; }
.profile-switcher.open .profile-switch-trigger { border-color: var(--gold-border); box-shadow: 0 0 0 3px var(--gold-dim); }
.profile-flyout { position: absolute; top: calc(100% + 10px); left: 0; right: 0; z-index: 120; padding: 8px; border-radius: 16px; background: white; border: 1px solid var(--line); box-shadow: 0 12px 36px rgba(0,0,0,.12); }
.profile-flyout-item { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 12px; padding: 12px 14px; border: none; border-radius: 12px; background: transparent; color: var(--text-primary); cursor: pointer; text-align: left; }
.profile-flyout-item + .profile-flyout-item { margin-top: 4px; }
.profile-flyout-item.active { background: rgba(212,175,55,0.1); box-shadow: inset 0 0 0 1px rgba(212,175,55,0.18); }
.profile-item-main { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; font-weight: 600; }
.profile-item-date { color: #FF5E57; font-size: 12px; white-space: nowrap; }
.profile-item-meta { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.add-bazi-profile-btn {
  width: 100%;
  min-height: 56px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--paper-soft);
  color: var(--gold);
  cursor: pointer;
  font-family: var(--font-serif);
  font-size: 22px;
  letter-spacing: 1px;
}
.add-bazi-profile-btn:hover { border-color: var(--gold-border); box-shadow: 0 0 0 3px var(--gold-dim); }

/* ── SSE Loader ── */
#loader { display: flex; flex-direction: column; align-items: center; gap: 18px; padding: 28px 0 20px; }
.bagua-ring-wrap { position: relative; width: 96px; height: 96px; }
.bagua-ring-wrap::before { content:''; position:absolute; inset:-8px; border-radius:50%; background:radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 65%); animation: glow-pulse 4s ease-in-out infinite; pointer-events:none; }
@keyframes glow-pulse { 0%,100% { opacity:.6; transform:scale(1); } 50% { opacity:1; transform:scale(1.18); } }
.bagua-svg { width:100%; height:100%; filter:drop-shadow(0 0 14px rgba(212,175,55,0.15)); }
.bagua-wheel { animation: wheel-spin 22s linear infinite; transform-origin: 60px 60px; }
.bagua-inner-g { animation: wheel-spin-rev 14s linear infinite; transform-origin: 60px 60px; }
@keyframes wheel-spin     { to { transform: rotate(360deg); } }
@keyframes wheel-spin-rev { to { transform: rotate(-360deg); } }

.loader-branch-badge { font-family:var(--font-serif); font-size:9.5px; letter-spacing:.18em; color:var(--gold-light); background:rgba(212,175,55,0.09); border:1px solid rgba(212,175,55,0.2); border-radius:20px; padding:2px 10px; opacity:0; transform:translateY(3px); transition:opacity .4s, transform .4s; pointer-events:none; }
.loader-branch-badge.visible { opacity:1; transform:translateY(0); }

/* Timeline */
.sse-timeline { position:relative; width:100%; padding-left:24px; }
.sse-spine { position:absolute; left:7px; top:8px; bottom:8px; width:1px; background:var(--line); border-radius:1px; overflow:hidden; }
.sse-spine-fill { position:absolute; top:0; left:0; width:100%; background:linear-gradient(to bottom, var(--gold), rgba(212,175,55,0.35)); border-radius:1px; transition:height .7s cubic-bezier(0.4,0,0.2,1); }

.sse-step { position:relative; margin-bottom:16px; animation:sse-step-in .45s cubic-bezier(0.4,0,0.2,1) both; }
.sse-step:last-child { margin-bottom:0; }
@keyframes sse-step-in { from { opacity:0; transform:translateX(-7px); } to { opacity:1; transform:translateX(0); } }
.sse-step:nth-child(1){animation-delay:.04s}.sse-step:nth-child(2){animation-delay:.10s}.sse-step:nth-child(3){animation-delay:.16s}
.sse-step:nth-child(4){animation-delay:.22s}.sse-step:nth-child(5){animation-delay:.28s}.sse-step:nth-child(6){animation-delay:.34s}
.sse-step:nth-child(7){animation-delay:.40s}

/* Dot */
.sse-dot { position:absolute; left:-20px; top:3px; width:13px; height:13px; border-radius:50%; display:flex; align-items:center; justify-content:center; transition:all .35s cubic-bezier(0.4,0,0.2,1); }
.sse-step.pending .sse-dot { background:var(--paper-soft); border:1px solid var(--line); }
.sse-step.pending .sse-dot::after { content:''; width:4px; height:4px; border-radius:50%; background:var(--line); }
.sse-step.done .sse-dot { background:var(--gold-dim); border:1px solid var(--gold-border); }
.sse-step.done .sse-dot::after { content:'✓'; font-size:7px; color:var(--gold-light); line-height:1; }
.sse-step.active .sse-dot { background:rgba(212,175,55,0.18); border:1.5px solid var(--gold); box-shadow:0 0 0 3px rgba(212,175,55,0.09),0 0 11px rgba(212,175,55,0.28); animation:sse-dot-pulse 2.2s ease-in-out infinite; }
.sse-step.active .sse-dot::after { content:''; width:5px; height:5px; border-radius:50%; background:var(--gold); box-shadow:0 0 5px var(--gold); }
.sse-step.active .sse-dot::before { content:''; position:absolute; inset:-5px; border-radius:50%; border:1px solid rgba(212,175,55,0.28); animation:sse-pulse-ring 2.2s ease-out infinite; }
@keyframes sse-dot-pulse { 0%,100%{box-shadow:0 0 0 3px rgba(212,175,55,0.09),0 0 11px rgba(212,175,55,0.28);} 50%{box-shadow:0 0 0 5px rgba(212,175,55,0.14),0 0 18px rgba(212,175,55,0.44);} }
@keyframes sse-pulse-ring { 0%{opacity:.7;transform:scale(1);} 100%{opacity:0;transform:scale(2.2);} }

/* Step text */
.sse-step-name { font-family:var(--font-serif); font-size:12.5px; letter-spacing:.04em; line-height:1.4; transition:color .3s,font-size .3s; }
.sse-step-tag  { font-family:var(--font-body); font-size:10px; letter-spacing:.07em; transition:color .3s; }
.sse-step.pending .sse-step-name { color:var(--text-muted); opacity:.5; }
.sse-step.pending .sse-step-tag  { color:var(--text-muted); opacity:.35; }
.sse-step.done    .sse-step-name { color:var(--gold); }
.sse-step.done    .sse-step-tag  { color:rgba(181,141,59,.5); }
.sse-step.active  .sse-step-name { color:var(--ink); font-size:13px; }
.sse-step.active  .sse-step-tag  { color:var(--ink-muted); }

/* Detail + typing dots */
.sse-step-detail { font-size:10.5px; color:var(--text-muted); margin-top:2px; max-height:0; overflow:hidden; opacity:0; transition:max-height .35s cubic-bezier(0.4,0,0.2,1),opacity .35s; }
.sse-step.active .sse-step-detail { max-height:32px; opacity:1; }
.sse-typing-dots::after { content:'·'; animation:sse-dots3 1.5s steps(3,end) infinite; }
@keyframes sse-dots3 { 0%{content:'·';} 33%{content:'··';} 66%{content:'···';} }

/* Chip */
.sse-chip { display:inline-flex; align-items:center; gap:4px; margin-top:4px; padding:2px 8px; background:rgba(212,175,55,0.07); border:1px solid rgba(212,175,55,0.17); border-radius:20px; opacity:0; transform:translateY(3px); transition:opacity .4s .08s,transform .4s .08s; }
.sse-step.done .sse-chip { opacity:1; transform:translateY(0); }
.sse-chip-main { font-family:var(--font-serif); font-size:10px; color:var(--gold-light); letter-spacing:.05em; }
.sse-chip-sep { width:2px; height:2px; border-radius:50%; background:rgba(212,175,55,.32); flex-shrink:0; }
.sse-chip-sub  { font-family:var(--font-body); font-size:9.5px; color:var(--text-muted); opacity:.82; }

/* Progress row */
.sse-progress-row { width:100%; display:flex; align-items:center; gap:10px; }
.sse-progress-track { flex:1; height:1.5px; background:var(--line); border-radius:2px; overflow:hidden; }
.sse-progress-fill { height:100%; background:linear-gradient(90deg,var(--gold),var(--gold-light)); border-radius:2px; box-shadow:0 0 5px rgba(212,175,55,.32); transition:width .7s cubic-bezier(0.4,0,0.2,1); }
.sse-progress-pct { font-family:var(--font-serif); font-size:10.5px; color:rgba(212,175,55,.52); letter-spacing:.04em; min-width:28px; text-align:right; }

.result-actions { display: grid; grid-template-columns: minmax(0,1fr) auto auto; gap: 10px; margin-top: 16px; align-items: center; }
.reset-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 50px; background: white; border: 1px solid var(--line); border-radius: 14px; color: var(--text-muted); font-size: 13px; cursor: pointer; transition: border-color .2s, background .2s, color .2s; }
.reset-btn:hover { border-color: var(--gold-border); color: var(--ink); }
.result-save-img-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  min-width: 76px; height: 50px; padding: 0 14px;
  border-radius: 14px;
  border: 1px solid rgba(107,140,255,0.3);
  background: rgba(107,140,255,0.07);
  color: rgba(170,185,255,0.9);
  font-size: 13px; cursor: pointer;
  transition: border-color .2s, background .2s, color .2s, transform .15s;
  flex-shrink: 0;
}
.result-save-img-btn:hover { border-color: rgba(107,140,255,0.55); background: rgba(107,140,255,0.14); color: #fff; }
.result-save-img-btn:active { transform: scale(0.96); }
.result-save-img-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.result-save-img-btn.saving { color: rgba(170,185,255,0.7); }
@keyframes spin { to { transform: rotate(360deg); } }
.spin-icon { animation: spin 0.8s linear infinite; }
.result-feedback-btn { min-width: 76px; height: 50px; padding: 0 14px; border-radius: 14px; border: 1px solid rgba(232,204,128,0.28); background: rgba(212,175,55,0.07); color: var(--gold-light); font-size: 13px; cursor: pointer; transition: border-color .2s, background .2s, color .2s; flex-shrink: 0; }
.result-feedback-btn:hover { border-color: rgba(232,204,128,0.52); background: rgba(212,175,55,0.13); }
.result-feedback-btn.done { color: rgba(78,205,196,0.9); border-color: rgba(78,205,196,0.28); background: rgba(78,205,196,0.06); }

:deep(.bazi-result-stack) { --bazi-line: var(--line); --bazi-ink: var(--ink-muted); }
:deep(.bazi-summary-module) { border-color: var(--gold-border); background: var(--gold-dim); }
:deep(.bazi-mode-card) { border-color: var(--line); background: var(--paper-soft); }
:deep(.bazi-meta-row) { display:flex; flex-wrap:wrap; gap:7px; margin:8px 0 12px; }
:deep(.bazi-meta-row span) { padding:4px 8px; border-radius:8px; border:1px solid var(--line); color:var(--ink-muted); font-size:10px; letter-spacing:.08em; text-transform:uppercase; }
:deep(.bazi-level-chip),
:deep(.bazi-score-chip) { min-width:76px; height:76px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-direction:column; border:1px solid var(--line); color:var(--gold); background:var(--gold-dim); font-family:var(--font-serif); font-size:26px; line-height:1; flex:0 0 auto; }
:deep(.bazi-score-chip span) { margin-top:5px; font-family:var(--font-body); font-size:11px; color:var(--text-muted); }
:deep(.bazi-level-chip.level-strong) { color:#0d9488; border-color:rgba(13,148,136,0.3); background:rgba(13,148,136,0.08); }
:deep(.bazi-level-chip.level-medium) { color:var(--gold); border-color:var(--gold-border); }
:deep(.bazi-level-chip.level-weak)   { color:#d97706; border-color:rgba(217,119,6,0.3); background:rgba(217,119,6,0.07); }
:deep(.bazi-level-chip.level-mixed)  { color:#7c3aed; border-color:rgba(124,58,237,0.3); background:rgba(124,58,237,0.07); }
:deep(.bazi-level-chip.level-unknown){ color:var(--text-muted); border-color:var(--line); }
:deep(.bazi-card-copy),
:deep(.bazi-logic) { margin:0; color:var(--ink-muted); font-size:14px; line-height:1.78; overflow-wrap:anywhere; }
:deep(.bazi-basis-summary) { margin:0 0 10px; color:var(--ink-muted); font-size:14px; line-height:1.75; overflow-wrap:anywhere; }
:deep(.bazi-signal-list),
:deep(.bazi-evidence-list) { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
:deep(.bazi-signal-list span),
:deep(.bazi-evidence-list span) { padding:7px 9px; border-radius:8px; border:1px solid var(--line); background:var(--paper-soft); color:var(--ink-muted); font-size:12px; line-height:1.45; overflow-wrap:anywhere; }
:deep(.bazi-signal-list.positive span) { border-color:rgba(13,148,136,0.2); background:rgba(13,148,136,0.06); color:#0d9488; }
:deep(.bazi-signal-list.warning span) { border-color:rgba(217,119,6,0.2); background:rgba(217,119,6,0.06); color:#d97706; }
:deep(.bazi-foundation-group) { margin-top:10px; }
:deep(.foundation-group-label) { color:var(--text-muted); font-size:11px; letter-spacing:1px; margin-bottom:6px; }
:deep(.bazi-foundation-group .bazi-signal-list),
:deep(.bazi-foundation-group .bazi-evidence-list) { margin-top:0; }
:deep(.bazi-dynamic-grid) { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
:deep(.bazi-dynamic-grid div) { min-width:0; padding:12px; border-radius:10px; background:var(--paper-soft); border:1px solid var(--line); }
:deep(.bazi-dynamic-grid span) { display:block; color:var(--text-muted); font-size:10px; margin-bottom:5px; }
:deep(.bazi-dynamic-grid strong) { color:var(--gold); font-size:15px; }
:deep(.bazi-dynamic-grid p) { margin:7px 0 0; color:var(--ink-muted); font-size:12px; line-height:1.55; overflow-wrap:anywhere; }
:deep(.bazi-timing-window-list) { display:grid; gap:10px; }
:deep(.bazi-timing-window-card) { padding:12px; border-radius:10px; border:1px solid var(--line); background:var(--paper-soft); }
:deep(.bazi-window-top) { display:flex; justify-content:space-between; gap:10px; align-items:center; margin-bottom:8px; }
:deep(.bazi-window-top strong) { color:var(--gold); font-size:15px; }
:deep(.bazi-window-top span) { color:var(--ink-muted); font-size:11px; }
:deep(.bazi-timing-window-card p) { margin:0; color:var(--ink-muted); font-size:13px; line-height:1.62; }
:deep(.bazi-window-meta) { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
:deep(.bazi-window-meta span) { color:var(--text-muted); font-size:11px; }
:deep(.bazi-reading-block) { margin:8px 0; padding:8px 12px; background:var(--paper-soft); border-left:2px solid var(--gold-border); border-radius:0 6px 6px 0; }
:deep(.bazi-reading-block.warning) { border-left-color:rgba(217,119,6,0.5); background:rgba(217,119,6,0.04); }
:deep(.bazi-reading-block .reading-label) { font-size:11px; color:var(--text-muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px; }
:deep(.bazi-reading-block p) { margin:0; color:var(--ink-muted); font-size:14px; line-height:1.78; overflow-wrap:anywhere; }
:deep(.bazi-advice-extra) { display:grid; gap:8px; margin-top:10px; }
:deep(.bazi-advice-rows) { display:grid; gap:6px; margin-top:8px; }
:deep(.bazi-advice-row) { display:grid; grid-template-columns:72px minmax(0,1fr); gap:10px; align-items:start; padding:7px 0; border-top:1px solid var(--line); }
:deep(.bazi-advice-row:first-child) { border-top:0; }
:deep(.advice-row-label) { color:var(--text-muted); font-size:12px; line-height:1.7; white-space:nowrap; }
:deep(.advice-row-text) { color:var(--ink-muted); font-size:14px; line-height:1.7; overflow-wrap:anywhere; }
:deep(.bazi-advice-row.tone-warning .advice-row-label) { color:#d97706; }
:deep(.bazi-advice-row.tone-positive .advice-row-label) { color:#0d9488; }
:deep(.bazi-timing-meta) { display:grid; gap:8px; margin-bottom:12px; padding:10px 12px; border-radius:10px; background:var(--paper-soft); border:1px solid var(--line); }
:deep(.timing-best) { color:#0d9488; font-size:13px; line-height:1.6; }
:deep(.timing-avoid) { color:#d97706; font-size:13px; line-height:1.6; }
:deep(.timing-disclaimer) { color:var(--text-muted); font-size:11px; line-height:1.5; }
:deep(.bazi-capacity-row) { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
:deep(.capacity-label) { font-size:11px; color:var(--text-muted); }
:deep(.capacity-level) { font-size:14px; font-family:var(--font-serif); color:var(--gold); }
:deep(.capacity-level.level-strong) { color:#0d9488; }
:deep(.capacity-level.level-weak) { color:#d97706; }
:deep(.capacity-level.level-mixed) { color:#7c3aed; }
.backing-identity {
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px dashed rgba(212,175,55,0.2);
}
.backing-section-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--gold);
  text-transform: uppercase;
  margin-bottom: 8px;
}
.backing-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}
.backing-name {
  font-family: var(--font-serif);
  font-size: 18px;
  color: var(--gold);
  letter-spacing: 2px;
  font-weight: bold;
}
.backing-meta {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.6;
}
.backing-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  letter-spacing: 0.5px;
}
.badge-blue {
  background: rgba(59,130,246,0.08);
  color: #2563eb;
  border: 1px solid rgba(59,130,246,0.22);
}
.badge-gold {
  background: var(--gold-dim);
  color: var(--gold);
  border: 1px solid var(--gold-border);
}
:deep(.bazi-portrait-block) { padding:12px; border-radius:10px; border:1px solid var(--line); background:var(--paper-soft); margin-top:10px; }
:deep(.portrait-label) { font-size:11px; color:var(--text-muted); margin-bottom:6px; display:flex; align-items:center; gap:6px; }
:deep(.confidence-badge) { font-size:9px; padding:2px 5px; border-radius:4px; background:var(--paper-soft); color:var(--ink-muted); border:1px solid var(--line); }
:deep(.bazi-portrait-block p) { margin:0; color:var(--ink-muted); font-size:14px; line-height:1.74; overflow-wrap:anywhere; }
:deep(.bazi-disclaimer) { font-size:11px; color:var(--text-muted); font-style:italic; margin-top:8px; line-height:1.6; }
:deep(.bazi-timing-window-card.quality-strong) { border-color:rgba(13,148,136,0.28); background:rgba(13,148,136,0.04); }
:deep(.bazi-timing-window-card.quality-medium) { border-color:var(--gold-border); }
:deep(.bazi-timing-window-card.quality-weak)   { border-color:var(--line); }
:deep(.major-window-badge) { font-size:10px; padding:2px 6px; border-radius:6px; background:var(--gold-dim); color:var(--gold); margin-left:6px; }

/* 分享图弹窗 */
.share-img-overlay {
  position: fixed; inset: 0; z-index: 99999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.82);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  opacity: 0; pointer-events: none;
  transition: opacity .25s ease;
  padding: 16px;
}
.share-img-overlay.show { opacity: 1; pointer-events: auto; }
.share-img-modal {
  width: min(460px, 100%);
  max-height: 90dvh;
  display: flex; flex-direction: column;
  background: white;
  border: 1px solid var(--line);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0,0,0,.18);
  transform: translateY(12px) scale(0.98);
  transition: transform .28s cubic-bezier(.22,1,.36,1);
}
.share-img-overlay.show .share-img-modal { transform: none; }
.share-img-header {
  display: flex; align-items: center; gap: 10px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.share-img-kicker { font-size: 9px; color: var(--text-muted); letter-spacing: .2em; }
.share-img-title { flex: 1; font-family: var(--font-serif); font-size: 15px; color: var(--gold); }
.share-img-close {
  width: 30px; height: 30px; border-radius: 50%;
  border: 1px solid var(--line);
  background: var(--paper-soft);
  color: var(--text-muted); font-size: 20px; line-height: 1;
  cursor: pointer; transition: color .2s, background .2s;
}
.share-img-close:hover { color: var(--ink); background: var(--paper-soft); }
.share-img-body {
  flex: 1; overflow-y: auto;
  padding: 14px;
  display: flex; align-items: flex-start; justify-content: center;
}
.share-img-preview {
  width: 100%; border-radius: 10px;
  display: block;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  -webkit-user-select: none;
  user-select: none;
}


@media(max-width:380px) {
  .result-actions { grid-template-columns: 1fr 1fr; }
  .reset-btn { grid-column: 1 / -1; }
  .result-save-img-btn, .result-feedback-btn { width: 100%; }
}

.feedback-overlay { position: fixed; inset: 0; z-index: 9998; display: flex; justify-content: flex-end; background: rgba(0,0,0,0.55); opacity: 0; pointer-events: none; transition: opacity .25s ease; }
.feedback-overlay.show { opacity: 1; pointer-events: auto; }
.feedback-drawer { width: min(420px, 92vw); height: 100%; padding: 24px 22px; overflow-y: auto; background: white; border-left: 1px solid var(--line); box-shadow: -8px 0 24px rgba(0,0,0,.12); transform: translateX(18px); transition: transform .28s var(--ease); }
.feedback-overlay.show .feedback-drawer { transform: translateX(0); }
.feedback-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.feedback-kicker { font-size: 10px; color: var(--text-muted); letter-spacing: .22em; margin-bottom: 7px; }
.feedback-head h3 { margin: 0; font-family: var(--font-serif); font-size: 18px; font-weight: 500; color: var(--gold); line-height: 1.35; }
.feedback-close { flex: 0 0 auto; width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--line); background: var(--paper-soft); color: var(--text-muted); font-size: 22px; line-height: 1; cursor: pointer; }
.feedback-summary { padding: 14px 15px; border: 1px solid var(--gold-border); border-radius: 14px; background: var(--gold-dim); margin-bottom: 18px; }
.feedback-question { font-size: 14px; color: var(--ink); line-height: 1.65; overflow-wrap: anywhere; }
.feedback-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; font-size: 10px; color: var(--text-muted); }
.feedback-conclusion { margin: 11px 0 0; padding-top: 11px; border-top: 1px solid var(--line); color: var(--gold); font-size: 13px; line-height: 1.65; }
.feedback-form { display: flex; flex-direction: column; gap: 18px; }
.feedback-field { display: flex; flex-direction: column; gap: 10px; }
.feedback-label { display: flex; align-items: center; justify-content: space-between; color: var(--ink); font-size: 12px; letter-spacing: .08em; }
.feedback-label span { color: var(--text-muted); font-size: 10px; letter-spacing: 0; }
.feedback-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.feedback-option { min-height: 40px; padding: 9px 10px; border-radius: 12px; border: 1px solid var(--line); background: white; color: var(--ink-muted); font-size: 13px; cursor: pointer; transition: border-color .2s, background .2s, color .2s; }
.feedback-option.active { border-color: var(--gold-border); background: var(--gold-dim); color: var(--gold); }
.feedback-note { min-height: 98px; padding: 12px 13px; border-radius: 12px; font-family: var(--font-body); font-size: 13px; line-height: 1.7; }
.feedback-actions { display: grid; grid-template-columns: 1fr 1.4fr; gap: 10px; margin-top: 22px; }
.feedback-secondary, .feedback-primary { min-height: 44px; border-radius: 12px; font-size: 14px; cursor: pointer; }
.feedback-secondary { border: 1px solid var(--line); background: var(--paper-soft); color: var(--text-muted); }
.feedback-primary { border: none; background: linear-gradient(135deg, #c9a44e 0%, #9d7a2f 100%); color: white; font-weight: 700; }
.feedback-primary:disabled { opacity: .55; cursor: not-allowed; }

@media(max-width:560px) {
  .page-wrap {
    width: 100%;
    max-width: 100%;
    padding: 76px 14px 54px;
    overflow-x: hidden;
    box-sizing: border-box;
  }
  .result-page-wrap { padding-top: 0; padding-left: 0; padding-right: 0; }
  .public-landing-container {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
  .mobile-auth-first {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
  .seo-landing {
    display: none;
  }
  .seo-faq-section {
    display: none;
  }
  .feedback-overlay { align-items: flex-end; justify-content: center; }
  .feedback-drawer { width: 100%; height: auto; max-height: 88vh; border-left: none; border-top: 1px solid var(--gold-border); border-radius: 20px 20px 0 0; transform: translateY(24px); }
  .feedback-overlay.show .feedback-drawer { transform: translateY(0); }
  .auth-hero { min-height: 220px; padding-bottom: 28px; }
  .auth-taiji-wrap { display: block; }
  .hero-name { font-size: 44px; }
  .afm-title { font-size: 32px; }
  .qimen-profile-panel { padding: 12px 14px; }
  .profile-switch-trigger,
  .add-bazi-profile-btn { min-height: 52px; }
  .profile-switch-name { font-size: 20px; }
  .profile-switch-symbol { font-size: 21px; }
  .profile-flyout-item { grid-template-columns: minmax(0, 1fr) auto auto; gap: 8px; padding: 11px 12px; }
  .profile-item-date,
  .profile-item-meta { font-size: 11px; }
}

.route-info-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.58); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); z-index: 9999; display: none; align-items: center; justify-content: center; padding: 20px; opacity: 0; transition: opacity .25s; }
.route-info-overlay.show { display: flex; opacity: 1; }
.route-info-card { width: min(420px, 100%); background: white; border: 1px solid var(--line); border-radius: 18px; padding: 20px; box-shadow: 0 12px 40px rgba(0,0,0,.15); }
.route-info-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid var(--line); color: var(--gold); font-family: var(--font-serif); font-size: 15px; }
.route-info-close { border: none; background: transparent; color: var(--text-muted); font-size: 22px; line-height: 1; cursor: pointer; padding: 0 2px; }
.route-info-close:hover { color: var(--gold); }
.route-info-grid { display: flex; flex-direction: column; gap: 10px; }
.route-info-row { display: grid; grid-template-columns: 58px minmax(0, 1fr); gap: 12px; padding: 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--paper-soft); }
.route-tool { color: var(--gold); font-weight: 700; font-size: 13px; letter-spacing: 1px; }
.route-focus { color: var(--ink); font-size: 13px; font-weight: 700; margin-bottom: 4px; }
.route-info-row p { margin: 0; color: var(--ink-muted); font-size: 12px; line-height: 1.55; }
.route-info-note { margin-top: 12px; padding: 11px 12px; border-left: 3px solid var(--gold); border-radius: 10px; background: var(--gold-dim); color: var(--ink-muted); font-size: 12px; line-height: 1.55; }

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
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 6px rgba(0,0,0,.06);
}
:deep(.summary-module) { display:flex; flex-direction:column; gap:12px; }
:deep(.summary-top) { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:14px; align-items:start; }
:deep(.summary-main) { min-width:0; display:flex; flex-direction:column; gap:10px; }
:deep(.summary-title) { font-size:12px; color:var(--text-muted); letter-spacing:2px; }
:deep(.summary-score-bubble) {
  min-width:84px;
  display:flex; align-items:flex-end; justify-content:center; gap:3px;
  padding:12px 12px 10px; line-height:1;
  background:var(--paper-soft);
  border:1px solid var(--line);
  border-radius:18px;
}
:deep(.score) {
  color:var(--theme-color,#b58d3b); font-family:var(--font-serif); font-weight:700; font-size:42px; letter-spacing:0;
}
:deep(.score-unit) { color:var(--gold); font-family:var(--font-serif); font-size:18px; line-height:1.2; }
:deep(.summary-judgement) { display:flex; flex-direction:column; align-items:flex-start; gap:10px; min-width:0; }
:deep(.verdict-badge) { display:inline-flex; font-family:var(--font-serif); font-size:14px; padding:4px 13px; border-radius:999px; letter-spacing:.08em; border:1px solid; }
:deep(.verdict-da-ji) { color:#00D26A; background:rgba(0,210,106,0.06); border-color:rgba(0,210,106,0.2); text-shadow:0 0 14px rgba(0,210,106,0.35); }
:deep(.verdict-xiao-ji) { color:var(--teal); background:rgba(78,205,196,0.06); border-color:rgba(78,205,196,0.2); }
:deep(.verdict-ping) { color:var(--gold-light); background:rgba(212,175,55,0.06); border-color:rgba(212,175,55,0.2); }
:deep(.verdict-da-xiong) { color:var(--crimson); background:rgba(255,94,87,0.06); border-color:rgba(255,94,87,0.2); }
:deep(.conclusion) { font-family:var(--font-serif); font-size:23px; color:var(--ink); line-height:1.5; letter-spacing:0; }
:deep(.keyword-highlight) {
  display:flex;
  align-items:center;
  gap:10px;
  width:fit-content;
  max-width:100%;
  padding:8px 12px;
  border-radius:12px;
  background:var(--paper-soft);
  border:1px solid var(--line);
  box-shadow:0 0 18px var(--theme-color-dim,rgba(179,139,54,0.12));
  line-height:1.55;
}
:deep(.keyword-label) {
  flex-shrink:0;
  font-size:10px;
  color:var(--gold);
  letter-spacing:1.4px;
}
:deep(.keyword-text) {
  font-size:13px;
  color:var(--ink-muted);
  overflow-wrap:anywhere;
}
:deep(.question-bubble) {
  width:100%;
  padding:12px 14px;
  background:var(--paper-soft);
  border:1px solid var(--line);
  border-radius:14px;
  box-sizing:border-box;
}
:deep(.question-text) { font-size:14px; color:var(--ink-muted); font-style:normal; line-height:1.7; overflow-wrap:anywhere; }
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
:deep(.action-step) { min-width:0; padding:13px 13px 14px; border-radius:14px; background:var(--paper-soft); border:1px solid var(--line); }
:deep(.action-index) { font-family:var(--font-serif); font-size:20px; color:var(--gold); margin-bottom:8px; }
:deep(.action-copy) { font-size:13px; color:var(--ink-muted); line-height:1.65; overflow-wrap:anywhere; }
/* 领域判断 */
:deep(.domain-view-module) { border-color:var(--line); background:var(--bg-card); }
:deep(.domain-axis-grid) { display:grid; grid-template-columns:repeat(auto-fit,minmax(148px,1fr)); gap:10px; }
:deep(.domain-axis-card) { position:relative; min-width:0; min-height:148px; padding:13px 13px 34px; border-radius:12px; background:var(--paper-soft); border:1px solid var(--line); overflow:hidden; overflow-wrap:anywhere; }
:deep(.domain-axis-card::before) { content:''; position:absolute; inset:0 auto 0 0; width:3px; background:var(--gold); opacity:.75; }
:deep(.domain-axis-card.tone-positive::before) { background:#0d9488; }
:deep(.domain-axis-card.tone-warning::before) { background:#dc2626; }
:deep(.domain-axis-top) { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:10px; }
:deep(.domain-axis-label) { font-size:11px; color:var(--text-muted); letter-spacing:1.2px; }
:deep(.domain-axis-symbol) { flex-shrink:0; font-family:var(--font-serif); font-size:15px; color:var(--gold); }
:deep(.domain-axis-verdict) { font-size:13px; color:var(--ink); line-height:1.55; margin-bottom:8px; }
:deep(.domain-axis-evidence) { font-size:12px; color:var(--ink-muted); line-height:1.6; }
:deep(.domain-axis-tone) { position:absolute; right:10px; bottom:9px; width:24px; height:24px; border-radius:50%; display:grid; place-items:center; font-size:11px; color:white; background:var(--gold); font-weight:700; }
:deep(.domain-axis-card.tone-positive .domain-axis-tone) { background:#0d9488; }
:deep(.domain-axis-card.tone-warning .domain-axis-tone) { background:#dc2626; }
:deep(.domain-section-grid) { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px; margin-top:10px; }
:deep(.domain-mini-card) { min-width:0; padding:12px 13px; border-radius:12px; background:var(--paper-soft); border:1px solid var(--line); overflow-wrap:anywhere; }
:deep(.domain-mini-label) { display:flex; justify-content:space-between; gap:8px; margin-bottom:8px; font-size:11px; color:var(--gold); letter-spacing:1px; }
:deep(.domain-mini-label span) { color:var(--text-muted); letter-spacing:0; text-align:right; }
:deep(.domain-mini-body) { font-size:13px; color:var(--ink-muted); line-height:1.65; }
:deep(.domain-mini-evidence) { margin-top:7px; font-size:12px; color:var(--text-muted); line-height:1.55; }
:deep(.domain-decision) { display:grid; gap:8px; margin-top:10px; }
:deep(.domain-decision div) { display:flex; gap:9px; align-items:flex-start; padding:10px 12px; border-radius:10px; background:var(--paper-soft); color:var(--ink-muted); font-size:13px; line-height:1.65; overflow-wrap:anywhere; }
:deep(.domain-decision span) { flex:0 0 auto; width:22px; height:22px; border-radius:50%; display:grid; place-items:center; background:var(--gold-dim); color:var(--gold); font-size:11px; font-weight:700; }
/* 九宫格 — 浅色古籍风格 */
:deep(.pan-wrapper) { background:transparent; border:0; border-radius:0; padding:0; position:relative; overflow:visible; }
:deep(.pan-header) { text-align:center; margin-bottom:12px; }
:deep(.pan-pillars) { font-family:var(--font-body); font-size:14px; font-weight:600; color:var(--ink); letter-spacing:.08em; margin-bottom:5px; }
:deep(.pan-info) { font-size:11px; color:var(--text-muted); line-height:1.75; }
:deep(.pan-info b) { color:var(--gold); font-weight:600; }
:deep(.pan-grid) { display:grid; grid-template-columns:repeat(3,1fr); gap:0; background:var(--line); border-radius:0; overflow:hidden; border:1px solid var(--line); }
:deep(.pan-cell) { background:var(--paper); aspect-ratio:1; position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; transition:background .2s; border-right:1px solid var(--line); border-bottom:1px solid var(--line); }
:deep(.pan-cell:nth-child(3n)) { border-right:none; }
:deep(.pan-cell:nth-child(n+7)) { border-bottom:none; }
:deep(.pan-cell:hover) { background:var(--paper-soft); }
:deep(.pan-center-earth) { font-size:30px; font-weight:900; color:rgba(11,11,11,0.1); font-family:'Noto Serif SC',serif; }
:deep(.pan-god) { position:absolute; top:5px; font-size:11px; color:var(--text-muted); font-family:'Noto Serif SC',serif; }
:deep(.pan-star) { font-size:13px; color:var(--ink-muted); margin-bottom:1px; z-index:2; font-family:'Noto Serif SC',serif; }
:deep(.pan-door) { font-size:16px; font-weight:700; color:var(--ink); z-index:2; font-family:'Noto Serif SC',serif; }
:deep(.pan-stem) { position:absolute; font-size:12px; font-weight:600; font-family:'Noto Serif SC',serif; }
:deep(.stem-sky) { top:5px; left:6px; color:var(--ink); }
:deep(.stem-earth) { bottom:5px; right:6px; color:var(--ink-muted); }
:deep(.ji-sky) { top:18px; left:6px; font-size:8px; color:var(--text-muted); }
:deep(.ji-earth) { bottom:18px; right:6px; font-size:8px; color:var(--text-muted); }
:deep(.pan-marks) { position:absolute; bottom:4px; left:4px; display:flex; gap:2px; z-index:3; }
:deep(.pan-mark) { font-size:8px; padding:1px 3px; border-radius:3px; font-weight:700; }
:deep(.mark-ma) { background:var(--gold); color:white; }
:deep(.mark-kong) { border:1px solid var(--line); color:var(--text-muted); background:var(--paper-soft); }
:deep(.highlight-text) { color:var(--gold) !important; }
/* 单列洞察条 */
:deep(.insight-flow) { display:flex; flex-direction:column; gap:10px; }
:deep(.insight-strip) { position:relative; padding:14px 16px 14px 18px; background:var(--paper-soft); border:1px solid var(--line); border-radius:12px; border-left:3px solid var(--line); transition:border-color .3s, transform .25s; }
:deep(.insight-strip:hover) { transform:translateY(-1px); box-shadow:0 2px 12px rgba(0,0,0,.06); }
:deep(.insight-strip-label) { font-size:10px; color:var(--text-muted); letter-spacing:1.5px; text-transform:uppercase; margin-bottom:8px; font-weight:500; }
:deep(.insight-strip-body) { font-size:13px; color:var(--ink-muted); line-height:1.75; }
:deep(.accent-theme) { border-left-color:var(--gold); }
:deep(.accent-theme .insight-strip-label) { color:var(--gold); }
:deep(.accent-amber) { border-left-color:#d97706; }
:deep(.accent-amber .insight-strip-label) { color:#d97706; }
:deep(.accent-indigo) { border-left-color:#4f46e5; }
:deep(.accent-indigo .insight-strip-label) { color:#4f46e5; }
:deep(.accent-gold) { border-left-color:var(--gold); }
:deep(.accent-gold .insight-strip-label) { color:var(--gold); }
:deep(.accent-violet) { border-left-color:#7c3aed; }
:deep(.accent-violet .insight-strip-label) { color:#7c3aed; }
:deep(.accent-teal) { border-left-color:var(--teal); }
:deep(.accent-teal .insight-strip-label) { color:var(--teal); }
:deep(.accent-neutral) { border-left-color:var(--line); }
/* 评分依据 */
:deep(.score-basis-body) { display:flex; flex-direction:column; gap:10px; margin-top:4px; }
:deep(.sb-row) { display:flex; flex-direction:column; gap:6px; }
:deep(.sb-row-title) { font-size:9px; color:var(--text-muted); font-weight:600; letter-spacing:1.5px; }
:deep(.sb-tags) { display:flex; flex-wrap:wrap; gap:6px; }
:deep(.sb-tag) { font-size:11px; padding:3px 10px; border-radius:20px; font-weight:500; transition:transform .2s; }
:deep(.sb-tag:hover) { transform:scale(1.05); }
:deep(.sb-tag.positive) { background:rgba(13,148,136,0.08); color:#0d9488; border:1px solid rgba(13,148,136,0.2); }
:deep(.sb-tag.negative) { background:rgba(220,38,38,0.07); color:#dc2626; border:1px solid rgba(220,38,38,0.18); }
:deep(.sb-logic) { font-size:12px; color:var(--ink-muted); line-height:1.7; padding:10px 12px; background:var(--paper-soft); border-radius:8px; border-left:2px solid var(--gold-border); }
:deep(.accent-ge) { border-left-color:var(--gold-border); }
:deep(.accent-ge .insight-strip-label) { color:var(--gold); }
:deep(.ge-tags-row) { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
:deep(.ge-tag) { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:500; cursor:pointer; white-space:nowrap; user-select:none; transition:transform .2s; }
:deep(.ge-tag:hover) { transform:scale(1.05); }
:deep(.ge-tag.ji) { background:var(--gold-dim); border:1px solid var(--gold-border); color:var(--gold); }
:deep(.ge-tag.xiong) { background:rgba(220,38,38,0.07); border:1px solid rgba(220,38,38,0.2); color:#dc2626; }
:deep(.ge-dot) { width:5px; height:5px; border-radius:50%; flex-shrink:0; }
:deep(.ge-tag.ji .ge-dot) { background:var(--gold); }
:deep(.ge-tag.xiong .ge-dot) { background:#dc2626; }
/* 有名格 modal */
:global(.ge-overlay) {
  position:fixed; inset:0; z-index:9998;
  background:rgba(0,0,0,0.35);
  backdrop-filter:blur(4px);
  opacity:0; pointer-events:none;
  transition:opacity .2s ease;
}
:global(.ge-overlay.visible) { opacity:1; pointer-events:auto; }
:global(.ge-modal) {
  position:fixed; z-index:9999;
  top:50%; left:50%;
  transform:translate(-50%,-46%) scale(0.96);
  background:rgba(247,244,238,0.98);
  border:1px solid rgba(58,45,28,0.14);
  border-radius:8px;
  padding:20px 22px 22px;
  width:min(340px, calc(100vw - 48px));
  box-shadow:0 16px 42px rgba(42,31,17,.18);
  opacity:0; pointer-events:none;
  transition:opacity .2s ease, transform .25s cubic-bezier(0.34,1.56,0.64,1);
}
:global(.ge-modal.visible) { opacity:1; pointer-events:auto; transform:translate(-50%,-50%) scale(1); }
:global(.ge-modal-close) {
  position:absolute; top:12px; right:14px;
  width:26px; height:26px; padding:0;
  background:none; border:none;
  color:var(--text-muted, #777b80); font-size:15px;
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  transition:color .15s;
}
:global(.ge-modal-close:hover) { color:var(--ink, #0b0b0b); }
:global(.ge-pop-kicker) {
  color:var(--text-muted, #777b80);
  font-size:11px;
  font-weight:700;
  letter-spacing:.12em;
  margin-bottom:8px;
}
:global(.ge-pop-name) { font-family:var(--font-display); font-size:22px; line-height:1.25; font-weight:850; letter-spacing:0; margin-bottom:9px; padding-right:24px; }
:global(.ge-pop-name.ji) { color:#0d9488; }
:global(.ge-pop-name.xiong) { color:#dc2626; }
:global(.ge-pop-divider) { height:1px; background:var(--line, rgba(11,11,11,.12)); margin:12px 0 14px; }
:global(.ge-pop-text) { font-size:14px; line-height:1.8; color:var(--ink-muted, #55595d); font-family:var(--font-body); }
/* 策略与风险 */
:deep(.strategy-list) { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px; }
:deep(.strategy-list li) { position:relative; padding:12px 14px 12px 36px; background:var(--paper-soft); border:1px solid var(--line); border-radius:10px; color:var(--ink-muted); font-size:13px; line-height:1.7; transition:border-color .25s,background .25s; }
:deep(.strategy-list li:hover) { border-color:var(--gold-border); }
:deep(.strategy-list li)::before { content:"\2726"; position:absolute; left:14px; top:13px; color:var(--gold); font-size:10px; }
:deep(.risk-alert) { background:rgba(220,38,38,0.04); border:1px solid rgba(220,38,38,0.15); border-left:3px solid #dc2626; border-radius:10px; padding:14px 16px; }
:deep(.risk-alert-content) { color:var(--ink-muted); font-size:13px; line-height:1.7; }
/* 底部吉运 */
:deep(.footer) { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
:deep(.f-item) { min-width:0; display:flex; flex-direction:column; gap:6px; padding:12px; border-radius:12px; background:var(--paper-soft); border:1px solid var(--line); }
:deep(.f-label) { font-size:10px; color:var(--text-muted); letter-spacing:1px; }
:deep(.f-text) { font-size:12px; font-weight:600; color:var(--gold); line-height:1.5; overflow-wrap:anywhere; }
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

/* ══ 奇门报告：总判 Hero + M1-M4 ══ */
:deep(.mag-result) {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
  font-family: var(--font-body);
  color: var(--ink);
}

:deep(.mag-hero) {
  position: relative;
  min-height: min(44svh, 430px);
  display: flex;
  align-items: flex-end;
  overflow: visible;
  background:
    radial-gradient(circle at 86% 12%, var(--theme-color-dim), transparent 34%),
    linear-gradient(180deg, rgba(255,255,255,0.64), rgba(247,244,238,0.98));
}
:deep(.tone-auspicious .mag-hero) {
  background:
    radial-gradient(circle at 86% 12%, rgba(13,148,136,0.18), transparent 34%),
    linear-gradient(180deg, rgba(238,250,247,0.68), rgba(247,244,238,0.98));
}
:deep(.tone-neutral .mag-hero) {
  background:
    radial-gradient(circle at 86% 12%, rgba(181,141,59,0.2), transparent 34%),
    linear-gradient(180deg, rgba(252,246,231,0.72), rgba(247,244,238,0.98));
}
:deep(.tone-caution .mag-hero) {
  background:
    radial-gradient(circle at 86% 12%, rgba(200,74,69,0.18), transparent 34%),
    linear-gradient(180deg, rgba(255,241,238,0.72), rgba(247,244,238,0.98));
}
:deep(.mag-hero-panel) {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  width: 100%;
  min-width: 0;
  padding: clamp(34px, 6vw, 60px) clamp(22px, 6vw, 54px) clamp(24px, 5vw, 44px);
}
:deep(.mag-hero-tags) {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
  color: var(--ink-dim);
  font-size: 13px;
  line-height: 1.4;
}
:deep(.mag-verdict-badge) {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 13px;
  border: 1px solid;
  border-radius: 999px;
  font-family: var(--font-serif);
  font-size: 13px;
  font-weight: 650;
  letter-spacing: 0.06em;
  white-space: nowrap;
}
:deep(.mag-verdict-ji)    { color: #0d9488; background: rgba(13,148,136,0.08); border-color: rgba(13,148,136,0.25); }
:deep(.mag-verdict-da-ji) { color: #047857; background: rgba(5,150,105,0.08); border-color: rgba(5,150,105,0.24); }
:deep(.mag-verdict-ping)  { color: #9a6f1f; background: rgba(181,141,59,0.11); border-color: rgba(181,141,59,0.28); }
:deep(.mag-verdict-warn)  { color: #b45309; background: rgba(217,119,6,0.08); border-color: rgba(217,119,6,0.22); }
:deep(.mag-verdict-xiong) { color: #b91c1c; background: rgba(220,38,38,0.07); border-color: rgba(220,38,38,0.22); }
:deep(.mag-hero-panel h1) {
  margin: 0;
  max-width: 12em;
  font-family: var(--font-display);
  font-size: clamp(30px, 5.5vw, 60px);
  line-height: 1.08;
  font-weight: 850;
  letter-spacing: 0;
  color: var(--ink);
  overflow-wrap: anywhere;
}
:deep(.mag-hero-panel p) {
  max-width: 36em;
  margin: 14px 0 0;
  color: var(--ink-muted);
  font-size: clamp(14px, 1.8vw, 17px);
  line-height: 1.68;
  overflow-wrap: anywhere;
}
:deep(.mag-score-inline) {
  position: absolute;
  top: clamp(22px, 5vw, 42px);
  right: clamp(22px, 6vw, 54px);
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  width: fit-content;
  margin-top: 0;
  color: var(--theme-color);
}
:deep(.mag-score-inline strong) {
  font-family: var(--font-display);
  font-size: clamp(36px, 7vw, 64px);
  line-height: 0.9;
  font-weight: 900;
}
:deep(.mag-score-inline span) {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink-dim);
}

:deep(.mag-tabs) {
  position: sticky;
  top: 66px;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  gap: 20px;
  overflow-x: auto;
  padding: 14px 0 10px;
  border-bottom: 1px solid var(--line);
  background: rgba(247,244,238,0.96);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  margin-bottom: 4px;
  scrollbar-width: none;
}
.result-page-wrap :deep(.mag-tabs) {
  top: 0;
  padding-left: 16px;
  padding-right: 16px;
}
:deep(.mag-tabs::-webkit-scrollbar) { display: none; }
:deep(.mag-tab) {
  border: 0;
  background: transparent;
  padding: 0 0 8px;
  color: var(--ink-dim);
  font-family: var(--font-display);
  font-size: clamp(20px, 6vw, 28px);
  font-weight: 850;
  line-height: 1;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
  white-space: nowrap;
}
:deep(.mag-tab-active) {
  color: var(--ink);
}
:deep(.mag-tab-active::after) {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--ink);
  border-radius: 1px;
}

:deep(.mag-section) {
  scroll-margin-top: 130px;
  padding-top: 24px;
}
.result-page-wrap :deep(.mag-section) {
  scroll-margin-top: 60px;
  padding-left: 16px;
  padding-right: 16px;
}
/* Fix 2: hero 面板水平 padding 与 tabs/sections 对齐 */
.result-page-wrap :deep(.mag-hero-panel) {
  padding-left: 16px;
  padding-right: 16px;
}
.result-page-wrap :deep(.mag-score-inline) {
  right: 16px;
}
/* result-actions 也需要和内容对齐 */
.result-page-wrap .result-actions {
  padding-left: 16px;
  padding-right: 16px;
}
:deep(.mag-section + .mag-section) {
  border-top: 1px solid var(--line);
  margin-top: 24px;
  padding-top: 28px;
}
:deep(.module-heading) {
  display: flex;
  align-items: baseline;
  margin-bottom: 20px;
}
:deep(.module-heading h2) {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(18px, 4.6vw, 22px);
  line-height: 1.2;
  font-weight: 850;
  letter-spacing: 0;
}
:deep(.mag-question) {
  margin: 0 0 16px;
  padding: 14px 16px;
  border-left: 3px solid var(--theme-color);
  border-radius: 0 8px 8px 0;
  background: var(--theme-color-dim);
  color: var(--ink-muted);
  font-size: 14px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
:deep(.mag-action-list) {
  display: flex;
  flex-direction: column;
  gap: 0;
}
:deep(.mag-action-item) {
  display: grid;
  grid-template-columns: 38px minmax(0,1fr);
  gap: 14px;
  align-items: start;
  padding: 16px 0;
  border-bottom: 1px solid var(--line);
}
:deep(.mag-action-item:last-child) {
  border-bottom: 0;
}
:deep(.mag-action-num) {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ink);
  color: white;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 900;
}
:deep(.mag-action-body) {
  color: var(--ink-muted);
  font-size: 14.5px;
  line-height: 1.75;
  padding-top: 8px;
  overflow-wrap: anywhere;
}
:deep(.report-evidence-block) {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
:deep(.report-subtitle) {
  margin: 22px 0 12px;
  color: var(--ink);
  font-family: var(--font-display);
  font-size: clamp(16px, 4vw, 20px);
  line-height: 1.25;
  font-weight: 850;
  letter-spacing: 0;
}
:deep(.report-muted) {
  margin: 0;
  color: var(--ink-dim);
  font-size: 13px;
  line-height: 1.6;
}
:deep(.score-basis-body) {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
:deep(.sb-row-title) {
  margin-bottom: 8px;
  color: var(--ink-dim);
  font-size: 12px;
  font-weight: 700;
}
:deep(.sb-tags) {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
:deep(.sb-tag) {
  display: inline-flex;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1.25;
}
:deep(.sb-tag.positive) { color: #0d9488; background: rgba(13,148,136,0.09); }
:deep(.sb-tag.negative) { color: #b91c1c; background: rgba(220,38,38,0.07); }
:deep(.sb-logic) {
  color: var(--ink-muted);
  font-size: 13px;
  line-height: 1.65;
}

:deep(.chart-meta-grid) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 24px;
  border-top: 1px solid var(--line);
}
:deep(.chart-meta-grid > div) {
  min-height: auto;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}
:deep(.chart-meta-grid span) {
  display: block;
  margin-bottom: 7px;
  color: var(--ink-dim);
  font-size: 11px;
  font-weight: 700;
}
:deep(.chart-meta-grid strong) {
  display: block;
  color: var(--ink);
  font-size: 14px;
  line-height: 1.5;
  font-weight: 700;
  overflow-wrap: anywhere;
}
:deep(.mag-pan-block) {
  margin: 14px 0 6px;
}
:deep(.formation-tag-row) {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
:deep(.ge-tag) {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  padding: 5px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(255,255,255,0.52);
  color: var(--ink-muted);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: color .18s, opacity .18s;
}
:deep(.ge-tag:hover) {
  opacity: .78;
}
:deep(.ge-dot) {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
:deep(.ge-tag.ji) { color: #0d9488; border-color: rgba(13,148,136,0.24); background: rgba(13,148,136,0.06); }
:deep(.ge-tag.xiong) { color: #b91c1c; border-color: rgba(220,38,38,0.22); background: rgba(220,38,38,0.055); }

:deep(.yongshen-card-grid) {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-top: 1px solid var(--line);
}
:deep(.yongshen-card),
:deep(.inference-card),
:deep(.guidance-card) {
  overflow-wrap: anywhere;
}
:deep(.yongshen-card) {
  position: relative;
  min-height: auto;
  padding: 14px 0 16px;
  border-bottom: 1px solid var(--line);
  overflow: hidden;
}
:deep(.yongshen-card-head) {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: var(--ink-dim);
  font-size: 13px;
}
:deep(.yongshen-card-head strong) {
  color: var(--theme-color);
  font-size: 19px;
  white-space: nowrap;
}
:deep(.yongshen-card h4),
:deep(.inference-card h4),
:deep(.guidance-card h4) {
  margin: 14px 0 9px;
  color: var(--ink);
  font-size: 18px;
  line-height: 1.42;
  font-weight: 750;
}
:deep(.yongshen-card p),
:deep(.inference-card p),
:deep(.guidance-card p),
:deep(.guidance-card small) {
  margin: 0;
  color: var(--ink-muted);
  font-size: 14px;
  line-height: 1.7;
}
:deep(.inference-flow) {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-top: 1px solid var(--line);
}
:deep(.inference-card) {
  display: block;
  min-height: auto;
  border-bottom: 1px solid var(--line);
}
:deep(.inference-body) {
  padding: 18px 0;
}
:deep(.inference-card h4) {
  color: var(--ink-muted);
  font-size: 14px;
  line-height: 1.7;
  font-weight: 400;
}
:deep(.inference-factor-list) {
  display: grid;
  gap: 8px;
  margin: 12px 0 10px;
}
:deep(.inference-factor-item) {
  display: grid;
  gap: 3px;
  padding-left: 10px;
  border-left: 2px solid var(--line);
}
:deep(.inference-factor-list.positive .inference-factor-item) {
  border-left-color: rgba(13,148,136,0.36);
}
:deep(.inference-factor-list.warning .inference-factor-item) {
  border-left-color: rgba(200,74,69,0.36);
}
:deep(.inference-factor-item span) {
  color: var(--ink);
  font-size: 13px;
  font-weight: 750;
}
:deep(.inference-factor-item p) {
  color: var(--ink-muted);
  font-size: 13px;
  line-height: 1.55;
}
:deep(.constraint-factors) {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 4px;
}
:deep(.constraint-factor-tag) {
  font-size: 11px;
  font-weight: 700;
  font-family: 'Noto Serif SC', serif;
  color: var(--crimson, #c84a45);
  background: rgba(200,74,69,0.07);
  border: 1px solid rgba(200,74,69,0.18);
  border-radius: 4px;
  padding: 2px 8px;
  letter-spacing: .04em;
}
:deep(.support-factors) {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 4px;
}
:deep(.support-factor-tag) {
  font-size: 11px;
  font-weight: 700;
  font-family: 'Noto Serif SC', serif;
  color: #3a7d4e;
  background: rgba(58,125,78,0.07);
  border: 1px solid rgba(58,125,78,0.22);
  border-radius: 4px;
  padding: 2px 8px;
  letter-spacing: .04em;
}
:deep(.inference-head) {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  color: var(--ink-dim);
  font-size: 13px;
}
:deep(.inference-head span) {
  color: var(--ink);
  font-size: 18px;
  font-weight: 750;
}
:deep(.inference-head strong) {
  color: var(--theme-color);
  font-size: 19px;
  white-space: nowrap;
}

:deep(.guidance-grid) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px;
  border-top: 1px solid var(--line);
}
:deep(.guidance-card) {
  min-height: auto;
  padding: 16px 0 0;
}
:deep(.guidance-kicker) {
  color: var(--theme-color);
  font-size: 12px;
  font-weight: 900;
}
:deep(.guidance-rows) {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}
:deep(.guidance-row) {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}
:deep(.guidance-row span) {
  color: var(--theme-color);
  font-family: var(--font-serif);
  font-size: 13px;
  font-weight: 850;
  line-height: 1.7;
}
:deep(.guidance-row p) {
  margin: 0;
  color: var(--ink-muted);
  font-size: 14px;
  line-height: 1.72;
}
:deep(.guidance-row.warning span),
:deep(.guidance-row.warning p) {
  color: #b91c1c;
}
:deep(.guidance-row.muted span),
:deep(.guidance-row.muted p) {
  color: var(--ink-dim);
}

@media(max-width:760px) {
  :deep(.mag-result) {
    max-width: 100%;
  }
  :deep(.mag-hero) {
    min-height: 40svh;
    align-items: flex-end;
  }
  :deep(.mag-hero-panel) {
    padding: 52px 24px 24px;
  }
  :deep(.mag-hero-panel h1) {
    font-size: clamp(30px, 8vw, 40px);
    line-height: 1.12;
  }
  :deep(.mag-score-inline) {
    top: 22px;
    right: 24px;
  }
  :deep(.mag-action-list),
  :deep(.chart-meta-grid),
  :deep(.guidance-grid) {
    grid-template-columns: 1fr;
  }
}

@media(max-width:380px) {
  :deep(.mag-tab) {
    font-size: 20px;
  }
}


</style>
