import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fetchFyersCandles, fetchFyersQuotes } from '../services/marketData/fyersClient.ts'
import { mergeQuote } from '../services/marketData/mergeQuote.ts'
import { parseCandleFile } from '../services/marketData/parseCandles.ts'
import { generateSampleCandles, sampleSourceLabel } from '../services/marketData/sampleData.ts'
import type { Candle, DataOrigin, Freshness, IndicatorSettings, IndicatorVisibility, InstrumentId, LiveQuote, Timeframe } from '../types/market.ts'
import { DEFAULT_INDICATOR_SETTINGS, DEFAULT_VISIBILITY } from '../types/market.ts'
import { sanitizeSettings } from '../utils/buildMarketView.ts'

interface Banner {
  tone: 'error' | 'info'
  message: string
}

interface MarketState {
  theme: 'dark' | 'light'
  instrument: InstrumentId
  timeframe: Timeframe
  settings: IndicatorSettings
  visibility: IndicatorVisibility
  series: Record<InstrumentId, Candle[]>
  origins: Record<InstrumentId, DataOrigin>
  sourceLabels: Record<InstrumentId, string>
  freshness: Record<InstrumentId, Freshness>
  quotes: Record<InstrumentId, LiveQuote | null>
  loadedAt: Record<InstrumentId, number | null>
  fileText: Record<InstrumentId, string | null>
  fileName: Record<InstrumentId, string | null>
  banner: Banner | null
  loading: boolean
  setTheme: (theme: 'dark' | 'light') => void
  setInstrument: (instrument: InstrumentId) => void
  setTimeframe: (timeframe: Timeframe) => void
  setSettings: (settings: IndicatorSettings) => void
  setVisibility: (visibility: Partial<IndicatorVisibility>) => void
  loadSample: () => void
  loadFyers: (options?: { quiet?: boolean }) => Promise<void>
  applyTicks: () => Promise<void>
  disconnect: () => void
  importFile: (text: string, fileName: string) => void
  refresh: () => void
  dismissBanner: () => void
}

const emptyCandles = (): Record<InstrumentId, Candle[]> => ({ NIFTY50: [], SENSEX: [] })
const emptyOrigin = (): Record<InstrumentId, DataOrigin> => ({
  NIFTY50: 'disconnected',
  SENSEX: 'disconnected',
})
const emptyLabels = (): Record<InstrumentId, string> => ({
  NIFTY50: 'Provider not connected',
  SENSEX: 'Provider not connected',
})
const emptyTimes = (): Record<InstrumentId, number | null> => ({ NIFTY50: null, SENSEX: null })
const emptyFreshness = (): Record<InstrumentId, Freshness> => ({ NIFTY50: 'unavailable', SENSEX: 'unavailable' })
const emptyQuotes = (): Record<InstrumentId, LiveQuote | null> => ({ NIFTY50: null, SENSEX: null })
const emptyText = (): Record<InstrumentId, string | null> => ({ NIFTY50: null, SENSEX: null })

