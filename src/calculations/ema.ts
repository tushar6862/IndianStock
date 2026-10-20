/** Exponential moving average. The seed is a simple average of the first `period` values. */
export function ema(values: number[], period: number): Array<number | null> {
  const result: Array<number | null> = values.map(() => null)
  if (!Number.isInteger(period) || period < 1) return result

  const k = 2 / (period + 1)
  let prev: number | null = null
  let seed: number[] = []

  for (let i = 0; i < values.length; i += 1) {
    const value = values[i]
    if (!Number.isFinite(value)) {
      prev = null
      seed = []
      continue
    }
    if (prev == null) {
      seed.push(value)
      if (seed.length === period) {
        prev = seed.reduce((sum, item) => sum + item, 0) / period
        result[i] = prev
      }
      continue
    }
    prev = value * k + prev * (1 - k)
    result[i] = prev
  }

  return result
}
