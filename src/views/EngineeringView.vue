<template>
  <div class="engineering-view">
    <header class="engineering-header">
      <router-link class="back-link" to="/" aria-label="返回首页">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 3 6 8l4 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        返回
      </router-link>
      <div class="engineering-title">术数工程化</div>
      <AccountMenu />
    </header>

    <main class="engineering-shell">
      <section class="engineering-hero">
        <div class="hero-copy">
          <p class="hero-label">AI NUMEROLOGY SYSTEM</p>
          <h1>先让规则落盘，再让模型开口</h1>
          <p class="hero-desc">术数推演不交给语言模型自由发挥。时间、干支、九宫、强弱、喜忌、评分先由确定性引擎生成，模型只在边界内完成转译、解释和行动建议。</p>
          <div class="hero-actions">
            <button class="hero-primary" type="button" @click="activeStep = 1">查看防幻觉链路</button>
            <button class="hero-secondary" type="button" @click="activeStep = 3">看反馈闭环</button>
          </div>
        </div>

        <div class="hero-instrument" aria-hidden="true">
          <div class="instrument-grid">
            <span v-for="cell in palaceCells" :key="cell" :class="{ active: cell === activeStepData.mark }">{{ cell }}</span>
          </div>
          <div class="instrument-readout">
            <span>{{ activeStepData.signal }}</span>
            <strong>{{ activeStepData.core }}</strong>
          </div>
        </div>
      </section>

      <section class="section-header">
        <div class="section-label">推演链路</div>
        <h2 class="section-title">四步执行流程</h2>
        <p class="section-sub">每一次推演从收问到校准，依次经过以下四个节点，缺一不可。</p>
      </section>

      <section class="workflow-panel">
        <div class="step-rail" role="tablist" aria-label="术数工程化流程">
          <div
            v-for="(step, index) in engineeringSteps"
            :key="step.key"
            class="step-item"
          >
            <button
              class="step-button"
              :class="{ active: activeStep === index }"
              type="button"
              role="tab"
              :aria-selected="activeStep === index"
              @click="activeStep = index"
            >
              <span class="step-index">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="step-name">{{ step.title }}</span>
              <span class="step-desc">{{ step.desc }}</span>
            </button>
            <!-- 手机端手风琴内容，桌面端隐藏 -->
            <div class="step-accordion" :class="{ open: activeStep === index }" aria-live="polite">
              <div class="accordion-inner">
                <p class="accordion-detail">{{ step.detail }}</p>
                <div class="check-stack accordion-checks">
                  <div v-for="item in step.checks" :key="item" class="check-item">
                    <span></span>{{ item }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="evidence-card">
          <div class="card-kicker">当前链路</div>
          <h2>{{ activeStepData.title }}</h2>
          <p>{{ activeStepData.detail }}</p>
          <div class="check-stack">
            <div v-for="item in activeStepData.checks" :key="item" class="check-item">
              <span></span>{{ item }}
            </div>
          </div>
        </div>

        <div class="orbit-card" aria-hidden="true">
          <div class="orbit-ring"></div>
          <div class="orbit-core">{{ activeStepData.core }}</div>
          <div
            v-for="(point, index) in activeStepData.points"
            :key="point"
            class="orbit-point"
            :style="{ '--point-index': index }"
          >
            {{ point }}
          </div>
        </div>
      </section>

      <section class="section-header">
        <div class="section-label">角色分工</div>
        <h2 class="section-title">三层职责边界</h2>
        <p class="section-sub">流程由三个角色共同托底——各司其职，互不越权。</p>
      </section>

      <section class="boundary-grid" aria-label="边界分工">
        <article v-for="item in boundaries" :key="item.title" class="boundary-card">
          <div class="boundary-key">{{ item.key }}</div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.copy }}</p>
        </article>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import AccountMenu from '../components/AccountMenu.vue'

const activeStep = ref(0)

const palaceCells = ['巽', '离', '坤', '震', '中', '兑', '艮', '坎', '乾']

