import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const resultPath = resolve(__dirname, 'results/latest.json');
const reportPath = resolve(__dirname, 'RESULTS.md');

const result = JSON.parse(readFileSync(resultPath, 'utf8'));

const pct = (value) => value === null || value === undefined ? 'n/a' : `${(value * 100).toFixed(1)}%`;
const score = (value) => Number.isFinite(value) ? value.toFixed(1) : 'n/a';
const severityLabel = {
  pass: '通过',
  minor: '轻微偏差',
  major: '重大偏差',
  critical: '严重失败',
};
const bucketLabel = {
  normal_pattern: '常规格',
  special_pattern: '特殊格/形象',
  tiaohou_urgent: '调候为急',
  rescue: '救主/用印',
  strength_or_method_only: '旺衰/取法专项',
};
const caseClassLabel = {
  general: '通用引擎',
  classical_pattern: '古籍稀疏格法',
};
const rootCauseLabel = {
  geju: '格局识别',
  none: '无明显根因',
  five_shen_classification: '五神分层/用神聚合',
  xiji: '喜忌方向',
  strength: '旺衰判断',
  image_analysis: '特殊格/形象识别',
};

const caseDiagnosis = {
  nb_lzj_001_yuanshushan_qisha: [
    '格局判断本身正确：引擎识别为七杀格，成格细项为“杀邀食制格”。',
    '失败点在用神聚合：书中主取丁火食神制杀；引擎先按乙酉月调候首取癸水偏印，再叠加身弱扶抑与七杀格辅神分，导致偏印 90 分压过食神 55 分。',
    '更精确根因：调候喜用不分 / 调候权重压过格局制化用神，不是格局识别失败。',
  ],
  nb_lzj_002_zhuyuanzhang_fire_earth: [
    '已新增“火土成势”命名两气形象，并允许经审核命名形象在 60 分档覆盖常规格局，因此当前用神已取戊土伤官，喜火土、忌水木金，核心取用已归位。',
    '剩余扣分主要在评测标签层：gold 把该形象记作 SPECIAL_IMAGE，而引擎内部仍归入 TWO_QI_IMAGE/火土成势；格局展示仍保留月令伤官格，未把 pattern_final 改写为特殊形象。',
    '旺衰仍显示丁火日主身弱，这是常规日主强弱口径；书中“身强/极旺”实际指火土整体成势。后续若要完全命中，应区分“日主旺衰”和“形象气势旺衰”。',
  ],
  nb_lzj_003_zhangjian_strong_many_weak_enemy: [
    '已新增“强众敌寡”命名形象：当前识别到火土强党与孤癸水，L0 特殊气势覆盖常规评分，并取癸水偏财为 top1。',
    '剩余偏差在分类与取法标签：gold 记为 SPECIAL_IMAGE/强众敌寡，引擎归入 TWO_QI_IMAGE/强众敌寡；decision_chain 目前只写“顺其成势”，还没有明确写出“去其寡/追捕原理”。',
    '该案仍不应按普通从格修，因为己土有根且明扶，真从条件本来不成立；正确路径是已接入的特殊形象覆盖。',
  ],
  nb_lzj_004_kangxi_qisha_wealth: [
    '喜忌大方向基本没有问题：书中喜水、忌土；引擎也把水列入喜用方向，并把土类比劫列为忌仇。',
    '主要偏差在格局与用神优先级：书中以七杀格、身强杀浅取财滋杀，首重水财；引擎以建禄身强链路为主，调候首取甲木七杀，水财排在喜用但不是 top1。',
    '引擎并非真正以专旺格覆盖本案：形象层显示 SINGLE_IMAGE/稼穑格，匹配分 62.62，但 strength_basis 明确写“不作真从或专旺覆盖”，pattern_final 为空。',
    '所以该案更适合标成“喜忌方向基本命中，格局命名与财滋杀取法未命中”；不宜归为用神完全失败。',
  ],
  nb_lzj_006_bingxin_jinbai_shuiqing: [
    '已新增“金白水清”命名形象并覆盖喜忌：当前取壬水伤官泄秀为 top1，喜金水，忌火土，原先金被病药误判为忌的问题已修复。',
    '剩余偏差主要是格局展示与取法链：普通格局仍显示建禄格/建禄用食格，形象在 image_subtype 中出现，但未提升到 pattern_final 或 geju 展示层。',
    '后续若要提分，应让最终格局命名能展示“金白水清象/两气成象格”，并在 decision_chain 写明“泄秀”。',
  ],
  nb_lzj_007_wangyangming_runxia: [
    '已修复专旺内部优先级：润下格成立后，泄秀食伤高于比劫扶旺；同时按藏干根气权重排序，亥中三见甲木，因此当前 top1 为甲木伤官。',
    '水仍保留为喜神/成势之气，木为用，符合书中“润下专旺用甲木泄秀”的二级规则。',
    '剩余小扣分来自取法链未完整表达“暗冲”等书中标签。',
  ],
  nb_lzj_012_liuyong_zhengguan_bing: [
    '已修复“正官格 + 用印”下的官印相生保留：当前 top1 为丙火正印，正官甲木进入喜方，五行喜火木。',
    '评分器也已收紧喜忌 critical 口径：正官与七杀可同属木，但不能把“七杀为忌”直接等同为“正官为忌”。',
    '剩余小扣分主要来自取法链标签未完整覆盖“春月土虚/官印相生”的全部关键词。',
  ],
  nb_qiusuo_001_sushi_bijie: [
    '已新增冬水子亥丑根网边界调整：癸水生丑月，年支子、日支亥、月支丑形成寒水根网，当前旺衰已由身中推为身强。',
    '壬水仍正确归为劫财；身强后劫财进入忌/仇方向，能够表达书中“比劫克妻财”的六亲判断。',
    '剩余扣分在取法链：评测只要求旺衰/喜忌/取法，本案当前只显式命中部分“身强、比劫旺、妻财受克、六亲网络”标签。',
  ],
  nb_qiusuo_002_qijiguang_weak_fire: [
    '已加入第一调候主用保护：丙火正印只被戊土劫财小幅反超时，首取调候得以保持 top1；当前用神已命中火印，土劫财保留为喜神。',
    '剩余偏差在格局层：书中强调偏财与七杀强根压力，引擎仍按亥月主气取正财格/用财喜比格。',
    '因此当前已解决“火印 vs 土辅神”的主辅层级问题，未解决的是书中格局描述与月令取格口径不同。',
  ],
  zp_001_xue_xianggong_zhengguan_caiyin: [
    '此案不是“正官 vs 正印”的用神 top1 错误：当前 top1 已取庚金正官，和教材“官星秉令、真神得用”一致。',
    '格局 gap 来自 getGeJu 的月支合化覆盖：乙日生申月本应以申中庚金立正官格，但月支申与日支巳合水后，当前引擎把月令主气改为壬水正印，故展示为正印格。',
    '喜忌 critical 来自财印并用规则缺失：教材称“壬印戊财，以乙隔之，水与土不相碍”，戊土正财应为可并用之喜；当前身弱扶抑把财星土直接扣为忌/仇，未识别“财印位置妥贴、两不相碍”的成格救应。',
  ],
  zp_002_zagi_zhengguan_guangu: [
    '教材口径是杂气正官：未为木库，乙官透时，又有卯未会木，故“杂气正官透干会支”本可取贵；但官星不秉令、根受损，只能判孤官无辅。',
    '当前引擎仍按未月主气己土并受合化影响，最终显示正印格；没有“杂气财官透干会支/墓库开透”的取格层，因此无法把乙木正官作为格局主轴。',
    '用神方向也被调候压过：戊未月调候首取癸水正财，身强扶抑又喜财官，导致正财 top1；但教材明说丁壬合，财印两失其用，壬财/丁印不应作为可用辅神。缺口是“天干合去导致财印失用 + 孤官无辅”的成败救应未接入。',
  ],
  zp_003_jin_zhuangyuan_cai_sun_yin: [
    '教材核心不是普通“身弱用印”，而是“亥卯未三合，官化为印”：原月令亥中壬水官星被三合木局转为印势，乙木透出，形成身旺印重。',
    '当前引擎只把亥卯未三合用于 getGeJu，把月令主气改成甲木正印，所以格局显示正印格；但旺衰计算仍按原月令亥水失令处理，没有把三合木局/乙木透出形成的印旺生身回灌到旺衰，因此误判为身弱。',
    '喜忌颠倒来自身弱链路：调候丁亥首取甲木正印 +50，身弱扶抑再给印比加分，正印最终 86 分成为用神；教材则因“身旺印重”取庚金财星损印，喜食伤财，忌再增木水印官。缺口是“化官为印后身旺印重，用财损印”的成败救应未接入。',
  ],
  xuanxue_dts_001_dongzhongtang_wuhuo: [
    '已反查 NotebookLM，并用 xuanxue markdown 原文核对。《滴天髓阐微》在董中堂与“辛酉 辛丑 己酉 丙寅”两案中给出同一类规则：戊己土生辰、丑湿土月份，表面似得土根，但辰为春时虚土、丑为冬土寒湿，不能按未戌等六九月实土/温煦土直接加满帮身。',
    '若再见庚辛金透、申辰或酉丑引动金水泄耗，则“日主过泄”，应取丙丁巳午火印暖土扶身。',
    '本案当前失败不是单纯用神排序问题，而是前序旺衰修正缺失：引擎把两个辰、时干戊、午中己和土占比约 47% 判为身强/极强，随后按戊辰调候首取甲木疏湿，最终把书中忌向的木推为七杀用神。',
    '后续修复应加入“湿土过泄/寒湿过泄”修正：当土根主要来自辰丑湿土，且食伤金透、金水会合成泄，火印不足或需火护印时，下调土根帮身权重，并允许火印优先于甲木疏土。边界条件是未戌等实土、燥土、火印充足或金水不成势时不可套用。',
  ],
  xuanxue_dts_003_rentieqiao_qingku: [
    '当前羊刃格/火旺并非完全没识别：引擎输出羊刃格、刃杀相停格，调候首取也能看到壬水七杀。',
    '真正失败点在 TWO_QI_IMAGE 覆盖：火土合计约 70%，命名为“火土成势”，match_score 77.09 超过已审核 60 分阈值后触发 L0 顺势覆盖，直接把火土定为喜、木金水定为忌，并跳过调候、扶抑、羊刃制杀、合官留杀等下层逻辑。',
    '这不宜按任铁樵单案硬编码修复。更通用的缺口是 TWO_QI_IMAGE 覆盖前缺少“有效制衡/制刃用神”否决门：若第三气不弱且透干有根，尤其火旺羊刃局见壬癸水透并通根，且普通格局或调候已经指向杀制刃/水调候，则不应把该水一概归入逆势忌神。',
    '后续应单独审查 TWO_QI_IMAGE 覆盖 case，区分“可顺的火土成势”（如朱元璋）与“不可顺的火土燥烈/阳刃猖狂”（如任铁樵）：前者允许 L0 覆盖，后者应降级为描述性形象或让格局制化/调候继续参与喜忌。',
  ],
  nb_sanming_005_zhangshi_kuigang: [
    '此造日柱为戊戌，属于魁罡日之一；项目常量中已有魁罡神煞定义（庚辰、壬辰、戊戌、庚戌），神煞层理论上能挂出“魁罡”。',
    '当前未识别为魁罡格，是因为魁罡只存在于 shensha/specialDays 层，没有进入 geju/chengge 或 classical_pattern 决策层。',
    '格局引擎仍按月令主气取格：戊日生亥月，亥中壬水为偏财，故输出偏财格；后续再按调候、偏财格与身中扶抑评分。',
    '书中此案来自《三命通会》论魁罡，取法是“魁罡日若月令见财官印绶，亦可取财官印食”；这属于古籍格法/特殊日柱格法，不是当前月令格局枚举能覆盖的路径。',
    '因此该案与官印双全、日德格类似，可先归为三命通会稀疏古籍格法缺口；若后续修，应新增 classical_pattern，而不是改偏财格月令判断。',
  ],
  nb_sanming_006_mengzhong_zhengyin: [
    '格局识别本身命中：引擎也判为正印格。',
    '用神分歧来自优先级：引擎按亥月寒湿调候首取丙火，丙火对乙木为伤官，调候直接给伤官 +50，成为 top1。',
    '正印只得到正印格 +15 与身中扶抑 +10，合计 25；由于日主被判身中而非身弱，印绶没有获得更强的扶身权重。',
    '书中取“印绶与天德同宫”，关键不只是月令正印，而是把天德贵人/官刑不犯纳入成格贵气；当前 engine 的天德只在神煞层展示，不参与用神评分或格局成败。',
    '所以该案 gap 是“三命通会神煞成格取法未接入用神层”：调候伤官压过了书中的印绶贵格。',
  ],
};

