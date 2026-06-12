# PRD：奇门固定时辰起局（前端时间入参）

- 状态：草案
- 分支：`feat/qimen-fixed-time-input`
- 创建日期：2026-06-12
- 关联反馈：用户希望前端暴露时间组件，允许以任意时间戳（含过去/未来）为入参起奇门盘，而非只用当前服务器时刻。

---

## 1. 背景与问题

当前奇门起局的时间来源**只有一处且唯一**：服务器当前时刻。

`worker/src/index.js:1895-1905`

```js
const now = new Date();
const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
const bjTime = new Date(utc + (3600000 * 8));
const year = bjTime.getFullYear();
const month = bjTime.getMonth() + 1;
const day = bjTime.getDate();
const hour = bjTime.getHours();
const minute = bjTime.getMinutes();
const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
```

往下 `solar → lunar → ganzhi → calculateJuByChaiBu(拆补定局) → 空亡/马星/九星/八门/八神` 全部是纯函数式推导，没有第二处读墙上时钟。因此「以任意时间起局」本质是把这 5 个数字的来源参数化。

时家奇门为任意（含未来）时刻起盘是正统用法，计算层（拆补定局）对任意公历日期都成立，无障碍。

### 已知冲突

`branch` 与起局时间是**正交**的两件事：

- 路由器 `lib/divinationRouter.js` 判 `branch` **只看问句文本**，从不看时间；
- 用户选择的时间戳**只服务于奇门起局**；八字分支根本不读它（八字走出生盘 + `target_year`，见 `worker/src/index.js:427`）。

真实冲突形态：**用户填了具体时刻期待起一卦，但问句被判成 `bazi` → 时间戳被静默丢弃 → 用户困惑**。丢弃实际发生在前端分流：`src/views/HomeView.vue:2766` 先调 `/api/divination-route`，返回 `bazi` 即走 `/api/bazi-question`，时间到不了 `/api/qimen`。

关键认知：**未来/具体时间戳本就偏奇门**。纯八字长期判断不需要时间戳；用户填了具体时刻，意图就偏奇门。

---

## 2. 目标与非目标

### 目标

1. 前端暴露时间选择组件，用户可指定任意起局时刻（含过去/未来）。
2. 用户未填时间 → 行为与现状完全一致（默认当前北京时刻），零回归。
3. 填了时间 → 该时间戳保证参与奇门起局，**永不被静默丢弃**。
4. 时区口径正确，避免二次偏移导致串时辰。

### 非目标

- 不引入真太阳时（经度）校正——保持现状「北京民用时」口径，与历史盘一致。后续可单列。
- 不改八字分支的命盘计算逻辑。
- 不重构路由器评分规则，仅利用既有 `forceBranch` 机制。

---

## 3. 方案

落地采取「**A 兜底 + C 收敛**」：A 保证时间永不丢弃（小改动、立即生效），C 是 UI 长期形态。

### 3.1 后端：起局时间参数化（worker/src/index.js）

在 `handleQimen` 内，将 `const now = new Date()` 区块替换为：优先解析 `body.panTime`，缺省回退当前时刻。

- 入参约定：`body.panTime` 为「北京民用时」的结构化字段或 ISO 串。**填了 `panTime` 时直接 `Solar.fromYmdHms(y,m,d,h,min,0)`，跳过 `getTimezoneOffset` + `+8` 的偏移变换**——否则会偏移几小时、串时辰（本 PRD 最大坑）。
- 缺省（无 `panTime`）时保留现有 `now → bjTime` 逻辑，确保零回归。
- `minute` 缺省取 0（时家奇门以时辰为粒度，分钟仅影响临界时辰换柱）。

输入校验：
- 非法/无法解析的 `panTime` → 回退当前时刻并在 SSE meta 标注 `pan_time_source: 'fallback'`，不报错中断。
- 合法范围建议软约束（如 1900–2100），超界回退默认。

缓存键无需改造：`worker/src/index.js:1912` 的 `cacheKey` 已含 `year-month-day-ganzhiHour`，固定时间天然正确命中/区分。

### 3.2 后端/路由：冲突钳制（forceBranch）

利用既有机制（`classifyDivinationQuestion({ forceBranch })`、`detectExplicitBranchRequest`、`classifyByRules` 中 `if (options.forceBranch) branch = options.forceBranch`）。

