<template>
  <div class="reset-password-view">
    <header id="siteHeader">
      <router-link class="back-link" to="/">返回</router-link>
      <div class="site-logo">账号安全</div>
      <div class="header-spacer"></div>
    </header>

    <main class="reset-page-wrap">
      <section class="reset-panel">
        <div class="panel-orbit" aria-hidden="true"></div>
        <div class="section-kicker">PASSWORD</div>
        <h1>重设密码</h1>
        <p class="reset-copy">
          {{ sessionReady ? '请输入新的账号密码，保存后即可继续使用。' : '请从重设密码邮件进入，或先登录后再修改密码。' }}
        </p>

        <div class="reset-form">
          <label>
            <span>新密码</span>
            <input v-model="password" type="password" autocomplete="new-password" placeholder="至少 6 位">
          </label>
          <label>
            <span>确认新密码</span>
            <input v-model="confirmPassword" type="password" autocomplete="new-password" placeholder="再次输入新密码">
          </label>

          <button class="reset-submit" :disabled="isSubmitting || !sessionReady" @click="handlePasswordUpdate">
            {{ isSubmitting ? '正在保存...' : '确认修改' }}
          </button>
        </div>

        <div v-if="notice" class="reset-notice" :class="{ success: isSuccess }">{{ notice }}</div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createClient } from '@supabase/supabase-js'
import { setCurrentUser } from '../store.js'
import { validatePasswordUpdate } from '../auth/passwordReset.mjs'

const SUPABASE_URL = 'https://xkbqiiwwgfzkyfhxuoev.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_qr9YBIA6n32r-mcqKbkpgA_0XVTUSI7'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const router = useRouter()
const password = ref('')
const confirmPassword = ref('')
const session = ref(null)
const notice = ref('')
const isSubmitting = ref(false)
const isSuccess = ref(false)
let authSubscription = null

const sessionReady = computed(() => Boolean(session.value))

onMounted(async () => {
  const { data: { session: currentSession } } = await supabase.auth.getSession()
  session.value = currentSession
  setCurrentUser(currentSession?.user || null)

  const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
    session.value = nextSession
    setCurrentUser(nextSession?.user || null)
  })
  authSubscription = data?.subscription
})

onUnmounted(() => {
  authSubscription?.unsubscribe()
})

const handlePasswordUpdate = async () => {
  const validationError = validatePasswordUpdate(password.value, confirmPassword.value)
  if (validationError) {
    notice.value = validationError
    isSuccess.value = false
    return
  }

  isSubmitting.value = true
  notice.value = ''
  try {
    const { error } = await supabase.auth.updateUser({ password: password.value })
    if (error) throw error
    isSuccess.value = true
    notice.value = '密码已更新，即将返回首页。'
    window.setTimeout(() => router.push('/'), 900)
  } catch (error) {
    isSuccess.value = false
    notice.value = '密码更新失败: ' + error.message
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.reset-password-view { width: 100%; min-height: 100vh; }
#siteHeader {
  position: fixed; top: 0; left: 0; right: 0; z-index: 300;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px;
  backdrop-filter: blur(24px) saturate(1.5);
  -webkit-backdrop-filter: blur(24px) saturate(1.5);
  background: rgba(5, 5, 10, 0.65);
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.site-logo { font-family: 'Noto Serif SC', serif; font-size: 17px; letter-spacing: .15em; font-weight: 500; background: linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 50%, var(--gold) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 12px rgba(212,175,55,0.45)); }
.back-link, .header-spacer { width: 46px; }
.back-link { color: var(--text-muted); font-size: 13px; text-decoration: none; }
.back-link:hover { color: var(--gold-light); }
.reset-page-wrap { position: relative; z-index: 1; min-height: 100vh; display: grid; place-items: center; padding: 92px 18px 46px; }
.reset-panel { width: min(100%, 460px); position: relative; overflow: hidden; padding: 28px 24px 24px; border: 1px solid var(--glass-border); border-radius: var(--radius-card); background: rgba(255,255,255,0.035); backdrop-filter: blur(22px) saturate(1.25); box-shadow: 0 24px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05); animation: riseIn .75s cubic-bezier(.22,1,.36,1) both; }
.panel-orbit { position: absolute; width: 180px; height: 180px; right: -72px; top: -76px; border: 1px solid rgba(212,175,55,0.18); border-radius: 50%; box-shadow: inset 0 0 36px rgba(212,175,55,0.05); }
.panel-orbit::before, .panel-orbit::after { content: ''; position: absolute; inset: 28px; border: 1px dashed rgba(232,204,128,0.16); border-radius: 50%; }
.panel-orbit::after { inset: 68px; background: rgba(212,175,55,0.18); border: none; box-shadow: 0 0 28px rgba(212,175,55,0.18); }
.section-kicker { color: var(--text-muted); font-size: 10px; letter-spacing: .28em; margin-bottom: 10px; }
h1 { margin: 0; color: var(--text-primary); font-family: var(--font-serif); font-size: 28px; font-weight: 500; letter-spacing: .08em; }
.reset-copy { margin: 12px 0 24px; color: var(--text-muted); font-size: 13px; line-height: 1.8; }
.reset-form { display: flex; flex-direction: column; gap: 14px; }
label { display: flex; flex-direction: column; gap: 8px; color: rgba(240,237,230,0.82); font-size: 12px; }
input { width: 100%; background: rgba(0,0,0,0.25); border: 1px solid var(--glass-border); border-radius: var(--radius-item); padding: 13px 16px; color: var(--text-primary); font-size: 15px; outline: none; }
input:focus { border-color: var(--gold-border); box-shadow: 0 0 0 1px rgba(212,175,55,0.12), 0 0 24px rgba(212,175,55,0.07); }
.reset-submit { width: 100%; min-height: 50px; margin-top: 4px; border: none; border-radius: var(--radius-item); background: linear-gradient(135deg, #E8CC80 0%, #B38B36 45%, #C9A052 100%); color: #0a0800; font-size: 15px; font-family: var(--font-serif); font-weight: 700; cursor: pointer; box-shadow: 0 10px 26px rgba(212,175,55,0.18); }
.reset-submit:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.reset-notice { margin-top: 14px; padding: 11px 12px; border-radius: 12px; background: rgba(255,94,87,0.08); border: 1px solid rgba(255,94,87,0.18); color: rgba(240,237,230,0.86); font-size: 12px; line-height: 1.6; }
.reset-notice.success { background: rgba(78,205,196,0.08); border-color: rgba(78,205,196,0.18); }
</style>
