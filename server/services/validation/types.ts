export type TrademarkResult = {
  isSafe: boolean
  conflicts: string[]
}

export type BrandRiskLevel = 'low' | 'medium' | 'high'

export type BrandRiskResult = {
  isSafe: boolean
  riskLevel: BrandRiskLevel
  notes?: string
}

export interface ITrademarkProvider {
  readonly name: 'rapidapi-uspto'
  check(text: string, classCode?: string): Promise<TrademarkResult>
}

export interface IBrandRiskProvider {
  readonly name: 'serpapi-google'
  check(text: string): Promise<BrandRiskResult>
}
