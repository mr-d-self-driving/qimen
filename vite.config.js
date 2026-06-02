import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

function baziPanelMiddleware() {
  return {
    name: 'bazi-panel-dev',
    configureServer(server) {
      server.middlewares.use('/api/bazi-panel', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405); res.end('Method Not Allowed'); return
        }
        try {
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const body = JSON.parse(Buffer.concat(chunks).toString())
          const profile = body.profileData
          if (!profile?.bazi_detail?.matrix?.pillars?.length) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: '缺少 bazi_detail.matrix' })); return
          }
          const { computePanelData } = require('./lib/baziQuestionCore.js')
          const result = computePanelData(profile, {
            category: body.category,
            subcategory: body.subcategory,
            analysis_mode: body.analysis_mode
          })
          if (!result) {
            res.writeHead(422, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: '该模式不支持 panel 计算' })); return
          }
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(result))
        } catch (e) {
          console.error('[bazi-panel middleware]', e)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [vue(), baziPanelMiddleware()],
  server: {
    proxy: {
      '/api': {
        target: 'https://qimen.oceanjustinlin.workers.dev',
        changeOrigin: true,
      }
    }
  }
})
