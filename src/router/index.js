// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import BaziView from '../views/BaziView.vue'
import ReportView from '../views/ReportView.vue'
import FortuneView from '../views/FortuneView.vue'
import ResetPasswordView from '../views/ResetPasswordView.vue'
import EngineeringView from '../views/EngineeringView.vue'
import BaziStaticPanelDemo from '../views/BaziStaticPanelDemo.vue'
import BaziDynamicPanelDemo from '../views/BaziDynamicPanelDemo.vue'
import FeedbackView from '../views/FeedbackView.vue'
import LegalView from '../views/LegalView.vue'
import AdminView from '../views/AdminView.vue'
import { globalState } from '../store.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/', name: 'home', component: HomeView,
      meta: {
        seoTitle: '奇门遁甲在线排盘_AI解盘与八字运势分析 - 奇门道',
        seoDescription: '奇门道提供免费的奇门遁甲在线排盘、AI 解盘、八字四柱排盘与每日运势分析。输入时间、地点和所问之事，即可生成局盘、宫位、干支、评分与行动建议。',
        title: '奇门遁甲 AI 引擎 — 免费在线排盘推演',
        titleEn: 'Qimen Dunjia AI Engine — Free Online Divination',
        description: '先让规则落盘，再让模型开口。输入时间地点，实时生成奇门遁甲局盘与 AI 解读。',
        descriptionEn: 'Rules first, then AI interprets. Enter time and location to generate a Qimen Dunjia chart with AI analysis.',
        ogImage: 'https://www.qimendao.com/images/home.jpg',
      },
    },
    {
      path: '/bazi', name: 'bazi', component: BaziView,
      meta: {
        seoTitle: '八字排盘_在线四柱八字、喜用神与大运流年分析 - 奇门道',
        seoDescription: '奇门道提供在线八字排盘、四柱十神、喜用神、格局判断、大运流年与月度运势分析，适合建立长期命盘档案。',
        title: '八字四柱排盘 — 奇门遁甲 AI',
        titleEn: 'Bazi Four Pillars — Qimen AI',
        description: '专业四柱八字排盘，十神分析、格局判断、大运流年一键生成。',
        descriptionEn: 'Professional Bazi four-pillars chart: ten gods, patterns, major cycles and yearly luck in one click.',
        ogImage: 'https://www.qimendao.com/images/bazi_1.jpg',
      },
    },
    {
      path: '/reports', name: 'reports', component: ReportView,
      meta: {
        title: '专业报告 — 奇门遁甲 AI',
        description: '查看您的专属八字、合盘与运势报告',
      },
    },
    {
      path: '/fortune', name: 'fortune', component: FortuneView,
      meta: {
        seoTitle: '今日运势查询_每日/每周/月度八字运势分析 - 奇门道',
        seoDescription: '基于奇门遁甲规则引擎与八字命局，查询今日运势、七日走势、月度曲线和年度节奏，生成可执行的行动建议。',
        title: '今日运势 — 奇门遁甲 AI',
        titleEn: 'Daily Fortune — Qimen AI',
        description: '基于奇门遁甲规则引擎，结合八字命局，生成每日、每周、每月运势分析。',
        descriptionEn: 'Rule-engine powered daily, weekly and monthly fortune analysis based on Qimen Dunjia and your Bazi.',
        ogImage: 'https://www.qimendao.com/images/home.jpg',
      },
    },
    {
      path: '/engineering', name: 'engineering', component: EngineeringView,
      meta: {
        seoTitle: '奇门遁甲规则引擎_排盘算法与评分审计 - 奇门道',
        seoDescription: '查看奇门遁甲排盘算法、宫位推演、评分证据和规则引擎审计细节，了解奇门道如何先排盘再解读。',
        title: '奇门工程模式 — 奇门遁甲 AI',
        titleEn: 'Engineering Mode — Qimen AI',
        description: '可视化奇门遁甲规则引擎，开放评分审计与宫位推演细节，供技术研究与验证使用。',
        descriptionEn: 'Visual Qimen rule engine with open scoring audit and palace details for technical research.',
        ogImage: 'https://www.qimendao.com/images/home.jpg',
      },
    },
    {
      path: '/bazi-static-demo', name: 'bazi-static-demo', component: BaziStaticPanelDemo,
    },
    {
      path: '/bazi-dynamic-demo', name: 'bazi-dynamic-demo', component: BaziDynamicPanelDemo,
    },
    {
      path: '/feedback', name: 'feedback', component: FeedbackView,
      meta: {
        title: '反馈与共创 — 奇门遁甲 AI',
        description: '提交产品反馈、功能建议或内容纠错，帮助奇门遁甲 AI 持续打磨。',
        ogImage: 'https://www.qimendao.com/images/home.jpg',
      },
    },
    { path: '/reset-password', name: 'reset-password', component: ResetPasswordView,
      meta: { title: '重置密码 — 奇门遁甲 AI', robots: 'noindex' } },
    { path: '/terms', name: 'terms', component: LegalView,
      meta: { title: '服务条款 — 奇门遁甲 AI' } },
    { path: '/privacy', name: 'privacy', component: LegalView,
      meta: { title: '隐私政策 — 奇门遁甲 AI' } },
    {
      path: '/admin', name: 'admin', component: AdminView,
      meta: { title: '管理员总览 — 奇门遁甲 AI', robots: 'noindex' },
    },
  ]
})

router.beforeEach((to) => {
  if (to.name === 'admin') {
    if (!globalState.authReady) return true
    if (globalState.currentUser?.app_metadata?.role !== 'admin') return { name: 'home' }
  }
  return true
})

export default router
