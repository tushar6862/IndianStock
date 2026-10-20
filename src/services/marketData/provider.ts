import type { Candle, DataOrigin, Freshness, InstrumentId, Timeframe } from '../../types/market.ts'

export interface ProviderStatus {
  id: string
  label: string
  connected: boolean
  freshness: Freshness
  message: string
}

export interface CandleLoadResult {
  candles: Candle[]
  origin: DataOrigin
  freshness: Freshness
  sourceLabel: string
  message: string
}

/**
 * Provider-independent market data port.
 * A later phase can add FYERS or another authorised vendor behind this shape.
 * Implementations must not embed app secrets.
 */
export interface MarketDataProvider {
  id: string
  label: string
  status(): ProviderStatus
  loadCandles(instrument: InstrumentId, timeframe: Timeframe): Promise<CandleLoadResult>
}
