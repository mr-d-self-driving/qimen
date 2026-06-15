// scripts/prerender.mjs
//
// Post-build prerender for the Qimen SPA.
//
// Why: the app is a client-rendered Vue SPA, so crawlers that don't execute JS
// (Baidu / 搜狗 / 360 — the bulk of a Chinese 奇门遁甲 audience) only ever see an
// empty <div id="app">. This script boots the *built* app in headless Chromium,
// waits for it to render, and writes the resulting HTML back into dist/<route>/
// index.html. Each page ends up with its real per-route <title>/<meta>/canonical
// (injected by router.afterEach in src/main.js) and visible body text baked in.
//
// Safety: this is best-effort. Any failure (Chromium missing in the build image,
// a route that times out, etc.) is caught and logged, and the original SPA
// index.html fallback is left in place. The script always exits 0 so a flaky
// prerender never breaks the Cloudflare Pages deploy.

import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')

// Indexable routes only — must match public/sitemap.xml. Interactive tool pages
// (/bazi, /fortune) are included so crawlers at least get the correct title /
// description / canonical even though their body is mostly client-rendered.
const ROUTES = ['/', '/bazi', '/fortune', '/engineering', '/terms', '/privacy']

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

// Minimal static server with SPA fallback so /bazi etc. resolve to index.html.
function startServer() {
  const indexHtml = join(DIST, 'index.html')
  const server = createServer(async (req, res) => {
    try {
      const url = decodeURIComponent((req.url || '/').split('?')[0])
      let filePath = join(DIST, url)
      if (url.endsWith('/')) filePath = join(DIST, url, 'index.html')
      if (!existsSync(filePath) || !extname(filePath)) {
        filePath = indexHtml // SPA fallback
      }
      const body = await readFile(filePath)
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' })
      res.end(body)
    } catch {
      res.writeHead(404); res.end('Not found')
    }
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }))
  })
}

async function loadChromium() {
  try {
    const { chromium } = await import('playwright')
    return chromium
  } catch (e) {
    console.warn('[prerender] playwright unavailable, skipping prerender:', e.message)
    return null
  }
}

async function run() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.warn('[prerender] dist/index.html not found — run `vite build` first. Skipping.')
    return
  }
  const chromium = await loadChromium()
  if (!chromium) return

  let browser
  try {
    browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  } catch (e) {
    console.warn('[prerender] could not launch Chromium, skipping prerender:', e.message)
    return
  }

  const { server, port } = await startServer()
  const base = `http://127.0.0.1:${port}`
  let ok = 0

  for (const route of ROUTES) {
    const page = await browser.newPage()
    try {
      await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 20000 })
      // Wait until Vue has mounted something into #app.
      await page.waitForFunction(() => {
        const app = document.getElementById('app')
        return app && app.children.length > 0
      }, { timeout: 15000 })
      // Small settle for late async content (title/meta from router.afterEach).
      await page.waitForTimeout(800)

      const html = '<!DOCTYPE html>\n' + await page.evaluate(() => document.documentElement.outerHTML)

      const outPath = route === '/'
        ? join(DIST, 'index.html')
        : join(DIST, route, 'index.html')
      await mkdir(dirname(outPath), { recursive: true })
      await writeFile(outPath, html, 'utf-8')
      console.log(`[prerender] ✓ ${route} -> ${outPath.replace(DIST, 'dist')}`)
      ok++
    } catch (e) {
      console.warn(`[prerender] ✗ ${route} skipped: ${e.message}`)
    } finally {
      await page.close()
    }
  }

  await browser.close()
  server.close()
  console.log(`[prerender] done: ${ok}/${ROUTES.length} routes prerendered`)
}

run().catch((e) => {
  console.warn('[prerender] unexpected error, leaving SPA fallback intact:', e.message)
}).finally(() => process.exit(0))