const engineeringSteps = [
  {
    key: 'interview',
    title: '结构化访谈',
    desc: '先锁定问题、时空与判断目标',
    core: '问清',
    mark: '巽',
    signal: 'INPUT GATE',
    points: ['事项', '时间', '地点', '目标'],
    detail: '信息不完整时，链路停在追问层。起局不是装饰动作，必须先确定问什么、何时问、用什么口径判断。',
    checks: ['模糊问题不直接给终局断语', '时间与时区保持可见', '健康、投资等主题保留现实边界']
  },
  {
    key: 'calculation',
    title: '确定性计算',
    desc: '排盘、强弱、评分由规则引擎完成',
    core: '算准',
    mark: '中',
    signal: 'RULE ENGINE',
    points: ['排盘', '强弱', '喜忌', '评分'],
    detail: '干支历法、奇门九宫、八字强弱与岁运评分先在代码里完成。语言模型不能临场心算，也不能改写上游数据。',
    checks: ['干支、宫位、分数来自确定性 payload', '缓存保留计算版本', '规则失败时优先回退而非补编']
  },
  {
    key: 'interpretation',
    title: '受限解读',
    desc: '模型只把证据翻译成行动建议',
    core: '转译',
    mark: '兑',
    signal: 'LLM BOUNDARY',
    points: ['证据', '语气', '行动', '禁区'],
    detail: '模型的任务是把术语和结构化信号翻译成人话。每个判断都要贴着已给字段，不凭空创造日期、方位、人物或绝对结论。',
    checks: ['十神术语转译成现实场景', '负面信号写成风险来源', '行动建议必须具体可执行']
  },
  {
    key: 'feedback',
    title: '反馈校准',
    desc: '让应验结果进入复盘闭环',
    core: '复盘',
    mark: '坎',
    signal: 'CALIBRATION',
    points: ['记录', '反馈', '样本', '迭代'],
    detail: '每一次推演都可以沉淀为样本：当事后反馈回到系统，规则、话术和风险边界才有持续校准的依据。',
    checks: ['历史推演可回放', '反馈关联原始问题和结论', '隐私字段在访客事件中被过滤']
  }
]

const activeStepData = computed(() => engineeringSteps[activeStep.value] || engineeringSteps[0])

const boundaries = [
  {
    key: '01',
    title: '模型做表达',
    copy: '负责归纳意图、组织语言、降低术语门槛，把已验证信号转成可执行建议。'
  },
  {
    key: '02',
    title: '规则做底座',
    copy: '负责节气、干支、九宫、强弱、喜忌与分数，让关键结论可复现。'
  },
  {
    key: '03',
    title: '产品做刹车',
    copy: '对不确定信息、绝对化措辞和高风险主题设边界，不把推演伪装成命令。'
  }
]
</script>

<style scoped>
.engineering-view {
  min-height: 100vh;
  color: var(--text-primary);
}

.engineering-header {
  position: sticky;
  top: 0;
  z-index: 220;
  height: 60px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 12px 20px;
  background: rgba(5,5,10,0.66);
  border-bottom: 1px solid rgba(255,255,255,0.04);
  backdrop-filter: blur(24px) saturate(1.5);
  -webkit-backdrop-filter: blur(24px) saturate(1.5);
}

.back-link {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: rgba(240,237,230,0.78);
  font-size: 13px;
  text-decoration: none;
  transition: color .2s;
}

.back-link:hover {
  color: var(--gold-light);
}

.engineering-title {
  font-family: var(--font-serif);
  color: var(--gold-light);
  font-size: 17px;
  letter-spacing: .18em;
  filter: drop-shadow(0 0 12px rgba(212,175,55,0.35));
}

.engineering-header :deep(.account-menu-wrap) {
  justify-self: end;
}

