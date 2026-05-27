<template>
  <div class="about-view">
    <header class="about-header">
      <router-link class="back" to="/" aria-label="返回首页">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 3 6 8l4 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        返回
      </router-link>
      <div class="about-title">关于</div>
      <AccountMenu />
    </header>

    <main class="about-scroll">
      <section class="about-section hero-section">
        <div class="section-inner hero-inner">
          <div class="copy">
            <p class="eyebrow">系统说明</p>
            <h1>这个项目不是让人工智能直接算命</h1>
            <p class="lead">奇门道把“排盘、评分、领域规则、模型解读”拆成独立环节。先用确定性程序算出盘面和结构化数据，再让大模型把这些数据翻译成用户能理解的判断和行动建议。</p>
          </div>
          <div class="pipeline-card" aria-label="系统总览">
            <div v-for="(step, i) in pipeline" :key="step.title" class="pipeline-step">
              <span class="step-index">{{ String(i + 1).padStart(2, '0') }}</span>
              <div>
                <strong>{{ step.title }}</strong>
                <p>{{ step.body }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-for="module in modules" :key="module.title" class="about-section">
        <div class="section-inner module-inner">
          <div class="module-copy">
            <p class="eyebrow">{{ module.kicker }}</p>
            <h2>{{ module.title }}</h2>
            <p class="lead">{{ module.lead }}</p>
          </div>
          <div class="lesson-list">
            <article v-for="item in module.items" :key="item.title" class="lesson-item">
              <span>{{ item.label }}</span>
              <div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.body }}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="about-section">
        <div class="section-inner closing-inner">
          <p class="eyebrow">为什么这样做</p>
          <h2>目标是让推演可解释、可追溯、可迭代</h2>
          <div class="promise-grid">
            <div v-for="item in promises" :key="item.title" class="promise-item">
              <strong>{{ item.title }}</strong>
              <p>{{ item.body }}</p>
            </div>
          </div>
          <div class="about-actions">
            <router-link class="primary-link" to="/">开始使用</router-link>
            <router-link class="secondary-link" to="/feedback">反馈与共创</router-link>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import AccountMenu from '../components/AccountMenu.vue'

const pipeline = [
  { title: '收集问题', body: '先判断用户在问奇门、八字还是综合问题，并保留原始提问。' },
  { title: '规则排盘', body: '由后端计算时间、干支、九宫、八门、八神、格局与评分。' },
  { title: '整理字段', body: '把页面需要展示的内容整理成固定字段，防止模型随意发挥。' },
  { title: '前端呈现', body: '前端只读取约定字段，按模块稳定展示总判、定基、推演和指南。' },
]

const modules = [
  {
    kicker: '第一步 · 判断问题类型',
    title: '先判断问题属于哪条推演链路',
    lead: '用户只输入一句自然语言，系统先判断它应该走奇门问事、八字问答，还是需要结合八字档案的综合模式。',
    items: [
      { label: '输入', title: '问题原文', body: '保留用户原话，作为报告里的“问题”字段，也用于后续反馈比对。' },
      { label: '路由', title: '分支识别', body: '后端根据问题意图选择奇门、八字或综合模式，避免所有问题都塞进同一套提示词。' },
      { label: '上下文', title: '八字档案可选注入', body: '只有当链路需要时，才把已选档案摘要传入推演，不让出生信息污染普通奇门盘。' },
    ],
  },
  {
    kicker: '第二步 · 规则计算',
    title: '能计算的部分，不交给模型猜',
    lead: '奇门排盘、八字四柱、岁运评分都由规则引擎完成。模型拿到的是结果包，而不是让它自己编出盘面。',
    items: [
      { label: '奇门', title: '九宫排盘', body: '计算阴阳遁、局数、值符值使、九宫星门神与格局吉凶。' },
      { label: '八字', title: '命盘结构', body: '生成四柱、十神、五行旺衰、格局、喜忌与大运流年。' },
      { label: '评分', title: '可审计依据', body: '分数来自规则和字段组合，模型只能解释分数，不能重写分数。' },
    ],
  },
  {
    kicker: '第三步 · 约束解读',
    title: '大模型负责表达，但必须按字段规范输出',
    lead: '提示词会要求模型输出固定模块，例如结论先行、奇门定基、局象推演、开运指南。',
    items: [
      { label: '约束', title: '字段固定', body: '前端依赖的是标题、结论、行动建议、用神卡片、局象推演等固定字段。' },
      { label: '边界', title: '旧字段兜底', body: '历史记录可能还带旧字段，前端保留兼容读取，但新记录不再要求模型输出冗余字段。' },
      { label: '审计', title: '保留过程数据', body: '需要审计的排盘和评分流程仍然保存，只是不一定都展示给用户。' },
    ],
  },
  {
    kicker: '第四步 · 页面展示',
    title: '前端只负责把结构化结果变得可读',
    lead: '报告页面不是一篇长文，而是按用户决策顺序拆成稳定组件：先看结论，再看依据，最后看行动。',
    items: [
      { label: '总判', title: '首屏决策', body: '用结论标签、分数、总结词和背景渐变建立第一判断。' },
      { label: '导航', title: '锚点模块', body: '向下滚动后用模块导航切换四个部分，不固定总判首屏。' },
      { label: '兼容', title: '字段兜底', body: '遇到旧报告时自动从概要、分析段落和展示块中补齐展示。' },
    ],
  },
  {
    kicker: '第五步 · 反馈闭环',
    title: '反馈会变成下一轮规则和提示词的依据',
    lead: '用户的准确度反馈、实际结果和历史记录，会帮助校准评分权重、领域规则和展示字段。',
    items: [
      { label: '记录', title: '历史推演', body: '每次推演保存问题、分类、分数、报告字段和生成时间。' },
      { label: '反馈', title: '结果回填', body: '用户可以标注准确度、方向是否正确、实际发生了什么。' },
      { label: '迭代', title: '规则修正', body: '当样本足够多，先改规则和字段规范，再收紧提示词，而不是只靠话术。' },
    ],
  },
]

