import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync } from 'fs';
import pkg from 'lunar-javascript';
import { scoreCase, summarizeRows } from './scorer.mjs';

const { Solar } = pkg;
const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const { CASES } = require(process.env.CASES_FILE ? resolve(__dirname, process.env.CASES_FILE) : './gold-cases.js');
const { buildCompleteBaziDetail } = require(resolve(ROOT, 'lib/baziCore.js'));
const C = require(resolve(ROOT, 'lib/BaziConstants.js'));

const FULL_TO_SHORT = {
  比肩: '比',
  劫财: '劫',
  食神: '食',
  伤官: '伤',
  正财: '财',
  偏财: '才',
  正官: '官',
  七杀: '杀',
  正印: '印',
  偏印: '枭',
};

const DEFAULT_SEARCH_FROM = 1500;
const DEFAULT_SEARCH_SPAN = 800;
const ZHI_HOURS = { 子: 0, 丑: 2, 寅: 4, 卯: 6, 辰: 8, 巳: 10, 午: 12, 未: 14, 申: 16, 酉: 18, 戌: 20, 亥: 22 };

function genderToMale(gender) {
  if (gender === 'female' || gender === '坤造' || gender === false) return false;
  return true;
}

function getStemByShen(dayGan, fullShen) {
  const short = FULL_TO_SHORT[fullShen];
  if (!short) return null;
  return Object.keys(C.SHISHEN[dayGan] || {}).find(stem => C.SHISHEN[dayGan][stem] === short) || null;
}

function getWuxingByFullShen(dayGan, fullShen) {
  const stem = getStemByShen(dayGan, fullShen);
  return stem ? C.GAN5[stem] : null;
}

function findSolar(pillars, startYear = DEFAULT_SEARCH_FROM, span = DEFAULT_SEARCH_SPAN) {
  const [yearPillar, monthPillar, dayPillar, timePillar] = pillars;
  const targetHour = ZHI_HOURS[timePillar.charAt(1)] ?? 12;
  for (let year = startYear; year <= startYear + span; year += 1) {
    const midYear = Solar.fromYmd(year, 7, 1);
    if (midYear.getLunar().getYearInGanZhi() !== yearPillar) continue;

    let current = Solar.fromYmd(year - 1, 11, 1);
    const end = Solar.fromYmd(year + 1, 3, 1);
    while (current.toYmd() <= end.toYmd()) {
      const test = Solar.fromYmdHms(current.getYear(), current.getMonth(), current.getDay(), targetHour, 30, 0);
      const eightChar = test.getLunar().getEightChar();
      if (
        eightChar.getYear() === yearPillar &&
        eightChar.getMonth() === monthPillar &&
        eightChar.getDay() === dayPillar &&
        eightChar.getTime() === timePillar
      ) {
        return { year: current.getYear(), month: current.getMonth(), day: current.getDay(), hour: targetHour, minute: 30 };
      }
      current = current.next(1);
    }
  }
  return null;
}

function summarizeImage(detail = {}) {
  const image = detail.image_analysis || {};
  const candidate = image.override_candidate || image.primary_candidate || {};
  const patternFinal = detail.pattern_analysis?.final_pattern?.name
    || detail.pattern_analysis?.final_pattern?.subtype
    || detail.pattern_analysis?.final_pattern
    || '';
  return {
    image_category: candidate.category || image.category || '',
    image_subtype: candidate.subtype || image.subtype || '',
    image_match_score: candidate.match_score ?? image.match_score ?? null,
    pattern_final: typeof patternFinal === 'string' ? patternFinal : JSON.stringify(patternFinal),
  };
}

function extractActual(detail, baZi) {
  const fs = detail.five_shens || {};
  const favorableShens = detail.favorable_gods || fs.favorable || [];
  const unfavorableShens = detail.unfavorable_gods || fs.unfavorable || [];
  const dayGan = baZi.getDayGan();
  const yong = fs.yong || '';
  return {
    day_gan: dayGan,
    geju: detail.geju || '',
    chengge: detail.chengge_detail?.chengGe || '',
    strong_weak: detail.strong_weak || '',
    strength_band: detail.strength_detail?.band || '',
    yong,
    yong_wuxing: getWuxingByFullShen(dayGan, yong),
    yong_stem: getStemByShen(dayGan, yong),
    xi: fs.xi || [],
    ji: fs.ji || [],
    chou: fs.chou || [],
    xian: fs.xian || [],
    favorable_shens: favorableShens,
    unfavorable_shens: unfavorableShens,
    favorable_wuxing: detail.wuxing?.favorable || favorableShens.map(shen => getWuxingByFullShen(dayGan, shen)).filter(Boolean),
    unfavorable_wuxing: detail.wuxing?.unfavorable || unfavorableShens.map(shen => getWuxingByFullShen(dayGan, shen)).filter(Boolean),
    decision_chain: (detail.decision_chain || []).map(item => `${item.layer || ''}：${item.reason || item.text || item.conclusion || ''}`),
    favorable_verdict: detail.favorable_verdict || '',
    strength_basis: detail.strength_basis || '',
    tiaohou_primary: (detail.tiaohou_detail?.primary_gods || []).map(item => `${item.gan}${item.wuxing || ''}${item.shen ? `(${item.shen})` : ''}`),
    wuxing_ratio: detail.wuxing_ratio || {},
    scoring_details: detail.scoring_details || {},
    dimension_breakdown: detail.dimension_breakdown || {},
    ...summarizeImage(detail),
  };
}

