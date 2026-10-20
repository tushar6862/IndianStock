import { INSTRUMENTS } from '../../types/market.ts'
import type { InstrumentId } from '../../types/market.ts'
import type { MarketView } from '../../utils/buildMarketView.ts'
import { formatNumber, formatPercent } from '../../utils/format.ts'

export function Watchlist({
  views,
  selected,
  onSelect,
}: {
  views: MarketView[]
  selected: InstrumentId
  onSelect: (instrument: InstrumentId) => void
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" aria-label="Watchlist">
      {views.map((view) => {
        const meta = INSTRUMENTS[view.instrument]
        const active = view.instrument === selected
        const tone = view.change == null ? 'text-muted' : view.change > 0 ? 'text-bull' : view.change < 0 ? 'text-bear' : 'text-warn'
        return (
          <button
            key={view.instrument}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(view.instrument)}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left ${
              active ? 'border-accent bg-panel' : 'border-line bg-panel-2'
            }`}
          >
            <span>
              <span className="block text-sm font-semibold">{meta.name}</span>
              <span className="text-xs text-muted">{meta.symbol}</span>
            </span>
            <span className="text-right">
              <span className="tabular block text-sm">{formatNumber(view.price)}</span>
              <span className={`tabular text-xs ${tone}`}>{formatPercent(view.changePercent)}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
