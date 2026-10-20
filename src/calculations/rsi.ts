function rsiFromAverages(avgGain: number, avgLoss: number): number {
  if (avgGain === 0 && avgLoss === 0) return 50
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

/** Wilder RSI. The first value is placed at index `period` after `period` price changes. */
export function rsi(values: number[], period: number): Array<number | null> {
  const result: Array<number | null> = values.map(() => null)
  if (!Number.isInteger(period) || period < 1 || values.length <= period) return result

  let gain = 0
  let loss = 0
  for (let i = 1; i <= period; i += 1) {
    const diff = values[i] - values[i - 1]
    if (!Number.isFinite(diff)) return result
    if (diff >= 0) gain += diff
    else loss -= diff
  }

  let avgGain = gain / period
  let avgLoss = loss / period
  result[period] = rsiFromAverages(avgGain, avgLoss)

  for (let i = period + 1; i < values.length; i += 1) {
    const diff = values[i] - values[i - 1]
    if (!Number.isFinite(diff)) return result
    const up = diff > 0 ? diff : 0
    const down = diff < 0 ? -diff : 0
    avgGain = (avgGain * (period - 1) + up) / period
    avgLoss = (avgLoss * (period - 1) + down) / period
    result[i] = rsiFromAverages(avgGain, avgLoss)
  }

  return result
}
