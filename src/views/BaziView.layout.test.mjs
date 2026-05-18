import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./BaziView.vue', import.meta.url), 'utf8')

test('专业页不再内联维护大运流年流月流日四套交互', () => {
  const matches = source.match(/class="item-body stacked-ganzhi"/g) || []
  assert.equal(matches.length, 0)
})

test('专业页大运流年交互交给 BaziBackingPanel', () => {
  assert.match(source, /<BaziBackingPanel/)
  assert.match(source, /:show-chart="false"/)
})

test('专业联动区包含流日与日运跳转入口', () => {
  assert.match(source, /BaziBackingPanel/)
  assert.match(source, /:show-chart="false"/)
  assert.match(source, /baziTimelineResultData/)
  assert.doesNotMatch(source, />看日运</)
})

test('全息八字专业页复用背书组件展示大运流年交互', () => {
  assert.match(source, /import BaziBackingPanel from/)
  assert.match(source, /<BaziBackingPanel/)
  assert.match(source, /:profile="activeProfile"/)
  assert.match(source, /analysis-mode="status"/)
})

test('新增排盘弹窗默认不预填出生时间', () => {
  assert.match(source, /const solarInput = reactive\(\{\s*text:\s*''\s*\}\)/s)
  assert.match(source, /solarInput\.text = ''/)
  assert.doesNotMatch(source, /solarInput\.text = '199001010000'/)
})

test('新增排盘弹窗手机宽度包含内边距避免关闭按钮溢出', () => {
  assert.match(source, /\.picker-overlay\s*\{[^}]*box-sizing:\s*border-box;/s)
  assert.match(source, /\.profile-picker-modal\s*\{[^}]*box-sizing:\s*border-box;/s)
  assert.match(source, /@media \(max-width:\s*420px\)[\s\S]*?\.picker-close\.dark\s*\{[^}]*width:\s*38px;/s)
})

test('身强身弱弹窗展示仪表盘并优先使用用户说明', () => {
  assert.match(source, /strength-meter-card/)
  assert.match(source, /aria-label="日主旺衰仪表盘"/)
  assert.match(source, /detail\?\.user_sections\?\.length/)
  assert.match(source, /scoreLabel:\s*''/)
})

test('格局弹窗优先展示结构化 pattern_analysis', () => {
  assert.match(source, /pattern_analysis/)
  assert.match(source, /取格步骤/)
  assert.match(source, /顺逆与成败/)
  assert.match(source, /climateAdjustment/)
  assert.match(source, /patternFinalName/)
  assert.match(source, /relationshipHealth/)
  assert.match(source, /normalizeTraitItems/)
})

test('访客添加档案后生成排盘按钮可点击并触发登录引导', () => {
  assert.match(source, /:disabled="isAnalyzing"/)
  assert.match(source, /showGuestLoginGuide\.value = true/)
  assert.match(source, /登录后可生成完整云端命理解读与日运联动/)
  assert.doesNotMatch(source, /:disabled="isAnalyzing \|\| isGuest"/)
})
