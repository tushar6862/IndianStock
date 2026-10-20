export type InstrumentId = 'NIFTY50' | 'SENSEX'

export type Timeframe = '1m' | '3m' | '5m' | '15m'

export type DataOrigin = 'disconnected' | 'sample' | 'file' | 'fyers'

export interface LiveQuote {
  price: number
  change: number
  changePercent: number
  time: number
}

export type Freshness = 'live' | 'delayed' | 'simulated' | 'historical' | 'unavailable'

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  /** Volume of a traded instrument. Spot index prints should omit this. */
  volume?: number
}

export interface InstrumentMeta {
  id: InstrumentId
  name: string
  symbol: string
  exchange: string
  strikeStep: number
}

export const INSTRUMENTS: Record<InstrumentId, InstrumentMeta> = {
  NIFTY50: {
    id: 'NIFTY50',
    name: 'NIFTY 50',
    symbol: 'NIFTY',
    exchange: 'NSE',
    strikeStep: 50,
  },
  SENSEX: {
    id: 'SENSEX',
    name: 'SENSEX',
    symbol: 'SENSEX',
    exchange: 'BSE',
    strikeStep: 100,
  },
}

export const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '1m': 60,
  '3m': 180,
  '5m': 300,
  '15m': 900,
}

export const TIMEFRAME_LABEL: Record<Timeframe, string> = {
  '1m': '1 minute',
  '3m': '3 minutes',
  '5m': '5 minutes',
  '15m': '15 minutes',
}

export interface IndicatorSettings {
  emaFast: number
  emaSlow: number
  rsiPeriod: number
  supertrendPeriod: number
  supertrendMultiplier: number
}

export const DEFAULT_INDICATOR_SETTINGS: IndicatorSettings = {
  emaFast: 9,
  emaSlow: 21,
  rsiPeriod: 14,
  supertrendPeriod: 10,
  supertrendMultiplier: 3,
}

export interface IndicatorVisibility {
  vwap: boolean
  emaFast: boolean
  emaSlow: boolean
  supertrend: boolean
  volume: boolean
}

export const DEFAULT_VISIBILITY: IndicatorVisibility = {
  vwap: true,
  emaFast: true,
  emaSlow: true,
  supertrend: true,
  volume: true,
}

export interface CandleStats {
  body: number
  range: number
  bodyPercent: number
  upperWick: number
  lowerWick: number
  direction: 'bullish' | 'bearish' | 'doji'
}

export interface SwingLevels {
  support: number | null
  resistance: number | null
  swingHighs: number[]
  swingLows: number[]
}

export interface SupertrendValue {
  value: number | null
  direction: 'bullish' | 'bearish' | null
}
