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

function calculateJuByChaiBu(solar, jieQiJuShu, yuanNames) {
    const lunar = solar.getLunar();
    const currentJieQi = lunar.getPrevJieQi();
    const jieQiNameRaw = currentJieQi.getName();
    const jieQiName = s2t(jieQiNameRaw);
    const jieQiSolar = currentJieQi.getSolar();
    
    const currentJD = solar.getJulianDay();
    const jieQiJD = jieQiSolar.getJulianDay();
    const daysDiff = currentJD - jieQiJD;
    
    let yuan;
    if (daysDiff < 5) {
        yuan = 0; // 上元
    } else if (daysDiff < 10) {
        yuan = 1; // 中元
    } else {
        yuan = 2; // 下元
    }
    
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
