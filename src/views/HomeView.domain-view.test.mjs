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
