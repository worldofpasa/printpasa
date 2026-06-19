export interface Theme {
  id: string
  projectId: string
  title: string
  description: string | null
  targetDemographic: string | null
  contextNotes: string | null
  trendScore: number | null
  isValidated: boolean
  validationNotes: string | null
  patentSafe: boolean | null
  copyrightSafe: boolean | null
  trademarkSafe: boolean | null
  isWinner: boolean
  isSelected: boolean
  sortOrder: number
  createdAt: Date
}
