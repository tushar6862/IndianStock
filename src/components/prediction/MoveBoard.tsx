import { DataActions } from '../common/DataActions.tsx'
import { FyersConnect } from '../common/FyersConnect.tsx'
import { INSTRUMENTS, TIMEFRAME_LABEL } from '../../types/market.ts'
import type { InstrumentId } from '../../types/market.ts'
import type { MarketView } from '../../utils/buildMarketView.ts'
import { formatNumber } from '../../utils/format.ts'
import { moveLabel } from '../../utils/moveLabel.ts'

const toneClass = {
  bull: 'border-bull/50 bg-bull/10',
  bear: 'border-bear/50 bg-bear/10',
  warn: 'border-warn/50 bg-warn/10',
  neutral: 'border-line bg-panel',
} as const

const titleClass = {
  bull: 'text-bull',
  bear: 'text-bear',
  warn: 'text-warn',
  neutral: 'text-muted',
} as const

export function MoveBoard({
  views,
  selected,
  onSelect,
  disconnected,
}: {
  views: MarketView[]
  selected: InstrumentId
  onSelect: (instrument: InstrumentId) => void
  disconnected: boolean
}) {
  return (
    <section className="rounded-xl border border-line bg-panel p-4" aria-label="Market kahan move karega">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Market kahan move karega</p>
          <h2 className="text-lg font-semibold">NIFTY aur SENSEX ki direction</h2>
        </div>
        <p className="max-w-xl text-xs leading-5 text-muted">
          Yeh pakka prediction nahi hai. Neeche wale indicators ka score hai. Live feed abhi connected nahi hai.
        </p>
      </div>
      {views.some((view) => view.origin === 'fyers') ? null : (
        <div className="mt-4">
          <FyersConnect />
        </div>
      )}
      {disconnected ? (
        <div className="mt-4 rounded-lg border border-warn/40 bg-warn/10 p-4">
          <p className="text-sm font-medium">Abhi move nahi dikhegi, kyunki koi candles loaded nahi hain.</p>
          <p className="mt-1 text-sm text-muted">FYERS login ke baad live price aayegi. Sample data sirf practice ke liye hai.</p>
          <div className="mt-3">
            <DataActions showDisconnect={false} />
          </div>
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {views.map((view) => {
          const move = moveLabel(view.reading.bias)
          const next = moveLabel(view.reading.nextCandleBias)
          const active = view.instrument === selected
          const up = view.reading.upwardEstimate
          const down = view.reading.downwardEstimate
          return (
            <button
              key={view.instrument}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(view.instrument)}
              className={`rounded-lg border p-4 text-left ${toneClass[move.tone]} ${active ? 'ring-2 ring-accent' : ''}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {INSTRUMENTS[view.instrument].name} · {TIMEFRAME_LABEL[view.timeframe]}
              </p>
              <p className={`mt-2 text-4xl font-bold tracking-wide ${titleClass[move.tone]}`}>{move.title}</p>
              <p className="mt-1 text-sm">{move.line}</p>
              <p className="mt-3 text-sm">
                Agli candle: <span className={`font-semibold ${titleClass[next.tone]}`}>{next.title}</span>
              </p>
              {up != null && down != null ? (
                <p className="mt-1 text-sm">
                  Upar jaane ka heuristic score {up}% · neeche {down}%
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted">Jab clear edge nahi hota, percentage nahi dikhate.</p>
              )}
              <ul className="mt-3 space-y-1 text-sm">
                {view.reading.reasons.slice(0, 4).map((reason) => (
                  <li key={reason}>• {reason}</li>
                ))}
              </ul>
              {active && view.setup.active ? (
                <p className="mt-3 text-sm font-medium">
                  Reference: entry {formatNumber(view.setup.entry)} · stop {formatNumber(view.setup.stop)} · target{' '}
                  {formatNumber(view.setup.target1)} / {formatNumber(view.setup.target2)}
                </p>
              ) : null}
              {active && !view.setup.active && view.origin !== 'disconnected' ? (
                <p className="mt-3 text-sm font-medium text-warn">Trade mat lo — confirmation ka wait karo.</p>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}
