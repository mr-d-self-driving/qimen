const { Solar, Lunar } = require('lunar-javascript');
const { createClient } = require('@supabase/supabase-js');
const { BaziRuleEngine, getDiShi, getShen } = require('../lib/BaziRuleEngine');
const { buildSiziSummaryKey, getSiziSummary } = require('../lib/siziSummary');

const memoryCache = {};
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

function buildQualitativeSections({ llmSucceeded, llmQualitativeData, engineQualitativeData }) {
    const normalizedEngine = {
        yuanju_core: engineQualitativeData?.yuanju_core || '',
        current_dayun: engineQualitativeData?.current_dayun || '',
        current_liunian: engineQualitativeData?.current_liunian || ''
    };

    const normalizedLlm = llmSucceeded ? {
        yuanju_core: llmQualitativeData?.yuanju_core || '',
        current_dayun: llmQualitativeData?.current_dayun || '',
        current_liunian: llmQualitativeData?.current_liunian || ''
    } : {
        yuanju_core: null,
        current_dayun: null,
        current_liunian: null
    };

    return {
        display: llmSucceeded ? normalizedLlm : normalizedEngine,
        llm: normalizedLlm,
        engine: normalizedEngine
    };
}

const GE_JU_INFO = {
    '正官格': {
        name: '正官格',
        element: '官',
        judgeBase: '月令以官星司令，取官为格。',
        yongShenTypical: '官星',
        xianShenTypical: '印绶、财星',
        strength: '宜身强',
        shunNi: '顺用',
        personality: ['端凝守礼', '重名分秩序', '行事持中', '喜清不喜杂'],
        goodFor: ['仕途法务', '组织管理', '公职文教'],
        watchOut: ['最忌官杀混杂', '防伤官犯官', '忌财印两伤'],
        chengGeTypes: ['正官佩印格', '用官喜财格', '弃官就食格', '弃官存财格'],
        defeatConditions: ['官杀混杂', '伤官见官', '官星无根受制'],
        classicQuote: '《子平真诠》意旨：官以纯粹为贵，喜财印相随，最忌混杀伤官。'
    },
    '七杀格': {
        name: '七杀格',
        element: '杀',
        judgeBase: '月令以七杀司令，取杀为格。',
        yongShenTypical: '七杀',
        xianShenTypical: '食神、印绶、劫财',
        strength: '宜身强',
        shunNi: '逆用',
        personality: ['气决胆壮', '任事果断', '好胜尚权', '遇制则贵'],
        goodFor: ['武职权柄', '竞争行业', '高压决断岗位'],
        watchOut: ['忌杀无制化', '忌财党助杀', '忌身弱受攻'],
        chengGeTypes: ['杀印相生格', '杀邀食制格', '以劫合杀格', '财滋弱杀格'],
        defeatConditions: ['七杀无气无根', '杀旺无制', '身弱受杀'],
        classicQuote: '《子平真诠》意旨：杀为偏官，须有制伏，制化得宜，反成权贵。'
    },
    '正财格': {
        name: '正财格',
        element: '财',
        judgeBase: '月令以正财司令，取财为格。',
        yongShenTypical: '正财',
        xianShenTypical: '官星、食神',
        strength: '宜身强',
        shunNi: '顺用',
        personality: ['务实持家', '重信用分寸', '善经营筹画', '不喜虚浮'],
        goodFor: ['经营理财', '实业贸易', '稳定管理岗'],
        watchOut: ['防比劫争财', '忌财多身弱', '忌印财交战'],
        chengGeTypes: ['财旺生官格', '财喜食生格', '用财喜印格', '用财喜比格'],
        defeatConditions: ['比劫争财', '财多压身', '财星失根'],
        classicQuote: '《子平真诠》意旨：财宜根深有气，得食生官护，则富而能贵。'
    },
    '偏财格': {
        name: '偏财格',
        element: '才',
        judgeBase: '月令以偏财司令，取才为格。',
        yongShenTypical: '偏财',
        xianShenTypical: '官星、食神',
        strength: '宜身强',
        shunNi: '顺用',
        personality: ['机敏通达', '善应变取机', '重效率资源', '外缘较广'],
        goodFor: ['市场拓展', '项目经营', '资源整合型工作'],
        watchOut: ['防比劫夺财', '忌贪多冒进', '忌财轻浮荡'],
        chengGeTypes: ['财旺生官格', '财喜食生格', '用财喜印格', '用财喜比格'],
        defeatConditions: ['比劫争财', '财旺身弱', '财星无根'],
        classicQuote: '《子平真诠》意旨：偏财喜身强而能任，得食官辅佐，则发福尤速。'
    },
    '食神格': {
        name: '食神格',
        element: '食',
        judgeBase: '月令以食神司令，取食为格。',
        yongShenTypical: '食神',
        xianShenTypical: '财星、七杀',
        strength: '强弱皆可',
        shunNi: '顺用',
        personality: ['温厚宽和', '辞气雍容', '才艺外发', '重生活情趣'],
        goodFor: ['文艺策划', '教育传播', '品牌内容'],
        watchOut: ['忌枭神夺食', '忌财引杀重', '忌食轻无根'],
        chengGeTypes: ['食神制杀格', '食神生财格', '用食喜比格', '弃食就印格'],
        defeatConditions: ['枭神夺食', '食神失根', '杀重无制'],
        classicQuote: '《子平真诠》意旨：食神最喜生财制杀，怕偏印夺其清气。'
    },
    '伤官格': {
        name: '伤官格',
        element: '伤',
        judgeBase: '月令以伤官司令，取伤为格。',
        yongShenTypical: '伤官',
        xianShenTypical: '印绶、财星',
        strength: '宜身强',
        shunNi: '逆用',
        personality: ['聪警敏锐', '辞锋见长', '不拘常格', '好胜自任'],
        goodFor: ['创意表达', '技术突破', '营销策动'],
        watchOut: ['防伤官见官', '忌锋芒太露', '忌无印节制'],
        chengGeTypes: ['伤官佩印格', '伤官生财格', '伤官喜官格', '伤官弃官格'],
        defeatConditions: ['伤官见官', '伤重无印', '官星受伤成祸'],
        classicQuote: '《子平真诠》意旨：伤官虽秀，须财印相辅；若直犯官星，多主反覆。'
    },
    '正印格': {
        name: '正印格',
        element: '印',
        judgeBase: '月令以正印司令，取印为格。',
        yongShenTypical: '正印',
        xianShenTypical: '官星、比劫',
        strength: '强弱皆可',
        shunNi: '顺用',
        personality: ['慈厚稳重', '喜学好古', '重名节涵养', '有护持心'],
        goodFor: ['教育研究', '顾问策士', '文职学术'],
        watchOut: ['防财破印', '忌枭食并争', '忌印重闭塞'],
        chengGeTypes: ['用印喜官格', '用印喜食格', '用印喜比格', '弃印就财格'],
        defeatConditions: ['财破印', '印轻无根', '食印相碍'],
        classicQuote: '《子平真诠》意旨：印绶喜官来生扶，最怕财星坏印。'
    },
    '偏印格': {
        name: '偏印格',
        element: '枭',
        judgeBase: '月令以偏印司令，取枭为格。',
        yongShenTypical: '偏印',
        xianShenTypical: '官星、比劫',
        strength: '强弱皆可',
        shunNi: '逆用',
        personality: ['思深好静', '悟性偏高', '孤介不群', '多偏门专长'],
        goodFor: ['术数设计', '研究开发', '宗教身心领域'],
        watchOut: ['防枭神夺食', '忌财来破印', '忌孤高失群'],
        chengGeTypes: ['用印喜官格', '用印喜食格', '用印喜比格', '弃印就财格'],
        defeatConditions: ['财破印', '枭神夺食', '印枭失根'],
        classicQuote: '《子平真诠》意旨：偏印偏于孤清，得官比扶持则奇，见财多损。'
    },
    '建禄格': {
        name: '建禄格',
        element: '比',
        judgeBase: '月支为日主禄位，以身自旺立格。',
        yongShenTypical: '比肩',
        xianShenTypical: '官星、财星、食神',
        strength: '宜身强',
        shunNi: '逆用',
        personality: ['自主自立', '自尊极强', '行事果毅', '不喜受制'],
        goodFor: ['自主创业', '统筹管理', '开创型岗位'],
        watchOut: ['防比劫太重', '忌无财官引', '防刚强失和'],
        chengGeTypes: ['建禄用官格', '建禄用财格', '建禄用食格'],
        defeatConditions: ['比劫壅滞', '无吉神引化', '财官俱薄'],
        classicQuote: '《子平真诠》意旨：建禄月劫，最喜财官透出，方见福力。'
    },
    '羊刃格': {
        name: '羊刃格',
        element: '劫',
        judgeBase: '阳干月支临刃，以刃气过刚立格。',
        yongShenTypical: '劫财',
        xianShenTypical: '七杀、正官、食伤',
        strength: '宜身强',
        shunNi: '逆用',
        personality: ['刚决猛烈', '好胜不屈', '担当敢为', '喜直不喜曲'],
        goodFor: ['军警竞技', '攻坚执行', '高压管理场域'],
        watchOut: ['忌羊刃无制', '防争斗伤灾', '忌财星裸露'],
        chengGeTypes: ['刃杀相停格', '羊刃驾官格', '刃泄生财格'],
        defeatConditions: ['羊刃无制', '刃旺伤身', '财官受冲'],
        classicQuote: '《子平真诠》意旨：羊刃极刚，须官杀制伏，制得其宜，反主威权。'
    }
};

