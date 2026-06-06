import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./App.vue', import.meta.url), 'utf8')

test('应用启动后展示本期八字 Panel 更新说明且按版本只展示一次', () => {
  assert.match(source, /const APP_RELEASE_VERSION = '1\.1\.2'/)
  assert.match(source, /qimen:update-notice:\$\{APP_RELEASE_VERSION\}/)
  assert.match(source, /function maybeShowUpdateNotice\(user\)/)
  assert.match(source, /if \(!user\) \{\s*showUpdateNotice\.value = false\s*return\s*\}/s)
  assert.match(source, /showUpdateNotice\.value = !window\.localStorage\.getItem\(UPDATE_NOTICE_KEY\)/)
  assert.match(source, /maybeShowUpdateNotice\(session\?\.user \|\| null\)/)
  assert.match(source, /window\.localStorage\.setItem\(UPDATE_NOTICE_KEY,\s*'seen'\)/)
  assert.match(source, /v-if="showUpdateNotice"/)
  assert.match(source, /八字 Panel 全新升级/)
  assert.doesNotMatch(source, /原局 Panel · Demo/)
  assert.match(source, /import BaziStaticPanel from '\.\/components\/BaziStaticPanel\.vue'/)
  assert.match(source, /<BaziStaticPanel/)
  assert.match(source, /:matrix="UPDATE_PANEL_MATRIX"/)
  assert.match(source, /:state-report="UPDATE_PANEL_REPORT"/)
  assert.match(source, /\.update-panel-demo\s*\{[^}]*overflow-y:\s*auto;/s)
  assert.match(source, /update-panel-demo/)
})
