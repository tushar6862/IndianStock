import type { Candle, CandleStats, SwingLevels } from '../types/market.ts'

export function candleStats(candle: Candle | null | undefined): CandleStats | null {
  if (!candle) return null
  const { open, high, low, close } = candle
  if (![open, high, low, close].every(Number.isFinite) || high < low) return null
  const range = high - low
  const body = Math.abs(close - open)
  const upperWick = high - Math.max(open, close)
  const lowerWick = Math.min(open, close) - low
  let direction: CandleStats['direction'] = 'doji'
  if (close > open) direction = 'bullish'
  else if (close < open) direction = 'bearish'
  return {
    body,
    range,
    bodyPercent: range > 0 ? (body / range) * 100 : 0,
    upperWick,
    lowerWick,
    direction,
  }
}

/** Confirmed swing highs and lows. The latest bars inside the wing are not treated as swings. */
export function swingLevels(candles: Candle[], wing = 2): SwingLevels {
  const swingHighs: number[] = []
  const swingLows: number[] = []
  if (wing < 1 || candles.length < wing * 2 + 1) {
    return { support: null, resistance: null, swingHighs, swingLows }
  }

  for (let i = wing; i < candles.length - wing; i += 1) {
    let isHigh = true
    let isLow = true
    for (let k = 1; k <= wing; k += 1) {
      if (candles[i].high <= candles[i - k].high || candles[i].high <= candles[i + k].high) isHigh = false
      if (candles[i].low >= candles[i - k].low || candles[i].low >= candles[i + k].low) isLow = false
    }
    if (isHigh) swingHighs.push(candles[i].high)
    if (isLow) swingLows.push(candles[i].low)
  }

  return {
    swingHighs,
    swingLows,
    resistance: swingHighs.length > 0 ? swingHighs[swingHighs.length - 1] : null,
    support: swingLows.length > 0 ? swingLows[swingLows.length - 1] : null,
  }
}

export function isValidCandle(candle: Candle): boolean {
  const { open, high, low, close, time } = candle
  if (![time, open, high, low, close].every(Number.isFinite)) return false
  if (high < low) return false
  if (high < Math.max(open, close) || low > Math.min(open, close)) return false
  if (candle.volume != null && (!Number.isFinite(candle.volume) || candle.volume < 0)) return false
  return true
}
