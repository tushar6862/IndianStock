import { candleStats, swingLevels } from '../calculations/candleStats.ts'
import { ema } from '../calculations/ema.ts'
import { rsi } from '../calculations/rsi.ts'
import { buildSetup } from '../calculations/setup.ts'
import { supertrend } from '../calculations/supertrend.ts'
import { scoreDirection } from '../calculations/predictionScore.ts'
import { sessionVwap } from '../calculations/vwap.ts'
import type {
  Candle,
  DataOrigin,
  Freshness,
  IndicatorSettings,
  InstrumentId,
  LiveQuote,
  SupertrendValue,
  Timeframe,
} from '../types/market.ts'
import { TIMEFRAME_SECONDS } from '../types/market.ts'
import type { DirectionReading, TradeSetup } from '../types/prediction.ts'
import { SAMPLE_VOLUME_NOTE } from './copy.ts'
import { lastNumber } from './format.ts'
import { candlesForTimeframe, mapLastInBucket } from './series.ts'

export interface MarketView {
  instrument: InstrumentId
  timeframe: Timeframe
  origin: DataOrigin
  freshness: Freshness
  sourceLabel: string
  candles: Candle[]
  resolutionNote: string | null
  volumeNote: string
  vwapNote: string
  settingsNote: string | null
  price: number | null
  change: number | null
  changePercent: number | null
  emaFast: number | null
  emaSlow: number | null
  rsi: number | null
  vwap: number | null
  supertrend: 'bullish' | 'bearish' | null
  supertrendValue: number | null
  stats: ReturnType<typeof candleStats>
  timestamp: number | null
  loadedAt: number | null
  changeBasis: string
  sessionOpen: number | null
  sessionHigh: number | null
  sessionLow: number | null
  emaFastSeries: Array<number | null>
  emaSlowSeries: Array<number | null>
  vwapSeries: Array<number | null>
  supertrendSeries: SupertrendValue[]
  reading: DirectionReading
  setup: TradeSetup
}

function freshnessFor(origin: DataOrigin): Freshness {
  if (origin === 'sample') return 'simulated'
  if (origin === 'file') return 'historical'
  if (origin === 'fyers') return 'delayed'
  return 'unavailable'
}

function volumeNote(origin: DataOrigin, candles: Candle[]): string {
  if (origin === 'disconnected' || candles.length === 0) {
    return 'No candles are loaded, so VWAP and volume stay empty.'
  }
  if (origin === 'sample') return SAMPLE_VOLUME_NOTE
  const hasVolume = candles.some((candle) => candle.volume != null && candle.volume > 0)
  if (origin === 'fyers' && !hasVolume) {
    return 'FYERS did not send traded volume for this index, so VWAP stays empty. NIFTY 50 and SENSEX spot do not have their own volume.'
  }
  if (origin === 'fyers') {
    return 'Volume is the figure FYERS returned. It is not treated as spot-index volume unless that feed actually includes it.'
  }
  if (!hasVolume) {
    return 'VWAP is unavailable because the file has no traded volume. None was invented.'
  }
  return 'VWAP uses the volume column in the imported file. That is valid only when the volume belongs to a traded instrument. A spot index does not have its own volume.'
}

export function sanitizeSettings(settings: IndicatorSettings): IndicatorSettings {
  const clamp = (value: number, min: number, max: number, fallback: number) => {
    if (!Number.isFinite(value)) return fallback
    return Math.min(max, Math.max(min, Math.round(value)))
  }
  return {
    emaFast: clamp(settings.emaFast, 2, 200, 9),
    emaSlow: clamp(settings.emaSlow, 2, 200, 21),
    rsiPeriod: clamp(settings.rsiPeriod, 2, 100, 14),
    supertrendPeriod: clamp(settings.supertrendPeriod, 2, 100, 10),
    supertrendMultiplier: Number.isFinite(settings.supertrendMultiplier)
      ? Math.min(10, Math.max(0.5, settings.supertrendMultiplier))
      : 3,
  }
}