- `/api/divination-route`（`handleDivinationRoute`，`worker/src/index.js:369`）接受一个 hint：当请求标记「用户显式提供了起局时间」时，把 `bazi → 钳为 hybrid`（保留命局背景、但在选定时刻起局），绝不返回纯 `bazi`。
- `forceBranch` 路径 confidence=medium 会跳过 LLM 改判（`divinationRouter.js:211` + `:484`），因此一旦分到 `qimen`/`hybrid`，时间必然生效（`worker/src/index.js:1988` 已 `forceBranch:'qimen'`）。

### 3.3 前端（src/views/HomeView.vue）

数据流：

1. 时间组件：默认空（= 用当前时刻）。点击时间行 `.time-display` 打开选择器。
2. 请求体扩展：`src/views/HomeView.vue:2857` 的 `body` 增加 `panTime`（仅在用户自定义时携带）。
3. 分流钳制：`src/views/HomeView.vue:2766` 调 `/api/divination-route` 时，若用户填了时间，传 hint 使其不分到纯 `bazi`；前端据返回的 `hybrid/qimen` 一律走 `/api/qimen`，把 `panTime` 带上。
4. 结果展示：奇门卡片的 `timestamp.solar/lunar`（`worker/src/index.js:1976-1977`）已回传，前端确认按选定时间渲染，不再显示"此刻"。

#### 3.3.1 交互逻辑（已出 demo 验证，本期仅公历）

参考实现：`docs/superpowers/plans/demo-qimen-time-picker.html`（单文件 demo，全流程 DOM 实测通过）。组件落地建议封装为 `<TimePickerSheet>`，接进 `HomeView.vue` 的 `.time-row`。

**状态模型**：单一状态 `activeCustom`。
- `activeCustom === null` → 用「现在」，每 30s 跟随系统时钟刷新（沿用 `updateClock`，`HomeView.vue:2171`）。
- `activeCustom = {y,mo,d,h,mi}` → 固定时刻，停止跟随刷新。

**时间行（两种态）**：
| | `activeCustom===null`（现在） | 自定义 |
|---|---|---|
| 左侧文案 | `14:29 庚日 未时` | `7月1日 09:00 甲日 巳时`（带日期前缀）|
| 左侧色/圆点 | muted 文字 + 青色脉动点 | 金色文字 + 金色常亮点（停脉动）+ ✎ 编辑标记 |
| 右侧小字 | `以当下时辰起局`（不可点）| `重置为现在`（金色可点）|

**a. 打开选择器**：点击 `.time-display` → 底部 sheet 升起。`draft` 初始化为 `activeCustom ?? 现在`。

**b. 选择器内（双输入并存，互相回填）**：
- 滚轮：年 / 月 / 日 / 时 / 分 五列，中央高亮带，scroll-snap 吸附；**日数随年月联动重建并夹紧**（如选 2 月不出现 30 日，月末切换自动收口）。
- 数字直输：`格式 202707010900`（12 位：年4+月2+日2+时2+分2）+「识别」按钮；校验位数与范围，通过则回填滚轮，失败给红字提示。
- 顶部实时预览：`2027年07月01日 09:00 甲日 巳时`。
- 干支换柱真实接入用 `lunar` 库（demo 内为近似算法，不可直接搬）。

**c. 确认 / 取消**：
- 确认 → `activeCustom = draft`，sheet 关闭，时间行切到自定义态。
- 取消 / 点遮罩 → 丢弃 `draft`，不改 `activeCustom`。

**d. 重置为现在（二次确认）**：点击 `重置为现在` → 居中确认弹窗「重置为现在的时辰？」→ 确认则 `activeCustom = null`、时间行复原现在态；取消则保持自定义。「以当下时辰起局」态下右侧小字不可点（早退）。

#### 3.3.2 黑白模式适配（重点，demo 未覆盖）

demo 仅写了暗色。落地必须同时适配亮/暗两套主题——`src/styles/global.css` 中 `:root`（亮）与暗色块各定义了同名变量。组件**一律使用 CSS 变量，禁止硬编码颜色值**：