function zhSeverity(value) {
  return severityLabel[value] || value || '-';
}

function zhBucket(value) {
  return bucketLabel[value] || value || '-';
}

function zhCaseClass(value) {
  return caseClassLabel[value] || value || '-';
}

function zhRootCause(value) {
  return rootCauseLabel[value] || value || '-';
}

function zhNote(note = '') {
  return String(note)
    .replace(/^strength: expected (.+?) got (.+)$/u, '旺衰：期望 $1，实际 $2')
    .replace(/^image: expected image (.+)$/u, '形象：期望 $1')
    .replace(/^geju: expected (.+?) got (.+)$/u, '格局：期望 $1，实际 $2')
    .replace(/^yong: actual yong missed gold yong$/u, '用神：实际用神未命中书中用神')
    .replace(/^yong: actual yong (.+?) falls into gold ji$/u, '用神：实际用神 $1 落入书中忌神')
    .replace(/^yong: match level: exact$/u, '用神：完全命中')
    .replace(/^yong: match level: group$/u, '用神：十神同类命中')
    .replace(/^yong: match level: favorable_not_top1$/u, '用神：进入喜用方向但不是 top1')
    .replace(/^xiji: gold favorable (.+?) appears in actual unfavorable$/u, '喜忌：书中喜用 $1 出现在实际忌/仇方向')
    .replace(/^xiji: gold ji (.+?) appears in actual favorable$/u, '喜忌：书中忌神 $1 出现在实际喜用方向')
    .replace(/^method: method hits (\d+)\/(\d+)$/u, '取法链：命中 $1/$2')
    .replace(/^actual yong missed gold yong$/u, '实际用神未命中书中用神');
}

