import type { Candle, SupertrendValue } from '../types/market.ts'

/**
 * Supertrend using Wilder ATR.
 * Bullish values sit on the lower band. Bearish values sit on the upper band.
 */
export function supertrend(candles: Candle[], period: number, multiplier: number): SupertrendValue[] {
  const result: SupertrendValue[] = candles.map(() => ({ value: null, direction: null }))
  if (!Number.isInteger(period) || period < 1 || !Number.isFinite(multiplier) || candles.length < period) {
    return result
  }

  const trueRange: number[] = []
  for (let i = 0; i < candles.length; i += 1) {
    const candle = candles[i]
    if (![candle.high, candle.low, candle.close].every(Number.isFinite) || candle.high < candle.low) {
      trueRange.push(Number.NaN)
      continue
    }
    if (i === 0) {
      trueRange.push(candle.high - candle.low)
      continue
    }
    const previousClose = candles[i - 1].close
    trueRange.push(
      Math.max(candle.high - candle.low, Math.abs(candle.high - previousClose), Math.abs(candle.low - previousClose)),
    )
  }

  const atr: Array<number | null> = candles.map(() => null)
  let seed = 0
  for (let i = 0; i < period; i += 1) {
    if (!Number.isFinite(trueRange[i])) return result
    seed += trueRange[i]
  }
  atr[period - 1] = seed / period
  for (let i = period; i < candles.length; i += 1) {
    const previous = atr[i - 1]
    if (!Number.isFinite(trueRange[i]) || previous == null) continue
    atr[i] = (previous * (period - 1) + trueRange[i]) / period
  }

  let previousUpper = 0
  let previousLower = 0
  let previousDirection: 'bullish' | 'bearish' | null = null

  for (let i = period - 1; i < candles.length; i += 1) {
    const average = atr[i]
    const candle = candles[i]
    if (average == null || !Number.isFinite(average)) {
      previousDirection = null
      continue
    }
    const midpoint = (candle.high + candle.low) / 2
    const basicUpper = midpoint + multiplier * average
    const basicLower = midpoint - multiplier * average
    let finalUpper: number
    let finalLower: number
    if (previousDirection == null) {
      finalUpper = basicUpper
      finalLower = basicLower
    } else {
      const previousClose = candles[i - 1].close
      finalUpper = basicUpper < previousUpper || previousClose > previousUpper ? basicUpper : previousUpper
      finalLower = basicLower > previousLower || previousClose < previousLower ? basicLower : previousLower
    }

    let direction: 'bullish' | 'bearish'
    if (previousDirection == null) {
      direction = candle.close >= finalLower ? 'bullish' : 'bearish'
    } else if (previousDirection === 'bullish') {
      direction = candle.close < finalLower ? 'bearish' : 'bullish'
    } else {
      direction = candle.close > finalUpper ? 'bullish' : 'bearish'
    }

    result[i] = {
      value: direction === 'bullish' ? finalLower : finalUpper,
      direction,
    }
    previousUpper = finalUpper
    previousLower = finalLower
    previousDirection = direction
  }

  return result
}