const promises = [
  { title: '不是黑盒', body: '关键判断能追溯到排盘、格局、用神和评分依据。' },
  { title: '不是纯聊天', body: '大模型不直接生成盘面，而是在结构化数据上做解释。' },
  { title: '不是一次性页面', body: '历史记录、反馈和字段规范会持续推动系统迭代。' },
]
</script>

<style>
.about-view, .about-view * { box-sizing: border-box; }

.about-view {
  min-height: 100vh;
  background:
    radial-gradient(circle at 82% 14%, rgba(181,141,59,0.10), transparent 34%),
    radial-gradient(circle at 18% 88%, rgba(181,141,59,0.055), transparent 38%),
    var(--paper);
  color: var(--ink);
  font-family: var(--font-body);
}

.about-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 220;
  height: 64px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 20px;
  background: rgba(247,244,238,0.92);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.about-view .back {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--ink-muted);
  font-size: 13px;
  text-decoration: none;
}
.about-view .back:hover { color: var(--ink); }

.about-title {
  color: var(--gold);
  font-family: 'Noto Serif SC', serif;
  font-size: 17px;
  font-weight: 500;
  letter-spacing: .15em;
}
.about-header .account-menu-wrap { justify-self: end; }

.about-scroll {
  height: calc(100vh - 64px);
  margin-top: 64px;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
}
.about-scroll::-webkit-scrollbar { display: none; }

.about-section {
  min-height: calc(100vh - 64px);
  scroll-snap-align: start;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 34px 0;
}

.section-inner {
  width: min(980px, calc(100vw - 40px));
  margin: 0 auto;
}

.hero-inner,
.module-inner {
  display: grid;
  grid-template-columns: minmax(0, .9fr) minmax(320px, .82fr);
  gap: 34px;
  align-items: center;
}

.eyebrow {
  margin: 0 0 12px;
  color: var(--gold);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .22em;
}

.about-view h1,
.about-view h2,
.about-view h3,
.about-view p { overflow-wrap: anywhere; }
.about-view h1 {
  margin: 0;
  max-width: 9em;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: clamp(40px, 6vw, 68px);
  font-weight: 850;
  line-height: 1.04;
}
.about-view h2 {
  margin: 0;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: clamp(30px, 4vw, 46px);
  font-weight: 800;
  line-height: 1.12;
}
.lead {
  margin: 18px 0 0;
  color: var(--ink-muted);
  font-size: 16px;
  line-height: 1.78;
}

.pipeline-card,
.lesson-list,
.promise-grid {
  border-top: 1px solid var(--line);
}

.pipeline-step {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 14px;
  padding: 17px 0;
  border-bottom: 1px solid var(--line);
}
.step-index {
  color: var(--gold);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 18px;
  font-weight: 800;
}
.pipeline-step strong,
.lesson-item h3,
.promise-item strong {
  display: block;
  margin: 0 0 6px;
  color: var(--ink);
  font-size: 16px;
  font-weight: 760;
}
.pipeline-step p,
.lesson-item p,
.promise-item p {
  margin: 0;
  color: var(--ink-muted);
  font-size: 14px;
  line-height: 1.68;
}

.lesson-item {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  gap: 16px;
  padding: 18px 0;
  border-bottom: 1px solid var(--line);
}
.lesson-item > span {
  color: var(--gold);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .12em;
}

.closing-inner {
  max-width: 860px;
}
.promise-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin-top: 26px;
}
.promise-item {
  padding: 18px 18px 18px 0;
  border-bottom: 1px solid var(--line);
}

.about-actions {
  display: flex;
  gap: 12px;
  margin-top: 28px;
}
.primary-link,
.secondary-link {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border-radius: 4px;
  font-size: 14px;
  text-decoration: none;
}
.primary-link {
  background: var(--ink);
  color: var(--paper);
}
.secondary-link {
  border: 1px solid var(--line);
  color: var(--ink-muted);
}

@media(max-width: 820px) {
  .about-header {
    position: fixed;
    height: 60px;
    padding: 0 16px;
  }
  .about-view .back {
    font-size: 0;
    gap: 0;
  }
  .about-title {
    font-size: 16px;
  }
  .about-scroll {
    height: calc(100svh - 60px);
    margin-top: 60px;
    scroll-snap-type: y mandatory;
  }
  .about-section {
    min-height: calc(100svh - 60px);
    scroll-snap-align: start;
    scroll-snap-stop: always;
    padding: 24px 0;
  }
  .section-inner {
    width: min(100vw - 32px, 520px);
  }
  .hero-inner,
  .module-inner {
    min-height: calc(100svh - 108px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 24px;
  }
  .about-view h1 {
    font-size: clamp(40px, 12vw, 56px);
  }
  .about-view h2 {
    font-size: clamp(30px, 9vw, 42px);
  }
  .lead {
    font-size: 15px;
    line-height: 1.72;
  }
  .pipeline-card,
  .lesson-list {
    width: 100%;
  }
  .lesson-item {
    grid-template-columns: 58px minmax(0, 1fr);
    padding: 14px 0;
  }
  .promise-grid {
    grid-template-columns: 1fr;
  }
  .about-actions {
    flex-direction: column;
  }
}
</style>
