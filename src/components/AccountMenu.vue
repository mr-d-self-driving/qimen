<template>
  <div class="account-menu-wrap">
    <button class="account-menu-btn" type="button" title="账号" aria-label="账号菜单" @click.stop="toggleMenu">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="6" r="3" stroke="currentColor" stroke-width="1.2"/>
        <path d="M2 15c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
    </button>

    <div class="account-menu-panel" :class="{ open: isOpen }" @click.stop>
      <div class="account-menu-identity">{{ identityText }}</div>
      <router-link class="account-menu-link featured" to="/engineering" @click="closeMenu">
        术数工程化
      </router-link>
      <router-link v-if="globalState.currentUser" class="account-menu-link" to="/reset-password" @click="closeMenu">
        修改密码
      </router-link>
      <router-link v-if="!globalState.currentUser" class="account-menu-link" :to="{ path: '/', query: { auth: 'login' } }" @click="closeMenu">
        登录
      </router-link>
      <router-link v-if="!globalState.currentUser" class="account-menu-link" :to="{ path: '/', query: { auth: 'register' } }" @click="closeMenu">
        注册
      </router-link>
      <router-link class="account-menu-link feedback" to="/feedback" @click="closeMenu">
        反馈与共创
      </router-link>
      <button v-if="globalState.currentUser" class="account-menu-action" type="button" @click="handleSignOut">
        退出登录
      </button>
      <AfdianSupportLink />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createClient } from '@supabase/supabase-js'
import { globalState } from '../store.js'
import AfdianSupportLink from './AfdianSupportLink.vue'

const SUPABASE_URL = 'https://xkbqiiwwgfzkyfhxuoev.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_qr9YBIA6n32r-mcqKbkpgA_0XVTUSI7'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const router = useRouter()

const isOpen = ref(false)
const identityText = computed(() => {
  if (globalState.currentUser?.email) return globalState.currentUser.email
  if (globalState.isGuest) return '访客模式'
  return '未登录'
})

const closeMenu = () => {
  isOpen.value = false
}

const toggleMenu = () => {
  isOpen.value = !isOpen.value
}

const closeOnDocumentClick = () => {
  closeMenu()
}

const handleSignOut = async () => {
  await supabase.auth.signOut()
  closeMenu()
  router.push('/')
}

onMounted(() => {
  document.addEventListener('click', closeOnDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', closeOnDocumentClick)
})
</script>

<style scoped>
.account-menu-wrap {
  position: relative;
  flex: 0 0 auto;
}

.account-menu-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--gold-border);
  border-radius: 50%;
  background: rgba(212,175,55,0.08);
  color: rgba(212,175,55,0.78);
  cursor: pointer;
  transition: border-color .2s, background .2s, color .2s, transform .2s;
}

.account-menu-btn:hover {
  border-color: rgba(232,204,128,0.48);
  background: rgba(212,175,55,0.14);
  color: var(--gold-light);
  transform: translateY(-1px);
}

.account-menu-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 500;
  min-width: 190px;
  padding: 8px 0;
  border: 1px solid var(--gold-border);
  border-radius: 14px;
  background: rgba(14,14,31,0.96);
  box-shadow: 0 14px 42px rgba(0,0,0,0.62);
  backdrop-filter: blur(24px) saturate(1.25);
  -webkit-backdrop-filter: blur(24px) saturate(1.25);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-6px);
  transition: opacity .22s var(--ease), transform .22s var(--ease);
}

.account-menu-panel.open {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.account-menu-identity {
  padding: 10px 16px;
  border-bottom: 1px solid var(--glass-border);
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.5;
  word-break: break-all;
}

.account-menu-link,
.account-menu-action {
  display: block;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  color: rgba(240,237,230,0.88);
  font-size: 13px;
  line-height: 1.5;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: color .18s, background .18s;
}

.account-menu-link:hover,
.account-menu-action:hover {
  color: var(--gold-light);
  background: rgba(212,175,55,0.06);
}

.account-menu-link.featured {
  color: rgba(207,255,250,0.94);
}

.account-menu-link.feedback {
  color: var(--gold-light);
}

.account-menu-action {
  color: var(--gold-light);
}
</style>
