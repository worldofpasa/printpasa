import assert from 'node:assert/strict'
import { getActiveHolidays } from '../server/services/pipeline/holidays'

// 1. Test Jan 15 (Start of Employee Appreciation & Dental Assistants Week)
const jan15 = new Date(2026, 0, 15) // Month is 0-indexed (Jan = 0)
const jan15Holidays = getActiveHolidays(jan15).map(h => h.id)
console.log('Jan 15 active holidays:', jan15Holidays)
assert.ok(jan15Holidays.includes('employee-appreciation'))
assert.ok(jan15Holidays.includes('dental-assistants-week'))

// 2. Test April 10 (Within Star Wars Day, Teacher Appreciation, Nurses Week, Mother's Day)
const apr10 = new Date(2026, 3, 10) // April = 3
const apr10Holidays = getActiveHolidays(apr10).map(h => h.id)
console.log('Apr 10 active holidays:', apr10Holidays)
assert.ok(apr10Holidays.includes('star-wars-day'))
assert.ok(apr10Holidays.includes('teacher-appreciation'))
assert.ok(apr10Holidays.includes('nurses-week'))
assert.ok(apr10Holidays.includes('mothers-day'))

// 3. Test May 4 (Holiday date for Star Wars / Teacher Appreciation)
// Since planning window must end 15 days before (i.e. Apr 19), it should NOT be active on May 4.
const may4 = new Date(2026, 4, 4) // May = 4
const may4Holidays = getActiveHolidays(may4).map(h => h.id)
console.log('May 4 active holidays:', may4Holidays)
assert.ok(!may4Holidays.includes('star-wars-day'))
assert.ok(!may4Holidays.includes('teacher-appreciation'))

// 4. Test May 10 (Pet Appreciation should be active, but not Father's Day yet)
const may10 = new Date(2026, 4, 10) // May = 4
const may10Holidays = getActiveHolidays(may10).map(h => h.id)
console.log('May 10 active holidays:', may10Holidays)
assert.ok(may10Holidays.includes('pet-appreciation'))
assert.ok(!may10Holidays.includes('fathers-day'))

// 5. Test June 1 (Should match Father's Day, but Pet Appreciation should be finished)
const jun1 = new Date(2026, 5, 1) // June = 5
const jun1Holidays = getActiveHolidays(jun1).map(h => h.id)
console.log('Jun 1 active holidays:', jun1Holidays)
assert.ok(!jun1Holidays.includes('pet-appreciation'))
assert.ok(jun1Holidays.includes('fathers-day'))

console.log('All holiday calendar window test cases passed successfully!')
