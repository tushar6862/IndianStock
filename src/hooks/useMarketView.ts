import { useMemo } from 'react'
import { useMarketStore } from '../store/useMarketStore.ts'
import type { InstrumentId } from '../types/market.ts'
import { buildMarketView } from '../utils/buildMarketView.ts'

export function useMarketView(instrument: InstrumentId) {
  const candles = useMarketStore((state) => state.series[instrument])
  const origin = useMarketStore((state) => state.origins[instrument])
  const sourceLabel = useMarketStore((state) => state.sourceLabels[instrument])
  const loadedAt = useMarketStore((state) => state.loadedAt[instrument])
  const freshness = useMarketStore((state) => state.freshness[instrument])
  const quote = useMarketStore((state) => state.quotes[instrument])
  const timeframe = useMarketStore((state) => state.timeframe)
  const settings = useMarketStore((state) => state.settings)

  return useMemo(
    () =>
      buildMarketView({
        instrument,
        candles,
        origin,
        sourceLabel,
        timeframe,
        settings,
        loadedAt,
        freshness,
        quote,
      }),
    [instrument, candles, origin, sourceLabel, timeframe, settings, loadedAt, freshness, quote],
  )
}
