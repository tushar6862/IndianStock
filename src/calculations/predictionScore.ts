import { candleStats, swingLevels } from './candleStats.ts'
import { ema } from './ema.ts'
import { rsi } from './rsi.ts'
import { supertrend } from './supertrend.ts'
import { sessionVwap } from './vwap.ts'
import type { Candle, DataOrigin, IndicatorSettings, InstrumentId, Timeframe } from '../types/market.ts'
import type { Bias, Contribution, DirectionReading, NextCandleBias, SignalStatus } from '../types/prediction.ts'
import { ESTIMATE_LABEL } from '../utils/copy.ts'
import { lastNumber } from '../utils/format.ts'

export function minimumBars(settings: IndicatorSettings): number {
  return Math.max(settings.emaSlow, settings.rsiPeriod + 1, settings.supertrendPeriod + 1)
}

export function heuristicMoveEstimates(score: number): { up: number; down: number } {
  const clamped = Math.max(-6, Math.min(6, score))
  const up = Math.min(74, Math.max(26, Math.round(50 + clamped * 4)))
  return { up, down: 100 - up }
}

export function statusLabel(status: SignalStatus): string {
  switch (status) {
    case 'INSUFFICIENT_DATA':
      return 'INSUFFICIENT DATA'
    case 'WAIT':
      return 'WAIT'
    case 'WAIT_FOR_CONFIRMATION':
      return 'WAIT FOR CONFIRMATION'
    case 'NO_CLEAR_EDGE':
      return 'NO CLEAR EDGE'
    case 'WAIT_FOR_CANDLE_CLOSE':
      return 'WAIT FOR CANDLE CLOSE'
    case 'CLOSED_BARS':
      return 'BASED ON CLOSED CANDLES'
    default:
      return 'WAIT'
  }
}

interface Classified {
  bias: Bias
  nextCandleBias: NextCandleBias
  status: SignalStatus
  showEstimate: boolean
  trendConfirmed: boolean
}

export function classifyScore(input: {
  score: number
  positiveCount: number
  negativeCount: number
  enoughData: boolean
  marketOpen: boolean | null
  lastCandleClosed: boolean
  aligned: number
}): Classified {
  if (!input.enoughData) {
    return {
      bias: 'INSUFFICIENT_DATA',
      nextCandleBias: 'INSUFFICIENT_DATA',
      status: 'INSUFFICIENT_DATA',
      showEstimate: false,
      trendConfirmed: false,
    }
  }
  if (input.marketOpen === false) {
    return {
      bias: 'SIDEWAYS',
      nextCandleBias: 'NEUTRAL',
      status: 'WAIT',
      showEstimate: false,
      trendConfirmed: false,
    }
  }
  const conflicting = input.positiveCount >= 2 && input.negativeCount >= 2
  if (conflicting) {
    return {
      bias: 'SIDEWAYS',
      nextCandleBias: 'NEUTRAL',
      status: 'WAIT_FOR_CONFIRMATION',
      showEstimate: false,
      trendConfirmed: false,
    }
  }
  if (input.score >= 3) {
    return directional('BULLISH', input.lastCandleClosed, input.aligned)
  }
  if (input.score <= -3) {
    return directional('BEARISH', input.lastCandleClosed, input.aligned)
  }
  return {
    bias: 'SIDEWAYS',
    nextCandleBias: 'NEUTRAL',
    status: 'NO_CLEAR_EDGE',
    showEstimate: false,
    trendConfirmed: false,
  }
}

function directional(bias: 'BULLISH' | 'BEARISH', lastCandleClosed: boolean, aligned: number): Classified {
  return {
    bias,
    nextCandleBias: bias,
    status: lastCandleClosed ? 'CLOSED_BARS' : 'WAIT_FOR_CANDLE_CLOSE',
    showEstimate: true,
    trendConfirmed: aligned >= 3,
  }
}

function point(condition: boolean, positive: string, negative: string): { score: -1 | 0 | 1; detail: string } {
  if (condition) return { score: 1, detail: positive }
  return { score: -1, detail: negative }
}

