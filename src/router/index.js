// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import BaziView from '../views/BaziView.vue'
import FortuneView from '../views/FortuneView.vue' 
import ResetPasswordView from '../views/ResetPasswordView.vue'
import EngineeringView from '../views/EngineeringView.vue'
import LegalView from '../views/LegalView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/bazi', name: 'bazi', component: BaziView },
    // 配置运势页面的路由
    { path: '/fortune', name: 'fortune', component: FortuneView },
    { path: '/engineering', name: 'engineering', component: EngineeringView },
    { path: '/reset-password', name: 'reset-password', component: ResetPasswordView },
    { path: '/terms', name: 'terms', component: LegalView },
    { path: '/privacy', name: 'privacy', component: LegalView },
    // 如果后续你还需要做个人中心，可以恢复这行：
    // { path: '/me', name: 'profile', component: () => import('../views/ProfileView.vue') }
  ]
})

export default router