.engineering-shell {
  width: min(1120px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 38px 0 calc(110px + env(safe-area-inset-bottom));
}

.engineering-hero {
  min-height: min(620px, calc(100vh - 120px));
  display: grid;
  grid-template-columns: minmax(0, .95fr) minmax(280px, .75fr);
  gap: 36px;
  align-items: center;
}

.hero-label {
  position: relative;
  z-index: 2;
  margin: 0 0 16px;
  color: var(--teal);
  font-size: 10px;
  letter-spacing: .32em;
}

.hero-copy {
  position: relative;
  z-index: 2;
  padding: 18px 0;
}

.hero-copy h1 {
  max-width: 680px;
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(44px, 8vw, 88px);
  font-weight: 500;
  line-height: .98;
  color: #F8F0D8;
  letter-spacing: 0;
}

.hero-desc {
  max-width: 620px;
  margin: 24px 0 0;
  color: rgba(240,237,230,0.73);
  font-size: 15px;
  line-height: 1.9;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 30px;
}

.hero-primary,
.hero-secondary {
  min-height: 46px;
  padding: 0 18px;
  border-radius: 12px;
  font-size: 13px;
  letter-spacing: .08em;
  cursor: pointer;
  transition: transform .2s, border-color .2s, background .2s, box-shadow .2s;
}

.hero-primary {
  border: none;
  background: linear-gradient(135deg, #E8CC80 0%, #B38B36 100%);
  color: #130d00;
  font-weight: 700;
  box-shadow: 0 14px 34px rgba(179,139,54,0.18);
}

.hero-secondary {
  border: 1px solid rgba(78,205,196,0.34);
  background: rgba(78,205,196,0.06);
  color: rgba(207,255,250,0.94);
}

.hero-primary:hover,
.hero-secondary:hover {
  transform: translateY(-1px);
}

.hero-instrument {
  position: relative;
  z-index: 1;
  min-height: 430px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(232,204,128,0.16);
  border-radius: 24px;
  background:
    radial-gradient(circle at 50% 45%, rgba(232,204,128,0.13), transparent 36%),
    linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.018));
  box-shadow: 0 22px 80px rgba(0,0,0,0.34);
}

.hero-instrument::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(232,204,128,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(232,204,128,0.035) 1px, transparent 1px);
  background-size: 31px 31px;
  mask-image: radial-gradient(circle, #000 18%, transparent 72%);
}

.instrument-grid {
  position: relative;
  z-index: 1;
  width: min(310px, 76vw);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  border: 1px solid rgba(232,204,128,0.14);
  background: rgba(232,204,128,0.12);
  border-radius: 18px;
  overflow: hidden;
}

.instrument-grid span {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  background: rgba(5,5,10,0.72);
  color: rgba(240,237,230,0.38);
  font-family: var(--font-serif);
  font-size: 28px;
  transition: color .22s, background .22s, text-shadow .22s;
}

.instrument-grid span.active {
  color: var(--gold-light);
  background: radial-gradient(circle, rgba(212,175,55,0.18), rgba(5,5,10,0.74));
  text-shadow: 0 0 18px rgba(212,175,55,0.5);
}

.instrument-readout {
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.07);
}

.instrument-readout span {
  color: var(--text-muted);
  font-size: 10px;
  letter-spacing: .22em;
}

.instrument-readout strong {
  color: var(--gold-light);
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 500;
}

.workflow-panel {
  display: grid;
  grid-template-columns: minmax(220px, .82fr) minmax(260px, 1fr) minmax(240px, .8fr);
  gap: 14px;
  margin-top: 28px;
}

.step-rail,
.evidence-card,
.orbit-card,
.boundary-card {
  border: 1px solid rgba(255,255,255,0.075);
  border-radius: 20px;
  background: rgba(255,255,255,0.028);
  backdrop-filter: blur(20px) saturate(1.15);
  -webkit-backdrop-filter: blur(20px) saturate(1.15);
}

.step-rail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
}

.step-button {
  min-height: 78px;
  padding: 12px 13px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: rgba(240,237,230,0.72);
  text-align: left;
  cursor: pointer;
  transition: background .22s, border-color .22s, transform .22s;
}

.step-button:hover {
  transform: translateX(3px);
  border-color: rgba(232,204,128,0.22);
}

.step-button.active {
  border-color: rgba(232,204,128,0.52);
  background: linear-gradient(135deg, rgba(212,175,55,0.16), rgba(78,205,196,0.045));
}

.step-index,
.step-name,
.step-desc {
  display: block;
}

.step-index {
  margin-bottom: 7px;
  color: var(--gold-light);
  font-family: var(--font-serif);
  font-size: 16px;
}

.step-name {
  color: #F5EDD3;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 4px;
}

.step-desc {
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.55;
}

.evidence-card {
  min-height: 346px;
  padding: 22px;
}

.card-kicker {
  color: var(--text-muted);
  font-size: 10px;
  letter-spacing: .22em;
}

.evidence-card h2 {
  margin: 10px 0 14px;
  color: var(--gold-light);
  font-family: var(--font-serif);
  font-size: 30px;
  font-weight: 500;
}

.evidence-card p {
  margin: 0;
  color: rgba(240,237,230,0.76);
  font-size: 14px;
  line-height: 1.88;
}

.check-stack {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-top: 28px;
}

