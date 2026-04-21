// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import BaziView from '../views/BaziView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/bazi', name: 'bazi', component: BaziView },
    // { path: '/me', name: 'profile', component: () => import('../views/ProfileView.vue') }
  ]
})

export default router
