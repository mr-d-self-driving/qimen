import assert from 'node:assert/strict'
import {
  buildDefaultFeedbackForm,
  canRecordQimenFeedback,
  mergeQimenFeedbackIntoRecords,
  normalizeQimenFeedbackForm
} from './qimenFeedback.mjs'

const records = [
  { id: 'record-1', question: '项目能不能推进？' },
  { id: 'record-2', question: '这笔钱能到账吗？' },
  { id: 'guest_qimen_record', question: '访客问题' }
]

const feedbackRows = [
  {
    record_id: 'record-2',
    accuracy_status: 'fulfilled',
    actual_direction: 'matched',
    note: '当天晚些时候有回复'
  }
]

const merged = mergeQimenFeedbackIntoRecords(records, feedbackRows)

assert.equal(merged[0].hasFeedback, false)
assert.equal(merged[0].feedback, null)
assert.equal(merged[1].hasFeedback, true)
assert.equal(merged[1].feedback.note, '当天晚些时候有回复')
assert.equal(merged[2].canFeedback, false)

assert.equal(canRecordQimenFeedback({ id: 'record-1' }, { id: 'user-1' }), true)
assert.equal(canRecordQimenFeedback({ id: 'guest_qimen_record' }, { id: 'user-1' }), false)
assert.equal(canRecordQimenFeedback({ id: 'record-1' }, null), false)

const defaultForm = buildDefaultFeedbackForm()
assert.equal(defaultForm.accuracy_status, 'pending')
assert.equal(defaultForm.actual_direction, 'pending')
assert.equal(defaultForm.note, '')

const normalized = normalizeQimenFeedbackForm({
  accuracy_status: 'fulfilled',
  actual_direction: 'matched',
  note: '  真实反馈  '
})
assert.deepEqual(normalized, {
  accuracy_status: 'fulfilled',
  actual_direction: 'matched',
  note: '真实反馈'
})

assert.throws(
  () => normalizeQimenFeedbackForm({ accuracy_status: 'unknown', actual_direction: 'matched' }),
  /Invalid qimen accuracy status/
)