function zhNotes(notes = [], limit = 4) {
  return notes.slice(0, limit).map(zhNote).join('<br>');
}

function cell(value) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value)
    .replace(/\|/g, '｜')
    .replace(/\n/g, '<br>');
}

function formatGoldItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) return '-';
  return items.map(item => {
    if (typeof item === 'string') return item;
    const parts = [];
    if (item.shen) parts.push(item.shen);
    if (item.wuxing) parts.push(item.wuxing);
    if (item.stem) parts.push(item.stem);
    if (item.ganZhi) parts.push(item.ganZhi);
    if (item.text) parts.push(item.text);
    if (item.method) parts.push(`取法：${item.method}`);
    return parts.join(' / ') || JSON.stringify(item);
  }).join('<br>');
}

function formatGold(row) {
  const gold = row.gold || {};
  return {
    geju: gold.geju ? [gold.geju.primary, ...(gold.geju.aliases || [])].filter(Boolean).join(' / ') : '-',
    strength: gold.strength ? [gold.strength.class, gold.strength.band, gold.strength.text].filter(Boolean).join(' / ') : '-',
    image: gold.image ? [gold.image.category, gold.image.subtype].filter(Boolean).join(' / ') : '-',
    yong: formatGoldItems(gold.yong),
    xi: formatGoldItems(gold.xi),
    ji: formatGoldItems(gold.ji),
    method: (gold.methodTags || []).join('、') || '-',
    check: gold.eventOrCheck || '-',
  };
}