.check-item {
  display: flex;
  gap: 10px;
  color: rgba(240,237,230,0.74);
  font-size: 12px;
  line-height: 1.6;
}

.check-item span {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  margin-top: 7px;
  border-radius: 50%;
  background: var(--teal);
  box-shadow: 0 0 12px rgba(78,205,196,0.48);
}

.orbit-card {
  position: relative;
  min-height: 346px;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.orbit-ring {
  position: absolute;
  width: 206px;
  height: 206px;
  border: 1px dashed rgba(232,204,128,0.28);
  border-radius: 50%;
}

.orbit-ring::before,
.orbit-ring::after {
  content: '';
  position: absolute;
  inset: 26px;
  border: 1px solid rgba(78,205,196,0.15);
  border-radius: 50%;
}

.orbit-ring::after {
  inset: 62px;
  border-color: rgba(255,255,255,0.08);
}

.orbit-core {
  position: relative;
  z-index: 1;
  width: 96px;
  height: 96px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(232,204,128,0.38);
  border-radius: 50%;
  background: rgba(5,5,10,0.72);
  color: var(--gold-light);
  font-family: var(--font-serif);
  font-size: 24px;
  box-shadow: 0 0 32px rgba(212,175,55,0.18);
}

.orbit-point {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 46px;
  height: 46px;
  margin: -23px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(78,205,196,0.24);
  border-radius: 50%;
  background: rgba(78,205,196,0.08);
  color: rgba(222,250,246,0.9);
  font-size: 12px;
  transform: rotate(calc(var(--point-index) * 90deg)) translateX(116px) rotate(calc(var(--point-index) * -90deg));
}

.section-header {
  margin-top: 56px;
  margin-bottom: 4px;
}

.section-label {
  color: var(--teal);
  font-size: 10px;
  letter-spacing: .32em;
  margin-bottom: 8px;
}

.section-title {
  margin: 0 0 10px;
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 500;
  color: #F5EDD3;
}

.section-sub {
  margin: 0;
  color: rgba(240,237,230,0.55);
  font-size: 13px;
  line-height: 1.8;
  max-width: 560px;
}

.boundary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 14px;
}

.boundary-card {
  padding: 18px;
}

.boundary-key {
  color: rgba(78,205,196,0.82);
  font-family: var(--font-serif);
  font-size: 18px;
  margin-bottom: 22px;
}

.boundary-card h3 {
  margin: 0 0 9px;
  color: #F1E6C4;
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 500;
}

.boundary-card p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.72;
}

/* 手风琴：默认在桌面端隐藏 */
.step-accordion {
  display: none;
}

@media (max-width: 900px) {
  .engineering-hero,
  .boundary-grid {
    grid-template-columns: 1fr;
  }

  /* 手机端三栏变单栏，evidence-card 和 orbit-card 隐藏 */
  .workflow-panel {
    display: block;
  }

  .evidence-card,
  .orbit-card {
    display: none;
  }

  /* 手风琴启用 */
  .step-accordion {
    display: block;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.36s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .step-accordion.open {
    max-height: 480px;
  }

  .accordion-inner {
    padding: 14px 13px 20px;
    border-top: 1px solid rgba(232,204,128,0.14);
  }

  .accordion-detail {
    margin: 0 0 16px;
    color: rgba(240,237,230,0.76);
    font-size: 13px;
    line-height: 1.88;
  }

  .accordion-checks {
    margin-top: 0;
  }

  .engineering-hero {
    min-height: auto;
  }

  .hero-instrument {
    min-height: 360px;
  }

  /* step-rail 撑满宽度 */
  .step-rail {
    width: 100%;
  }
}

@media (max-width: 520px) {
  .engineering-header {
    grid-template-columns: auto 1fr auto;
    padding: 12px 16px;
  }

  .back-link {
    font-size: 0;
    gap: 0;
  }

  .engineering-title {
    font-size: 15px;
    text-align: center;
  }

  .engineering-shell {
    width: min(100vw - 28px, 1120px);
    padding-top: 28px;
  }

  .hero-copy h1 {
    font-size: clamp(40px, 13vw, 58px);
  }

  .hero-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .hero-instrument {
    min-height: 330px;
  }

  .orbit-point {
    transform: rotate(calc(var(--point-index) * 90deg)) translateX(94px) rotate(calc(var(--point-index) * -90deg));
  }

  .orbit-ring {
    width: 174px;
    height: 174px;
  }
}
</style>
