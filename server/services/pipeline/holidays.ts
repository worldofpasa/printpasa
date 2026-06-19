export interface HolidayDefinition {
  id: string
  name: string
  holidayDate: string // MM-DD
  startThinking: string // MM-DD
  endThinking: string // MM-DD
}

// Major United States holidays and planning windows
// Note: endThinking must be at least 15 days before holidayDate to allow creation and listing
export const HOLIDAYS: HolidayDefinition[] = [
  {
    id: 'new-years',
    name: "New Year's Day",
    holidayDate: '01-01',
    startThinking: '11-15',
    endThinking: '12-17',
  },
  {
    id: 'valentines-day',
    name: "Valentine's Day",
    holidayDate: '02-14',
    startThinking: '01-02',
    endThinking: '01-30',
  },
  {
    id: 'st-patricks-day',
    name: "St. Patrick's Day",
    holidayDate: '03-17',
    startThinking: '02-15',
    endThinking: '03-02',
  },
  {
    id: 'employee-appreciation',
    name: 'Employee Appreciation Day',
    holidayDate: '03-06',
    startThinking: '01-15',
    endThinking: '02-19',
  },
  {
    id: 'dental-assistants-week',
    name: 'Dental Assistants Week',
    holidayDate: '03-02',
    startThinking: '01-15',
    endThinking: '02-15',
  },
  {
    id: 'april-fools',
    name: "April Fool's Day",
    holidayDate: '04-01',
    startThinking: '03-10',
    endThinking: '03-17',
  },
  {
    id: 'easter',
    name: 'Easter',
    holidayDate: '04-12', // Standard approximation for planning
    startThinking: '03-01',
    endThinking: '03-28',
  },
  {
    id: 'star-wars-day',
    name: 'Star Wars Day',
    holidayDate: '05-04',
    startThinking: '03-20',
    endThinking: '04-19',
  },
  {
    id: 'teacher-appreciation',
    name: 'Teacher Appreciation Week',
    holidayDate: '05-04',
    startThinking: '03-20',
    endThinking: '04-19',
  },
  {
    id: 'nurses-week',
    name: 'Nurses Week',
    holidayDate: '05-06',
    startThinking: '03-20',
    endThinking: '04-21',
  },
  {
    id: 'cinco-de-mayo',
    name: 'Cinco de Mayo',
    holidayDate: '05-05',
    startThinking: '04-02',
    endThinking: '04-20',
  },
  {
    id: 'mothers-day',
    name: "Mother's Day",
    holidayDate: '05-10',
    startThinking: '04-10',
    endThinking: '04-25',
  },
  {
    id: 'pet-appreciation',
    name: 'Pet Appreciation Week',
    holidayDate: '06-04',
    startThinking: '04-20',
    endThinking: '05-20',
  },
  {
    id: 'fathers-day',
    name: "Father's Day",
    holidayDate: '06-21',
    startThinking: '05-11',
    endThinking: '06-06',
  },
  {
    id: 'independence-day',
    name: '4th of July',
    holidayDate: '07-04',
    startThinking: '05-25',
    endThinking: '06-19',
  },
  {
    id: 'back-to-school',
    name: 'Back to School',
    holidayDate: '09-01',
    startThinking: '07-05',
    endThinking: '08-17',
  },
  {
    id: 'halloween',
    name: 'Halloween',
    holidayDate: '10-31',
    startThinking: '09-01',
    endThinking: '10-16',
  },
  {
    id: 'thanksgiving',
    name: 'Thanksgiving',
    holidayDate: '11-26',
    startThinking: '10-15',
    endThinking: '11-11',
  },
  {
    id: 'christmas',
    name: 'Christmas',
    holidayDate: '12-25',
    startThinking: '11-01',
    endThinking: '12-10',
  },
]

/**
 * Returns the list of holidays active for the given date (based on MM-DD thinking window).
 * Correctly handles year wrap-around (e.g. New Year planning Nov 15 - Jan 1).
 */
export function getActiveHolidays(date: Date = new Date()): HolidayDefinition[] {
  const year = date.getFullYear()
  const active: HolidayDefinition[] = []

  for (const h of HOLIDAYS) {
    const [startM, startD] = h.startThinking.split('-').map(Number)
    const [endM, endD] = h.endThinking.split('-').map(Number)

    let startDate = new Date(year, startM! - 1, startD)
    let endDate = new Date(year, endM! - 1, endD)

    if (startDate > endDate) {
      // Wrap-around case (e.g., Nov 15 to Jan 1)
      // Check if date falls in [start, Dec 31 of current year] OR [Jan 1 of current year, end]
      const startDatePrev = new Date(year - 1, startM! - 1, startD)
      if (date >= startDatePrev && date <= endDate) {
        active.push(h)
        continue
      }
      const endDateNext = new Date(year + 1, endM! - 1, endD)
      if (date >= startDate && date <= endDateNext) {
        active.push(h)
        continue
      }
    } else {
      if (date >= startDate && date <= endDate) {
        active.push(h)
      }
    }
  }

  return active
}
