import { fetchFyersCandles, fyersConnectionMessage } from './fyersClient.ts'
import type { InstrumentId, Timeframe } from '../../types/market.ts'
import type { CandleLoadResult, MarketDataProvider } from './provider.ts'

export { fyersConnectionMessage }

export function createFyersProvider(): MarketDataProvider {
  return {
    id: 'fyers',
    label: 'FYERS',
    status: fyersConnectionMessage,
    async loadCandles(instrument: InstrumentId, timeframe: Timeframe): Promise<CandleLoadResult> {
      const loaded = await fetchFyersCandles(instrument)
      return {
        candles: loaded.candles,
        origin: 'fyers',
        freshness: loaded.freshness,
        sourceLabel: loaded.sourceLabel,
        message: `Candles came from the local FYERS adapter. Chart timeframe ${timeframe} is aggregated in the browser.`,
      }
    },
  }
}
