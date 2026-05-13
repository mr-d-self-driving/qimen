const cachedSummaries = require('./classics/siziData.js');

function loadSiziSummaries() {
    return cachedSummaries;
}

function buildSiziSummaryKey(dayGan, timePillar) {
    if (!dayGan || !timePillar) return '';
    const time = Array.isArray(timePillar) ? timePillar.join('') : String(timePillar);
    return `${dayGan}日${time}`;
}

function getSiziSummary(key) {
    if (!key) return '';
    return cachedSummaries[key] || '';
}

module.exports = {
    buildSiziSummaryKey,
    getSiziSummary,
    loadSiziSummaries
};
