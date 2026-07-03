'use strict';

/**
 * Held-out validation set (P3.5) — 防过拟合留出集。
 *
 * 来源：NotebookLM over《滴天髓》《三命通会》《渊海子平》，2026-06-17 新抓取。
 * 与 gold-cases.js 同分布（子平真诠正格体系、原局十神用神），且四柱已去重、
 * 全部通过 validate-pillars.mjs 反查公历。
 *
 * 用途：**只评测、不调规则**。任何引擎改动都不得以这些案例为目标做针对性修补，
 * 仅用它们衡量 gold-cases 上调出来的规则是否泛化。
 *
 * 神峰通考一批（制杀太过/病药格、用神为大运方向）因属不同格局体系、与本引擎正格
 * 口径不可比，未纳入；如需跨体系压力测试另立分组。
 */

const wx = (wuxing) => ({ wuxing });
const shen = (name, wuxing, stem, method) => ({ shen: name, wuxing, stem: stem || null, method: method || null });

const SRC = { title: 'NotebookLM held-out（滴天髓/三命通会/渊海子平）', notebook: '7fb1c986-7144-4a63-8b16-735cbec7ee7f' };

const CASES = [
  {
    id: 'ho_dts_001_shangguan_yongguan_wuxu',
    label: '滴天髓伤官章·土金伤官用官（戊戌乙卯）',
    source: { ...SRC, evidence_summary: '戊日酉月土金伤官，地支两戌燥厚，年干壬水润土泄金生木，足以用官。' },
    input: { pillars: ['壬戌', '己酉', '戊戌', '乙卯'], gender: 'male' },
    gold: {
      geju: { primary: '伤官格', aliases: ['土金伤官', '伤官用官'] },
      strength: { class: '身强', band: null, text: '身强' },
      yong: [shen('正官', '木', '乙', '土金伤官用官')],
      xi: [wx('木'), wx('水')],
      ji: [wx('火'), wx('土')],
      image: null,
      methodTags: ['伤官格', '伤官用官', '财官生扶'],
    },
    scoringScope: ['geju', 'strength', 'yong', 'xiji'],
  },
  {
    id: 'ho_dts_002_shangguan_yongguan_renshen',
    label: '滴天髓伤官章·水木伤官用官（壬申己酉）',
    source: { ...SRC, evidence_summary: '壬水卯月水木伤官，官印通根，年支逢财，伤官有制有化，日元生旺，足以用官。' },
    input: { pillars: ['庚午', '己卯', '壬申', '己酉'], gender: 'male' },
    gold: {
      geju: { primary: '伤官格', aliases: ['水木伤官', '伤官用官'] },
      strength: { class: '身强', band: null, text: '身强（官印通根）' },
      yong: [shen('正官', '土', '己', '伤官用官')],
      xi: [wx('土'), wx('火')],
      ji: [wx('木'), wx('水')],
      image: null,
      methodTags: ['伤官格', '伤官用官'],
    },
    scoringScope: ['geju', 'strength', 'yong', 'xiji'],
  },
  {
    id: 'ho_dts_004_qisha_shizhi_xinyou',
    label: '滴天髓衰旺章·乙木库根透丁制杀（辛酉乙未）',
    source: { ...SRC, evidence_summary: '乙木八月木凋金锐，幸坐下库根、干透两丁，足以盘根制杀；病在丑土生金晦火。' },
    input: { pillars: ['辛酉', '丁酉', '乙未', '丁丑'], gender: 'male' },
    gold: {
      geju: { primary: '七杀格', aliases: ['食神制杀'] },
      strength: { class: '身弱', band: null, text: '身弱（木凋金锐）' },
      yong: [shen('食神', '火', '丁', '食神制杀')],
      xi: [wx('火'), wx('木')],
      ji: [wx('金'), wx('土')],
      image: null,
      methodTags: ['七杀格', '食神制杀'],
    },
    scoringScope: ['geju', 'strength', 'yong', 'xiji'],
  },
  {
    id: 'ho_dts_005_pianyin_yongshang_guiwei',
    label: '滴天髓清气章·冬木泛滥会局泄秀（癸未甲午）',
    source: { ...SRC, evidence_summary: '甲木亥月癸水并透其势泛滥，喜卯时丁火通根、日主临旺会木局，泄木生火扶身，更妙无金清得尽。' },
    input: { pillars: ['癸未', '癸亥', '甲午', '丁卯'], gender: 'male' },
    gold: {
      geju: { primary: '偏印格', aliases: ['印多泄秀'] },
      strength: { class: '身强', band: null, text: '身强（其势泛滥）' },
      yong: [shen('伤官', '火', '丁', '泄木生火')],
      xi: [wx('火'), wx('木')],
      ji: [wx('金'), wx('水')],
      image: null,
      methodTags: ['偏印格', '泄秀', '冬木向阳'],
    },
    scoringScope: ['geju', 'strength', 'yong', 'xiji'],
  },
  {
    id: 'ho_dts_006_yangren_yongshang_jiayin',
    label: '滴天髓闲神章·禄刃旺极用丁泄秀（甲寅庚午）',
    source: { ...SRC, evidence_summary: '甲木仲春支逢禄刃干透比肩旺极，时上庚金无根为忌，月干丁火为用通辉之气。' },
    input: { pillars: ['甲寅', '丁卯', '甲寅', '庚午'], gender: 'male' },
    gold: {
      geju: { primary: '羊刃格', aliases: ['木火通明', '泄秀'] },
      strength: { class: '身强', band: null, text: '身旺（旺之极）' },
      yong: [shen('伤官', '火', '丁', '旺木泄秀')],
      xi: [wx('火'), wx('土')],
      ji: [wx('金'), wx('水')],
      image: null,
      methodTags: ['羊刃格', '泄秀', '庚金无根为忌'],
    },
    scoringScope: ['geju', 'strength', 'yong', 'xiji'],
  },
  {
    id: 'ho_smtw_007_zhengguan_caiwangshengguan_nü',
    label: '三命通会女命·财旺生官印助身（己未甲申）',
    source: { ...SRC, evidence_summary: '乙以庚为夫禄到申，坐下财旺能生官，壬印生于申，四柱无刑冲，财官印三般旺夫。' },
    input: { pillars: ['己未', '壬申', '乙未', '甲申'], gender: 'female' },
    gold: {
      geju: { primary: '正官格', aliases: ['财官印', '财旺生官'] },
      strength: { class: '身强', band: null, text: '身旺（印绶助身）' },
      yong: [shen('正官', '金', '庚', '财旺生官')],
      xi: [wx('金'), wx('土'), wx('水')],
      ji: [wx('木'), wx('火')],
      image: null,
      methodTags: ['正官格', '财官印', '财旺生官'],
    },
    scoringScope: ['geju', 'strength', 'yong', 'xiji'],
  },
  {
    id: 'ho_dts_008_shangguan_peiyin_jizhongtang',
    label: '滴天髓疾病章·夏木逢水伤官佩印（稽中堂·甲子庚午）',
    source: { ...SRC, evidence_summary: '甲子日生未月午时夏木逢水伤官佩印，喜卯木克未土使子水不伤，去浊留清，金为滋印喜神。' },
    input: { pillars: ['辛卯', '乙未', '甲子', '庚午'], gender: 'male' },
    gold: {
      geju: { primary: '伤官格', aliases: ['伤官佩印'] },
      strength: { class: '身弱', band: null, text: '身弱（夏木逢水）' },
      yong: [shen('正印', '水', '癸', '伤官佩印')],
      xi: [wx('水'), wx('金'), wx('木')],
      ji: [wx('火'), wx('土')],
      image: null,
      methodTags: ['伤官格', '伤官佩印', '滋印为喜'],
    },
    scoringScope: ['geju', 'strength', 'yong', 'xiji'],
  },
  {
    id: 'ho_smtw_009_zhengguan_zixu_nü',
    label: '三命通会女命·日旺夫星两不相伤（癸巳乙卯）',
    source: { ...SRC, evidence_summary: '乙坐卯专禄自旺，得亥合局身旺；庚禄得申夫星旺，亥中壬水夫之食神，夫妇各乘旺气两不相伤。' },
    input: { pillars: ['癸巳', '庚申', '乙卯', '丁亥'], gender: 'female' },
    gold: {
      geju: { primary: '正官格', aliases: ['夫星有气', '安静守分'] },
      strength: { class: '身强', band: null, text: '身旺（专禄自旺）' },
      yong: [shen('正官', '金', '庚', '日旺用官')],
      xi: [wx('金'), wx('土')],
      ji: [wx('火'), wx('木')],
      image: null,
      methodTags: ['正官格', '夫星两不相伤'],
    },
    scoringScope: ['geju', 'strength', 'yong', 'xiji'],
  },
  {
    id: 'ho_dts_010_shangguan_yongyin_cangzhi',
    label: '滴天髓隐显章·金水伤官太旺暗用藏土（丁亥辛巳）',
    source: { ...SRC, evidence_summary: '庚金仲冬伤官太旺过泄，用神在土不在火，四柱无土取巳中藏戊，火能生土玄机暗存。' },
    input: { pillars: ['丁亥', '壬子', '庚子', '辛巳'], gender: 'male' },
    gold: {
      geju: { primary: '伤官格', aliases: ['金水伤官', '暗用印'] },
      strength: { class: '身弱', band: null, text: '身弱（伤官太旺过泄）' },
      yong: [shen('偏印', '土', '戊', '伤官太旺用印')],
      xi: [wx('土'), wx('火')],
      ji: [wx('金'), wx('水')],
      image: null,
      methodTags: ['伤官格', '伤官用印', '藏干用神'],
    },
    scoringScope: ['geju', 'strength', 'yong', 'xiji'],
  },
  {
    id: 'ho_dts_011_qisha_shayinxiangsheng_pingchuanlu',
    label: '滴天髓清气章·支类东方杀印相生（平传胪·己卯丁卯）',
    source: { ...SRC, evidence_summary: '己土卯月杀旺提纲乙木透露支类东方，时干丁火生旺，局中不杂金水清得尽，杀印相生。' },
    input: { pillars: ['乙卯', '己卯', '己卯', '丁卯'], gender: 'male' },
    gold: {
      geju: { primary: '七杀格', aliases: ['杀印相生'] },
      strength: { class: '身弱', band: null, text: '身弱（杀旺提纲）' },
      yong: [shen('偏印', '火', '丁', '杀印相生')],
      xi: [wx('火'), wx('土')],
      ji: [wx('金'), wx('水')],
      image: null,
      methodTags: ['七杀格', '杀印相生', '清得尽'],
    },
    scoringScope: ['geju', 'strength', 'yong', 'xiji'],
  },
];

module.exports = { CASES, HOLDOUT_META: { source: SRC, count: CASES.length, frozen: true } };
