import { useMemo, useState } from 'react'
import { Card } from '../components/common/Card.tsx'
import { OptionChainTable } from '../components/options/OptionChainTable.tsx'
import { useMarketView } from '../hooks/useMarketView.ts'
import { SAMPLE_EXPIRIES, buildSampleOptionChain } from '../services/marketData/sampleOptions.ts'
import { useMarketStore } from '../store/useMarketStore.ts'
import { INSTRUMENTS } from '../types/market.ts'
import type { InstrumentId } from '../types/market.ts'

export function OptionsPage() {
  const instrument = useMarketStore((state) => state.instrument)
  const setInstrument = useMarketStore((state) => state.setInstrument)
  const view = useMarketView(instrument)
  const [expiry, setExpiry] = useState<(typeof SAMPLE_EXPIRIES)[number]>(SAMPLE_EXPIRIES[0])
  const chain = useMemo(
    () => buildSampleOptionChain(instrument, view.origin === 'disconnected' ? null : view.price, expiry),
    [expiry, instrument, view.origin, view.price],
  )

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-4">
      <Card
        title="Options analysis"
        action={
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Index"
              className="rounded-md border border-line bg-panel-2 px-3 py-1.5 text-sm"
              value={instrument}
              onChange={(event) => setInstrument(event.target.value as InstrumentId)}
            >
              <option value="NIFTY50">{INSTRUMENTS.NIFTY50.name}</option>
              <option value="SENSEX">{INSTRUMENTS.SENSEX.name}</option>
            </select>
            <select
              aria-label="Sample expiry"
              className="rounded-md border border-line bg-panel-2 px-3 py-1.5 text-sm"
              value={expiry}
              onChange={(event) => setExpiry(event.target.value as (typeof SAMPLE_EXPIRIES)[number])}
            >
              {SAMPLE_EXPIRIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <p className="mb-4 text-sm text-muted">
          Spot used for the sample chain: {view.price == null ? 'unavailable' : view.price.toLocaleString('en-IN')} · {view.sourceLabel}. A future data adapter can replace this table without changing the columns.
        </p>
        <OptionChainTable chain={chain} />
      </Card>
    </div>
  )
}
