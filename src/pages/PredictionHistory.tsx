import { useMemo } from 'react'
import { Badge } from '../components/common/Badge.tsx'
import { Card } from '../components/common/Card.tsx'
import { evaluateHistory } from '../calculations/evaluateHistory.ts'
import { useMarketView } from '../hooks/useMarketView.ts'
import { useMarketStore } from '../store/useMarketStore.ts'
import { INSTRUMENTS, TIMEFRAME_LABEL } from '../types/market.ts'
import type { HistoryRow } from '../types/prediction.ts'
import { EVALUATION_RULE } from '../utils/copy.ts'
import { formatIst } from '../utils/format.ts'

function statusTone(status: HistoryRow['status']): 'bull' | 'bear' | 'warn' | 'neutral' {
  if (status === 'correct') return 'bull'
  if (status === 'incorrect') return 'bear'
  if (status === 'pending') return 'warn'
  return 'neutral'
}

export function PredictionHistory() {
  const instrument = useMarketStore((state) => state.instrument)
  const setInstrument = useMarketStore((state) => state.setInstrument)
  const settings = useMarketStore((state) => state.settings)
  const series = useMarketStore((state) => state.series[instrument])
  const origin = useMarketStore((state) => state.origins[instrument])
  const timeframe = useMarketStore((state) => state.timeframe)
  const view = useMarketView(instrument)

  const closedRows = useMemo(
    () =>
      evaluateHistory({
        candles: view.candles,
        settings,
        instrument,
        timeframe,
        origin,
      }),
    [instrument, origin, settings, timeframe, view.candles],
  )

  const pending: HistoryRow | null =
    origin !== 'disconnected' && (view.reading.nextCandleBias === 'BULLISH' || view.reading.nextCandleBias === 'BEARISH')
      ? {
          id: 'pending-latest',
          timestamp: view.timestamp ?? 0,
          instrument,
          timeframe,
          predicted: view.reading.nextCandleBias,
          actual: null,
          status: 'pending',
          origin,
          note: 'The next candle is not in the loaded series, so this reading stays pending.',
        }
      : null

  const scored = closedRows.filter((row) => row.status === 'correct' || row.status === 'incorrect')
  const correct = scored.filter((row) => row.status === 'correct').length
  const visible = [...(pending ? [pending] : []), ...[...closedRows].reverse().slice(0, 20)]

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-4">
      <Card
        title="Prediction history"
        action={
          <select
            aria-label="Index"
            className="rounded-md border border-line bg-panel-2 px-3 py-1.5 text-sm"
            value={instrument}
            onChange={(event) => setInstrument(event.target.value as 'NIFTY50' | 'SENSEX')}
          >
            <option value="NIFTY50">NIFTY 50</option>
            <option value="SENSEX">SENSEX</option>
          </select>
        }
      >
        <p className="text-sm leading-6 text-muted">{EVALUATION_RULE}</p>
        <p className="mt-2 text-xs text-muted">
          {INSTRUMENTS[instrument].name} · {TIMEFRAME_LABEL[timeframe]} · {origin === 'disconnected' ? 'no candles loaded' : `${series.length} source candles`}
        </p>
        {origin === 'disconnected' ? (
          <p className="mt-6 text-sm text-warn">INSUFFICIENT DATA — load sample or historical candles before a history can be evaluated.</p>
        ) : (
          <>
            <p className="mt-4 text-sm">
              {scored.length === 0
                ? 'No directional candle has been scored yet.'
                : `${correct} of ${scored.length} directional samples on this loaded series matched the next candle's close-versus-open direction.`}
            </p>
            <p className="mt-1 text-xs text-muted">
              This count is only for the candles currently loaded. It is not a validated win rate and it does not measure profit.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <caption className="sr-only">Signal history for the loaded candles</caption>
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    <th className="py-2 pr-3 font-medium" scope="col">Time</th>
                    <th className="py-2 pr-3 font-medium" scope="col">Instrument</th>
                    <th className="py-2 pr-3 font-medium" scope="col">Timeframe</th>
                    <th className="py-2 pr-3 font-medium" scope="col">Predicted</th>
                    <th className="py-2 pr-3 font-medium" scope="col">Actual close vs open</th>
                    <th className="py-2 font-medium" scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr key={row.id} className="border-b border-line">
                      <td className="py-2 pr-3">{formatIst(row.timestamp)}</td>
                      <td className="py-2 pr-3">{INSTRUMENTS[row.instrument].name}</td>
                      <td className="py-2 pr-3">{TIMEFRAME_LABEL[row.timeframe]}</td>
                      <td className="py-2 pr-3">{row.predicted}</td>
                      <td className="py-2 pr-3">{row.actual ?? '—'}</td>
                      <td className="py-2">
                        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
