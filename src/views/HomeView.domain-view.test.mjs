import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./HomeView.vue', import.meta.url), 'utf8')

test('结果卡片在行动建议后插入领域判断模块', () => {
  assert.match(source, /const domainView = data\.domain_view/)
  assert.match(source, /let domainViewHTML = ''/)
  assert.match(source, /\$\{domainViewHTML\}\s*\n\s*\$\{chartHTML\}/)

  const actionIndex = source.indexOf('<div class="ai-header-title">行动建议</div>')
  const domainIndex = source.indexOf('${domainViewHTML}')
  const chartIndex = source.indexOf('${chartHTML}')

  assert.ok(actionIndex > -1)
  assert.ok(domainIndex > actionIndex)
  assert.ok(chartIndex > domainIndex)
})

test('领域判断模块包含核心轴、流程、应期和决策样式', () => {
  assert.match(source, /domain-axis-grid/)
  assert.match(source, /domain-axis-card/)
  assert.match(source, /domain-section-grid/)
  assert.match(source, /domain-decision/)
  assert.match(source, /\.domain-axis-card/)
  assert.match(source, /overflow-wrap:\s*anywhere/)
})

test('奇门页使用顶部档案筛选器并移除旧八字注入开关', () => {
  assert.match(source, /qimen-profile-panel/)
  assert.match(source, /profile-switch-trigger/)
  assert.match(source, /添加八字档案/)
  assert.match(source, /goToBaziProfiles/)
  assert.doesNotMatch(source, /注入命主八字分析/)
  assert.doesNotMatch(source, /bazi-toggle/)
  assert.doesNotMatch(source, /v-model="baziEnabled"/)
})

test('奇门占卜提交不再强制要求八字档案但会自动携带已选档案摘要', () => {
  assert.doesNotMatch(source, /baziEnabled\.value && baziState\.value !== 'ready'/)
  assert.doesNotMatch(source, /window\.confirm\('这个问题更适合结合八字命局与奇门事件盘/)
  assert.match(source, /baziInfo:\s*currentBaziString\.value \|\| null/)
  assert.match(source, /hasBaziProfile:\s*Boolean\(selectedProfileId\.value \|\| baziProfiles\.value\.length\)/)
})
