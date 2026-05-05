export const QIMEN_ACCURACY_OPTIONS = [
  { value: 'fulfilled', label: '已应验' },
  { value: 'partially_fulfilled', label: '部分应验' },
  { value: 'not_fulfilled', label: '未应验' },
  { value: 'pending', label: '未到时间' }
]

export const QIMEN_DIRECTION_OPTIONS = [
  { value: 'better', label: '比预测好' },
  { value: 'matched', label: '基本符合' },
  { value: 'worse', label: '比预测差' },
  { value: 'pending', label: '暂无结果' }
]

const ACCURACY_VALUES = new Set(QIMEN_ACCURACY_OPTIONS.map(option => option.value))
const DIRECTION_VALUES = new Set(QIMEN_DIRECTION_OPTIONS.map(option => option.value))

export const buildDefaultFeedbackForm = () => ({
  accuracy_status: 'pending',
  actual_direction: 'pending',
  note: ''
})

export const canRecordQimenFeedback = (record, user) => {
  const recordId = String(record?.id || '')
  return Boolean(user?.id && recordId && recordId !== 'guest_qimen_record')
}

export const normalizeQimenFeedbackForm = (form = {}) => {
  const accuracyStatus = String(form.accuracy_status || '').trim()
  const actualDirection = String(form.actual_direction || '').trim()

  if (!ACCURACY_VALUES.has(accuracyStatus)) {
    throw new Error(`Invalid qimen accuracy status: ${accuracyStatus}`)
  }
  if (!DIRECTION_VALUES.has(actualDirection)) {
    throw new Error(`Invalid qimen actual direction: ${actualDirection}`)
  }

  return {
    accuracy_status: accuracyStatus,
    actual_direction: actualDirection,
    note: String(form.note || '').trim().slice(0, 200)
  }
}

export const mergeQimenFeedbackIntoRecords = (records = [], feedbackRows = [], user = { id: 'user' }) => {
  const feedbackByRecordId = new Map(
    feedbackRows
      .filter(row => row?.record_id)
      .map(row => [row.record_id, row])
  )

  return records.map(record => {
    const feedback = feedbackByRecordId.get(record.id) || null
    return {
      ...record,
      feedback,
      hasFeedback: Boolean(feedback),
      canFeedback: canRecordQimenFeedback(record, user)
    }
  })
}
