/**
 * 奇門遁甲盤局運算模組 (兼容 Vercel Node.js 环境)
 */

// ============================================================================
// 1. 引入依賴 (修改为 Node.js 标准的 require)
// ============================================================================
const {
    PALACE,
    ZHONG_SUBSTITUTE,
    FLY_PATH,
    DIRECTION_ARROWS,
    HETU_BAGUA,
    LUOSHU_BAGUA,
    FLYING_STARS,
    FLYING_STAR_CHARTS,
    QIMEN_STARS,
    EIGHT_DOORS_ORIGINAL,
    EIGHT_DOORS_SEQUENCE,
    EIGHT_GODS_YANG,
    EIGHT_GODS_YIN,
    DIPAN_YANG,
    DIPAN_YIN
} = require('./QimenConstants');

const {
    rotateMapping,
    generatePutSequence,
    normalizeZhongPalace
} = require('./QimenUtils');

// ============================================================================
// 基礎盤面：河圖與洛書
// ============================================================================

function getHeTu() {
    return [...HETU_BAGUA];
}

function getLuoShu() {
    return [...LUOSHU_BAGUA];
}

// ============================================================================
// 飛星系統
// ============================================================================

function calculateFlyingStars(centerStar) {
    const starNumbers = FLYING_STAR_CHARTS[centerStar];
    if (!starNumbers) {
        throw new Error(`無效的中宮星數：${centerStar}，必須為 1-9`);
    }
    return starNumbers.map(num => FLYING_STARS[num]);
}

// ============================================================================
// 第一層：地盤（三奇六儀）
// ============================================================================

function getDiPan(isYang, gameNumber) {
    const diPanConfig = isYang ? DIPAN_YANG : DIPAN_YIN;
    const result = diPanConfig[gameNumber];
    if (!result) {
        throw new Error(`無效的局數：${gameNumber}，必須為 1-9`);
    }
    return [...result];
}

// ============================================================================
// 第二層：天盤（天干飛布）
// ============================================================================

function calculateTianPan(isYang, tianGan, fuShou, diPan) {
    const targetIndex = diPan.indexOf(tianGan);
    const sourceIndex = diPan.indexOf(fuShou);
    
    // 陽局與陰局使用相同的順時針軌跡
    return rotateMapping(diPan, FLY_PATH.CLOCKWISE, sourceIndex, targetIndex);
}

// ============================================================================
// 第三層：八門
// ============================================================================

function getOriginalDoors() {
    return [...EIGHT_DOORS_ORIGINAL];
}

function getZhiShiDoor(fuShou, diPan) {
    let doorIndex = diPan.indexOf(fuShou);
    doorIndex = normalizeZhongPalace(doorIndex);
    return EIGHT_DOORS_ORIGINAL[doorIndex];
}

function calculateEightDoors(isYang, zhiShiDoor, flyStep, fuShou, diPan) {
    const startIndex = diPan.indexOf(fuShou);
    const flyIndex = isYang ? FLY_PATH.DOOR_YANG : FLY_PATH.DOOR_YIN;
    const normalizedFlyStep = flyStep % flyIndex.length;
    const putSequence = generatePutSequence(flyIndex, startIndex);
    
    let zhiShiTargetIndex = putSequence[normalizedFlyStep];
    zhiShiTargetIndex = normalizeZhongPalace(zhiShiTargetIndex);
    
    const doorPutSequence = generatePutSequence(FLY_PATH.CLOCKWISE, zhiShiTargetIndex);
    const zhiShiIndexInSequence = EIGHT_DOORS_SEQUENCE.indexOf(zhiShiDoor);
    const doorOrder = [
        ...EIGHT_DOORS_SEQUENCE.slice(zhiShiIndexInSequence),
        ...EIGHT_DOORS_SEQUENCE.slice(0, zhiShiIndexInSequence)
      ];
    
    const result = new Array(9).fill('');
    for (let i = 0; i < doorPutSequence.length; i++) {
        result[doorPutSequence[i]] = doorOrder[i];
    }
    
    return result;
}

// ============================================================================
// 第四層：九星
// ============================================================================

function getOriginalStars() {
    return [...QIMEN_STARS];
}

function getZhiFuStar(fuShou, diPan) {
    const starIndex = diPan.indexOf(fuShou);
    return QIMEN_STARS[starIndex];
}

function getZhiFuPosition(tianGan, diPan) {
    const positionIndex = diPan.indexOf(tianGan);
    return LUOSHU_BAGUA[positionIndex];
}

function calculateNineStars(zhiFuStar, tianGan, diPan) {
    const targetIndex = diPan.indexOf(tianGan);
    const sourceIndex = QIMEN_STARS.indexOf(zhiFuStar);
    
    return rotateMapping(QIMEN_STARS, FLY_PATH.CLOCKWISE, sourceIndex, targetIndex);
}