const _FULL_TEN_GOD_MAP = {
    '比': '比肩',
    '劫': '劫财',
    '食': '食神',
    '伤': '伤官',
    '财': '正财',
    '才': '偏财',
    '官': '正官',
    '杀': '七杀',
    '印': '正印',
    '枭': '偏印'
};
const _SHORT_TEN_GOD_MAP = Object.fromEntries(Object.entries(_FULL_TEN_GOD_MAP).map(([key, value]) => [value, key]));
const _GAN_TO_ELEMENT = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' };
const _ELEMENT_TO_REP_GAN = { '木': '甲', '火': '丙', '土': '戊', '金': '庚', '水': '壬' };
const _ELEMENT_TO_STEMS = {
    '木': ['甲', '乙'],
    '火': ['丙', '丁'],
    '土': ['戊', '己'],
    '金': ['庚', '辛'],
    '水': ['壬', '癸']
};
const _HE_GAN_MAP = { '甲': '己', '己': '甲', '乙': '庚', '庚': '乙', '丙': '辛', '辛': '丙', '丁': '壬', '壬': '丁', '戊': '癸', '癸': '戊' };
let _monthMergeStemContext = [];

function _normalizeTenGodName(name) {
    return _SHORT_TEN_GOD_MAP[name] || name || '';
}

function _buildStemsFromBazi(bazi) {
    return [bazi.year[0], bazi.month[0], bazi.day[0], bazi.time[0]];
}

function _buildBranchesFromBazi(bazi) {
    return [bazi.year[1], bazi.month[1], bazi.day[1], bazi.time[1]];
}

function _getVisibleStems(allStems, dayGan) {
    const visible = [];
    allStems.forEach((stem, index) => {
        if (index === 2) return;
        visible.push(stem);
    });
    return visible.filter(stem => stem !== undefined && stem !== null && stem !== '');
}

function _isStemTouGan(stem, allStems) {
    return _getVisibleStems(allStems).includes(stem);
}

function _countStemTouGan(stem, allStems) {
    return _getVisibleStems(allStems).filter(item => item === stem).length;
}

function _getStemRootStats(stem, allBranches) {
    const stats = { strong: 0, weak: 0, trace: 0, none: 0, phases: [] };
    allBranches.forEach(branch => {
        const phase = getDiShi(stem, branch);
        stats.phases.push({ branch, phase });
        if (phase === '帝旺' || phase === '临官') stats.strong += 1;
        else if (phase === '长生' || phase === '冠带') stats.weak += 1;
        else if (phase === '墓') stats.trace += 1;
        else stats.none += 1;
    });
    return stats;
}

function _getStemState(stem, allStems, allBranches) {
    const rootStats = _getStemRootStats(stem, allBranches);
    const touGanCount = _countStemTouGan(stem, allStems);
    return {
        stem,
        touGan: touGanCount > 0,
        touGanCount,
        rootStats,
        hasStrongRoot: rootStats.strong > 0,
        hasWeakRoot: rootStats.weak > 0,
        hasTraceRoot: rootStats.trace > 0,
        hasRoot: rootStats.strong > 0 || rootStats.weak > 0 || rootStats.trace > 0,
        hasLi: touGanCount > 0 && rootStats.strong > 0,
        hasQi: touGanCount > 0 && (rootStats.strong > 0 || rootStats.weak > 0),
        noRoot: rootStats.strong === 0 && rootStats.weak === 0 && rootStats.trace === 0
    };
}

function _getTenGodStem(dayGan, tenGod, tenGodMap) {
    const normalized = _normalizeTenGodName(tenGod);
    const mapEntries = tenGodMap ? Object.entries(tenGodMap) : Object.entries(BaziEngine.ShiShen[dayGan] || {});
    const found = mapEntries.find(([, value]) => _normalizeTenGodName(value) === normalized);
    return found ? found[0] : '';
}

function _getTenGodState(dayGan, tenGod, allStems, allBranches, tenGodMap) {
    const stem = _getTenGodStem(dayGan, tenGod, tenGodMap);
    return stem ? _getStemState(stem, allStems, allBranches) : {
        stem: '',
        touGan: false,
        touGanCount: 0,
        rootStats: { strong: 0, weak: 0, trace: 0, none: allBranches.length, phases: [] },
        hasStrongRoot: false,
        hasWeakRoot: false,
        hasTraceRoot: false,
        hasRoot: false,
        hasLi: false,
        hasQi: false,
        noRoot: true
    };
}

function _getCombinedTenGodState(dayGan, tenGods, allStems, allBranches, tenGodMap) {
    const states = tenGods.map(tenGod => _getTenGodState(dayGan, tenGod, allStems, allBranches, tenGodMap));
    const active = states.filter(state => state.stem);
    return {
        stems: active.map(state => state.stem),
        states: active,
        touGan: active.some(state => state.touGan),
        hasLi: active.some(state => state.hasLi),
        hasQi: active.some(state => state.hasQi),
        hasRoot: active.some(state => state.hasRoot),
        overWang: false
    };
}

function _isElementOverWang(element, allStems, allBranches) {
    const stems = _ELEMENT_TO_STEMS[element] || [];
    const touGanCount = stems.reduce((sum, stem) => sum + _countStemTouGan(stem, allStems), 0);
    const strongRootCount = stems.reduce((sum, stem) => sum + _getStemRootStats(stem, allBranches).strong, 0);
    return touGanCount >= 2 && strongRootCount >= 2;
}

function _isOfficialMixed(states) {
    if (!states.guan.touGan || !states.sha.touGan) return false;
    if (states.shi.hasLi) return false;
    if (states.jie.touGan && (_HE_GAN_MAP[states.jie.stem] === states.sha.stem || _HE_GAN_MAP[states.jie.stem] === states.guan.stem)) return false;
    return true;
}

