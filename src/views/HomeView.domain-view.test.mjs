import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./HomeView.vue', import.meta.url), 'utf8')

test('奇门结果卡片按四个模块顺序渲染且不展示 M 编号', () => {
  assert.match(source, /const getApiBase = \(\) =>/)
  assert.match(source, /\.qimen-1ff\.pages\.dev/)
  assert.match(source, /https:\/\/qimen\.oceanjustinlin\.workers\.dev/)
  assert.match(source, /const domainView = data\.domain_view/)
  assert.match(source, /<button class="mag-tab mag-tab-active" onclick="\$\{tabClick\('mag-m1'\)\}">结论先行<\/button>/)
  assert.match(source, /<button class="mag-tab" onclick="\$\{tabClick\('mag-m2'\)\}">奇门定基<\/button>/)
  assert.match(source, /<button class="mag-tab" onclick="\$\{tabClick\('mag-m3'\)\}">局象推演<\/button>/)
  assert.match(source, /<button class="mag-tab" onclick="\$\{tabClick\('mag-m4'\)\}">开运指南<\/button>/)
  assert.doesNotMatch(source, />M[1-4]\s/)
  assert.doesNotMatch(source, /M3\.\$\{index \+ 1\}/)
  assert.doesNotMatch(source, /<div class="report-subtitle">分数依据<\/div>/)

  const m1Index = source.indexOf('<section class="mag-section" id="mag-m1">')
  const m2Index = source.indexOf('<section class="mag-section" id="mag-m2">')
  const m3Index = source.indexOf('<section class="mag-section" id="mag-m3">')
  const m4Index = source.indexOf('<section class="mag-section" id="mag-m4">')

  assert.ok(m1Index > -1)
  assert.ok(m2Index > m1Index)
  assert.ok(m3Index > m2Index)
  assert.ok(m4Index > m3Index)
})

test('奇门定基和局象推演包含用神、四段推演和开运样式', () => {
  assert.match(source, /yongshen-card-grid/)
  assert.match(source, /reportM2\.yongshen_cards/)
  assert.match(source, /subject_day_stem_state/)
  assert.match(source, /target_yongshen_state/)
  assert.match(source, /constraint_factors/)
  assert.match(source, /interaction_decision/)
  assert.match(source, /target\?\.reading/)
  assert.match(source, /support\?\.summary/)
  assert.match(source, /itemsOf\(support\)/)
  assert.match(source, /renderFactorList/)
  assert.match(source, /card\?\.decision/)
  assert.match(source, /card\?\.reason/)
  assert.match(source, /reportM3\.self_state/)
  assert.match(source, /reportM3\.target_state/)
  assert.match(source, /reportM3\.constraints/)
  assert.match(source, /reportM3\.interaction_verdict/)
  assert.match(source, /environment_fengshui/)
  assert.match(source, /timing_behavior/)
  assert.match(source, /\.yongshen-card/)
  assert.match(source, /\.inference-card/)
  assert.match(source, /\.guidance-card/)
  assert.match(source, /overflow-wrap:\s*anywhere/)
})

test('奇门格局标签使用新容器恢复点击说明弹窗', () => {
  assert.match(source, /data-ge-reasons/)
  assert.match(source, /formation-tag-row/)
  assert.match(source, /tag\.closest\('\.formation-tag-row, \.ge-tags-row'\)/)
  assert.match(source, /ge-pop-kicker/)
  assert.match(source, /:deep\(\.ge-tag\)[\s\S]{0,320}border-radius:\s*999px/)
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
  assert.match(source, /const canUseApp = computed\(\(\) => Boolean\(currentUser\.value \|\| \(isGuest\.value && globalState\.guestAccessUnlocked && !isAuthLanding\.value\)\)\)/)
  assert.match(source, /enterGuestMode\(\)/)
  assert.match(source, /globalState\.guestAccessUnlocked/)
})

test('八字问答结果使用 mode 卡片而不是奇门分数泡泡', () => {
  assert.match(source, /const buildBaziQuestionCardHTML = \(data\) =>/)
  assert.match(source, /summary\.score !== null && summary\.score !== undefined/)
  assert.match(source, /bazi-mode-card/)
  assert.match(source, /bazi-timing-window-card/)
  assert.match(source, /if \(data\.branch === 'bazi' && data\.meta\?\.analysis_mode\)/)
})

test('奇门占卜结果分数旁不展示格局吉凶数量角标', () => {
  const summaryStart = source.indexOf('<section class="mag-hero" id="mag-hero">', source.indexOf('const buildCardHTML'))
  const summaryEnd = source.indexOf('</section>', summaryStart)
  const summarySource = source.slice(summaryStart, summaryEnd)

  assert.ok(summaryStart > -1)
  assert.ok(summaryEnd > summaryStart)
  assert.match(summarySource, /mag-verdict-badge/)
  assert.doesNotMatch(summarySource, /ge-corner-badges/)
  assert.doesNotMatch(summarySource, /geCornerHTML/)
})

test('奇门结果动态 HTML 使用标准属性引号以保留样式 class', () => {
  const cardStart = source.indexOf('const buildCardHTML = (data) => {')
  const cardEnd = source.indexOf('\n</script>', cardStart)
  const cardSource = source.slice(cardStart, cardEnd)

  assert.ok(cardStart > -1)
  assert.ok(cardEnd > cardStart)
  assert.match(cardSource, /<div class="mag-result tone-\$\{heroTone\}"/)
  assert.match(cardSource, /<div class="pan-cell"/)
  assert.doesNotMatch(cardSource, /[“”]/)
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
  assert.match(source, /:profile="snapshotProfile"/)
  assert.match(source, /:result-data="activeBaziResultData"/)
  assert.match(source, /<template #identity>/)
  assert.match(source, /原局命盘/)
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
  assert.match(component, /BaziPillarTable/)
  assert.match(component, /专业四柱大运流年/)
  assert.match(component, /linkage-row/)
  assert.match(component, /<slot name="identity"><\/slot>/)
  assert.doesNotMatch(component, /backing-identity/)
  assert.match(component, /xiaoyunList/)
  assert.match(component, /current_liunian/)
  assert.match(component, /selectedDayun/)
  assert.match(component, /流<br>月/)
  assert.match(component, /流<br>日/)
  assert.doesNotMatch(component, /命盘背书/)
})

test('专业排盘联动列表只使用八字档案矩阵数据，候选时间窗只做高亮', () => {
  const component = readFileSync(new URL('../components/BaziBackingPanel.vue', import.meta.url), 'utf8')
  assert.match(component, /const liunianList = computed\(\(\) => \{/)
  assert.match(component, /const topLevel = matrix\.value\?\.liunian_list/)
  assert.match(component, /fullDayunList = computed\(\(\) => \(resolvedMatrix\.value\?\.dayun_list \|\| \[\]\)\.filter\(d => !d\.isXiaoyun\)\)/)
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
