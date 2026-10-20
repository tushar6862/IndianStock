import type { InstrumentId } from '../../types/market.ts'
import { INSTRUMENTS } from '../../types/market.ts'
import type { Moneyness, OptionChain, OptionContract, OptionSide } from '../../types/options.ts'

export const SAMPLE_EXPIRIES = ['Sample weekly', 'Sample next week', 'Sample monthly'] as const

const EXTRINSIC: Record<(typeof SAMPLE_EXPIRIES)[number], number> = {
  'Sample weekly': 1,
  'Sample next week': 1.6,
  'Sample monthly': 2.3,
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step
}

function moneyness(side: OptionSide, strike: number, spot: number, atm: number): Moneyness {
  if (strike === atm) return 'ATM'
  if (side === 'CALL') return strike < spot ? 'ITM' : 'OTM'
  return strike > spot ? 'ITM' : 'OTM'
}

function sampleNumber(seed: number, min: number, span: number): number {
  const mixed = Math.abs(Math.sin(seed) * 10000)
  return min + (mixed % 1) * span
}

export function buildSampleOptionChain(
  instrument: InstrumentId,
  spot: number | null,
  expiryLabel: string,
): OptionChain {
  const expiries = [...SAMPLE_EXPIRIES]
  const expiry = expiries.includes(expiryLabel as (typeof SAMPLE_EXPIRIES)[number]) ? expiryLabel : expiries[0]
  if (spot == null || !Number.isFinite(spot)) {
    return {
      instrument,
      spot: null,
      atmStrike: null,
      expiryLabel: expiry,
      expiries,
      contracts: [],
      origin: 'unavailable',
      note: 'Options are unavailable until candles are loaded. This screen will not invent a spot price.',
    }
  }

  const step = INSTRUMENTS[instrument].strikeStep
  const atm = roundTo(spot, step)
  const scale = Math.max(spot / 22000, 0.5)
  const extrinsicBase = 35 * scale * EXTRINSIC[expiry as (typeof SAMPLE_EXPIRIES)[number]]
  const contracts: OptionContract[] = []

  for (let offset = -8; offset <= 8; offset += 1) {
    const strike = atm + offset * step
    for (const side of ['CALL', 'PUT'] as const) {
      const intrinsic = side === 'CALL' ? Math.max(0, spot - strike) : Math.max(0, strike - spot)
      const distance = Math.abs(spot - strike) / spot
      const extrinsic = extrinsicBase * Math.max(0.12, 1 - distance * 10)
      const ltp = Math.round((intrinsic + extrinsic) * 100) / 100
      const seed = strike * (side === 'CALL' ? 3 : 7) + expiry.length
      const change = Math.round(sampleNumber(seed, -1, 2) * 4 * scale * 100) / 100
      const previous = Math.max(0.05, ltp - change)
      contracts.push({
        instrument,
        expiryLabel: expiry,
        strike,
        side,
        ltp,
        change,
        changePercent: (change / previous) * 100,
        volume: Math.round(sampleNumber(seed + 1, 500, 20000)),
        oi: Math.round(sampleNumber(seed + 2, 10000, 250000)),
        oiChange: Math.round(sampleNumber(seed + 3, -8000, 16000)),
        moneyness: moneyness(side, strike, spot, atm),
      })
    }
  }

  return {
    instrument,
    spot,
    atmStrike: atm,
    expiryLabel: expiry,
    expiries,
    contracts,
    origin: 'sample',
    note: 'Sample option chain for layout testing. Premiums, volume, open interest, and expiries are synthetic. They are not market quotes or exchange statistics.',
  }
}