function _isDangerousShangGuan(dayGan, states) {
    if (['庚', '辛', '壬', '癸'].includes(dayGan)) return false;
    return states.shang.hasQi && states.guan.touGan && !states.yin.touGan;
}

function _isAnyShangGuanJianGuan(dayGan, states) {
    if (['庚', '辛', '壬', '癸'].includes(dayGan)) return false;
    return states.shang.hasQi && states.guan.touGan && !states.yin.touGan;
}

function _isStemKe(targetStem, attackerStem) {
    const targetElement = _GAN_TO_ELEMENT[targetStem];
    const attackerElement = _GAN_TO_ELEMENT[attackerStem];
    const keMap = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };
    return keMap[attackerElement] === targetElement;
}

function _getMonthHiddenGans(monthZhi) {
    const hides = BaziEngine.ZHI_HIDE[monthZhi] || [];
    return [hides[0] || null, hides[1] || null, hides[2] || null];
}

function _detectMonthMerge(allBranches, monthZhi) {
    const sanHeGroups = [
        { branches: ['申', '子', '辰'], element: '水' },
        { branches: ['寅', '午', '戌'], element: '火' },
        { branches: ['巳', '酉', '丑'], element: '金' },
        { branches: ['亥', '卯', '未'], element: '木' }
    ];
    for (const group of sanHeGroups) {
        if (!group.branches.includes(monthZhi)) continue;
        if (group.branches.every(branch => allBranches.includes(branch))) {
            return {
                mergeType: '三合',
                originalZhi: monthZhi,
                resultElement: group.element,
                resultGan: _ELEMENT_TO_REP_GAN[group.element]
            };
        }
    }
    const liuHeGroups = [
        { branches: ['子', '丑'], element: '土' },
        { branches: ['寅', '亥'], element: '木' },
        { branches: ['卯', '戌'], element: '火' },
        { branches: ['辰', '酉'], element: '金' },
        { branches: ['巳', '申'], element: '水' },
        { branches: ['午', '未'], element: '土' }
    ];
    for (const group of liuHeGroups) {
        if (!group.branches.includes(monthZhi)) continue;
        if (!group.branches.every(branch => allBranches.includes(branch))) continue;
        const resultStems = _ELEMENT_TO_STEMS[group.element] || [];
        const hasVisibleStem = _monthMergeStemContext.some(stem => resultStems.includes(stem));
        if (!hasVisibleStem) continue;
        return {
            mergeType: '六合',
            originalZhi: monthZhi,
            resultElement: group.element,
            resultGan: _ELEMENT_TO_REP_GAN[group.element]
        };
    }
    return null;
}