function getTianQinDirection(nineStars) {
    const tianRuiIndex = nineStars.indexOf('天芮');
    return DIRECTION_ARROWS[tianRuiIndex];
}

// ============================================================================
// 第五層：八神
// ============================================================================

function calculateEightGods(isYang, tianGan, diPan) {
    let headIndex = diPan.indexOf(tianGan);
    headIndex = normalizeZhongPalace(headIndex);
    
    const gods = isYang ? EIGHT_GODS_YANG : EIGHT_GODS_YIN;
    const flyPath = isYang ? FLY_PATH.CLOCKWISE : FLY_PATH.COUNTER_CLOCKWISE;
    const putSequence = generatePutSequence(flyPath, headIndex);
    
    const result = new Array(9).fill('');
    for (let i = 0; i < putSequence.length; i++) {
        result[putSequence[i]] = gods[i];
    }
    
    return result;
}

// ============================================================================
// 輔助查詢函數
// ============================================================================

function getDirectionArrow(palaceIndex) {
    return DIRECTION_ARROWS[palaceIndex] || '';
}

function getZhiShiPosition(zhiShiDoor, eightDoors) {
    const doorIndex = eightDoors.indexOf(zhiShiDoor);
    return LUOSHU_BAGUA[doorIndex];
}

// ============================================================================
// 拆補法定局
// ============================================================================

const SIMPLIFIED_TO_TRADITIONAL = {
    '谷雨': '穀雨',
    '惊蛰': '驚蟄',
    '处暑': '處暑',
    '小满': '小滿',
    '芒种': '芒種'
};

function s2t(str) {
    if (!str) return str;
    let result = str;
    for (const [simplified, traditional] of Object.entries(SIMPLIFIED_TO_TRADITIONAL)) {
        result = result.replace(new RegExp(simplified, 'g'), traditional);
    }
    return result;
}

// 60 甲子序号（接受简/繁体单个干支，如「辛巳」）
const _CHAIBU_GAN = '甲乙丙丁戊己庚辛壬癸';
const _CHAIBU_ZHI = '子丑寅卯辰巳午未申酉戌亥';
function getGanZhiIndex(gz) {
    if (!gz || gz.length < 2) return -1;
    const g = _CHAIBU_GAN.indexOf(gz[0]);
    const z = _CHAIBU_ZHI.indexOf(gz[1]);
    if (g < 0 || z < 0) return -1;
    for (let i = 0; i < 60; i++) if (i % 10 === g && i % 12 === z) return i;
    return -1;
}

function calculateJuByChaiBu(solar, jieQiJuShu, yuanNames) {
    const lunar = solar.getLunar();
    const currentJieQi = lunar.getPrevJieQi();
    const jieQiNameRaw = currentJieQi.getName();
    const jieQiName = s2t(jieQiNameRaw);
    const jieQiSolar = currentJieQi.getSolar();

    const currentJD = solar.getJulianDay();
    const jieQiJD = jieQiSolar.getJulianDay();
    const daysDiff = currentJD - jieQiJD;

    // 定元：按符头（最近的甲/己日），即拆补法/时家奇门标准做法。
    // 取代旧的「距节气天数 ÷ 5」近似——节气不落在甲/己日（超神/接气）时旧法会偏一元，
    // 导致局数与值符/值使错位（四柱/空亡/马星不受影响）。
    // 日柱在 60 甲子的序号 → 最近符头 = floor(idx/5)*5（每 5 日一元，符头为甲/己日）
    //   → 元 = (符头序号 % 15) / 5：0 上元、1 中元、2 下元。
    const dayGanZhiIndex = getGanZhiIndex(lunar.getDayInGanZhi());
    const fuTouIndex = Math.floor(dayGanZhiIndex / 5) * 5;
    const yuan = (fuTouIndex % 15) / 5;

    const config = jieQiJuShu[jieQiName];
    if (!config) {
        throw new Error(`未知的節氣：${jieQiNameRaw} (轉換後: ${jieQiName})`);
    }

    return {
        jieQiName,
        yuan,
        yuanName: yuanNames[yuan],
        isYang: config.yang,
        yinYang: config.yang ? '陽' : '陰',
        gameNumber: config.ju[yuan],
        daysSinceJieQi: Math.floor(daysDiff)
    };
}

// ============================================================================
// 模組導出
// ============================================================================
module.exports = {
    getHeTu,
    getLuoShu,
    calculateFlyingStars,
    getDiPan,
    calculateTianPan,
    getOriginalDoors,
    getZhiShiDoor,
    calculateEightDoors,
    getOriginalStars,
    getZhiFuStar,
    getZhiFuPosition,
    calculateNineStars,
    getTianQinDirection,
    calculateEightGods,
    getDirectionArrow,
    getZhiShiPosition,
    calculateJuByChaiBu
};
