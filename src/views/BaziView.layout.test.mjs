import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./BaziView.vue', import.meta.url), 'utf8')

test('流年和流月使用强制上下结构类名', () => {
  const matches = source.match(/class="item-body stacked-ganzhi"/g) || []
  assert.equal(matches.length, 3)
})

test('stacked-ganzhi 样式强制纵向排列', () => {
  assert.match(source, /\.stacked-ganzhi\s*\{[^}]*flex-direction:\s*column;/s)
})
