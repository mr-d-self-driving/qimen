// 辅助函数：马星与空亡推导
function getMaXing(zhi) {
    if (["申", "子", "辰"].includes(zhi)) return "寅";
    if (["寅", "午", "戌"].includes(zhi)) return "申";
    if (["巳", "酉", "丑"].includes(zhi)) return "亥";
    if (["亥", "卯", "未"].includes(zhi)) return "巳";
    return "";
}

const maXingMap = { "寅": 6, "申": 2, "亥": 8, "巳": 0 }; 
const zhiToPalace = {
    "子": 7, "丑": 6, "寅": 6, "卯": 3, "辰": 0, "巳": 0,
    "午": 1, "未": 2, "申": 2, "酉": 5, "戌": 8, "亥": 8
};
const palaceBranches = {
    0: ["辰", "巳"],
    1: ["午"],
    2: ["未", "申"],
    3: ["卯"],
    4: [],
    5: ["酉"],
    6: ["丑", "寅"],
    7: ["子"],
    8: ["戌", "亥"]
};

function getKongIndices(kongStr) {
    let indices = [];
    for (let char of kongStr) {
        if (zhiToPalace[char] !== undefined) indices.push(zhiToPalace[char]);
    }
    return indices;
}

module.exports = {
    getMaXing,
    maXingMap,
    zhiToPalace,
    palaceBranches,
    getKongIndices
};
