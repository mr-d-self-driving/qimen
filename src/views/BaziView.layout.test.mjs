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
  assert.doesNotMatch(source, /<template #identity>/)
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

test('调候诊断摘要不展示独立详情小 i', () => {
  const start = source.indexOf('<!-- 调候诊断 -->')
  const end = source.indexOf('<!-- 五行能量池 -->', start)
  const block = source.slice(start, end)

  assert.ok(start > -1)
  assert.ok(end > start)
  assert.doesNotMatch(block, /activeInfoPanel = 'tiaohou'/)
  assert.doesNotMatch(block, /查看调候详情/)
})

test('天机锦囊底部弹层使用旺衰同款文本流布局', () => {
  const start = source.indexOf("activeInfoPanel === 'scoring'")
  const end = source.indexOf('<Teleport to="body">', start + 1)
  const block = source.slice(start, end)

  assert.ok(start > -1)
  assert.ok(end > start)
  assert.match(block, /scoring-detail-drawer/)
  assert.match(block, /drawer-head-title">天机锦囊/)
  assert.match(block, /scoring-section-heading[\s\S]*insight-prose-label">喜用分析/)
  assert.match(block, /scoring-section-heading[\s\S]*insight-prose-label">五维影响概览/)
  assert.match(block, /insight-prose-list scoring-prose-list/)
  assert.match(source, /const scoringInfluenceRows = computed/)
  assert.doesNotMatch(block, /以下只展示/)
  assert.doesNotMatch(block, /decision-chain-list/)
  assert.doesNotMatch(block, /scoring-item/)
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

test('旺衰格局卡和格局洞察并入形象校验', () => {
  assert.match(source, /detail\.image_analysis/)
  assert.match(source, /primary_candidate/)
  assert.match(source, /形象匹配度/)
  assert.match(source, /基础格局/)
  assert.match(source, /形象校验/)
  assert.match(source, /imageCandidate\.dimensions/)
  assert.match(source, /imageCandidate\.penalties/)
})

test('前端八字引擎期望版本同步到 1.7.0', () => {
  assert.match(source, /const BAZI_ENGINE_VERSION = '1\.7\.0'/)
})

test('访客添加档案后生成排盘按钮可点击并触发登录引导', () => {
  assert.match(source, /:disabled="isAnalyzing"/)
  assert.match(source, /showGuestLoginGuide\.value = true/)
  assert.match(source, /登录后可生成完整云端命理解读与日运联动/)
  assert.doesNotMatch(source, /:disabled="isAnalyzing \|\| isGuest"/)
})

test('访客或空档案状态也能展开命主菜单', () => {
  assert.match(source, /const toggleProfileMenu = \(\) => \{\s*isProfileMenuOpen\.value = !isProfileMenuOpen\.value\s*\}/)
  assert.doesNotMatch(source, /if \(!showProfileSwitcher\.value\) return/)
  assert.match(source, /class="sheet-empty"/)
})

test('访客档案限制说明不再使用圆角提示框', () => {
  assert.match(source, /\.guest-limit-note\s*\{[^}]*border:\s*0;/s)
  assert.match(source, /\.guest-limit-note\s*\{[^}]*background:\s*transparent;/s)
  assert.doesNotMatch(source, /\.guest-limit-note\s*\{[^}]*border-radius:/s)
})
