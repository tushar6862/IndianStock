import type { Candle } from '../types/market.ts'

export interface VwapResult {
  values: Array<number | null>
  usedVolume: boolean
  reason: string
}

/**
 * Session VWAP from typical price and traded volume.
 * Candles without a positive volume do not receive an invented volume.
 */
export function sessionVwap(candles: Candle[]): VwapResult {
  const values: Array<number | null> = candles.map(() => null)
  const hasVolume = candles.some((candle) => candle.volume != null && candle.volume > 0 && Number.isFinite(candle.volume))
  if (!hasVolume) {
    return {
      values,
      usedVolume: false,
      reason:
        'VWAP is unavailable. It needs traded volume, and the NIFTY 50 or SENSEX spot index does not print its own volume.',
    }
  }

  let cumulativePriceVolume = 0
  let cumulativeVolume = 0
  for (let i = 0; i < candles.length; i += 1) {
    const candle = candles[i]
    const volume = candle.volume
    if (volume == null || !Number.isFinite(volume) || volume <= 0) continue
    if (![candle.high, candle.low, candle.close].every(Number.isFinite)) continue
    const typical = (candle.high + candle.low + candle.close) / 3
    cumulativePriceVolume += typical * volume
    cumulativeVolume += volume
    values[i] = cumulativePriceVolume / cumulativeVolume
  }

  return {
    values,
    usedVolume: true,
    reason:
      'VWAP uses only the volume supplied with these candles. Spot index prints do not contain that volume. Sample mode uses a labelled synthetic stand-in, not exchange volume.',
  }
}