function bucketCase(caseDef) {
  const tags = caseDef.gold?.methodTags || [];
  if (caseDef.gold?.image || tags.some(tag => ['特殊形象', '专旺', '两气成象', '强众敌寡', '金白水清', '润下'].includes(tag))) return 'special_pattern';
  if (tags.some(tag => ['调候', '火旺气燥', '春月土虚'].includes(tag))) return 'tiaohou_urgent';
  if (tags.some(tag => ['用印', '化杀生身', '印星通关'].includes(tag))) return 'rescue';
  if (caseDef.scoringScope.includes('strength') && !caseDef.scoringScope.includes('yong')) return 'strength_or_method_only';
  return 'normal_pattern';
}

function summarizeBuckets(rows) {
  const buckets = {};
  for (const row of rows) {
    const bucket = row.bucket || 'other';
    if (!buckets[bucket]) buckets[bucket] = [];
    buckets[bucket].push(row);
  }
  return Object.fromEntries(Object.entries(buckets).map(([bucket, items]) => [
    bucket,
    {
      total: items.length,
      avg_score: items.reduce((sum, row) => sum + row.score, 0) / items.length,
      critical_fail_count: items.filter(row => row.critical).length,
      pass_count: items.filter(row => row.severity === 'pass').length,
    },
  ]));
}

function summarizeClasses(rows) {
  const classes = {};
  for (const row of rows) {
    const caseClass = row.case_class || 'general';
    if (!classes[caseClass]) classes[caseClass] = [];
    classes[caseClass].push(row);
  }
  return Object.fromEntries(Object.entries(classes).map(([caseClass, items]) => [
    caseClass,
    {
      total: items.length,
      avg_score: items.reduce((sum, row) => sum + row.score, 0) / items.length,
      weighted_accuracy: items.reduce((sum, row) => sum + row.score / 100, 0) / items.length,
      critical_fail_count: items.filter(row => row.critical).length,
      pass_count: items.filter(row => row.severity === 'pass').length,
    },
  ]));
}

const rows = [];
const failures = [];
const cache = new Map();

for (const caseDef of CASES) {
  const pillars = caseDef.input.pillars;
  const key = pillars.join(' ');
  let hit = cache.get(key);
  if (!hit) {
    hit = findSolar(pillars, caseDef.input.searchFromYear || DEFAULT_SEARCH_FROM, caseDef.input.searchSpan || DEFAULT_SEARCH_SPAN);
    if (hit) cache.set(key, hit);
  }
  if (!hit) {
    failures.push({ id: caseDef.id, label: caseDef.label, error: 'solar date not found', pillars });
    continue;
  }

  const solar = Solar.fromYmdHms(hit.year, hit.month, hit.day, hit.hour, hit.minute, 0);
  const baZi = solar.getLunar().getEightChar();
  const isMale = genderToMale(caseDef.input.gender);
  const yun = baZi.getYun(isMale ? 1 : 0);
  const detail = buildCompleteBaziDetail({ baZi, yun, isMale, currentYear: 2026 });
  const actual = {
    pillars: key,
    solar: `${hit.year}-${String(hit.month).padStart(2, '0')}-${String(hit.day).padStart(2, '0')} ${String(hit.hour).padStart(2, '0')}:${hit.minute}`,
    ...extractActual(detail, baZi),
  };
  const row = scoreCase({ caseDef, actual });
  row.case_class = caseDef.caseClass || 'general';
  row.bucket = bucketCase(caseDef);
  rows.push(row);
}

const summary = summarizeRows(rows);
const result = {
  generated_at: new Date().toISOString(),
  engine: 'buildCompleteBaziDetail',
  summary,
  bucket_summary: summarizeBuckets(rows),
  class_summary: summarizeClasses(rows),
  failures,
  rows,
};

const outDir = resolve(__dirname, 'results');
mkdirSync(outDir, { recursive: true });
const outFile = process.env.RESULTS_FILE || 'latest.json';
writeFileSync(resolve(outDir, outFile), JSON.stringify(result, null, 2), 'utf8');

console.log(JSON.stringify({
  summary,
  bucket_summary: result.bucket_summary,
  class_summary: result.class_summary,
  failures,
  output: 'eval/baziprofile-accuracy/results/latest.json',
}, null, 2));
