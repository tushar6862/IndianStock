import { describe, expect, it } from 'vitest'
import { candleStats, isValidCandle } from '../calculations/candleStats.ts'
import { ema } from '../calculations/ema.ts'
import { classifyScore, heuristicMoveEstimates, scoreDirection } from '../calculations/predictionScore.ts'
import { rsi } from '../calculations/rsi.ts'
import { buildSetup } from '../calculations/setup.ts'
import { supertrend } from '../calculations/supertrend.ts'
import { sessionVwap } from '../calculations/vwap.ts'
import { mergeQuote } from '../services/marketData/mergeQuote.ts'
import { fyersConnectionMessage } from '../services/marketData/fyersProvider.ts'
import { parseCandleFile } from '../services/marketData/parseCandles.ts'
import { generateSampleCandles } from '../services/marketData/sampleData.ts'
import { swingLevels } from '../calculations/candleStats.ts'
import type { Candle } from '../types/market.ts'
import { DEFAULT_INDICATOR_SETTINGS } from '../types/market.ts'
import { getMarketSession } from '../utils/session.ts'
import { aggregateCandles } from '../utils/series.ts'

const settings = DEFAULT_INDICATOR_SETTINGS

function bar(index: number, open: number, high: number, low: number, close: number, volume?: number): Candle {
  return { time: 1_700_000_000 + index * 60, open, high, low, close, volume }
}

