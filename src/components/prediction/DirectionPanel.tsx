import { Badge } from '../common/Badge.tsx'
import { Card } from '../common/Card.tsx'
import { INSTRUMENTS, TIMEFRAME_LABEL } from '../../types/market.ts'
import type { MarketView } from '../../utils/buildMarketView.ts'
import { MODEL_NOTE } from '../../utils/copy.ts'
import { formatIst } from '../../utils/format.ts'

function biasTone(bias: string): 'bull' | 'bear' | 'warn' | 'neutral' {
  if (bias === 'BULLISH') return 'bull'
  if (bias === 'BEARISH') return 'bear'
  if (bias === 'SIDEWAYS') return 'warn'
  return 'neutral'
}

export function DirectionPanel({ view }: { view: MarketView }) {
  const reading = view.reading
  const up = reading.upwardEstimate
  const down = reading.downwardEstimate
  return (
    <Card title="Market Direction AI">
      <p className="text-xs leading-5 text-muted">{MODEL_NOTE}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          {INSTRUMENTS[view.instrument].name} — {TIMEFRAME_LABEL[view.timeframe].toUpperCase()}
        </p>
        <Badge tone={reading.status === 'INSUFFICIENT_DATA' || reading.status === 'WAIT' ? 'warn' : 'info'}>
          {reading.statusLabel}
        </Badge>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-muted">Market bias</dt>
          <dd className="mt-1">
            <Badge tone={biasTone(reading.bias)}>{reading.bias === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT DATA' : reading.bias}</Badge>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-muted">Next candle bias</dt>
          <dd className="mt-1">
            <Badge tone={biasTone(reading.nextCandleBias)}>
              {reading.nextCandleBias === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT DATA' : reading.nextCandleBias}
            </Badge>
          </dd>
        </div>
      </dl>
      {up != null && down != null ? (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-bull">Upward move estimate {up}%</span>
            <span className="text-bear">Downward move estimate {down}%</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded bg-bear" aria-hidden="true">
            <div className="bg-bull" style={{ width: `${up}%` }} />
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">{reading.estimateLabel}</p>
          <p className="mt-2 text-xs text-muted">Signal strength {reading.signalStrength} / 100 · heuristic score only</p>
          <p className="mt-1 text-xs text-muted">
            Trend confirmation: {reading.trendConfirmed ? 'At least three indicators agree' : 'Not confirmed'}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-warn">No percentage is shown when the score has no clear edge or the data is not usable.</p>
      )}
      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Indicator contributions</h3>
      <ul className="mt-2 divide-y divide-line">
        {reading.contributions.length === 0 ? (
          <li className="py-2 text-sm text-muted">No contributions yet.</li>
        ) : (
          reading.contributions.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 py-2 text-sm">
              <span>
                <span className="font-medium">{item.label}</span>
                <span className="mt-0.5 block text-xs text-muted">{item.detail}</span>
              </span>
              <span className={`tabular text-xs font-semibold ${item.score > 0 ? 'text-bull' : item.score < 0 ? 'text-bear' : 'text-warn'}`}>
                {item.score > 0 ? '+1' : item.score < 0 ? '-1' : '0'}
              </span>
            </li>
          ))
        )}
      </ul>
      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Reasons</h3>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
        {reading.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">
        Last candle {formatIst(reading.candleTime)} · Updated {reading.updatedAt ? new Date(reading.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) : '—'}
      </p>
      <p className="mt-1 text-xs text-muted">Session open or closed does not change a sample or file reading. Live data is not connected.</p>
    </Card>
  )
}