function formatActual(row) {
  const actual = row.actual || {};
  return {
    geju: [actual.geju, actual.chengge, actual.pattern_final, actual.image_subtype].filter(Boolean).join(' / ') || '-',
    strength: [actual.strong_weak, actual.strength_band].filter(Boolean).join(' / ') || '-',
    yong: [actual.yong, actual.yong_wuxing, actual.yong_stem].filter(Boolean).join(' / ') || '-',
    xi: (actual.xi || []).join('、') || '-',
    ji: [...(actual.ji || []), ...(actual.chou || [])].join('、') || '-',
    favorable: [
      (actual.favorable_shens || []).join('、'),
      (actual.favorable_wuxing || []).join('、'),
    ].filter(Boolean).join('<br>') || '-',
    unfavorable: [
      (actual.unfavorable_shens || []).join('、'),
      (actual.unfavorable_wuxing || []).join('、'),
    ].filter(Boolean).join('<br>') || '-',
    tiaohou: (actual.tiaohou_primary || []).join('、') || '-',
    decision: (actual.decision_chain || []).slice(0, 4).join('<br>') || '-',
    pillars: actual.pillars || '-',
    solar: actual.solar || '-',
  };
}

const criticalRows = result.rows.filter(row => row.critical);
const lowRows = result.rows.filter(row => row.score < 60 && !row.critical);
const rootCauseCounts = result.rows.reduce((acc, row) => {
  const key = row.root_cause_layer || 'none';
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});