describe('ema', () => {
  it('seeds with a simple average and then applies the smoothing constant', () => {
    expect(ema([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4])
  })

  it('returns nulls for an invalid period or empty input', () => {
    expect(ema([1, 2, 3], 0)).toEqual([null, null, null])
    expect(ema([], 9)).toEqual([])
  })
})

describe('rsi', () => {
  it('uses Wilder smoothing', () => {
    const values = rsi([10, 11, 12, 11, 13], 3)
    expect(values[0]).toBeNull()
    expect(values[1]).toBeNull()
    expect(values[2]).toBeNull()
    expect(values[3]).toBeCloseTo(66.666666, 4)
    expect(values[4]).toBeCloseTo(83.333333, 4)
  })

  it('returns 50 when price does not change', () => {
    const values = rsi(Array.from({ length: 6 }, () => 100), 3)
    expect(values[3]).toBe(50)
  })
})

describe('vwap', () => {
  it('accumulates typical price times volume', () => {
    const result = sessionVwap([
      bar(0, 9, 10, 8, 9, 100),
      bar(1, 10, 12, 10, 11, 100),
    ])
    expect(result.usedVolume).toBe(true)
    expect(result.values[0]).toBeCloseTo(9)
    expect(result.values[1]).toBeCloseTo(10)
  })

  it('does not invent volume for an index print', () => {
    const result = sessionVwap([bar(0, 10, 11, 9, 10)])
    expect(result.usedVolume).toBe(false)
    expect(result.values).toEqual([null])
  })
})

describe('supertrend', () => {
  it('matches a hand-calculated ATR band', () => {
    const candles = [
      bar(0, 10, 12, 9, 11),
      bar(1, 11, 13, 10, 12),
      bar(2, 12, 14, 11, 13),
      bar(3, 13, 15, 12, 14),
      bar(4, 14, 14.5, 12, 12.5),
      bar(5, 12.5, 13, 11, 11.5),
    ]
    const values = supertrend(candles, 3, 2)
    expect(values[2].direction).toBe('bullish')
    expect(values[2].value).toBeCloseTo(6.5)
    expect(values[3].value).toBeCloseTo(7.5)
    expect(values[4].value).toBeCloseTo(7.583333, 4)
    expect(values[5].direction).toBe('bullish')
    expect(values[5].value).toBeCloseTo(7.583333, 4)
  })
})

describe('candles', () => {
  it('measures body and wicks', () => {
    const stats = candleStats(bar(0, 10, 14, 9, 13))
    expect(stats).toMatchObject({
      body: 3,
      range: 5,
      bodyPercent: 60,
      upperWick: 1,
      lowerWick: 1,
      direction: 'bullish',
    })
  })

  it('rejects a high below the close', () => {
    expect(isValidCandle(bar(0, 10, 10, 9, 12))).toBe(false)
  })

  it('aggregates a bucket without dropping the first open', () => {
    const aggregated = aggregateCandles(
      [bar(0, 10, 12, 9, 11, 5), bar(1, 11, 13, 10, 12, 7)],
      180,
    )
    expect(aggregated).toHaveLength(1)
    expect(aggregated[0]).toMatchObject({ open: 10, high: 13, low: 9, close: 12, volume: 12 })
  })
})

describe('prediction score', () => {
  it('reads a clean uptrend as bullish and labels the percentage as a heuristic', () => {
    const candles: Candle[] = []
    let price = 100
    for (let i = 0; i < 40; i += 1) {
      const open = price
      const close = price + 1
      candles.push(bar(i, open, close + 0.2, open - 0.1, close, 1000))
      price = close
    }
    const reading = scoreDirection({
      candles,
      settings,
      instrument: 'NIFTY50',
      timeframe: '5m',
      origin: 'sample',
      updatedAt: 1,
    })
    expect(reading.bias).toBe('BULLISH')
    expect(reading.nextCandleBias).toBe('BULLISH')
    expect(reading.upwardEstimate).not.toBeNull()
    expect(reading.downwardEstimate).toBe(reading.upwardEstimate == null ? null : 100 - reading.upwardEstimate)
    expect(reading.estimateLabel.toLowerCase()).toContain('not a calibrated')
    expect(reading.contributions.some((item) => item.id === 'ema' && item.score === 1)).toBe(true)

    const setup = buildSetup({
      reading,
      last: candles[candles.length - 1],
      vwap: 110,
      emaFast: 130,
      emaSlow: 120,
      rsi: 65,
      supertrend: { value: 120, direction: 'bullish' },
      swings: swingLevels(candles),
    })
    expect(setup.active).toBe(true)
    expect(setup.riskReward).toBe(2)
    expect(setup.stop).toBeLessThan(setup.entry ?? 0)
  })

  it('does not invent a direction for an empty or flat series', () => {
    const empty = scoreDirection({
      candles: [],
      settings,
      instrument: 'SENSEX',
      timeframe: '1m',
      origin: 'disconnected',
    })
    expect(empty.bias).toBe('INSUFFICIENT_DATA')
    expect(empty.upwardEstimate).toBeNull()

    const flat = scoreDirection({
      candles: Array.from({ length: 40 }, (_, index) => bar(index, 100, 100.2, 99.8, 100, 1000)),
      settings,
      instrument: 'NIFTY50',
      timeframe: '5m',
      origin: 'sample',
    })
    expect(flat.bias).toBe('SIDEWAYS')
    expect(flat.upwardEstimate).toBeNull()
  })

  it('waits when the evidence conflicts or the market is closed', () => {
    expect(
      classifyScore({
        score: 4,
        positiveCount: 3,
        negativeCount: 2,
        enoughData: true,
        marketOpen: null,
        lastCandleClosed: true,
        aligned: 3,
      }).status,
    ).toBe('WAIT_FOR_CONFIRMATION')
    expect(
      classifyScore({
        score: 4,
        positiveCount: 4,
        negativeCount: 0,
        enoughData: true,
        marketOpen: false,
        lastCandleClosed: true,
        aligned: 4,
      }).status,
    ).toBe('WAIT')
  })

  it('keeps heuristic estimates away from certainty', () => {
    const strong = heuristicMoveEstimates(6)
    expect(strong.up).toBeLessThanOrEqual(74)
    expect(strong.up + strong.down).toBe(100)
  })
})

describe('sample data and providers', () => {
  it('builds a stable labelled sample and keeps FYERS disconnected', () => {
    const first = generateSampleCandles('NIFTY50')
    const second = generateSampleCandles('NIFTY50')
    expect(first).toHaveLength(480)
    expect(first[0]).toEqual(second[0])
    expect(first[0].volume).toBeGreaterThan(0)
    const fyers = fyersConnectionMessage()
    expect(fyers.connected).toBe(false)
    expect(fyers.message.toLowerCase()).toContain('not connected')
    expect(fyers.message.toLowerCase()).toContain('secret')
    expect(fyers.message.toLowerCase()).toContain('browser')
  })

  it('updates the current FYERS minute with the live quote', () => {
    const merged = mergeQuote(
      [{ time: 1_700_000_040, open: 10, high: 11, low: 9, close: 10 }],
      { price: 12, change: 1, changePercent: 1, time: 1_700_000_050 },
    )
    expect(merged).toHaveLength(1)
    expect(merged[0].close).toBe(12)
    expect(merged[0].high).toBe(12)
  })

  it('prints a stale FYERS timestamp onto the current minute while the feed is live', () => {
    const merged = mergeQuote(
      [{ time: 1_700_000_040, open: 10, high: 11, low: 9, close: 10 }],
      { price: 13, change: 1, changePercent: 1, time: 1_600_000_000 },
      { live: true, now: 1_700_000_100 },
    )
    expect(merged).toHaveLength(2)
    expect(merged[1].close).toBe(13)
    expect(merged[1].time).toBe(1_700_000_100)
  })

  it('parses a csv and skips a broken row', () => {
    const parsed = parseCandleFile(
      'time,open,high,low,close,volume\n1700000000,10,12,9,11,100\nbad,1,1,1,1\n',
      'history.csv',
    )
    expect(parsed.candles).toHaveLength(1)
    expect(parsed.errors.length).toBeGreaterThan(0)
  })
})

describe('market session', () => {
  it('uses the NSE cash window in IST', () => {
    expect(getMarketSession(new Date('2026-01-05T04:30:00Z')).phase).toBe('open')
    expect(getMarketSession(new Date('2026-01-05T03:35:00Z')).phase).toBe('pre-open')
    expect(getMarketSession(new Date('2026-01-04T04:30:00Z')).phase).toBe('closed')
  })
})
