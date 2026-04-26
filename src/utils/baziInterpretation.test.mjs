import test from 'node:test'
import assert from 'node:assert/strict'

import {
  parseLegacyBaziSummary,
  resolveBaziInterpretation
} from './baziInterpretation.mjs'

test('parseLegacyBaziSummary splits old summary into three display sections', () => {
  const parsed = parseLegacyBaziSummary(`【命造格局】：正财格

原局核心：
【格局】正财格
【强弱】身弱

当前大运：
当前大运：壬戌
整体偏吉。

当前流年：
流年丙午
流年动态：合原局未`)

  assert.deepEqual(parsed, {
    yuanju_core: '【格局】正财格\n【强弱】身弱',
    current_dayun: '当前大运：壬戌\n整体偏吉。',
    current_liunian: '流年丙午\n流年动态：合原局未'
  })
})

test('resolveBaziInterpretation prefers llm, falls back to engine, then legacy summary', () => {
  assert.deepEqual(resolveBaziInterpretation({
    calibrated_yuanju_core: 'calibrated-yuanju',
    llm_yuanju_core: 'llm-yuanju',
    engine_yuanju_core: 'engine-yuanju',
    bazi_summary: '原局核心：\nlegacy-yuanju\n\n当前大运：\nlegacy-dayun\n\n当前流年：\nlegacy-liunian'
  }), {
    yuanju_core: 'llm-yuanju',
    current_dayun: 'legacy-dayun',
    current_liunian: 'legacy-liunian'
  })

  assert.deepEqual(resolveBaziInterpretation({
    bazi_detail: {
      engine_yuanju_core: 'engine-yuanju',
      engine_current_dayun: 'engine-dayun',
      engine_current_liunian: 'engine-liunian'
    }
  }), {
    yuanju_core: 'engine-yuanju',
    current_dayun: 'engine-dayun',
    current_liunian: 'engine-liunian'
  })
})