function getChengGe(baziInfo) {
    const { geju, dayGan, allStems, allBranches, tenGodMap, dayStrength } = baziInfo;
    const baseBasis = baziInfo.basis || (geju === '建禄格' || geju === '羊刃格' ? '特判' : '月令本气');
    const states = {
        bi: _getTenGodState(dayGan, '比', allStems, allBranches, tenGodMap),
        jie: _getTenGodState(dayGan, '劫', allStems, allBranches, tenGodMap),
        shi: _getTenGodState(dayGan, '食', allStems, allBranches, tenGodMap),
        shang: _getTenGodState(dayGan, '伤', allStems, allBranches, tenGodMap),
        cai: _getTenGodState(dayGan, '财', allStems, allBranches, tenGodMap),
        caiPian: _getTenGodState(dayGan, '才', allStems, allBranches, tenGodMap),
        guan: _getTenGodState(dayGan, '官', allStems, allBranches, tenGodMap),
        sha: _getTenGodState(dayGan, '杀', allStems, allBranches, tenGodMap),
        yin: _getTenGodState(dayGan, '印', allStems, allBranches, tenGodMap),
        xiao: _getTenGodState(dayGan, '枭', allStems, allBranches, tenGodMap)
    };
    const finance = _getCombinedTenGodState(dayGan, ['财', '才'], allStems, allBranches, tenGodMap);
    const seal = _getCombinedTenGodState(dayGan, ['印', '枭'], allStems, allBranches, tenGodMap);
    const official = _getCombinedTenGodState(dayGan, ['官', '杀'], allStems, allBranches, tenGodMap);
    const biJieTooStrong = _isElementOverWang(_GAN_TO_ELEMENT[states.bi.stem || dayGan], allStems, allBranches);
    const result = {
        yongShen: '',
        yongShenTenGod: '',
        chengGe: geju,
        chengGeResult: '待定',
        chengGeReason: '月令已定格，仍待四柱配合分高下。',
        xianShen: '',
        basis: baseBasis
    };
    const setResult = (yongTenGod, chengGe, chengGeResult, chengGeReason, xianShen = '', yongStem = '') => {
        result.yongShenTenGod = yongTenGod;
        result.yongShen = yongStem || _getTenGodStem(dayGan, yongTenGod, tenGodMap) || (yongTenGod === '比' ? dayGan : '');
        result.chengGe = chengGe;
        result.chengGeResult = chengGeResult;
        result.chengGeReason = chengGeReason;
        result.xianShen = xianShen;
        return result;
    };

    if (geju === '正官格') {
        if (_isOfficialMixed(states)) return setResult('官', '正官格', '败格', '官杀混杂', '', states.guan.stem);
        if (_isDangerousShangGuan(dayGan, states)) return setResult('官', '正官格', '败格', '伤官见官', '', states.guan.stem);
        if (states.guan.hasLi && seal.hasLi) return setResult('官', '正官佩印格', '成格', '官印相扶，官星清而有护。', '印', states.guan.stem);
        if (states.guan.hasLi && finance.hasQi && !states.shang.touGan) return setResult('官', '用官喜财格', '成格', '官星有力，财星通气以生官。', '财', states.guan.stem);
        if (states.guan.noRoot && (states.shang.hasLi || states.shi.hasLi)) return setResult('官', '弃官就食格', '成格', '官星无根受制，转取食神成局。', '食', states.guan.stem);
        if ((states.shang.hasLi || states.sha.hasLi) && finance.hasLi) return setResult('官', '弃官存财格', '成格', '官星受制，财星反得成用。', '财', states.guan.stem);
        return setResult('官', '正官格', '待定', '官星已立，须再观印财与清纯。', '', states.guan.stem);
    }

    if (geju === '七杀格') {
        if (states.sha.noRoot && !finance.hasQi) return setResult('杀', '七杀格', '败格', '七杀无气无根', '', states.sha.stem);
        if (states.sha.hasRoot && seal.hasLi) return setResult('杀', '杀印相生格', '成格', '七杀有根，印绶有力相化。', '印', states.sha.stem);
        if (states.shi.hasLi && states.sha.hasRoot) return setResult('杀', '杀邀食制格', '成格', '食神得力，能制七杀。', '食', states.sha.stem);
        if (states.jie.touGan && _HE_GAN_MAP[states.jie.stem] === states.sha.stem) return setResult('杀', '以劫合杀格', '成格', '劫财透干，与杀相合成权。', '劫', states.sha.stem);
        if (finance.hasLi && states.sha.hasRoot && dayStrength === '身强') return setResult('杀', '财滋弱杀格', '成格', '财星有力而身能任杀。', '财', states.sha.stem);
        return setResult('杀', '七杀格', '待定', '杀星已立，仍须制化得所。', '', states.sha.stem);
    }

    if (geju === '正财格' || geju === '偏财格') {
        const yongTenGod = geju === '正财格' ? '财' : '才';
        const yongState = geju === '正财格' ? states.cai : states.caiPian;
        if (biJieTooStrong && !official.hasQi) return setResult(yongTenGod, geju, '败格', '比劫争财', '', yongState.stem);
        if (yongState.hasLi && states.guan.hasQi) return setResult(yongTenGod, '财旺生官格', '成格', '财星有力，官星得气。', '官', yongState.stem);
        if (states.shi.hasLi && yongState.hasQi) return setResult(yongTenGod, '财喜食生格', '成格', '食神有力，能生财星。', '食', yongState.stem);
        if (seal.hasLi && yongState.hasLi && !allBranches.every(branch => branch === baziInfo.monthZhi)) return setResult(yongTenGod, '用财喜印格', '成格', '财印各有所凭，互成高下。', '印', yongState.stem);
        if ((states.bi.touGan || states.jie.touGan) && yongState.hasRoot && !biJieTooStrong) return setResult(yongTenGod, '用财喜比格', '成格', '比劫透而不劫尽，反能任财。', '比', yongState.stem);
        return setResult(yongTenGod, geju, '待定', '财星已立，仍需官食护持。', '', yongState.stem);
    }

    if (geju === '正印格' || geju === '偏印格') {
        const yongTenGod = geju === '正印格' ? '印' : '枭';
        const yongState = geju === '正印格' ? states.yin : states.xiao;
        if (finance.hasLi && yongState.hasLi && !states.bi.touGan && !states.jie.touGan) return setResult(yongTenGod, geju, '败格', '财破印', '', yongState.stem);
        if (yongState.hasLi && states.guan.hasQi) return setResult(yongTenGod, '用印喜官格', '成格', '印绶有力，官星来生。', '官', yongState.stem);
        if (yongState.hasLi && states.shi.hasQi && !(states.xiao.hasLi && states.shi.noRoot)) return setResult(yongTenGod, '用印喜食格', '成格', '印绶稳而食神通气。', '食', yongState.stem);
        if (yongState.hasLi && (states.bi.hasQi || states.jie.hasQi)) return setResult(yongTenGod, '用印喜比格', '成格', '印比相扶，身有依归。', '比', yongState.stem);
        if (yongState.noRoot && finance.hasLi) return setResult(yongTenGod, '弃印就财格', '成格', '印星失势，转取财星为用。', '财', yongState.stem);
        return setResult(yongTenGod, geju, '待定', '印星已立，仍须看官比食之配。', '', yongState.stem);
    }

    if (geju === '食神格') {
        if (states.xiao.hasLi && states.shi.noRoot) return setResult('食', '食神格', '败格', '枭神夺食', '', states.shi.stem);
        if (states.shi.hasLi && states.sha.hasRoot && !finance.touGan) return setResult('食', '食神制杀格', '成格', '食神有力而专制七杀。', '杀', states.shi.stem);
        if (states.shi.hasLi && finance.hasQi) return setResult('食', '食神生财格', '成格', '食神通关，财星随之而起。', '财', states.shi.stem);
        if (states.shi.hasLi && (states.bi.hasQi || states.jie.hasQi) && !official.touGan) return setResult('食', '用食喜比格', '成格', '比劫相扶，食神得展。', '比', states.shi.stem);
        if (states.shi.noRoot && seal.hasLi) return setResult('食', '弃食就印格', '成格', '食神失根，转取印绶。', '印', states.shi.stem);
        return setResult('食', '食神格', '待定', '食神已立，仍须分清财杀印之路。', '', states.shi.stem);
    }

    if (geju === '伤官格') {
        if (_isAnyShangGuanJianGuan(dayGan, states)) return setResult('伤', '伤官格', '败格', '伤官见官', '', states.shang.stem);
        if (states.shang.touGan && seal.hasLi) return setResult('伤', '伤官佩印格', '成格', '伤官外露而印绶能化。', '印', states.shang.stem);
        if (states.shang.touGan && finance.hasLi) return setResult('伤', '伤官生财格', '成格', '伤官吐秀而财星得生。', '财', states.shang.stem);
        if (['庚', '辛', '壬', '癸'].includes(dayGan) && states.shang.touGan && states.guan.hasQi) return setResult('伤', '伤官喜官格', '成格', '金水日主，伤官见官反成清贵。', '官', states.shang.stem);
        if (states.guan.noRoot && states.shang.hasLi) return setResult('伤', '伤官弃官格', '成格', '官星无根，伤官得以专用。', '', states.shang.stem);
        return setResult('伤', '伤官格', '待定', '伤官已立，仍须看印财调停。', '', states.shang.stem);
    }

    if (geju === '建禄格') {
        if (states.guan.hasQi && !states.shang.touGan) return setResult('比', '建禄用官格', '成格', '建禄身旺，以官为相最清。', '官', dayGan);
        if (finance.hasLi && !biJieTooStrong) return setResult('比', '建禄用财格', '成格', '建禄得财，身能任之。', '财', dayGan);
        if ((states.shi.hasLi || states.shang.hasLi) && finance.touGan) return setResult('比', '建禄用食格', '成格', '食伤吐秀而财来引化。', '食', dayGan);
        return setResult('比', '建禄格', '待定', '建禄身旺，仍需财官食引发。', '', dayGan);
    }

    if (geju === '羊刃格') {
        if (!states.sha.touGan && !states.guan.touGan && !(states.shi.hasLi || states.shang.hasLi)) return setResult('劫', '羊刃格', '败格', '羊刃无制', '', states.jie.stem);
        if (states.sha.touGan && states.sha.hasRoot) return setResult('劫', '刃杀相停格', '成格', '七杀透而有根，可以驾刃。', '杀', states.jie.stem);
        if (states.guan.touGan && states.guan.hasRoot) return setResult('劫', '羊刃驾官格', '成格', '官星透而有根，可以制刃。', '官', states.jie.stem);
        if ((states.shi.hasLi || states.shang.hasLi) && finance.touGan) return setResult('劫', '刃泄生财格', '成格', '食伤泄刃而财星引化。', '食', states.jie.stem);
        return setResult('劫', '羊刃格', '待定', '羊刃已立，仍须官杀食伤调之。', '', states.jie.stem);
    }

    return result;
}

