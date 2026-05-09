import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./EngineeringView.vue', import.meta.url), 'utf8')

test('首屏不展示系统架构和功能模块跳转按钮', () => {
  assert.doesNotMatch(source, /查看系统架构/)
  assert.doesNotMatch(source, /了解功能模块/)
})

test('首屏右侧盘面包含可见的循环动效', () => {
  assert.match(source, /\.igrid span\s*\{/)
  assert.match(source, /animation:\s*palace-pulse/)
  assert.match(source, /@keyframes palace-pulse/)
})
