<template>
  <main class="feedback-page">
    <section class="feedback-container" aria-label="反馈与共创">
      <router-link class="back-link" to="/" aria-label="返回首页">
        <span aria-hidden="true">←</span>
        <span>返回</span>
      </router-link>

      <article class="feedback-card">
        <div class="card-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4.8 6.8c1.9-2 5-2 6.9 0l.3.3.3-.3c1.9-2 5-2 6.9 0 1.9 2 1.9 5.2 0 7.2L12 21 4.8 14c-1.9-2-1.9-5.2 0-7.2Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
          </svg>
        </div>

        <div class="feedback-copy">
          <h1>反馈与共创</h1>
          <p class="feedback-lead">这个项目还在早期，我很需要真实使用中的问题和建议。</p>
          <p>
            你好，我是 Justin，这个项目目前由我持续开发。它希望把奇门遁甲排盘、解读和日常问题分析做得更清晰、更易用。现在产品形态还比较粗糙，如果你遇到问题、发现解释不准确，或有想要的功能，欢迎告诉我。
          </p>
          <p class="open-source-note">
            项目完全开源，如果你觉得它有一点帮助，也欢迎在 GitHub 上给
            <a href="https://github.com/oceanjustinlin/qimen" target="_blank" rel="noreferrer">oceanjustinlin/qimen</a>
            点一个 star。
          </p>
        </div>

        <div class="contact-strip">
          <span>服务邮箱</span>
          <div class="email-line">
            <a :href="mailHref">oceanjustinlin@gmail.com</a>
            <button class="copy-email-mini" type="button" @click="copyEmail">
              {{ copied ? '已复制' : '复制' }}
            </button>
          </div>
        </div>

        <div class="feedback-actions">
          <a class="primary-action" :href="formUrl" target="_blank" rel="noreferrer">
            <span>填写反馈问卷</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 17 17 7M9 7h8v8"/>
            </svg>
          </a>
          <a class="secondary-action" :href="mailHref">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6h16v12H4z"/>
              <path d="m4 7 8 6 8-6"/>
            </svg>
            <span>发送邮件</span>
          </a>
        </div>

        <p class="privacy-note">请勿在反馈中提交身份证件、银行卡、医疗记录等高敏感信息。</p>
      </article>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'

const email = 'oceanjustinlin@gmail.com'
const copied = ref(false)
const formUrl = 'https://my.feishu.cn/share/base/form/shrcn58XbiIxTbzl4GxHtBdX61c'
const mailHref = computed(() => {
  const subject = encodeURIComponent('奇门遁甲产品反馈')
  const body = encodeURIComponent('反馈类型：\n问题描述：\n发生页面：\n截图或补充信息：\n联系方式：')
  return `mailto:${email}?subject=${subject}&body=${body}`
})

const copyEmail = async () => {
  try {
    await navigator.clipboard.writeText(email)
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    window.prompt('复制邮箱', email)
  }
}
</script>

<style scoped>
.feedback-page {
  position: relative;
  min-height: 100vh;
  padding: 46px 18px 58px;
  overflow: hidden;
}

.feedback-page::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(232,204,128,0.05) 0 1px, transparent 1px) 0 0 / 86px 86px,
    linear-gradient(180deg, rgba(232,204,128,0.035) 0 1px, transparent 1px) 0 0 / 86px 86px;
  mask-image: radial-gradient(circle at 50% 34%, #000 0%, transparent 66%);
}

.feedback-container {
  position: relative;
  z-index: 1;
  width: min(620px, 100%);
  min-height: calc(100vh - 104px);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

.back-link {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(232,204,128,0.76);
  text-decoration: none;
  font-size: 14px;
  transition: color .2s, transform .2s;
}

.back-link:hover {
  color: var(--gold-light);
  transform: translateX(-2px);
}

.feedback-card {
  position: relative;
  margin: auto 0;
  padding: 22px 0 0;
}

.card-mark {
  position: relative;
  width: 44px;
  height: 44px;
  margin-bottom: 20px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--gold-light);
  border: 1px solid rgba(232,204,128,0.24);
  background: rgba(212,175,55,0.09);
}

