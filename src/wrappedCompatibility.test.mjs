import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const wrappedHtml = readFileSync(new URL('../public/wrapped.html', import.meta.url), 'utf8')

test('wrapped report uses dimension-specific analysis copy instead of day-stem copy for every DIM', () => {
  assert.match(wrappedHtml, /const DIM_ANALYSIS_CONFIG=/)
  assert.match(wrappedHtml, /dim1:\{[\s\S]*两人命盘的日干底层反应/)
  assert.match(wrappedHtml, /dim2:\{[\s\S]*五神互补/)
  assert.match(wrappedHtml, /dim3:\{[\s\S]*忌神激活/)
  assert.match(wrappedHtml, /dim4:\{[\s\S]*贵人神煞/)
  assert.match(wrappedHtml, /dim5:\{[\s\S]*日支冲害/)
})

test('wrapped DIM analysis pages render demo-style visual blocks, not placeholder explanation cards', () => {
  assert.match(wrappedHtml, /function buildComplementAnalysis/)
  assert.match(wrappedHtml, /function buildShenshaAnalysis/)
  assert.match(wrappedHtml, /function buildDrainAnalysis/)
  assert.match(wrappedHtml, /调候互补 \+ 贵人神煞/)
  assert.match(wrappedHtml, /月支社交宫/)
  assert.match(wrappedHtml, /L5 = 月支/)
  assert.match(wrappedHtml, /天乙 \+0/)
  assert.match(wrappedHtml, /comp-block/)
  assert.match(wrappedHtml, /comp-bz-row/)
  assert.match(wrappedHtml, /comp-match-badge|comp-bless-badge|comp-clash-badge/)
  assert.doesNotMatch(wrappedHtml, /测试 的成长补给/)
  assert.doesNotMatch(wrappedHtml, /yx 的成长补给/)
  assert.doesNotMatch(wrappedHtml, /这里对应 Demo/)
})

test('wrapped DIM source labels match their actual score inputs', () => {
  assert.match(wrappedHtml, /function l5NobleScore\(A,B\)/)
  assert.match(wrappedHtml, /const d4=clamp\(l4\*DW\.d4\.s1\+l5\*DW\.d4\.s3\)/)
  assert.match(wrappedHtml, /d4:\{s1:Math\.round\(l4\),s3:Math\.round\(l5\)\}/)
  assert.match(wrappedHtml, /劫财财星<\/span><span class="si-val" id="d5-lv1"/)
  assert.match(wrappedHtml, /日支冲害<\/span><span class="si-val" id="d5-lv3"/)
  assert.doesNotMatch(wrappedHtml, /月支对位<\/span><span class="si-val" id="d5-lv1"/)
  assert.doesNotMatch(wrappedHtml, /神煞互见<\/span><span class="si-val" id="d5-lv3"/)
})

test('wrapped report DIM scan targets match compatibility PRD sources', () => {
  assert.match(
    wrappedHtml,
    /buildAnalysisAndScan\('dim3','d3',\['劫财','七杀','比肩'\]/
  )
  assert.match(
    wrappedHtml,
    /buildAnalysisAndScan\('dim5','d5',\['劫财','正财','偏财'\]/
  )
})

test('wrapped report DIM5 scoring uses money flow plus day-branch conflict', () => {
  assert.match(wrappedHtml, /function l3MoneyScore\(A,B\)/)
  assert.match(wrappedHtml, /function dayZhiMoneyScore\(A,B\)/)
  assert.match(wrappedHtml, /const d5=clamp\(l3money\*DW\.d5\.s1\+l2day\*DW\.d5\.s3\)/)
  assert.doesNotMatch(wrappedHtml, /const d5=clamp\(l2y\*DW\.d5\.s1\+l5m\*DW\.d5\.s3\)/)
})

test('wrapped birthplace dropdown shows enough county-level matches', () => {
  assert.match(wrappedHtml, /const CITY_RESULT_LIMIT=32/)
  assert.match(wrappedHtml, /const matches = searchCities\(input\.value, CITY_RESULT_LIMIT\)/)
  assert.doesNotMatch(wrappedHtml, /searchCities\(input\.value, 8\)/)
  assert.doesNotMatch(wrappedHtml, /CITY_DISTRICT_FALLBACKS/)
  assert.doesNotMatch(wrappedHtml, /fallbackDistrictPlace/)
  assert.match(wrappedHtml, /api\.searchBirthplaces\(query, limit\)/)
})
