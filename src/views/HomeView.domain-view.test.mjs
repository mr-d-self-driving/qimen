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

test('奇门占卜提交不再强制要求八字档案且仅 hybrid 携带已选档案摘要', () => {
  assert.doesNotMatch(source, /baziEnabled\.value && baziState\.value !== 'ready'/)
  assert.doesNotMatch(source, /window\.confirm\('这个问题更适合结合八字命局与奇门事件盘/)
  assert.match(source, /baziInfo:\s*\(routeData\.branch === 'qimen'\) \? null : \(currentBaziString\.value \|\| null\)/)
  assert.match(source, /hasBaziProfile:\s*Boolean\(selectedProfileId\.value \|\| baziProfiles\.value\.length\)/)
})

test('登录或注册落地页显式覆盖访客应用视图', () => {
  assert.match(source, /const isAuthLanding = computed\(\(\) => \['login', 'register'\]\.includes\(route\.query\.auth\)\)/)
  assert.match(source, /const canUseApp = computed\(\(\) => Boolean\(currentUser\.value \|\| \(isGuest\.value && !isAuthLanding\.value\)\)\)/)
})

test('八字问答结果使用 mode 卡片而不是奇门分数泡泡', () => {
  assert.match(source, /const buildBaziQuestionCardHTML = \(data\) =>/)
  assert.match(source, /summary\.score !== null && summary\.score !== undefined/)
  assert.match(source, /bazi-mode-card/)
  assert.match(source, /bazi-timing-window-card/)
  assert.match(source, /if \(data\.branch === 'bazi' && data\.meta\?\.analysis_mode\)/)
})

test('八字问答结果把枚举 meta 渲染为用户可读标签', () => {
  assert.match(source, /baziAnalysisModeLabel/)
  assert.match(source, /当前状态/)
  assert.match(source, /精确领域/)
  assert.match(source, /const metaHTML = ''/)
  assert.doesNotMatch(source, /<span>\$\{meta\.analysis_mode \|\| 'bazi'\}<\/span>/)
  assert.doesNotMatch(source, /<span>\$\{meta\.target\.fallback_level\}<\/span>/)
  assert.doesNotMatch(source, /<div class="bazi-meta-row">/)
})

test('八字问答结果挂载原局排盘背书板块', () => {
  assert.match(source, /import BaziBackingPanel from/)
  assert.match(source, /activeBaziResultData/)
  assert.match(source, /<BaziBackingPanel/)
  assert.match(source, /:profile="activeBaziProfile"/)
  assert.match(source, /:result-data="activeBaziResultData"/)
})

test('八字问答结果按 PRD 补齐 pattern character 和 timing 字段展示', () => {
  assert.match(source, /先天结构适配/)
  assert.match(source, /mode\.structural_supports/)
  assert.match(source, /mode\.structural_risks/)
  assert.match(source, /人物倾向画像/)
  assert.match(source, /buildPortraitBlockHTML/)
  assert.match(source, /mode\.appearance_tendency/)
  assert.match(source, /mode\.personality_tendency/)
  assert.match(source, /mode\.career_style/)
  assert.match(source, /mode\.best_window/)
  assert.match(source, /mode\.avoid_window/)
  assert.doesNotMatch(source, /mode\.why_not_now/)
})

test('八字问答行动建议展示 strategy 之外的 advice 价值字段', () => {
  assert.match(source, /advice\.risk/)
  assert.match(source, /advice\.avoid/)
  assert.match(source, /advice\.timing/)
  assert.match(source, /advice\.leverage/)
  assert.match(source, /建议节奏/)
  assert.match(source, /借势方法/)
  assert.match(source, /buildBaziAdviceRowsHTML/)
  assert.match(source, /bazi-advice-row/)
  const adviceExtraStart = source.indexOf('const buildBaziAdviceExtrasHTML')
  const adviceExtraEnd = source.indexOf('const buildBaziQuestionCardHTML')
  const adviceExtraSource = source.slice(adviceExtraStart, adviceExtraEnd)
  assert.doesNotMatch(adviceExtraSource, /bazi-reading-block/)
})

test('八字问答判断依据展示收敛后的 logic 长文', () => {
  assert.match(source, /summary\.basis\?\.logic/)
  assert.match(source, /bazi-basis-summary/)
  assert.doesNotMatch(source, /interaction_summary/)
})

test('八字问答前端展示收敛后的 schema 字段', () => {
  assert.match(source, /summary\.basis\?\.logic/)
  assert.doesNotMatch(source, /interaction_summary/)
  assert.doesNotMatch(source, /mode\.why_not_now/)
  assert.doesNotMatch(source, /mode\.domain_fit/)
  assert.doesNotMatch(source, /mode\.innate_ceiling/)
  assert.doesNotMatch(source, /mode\.domain_state/)
  assert.match(source, /支撑/)
  assert.match(source, /阻力/)
  assert.match(source, /依据/)
})

test('八字问答结果不展示兼容 analysis 摘要和 fallback 边界提示', () => {
  assert.doesNotMatch(source, /命理要点/)
  assert.doesNotMatch(source, /参考边界/)
  assert.doesNotMatch(source, /buildCompatAnalysisHTML/)
  assert.doesNotMatch(source, /const limitationsHTML/)
})

test('背书板块采用八字档案专业排盘结构而不是临时卡片', () => {
  const component = readFileSync(new URL('../components/BaziBackingPanel.vue', import.meta.url), 'utf8')
  assert.match(component, /bazi-table/)
  assert.match(component, /专业四柱大运流年/)
  assert.match(component, /linkage-row/)
  assert.match(component, /profileTitle/)
  assert.match(component, /profileTags/)
  assert.match(component, /xiaoyunList/)
  assert.match(component, /current_liunian/)
  assert.match(component, /current_dayun/)
  assert.match(component, /流<br>月/)
  assert.match(component, /流<br>日/)
  assert.doesNotMatch(component, /命盘背书/)
})

test('专业排盘联动列表只使用八字档案矩阵数据，候选时间窗只做高亮', () => {
  const component = readFileSync(new URL('../components/BaziBackingPanel.vue', import.meta.url), 'utf8')
  assert.match(component, /const liunianList = computed\(\(\) => matrix\.value\.liunian_list \|\| \[\]\)/)
  assert.match(component, /fullDayunList = computed\(\(\) => \(matrix\.value\.dayun_list \|\| \[\]\)\.filter\(dayun => !dayun\.isXiaoyun\)\)/)
  assert.match(component, /windowByYear/)
  assert.match(component, /dayunHasWindow/)
  assert.doesNotMatch(component, /props\.analysisMode === 'timing' && windows\.value\.length/)
  assert.doesNotMatch(component, /source\.filter\(item => years\.has\(item\.year\)\)/)
})

test('历史抽屉里的八字记录不展示分数', () => {
  assert.match(source, /isBaziRecord\(item\)/)
  assert.match(source, /v-if="!isBaziRecord\(item\)"/)
})

test('八字问答前端过滤工程化内部表达', () => {
  assert.match(source, /sanitizeBaziDisplayText/)
  assert.match(source, /concreteTargetLabel/)
  assert.match(source, /置信度需下调/)
  assert.match(source, /estimated/)
  assert.match(source, /目标十神/)
})
