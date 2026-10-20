import { Badge } from '../common/Badge.tsx'
import { Card } from '../common/Card.tsx'
import type { MarketView } from '../../utils/buildMarketView.ts'
import { INSTRUMENTS } from '../../types/market.ts'
import { formatIst, formatNumber, formatPercent, formatSigned } from '../../utils/format.ts'

function freshnessLabel(view: MarketView): { text: string; tone: 'info' | 'warn' | 'neutral' | 'bull' } {
  if (view.freshness === 'simulated') return { text: 'SIMULATED', tone: 'info' }
  if (view.freshness === 'historical') return { text: 'HISTORICAL', tone: 'info' }
  if (view.freshness === 'delayed') return { text: 'DELAYED', tone: 'warn' }
  if (view.freshness === 'live') return { text: 'LIVE', tone: 'bull' }
  return { text: 'UNAVAILABLE', tone: 'warn' }
}

function biasTone(view: MarketView): { text: string; tone: 'bull' | 'bear' | 'warn' | 'neutral' } {
  if (view.reading.bias === 'BULLISH') return { text: 'Bullish', tone: 'bull' }
  if (view.reading.bias === 'BEARISH') return { text: 'Bearish', tone: 'bear' }
  if (view.reading.bias === 'SIDEWAYS') return { text: 'Sideways', tone: 'warn' }
  return { text: 'No read', tone: 'neutral' }
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="tabular truncate text-sm font-medium" title={hint}>
        {value}
      </dd>
    </div>
  )
}

export function MarketCard({ view, selected, onSelect }: { view: MarketView; selected: boolean; onSelect: () => void }) {
  const meta = INSTRUMENTS[view.instrument]
  const freshness = freshnessLabel(view)
  const bias = biasTone(view)
  const changeTone = view.change == null ? 'text-muted' : view.change > 0 ? 'text-bull' : view.change < 0 ? 'text-bear' : 'text-warn'
  const last = view.candles[view.candles.length - 1]

  return (
    <Card className={selected ? 'ring-1 ring-accent' : ''}>
      <button type="button" onClick={onSelect} className="w-full text-left" aria-pressed={selected}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{meta.exchange}</p>
            <h3 className="text-lg font-semibold">{meta.name}</h3>
          </div>
          <Badge tone={freshness.tone}>{freshness.text}</Badge>
        </div>
        <p className="tabular mt-3 text-3xl font-semibold">{view.price == null ? 'Unavailable' : formatNumber(view.price)}</p>
        <p className={`tabular mt-1 text-sm ${changeTone}`}>
          {formatSigned(view.change)} ({formatPercent(view.changePercent)})
          <span className="ml-2 text-muted">{view.changeBasis}</span>
        </p>
        <div className="mt-3">
          <Badge tone={bias.tone}>{bias.text}</Badge>
        </div>
      </button>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Field label="Open" value={formatNumber(last?.open)} />
        <Field label="High" value={formatNumber(last?.high)} />
        <Field label="Low" value={formatNumber(last?.low)} />
        <Field label="Close" value={formatNumber(last?.close)} />
        <Field label="VWAP" value={formatNumber(view.vwap)} hint={view.vwapNote} />
        <Field label="EMA 9" value={formatNumber(view.emaFast)} />
        <Field label="EMA 21" value={formatNumber(view.emaSlow)} />
        <Field label="RSI 14" value={formatNumber(view.rsi, 1)} />
        <Field
          label="Supertrend"
          value={view.supertrend == null ? '—' : view.supertrend === 'bullish' ? 'Bullish' : 'Bearish'}
        />
      </dl>
      <p className="mt-4 text-xs leading-5 text-muted">
        {formatIst(view.timestamp)} · {view.sourceLabel}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted">{view.volumeNote}</p>
    </Card>
  )
}