// ============================================================================
// 🌟 东方玄学 OS - 全能后端排盘引擎 (接管所有前端计算逻辑)
// ============================================================================
const BaziEngine = {
    Rules: {
        tianYi: { 甲: '丑未', 乙: '子申', 丙: '亥酉', 丁: '亥酉', 戊: '丑未', 己: '子申', 庚: '寅午', 辛: '寅午', 壬: '卯巳', 癸: '卯巳' },
        wenChang: { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' },
        yangRen: { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' },
        luShen: { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' },
        yiMa: { 申: '寅', 子: '寅', 辰: '寅', 寅: '申', 午: '申', 戌: '申', 亥: '巳', 卯: '巳', 未: '巳', 巳: '亥', 酉: '亥', 丑: '亥' },
        taoHua: { 申: '酉', 子: '酉', 辰: '酉', 寅: '卯', 午: '卯', 戌: '卯', 亥: '子', 卯: '子', 未: '子', 巳: '午', 酉: '午', 丑: '午' },
        huaGai: { 申: '辰', 子: '辰', 辰: '辰', 寅: '戌', 午: '戌', 戌: '戌', 亥: '未', 卯: '未', 未: '未', 巳: '丑', 酉: '丑', 丑: '丑' },
        jiangXing: { 申: '子', 子: '子', 辰: '子', 寅: '午', 午: '午', 戌: '午', 亥: '卯', 卯: '卯', 未: '卯', 巳: '酉', 酉: '酉', 丑: '酉' },
        guChen: { 寅: '巳', 卯: '巳', 辰: '巳', 巳: '申', 午: '申', 未: '申', 申: '亥', 酉: '亥', 戌: '亥', 亥: '寅', 子: '寅', 丑: '寅' },
        guaSu: { 寅: '丑', 卯: '丑', 辰: '丑', 巳: '辰', 午: '辰', 未: '辰', 申: '未', 酉: '未', 戌: '未', 亥: '戌', 子: '戌', 丑: '戌' },
        yueDe: { 寅: '丙', 午: '丙', 戌: '丙', 申: '壬', 子: '壬', 辰: '壬', 亥: '甲', 卯: '甲', 未: '甲', 巳: '庚', 酉: '庚', 丑: '庚' },
        tianDe: { 寅: '丁', 卯: '申', 辰: '壬', 巳: '辛', 午: '亥', 未: '甲', 申: '癸', 酉: '寅', 戌: '丙', 亥: '乙', 子: '巳', 丑: '庚' }
    },
    // 前端迁移过来的数据常量
    NAYIN: { "甲子": "海中金", "乙丑": "海中金", "丙寅": "炉中火", "丁卯": "炉中火", "戊辰": "大林木", "己巳": "大林木", "庚午": "路旁土", "辛未": "路旁土", "壬申": "剑锋金", "癸酉": "剑锋金", "甲戌": "山头火", "乙亥": "山头火", "丙子": "涧下水", "丁丑": "涧下水", "戊寅": "城头土", "己卯": "城头土", "庚辰": "白蜡金", "辛巳": "白蜡金", "壬午": "杨柳木", "癸未": "杨柳木", "甲申": "泉中水", "乙酉": "泉中水", "丙戌": "屋上土", "丁亥": "屋上土", "戊子": "霹雳火", "己丑": "霹雳火", "庚寅": "松柏木", "辛卯": "松柏木", "壬辰": "长流水", "癸巳": "长流水", "甲午": "沙中金", "乙未": "沙中金", "丙申": "山下火", "丁酉": "山下火", "戊戌": "平地木", "己亥": "平地木", "庚子": "壁上土", "辛丑": "壁上土", "壬寅": "金箔金", "癸卯": "金箔金", "甲辰": "覆灯火", "乙巳": "覆灯火", "丙午": "天河水", "丁未": "天河水", "戊申": "大驿土", "己酉": "大驿土", "庚戌": "钗钏金", "辛亥": "钗钏金", "壬子": "桑柘木", "癸丑": "桑柘木", "甲寅": "大溪水", "乙卯": "大溪水", "丙辰": "沙中土", "丁巳": "沙中土", "戊午": "天上火", "己未": "天上火", "庚申": "石榴木", "辛酉": "石榴木", "壬戌": "大海水", "癸亥": "大海水" },
    ZHI_HIDE: { "子": ["癸"], "丑": ["己", "癸", "辛"], "寅": ["甲", "丙", "戊"], "卯": ["乙"], "辰": ["戊", "乙", "癸"], "巳": ["丙", "庚", "戊"], "午": ["丁", "己"], "未": ["己", "丁", "乙"], "申": ["庚", "壬", "戊"], "酉": ["辛"], "戌": ["戊", "辛", "丁"], "亥": ["壬", "甲"] },
    SHI_ER: ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"],
    CHANG_SHENG_START: { "甲": 11, "丙": 2, "戊": 2, "庚": 5, "壬": 8, "乙": 6, "丁": 9, "己": 9, "辛": 0, "癸": 3 },
    ZHI_INDEX: { "子": 0, "丑": 1, "寅": 2, "卯": 3, "辰": 4, "巳": 5, "午": 6, "未": 7, "申": 8, "酉": 9, "戌": 10, "亥": 11 },

    // 独立神煞数组获取（供前端直接遍历渲染）
    getShenShaArray: function (targetZhi, dayGan, yearZhi, dayZhi) {
        if (!targetZhi) return [];
        let res = [];
        if (this.Rules.tianYi[dayGan]?.includes(targetZhi)) res.push("天乙");
        if (this.Rules.wenChang[dayGan] === targetZhi) res.push("文昌");
        if (this.Rules.yangRen[dayGan] === targetZhi) res.push("羊刃");
        if (this.Rules.luShen[dayGan] === targetZhi) res.push("禄神");
        if (this.Rules.yiMa[yearZhi] === targetZhi || this.Rules.yiMa[dayZhi] === targetZhi) res.push("驿马");
        if (this.Rules.taoHua[yearZhi] === targetZhi || this.Rules.taoHua[dayZhi] === targetZhi) res.push("桃花");
        if (this.Rules.huaGai[yearZhi] === targetZhi || this.Rules.huaGai[dayZhi] === targetZhi) res.push("华盖");
        if (this.Rules.jiangXing[yearZhi] === targetZhi || this.Rules.jiangXing[dayZhi] === targetZhi) res.push("将星");
        return res;
    },
    // 十二长生计算
    getDiShi: function (gan, zhi) {
        if (!gan || !zhi || this.CHANG_SHENG_START[gan] === undefined || this.ZHI_INDEX[zhi] === undefined) return '-';
        let start = this.CHANG_SHENG_START[gan], zIndex = this.ZHI_INDEX[zhi], isYang = ["甲", "丙", "戊", "庚", "壬"].includes(gan);
        return this.SHI_ER[isYang ? (zIndex - start + 12) % 12 : (start - zIndex + 12) % 12];
    },
    calculateShenSha: function (bazi) {
        // 保留给 LLM 的字符串格式
        const { year, month, day, time } = bazi;
        const result = { year: [], month: [], day: [], time: [] };
        const dayGan = day[0], monthZhi = month[1], yearZhi = year[1], dayZhi = day[1];

        const pushShen = (key, zhi, gan) => {
            result[key] = this.getShenShaArray(zhi, dayGan, yearZhi, dayZhi);
            if (this.Rules.yueDe[monthZhi] === gan) result[key].push("月德贵人");
            if (this.Rules.tianDe[monthZhi] === gan || this.Rules.tianDe[monthZhi] === zhi) result[key].push("天德贵人");
        };
        pushShen('year', yearZhi, year[0]); pushShen('month', monthZhi, month[0]);
        pushShen('day', dayZhi, dayGan); pushShen('time', time[1], time[0]);

        return {
            year: result.year.length > 0 ? result.year.join(" ") : "-",
            month: result.month.length > 0 ? result.month.join(" ") : "-",
            day: result.day.length > 0 ? result.day.join(" ") : "-",
            time: result.time.length > 0 ? result.time.join(" ") : "-"
        };
    },
    extractSpecialPatterns: function (bazi) {
        const patterns = [];
        const dayPillar = bazi.day.join('');
        const timePillar = bazi.time.join('');
        const allZhis = [bazi.year[1], bazi.month[1], bazi.day[1], bazi.time[1]];
        if (['庚辰', '庚戌', '壬辰', '戊戌'].includes(dayPillar)) patterns.push("【魁罡】重叠逢之主大贵。");
        if (['乙丑', '己巳', '癸酉'].includes(timePillar)) patterns.push("【金神】威猛刚烈，逢火乡发富贵。");
        if (allZhis.includes('辰') && allZhis.includes('巳')) patterns.push("【地网】宜遵纪守法。");
        if (allZhis.includes('戌') && allZhis.includes('亥')) patterns.push("【天罗】易怀才不遇。");
        const sheng = allZhis.filter(z => ['寅', '申', '巳', '亥'].includes(z));
        const bai = allZhis.filter(z => ['子', '午', '卯', '酉'].includes(z));
        const ku = allZhis.filter(z => ['辰', '戌', '丑', '未'].includes(z));
        if (sheng.length >= 3) patterns.push("【四生局】寅申巳亥多，奔波变动大。");
        if (bai.length >= 3) patterns.push("【四败局】子午卯酉多，异性缘极佳。");
        if (ku.length >= 3) patterns.push("【四库局】辰戌丑未多，稳重藏锋芒。");
        return patterns;
    },
    ShiShen: {
        '甲': { '甲': '比', '乙': '劫', '丙': '食', '丁': '伤', '戊': '才', '己': '财', '庚': '杀', '辛': '官', '壬': '枭', '癸': '印' },
        '乙': { '甲': '劫', '乙': '比', '丙': '伤', '丁': '食', '戊': '财', '己': '才', '庚': '官', '辛': '杀', '壬': '印', '癸': '枭' },
        '丙': { '甲': '枭', '乙': '印', '丙': '比', '丁': '劫', '戊': '食', '己': '伤', '庚': '才', '辛': '财', '壬': '杀', '癸': '官' },
        '丁': { '甲': '印', '乙': '枭', '丙': '劫', '丁': '比', '戊': '伤', '己': '食', '庚': '财', '辛': '才', '壬': '官', '癸': '杀' },
        '戊': { '甲': '杀', '乙': '官', '丙': '枭', '丁': '印', '戊': '比', '己': '劫', '庚': '食', '辛': '伤', '壬': '才', '癸': '财' },
        '己': { '甲': '官', '乙': '杀', '丙': '印', '丁': '枭', '戊': '劫', '己': '比', '庚': '伤', '辛': '食', '壬': '财', '癸': '才' },
        '庚': { '甲': '才', '乙': '财', '丙': '杀', '丁': '官', '戊': '枭', '己': '印', '庚': '比', '辛': '劫', '壬': '食', '癸': '伤' },
        '辛': { '甲': '财', '乙': '才', '丙': '官', '丁': '杀', '戊': '印', '己': '枭', '庚': '劫', '辛': '比', '壬': '伤', '癸': '食' },
        '壬': { '甲': '食', '乙': '伤', '丙': '才', '丁': '财', '戊': '杀', '己': '官', '庚': '枭', '辛': '印', '壬': '比', '癸': '劫' },
        '癸': { '甲': '伤', '乙': '食', '丙': '财', '丁': '才', '戊': '官', '己': '杀', '庚': '印', '辛': '枭', '壬': '劫', '癸': '比' }
    },
    ZhiMainGan: { '子': '癸', '丑': '己', '寅': '甲', '卯': '乙', '辰': '戊', '巳': '丙', '午': '丁', '未': '己', '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬' },
    getGeJu: function (bazi) {
        const dayGan = bazi.day[0];
        const monthZhi = bazi.month[1];
        const allStems = _buildStemsFromBazi(bazi);
        const allBranches = _buildBranchesFromBazi(bazi);
        const jianLuMap = { '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳', '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子' };
        const yangRenMap = { '甲': '卯', '丙': '午', '戊': '午', '庚': '酉', '壬': '子' };
        _monthMergeStemContext = _getVisibleStems(allStems);
        const monthMergeInfo = _detectMonthMerge(allBranches, monthZhi);
        const rawMonthMainGan = this.ZhiMainGan[monthZhi];
        const yangRenKey = `${dayGan}${monthZhi}`;
        if (yangRenMap[dayGan] === monthZhi) {
            return {
                geju: '羊刃格',
                basis: '羊刃特判',
                monthMainGan: rawMonthMainGan,
                tenGod: '劫',
                monthMergeInfo,
                note: `${yangRenKey}命中羊刃特判，取原月支不论合化。`
            };
        }
        if (jianLuMap[dayGan] === monthZhi) {
            return {
                geju: '建禄格',
                basis: '建禄特判',
                monthMainGan: rawMonthMainGan,
                tenGod: '比',
                monthMergeInfo,
                note: `${dayGan}${monthZhi}命中建禄特判，取原月支禄位立格。`
            };
        }
        const monthHiddenGans = this.ZHI_HIDE[monthZhi] || [];
        let monthMainGan = rawMonthMainGan;
        let basis = '月支本气';
        if (monthMergeInfo) {
            monthMainGan = monthMergeInfo.resultGan;
            basis = '月支合化';
        } else {
            const visibleHidden = monthHiddenGans.filter(stem => stem && _isStemTouGan(stem, allStems));
            if (visibleHidden.length > 0) {
                monthMainGan = visibleHidden.includes(rawMonthMainGan) ? rawMonthMainGan : visibleHidden[0];
            }
        }
        const tenGod = this.ShiShen[dayGan][monthMainGan];
        const formatMap = { '官': '正官格', '杀': '七杀格', '财': '正财格', '才': '偏财格', '食': '食神格', '伤': '伤官格', '印': '正印格', '枭': '偏印格', '比': '建禄格', '劫': '羊刃格' };
        return {
            geju: formatMap[tenGod] || `${tenGod}格`,
            basis,
            monthMainGan,
            tenGod,
            monthMergeInfo,
            note: monthMergeInfo
                ? `${monthZhi}参与${monthMergeInfo.mergeType}化${monthMergeInfo.resultElement}，以${monthMainGan}立格。`
                : `${monthZhi}以${monthMainGan}为月令主气取格。`
        };
    }
};

module.exports = async function handler(req, res) {
    const ALLOWED_ORIGIN = process.env.FRONTEND_URL || '*';
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: "Unauthorized" });
        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

        const { promptData } = req.body;
        if (!promptData || !promptData.profileId) return res.status(400).json({ error: "缺少档案 ID" });

        const whitelist = (process.env.WHITELIST_EMAILS || "").split(',').map(e => e.trim().toLowerCase());
        const isVIP = whitelist.includes(user.email?.toLowerCase() || "");

        if (!isVIP) {
            const { count } = await supabase.from('bazi_profiles').select('*', { count: 'exact', head: true }).eq('user_id', user.id).not('bazi_summary', 'is', null);
            if (count >= 3) {
                const { data: existingProfile } = await supabase.from('bazi_profiles').select('bazi_summary').eq('id', promptData.profileId).single();
                if (!existingProfile || !existingProfile.bazi_summary) return res.status(403).json({ error: "免费额度已用尽" });
            }
        }

        const cacheKey = `${promptData.baziStr}_${promptData.gender}_${promptData.daYunStr}`;
        if (memoryCache[cacheKey]) return res.status(200).json(memoryCache[cacheKey]);

        // ==================== 1. 核心排盘计算 ====================
        const dateParts = promptData.birthStr ? promptData.birthStr.match(/\d+/g) : null;
        if (!dateParts || dateParts.length < 3) return res.status(400).json({ error: "缺少确切的出生时间" });

        const y = parseInt(dateParts[0]), m = parseInt(dateParts[1]), d = parseInt(dateParts[2]);
        const h = dateParts[3] ? parseInt(dateParts[3]) : 12, min = dateParts[4] ? parseInt(dateParts[4]) : 0;

        const solarObj = Solar.fromYmdHms(y, m, d, h, min, 0);
        const baZi = solarObj.getLunar().getEightChar();
        const isMale = (promptData.gender === '男' || promptData.gender === 'M' || promptData.gender === '乾造');
        const yun = baZi.getYun(isMale ? 1 : 0);

        const baziObj = {
            year: baZi.getYear().split(''), month: baZi.getMonth().split(''),
            day: baZi.getDay().split(''), time: baZi.getTime().split('')
        };

        const shenshaResult = BaziEngine.calculateShenSha(baziObj);
        const geJuInfo = BaziEngine.getGeJu(baziObj);
        const geJu = geJuInfo.geju;
        const specialPatterns = BaziEngine.extractSpecialPatterns(baziObj);
        const siziSummaryKey = buildSiziSummaryKey(baZi.getDayGan(), baZi.getTime());
        const siziSummaryText = getSiziSummary(siziSummaryKey);

        // ==================== 2. 为前端构建 JSON 渲染矩阵 (Matrix) ====================
        const dayGan = baZi.getDayGan(), yearZhi = baZi.getYearZhi(), dayZhi = baZi.getDayZhi();
        const xunKong = baZi.getDayXunKong() || "";

        // 辅助函数：构建单柱结构体
        const buildPillar = (name, gan, zhi, star) => ({
            name, gan, zhi, star,
            hidden_stems: BaziEngine.ZHI_HIDE[zhi] || [],
            shi: BaziEngine.getDiShi(dayGan, zhi), // 查日干得星运
            zizuo: BaziEngine.getDiShi(gan, zhi),  // 查本柱得自座
            nayin: BaziEngine.NAYIN[gan + zhi] || '-',
            is_kong: xunKong.includes(zhi),
            shensha: BaziEngine.getShenShaArray(zhi, dayGan, yearZhi, dayZhi)
        });

        const pillarsData = [
            buildPillar('年', baZi.getYearGan(), baZi.getYearZhi(), baZi.getYearShiShenGan()),
            buildPillar('月', baZi.getMonthGan(), baZi.getMonthZhi(), baZi.getMonthShiShenGan()),
            buildPillar('日', baZi.getDayGan(), baZi.getDayZhi(), isMale ? '元男' : '元女'),
            buildPillar('时', baZi.getTimeGan(), baZi.getTimeZhi(), baZi.getTimeShiShenGan())
        ];

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        // ── 1. 大运列表 (10柱) ──
        const daYunList = yun.getDaYun().slice(0, 10).map(dy => {
            const gan = dy.getGanZhi().charAt(0);
            const zhi = dy.getGanZhi().charAt(1);
            return {
                start_year: dy.getStartYear(),
                start_age: dy.getStartAge(),
                gan: gan,
                zhi: zhi,
                shi_shen: getShen(dayGan, gan)
            };
        });

        // ── 2. 流年列表 (取当前所在大运的 10 年) ──
        const currentDaYunObj = yun.getDaYun().find(dy => currentYear >= dy.getStartYear() && currentYear <= dy.getEndYear()) || yun.getDaYun()[0];
        const liuNianList = currentDaYunObj.getLiuNian().map(ln => {
            const gan = ln.getGanZhi().charAt(0);
            const zhi = ln.getGanZhi().charAt(1);
            return {
                year: ln.getYear(),
                gan: gan,
                zhi: zhi,
                shi_shen: getShen(dayGan, gan)
            };
        });

        // ── 3. 流月列表 (取当前年份的 12 个月) ──
        let currentLiuNianObj = currentDaYunObj.getLiuNian().find(ln => ln.getYear() === currentYear);
        if (!currentLiuNianObj) {
            // 如果不在当前大运，尝试从整个运势找流年
            const allDaYuns = yun.getDaYun();
            for (const dy of allDaYuns) {
                const ln = dy.getLiuNian().find(l => l.getYear() === currentYear);
                if (ln) { currentLiuNianObj = ln; break; }
            }
        }

        const liuYueList = currentLiuNianObj ? currentLiuNianObj.getLiuYue().map(ly => {
            const gan = ly.getGanZhi().charAt(0);
            const zhi = ly.getGanZhi().charAt(1);
            return {
                month_name: ly.getMonthInChinese() + '月',
                gan: gan,
                zhi: zhi,
                shi_shen: getShen(dayGan, gan)
            };
        }) : [];

        // ── 4. 当前状态柱 (供 UI 高亮) ──
        const currentLiuNianGan = currentLiuNianObj ? currentLiuNianObj.getGanZhi().charAt(0) : "未知";
        const currentLiuNianZhi = currentLiuNianObj ? currentLiuNianObj.getGanZhi().charAt(1) : "未知";

        const currentDaYunData = buildPillar('大运', currentDaYunObj.getGanZhi().charAt(0), currentDaYunObj.getGanZhi().charAt(1), '大运');
        const currentLiuNianData = buildPillar('流年', currentLiuNianGan, currentLiuNianZhi, '流年');

        const objectiveBaziData = {
            base_info: { qi_yun: `出生后${yun.getStartYear()}年${yun.getStartMonth()}月${yun.getStartDay()}天起运`, ge_ju: geJu, ge_ju_detail: geJuInfo, special_patterns: specialPatterns },
            matrix: {
                pillars: pillarsData,
                dayun_list: daYunList,
                liunian_list: liuNianList,
                liuyue_list: liuYueList,
                current_dayun: currentDaYunData,
                current_liunian: currentLiuNianData
            },
            pillars: {
                ganzhi: { year: baZi.getYear(), month: baZi.getMonth(), day: baZi.getDay(), time: baZi.getTime() },
                main_stars: { year: baZi.getYearShiShenGan(), month: baZi.getMonthShiShenGan(), day: "日主", time: baZi.getTimeShiShenGan() },
                shensha: shenshaResult
            }
        };

        // ==================== 3. 本地规则引擎推演（无 LLM）====================
        // ── 提取四柱数组（供规则引擎使用）──
        const gansArr = [baZi.getYearGan(), baZi.getMonthGan(), baZi.getDayGan(), baZi.getTimeGan()];
        const zhisArr = [baZi.getYearZhi(), baZi.getMonthZhi(), baZi.getDayZhi(), baZi.getTimeZhi()];
        const dayGanVal = gansArr[2], monthZhiVal2 = zhisArr[1];

        // ── 日主强弱 ──
        const strengthResult = BaziRuleEngine.calculateStrength(dayGanVal, gansArr, zhisArr);
        const monthHiddenGans = _getMonthHiddenGans(monthZhiVal2);
        const chengGeDetail = getChengGe({
            geju: geJuInfo.geju,
            basis: geJuInfo.basis === '月支合化' ? '月支合化' : (geJuInfo.basis.includes('特判') ? '特判' : (geJuInfo.monthMergeInfo ? '月支合化' : (monthHiddenGans.some(stem => stem && _isStemTouGan(stem, gansArr)) ? '月令透干' : '月令本气'))),
            dayGan: dayGanVal,
            monthZhi: monthZhiVal2,
            allStems: gansArr,
            allBranches: zhisArr,
            monthHiddenGans,
            tenGodMap: BaziEngine.ShiShen[dayGanVal],
            dayStrength: strengthResult.strongWeak === '身强' ? '身强' : (strengthResult.strongWeak === '身弱' ? '身弱' : '身中')
        });

        // ── 喜忌神 ──
        const favorableResult = BaziRuleEngine.getFavorableUnfavorable(
            dayGanVal, monthZhiVal2, geJu, strengthResult, zhisArr, gansArr
        );

        // ── 格局断语 ──
        const rulePatterns = BaziRuleEngine.extractAdvancedPatterns(
            dayGanVal, gansArr, zhisArr, strengthResult.allShens, geJu, strengthResult
        );

        // ── 扩展神煞（覆盖原有简版）──
        const shenshaFull = BaziRuleEngine.calculateShenShaFull(baziObj);

        // ── 大运流年文案 (规则引擎硬核版) ──
        const currentDayunGan = currentDaYunObj ? currentDaYunObj.getGanZhi().charAt(0) : '';
        const currentDayunZhi = currentDaYunObj ? currentDaYunObj.getGanZhi().charAt(1) : '';

        // ── 结构化合克关系 (用于 UI 连线图) ──
        const relationGans = [...gansArr, currentDayunGan, currentLiuNianGan];
        const relationZhis = [...zhisArr, currentDayunZhi, currentLiuNianZhi];
        const interactions = BaziRuleEngine.calculateInteractions(relationZhis, relationGans);
        const engineYuanjuCore = BaziRuleEngine.buildYuanjuCore(
            dayGanVal, monthZhiVal2, gansArr, zhisArr, geJu,
            strengthResult, favorableResult, rulePatterns
        );
        const engineCurrentDayun = BaziRuleEngine.buildCurrentDayun(
            currentDayunGan, currentDayunZhi, dayGanVal, zhisArr, gansArr
        );
        const engineCurrentLiunian = BaziRuleEngine.buildCurrentLiunian(
            currentLiuNianGan, currentLiuNianZhi, currentDayunGan, currentDayunZhi, dayGanVal, zhisArr
        );

        // ==================== 4. 请求 LLM 进行断语生成 (前端展示版) ====================
        const llmPrompt = `你是一位精通子平八字与传统命理学的现代高级命理大师。
请基于下方提供的精确命理数据，为用户进行详尽、专业、且符合现代人语境的八字推演。

【命理客观数据】
• 性别：${promptData.gender}
• 八字原局：${baZi.getYear()} ${baZi.getMonth()} ${baZi.getDay()} ${baZi.getTime()}
• 命主格局：${geJu}
• 核心神煞：年柱[${shenshaFull.year}] 月柱[${shenshaFull.month}] 日柱[${shenshaFull.day}] 时柱[${shenshaFull.time}]
• 命局特征（本地规则推演引擎结果，供参考）：${rulePatterns.length > 0 ? rulePatterns.join(' | ') : '无'}
• 当前大运：${currentDaYunObj ? currentDaYunObj.getGanZhi() : ''}
• 当前流年：${currentLiuNianGan}${currentLiuNianZhi}年

【推演任务】
1. 【原局深度评析】：结合格局、神煞、五行流通，评价命主的性格特质、事业财运潜力等。
2. 【当前大运解析】：分析当前十步大运对原局的影响，侧重点在何处（如：利求财、防破财等）。
3. 【当前流年简评】：结合流年干支给出今年的具体运势研判。

必须且仅输出纯 JSON 字符串对象，格式严格如下：
{
  "yuanju_core": "原局核心深度分析文案...",
  "current_dayun": "当前大运分析文案...",
  "current_liunian": "当前流年简评文案..."
}`;

        const API_URL = 'https://yinli.one/v1/chat/completions';
        const llmResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GEMINI_API_KEY}` },
            body: JSON.stringify({
                model: 'gemini-3.1-pro-preview',
                messages: [{ role: 'user', content: llmPrompt }],
                temperature: 0.2,
                response_format: { type: "json_object" }
            })
        });

        const engineQualitativeData = {
            yuanju_core: engineYuanjuCore,
            current_dayun: engineCurrentDayun,
            current_liunian: engineCurrentLiunian
        };
        let llmQualitativeData = null;
        let llmSucceeded = false;
        try {
            const rawText = await llmResponse.text();
            if (!llmResponse.ok) {
                console.error("LLM API Error Status:", llmResponse.status, rawText);
            } else {
                const apiData = JSON.parse(rawText);
                if (apiData.error) throw new Error(apiData.error.message);
                if (apiData.choices && apiData.choices[0] && apiData.choices[0].message) {
                    const rawResult = apiData.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
                    llmQualitativeData = JSON.parse(rawResult);
                    llmSucceeded = true;
                }
            }
        } catch (e) {
            console.error("LLM API 解析失败，降级使用本地规则引擎结果:", e);
        }

        const qualitativeSections = buildQualitativeSections({
            llmSucceeded,
            llmQualitativeData,
            engineQualitativeData
        });

        const combinedResultText = `【命造格局】：${geJu}\n\n原局核心：\n${qualitativeSections.display.yuanju_core}\n\n当前大运：\n${qualitativeSections.display.current_dayun}\n\n当前流年：\n${qualitativeSections.display.current_liunian}`;

        const finalBaziDetail = {
            ...objectiveBaziData,
            geju: geJu,
            strong_weak: strengthResult.strongWeak,
            strength_basis: strengthResult.strengthBasis,
            strength_detail: strengthResult.strengthDetail,
            geju_detail: geJuInfo,
            geju_info: GE_JU_INFO[geJuInfo.geju] || null,
            chengge_detail: chengGeDetail,
            favorable_gods: favorableResult.core_shens.favorable,
            unfavorable_gods: favorableResult.core_shens.unfavorable,
            favorable_verdict: favorableResult.verdict,
            scoring_details: favorableResult.scoring_details,
            dimension_breakdown: favorableResult.dimension_breakdown,
            wuxing_ratio: favorableResult.wuxing_ratio,
            llm_yuanju_core: qualitativeSections.llm.yuanju_core,
            llm_current_dayun: qualitativeSections.llm.current_dayun,
            llm_current_liunian: qualitativeSections.llm.current_liunian,
            interactions: interactions,
            classic_verdict: {
                source: '三命通会',
                key: siziSummaryKey,
                text: siziSummaryText
            },
            engine_yuanju_core: qualitativeSections.engine.yuanju_core,
            engine_current_dayun: qualitativeSections.engine.current_dayun,
            engine_current_liunian: qualitativeSections.engine.current_liunian
        };

        // ── 命理基底字段（供 calculateDailyScore 纯 JS 算分引擎使用）──
        const riZhu = baZi.getDay();         // 完整日柱，如 "甲子"
        const dayZhiVal = baZi.getDayZhi();      // 日支
        const yearZhiVal = baZi.getYearZhi();     // 年支
        const monthZhiVal = baZi.getMonthZhi();   // 月支

        const { error: dbError } = await supabase.from('bazi_profiles').update({
            bazi_summary: combinedResultText,
            strong_weak: finalBaziDetail.strong_weak,
            favorable_elements: finalBaziDetail.favorable_gods,
            unfavorable_elements: finalBaziDetail.unfavorable_gods,
            display_yuanju_core: qualitativeSections.display.yuanju_core,
            display_current_dayun: qualitativeSections.display.current_dayun,
            display_current_liunian: qualitativeSections.display.current_liunian,
            llm_yuanju_core: qualitativeSections.llm.yuanju_core,
            llm_current_dayun: qualitativeSections.llm.current_dayun,
            llm_current_liunian: qualitativeSections.llm.current_liunian,
            engine_yuanju_core: qualitativeSections.engine.yuanju_core,
            engine_current_dayun: qualitativeSections.engine.current_dayun,
            engine_current_liunian: qualitativeSections.engine.current_liunian,
            bazi_detail: finalBaziDetail,
            shensha: JSON.stringify(shenshaFull),
            geju: geJu,
            ri_zhu: riZhu,
            day_zhi: dayZhiVal,
            year_zhi: yearZhiVal,
            month_zhi: monthZhiVal,
        }).eq('id', promptData.profileId);

        if (dbError) console.error("数据库写入失败:", dbError);

        const outputPayload = { result: combinedResultText, bazi_detail: finalBaziDetail };
        memoryCache[cacheKey] = outputPayload;
        return res.status(200).json(outputPayload);

    } catch (error) {
        return res.status(error.message.includes("额度") ? 403 : 500).json({ error: error.message });
    }
}

module.exports.GE_JU_INFO = GE_JU_INFO;
module.exports.getChengGe = getChengGe;
module.exports.getGeJu = BaziEngine.getGeJu.bind(BaziEngine);
module.exports.buildQualitativeSections = buildQualitativeSections;
