import assert from 'node:assert/strict'
import {
  buildPasswordResetEmailArgs,
  validatePasswordUpdate
} from './passwordReset.mjs'

assert.deepEqual(buildPasswordResetEmailArgs('https://qimen.example.com/fortune?tab=daily'), {
  redirectTo: 'https://qimen.example.com/reset-password'
})

assert.equal(validatePasswordUpdate('12345', '12345'), '新密码至少需要 6 位')
assert.equal(validatePasswordUpdate('abcdef', 'abcdeg'), '两次输入的密码不一致')
assert.equal(validatePasswordUpdate('abcdef', 'abcdef'), '')
