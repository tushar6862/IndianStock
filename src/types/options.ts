import type { InstrumentId } from './market.ts'

export type OptionSide = 'CALL' | 'PUT'
export type Moneyness = 'ITM' | 'ATM' | 'OTM'

export interface OptionContract {
  instrument: InstrumentId
  expiryLabel: string
  strike: number
  side: OptionSide
  ltp: number
  change: number
  changePercent: number
  volume: number
  oi: number
  oiChange: number
  moneyness: Moneyness
}

export interface OptionChain {
  instrument: InstrumentId
  spot: number | null
  atmStrike: number | null
  expiryLabel: string
  expiries: string[]
  contracts: OptionContract[]
  origin: 'sample' | 'unavailable'
  note: string
}
