import { scoreDirection } from './predictionScore.ts'
import { minimumBars } from './predictionScore.ts'
import type { Candle, DataOrigin, IndicatorSettings, InstrumentId, Timeframe } from '../types/market.ts'
import type { HistoryRow } from '../types/prediction.ts'
import { EVALUATION_RULE } from '../utils/copy.ts'

function closeDirection(candle: Candle): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  if (candle.close > candle.open) return 'BULLISH'
  if (candle.close < candle.open) return 'BEARISH'
  return 'NEUTRAL'
}

export function evaluateHistory(input: {
  candles: Candle[]
  settings: IndicatorSettings
  instrument: InstrumentId
  timeframe: Timeframe
  origin: DataOrigin
}): HistoryRow[] {
  const start = minimumBars(input.settings)
  if (input.origin === 'disconnected' || input.candles.length < start + 1) return []

  const rows: HistoryRow[] = []
  for (let i = start - 1; i < input.candles.length - 1; i += 1) {
    const slice = input.candles.slice(0, i + 1)
    const reading = scoreDirection({
      candles: slice,
      settings: input.settings,
      instrument: input.instrument,
      timeframe: input.timeframe,
      origin: input.origin,
      marketOpen: null,
      lastCandleClosed: true,
      updatedAt: slice[slice.length - 1].time * 1000,
    })
    const next = input.candles[i + 1]
    const predicted =
      reading.nextCandleBias === 'BULLISH' || reading.nextCandleBias === 'BEARISH' || reading.nextCandleBias === 'NEUTRAL'
        ? reading.nextCandleBias
        : 'NEUTRAL'
    const actual = closeDirection(next)
    let status: HistoryRow['status'] = 'unscored'
    if (predicted !== 'NEUTRAL' && actual !== 'NEUTRAL') {
      status = predicted === actual ? 'correct' : 'incorrect'
    }
    rows.push({
      id: `${input.instrument}-${input.timeframe}-${slice[slice.length - 1].time}`,
      timestamp: slice[slice.length - 1].time,
      instrument: input.instrument,
      timeframe: input.timeframe,
      predicted,
      actual,
      status,
      origin: input.origin,
      note: EVALUATION_RULE,
    })
  }
  return rows
}
