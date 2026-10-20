import { Check, Minus } from 'lucide-react'
import { Card } from '../common/Card.tsx'
import type { MarketView } from '../../utils/buildMarketView.ts'
import { formatNumber } from '../../utils/format.ts'

function Level({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="tabular text-sm font-medium">{formatNumber(value)}</dd>
    </div>
  )
}

export function SetupPanel({ view }: { view: MarketView }) {
  const setup = view.setup
  return (
    <Card title="Technical setup">
      <p className={`text-base font-semibold ${setup.active ? (setup.side === 'bullish' ? 'text-bull' : 'text-bear') : 'text-warn'}`}>
        {setup.active ? setup.headline : 'NO TRADE — WAIT FOR CONFIRMATION'}
      </p>
      {setup.active ? (
        <dl className="mt-4 grid grid-cols-2 gap-3">
          <Level label="Entry reference" value={setup.entry} />
          <Level label="Stop-loss reference" value={setup.stop} />
          <Level label="Target 1" value={setup.target1} />
          <Level label="Target 2" value={setup.target2} />
          <Level label="Invalidation" value={setup.invalidation} />
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted">Risk / reward to target 2</dt>
            <dd className="tabular text-sm font-medium">{setup.riskReward == null ? '—' : setup.riskReward.toFixed(2)}</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-3 text-sm text-muted">An entry, stop, and targets appear only when the checklist below is fully met and a stop can be placed beyond the last close.</p>
      )}
      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Confirmation checklist</h3>
      <ul className="mt-2 space-y-2">
        {setup.checklist.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            {item.met ? <Check size={14} className="text-bull" aria-hidden="true" /> : <Minus size={14} className="text-muted" aria-hidden="true" />}
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-5 text-muted">{setup.disclaimer}</p>
    </Card>
  )
}