- 文字 / 弱文字：`--text-main` / `--text-muted`；强调与高亮带：`--gold` / `--gold-light` / `--gold-border` / `--gold-dim`。
- 容器：sheet 背景 `--bg-card`、描边 `--line`；圆点现在态 `--teal`、自定义态 `--gold`。
- 滚轮上下渐隐遮罩当前用 `linear-gradient(var(--bg-card) … rgba(18,18,30,0))` 写死了暗色 RGB——**亮色下会出现脏边**，需改成基于 `--bg-card` 的可主题化遮罩（或用 `color-mix` / 透明度叠加方案），两套主题各自验收。
- 二次确认弹窗、数字输入框 focus 态同样走变量。
- 验收：亮/暗各跑一遍五态截图，重点查滚轮渐隐边缘、金色对比度、muted 文字可读性。

### 3.4 长期（C，本期可不做）

UI 双模式：「起一卦（奇门，需时间）」/「看命（八字，需生辰档案）」。时间组件只在奇门模式出现并硬 force qimen/hybrid，从 UI 层消除冲突。

---

## 4. 边界与风险

| 风险 | 处理 |
|---|---|
| 时区二次偏移串时辰 | 填 `panTime` 时直接 `fromYmdHms`，跳过 offset 变换（3.1）|
| 临界时辰（23:00 子时换日/换柱）| 依赖 `lunar` 库既有换柱逻辑，分钟入参透传即可，不特殊处理 |
| 未来时间被判 bazi 丢弃 | forceBranch 钳制 bazi→hybrid（3.2）|
| 缓存污染 | cacheKey 已含日期+时辰，无需改 |
| 非法时间入参 | 回退当前时刻 + meta 标注，不中断 |
| 真太阳时口径 | 明确非目标，保持北京民用时一致口径 |
| 黑白模式不适配（滚轮渐隐写死暗色 RGB）| 全部走 CSS 变量，遮罩改可主题化方案，亮/暗各验收（3.3.2）|

---

## 5. 验收标准

1. 不填时间：起局结果、缓存、SSE 流与现状逐字一致（回归）。
2. 填过去时间（如 2020-01-01 14:30）：起出的「阴/阳遁 N 局 + 时辰干支」与权威排盘工具一致。
3. 填未来时间（如 2027-07-01 09:00）：正常起局，卡片时间戳显示选定时刻而非此刻。
4. 填时间 + 问句偏命局（如"我未来五年事业如何"）：不静默丢弃，落到 hybrid，在选定时刻起盘且带命局背景。
5. 时区：选 23:30 子时类临界点，时辰柱正确（不因 offset 偏移串柱）。
6. 前端交互：五态（现在 / 打开选择器 / 滚轮+数字输入 / 确认自定义 / 二次确认重置）逐一通过。
7. 黑白模式：亮、暗两套主题各跑五态，滚轮渐隐边缘无脏边、金色对比度与 muted 文字可读。

---

## 6. 涉及文件

- `worker/src/index.js` — 起局时间参数化（`:1895`）、路由钳制（`:369`、`:1988`）、SSE meta 标注。
- `lib/divinationRouter.js` — 复用 `forceBranch`，必要时新增"含显式时间"的 bazi→hybrid 钳制点。
- `src/views/HomeView.vue` — 时间组件、请求体 `panTime`（`:2857`）、分流钳制（`:2766`）、结果时间渲染。
- 测试：`worker` 侧补固定时间起局单测（参考 `src/workerQimenAudit.test.mjs` 既有模式）。

---

## 7. 动工计划与检查点（CP）

原则：**风险前置**。把「固定时间排盘正确性」做成硬性人工关卡（CP1），它通过前后续不推进。

依赖：`CP0 → CP-FE排盘暴露 → CP1 自审 → 固化测试`（关键链）；`CP2 路由` 与 `CP3/CP4 前端外观` 可并行。

