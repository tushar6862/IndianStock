import { mergeQuote } from './mergeQuote.ts'
import type { Candle, Freshness, InstrumentId, LiveQuote } from '../../types/market.ts'
import type { ProviderStatus } from './provider.ts'

export interface FyersStatus {
  connected: boolean
  configured: boolean
  redirectUri: string
  message: string
}

export interface FyersCandleResult {
  candles: Candle[]
  quote: LiveQuote | null
  freshness: Freshness
  sourceLabel: string
}

export function fyersConnectionMessage(): ProviderStatus {
  return {
    id: 'fyers',
    label: 'FYERS',
    connected: false,
    freshness: 'unavailable',
    message:
      'FYERS is not connected until you log in. The app secret stays on the local server and is never placed in browser code.',
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string }
  if (!response.ok) {
    throw new Error(payload.message || 'The local FYERS server did not accept the request.')
  }
  return payload
}

export async function fetchFyersStatus(): Promise<FyersStatus> {
  const response = await fetch('/api/fyers/status')
  return readJson<FyersStatus>(response)
}

export async function fetchFyersLoginUrl(): Promise<{ url: string; redirectUri: string }> {
  const response = await fetch('/api/fyers/login')
  return readJson(response)
}

export async function exchangeFyersCode(code: string): Promise<void> {
  const response = await fetch('/api/fyers/exchange', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  await readJson(response)
}

export async function fetchFyersCandles(instrument: InstrumentId): Promise<FyersCandleResult> {
  const response = await fetch(`/api/market/candles?instrument=${instrument}`)
  const payload = await readJson<{
    candles: Candle[]
    quote: LiveQuote | null
    freshness: Freshness
    sourceLabel: string
  }>(response)
  return {
    candles: mergeQuote(payload.candles ?? [], payload.quote),
    quote: payload.quote,
    freshness: payload.freshness,
    sourceLabel: payload.sourceLabel,
  }
}
