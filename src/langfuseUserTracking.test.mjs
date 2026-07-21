import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../worker/src/index.js', import.meta.url), 'utf8')
const wranglerConfig = readFileSync(new URL('../worker/wrangler.toml', import.meta.url), 'utf8')

test('Langfuse sends a userId on the trace and generation events', () => {
  assert.match(source, /async function reportToLangfuse\(\{[^}]*userId/)
  assert.match(source, /type: 'trace-create',[\s\S]{0,500}userId: langfuseUserId/)
  assert.match(source, /type: 'generation-create',[\s\S]{0,500}userId: langfuseUserId/)
})

test('authenticated and guest AI flows pass their stable user ID to Langfuse', () => {
  assert.match(source, /bazi-question-answer'[\s\S]{0,320}userId: user\.id/)
  assert.match(source, /fortune-daily-interpretation'[\s\S]{0,180}userId: user\.id/)
  assert.match(source, /bazi-profile-sections'[\s\S]{0,180}userId: user\.id/)
  assert.match(source, /qimen-answer'[\s\S]{0,360}userId: userId \|\| guestId/)
  assert.match(source, /qimen-followup-patch'[\s\S]{0,240}userId: userId \|\| guestId/)
})

test('Langfuse events distinguish production from preview', () => {
  assert.match(source, /environment: langfuseEnvironment/)
  assert.match(wranglerConfig, /\[vars\][\s\S]*LANGFUSE_ENVIRONMENT = "production"/)
  assert.match(wranglerConfig, /\[env\.preview\.vars\][\s\S]*LANGFUSE_ENVIRONMENT = "preview"/)
})