const criticalTable = criticalRows.length
  ? criticalRows.map(row => `| ${row.label} | ${row.score} | ${row.actual.geju} / ${row.actual.strong_weak} / ${row.actual.yong}(${row.actual.yong_wuxing || '-'}) | ${zhNotes(row.notes, 4)} |`).join('\n')
  : '| 无 | - | - | - |';

const lowTable = lowRows.length
  ? lowRows.map(row => `| ${row.label} | ${row.score} | ${zhRootCause(row.root_cause_layer)} | ${zhNotes(row.notes, 3)} |`).join('\n')
  : '| 无 | - | - | - |';

const bucketTable = Object.entries(result.bucket_summary)
  .map(([bucket, item]) => `| ${zhBucket(bucket)} | ${item.total} | ${score(item.avg_score)} | ${item.critical_fail_count} | ${item.pass_count} |`)
  .join('\n');

const classTable = Object.entries(result.class_summary || {})
  .map(([caseClass, item]) => `| ${zhCaseClass(caseClass)} | ${item.total} | ${score(item.avg_score)} | ${pct(item.weighted_accuracy)} | ${item.critical_fail_count} | ${item.pass_count} |`)
  .join('\n');

const rootCauseTable = Object.entries(rootCauseCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([layer, count]) => `| ${zhRootCause(layer)} | ${count} |`)
  .join('\n');

const detailRows = result.rows.map(row => {
  const gold = formatGold(row);
  const actual = formatActual(row);
  return [
    `### ${row.label}`,
    '',
    `- 来源：${cell(row.source?.title)}（source id: \`${row.source?.id || '-'}\`）`,
    `- 四柱：${cell(actual.pillars)}；反查阳历：${cell(actual.solar)}`,
    `- 评分：${row.score}；严重程度：${zhSeverity(row.severity)}；根因：${zhRootCause(row.root_cause_layer)}；评测类别：${zhCaseClass(row.case_class || 'general')}`,
    `- 来源证据摘要：${cell(row.source?.evidence_summary)}`,
    ...(caseDiagnosis[row.id] ? [`- 诊断补充：${caseDiagnosis[row.id].map(item => cell(item)).join('<br>')}`] : []),
    '',
    '| 字段 | 书中真值（Golden） | 当前引擎输出 |',
    '| --- | --- | --- |',
    `| 格局/格法 | ${cell(gold.geju)} | ${cell(actual.geju)} |`,
    `| 特殊格/形象 | ${cell(gold.image)} | ${cell([row.actual?.image_category, row.actual?.image_subtype].filter(Boolean).join(' / '))} |`,
    `| 旺衰 | ${cell(gold.strength)} | ${cell(actual.strength)} |`,
    `| 用神 top1 | ${cell(gold.yong)} | ${cell(actual.yong)} |`,
    `| 喜神/喜用 | ${cell(gold.xi)} | ${cell(actual.favorable)} |`,
    `| 忌神/忌仇 | ${cell(gold.ji)} | ${cell(actual.unfavorable)} |`,
    `| 当前 five_shens 喜 | - | ${cell(actual.xi)} |`,
    `| 当前 five_shens 忌/仇 | - | ${cell(actual.ji)} |`,
    `| 调候首取 | - | ${cell(actual.tiaohou)} |`,
    `| 书中取法标签 | ${cell(gold.method)} | ${cell(actual.decision)} |`,
    `| 事件/验证点 | ${cell(gold.check)} | - |`,
    `| 评分说明 | - | ${cell(zhNotes(row.notes, 8))} |`,
    '',
  ].join('\n');
}).join('\n');

