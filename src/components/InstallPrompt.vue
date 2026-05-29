<template>
  <transition name="install-slide">
    <div v-if="visible" class="install-banner">
      <div class="install-icon">
        <img src="/images/icon-192.png" alt="奇门道" />
      </div>
      <div class="install-text">
        <div class="install-title">添加到主屏，免反复登录</div>
        <div class="install-sub">
          <template v-if="isIos">
            点底部 <span class="ios-share">􀈂 分享</span> → “添加到主屏幕”
          </template>
          <template v-else>装到桌面，打开即用，登录长期保持</template>
        </div>
      </div>
      <div class="install-actions">
        <button v-if="canPromptAndroid" class="install-btn" @click="promptInstall">安装</button>
        <button class="install-close" aria-label="关闭" @click="dismiss">✕</button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const DISMISS_KEY = 'qimen.installPrompt.dismissedAt'
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000 // 关闭后 14 天内不再打扰

const visible = ref(false)
const isIos = ref(false)
const canPromptAndroid = ref(false)
let deferredPrompt = null

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)')?.matches ||
  window.navigator.standalone === true

const detectIos = () => {
  const ua = window.navigator.userAgent || ''
  const iosUa = /iphone|ipad|ipod/i.test(ua)
  // iPadOS 13+ 伪装成 Mac：用触摸点数兜底判断
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return iosUa || iPadOs
}

const recentlyDismissed = () => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0)
    return at && Date.now() - at < DISMISS_TTL_MS
  } catch {
    return false
  }
}

const onBeforeInstall = (e) => {
  e.preventDefault()
  deferredPrompt = e
  canPromptAndroid.value = true
  if (!isStandalone() && !recentlyDismissed()) visible.value = true
}

const promptInstall = async () => {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  try {
    await deferredPrompt.userChoice
  } finally {
    deferredPrompt = null
    canPromptAndroid.value = false
    visible.value = false
  }
}

const dismiss = () => {
  visible.value = false
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {
    // localStorage 不可用时忽略，下次仍会提示
  }
}

onMounted(() => {
  if (isStandalone() || recentlyDismissed()) return
  isIos.value = detectIos()
  window.addEventListener('beforeinstallprompt', onBeforeInstall)
  // iOS 不触发 beforeinstallprompt，直接展示手动引导
  if (isIos.value) visible.value = true
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstall)
})
</script>

<style scoped>
.install-banner {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(12px + 65px + env(safe-area-inset-bottom));
  z-index: 100000;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: var(--chrome);
  border: 1px solid var(--gold-border);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}
.install-icon img {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: block;
}
.install-text {
  flex: 1;
  min-width: 0;
}
.install-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.3;
}
.install-sub {
  font-size: 12px;
  color: var(--ink-muted);
  margin-top: 2px;
  line-height: 1.3;
}
.ios-share {
  color: var(--gold);
  font-weight: 600;
}
.install-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.install-btn {
  border: none;
  background: var(--gold);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  padding: 8px 14px;
  border-radius: 10px;
  cursor: pointer;
}
.install-close {
  border: none;
  background: transparent;
  color: var(--chrome-muted);
  font-size: 14px;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  cursor: pointer;
}

.install-slide-enter-active,
.install-slide-leave-active {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease;
}
.install-slide-enter-from,
.install-slide-leave-to {
  transform: translateY(140%);
  opacity: 0;
}
</style>
