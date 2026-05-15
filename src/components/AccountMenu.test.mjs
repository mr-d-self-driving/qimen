import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./AccountMenu.vue', import.meta.url), 'utf8')

test('访客账号菜单展示登录和注册入口而不是退出登录', () => {
  assert.match(source, /v-if="!globalState\.currentUser"/)
  assert.match(source, />\s*登录\s*</)
  assert.match(source, />\s*注册\s*</)
  assert.doesNotMatch(source, /globalState\.currentUser \|\| globalState\.isGuest[\s\S]*退出登录/)
})