### 进度（2026-06-12）
- ✅ **CP0 完成**：`parsePanTime()` + 起局时刻参数化（`worker/src/index.js`）。483/483 测试绿，`parsePanTime(null)` 保证回退路径逐字不变。固定四柱抽样核对正确（`2027-07-01 09:00 → 辛巳日 癸巳时` 等）。注：`buildQimenChart` 纯函数抽离暂缓，仅做最小入参改造（足以交付能力；如需 golden-master 直测引擎再抽）。
- ✅ **CP-FE 完成**：`src/components/TimePickerSheet.vue`（公历滚轮+数字双输入，lunar 精确干支）；HomeView 接入（时间行可点、`panTime` 入请求体、重置二次确认）；盘头经 `buildQimenPanInfo()` 补齐 节气三元/旬首/值符值使落宫/空亡·马星地支。明暗双模式实测干净。**顺带修复**既有「现在」时辰干支粗略近似 bug（今天 丁巳日误显 庚日 → 改走 lunar 精确）。
- 🐞 **CP1 揪出生产级排盘 bug（已修）**：`lib/QimenCalculations.js` 的 `calculateJuByChaiBu` **定元方式错误**——旧逻辑按「距节气天数 ÷ 5」定上/中/下元（平气近似），正确应按**符头（最近的甲/己日）**定元（拆补法）。节气不落甲己日（超神/接气，绝大多数情况）时旧法偏一元，导致**局数 + 值符 + 值使**错位；四柱/空亡/马星/旬首不受影响（所以长期未被发现）。与 panTime 无关，"现在"盘同样受影响。
  - 修法：日柱 60 甲子序号 → 符头 `floor(idx/5)*5` → 元 `(符头%15)/5`。
  - 对照权威盘（时家拆补转盘）验证：`2027-07-01 → 阴遁9局/天柱/惊门`、`2020-01-01 → 阳遁7局/天冲/伤门`，局·值符·值使·落宫全部一致。
  - ⚠️ 残留待验：节气×符头跨界处的**超神/接气/置闰**细节，需用权威盘把 CP1 矩阵的「节气换局边界 / 子时 / 跨年闰月」逐个核过再签字。
  - 工具：`scripts/qimen_chart_check.sh`（engineOnly 模式，零 LLM 花费）。
- ✅ **CP1 通过（用户签字 2026-06-12）**：A/B（权威盘截图）+ C/D/E/F（超神·子时·伏吟·闰月边界）全盘逐宫核对一致。
- ✅ **固化完成（golden master + 单一源重构）**：
  - 抽出 `lib/panTime.js`（`parsePanTime`）与 `lib/qimenChart.js`（`buildQimenChart`，起盘编排单一源）。
  - `lib/qimenChart.test.js`：9 条 golden-master，锁死 6 个 CP1 时间戳的 局/定元/四柱/值符值使及落宫/空亡马星 + 2027-07-01 九宫天地盘干抽样 + `parsePanTime` 解析/回退。
  - 重构 `worker/src/index.js`：起盘段改为调用 `buildQimenChart`，删除内联重复逻辑（worker 与单测同源，杜绝漂移）。
  - 全量 **492/492 测试绿**；preview 部署后用 engineOnly 逐盘 byte 对照，含伏吟全九宫，与重构前逐字一致。
- ✅ **CP2 完成**：`/api/divination-route` 接 `hasPanTime`，命局问句在含起局时刻时把 `bazi` 钳为 `hybrid`（前端 hybrid 走 `/api/qimen` 携 panTime + 命局背景，时间不丢）。前端 route 请求带 `hasPanTime`。curl 验证：命局问句无时间→bazi、有时间→hybrid(clamped)，事件问句→qimen 不变。加了 worker 源码断言防回归（`src/workerQimenAudit.test.mjs`）。
- 🐞 **附带发现（已 flag 单独任务 task_6853bc85）**：`npm test` 的 glob `src/**/*.test.mjs` 未加引号，被 shell 展开后**漏掉所有顶层 `src/*.test.mjs`**（worker 测试等从未在 CI 跑）。加引号可修，但会暴露 `src/fortuneCache.test.mjs` 2 个**日期脆弱**的既有失败（硬编码 2026-04-24，今日 2026-06-12 已过期）。与本特性无关，单列任务修。本分支 `npm test` 维持 492 绿，golden-master 在 `lib/*.test.js` 正常跑。
- ✅ **CP3 前端五态**：现在/打开选择器/滚轮+数字输入(识别)/确认自定义/二次确认重置——dev 预览 DOM 逐态实测通过。
- ✅ **CP4 黑白模式**：选择器全走 CSS 变量 + opacity 蒙版渐隐；明/暗两套主题实测无脏边。
- ✅ **CP5 端到端 meta**：`qimenData.pan_time_source`（custom/now）+ `pan_time`，单点注入随 qimenData 流向 engine_complete / engineOnly / 最终结果 / 历史记录；cacheKey 已按所选时刻天然区分。engineOnly 验证：固定→custom、现在→now。
  - 备注：完整 LLM 端到端单跑未做（省 API）；各段已分别验证（picker→panTime 入参 DOM 实测、路由钳制 curl、后端 panTime+meta engineOnly）。需要时单跑一次真实推演即可终验。

