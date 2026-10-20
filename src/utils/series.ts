import type { Candle, Timeframe } from '../types/market.ts'
import { TIMEFRAME_SECONDS } from '../types/market.ts'

export function aggregateCandles(candles: Candle[], bucketSeconds: number): Candle[] {
  if (bucketSeconds <= 0) return []
  const buckets = new Map<number, Candle>()
  for (const candle of candles) {
    const key = Math.floor(candle.time / bucketSeconds) * bucketSeconds
    const existing = buckets.get(key)
    if (!existing) {
      buckets.set(key, { ...candle, time: key })
      continue
    }
    existing.high = Math.max(existing.high, candle.high)
    existing.low = Math.min(existing.low, candle.low)
    existing.close = candle.close
    if (existing.volume == null || candle.volume == null) existing.volume = undefined
    else existing.volume += candle.volume
  }
  return [...buckets.values()].sort((a, b) => a.time - b.time)
}

export function nativeStepSeconds(candles: Candle[]): number | null {
  let step = Number.POSITIVE_INFINITY
  for (let i = 1; i < candles.length; i += 1) {
    const delta = candles[i].time - candles[i - 1].time
    if (delta > 0 && delta < step) step = delta
  }
  return Number.isFinite(step) ? step : null
}

export function candlesForTimeframe(
  candles: Candle[],
  timeframe: Timeframe,
): { candles: Candle[]; note: string | null } {
  const target = TIMEFRAME_SECONDS[timeframe]
  const native = nativeStepSeconds(candles)
  if (candles.length === 0 || native == null) return { candles, note: null }
  if (native > target + 1) {
    return {
      candles,
      note: `Loaded candles are coarser than ${timeframe}. Showing the file resolution instead of inventing finer bars.`,
    }
  }
  if (Math.abs(native - target) < 1) return { candles, note: null }
  return { candles: aggregateCandles(candles, target), note: null }
}

/** Carry the latest base value into each display bucket. */
export function mapLastInBucket(
  baseTimes: number[],
  values: Array<number | null>,
  bucketStarts: number[],
  bucketSeconds: number,
): Array<number | null> {
  const mapped: Array<number | null> = []
  let index = 0
  let latest: number | null = null
  for (const start of bucketStarts) {
    const end = start + bucketSeconds
    while (index < baseTimes.length && baseTimes[index] < end) {
      const value = values[index]
      if (value != null && Number.isFinite(value)) latest = value
      index += 1
    }
    mapped.push(latest)
  }
  return mapped
}
