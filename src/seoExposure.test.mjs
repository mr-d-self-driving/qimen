import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const routerSource = readFileSync(new URL('./router/index.js', import.meta.url), 'utf8')
const mainSource = readFileSync(new URL('./main.js', import.meta.url), 'utf8')
const homeSource = readFileSync(new URL('./views/HomeView.vue', import.meta.url), 'utf8')
const sitemapSource = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8')
const robotsSource = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8')

test('首页静态 head 主推中文搜索标题和描述', () => {
  assert.match(indexHtml, /<title>奇门遁甲在线排盘_AI解盘与八字运势分析 - 奇门道<\/title>/)
  assert.match(indexHtml, /content="奇门道提供免费的奇门遁甲在线排盘、AI 解盘、八字四柱排盘与每日运势分析。/)
  assert.match(indexHtml, /<meta property="og:site_name" content="奇门道">/)
  assert.match(indexHtml, /<meta name="twitter:title" content="奇门遁甲在线排盘_AI解盘与八字运势分析 - 奇门道">/)
})

test('路由 SEO meta 使用中文优先字段，避免浏览器语言把搜索标题切到英文', () => {
  assert.match(routerSource, /seoTitle:\s*'奇门遁甲在线排盘_AI解盘与八字运势分析 - 奇门道'/)
  assert.match(routerSource, /seoTitle:\s*'八字排盘_在线四柱八字、喜用神与大运流年分析 - 奇门道'/)
  assert.match(routerSource, /seoTitle:\s*'今日运势查询_每日\/每周\/月度八字运势分析 - 奇门道'/)
  assert.match(mainSource, /const title = m\.seoTitle \?\? m\.title/)
  assert.doesNotMatch(mainSource, /const title = \(isEn \? m\.titleEn : m\.title\)/)
})

test('首页包含可索引的产品承接、功能入口和 FAQ 内容', () => {
  assert.match(homeSource, /seo-landing/)
  assert.match(homeSource, /奇门遁甲在线排盘与 AI 解盘/)
  assert.match(homeSource, /规则引擎先排盘，AI 负责解释/)
  assert.match(homeSource, /奇门问事/)
  assert.match(homeSource, /八字排盘/)
  assert.match(homeSource, /今日运势/)
  assert.match(homeSource, /常见问题/)
})

test('结构化数据和爬虫文件服务中文 SEO', () => {
  assert.match(indexHtml, /"@type":\s*\["WebApplication", "SoftwareApplication"\]/)
  assert.match(indexHtml, /"name":\s*"奇门道"/)
  assert.match(indexHtml, /"@type":\s*"FAQPage"/)
  assert.match(sitemapSource, /<lastmod>2026-05-22<\/lastmod>/)
  assert.doesNotMatch(sitemapSource, /hreflang="en" href="https:\/\/www\.qimendao\.com\/"/)
  assert.match(robotsSource, /Disallow: \/admin/)
})
