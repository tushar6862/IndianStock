import type { Candle, InstrumentId } from '../../types/market.ts'
import { SAMPLE_VOLUME_NOTE } from '../../utils/copy.ts'

function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100
}

export const SAMPLE_SESSION_LABEL = 'Sample session 15 Jan 2026 · not live data'
export const SAMPLE_BAR_COUNT = 480

/** Deterministic 1-minute sample candles. Prices are synthetic. */
export function generateSampleCandles(instrument: InstrumentId): Candle[] {
  const spec =
    instrument === 'NIFTY50'
      ? { seed: 20260115, start: 22000, drift: 0.35, noise: 12 }
      : { seed: 20260116, start: 73000, drift: -1.1, noise: 40 }
  const random = mulberry32(spec.seed)
  const start = Date.UTC(2026, 0, 15, 3, 45, 0) / 1000
  let price = spec.start
  const candles: Candle[] = []

  for (let i = 0; i < SAMPLE_BAR_COUNT; i += 1) {
    const open = price
    const close = Math.max(1, open + spec.drift + (random() - 0.48) * spec.noise)
    const openR = roundPrice(open)
    const closeR = roundPrice(close)
    let high = roundPrice(Math.max(open, close) + random() * spec.noise * 0.35)
    let low = roundPrice(Math.min(open, close) - random() * spec.noise * 0.35)
    high = Math.max(high, openR, closeR)
    low = Math.min(low, openR, closeR)
    candles.push({
      time: start + i * 60,
      open: openR,
      high,
      low,
      close: closeR,
      volume: Math.round(60000 + random() * 90000),
    })
    price = close
  }

  return candles
}

export function sampleSourceLabel(instrument: InstrumentId): string {
  return `${instrument === 'NIFTY50' ? 'NIFTY 50' : 'SENSEX'} · ${SAMPLE_SESSION_LABEL}`
}

export { SAMPLE_VOLUME_NOTE }