export function scoreDirection(input: {
  candles: Candle[]
  settings: IndicatorSettings
  instrument: InstrumentId
  timeframe: Timeframe
  origin: DataOrigin
  marketOpen?: boolean | null
  lastCandleClosed?: boolean
  updatedAt?: number
  snapshot?: {
    emaFast: number | null
    emaSlow: number | null
    rsi: number | null
    vwap: number | null
    supertrend: 'bullish' | 'bearish' | null
    vwapDetail?: string
  }
}): DirectionReading {
  const marketOpen = input.marketOpen ?? null
  const lastCandleClosed = input.lastCandleClosed ?? true
  const closes = input.candles.map((candle) => candle.close)
  const fast = ema(closes, input.settings.emaFast)
  const slow = ema(closes, input.settings.emaSlow)
  const rsiValues = rsi(closes, input.settings.rsiPeriod)
  const trend = supertrend(input.candles, input.settings.supertrendPeriod, input.settings.supertrendMultiplier)
  const vwap = sessionVwap(input.candles)
  const emaFast = input.snapshot ? input.snapshot.emaFast : lastNumber(fast)
  const emaSlow = input.snapshot ? input.snapshot.emaSlow : lastNumber(slow)
  const rsiValue = input.snapshot ? input.snapshot.rsi : lastNumber(rsiValues)
  const lastTrend = [...trend].reverse().find((item) => item.direction != null) ?? null
  const supertrendDirection = input.snapshot ? input.snapshot.supertrend : lastTrend?.direction ?? null
  const vwapValue = input.snapshot ? input.snapshot.vwap : lastNumber(vwap.values)
  const vwapMissingDetail = input.snapshot?.vwapDetail ?? vwap.reason
  const last = input.candles[input.candles.length - 1]
  const stats = candleStats(last)
  const swings = swingLevels(input.candles)
  const enoughData =
    input.candles.length >= minimumBars(input.settings) &&
    emaFast != null &&
    emaSlow != null &&
    rsiValue != null &&
    supertrendDirection != null &&
    stats != null

  const contributions: Contribution[] = []

  if (vwapValue == null) {
    contributions.push({
      id: 'vwap',
      label: 'VWAP',
      score: 0,
      detail: vwapMissingDetail,
    })
  } else {
    const gap = (last.close - vwapValue) / vwapValue
    let score: -1 | 0 | 1 = 0
    let detail = 'Price is close to VWAP'
    if (gap > 0.0005) {
      score = 1
      detail = 'Price above VWAP'
    } else if (gap < -0.0005) {
      score = -1
      detail = 'Price below VWAP'
    }
    contributions.push({ id: 'vwap', label: 'VWAP', score, detail })
  }

  if (emaFast != null && emaSlow != null) {
    const compared = point(emaFast > emaSlow, 'EMA 9 above EMA 21', 'EMA 9 below EMA 21')
    const score: -1 | 0 | 1 = emaFast === emaSlow ? 0 : compared.score
    contributions.push({
      id: 'ema',
      label: 'EMA',
      score,
      detail: emaFast === emaSlow ? 'EMA 9 equals EMA 21' : compared.detail,
    })
  }

  if (rsiValue != null) {
    let score: -1 | 0 | 1 = 0
    let detail = 'RSI near 50 — no momentum edge'
    if (rsiValue >= 55) {
      score = 1
      detail = rsiValue > 70 ? 'RSI above 50, and stretched above 70' : 'RSI above 50'
    } else if (rsiValue <= 45) {
      score = -1
      detail = rsiValue < 30 ? 'RSI below 50, and stretched below 30' : 'RSI below 50'
    }
    contributions.push({ id: 'rsi', label: 'RSI', score, detail })
  }

  if (supertrendDirection) {
    contributions.push({
      id: 'supertrend',
      label: 'Supertrend',
      score: supertrendDirection === 'bullish' ? 1 : -1,
      detail: supertrendDirection === 'bullish' ? 'Supertrend bullish' : 'Supertrend bearish',
    })
  }

  if (stats) {
    let score: -1 | 0 | 1 = 0
    let detail = 'Candle body does not show a clear push'
    if (stats.upperWick > stats.body && stats.upperWick > stats.lowerWick && stats.upperWick > 0) {
      score = -1
      detail = 'Upper wick shows selling pressure'
    } else if (stats.lowerWick > stats.body && stats.lowerWick > stats.upperWick && stats.lowerWick > 0) {
      score = 1
      detail = 'Lower wick shows buying response'
    } else if (stats.direction === 'bullish' && stats.bodyPercent >= 55) {
      score = 1
      detail = 'Recent candle has a strong bullish body'
    } else if (stats.direction === 'bearish' && stats.bodyPercent >= 55) {
      score = -1
      detail = 'Recent candle has a strong bearish body'
    }
    contributions.push({ id: 'candle', label: 'Candle structure', score, detail })
  }

  if (last && swings.resistance != null && last.close > swings.resistance) {
    const previous = input.candles[input.candles.length - 2]
    const confirmed = previous != null && previous.close > swings.resistance
    contributions.push({
      id: 'swing',
      label: 'Swing break',
      score: 1,
      detail: confirmed ? 'Close above a recent swing high, confirmed by the prior close' : 'Close above a recent swing high',
    })
  } else if (last && swings.support != null && last.close < swings.support) {
    const previous = input.candles[input.candles.length - 2]
    const confirmed = previous != null && previous.close < swings.support
    contributions.push({
      id: 'swing',
      label: 'Swing break',
      score: -1,
      detail: confirmed ? 'Close below a recent swing low, confirmed by the prior close' : 'Close below a recent swing low',
    })
  } else {
    contributions.push({
      id: 'swing',
      label: 'Swing break',
      score: 0,
      detail: 'Price is inside the recent swing range',
    })
  }

  const score = contributions.reduce((sum, item) => sum + item.score, 0)
  const positiveCount = contributions.filter((item) => item.score > 0).length
  const negativeCount = contributions.filter((item) => item.score < 0).length
  const bullishAligned = contributions.filter((item) => item.score > 0).length
  const bearishAligned = contributions.filter((item) => item.score < 0).length
  const classified = classifyScore({
    score,
    positiveCount,
    negativeCount,
    enoughData,
    marketOpen,
    lastCandleClosed,
    aligned: score >= 3 ? bullishAligned : bearishAligned,
  })

  const estimates = classified.showEstimate ? heuristicMoveEstimates(score) : null
  const reasons = contributions.filter((item) => item.score !== 0).map((item) => item.detail)
  if (reasons.length === 0) reasons.push('No indicator shows a clear edge.')
  if (vwapValue == null) reasons.push('VWAP was left out of the score because volume is missing.')

  return {
    instrument: input.instrument,
    timeframe: input.timeframe,
    bias: classified.bias,
    nextCandleBias: classified.nextCandleBias,
    upwardEstimate: estimates?.up ?? null,
    downwardEstimate: estimates?.down ?? null,
    estimateLabel: ESTIMATE_LABEL,
    signalStrength: classified.showEstimate ? Math.round((Math.abs(score) / 6) * 100) : null,
    trendConfirmed: classified.trendConfirmed,
    status: classified.status,
    statusLabel: statusLabel(classified.status),
    reasons,
    contributions,
    updatedAt: input.updatedAt ?? Date.now(),
    dataOrigin: input.origin,
    candleTime: last?.time ?? null,
  }
}
