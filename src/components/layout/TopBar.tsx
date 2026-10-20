import { RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../common/Badge.tsx'
import { useClock } from '../../hooks/useClock.ts'
import { useMarketView } from '../../hooks/useMarketView.ts'
import { useMarketStore } from '../../store/useMarketStore.ts'
import { INSTRUMENTS } from '../../types/market.ts'
import { formatClock } from '../../utils/format.ts'
import { moveLabel } from '../../utils/moveLabel.ts'

export function TopBar() {
  const { now, session } = useClock()
  const navigate = useNavigate()
  const origins = useMarketStore((state) => state.origins)
  const refresh = useMarketStore((state) => state.refresh)
  const setInstrument = useMarketStore((state) => state.setInstrument)
  const nifty = useMarketView('NIFTY50')
  const sensex = useMarketView('SENSEX')
  const fyers = origins.NIFTY50 === 'fyers' || origins.SENSEX === 'fyers'
  const sample = origins.NIFTY50 === 'sample' || origins.SENSEX === 'sample'
  const file = origins.NIFTY50 === 'file' || origins.SENSEX === 'file'
  const mixed = sample && file
  const sessionTone = session.phase === 'open' ? 'bull' : session.phase === 'pre-open' ? 'warn' : 'neutral'

  let source = 'PROVIDER NOT CONNECTED'
  let sourceTone: 'warn' | 'info' | 'neutral' = 'warn'
  if (fyers && (nifty.freshness === 'live' || sensex.freshness === 'live')) {
    source = 'FYERS LIVE'
    sourceTone = 'info'
  } else if (fyers) {
    source = 'FYERS DATA'
    sourceTone = 'info'
  } else if (mixed) {
    source = 'MIXED SAMPLE AND FILE'
    sourceTone = 'info'
  } else if (sample) {
    source = 'SAMPLE DATA'
    sourceTone = 'info'
  } else if (file) {
    source = 'HISTORICAL FILE'
    sourceTone = 'info'
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold lg:hidden">NIFTY AI</p>
        <Badge tone={sessionTone}>{session.label}</Badge>
        <span className="text-xs text-muted" title={session.detail}>
          {session.detail}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {([nifty, sensex] as const).map((view) => {
          const move = moveLabel(view.reading.bias)
          return (
            <button
              key={view.instrument}
              type="button"
              onClick={() => {
                setInstrument(view.instrument)
                void navigate('/')
              }}
              className={`rounded-md border border-line px-2 py-1 text-xs font-semibold hover:border-accent ${
                move.tone === 'bull' ? 'text-bull' : move.tone === 'bear' ? 'text-bear' : move.tone === 'warn' ? 'text-warn' : 'text-muted'
              }`}
            >
              {INSTRUMENTS[view.instrument].symbol} {move.title}
            </button>
          )
        })}
        <Badge tone={sourceTone}>{source}</Badge>
        <span className="tabular text-xs text-muted">{formatClock(now)} IST</span>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm hover:border-accent"
          aria-label="Refresh data"
        >
          <RefreshCw size={14} aria-hidden="true" />
          Refresh
        </button>
      </div>
    </header>
  )
}
