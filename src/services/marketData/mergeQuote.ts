import type { Candle, LiveQuote } from '../../types/market.ts'

/** Fold a FYERS quote into the latest 1-minute candle without inventing a price. */
export function mergeQuote(candles: Candle[], quote: LiveQuote | null): Candle[] {
  if (!quote || !Number.isFinite(quote.price) || !Number.isFinite(quote.time)) return candles
  const minute = Math.floor(quote.time / 60) * 60
  if (candles.length === 0) {
    return [{ time: minute, open: quote.price, high: quote.price, low: quote.price, close: quote.price }]
  }
  const next = candles.map((candle) => ({ ...candle }))
  const last = next[next.length - 1]
  if (minute < last.time) return next
  if (minute === last.time) {
    last.high = Math.max(last.high, quote.price)
    last.low = Math.min(last.low, quote.price)
    last.close = quote.price
    return next
  }
  next.push({
    time: minute,
    open: last.close,
    high: Math.max(last.close, quote.price),
    low: Math.min(last.close, quote.price),
    close: quote.price,
  })
  return next
}