export function buildMarketView(input: {
  instrument: InstrumentId
  candles: Candle[]
  origin: DataOrigin
  sourceLabel: string
  timeframe: Timeframe
  settings: IndicatorSettings
  loadedAt: number | null
  freshness?: Freshness
  quote?: LiveQuote | null
}): MarketView {
  const settings = sanitizeSettings(input.settings)
  const display = candlesForTimeframe(input.candles, input.timeframe)
  const closes = display.candles.map((candle) => candle.close)
  const emaFastSeries = ema(closes, settings.emaFast)
  const emaSlowSeries = ema(closes, settings.emaSlow)
  const rsiSeries = rsi(closes, settings.rsiPeriod)
  const supertrendSeries = supertrend(display.candles, settings.supertrendPeriod, settings.supertrendMultiplier)
  const baseVwap = sessionVwap(input.candles.length > 0 ? input.candles : display.candles)
  const sameSeries = display.candles === input.candles || input.candles.length === 0
  const vwapSeries = sameSeries
    ? sessionVwap(display.candles).values
    : mapLastInBucket(
        input.candles.map((candle) => candle.time),
        baseVwap.values,
        display.candles.map((candle) => candle.time),
        TIMEFRAME_SECONDS[input.timeframe],
      )
  const vwapResult = sameSeries ? sessionVwap(display.candles) : baseVwap
  const last = display.candles[display.candles.length - 1] ?? null
  const first = display.candles[0] ?? null
  const quote = input.quote && Number.isFinite(input.quote.price) ? input.quote : null
  const price = quote?.price ?? last?.close ?? null
  const change = quote ? quote.change : price != null && first ? price - first.open : null
  const changePercent = quote
    ? quote.changePercent
    : change != null && first && first.open !== 0
      ? (change / first.open) * 100
      : null
  const changeBasis = quote ? 'vs previous close' : 'vs session open'
  const lastTrend = [...supertrendSeries].reverse().find((item) => item.direction != null) ?? null
  const emaFastValue = lastNumber(emaFastSeries)
  const emaSlowValue = lastNumber(emaSlowSeries)
  const rsiValue = lastNumber(rsiSeries)
  const vwapValue = lastNumber(vwapSeries)
  const reading = scoreDirection({
    candles: display.candles,
    settings,
    instrument: input.instrument,
    timeframe: input.timeframe,
    origin: input.origin,
    marketOpen: null,
    lastCandleClosed: true,
    updatedAt: input.loadedAt ?? Date.now(),
    snapshot: {
      emaFast: emaFastValue,
      emaSlow: emaSlowValue,
      rsi: rsiValue,
      vwap: vwapValue,
      supertrend: lastTrend?.direction ?? null,
      vwapDetail: vwapResult.reason,
    },
  })
  const swings = swingLevels(display.candles)
  const setup = buildSetup({
    reading,
    last,
    vwap: lastNumber(vwapSeries),
    emaFast: lastNumber(emaFastSeries),
    emaSlow: lastNumber(emaSlowSeries),
    rsi: lastNumber(rsiSeries),
    supertrend: lastTrend,
    swings,
  })

  return {
    instrument: input.instrument,
    timeframe: input.timeframe,
    origin: input.origin,
    freshness: input.candles.length === 0 ? 'unavailable' : (input.freshness ?? freshnessFor(input.origin)),
    changeBasis,
    sessionOpen: quote?.open ?? last?.open ?? null,
    sessionHigh: quote?.high ?? last?.high ?? null,
    sessionLow: quote?.low ?? last?.low ?? null,
    sourceLabel: input.sourceLabel,
    candles: display.candles,
    resolutionNote: display.note,
    volumeNote: volumeNote(input.origin, input.candles),
    vwapNote: vwapResult.reason,
    settingsNote:
      settings.emaFast >= settings.emaSlow ? 'Fast EMA period should be shorter than the slow EMA period.' : null,
    price,
    change,
    changePercent,
    emaFast: lastNumber(emaFastSeries),
    emaSlow: lastNumber(emaSlowSeries),
    rsi: lastNumber(rsiSeries),
    vwap: lastNumber(vwapSeries),
    supertrend: lastTrend?.direction ?? null,
    supertrendValue: lastTrend?.value ?? null,
    stats: candleStats(last),
    timestamp: last?.time ?? null,
    loadedAt: input.loadedAt,
    emaFastSeries,
    emaSlowSeries,
    vwapSeries,
    supertrendSeries,
    reading,
    setup,
  }
}
