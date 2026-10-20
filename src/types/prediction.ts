import type { DataOrigin, InstrumentId, Timeframe } from './market.ts'

export type Bias = 'BULLISH' | 'BEARISH' | 'SIDEWAYS' | 'INSUFFICIENT_DATA'

export type NextCandleBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'INSUFFICIENT_DATA'

export type SignalStatus =
  | 'INSUFFICIENT_DATA'
  | 'WAIT'
  | 'WAIT_FOR_CONFIRMATION'
  | 'NO_CLEAR_EDGE'
  | 'WAIT_FOR_CANDLE_CLOSE'
  | 'CLOSED_BARS'

export interface Contribution {
  id: string
  label: string
  score: -1 | 0 | 1
  detail: string
}

export interface DirectionReading {
  instrument: InstrumentId
  timeframe: Timeframe
  bias: Bias
  nextCandleBias: NextCandleBias
  upwardEstimate: number | null
  downwardEstimate: number | null
  estimateLabel: string
  signalStrength: number | null
  trendConfirmed: boolean
  status: SignalStatus
  statusLabel: string
  reasons: string[]
  contributions: Contribution[]
  updatedAt: number
  dataOrigin: DataOrigin
  candleTime: number | null
}

export type EvaluationStatus = 'correct' | 'incorrect' | 'pending' | 'unscored'

export interface HistoryRow {
  id: string
  timestamp: number
  instrument: InstrumentId
  timeframe: Timeframe
  predicted: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  actual: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null
  status: EvaluationStatus
  origin: DataOrigin
  note: string
}

export interface ChecklistItem {
  label: string
  met: boolean
}

export interface TradeSetup {
  active: boolean
  side: 'bullish' | 'bearish' | null
  headline: string
  entry: number | null
  stop: number | null
  target1: number | null
  target2: number | null
  riskReward: number | null
  invalidation: number | null
  checklist: ChecklistItem[]
  disclaimer: string
}
