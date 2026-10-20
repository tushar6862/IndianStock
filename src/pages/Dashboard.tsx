import { CandleChart } from '../components/charts/CandleChart.tsx'
import { Card } from '../components/common/Card.tsx'
import { IndicatorToggles } from '../components/indicators/IndicatorControls.tsx'
import { MarketCard } from '../components/market/MarketCard.tsx'
import { Watchlist } from '../components/market/Watchlist.tsx'
import { DirectionPanel } from '../components/prediction/DirectionPanel.tsx'
import { MoveBoard } from '../components/prediction/MoveBoard.tsx'
import { SetupPanel } from '../components/prediction/SetupPanel.tsx'
import { useMarketView } from '../hooks/useMarketView.ts'
import { useMarketStore } from '../store/useMarketStore.ts'
import { INSTRUMENTS, TIMEFRAME_LABEL } from '../types/market.ts'
import type { Timeframe } from '../types/market.ts'

const timeframes: Timeframe[] = ['1m', '3m', '5m', '15m']

export function Dashboard() {
  const instrument = useMarketStore((state) => state.instrument)
  const timeframe = useMarketStore((state) => state.timeframe)
  const theme = useMarketStore((state) => state.theme)
  const visibility = useMarketStore((state) => state.visibility)
  const setInstrument = useMarketStore((state) => state.setInstrument)
  const setTimeframe = useMarketStore((state) => state.setTimeframe)
  const nifty = useMarketView('NIFTY50')
  const sensex = useMarketView('SENSEX')
  const selected = instrument === 'NIFTY50' ? nifty : sensex
  const disconnected = nifty.origin === 'disconnected' && sensex.origin === 'disconnected'

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-4">
      <MoveBoard views={[nifty, sensex]} selected={instrument} onSelect={setInstrument} disconnected={disconnected} />
      <Watchlist views={[nifty, sensex]} selected={instrument} onSelect={setInstrument} />
      <div className="grid gap-4 xl:grid-cols-2">
        <MarketCard view={nifty} selected={instrument === 'NIFTY50'} onSelect={() => setInstrument('NIFTY50')} />
        <MarketCard view={sensex} selected={instrument === 'SENSEX'} onSelect={() => setInstrument('SENSEX')} />
      </div>
      <Card
        title={`${INSTRUMENTS[instrument].name} candles`}
        action={
          <div className="flex flex-wrap gap-1" role="group" aria-label="Timeframe">
            {timeframes.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={timeframe === item}
                onClick={() => setTimeframe(item)}
                className={`rounded-md px-2 py-1 text-xs font-semibold ${timeframe === item ? 'bg-accent text-white' : 'border border-line text-muted'}`}
              >
                {TIMEFRAME_LABEL[item]}
              </button>
            ))}
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1" role="group" aria-label="Index">
            {(['NIFTY50', 'SENSEX'] as const).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={instrument === id}
                onClick={() => setInstrument(id)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${instrument === id ? 'bg-panel-2 text-text ring-1 ring-accent' : 'text-muted'}`}
              >
                {INSTRUMENTS[id].name}
              </button>
            ))}
          </div>
          <IndicatorToggles />
        </div>
        {selected.freshness === 'simulated' ? (
          <p className="mb-3 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs">
            Chart is using sample data. It is not a live market.
          </p>
        ) : null}
        {selected.origin === 'fyers' ? (
          <p className="mb-3 rounded-md border border-bull/40 bg-bull/10 px-3 py-2 text-xs">
            Chart is using FYERS {selected.freshness === 'live' ? 'live' : 'latest'} candles for {INSTRUMENTS[instrument].name}.
          </p>
        ) : null}
        {selected.candles.length === 0 ? (
          <div className="grid h-[420px] place-items-center rounded-lg border border-dashed border-line text-center">
            <div>
              <p className="text-sm font-medium">No candles for {INSTRUMENTS[instrument].name}</p>
              <p className="mt-1 text-xs text-muted">Load sample data or import a file for this index.</p>
            </div>
          </div>
        ) : (
          <CandleChart view={selected} visibility={visibility} theme={theme} />
        )}
        {selected.settingsNote ? <p className="mt-2 text-xs text-warn">{selected.settingsNote}</p> : null}
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <DirectionPanel view={selected} />
        <SetupPanel view={selected} />
      </div>
    </div>
  )
}
