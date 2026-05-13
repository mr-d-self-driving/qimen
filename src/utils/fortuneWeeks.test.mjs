import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildWeekItem,
  formatCompactWeekRange,
  listFortuneWeeks,
} from './fortuneWeeks.mjs'

test('current week button only displays 本周', () => {
  const item = buildWeekItem('2026-05-11', '2026-05-11')

  assert.equal(item.displayText, '本周')
  assert.equal(item.subLabel, '')
})

test('non-current week button displays compact MM/dd-MM/dd range', () => {
  assert.equal(formatCompactWeekRange('2026-05-04', '2026-05-10'), '05/04-05/10')

  const item = buildWeekItem('2026-05-04', '2026-05-11')
  assert.equal(item.displayText, '05/04-05/10')
})

test('week selector spans three months back through one year ahead', () => {
  const { weeks, selectedWeekStart } = listFortuneWeeks('2026-05-12')

  assert.equal(selectedWeekStart, '2026-05-11')
  assert.equal(weeks[0].startDate, '2026-02-09')
  assert.equal(weeks.at(-1).startDate, '2027-05-10')
  assert.equal(weeks.some(week => week.displayText === '本周'), true)
})
