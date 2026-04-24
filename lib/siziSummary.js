const fs = require('node:fs');
const path = require('node:path');

let cachedSummaries = null;

const SIZI_PATH = path.join(__dirname, 'classics', 'sizi.py');

function normalizeSummary(text) {
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .join('\n');
}

function loadSiziSummaries() {
    if (cachedSummaries) return cachedSummaries;

    const source = fs.readFileSync(SIZI_PATH, 'utf8');
    const summaries = {};
    const entryPattern = /['"]([^'"]+)['"]\s*:\s*'''([\s\S]*?)'''/g;

    let match;
    while ((match = entryPattern.exec(source)) !== null) {
        summaries[match[1]] = normalizeSummary(match[2]);
    }

    cachedSummaries = summaries;
    return summaries;
}

function buildSiziSummaryKey(dayGan, timePillar) {
    if (!dayGan || !timePillar) return '';
    const time = Array.isArray(timePillar) ? timePillar.join('') : String(timePillar);
    return `${dayGan}日${time}`;
}

function getSiziSummary(key) {
    if (!key) return '';
    return loadSiziSummaries()[key] || '';
}

module.exports = {
    buildSiziSummaryKey,
    getSiziSummary,
    loadSiziSummaries
};