const body = `# Bazi Profile Golden Test 评测结果

> 生成时间：${result.generated_at}
> 评测引擎：${result.engine}
> 已评分案例数：${result.summary.total}
> Golden 来源：NotebookLM 书籍案例 + 本地教材摘录，见 \`gold-cases.js\`

## 总览

| 指标 | 结果 |
| --- | ---: |
| 加权准确率 | ${pct(result.summary.weighted_accuracy)} |
| 用神 top1 准确率 | ${pct(result.summary.yong_top1_accuracy)}（${result.summary.yong_case_count} 例） |
| 喜忌方向准确率 | ${pct(result.summary.xiji_direction_accuracy)}（${result.summary.xiji_case_count} 例） |
| 旺衰准确率 | ${pct(result.summary.strength_accuracy)}（${result.summary.strength_case_count} 例） |
| 格局准确率 | ${pct(result.summary.geju_accuracy)}（${result.summary.geju_case_count} 例） |
| 严重失败数 | ${result.summary.critical_fail_count} |
| 通过 / 轻微偏差 / 重大偏差 / 严重失败 | ${result.summary.pass_count} / ${result.summary.minor_count} / ${result.summary.major_count} / ${result.summary.critical_count} |

## 分桶结果

| 分桶 | 案例数 | 平均分 | 严重失败 | 通过 |
| --- | ---: | ---: | ---: | ---: |
${bucketTable}

## 通用/古籍格法拆分

| 类别 | 案例数 | 平均分 | 加权准确率 | 严重失败 | 通过 |
| --- | ---: | ---: | ---: | ---: | ---: |
${classTable}

## 严重失败案例

| 案例 | 分数 | 实际格局 / 旺衰 / 用神 | 说明 |
| --- | ---: | --- | --- |
${criticalTable}

## 重大偏差案例（非严重失败）

| 案例 | 分数 | 根因层 | 说明 |
| --- | ---: | --- | --- |
${lowTable}

## 根因分布

| 根因层 | 数量 |
| --- | ---: |
${rootCauseTable}

## 逐案明细

${detailRows}

## 观察结论

1. 本轮修复后，整体加权准确率为 ${pct(result.summary.weighted_accuracy)}；若剔除 \`classical_pattern\`，通用引擎加权准确率为 ${pct(result.class_summary?.general?.weighted_accuracy)}，严重失败 ${result.class_summary?.general?.critical_fail_count ?? '-'} 例。
2. 命名两气形象已进入覆盖链路：金白水清、火土成势、强众敌寡均能在 60 分档审核阈值下覆盖普通喜忌。影响 case：冰心、朱元璋、张謇。
3. 专旺内部“泄秀为用、扶旺为喜”已落地。王阳明从水比肩 top1 改为甲木伤官 top1，同时保留水为喜神。
4. 第一调候主用保护已解决“辅神反超主用”的窄问题。戚继光从戊土劫财 top1 改为丙火正印 top1，土仍保留为喜。
5. 官印相生与五行折叠误伤已修复。刘墉保持丙火正印为用、甲木正官为喜，不再因七杀同属木而把“木”整体判忌。
6. 冬水子亥丑根网边界已修复。苏轼从身中改为身强，劫财进入忌/仇方向，能表达“比劫克妻财”。
7. 本轮扩量到 ${result.summary.total} 例后，常规格平均分为 ${score(result.bucket_summary?.normal_pattern?.avg_score)}，说明当前引擎对“月令正格 + 成败救应 + 主辅用神”的覆盖明显弱于调候为急、印星救主与已修复的特殊形象链路。
8. 新增样本的高频失败不是稀疏格局，而是正格取法：正官格财印并用、财格食生/佩印/制杀生财/弃杀就财、印格用官/用杀/用财/用食伤、食神制杀/用杀、伤官用财/用官/用杀印、阳刃用官杀、建禄用官财印等，都需要把《子平真诠》的“成格/败格/救应/取清/相神”结构接入格局层与用神层。
9. 扩到 ${result.summary.total} 后，喜忌 critical 更集中地指向“十神状态缺失”：不少 case 用神 top1 已命中或部分命中，但相神被扶抑层打入忌方。例如平江伯土官、蔡贵妃火杀、阳刃三例的财印、王少师金印、王总兵庚印，均需要 \`shen_status=ACTIVE/PROTECTIVE/INVALIDATED\` 参与喜忌裁决。
10. 新增样本还暴露出 TWO_QI_IMAGE 描述性误覆盖：不少正格案例被显示为木土成象、金水成象、火木成象等，虽然 match_score 未必用于最终覆盖，但会污染格局展示和方法评分；后续需要区分“形象候选提示”和“最终格局覆盖”。
11. 100 例新增的七杀/伤官样本进一步验证“取清”缺口：去官留杀、去杀留官、去印存食、官杀竞出取清、化伤为财、财伤有情、伤官兼用财印等，都不是普通旺衰或调候能替代的判断。影响 case：岳统制、沈郎中、周丞相、无名阳刃命、罗状元、秦龙图、都统制。
12. 从格/形象链路已有雏形但仍不完整：从杀格能被识别到 FOLLOW_IMAGE，但 subtype 与 golden “从杀格”不一致；从财格样本多被降为普通财/印格或 TWO_QI_IMAGE，导致木火喜用被判反。影响 case：无名状元命、无名黄堂命、无名侍郎命、无名知县命。
13. 当前最大通用遗留是调候/格局制化优先级：康熙仍被识别为建禄/强众敌寡链路，未命中“七杀格、财滋杀”，且土被列入喜方；袁树珊仍存在调候偏印压过食神制杀的问题。
14. 格局展示层仍落后于喜忌层：朱元璋、冰心、张謇的取用已明显归位，但 pattern_final/geju 仍没有把命名形象提升为最终格局，导致格局/方法标签扣分。
15. 新增 \`滴天髓阐微\` 湿土过泄缺口：戊己土生辰、丑等虚湿寒湿土月，若庚辛金透并见申辰/酉丑等金水泄耗结构，教材可判“土虽多而虚湿、日主过泄”，用丙丁巳午火印；此时不能机械按土根数量、土占比或戊辰调候表首取甲木。影响 case：董中堂、无名冬土寒湿用丙。
16. TWO_QI_IMAGE 覆盖仍需专项复盘：当前命名两气形象只要通过审核阈值就会 L0 覆盖喜忌，容易把“有效制衡/制刃用神”误判为逆势忌神。影响 case：任铁樵自造、某农妇；后续需逐案区分可顺成势与不可顺成势。
17. \`三命通会\` 稀疏古籍格法已标记为 \`classical_pattern\` 并单独汇总；官印双全、魁罡格、印绶天德、日德格、相刑遇贵暂不作为通用引擎主线指标。
18. 评分器会按每例 \`scoringScope\` 归一化权重；书中未明确给出的字段不会被扣分。喜忌 critical 口径已收紧到 exact 十神/纯五行反向，避免正官与七杀这类同组十神互相误伤。

## 后续修复优先级

1. P0：修复康熙“七杀格财滋杀”与袁树珊“食神制杀”这类格局制化优先级，避免调候或泛化形象压过主取法。
2. P0：把已覆盖的命名形象同步到最终格局展示层与 \`decision_chain\`，重点是火土成势、金白水清、强众敌寡、润下泄秀。
3. P0：专项复核 TWO_QI_IMAGE 覆盖逻辑，新增“有效制衡/制刃用神”veto 或降级机制；当第三气不弱且透干有根，并被调候/格局制化指向为主用神时，不应无条件顺两气成势。
4. P1：新增湿土过泄/寒湿过泄旺衰修正器，优先覆盖辰丑湿土 + 食伤金透 + 金水会合泄土 + 火印不足的结构；边界上避开未戌实土、燥土、火印充足或金水不成势的命局。
5. P1：补《子平真诠》正格成败救应层：正官财印并用、财格佩印/食生/制杀生财/弃杀就财、七杀食制/用财/用印/去官留杀、印格用官/用杀/用财/用食伤、食神生财/制杀/用杀、伤官用财/用官/用杀印/兼用财印/化伤为财、阳刃用官杀/取清、建禄用官财印/去伤存官等先做结构识别，再给用神主辅加权。
6. P1：补从格 FOLLOW_IMAGE 的 subtype 和覆盖策略：从财、从杀、从儿、从势要能区分，并将顺势喜用同步到 five_shens；不能只显示从官杀格或退回普通财印格。
7. P1：为 \`classical_pattern\` 建独立格法层，而不是塞回普通月令格：魁罡、日德、相刑遇贵、官印双全、印绶天德。
8. P1：继续细化评测抽取字段，让 \`detail.wuxing\`、\`five_shens\`、\`pattern_final\` 的机器验证口径保持一致。
`;

writeFileSync(reportPath, body, 'utf8');
console.log(`Wrote ${reportPath}`);
