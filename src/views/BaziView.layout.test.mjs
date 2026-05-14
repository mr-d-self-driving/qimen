import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./BaziView.vue', import.meta.url), 'utf8')

test('大运流年流月流日都使用强制上下结构类名', () => {
  const matches = source.match(/class="item-body stacked-ganzhi"/g) || []
  assert.equal(matches.length, 4)
})

test('stacked-ganzhi 样式强制纵向排列', () => {
  assert.match(source, /\.stacked-ganzhi\s*\{[^}]*flex-direction:\s*column;/s)
})

test('专业联动区包含流日与日运跳转入口', () => {
  assert.match(source, /流日/)
  assert.match(source, /查看每日运势/)
  assert.doesNotMatch(source, />看日运</)
})

test('身强身弱弹窗展示仪表盘并优先使用用户说明', () => {
  assert.match(source, /strength-meter-card/)
  assert.match(source, /aria-label="日主旺衰仪表盘"/)
  assert.match(source, /detail\?\.user_sections\?\.length/)
  assert.match(source, /scoreLabel:\s*''/)
})