export const useMarketStore = create<MarketState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      instrument: 'NIFTY50',
      timeframe: '5m',
      settings: DEFAULT_INDICATOR_SETTINGS,
      visibility: DEFAULT_VISIBILITY,
      series: emptyCandles(),
      origins: emptyOrigin(),
      sourceLabels: emptyLabels(),
      freshness: emptyFreshness(),
      quotes: emptyQuotes(),
      loadedAt: emptyTimes(),
      fileText: emptyText(),
      fileName: emptyText(),
      banner: null,
      loading: false,
      setTheme: (theme) => set({ theme }),
      setInstrument: (instrument) => set({ instrument }),
      setTimeframe: (timeframe) => set({ timeframe }),
      setSettings: (settings) => set({ settings: sanitizeSettings(settings) }),
      setVisibility: (visibility) => set({ visibility: { ...get().visibility, ...visibility } }),
      loadSample: () => {
        const loadedAt = Date.now()
        set({
          series: {
            NIFTY50: generateSampleCandles('NIFTY50'),
            SENSEX: generateSampleCandles('SENSEX'),
          },
          origins: { NIFTY50: 'sample', SENSEX: 'sample' },
          sourceLabels: {
            NIFTY50: sampleSourceLabel('NIFTY50'),
            SENSEX: sampleSourceLabel('SENSEX'),
          },
          freshness: { NIFTY50: 'simulated', SENSEX: 'simulated' },
          quotes: emptyQuotes(),
          loadedAt: { NIFTY50: loadedAt, SENSEX: loadedAt },
          fileText: emptyText(),
          fileName: emptyText(),
          banner: {
            tone: 'info',
            message: 'Sample candles loaded. These prices are synthetic and are not live market data.',
          },
          loading: false,
        })
      },
      disconnect: () =>
        set({
          series: emptyCandles(),
          origins: emptyOrigin(),
          sourceLabels: emptyLabels(),
          freshness: emptyFreshness(),
          quotes: emptyQuotes(),
          loadedAt: emptyTimes(),
          fileText: emptyText(),
          fileName: emptyText(),
          banner: { tone: 'info', message: 'Provider not connected. No market prices are loaded.' },
          loading: false,
        }),
      importFile: (text, fileName) => {
        const parsed = parseCandleFile(text, fileName)
        if (parsed.candles.length === 0) {
          set({
            banner: { tone: 'error', message: parsed.errors[0] ?? 'No valid candles were found in that file.' },
          })
          return
        }
        const instrument = get().instrument
        const skipped = parsed.errors.length
        set({
          series: { ...get().series, [instrument]: parsed.candles },
          origins: { ...get().origins, [instrument]: 'file' },
          sourceLabels: {
            ...get().sourceLabels,
            [instrument]: `Historical file · ${fileName}`,
          },
          freshness: { ...get().freshness, [instrument]: 'historical' },
          quotes: { ...get().quotes, [instrument]: null },
          loadedAt: { ...get().loadedAt, [instrument]: Date.now() },
          fileText: { ...get().fileText, [instrument]: text },
          fileName: { ...get().fileName, [instrument]: fileName },
          banner: {
            tone: skipped > 0 ? 'info' : 'info',
            message: `Imported ${parsed.candles.length} historical candles into ${instrument === 'NIFTY50' ? 'NIFTY 50' : 'SENSEX'}.${skipped > 0 ? ` ${skipped} rows were skipped.` : ''} This is not live data.`,
          },
        })
      },
      refresh: () => {
        const state = get()
        const selected = state.instrument
        if (state.origins.NIFTY50 === 'disconnected' && state.origins.SENSEX === 'disconnected') {
          void state.loadFyers()
          return
        }
        if (state.origins[selected] === 'file') {
          const text = state.fileText[selected]
          const name = state.fileName[selected]
          if (text && name) {
            state.importFile(text, name)
            return
          }
        }
        if (state.origins.NIFTY50 === 'fyers' || state.origins.SENSEX === 'fyers') {
          void state.loadFyers()
          return
        }
        if (state.origins.NIFTY50 === 'sample' || state.origins.SENSEX === 'sample') {
          state.loadSample()
          return
        }
        set({ banner: { tone: 'error', message: 'The imported file is no longer in memory. Import it again.' } })
      },
      loadFyers: async (options) => {
        if (!options?.quiet) set({ loading: true })
        const current = get()
        const ids = ['NIFTY50', 'SENSEX'] as const
        const results = await Promise.allSettled(ids.map((id) => fetchFyersCandles(id)))
        const series = { ...current.series }
        const origins = { ...current.origins }
        const sourceLabels = { ...current.sourceLabels }
        const freshness = { ...current.freshness }
        const quotes = { ...current.quotes }
        const loadedAt = { ...current.loadedAt }
        const fileText = { ...current.fileText }
        const fileName = { ...current.fileName }
        const errors: string[] = []
        let loaded = 0
        results.forEach((result, index) => {
          const id = ids[index]
          if (result.status === 'fulfilled') {
            loaded += 1
            series[id] = result.value.candles
            origins[id] = 'fyers'
            sourceLabels[id] = result.value.sourceLabel
            freshness[id] = result.value.freshness
            quotes[id] = result.value.quote
            loadedAt[id] = Date.now()
            fileText[id] = null
            fileName[id] = null
            return
          }
          errors.push(result.reason instanceof Error ? result.reason.message : `${id} could not be loaded.`)
        })
        if (loaded === 0) {
          set({
            loading: false,
            banner: { tone: 'error', message: errors[0] ?? 'FYERS data could not be loaded.' },
          })
          return
        }
        set({
          series,
          origins,
          sourceLabels,
          freshness,
          quotes,
          loadedAt,
          fileText,
          fileName,
          loading: false,
          banner: errors.length
            ? { tone: 'error', message: errors.join(' ') }
            : options?.quiet
              ? current.banner
              : { tone: 'info', message: 'FYERS data loaded. These prices come from your FYERS account.' },
        })
      },
      applyTicks: async () => {
        const current = get()
        if (current.origins.NIFTY50 !== 'fyers' && current.origins.SENSEX !== 'fyers') return
        const payload = await fetchFyersQuotes()
        const now = Math.floor(Date.now() / 1000)
        const quotes = { ...get().quotes }
        const freshness = { ...get().freshness }
        const series = { ...get().series }
        const sourceLabels = { ...get().sourceLabels }
        for (const id of ['NIFTY50', 'SENSEX'] as const) {
          const row = payload[id]
          if (!row?.quote || get().origins[id] !== 'fyers') continue
          const live = row.freshness === 'live'
          const quote =
            live && Math.abs(now - row.quote.time) > 180 ? { ...row.quote, time: now } : row.quote
          quotes[id] = quote
          freshness[id] = row.freshness
          series[id] = mergeQuote(get().series[id], quote, { live, now })
          if (row.sourceLabel) sourceLabels[id] = row.sourceLabel
        }
        set({ quotes, freshness, series, sourceLabels })
      },
      dismissBanner: () => set({ banner: null }),
    }),
    {
      name: 'nifty-ai-ui',
      partialize: (state) => ({
        theme: state.theme,
        instrument: state.instrument,
        timeframe: state.timeframe,
        settings: state.settings,
        visibility: state.visibility,
      }),
    },
  ),
)