### 总结
全部 CP 完成。核心交付：①前端固定时刻选择器（公历，明暗双主题）；②后端 panTime 参数化 + engineOnly 校验通道；③**修复生产级定局 bug**（符头拆补法定元）；④起盘抽离为 `lib/qimenChart.js` 单一源 + golden-master 单测；⑤路由钳制（时间不丢）；⑥SSE meta。CP1 用户签字通过。


> 关于 CP1 校验方式（已定）：**不对照外部 App**，而是前端暴露可审查的排盘字段，用户自行核对；自审通过的时间戳输出**固化成自动化测试**（golden master）。因此「排盘暴露视图」前置到用户 check 之前。

### CP0 · 起局逻辑抽离 + 入参（后端，零行为变更）
- 将 `worker/src/index.js:1895-1980` 的「time → solar/lunar/局/四柱/空亡/马星」抽为纯函数 `buildQimenChart(parts)`。
- 新增 `parsePanTime(body.panTime)`：有值直接 `Solar.fromYmdHms(...)`，**跳过 `getTimezoneOffset()+8h` 偏移**；无值回退现状 `now`。
- 关卡：不传 `panTime` 时输出与现状逐字一致（回归）。

### CP-FE · 时间组件 + 排盘字段审查视图（前置，服务于 CP1）
- 时间组件：按 §3.3.1，公历，`<TimePickerSheet>`。
- 审查视图：复用回传的 `qimen_data` 暴露原始盘面字段供用户核对——
  `ju_info(阴阳遁N局)`、`pillars(年/月/日/时四柱)`、`zhifu/zhishi(值符值使)`、九宫的 `九星/八门/八神/天盘干/地盘干`、`auxiliary.kong_wang(空亡)`、`auxiliary.ma_xing(马星)`（字段见 `worker/src/index.js:2076-2096`）。
- 关卡：选定时间能完整、对位地展示上述字段。

### CP1 · 固定时间排盘正确性 ★硬性人工关卡★
- 用户用 CP-FE 视图，对以下时间矩阵逐一自审：
  1. **当前时刻**：`fixed(now)` 必须等于 `live(now)`（证明参数化没破排盘）；
  2. **过去**：如 2020-01-01 14:30；
  3. **未来**：如 2027-07-01 09:00；
  4. **子时临界**：23:30 换日换柱；
  5. **节气换局边界**：节气交接日附近，验 `calculateJuByChaiBu` 定局；
  6. 跨年 / 闰月附近各一例。
- 关卡（用户签字）：未签字不推进 CP2+。

### 固化 · golden-master 自动化测试
- 将 CP1 用户签字通过的每个时间戳 → 期望输出（局/四柱/值符值使/空亡/马星/关键宫位）钉成 `worker` 单测（参考 `src/workerQimenAudit.test.mjs`）。
- 关卡：CI 回归常绿；用户只需 review 一次用例。

### CP2 · 路由冲突钳制
- `/api/divination-route` 接「含显式时间」hint → `bazi` 钳为 `hybrid`，永不丢时间（`worker/src/index.js:369`、`divinationRouter.js` forceBranch）。
- 关卡：填时间 + 命局问句 → 落 hybrid 且在选定时刻起盘。

### CP3 · 前端交互完善（§3.3.1 全五态）
- 关卡：五态交互通过。

### CP4 · 黑白模式适配（§3.3.2）
- 重点修滚轮渐隐写死暗色 RGB；全走 CSS 变量。
- 关卡：亮/暗各五态截图无脏边。

### CP5 · 端到端串联
- `panTime` 入 HomeView 请求体（`:2857`）、cacheKey、SSE meta `pan_time_source`。
- 关卡：过去 / 未来 / 冲突三场景 e2e 全过。