.card-mark svg {
  width: 21px;
  height: 21px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linejoin: round;
}

.feedback-copy {
  position: relative;
}

.feedback-kicker {
  margin: 0 0 10px;
  color: rgba(78,205,196,0.86);
  font-size: 11px;
  letter-spacing: .22em;
}

.feedback-copy h1 {
  margin: 0 0 14px;
  color: var(--gold-light);
  font-family: var(--font-serif);
  font-size: clamp(26px, 6vw, 34px);
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: .04em;
}

.feedback-copy p {
  margin: 0;
  color: rgba(240,237,230,0.74);
  font-size: 14px;
  line-height: 1.9;
}

.feedback-copy .feedback-lead {
  margin-bottom: 12px;
  color: rgba(240,237,230,0.9);
}

.feedback-copy .open-source-note {
  margin-top: 14px;
  color: rgba(232,204,128,0.82);
}

.feedback-copy .open-source-note a {
  color: rgba(178,239,234,0.96);
  text-decoration: none;
  border-bottom: 1px solid rgba(178,239,234,0.35);
}

.feedback-copy .open-source-note a:hover {
  color: #d4fffb;
  border-bottom-color: rgba(178,239,234,0.72);
}

.contact-strip {
  position: relative;
  margin: 24px 0 20px;
  padding: 13px 14px;
  display: grid;
  gap: 7px;
  border: 1px solid rgba(78,205,196,0.16);
  border-radius: 12px;
  background: rgba(78,205,196,0.045);
}

.contact-strip > span {
  color: var(--text-muted);
  font-size: 11px;
}

.email-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.email-line a {
  min-width: 0;
  color: rgba(178,239,234,0.96);
  font-size: 14px;
  text-decoration: none;
  overflow-wrap: anywhere;
}

.copy-email-mini {
  flex: 0 0 auto;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(78,205,196,0.24);
  background: rgba(78,205,196,0.07);
  color: rgba(178,239,234,0.92);
  font-family: var(--font-body);
  font-size: 12px;
  cursor: pointer;
  transition: border-color .2s, background .2s, color .2s;
}

.copy-email-mini:hover {
  border-color: rgba(78,205,196,0.44);
  background: rgba(78,205,196,0.12);
  color: #d4fffb;
}

.feedback-actions {
  position: relative;
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 10px;
}

.primary-action,
.secondary-action {
  min-height: 46px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  text-decoration: none;
  transition: transform .2s, border-color .2s, background .2s, color .2s;
}

.primary-action {
  color: #120d03;
  font-weight: 700;
  background: linear-gradient(135deg, #F0D990 0%, #C4983C 100%);
  box-shadow: 0 12px 34px rgba(212,175,55,0.18);
}

.secondary-action {
  color: rgba(240,237,230,0.82);
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.035);
}

.primary-action:hover,
.secondary-action:hover {
  transform: translateY(-1px);
}

.secondary-action:hover {
  border-color: rgba(232,204,128,0.36);
  color: var(--gold-light);
}

.primary-action svg,
.secondary-action svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.privacy-note {
  position: relative;
  margin: 16px 0 0;
  color: rgba(142,142,147,0.9);
  font-size: 12px;
  line-height: 1.7;
}

@media (max-width: 640px) {
  .feedback-page {
    padding: 28px 14px 36px;
  }

  .feedback-container {
    min-height: calc(100vh - 64px);
  }

  .feedback-card {
    margin: 26px 0 0;
    padding: 24px 20px;
  }

  .feedback-actions {
    grid-template-columns: 1fr;
  }

  .email-line {
    align-items: flex-start;
  }
}
</style>
