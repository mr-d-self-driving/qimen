// src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n/index.mjs'

// 引入全局 CSS（稍后创建）
import './styles/global.css'

// Update <title>, <meta name="description">, robots, and OG tags on every navigation.
// Keeps tab titles correct for humans and social-share previews accurate per route.
router.afterEach((to) => {
  const m = to.meta ?? {}

  const title = m.seoTitle ?? m.title ?? '奇门遁甲在线排盘_AI解盘与八字运势分析 - 奇门道'
  document.title = title

  setMeta('name', 'description', m.seoDescription ?? m.description ?? '')
  setMeta('name', 'robots', m.robots ?? 'index, follow')
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', m.seoDescription ?? m.description ?? '')
  setMeta('property', 'og:url', `https://www.qimendao.com${to.path === '/' ? '' : to.path}`)
  if (m.ogImage) setMeta('property', 'og:image', m.ogImage)

  const canonical = `https://www.qimendao.com${to.path === '/' ? '' : to.path}`
  let link = document.querySelector('link[rel="canonical"]')
  if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
  link.href = canonical
})

function setMeta(attr, key, value) {
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute('content', value)
}

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

app.mount('#app')
