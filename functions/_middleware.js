/**
 * Cloudflare Pages Middleware — SEO bot prerender
 *
 * Problem: qimendao.com is a Vue SPA. Crawlers (Googlebot, Baiduspider, etc.)
 * see an empty <div id="app"></div> and can't index page content.
 *
 * Solution: detect crawler User-Agents and return a lightweight static HTML
 * shell with route-specific <title>, <meta name="description">, and OG tags.
 * Real users pass through to the normal SPA, zero impact on UX.
 */

const BOT_UA =
  /googlebot|google-inspectiontool|baiduspider|bingbot|yandexbot|duckduckbot|slurp|twitterbot|facebookexternalhit|linkedinbot|whatsapp|telegrambot|applebot|semrushbot|ahrefsbot|mj12bot/i

const SITE_URL = 'https://www.qimendao.com'
const DEFAULT_IMAGE = `${SITE_URL}/images/home.jpg`

/** Route-level meta. Keep in sync with src/router/index.js. */
const ROUTE_META = {
  '/': {
    title: '奇门遁甲 AI 引擎 — 免费在线排盘推演',
    titleEn: 'Qimen Dunjia AI Engine — Free Online Divination',
    description:
      '先让规则落盘，再让模型开口。输入时间地点，实时生成奇门遁甲局盘与 AI 解读。时间、干支、宫位、评分全由规则引擎算出，不留给模型猜。',
    descriptionEn:
      'Rules first, then AI interprets. Enter time and location to generate a Qimen Dunjia chart with full AI analysis. Time, stems, branches, palaces and scores are all computed by the rule engine.',
    image: DEFAULT_IMAGE,
    h1: '奇门遁甲 AI 引擎',
    intro: '先让规则落盘，再让模型开口。确定性优先的奇门遁甲在线推演平台。',
  },
  '/bazi': {
    title: '八字四柱排盘 — 奇门遁甲 AI',
    titleEn: 'Bazi Four Pillars Chart — Qimen AI',
    description: '专业四柱八字排盘，十神分析、格局判断、大运流年一键生成。',
    descriptionEn:
      'Professional Bazi four-pillars chart: ten gods analysis, pattern judgment, major cycles and yearly luck in one click.',
    image: `${SITE_URL}/images/bazi_1.jpg`,
    h1: '八字四柱排盘',
    intro: '专业四柱八字排盘，十神分析、格局判断、大运流年一键生成。',
  },
  '/fortune': {
    title: '今日运势 — 奇门遁甲 AI',
    titleEn: 'Daily Fortune — Qimen AI',
    description:
      '基于奇门遁甲规则引擎，结合八字命局，生成每日、每周、每月运势分析。',
    descriptionEn:
      'Rule-engine powered daily, weekly and monthly fortune analysis combining Qimen Dunjia chart and your Bazi.',
    image: DEFAULT_IMAGE,
    h1: '今日运势',
    intro: '基于奇门遁甲规则引擎，结合八字命局，生成每日、每周、每月运势分析。',
  },
  '/engineering': {
    title: '奇门工程模式 — 奇门遁甲 AI',
    titleEn: 'Engineering Mode — Qimen AI',
    description:
      '可视化奇门遁甲规则引擎，开放评分审计与宫位推演细节，供技术研究与验证使用。',
    descriptionEn:
      'Visual Qimen rule engine with open scoring audit and palace-level details for technical research and verification.',
    image: DEFAULT_IMAGE,
    h1: '奇门工程模式',
    intro: '可视化奇门遁甲规则引擎，开放评分审计与宫位推演细节。',
  },
  '/terms': {
    title: '服务条款 — 奇门遁甲 AI',
    titleEn: 'Terms of Service — Qimen AI',
    description: '奇门遁甲 AI 引擎服务条款。',
    descriptionEn: 'Terms of service for the Qimen Dunjia AI Engine.',
    image: DEFAULT_IMAGE,
    h1: '服务条款',
    intro: '奇门遁甲 AI 引擎服务条款。',
  },
  '/privacy': {
    title: '隐私政策 — 奇门遁甲 AI',
    titleEn: 'Privacy Policy — Qimen AI',
    description: '奇门遁甲 AI 引擎隐私政策。',
    descriptionEn: 'Privacy policy for the Qimen Dunjia AI Engine.',
    image: DEFAULT_IMAGE,
    h1: '隐私政策',
    intro: '奇门遁甲 AI 引擎隐私政策。',
  },
}

function buildBotHtml(pathname, meta, lang) {
  const isEn = lang === 'en'
  const title = isEn ? meta.titleEn : meta.title
  const description = isEn ? meta.descriptionEn : meta.description
  const h1 = meta.h1
  const intro = meta.intro
  const canonical = `${SITE_URL}${pathname === '/' ? '' : pathname}`

  return `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'zh-CN'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escAttr(description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escAttr(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="奇门遁甲 AI 引擎">
  <meta property="og:title" content="${escAttr(title)}">
  <meta property="og:description" content="${escAttr(description)}">
  <meta property="og:image" content="${escAttr(meta.image)}">
  <meta property="og:url" content="${escAttr(canonical)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escAttr(title)}">
  <meta name="twitter:description" content="${escAttr(description)}">
  <meta name="twitter:image" content="${escAttr(meta.image)}">
</head>
<body>
  <h1>${escHtml(h1)}</h1>
  <p>${escHtml(intro)}</p>
  <nav>
    <a href="${SITE_URL}/">奇门遁甲</a> |
    <a href="${SITE_URL}/bazi">八字排盘</a> |
    <a href="${SITE_URL}/fortune">今日运势</a> |
    <a href="${SITE_URL}/engineering">工程模式</a>
  </nav>
</body>
</html>`
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
}

function detectLang(request) {
  const accept = request.headers.get('accept-language') ?? ''
  return accept.toLowerCase().startsWith('en') ? 'en' : 'zh'
}

export async function onRequest({ request, next }) {
  const ua = request.headers.get('user-agent') ?? ''

  // Non-bot: pass through to the SPA unchanged.
  if (!BOT_UA.test(ua)) return next()

  const url = new URL(request.url)
  const pathname = url.pathname

  // API and static asset paths: never intercept.
  if (pathname.startsWith('/api/') || pathname.includes('.')) return next()

  const meta = ROUTE_META[pathname] ?? ROUTE_META['/']
  const lang = detectLang(request)
  const html = buildBotHtml(pathname, meta, lang)

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': 'public, max-age=3600',
      'x-robots-tag': 'index, follow',
    },
  })
}
