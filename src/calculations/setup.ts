import type { Candle, SupertrendValue } from '../types/market.ts'
import type { DirectionReading, TradeSetup } from '../types/prediction.ts'
import { ANALYTICAL_DISCLAIMER } from '../utils/copy.ts'
import type { SwingLevels } from '../types/market.ts'

function emptySetup(checklist: TradeSetup['checklist'], headline = 'NO TRADE — WAIT FOR CONFIRMATION'): TradeSetup {
  return {
    active: false,
    side: null,
    headline,
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskReward: null,
    invalidation: null,
    checklist,
    disclaimer: ANALYTICAL_DISCLAIMER,
  }
}

export function buildSetup(input: {
  reading: DirectionReading
  last: Candle | null
  vwap: number | null
  emaFast: number | null
  emaSlow: number | null
  rsi: number | null
  supertrend: SupertrendValue | null
  swings: SwingLevels
}): TradeSetup {
  const bullish = input.reading.bias === 'BULLISH'
  const bearish = input.reading.bias === 'BEARISH'
  const side = bullish ? 'bullish' : bearish ? 'bearish' : null
  const checklist = [
    {
      label: side === 'bearish' ? 'Price below VWAP' : 'Price above VWAP',
      met:
        input.last != null &&
        input.vwap != null &&
        (side === 'bearish' ? input.last.close < input.vwap : input.last.close > input.vwap),
    },
    {
      label: side === 'bearish' ? 'EMA 9 below EMA 21' : 'EMA 9 above EMA 21',
      met:
        input.emaFast != null &&
        input.emaSlow != null &&
        (side === 'bearish' ? input.emaFast < input.emaSlow : input.emaFast > input.emaSlow),
    },
    {
      label: side === 'bearish' ? 'RSI below 50' : 'RSI above 50',
      met: input.rsi != null && (side === 'bearish' ? input.rsi < 50 : input.rsi > 50),
    },
    {
      label: side === 'bearish' ? 'Supertrend bearish' : 'Supertrend bullish',
      met: input.supertrend?.direction === (side === 'bearish' ? 'bearish' : 'bullish'),
    },
    {
      label: 'Signal is not conflicting or incomplete',
      met: input.reading.status === 'CLOSED_BARS' || input.reading.status === 'WAIT_FOR_CANDLE_CLOSE',
    },
  ]

  if (!side || !input.last || checklist.some((item) => !item.met)) {
    return emptySetup(checklist)
  }

  const entry = input.last.close
  const structure = side === 'bullish' ? input.swings.support : input.swings.resistance
  const band = input.supertrend?.value ?? null
  const candidates = [structure, band].filter((value): value is number => value != null && Number.isFinite(value))
  const stop =
    side === 'bullish'
      ? candidates.filter((value) => value < entry).sort((a, b) => b - a)[0]
      : candidates.filter((value) => value > entry).sort((a, b) => a - b)[0]

  if (stop == null) return emptySetup(checklist, 'NO TRADE — WAIT FOR CONFIRMATION')

  const risk = Math.abs(entry - stop)
  if (!(risk > 0)) return emptySetup(checklist)
  const target1 = side === 'bullish' ? entry + risk : entry - risk
  const target2 = side === 'bullish' ? entry + risk * 2 : entry - risk * 2

  return {
    active: true,
    side,
    headline: side === 'bullish' ? 'Potential bullish setup' : 'Potential bearish setup',
    entry,
    stop,
    target1,
    target2,
    riskReward: 2,
    invalidation: stop,
    checklist,
    disclaimer: ANALYTICAL_DISCLAIMER,
  }
}
